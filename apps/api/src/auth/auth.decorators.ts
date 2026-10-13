import { SetMetadata } from "@nestjs/common";
import type { EmployeeRole } from "../database/entities.js";

export const PUBLIC_ROUTE = "kontur:public-route";
export const REQUIRED_ROLES = "kontur:roles";
export const Public = () => SetMetadata(PUBLIC_ROUTE, true);
export const Roles = (...roles: EmployeeRole[]) => SetMetadata(REQUIRED_ROLES, roles);
