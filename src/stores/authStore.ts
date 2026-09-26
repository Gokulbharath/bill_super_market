import { create } from 'zustand';
import type { User, UserRole } from '@/types';

interface AuthStoreState {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
  setRole: (role: UserRole) => void;
}

export const useAuthStore = create<AuthStoreState>((set) => ({
  user: null,
  isAuthenticated: false,
  login: (user) => set({ user, isAuthenticated: true }),
  logout: () => set({ user: null, isAuthenticated: false }),
  setRole: (role) =>
    set((state) => ({
      user: state.user ? { ...state.user, role } : state.user,
    })),
}));

export const demoUsers: Record<UserRole, User> = {
  OWNER: {
    id: '1',
    name: 'Store Owner',
    email: 'owner@sreesupermarket.in',
    username: 'owner',
    role: 'OWNER',
  },
  ADMIN: {
    id: '2',
    name: 'Store Admin',
    email: 'admin@sreesupermarket.in',
    username: 'admin',
    role: 'ADMIN',
  },
  CASHIER: {
    id: '3',
    name: 'Cashier One',
    email: 'cashier@sreesupermarket.in',
    username: 'cashier',
    role: 'CASHIER',
  },
};
