export type UserRole = 'OWNER' | 'ADMIN' | 'CASHIER';

export interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  role: UserRole;
  avatar?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export type Theme = 'light' | 'dark';

export interface NavItem {
  label: string;
  path: string;
  icon: string;
  roles?: UserRole[];
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}
