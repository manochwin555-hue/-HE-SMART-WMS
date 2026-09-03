import React, { useState, useMemo, useRef } from 'react';
import { InventoryItem, MovementType, ShelfLevel, StorageZone } from '../types';
import { 
  Layers, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Eye, 
  Box, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  QrCode,
  Maximize2,
  Info,
  Sparkles,
  Search
} from 'lucide-react';

interface CY3IsometricViewProps {
  items: InventoryItem[];
  searchQuery?: string;
  floorFilter?: 'ALL' | 1 | 2 | 3 | 4;
  filterStatus?: 'ALL' | 'OCCUPIED' | 'EMPTY' | 'AGING';
  onSlotClick: (rowCode: 'A' | 'B' | 'C' | 'D', bayNum: number, locatorSign: string, targetLevel?: ShelfLevel) => void;
  onSlotHover: (e: React.MouseEvent, rowCode: 'A' | 'B' | 'C' | 'D', bayNum: number, locatorSign: string) => void;
  onSlotLeave: () => void;
  onOpenScanner: (zone: StorageZone, bay: number, level: ShelfLevel, mode: MovementType) => void;
}

interface CY3RowData {
  rowCode: 'A' | 'B' | 'C' | 'D';
  locatorSign: string;
  label: string;
  hasRoadAfter: boolean;
}

const ROWS: CY3RowData[] = [
  { rowCode: 'A', locatorSign: 'DY3T-1.01', label: 'แถว A (DY3T-1.01) - ทิศเหนือ', hasRoadAfter: true },
  { rowCode: 'B', locatorSign: 'DY3T-1.02', label: 'แถว B (DY3T-1.02) - กลางเหนือ', hasRoadAfter: false },
  { rowCode: 'C', locatorSign: 'DY3T-1.03', label: 'แถว C (DY3T-1.03) - กลางใต้', hasRoadAfter: true },
  { rowCode: 'D', locatorSign: 'DY3T-1.04', label: 'แถว D (DY3T-1.04) - ทิศใต้', hasRoadAfter: false },
];

export const CY3IsometricView: React.FC<CY3IsometricViewProps> = ({
  items,
  searchQuery = '',
  floorFilter = 'ALL',
  filterStatus = 'ALL',
  onSlotClick,
  onSlotHover,
  onSlotLeave,
  onOpenScanner
}) => {
  const [selectedRow, setSelectedRow] = useState<'ALL' | 'A' | 'B' | 'C' | 'D'>('ALL');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [hoveredLevelInfo, setHoveredLevelInfo] = useState<{
    row: string;
    bay: number;
    level: number;
    item: InventoryItem | null;
  } | null>(null);

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

  const displayedRows = useMemo(() => {
    if (selectedRow === 'ALL') return ROWS;
    return ROWS.filter(r => r.rowCode === selectedRow);
  }, [selectedRow]);

  const handleZoom = (delta: number) => {
    setZoomLevel(prev => Math.min(1.6, Math.max(0.7, prev + delta)));
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-2xl animate-fadeIn">
      {/* 1. Header Toolbar */}
      <div className="px-4 py-2.5 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-black text-sm text-white flex items-center gap-2">
              <span>มุมมองสามมิติ 2.5D Isometric Rack</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-600/30 text-blue-300 border border-blue-500/40">
                4 ชั้นแนวตั้ง (L1-L4)
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              จำลองมิติความสูงเสา Rack 4 ชั้นจริง พร้อมพาเลทสินค้าแต่ละระดับความสูง
            </p>
          </div>
        </div>

        {/* Row Switcher Pills */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
            <span className="px-2 text-[10.5px] font-bold text-slate-400">แถว:</span>
            {(['ALL', 'A', 'B', 'C', 'D'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setSelectedRow(r)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                  selectedRow === r
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {r === 'ALL' ? 'ทุกแถว (A-D)' : `แถว ${r}`}
              </button>
            ))}
          </div>

          {/* Zoom controls */}
          <div className="inline-flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => handleZoom(-0.15)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="ย่อขนาด (Zoom Out)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 font-mono text-[10px] text-slate-300 font-bold min-w-[3rem] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => handleZoom(0.15)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="ขยายขนาด (Zoom In)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="รีเซ็ตขนาด 100%"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Interactive Isometric Visual Canvas */}
      <div className="relative flex-1 overflow-x-auto overflow-y-auto p-4 sm:p-6 bg-radial from-slate-900 via-slate-950 to-black min-h-[460px]">
        {/* Subtle Isometric Grid Background Lines */}
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #3b82f6 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }}
        />

        <div 
          className="w-full flex flex-col space-y-8 transition-transform duration-200 origin-top-left"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          {displayedRows.map((row) => (
            <div key={row.rowCode} className="space-y-2">
              
              {/* Row Banner */}
              <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 max-w-fit gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-[#002060] border border-blue-400 text-white font-black text-xs flex items-center justify-center shadow-md">
                    {row.rowCode}
                  </span>
                  <span className="font-bold text-xs text-slate-200">{row.label}</span>
                </div>
                <span className="text-[10px] font-mono text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800/50">
                  25 ช่องเสา &bull; 100 พาเลท (4 ชั้น)
                </span>
              </div>

              {/* Isometric 25 Bays Grid */}
              <div className="flex items-end gap-1.5 sm:gap-2 pb-2 overflow-x-auto no-scrollbar pt-8">
                {Array.from({ length: 25 }, (_, idx) => {
                  const bayNum = idx + 1;
                  const levels = [4, 3, 2, 1] as const;
                  const bayItems = [1, 2, 3, 4].map(l => slotMap.get(`${row.rowCode}-${bayNum}-${l}`)).filter(Boolean) as InventoryItem[];
                  const occupiedCount = bayItems.length;

                  // Search match
                  const isSearchMatch = activeSearch && (
                    bayItems.some(it => 
                      it.modelHE.toLowerCase().includes(activeSearch) ||
                      it.partName.toLowerCase().includes(activeSearch) ||
                      it.locatorCode.toLowerCase().includes(activeSearch) ||
                      it.useLine.toLowerCase().includes(activeSearch)
                    ) ||
                    `${row.rowCode}${bayNum}`.toLowerCase().includes(activeSearch) ||
                    row.locatorSign.toLowerCase().includes(activeSearch)
                  );

                  if (filterStatus === 'OCCUPIED' && occupiedCount === 0) return <div key={bayNum} className="opacity-20 w-8" />;
                  if (filterStatus === 'EMPTY' && occupiedCount > 0) return <div key={bayNum} className="opacity-20 w-8" />;
                  if (filterStatus === 'AGING' && !bayItems.some(it => it.agingDays > 14)) return <div key={bayNum} className="opacity-20 w-8" />;

                  return (
                    <div
                      key={bayNum}
                      className={`relative flex flex-col items-center group transition-all shrink-0 ${
                        isSearchMatch ? 'ring-2 ring-amber-400 rounded-lg p-1 bg-amber-500/10' : ''
                      }`}
                      style={{ width: '48px' }}
                    >
                      {/* Bay Number Badge above Rack Column */}
                      <span className="text-[10px] font-mono font-black text-slate-300 bg-slate-950/90 border border-slate-800 px-1.5 py-0.5 rounded-t mb-1 shadow-xs group-hover:border-blue-500 group-hover:text-blue-300">
                        #{bayNum}
                      </span>

                      {/* 4-Tier Isometric Rack Upright Column */}
                      <div className="relative w-full bg-slate-950/60 border border-slate-700/80 rounded-md p-1 flex flex-col gap-1 shadow-lg group-hover:border-blue-400 group-hover:shadow-blue-500/20">
                        {/* Rack Left and Right Steel Posts (Visual Cues) */}
                        <div className="absolute -left-[2px] top-0 bottom-0 w-[3px] bg-blue-500/80 rounded-l" />
                        <div className="absolute -right-[2px] top-0 bottom-0 w-[3px] bg-blue-500/80 rounded-r" />

                        {/* Levels L4 to L1 from Top to Bottom */}
                        {levels.map((lvl) => {
                          const item = slotMap.get(`${row.rowCode}-${bayNum}-${lvl}`);
                          const hasItem = !!item;
                          const isLevelFiltered = typeof floorFilter === 'number' && floorFilter !== lvl;
                          const isAging = item && item.agingDays > 14;
                          const isOverdue = item && item.agingDays > 30;

                          return (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() => onSlotClick(row.rowCode, bayNum, row.locatorSign, lvl as ShelfLevel)}
                              onMouseEnter={(e) => {
                                onSlotHover(e, row.rowCode, bayNum, row.locatorSign);
                                setHoveredLevelInfo({
                                  row: row.rowCode,
                                  bay: bayNum,
                                  level: lvl,
                                  item: item || null
                                });
                              }}
                              onMouseLeave={() => {
                                onSlotLeave();
                                setHoveredLevelInfo(null);
                              }}
                              className={`relative w-full h-8 rounded text-[9px] font-mono font-bold flex flex-col justify-center items-center transition-all transform active:scale-95 border ${
                                isLevelFiltered
                                  ? 'opacity-25 grayscale'
                                  : hasItem
                                  ? isOverdue
                                    ? 'bg-gradient-to-b from-rose-600 to-rose-800 border-rose-400 text-white shadow-md shadow-rose-900/50'
                                    : isAging
                                    ? 'bg-gradient-to-b from-amber-500 to-amber-700 border-amber-300 text-white shadow-md shadow-amber-900/40'
                                    : 'bg-gradient-to-b from-blue-500 to-blue-700 border-blue-300 text-white shadow-md shadow-blue-900/50'
                                  : 'bg-[#e8d5b5]/30 hover:bg-[#e8d5b5]/60 border-[#cbb07e]/60 text-slate-400 hover:text-slate-200'
                              }`}
                              title={`${row.locatorSign}-${row.rowCode}${bayNum}-L${lvl}: ${
                                hasItem ? `${item.modelHE} (${item.quantity} ชิ้น)` : 'ว่าง'
                              }`}
                            >
                              {/* 3D Pallet Isometric Top/Face Look */}
                              {hasItem ? (
                                <div className="w-full h-full flex flex-col justify-between items-center px-0.5 py-0.5">
                                  <div className="flex items-center justify-between w-full px-0.5 leading-none">
                                    <span className="text-[7.5px] font-mono opacity-80">L{lvl}</span>
                                    {isAging && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-200 animate-pulse" />
                                    )}
                                  </div>
                                  <span className="text-[7.5px] font-mono font-black truncate w-full text-center leading-none">
                                    {item.fullPallets ? `${item.fullPallets}P` : `${item.quantity}u`}
                                  </span>
                                  {/* Wood Pallet Skids at bottom */}
                                  <div className="w-full h-[2px] bg-amber-900/80 rounded-xs mt-0.5" />
                                </div>
                              ) : (
                                <span className="text-[8px] font-mono opacity-70">L{lvl}</span>
                              )}
                            </button>
                          );
                        })}

                        {/* Column Steel Base */}
                        <div className="w-full h-1 bg-slate-700 rounded-b mt-0.5" />
                      </div>

                      {/* Capacity Pill at bottom */}
                      <span className={`text-[8.5px] font-mono font-bold mt-1 px-1 rounded ${
                        occupiedCount === 4
                          ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
                          : occupiedCount > 0
                          ? 'bg-amber-600/20 text-amber-300 border border-amber-500/30'
                          : 'text-slate-500'
                      }`}>
                        {occupiedCount}/4
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Forklift Driveway between rows */}
              {row.hasRoadAfter && (
                <div className="my-2 py-1 px-3 bg-slate-950 border-y border-dashed border-amber-500/40 rounded flex items-center justify-between text-[10px] font-mono text-amber-400">
                  <div className="flex items-center gap-1.5">
                    <span>⇋ ทางวิ่งรถยก Forklift Aisle (ความกว้าง 4.0 ม.) ⇋</span>
                  </div>
                  <span className="text-slate-400">จำกัดความเร็ว &le; 10 km/h</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 3. Footer Legend & Status Bar */}
      <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-300">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-blue-600 border border-blue-400 shadow-xs" />
            <span>มีสินค้าจัดเก็บ (Occupied Level)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-[#e8d5b5]/40 border border-[#cbb07e]" />
            <span>ชั้นว่างพร้อมรับเข้า (Empty Level)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-amber-500 border border-amber-300" />
            <span>ใกล้ครบกำหนด FIFO (&gt;14 วัน)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-rose-600 border border-rose-400 animate-pulse" />
            <span>ค้างนานวิกฤต (&gt;30 วัน)</span>
          </div>
        </div>

        <div className="font-mono text-slate-400 text-[10.5px]">
          คลิกที่ช่องชั้น L1-L4 เพื่อส่องสินค้าหรือสแกนรับ-เบิก
        </div>
      </div>
    </div>
  );
};
