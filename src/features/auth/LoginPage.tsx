import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, Mail, Store, MapPin, Phone, BadgeCheck } from 'lucide-react';
import { storeConfig, fullStoreAddress } from '@/config/store';
import { useAuthStore, demoUsers } from '@/stores/authStore';
import { roleHomeRoutes } from '@/config/navigation';
import { Logo } from '@/components/common/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import type { UserRole } from '@/types';

const loginSchema = z.object({
  email: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', remember: false },
  });

  const onSubmit = (data: LoginForm) => {
    const role: UserRole = data.email.toLowerCase().includes('cashier')
      ? 'CASHIER'
      : data.email.toLowerCase().includes('admin')
        ? 'ADMIN'
        : 'OWNER';
    const user = demoUsers[role];
    login(user);
    toast({ title: 'Login successful', description: `Welcome back, ${user.name}` });
    navigate(roleHomeRoutes[role]);
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/80" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/3" />

        <div className="relative z-10">
          <Logo size="lg" className="[&_*]:!text-white" />
        </div>

        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight max-w-md">
            Fast, simple billing for Sree Super Market.
          </h1>
          <p className="text-white/70 max-w-md text-lg">
            A private point-of-sale system built for your store. Scan, bill, print — done.
          </p>
          <div className="flex items-center gap-3 text-white/80">
            <Store className="h-5 w-5" />
            <span className="text-sm">Internal Store Application</span>
          </div>
        </div>

        <div className="relative z-10 space-y-2 text-white/70 text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0" />
            <span>{fullStoreAddress}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 shrink-0" />
            <span>{storeConfig.phone}</span>
          </div>
          <div className="flex items-center gap-2">
            <BadgeCheck className="h-4 w-4 shrink-0" />
            <span>GSTIN: {storeConfig.gstin}</span>
          </div>
        </div>
      </div>

      {/* Right login form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-6 sm:p-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-sm space-y-6"
        >
          <div className="lg:hidden flex justify-center">
            <Logo size="md" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Sign in to your account</h2>
            <p className="text-sm text-muted-foreground">
              Enter your credentials to access the POS system.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">Username or Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="text"
                  placeholder="Enter username or email"
                  className="pl-9"
                  {...register('email')}
                />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium">Password</label>
                <button type="button" className="text-xs text-primary hover:underline" onClick={() => {}}>
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className="pl-9 pr-9"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="remember" {...register('remember')} />
              <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                Remember me on this device
              </label>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
