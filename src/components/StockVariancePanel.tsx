import React, { useState, useMemo } from 'react';
import { InventoryItem, CycleCountRecord } from '../types';
import { 
  Scale, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  Download, 
  Check, 
  Search, 
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';

interface StockVariancePanelProps {
  items: InventoryItem[];
  onUpdateInventoryQty?: (itemId: string, newQty: number) => void;
}

export const StockVariancePanel: React.FC<StockVariancePanelProps> = ({ items, onUpdateInventoryQty }) => {
  const [filterType, setFilterType] = useState<'ALL' | 'DISCREPANCY' | 'SHORTAGE' | 'SURPLUS'>('DISCREPANCY');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const [isAuditing, setIsAuditing] = useState<boolean>(false);

  // Derive initial cycle count data with realistic variances for demonstration
  const [cycleData, setCycleData] = useState<CycleCountRecord[]>(() => {
    return items.map((it, idx) => {
      let physicalQty = it.quantity;
      let status: 'MATCH' | 'SURPLUS' | 'SHORTAGE' = 'MATCH';

      if (idx === 1) {
        physicalQty = it.quantity - 18;
        status = 'SHORTAGE';
      } else if (idx === 3) {
        physicalQty = it.quantity + 25;
        status = 'SURPLUS';
      } else if (idx === 5) {
        physicalQty = it.quantity - 42;
        status = 'SHORTAGE';
      } else if (idx === 8) {
        physicalQty = it.quantity + 10;
        status = 'SURPLUS';
      } else if (idx % 4 === 0 && idx > 0) {
        physicalQty = it.quantity - (12 + (idx * 3) % 20);
        status = 'SHORTAGE';
      }

      const varianceQty = physicalQty - it.quantity;

      return {
        id: `cycle-${it.id}`,
        modelHE: it.modelHE,
        partName: it.partName,
        locatorCode: it.locatorCode,
        systemQty: it.quantity,
        physicalQty,
        varianceQty,
        lastCountDate: new Date(Date.now() - (idx * 86400000 * 2)).toISOString().slice(0, 10),
        counterName: idx % 2 === 0 ? 'Auditor A (Somchai)' : 'Auditor B (Narin)',
        status,
        resolved: false,
      };
    });
  });

  // Calculate Variance KPIs
  const stats = useMemo(() => {
    const total = cycleData.length;
    const matchCount = cycleData.filter((c) => c.varianceQty === 0 || resolvedIds.has(c.id)).length;
    const discrepancyCount = total - matchCount;
    const accuracyRate = total > 0 ? ((matchCount / total) * 100).toFixed(1) : '100';

    const netVariance = cycleData.reduce((acc, curr) => {
      if (resolvedIds.has(curr.id)) return acc;
      return acc + curr.varianceQty;
    }, 0);

    return { total, matchCount, discrepancyCount, accuracyRate, netVariance };
  }, [cycleData, resolvedIds]);

  // Filtered List
  const filteredRecords = useMemo(() => {
    return cycleData.filter((rec) => {
      const isResolved = resolvedIds.has(rec.id);

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        rec.modelHE.toLowerCase().includes(q) ||
        rec.partName.toLowerCase().includes(q) ||
        rec.locatorCode.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (filterType === 'DISCREPANCY') {
        return (rec.varianceQty !== 0) && !isResolved;
      }
      if (filterType === 'SHORTAGE') {
        return rec.varianceQty < 0 && !isResolved;
      }
      if (filterType === 'SURPLUS') {
        return rec.varianceQty > 0 && !isResolved;
      }
      return true; // ALL
    });
  }, [cycleData, filterType, searchQuery, resolvedIds]);

  // Handle Approve Adjustment
  const handleResolve = (record: CycleCountRecord) => {
    setResolvedIds((prev) => new Set(prev).add(record.id));
    if (onUpdateInventoryQty) {
      onUpdateInventoryQty(record.id.replace('cycle-', ''), record.physicalQty);
    }
  };

  // Handle Run New Audit Sync
  const handleReAudit = () => {
    setIsAuditing(true);
    setTimeout(() => {
      setIsAuditing(false);
    }, 600);
  };

  // Export Audit CSV
  const handleExportAudit = () => {
    const headers = ['Model HE', 'Part Name', 'Location Code', 'System Qty', 'Cycle Count Qty', 'Variance Qty', 'Status', 'Last Audit Date', 'Auditor'];
    const rows = cycleData.map((c) => [
      c.modelHE,
      `"${c.partName}"`,
      c.locatorCode,
      c.systemQty,
      c.physicalQty,
      c.varianceQty,
      resolvedIds.has(c.id) ? 'RESOLVED' : c.status,
      c.lastCountDate,
      c.counterName,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Stock_Variance_Audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-5 lg:p-6 shadow-sm text-slate-900 space-y-4 w-full min-w-0 max-w-full">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 sm:pb-4 border-b border-slate-200 gap-3 sm:gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Scale className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-800">
              วิเคราะห์ผลต่างสต็อกนับจริง (Stock Variance & Cycle Count)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            เปรียบเทียบยอดคงเหลือในระบบ WMS กับยอดนับจริงล่าสุด เพื่อตรวจสอบความถูกต้องและปรับยอดอัตโนมัติ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleReAudit}
            disabled={isAuditing}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 flex items-center space-x-1.5 transition-all active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin text-blue-600' : ''}`} />
            <span>รีเฟรชการตรวจสอบ</span>
          </button>

          <button
            onClick={handleExportAudit}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center space-x-1.5 transition-all"
          >
            <Download className="w-4 h-4 text-white" />
            <span>ส่งออก Excel (.csv)</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3.5 shadow-2xs">
          <div className="text-[11px] font-bold text-emerald-800 uppercase">ความถูกต้องสต็อก (Accuracy)</div>
          <div className="text-xl font-bold text-emerald-600 mt-0.5">{stats.accuracyRate}%</div>
          <div className="text-[10px] text-slate-500 font-medium">ตรงกัน {stats.matchCount} / {stats.total} รายการ</div>
        </div>

        <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3.5 shadow-2xs">
          <div className="text-[11px] font-bold text-amber-800 uppercase">มีผลต่าง (Discrepancy)</div>
          <div className="text-xl font-bold text-amber-700 mt-0.5">{stats.discrepancyCount} รายการ</div>
          <div className="text-[10px] text-amber-700 font-medium">รอการตรวจสอบปรับยอด</div>
        </div>

        <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3.5 shadow-2xs">
          <div className="text-[11px] font-bold text-blue-800 uppercase">ผลต่างสุทธิ (Net Variance)</div>
          <div className={`text-xl font-bold mt-0.5 ${stats.netVariance < 0 ? 'text-red-600' : stats.netVariance > 0 ? 'text-emerald-600' : 'text-slate-800'}`}>
            {stats.netVariance > 0 ? `+${stats.netVariance}` : stats.netVariance} Units
          </div>
          <div className="text-[10px] text-blue-700 font-medium">Physical - System</div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex flex-col justify-center shadow-2xs">
          <div className="text-[11px] font-bold text-slate-600 uppercase">สถานะ Audit ล่าสุด</div>
          <div className="text-xs font-bold text-slate-800 mt-1 flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>พร้อมใช้งาน (Live Synced)</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาตาม Model HE, Part Name, Locator..."
              className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm"
            />
          </div>

          {/* Filter Status Segmented Buttons */}
          <div className="flex bg-slate-200/80 p-1 rounded-lg border border-slate-200 text-xs">
            {[
              { id: 'DISCREPANCY', label: `มีผลต่าง (${stats.discrepancyCount})` },
              { id: 'SHORTAGE', label: 'ยอดขาด (Short)' },
              { id: 'SURPLUS', label: 'ยอดเกิน (Surplus)' },
              { id: 'ALL', label: `ทั้งหมด (${stats.total})` }
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setFilterType(st.id as any)}
                className={`flex-1 py-1 rounded-md font-medium transition-all ${
                  filterType === st.id ? 'bg-blue-600 text-white shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Variance Data Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] border-b border-slate-200">
            <tr>
              <th className="px-3.5 py-3">รหัสวัตถุดิบ (Model HE)</th>
              <th className="px-3.5 py-3">ชื่อ Tool (Tool Name)</th>
              <th className="px-3.5 py-3">ตำแหน่ง (Locator Code)</th>
              <th className="px-3.5 py-3 text-right">ยอดในระบบ (WMS)</th>
              <th className="px-3.5 py-3 text-right">ยอดนับจริง (Count)</th>
              <th className="px-3.5 py-3 text-right">ผลต่าง (&Delta; Variance)</th>
              <th className="px-3.5 py-3 text-center">สถานะ</th>
              <th className="px-3.5 py-3 text-center">ผู้ตรวจสอบ / วันที่</th>
              <th className="px-3.5 py-3 text-center">การจัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRecords.length > 0 ? (
              filteredRecords.map((rec) => {
                const isResolved = resolvedIds.has(rec.id);
                return (
                  <tr key={rec.id} className={`hover:bg-slate-50 transition-colors ${isResolved ? 'bg-slate-50/50 opacity-60' : ''}`}>
                    {/* Model HE */}
                    <td className="px-3.5 py-2.5 font-mono font-bold text-slate-900">
                      {rec.modelHE}
                    </td>

                    {/* Part Name */}
                    <td className="px-3.5 py-2.5 font-medium text-slate-800">
                      <div>{rec.partName}</div>
                    </td>

                    {/* Locator Code */}
                    <td className="px-3.5 py-2.5 font-mono font-bold text-blue-700">
                      {rec.locatorCode}
                    </td>

                    {/* System Qty */}
                    <td className="px-3.5 py-2.5 text-right font-mono font-bold text-slate-700">
                      {rec.systemQty.toLocaleString()} U
                    </td>

                    {/* Physical Qty */}
                    <td className="px-3.5 py-2.5 text-right font-mono font-bold text-slate-900">
                      {rec.physicalQty.toLocaleString()} U
                    </td>

                    {/* Variance Qty */}
                    <td className="px-3.5 py-2.5 text-right font-mono font-extrabold">
                      {isResolved ? (
                        <span className="text-emerald-600 font-bold">0 (ปรับยอดแล้ว)</span>
                      ) : rec.varianceQty < 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-extrabold border border-rose-200 text-[10px]">
                          {rec.varianceQty} U
                        </span>
                      ) : rec.varianceQty > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-extrabold border border-emerald-200 text-[10px]">
                          +{rec.varianceQty} U
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">0 U</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="px-3.5 py-2.5 text-center">
                      {isResolved ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-extrabold border border-emerald-200 text-[10px]">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>ปรับยอดแล้ว</span>
                        </span>
                      ) : rec.varianceQty < 0 ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-extrabold border border-rose-200 text-[10px]">
                          <AlertCircle className="w-3 h-3 text-rose-600" />
                          <span>ขาดสต็อก</span>
                        </span>
                      ) : rec.varianceQty > 0 ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-extrabold border border-amber-200 text-[10px]">
                          <AlertCircle className="w-3 h-3 text-amber-600" />
                          <span>สต็อกเกิน</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-extrabold border border-emerald-200 text-[10px]">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>ตรงกัน</span>
                        </span>
                      )}
                    </td>

                    {/* Auditor / Date */}
                    <td className="px-3.5 py-2.5 text-center text-[10px] text-slate-500">
                      <div>{rec.counterName}</div>
                      <div className="font-mono text-slate-400">{rec.lastCountDate}</div>
                    </td>

                    {/* Action */}
                    <td className="px-3.5 py-2.5 text-center">
                      {!isResolved && rec.varianceQty !== 0 ? (
                        <button
                          onClick={() => handleResolve(rec)}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center space-x-1 mx-auto active:scale-95"
                          title="อนุมัติปรับยอดคงเหลือใน WMS ให้ตรงกับ Cycle Count"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>อนุมัติปรับยอด</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-500 font-medium">
                  ไม่พบผลต่างสต็อก หรือปรับยอดเสร็จสิ้นแล้ว
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
