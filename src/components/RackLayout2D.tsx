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
  LayoutGrid,
  ChevronDown,
  ArrowLeft,
  ArrowRight,
  Check
} from 'lucide-react';
import { Warehouse3DMap } from './Warehouse3DMap';
import { DA4D1FloorStagingMap } from './DA4D1FloorStagingMap';
import { UnifiedSlotModal, UnifiedSlotData } from './UnifiedSlotModal';
import { SlotMiniStatsOverlay, MiniStatsSlotData } from './SlotMiniStatsOverlay';

interface RackLayout2DProps {
  items: InventoryItem[];
  searchQuery?: string;
  initialSectionTab?: 'FLOOR_DA4D1' | 'RACK_ZONES' | 'FULL3D';
  onSelectBay: (zone: StorageZone, bayNumber: number) => void;
  onOpen3D: (zone: StorageZone, bayNumber: number) => void;
  onOpenScanner?: (zone: StorageZone, bay: number, level: ShelfLevel, mode: MovementType) => void;
  onRelocateItem?: (item: InventoryItem) => void;
  onNavigateToFloor?: () => void;
  onNavigateToCampus?: () => void;
  isDashboardFullscreen?: boolean;
  onToggleFullscreen?: () => void;
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
  initialSectionTab = 'RACK_ZONES',
  onSelectBay,
  onOpen3D,
  onOpenScanner,
  onRelocateItem,
  onNavigateToFloor,
  onNavigateToCampus,
  isDashboardFullscreen,
  onToggleFullscreen
}) => {
  // A4 Building Main Section Switcher: Rack Zones (DA4D-2 & DA4D-3), Floor Staging (DA4D-1), or Full 3D
  const [a4SectionTab, setA4SectionTab] = useState<'FLOOR_DA4D1' | 'RACK_ZONES' | 'FULL3D'>(initialSectionTab);
  
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
  const [congestionFilter, setCongestionFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH'>('ALL');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState<boolean>(false);
  const [internalFullscreen, setInternalFullscreen] = useState<boolean>(false);
  const [localSearch, setLocalSearch] = useState<string>(searchQuery);
  const [hoveredBay, setHoveredBay] = useState<HoveredBayData | null>(null);
  const [selectedSlotForModal, setSelectedSlotForModal] = useState<UnifiedSlotData | null>(null);

  const isFullscreenActive = isDashboardFullscreen ?? internalFullscreen;

  const handleToggleFullscreen = () => {
    if (onToggleFullscreen) {
      onToggleFullscreen();
    } else {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
        setInternalFullscreen(true);
      } else {
        document.exitFullscreen().catch(() => {});
        setInternalFullscreen(false);
      }
    }
  };

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
    <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-xs text-slate-900 space-y-3 min-w-0 max-w-full w-full">
      
      {/* ULTRA-COMPACT ENTERPRISE TOOLBAR: MAX 1-2 ROWS (Height <= 36px per row) */}
      <div className="space-y-1.5 border-b border-slate-200 pb-2">
        {/* ROW 1: PRIMARY WORKSPACE TOOLBAR (H <= 36px) */}
        <div className="h-9 px-2 sm:px-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white shadow-xs flex items-center justify-between gap-1.5 sm:gap-2">
          
          {/* Left Group: Breadcrumbs + Zone Title + Main Segmented Mode Switcher */}
          <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto">
            {onNavigateToCampus && (
              <button
                onClick={onNavigateToCampus}
                className="h-[26px] px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white flex items-center gap-1 border border-slate-700 transition-colors shrink-0"
                title="กลับสู่โซนรวมแคมปัส"
              >
                <ArrowLeft className="w-3 h-3 text-slate-400" />
                <span className="hidden xs:inline">โซนรวม</span>
              </button>
            )}

            {/* Zone Title & Badge */}
            <div className="flex items-center gap-1 shrink-0 mr-1">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[12px] font-black tracking-tight text-white whitespace-nowrap">
                โซน A4 แร็ค (DA4D-2 & 3)
              </span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded hidden sm:inline">
                680P
              </span>
            </div>

            {/* Segmented 2D / 3D Rack Switcher */}
            <div className="inline-flex items-center bg-slate-800/90 p-0.5 rounded-md border border-slate-700/80 h-[26px] shrink-0">
              <button
                onClick={() => setA4SectionTab('RACK_ZONES')}
                className={`h-[22px] px-2 py-0.5 rounded text-[11px] font-bold transition-all flex items-center gap-1 whitespace-nowrap ${
                  a4SectionTab === 'RACK_ZONES'
                    ? 'bg-blue-600 text-white font-black shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>แร็ค 2D (B-K)</span>
              </button>
              <button
                onClick={() => setA4SectionTab('FULL3D')}
                className={`h-[22px] px-2 py-0.5 rounded text-[11px] font-bold transition-all flex items-center gap-1 whitespace-nowrap ${
                  a4SectionTab === 'FULL3D'
                    ? 'bg-purple-600 text-white font-black shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Box className="w-3 h-3" />
                <span>แร็ค 3D</span>
              </button>
            </div>

            {/* Compact Action Icon-Text Toggles (Only when on Racks) */}
            {a4SectionTab === 'RACK_ZONES' && (
              <div className="hidden lg:inline-flex items-center gap-1 shrink-0">
                {/* Fit Screen Toggle */}
                <button
                  onClick={() => setLayoutMode(layoutMode === 'FIT_OVERVIEW' ? 'DETAILED' : 'FIT_OVERVIEW')}
                  className={`h-[26px] px-2 py-0.5 rounded-md text-[11px] font-bold border transition-colors flex items-center gap-1 shrink-0 ${
                    layoutMode === 'FIT_OVERVIEW'
                      ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                  }`}
                  title={layoutMode === 'FIT_OVERVIEW' ? 'สลับเป็นมุมมองขยาย' : 'สลับเป็นมุมมองพอดีจอ'}
                >
                  <Grid className="w-3 h-3" />
                  <span>Fit Screen</span>
                </button>

                {/* Heatmap Toggle */}
                <button
                  onClick={() => setViewMode(viewMode === 'HEATMAP' ? 'STANDARD' : 'HEATMAP')}
                  className={`h-[26px] px-2 py-0.5 rounded-md text-[11px] font-bold border transition-colors flex items-center gap-1 shrink-0 ${
                    viewMode === 'HEATMAP'
                      ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white border-orange-400 shadow-xs'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                  }`}
                  title="สลับโหมด Heatmap ความหนาแน่น"
                >
                  <Flame className="w-3 h-3 text-orange-400" />
                  <span>Heatmap</span>
                </button>

                {/* Full Screen Toggle */}
                <button
                  onClick={handleToggleFullscreen}
                  className="h-[26px] px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1 shrink-0 transition-colors"
                  title={isFullscreenActive ? 'ออกจากโหมดเต็มจอ' : 'เปิดโหมดเต็มจอ'}
                >
                  {isFullscreenActive ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                  <span>{isFullscreenActive ? 'Exit Full' : 'Full Screen'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Right Group: Compact Inline Search (Max-Width 220px, Height 26px) */}
          <div className="relative w-full max-w-[220px] h-[26px] shrink-0 flex items-center ml-auto">
            <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="ค้นหา P/No, Model..."
              className="w-full h-[26px] bg-slate-800 border border-slate-700 focus:border-blue-500 rounded-md pl-6.5 pr-6 text-[11px] text-white placeholder-slate-400 focus:outline-none transition-colors"
            />
            {localSearch && (
              <button
                onClick={() => setLocalSearch('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-white"
                title="ล้างการค้นหา"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* ROW 2: SECONDARY FILTER & SEGMENTED CONTROLS (H <= 34px, Only when in RACK_ZONES) */}
        {a4SectionTab === 'RACK_ZONES' && (
          <div className="h-[34px] px-2 sm:px-2.5 bg-slate-900/95 border border-slate-800 rounded-lg text-white shadow-xs flex items-center justify-between gap-1.5 overflow-x-auto">
            
            {/* Left Group: Status Segmented Group + Zone Segmented Group */}
            <div className="flex items-center gap-1.5 shrink-0">
              
              {/* Status Selector: Single Segmented Group (H: 26px, Font: 11px, Pad: 2px 8px) */}
              <div className="inline-flex items-center bg-slate-800 p-0.5 rounded-md border border-slate-700 h-[26px] shrink-0">
                <button
                  onClick={() => setFilterType('ALL')}
                  className={`h-[22px] px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                    filterType === 'ALL'
                      ? 'bg-blue-600 text-white font-black shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  ทั้งหมด
                </button>
                <button
                  onClick={() => setFilterType('OCCUPIED')}
                  className={`h-[22px] px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                    filterType === 'OCCUPIED'
                      ? 'bg-blue-600 text-white font-black shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  มีของ
                </button>
                <button
                  onClick={() => setFilterType('AGING')}
                  className={`h-[22px] px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                    filterType === 'AGING'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  Aging
                </button>
              </div>

              {/* Racks Segmented Selector (B to K) */}
              <div className="inline-flex items-center bg-slate-800 p-0.5 rounded-md border border-slate-700 h-[26px] shrink-0">
                <button
                  onClick={() => setSelectedZone('ALL')}
                  className={`h-[22px] px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                    selectedZone === 'ALL'
                      ? 'bg-blue-600 text-white font-black shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  All Racks
                </button>
                {allRackZonesList.map((z) => {
                  const isSel = selectedZone === z;
                  const stat = zoneCapacityStats.find((s) => s.zone === z);
                  return (
                    <button
                      key={z}
                      onClick={() => setSelectedZone(isSel ? 'ALL' : z)}
                      className={`h-[22px] px-1.5 py-0.5 rounded text-[11px] font-mono font-bold transition-colors flex items-center gap-1 ${
                        isSel
                          ? 'bg-blue-600 text-white font-black shadow-xs'
                          : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                      }`}
                      title={`Rack ${z}: ${stat?.percent}% (${stat?.occupiedLocations}/${stat?.maxCapacity}P)`}
                    >
                      <span>{z}</span>
                      {stat && stat.percent >= 80 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Mobile/Tablet Fallback for Fit/Heatmap/Fullscreen buttons */}
              <div className="inline-flex lg:hidden items-center gap-1 shrink-0">
                <button
                  onClick={() => setLayoutMode(layoutMode === 'FIT_OVERVIEW' ? 'DETAILED' : 'FIT_OVERVIEW')}
                  className={`h-[26px] px-1.5 py-0.5 rounded text-[11px] font-bold border ${
                    layoutMode === 'FIT_OVERVIEW' ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                  title="Fit Screen"
                >
                  <Grid className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setViewMode(viewMode === 'HEATMAP' ? 'STANDARD' : 'HEATMAP')}
                  className={`h-[26px] px-1.5 py-0.5 rounded text-[11px] font-bold border ${
                    viewMode === 'HEATMAP' ? 'bg-orange-500 text-white border-orange-400' : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                  title="Heatmap"
                >
                  <Flame className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Right Group: Collapsed Filters Dropdown + Compact Metric */}
            <div className="flex items-center gap-2 shrink-0 ml-auto">
              {/* Collapsed Dropdown for Secondary Filters */}
              <div className="relative inline-block text-left shrink-0">
                <button
                  onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                  className={`h-[26px] px-2 py-0.5 rounded-md text-[11px] font-bold border transition-colors flex items-center gap-1 shrink-0 ${
                    isFilterDropdownOpen || dimMode === 'HIDE' || congestionFilter !== 'ALL'
                      ? 'bg-slate-700 text-white border-blue-500 ring-1 ring-blue-500/50'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  <Filter className="w-3 h-3 text-slate-400" />
                  <span>ตัวกรอง</span>
                  <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
                </button>

                {isFilterDropdownOpen && (
                  <div className="absolute right-0 mt-1 w-56 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-2.5 z-40 space-y-2 text-xs text-slate-200">
                    <div>
                      <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">ช่องไม่ตรงเงื่อนไข</div>
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          onClick={() => setDimMode('DIM')}
                          className={`px-2 py-1 rounded text-[11px] font-bold border ${dimMode === 'DIM' ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-800 border-slate-700 text-slate-300'}`}
                        >
                          จางลง (Dim)
                        </button>
                        <button
                          onClick={() => setDimMode('HIDE')}
                          className={`px-2 py-1 rounded text-[11px] font-bold border ${dimMode === 'HIDE' ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-800 border-slate-700 text-slate-300'}`}
                        >
                          ซ่อน (Hide)
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">ระดับความหนาแน่น</div>
                      <div className="grid grid-cols-3 gap-1">
                        <button
                          onClick={() => setCongestionFilter('ALL')}
                          className={`px-1.5 py-0.5 rounded text-[10.5px] font-bold border ${congestionFilter === 'ALL' ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-800 border-slate-700 text-slate-300'}`}
                        >
                          ทั้งหมด
                        </button>
                        <button
                          onClick={() => setCongestionFilter('HIGH')}
                          className={`px-1.5 py-0.5 rounded text-[10.5px] font-bold border ${congestionFilter === 'HIGH' ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-800 border-slate-700 text-slate-300'}`}
                        >
                          ≥ 75%
                        </button>
                        <button
                          onClick={() => setCongestionFilter('CRITICAL')}
                          className={`px-1.5 py-0.5 rounded text-[10.5px] font-bold border ${congestionFilter === 'CRITICAL' ? 'bg-red-600 text-white border-red-500' : 'bg-slate-800 border-slate-700 text-slate-300'}`}
                        >
                          ≥ 90%
                        </button>
                      </div>
                    </div>

                    <div className="pt-1 border-t border-slate-800 flex justify-end">
                      <button
                        onClick={() => {
                          setSelectedZone('ALL');
                          setFilterType('ALL');
                          setDimMode('DIM');
                          setCongestionFilter('ALL');
                          setLocalSearch('');
                          setIsFilterDropdownOpen(false);
                        }}
                        className="text-[10px] text-slate-400 hover:text-rose-400 font-bold underline"
                      >
                        รีเซ็ตตัวกรองทั้งหมด
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Inline Quick Metric */}
              <div className="text-[11px] font-mono text-slate-300 shrink-0 hidden md:flex items-center gap-1.5">
                <span className="text-slate-400">จัดเก็บ:</span>
                <span className="font-bold text-white">{a4CapacitySummary.totalRackOccupied}/{a4CapacitySummary.totalRackCapacity}P</span>
                <span className="text-blue-400 font-bold">({a4CapacitySummary.totalRackPercent}%)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 🏗️ SELECTIVE RACKS DA4D-2 & DA4D-3 (ZONE B ถึง K รวม 680 พาเลท) */}
      {/* ========================================================================= */}
      {a4SectionTab !== 'FULL3D' && (
        <div className="space-y-2 animate-fadeIn">

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
                            className="h-12 sm:h-13 rounded-md border border-dashed border-slate-300/60 bg-slate-100/30 flex items-center justify-center text-[10px] text-slate-300 font-mono select-none"
                          >
                            -
                          </div>
                        );
                      }

                      const bayInfo = getBayInfo(zone, bayNum);
                      const isD2RedSample = zone === 'D' && bayNum === 2;

                      const isZoneMatch = selectedZone === 'ALL' || selectedZone === zone;
                      const isStatusMatch = filterType === 'ALL' || 
                        (filterType === 'OCCUPIED' && bayInfo.occupiedLevelsCount > 0) ||
                        (filterType === 'AGING' && bayInfo.hasAgingAlert);
                      const isCongestionMatch = congestionFilter === 'ALL' ||
                        (congestionFilter === 'HIGH' && zoneStats && zoneStats.percent >= 75) ||
                        (congestionFilter === 'CRITICAL' && zoneStats && zoneStats.percent >= 90);

                      const isFilterMatch = isZoneMatch && isStatusMatch && isCongestionMatch;

                      if (dimMode === 'HIDE' && !isFilterMatch) {
                        return (
                          <div
                            key={`${zone}-hidden-${rowIndex}`}
                            className="h-12 sm:h-13 rounded-md border border-dashed border-slate-200 bg-slate-50/50 flex items-center justify-center text-[10px] text-slate-300 font-mono select-none"
                          >
                            -
                          </div>
                        );
                      }

                      return (
                        <div
                          key={`${zone}-${bayNum}`}
                          id={`rack-bay-${zone}-${bayNum}`}
                          onClick={() => onSelectBay(zone, bayNum)}
                          onMouseMove={(e) => handleBayMouseMove(e, zone, bayNum)}
                          onMouseLeave={handleBayMouseLeave}
                          className={`h-12 sm:h-13 rounded-md p-1 flex flex-col justify-between text-left transition-all cursor-pointer relative overflow-hidden border select-none ${
                            !isFilterMatch ? 'opacity-25 grayscale hover:opacity-100 hover:grayscale-0' : ''
                          } ${
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
                          {/* Top Row: Bay Code & Occupied Levels Badge */}
                          <div className="flex items-center justify-between leading-none">
                            <span className={`text-[9px] font-mono font-black ${
                              isD2RedSample ? 'text-rose-100' : 'text-slate-800'
                            }`}>
                              {zone}{bayNum}
                            </span>
                            <span className={`text-[8px] font-mono font-black px-1 py-0.2 rounded leading-none ${
                              isD2RedSample ? 'bg-rose-950 text-rose-100' : 'bg-blue-200 text-blue-950'
                            }`}>
                              {bayInfo.occupiedLevelsCount}/4 L
                            </span>
                          </div>

                          {/* Middle Row: Large & Readable Model HE */}
                          <div className="w-full leading-tight truncate my-auto">
                            {bayInfo.mainModel ? (
                              <span className={`text-[10px] sm:text-[11px] font-mono font-black tracking-tight truncate block ${
                                isD2RedSample ? 'text-white drop-shadow-2xs' : 'text-blue-950'
                              }`}>
                                {bayInfo.mainModel}
                              </span>
                            ) : (
                              <span className="text-[9px] text-slate-300 font-sans block">
                                ว่าง
                              </span>
                            )}
                          </div>

                          {/* Bottom Row: Quantity & Aging Indicator */}
                          <div className="flex items-center justify-between pt-0.5 border-t border-black/10 text-[9px] font-mono font-black leading-none">
                            <span className={isD2RedSample ? 'text-rose-100' : 'text-slate-900'}>
                              {bayInfo.totalQty > 0 ? `${bayInfo.totalQty} U` : '0 U'}
                            </span>
                            {bayInfo.hasAgingAlert && (
                              <span className="text-rose-600 font-black text-[10px]">!</span>
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
