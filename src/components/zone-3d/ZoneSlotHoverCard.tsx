import React from 'react';
import { InventoryItem } from '../../types';

export interface ZoneSlotHoverData {
  zoneLabel: string;
  locator: string;
  positionLabel: string;
  statusMode: 'EMPTY' | 'OCCUPIED' | 'AGING' | 'OVERDUE';
  item?: InventoryItem;
}

interface ZoneSlotHoverCardProps {
  data: ZoneSlotHoverData;
}

const STATUS_STYLE_MAP: Record<
  ZoneSlotHoverData['statusMode'],
  {
    container: string;
    badge: string;
    label: string;
    dot: string;
  }
> = {
  EMPTY: {
    container: 'bg-slate-900/95 border-emerald-500/55 shadow-emerald-950/40',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    label: 'ช่องว่าง (READY)',
    dot: 'bg-emerald-400',
  },
  OCCUPIED: {
    container: 'bg-slate-900/95 border-cyan-500/55 shadow-cyan-950/40',
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    label: 'มีสินค้า (STORED)',
    dot: 'bg-cyan-400',
  },
  AGING: {
    container: 'bg-slate-900/95 border-amber-500/60 shadow-amber-950/40',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    label: 'AGING > 28 วัน',
    dot: 'bg-amber-400',
  },
  OVERDUE: {
    container: 'bg-slate-900/95 border-rose-500/60 shadow-rose-950/40',
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    label: 'OVERDUE > 45 วัน',
    dot: 'bg-rose-400',
  },
};

export const ZoneSlotHoverCard: React.FC<ZoneSlotHoverCardProps> = ({ data }) => {
  const style = STATUS_STYLE_MAP[data.statusMode];
  const item = data.item;

  // Suppress redundant partName such as "Part ADL74920904" when identical to modelHE
  const modelText = item ? (item.modelHE || item.partNumber || 'Unknown Model') : '';
  const rawPartName = item?.partName?.trim() || '';
  const isRedundantPartName =
    !rawPartName ||
    rawPartName.toLowerCase() === modelText.toLowerCase() ||
    rawPartName.toLowerCase() === `part ${modelText.toLowerCase()}`;

  return (
    <div
      className={`absolute bottom-4 left-4 z-30 w-80 max-w-[calc(100vw-2rem)] backdrop-blur-md border rounded-xl p-3.5 shadow-2xl text-xs pointer-events-none animate-fadeIn ${style.container}`}
    >
      {/* Row 1: Zone Name & Status Badge */}
      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
          <span className="font-bold text-slate-200 truncate">{data.zoneLabel}</span>
        </div>
        <span
          className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border shrink-0 ${style.badge}`}
        >
          {style.label}
        </span>
      </div>

      {/* Row 2: Canonical Locator & Concise Position */}
      <div className="mb-2">
        <div className="font-mono font-black text-sm text-amber-300 tracking-tight tabular-nums">
          {data.locator}
        </div>
        {data.positionLabel && (
          <div className="text-[11px] font-mono text-slate-400 mt-0.5 truncate">
            {data.positionLabel}
          </div>
        )}
      </div>

      {/* Row 3: Inventory Details or Empty Slot Notice */}
      {item ? (
        <div className="pt-2 border-t border-slate-800/80 space-y-1">
          <div className="font-mono font-bold text-white text-sm truncate">
            {modelText}
          </div>
          {!isRedundantPartName && (
            <div className="text-[11px] text-slate-300 truncate">{rawPartName}</div>
          )}
          <div className="flex items-center justify-between pt-1.5 text-[11px] font-mono tabular-nums text-slate-300">
            <span>
              จำนวน: <strong className="text-white font-bold">{item.quantity.toLocaleString()}</strong> EA
            </span>
            <span
              className={
                item.agingDays > 45
                  ? 'text-rose-400 font-bold'
                  : item.agingDays > 28
                  ? 'text-amber-400 font-bold'
                  : 'text-slate-300'
              }
            >
              Aging: {item.agingDays} วัน
            </span>
          </div>
        </div>
      ) : (
        <div className="pt-2 border-t border-slate-800/80 text-[11px] text-emerald-300/90 font-medium">
          ตำแหน่งว่าง พร้อมรับเข้าสินค้า
        </div>
      )}

      {/* Row 4: Action Hint */}
      <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
        <span>คลิก 1 ครั้งเพื่อเปิดจัดการ</span>
        <span className="font-semibold text-slate-200">
          {item ? 'รับเข้า / เบิกออก / ย้าย' : 'บันทึกรับเข้า (IN)'}
        </span>
      </div>
    </div>
  );
};
