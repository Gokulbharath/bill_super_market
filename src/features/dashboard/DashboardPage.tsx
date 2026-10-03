import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, ShoppingCart, Package, AlertTriangle, ArrowUpRight, Receipt, RefreshCw, type LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatCompactCurrency } from '@/utils/format';
import { useAuthStore } from '@/stores/authStore';
import { adminService, type DashboardData, type DashboardBill } from '@/services/adminService';
import { useDataRefreshStore } from '@/stores/dataRefreshStore';

interface DashboardCard {
  title: string;
  value: string;
  trend?: { value: string; positive: boolean };
  icon: LucideIcon;
  variant?: 'default' | 'warning';
  isLoading?: boolean;
}

function DashboardLoadingSkeleton() {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const lastDashboardRefresh = useDataRefreshStore((s) => s.lastDashboardRefresh);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchDashboardData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);
      const result = await adminService.dashboardFullData();
      setData(result);
      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load dashboard data.';
      setError(message);
      setData(null);
      if (showLoading) {
        toast({ title: message, variant: 'destructive' });
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    void fetchDashboardData();
  }, []);

  // Refresh on data change events
  useEffect(() => {
    if (lastDashboardRefresh > 0) {
      void fetchDashboardData(false);
    }
  }, [lastDashboardRefresh]);

  // Polling fallback: refresh every 5 seconds while component is mounted
  useEffect(() => {
    pollIntervalRef.current = setInterval(() => {
      void fetchDashboardData(false);
    }, 5000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchDashboardData(false);
  };

  const calculateTrend = (today: number, yesterday: number): { value: string; positive: boolean } | undefined => {
    if (yesterday === 0) {
      return { value: 'No previous data', positive: false };
    }
    const percent = ((today - yesterday) / yesterday * 100).toFixed(1);
    const positive = Number(percent) >= 0;
    return { value: `${positive ? '+' : ''}${percent}% vs yesterday`, positive };
  };

  const formatTime = (date: Date): string => {
    return new Intl.DateTimeFormat('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    }).format(date);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          description={`Welcome to Sree Super Market POS${user ? `, ${user.name}` : ''}`}
        />
        <DashboardLoadingSkeleton />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          description={`Welcome to Sree Super Market POS${user ? `, ${user.name}` : ''}`}
        />
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-destructive mb-4">{error}</p>
            <Button onClick={handleManualRefresh} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats: DashboardCard[] = [
    {
      title: "Today's Sales",
      value: formatCompactCurrency(data?.summary.todaySales || 0),
      trend: calculateTrend(data?.summary.todaySales || 0, data?.yesterdaySales || 0),
      icon: TrendingUp,
    },
    {
      title: "Today's Bills",
      value: (data?.summary.todayBills || 0).toString(),
      trend: calculateTrend(data?.summary.todayBills || 0, data?.yesterdayBills || 0),
      icon: ShoppingCart,
    },
    {
      title: 'Current Stock',
      value: (data?.summary.currentStock || 0).toLocaleString('en-IN'),
      icon: Package,
    },
    {
      title: 'Low Stock Items',
      value: (data?.summary.lowStockItems || 0).toString(),
      icon: AlertTriangle,
      variant: data && data.summary.lowStockItems > 0 ? 'warning' : 'default',
    },
  ];

  const quickActions = [
    { label: 'New Bill', desc: 'Start POS billing', icon: ShoppingCart, path: '/pos' },
    { label: 'Add Product', desc: 'Create product master', icon: Package, path: '/products' },
    { label: 'Check Inventory', desc: 'View stock levels', icon: AlertTriangle, path: '/inventory' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Dashboard"
          description={`Welcome to Sree Super Market POS${user ? `, ${user.name}` : ''}`}
        />
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{isRefreshing ? 'Updating...' : `Updated ${formatTime(lastRefresh)}`}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <StatCard {...stat} />
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Recent Bills</CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigate('/pos/recent')}>
              View All
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {(!data?.recentBills || data.recentBills.length === 0) ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No bills yet
              </div>
            ) : (
              data.recentBills.map((bill: DashboardBill) => (
                <div key={bill.id} className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Receipt className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{bill.bill_number}</p>
                      <p className="text-xs text-muted-foreground">{bill.item_count} items</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold tabular-nums">{formatCurrency(bill.grand_total)}</span>
                    <StatusBadge status="success" label="Paid" />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className="flex w-full items-center gap-3 rounded-lg border p-3 text-left hover:bg-accent transition-colors group"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted group-hover:bg-primary/10 group-hover:text-primary transition-colors shrink-0">
                  <action.icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{action.label}</p>
                  <p className="text-xs text-muted-foreground">{action.desc}</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
