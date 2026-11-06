import type { Permission, Role } from '@erp/shared';
import { ROLE_PERMISSIONS, roleHasPermission } from '@erp/shared';

export function hasPermission(role: Role, permission: Permission) {
  return roleHasPermission(role, permission);
}

export function canAssignRole(actorRole: Role, targetRole: Role) {
  if (actorRole === 'owner') return true;
  return actorRole === 'manager' && ['frontdesk', 'housekeeping'].includes(targetRole);
}

export function canRemoveOrDemoteOwner(targetRole: Role, activeOwnerCount: number) {
  return targetRole !== 'owner' || activeOwnerCount > 1;
}

export function isSameProperty(activePropertyId: string, targetPropertyId: string) {
  return activePropertyId === targetPropertyId;
}

