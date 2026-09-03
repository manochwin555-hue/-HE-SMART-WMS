import React, { useState, useMemo } from 'react';
import { InventoryItem, MovementType, ShelfLevel, StorageZone } from '../types';
import { UnifiedSlotModal, UnifiedSlotData } from './UnifiedSlotModal';
import { SlotMiniStatsOverlay, MiniStatsSlotData } from './SlotMiniStatsOverlay';
import { CY3IsometricView } from './CY3IsometricView';
import { CY3FrontElevationView } from './CY3FrontElevationView';
import { MiniatureRackIcon } from './MiniatureRackIcon';
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
  Clock,
  X,
  Truck,
  Eye,
  SlidersHorizontal,
  Sparkles,
  LayoutGrid
} from 'lucide-react';

interface CY3TentRackMapProps {
  items: InventoryItem[];
  searchQuery?: string;
  onOpenScanner: (zone: StorageZone, bay: number, level: ShelfLevel, mode: MovementType) => void;
  onRelocateItem?: (item: InventoryItem) => void;
  onNavigateToCampus?: () => void;
  onPrintLabel?: (item: InventoryItem) => void;
}

// 4 Rows configuration matching user reference diagram
interface CY3RowConfig {
  rowCode: 'A' | 'B' | 'C' | 'D';
  zoneId: string;
  locatorSign: string;
  description: string;
  totalBays: number; // 25 bays
  maxLevels: number; // 4 floors
  hasBottomRoad?: boolean;
}

const CY3_ROWS: CY3RowConfig[] = [
  {
    rowCode: 'A',
    zoneId: 'CY3-A',
    locatorSign: 'DY3T-1.01',
    description: 'แร็คแถว A (ทิศเหนือ) - 25 ช่องเสา x 4 ชั้น = 100 พาเลท',
    totalBays: 25,
    maxLevels: 4,
    hasBottomRoad: true // Forklift road between A and B
  },
  {
    rowCode: 'B',
    zoneId: 'CY3-B',
    locatorSign: 'DY3T-1.02',
    description: 'แร็คแถว B (ประกบแถว C) - 25 ช่องเสา x 4 ชั้น = 100 พาเลท',
    totalBays: 25,
    maxLevels: 4,
    hasBottomRoad: false // Back-to-back with C
  },
  {
    rowCode: 'C',
    zoneId: 'CY3-C',
    locatorSign: 'DY3T-1.03',
    description: 'แร็คแถว C (ประกบแถว B) - 25 ช่องเสา x 4 ชั้น = 100 พาเลท',
    totalBays: 25,
    maxLevels: 4,
    hasBottomRoad: true // Forklift road between C and D
  },
  {
    rowCode: 'D',
    zoneId: 'CY3-D',
    locatorSign: 'DY3T-1.04',
    description: 'แร็คแถว D (ทิศใต้) - 25 ช่องเสา x 4 ชั้น = 100 พาเลท',
    totalBays: 25,
    maxLevels: 4,
    hasBottomRoad: false
  }
];

export const CY3TentRackMap: React.FC<CY3TentRackMapProps> = ({
  items,
  searchQuery = '',
  onOpenScanner,
  onRelocateItem,
  onNavigateToCampus,
  onPrintLabel
}) => {
  const [viewMode, setViewMode] = useState<'REFERENCE_2D' | 'ISOMETRIC_25D' | 'FRONT_ELEVATION' | 'HEATMAP' | 'FIFO_AGING'>('REFERENCE_2D');
  const [floorFilter, setFloorFilter] = useState<'ALL' | 1 | 2 | 3 | 4>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'OCCUPIED' | 'EMPTY' | 'AGING'>('ALL');
  const [localSearch, setLocalSearch] = useState<string>(searchQuery);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('ซิงค์แล้ว');
  
  // UnifiedSlotModal Data
  const [selectedSlotModal, setSelectedSlotModal] = useState<UnifiedSlotData | null>(null);
  const [isSlotModalOpen, setIsSlotModalOpen] = useState<boolean>(false);

  // Hover Tooltip Overlay Data
  const [hoveredSlot, setHoveredSlot] = useState<MiniStatsSlotData | null>(null);

  const activeSearch = (localSearch || searchQuery).trim().toLowerCase();

  // Filter items that belong to CY3 facility or have DY3T locators
  const cy3Items = useMemo(() => {
    return items.filter(it => 
      it.facilityId === 'FAC-CY3-TENT' || 
      it.locatorCode.includes('DY3T') ||
      (typeof it.zone === 'string' && it.zone.startsWith('CY3'))
    );
  }, [items]);

  // Lookup map: `ROW-BAY-LEVEL` -> InventoryItem
  const slotMap = useMemo(() => {
    const map = new Map<string, InventoryItem>();
    cy3Items.forEach(it => {
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

      // Parse locator if bay/level not explicitly in item
      const locMatch = it.locatorCode.match(/DY3T-1\.0[1-4]-(?:[A-D])?0?(\d+)-L(\d)/i);
      if (locMatch) {
        bNum = parseInt(locMatch[1], 10);
        lvl = parseInt(locMatch[2], 10) as ShelfLevel;
      }

      map.set(`${rCode}-${bNum}-${lvl}`, it);
    });
    return map;
  }, [cy3Items]);

  // Capacity metrics
  const metrics = useMemo(() => {
    const totalCapacity = 400; // 4 rows * 25 bays * 4 levels
    const totalOccupied = cy3Items.reduce((acc, it) => acc + (it.fullPallets || 1), 0);
    const utilizationRate = Math.min(100, Math.round((totalOccupied / totalCapacity) * 1000) / 10);
    const agingCount = cy3Items.filter(it => it.agingDays > 14).length;
    const overdueCount = cy3Items.filter(it => it.agingDays > 30).length;

    // Row metrics
    const rowStats = {
      A: cy3Items.filter(it => it.zone === 'CY3-A' || it.locatorCode.includes('DY3T-1.01')).length,
      B: cy3Items.filter(it => it.zone === 'CY3-B' || it.locatorCode.includes('DY3T-1.02')).length,
      C: cy3Items.filter(it => it.zone === 'CY3-C' || it.locatorCode.includes('DY3T-1.03')).length,
      D: cy3Items.filter(it => it.zone === 'CY3-D' || it.locatorCode.includes('DY3T-1.04')).length,
    };

    return {
      totalCapacity,
      totalOccupied,
      utilizationRate,
      agingCount,
      overdueCount,
      rowStats
    };
  }, [cy3Items]);

  const handleManualSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      const now = new Date();
      setLastSyncTime(`ซิงค์เมื่อ ${now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`);
    }, 500);
  };

  const getBayItems = (rowCode: 'A' | 'B' | 'C' | 'D', bayNum: number): InventoryItem[] => {
    const list: InventoryItem[] = [];
    for (let l = 1; l <= 4; l++) {
      const item = slotMap.get(`${rowCode}-${bayNum}-${l}`);
      if (item) list.push(item);
    }
    return list;
  };

  const handleSlotClick = (rowCode: 'A' | 'B' | 'C' | 'D', bayNum: number, locatorSign: string, targetLevel?: ShelfLevel) => {
    const bayItems = getBayItems(rowCode, bayNum);
    const lvl = targetLevel || (floorFilter !== 'ALL' ? floorFilter : 1);
    const item = slotMap.get(`${rowCode}-${bayNum}-${lvl}`) || null;

    const formattedBay = `${rowCode}${bayNum}`;
    const locator = `${locatorSign}-${formattedBay}-L${lvl}`;

    setSelectedSlotModal({
      sectorType: 'RACK',
      buildingName: 'CY3 Tent',
      facilityId: 'FAC-CY3-TENT',
      zoneName: `Row ${rowCode} (${locatorSign})`,
      locatorCode: locator,
      bayOrGroupNumber: bayNum,
      level: lvl,
      maxCapacityPallets: 4, // 4-tier rack
      item,
      bayItems
    });
    setIsSlotModalOpen(true);
  };

  const handleSlotMouseEnter = (
    e: React.MouseEvent,
    rowCode: 'A' | 'B' | 'C' | 'D',
    bayNum: number,
    locatorSign: string
  ) => {
    const bayItems = getBayItems(rowCode, bayNum);
    const formattedBay = `${rowCode}${bayNum}`;
    const defaultItem = bayItems[0] || null;

    setHoveredSlot({
      title: `CY3 Tent Row ${rowCode} Bay ${formattedBay}`,
      locatorCode: `${locatorSign}-${formattedBay}`,
      zoneName: `CY3 แถว ${rowCode} (${locatorSign})`,
      positionLabel: `ช่องเสาที่ ${bayNum} (แร็ค 4 ชั้น: จัดเก็บ ${bayItems.length}/4 พาเลท)`,
      item: defaultItem,
      items: bayItems,
      x: e.clientX,
      y: e.clientY
    });
  };

  const handleSlotMouseLeave = () => {
    setHoveredSlot(null);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden select-none">
      
      {/* ========================================================================= */}
      {/* 1. ULTRA-COMPACT ENTERPRISE TOOLBAR (Height <= 36px, Single Unified Row)  */}
      {/* ========================================================================= */}
      <div className="h-10 px-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0 z-20 text-xs">
        
        {/* Left: Breadcrumb & Title */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onNavigateToCampus}
            className="flex items-center gap-1 text-slate-400 hover:text-white font-bold transition-colors"
            title="กลับสู่โซนรวมทุกอาคาร (Campus Master)"
          >
            <Building2 className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline text-[11px]">แคมปัส</span>
          </button>
          <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
          
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <h2 className="font-black text-xs sm:text-sm text-white tracking-tight flex items-center gap-1">
              <span>CY3 Tent</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                4-Floor Rack (400P)
              </span>
            </h2>
          </div>

          {/* Real-Time Live Occupancy Pill */}
          <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10.5px] font-mono">
            <span className="text-slate-400">จัดเก็บ:</span>
            <span className="text-emerald-400 font-black">{metrics.totalOccupied}</span>
            <span className="text-slate-500">/</span>
            <span className="text-slate-300 font-bold">{metrics.totalCapacity} P</span>
            <span className="text-blue-400 font-bold">({metrics.utilizationRate}%)</span>
          </div>
        </div>

        {/* Center: Floor Filter & View Mode Switcher */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          
          {/* Level / Floor Selector Pills */}
          <div className="inline-flex items-center bg-slate-800/90 p-0.5 rounded-md border border-slate-700/80 h-7 shrink-0">
            <span className="px-1 text-[10px] font-bold text-slate-400 hidden xl:inline">ชั้น:</span>
            {(['ALL', 1, 2, 3, 4] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setFloorFilter(lvl)}
                className={`h-6 px-1.5 rounded text-[10.5px] font-mono font-bold transition-all ${
                  floorFilter === lvl
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
                title={lvl === 'ALL' ? 'แสดงทุกชั้น L1-L4' : `กรองเฉพาะชั้น L${lvl}`}
              >
                {lvl === 'ALL' ? 'ทุกชั้น' : `L${lvl}`}
              </button>
            ))}
          </div>

          {/* View Mode Switcher (4 Options matching user request) */}
          <div className="inline-flex items-center bg-slate-800/90 p-0.5 rounded-md border border-slate-700/80 h-7 shrink-0 gap-0.5">
            {/* 1. Top View (Stacked Segmented Blocks) */}
            <button
              onClick={() => setViewMode('REFERENCE_2D')}
              className={`h-6 px-2 rounded text-[11px] font-bold flex items-center gap-1 transition-all ${
                viewMode === 'REFERENCE_2D'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
              title="โซน Top View บล็อก 4 ชั้นซ้อน (Stacked Segmented)"
            >
              <Grid className="w-3 h-3" />
              <span className="hidden sm:inline">Top View (4 ชั้น)</span>
            </button>

            {/* 2. 2.5D Isometric View */}
            <button
              onClick={() => setViewMode('ISOMETRIC_25D')}
              className={`h-6 px-2 rounded text-[11px] font-bold flex items-center gap-1 transition-all ${
                viewMode === 'ISOMETRIC_25D'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
              title="มุมมอง 2.5D Isometric เสา Rack ซ้อน 4 ชั้นจริง"
            >
              <Box className="w-3 h-3 text-cyan-300" />
              <span className="hidden sm:inline">2.5D Isometric</span>
            </button>

            {/* 3. Front Elevation View */}
            <button
              onClick={() => setViewMode('FRONT_ELEVATION')}
              className={`h-6 px-2 rounded text-[11px] font-bold flex items-center gap-1 transition-all ${
                viewMode === 'FRONT_ELEVATION'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
              title="มุมมองด้านหน้าตู้แร็ค Front View (25 เสา x 4 ชั้น)"
            >
              <Layers className="w-3 h-3 text-emerald-300" />
              <span className="hidden sm:inline">Front View</span>
            </button>

            {/* 4. Heatmap */}
            <button
              onClick={() => setViewMode('HEATMAP')}
              className={`h-6 px-1.5 rounded text-[11px] font-bold flex items-center gap-1 transition-all ${
                viewMode === 'HEATMAP'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
              title="แผนภูมิความหนาแน่นพาเลท (Occupancy Heatmap)"
            >
              <Flame className="w-3 h-3 text-amber-400" />
              <span className="hidden md:inline">Heatmap</span>
            </button>

            {/* 5. FIFO Aging */}
            <button
              onClick={() => setViewMode('FIFO_AGING')}
              className={`h-6 px-1.5 rounded text-[11px] font-bold flex items-center gap-1 transition-all ${
                viewMode === 'FIFO_AGING'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
              title="แผนภูมิตรวจสอบ FIFO & อายุค้าง (Aging)"
            >
              <Clock className="w-3 h-3 text-amber-300" />
              <span className="hidden md:inline">FIFO Aging</span>
            </button>
          </div>

          {/* Status Filter Chips */}
          <div className="hidden 2xl:inline-flex items-center bg-slate-800/90 p-0.5 rounded-md border border-slate-700/80 h-7 shrink-0">
            {(['ALL', 'OCCUPIED', 'EMPTY', 'AGING'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`h-6 px-2 rounded text-[10.5px] font-bold transition-all ${
                  filterStatus === st
                    ? 'bg-slate-700 text-white font-black'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st === 'ALL' && 'ทั้งหมด'}
                {st === 'OCCUPIED' && 'มีสินค้า'}
                {st === 'EMPTY' && 'ว่าง'}
                {st === 'AGING' && `ค้างนาน (${metrics.agingCount})`}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Search, Scan Shortcut & Sync */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="relative w-36 sm:w-44 h-7">
            <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="ค้นหา Model, Locator..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full h-7 bg-slate-800 border border-slate-700 rounded-md pl-6 pr-5 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            {localSearch && (
              <button
                onClick={() => setLocalSearch('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            onClick={() => onOpenScanner('CY3-A', 1, 1, 'IN')}
            className="h-7 px-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-[11px] font-bold flex items-center gap-1 shadow-xs transition-colors"
            title="เปิดกล้องสแกน QR Code รับ-เบิก"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">สแกน QR</span>
          </button>

          <button
            onClick={handleManualSync}
            className="h-7 w-7 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center justify-center transition-colors shrink-0"
            title={lastSyncTime}
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN WAREHOUSE BLUEPRINT VIEWPORT                                       */}
      {/* ========================================================================= */}
      <div className="flex-1 overflow-auto p-2.5 sm:p-4 bg-slate-950 flex flex-col items-center justify-start">
        
        {/* Maximum Width Blueprint Board matching Reference Image Aspect Ratio */}
        <div className="w-full max-w-[1440px] flex flex-col space-y-3 animate-fadeIn">
          
          {/* REFERENCE DIAGRAM TITLE PILL: "CY3 Tent" */}
          <div className="flex items-center justify-center">
            <div className="bg-[#002060] border border-blue-400/50 shadow-xl rounded-lg px-6 py-1.5 flex items-center gap-2">
              <span className="text-base sm:text-lg font-black text-white tracking-wide">
                CY3 Tent
              </span>
              <span className="ml-2 text-[10px] font-mono bg-blue-900/80 text-blue-200 px-2 py-0.5 rounded border border-blue-400/30">
                แร็ค 4 ชั้น &bull; 4 แถว x 25 ช่องเสา = 400 พาเลท
              </span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* VIEW 1: TOP VIEW WITH TRUE STACKED SEGMENTED BLOCKS (REFERENCE_2D / HEATMAP / FIFO) */}
          {/* ========================================================================= */}
          {(viewMode === 'REFERENCE_2D' || viewMode === 'HEATMAP' || viewMode === 'FIFO_AGING') && (
            <div className="relative border-2 border-red-600 rounded-xl bg-slate-900/90 shadow-2xl p-3 sm:p-4.5 overflow-hidden">
              
              {/* Dashed line accent along top as depicted in the reference diagram */}
              <div className="absolute top-2 left-4 right-4 border-t-2 border-dashed border-red-500/80 pointer-events-none" />

              <div className="space-y-3 pt-2">
                
                {/* LOOP THROUGH ROWS A, B, C, D */}
                {CY3_ROWS.map((row) => {
                  return (
                    <React.Fragment key={row.rowCode}>
                      
                      {/* SINGLE RACK ROW (A, B, C, or D) */}
                      <div className="flex items-center gap-1.5 sm:gap-2.5 w-full bg-slate-950/70 p-1.5 sm:p-2 rounded-lg border border-slate-800/90 hover:border-slate-700 transition-colors">
                        
                        {/* 1. LEFT HEADER: [ROW CODE BADGE] + Miniature 4-Tier Rack Icon + "X 4 Floor" */}
                        <div className="flex items-center gap-1.5 shrink-0 w-28 sm:w-36">
                          {/* Navy Square Badge */}
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-[#002060] border border-blue-400/60 flex items-center justify-center text-white font-black text-sm sm:text-base shadow-md shrink-0">
                            {row.rowCode}
                          </div>

                          {/* Miniature 4-Tier Rack Icon (Visual Cue) */}
                          <MiniatureRackIcon 
                            size="md"
                            levelsOccupied={Math.min(4, Math.ceil(metrics.rowStats[row.rowCode] / 25))}
                            className="shrink-0 hidden sm:inline-flex"
                          />

                          {/* "X 4 Floor" text exactly as in diagram */}
                          <div className="flex flex-col leading-tight">
                            <span className="font-black text-xs sm:text-sm text-slate-100 whitespace-nowrap">
                              X 4 Floor
                            </span>
                            <span className="text-[9px] font-mono text-slate-400">
                              {metrics.rowStats[row.rowCode]}/100P
                            </span>
                          </div>
                        </div>

                        {/* 2. CENTER: 25 BAYS (1 to 25) - STACKED 4-TIER SEGMENTED BLOCKS */}
                        <div className="flex-1 grid grid-cols-25 gap-1 min-w-[720px] overflow-x-auto py-1">
                          {Array.from({ length: 25 }, (_, idx) => {
                            const bayNum = idx + 1;
                            const bayItems = getBayItems(row.rowCode, bayNum);
                            const bayOccupiedCount = bayItems.length; // 0 to 4
                            const isFull = bayOccupiedCount === 4;
                            const isEmpty = bayOccupiedCount === 0;

                            // Aging warning check
                            const hasAgingAlert = bayItems.some(it => it.agingDays > 14);
                            const hasOverdue = bayItems.some(it => it.agingDays > 30);

                            // Search match check
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

                            // Filter status logic
                            if (filterStatus === 'OCCUPIED' && isEmpty) return <div key={bayNum} className="opacity-20" />;
                            if (filterStatus === 'EMPTY' && !isEmpty) return <div key={bayNum} className="opacity-20" />;
                            if (filterStatus === 'AGING' && !hasAgingAlert) return <div key={bayNum} className="opacity-20" />;

                            return (
                              <div
                                key={bayNum}
                                onMouseEnter={(e) => handleSlotMouseEnter(e, row.rowCode, bayNum, row.locatorSign)}
                                onMouseLeave={handleSlotMouseLeave}
                                className={`relative h-20 sm:h-22 rounded-md border flex flex-col justify-between p-0.5 transition-all bg-slate-950/80 ${
                                  isSearchMatch
                                    ? 'ring-2 ring-amber-400 bg-amber-400/20 border-amber-300 scale-105 z-10'
                                    : 'border-slate-700/80 hover:border-blue-400'
                                }`}
                              >
                                {/* Bay Header Bar (Number 1 to 25) */}
                                <button
                                  type="button"
                                  onClick={() => handleSlotClick(row.rowCode, bayNum, row.locatorSign)}
                                  className={`w-full py-0.5 rounded-t text-center font-mono font-black text-[9.5px] sm:text-[10.5px] leading-none transition-colors ${
                                    isFull
                                      ? 'bg-blue-600 text-white'
                                      : bayOccupiedCount > 0
                                      ? 'bg-blue-900/60 text-blue-200'
                                      : 'bg-[#edd9af] text-slate-900'
                                  }`}
                                  title={`คลิกเพื่อตรวจสอบทั้ง 4 ชั้นของ Bay ${row.rowCode}${bayNum}`}
                                >
                                  {bayNum}
                                </button>

                                {/* 4 STACKED SEGMENTED BLOCKS (L4 on top down to L1 at bottom) */}
                                <div className="w-full flex flex-col gap-[1.5px] my-auto">
                                  {([4, 3, 2, 1] as const).map((lvl) => {
                                    const lvlItem = slotMap.get(`${row.rowCode}-${bayNum}-${lvl}`);
                                    const hasLvlItem = !!lvlItem;
                                    const isLvlFiltered = floorFilter !== 'ALL' && floorFilter !== lvl;
                                    const isLvlAging = lvlItem && lvlItem.agingDays > 14;
                                    const isLvlOverdue = lvlItem && lvlItem.agingDays > 30;

                                    return (
                                      <button
                                        key={lvl}
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSlotClick(row.rowCode, bayNum, row.locatorSign, lvl);
                                        }}
                                        className={`w-full h-3.5 sm:h-4 rounded-xs border text-[7px] sm:text-[7.5px] font-mono font-bold flex items-center justify-between px-1 transition-all transform active:scale-95 ${
                                          isLvlFiltered
                                            ? 'opacity-25 grayscale'
                                            : hasLvlItem
                                            ? isLvlOverdue
                                              ? 'bg-rose-600 border-rose-400 text-white animate-pulse'
                                              : isLvlAging
                                              ? 'bg-amber-500 border-amber-300 text-white'
                                              : 'bg-blue-600 hover:bg-blue-500 border-blue-400 text-white'
                                            : 'bg-[#edd9af] hover:bg-[#f5e7c8] border-[#cbb07e] text-slate-800'
                                        }`}
                                        title={`${row.locatorSign}-${row.rowCode}${bayNum}-L${lvl}: ${hasLvlItem ? `${lvlItem.modelHE} (${lvlItem.quantity} ชิ้น)` : 'ว่าง'}`}
                                      >
                                        <span className="leading-none opacity-90">L{lvl}</span>
                                        <span className="leading-none font-black">
                                          {hasLvlItem ? (lvlItem.fullPallets ? `${lvlItem.fullPallets}P` : '✓') : '—'}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>

                                {/* Aging Alert Dot on Bay */}
                                {hasAgingAlert && (
                                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-1 ring-white animate-pulse" />
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* 3. RIGHT LOCATOR BADGE: [DY3T-1.01 to 1.04] */}
                        <div className="shrink-0 w-20 sm:w-24 text-right">
                          <div className="bg-[#002060] border border-blue-400/60 text-white rounded-md px-1.5 sm:px-2 py-1 text-center shadow-md">
                            <span className="font-mono font-black text-[10px] sm:text-xs tracking-tight block">
                              {row.locatorSign}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* FORKLIFT DRIVEWAY / ROAD MARKING (Between A and B, and between C and D) */}
                      {row.hasBottomRoad && (
                        <div className="py-1 px-3 bg-slate-950/80 border-y border-dashed border-amber-500/40 rounded flex items-center justify-between text-[9px] sm:text-[10px] font-mono text-amber-400/90 select-none">
                          <div className="flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5 text-amber-400" />
                            <span className="font-bold">⇋ ทางวิ่งรถยก Forklift Aisle (กว้าง 4.0 เมตร) ⇋</span>
                          </div>
                          <div className="hidden sm:flex items-center gap-3 text-slate-400">
                            <span>ความเร็วสูงสุด &le; 10 km/h</span>
                            <span className="text-emerald-400">&bull; เชื่อมต่อทางเข้าเต็นท์ CY3</span>
                          </div>
                        </div>
                      )}

                    </React.Fragment>
                  );
                })}

              </div>

              {/* Bottom Status Legend inside Red Container (Upgraded with Miniature 4-Tier Rack Icons) */}
              <div className="mt-3 pt-2.5 border-t border-red-500/30 flex items-center justify-between flex-wrap gap-3 text-[10px] sm:text-[11px] text-slate-300">
                <div className="flex items-center gap-4 flex-wrap">
                  {/* Empty 4-Tier */}
                  <div className="flex items-center gap-1.5">
                    <MiniatureRackIcon size="sm" levelsOccupied={0} />
                    <span>ว่างทั้ง 4 ชั้น (Empty 4/4)</span>
                  </div>

                  {/* Partial 2/4 */}
                  <div className="flex items-center gap-1.5">
                    <MiniatureRackIcon size="sm" levelsOccupied={2} />
                    <span>เก็บบางชั้น (1-3 ชั้น)</span>
                  </div>

                  {/* Full 4/4 */}
                  <div className="flex items-center gap-1.5">
                    <MiniatureRackIcon size="sm" levelsOccupied={4} />
                    <span>เต็มทุกชั้น (Full 4/4)</span>
                  </div>

                  {/* Aging Alert */}
                  <div className="flex items-center gap-1.5">
                    <MiniatureRackIcon size="sm" levelStates={['OCCUPIED', 'AGING', 'OVERDUE', 'EMPTY']} />
                    <span className="text-amber-300 font-bold">เตือนค้างนาน FIFO (&gt;14 วัน)</span>
                  </div>
                </div>

                <div className="font-mono text-slate-400">
                  DY3T-1.01 ถึง 1.04 &bull; รวม 400 ช่องจัดวางพาเลท (Pallet Slots)
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW 2: 2.5D ISOMETRIC VIEW (When selected)                                */}
          {/* ========================================================================= */}
          {viewMode === 'ISOMETRIC_25D' && (
            <CY3IsometricView
              items={cy3Items}
              searchQuery={activeSearch}
              floorFilter={floorFilter}
              filterStatus={filterStatus}
              onSlotClick={handleSlotClick}
              onSlotHover={handleSlotMouseEnter}
              onSlotLeave={handleSlotMouseLeave}
              onOpenScanner={onOpenScanner}
            />
          )}

          {/* ========================================================================= */}
          {/* VIEW 3: FRONT ELEVATION VIEW (When selected)                              */}
          {/* ========================================================================= */}
          {viewMode === 'FRONT_ELEVATION' && (
            <CY3FrontElevationView
              items={cy3Items}
              searchQuery={activeSearch}
              floorFilter={floorFilter}
              filterStatus={filterStatus}
              onSlotClick={handleSlotClick}
              onSlotHover={handleSlotMouseEnter}
              onSlotLeave={handleSlotMouseLeave}
              onOpenScanner={onOpenScanner}
            />
          )}

          {/* ========================================================================= */}
          {/* 4. SUMMARY STATISTICS CARDS                                               */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <Box className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-bold">ความจุทั้งหมด CY3</div>
                <div className="text-lg font-black text-white font-mono">400 พาเลท</div>
                <div className="text-[10px] text-slate-500">4 แถว x 25 ช่อง x 4 ชั้น</div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-bold">จัดเก็บปัจจุบัน</div>
                <div className="text-lg font-black text-emerald-400 font-mono">
                  {metrics.totalOccupied} พาเลท
                </div>
                <div className="text-[10px] text-emerald-500 font-bold">
                  อัตราใช้พื้นที่ {metrics.utilizationRate}%
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-bold">สินค้าใกล้กำหนด (FIFO)</div>
                <div className="text-lg font-black text-amber-400 font-mono">
                  {metrics.agingCount} รายการ
                </div>
                <div className="text-[10px] text-slate-400">ค้างระหว่าง 15-30 วัน</div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-bold">สินค้าค้างนานผิดปกติ</div>
                <div className="text-lg font-black text-rose-400 font-mono">
                  {metrics.overdueCount} รายการ
                </div>
                <div className="text-[10px] text-rose-400 font-bold">เกินกำหนด (&gt;30 วัน)</div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 5. MODALS & HOVER OVERLAYS                                                */}
      {/* ========================================================================= */}
      
      {/* Hover Mini Stats Overlay */}
      <SlotMiniStatsOverlay data={hoveredSlot} />

      {/* Unified Slot Modal for 4-Floor Inspection & Movement */}
      <UnifiedSlotModal
        isOpen={isSlotModalOpen}
        onClose={() => setIsSlotModalOpen(false)}
        slotData={selectedSlotModal}
        onOpenScanner={onOpenScanner}
        onRelocateItem={onRelocateItem}
        onPrintLabel={onPrintLabel}
      />

    </div>
  );
};
