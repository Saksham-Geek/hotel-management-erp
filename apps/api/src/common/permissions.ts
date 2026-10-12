import type { Permission, Role } from '@erp/shared';
import { PERMISSIONS } from '@erp/shared';

const rolePermissions: Record<Role, ReadonlySet<Permission>> = {
  owner: new Set(Object.values(PERMISSIONS)),
  manager: new Set([
    PERMISSIONS.STAFF_READ, PERMISSIONS.STAFF_INVITE, PERMISSIONS.STAFF_ASSIGN_ROLE, PERMISSIONS.STAFF_DEACTIVATE,
    PERMISSIONS.ROOM_READ, PERMISSIONS.ROOM_CONFIGURATION_WRITE, PERMISSIONS.ROOM_STATUS_UPDATE, PERMISSIONS.ROOM_MAINTENANCE_MANAGE,
    PERMISSIONS.GUEST_READ, PERMISSIONS.GUEST_WRITE, PERMISSIONS.GUEST_DOCUMENT_METADATA_READ, PERMISSIONS.GUEST_DOCUMENT_WRITE,
    PERMISSIONS.GUEST_DOCUMENT_IMAGE_READ, PERMISSIONS.RESERVATION_READ, PERMISSIONS.RESERVATION_WRITE,
    PERMISSIONS.RESERVATION_PRICE_OVERRIDE, PERMISSIONS.BILLING_REFUND, PERMISSIONS.REPORTS_READ,
    PERMISSIONS.CUSTOM_FIELDS_WRITE,
  ]),
  frontdesk: new Set([
    PERMISSIONS.ROOM_READ, PERMISSIONS.ROOM_STATUS_UPDATE, PERMISSIONS.GUEST_READ, PERMISSIONS.GUEST_WRITE,
    PERMISSIONS.GUEST_DOCUMENT_METADATA_READ, PERMISSIONS.GUEST_DOCUMENT_WRITE,
    PERMISSIONS.RESERVATION_READ, PERMISSIONS.RESERVATION_WRITE,
  ]),
  housekeeping: new Set([
    PERMISSIONS.ROOM_READ, PERMISSIONS.ROOM_STATUS_UPDATE,
  ]),
};

export function hasPermission(role: Role, permission: Permission) {
  return rolePermissions[role]?.has(permission) ?? false;
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
