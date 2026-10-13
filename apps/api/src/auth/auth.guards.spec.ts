import { ForbiddenException, UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { EmployeeRole } from "../database/entities.js";
import { AccessTokenGuard, RoleGuard } from "./auth.guards.js";

function context(request: Record<string, any> = {}): ExecutionContext {
  return {
    getType: () => "http",
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({ getRequest: () => request, getResponse: vi.fn(), getNext: vi.fn() })
  } as unknown as ExecutionContext;
}

describe("authentication and authorization guards", () => {
  it("accepts a signed short-lived access token and binds verified claims to the request", async () => {
    const request: Record<string, any> = { headers: { authorization: "Bearer signed-token" } };
    const claims = { sub: "employee", tenantId: "tenant", deviceId: "device", role: EmployeeRole.ADMIN, email: "admin@example.test", type: "access" as const };
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(false) };
    const jwt = { verifyAsync: vi.fn().mockResolvedValue(claims) };
    const guard = new AccessTokenGuard(reflector as any, jwt as any);
    await expect(guard.canActivate(context(request))).resolves.toBe(true);
    expect(jwt.verifyAsync).toHaveBeenCalledWith("signed-token");
    expect(request.user).toEqual(claims);
  });

  it("rejects a missing bearer token", async () => {
    const guard = new AccessTokenGuard({ getAllAndOverride: vi.fn().mockReturnValue(false) } as any, { verifyAsync: vi.fn() } as any);
    await expect(guard.canActivate(context({ headers: {} }))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("enforces role policy after authentication", () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue([EmployeeRole.SECURITY]) };
    const guard = new RoleGuard(reflector as any);
    expect(() => guard.canActivate(context({ user: { role: EmployeeRole.EMPLOYEE } }))).toThrow(ForbiddenException);
    expect(guard.canActivate(context({ user: { role: EmployeeRole.SECURITY } }))).toBe(true);
  });
});
