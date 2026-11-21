'use client';

import React, { useState, useRef } from 'react';
import { btnCls, btnGhostCls } from './ui';

interface BulkImporterModalProps {
  type: 'rooms' | 'menu';
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function BulkImporterModal({ type, isOpen, onClose, onSuccess }: BulkImporterModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState<{ ok?: string; error?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const isRooms = type === 'rooms';

  // Sample CSV Templates
  const downloadSampleCsv = () => {
    let headers: string;
    let sampleContent: string;
    let filename: string;

    if (isRooms) {
      headers = 'Room Number,Floor,Room Category,Base Rate,Hourly Rate';
      sampleContent = [
        headers,
        '101,1,Standard Room,2500,350',
        '102,1,Standard Room,2500,350',
        '103,1,Deluxe Room,3500,450',
        '201,2,Deluxe Room,3500,450',
        '202,2,Executive Suite,5500,700',
        '301,3,Presidential Suite,12000,1500',
      ].join('\n');
      filename = 'rooms_import_template.csv';
    } else {
      headers = 'Dish Name,Category,Price,Food Type,Description,Item Code,GST Rate';
      sampleContent = [
        headers,
        'Paneer Butter Masala,Main Course,340,veg,Rich velvety cashew-tomato gravy with chargrilled cottage cheese,DISH-001,5',
        'Old Delhi Butter Chicken,Main Course,480,non_veg,Slow-cooked tandoori chicken simmered in rich makhani gravy,DISH-002,5',
        'Amritsari Kulcha,Breads,95,veg,Flaky whole wheat bread stuffed with spiced potatoes and crushed carom,DISH-003,5',
        'Garlic & Herb Naan,Breads,75,veg,Charred clay oven leavened bread brushed with garlic butter,DISH-004,5',
        'Ginger Kulhad Chai,Beverages,60,veg,Assam strong tea infused with crushed ginger and green cardamom,DISH-005,5',
        'Gulab Jamun with Rabdi,Desserts,140,veg,Warm milk dumplings soaked in saffron syrup served with reduced rabdi,DISH-006,5',
      ].join('\n');
      filename = 'menu_import_template.csv';
    }

    const blob = new Blob([sampleContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCsv = (text: string) => {
    setParseErrors([]);
    setResultMessage(null);
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      setParsedRows([]);
      setParseErrors(['CSV file must contain a header row and at least one data row.']);
      return;
    }

    // Split CSV line respecting quotes
    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          inQuotes = !inQuotes;
        } else if (c === ',' && !inQuotes) {
          result.push(cur.trim());
          cur = '';
        } else {
          cur += c;
        }
      }
      result.push(cur.trim());
      return result;
    };

    const header = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const rows: any[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = parseLine(lines[i]);
      if (parts.length === 0 || (parts.length === 1 && !parts[0])) continue;

      const rowMap: Record<string, string> = {};
      header.forEach((h, idx) => {
        rowMap[h] = parts[idx] || '';
      });

      if (isRooms) {
        const number =
          rowMap['roomnumber'] || rowMap['room'] || rowMap['number'] || parts[0];
        const floor =
          parseInt(rowMap['floor'] || parts[1] || '1', 10) || 1;
        const roomType =
          rowMap['roomcategory'] || rowMap['category'] || rowMap['type'] || rowMap['roomtype'] || parts[2] || 'Standard';
        const baseRate =
          parseFloat(rowMap['baserate'] || rowMap['rate'] || rowMap['price'] || parts[3] || '2500') || 2500;
        const hourlyRate =
          parseFloat(rowMap['hourlyrate'] || parts[4] || '350') || 350;

        if (!number) {
          errors.push(`Row ${i + 1}: Missing room number.`);
          continue;
        }

        rows.push({
          number,
          floor,
          roomType,
          baseRate,
          hourlyRate,
        });
      } else {
        const name =
          rowMap['dishname'] || rowMap['name'] || rowMap['item'] || parts[0];
        const categoryName =
          rowMap['category'] || rowMap['categoryname'] || parts[1] || 'General';
        const price =
          parseFloat(rowMap['price'] || rowMap['rate'] || parts[2] || '0') || 0;
        const foodType =
          rowMap['foodtype'] || rowMap['type'] || parts[3] || 'veg';
        const description =
          rowMap['description'] || rowMap['desc'] || parts[4] || '';
        const itemCode =
          rowMap['itemcode'] || rowMap['code'] || parts[5] || undefined;
        const gstRate =
          parseFloat(rowMap['gstrate'] || rowMap['gst'] || parts[6] || '5') || 5;

        if (!name) {
          errors.push(`Row ${i + 1}: Missing dish name.`);
          continue;
        }

        rows.push({
          name,
          categoryName,
          price,
          foodType: foodType.toLowerCase().includes('non') ? 'non_veg' : foodType.toLowerCase().includes('egg') ? 'egg' : 'veg',
          description,
          itemCode,
          gstRate,
        });
      }
    }

    setParsedRows(rows);
    setParseErrors(errors);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = String(evt.target?.result || '');
      setCsvText(text);
      parseCsv(text);
    };
    reader.readAsText(file);
  };

  const handlePasteChange = (val: string) => {
    setCsvText(val);
    parseCsv(val);
  };

  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) return;
    setIsSubmitting(true);
    setResultMessage(null);

    try {
      const endpoint = isRooms
        ? '/api/rooms/bulk-import'
        : '/api/restaurant/menu/items/bulk-import';
      const payload = isRooms ? { rooms: parsedRows } : { items: parsedRows };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Import failed');
      }

      setResultMessage({ ok: data.message || `Successfully imported ${parsedRows.length} items!` });
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setResultMessage({ error: err.message || 'Bulk import failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900 sm:p-8">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-5 dark:border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-100 text-lg font-bold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-400">
                {isRooms ? '🏨' : '🍽️'}
              </span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {isRooms ? 'Bulk Onboard Rooms' : 'Bulk Import Restaurant Menu'}
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {isRooms
                ? 'Import your entire room inventory in seconds with auto-floor mapping & rate setup.'
                : 'Upload your food & bar menu with categories, veg/non-veg tags, and GST rates.'}
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Action Top Bar */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 dark:bg-white/[0.03]">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === 'upload'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-white/10 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              📁 Upload CSV File
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('paste')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === 'paste'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-white/10 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              📋 Paste CSV Text
            </button>
          </div>

          <button
            type="button"
            onClick={downloadSampleCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            📥 Download Sample Template (.CSV)
          </button>
        </div>

        {/* Input Area */}
        <div className="mt-4">
          {activeTab === 'upload' ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-6 text-center hover:border-slate-400 dark:border-white/20 dark:bg-white/[0.02]"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <span className="text-3xl">📄</span>
              <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                {fileName ? fileName : 'Click to select CSV file from your computer'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Standard .csv spreadsheet files (Excel / Google Sheets export) supported
              </p>
            </div>
          ) : (
            <textarea
              rows={4}
              value={csvText}
              onChange={(e) => handlePasteChange(e.target.value)}
              placeholder={
                isRooms
                  ? 'Room Number,Floor,Room Category,Base Rate,Hourly Rate\n101,1,Standard Room,2500,350\n102,1,Deluxe Room,3500,450'
                  : 'Dish Name,Category,Price,Food Type,Description\nPaneer Butter Masala,Main Course,340,veg,Rich cashew gravy\nButter Chicken,Main Course,480,non_veg,Tandoori roasted in makhani'
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-900 focus:border-slate-400 focus:outline-none dark:border-white/10 dark:bg-slate-950 dark:text-slate-200"
            />
          )}
        </div>

        {/* Feedback Banners */}
        {parseErrors.length > 0 && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
            {parseErrors.join(' • ')}
          </div>
        )}

        {resultMessage?.ok && (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
            ✓ {resultMessage.ok}
          </div>
        )}

        {resultMessage?.error && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-900 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
            ✕ {resultMessage.error}
          </div>
        )}

        {/* Parsed Rows Preview */}
        {parsedRows.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between pb-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>
                Preview: <strong className="text-emerald-600">{parsedRows.length}</strong> records ready to import
              </span>
              <span className="text-[11px] text-slate-400">Scroll to view all</span>
            </div>
            <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 dark:border-white/10">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {isRooms ? (
                    <tr>
                      <th className="p-2.5">Room #</th>
                      <th className="p-2.5">Floor</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5">Base Rate (₹)</th>
                      <th className="p-2.5">Hourly Rate (₹)</th>
                    </tr>
                  ) : (
                    <tr>
                      <th className="p-2.5">Dish Name</th>
                      <th className="p-2.5">Category</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Price (₹)</th>
                      <th className="p-2.5">Code</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {parsedRows.slice(0, 50).map((r, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                      {isRooms ? (
                        <>
                          <td className="p-2.5 font-bold text-slate-900 dark:text-white">{r.number}</td>
                          <td className="p-2.5 text-slate-600 dark:text-slate-300">Floor {r.floor}</td>
                          <td className="p-2.5 text-slate-800 dark:text-slate-200">{r.roomType}</td>
                          <td className="p-2.5 font-semibold text-emerald-600">₹{r.baseRate}</td>
                          <td className="p-2.5 text-slate-500">₹{r.hourlyRate}/hr</td>
                        </>
                      ) : (
                        <>
                          <td className="p-2.5 font-bold text-slate-900 dark:text-white">{r.name}</td>
                          <td className="p-2.5 text-slate-600 dark:text-slate-300">{r.categoryName}</td>
                          <td className="p-2.5">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                r.foodType === 'veg'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-400'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-400'
                              }`}
                            >
                              {r.foodType}
                            </span>
                          </td>
                          <td className="p-2.5 font-semibold text-emerald-600">₹{r.price}</td>
                          <td className="p-2.5 text-slate-500">{r.itemCode || 'Auto'}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-white/10">
          <button type="button" onClick={onClose} className={btnGhostCls}>
            Cancel
          </button>
          <button
            type="button"
            disabled={parsedRows.length === 0 || isSubmitting}
            onClick={handleExecuteImport}
            className={`${btnCls} bg-emerald-600 hover:bg-emerald-700 text-white`}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Importing {parsedRows.length} Items...
              </span>
            ) : (
              `Import ${parsedRows.length > 0 ? `${parsedRows.length} ` : ''}Records Now →`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
