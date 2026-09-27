import type { User, UserRole } from '@/types';

export interface AuthUser extends User {
  password: string;
}

export const authUsers: AuthUser[] = [
  {
    id: 'owner-001',
    name: 'Store Owner',
    email: 'owner@sreesupermarket.com',
    username: 'owner@sreesupermarket.com',
    role: 'OWNER',
    password: 'owner@ss2026',
  },
  {
    id: 'admin-001',
    name: 'Store Admin',
    email: 'admin@sreesupermarket.com',
    username: 'admin@sreesupermarket.com',
    role: 'ADMIN',
    password: 'admin@ss2026',
  },
  {
    id: 'cashier-001',
    name: 'Cashier',
    email: 'cashier@sreesupermarket.com',
    username: 'cashier@sreesupermarket.com',
    role: 'CASHIER',
    password: 'cashier@ss2026',
  },
];

export const authUserByRole: Record<UserRole, AuthUser> = authUsers.reduce(
  (users, user) => ({ ...users, [user.role]: user }),
  {} as Record<UserRole, AuthUser>,
);
