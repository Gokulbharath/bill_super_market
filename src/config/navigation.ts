import type { NavItem, UserRole } from '@/types';

export const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard', roles: ['OWNER', 'ADMIN'] },
  { label: 'Products', path: '/products', icon: 'Package', roles: ['OWNER', 'ADMIN'] },
  { label: 'Barcode', path: '/barcode', icon: 'ScanBarcode', roles: ['OWNER', 'ADMIN'] },
  { label: 'Inventory', path: '/inventory', icon: 'Warehouse', roles: ['OWNER', 'ADMIN'] },
  { label: 'POS Billing', path: '/pos', icon: 'ShoppingCart', roles: ['OWNER', 'ADMIN', 'CASHIER'] },
  { label: 'Customers', path: '/customers', icon: 'Users', roles: ['OWNER', 'ADMIN'] },
  { label: 'Purchases', path: '/purchases', icon: 'Truck', roles: ['OWNER', 'ADMIN'] },
  { label: 'Suppliers', path: '/suppliers', icon: 'Building2', roles: ['OWNER', 'ADMIN'] },
  { label: 'Reports', path: '/reports', icon: 'BarChart3', roles: ['OWNER', 'ADMIN'] },
  { label: 'Expenses', path: '/expenses', icon: 'Receipt', roles: ['OWNER', 'ADMIN'] },
  { label: 'Held Bills', path: '/pos/held', icon: 'Receipt', roles: ['OWNER', 'ADMIN', 'CASHIER'] },
  { label: 'Recent Bills', path: '/pos/recent', icon: 'Receipt', roles: ['OWNER', 'ADMIN', 'CASHIER'] },
  { label: 'Settings', path: '/settings', icon: 'Settings', roles: ['OWNER'] },
  { label: 'User Management', path: '/users', icon: 'UserCog', roles: ['OWNER'] },
  { label: 'Profile', path: '/profile', icon: 'User', roles: ['OWNER', 'ADMIN', 'CASHIER'] },
];

export const roleHomeRoutes: Record<UserRole, string> = {
  OWNER: '/dashboard',
  ADMIN: '/dashboard',
  CASHIER: '/pos',
};

export const roleLabels: Record<UserRole, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  CASHIER: 'Cashier',
};
