'use client';

import { useState } from 'react';
import { CustomDropdown } from '@/components/dropdown';
import { createPosTerminalAction, pingPosTerminalAction } from './actions';

interface PosTerminal {
  id: string;
  name: string;
  terminalId: string;
  merchantId?: string;
  provider: string;
  connectionType: string;
  ipAddress?: string;
  port?: number;
  isDefault?: boolean;
  status: string;
}

interface PosTerminalsModalProps {
  terminals: PosTerminal[];
  isOwnerOrManager: boolean;
  reservationId?: string;
  onClose: () => void;
}

export function PosTerminalsModal({
  terminals,
  isOwnerOrManager,
  reservationId,
  onClose,
}: PosTerminalsModalProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [pingResults, setPingResults] = useState<Record<string, { online: boolean; message: string; latency?: number }>>({});
  const [pingingId, setPingingId] = useState<string | null>(null);

  const handlePing = async (id: string) => {
    setPingingId(id);
    try {
      const res = await pingPosTerminalAction(id);
      if (res.success && res.data) {
        setPingResults((prev) => ({
          ...prev,
          [id]: { online: true, message: res.data.message || 'Connected', latency: res.data.latencyMs },
        }));
      } else {
        setPingResults((prev) => ({
          ...prev,
          [id]: { online: false, message: res.error || 'Unreachable' },
        }));
      }
    } catch {
      setPingResults((prev) => ({
        ...prev,
        [id]: { online: false, message: 'Ping failed' },
      }));
    } finally {
      setPingingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in-50">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">💳</span>
            <div>
              <h3 className="font-display text-base font-black text-slate-950">
                Connected POS Terminals &amp; EDC Machines
              </h3>
              <p className="text-xs text-slate-500">
                Manage hardware card swipe/tap terminals for front desk and restaurant cashiers
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors cursor-pointer text-xs font-bold"
          >
            ✕
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Top Info Banner */}
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 text-xs text-slate-700 space-y-1">
            <p className="font-bold text-indigo-950 flex items-center gap-1.5">
              <span>⚡</span> Hardware EDC Compatibility
            </p>
            <p>
              The ERP supports standard Indian EDC providers including <strong>Pine Labs Plutus</strong>, <strong>Paytm Smart POS</strong>, <strong>Razorpay POS (EzeTap)</strong>, <strong>Innoviti uniPAY</strong>, and <strong>Direct USB / Web Serial</strong>.
            </p>
          </div>

          {/* List of Terminals */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                Registered Property Terminals ({terminals.length})
              </h4>
              {isOwnerOrManager && !showAddForm && (
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 hover:text-indigo-950 hover:underline cursor-pointer"
                >
                  + Add New POS Machine
                </button>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {terminals.map((t) => {
                const ping = pingResults[t.id];
                return (
                  <div
                    key={t.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-2 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-slate-950 truncate max-w-[180px]">{t.name}</span>
                        <div className="flex items-center gap-1">
                          {t.isDefault && (
                            <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-indigo-900">
                              Default
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                            {t.status}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 space-y-1 text-[11px] text-slate-600 font-mono">
                        <p>
                          <span className="text-slate-400 font-sans">TID: </span>
                          <strong className="text-slate-900">{t.terminalId}</strong>
                        </p>
                        <p>
                          <span className="text-slate-400 font-sans">Provider: </span>
                          <span className="capitalize">{t.provider.replace('_', ' ')}</span>
                        </p>
                        <p>
                          <span className="text-slate-400 font-sans">Connection: </span>
                          <span>{t.connectionType === 'web_serial' ? 'USB Serial Cable' : 'Cloud / LAN IP'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handlePing(t.id)}
                        disabled={pingingId === t.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <span>{pingingId === t.id ? '⏳' : '📡'}</span>
                        <span>{pingingId === t.id ? 'Pinging…' : 'Test Ping'}</span>
                      </button>

                      {ping && (
                        <span className={`text-[10px] font-semibold ${ping.online ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {ping.online ? `✓ Online (${ping.latency || 15}ms)` : '✗ Offline'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add New Terminal Form */}
          {showAddForm && (
            <form action={createPosTerminalAction} className="rounded-2xl border border-indigo-200 bg-slate-50/70 p-5 space-y-3.5 animate-in fade-in-50">
              <input type="hidden" name="reservationId" value={reservationId || ''} />
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Register New POS EDC Machine
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-medium text-slate-800">
                  Terminal Name / Counter <span className="text-rose-600">*</span>
                  <input
                    name="name"
                    required
                    placeholder="e.g. Front Desk Counter 2 Pine Labs"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900 shadow-2xs focus:border-indigo-600 focus:outline-hidden"
                  />
                </label>

                <label className="block text-xs font-medium text-slate-800">
                  Terminal ID (TID) <span className="text-rose-600">*</span>
                  <input
                    name="terminalId"
                    required
                    placeholder="e.g. TID-FD-02"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 uppercase shadow-2xs focus:border-indigo-600 focus:outline-hidden"
                  />
                </label>

                <label className="block text-xs font-medium text-slate-800">
                  Merchant ID (MID)
                  <input
                    name="merchantId"
                    placeholder="e.g. MID-HDFC-9912"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 uppercase shadow-2xs focus:border-indigo-600 focus:outline-hidden"
                  />
                </label>

                <div>
                  <label className="block text-xs font-medium text-slate-800 mb-1">Hardware Provider</label>
                  <CustomDropdown
                    name="provider"
                    defaultValue="pine_labs"
                    size="sm"
                    options={[
                      { value: 'pine_labs', label: 'Pine Labs Plutus' },
                      { value: 'paytm_edc', label: 'Paytm Smart POS' },
                      { value: 'razorpay_pos', label: 'Razorpay POS (EzeTap)' },
                      { value: 'innoviti', label: 'Innoviti uniPAY' },
                      { value: 'ingenico_lan', label: 'Ingenico Lane 3000' },
                      { value: 'generic_serial', label: 'Generic USB / Web Serial' },
                    ]}
                    aria-label="Hardware Provider"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-800 mb-1">Connection Mode</label>
                  <CustomDropdown
                    name="connectionType"
                    defaultValue="cloud_lan"
                    size="sm"
                    options={[
                      { value: 'cloud_lan', label: 'Cloud / LAN IP Push' },
                      { value: 'local_ip', label: 'Local Static IP' },
                      { value: 'web_serial', label: 'Direct USB Cable (Web Serial)' },
                      { value: 'standalone', label: 'Standalone Manual Slip' },
                    ]}
                    aria-label="Connection Mode"
                  />
                </div>

                <label className="block text-xs font-medium text-slate-800">
                  IP Address (Optional)
                  <input
                    name="ipAddress"
                    placeholder="e.g. 192.168.1.150"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-900 shadow-2xs focus:border-indigo-600 focus:outline-hidden"
                  />
                </label>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-800 cursor-pointer pt-1">
                <input name="isDefault" type="checkbox" className="h-4 w-4 rounded accent-indigo-900" />
                <span>Set as default POS machine for this property</span>
              </label>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 text-white px-4 py-2.5 text-xs font-bold shadow-xs hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <span>Save POS Machine</span>
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-slate-100 bg-slate-50 px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
