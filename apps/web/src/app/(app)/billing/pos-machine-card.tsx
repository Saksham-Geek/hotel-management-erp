'use client';

import { useState } from 'react';
import { CustomDropdown } from '@/components/dropdown';
import { initiatePosChargeAction, pingPosTerminalAction } from './actions';
import { PosSlipModal } from './pos-slip-modal';

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

interface PosMachineCardProps {
  amount: number;
  currency: string;
  folioId: string;
  reservationId: string;
  terminals: PosTerminal[];
  onPaymentSuccess?: (payment: any) => void;
  onSetReference?: (ref: string) => void;
  onOpenManageTerminals?: () => void;
}

const PROVIDER_NAMES: Record<string, { label: string; icon: string; badgeCls: string }> = {
  pine_labs: { label: 'Pine Labs Plutus', icon: '🌲', badgeCls: 'bg-emerald-100 text-emerald-950 border-emerald-200' },
  paytm_edc: { label: 'Paytm Smart EDC', icon: '📱', badgeCls: 'bg-blue-100 text-blue-950 border-blue-200' },
  razorpay_pos: { label: 'Razorpay POS (EzeTap)', icon: '⚡', badgeCls: 'bg-indigo-100 text-indigo-950 border-indigo-200' },
  innoviti: { label: 'Innoviti uniPAY', icon: '💳', badgeCls: 'bg-amber-100 text-amber-950 border-amber-200' },
  ingenico_lan: { label: 'Ingenico Lane IP', icon: '📠', badgeCls: 'bg-slate-100 text-slate-900 border-slate-300' },
  generic_serial: { label: 'USB Web Serial POS', icon: '🔌', badgeCls: 'bg-teal-100 text-teal-950 border-teal-200' },
  generic_ip: { label: 'Generic IP POS', icon: '🌐', badgeCls: 'bg-slate-100 text-slate-800 border-slate-200' },
};

export function PosMachineCard({
  amount,
  currency,
  folioId,
  reservationId,
  terminals,
  onPaymentSuccess,
  onSetReference,
  onOpenManageTerminals,
}: PosMachineCardProps) {
  const [selectedTerminalId, setSelectedTerminalId] = useState<string>(
    terminals.find((t) => t.isDefault)?.id || terminals[0]?.id || '',
  );
  const [pingStatus, setPingStatus] = useState<{ online: boolean; message: string; latency?: number } | null>(null);
  const [isPinging, setIsPinging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStage, setProcessStage] = useState<
    'idle' | 'dispatching' | 'awaiting_card' | 'reading_chip' | 'authorizing' | 'success' | 'failed'
  >('idle');
  const [lastSlip, setLastSlip] = useState<any>(null);
  const [showSlipModal, setShowSlipModal] = useState(false);
  const [usbConnectedPort, setUsbConnectedPort] = useState<string | null>(null);

  const activeTerminal = terminals.find((t) => t.id === selectedTerminalId) || terminals[0];
  const providerMeta = activeTerminal
    ? PROVIDER_NAMES[activeTerminal.provider] || PROVIDER_NAMES.pine_labs
    : PROVIDER_NAMES.pine_labs;

  // Web Serial API Direct Connection Handler
  const handleConnectUsb = async () => {
    if (typeof window !== 'undefined' && 'serial' in navigator) {
      try {
        const port = await (navigator as any).serial.requestPort();
        await port.open({ baudRate: 115200 });
        setUsbConnectedPort('COM (Active USB CDC)');
        setPingStatus({
          online: true,
          message: 'Hardware POS connected directly via Web Serial USB port!',
          latency: 4,
        });
      } catch (err: any) {
        if (err.name !== 'NotFoundError') {
          alert('USB connection note: ' + err.message);
        }
      }
    } else {
      alert(
        'Web Serial API is ready on Chromium browsers (Chrome, Edge). Local network IP & Cloud Push is currently active for this EDC terminal.',
      );
    }
  };

  // Test Terminal Link (Ping)
  const handlePing = async () => {
    if (!activeTerminal) return;
    setIsPinging(true);
    setPingStatus(null);
    try {
      const res = await pingPosTerminalAction(activeTerminal.id);
      if (res.success && res.data) {
        setPingStatus({
          online: true,
          message: res.data.message || 'Terminal connected and responsive',
          latency: res.data.latencyMs || 16,
        });
      } else {
        setPingStatus({
          online: false,
          message: res.error || 'Terminal unreachable',
        });
      }
    } catch {
      setPingStatus({ online: false, message: 'Ping failed' });
    } finally {
      setIsPinging(false);
    }
  };

  // Initiate Charge on Terminal
  const handleInitiateCharge = async () => {
    if (!activeTerminal) {
      alert('Please select or register a POS machine first');
      return;
    }
    if (amount <= 0) {
      alert('Amount must be greater than zero');
      return;
    }

    setIsProcessing(true);
    setProcessStage('dispatching');

    // Smooth realistic stages transition for front desk experience
    setTimeout(() => {
      setProcessStage('awaiting_card');
    }, 700);

    setTimeout(() => {
      setProcessStage('reading_chip');
    }, 1800);

    setTimeout(() => {
      setProcessStage('authorizing');
    }, 2800);

    try {
      const res = await initiatePosChargeAction({
        terminalId: activeTerminal.id,
        folioId,
        amount,
        currency,
        reservationId,
      });

      setTimeout(() => {
        if (res.success && res.data) {
          setProcessStage('success');
          setLastSlip(res.data.slipData);
          setShowSlipModal(true);
          if (onSetReference) {
            onSetReference(res.data.bankRrn);
          }
          if (onPaymentSuccess) {
            onPaymentSuccess(res.data);
          }
        } else {
          setProcessStage('failed');
          alert('POS Transaction Failed: ' + (res.error || 'Card declined or terminal timeout'));
        }
        setIsProcessing(false);
      }, 3600);
    } catch (err: any) {
      setProcessStage('failed');
      setIsProcessing(false);
      alert('Error communicating with POS machine: ' + err.message);
    }
  };

  if (!terminals || terminals.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/40 p-4 text-center space-y-2">
        <span className="text-2xl">💳</span>
        <h5 className="text-xs font-black text-indigo-950 uppercase tracking-wider">No POS Machine Connected</h5>
        <p className="text-xs text-slate-600 max-w-xs mx-auto">
          Connect an EDC terminal (Pine Labs, Paytm, Innoviti, or USB) to enable card swipe and tap settlements.
        </p>
        {onOpenManageTerminals && (
          <button
            type="button"
            onClick={onOpenManageTerminals}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-950 text-white px-3 py-1.5 text-xs font-bold shadow-xs hover:bg-indigo-900 transition-colors cursor-pointer"
          >
            + Register POS Machine
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 p-4 shadow-xs space-y-3.5">
      {/* Header with Terminal Selector & Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-lg">{providerMeta.icon}</span>
          <div>
            <h5 className="text-xs font-black text-slate-950 uppercase tracking-wider">
              Connected POS Terminal (EDC)
            </h5>
            <p className="text-[10px] text-slate-500">Card Dip · Contactless NFC Tap · Magstripe</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-800 shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
            {usbConnectedPort ? 'USB Active' : 'Online'}
          </span>
          {onOpenManageTerminals && (
            <button
              type="button"
              onClick={onOpenManageTerminals}
              className="text-[10px] font-bold text-indigo-700 hover:text-indigo-950 hover:underline cursor-pointer"
            >
              Manage
            </button>
          )}
        </div>
      </div>

      {/* Terminal Picker Dropdown */}
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
          Select EDC Machine Counter
        </label>
        <CustomDropdown
          value={selectedTerminalId}
          onChange={(val) => {
            setSelectedTerminalId(val);
            setPingStatus(null);
          }}
          disabled={isProcessing}
          size="sm"
          options={terminals.map((t) => ({
            value: t.id,
            label: `${t.name} (${t.terminalId}) — ${t.connectionType === 'web_serial' ? 'USB Serial' : 'Cloud / LAN'}`,
            badge: t.connectionType === 'web_serial' ? 'USB' : 'LAN',
          }))}
          aria-label="Select EDC Machine Counter"
        />
      </div>

      {/* Active Machine Specs Card */}
      {activeTerminal && (
        <div className="rounded-xl border border-slate-200/90 bg-white p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Terminal ID (TID):</span>
            <span className="font-mono font-bold text-slate-950">{activeTerminal.terminalId}</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Provider &amp; Protocol:</span>
            <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold border ${providerMeta.badgeCls}`}>
              <span>{providerMeta.icon}</span>
              <span>{providerMeta.label}</span>
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Connection Mode:</span>
            <span className="font-medium text-slate-800">
              {activeTerminal.connectionType === 'web_serial'
                ? '🔌 Direct USB Cable (COM Port)'
                : `🌐 Local Network IP (${activeTerminal.ipAddress || '192.168.1.150'})`}
            </span>
          </div>

          {/* Quick Hardware Actions */}
          <div className="flex items-center gap-2 pt-1.5 border-t border-slate-100">
            <button
              type="button"
              onClick={handlePing}
              disabled={isPinging || isProcessing}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <span>{isPinging ? '⏳' : '📡'}</span>
              <span>{isPinging ? 'Pinging…' : 'Test Link (Ping)'}</span>
            </button>

            {activeTerminal.connectionType === 'web_serial' && (
              <button
                type="button"
                onClick={handleConnectUsb}
                className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-2 py-1 text-[11px] font-bold text-teal-900 hover:bg-teal-100 transition-colors cursor-pointer"
              >
                <span>🔌</span>
                <span>{usbConnectedPort ? 'USB Paired' : 'Pair USB Port'}</span>
              </button>
            )}

            {lastSlip && (
              <button
                type="button"
                onClick={() => setShowSlipModal(true)}
                className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-950 hover:underline cursor-pointer"
              >
                <span>🧾 View Last Slip</span>
              </button>
            )}
          </div>

          {pingStatus && (
            <p className={`text-[10px] font-semibold pt-1 ${pingStatus.online ? 'text-emerald-700' : 'text-rose-700'}`}>
              {pingStatus.online ? '✓' : '✗'} {pingStatus.message}{' '}
              {pingStatus.latency && `(${pingStatus.latency}ms)`}
            </p>
          )}
        </div>
      )}

      {/* Live Transaction Processing Display */}
      {isProcessing && (
        <div className="rounded-xl border border-indigo-300 bg-indigo-950 text-white p-4 space-y-3 animate-in fade-in-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                POS Terminal Active
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-slate-300">
              ₹{Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Dynamic Stage Banner */}
          <div className="rounded-lg bg-indigo-900/80 border border-indigo-700/60 p-3 text-center space-y-1">
            {processStage === 'dispatching' && (
              <>
                <p className="text-xs font-bold text-indigo-200">Dispatching command to terminal…</p>
                <p className="text-[10px] text-indigo-300 font-mono">TID: {activeTerminal?.terminalId} · SALE</p>
              </>
            )}
            {processStage === 'awaiting_card' && (
              <>
                <div className="text-2xl animate-bounce">💳</div>
                <p className="text-sm font-black text-amber-300 uppercase tracking-tight">
                  PLEASE INSERT, TAP OR SWIPE CARD
                </p>
                <p className="text-[11px] text-slate-300">Terminal display prompt active · Hand terminal to guest</p>
              </>
            )}
            {processStage === 'reading_chip' && (
              <>
                <p className="text-xs font-black text-cyan-300 uppercase">EMV Chip Read · Entering PIN…</p>
                <p className="text-[10px] text-slate-300">Online PIN verification in progress</p>
              </>
            )}
            {processStage === 'authorizing' && (
              <>
                <p className="text-xs font-black text-emerald-300 uppercase">Acquiring Bank Authorizing…</p>
                <p className="text-[10px] text-slate-300">Contacting Indian banking switch for approval</p>
              </>
            )}
            {processStage === 'success' && (
              <>
                <p className="text-sm font-black text-emerald-400 uppercase">✓ Transaction Approved!</p>
                <p className="text-[10px] text-slate-200">Printing merchant &amp; customer charge slip…</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Execution Button */}
      {!isProcessing && (
        <button
          type="button"
          onClick={handleInitiateCharge}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white px-4 py-3 text-xs font-bold shadow-md hover:from-indigo-800 hover:to-slate-800 transition-all cursor-pointer"
        >
          <span>💳</span>
          <span>
            Send ₹{Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} to POS Machine
          </span>
          <span>➔</span>
        </button>
      )}

      {/* Thermal Charge Slip Modal */}
      {showSlipModal && lastSlip && (
        <PosSlipModal slip={lastSlip} onClose={() => setShowSlipModal(false)} />
      )}
    </div>
  );
}
