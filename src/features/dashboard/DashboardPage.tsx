import { motion } from 'framer-motion';
import { TrendingUp, ShoppingCart, Package, AlertTriangle, ArrowUpRight, Receipt } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatCompactCurrency } from '@/utils/format';
import { useAuthStore } from '@/stores/authStore';

export function DashboardPage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Welcome to Sree Super Market POS${user ? `, ${user.name}` : ''}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Today's Sales", value: formatCompactCurrency(24580), icon: TrendingUp, trend: { value: '12.5% vs yesterday', positive: true } },
          { title: "Today's Bills", value: '47', icon: ShoppingCart, trend: { value: '8 more than yesterday', positive: true } },
          { title: 'Current Stock', value: '1,284', icon: Package, variant: 'default' as const },
          { title: 'Low Stock Items', value: '23', icon: AlertTriangle, variant: 'warning' as const },
        ].map((stat, i) => (
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
            <Button variant="outline" size="sm">View All</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { id: 'INV-001', amount: 450, items: 5, status: 'success' as const, label: 'Paid' },
              { id: 'INV-002', amount: 1250, items: 12, status: 'success' as const, label: 'Paid' },
              { id: 'INV-003', amount: 320, items: 3, status: 'warning' as const, label: 'Pending' },
              { id: 'INV-004', amount: 890, items: 8, status: 'success' as const, label: 'Paid' },
            ].map((bill) => (
              <div key={bill.id} className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Receipt className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{bill.id}</p>
                    <p className="text-xs text-muted-foreground">{bill.items} items</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold tabular-nums">{formatCurrency(bill.amount)}</span>
                  <StatusBadge status={bill.status} label={bill.label} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: 'New Bill', desc: 'Start POS billing', icon: ShoppingCart },
              { label: 'Add Product', desc: 'Create product master', icon: Package },
              { label: 'Check Inventory', desc: 'View stock levels', icon: AlertTriangle },
            ].map((action) => (
              <button
                key={action.label}
                className="flex w-full items-center gap-3 rounded-lg border p-3 text-left hover:bg-accent transition-colors group"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <action.icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{action.label}</p>
                  <p className="text-xs text-muted-foreground">{action.desc}</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-center">
        <p className="text-xs text-muted-foreground">
          Dashboard analytics will be fully implemented in a later phase. Values shown are demo data.
        </p>
      </div>
    </div>
  );
}
