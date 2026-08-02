import React, { useState, useEffect } from 'react';
import { InventoryItem, StorageZone } from '../types';
import { Layers, Eye, Filter, Info, ChevronRight, Package, AlertTriangle, Box, Search, X } from 'lucide-react';
import { Warehouse3DMap } from './Warehouse3DMap';

interface RackLayout2DProps {
  items: InventoryItem[];
  searchQuery?: string;
  onSelectBay: (zone: StorageZone, bayNumber: number) => void;
  onOpen3D: (zone: StorageZone, bayNumber: number) => void;
  isDashboardFullscreen?: boolean;
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
  const [dimMode, setDimMode] = useState<'DIM' | 'HIDE'>('DIM');
  const [localSearch, setLocalSearch] = useState<string>(searchQuery);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  const activeQuery = localSearch.trim();

  // Zones definition based on layout
  const purpleZones: StorageZone[] = ['B', 'C', 'D', 'E', 'F']; // 12 bays each
  const orangeZones: StorageZone[] = ['G', 'H', 'I', 'J', 'K']; // 5 bays each

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
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm text-slate-900 space-y-5 min-w-0 max-w-full">
      {/* Header controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b border-slate-200 gap-4">
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
      ) : (
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
                  const { occupiedLevelsCount, totalQty, hasAgingAlert, mainModel, matchesSearch, matchedItemCode, matchedQty, matchedCount } = getBayInfo(zone, bayNum);
                  const isOccupied = occupiedLevelsCount > 0;

                  // Filter logic
                  if (filterType === 'OCCUPIED' && !isOccupied) return null;
                  if (filterType === 'AGING' && !hasAgingAlert) return null;

                  const isDimmed = !matchesSearch && activeQuery !== '';
                  const isMatchHighlight = matchesSearch && activeQuery !== '';

                  // If user enabled 'HIDE' non-matching racks during search, skip rendering non-matching bays
                  if (activeQuery !== '' && dimMode === 'HIDE' && isDimmed) return null;

                  return (
                    <div
                      key={`${zone}${bayNum}`}
                      onClick={() => !isDimmed && onSelectBay(zone, bayNum)}
                      className={`group relative rounded-lg p-2.5 border text-left transition-all duration-200 shadow-sm ${
                        isDimmed ? 'opacity-15 grayscale blur-[0.2px] cursor-not-allowed bg-slate-200 border-slate-300' : 'cursor-pointer transform hover:-translate-y-0.5'
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
                      <div className="mt-1">
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
                        className={`mt-2 w-full py-1 rounded font-bold text-[10px] flex items-center justify-center space-x-1 shadow-sm transition-colors ${
                          isMatchHighlight
                            ? 'bg-slate-950/80 hover:bg-slate-900 text-emerald-300 border border-emerald-400/40'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        <Layers className="w-3 h-3" />
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
                    const { occupiedLevelsCount, totalQty, hasAgingAlert, mainModel, matchesSearch, matchedItemCode, matchedQty, matchedCount } = getBayInfo(zone, bayNum);
                    const isOccupied = occupiedLevelsCount > 0;

                    if (filterType === 'OCCUPIED' && !isOccupied) return null;
                    if (filterType === 'AGING' && !hasAgingAlert) return null;

                    const isDimmed = !matchesSearch && activeQuery !== '';
                    const isMatchHighlight = matchesSearch && activeQuery !== '';

                    // If user enabled 'HIDE' non-matching racks during search, skip rendering non-matching bays
                    if (activeQuery !== '' && dimMode === 'HIDE' && isDimmed) return null;

                    return (
                      <div
                        key={`${zone}${bayNum}`}
                        onClick={() => !isDimmed && onSelectBay(zone, bayNum)}
                        className={`group relative rounded-lg p-2 border text-left transition-all duration-200 shadow-sm ${
                          isDimmed ? 'opacity-15 grayscale blur-[0.2px] cursor-not-allowed bg-slate-200 border-slate-300' : 'cursor-pointer transform hover:-translate-y-0.5'
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
                          ) : null}
                        </div>

                        <div className="mt-1">
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
                          className={`mt-1.5 w-full py-1 rounded font-bold text-[9px] flex items-center justify-center space-x-1 shadow-sm transition-colors ${
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
    </div>
  );
};
