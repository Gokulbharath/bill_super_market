import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, Mail, ShieldCheck, ShoppingBasket, Tag, Shield } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { roleHomeRoutes } from '@/config/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

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
    const user = login(data.email, data.password, data.remember ?? false);
    if (!user) {
      toast({ title: 'Sign in failed', description: 'Invalid email or password.', variant: 'destructive' });
      return;
    }

    toast({ title: 'Login successful', description: `Welcome back, ${user.name}` });
    navigate(roleHomeRoutes[user.role]);
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left Branding Section - Premium Departmental Store */}
      <div className="hidden md:flex md:w-1/2 flex-col items-center justify-center p-8 relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-800">
        {/* Decorative background elements */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-10 right-20 w-96 h-96 bg-emerald-400 rounded-full blur-3xl opacity-20" />
          <div className="absolute bottom-20 left-10 w-80 h-80 bg-emerald-500 rounded-full blur-3xl opacity-20" />
        </div>

        {/* Subtle wave/curve shapes */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-emerald-900/50 to-transparent opacity-40" />

        {/* Decorative dots pattern */}
        <div className="absolute top-20 right-20 grid grid-cols-6 gap-4 opacity-10">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="w-2 h-2 bg-white rounded-full" />
          ))}
        </div>

        {/* Main content */}
        <div className="relative z-10 flex flex-col items-center max-w-md">
          {/* Large Centered Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-8"
          >
            <div className="relative">
              {/* Subtle glow effect */}
              <div className="absolute inset-0 bg-white/10 rounded-full blur-3xl opacity-30" />
              <img
                src="/assets/logo.png"
                alt="Sree Super Market"
                className="relative w-80 h-auto object-contain drop-shadow-2xl"
              />
            </div>
          </motion.div>

          {/* Store Name and Tagline */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-center space-y-4 mb-10"
          >
            <h2 className="text-3xl font-bold text-white tracking-tight">Sree Super Market</h2>
            <div className="space-y-2">
              <p className="text-emerald-50 text-xl font-semibold">Everything You Need. Every Day.</p>
              <p className="text-emerald-100 text-sm font-medium">Your neighbourhood departmental store</p>
            </div>
          </motion.div>

          {/* Retail/Store Concepts */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex items-center justify-center gap-8 mb-8"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center backdrop-blur-sm">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-emerald-50">QUALITY</p>
                <p className="text-xs text-emerald-100 mt-0.5">Trusted Products</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center backdrop-blur-sm">
                <ShoppingBasket className="w-6 h-6 text-white" />
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-emerald-50">VARIETY</p>
                <p className="text-xs text-emerald-100 mt-0.5">Everyday Essentials</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center backdrop-blur-sm">
                <Tag className="w-6 h-6 text-white" />
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-emerald-50">VALUE</p>
                <p className="text-xs text-emerald-100 mt-0.5">Great Value</p>
              </div>
            </div>
          </motion.div>

          {/* Store Categories */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="text-center mb-8"
          >
            <p className="text-xs text-emerald-100 font-medium leading-relaxed">
              Groceries • Household • Personal Care<br />Beverages • Daily Essentials
            </p>
          </motion.div>

          {/* Premium Store Quote */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="text-center"
          >
            <p className="text-2xl font-bold text-emerald-100 italic tracking-wide">Your Store.<br />Your Everyday Essentials.</p>
          </motion.div>
        </div>
      </div>

      {/* Right Login Section */}
      <div className="flex w-full md:w-1/2 items-center justify-center p-6 sm:p-12 bg-gradient-to-br from-gray-50 via-white to-emerald-50/30">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo - Only visible on small screens */}
          <div className="md:hidden flex justify-center mb-8">
            <img
              src="/assets/logo.png"
              alt="Sree Super Market"
              className="w-40 h-auto object-contain"
            />
          </div>

          {/* Login Card */}
          <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6 border border-emerald-100/30">
            {/* Header */}
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold text-gray-900">Welcome Back 👋</h1>
              <p className="text-gray-600 text-sm">Sign in to access your Sree Super Market POS system.</p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Email/Username Field */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-semibold text-gray-700">
                  Username or Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600 pointer-events-none" />
                  <Input
                    id="email"
                    type="text"
                    placeholder="Enter username or email"
                    className="pl-10 h-11 rounded-lg border-2 border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                    <span>⚠</span> {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-semibold text-gray-700">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600 pointer-events-none" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    className="pl-10 pr-10 h-11 rounded-lg border-2 border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-emerald-600 transition-colors p-1"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                    <span>⚠</span> {errors.password.message}
                  </p>
                )}
              </div>

              {/* Remember Me */}
              <div className="flex items-center gap-2.5 py-2">
                <Checkbox 
                  id="remember" 
                  {...register('remember')} 
                  className="rounded border-2 border-gray-300 w-5 h-5"
                />
                <label htmlFor="remember" className="text-sm text-gray-700 cursor-pointer font-medium select-none">
                  Remember me on this device
                </label>
              </div>

              {/* Sign In Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold text-base transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed mt-6 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In <span>→</span>
                  </>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500 font-medium">or</span>
              </div>
            </div>

            {/* Security Message */}
            <div className="bg-emerald-50 rounded-lg p-4 flex items-start gap-3 border border-emerald-200/50">
              <div className="flex-shrink-0 mt-0.5">
                <Shield className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-emerald-900">Secure access to your store</p>
                <p className="text-xs text-emerald-700 mt-0.5">Your data is safe and protected</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
