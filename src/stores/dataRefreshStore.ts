import { create } from 'zustand';

interface DataRefreshState {
  // Timestamps of last refresh for different data types
  lastDashboardRefresh: number;
  lastInventoryRefresh: number;
  lastSalesRefresh: number;
  lastExpenseRefresh: number;
  
  // Trigger a refresh event
  refreshDashboard: () => void;
  refreshInventory: () => void;
  refreshSales: () => void;
  refreshExpenses: () => void;
  refreshAll: () => void;
}

export const useDataRefreshStore = create<DataRefreshState>((set) => ({
  lastDashboardRefresh: 0,
  lastInventoryRefresh: 0,
  lastSalesRefresh: 0,
  lastExpenseRefresh: 0,

  refreshDashboard: () => set({ lastDashboardRefresh: Date.now() }),
  refreshInventory: () => set({ lastInventoryRefresh: Date.now() }),
  refreshSales: () => set({ lastSalesRefresh: Date.now() }),
  refreshExpenses: () => set({ lastExpenseRefresh: Date.now() }),
  refreshAll: () => set({
    lastDashboardRefresh: Date.now(),
    lastInventoryRefresh: Date.now(),
    lastSalesRefresh: Date.now(),
    lastExpenseRefresh: Date.now(),
  }),
}));
