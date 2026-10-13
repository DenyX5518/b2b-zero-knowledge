import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { generateKeyPairSync, sign, verify } from "node:crypto";

type PkcsSession = { module: any; session: any; privateKey: any; publicKey: any };

@Injectable()
export class HsmService implements OnModuleDestroy {
  private readonly logger = new Logger(HsmService.name);
  private readonly mode: string;
  private readonly devKey = generateKeyPairSync("ed25519");
  private pkcs: PkcsSession | null = null;
  constructor(private readonly config: ConfigService) { this.mode = config.get("SERVICE_KEY_PROVIDER", "software-dev"); }

  get keyId(): string { return this.mode === "pkcs11" ? `pkcs11:${this.config.get("PKCS11_KEY_LABEL")}` : "software-dev:ephemeral-ed25519"; }

  async signDigest(digest: Buffer): Promise<string> {
    if (this.mode !== "pkcs11") return sign(null, digest, this.devKey.privateKey).toString("base64");
    const pkcs = await this.openPkcs11();
    pkcs.module.C_SignInit(pkcs.session, { mechanism: pkcs.module.CKM_ECDSA }, pkcs.privateKey);
    return Buffer.from(pkcs.module.C_Sign(pkcs.session, digest, Buffer.alloc(256))).toString("base64");
  }

  async verifyDigest(digest: Buffer, signature: string): Promise<boolean> {
    if (this.mode !== "pkcs11") return verify(null, digest, this.devKey.publicKey, Buffer.from(signature, "base64"));
    const pkcs = await this.openPkcs11();
    try {
      pkcs.module.C_VerifyInit(pkcs.session, { mechanism: pkcs.module.CKM_ECDSA }, pkcs.publicKey);
      pkcs.module.C_Verify(pkcs.session, digest, Buffer.from(signature, "base64"));
      return true;
    } catch { return false; }
  }

  private async openPkcs11(): Promise<PkcsSession> {
    if (this.pkcs) return this.pkcs;
    const libraryPath = this.config.get<string>("PKCS11_MODULE");
    const pin = this.config.get<string>("PKCS11_PIN");
    if (!libraryPath || !pin) throw new Error("PKCS#11 mode requires PKCS11_MODULE and PKCS11_PIN");
    const imported = await import("pkcs11js");
    const pkcs11 = new imported.PKCS11();
    pkcs11.load(libraryPath);
    pkcs11.C_Initialize();
    const slots = pkcs11.C_GetSlotList(true);
    const slot = slots[Number(this.config.get("PKCS11_SLOT", 0))];
    const session = pkcs11.C_OpenSession(slot, imported.CKF_SERIAL_SESSION | imported.CKF_RW_SESSION);
    pkcs11.C_Login(session, imported.CKU_USER, pin);
    pkcs11.C_FindObjectsInit(session, [{ type: imported.CKA_LABEL, value: this.config.get("PKCS11_KEY_LABEL", "kontur-audit-signing") }, { type: imported.CKA_CLASS, value: imported.CKO_PRIVATE_KEY }]);
    const [privateKey] = pkcs11.C_FindObjects(session, 1);
    pkcs11.C_FindObjectsFinal(session);
    pkcs11.C_FindObjectsInit(session, [{ type: imported.CKA_LABEL, value: this.config.get("PKCS11_KEY_LABEL", "kontur-audit-signing") }, { type: imported.CKA_CLASS, value: imported.CKO_PUBLIC_KEY }]);
    const [publicKey] = pkcs11.C_FindObjects(session, 1);
    pkcs11.C_FindObjectsFinal(session);
    if (!privateKey || !publicKey) throw new Error("Configured HSM signing key pair was not found");
    this.pkcs = { module: pkcs11, session, privateKey, publicKey };
    this.logger.log(`Audit signing uses ${this.keyId}`);
    return this.pkcs;
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.pkcs) return;
    try { this.pkcs.module.C_Logout(this.pkcs.session); this.pkcs.module.C_CloseSession(this.pkcs.session); this.pkcs.module.C_Finalize(); } catch { /* process teardown */ }
  }
}
