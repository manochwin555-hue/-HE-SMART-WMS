import React, { useState, useEffect, useMemo, useRef } from 'react';
import { InventoryItem, StorageZone } from '../types';
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
  ArrowUpRight
} from 'lucide-react';
import { Warehouse3DMap } from './Warehouse3DMap';

interface RackLayout2DProps {
  items: InventoryItem[];
  searchQuery?: string;
  onSelectBay: (zone: StorageZone, bayNumber: number) => void;
  onOpen3D: (zone: StorageZone, bayNumber: number) => void;
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
  onSelectBay,
  onOpen3D,
  isDashboardFullscreen
}) => {
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<'ALL' | 'OCCUPIED' | 'AGING'>('ALL');
  const [viewMode, setViewMode] = useState<'STANDARD' | 'HEATMAP' | 'FULL3D'>('STANDARD');
  const [layoutMode, setLayoutMode] = useState<'FIT_OVERVIEW' | 'DETAILED'>('FIT_OVERVIEW');
  const [dimMode, setDimMode] = useState<'DIM' | 'HIDE'>('DIM');
  const [localSearch, setLocalSearch] = useState<string>(searchQuery);
  const [hoveredBay, setHoveredBay] = useState<HoveredBayData | null>(null);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  const activeQuery = localSearch.trim();

  // Zones definition based on layout
  const purpleZones: StorageZone[] = ['B', 'C', 'D', 'E', 'F']; // 12 bays each
  const orangeZones: StorageZone[] = ['G', 'H', 'I', 'J', 'K']; // 5 bays each
  const allZonesList: StorageZone[] = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];

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

  // Calculate overall search statistics across all zones
  const allZones: StorageZone[] = [...purpleZones, ...orangeZones];
  let totalMatchedRacksCount = 0;
  let totalMatchedPalletsCount = 0;
  let totalMatchedQtyCount = 0;
  const matchedBayList: string[] = [];

  if (activeQuery !== '') {
    allZones.forEach((z) => {
      const maxBays = purpleZones.includes(z) ? 12 : 5;
      for (let b = 1; b <= maxBays; b++) {
        const info = getBayInfo(z, b);
        if (info.matchesSearch) {
          totalMatchedRacksCount++;
          totalMatchedPalletsCount += info.matchedCount;
          totalMatchedQtyCount += info.matchedQty;
          matchedBayList.push(`${z}${b}`);
        }
      }
    });
  }

  // Zone Capacity & Congestion Heatmap Calculation for Zones B to K
  const zoneCapacityStats = useMemo(() => {
    const zonesList: StorageZone[] = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
    return zonesList.map((z) => {
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
  }, [items, purpleZones]);

  const totalWarehouseCapacity = zoneCapacityStats.reduce((acc, z) => acc + z.maxCapacity, 0);
  const totalWarehouseOccupied = zoneCapacityStats.reduce((acc, z) => acc + z.occupiedLocations, 0);
  const totalWarehousePercent = Math.round((totalWarehouseOccupied / totalWarehouseCapacity) * 100);

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
    <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-5 shadow-sm text-slate-900 space-y-4 sm:space-y-5 min-w-0 max-w-full w-full">
      {/* Header controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-3 sm:pb-4 border-b border-slate-200 gap-3 sm:gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-blue-600" />
            <h2 className="text-lg font-bold tracking-tight text-slate-800">
              แผนผังพื้นที่จัดเก็บ 2D & 3D (HE Inventory Layout)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            ค้นหาตำแหน่ง P/No, ดูชั้นวางแบบ Heatmap หรือส่องในโหมด 3D Map ได้ทันที
          </p>
        </div>

        {/* Filters & View Mode Toggles */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Layout Display Mode: Fit Overview vs Detailed */}
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-300 shadow-2xs">
            <button
              onClick={() => setLayoutMode('FIT_OVERVIEW')}
              className={`px-3 py-1 rounded-md font-bold transition-all flex items-center space-x-1.5 ${
                layoutMode === 'FIT_OVERVIEW' 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
              title="เห็นครบ 10 Racks (B-K) ในหน้าจอเดียว ไม่ต้องเลื่อนจอลงล่าง"
            >
              <Grid className="w-3.5 h-3.5" />
              <span>ภาพรวมพอดีจอ (10 Racks)</span>
            </button>
            <button
              onClick={() => setLayoutMode('DETAILED')}
              className={`px-3 py-1 rounded-md font-bold transition-all flex items-center space-x-1.5 ${
                layoutMode === 'DETAILED' 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
              title="มุมมองแบบแยกโซน B-F และ G-K"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>มุมมองขยาย (Zone View)</span>
            </button>
          </div>

          {/* View Mode Toggle: Standard vs Heatmap vs FULL3D */}
          <div className="flex bg-slate-200/80 p-1 rounded-lg border border-slate-300">
            <button
              onClick={() => setViewMode('STANDARD')}
              className={`px-3 py-1 rounded-md font-bold transition-all ${
                viewMode === 'STANDARD' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              แผนผังปกติ
            </button>
            <button
              onClick={() => setViewMode('HEATMAP')}
              className={`px-3 py-1 rounded-md font-bold transition-all flex items-center space-x-1 ${
                viewMode === 'HEATMAP' ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-sm' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <span>🔥 Density Heatmap</span>
            </button>
            <button
              onClick={() => setViewMode('FULL3D')}
              className={`px-3 py-1 rounded-md font-bold transition-all flex items-center space-x-1 ${
                viewMode === 'FULL3D' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>Full 3D Map</span>
            </button>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                filterType === 'ALL' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setFilterType('OCCUPIED')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                filterType === 'OCCUPIED' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              มีสินค้า
            </button>
            <button
              onClick={() => setFilterType('AGING')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                filterType === 'AGING' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Aging
            </button>
          </div>
        </div>
      </div>

      {/* P/No Search Bar & Heatmap Filter Controller */}
      <div className="space-y-3">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="🔍 ค้นหา P/No หรือ Model HE ใน Layout (เช่น 1254, ADL74920904, ACG76284709...)"
              className="w-full bg-white border border-slate-300 focus:border-blue-500 rounded-lg pl-9 pr-8 py-2 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none shadow-xs"
            />
            {localSearch && (
              <button
                onClick={() => setLocalSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
                title="ล้างคำค้นหา"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Search Chips */}
          <div className="flex items-center space-x-1.5 overflow-x-auto text-[11px] no-scrollbar">
            <span className="text-slate-500 font-semibold shrink-0">ค้นหาด่วน:</span>
            {['1254', 'ADL76754205', 'ADL74920904', 'ACG76284709'].map((code) => (
              <button
                key={code}
                onClick={() => setLocalSearch(code)}
                className={`px-2 py-1 rounded-md border font-mono font-bold transition-colors shrink-0 ${
                  localSearch === code
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                {code}
              </button>
            ))}
          </div>
        </div>

        {/* Heatmap Search Active Banner */}
        {activeQuery !== '' && (
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-3.5 rounded-xl border border-blue-500/40 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center shrink-0">
                <Search className="w-5 h-5 text-emerald-400 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-xs sm:text-sm text-emerald-300">
                    🎯 P/No Heatmap Filter Active: "{activeQuery}"
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-slate-950">
                    {totalMatchedRacksCount} Racks Found
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5">
                  ตำแหน่งที่พบ: <span className="font-mono font-bold text-amber-300">{matchedBayList.join(', ') || 'ไม่พบในคลัง'}</span> | รวม <span className="font-bold text-white">{totalMatchedPalletsCount} Pallets</span> ({totalMatchedQtyCount.toLocaleString()} Units)
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 self-end sm:self-center shrink-0 text-xs">
              <button
                onClick={() => setDimMode(dimMode === 'DIM' ? 'HIDE' : 'DIM')}
                className={`px-3 py-1.5 rounded-lg border font-bold transition-all flex items-center space-x-1.5 ${
                  dimMode === 'HIDE'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>{dimMode === 'HIDE' ? 'โหมด: ซ่อน Rack อื่นๆ' : 'โหมด: จางแสง Rack อื่นๆ'}</span>
              </button>
              <button
                onClick={() => setLocalSearch('')}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 font-semibold transition-colors flex items-center space-x-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>ล้างคำค้นหา</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Visual Heatmap Bar: Occupied Capacity for Each Zone (B-K) */}
      <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 sm:p-4 space-y-3 shadow-xs">
        {/* Heatmap Bar Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-orange-100 text-orange-600">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-800">
                  แถบวิเคราะห์ความจุและระดับความหนาแน่นรายโซน (Zone B-K Capacity Heatmap Bar)
                </h3>
              </div>
              <p className="text-[11px] text-slate-500">
                สัดส่วนการใช้พื้นที่จัดเก็บรายโซน (B - K) เพื่อระบุจุดแออัด (Congestion) ได้อย่างรวดเร็ว
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-stretch sm:self-auto justify-between sm:justify-end">
            <div className="text-right">
              <span className="text-[11px] font-semibold text-slate-500">ความจุรวมทั้งคลัง: </span>
              <span className="font-mono font-bold text-xs text-slate-900">
                {totalWarehouseOccupied} / {totalWarehouseCapacity} Pallets ({totalWarehousePercent}%)
              </span>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-black shrink-0 ${
                totalWarehousePercent >= 90
                  ? 'bg-red-600 text-white animate-pulse'
                  : totalWarehousePercent >= 75
                  ? 'bg-amber-500 text-white'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {totalWarehousePercent >= 90 ? '🔥 แน่นมาก' : totalWarehousePercent >= 75 ? '⚠️ หนาแน่น' : '✅ คล่องตัว'}
            </span>
          </div>
        </div>

        {/* Proportional Segmented Visual Bar */}
        <div className="w-full bg-slate-200 rounded-xl h-6 sm:h-7 p-0.5 flex gap-0.5 overflow-hidden shadow-inner border border-slate-300/60">
          {zoneCapacityStats.map((z) => {
            const widthWeight = z.isPurple ? 12 : 5; // Weight according to rack bays count
            return (
              <div
                key={z.zone}
                style={{ flex: widthWeight }}
                className={`h-full ${z.barBgClass} rounded transition-all duration-300 relative group flex items-center justify-center text-white cursor-pointer hover:opacity-90 hover:scale-y-105`}
                onClick={() => setSelectedZone(selectedZone === z.zone ? 'ALL' : z.zone)}
                title={`Zone ${z.zone}: ${z.occupiedLocations}/${z.maxCapacity} พาเลท (${z.percent}%) - ${z.congestionText}`}
              >
                <span className="text-[10px] sm:text-[11px] font-black truncate px-0.5 drop-shadow-xs">
                  {z.zone}: {z.percent}%
                </span>
              </div>
            );
          })}
        </div>

        {/* Zone-by-Zone Heatmap Indicator Badges Grid */}
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 pt-1">
          {zoneCapacityStats.map((z) => {
            const isSelected = selectedZone === z.zone;
            return (
              <button
                key={z.zone}
                type="button"
                onClick={() => setSelectedZone(selectedZone === z.zone ? 'ALL' : z.zone)}
                className={`p-2 rounded-lg border text-left transition-all flex flex-col justify-between active:scale-95 ${
                  isSelected
                    ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/80 shadow-xs'
                    : z.badgeBorder
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-xs">
                    Zone {z.zone}
                  </span>
                  <span className="text-[10px] font-bold">
                    {z.percent}%
                  </span>
                </div>
                <div className="mt-1">
                  {/* Mini Bar */}
                  <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full ${z.barBgClass}`}
                      style={{ width: `${Math.max(4, z.percent)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[9px] mt-1 font-semibold opacity-90 truncate">
                    <span>{z.occupiedLocations}/{z.maxCapacity} P</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid Map Area */}
      {viewMode === 'FULL3D' ? (
        <div className="w-full relative min-w-0" style={{ height: isDashboardFullscreen ? 'calc(100vh - 180px)' : '500px' }}>
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
      ) : layoutMode === 'FIT_OVERVIEW' ? (
        /* ========================================================================= */
        /* 📊 MODE 1: FIT OVERVIEW (ภาพรวมพอดีจอ - เห็นครบทั้ง 10 RACKS B ถึง K ไม่ต้องเลื่อนจอลงล่าง) */
        /* ========================================================================= */
        <div className="space-y-4">
          <div className="bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs overflow-x-auto min-w-0">
            {/* Legend & Layout Notice */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2.5 mb-3 border-b border-slate-200/80 gap-2 min-w-[760px]">
              <div className="flex items-center space-x-3">
                <span className="flex items-center space-x-1.5 text-xs font-black text-slate-800">
                  <Grid className="w-4 h-4 text-blue-600" />
                  <span>แผนผังภาพรวมทั้งคลัง 10 Racks (Zone B - K)</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  ความจุรวม 680 พาเลท (B-F 480P + G-K 200P)
                </span>
              </div>
              <div className="flex items-center space-x-3 text-[11px] text-slate-500 font-medium">
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded bg-blue-600 inline-block" />
                  <span>Zone B-F (12 Bays)</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded bg-indigo-600 inline-block" />
                  <span>Zone G-K (5 Bays)</span>
                </span>
                <span className="text-blue-600 font-bold hidden md:inline">
                  ✨ ชี้เมาส์ที่ช่องเพื่อดูข้อมูล Pop-up ทันที
                </span>
              </div>
            </div>

            {/* 10-Column Unified Locked Grid for All Racks (B, C, D, E, F, G, H, I, J, K) */}
            <div className="grid grid-cols-10 gap-1.5 sm:gap-2 min-w-[760px]">
              {allZonesList.map((zone) => {
                const isPurple = purpleZones.includes(zone);
                const maxBays = isPurple ? 12 : 5;
                const zoneStats = zoneCapacityStats.find((s) => s.zone === zone);

                return (
                  <div key={zone} className="flex flex-col space-y-1">
                    {/* Rack Header */}
                    <div 
                      className={`text-center font-black text-xs py-1.5 rounded-lg border shadow-2xs transition-colors ${
                        isPurple 
                          ? 'bg-blue-600 text-white border-blue-700' 
                          : 'bg-indigo-600 text-white border-indigo-700'
                      }`}
                    >
                      <div className="text-xs font-black leading-tight">Rack {zone}</div>
                      <div className="text-[9px] font-medium opacity-90 leading-tight mt-0.5">
                        {zoneStats ? `${zoneStats.occupiedLocations}/${zoneStats.maxCapacity} P` : ''}
                      </div>
                    </div>

                    {/* Uniform Locked Aspect-Ratio Bay Cells (Top-aligned matching 3D layout) */}
                    {(isPurple
                      ? [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
                      : [5, 4, 3, 2, 1, null, null, null, null, null, null, null]
                    ).map((bayNum, rowIndex) => {
                      // If empty floor area below Rack G-K (rows 6 to 12)
                      if (bayNum === null) {
                        return (
                          <div
                            key={`${zone}-empty-${rowIndex}`}
                            className="h-[46px] sm:h-[50px] rounded-md border border-dashed border-slate-200 bg-slate-100/40 flex items-center justify-center text-[10px] text-slate-300 font-mono select-none"
                            title={`พื้นที่ว่างถัดจาก Rack ${zone} (ตรงกับแผนผัง 3D)`}
                          >
                            <span className="opacity-40">-</span>
                          </div>
                        );
                      }

                      const { occupiedLevelsCount, totalQty, hasAgingAlert, mainModel, matchesSearch, matchedItemCode, matchedQty } = getBayInfo(zone, bayNum);
                      const isOccupied = occupiedLevelsCount > 0;

                      // Filter logic
                      if (filterType === 'OCCUPIED' && !isOccupied) {
                        return (
                          <div key={`${zone}${bayNum}`} className="h-[46px] sm:h-[50px] rounded-md border border-slate-100 bg-slate-50/50 opacity-20" />
                        );
                      }
                      if (filterType === 'AGING' && !hasAgingAlert) {
                        return (
                          <div key={`${zone}${bayNum}`} className="h-[46px] sm:h-[50px] rounded-md border border-slate-100 bg-slate-50/50 opacity-20" />
                        );
                      }

                      const isDimmed = !matchesSearch && activeQuery !== '';
                      const isMatchHighlight = matchesSearch && activeQuery !== '';

                      if (activeQuery !== '' && dimMode === 'HIDE' && isDimmed) {
                        return <div key={`${zone}${bayNum}`} className="h-[46px] sm:h-[50px] rounded-md border border-slate-100 bg-slate-50/20" />;
                      }

                      return (
                        <div
                          key={`${zone}${bayNum}`}
                          onMouseMove={(e) => !isDimmed && handleBayMouseMove(e, zone, bayNum)}
                          onMouseEnter={(e) => !isDimmed && handleBayMouseMove(e, zone, bayNum)}
                          onMouseLeave={handleBayMouseLeave}
                          onClick={() => {
                            if (!isDimmed) {
                              onSelectBay(zone, bayNum);
                              onOpen3D(zone, bayNum);
                            }
                          }}
                          className={`h-[46px] sm:h-[50px] rounded-md p-1 sm:p-1.5 border text-left transition-all duration-150 flex flex-col justify-between relative select-none ${
                            isDimmed
                              ? 'opacity-15 grayscale blur-[0.2px] cursor-not-allowed bg-slate-200 border-slate-300'
                              : 'cursor-pointer hover:shadow-md hover:scale-[1.03] hover:z-20'
                          } ${
                            isMatchHighlight
                              ? getPNoHeatmapBg(matchedQty)
                              : viewMode === 'HEATMAP'
                              ? getDensityHeatmapBg(totalQty)
                              : hasAgingAlert
                              ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-300'
                              : isOccupied
                              ? isPurple 
                                ? 'bg-white border-blue-300/80 shadow-2xs' 
                                : 'bg-white border-indigo-300/80 shadow-2xs'
                              : 'bg-white/70 border-slate-200/90 text-slate-400 hover:border-slate-400'
                          }`}
                        >
                          {/* Bay Number & Level indicator */}
                          <div className="flex items-center justify-between leading-none">
                            <span className={`font-black text-[11px] sm:text-xs tracking-tight ${
                              isMatchHighlight ? 'text-white' : 'text-slate-900'
                            }`}>
                              {zone}{bayNum}
                            </span>

                            {isMatchHighlight ? (
                              <span className="text-[8px] font-black px-1 rounded bg-slate-950/80 text-emerald-300">
                                🎯 {matchedQty}
                              </span>
                            ) : hasAgingAlert ? (
                              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse ring-2 ring-amber-200" />
                            ) : isOccupied ? (
                              <span className={`text-[8px] sm:text-[9px] font-extrabold px-1 py-0.2 rounded leading-tight ${
                                occupiedLevelsCount === 4
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {occupiedLevelsCount}/4
                              </span>
                            ) : (
                              <span className="text-[8px] text-slate-300 font-medium">ว่าง</span>
                            )}
                          </div>

                          {/* Item Code & Qty */}
                          <div className="leading-tight">
                            {isOccupied ? (
                              <>
                                <p className={`text-[8px] sm:text-[9px] font-mono font-bold truncate ${
                                  isMatchHighlight ? 'text-amber-200' : isPurple ? 'text-blue-800' : 'text-indigo-800'
                                }`}>
                                  {matchedItemCode || mainModel}
                                </p>
                                <p className={`text-[8px] sm:text-[9px] font-extrabold flex items-center justify-between ${
                                  isMatchHighlight ? 'text-white' : 'text-slate-700'
                                }`}>
                                  <span>{isMatchHighlight ? matchedQty.toLocaleString() : totalQty.toLocaleString()}</span>
                                  <span className="text-[7px] opacity-70 font-normal">U</span>
                                </p>
                              </>
                            ) : (
                              <p className="text-[8px] text-slate-400 italic">0 U</p>
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

          {/* Color Legend & Visual Key */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 sm:p-4 text-xs space-y-2.5 shadow-2xs">
            <div className="font-bold text-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Info className="w-4 h-4 text-blue-600" />
                <span>คำอธิบายสัญลักษณ์ {viewMode === 'HEATMAP' ? '🔥 Density Heatmap Intensity' : 'และวิธีใช้งานภาพรวม'}</span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Tip: เลื่อนเมาส์ชี้ที่ช่องใดก็ได้เพื่อเปิด Pop-up รายละเอียดสินค้า 4 ชั้น
              </span>
            </div>

            {viewMode === 'HEATMAP' ? (
              <div className="space-y-2 pt-1">
                <div className="text-[11px] font-semibold text-slate-600">
                  ระดับความหนาแน่นจำนวนสินค้าในแต่ละช่อง (Density Intensity Spectrum):
                </div>
                <div className="grid grid-cols-5 gap-1.5 text-center text-[10px] font-bold">
                  <div className="p-1.5 bg-slate-100 border border-slate-300 text-slate-600 rounded">0 Units (ว่าง)</div>
                  <div className="p-1.5 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded">1 - 150 Units</div>
                  <div className="p-1.5 bg-yellow-100 border border-yellow-300 text-yellow-900 rounded">151 - 350 Units</div>
                  <div className="p-1.5 bg-amber-200 border border-amber-400 text-amber-950 rounded">351 - 600 Units</div>
                  <div className="p-1.5 bg-red-400 border border-red-600 text-white rounded">601+ Units (หนาแน่นสูง)</div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded bg-blue-600 border border-blue-400" />
                  <span className="text-slate-700">Rack B-F (480 Pallets)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded bg-indigo-600 border border-indigo-400" />
                  <span className="text-slate-700">Rack G-K (200 Pallets)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded bg-amber-500 border border-amber-400 animate-pulse" />
                  <span className="text-amber-700 font-semibold">มีเตือน Aging (&gt;30 วัน)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded bg-white border border-slate-300" />
                  <span className="text-slate-500">ช่องว่าง (Empty Level)</span>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* 📐 MODE 2: DETAILED ZONE VIEW (มุมมองขยายแบบ 2 โซน พร้อมปุ่ม 3D และกล่องเท่ากัน) */
        /* ========================================================================= */
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 min-w-0 max-w-full">
          {/* Left Section: Purple Zones B, C, D, E, F (12 bays high) */}
          <div className="xl:col-span-7 bg-slate-50 p-4 rounded-xl border border-slate-200 overflow-x-auto min-w-0">
            <div className="flex items-center justify-between mb-3 min-w-[480px]">
              <span className="text-xs font-bold text-blue-700 flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <span>ZONE B - F (Capacity: 480 Pallets)</span>
              </span>
              <span className="text-[11px] text-slate-500 font-medium">12 Bays x 4 Shelf Levels (ชั้น 1-4)</span>
            </div>

            <div className="grid grid-cols-5 gap-2.5 min-w-[480px]">
            {purpleZones.map((zone) => (
              <div key={zone} className="space-y-2">
                <div className="text-center font-bold text-xs text-blue-800 bg-blue-100/80 py-1 rounded-md border border-blue-200">
                  Rack {zone}
                </div>
                {/* Render bays 12 down to 1 */}
                {Array.from({ length: 12 }, (_, i) => 12 - i).map((bayNum) => {
                  const { occupiedLevelsCount, totalQty, hasAgingAlert, mainModel, matchesSearch, matchedItemCode, matchedQty } = getBayInfo(zone, bayNum);
                  const isOccupied = occupiedLevelsCount > 0;

                  // Filter logic
                  if (filterType === 'OCCUPIED' && !isOccupied) return null;
                  if (filterType === 'AGING' && !hasAgingAlert) return null;

                  const isDimmed = !matchesSearch && activeQuery !== '';
                  const isMatchHighlight = matchesSearch && activeQuery !== '';

                  if (activeQuery !== '' && dimMode === 'HIDE' && isDimmed) return null;

                  return (
                    <div
                      key={`${zone}${bayNum}`}
                      onMouseMove={(e) => !isDimmed && handleBayMouseMove(e, zone, bayNum)}
                      onMouseEnter={(e) => !isDimmed && handleBayMouseMove(e, zone, bayNum)}
                      onMouseLeave={handleBayMouseLeave}
                      onClick={() => !isDimmed && onSelectBay(zone, bayNum)}
                      className={`group relative rounded-lg p-2.5 border text-left transition-all duration-200 shadow-sm h-[78px] flex flex-col justify-between ${
                        isDimmed ? 'opacity-15 grayscale blur-[0.2px] cursor-not-allowed bg-slate-200 border-slate-300' : 'cursor-pointer transform hover:-translate-y-0.5 hover:shadow-md'
                      } ${
                        isMatchHighlight
                          ? getPNoHeatmapBg(matchedQty)
                          : viewMode === 'HEATMAP'
                          ? getDensityHeatmapBg(totalQty)
                          : hasAgingAlert
                          ? 'bg-amber-50 border-amber-300 hover:border-amber-400'
                          : isOccupied
                          ? 'bg-white border-blue-200 hover:border-blue-500 shadow-sm'
                          : 'bg-white/60 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-extrabold text-sm ${isMatchHighlight ? 'text-white' : 'text-slate-800 group-hover:text-blue-600'}`}>
                          {zone}{bayNum}
                        </span>
                        {isMatchHighlight ? (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-950/80 text-emerald-300 border border-emerald-400/50 shadow-xs">
                            🎯 {matchedQty} U
                          </span>
                        ) : hasAgingAlert ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                        ) : isOccupied ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            {occupiedLevelsCount}/4 ชั้น
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium">ว่าง</span>
                        )}
                      </div>

                      {/* Item info preview */}
                      <div className="mt-0.5 leading-tight">
                        {isOccupied ? (
                          <>
                            <p className={`text-[10px] font-mono font-bold truncate ${isMatchHighlight ? 'text-amber-200' : 'text-blue-800'}`}>
                              {matchedItemCode || mainModel || 'In Stock'}
                            </p>
                            <p className={`text-[10px] font-bold ${isMatchHighlight ? 'text-white' : 'text-slate-600'}`}>
                              {isMatchHighlight ? matchedQty.toLocaleString() : totalQty.toLocaleString()} <span className={isMatchHighlight ? 'text-slate-200 font-normal' : 'text-slate-400 font-normal'}>Units</span>
                            </p>
                          </>
                        ) : (
                          <p className="text-[10px] text-slate-400 italic">0 Units</p>
                        )}
                      </div>

                      {/* Quick 3D trigger button on hover */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpen3D(zone, bayNum);
                        }}
                        className={`mt-1 w-full py-0.5 rounded font-bold text-[9px] flex items-center justify-center space-x-1 shadow-xs transition-colors ${
                          isMatchHighlight
                            ? 'bg-slate-950/80 hover:bg-slate-900 text-emerald-300 border border-emerald-400/40'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        <Layers className="w-2.5 h-2.5" />
                        <span>ส่อง 3D (4 ชั้น)</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Right Section: Orange Zones G, H, I, J, K (5 bays high) */}
        <div className="xl:col-span-5 space-y-6 min-w-0">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 overflow-x-auto min-w-0">
            <div className="flex items-center justify-between mb-3 min-w-[360px]">
              <span className="text-xs font-bold text-indigo-700 flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                <span>ZONE G - K (Capacity: 200 Pallets)</span>
              </span>
              <span className="text-[11px] text-slate-500 font-medium">5 Bays x 4 Levels</span>
            </div>

            <div className="grid grid-cols-5 gap-2.5 min-w-[360px]">
              {orangeZones.map((zone) => (
                <div key={zone} className="space-y-2">
                  <div className="text-center font-bold text-xs text-indigo-800 bg-indigo-100/80 py-1 rounded-md border border-indigo-200">
                    Rack {zone}
                  </div>
                  {/* Render bays 5 down to 1 */}
                  {Array.from({ length: 5 }, (_, i) => 5 - i).map((bayNum) => {
                    const { occupiedLevelsCount, totalQty, hasAgingAlert, mainModel, matchesSearch, matchedItemCode, matchedQty } = getBayInfo(zone, bayNum);
                    const isOccupied = occupiedLevelsCount > 0;

                    if (filterType === 'OCCUPIED' && !isOccupied) return null;
                    if (filterType === 'AGING' && !hasAgingAlert) return null;

                    const isDimmed = !matchesSearch && activeQuery !== '';
                    const isMatchHighlight = matchesSearch && activeQuery !== '';

                    if (activeQuery !== '' && dimMode === 'HIDE' && isDimmed) return null;

                    return (
                      <div
                        key={`${zone}${bayNum}`}
                        onMouseMove={(e) => !isDimmed && handleBayMouseMove(e, zone, bayNum)}
                        onMouseEnter={(e) => !isDimmed && handleBayMouseMove(e, zone, bayNum)}
                        onMouseLeave={handleBayMouseLeave}
                        onClick={() => !isDimmed && onSelectBay(zone, bayNum)}
                        className={`group relative rounded-lg p-2.5 border text-left transition-all duration-200 shadow-sm h-[78px] flex flex-col justify-between ${
                          isDimmed ? 'opacity-15 grayscale blur-[0.2px] cursor-not-allowed bg-slate-200 border-slate-300' : 'cursor-pointer transform hover:-translate-y-0.5 hover:shadow-md'
                        } ${
                          isMatchHighlight
                            ? getPNoHeatmapBg(matchedQty)
                            : viewMode === 'HEATMAP'
                            ? getDensityHeatmapBg(totalQty)
                            : hasAgingAlert
                            ? 'bg-amber-50 border-amber-300 hover:border-amber-400'
                            : isOccupied
                            ? 'bg-white border-indigo-200 hover:border-indigo-500 shadow-sm'
                            : 'bg-white/60 border-slate-200 hover:border-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`font-extrabold text-xs ${isMatchHighlight ? 'text-white' : 'text-slate-800 group-hover:text-indigo-600'}`}>
                            {zone}{bayNum}
                          </span>
                          {isMatchHighlight ? (
                            <span className="text-[8px] font-black px-1 py-0.2 rounded bg-slate-950/80 text-emerald-300">
                              🎯 {matchedQty} U
                            </span>
                          ) : isOccupied ? (
                            <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {occupiedLevelsCount}/4
                            </span>
                          ) : (
                            <span className="text-[9px] text-slate-400">ว่าง</span>
                          )}
                        </div>

                        <div className="mt-0.5 leading-tight">
                          {isOccupied ? (
                            <>
                              <p className={`text-[9px] font-mono font-bold truncate ${isMatchHighlight ? 'text-amber-200' : 'text-indigo-800'}`}>
                                {matchedItemCode || mainModel}
                              </p>
                              <p className={`text-[9px] font-bold ${isMatchHighlight ? 'text-white' : 'text-slate-700'}`}>
                                {isMatchHighlight ? matchedQty.toLocaleString() : totalQty.toLocaleString()} U
                              </p>
                            </>
                          ) : (
                            <p className="text-[9px] text-slate-400 italic">0 Units</p>
                          )}
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpen3D(zone, bayNum);
                          }}
                          className={`mt-1 w-full py-0.5 rounded font-bold text-[9px] flex items-center justify-center space-x-1 shadow-xs transition-colors ${
                            isMatchHighlight
                              ? 'bg-slate-950/80 hover:bg-slate-900 text-emerald-300 border border-emerald-400/40'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          }`}
                        >
                          <Layers className="w-2.5 h-2.5" />
                          <span>ดู 3D</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Color Legend & Visual Key */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-3">
            <div className="font-bold text-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Info className="w-4 h-4 text-blue-600" />
                <span>คำอธิบายสัญลักษณ์ {viewMode === 'HEATMAP' ? '🔥 Density Heatmap Intensity' : 'และคำแนะนำการจัดเก็บ'}</span>
              </div>
            </div>

            {viewMode === 'HEATMAP' ? (
              <div className="space-y-2 pt-1">
                <div className="text-[11px] font-semibold text-slate-600">
                  ระดับความหนาแน่นจำนวนสินค้าในแต่ละช่อง (Density Intensity Spectrum):
                </div>
                <div className="grid grid-cols-5 gap-1.5 text-center text-[10px] font-bold">
                  <div className="p-1.5 bg-slate-100 border border-slate-300 text-slate-600 rounded">0 Units (ว่าง)</div>
                  <div className="p-1.5 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded">1 - 150 Units</div>
                  <div className="p-1.5 bg-yellow-100 border border-yellow-300 text-yellow-900 rounded">151 - 350 Units</div>
                  <div className="p-1.5 bg-amber-200 border border-amber-400 text-amber-950 rounded">351 - 600 Units</div>
                  <div className="p-1.5 bg-red-400 border border-red-600 text-white rounded">601+ Units (หนาแน่นสูง)</div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded bg-blue-600 border border-blue-400" />
                  <span className="text-slate-700">Rack B-F (480 Pallets)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded bg-indigo-600 border border-indigo-400" />
                  <span className="text-slate-700">Rack G-K (200 Pallets)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded bg-amber-500 border border-amber-400 animate-pulse" />
                  <span className="text-amber-700 font-semibold">มีเตือน Aging (&gt;30 วัน)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded bg-white border border-slate-300" />
                  <span className="text-slate-500">ช่องว่าง (Empty Level)</span>
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600 leading-relaxed">
              💡 <span className="text-blue-600 font-semibold">ฟีเจอร์ 3D:</span> แต่ละช่อง Rack (เช่น E6) จะประกอบด้วย <span className="text-slate-900 font-bold">4 ชั้นความสูง (ชั้น 1, ชั้น 2, ชั้น 3, ชั้น 4)</span> เพื่อกระจายน้ำหนักและจัดเก็บ Pallet ได้อย่างแม่นยำ Click ที่ช่องใดก็ได้เพื่อเปิด 3D Mode!
            </div>
          </div>
        </div>
      </div>
      )}

      {/* ========================================================================= */}
      {/* 🚀 SMART MOUSE CURSOR HOVER POPUP (แสดงข้อมูล 4 ชั้น ข้างเมาส์ทันทีที่ชี้) */}
      {/* ========================================================================= */}
      {hoveredBay && (() => {
        const { zone, bayNumber, x, y } = hoveredBay;
        const bayItems = items.filter((it) => it.zone === zone && it.bayNumber === bayNumber);
        const totalQty = bayItems.reduce((acc, curr) => acc + curr.quantity, 0);
        const occupiedCount = bayItems.length;
        const isFull = occupiedCount === 4;
        const hasAging = bayItems.some((it) => it.agingDays > 30);

        // Smart dynamic positioning to prevent overflowing viewport edges
        const popupWidth = 340;
        const popupHeight = 360;
        const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
        const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

        let leftPos = x + 16;
        if (leftPos + popupWidth > screenWidth - 16) {
          leftPos = Math.max(10, x - popupWidth - 16);
        }

        let topPos = y - 40;
        if (topPos + popupHeight > screenHeight - 16) {
          topPos = Math.max(10, screenHeight - popupHeight - 16);
        }
        if (topPos < 10) topPos = 10;

        return (
          <div
            style={{
              position: 'fixed',
              left: `${leftPos}px`,
              top: `${topPos}px`,
              width: `${popupWidth}px`,
              pointerEvents: 'none',
              zIndex: 9999
            }}
            className="bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/80 rounded-2xl shadow-2xl p-4 animate-fadeIn transition-all duration-75 select-none"
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-700/80 pb-2.5 mb-2.5">
              <div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 rounded-md font-mono font-black text-xs ${
                    purpleZones.includes(zone) ? 'bg-blue-600 text-white' : 'bg-indigo-600 text-white'
                  }`}>
                    RACK {zone} - BAY {bayNumber}
                  </span>
                  {hasAging && (
                    <span className="flex items-center space-x-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold animate-pulse">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Aging &gt; 30d</span>
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 font-mono">
                  Locator Range: {zone}{bayNumber}-L1 ~ {zone}{bayNumber}-L4
                </p>
              </div>

              <div className="text-right">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isFull ? 'bg-red-500/20 text-red-300 border border-red-500/40' :
                  occupiedCount > 0 ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' :
                  'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}>
                  {occupiedCount}/4 ชั้น ({Math.round((occupiedCount / 4) * 100)}%)
                </span>
                <p className="text-xs font-black text-white mt-1">
                  {totalQty.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">Units</span>
                </p>
              </div>
            </div>

            {/* 4 Shelf Levels Breakdown (Level 4 down to Level 1) */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>รายละเอียดแยกตามชั้นวาง (4 Levels)</span>
                <span className="text-slate-500">บน ⬇ ล่าง</span>
              </div>

              {[4, 3, 2, 1].map((lvl) => {
                const itemAtLevel = bayItems.find((it) => it.level === lvl);
                const isTop = lvl === 4;
                const isBottom = lvl === 1;

                return (
                  <div
                    key={lvl}
                    className={`p-2 rounded-lg border transition-colors ${
                      itemAtLevel
                        ? itemAtLevel.agingDays > 30
                          ? 'bg-amber-950/40 border-amber-500/40 text-amber-100'
                          : 'bg-slate-800/80 border-slate-700/60 text-slate-100'
                        : 'bg-slate-900/40 border-dashed border-slate-800 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-mono font-bold text-[11px] px-1.5 py-0.2 rounded bg-slate-700/80 text-slate-200">
                          L{lvl} {isTop ? '(บนสุด)' : isBottom ? '(ล่างสุด)' : ''}
                        </span>
                        {itemAtLevel ? (
                          <span className="font-mono font-extrabold text-blue-300 text-xs">
                            {itemAtLevel.modelHE}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">
                            [ ชั้นว่าง - พร้อมวาง Pallet ]
                          </span>
                        )}
                      </div>

                      {itemAtLevel && (
                        <div className="text-right">
                          <span className="font-mono font-black text-xs text-white">
                            {itemAtLevel.quantity.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-1">U</span>
                        </div>
                      )}
                    </div>

                    {itemAtLevel && (
                      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-700/40 pt-1">
                        <span className="truncate max-w-[170px] text-slate-300" title={itemAtLevel.partName}>
                          {itemAtLevel.partName}
                        </span>
                        <div className="flex items-center space-x-2 shrink-0">
                          <span className="bg-slate-700/50 px-1 rounded text-slate-300 font-mono">
                            {itemAtLevel.productionLine}
                          </span>
                          <span className={`font-semibold ${itemAtLevel.agingDays > 30 ? 'text-amber-400 font-bold' : 'text-slate-400'}`}>
                            ⏱ {itemAtLevel.agingDays}d
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Quick Action Hint */}
            <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center space-x-1 text-cyan-400 font-semibold">
                <Sparkles className="w-3 h-3" />
                <span>คลิกที่ช่องนี้เพื่อเปิดส่อง 3D (4 ชั้น)</span>
              </span>
              <span className="text-slate-500 font-mono">
                {zone}{bayNumber}
              </span>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
