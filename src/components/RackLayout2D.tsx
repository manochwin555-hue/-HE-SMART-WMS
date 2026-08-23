import React, { useState, useEffect, useMemo } from 'react';
import { InventoryItem, MovementType, ShelfLevel, StorageZone } from '../types';
import { 
  Layers, 
  Eye, 
  Filter, 
  Info, 
  ChevronRight, 
  Package, 
  AlertTriangle, 
  Box, 
  Search, 
  X,
  Flame,
  Activity,
  BarChart3,
  Percent,
  CheckCircle2,
  AlertOctagon,
  Maximize2,
  Minimize2,
  Grid,
  Sparkles,
  Clock,
  ArrowUpRight,
  Building2,
  MapPin,
  Compass,
  TrendingUp,
  LayoutGrid
} from 'lucide-react';
import { Warehouse3DMap } from './Warehouse3DMap';
import { DA4D1FloorStagingMap } from './DA4D1FloorStagingMap';
import { DynamicLegendPanel } from './DynamicLegendPanel';
import { UnifiedSlotModal, UnifiedSlotData } from './UnifiedSlotModal';
import { SlotMiniStatsOverlay, MiniStatsSlotData } from './SlotMiniStatsOverlay';

interface RackLayout2DProps {
  items: InventoryItem[];
  searchQuery?: string;
  initialSectionTab?: 'MACRO_OVERVIEW' | 'FLOOR_DA4D1' | 'RACK_ZONES' | 'FULL3D';
  onSelectBay: (zone: StorageZone, bayNumber: number) => void;
  onOpen3D: (zone: StorageZone, bayNumber: number) => void;
  onOpenScanner?: (zone: StorageZone, bay: number, level: ShelfLevel, mode: MovementType) => void;
  onRelocateItem?: (item: InventoryItem) => void;
  onNavigateToCampus?: () => void;
  isDashboardFullscreen?: boolean;
}

interface HoveredBayData {
  zone: StorageZone;
  bayNumber: number;
  x: number;
  y: number;
}

export const RackLayout2D: React.FC<RackLayout2DProps> = ({
  items,
  searchQuery = '',
  initialSectionTab = 'MACRO_OVERVIEW',
  onSelectBay,
  onOpen3D,
  onOpenScanner,
  onRelocateItem,
  onNavigateToCampus,
  isDashboardFullscreen
}) => {
  // A4 Building Main Section Switcher: Macro Plan, Floor Staging (DA4D-1), Rack Zones (DA4D-2 & DA4D-3), or Full 3D
  const [a4SectionTab, setA4SectionTab] = useState<'MACRO_OVERVIEW' | 'FLOOR_DA4D1' | 'RACK_ZONES' | 'FULL3D'>(initialSectionTab);
  
  useEffect(() => {
    if (initialSectionTab) {
      setA4SectionTab(initialSectionTab);
    }
  }, [initialSectionTab]);

  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<'ALL' | 'OCCUPIED' | 'AGING'>('ALL');
  const [viewMode, setViewMode] = useState<'STANDARD' | 'HEATMAP'>('STANDARD');
  const [layoutMode, setLayoutMode] = useState<'FIT_OVERVIEW' | 'DETAILED'>('FIT_OVERVIEW');
  const [dimMode, setDimMode] = useState<'DIM' | 'HIDE'>('DIM');
  const [localSearch, setLocalSearch] = useState<string>(searchQuery);
  const [hoveredBay, setHoveredBay] = useState<HoveredBayData | null>(null);
  const [selectedSlotForModal, setSelectedSlotForModal] = useState<UnifiedSlotData | null>(null);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  const activeQuery = localSearch.trim();

  // Zones definition based on layout
  const purpleZones: StorageZone[] = ['B', 'C', 'D', 'E', 'F']; // 12 bays each (DA4D-2: 480 Pallets)
  const orangeZones: StorageZone[] = ['G', 'H', 'I', 'J', 'K']; // 5 bays each (DA4D-3: 200 Pallets)
  const allRackZonesList: StorageZone[] = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];

  // Helper to get items in a specific bay
  const getBayInfo = (zone: StorageZone, bayNum: number) => {
    const bayItems = items.filter((it) => it.zone === zone && it.bayNumber === bayNum);
    const occupiedLevelsCount = bayItems.length; // Max 4 levels per bay
    const totalQty = bayItems.reduce((acc, curr) => acc + curr.quantity, 0);
    const hasAgingAlert = bayItems.some((it) => it.agingDays > 30);
    const mainModel = bayItems.length > 0 ? bayItems[0].modelHE : null;
    
    let matchesSearch = true;
    let matchedItemCode = '';
    let matchedQty = 0;
    let matchedCount = 0;

    if (activeQuery !== '') {
      const q = activeQuery.toLowerCase();
      const matchingItems = bayItems.filter(it => 
        it.modelHE.toLowerCase().includes(q) || 
        it.partName.toLowerCase().includes(q) ||
        it.locatorCode.toLowerCase().includes(q) ||
        it.qrCode.toLowerCase().includes(q)
      );
      matchesSearch = matchingItems.length > 0;
      if (matchesSearch) {
        matchedItemCode = matchingItems[0].modelHE;
        matchedQty = matchingItems.reduce((acc, curr) => acc + curr.quantity, 0);
        matchedCount = matchingItems.length;
      }
    }

    return {
      bayItems,
      occupiedLevelsCount,
      totalQty,
      hasAgingAlert,
      mainModel,
      matchesSearch,
      matchedItemCode,
      matchedQty,
      matchedCount,
    };
  };

  // Mouse hover event handler for floating tooltip
  const handleBayMouseMove = (e: React.MouseEvent, zone: StorageZone, bayNum: number) => {
    setHoveredBay({
      zone,
      bayNumber: bayNum,
      x: e.clientX,
      y: e.clientY
    });
  };

  const handleBayMouseLeave = () => {
    setHoveredBay(null);
  };

  // Zone Capacity & Congestion Heatmap Calculation for Zones B to K (Racks)
  const zoneCapacityStats = useMemo(() => {
    return allRackZonesList.map((z) => {
      const isPurple = purpleZones.includes(z);
      const maxBays = isPurple ? 12 : 5;
      const maxCapacity = maxBays * 4; // 4 shelf levels per bay
      const zoneItems = items.filter((it) => it.zone === z);
      const occupiedLocations = new Set(zoneItems.map((it) => `${it.bayNumber}-${it.level}`)).size;
      const totalQty = zoneItems.reduce((acc, it) => acc + it.quantity, 0);
      const percent = maxCapacity > 0 ? Math.round((occupiedLocations / maxCapacity) * 100) : 0;

      let congestion: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' = 'LOW';
      let barBgClass = 'bg-emerald-500';
      let badgeBorder = 'border-emerald-300 bg-emerald-50 text-emerald-800';
      let congestionText = 'พื้นที่ว่างปกติ';

      if (percent >= 90) {
        congestion = 'CRITICAL';
        barBgClass = 'bg-red-500';
        badgeBorder = 'border-red-400 bg-red-50 text-red-700 ring-1 ring-red-300';
        congestionText = '🔥 แน่นมาก (≥90%)';
      } else if (percent >= 75) {
        congestion = 'HIGH';
        barBgClass = 'bg-amber-500';
        badgeBorder = 'border-amber-300 bg-amber-50 text-amber-800 ring-1 ring-amber-300';
        congestionText = '⚠️ หนาแน่น (75-89%)';
      } else if (percent >= 50) {
        congestion = 'MODERATE';
        barBgClass = 'bg-blue-500';
        badgeBorder = 'border-blue-300 bg-blue-50 text-blue-800';
        congestionText = 'ปานกลาง (50-74%)';
      } else {
        congestion = 'LOW';
        barBgClass = 'bg-emerald-500';
        badgeBorder = 'border-emerald-300 bg-emerald-50 text-emerald-800';
        congestionText = 'ว่างพร้อมใช้งาน';
      }

      return {
        zone: z,
        isPurple,
        maxBays,
        maxCapacity,
        occupiedLocations,
        totalQty,
        percent,
        congestion,
        barBgClass,
        badgeBorder,
        congestionText,
      };
    });
  }, [items]);

  // Helper to open unified slot modal for a rack bay
  const handleOpenSlotModal = (zone: StorageZone, bayNum: number) => {
    const bayItems = items.filter(it => it.zone === zone && it.bayNumber === bayNum);
    const isPurple = purpleZones.includes(zone);
    const subArea = isPurple ? 'DA4D-2 (Zone B-F)' : 'DA4D-3 (Zone G-K)';
    const primaryItem = bayItems[0] || null;
    const locator = primaryItem ? primaryItem.locatorCode : `DA4D-${isPurple ? '2' : '3'}.01-${zone}${String(bayNum).padStart(2, '0')}-L1`;

    setSelectedSlotForModal({
      sectorType: 'RACK',
      buildingName: 'อาคาร A4',
      facilityId: 'FAC-A4-MAIN',
      zoneName: `Rack โซน ${zone} (${subArea})`,
      locatorCode: locator,
      bayOrGroupNumber: bayNum,
      level: primaryItem ? primaryItem.level : 1,
      maxCapacityPallets: 4,
      item: primaryItem,
      bayItems: bayItems
    });
  };

  // Overall A4 Building Capacities
  const a4CapacitySummary = useMemo(() => {
    // 1. DA4D-1 Floor Staging (X1-X8) = 432 Pallets
    const floorItems = items.filter(it => 
      ['X1','X2','X3','X4','X5','X6','X7','X8'].includes(it.zone) ||
      it.locatorCode.startsWith('DA4D-1-') ||
      it.locatorCode.startsWith('DA4D-1.01-')
    );
    const floorOccupied = floorItems.length;
    const floorCapacity = 432;

    // 2. DA4D-2 Rack (B-F) = 60 bays x 4 levels x 2 pallets = 480 Pallets
    const da4d2Items = items.filter(it => purpleZones.includes(it.zone));
    const da4d2Occupied = da4d2Items.length;
    const da4d2Capacity = 480;

    // 3. DA4D-3 Rack (G-K) = 25 bays x 4 levels x 2 pallets = 200 Pallets
    const da4d3Items = items.filter(it => orangeZones.includes(it.zone));
    const da4d3Occupied = da4d3Items.length;
    const da4d3Capacity = 200;

    const totalRackCapacity = da4d2Capacity + da4d3Capacity; // 680
    const totalRackOccupied = da4d2Occupied + da4d3Occupied;

    const totalA4Capacity = floorCapacity + totalRackCapacity; // 1,112
    const totalA4Occupied = floorOccupied + totalRackOccupied;

    return {
      totalA4Capacity,
      totalA4Occupied,
      totalA4Percent: Math.round((totalA4Occupied / totalA4Capacity) * 100),
      floorCapacity,
      floorOccupied,
      floorPercent: Math.round((floorOccupied / floorCapacity) * 100),
      da4d2Capacity,
      da4d2Occupied,
      da4d2Percent: Math.round((da4d2Occupied / da4d2Capacity) * 100),
      da4d3Capacity,
      da4d3Occupied,
      da4d3Percent: Math.round((da4d3Occupied / da4d3Capacity) * 100),
      totalRackCapacity,
      totalRackOccupied,
      totalRackPercent: Math.round((totalRackOccupied / totalRackCapacity) * 100)
    };
  }, [items]);

  // Heatmap intensity styling based on quantity
  const getDensityHeatmapBg = (totalQty: number) => {
    if (totalQty === 0) return 'bg-slate-100 border-slate-200 text-slate-400';
    if (totalQty <= 150) return 'bg-emerald-100 border-emerald-300 text-emerald-900 font-semibold';
    if (totalQty <= 350) return 'bg-yellow-100 border-yellow-300 text-yellow-900 font-bold';
    if (totalQty <= 600) return 'bg-amber-200 border-amber-400 text-amber-950 font-extrabold';
    if (totalQty <= 900) return 'bg-orange-300 border-orange-500 text-orange-950 font-black';
    return 'bg-red-400 border-red-600 text-white font-black ring-2 ring-red-400/50 shadow-md animate-pulse';
  };

  // Heatmap Filter styling for searched P/No
  const getPNoHeatmapBg = (matchedQty: number) => {
    if (matchedQty > 300) {
      return 'bg-gradient-to-br from-rose-500 via-red-600 to-amber-500 text-white border-rose-300 ring-2 ring-rose-500/80 shadow-lg animate-pulse z-10';
    }
    if (matchedQty > 100) {
      return 'bg-gradient-to-br from-amber-400 via-orange-500 to-yellow-500 text-slate-950 border-amber-300 ring-2 ring-amber-400 shadow-md z-10 font-black';
    }
    return 'bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-600 text-white border-emerald-300 ring-2 ring-emerald-400/80 shadow-md z-10';
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-5 shadow-xs text-slate-900 space-y-4 sm:space-y-5 min-w-0 max-w-full w-full">
      
      {/* 1. TOP HEADER & MULTI-ZONE CAPACITY BREAKDOWN CARDS */}
      <div className="space-y-4 border-b border-slate-200 pb-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 flex-wrap">
              {onNavigateToCampus && (
                <button
                  onClick={onNavigateToCampus}
                  className="px-2.5 py-0.5 rounded-full text-xs font-black bg-slate-800 hover:bg-slate-700 text-white flex items-center space-x-1 shadow-sm transition-all"
                >
                  <span>🏢 ◂ ผังรวมแคมปัส A2/A4</span>
                </button>
              )}
              <span className="w-3 h-3 rounded-full bg-blue-600 animate-pulse" />
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900">
                ผังคลังสินค้า A4 Building (อาคารคลังหลัก & โครงสร้าง Rack + ลานวางพื้น)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-900 border border-blue-200">
                ความจุรวม 1,112 พาเลท
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              โครงสร้าง Selective Rack DA4D-2 (480P), DA4D-3 (200P) รวม 680 พาเลท และโซนลานวางพื้นสีเหลือง DA4D-1 (X1-X8 รวม 432 พาเลท)
            </p>
          </div>

          {/* Area Capacity Breakdown Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs w-full lg:w-auto">
            {/* Total A4 Building */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-2.5 rounded-xl text-center shadow-xs">
              <span className="text-[10px] text-slate-300 block font-bold">อาคาร A4 รวมทั้งหมด</span>
              <span className="text-sm sm:text-base font-black font-mono">{a4CapacitySummary.totalA4Capacity}</span>
              <span className="text-[10px] text-slate-300 block font-medium mt-0.5">
                จัดเก็บ {a4CapacitySummary.totalA4Occupied} ({a4CapacitySummary.totalA4Percent}%)
              </span>
            </div>

            {/* DA4D-1 Floor Staging */}
            <div 
              onClick={() => setA4SectionTab('FLOOR_DA4D1')}
              className={`p-2.5 rounded-xl text-center border-2 transition-all cursor-pointer shadow-xs ${
                a4SectionTab === 'FLOOR_DA4D1'
                  ? 'bg-amber-500 text-slate-950 border-amber-600 ring-2 ring-amber-400'
                  : 'bg-amber-50 text-slate-900 border-amber-300 hover:bg-amber-100'
              }`}
              title="คลิกเพื่อเปิดผังโซนวางพื้น DA4D-1"
            >
              <span className="text-[10px] font-bold block">🟨 วางพื้น DA4D-1 (X1-X8)</span>
              <span className="text-sm sm:text-base font-black font-mono">{a4CapacitySummary.floorCapacity} P</span>
              <span className="text-[10px] block font-medium mt-0.5">
                จัดเก็บ {a4CapacitySummary.floorOccupied} ({a4CapacitySummary.floorPercent}%)
              </span>
            </div>

            {/* DA4D-2 Selective Rack */}
            <div 
              onClick={() => setA4SectionTab('RACK_ZONES')}
              className={`p-2.5 rounded-xl text-center border-2 transition-all cursor-pointer shadow-xs ${
                a4SectionTab === 'RACK_ZONES'
                  ? 'bg-blue-600 text-white border-blue-700 ring-2 ring-blue-400'
                  : 'bg-blue-50 text-slate-900 border-blue-200 hover:bg-blue-100'
              }`}
              title="คลิกเพื่อเปิดผังแร็ค Zone B-F"
            >
              <span className="text-[10px] font-bold block">🏗️ Rack DA4D-2 (B-F)</span>
              <span className="text-sm sm:text-base font-black font-mono">{a4CapacitySummary.da4d2Capacity} P</span>
              <span className="text-[10px] block font-medium mt-0.5">
                จัดเก็บ {a4CapacitySummary.da4d2Occupied} ({a4CapacitySummary.da4d2Percent}%)
              </span>
            </div>

            {/* DA4D-3 Selective Rack */}
            <div 
              onClick={() => setA4SectionTab('RACK_ZONES')}
              className={`p-2.5 rounded-xl text-center border-2 transition-all cursor-pointer shadow-xs ${
                a4SectionTab === 'RACK_ZONES'
                  ? 'bg-indigo-600 text-white border-indigo-700 ring-2 ring-indigo-400'
                  : 'bg-indigo-50 text-slate-900 border-indigo-200 hover:bg-indigo-100'
              }`}
              title="คลิกเพื่อเปิดผังแร็ค Zone G-K"
            >
              <span className="text-[10px] font-bold block">🏗️ Rack DA4D-3 (G-K)</span>
              <span className="text-sm sm:text-base font-black font-mono">{a4CapacitySummary.da4d3Capacity} P</span>
              <span className="text-[10px] block font-medium mt-0.5">
                จัดเก็บ {a4CapacitySummary.da4d3Occupied} ({a4CapacitySummary.da4d3Percent}%)
              </span>
            </div>
          </div>
        </div>

        {/* 2. PRIMARY VIEW SWITCHER TABS */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <div className="flex flex-wrap items-center gap-1 font-bold">
            <button
              onClick={() => setA4SectionTab('MACRO_OVERVIEW')}
              className={`px-3 py-2 rounded-lg transition-all flex items-center space-x-1.5 ${
                a4SectionTab === 'MACRO_OVERVIEW'
                  ? 'bg-blue-600 text-white shadow-xs font-black'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>🏢 ผังรวมอาคาร A4 (Macro Floor & Rack Layout)</span>
            </button>
            <button
              onClick={() => setA4SectionTab('FLOOR_DA4D1')}
              className={`px-3 py-2 rounded-lg transition-all flex items-center space-x-1.5 ${
                a4SectionTab === 'FLOOR_DA4D1'
                  ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>🟨 โซนวางพื้น DA4D-1 (X1-X8: 432 พาเลท)</span>
            </button>
            <button
              onClick={() => setA4SectionTab('RACK_ZONES')}
              className={`px-3 py-2 rounded-lg transition-all flex items-center space-x-1.5 ${
                a4SectionTab === 'RACK_ZONES'
                  ? 'bg-blue-600 text-white shadow-xs font-black'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>🏗️ โซนแร็ค DA4D-2 & DA4D-3 (Zone B-K: 680 พาเลท)</span>
            </button>
            <button
              onClick={() => setA4SectionTab('FULL3D')}
              className={`px-3 py-2 rounded-lg transition-all flex items-center space-x-1.5 ${
                a4SectionTab === 'FULL3D'
                  ? 'bg-blue-600 text-white shadow-xs font-black'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>🌐 3D Virtual Warehouse (โมเดล 3 มิติ)</span>
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="ค้นหา P/No, Model, Locator..."
              className="w-full bg-white border border-slate-300 focus:border-blue-500 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none shadow-2xs"
            />
            {localSearch && (
              <button
                onClick={() => setLocalSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* DYNAMIC LEGEND & LOCATOR GUIDE PANEL */}
      <DynamicLegendPanel />

      {/* ========================================================================= */}
      {/* 🏢 TAB 1: MACRO OVERVIEW (ผังรวมอาคาร A4 - สถาปัตยกรรม & แผนที่พื้นที่รวม) */}
      {/* ========================================================================= */}
      {a4SectionTab === 'MACRO_OVERVIEW' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Architectural Layout Map Canvas */}
          <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl p-5 sm:p-6 text-white shadow-lg space-y-6 relative overflow-hidden">
            
            {/* Background Blueprint Grid Line Pattern */}
            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]" />

            {/* Macro Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10 border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center space-x-2">
                  <Compass className="w-4 h-4 text-blue-400" />
                  <h3 className="text-base font-black text-white">
                    A4 BUILDING ARCHITECTURAL LAYOUT & STORAGE MAPPING
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  ผังรวมอาคาร A4 แสดงความสัมพันธ์ระหว่าง Selective Racks (DA4D-2, DA4D-3), ลานวางพื้น (DA4D-1), และเส้นทางลำเลียง Forklift / AGV
                </p>
              </div>

              {/* Sample Locator Legend */}
              <div className="flex items-center space-x-2 text-[11px] font-mono">
                <span className="px-2 py-1 rounded bg-rose-950 border border-rose-500 text-rose-300 font-bold flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span>ตัวอย่าง DA4D-2-D2-L1 & DA4D-1-R8-06</span>
                </span>
              </div>
            </div>

            {/* A4 Macro Schematic Container */}
            <div className="relative z-10 border-2 border-slate-700 bg-slate-950/80 rounded-xl p-4 sm:p-6 space-y-6 min-h-[480px]">
              
              {/* Outer Walls & Door Markers */}
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 px-4">
                <span className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 text-emerald-400">
                  🚪 Door 1 (Raw Material Gate)
                </span>
                <span className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 text-blue-400">
                  🚛 Receiving & Dock Area A4
                </span>
                <span className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 text-emerald-400">
                  🚪 Door 2 (Assembly Transfer Gate)
                </span>
              </div>

              {/* Top Row: RACK ZONES (DA4D-2 on left, DA4D-3 on right) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                
                {/* DA4D-2 Selective Rack Block (Zone B, C, D, E, F: 12 Bays each) */}
                <div 
                  onClick={() => setA4SectionTab('RACK_ZONES')}
                  className="md:col-span-8 bg-blue-950/40 border-2 border-blue-500/60 hover:border-blue-400 rounded-xl p-4 cursor-pointer transition-all hover:bg-blue-950/60 group shadow-md"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 bg-blue-600 text-white rounded text-xs font-black">
                        DA4D-2
                      </span>
                      <span className="text-xs font-bold text-blue-200">
                        Selective Rack Zone B, C, D, E, F
                      </span>
                    </div>
                    <span className="text-xs font-mono font-black text-blue-400 group-hover:text-blue-300 flex items-center space-x-1">
                      <span>480 Pallets (12 Bays x 4 Levels)</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </div>

                  {/* Visual Rack Preview Bars */}
                  <div className="grid grid-cols-5 gap-1.5 mt-3 text-center text-[10px] font-mono">
                    {['Rack B (Single)', 'Rack C (Back)', 'Rack D (Back)', 'Rack E (Back)', 'Rack F (Single)'].map((rName, idx) => {
                      const z = ['B', 'C', 'D', 'E', 'F'][idx];
                      const isD2Sample = z === 'D';
                      return (
                        <div 
                          key={rName} 
                          className={`p-2 rounded-lg border transition-all ${
                            isD2Sample 
                              ? 'bg-rose-950/80 border-rose-500 text-white ring-1 ring-rose-500' 
                              : 'bg-blue-900/40 border-blue-700/60 text-blue-200'
                          }`}
                        >
                          <div className="font-bold text-xs">{rName.split(' ')[0]} {rName.split(' ')[1]}</div>
                          <div className="text-[9px] text-slate-400">12 Bays • L1-L4</div>
                          {isD2Sample && (
                            <div className="mt-1 text-[8px] bg-rose-600 text-white font-bold px-1 py-0.5 rounded animate-pulse">
                              Sample D2-L1
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-2 text-right">
                    <span className="text-[10px] text-blue-300/80 italic font-sans">
                      คลิกเพื่อเปิดดูรายละเอียดและชั้นวางแร็ค DA4D-2 →
                    </span>
                  </div>
                </div>

                {/* DA4D-3 Selective Rack Block (Zone G, H, I, J, K: 5 Bays each) */}
                <div 
                  onClick={() => setA4SectionTab('RACK_ZONES')}
                  className="md:col-span-4 bg-indigo-950/40 border-2 border-indigo-500/60 hover:border-indigo-400 rounded-xl p-4 cursor-pointer transition-all hover:bg-indigo-950/60 group shadow-md"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 bg-indigo-600 text-white rounded text-xs font-black">
                        DA4D-3
                      </span>
                      <span className="text-xs font-bold text-indigo-200">
                        Rack G, H, I, J, K
                      </span>
                    </div>
                    <span className="text-xs font-mono font-black text-indigo-400 group-hover:text-indigo-300 flex items-center space-x-1">
                      <span>200 Pallets</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </div>

                  {/* Visual Rack Preview Bars */}
                  <div className="grid grid-cols-5 gap-1 mt-3 text-center text-[10px] font-mono">
                    {['G', 'H', 'I', 'J', 'K'].map((z) => (
                      <div key={z} className="p-2 rounded-lg bg-indigo-900/40 border border-indigo-700/60 text-indigo-200">
                        <div className="font-bold text-xs">Rack {z}</div>
                        <div className="text-[9px] text-slate-400">5 Bays</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-right">
                    <span className="text-[10px] text-indigo-300/80 italic font-sans">
                      คลิกเพื่อเปิดดูแร็ค DA4D-3 →
                    </span>
                  </div>
                </div>
              </div>

              {/* Middle Aisle: FORKLIFT & AGV MAIN AISLE */}
              <div className="border-y-2 border-dashed border-amber-500/40 py-2 px-4 flex items-center justify-between text-xs font-mono text-amber-400/90 bg-amber-950/20 rounded-lg">
                <span className="flex items-center space-x-2">
                  <span>🚜 MAIN FORKLIFT AISLE (ทางวิ่งรถยก & รถโฟล์คลิฟท์)</span>
                </span>
                <span className="text-[10px] text-amber-300/70">
                  ◀ AGV & Pallet Truck Transfer Pathway ▶
                </span>
              </div>

              {/* Bottom Row: FLOOR STAGING DA4D-1 (Yellow Zone) & OFFICE */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                
                {/* DA4D-1 FLOOR STAGING ZONE (X1 to X8: 432 Pallets) */}
                <div 
                  onClick={() => setA4SectionTab('FLOOR_DA4D1')}
                  className="md:col-span-9 bg-amber-950/30 border-2 border-amber-400 hover:border-amber-300 rounded-xl p-4 cursor-pointer transition-all hover:bg-amber-950/50 group shadow-md"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 bg-amber-500 text-slate-950 rounded text-xs font-black">
                        DA4D-1
                      </span>
                      <span className="text-xs font-bold text-amber-200">
                        โซนวางพื้นสีเหลือง (Floor Staging Group X1 - X8)
                      </span>
                    </div>
                    <span className="text-xs font-mono font-black text-amber-400 group-hover:text-amber-300 flex items-center space-x-1">
                      <span>432 Pallets (1 กล่อง = 1 พาเลท)</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </div>

                  {/* Preview Matrix of X1..X8 */}
                  <div className="space-y-1.5 mt-3">
                    {/* Top block X5-X8 */}
                    <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-mono">
                      {['X8 (1212)', 'X7 (1211)', 'X6 (1210)', 'X5 (1209)'].map((xName) => (
                        <div key={xName} className="p-1.5 rounded bg-amber-900/40 border border-amber-600/50 text-amber-100">
                          <div className="font-bold text-[11px]">{xName}</div>
                          <div className="text-[9px] text-amber-300/80">12 Cols • 66 Pallets</div>
                        </div>
                      ))}
                    </div>

                    {/* Bottom block X1-X4 */}
                    <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-mono">
                      {['X4 (1208)', 'X3 (1207)', 'X2 (1206)', 'X1 (1205)'].map((xName) => {
                        const isX2Sample = xName.startsWith('X2');
                        return (
                          <div 
                            key={xName} 
                            className={`p-1.5 rounded border transition-all ${
                              isX2Sample 
                                ? 'bg-rose-950/80 border-rose-500 text-white ring-1 ring-rose-500' 
                                : 'bg-amber-900/40 border-amber-600/50 text-amber-100'
                            }`}
                          >
                            <div className="font-bold text-[11px]">{xName}</div>
                            <div className="text-[9px] text-amber-300/80">7 Cols • 42 Pallets</div>
                            {isX2Sample && (
                              <div className="text-[8px] bg-rose-600 text-white font-bold px-1 rounded mt-0.5 animate-pulse">
                                Sample R8-06
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-[10px] text-amber-300/80">
                    <span>💡 รูปแบบรหัสพิกัด: DA4D-1-R[Row]-[Col] (เช่น DA4D-1-R8-06)</span>
                    <span className="font-bold underline text-amber-300">คลิกเพื่อเปิดดู Matrix ผังวางพื้นเต็มรูปแบบ →</span>
                  </div>
                </div>

                {/* OFFICE / CONTROL ROOM BLOCK (Bottom Right matching image) */}
                <div className="md:col-span-3 bg-sky-950/60 border-2 border-sky-500/70 rounded-xl p-4 flex flex-col justify-between text-center">
                  <div className="space-y-1">
                    <span className="px-2 py-0.5 bg-sky-600 text-white rounded text-[10px] font-bold">
                      OFFICE & QA
                    </span>
                    <h4 className="text-xs font-black text-sky-200 mt-2">
                      ห้องสำนักงาน & ควบคุมคลัง A4 (Office)
                    </h4>
                    <p className="text-[10px] text-sky-300/70">
                      จุดประสานงานจ่ายงาน Forklift, ตรวจสอบเอกสารนำเข้า และบันทึก WMS
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-sky-800 text-[10px] text-sky-400 font-mono">
                    ประตูทางเข้าสำนักงาน 🚪
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🟨 TAB 2: FLOOR STAGING DA4D-1 (1 กล่อง แทน 1 พาเลท: X1 - X8 รวม 432 พาเลท) */}
      {/* ========================================================================= */}
      {a4SectionTab === 'FLOOR_DA4D1' && (
        <div className="space-y-4 animate-fadeIn">
          <DA4D1FloorStagingMap 
            items={items}
            searchQuery={activeQuery}
            onOpenScanner={onOpenScanner}
            onRelocateItem={onRelocateItem}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🏗️ TAB 3: SELECTIVE RACKS DA4D-2 & DA4D-3 (ZONE B ถึง K รวม 680 พาเลท) */}
      {/* ========================================================================= */}
      {a4SectionTab === 'RACK_ZONES' && (
        <div className="space-y-4 animate-fadeIn">
          
          {/* Sub-header controls for Selective Racks */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-200 gap-3">
            <div>
              <h3 className="text-base font-black text-slate-800 flex items-center space-x-2">
                <span>โครงสร้าง Selective Racks (DA4D-2: Zone B-F & DA4D-3: Zone G-K)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Selective Rack 4 ชั้น (L1-L4) ความจุรวม 680 พาเลท • รหัสพิกัดระบุตำแหน่ง: DA4D-2-[Rack]-[Level] (เช่น DA4D-2-D2-L1)
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Layout Mode Switcher */}
              <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-300">
                <button
                  onClick={() => setLayoutMode('FIT_OVERVIEW')}
                  className={`px-3 py-1 rounded-md font-bold transition-all flex items-center space-x-1 ${
                    layoutMode === 'FIT_OVERVIEW' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span>ภาพรวมพอดีจอ (10 Racks)</span>
                </button>
                <button
                  onClick={() => setLayoutMode('DETAILED')}
                  className={`px-3 py-1 rounded-md font-bold transition-all flex items-center space-x-1 ${
                    layoutMode === 'DETAILED' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>มุมมองขยาย (Zone View)</span>
                </button>
              </div>

              {/* View Mode Toggle */}
              <div className="flex bg-slate-200/80 p-1 rounded-lg border border-slate-300 font-bold">
                <button
                  onClick={() => setViewMode('STANDARD')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    viewMode === 'STANDARD' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  แผนผังปกติ
                </button>
                <button
                  onClick={() => setViewMode('HEATMAP')}
                  className={`px-3 py-1 rounded-md transition-all flex items-center space-x-1 ${
                    viewMode === 'HEATMAP' ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
                  }`}
                >
                  <span>🔥 Density Heatmap</span>
                </button>
              </div>
            </div>
          </div>

          {/* Mini Zone Filter Badges */}
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 text-xs">
            {zoneCapacityStats.map((z) => (
              <button
                key={z.zone}
                onClick={() => setSelectedZone(selectedZone === z.zone ? 'ALL' : z.zone)}
                className={`p-2 rounded-xl border text-left transition-all ${
                  selectedZone === z.zone
                    ? 'ring-2 ring-blue-600 bg-blue-50 border-blue-400'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between font-black">
                  <span>Rack {z.zone}</span>
                  <span className="text-[10px] font-mono">{z.percent}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1 mt-1 overflow-hidden">
                  <div className={`h-1 ${z.barBgClass}`} style={{ width: `${z.percent}%` }} />
                </div>
              </button>
            ))}
          </div>

          {/* 10-Rack Locked Unified Grid (Zone B to K) */}
          <div className="bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs overflow-x-auto min-w-0">
            <div className="grid grid-cols-10 gap-1.5 sm:gap-2 min-w-[760px]">
              {allRackZonesList.map((zone) => {
                const isPurple = purpleZones.includes(zone);
                const maxBays = isPurple ? 12 : 5;
                const zoneStats = zoneCapacityStats.find((s) => s.zone === zone);

                return (
                  <div key={zone} className="flex flex-col space-y-1">
                    {/* Rack Header */}
                    <div 
                      className={`text-center font-black text-xs py-1.5 rounded-lg border shadow-2xs ${
                        isPurple 
                          ? 'bg-blue-600 text-white border-blue-700' 
                          : 'bg-indigo-600 text-white border-indigo-700'
                      }`}
                    >
                      <div className="text-xs font-black">Rack {zone}</div>
                      <div className="text-[9px] font-medium opacity-90 leading-tight mt-0.5">
                        {zoneStats ? `${zoneStats.occupiedLocations}/${zoneStats.maxCapacity} P` : ''}
                      </div>
                    </div>

                    {/* Locked Bay Cells (Top-aligned matching 3D layout) */}
                    {(isPurple
                      ? [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
                      : [5, 4, 3, 2, 1, null, null, null, null, null, null, null]
                    ).map((bayNum, rowIndex) => {
                      if (bayNum === null) {
                        return (
                          <div
                            key={`${zone}-empty-${rowIndex}`}
                            className="h-[46px] sm:h-[50px] rounded-md border border-dashed border-slate-200 bg-slate-100/40 flex items-center justify-center text-[10px] text-slate-300 font-mono select-none"
                          >
                            -
                          </div>
                        );
                      }

                      const bayInfo = getBayInfo(zone, bayNum);
                      const isD2RedSample = zone === 'D' && bayNum === 2;

                      return (
                        <div
                          key={`${zone}-${bayNum}`}
                          id={`rack-bay-${zone}-${bayNum}`}
                          onClick={() => onSelectBay(zone, bayNum)}
                          onMouseMove={(e) => handleBayMouseMove(e, zone, bayNum)}
                          onMouseLeave={handleBayMouseLeave}
                          className={`h-[46px] sm:h-[50px] rounded-md p-1 flex flex-col justify-between text-left transition-all cursor-pointer relative overflow-hidden border select-none ${
                            isD2RedSample
                              ? 'bg-rose-700 text-white border-rose-900 shadow-md ring-2 ring-rose-500/60 font-black' // Red sample matching DA4D-2-D2-L1
                              : viewMode === 'HEATMAP'
                              ? getDensityHeatmapBg(bayInfo.totalQty)
                              : bayInfo.occupiedLevelsCount > 0
                              ? bayInfo.hasAgingAlert
                                ? 'bg-amber-100 border-amber-400 text-slate-900 shadow-2xs hover:border-amber-600'
                                : 'bg-blue-50 border-blue-300 text-slate-900 shadow-2xs hover:border-blue-500'
                              : 'bg-white border-dashed border-slate-300 hover:border-blue-400'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-[9px] font-mono font-black ${
                              isD2RedSample ? 'text-rose-100' : 'text-slate-700'
                            }`}>
                              {zone}{bayNum}
                            </span>
                            <span className={`text-[8px] font-black px-1 rounded ${
                              isD2RedSample ? 'bg-rose-950 text-rose-100' : 'bg-blue-100 text-blue-900'
                            }`}>
                              {bayInfo.occupiedLevelsCount}/4 L
                            </span>
                          </div>

                          <div className="leading-none truncate text-[8px] font-mono font-bold">
                            {bayInfo.mainModel || 'ว่าง'}
                          </div>

                          <div className="flex items-center justify-between pt-0.5 border-t border-black/10 text-[8px] font-mono">
                            <span>{bayInfo.totalQty} U</span>
                            {bayInfo.hasAgingAlert && (
                              <span className="text-rose-600 font-black">!</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🌐 TAB 4: FULL 3D MAP VIEW */}
      {/* ========================================================================= */}
      {a4SectionTab === 'FULL3D' && (
        <div className="w-full relative min-w-0" style={{ height: isDashboardFullscreen ? 'calc(100vh - 180px)' : '550px' }}>
          <Warehouse3DMap 
            items={items} 
            searchQuery={activeQuery}
            onSelectBay={(z, b) => {
              onSelectBay(z, b);
              onOpen3D(z, b);
            }} 
            isDashboardFullscreen={isDashboardFullscreen}
          />
        </div>
      )}

      {/* FLOATING HOVER MINI-STATS OVERLAY FOR RACKS */}
      {hoveredBay && (() => {
        const { zone, bayNumber } = hoveredBay;
        const bayItems = items.filter((it) => it.zone === zone && it.bayNumber === bayNumber);
        const singleItem = bayItems.length === 1 ? bayItems[0] : null;

        const overlayData: MiniStatsSlotData = {
          title: `Rack ${zone} - Bay ${bayNumber}`,
          locatorCode: `DA4D-1.05-${zone}${bayNumber}`,
          zoneName: `Rack ${zone}`,
          positionLabel: `Bay ${bayNumber} (4 Levels: L1-L4)`,
          item: singleItem,
          items: bayItems,
          x: hoveredBay.x,
          y: hoveredBay.y
        };

        return <SlotMiniStatsOverlay data={overlayData} />;
      })()}

      {/* UNIFIED MODAL FOR SLOT / PALLET INSPECTION */}
      <UnifiedSlotModal
        isOpen={!!selectedSlotForModal}
        onClose={() => setSelectedSlotForModal(null)}
        slotData={selectedSlotForModal}
        onOpenScanner={onOpenScanner}
        onRelocateItem={onRelocateItem}
        onOpen3D={onOpen3D}
      />
    </div>
  );
};
