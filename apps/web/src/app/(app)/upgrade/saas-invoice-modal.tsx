'use client';

import React from 'react';
import { btnCls, btnGhostCls } from '@/components/ui';

export interface SaasInvoiceRecord {
  id: string;
  invoiceNumber: string;
  planKey: string;
  amount: number;
  currency: string;
  status: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  paidAt?: string | null;
  paymentMethod?: string | null;
  createdAt: string;
}

interface SaasInvoiceModalProps {
  invoice: SaasInvoiceRecord | null;
  hotelName: string;
  onClose: () => void;
}

export function SaasInvoiceModal({ invoice, hotelName, onClose }: SaasInvoiceModalProps) {
  if (!invoice) return null;

  const total = Number(invoice.amount);
  const baseAmount = Math.round((total / 1.18) * 100) / 100;
  const cgst = Math.round(((total - baseAmount) / 2) * 100) / 100;
  const sgst = cgst;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in duration-150 print:bg-white print:p-0">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900 sm:p-8 print:border-none print:shadow-none print:p-0">
        {/* Modal Controls - Hidden during print */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-white/10 print:hidden">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-100 text-emerald-800 font-bold dark:bg-emerald-950 dark:text-emerald-400">
              🧾
            </span>
            <span className="text-sm font-bold text-slate-800 dark:text-white">
              Official SaaS GST Tax Invoice
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className={`${btnCls} py-1.5 px-3 text-xs`}
            >
              🖨️ Print Invoice
            </button>
            <button
              onClick={onClose}
              type="button"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Invoice Printable Document */}
        <div className="pt-4 text-slate-900 dark:text-white font-sans print:pt-0">
          {/* Company & Invoice Header */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-5 dark:border-white/10">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                ANTIGRAVITY TECHNOLOGIES PVT LTD
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Hospitality Cloud & Property Management Systems
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                GSTIN: <strong className="text-slate-700 dark:text-slate-300">27AABCA1234F1Z5</strong> · SAC: <strong>998314</strong>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Bangalore / Mumbai, India · billing@antigravity-erp.com
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold uppercase text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                TAX INVOICE
              </span>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-1.5">
                {invoice.invoiceNumber}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Date: {new Date(invoice.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Billed To */}
          <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-200 text-xs dark:border-white/10">
            <div>
              <p className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">
                Billed To (Customer)
              </p>
              <p className="font-bold text-sm text-slate-900 dark:text-white mt-1">
                {hotelName}
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                Property Organization / Subscriber
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                Supply State: Maharashtra (27) / Inter-state IGST
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold text-slate-400 uppercase text-[10px] tracking-wider">
                Billing Cycle & Period
              </p>
              <p className="font-semibold text-slate-800 dark:text-slate-200 mt-1">
                {new Date(invoice.billingPeriodStart).toLocaleDateString('en-IN')} — {new Date(invoice.billingPeriodEnd).toLocaleDateString('en-IN')}
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                Method: {invoice.paymentMethod?.replace(/_/g, ' ') || 'Razorpay Mandate Auto-Debit'}
              </p>
              <p className="text-emerald-600 font-bold dark:text-emerald-400">
                Status: PAID IN FULL ✓
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="mt-4">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <tr>
                  <th className="p-2.5">Description</th>
                  <th className="p-2.5">SAC Code</th>
                  <th className="p-2.5 text-right">Taxable Value</th>
                  <th className="p-2.5 text-right">CGST (9%)</th>
                  <th className="p-2.5 text-right">SGST (9%)</th>
                  <th className="p-2.5 text-right">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                <tr>
                  <td className="p-2.5">
                    <p className="font-bold text-slate-900 dark:text-white capitalize">
                      Antigravity Cloud PMS — {invoice.planKey} Edition
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      SaaS License & Multi-Device Front Desk Cloud Service
                    </p>
                  </td>
                  <td className="p-2.5 text-slate-600 dark:text-slate-300">998314</td>
                  <td className="p-2.5 text-right font-semibold text-slate-800 dark:text-slate-200">
                    ₹{baseAmount.toLocaleString('en-IN')}
                  </td>
                  <td className="p-2.5 text-right text-slate-600 dark:text-slate-300">
                    ₹{cgst.toLocaleString('en-IN')}
                  </td>
                  <td className="p-2.5 text-right text-slate-600 dark:text-slate-300">
                    ₹{sgst.toLocaleString('en-IN')}
                  </td>
                  <td className="p-2.5 text-right font-bold text-slate-900 dark:text-white">
                    ₹{total.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Summary Box */}
          <div className="mt-4 flex justify-end">
            <div className="w-64 rounded-xl bg-slate-50 p-3 text-xs dark:bg-white/[0.03]">
              <div className="flex justify-between py-1 text-slate-600 dark:text-slate-400">
                <span>Taxable Amount:</span>
                <span>₹{baseAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-600 dark:text-slate-400">
                <span>Total GST (18%):</span>
                <span>₹{(cgst + sgst).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-bold text-slate-900 dark:border-white/10 dark:text-white">
                <span>Total Paid:</span>
                <span className="text-emerald-600 dark:text-emerald-400">₹{total.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Footer Notes */}
          <div className="mt-6 border-t border-slate-200 pt-4 text-center text-[11px] text-slate-400 dark:border-white/10">
            <p>This is a computer-generated statutory tax invoice. No signature is required.</p>
            <p className="mt-0.5">Eligible for B2B Goods & Services Tax Input Tax Credit (ITC) under Section 16 of CGST Act, 2017.</p>
          </div>
        </div>

        {/* Modal Close Button */}
        <div className="mt-6 flex justify-end print:hidden">
          <button type="button" onClick={onClose} className={btnGhostCls}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
