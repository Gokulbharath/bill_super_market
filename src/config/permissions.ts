import type { UserRole } from '@/types';

export const rolePermissions: Record<UserRole, string[]> = {
  OWNER: [
    '/dashboard', '/products', '/barcode', '/inventory', '/pos', '/pos/held', '/pos/recent',
    '/customers', '/purchases', '/suppliers', '/reports', '/expenses', '/settings', '/users', '/profile',
  ],
  ADMIN: [
    '/dashboard', '/products', '/barcode', '/inventory', '/pos', '/pos/held', '/pos/recent',
    '/customers', '/purchases', '/suppliers', '/reports', '/expenses', '/profile',
  ],
  CASHIER: ['/pos', '/pos/held', '/pos/recent', '/profile'],
};

export function hasPermission(role: UserRole, path: string): boolean {
  return rolePermissions[role].some((allowedPath) => path === allowedPath || path.startsWith(`${allowedPath}/`));
}

export const productManagementRoles: UserRole[] = ['OWNER', 'ADMIN'];
