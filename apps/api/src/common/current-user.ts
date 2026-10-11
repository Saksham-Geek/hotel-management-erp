import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Role } from '@erp/shared';

export interface AuthUser {
  id: string;
  tenantId: string;
  propertyId: string;
  role: Role;
}

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => {
  return ctx.switchToHttp().getRequest().user;
});
