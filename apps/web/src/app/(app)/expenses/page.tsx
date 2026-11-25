import { FEATURES } from '@erp/shared';
import { api, requireFeature } from '@/lib/api';
import { ExpenseClient } from './expense-client';

export const metadata = {
  title: 'Front Desk Petty Cash & Expenses | Hotel ERP',
  description: 'Track cash drawer payouts, diesel, groceries, and shift cash reconciliation.',
};

export default async function ExpensesPage() {
  const [, [expenses, cashSummary, categories, vendors, commonItems]] = await Promise.all([
    requireFeature(FEATURES.HOTEL_EXPENSES),
    Promise.all([
      api<any[]>('/hotel/expenses').catch(() => []),
      api<any>('/hotel/expenses/cash-summary').catch(() => ({
        today: { totalCashIn: 0, totalCashOut: 0, netDrawerCash: 0, voucherCount: 0 },
        categoryBreakdownMonth: [],
      })),
      api<any[]>('/hotel/expenses/categories').catch(() => []),
      api<any[]>('/hotel/expenses/vendors').catch(() => []),
      api<any[]>('/hotel/expenses/common-items').catch(() => []),
    ]),
  ]);

  return (
    <ExpenseClient
      initialExpenses={expenses}
      initialSummary={cashSummary}
      initialCategories={categories}
      initialVendors={vendors}
      initialCommonExpenses={commonItems}
    />
  );
}
