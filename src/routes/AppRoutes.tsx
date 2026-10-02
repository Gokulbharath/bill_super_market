import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { PageSkeleton } from '@/components/common/Skeletons';
import { useAuthStore } from '@/stores/authStore';
import { roleHomeRoutes } from '@/config/navigation';

const LoginPage = lazy(() => import('@/features/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const ProductsPage = lazy(() => import('@/features/products/ProductsPage').then((m) => ({ default: m.ProductsPage })));
const BarcodePage = lazy(() => import('@/features/barcode/BarcodePage').then((m) => ({ default: m.BarcodePage })));
const InventoryPage = lazy(() => import('@/features/inventory/InventoryPage').then((m) => ({ default: m.InventoryPage })));
const PosPage = lazy(() => import('@/features/pos/PosPage').then((m) => ({ default: m.PosPage })));
const RecentBillsPage = lazy(() => import('@/features/pos/RecentBillsPage').then((m) => ({ default: m.RecentBillsPage })));
const CustomersPage = lazy(() => import('@/features/customers/CustomersPage').then((m) => ({ default: m.CustomersPage })));
const PurchasesPage = lazy(() => import('@/features/purchases/PurchasesPage').then((m) => ({ default: m.PurchasesPage })));
const SuppliersPage = lazy(() => import('@/features/suppliers/SuppliersPage').then((m) => ({ default: m.SuppliersPage })));
const ReportsPage = lazy(() => import('@/features/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const ExpensesPage = lazy(() => import('@/features/expenses/ExpensesPage').then((m) => ({ default: m.ExpensesPage })));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const HeldBillsPage = lazy(() => import('@/features/pos/HeldBillsPage').then((m) => ({ default: m.HeldBillsPage })));
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const ForbiddenPage = lazy(() => import('@/pages/ForbiddenPage').then((m) => ({ default: m.ForbiddenPage })));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));
const GenericErrorPage = lazy(() => import('@/pages/GenericErrorPage').then((m) => ({ default: m.GenericErrorPage })));

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, hasPermission, user } = useAuthStore();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'CASHIER' && location.pathname === '/dashboard') return <Navigate to="/pos" replace />;
  if (!hasPermission(location.pathname)) return <Navigate to="/403" replace />;
  return <>{children}</>;
}

function HomeRedirect() {
  const user = useAuthStore((s) => s.user);
  const home = user ? roleHomeRoutes[user.role] : '/dashboard';
  return <Navigate to={home} replace />;
}

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<SuspenseWrapper><LoginPage /></SuspenseWrapper>} />
        <Route path="/403" element={<SuspenseWrapper><ForbiddenPage /></SuspenseWrapper>} />
        <Route path="/404" element={<SuspenseWrapper><NotFoundPage /></SuspenseWrapper>} />
        <Route path="/error" element={<SuspenseWrapper><GenericErrorPage /></SuspenseWrapper>} />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/dashboard" element={<SuspenseWrapper><DashboardPage /></SuspenseWrapper>} />
          <Route path="/products" element={<SuspenseWrapper><ProductsPage /></SuspenseWrapper>} />
          <Route path="/barcode" element={<SuspenseWrapper><BarcodePage /></SuspenseWrapper>} />
          <Route path="/inventory" element={<SuspenseWrapper><InventoryPage /></SuspenseWrapper>} />
          <Route path="/pos" element={<SuspenseWrapper><PosPage /></SuspenseWrapper>} />
          <Route path="/pos/held" element={<SuspenseWrapper><HeldBillsPage /></SuspenseWrapper>} />
          <Route path="/pos/recent" element={<SuspenseWrapper><RecentBillsPage /></SuspenseWrapper>} />
          <Route path="/customers" element={<SuspenseWrapper><CustomersPage /></SuspenseWrapper>} />
          <Route path="/purchases" element={<SuspenseWrapper><PurchasesPage /></SuspenseWrapper>} />
          <Route path="/suppliers" element={<SuspenseWrapper><SuppliersPage /></SuspenseWrapper>} />
          <Route path="/reports" element={<SuspenseWrapper><ReportsPage /></SuspenseWrapper>} />
          <Route path="/expenses" element={<SuspenseWrapper><ExpensesPage /></SuspenseWrapper>} />
          <Route path="/settings" element={<SuspenseWrapper><SettingsPage /></SuspenseWrapper>} />
          <Route path="/profile" element={<SuspenseWrapper><ProfilePage /></SuspenseWrapper>} />
        </Route>

        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
