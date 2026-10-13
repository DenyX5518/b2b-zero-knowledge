declare module "pkcs11js" {
  export const CKF_SERIAL_SESSION: number;
  export const CKF_RW_SESSION: number;
  export const CKU_USER: number;
  export const CKA_LABEL: number;
  export const CKA_CLASS: number;
  export const CKO_PRIVATE_KEY: number;
  export const CKO_PUBLIC_KEY: number;
  export class PKCS11 {
    [key: string]: any;
  }
}
