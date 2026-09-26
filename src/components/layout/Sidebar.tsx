import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Package, ScanBarcode, Warehouse, ShoppingCart,
  Users, Truck, Building2, BarChart3, Receipt, Settings, UserCog,
  LogOut, ChevronLeft, ShoppingBag,
} from 'lucide-react';
import { navItems } from '@/config/navigation';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { roleLabels } from '@/config/navigation';
import { Logo } from '@/components/common/Logo';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, Package, ScanBarcode, Warehouse, ShoppingCart,
  Users, Truck, Building2, BarChart3, Receipt, Settings, UserCog,
};

export function Sidebar() {
  const navigate = useNavigate();
  const { sidebarCollapsed, toggleSidebar, mobileNavOpen, setMobileNavOpen } = useUIStore();
  const { user, logout } = useAuthStore();

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const visibleNavItems = user
    ? navItems.filter((item) => !item.roles || item.roles.includes(user.role))
    : navItems;

  return (
    <>
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileNavOpen(false)} />
      )}

      <AnimatePresence>
        {mobileNavOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 z-50 h-full w-[260px] bg-sidebar border-r border-sidebar-border lg:hidden flex flex-col"
          >
            <SidebarContent items={visibleNavItems} collapsed={false} onNavClick={() => setMobileNavOpen(false)} onLogout={handleLogout} user={user} initials={initials} />
          </motion.aside>
        )}
      </AnimatePresence>

      <motion.aside
        animate={{ width: sidebarCollapsed ? 72 : 260 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="hidden lg:flex flex-col h-screen sticky top-0 bg-sidebar border-r border-sidebar-border shrink-0"
      >
        <SidebarContent items={visibleNavItems} collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} onLogout={handleLogout} user={user} initials={initials} />
      </motion.aside>
    </>
  );
}

interface SidebarContentProps {
  items: typeof navItems;
  collapsed: boolean;
  onNavClick?: () => void;
  onToggleCollapse?: () => void;
  onLogout?: () => void;
  user?: { name: string; role: UserRole } | null;
  initials?: string;
}

function SidebarContent({ items, collapsed, onNavClick, onToggleCollapse, onLogout, user, initials }: SidebarContentProps) {
  return (
    <>
      <div className={cn('flex items-center justify-between h-16 px-4 border-b border-sidebar-border shrink-0', collapsed && 'justify-center px-0')}>
        {collapsed ? <Logo size="sm" showText={false} /> : <Logo size="sm" />}
        {onToggleCollapse && !collapsed && (
          <button onClick={onToggleCollapse} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Collapse sidebar">
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 py-3 space-y-0.5">
        {items.map((item) => {
          const Icon = iconMap[item.icon] || ShoppingBag;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onNavClick}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  collapsed && 'justify-center px-0',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                )
              }
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-2 shrink-0">
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className={cn('hidden lg:flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors', collapsed && 'justify-center px-0')}
          >
            <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
            {!collapsed && <span>Collapse</span>}
          </button>
        )}
        <div className={cn('flex items-center gap-3 rounded-lg p-2', collapsed && 'justify-center')}>
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && user && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground">{roleLabels[user.role] || user.role}</p>
            </div>
          )}
          {!collapsed && onLogout && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={onLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
