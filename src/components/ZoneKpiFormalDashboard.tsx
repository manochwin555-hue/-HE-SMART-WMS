import React, { useMemo } from 'react';
import { InventoryItem, MovementLog, WmsStats, AgingThresholdConfig } from '../types';
import { 
  ZoneKey, 
  ZoneKpiData, 
  calculateZoneKpis
} from '../utils/zoneKpiHelper';
import {
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  Clock,
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
 * Ultra-compact 3-Card KPI bar located directly beneath the layout:
 * 1. ความจุ (Capacity / Occupancy / Free)
 * 2. รับเข้า - รับออก / IN / OUT (Today's IN & OUT scans)
 * 3. Aging (Stock Aging status & FIFO breakdown: <14d, 15-30d, >30d)
 *
 * No Part list table (as pallet colors on layout already represent real-time status).
 * Fits neatly within the viewport without requiring vertical scrolling.
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
    <div className={`w-full shrink-0 grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2 ${className}`}>
      
      {/* CARD 1: ความจุ (Capacity & Occupancy) */}
      <div className="bg-slate-900/95 border border-slate-800 hover:border-slate-700/80 rounded-xl px-3 py-2 shadow-xs flex flex-col justify-between transition-all">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>ความจุ &amp; อัตราจัดเก็บ</span>
          </div>
          <span className={`font-mono text-xs font-black px-1.5 py-0.2 rounded border ${
            kpiData.occupancyRatePercent > 90 
              ? 'text-rose-400 bg-rose-500/10 border-rose-500/30' 
              : kpiData.occupancyRatePercent > 75 
              ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' 
              : 'text-blue-400 bg-blue-500/10 border-blue-500/30'
          }`}>
            {kpiData.occupancyRatePercent}%
          </span>
        </div>

        <div className="flex items-baseline justify-between mt-1">
          <div className="flex items-baseline gap-1">
            <span className="text-base sm:text-lg font-black text-white font-mono leading-none">
              {kpiData.occupiedPallets}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              / {kpiData.totalCapacityPallets} P
            </span>
          </div>
          <span className="text-[10px] text-emerald-400 font-bold whitespace-nowrap bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
            ว่าง {kpiData.emptyPallets} ช่อง
          </span>
        </div>

        {/* Micro progress bar */}
        <div className="w-full h-1 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              kpiData.occupancyRatePercent > 90 
                ? 'bg-rose-500' 
                : kpiData.occupancyRatePercent > 75 
                ? 'bg-amber-500' 
                : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(100, kpiData.occupancyRatePercent)}%` }}
          />
        </div>
      </div>

      {/* CARD 2: รับเข้า - รับออก / IN / OUT */}
      <div className="bg-slate-900/95 border border-slate-800 hover:border-slate-700/80 rounded-xl px-3 py-2 shadow-xs flex flex-col justify-between transition-all">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>รับเข้า - รับออก (IN / OUT วันนี้)</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            สุทธิ {netMovement >= 0 ? `+${netMovement}` : netMovement} P
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-1">
          {/* +IN Badge */}
          <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/25 px-2 py-1 rounded-lg">
            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
              <ArrowDownRight className="w-3 h-3 shrink-0" />
              <span>+IN รับเข้า</span>
            </div>
            <span className="text-xs sm:text-sm font-black text-emerald-300 font-mono">
              +{kpiData.todayInScans}
            </span>
          </div>

          {/* -OUT Badge */}
          <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/25 px-2 py-1 rounded-lg">
            <div className="flex items-center gap-1 text-[10px] font-bold text-amber-400">
              <ArrowUpRight className="w-3 h-3 shrink-0" />
              <span>-OUT เบิกจ่าย</span>
            </div>
            <span className="text-xs sm:text-sm font-black text-amber-300 font-mono">
              -{kpiData.todayOutScans}
            </span>
          </div>
        </div>
      </div>

      {/* CARD 3: Aging (อายุจัดเก็บสต็อก FIFO) */}
      <div className="bg-slate-900/95 border border-slate-800 hover:border-slate-700/80 rounded-xl px-3 py-2 shadow-xs flex flex-col justify-between transition-all">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>อายุสต็อก (FIFO / Aging)</span>
          </div>
          <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded border ${
            kpiData.agingOverdueCount > 0 
              ? 'text-rose-400 bg-rose-500/10 border-rose-500/30' 
              : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
          }`}>
            {kpiData.agingOverdueCount > 0 ? `เกิน 30 วัน: ${kpiData.agingOverdueCount} P` : 'สต็อกหมุนเวียนปกติ'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1.5 mt-1">
          {/* 0-14 days */}
          <div className="flex flex-col items-center justify-center bg-slate-950/60 border border-emerald-500/20 px-1 py-0.5 rounded-lg text-center">
            <span className="text-[9px] text-slate-400 font-medium">&lt; 14 วัน</span>
            <span className="text-xs font-black text-emerald-400 font-mono">
              {kpiData.agingSafeCount}
            </span>
          </div>

          {/* 15-30 days */}
          <div className="flex flex-col items-center justify-center bg-slate-950/60 border border-amber-500/20 px-1 py-0.5 rounded-lg text-center">
            <span className="text-[9px] text-slate-400 font-medium">15-30 วัน</span>
            <span className="text-xs font-black text-amber-400 font-mono">
              {kpiData.agingWarningCount}
            </span>
          </div>

          {/* >30 days */}
          <div className="flex flex-col items-center justify-center bg-slate-950/60 border border-rose-500/20 px-1 py-0.5 rounded-lg text-center">
            <span className="text-[9px] text-slate-400 font-medium">&gt; 30 วัน</span>
            <span className={`text-xs font-black font-mono ${kpiData.agingOverdueCount > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
              {kpiData.agingOverdueCount}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};
