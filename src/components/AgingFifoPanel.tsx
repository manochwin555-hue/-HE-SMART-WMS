import React, { useState, useMemo } from 'react';
import { InventoryItem, StorageZone, AgingThresholdConfig } from '../types';
import { 
  ClockAlert, 
  AlertTriangle, 
  Layers, 
  ArrowUpRight, 
  CheckCircle2, 
  Flame, 
  Search, 
  Clock, 
  Download,
  Package,
  Sliders,
  Settings
} from 'lucide-react';

interface AgingFifoPanelProps {
  items: InventoryItem[];
  agingConfig?: AgingThresholdConfig;
  onOpen3DForLocator: (zone: StorageZone, bayNumber: number) => void;
  onQuickPickItem: (item: InventoryItem) => void;
  onOpenAgingSettings?: () => void;
}

export const AgingFifoPanel: React.FC<AgingFifoPanelProps> = ({
  items,
  agingConfig = { safeDaysMax: 14, warningDaysMax: 30, criticalDays: 30, autoAlertEnabled: true, notifyOnFifoViolation: true, customRuleName: 'มาตรฐาน LGE (14/30 วัน)' },
  onOpen3DForLocator,
  onQuickPickItem,
  onOpenAgingSettings,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [zoneFilter, setZoneFilter] = useState<string>('ALL');
  const [agingCategory, setAgingCategory] = useState<'ALL' | 'NORMAL' | 'WARNING' | 'OVERDUE'>('ALL');
  const [lineFilter, setLineFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'AGING_DESC' | 'QTY_ASC' | 'QTY_DESC' | 'MODEL_ASC'>('AGING_DESC');

  const safeMax = agingConfig.safeDaysMax;
  const criticalThreshold = agingConfig.criticalDays;

  const safeCount = items.filter((i) => i.agingDays <= safeMax).length;
  const warningCount = items.filter((i) => i.agingDays > safeMax && i.agingDays <= criticalThreshold).length;
  const overdueCount = items.filter((i) => i.agingDays > criticalThreshold).length;

  // Filter and sort items according to search & filter criteria
  const filteredAgingItems = useMemo(() => {
    const list = items.filter((item) => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.modelHE.toLowerCase().includes(q) ||
        item.partName.toLowerCase().includes(q) ||
        item.locatorCode.toLowerCase().includes(q) ||
        item.useLine.toLowerCase().includes(q) ||
        `zone ${item.zone}`.toLowerCase().includes(q) ||
        `${item.zone}${item.bayNumber}`.toLowerCase().includes(q);

      const matchZone = zoneFilter === 'ALL' || item.zone === zoneFilter;
      const matchLine = lineFilter === 'ALL' || item.useLine === lineFilter;

      let matchCategory = true;
      if (agingCategory === 'NORMAL') {
        matchCategory = item.agingDays <= safeMax;
      } else if (agingCategory === 'WARNING') {
        matchCategory = item.agingDays > safeMax && item.agingDays <= criticalThreshold;
      } else if (agingCategory === 'OVERDUE') {
        matchCategory = item.agingDays > criticalThreshold;
      }

      return matchSearch && matchZone && matchLine && matchCategory;
    });

    if (sortBy === 'QTY_ASC') {
      return [...list].sort((a, b) => a.quantity - b.quantity);
    } else if (sortBy === 'QTY_DESC') {
      return [...list].sort((a, b) => b.quantity - a.quantity);
    } else if (sortBy === 'MODEL_ASC') {
      return [...list].sort((a, b) => a.modelHE.localeCompare(b.modelHE));
    }

    // Default: FIFO order by Aging Days highest first
    return [...list].sort((a, b) => b.agingDays - a.agingDays);
  }, [items, searchTerm, zoneFilter, agingCategory, lineFilter, sortBy, safeMax, criticalThreshold]);

  // Export to Excel / CSV
  const handleExportCSV = () => {
    const headers = [
      'Model HE',
      'Part Name',
      'Locator Code',
      'Zone',
      'Bay',
      'Level',
      'Quantity',
      'Aging Days',
      'FIFO Status',
      'Line',
      'QR Code'
    ];

    const rows = filteredAgingItems.map((item) => {
      const statusStr = item.agingDays > criticalThreshold ? 'OVERDUE' : item.agingDays > safeMax ? 'WARNING' : 'NORMAL';
      return [
        item.modelHE,
        `"${item.partName}"`,
        item.locatorCode,
        item.zone,
        item.bayNumber,
        item.level,
        item.quantity,
        item.agingDays,
        statusStr,
        item.useLine,
        `"${item.qrCode}"`
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('download', `WMS_FIFO_Aging_List_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-5 lg:p-6 shadow-sm text-slate-900 space-y-4 w-full min-w-0 max-w-full">
      {/* Table Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 sm:pb-4 border-b border-slate-200 gap-3 sm:gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <ClockAlert className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-800">
              ระบบควบคุม Aging & ลำดับการเบิกจ่าย FIFO (First-In, First-Out)
            </h2>
          </div>
          <div className="flex items-center space-x-2 mt-0.5">
            <p className="text-xs text-slate-500">
              เกณฑ์ปัจจุบัน: ปกติ (&le;{safeMax} วัน) • เริ่มค้าง ({safeMax + 1}-{criticalThreshold} วัน) • Overdue (&gt;{criticalThreshold} วัน)
            </p>
            {agingConfig.customRuleName && (
              <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-1.5 py-0.5 rounded border border-blue-200">
                {agingConfig.customRuleName}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenAgingSettings && (
            <button
              onClick={onOpenAgingSettings}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 shadow-sm flex items-center space-x-1.5 transition-all"
            >
              <Sliders className="w-4 h-4 text-slate-600" />
              <span>ปรับเกณฑ์วัน Aging</span>
            </button>
          )}
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center space-x-1.5 transition-all"
          >
            <Download className="w-4 h-4 text-white" />
            <span>ส่งออก Excel (.csv)</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3.5 flex items-center justify-between shadow-2xs">
          <div>
            <div className="text-xs text-emerald-800 font-semibold">ระยะจัดเก็บปกติ (&le; {safeMax} วัน)</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{safeCount} <span className="text-xs text-slate-500 font-medium">รายการ</span></div>
          </div>
          <CheckCircle2 className="w-6 h-6 text-emerald-600 opacity-80" />
        </div>

        <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3.5 flex items-center justify-between shadow-2xs">
          <div>
            <div className="text-xs text-amber-800 font-semibold">เริ่มค้างนาน ({safeMax + 1} - {criticalThreshold} วัน)</div>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{warningCount} <span className="text-xs text-slate-500 font-medium">รายการ</span></div>
          </div>
          <AlertTriangle className="w-6 h-6 text-amber-600 opacity-80" />
        </div>

        <div className="bg-red-50/70 border border-red-200 rounded-lg p-3.5 flex items-center justify-between shadow-2xs">
          <div>
            <div className="text-xs text-red-800 font-semibold">เตือน FIFO Overdue (&gt; {criticalThreshold} วัน)</div>
            <div className="text-xl font-bold text-red-600 mt-0.5">{overdueCount} <span className="text-xs text-slate-500 font-medium">รายการ</span></div>
          </div>
          <Flame className="w-6 h-6 text-red-500 animate-bounce" />
        </div>
      </div>

      {/* Compact Search & Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 sm:p-3 text-white shadow-xs space-y-2.5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหา Model, Part Name, Locator, Zone, Line..."
              className="w-full bg-slate-800 border border-slate-700 focus:border-blue-500 rounded-lg pl-8 pr-7 py-1 text-xs text-white placeholder-slate-400 focus:outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Zone Filter */}
          <select
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 font-bold px-2 py-1 rounded-lg text-xs focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">ทุก Zone</option>
            {(['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'] as StorageZone[]).map((z) => (
              <option key={z} value={z}>Zone {z}</option>
            ))}
          </select>

          {/* Line Filter */}
          <select
            value={lineFilter}
            onChange={(e) => setLineFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 font-bold px-2 py-1 rounded-lg text-xs focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">ทุก Line</option>
            {['HE1', 'HE2', 'HE3', 'REPAIR'].map((l) => (
              <option key={l} value={l}>Line {l}</option>
            ))}
          </select>

          {/* Sort By Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-800 border border-slate-700 text-amber-300 font-bold px-2 py-1 rounded-lg text-xs focus:outline-none focus:border-amber-400"
          >
            <option value="AGING_DESC">⏰ เรียง FIFO (วันมากสุดก่อน)</option>
            <option value="QTY_ASC">📉 ยอดคงเหลือน้อยสุดก่อน</option>
            <option value="QTY_DESC">📈 ยอดคงเหลือมากสุดก่อน</option>
            <option value="MODEL_ASC">🔤 รหัส Model (A-Z)</option>
          </select>
        </div>

        {/* Row 2: Status Filter Chips */}
        <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center flex-wrap gap-1 font-bold">
            {[
              { id: 'ALL', label: `ทั้งหมด (${items.length})` },
              { id: 'NORMAL', label: `ปกติ (${safeCount})` },
              { id: 'WARNING', label: `เริ่มค้าง (${warningCount})` },
              { id: 'OVERDUE', label: `Overdue (${overdueCount})` }
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setAgingCategory(st.id as any)}
                className={`px-2.5 py-1 rounded-lg border text-xs transition-all ${
                  agingCategory === st.id
                    ? st.id === 'OVERDUE'
                      ? 'bg-red-600 text-white border-red-500 font-black shadow-xs'
                      : st.id === 'WARNING'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-xs'
                      : 'bg-blue-600 text-white border-blue-500 font-black shadow-xs'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-[11px] text-slate-400">
              แสดง {filteredAgingItems.length} รายการ
            </span>
            {(searchTerm || zoneFilter !== 'ALL' || agingCategory !== 'ALL' || lineFilter !== 'ALL' || sortBy !== 'AGING_DESC') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setZoneFilter('ALL');
                  setAgingCategory('ALL');
                  setLineFilter('ALL');
                  setSortBy('AGING_DESC');
                }}
                className="px-2 py-1 bg-red-900/40 hover:bg-red-900/60 text-red-300 rounded-lg text-[11px] font-bold transition-all border border-red-800"
              >
                ล้างตัวกรอง
              </button>
            )}
          </div>
        </div>
      </div>

      {/* FIFO Recommendation Data Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] border-b border-slate-200">
            <tr>
              <th className="px-3.5 py-3">สถานะ Aging (FIFO)</th>
              <th className="px-3.5 py-3">รหัสวัตถุดิบ (Model HE)</th>
              <th className="px-3.5 py-3">ชื่อ Tool (Tool Name)</th>
              <th className="px-3.5 py-3">ตำแหน่ง (Rack & ชั้น)</th>
              <th className="px-3.5 py-3 text-right">จำนวนคงเหลือ (Qty)</th>
              <th className="px-3.5 py-3 text-center">อายุสต็อก (วัน)</th>
              <th className="px-3.5 py-3">ไลน์ผลิต (Line)</th>
              <th className="px-3.5 py-3 text-center">ส่อง 3D</th>
              <th className="px-3.5 py-3 text-center">ดำเนินการเบิก</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredAgingItems.length > 0 ? (
              filteredAgingItems.map((item) => {
                const isCritical = item.agingDays > criticalThreshold;
                const isWarning = item.agingDays > safeMax && item.agingDays <= criticalThreshold;

                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    {/* Status Badge */}
                    <td className="px-3.5 py-2.5">
                      {isCritical ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-extrabold border border-rose-200 text-[10px] animate-pulse">
                          <Flame className="w-3 h-3 text-rose-600" />
                          <span>Overdue ({item.agingDays} วัน)</span>
                        </span>
                      ) : isWarning ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-extrabold border border-amber-200 text-[10px]">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>เริ่มค้างนาน ({item.agingDays} วัน)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-extrabold border border-emerald-200 text-[10px]">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>ปกติ FIFO ({item.agingDays} วัน)</span>
                        </span>
                      )}
                    </td>

                    {/* Model HE */}
                    <td className="px-3.5 py-2.5 font-mono font-bold text-slate-900">
                      {item.modelHE}
                    </td>

                    {/* Tool Name */}
                    <td className="px-3.5 py-2.5 font-medium text-slate-800">
                      <div>{item.partName}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        QR: {item.qrCode}
                      </div>
                    </td>

                    {/* Locator - Separated Rack & Level */}
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-extrabold text-[10px] border border-blue-200">
                          Rack {item.zone}{item.bayNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-extrabold text-[10px] border border-amber-200">
                          ชั้น {item.level}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {item.locatorCode}
                      </div>
                    </td>

                    {/* Quantity */}
                    <td className="px-3.5 py-2.5 text-right font-mono font-bold text-emerald-600">
                      {item.quantity.toLocaleString()} U
                    </td>

                    {/* Aging Days */}
                    <td className="px-3.5 py-2.5 text-center font-mono font-bold text-slate-800">
                      {item.agingDays} วัน
                    </td>

                    {/* Line */}
                    <td className="px-3.5 py-2.5">
                      <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold text-[10px] border border-indigo-200">
                        Line {item.useLine}
                      </span>
                    </td>

                    {/* 3D Action */}
                    <td className="px-3.5 py-2.5 text-center">
                      <button
                        onClick={() => onOpen3DForLocator(item.zone, item.bayNumber)}
                        className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-all border border-blue-200 inline-flex items-center justify-center"
                        title="ส่องช่องนี้ในรูปแบบ 3D"
                      >
                        <Layers className="w-4 h-4" />
                      </button>
                    </td>

                    {/* Pick Action */}
                    <td className="px-3.5 py-2.5 text-center">
                      <button
                        onClick={() => onQuickPickItem(item)}
                        className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs inline-flex items-center space-x-1 shadow-sm transition-all active:scale-95"
                        title="เลือกเบิกชิ้นนี้ตามลำดับ FIFO"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span>เลือกเบิก</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-500 font-medium">
                  ไม่พบรายการวัตถุดิบตรงกับเงื่อนไขการค้นหา
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

