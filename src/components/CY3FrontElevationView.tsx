import React, { useState, useMemo } from 'react';
import { InventoryItem, MovementType, ShelfLevel, StorageZone } from '../types';
import { 
  Building2, 
  Layers, 
  QrCode, 
  ChevronRight, 
  ArrowUpRight, 
  Clock, 
  AlertTriangle, 
  Box, 
  Filter,
  CheckCircle2,
  TrendingUp,
  Search
} from 'lucide-react';

interface CY3FrontElevationViewProps {
  items: InventoryItem[];
  searchQuery?: string;
  floorFilter?: 'ALL' | 1 | 2 | 3 | 4;
  filterStatus?: 'ALL' | 'OCCUPIED' | 'EMPTY' | 'AGING';
  onSlotClick: (rowCode: 'A' | 'B' | 'C' | 'D', bayNum: number, locatorSign: string, targetLevel?: ShelfLevel) => void;
  onSlotHover: (e: React.MouseEvent, rowCode: 'A' | 'B' | 'C' | 'D', bayNum: number, locatorSign: string) => void;
  onSlotLeave: () => void;
  onOpenScanner: (zone: StorageZone, bay: number, level: ShelfLevel, mode: MovementType) => void;
}

interface RowElevationConfig {
  rowCode: 'A' | 'B' | 'C' | 'D';
  locatorSign: string;
  name: string;
  description: string;
  heightLevels: string[];
}

const ELEVATION_ROWS: RowElevationConfig[] = [
  {
    rowCode: 'A',
    locatorSign: 'DY3T-1.01',
    name: 'แถว A (DY3T-1.01) - ทิศเหนือติดทางเข้า',
    description: 'แร็ค 4 ชั้นด้านเหนือติดถนน Forklift Aisle หลัก',
    heightLevels: ['L4 (+6.0m)', 'L3 (+4.2m)', 'L2 (+2.4m)', 'L1 (+0.6m)']
  },
  {
    rowCode: 'B',
    locatorSign: 'DY3T-1.02',
    name: 'แถว B (DY3T-1.02) - กลางแถวเหนือ',
    description: 'แร็ค 4 ชั้นประกบหลังแถว C หันหน้าเข้าหาทางวิ่ง A',
    heightLevels: ['L4 (+6.0m)', 'L3 (+4.2m)', 'L2 (+2.4m)', 'L1 (+0.6m)']
  },
  {
    rowCode: 'C',
    locatorSign: 'DY3T-1.03',
    name: 'แถว C (DY3T-1.03) - กลางแถวใต้',
    description: 'แร็ค 4 ชั้นประกบหลังแถว B หันหน้าเข้าหาทางวิ่ง D',
    heightLevels: ['L4 (+6.0m)', 'L3 (+4.2m)', 'L2 (+2.4m)', 'L1 (+0.6m)']
  },
  {
    rowCode: 'D',
    locatorSign: 'DY3T-1.04',
    name: 'แถว D (DY3T-1.04) - ทิศใต้ริมเต็นท์',
    description: 'แร็ค 4 ชั้นด้านใต้ติดผนังเต็นท์ CY3',
    heightLevels: ['L4 (+6.0m)', 'L3 (+4.2m)', 'L2 (+2.4m)', 'L1 (+0.6m)']
  }
];

export const CY3FrontElevationView: React.FC<CY3FrontElevationViewProps> = ({
  items,
  searchQuery = '',
  floorFilter = 'ALL',
  filterStatus = 'ALL',
  onSlotClick,
  onSlotHover,
  onSlotLeave,
  onOpenScanner
}) => {
  const [activeRow, setActiveRow] = useState<'ALL' | 'A' | 'B' | 'C' | 'D'>('A');

  // Map key: `${rowCode}-${bayNum}-${level}`
  const slotMap = useMemo(() => {
    const map = new Map<string, InventoryItem>();
    items.forEach(it => {
      let rCode = 'A';
      let bNum = it.bayNumber;
      let lvl = it.level;

      if (it.zone === 'CY3-A' || it.zone === 'A') rCode = 'A';
      else if (it.zone === 'CY3-B' || it.zone === 'B') rCode = 'B';
      else if (it.zone === 'CY3-C' || it.zone === 'C') rCode = 'C';
      else if (it.zone === 'CY3-D' || it.zone === 'D') rCode = 'D';
      else if (it.locatorCode.includes('DY3T-1.01')) rCode = 'A';
      else if (it.locatorCode.includes('DY3T-1.02')) rCode = 'B';
      else if (it.locatorCode.includes('DY3T-1.03')) rCode = 'C';
      else if (it.locatorCode.includes('DY3T-1.04')) rCode = 'D';

      const locMatch = it.locatorCode.match(/DY3T-1\.0[1-4]-(?:[A-D])?0?(\d+)-L(\d)/i);
      if (locMatch) {
        bNum = parseInt(locMatch[1], 10);
        lvl = parseInt(locMatch[2], 10) as ShelfLevel;
      }

      map.set(`${rCode}-${bNum}-${lvl}`, it);
    });
    return map;
  }, [items]);

  const activeSearch = searchQuery.trim().toLowerCase();

  const rowsToRender = useMemo(() => {
    if (activeRow === 'ALL') return ELEVATION_ROWS;
    return ELEVATION_ROWS.filter(r => r.rowCode === activeRow);
  }, [activeRow]);

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-2xl animate-fadeIn">
      {/* 1. Top Controls & Row Selectors */}
      <div className="px-4 py-3 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-sm text-white flex items-center gap-2">
              <span>มุมมองด้านหน้าโครงสร้างแร็ค (Front Elevation View)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold">
                25 เสา x 4 ชั้นแนวตั้ง
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              เสมือนการยืนตรวจนับสินค้าหน้ารางแร็คจริง มองเห็นสินค้าทุกช่องความสูง L1 - L4
            </p>
          </div>
        </div>

        {/* Row Switcher Tabs */}
        <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 gap-1">
          {(['A', 'B', 'C', 'D', 'ALL'] as const).map((r) => {
            const config = ELEVATION_ROWS.find(row => row.rowCode === r);
            return (
              <button
                key={r}
                onClick={() => setActiveRow(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeRow === r
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {r === 'ALL' ? (
                  <span>ดูครบ 4 แถว</span>
                ) : (
                  <>
                    <span className="w-4 h-4 rounded bg-[#002060] text-white font-mono text-[10px] flex items-center justify-center font-black">
                      {r}
                    </span>
                    <span>แถว {r}</span>
                    <span className="text-[10px] opacity-70 font-mono">({config?.locatorSign})</span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Elevation Diagrams Canvas */}
      <div className="flex-1 overflow-x-auto p-4 sm:p-6 bg-slate-950/70 space-y-8">
        {rowsToRender.map((row) => {
          // Count occupied in this row
          let rowOccupied = 0;
          for (let b = 1; b <= 25; b++) {
            for (let l = 1; l <= 4; l++) {
              if (slotMap.has(`${row.rowCode}-${b}-${l}`)) rowOccupied++;
            }
          }

          return (
            <div key={row.rowCode} className="space-y-3 bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl">
              
              {/* Row Header Banner */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#002060] border border-blue-400/80 flex items-center justify-center text-white font-black text-sm shadow-md">
                    {row.rowCode}
                  </div>
                  <div>
                    <div className="font-black text-xs sm:text-sm text-white flex items-center gap-2">
                      <span>{row.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-900/60 text-blue-200 border border-blue-700/50">
                        {row.locatorSign}
                      </span>
                    </div>
                    <div className="text-[10.5px] text-slate-400">{row.description}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-slate-400">
                    จัดเก็บจริง: <strong className="text-emerald-400">{rowOccupied}</strong> / 100 พาเลท
                  </span>
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                    {Math.round((rowOccupied / 100) * 100)}% Occupancy
                  </span>
                </div>
              </div>

              {/* Front Elevation Grid (25 Columns x 4 Shelves) */}
              <div className="overflow-x-auto py-2">
                <div className="min-w-[1000px] flex flex-col space-y-1">
                  
                  {/* Top Column (Bay) Numbers Bar */}
                  <div className="flex items-center pl-16 pr-2 mb-1 gap-1">
                    {Array.from({ length: 25 }, (_, i) => (
                      <div
                        key={i + 1}
                        className="flex-1 text-center font-mono text-[10px] font-bold text-slate-400 bg-slate-950 py-0.5 rounded border border-slate-800"
                      >
                        Bay {i + 1}
                      </div>
                    ))}
                  </div>

                  {/* 4 Levels (L4 down to L1) */}
                  {([4, 3, 2, 1] as const).map((lvl) => {
                    const isLvlFiltered = typeof floorFilter === 'number' && floorFilter !== lvl;
                    return (
                      <div key={lvl} className={`flex items-center gap-1 ${isLvlFiltered ? 'opacity-25 grayscale' : ''}`}>
                        
                        {/* Left Level Indicator & Height Marker */}
                        <div className="w-16 shrink-0 flex flex-col items-end pr-2 text-right">
                          <span className="text-xs font-mono font-black text-blue-400">
                            L{lvl}
                          </span>
                          <span className="text-[9px] font-mono text-slate-500 leading-tight">
                            {lvl === 4 ? '+6.0m' : lvl === 3 ? '+4.2m' : lvl === 2 ? '+2.4m' : '+0.6m'}
                          </span>
                        </div>

                        {/* 25 Bay Cells across */}
                        <div className="flex-1 grid grid-cols-25 gap-1">
                          {Array.from({ length: 25 }, (_, idx) => {
                            const bayNum = idx + 1;
                            const item = slotMap.get(`${row.rowCode}-${bayNum}-${lvl}`);
                            const hasItem = !!item;
                            const isAging = item && item.agingDays > 14;
                            const isOverdue = item && item.agingDays > 30;

                            const isSearchMatch = activeSearch && (
                              (item && (
                                item.modelHE.toLowerCase().includes(activeSearch) ||
                                item.partName.toLowerCase().includes(activeSearch) ||
                                item.locatorCode.toLowerCase().includes(activeSearch) ||
                                item.useLine.toLowerCase().includes(activeSearch)
                              )) ||
                              `${row.rowCode}${bayNum}`.toLowerCase().includes(activeSearch) ||
                              row.locatorSign.toLowerCase().includes(activeSearch)
                            );

                            if (filterStatus === 'OCCUPIED' && !hasItem) return <div key={bayNum} className="opacity-20" />;
                            if (filterStatus === 'EMPTY' && hasItem) return <div key={bayNum} className="opacity-20" />;
                            if (filterStatus === 'AGING' && !isAging) return <div key={bayNum} className="opacity-20" />;

                            return (
                              <button
                                key={bayNum}
                                type="button"
                                onClick={() => onSlotClick(row.rowCode, bayNum, row.locatorSign, lvl as ShelfLevel)}
                                onMouseEnter={(e) => onSlotHover(e, row.rowCode, bayNum, row.locatorSign)}
                                onMouseLeave={onSlotLeave}
                                className={`relative h-14 rounded-md border flex flex-col justify-between p-1 transition-all active:scale-95 group focus:outline-none ${
                                  isSearchMatch
                                    ? 'ring-2 ring-amber-400 bg-amber-400/20 border-amber-300 z-10 scale-105'
                                    : hasItem
                                    ? isOverdue
                                      ? 'bg-rose-900/90 hover:bg-rose-800 border-rose-500 text-white shadow-md'
                                      : isAging
                                      ? 'bg-amber-900/90 hover:bg-amber-800 border-amber-500 text-amber-100 shadow-md'
                                      : 'bg-blue-600 hover:bg-blue-500 border-blue-400 text-white shadow-md'
                                    : 'bg-[#edd9af]/80 hover:bg-[#f5e7c8] border-[#cbb07e] text-slate-800 hover:border-blue-400'
                                }`}
                                title={`${row.locatorSign}-${row.rowCode}${bayNum}-L${lvl}: ${
                                  hasItem ? `${item.modelHE} - ${item.partName} (${item.quantity} ชิ้น)` : 'ว่าง'
                                }`}
                              >
                                {hasItem ? (
                                  <>
                                    <div className="flex items-center justify-between w-full leading-none">
                                      <span className="text-[8px] font-mono font-bold truncate max-w-[28px]">
                                        {item.modelHE.substring(0, 5)}
                                      </span>
                                      {isAging && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-300 animate-ping" />
                                      )}
                                    </div>
                                    
                                    <div className="text-[9px] font-mono font-black text-center truncate w-full">
                                      {item.fullPallets ? `${item.fullPallets}P` : `${item.quantity}u`}
                                    </div>

                                    <div className="flex items-center justify-between w-full text-[7px] font-mono opacity-80 leading-none">
                                      <span>{item.useLine || 'HE'}</span>
                                      <span>{item.agingDays}d</span>
                                    </div>
                                  </>
                                ) : (
                                  <div className="h-full flex flex-col items-center justify-center text-slate-600 group-hover:text-blue-600">
                                    <span className="text-[9px] font-mono font-bold">ว่าง</span>
                                    <span className="text-[7px] font-mono opacity-60">L{lvl}</span>
                                  </div>
                                )}

                                {/* Rack Beam Bottom Support Bar */}
                                <div className="absolute -bottom-[2px] left-0 right-0 h-[2px] bg-orange-500/80 rounded-full" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {/* Floor Level Foundation Concrete Slab */}
                  <div className="flex items-center pl-16 pr-2 pt-1 gap-1">
                    <div className="w-full h-2 bg-slate-800 border-t border-slate-700 rounded-b flex items-center justify-center">
                      <span className="text-[7.5px] font-mono text-slate-500 uppercase tracking-widest">
                        Concrete Floor Level &bull; CY3 Tent Slab
                      </span>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* 3. Footer Legend */}
      <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
        <div className="flex items-center gap-4 flex-wrap text-[11px]">
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-blue-600 border border-blue-400" />
            <span>มีพาเลทจัดเก็บ (Occupied Slot)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-[#edd9af] border border-[#cbb07e]" />
            <span>ช่องว่างพร้อมรับเข้า (Empty Slot)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-amber-600 border border-amber-400" />
            <span>เตือน FIFO (&gt;14 วัน)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-rose-600 border border-rose-400 animate-pulse" />
            <span>เกินกำหนดวิกฤต (&gt;30 วัน)</span>
          </div>
        </div>

        <div className="font-mono text-slate-400 text-[10.5px]">
          คลิกช่องใดก็ได้เพื่อเปิดหน้าต่างตรวจสอบ 4 ชั้น (Unified Modal)
        </div>
      </div>
    </div>
  );
};
