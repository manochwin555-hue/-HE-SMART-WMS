import React, { useState, useMemo } from 'react';
import { InventoryItem, MovementType, ShelfLevel, StorageZone } from '../types';
import { UnifiedSlotModal, UnifiedSlotData } from './UnifiedSlotModal';
import { SlotMiniStatsOverlay, MiniStatsSlotData } from './SlotMiniStatsOverlay';
import { 
  Building2, 
  Search, 
  Filter, 
  QrCode, 
  Layers, 
  ChevronRight, 
  Maximize2, 
  Minimize2, 
  Compass, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Printer, 
  ArrowRightLeft, 
  Box, 
  Grid, 
  ZoomIn, 
  ZoomOut,
  Tent,
  ArrowUpRight,
  Flame,
  Clock
} from 'lucide-react';

interface A5TentFloorStagingMapProps {
  items: InventoryItem[];
  searchQuery?: string;
  onSelectSlot?: (tentId: string, groupNumber: number, rowCode: string, columnNumber: number) => void;
  onOpenScanner: (zone: StorageZone, bay: number, level: ShelfLevel, mode: MovementType) => void;
  onRelocateItem?: (item: InventoryItem) => void;
  onNavigateToCampus?: () => void;
  initialTentNumber?: number; // 1, 2, 3, or 4
}

// 4 Tents configuration
interface TentConfig {
  number: number;
  name: string;
  codePrefix: string;
  signCode: string;
  description: string;
  hasRackA?: boolean;
}

const TENTS: TentConfig[] = [
  {
    number: 1,
    name: 'A5 Tent No. 1',
    codePrefix: 'DA5T-1',
    signCode: 'DA5T-1.01',
    description: 'เต็นท์ที่ 1 (ทิศตะวันตกเฉียงใต้) - โซนจัดเก็บวางพื้น 7 กลุ่ม (01-07) รวม 196 พาเลท'
  },
  {
    number: 2,
    name: 'A5 Tent No. 2',
    codePrefix: 'DA5T-2',
    signCode: 'DA5T-2.01',
    description: 'เต็นท์ที่ 2 (ทิศตะวันตกเฉียงเหนือ) - โซนจัดเก็บวางพื้น 7 กลุ่ม (01-07) รวม 196 พาเลท'
  },
  {
    number: 3,
    name: 'A5 Tent No. 3',
    codePrefix: 'DA5T-3',
    signCode: 'DA5T-3.01',
    description: 'เต็นท์ที่ 3 (ทิศตะวันออกเฉียงใต้) - โซนจัดเก็บวางพื้น 7 กลุ่ม (01-07) รวม 196 พาเลท'
  },
  {
    number: 4,
    name: 'A5 Tent No. 4',
    codePrefix: 'DA5T-4',
    signCode: 'DA5T-4.01',
    description: 'เต็นท์ที่ 4 (ทิศตะวันออกเฉียงเหนือ) - โซนจัดเก็บวางพื้น 7 กลุ่ม (01-07) + RACK A รวม 196 พาเลท',
    hasRackA: true
  }
];

const ROW_CODES = ['R1', 'R2', 'R3', 'R4']; // 4 rows per group
const COLUMN_NUMBERS = [7, 6, 5, 4, 3, 2, 1]; // 7 columns (depth 07 down to 01)
const GROUP_NUMBERS = [1, 2, 3, 4, 5, 6, 7]; // 7 groups per tent

export const A5TentFloorStagingMap: React.FC<A5TentFloorStagingMapProps> = ({
  items,
  searchQuery = '',
  onSelectSlot,
  onOpenScanner,
  onRelocateItem,
  onNavigateToCampus,
  initialTentNumber = 1
}) => {
  const [selectedTent, setSelectedTent] = useState<number>(initialTentNumber);

  React.useEffect(() => {
    if (initialTentNumber) {
      setSelectedTent(initialTentNumber);
      setViewMode('TENT_DETAIL');
    }
  }, [initialTentNumber]);
  const [viewMode, setViewMode] = useState<'OVERVIEW_4_TENTS' | 'TENT_DETAIL'>('TENT_DETAIL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'OCCUPIED' | 'EMPTY' | 'AGING'>('ALL');
  const [localSearch, setLocalSearch] = useState<string>(searchQuery);
  const [selectedSlotData, setSelectedSlotData] = useState<{
    tentNum: number;
    groupNum: number;
    rowCode: string;
    colNum: number;
    locator: string;
    item?: InventoryItem;
  } | null>(null);

  // Hover state for SlotMiniStatsOverlay
  const [hoveredSlot, setHoveredSlot] = useState<{
    title: string;
    locatorCode: string;
    zoneName: string;
    positionLabel: string;
    item: InventoryItem | null;
    x: number;
    y: number;
  } | null>(null);

  // Sync external search query
  const activeSearch = localSearch || searchQuery;

  // Filter items in A5 Tent facility or matching DA5T locator
  const a5Items = useMemo(() => {
    return items.filter(it => 
      it.facilityId === 'FAC-A5-TENT' || 
      it.locatorCode.includes('DA5T') ||
      (it.zone && it.zone.startsWith('T'))
    );
  }, [items]);

  // Quick lookup map: "TENT-GROUP-ROW-COL" -> InventoryItem
  const slotMap = useMemo(() => {
    const map = new Map<string, InventoryItem>();
    
    a5Items.forEach(item => {
      // Parse locator format: "DA5T-1-01-R3-05" or similar
      const loc = item.locatorCode.toUpperCase();
      let tentNum = 1;
      let groupNum = 1;
      let rowCode = 'R1';
      let colNum = 1;

      // Extract Tent number
      const tentMatch = loc.match(/DA5T[-.]?(\d)/);
      if (tentMatch) tentNum = parseInt(tentMatch[1], 10);

      // Extract Group number
      const grpMatch = loc.match(/DA5T[-.]?\d[-.]?0?(\d+)/) || loc.match(/-0?(\d+)-R/);
      if (grpMatch) groupNum = parseInt(grpMatch[1], 10);

      // Extract Row (R1-R4)
      const rowMatch = loc.match(/R([1-4])/);
      if (rowMatch) rowCode = `R${rowMatch[1]}`;

      // Extract Col (01-07)
      const colMatch = loc.match(/-0?([1-7])$/) || loc.match(/R[1-4]-0?([1-7])/);
      if (colMatch) colNum = parseInt(colMatch[1], 10);

      const key = `${tentNum}-${groupNum}-${rowCode}-${colNum}`;
      map.set(key, item);
    });

    return map;
  }, [a5Items]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalSlots = 4 * 7 * 4 * 7; // 784
    let occupied = 0;
    let agingCount = 0;
    const perTent = {
      1: { total: 196, occupied: 0, aging: 0 },
      2: { total: 196, occupied: 0, aging: 0 },
      3: { total: 196, occupied: 0, aging: 0 },
      4: { total: 196, occupied: 0, aging: 0 },
    };

    slotMap.forEach((item, key) => {
      occupied++;
      const [tStr] = key.split('-');
      const t = parseInt(tStr, 10) as 1 | 2 | 3 | 4;
      if (perTent[t]) {
        perTent[t].occupied++;
        if (item.agingDays > 30 || item.agingStatus === 'WARNING' || item.agingStatus === 'OVERDUE') {
          perTent[t].aging++;
          agingCount++;
        }
      }
    });

    return {
      totalCapacity: totalSlots,
      occupied,
      empty: totalSlots - occupied,
      occupancyRate: ((occupied / totalSlots) * 100).toFixed(1),
      agingCount,
      perTent
    };
  }, [slotMap]);

  // Check if slot matches search or filter
  const checkSlotMatch = (tentNum: number, groupNum: number, rowCode: string, colNum: number) => {
    const key = `${tentNum}-${groupNum}-${rowCode}-${colNum}`;
    const item = slotMap.get(key);
    const locator = `DA5T-${tentNum}-${String(groupNum).padStart(2, '0')}-${rowCode}-${String(colNum).padStart(2, '0')}`;

    // Filter check
    if (filterStatus === 'OCCUPIED' && !item) return { isVisible: false, isSearchHit: false, item };
    if (filterStatus === 'EMPTY' && item) return { isVisible: false, isSearchHit: false, item };
    if (filterStatus === 'AGING' && (!item || item.agingDays <= 30)) return { isVisible: false, isSearchHit: false, item };

    // Search check
    let isSearchHit = false;
    if (activeSearch.trim()) {
      const q = activeSearch.toLowerCase().trim();
      const matchesLoc = locator.toLowerCase().includes(q);
      const matchesModel = item && item.modelHE.toLowerCase().includes(q);
      const matchesName = item && item.partName.toLowerCase().includes(q);
      const matchesQR = item && item.qrCode.toLowerCase().includes(q);
      isSearchHit = !!(matchesLoc || matchesModel || matchesName || matchesQR);
    }

    return { isVisible: true, isSearchHit, item, locator };
  };

  const handleCellClick = (tentNum: number, groupNum: number, rowCode: string, colNum: number) => {
    const key = `${tentNum}-${groupNum}-${rowCode}-${colNum}`;
    const item = slotMap.get(key);
    const locator = `DA5T-${tentNum}-${String(groupNum).padStart(2, '0')}-${rowCode}-${String(colNum).padStart(2, '0')}`;

    setSelectedSlotData({
      tentNum,
      groupNum,
      rowCode,
      colNum,
      locator,
      item
    });

    if (onSelectSlot) {
      onSelectSlot(`TENT_${tentNum}`, groupNum, rowCode, colNum);
    }
  };

  const currentTentConfig = TENTS.find(t => t.number === selectedTent) || TENTS[0];

  return (
    <div className="space-y-3">
      {/* Compact Header & Unified Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 sm:p-3 text-white shadow-xs space-y-2.5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2 flex-wrap">
            {onNavigateToCampus && (
              <button
                onClick={onNavigateToCampus}
                className="px-2.5 py-1 rounded-lg text-xs font-black bg-slate-800 hover:bg-slate-700 text-white flex items-center space-x-1 shadow-xs transition-all active:scale-95"
              >
                <span>🏢 ◂ รวมแคมปัส</span>
              </button>
            )}
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-sm sm:text-base font-black tracking-tight text-white">
                ผังเต็นท์วางพื้น A5 (Tent No. 1 - No. 4)
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              ความจุ 784 P (4 เต็นท์)
            </span>
          </div>

          {/* Compact Inline Capacity Indicators */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="px-2.5 py-1 rounded-lg font-bold text-[11px] bg-blue-950/80 text-blue-300 border border-blue-800">
              จัดเก็บ {stats.occupied}/{stats.totalCapacity} P ({stats.occupancyRate}%)
            </span>
            <span className="px-2.5 py-1 rounded-lg font-bold text-[11px] bg-emerald-950/80 text-emerald-300 border border-emerald-800">
              ว่าง {stats.empty} P
            </span>
            {stats.agingCount > 0 && (
              <span className="px-2.5 py-1 rounded-lg font-bold text-[11px] bg-rose-950/80 text-rose-300 border border-rose-800 animate-pulse">
                Aging {stats.agingCount} P
              </span>
            )}
          </div>
        </div>

        {/* Compact View Switcher, Filter & Search Toolbar */}
        <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Tent & Status Filter Chips */}
          <div className="flex items-center flex-wrap gap-1 font-bold">
            <button
              onClick={() => setViewMode('OVERVIEW_4_TENTS')}
              className={`px-2.5 py-1 rounded-lg border transition-all text-xs flex items-center space-x-1 ${
                viewMode === 'OVERVIEW_4_TENTS'
                  ? 'bg-blue-600 text-white border-blue-500 font-black shadow-xs'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>ภาพรวม 4 เต็นท์</span>
            </button>

            <div className="h-4 w-px bg-slate-700 mx-0.5 hidden sm:block"></div>

            {TENTS.map((t) => (
              <button
                key={t.number}
                onClick={() => {
                  setSelectedTent(t.number);
                  setViewMode('TENT_DETAIL');
                }}
                className={`px-2 py-1 rounded-lg border text-xs transition-all ${
                  viewMode === 'TENT_DETAIL' && selectedTent === t.number
                    ? 'bg-emerald-600 text-white border-emerald-500 font-black shadow-xs'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                Tent {t.number}
              </button>
            ))}

            <div className="h-4 w-px bg-slate-700 mx-0.5 hidden sm:block"></div>

            {/* Status filters */}
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-2 py-1 rounded-lg border text-[11px] transition-all ${
                filterStatus === 'ALL'
                  ? 'bg-slate-700 text-white border-slate-600 font-bold'
                  : 'text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setFilterStatus('OCCUPIED')}
              className={`px-2 py-1 rounded-lg border text-[11px] transition-all ${
                filterStatus === 'OCCUPIED'
                  ? 'bg-emerald-700 text-white border-emerald-600 font-bold'
                  : 'text-emerald-400 border-transparent hover:text-emerald-300'
              }`}
            >
              มีสินค้า ({stats.occupied})
            </button>
            <button
              onClick={() => setFilterStatus('EMPTY')}
              className={`px-2 py-1 rounded-lg border text-[11px] transition-all ${
                filterStatus === 'EMPTY'
                  ? 'bg-blue-700 text-white border-blue-600 font-bold'
                  : 'text-blue-400 border-transparent hover:text-blue-300'
              }`}
            >
              ว่าง ({stats.empty})
            </button>
            <button
              onClick={() => setFilterStatus('AGING')}
              className={`px-2 py-1 rounded-lg border text-[11px] transition-all ${
                filterStatus === 'AGING'
                  ? 'bg-rose-700 text-white border-rose-600 font-bold'
                  : 'text-rose-400 border-transparent hover:text-rose-300'
              }`}
            >
              Aging ({stats.agingCount})
            </button>
          </div>

          {/* Quick Search & Scan Button */}
          <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
            <div className="relative min-w-[180px] flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหา Model, DA5T..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-400 text-xs rounded-lg pl-8 pr-7 py-1 focus:outline-none focus:border-emerald-500"
              />
              {localSearch && (
                <button
                  onClick={() => setLocalSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              onClick={() => onOpenScanner('T1-01', 1, 1, 'IN')}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-xs flex items-center space-x-1 active:scale-95 transition-all whitespace-nowrap"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>สแกนรับ</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: OVERVIEW OF ALL 4 TENTS (SITE LAYOUT MATCHING IMAGE 1)             */}
      {/* ========================================================================= */}
      {viewMode === 'OVERVIEW_4_TENTS' && (
        <div className="bg-slate-900 p-6 rounded-2xl border-2 border-dashed border-blue-500/80 shadow-2xl text-center space-y-6">
          <div className="flex items-center justify-between">
            <div className="text-left">
              <span className="px-2.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono text-[10px] font-black border border-blue-500/30">
                OUTDOOR TENT FACILITY (A5 ZONE)
              </span>
              <h3 className="text-lg font-black text-white mt-1">
                ผังรวม 4 เต็นท์ (A5 Tent Campus Master Blueprint)
              </h3>
              <p className="text-xs text-slate-400">
                คลิกที่หลังเต็นท์เพื่อซูมดูผังพาเลทภายใน 7 กลุ่ม (01-07)
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400">เสารองรับเต็นท์ / รั้วกันสาด</span>
              <div className="flex items-center space-x-2 mt-1 justify-end">
                <span className="w-3 h-3 bg-red-600 border border-slate-300 rounded-xs inline-block" />
                <span className="text-[11px] text-slate-300 font-bold">ขอบเขตเต็นท์ (Red Frame)</span>
              </div>
            </div>
          </div>

          {/* 4 Tents Grid Layout matching Image 1: Tent 2 (top-left), Tent 4 (top-right), Tent 1 (bottom-left), Tent 3 (bottom-right) */}
          <div className="relative p-6 bg-slate-950/80 rounded-xl border border-slate-800">
            {/* Forklift Way / Central Cross Aisle */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-8 bg-slate-800/80 flex items-center justify-center pointer-events-none border-y border-dashed border-slate-700">
              <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                ◂ ทางวิ่งโฟล์คลิฟต์หลัก / FORKLIFT MAIN AISLE ▸
              </span>
            </div>
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-8 bg-slate-800/80 flex items-center justify-center pointer-events-none border-x border-dashed border-slate-700">
              <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase rotate-90 whitespace-nowrap">
                CROSS AISLE
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
              {/* TOP LEFT: A5 Tent No. 2 */}
              <div
                onClick={() => {
                  setSelectedTent(2);
                  setViewMode('TENT_DETAIL');
                }}
                className="bg-amber-50/10 hover:bg-amber-50/20 border-4 border-red-600 rounded-md p-4 transition-all cursor-pointer group shadow-lg hover:border-red-400 text-left relative overflow-hidden"
              >
                {/* Black square structural pillars around border */}
                <div className="absolute top-0 left-0 w-3 h-3 bg-slate-800 border border-white" />
                <div className="absolute top-0 right-0 w-3 h-3 bg-slate-800 border border-white" />
                <div className="absolute bottom-0 left-0 w-3 h-3 bg-slate-800 border border-white" />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-slate-800 border border-white" />
                <div className="absolute top-0 left-1/4 w-2.5 h-2.5 bg-slate-800 border border-white" />
                <div className="absolute top-0 left-2/4 w-2.5 h-2.5 bg-slate-800 border border-white" />
                <div className="absolute top-0 left-3/4 w-2.5 h-2.5 bg-slate-800 border border-white" />
                <div className="absolute bottom-0 left-1/4 w-2.5 h-2.5 bg-slate-800 border border-white" />
                <div className="absolute bottom-0 left-2/4 w-2.5 h-2.5 bg-slate-800 border border-white" />
                <div className="absolute bottom-0 left-3/4 w-2.5 h-2.5 bg-slate-800 border border-white" />

                <div className="flex items-center justify-between mb-3">
                  <div className="px-4 py-1.5 bg-purple-200 text-purple-900 border-2 border-purple-400 rounded font-black text-sm shadow-sm group-hover:scale-105 transition-transform">
                    A5 Tent No. 2
                  </div>
                  <div className="px-3 py-1 bg-slate-900 text-blue-400 border border-blue-500 font-mono text-xs font-black rounded shadow">
                    DA5T-2.01
                  </div>
                </div>

                {/* 7 Columns Miniature Representation */}
                <div className="grid grid-cols-7 gap-1.5 bg-amber-200/30 p-2 rounded border border-amber-300/40">
                  {GROUP_NUMBERS.map(grp => (
                    <div key={grp} className="bg-amber-100/80 hover:bg-amber-200 border border-amber-400/80 rounded py-3 text-center transition-colors">
                      <span className="text-[9px] font-black text-slate-800 block">0{grp}</span>
                      <span className="text-[8px] font-semibold text-slate-600">28P</span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-300">
                  <span>จัดเก็บ: <strong className="text-white">{stats.perTent[2].occupied} / 196</strong> Pallets</span>
                  <span className="text-blue-400 group-hover:underline flex items-center space-x-1 font-bold">
                    <span>เปิดดูผังละเอียด</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>

              {/* TOP RIGHT: A5 Tent No. 4 */}
              <div
                onClick={() => {
                  setSelectedTent(4);
                  setViewMode('TENT_DETAIL');
                }}
                className="bg-amber-50/10 hover:bg-amber-50/20 border-4 border-red-600 rounded-md p-4 transition-all cursor-pointer group shadow-lg hover:border-red-400 text-left relative overflow-hidden"
              >
                {/* Structural pillars */}
                <div className="absolute top-0 left-0 w-3 h-3 bg-slate-800 border border-white" />
                <div className="absolute top-0 right-0 w-3 h-3 bg-slate-800 border border-white" />
                <div className="absolute bottom-0 left-0 w-3 h-3 bg-slate-800 border border-white" />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-slate-800 border border-white" />
                <div className="absolute top-0 left-1/4 w-2.5 h-2.5 bg-slate-800 border border-white" />
                <div className="absolute top-0 left-2/4 w-2.5 h-2.5 bg-slate-800 border border-white" />
                <div className="absolute top-0 left-3/4 w-2.5 h-2.5 bg-slate-800 border border-white" />
                <div className="absolute bottom-0 left-1/4 w-2.5 h-2.5 bg-slate-800 border border-white" />
                <div className="absolute bottom-0 left-2/4 w-2.5 h-2.5 bg-slate-800 border border-white" />
                <div className="absolute bottom-0 left-3/4 w-2.5 h-2.5 bg-slate-800 border border-white" />

                <div className="flex items-center justify-between mb-3">
                  <div className="px-4 py-1.5 bg-purple-200 text-purple-900 border-2 border-purple-400 rounded font-black text-sm shadow-sm group-hover:scale-105 transition-transform">
                    A5 Tent No. 4
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-black text-slate-400">RACK A</span>
                    <div className="px-3 py-1 bg-slate-900 text-blue-400 border border-blue-500 font-mono text-xs font-black rounded shadow">
                      DA5T-4.01
                    </div>
                  </div>
                </div>

                {/* 7 Columns Miniature */}
                <div className="grid grid-cols-7 gap-1.5 bg-amber-200/30 p-2 rounded border border-amber-300/40">
                  {GROUP_NUMBERS.map(grp => (
                    <div key={grp} className="bg-amber-100/80 hover:bg-amber-200 border border-amber-400/80 rounded py-3 text-center transition-colors">
                      <span className="text-[9px] font-black text-slate-800 block">0{grp}</span>
                      <span className="text-[8px] font-semibold text-slate-600">28P</span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-300">
                  <span>จัดเก็บ: <strong className="text-white">{stats.perTent[4].occupied} / 196</strong> Pallets</span>
                  <span className="text-blue-400 group-hover:underline flex items-center space-x-1 font-bold">
                    <span>เปิดดูผังละเอียด</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>

              {/* BOTTOM LEFT: A5 Tent No. 1 */}
              <div
                onClick={() => {
                  setSelectedTent(1);
                  setViewMode('TENT_DETAIL');
                }}
                className="bg-amber-50/10 hover:bg-amber-50/20 border-4 border-red-600 rounded-md p-4 transition-all cursor-pointer group shadow-lg hover:border-red-400 text-left relative overflow-hidden"
              >
                {/* Pillars */}
                <div className="absolute top-0 left-0 w-3 h-3 bg-slate-800 border border-white" />
                <div className="absolute top-0 right-0 w-3 h-3 bg-slate-800 border border-white" />
                <div className="absolute bottom-0 left-0 w-3 h-3 bg-slate-800 border border-white" />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-slate-800 border border-white" />
                <div className="absolute top-0 left-1/4 w-2.5 h-2.5 bg-slate-800 border border-white" />
                <div className="absolute top-0 left-2/4 w-2.5 h-2.5 bg-slate-800 border border-white" />
                <div className="absolute top-0 left-3/4 w-2.5 h-2.5 bg-slate-800 border border-white" />
                <div className="absolute bottom-0 left-1/4 w-2.5 h-2.5 bg-slate-800 border border-white" />
                <div className="absolute bottom-0 left-2/4 w-2.5 h-2.5 bg-slate-800 border border-white" />
                <div className="absolute bottom-0 left-3/4 w-2.5 h-2.5 bg-slate-800 border border-white" />

                <div className="flex items-center justify-between mb-3">
                  <div className="px-4 py-1.5 bg-purple-200 text-purple-900 border-2 border-purple-400 rounded font-black text-sm shadow-sm group-hover:scale-105 transition-transform">
                    A5 Tent No. 1
                  </div>
                  <div className="px-3 py-1 bg-slate-900 text-blue-400 border border-blue-500 font-mono text-xs font-black rounded shadow">
                    DA5T-1.01
                  </div>
                </div>

                {/* 7 Columns Miniature */}
                <div className="grid grid-cols-7 gap-1.5 bg-amber-200/30 p-2 rounded border border-amber-300/40">
                  {GROUP_NUMBERS.map(grp => (
                    <div key={grp} className="bg-amber-100/80 hover:bg-amber-200 border border-amber-400/80 rounded py-3 text-center transition-colors">
                      <span className="text-[9px] font-black text-slate-800 block">0{grp}</span>
                      <span className="text-[8px] font-semibold text-slate-600">28P</span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-300">
                  <span>จัดเก็บ: <strong className="text-white">{stats.perTent[1].occupied} / 196</strong> Pallets</span>
                  <span className="text-blue-400 group-hover:underline flex items-center space-x-1 font-bold">
                    <span>เปิดดูผังละเอียด</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>

              {/* BOTTOM RIGHT: A5 Tent No. 3 */}
              <div
                onClick={() => {
                  setSelectedTent(3);
                  setViewMode('TENT_DETAIL');
                }}
                className="bg-amber-50/10 hover:bg-amber-50/20 border-4 border-red-600 rounded-md p-4 transition-all cursor-pointer group shadow-lg hover:border-red-400 text-left relative overflow-hidden"
              >
                {/* Pillars */}
                <div className="absolute top-0 left-0 w-3 h-3 bg-slate-800 border border-white" />
                <div className="absolute top-0 right-0 w-3 h-3 bg-slate-800 border border-white" />
                <div className="absolute bottom-0 left-0 w-3 h-3 bg-slate-800 border border-white" />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-slate-800 border border-white" />
                <div className="absolute top-0 left-1/4 w-2.5 h-2.5 bg-slate-800 border border-white" />
                <div className="absolute top-0 left-2/4 w-2.5 h-2.5 bg-slate-800 border border-white" />
                <div className="absolute top-0 left-3/4 w-2.5 h-2.5 bg-slate-800 border border-white" />
                <div className="absolute bottom-0 left-1/4 w-2.5 h-2.5 bg-slate-800 border border-white" />
                <div className="absolute bottom-0 left-2/4 w-2.5 h-2.5 bg-slate-800 border border-white" />
                <div className="absolute bottom-0 left-3/4 w-2.5 h-2.5 bg-slate-800 border border-white" />

                <div className="flex items-center justify-between mb-3">
                  <div className="px-4 py-1.5 bg-purple-200 text-purple-900 border-2 border-purple-400 rounded font-black text-sm shadow-sm group-hover:scale-105 transition-transform">
                    A5 Tent No. 3
                  </div>
                  <div className="px-3 py-1 bg-slate-900 text-blue-400 border border-blue-500 font-mono text-xs font-black rounded shadow">
                    DA5T-3.01
                  </div>
                </div>

                {/* 7 Columns Miniature */}
                <div className="grid grid-cols-7 gap-1.5 bg-amber-200/30 p-2 rounded border border-amber-300/40">
                  {GROUP_NUMBERS.map(grp => (
                    <div key={grp} className="bg-amber-100/80 hover:bg-amber-200 border border-amber-400/80 rounded py-3 text-center transition-colors">
                      <span className="text-[9px] font-black text-slate-800 block">0{grp}</span>
                      <span className="text-[8px] font-semibold text-slate-600">28P</span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-300">
                  <span>จัดเก็บ: <strong className="text-white">{stats.perTent[3].occupied} / 196</strong> Pallets</span>
                  <span className="text-blue-400 group-hover:underline flex items-center space-x-1 font-bold">
                    <span>เปิดดูผังละเอียด</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: DETAILED TENT GRID VIEW (MATCHING IMAGE 2 EXACT BLUEPRINT)         */}
      {/* ========================================================================= */}
      {viewMode === 'TENT_DETAIL' && (
        <div className="space-y-4">
          {/* Active Tent Switcher & Information Banner */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-left">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-1 rounded bg-purple-100 text-purple-900 font-black text-xs border border-purple-300">
                  {currentTentConfig.name}
                </span>
                <span className="font-mono text-xs font-bold text-slate-500">
                  Code: {currentTentConfig.signCode}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 font-medium">
                {currentTentConfig.description}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-500 font-bold">เลือกเต็นท์:</span>
              <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                {TENTS.map((t) => (
                  <button
                    key={t.number}
                    onClick={() => setSelectedTent(t.number)}
                    className={`px-3 py-1 rounded-md text-xs font-black transition-all ${
                      selectedTent === t.number
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tent {t.number}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive Blueprint Canvas (Image 2 Replica) */}
          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-md border-2 border-slate-800 overflow-x-auto text-left">
            <div className="min-w-[840px] space-y-4">
              {/* Group Headers (Blue bold titles: A5 Tent 1 -01, A5 Tent 1 -02 ...) */}
              <div className="flex items-center">
                {/* Column Y-Axis label placeholder */}
                <div className="w-16 shrink-0 text-center">
                  <span className="text-[11px] font-black text-slate-900 uppercase">Column</span>
                </div>

                {/* 7 Group Titles */}
                <div className="grid grid-cols-7 gap-3 flex-1">
                  {GROUP_NUMBERS.map((grp) => (
                    <div key={grp} className="text-center">
                      <span className="text-xs sm:text-sm font-black text-blue-700 tracking-tight block">
                        A5 Tent {selectedTent} -0{grp}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 font-semibold">
                        DA5T-{selectedTent}-0{grp}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Main Grid: Rows 07 down to 01 */}
              <div className="space-y-1.5 border-t-2 border-b-2 border-slate-900 py-3">
                {COLUMN_NUMBERS.map((colNum) => (
                  <div key={colNum} className="flex items-center">
                    {/* Y-Axis Label: 07, 06, 05 ... */}
                    <div className="w-16 shrink-0 text-center">
                      <span className="font-mono text-xs sm:text-sm font-black text-slate-800">
                        {String(colNum).padStart(2, '0')}
                      </span>
                    </div>

                    {/* 7 Group Columns side-by-side */}
                    <div className="grid grid-cols-7 gap-3 flex-1">
                      {GROUP_NUMBERS.map((grpNum) => (
                        <div
                          key={grpNum}
                          className="grid grid-cols-4 border-2 border-slate-900 bg-white shadow-xs"
                        >
                          {ROW_CODES.map((rowCode) => {
                            const { isVisible, isSearchHit, item, locator } = checkSlotMatch(
                              selectedTent,
                              grpNum,
                              rowCode,
                              colNum
                            );

                            const isSelected =
                              selectedSlotData &&
                              selectedSlotData.tentNum === selectedTent &&
                              selectedSlotData.groupNum === grpNum &&
                              selectedSlotData.rowCode === rowCode &&
                              selectedSlotData.colNum === colNum;

                            // Distinct styling matching unified floor maps (Dark/Light consistent)
                            let cellBg = 'bg-slate-50 hover:bg-amber-50/60 border-slate-300 text-slate-700';

                            if (item) {
                              if (item.agingDays > 30 || item.agingStatus === 'WARNING' || item.agingStatus === 'OVERDUE') {
                                cellBg = 'bg-amber-100 hover:bg-amber-200 border-amber-500 text-slate-900 shadow-2xs';
                              } else {
                                cellBg = 'bg-rose-700 hover:bg-rose-600 border-rose-900 text-white shadow-xs font-bold';
                              }
                            }

                            if (isSelected) {
                              cellBg = 'bg-blue-600 ring-2 ring-blue-400 text-white animate-pulse';
                            } else if (isSearchHit) {
                              cellBg = 'bg-emerald-600 ring-2 ring-emerald-400 text-white';
                            }

                            return (
                              <button
                                key={rowCode}
                                id={`slot-tent${selectedTent}-g${grpNum}-${rowCode}-c${colNum}`}
                                onClick={() => handleCellClick(selectedTent, grpNum, rowCode, colNum)}
                                onMouseEnter={(e) => {
                                  setHoveredSlot({
                                    title: `เต็นท์ A5 Tent ${selectedTent} (กลุ่ม ${String(grpNum).padStart(2, '0')}) - ${rowCode} เสา ${String(colNum).padStart(2, '0')}`,
                                    locatorCode: locator,
                                    zoneName: `ลานเต็นท์ A5 (DA5T-${selectedTent})`,
                                    positionLabel: `กลุ่ม ${grpNum} • แถว ${rowCode} • ลำดับที่ ${colNum} จาก 7 ช่อง`,
                                    item: item || null,
                                    x: e.clientX,
                                    y: e.clientY
                                  });
                                }}
                                onMouseMove={(e) => {
                                  if (hoveredSlot) {
                                    setHoveredSlot(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
                                  }
                                }}
                                onMouseLeave={() => setHoveredSlot(null)}
                                className={`h-7.5 sm:h-8 border rounded p-0.5 flex flex-col justify-between items-center text-center transition-all cursor-pointer relative overflow-hidden select-none ${cellBg} ${
                                  !isVisible ? 'opacity-20' : 'opacity-100'
                                }`}
                                title={`Locator: ${locator}${item ? ` | ${item.modelHE} - ${item.partName}` : ' (ว่าง)'}`}
                              >
                                <div className="w-full flex items-center justify-between text-[7px] font-mono leading-none">
                                  <span className="font-black opacity-80">{rowCode}</span>
                                  {item && (
                                    <span className="text-[6.5px] font-mono font-black bg-black/25 px-0.5 rounded leading-none">
                                      {item.useLine || '1P'}
                                    </span>
                                  )}
                                </div>

                                {item ? (
                                  <>
                                    <div className="w-full leading-tight truncate my-auto">
                                      <span className="text-[7.5px] sm:text-[8px] font-mono font-black tracking-tight truncate block drop-shadow-2xs">
                                        {item.modelHE}
                                      </span>
                                    </div>
                                    <div className="w-full text-center pt-0.2 border-t border-black/10 text-[7px] font-mono font-black leading-none">
                                      {item.quantity}U
                                    </div>
                                  </>
                                ) : (
                                  <div className="my-auto">
                                    <span className="text-[7px] text-slate-300 font-sans">
                                      ว่าง
                                    </span>
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Row Labels: R1, R2, R3, R4 underneath each group */}
              <div className="flex items-center">
                <div className="w-16 shrink-0" />
                <div className="grid grid-cols-7 gap-3 flex-1">
                  {GROUP_NUMBERS.map((grpNum) => (
                    <div key={grpNum} className="grid grid-cols-4 text-center">
                      {ROW_CODES.map((rowCode) => (
                        <span key={rowCode} className="text-[10px] font-bold text-slate-700">
                          {rowCode}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Floor Blueprint Legend */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              <span className="font-bold text-slate-700">สัญลักษณ์สีผังเต็นท์:</span>
              <div className="flex items-center space-x-1.5">
                <span className="w-4 h-4 bg-red-700 border border-slate-900 inline-block rounded-xs" />
                <span className="text-slate-700 font-semibold">มีสินค้า (Occupied Slot - ตามแบบผัง)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-4 h-4 bg-white border border-slate-900 inline-block rounded-xs" />
                <span className="text-slate-700 font-semibold">ตำแหน่งว่าง (Available)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-4 h-4 bg-amber-600 border border-slate-900 inline-block rounded-xs" />
                <span className="text-slate-700 font-semibold">Aging &gt; 30 วัน (Warning)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-4 h-4 bg-emerald-600 border border-slate-900 inline-block rounded-xs" />
                <span className="text-slate-700 font-semibold">ตรงกับการค้นหา (Search Match)</span>
              </div>
            </div>

            <div className="text-slate-500 font-mono text-[11px]">
              รูปแบบรหัส: <strong>DA5T-[เต็นท์]-[กลุ่ม 01-07]-[แถว R1-R4]-[คอลัมน์ 01-07]</strong>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING HOVER MINI-STATS OVERLAY FOR TENT SLOTS */}
      {hoveredSlot && (
        <SlotMiniStatsOverlay data={hoveredSlot} />
      )}

      {/* ========================================================================= */}
      {/* UNIFIED PALLET SLOT DETAILS MODAL                                         */}
      {/* ========================================================================= */}
      <UnifiedSlotModal
        isOpen={!!selectedSlotData}
        onClose={() => setSelectedSlotData(null)}
        slotData={selectedSlotData ? {
          sectorType: 'TENT',
          buildingName: 'อาคาร A5 & ลานเต็นท์',
          facilityId: 'FAC-A5-OUTDOOR',
          zoneName: `${TENTS.find(t => t.number === selectedSlotData.tentNum)?.name} - กลุ่ม ${String(selectedSlotData.groupNum).padStart(2, '0')}`,
          locatorCode: selectedSlotData.locator,
          bayOrGroupNumber: selectedSlotData.groupNum,
          rowNumber: parseInt(selectedSlotData.rowCode.replace('R', ''), 10) || 1,
          columnOrRailNumber: selectedSlotData.colNum,
          item: selectedSlotData.item || null,
          maxCapacityPallets: 1
        } : null}
        onOpenScanner={(zone, bay, level, mode) => {
          if (selectedSlotData) {
            onOpenScanner('T1-01', selectedSlotData.groupNum, 1, mode);
          }
        }}
        onRelocateItem={onRelocateItem}
      />
    </div>
  );
};
