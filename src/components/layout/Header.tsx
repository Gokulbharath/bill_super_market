import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Sun, Moon, ChevronDown, User, Settings, LogOut, Menu,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { navItems, roleLabels } from '@/config/navigation';
import { formatDate } from '@/utils/format';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme, setMobileNavOpen } = useUIStore();
  const { user, logout } = useAuthStore();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentItem = navItems.find((item) => location.pathname.startsWith(item.path));
  const pageTitle = currentItem?.label || 'Dashboard';

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

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background/80 backdrop-blur-sm px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setMobileNavOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex flex-col">
          <h1 className="text-lg font-semibold leading-tight">{pageTitle}</h1>
          <p className="text-xs text-muted-foreground hidden sm:block">{formatDate(currentTime)}</p>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <div className="hidden md:flex items-center text-sm text-muted-foreground mr-2 font-medium tabular-nums">
          {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
        </div>

        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
        </Button>

        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
          <AnimatePresence mode="wait" initial={false}>
            {theme === 'light' ? (
              <motion.div key="moon" initial={{ opacity: 0, rotate: -90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 90 }} transition={{ duration: 0.15 }}>
                <Moon className="h-5 w-5" />
              </motion.div>
            ) : (
              <motion.div key="sun" initial={{ opacity: 0, rotate: -90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 90 }} transition={{ duration: 0.15 }}>
                <Sun className="h-5 w-5" />
              </motion.div>
            )}
          </AnimatePresence>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-1.5 sm:px-2 h-10">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex flex-col items-start leading-tight">
                <span className="text-sm font-medium">{user?.name || 'User'}</span>
                <span className="text-xs text-muted-foreground">
                  {user ? roleLabels[user.role] : ''}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col gap-1">
              <span className="font-medium">{user?.name || 'User'}</span>
              <span className="text-xs text-muted-foreground font-normal">{user?.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/profile" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
