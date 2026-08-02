import React, { useState, useMemo } from 'react';
import { InventoryItem, CycleCountRecord } from '../types';
import { Scale, AlertCircle, CheckCircle2, RefreshCw, FileText, Check, ArrowDownUp, Search, Filter } from 'lucide-react';

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
      // Create variance for some items (e.g. index 1, 3, 5, 8)
      let physicalQty = it.quantity;
      let status: 'MATCH' | 'SURPLUS' | 'SHORTAGE' = 'MATCH';

      if (idx === 1) {
        physicalQty = it.quantity - 18; // Shortage of 18 units
        status = 'SHORTAGE';
      } else if (idx === 3) {
        physicalQty = it.quantity + 25; // Surplus of 25 units
        status = 'SURPLUS';
      } else if (idx === 5) {
        physicalQty = it.quantity - 42; // Shortage of 42 units
        status = 'SHORTAGE';
      } else if (idx === 8) {
        physicalQty = it.quantity + 10; // Surplus of 10 units
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

      // Search match
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
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
      {/* Header & KPI Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-amber-50 text-amber-600 rounded-lg border border-amber-200">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
              <span>วิเคราะห์ผลต่างสต็อกนับจริง (Stock Variance Analysis)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-extrabold border border-amber-300">
                Cycle Count Discrepancy
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">
              เปรียบเทียบยอดคงเหลือในระบบ WMS กับ ยอดนับจริงล่าสุด (Cycle Count) เพื่อตรวจสอบความถูกต้องทันที
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleReAudit}
            disabled={isAuditing}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 flex items-center space-x-1.5 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin text-blue-600' : ''}`} />
            <span>รีเฟรชการตรวจสอบ</span>
          </button>
          <button
            onClick={handleExportAudit}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center space-x-1.5 transition-all"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>ส่งออกรายงาน Audit CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Widgets Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div className="text-[10px] font-bold text-slate-500 uppercase">อัตราความถูกต้องสต็อก (Accuracy)</div>
          <div className="text-lg font-black text-emerald-600">{stats.accuracyRate}%</div>
          <div className="text-[10px] text-slate-400 font-medium">ตรงกัน {stats.matchCount} / {stats.total} รายการ</div>
        </div>

        <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
          <div className="text-[10px] font-bold text-amber-800 uppercase">รายการที่มีผลต่าง (Discrepancies)</div>
          <div className="text-lg font-black text-amber-700">{stats.discrepancyCount} รายการ</div>
          <div className="text-[10px] text-amber-600 font-medium">ต้องรอการตรวจสอบปรับยอด</div>
        </div>

        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <div className="text-[10px] font-bold text-blue-800 uppercase">ผลต่างสุทธิ (Net Variance)</div>
          <div className={`text-lg font-black ${stats.netVariance < 0 ? 'text-red-600' : stats.netVariance > 0 ? 'text-emerald-600' : 'text-slate-800'}`}>
            {stats.netVariance > 0 ? `+${stats.netVariance}` : stats.netVariance} Units
          </div>
          <div className="text-[10px] text-blue-600 font-medium">ส่วนต่างระหว่าง Physical - System</div>
        </div>

        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col justify-center">
          <div className="text-[10px] font-bold text-slate-500 uppercase">สถานะ Audit ล่าสุด</div>
          <div className="text-xs font-bold text-slate-800 mt-1 flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>พร้อมใช้งาน (Live Synced)</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
        <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilterType('DISCREPANCY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              filterType === 'DISCREPANCY'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ⚠️ มีผลต่าง ({stats.discrepancyCount})
          </button>
          <button
            onClick={() => setFilterType('SHORTAGE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              filterType === 'SHORTAGE'
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            🔻 ยอดขาด (Shortage)
          </button>
          <button
            onClick={() => setFilterType('SURPLUS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              filterType === 'SURPLUS'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            🔺 ยอดเกิน (Surplus)
          </button>
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              filterType === 'ALL'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ทั้งหมด ({stats.total})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหา Model, Locator..."
            className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Variance Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px]">
            <tr>
              <th className="py-2.5 px-3">Model HE / Name</th>
              <th className="py-2.5 px-3">Location Code</th>
              <th className="py-2.5 px-3 text-right">ยอดในระบบ (WMS)</th>
              <th className="py-2.5 px-3 text-right">ยอดนับจริง (Cycle Count)</th>
              <th className="py-2.5 px-3 text-right">ผลต่าง (Variance Δ)</th>
              <th className="py-2.5 px-3 text-center">สถานะ</th>
              <th className="py-2.5 px-3 text-center">ผู้ตรวจสอบ / วันที่</th>
              <th className="py-2.5 px-3 text-center">การจัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {filteredRecords.length > 0 ? (
              filteredRecords.map((rec) => {
                const isResolved = resolvedIds.has(rec.id);
                return (
                  <tr key={rec.id} className={`hover:bg-slate-50 transition-colors ${isResolved ? 'bg-slate-50/50 opacity-60' : ''}`}>
                    <td className="py-2.5 px-3 font-bold text-slate-800">
                      <div>{rec.modelHE}</div>
                      <div className="text-[10px] text-slate-500 font-normal truncate max-w-[150px]">{rec.partName}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-700">{rec.locatorCode}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-700">{rec.systemQty.toLocaleString()} U</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">{rec.physicalQty.toLocaleString()} U</td>
                    <td className="py-2.5 px-3 text-right font-extrabold">
                      {isResolved ? (
                        <span className="text-emerald-600 font-bold">0 (ปรับยอดแล้ว)</span>
                      ) : rec.varianceQty < 0 ? (
                        <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                          {rec.varianceQty} U
                        </span>
                      ) : rec.varianceQty > 0 ? (
                        <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          +{rec.varianceQty} U
                        </span>
                      ) : (
                        <span className="text-slate-500">0 U</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {isResolved ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>ปรับยอดแล้ว</span>
                        </span>
                      ) : rec.varianceQty < 0 ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-bold">
                          <AlertCircle className="w-3 h-3" />
                          <span>ขาดสต็อก (Shortage)</span>
                        </span>
                      ) : rec.varianceQty > 0 ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                          <AlertCircle className="w-3 h-3" />
                          <span>สต็อกเกิน (Surplus)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>ตรงกัน (Match)</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center text-[10px] text-slate-500">
                      <div>{rec.counterName}</div>
                      <div className="font-mono text-slate-400">{rec.lastCountDate}</div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {!isResolved && rec.varianceQty !== 0 ? (
                        <button
                          onClick={() => handleResolve(rec)}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] rounded shadow-xs transition-all flex items-center space-x-1 mx-auto"
                          title="อนุมัติปรับยอดคงเหลือใน WMS ให้ตรงกับ Cycle Count"
                        >
                          <Check className="w-3 h-3" />
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
                <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                  <div className="flex flex-col items-center space-y-1">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    <span className="font-bold text-slate-700">ไม่พบผลต่างสต็อก หรือปรับยอดเสร็จสิ้นแล้ว</span>
                    <span className="text-[11px] text-slate-400">ยอดคงเหลือใน WMS ตรงกับผลการนับ Cycle Count ทุกรายการ</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
