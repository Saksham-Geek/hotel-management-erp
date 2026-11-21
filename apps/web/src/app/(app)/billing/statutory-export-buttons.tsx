'use client';

import React, { useState } from 'react';

export function StatutoryExportButtons() {
  const [isExportingGstr1, setIsExportingGstr1] = useState(false);
  const [isExportingTally, setIsExportingTally] = useState(false);

  const handleDownloadGstr1 = async () => {
    setIsExportingGstr1(true);
    try {
      const res = await fetch('/api/export/gstr-1');
      if (!res.ok) throw new Error('Failed to generate GSTR-1');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `GSTR1_Government_Portal_${new Date().toISOString().slice(0, 7)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
      alert('Failed to export GSTR-1 JSON. Please try again.');
    } finally {
      setIsExportingGstr1(false);
    }
  };

  const handleDownloadTally = async () => {
    setIsExportingTally(true);
    try {
      const res = await fetch('/api/export/tally-xml');
      if (!res.ok) throw new Error('Failed to generate Tally XML');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Tally_Sales_Vouchers_${new Date().toISOString().slice(0, 7)}.xml`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
      alert('Failed to export Tally Prime XML. Please try again.');
    } finally {
      setIsExportingTally(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={isExportingGstr1}
        onClick={handleDownloadGstr1}
        className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/80 px-3.5 py-2 text-xs font-bold text-blue-900 shadow-2xs hover:bg-blue-100 transition active:scale-95 disabled:opacity-50 dark:border-blue-500/30 dark:bg-blue-950/40 dark:text-blue-300"
      >
        <span>📥</span>
        <span>{isExportingGstr1 ? 'Generating JSON...' : 'Export GSTR-1 JSON'}</span>
      </button>

      <button
        type="button"
        disabled={isExportingTally}
        onClick={handleDownloadTally}
        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3.5 py-2 text-xs font-bold text-emerald-900 shadow-2xs hover:bg-emerald-100 transition active:scale-95 disabled:opacity-50 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300"
      >
        <span>📊</span>
        <span>{isExportingTally ? 'Generating XML...' : 'Export Tally XML'}</span>
      </button>
    </div>
  );
}
