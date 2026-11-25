import { api } from '@/lib/api';
import { CorporateClient } from './corporate-client';

export const metadata = {
  title: 'Travel Agent & Corporate City Ledger | Hotel ERP',
  description: 'Manage B2B corporate credit limits, city ledger balances, travel agencies, and GST invoicing.',
};

export default async function CorporatePage() {
  const accounts = await api<any[]>('/hotel/billing/corporate-accounts').catch(() => []);
  return <CorporateClient initialAccounts={accounts} />;
}
