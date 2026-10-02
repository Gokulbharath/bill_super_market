import { create } from 'zustand';
import { authUsers } from '@/config/authUsers';
import { hasPermission as canAccess } from '@/config/permissions';
import type { User, UserRole } from '@/types';

const SESSION_KEY = 'sree-super-market-session';

function readStoredSession(): User | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as User;
    return session.id && session.email && session.role && session.loginTime ? session : null;
  } catch {
    return null;
  }
}

interface AuthStoreState {
  user: User | null;
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, remember: boolean) => User | null;
  logout: () => void;
  updateUser: (changes: Partial<Pick<User, 'name' | 'email' | 'avatar'>>) => void;
  restoreSession: () => void;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  hasPermission: (path: string) => boolean;
}

const initialUser = readStoredSession();

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  user: initialUser,
  currentUser: initialUser,
  isAuthenticated: Boolean(initialUser),
  login: (email, password, remember) => {
    const authUser = authUsers.find(
      (candidate) => candidate.email.toLowerCase() === email.trim().toLowerCase() && candidate.password === password,
    );
    if (!authUser) return null;

    const { password: _password, ...session } = authUser;
    const user = { ...session, loginTime: new Date().toISOString() };
    const storage = remember ? localStorage : sessionStorage;
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    storage.setItem(SESSION_KEY, JSON.stringify(user));
    set({ user, currentUser: user, isAuthenticated: true });
    return user;
  },
  logout: () => {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    set({ user: null, currentUser: null, isAuthenticated: false });
  },
  updateUser: (changes) => {
    const current = get().user;
    if (!current) return;
    const user = { ...current, ...changes };
    const storage = localStorage.getItem(SESSION_KEY) ? localStorage : sessionStorage;
    storage.setItem(SESSION_KEY, JSON.stringify(user));
    set({ user, currentUser: user });
  },
  restoreSession: () => {
    const user = readStoredSession();
    set({ user, currentUser: user, isAuthenticated: Boolean(user) });
  },
  hasRole: (role) => {
    const user = get().user;
    return Boolean(user && (Array.isArray(role) ? role.includes(user.role) : user.role === role));
  },
  hasPermission: (path) => {
    const user = get().user;
    return Boolean(user && canAccess(user.role, path));
  },
}));
