import React, { useState, useMemo } from 'react';
import { InventoryItem, MovementType, ShelfLevel, StorageZone, MovementLog } from '../types';
import { UnifiedSlotModal, UnifiedSlotData } from './UnifiedSlotModal';
import { SlotMiniStatsOverlay, MiniStatsSlotData } from './SlotMiniStatsOverlay';
import { CY3FrontElevationView } from './CY3FrontElevationView';
import { MiniatureRackIcon } from './MiniatureRackIcon';
import { WarehouseSlotFilter } from './common/WarehouseSlotFilter';
import { CY3OutdoorRack3DView } from './zone-3d/CY3OutdoorRack3DView';
import { ZoneKpiFormalDashboard } from './ZoneKpiFormalDashboard';
import { useTranslation } from '../i18n/i18nContext';
import { 
  Building2, 
  Search, 
  QrCode, 
  Layers, 
  ChevronRight, 
  AlertTriangle, 
  CheckCircle2, 
  Box, 
  Grid, 
  Clock,
  X,
  Truck,
  LayoutGrid,
  Info,
  ArrowLeft
} from 'lucide-react';

interface CY3TentRackMapProps {
  items: InventoryItem[];
  logs?: MovementLog[];
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
  logs,
  searchQuery = '',
  onOpenScanner,
  onRelocateItem,
  onNavigateToCampus,
  onPrintLabel
}) => {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<'3D_RACK' | 'FRONT' | 'TOP'>('3D_RACK');
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
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden select-none font-sans">
      
      {/* ========================================================================= */}
      {/* UNIFIED ENTERPRISE TOOLBAR: STANDARD ORDER ACROSS ALL ZONES                */}
      {/* ========================================================================= */}
      <header className="h-11 sm:h-12 border-b border-slate-800 bg-slate-900/95 px-3 sm:px-4 flex items-center justify-between gap-3 shrink-0 backdrop-blur-md z-30 text-slate-100">
        
        {/* ด้านซ้าย: ปุ่มย้อนกลับผังรวมและชื่อโซน */}
        <div className="flex items-center gap-2 min-w-0">
          {onNavigateToCampus && (
            <button
              onClick={onNavigateToCampus}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold border border-slate-700/80 transition-all shadow-sm shrink-0 active:scale-95"
              title="กลับสู่ผังรวมแคมปัส"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">โซน CY3 แร็คกลางแจ้ง (DY3T)</span>
              <span className="sm:hidden">CY3 แร็ค</span>
              <span className="px-1.5 py-0.2 rounded-full bg-rose-600/30 text-rose-300 font-mono text-[10px] border border-rose-500/30">
                400P
              </span>
            </button>
          )}
        </div>

        {/* ตรงกลาง: View Switcher + Status Filter + Floor Level Selector (ลำดับมาตรฐานเดียวกัน) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {/* 1. View Switcher: [3D ผัง 3 มิติ] vs [แปลนบน (Top 2D)] vs [หน้าตรง (L1-L4)] */}
          <div className="inline-flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800 text-xs font-bold shrink-0">
            <button
              onClick={() => setViewMode('3D_RACK')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap ${
                viewMode === '3D_RACK'
                  ? 'bg-rose-600 text-white shadow-md ring-1 ring-rose-400/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
              title="3D Digital Twin แร็ค 4 ชั้นกลางแจ้ง (400P)"
            >
              <Box className="w-3.5 h-3.5 text-rose-200" />
              <span>3D ผัง 3 มิติ</span>
            </button>
            <button
              onClick={() => setViewMode('TOP')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap ${
                viewMode === 'TOP'
                  ? 'bg-rose-600 text-white shadow-md ring-1 ring-rose-400/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
              title="มุมมองแปลนบน (Top 2D Matrix)"
            >
              <Grid className="w-3.5 h-3.5 text-rose-200" />
              <span>แปลนบน (Top 2D)</span>
            </button>
            <button
              onClick={() => setViewMode('FRONT')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap ${
                viewMode === 'FRONT'
                  ? 'bg-rose-600 text-white shadow-md ring-1 ring-rose-400/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
              title="มุมมองหน้าตรง แร็ค 4 ชั้น (L1-L4)"
            >
              <Layers className="w-3.5 h-3.5 text-rose-200" />
              <span>หน้าตรง (L1-L4)</span>
            </button>
          </div>

          {/* 2. Global Status Filter Pills */}
          <WarehouseSlotFilter
            activeFilter={filterStatus}
            onFilterChange={setFilterStatus}
            counts={{
              total: metrics.totalCapacity,
              occupied: slotMap.size,
              empty: metrics.totalCapacity - slotMap.size,
              aging: metrics.agingCount,
            }}
            compact
          />

          {/* 3. Sub-Zone Selector: ชั้น L1 - L4 */}
          <div className="inline-flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800 text-xs font-bold shrink-0">
            {(['ALL', 1, 2, 3, 4] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setFloorFilter(lvl)}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                  floorFilter === lvl
                    ? 'bg-rose-600 text-white font-black shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
                title={lvl === 'ALL' ? 'แสดงทุกชั้น L1-L4' : `กรองเฉพาะชั้น L${lvl}`}
              >
                {lvl === 'ALL' ? 'ทุกชั้น' : `L${lvl}`}
              </button>
            ))}
          </div>
        </div>

        {/* ด้านขวา: กลุ่มค้นหา, สแกน KANBAN (ลำดับมาตรฐานเดียวกันทุกโซน) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* ช่องค้นหาด่วน */}
          <div className="relative w-36 sm:w-48 h-8">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="ค้นหา Model, Locator..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full h-8 bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-6 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
            />
            {localSearch && (
              <button
                onClick={() => setLocalSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                title="ล้างคำค้นหา"
              >
                ×
              </button>
            )}
          </div>

          {/* ปุ่มสแกน KANBAN */}
          <button
            onClick={() => onOpenScanner('CY3-A', 1, 1, 'IN')}
            className="h-8 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
            title="เปิดกล้องสแกน KANBAN QR Code (รับเข้า/เบิกออก)"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">สแกน KANBAN</span>
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN WAREHOUSE BLUEPRINT VIEWPORT (FULL SIZE MATCHING OTHER ZONES)      */}
      {/* ========================================================================= */}
      <div className="flex-1 min-h-0 flex flex-col gap-1.5 overflow-hidden p-1 sm:p-1.5">
        
        {/* TOP: 3D Twin or 2D Front / Top Plan */}
        <div className="flex-1 min-h-0 overflow-hidden bg-slate-950 rounded-xl border border-slate-800 flex flex-col">
          {/* VIEW 1: 3D OUTDOOR 4-TIER RACK DIGITAL TWIN (DY3T 1.01-1.04: 400 PALLETS) */}
          {viewMode === '3D_RACK' && (
            <div className="w-full h-full min-h-0 flex flex-col overflow-hidden bg-slate-950">
              <CY3OutdoorRack3DView
                items={items}
                searchQuery={activeSearch}
                onSelectSlot={(row, bay, locator, level, item) => {
                  const locatorSign = row === 'A' ? 'DY3T-1.01' : row === 'B' ? 'DY3T-1.02' : row === 'C' ? 'DY3T-1.03' : 'DY3T-1.04';
                  handleSlotClick(row as any, bay, locator || locatorSign, level as any);
                }}
                onOpenScanner={onOpenScanner}
              />
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW 1: FRONT ELEVATION VIEW (DEFAULT)                                     */}
          {/* ========================================================================= */}
          {viewMode === 'FRONT' && (
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
          {/* VIEW 2: TOP VIEW WITH TRUE STACKED SEGMENTED BLOCKS */}
          {viewMode === 'TOP' && (
            <div className="w-full h-full min-h-0 overflow-auto p-2 sm:p-3 bg-slate-900/90">
              <div className="relative border-2 border-red-600 rounded-xl bg-slate-900/95 shadow-2xl p-3 sm:p-4 min-w-[860px]">
              
              {/* Dashed line accent along top as depicted in the reference diagram */}
              <div className="absolute top-2 left-4 right-4 border-t-2 border-dashed border-red-500/80 pointer-events-none" />

              <div className="space-y-2.5 pt-2">
                
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
                                      : 'bg-[#0B1017] text-[#667085] border-b border-[#273244]'
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
                                              ? 'bg-[#D9043E] border-[#FF1744] text-white animate-pulse'
                                              : isLvlAging
                                              ? 'bg-[#FFF4CC] border-[#F59E0B] text-[#7C4A03]'
                                              : 'bg-[#EAF4FF] border-[#60A5FA] text-[#0F172A]'
                                            : 'bg-[#0B1017] hover:bg-[#111823] border-[#273244] text-[#667085]'
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
          </div>
          )}

        </div>

        {/* BOTTOM: Ultra-compact KPI Cards (ความจุ, รับเข้า-รับออก, Aging) */}
        <div className="shrink-0">
          <ZoneKpiFormalDashboard
            zoneKey="CY3"
            items={items}
            logs={logs}
          />
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
