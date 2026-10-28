import React, { useMemo } from 'react';
import { InventoryItem, MovementLog, WmsStats, AgingThresholdConfig } from '../types';
import { 
  ZoneKey, 
  ZoneKpiData, 
  calculateZoneKpis
} from '../utils/zoneKpiHelper';
import {
  Building2,
  Sparkles,
  Clock,
  Palette,
  ArrowDownRight,
  ArrowUpRight,
  Activity
} from 'lucide-react';

export interface ZoneKpiFormalDashboardProps {
  zoneKey: ZoneKey;
  items: InventoryItem[];
  logs?: MovementLog[];
  stats?: WmsStats;
  agingConfig?: AgingThresholdConfig;
  className?: string;
  // Kept for backward-compatibility if passed
  onSelectItem?: (item: InventoryItem) => void;
  compact?: boolean;
}

/**
 * Universal 4-Card bottom footer bar located directly beneath the layout across all zones:
 * 1. ความจุ (Sci-Fi Neon Level Bar)
 * 2. รับเข้า - รับออก / IN / OUT (Today's IN & OUT scans)
 * 3. Aging (Stock Aging status & FIFO breakdown)
 * 4. สถานะสีพาเลท (Color Coding Guide)
 */
export const ZoneKpiFormalDashboard: React.FC<ZoneKpiFormalDashboardProps> = ({
  zoneKey,
  items = [],
  logs = [],
  stats,
  agingConfig,
  className = ''
}) => {
  // Calculate zone-specific KPI values
  const kpiData: ZoneKpiData = useMemo(() => {
    return calculateZoneKpis(items, logs, zoneKey, agingConfig, stats);
  }, [items, logs, zoneKey, agingConfig, stats]);

  const netMovement = kpiData.todayInScans - kpiData.todayOutScans;

  return (
    <footer className={`py-3.5 sm:py-4 border-t border-slate-800 bg-[#070A0F] px-3 sm:px-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0 z-30 shadow-2xl sticky bottom-0 w-full ${className}`}>
      
      {/* คอลัมน์ 1: ความจุ & อัตราจัดเก็บ (Sci-Fi Neon Level Bar ขนาดใหญ่เต็มพื้นที่) */}
      <div className="flex items-center gap-3.5 min-w-0 pr-3 border-r border-slate-800">
        <div className="w-11 h-11 rounded-2xl bg-cyan-500/15 border-2 border-cyan-500/50 text-cyan-400 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
          <Building2 className="w-6 h-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between text-sm sm:text-base font-black text-slate-100 mb-1.5">
            <span>ความจุ &amp; อัตราจัดเก็บ</span>
            <div className="flex items-center gap-2 font-mono">
              <span className="text-white text-base sm:text-lg">{kpiData.occupiedPallets} / {kpiData.totalCapacityPallets} P</span>
              <span className="px-2.5 py-0.5 rounded-lg bg-cyan-500/25 border border-cyan-500/50 text-cyan-300 text-xs sm:text-sm font-black shadow-[0_0_8px_rgba(6,182,212,0.4)]">
                {kpiData.occupancyRatePercent}%
              </span>
            </div>
          </div>
          {/* Sci-Fi Neon Level Bar */}
          <div className="w-full bg-slate-950 border-2 border-cyan-500/60 h-4 sm:h-5 rounded-xl overflow-hidden p-0.5 shadow-[0_0_12px_rgba(6,182,212,0.25)] relative">
            <div 
              className="bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 h-full rounded-lg transition-all duration-500 shadow-[0_0_10px_rgba(52,211,153,0.6)] relative" 
              style={{ width: `${Math.max(4, kpiData.occupancyRatePercent)}%` }}
            >
              <div className="absolute right-0 top-0 bottom-0 w-2 bg-white rounded-full shadow-[0_0_8px_#ffffff]"></div>
            </div>
          </div>
          <div className="flex justify-between items-center text-xs sm:text-sm text-cyan-300 font-mono font-bold mt-1">
            <span>ว่าง {kpiData.emptyPallets} ช่อง</span>
            <span>ใช้งาน {kpiData.occupancyRatePercent}%</span>
          </div>
        </div>
      </div>

      {/* คอลัมน์ 2: รับเข้า - รับออก (IN / OUT วันนี้) */}
      <div className="flex items-center gap-3.5 min-w-0 px-3 border-r border-slate-800">
        <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border-2 border-emerald-500/50 text-emerald-400 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
          <Sparkles className="w-6 h-6" />
        </div>
        <div className="min-w-0 text-sm flex-1">
          <div className="font-black text-slate-100 text-sm sm:text-base mb-1">รับเข้า - รับออก (IN/OUT)</div>
          <div className="flex items-center gap-2 sm:gap-3 font-mono font-bold tabular-nums">
            <span className="text-emerald-400 flex items-center gap-1 text-xs sm:text-sm">
              <ArrowDownRight className="w-4 h-4" /> +IN +{kpiData.todayInScans}
            </span>
            <span className="text-amber-400 flex items-center gap-1 text-xs sm:text-sm">
              <ArrowUpRight className="w-4 h-4" /> -OUT -{kpiData.todayOutScans}
            </span>
            <span className="text-slate-100 text-xs sm:text-sm ml-auto">
              สุทธิ <b className="text-white font-black">{netMovement >= 0 ? `+${netMovement}` : netMovement} P</b>
            </span>
          </div>
        </div>
      </div>

      {/* คอลัมน์ 3: อายุสต็อก (FIFO / Aging) */}
      <div className="flex items-center gap-3.5 min-w-0 px-3 border-r border-slate-800">
        <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border-2 border-amber-500/50 text-amber-400 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.3)]">
          <Clock className="w-6 h-6" />
        </div>
        <div className="min-w-0 text-sm flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="font-black text-slate-100 text-sm sm:text-base">อายุสต็อก (FIFO/Aging)</span>
            <span className="text-rose-400 text-xs font-mono font-black">เกิน 30 วัน: {kpiData.agingOverdueCount} P</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 font-mono text-xs sm:text-sm font-black tabular-nums">
            <div className="bg-slate-900 border border-emerald-500/40 rounded-lg px-2 py-1 text-center">
              <span className="text-[10px] text-slate-400 block font-normal">&lt;14วัน</span>
              <span className="text-emerald-400">{kpiData.agingSafeCount}</span>
            </div>
            <div className="bg-slate-900 border border-amber-500/40 rounded-lg px-2 py-1 text-center">
              <span className="text-[10px] text-slate-400 block font-normal">15-30</span>
              <span className="text-amber-400">{kpiData.agingWarningCount}</span>
            </div>
            <div className="bg-slate-900 border border-rose-500/40 rounded-lg px-2 py-1 text-center">
              <span className="text-[10px] text-slate-400 block font-normal">&gt;30วัน</span>
              <span className="text-rose-400">{kpiData.agingOverdueCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* คอลัมน์ 4: สถานะสีพาเลท (Color Coding Guide) */}
      <div className="flex items-center gap-3 min-w-0 pl-2">
        <div className="w-11 h-11 rounded-2xl bg-purple-500/15 border-2 border-purple-500/50 text-purple-400 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(168,85,247,0.3)]">
          <Palette className="w-6 h-6" />
        </div>
        <div className="min-w-0 text-xs flex-1">
          <div className="font-black text-slate-100 text-sm sm:text-base truncate mb-1">สถานะสีพาเลท (Color Guide)</div>
          <div className="grid grid-cols-3 gap-1.5 text-[11px] font-mono font-black text-slate-100">
            <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-700">
              <span className="w-3 h-3 rounded-full bg-slate-600 shrink-0 shadow-xs"></span>
              <span className="truncate">ว่าง</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-700">
              <span className="w-3 h-3 rounded-full bg-blue-500 shrink-0 shadow-[0_0_6px_#3b82f6]"></span>
              <span className="truncate">ปกติ</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-700">
              <span className="w-3 h-3 rounded-full bg-amber-400 shrink-0 shadow-[0_0_6px_#fbbf24]"></span>
              <span className="truncate">Aging</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-700">
              <span className="w-3 h-3 rounded-full bg-orange-400 shrink-0 shadow-[0_0_6px_#fb923c]"></span>
              <span className="truncate">เร่งด่วน</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-700">
              <span className="w-3 h-3 rounded-full bg-rose-600 shrink-0 shadow-[0_0_6px_#e11d48]"></span>
              <span className="truncate">วิกฤต</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-lg border border-slate-700">
              <span className="w-3 h-3 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_6px_#34d399]"></span>
              <span className="truncate">เลือก</span>
            </div>
          </div>
        </div>
      </div>

    </footer>
  );
};
