import type { EmployeeRole } from "../database/entities.js";

export type AccessClaims = {
  sub: string;
  tenantId: string;
  deviceId: string;
  role: EmployeeRole;
  email: string;
  type: "access";
};

export type EnrollmentClaims = Omit<AccessClaims, "type"> & { type: "enrollment" };

declare global {
  namespace Express {
    interface Request { user?: AccessClaims; }
  }
}
