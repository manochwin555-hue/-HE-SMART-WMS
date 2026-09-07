import React from 'react';
import { COLOR_TOKENS } from './WarehouseSlotToken';
import { Info, Sparkles, AlertCircle } from 'lucide-react';

export interface UniversalLegendBarProps {
  emptyCount?: number;
  occupiedCount?: number;
  warningAgingCount?: number;
  overdueCount?: number;
  searchMatchCount?: number;
  totalCapacity?: number;
  utilizationRate?: number;
  extraInfoText?: string;
  onFilterStatus?: (status: 'ALL' | 'OCCUPIED' | 'EMPTY' | 'AGING' | 'OVERDUE') => void;
  activeFilter?: string;
}

export const UniversalLegendBar: React.FC<UniversalLegendBarProps> = ({
  emptyCount,
  occupiedCount,
  warningAgingCount,
  overdueCount,
  searchMatchCount,
  totalCapacity,
  utilizationRate,
  extraInfoText,
  onFilterStatus,
  activeFilter,
}) => {
  return (
    <div className="w-full px-3 sm:px-4 py-2.5 bg-[#161B22] border border-[#30363D] rounded-xl text-white shadow-md flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 select-none">
      {/* Color Tokens Swatches */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-4">
        <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
          <Info className="w-3.5 h-3.5 text-blue-400" />
          <span>สถานะสีมาตรฐาน:</span>
        </span>

        {/* 1. Empty Slot */}
        <button
          type="button"
          onClick={() => onFilterStatus && onFilterStatus('EMPTY')}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-all ${
            onFilterStatus ? 'hover:bg-[#21262D] cursor-pointer' : ''
          } ${activeFilter === 'EMPTY' ? 'ring-1 ring-[#58A6FF] bg-[#21262D]' : ''}`}
        >
          <span 
            className="w-3.5 h-3.5 rounded border border-[#30363D] shrink-0" 
            style={{ backgroundColor: COLOR_TOKENS.EMPTY.bg }}
          />
          <span className="text-slate-300 font-medium">พื้นที่ว่าง</span>
          {emptyCount !== undefined && (
            <span className="font-mono text-[11px] text-slate-400 font-bold">({emptyCount.toLocaleString()})</span>
          )}
        </button>

        {/* 2. Occupied Slot */}
        <button
          type="button"
          onClick={() => onFilterStatus && onFilterStatus('OCCUPIED')}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-all ${
            onFilterStatus ? 'hover:bg-[#21262D] cursor-pointer' : ''
          } ${activeFilter === 'OCCUPIED' ? 'ring-1 ring-[#58A6FF] bg-[#21262D]' : ''}`}
        >
          <span 
            className="w-3.5 h-3.5 rounded border border-[#58A6FF]/50 shrink-0" 
            style={{ backgroundColor: COLOR_TOKENS.OCCUPIED.bg }}
          />
          <span className="text-slate-200 font-medium">จัดเก็บปกติ</span>
          {occupiedCount !== undefined && (
            <span className="font-mono text-[11px] text-blue-300 font-bold">({occupiedCount.toLocaleString()})</span>
          )}
        </button>

        {/* 3. Warning FIFO / Aging (>14 วัน) */}
        <button
          type="button"
          onClick={() => onFilterStatus && onFilterStatus('AGING')}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-all ${
            onFilterStatus ? 'hover:bg-[#21262D] cursor-pointer' : ''
          } ${activeFilter === 'AGING' ? 'ring-1 ring-amber-400 bg-[#21262D]' : ''}`}
        >
          <span 
            className="w-3.5 h-3.5 rounded border border-amber-400/50 shrink-0" 
            style={{ backgroundColor: COLOR_TOKENS.AGING_WARNING.bg }}
          />
          <span className="text-amber-300 font-medium">เตือน Aging (&gt;14 วัน)</span>
          {warningAgingCount !== undefined && (
            <span className="font-mono text-[11px] text-amber-400 font-bold">({warningAgingCount.toLocaleString()})</span>
          )}
        </button>

        {/* 4. Critical Overdue (>30 วัน) */}
        <button
          type="button"
          onClick={() => onFilterStatus && onFilterStatus('OVERDUE')}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-all ${
            onFilterStatus ? 'hover:bg-[#21262D] cursor-pointer' : ''
          } ${activeFilter === 'OVERDUE' ? 'ring-1 ring-rose-500 bg-[#21262D]' : ''}`}
        >
          <span 
            className="w-3.5 h-3.5 rounded border border-rose-500/50 shrink-0" 
            style={{ backgroundColor: COLOR_TOKENS.OVERDUE_CRITICAL.bg }}
          />
          <span className="text-rose-300 font-medium">วิกฤต (&gt;30 วัน)</span>
          {overdueCount !== undefined && (
            <span className="font-mono text-[11px] text-rose-400 font-bold">({overdueCount.toLocaleString()})</span>
          )}
        </button>

        {/* 5. Search Match Highlight */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md">
          <span 
            className="w-3.5 h-3.5 rounded border border-emerald-400/50 shrink-0" 
            style={{ backgroundColor: COLOR_TOKENS.SEARCH_MATCH.bg }}
          />
          <span className="text-emerald-300 font-medium">ตรงผลค้นหา</span>
          {searchMatchCount !== undefined && searchMatchCount > 0 && (
            <span className="font-mono text-[11px] text-emerald-400 font-bold">({searchMatchCount})</span>
          )}
        </div>
      </div>

      {/* Right Side: Total Summary Stats / Extra Tips */}
      <div className="flex items-center gap-3 text-xs text-slate-400 font-mono ml-auto">
        {totalCapacity !== undefined && occupiedCount !== undefined && (
          <div className="flex items-center gap-1 bg-[#0D1117] px-2.5 py-1 rounded-md border border-[#30363D]">
            <span className="text-slate-400">อัตราจัดเก็บ:</span>
            <span className="text-white font-bold">{occupiedCount}</span>
            <span>/</span>
            <span className="text-slate-300">{totalCapacity} P</span>
            {utilizationRate !== undefined && (
              <span className="text-blue-400 font-black ml-1">({utilizationRate}%)</span>
            )}
          </div>
        )}

        {extraInfoText && (
          <span className="text-[11px] text-slate-400 hidden xl:inline font-sans">
            {extraInfoText}
          </span>
        )}
      </div>
    </div>
  );
};
