import React, { useState, useMemo } from 'react';
import { InventoryItem, MovementType, StorageZone, ShelfLevel } from '../types';
import { UnifiedSlotModal, UnifiedSlotData } from './UnifiedSlotModal';
import { SlotMiniStatsOverlay, MiniStatsSlotData } from './SlotMiniStatsOverlay';
import { WarehouseSlotFilter } from './common/WarehouseSlotFilter';
import { useTranslation } from '../i18n/i18nContext';
import { 
  Box, 
  Search, 
  Layers, 
  MapPin, 
  QrCode, 
  ArrowLeftRight, 
  CheckCircle2, 
  AlertTriangle, 
  Grid, 
  Filter, 
  ChevronRight, 
  Building2, 
  TrendingDown,
  Info,
  Maximize2,
  Minimize2,
  Clock,
  ChevronDown,
  X,
  ArrowLeft,
  ArrowRight,
  LayoutGrid
} from 'lucide-react';

interface DA4D1FloorStagingMapProps {
  items: InventoryItem[];
  searchQuery?: string;
  onOpenScanner?: (zone: StorageZone, bay: number, level: ShelfLevel, mode: MovementType) => void;
  onRelocateItem?: (item: InventoryItem) => void;
  onNavigateToRack?: () => void;
  onNavigateToCampus?: () => void;
  onToggleFullscreen?: () => void;
  isDashboardFullscreen?: boolean;
}

// X Groups metadata definition according to Image 2 (MCS Heat Exchanger Inventory Layout)
// Bottom block: X1 to X4 (7 columns, 6 rows each = 42 slots x 4 = 168 Pallets)
// Top block: X5 to X8 (12 columns: X8 has 4 rows = 48P, X7-X5 have 6 rows = 72P each -> 48 + 72 + 72 + 72 = 264 Pallets)
// Total Capacity = 168 + 264 = 432 Pallets
export const DA4D1_GROUPS = [
  {
    id: 'X8',
    label: 'Group X8',
    rowCode: '1212',
    startRow: 43,
    endRow: 46,
    columns: 12,
    slotsPerGroup: 48,
    block: 'TOP',
    locatorPrefix: 'DA4D-1.01-X8'
  },
  {
    id: 'X7',
    label: 'Group X7',
    rowCode: '1211',
    startRow: 37,
    endRow: 42,
    columns: 12,
    slotsPerGroup: 72,
    block: 'TOP',
    locatorPrefix: 'DA4D-1.01-X7'
  },
  {
    id: 'X6',
    label: 'Group X6',
    rowCode: '1210',
    startRow: 31,
    endRow: 36,
    columns: 12,
    slotsPerGroup: 72,
    block: 'TOP',
    locatorPrefix: 'DA4D-1.01-X6'
  },
  {
    id: 'X5',
    label: 'Group X5',
    rowCode: '1209',
    startRow: 25,
    endRow: 30,
    columns: 12,
    slotsPerGroup: 72,
    block: 'TOP',
    locatorPrefix: 'DA4D-1.01-X5'
  },
  {
    id: 'X4',
    label: 'Group X4',
    rowCode: '1208',
    startRow: 19,
    endRow: 24,
    columns: 7,
    slotsPerGroup: 42,
    block: 'BOTTOM',
    locatorPrefix: 'DA4D-1.01-X4'
  },
  {
    id: 'X3',
    label: 'Group X3',
    rowCode: '1207',
    startRow: 13,
    endRow: 18,
    columns: 7,
    slotsPerGroup: 42,
    block: 'BOTTOM',
    locatorPrefix: 'DA4D-1.01-X3'
  },
  {
    id: 'X2',
    label: 'Group X2',
    rowCode: '1206',
    startRow: 7,
    endRow: 12,
    columns: 7,
    slotsPerGroup: 42,
    block: 'BOTTOM',
    locatorPrefix: 'DA4D-1.01-X2'
  },
  {
    id: 'X1',
    label: 'Group X1',
    rowCode: '1205',
    startRow: 1,
    endRow: 6,
    columns: 7,
    slotsPerGroup: 42,
    block: 'BOTTOM',
    locatorPrefix: 'DA4D-1.01-X1'
  }
];

export const DA4D1FloorStagingMap: React.FC<DA4D1FloorStagingMapProps> = ({
  items,
  searchQuery = '',
  onOpenScanner,
  onRelocateItem,
  onNavigateToRack,
  onNavigateToCampus,
  onToggleFullscreen,
  isDashboardFullscreen
}) => {
  const { t } = useTranslation();
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<'ALL' | 'TOP' | 'BOTTOM' | string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OCCUPIED' | 'EMPTY' | 'AGING'>('ALL');
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState<boolean>(false);
  const [localSearch, setLocalSearch] = useState<string>('');
  
  // Selected slot detail modal
  const [selectedSlot, setSelectedSlot] = useState<{
    groupId: string;
    rowNumber: number;
    colNumber: number;
    locatorCode: string;
    item: InventoryItem | null;
  } | null>(null);

  // Hover state for Mini-Stats Overlay
  const [hoveredSlot, setHoveredSlot] = useState<{
    groupId: string;
    rowNumber: number;
    colNumber: number;
    locatorCode: string;
    item: InventoryItem | null;
    x: number;
    y: number;
  } | null>(null);

  const activeSearch = searchQuery || localSearch;

  // Helper to find item at a specific row and column in DA4D-1
  const getItemAtSlot = (groupId: string, rowNum: number, colNum: number): InventoryItem | undefined => {
    const formattedCol = String(colNum).padStart(2, '0');
    const exactLocatorRow = `DA4D-1-R${rowNum}-${formattedCol}`;
    const exactLocatorGroup = `DA4D-1-${groupId}-${formattedCol}`;
    const altLocator1 = `DA4D-1.01-${groupId}-${formattedCol}`;
    const altLocator2 = `DA4D-1.01-${groupId}`;

    return items.find(it => {
      // 1. Check exact locator code match
      if (
        it.locatorCode === exactLocatorRow ||
        it.locatorCode === exactLocatorGroup ||
        it.locatorCode === altLocator1 ||
        (it.locatorCode.includes(`-R${rowNum}-`) && it.locatorCode.endsWith(`-${formattedCol}`))
      ) {
        return true;
      }
      // 2. Check zone / bay match (e.g., zone = 'X2', bayNumber = 6)
      if (it.zone === groupId && it.bayNumber === colNum) {
        return true;
      }
      return false;
    });
  };

  // Search filter helper
  const isMatchSearch = (item: InventoryItem | undefined, locator: string, groupId: string, rowNum: number) => {
    if (!activeSearch.trim()) return true;
    const q = activeSearch.toLowerCase().trim();
    if (locator.toLowerCase().includes(q)) return true;
    if (groupId.toLowerCase().includes(q)) return true;
    if (`r${rowNum}`.includes(q)) return true;
    if (!item) return false;
    return (
      item.modelHE.toLowerCase().includes(q) ||
      item.partName.toLowerCase().includes(q) ||
      item.useLine.toLowerCase().includes(q) ||
      (item.remark && item.remark.toLowerCase().includes(q))
    );
  };

  // Calculate statistics for DA4D-1 (432 Pallet total capacity)
  const stats = useMemo(() => {
    const totalSlots = 432;
    let occupiedSlots = 0;
    let agingCount = 0;
    let totalQty = 0;

    DA4D1_GROUPS.forEach(g => {
      for (let r = g.startRow; r <= g.endRow; r++) {
        for (let c = 1; c <= g.columns; c++) {
          const it = getItemAtSlot(g.id, r, c);
          if (it) {
            occupiedSlots++;
            totalQty += it.quantity;
            if (it.agingDays > 30 || it.agingStatus === 'WARNING' || it.agingStatus === 'OVERDUE') {
              agingCount++;
            }
          }
        }
      }
    });

    return {
      totalSlots,
      occupiedSlots,
      emptySlots: totalSlots - occupiedSlots,
      utilizationRate: Math.round((occupiedSlots / totalSlots) * 100),
      agingCount,
      totalQty
    };
  }, [items]);

  // Filter groups
  const filteredGroups = DA4D1_GROUPS.filter(g => {
    if (selectedGroupFilter === 'ALL') return true;
    if (selectedGroupFilter === 'TOP') return g.block === 'TOP';
    if (selectedGroupFilter === 'BOTTOM') return g.block === 'BOTTOM';
    return g.id === selectedGroupFilter;
  });

  return (
    <div className="space-y-2">
      {/* ENTERPRISE PRIMARY TOOLBAR: ROW 1 (NAVIGATION + SEARCH) */}
      <div className="h-9 px-2 sm:px-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white shadow-xs flex items-center justify-between gap-1.5 overflow-x-auto">
        <div className="flex items-center gap-2 shrink-0">
          {onNavigateToCampus && (
            <button
              onClick={onNavigateToCampus}
              className="h-[26px] px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1 shrink-0 transition-colors"
              title={t('navigation.campusBlueprint')}
            >
              <ArrowLeft className="w-3 h-3 text-slate-400" />
              <span className="hidden sm:inline">{t('navigation.campusBlueprint')}</span>
            </button>
          )}

          {/* Page Title & Capacity Badge */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[12px] sm:text-[13px] font-black tracking-tight text-white whitespace-nowrap">
              {t('navigation.a4Staging')}
            </span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded">
              432P
            </span>
          </div>
        </div>

        {/* Right: Inline Search Box */}
        <div className="relative w-full max-w-[220px] h-[26px] shrink-0 flex items-center ml-auto">
          <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={t('common.searchPlaceholder')}
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full h-[26px] bg-slate-800 border border-slate-700 text-white placeholder-slate-400 text-[11px] rounded-md pl-6.5 pr-6 focus:outline-none focus:border-amber-400 transition-colors"
          />
          {localSearch && (
            <button
              onClick={() => setLocalSearch('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-white"
              title={t('common.filter')}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* ENTERPRISE SECONDARY TOOLBAR: ROW 2 (BLOCKS + STATUS + STATS) */}
      <div className="h-[34px] px-2 sm:px-2.5 bg-slate-900/95 border border-slate-800 rounded-lg text-white shadow-xs flex items-center justify-between gap-1.5 overflow-x-auto">
        
        {/* Left Group: Block Selector + Status Selector + Column Dropdown */}
        <div className="flex items-center gap-1.5 shrink-0">
          
          {/* Block Selector: Single Segmented Group (H: 26px, Font: 11px, Pad: 2px 8px) */}
          <div className="inline-flex items-center bg-slate-800 p-0.5 rounded-md border border-slate-700 h-[26px] shrink-0">
            <button
              onClick={() => setSelectedGroupFilter('ALL')}
              className={`h-[22px] px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                selectedGroupFilter === 'ALL'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              {t('common.all')} (X1-X8)
            </button>
            <button
              onClick={() => setSelectedGroupFilter('TOP')}
              className={`h-[22px] px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                selectedGroupFilter === 'TOP'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              Top (X5-X8)
            </button>
            <button
              onClick={() => setSelectedGroupFilter('BOTTOM')}
              className={`h-[22px] px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                selectedGroupFilter === 'BOTTOM'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              Bottom (X1-X4)
            </button>
          </div>

          {/* Reusable Global Warehouse Slot Filter */}
          <WarehouseSlotFilter
            activeFilter={statusFilter}
            onFilterChange={setStatusFilter}
            counts={{
              total: stats.totalSlots,
              occupied: stats.occupiedSlots,
              empty: stats.emptySlots,
              aging: stats.agingCount,
            }}
            compact
          />

          {/* Collapsed Dropdown for Specific Column Groups X1-X8 */}
          <div className="relative inline-block text-left shrink-0">
            <button
              onClick={() => setIsGroupDropdownOpen(!isGroupDropdownOpen)}
              className={`h-[26px] px-2 py-0.5 rounded-md text-[11px] font-bold border transition-colors flex items-center gap-1 shrink-0 ${
                isGroupDropdownOpen || (selectedGroupFilter !== 'ALL' && selectedGroupFilter !== 'TOP' && selectedGroupFilter !== 'BOTTOM')
                  ? 'bg-slate-700 text-white border-amber-500 ring-1 ring-amber-500/50'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
              }`}
            >
              <span>X1-X8</span>
              <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
            </button>

            {isGroupDropdownOpen && (
              <div className="absolute left-0 mt-1 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-2 z-40 space-y-1 text-xs">
                <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">{t('common.select')}</div>
                <div className="grid grid-cols-4 gap-1">
                  {DA4D1_GROUPS.map(g => (
                    <button
                      key={g.id}
                      onClick={() => {
                        setSelectedGroupFilter(g.id);
                        setIsGroupDropdownOpen(false);
                      }}
                      className={`h-[24px] px-1 py-0.5 rounded text-[11px] font-mono font-bold border ${
                        selectedGroupFilter === g.id
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {g.id}
                    </button>
                  ))}
                </div>
                <div className="pt-1 border-t border-slate-800 flex justify-end">
                  <button
                    onClick={() => {
                      setSelectedGroupFilter('ALL');
                      setIsGroupDropdownOpen(false);
                    }}
                    className="text-[10px] text-slate-400 hover:text-amber-300 font-bold"
                  >
                    {t('common.all')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Group: Inline Capacity Stats */}
        <div className="text-[11px] font-mono text-slate-300 shrink-0 hidden md:flex items-center gap-1.5 ml-auto">
          <span className="text-slate-400">{t('legends.occupiedSlot')}:</span>
          <span className="font-bold text-amber-300">{stats.occupiedSlots}/{stats.totalSlots}P</span>
          <span className="text-amber-400 font-bold">({stats.utilizationRate}%)</span>
        </div>
      </div>

      {/* MATRIX OF X GROUPS (TOP TO BOTTOM: X8 down to X1) */}
      <div className="bg-[#080B10] border border-slate-800 rounded-xl p-2.5 sm:p-3 shadow-xs space-y-3">
        
        {/* Top 12 Columns Indicator Header */}
        <div className="flex items-center justify-between px-1 pb-1.5 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-[11px] font-black text-slate-200">
              DA4D-1 Staging Grid
            </span>
          </div>
          <div className="flex items-center space-x-3 text-[10px] font-bold">
            <span className="flex items-center space-x-1 text-slate-400">
              <span className="w-2.5 h-2.5 bg-[#0B1017] border border-[#273244] rounded-xs inline-block" />
              <span>ว่าง</span>
            </span>
            <span className="flex items-center space-x-1 text-blue-300">
              <span className="w-2.5 h-2.5 bg-[#EAF4FF] border border-[#60A5FA] rounded-xs inline-block" />
              <span>จัดเก็บ</span>
            </span>
            <span className="flex items-center space-x-1 text-amber-300">
              <span className="w-2.5 h-2.5 bg-[#FFF4CC] border border-[#F59E0B] rounded-xs inline-block" />
              <span>Aging</span>
            </span>
            <span className="flex items-center space-x-1 text-rose-300">
              <span className="w-2.5 h-2.5 bg-[#D9043E] border border-[#FF1744] rounded-xs inline-block" />
              <span>วิกฤต/ตัวอย่าง</span>
            </span>
          </div>
        </div>

        {/* Render Groups */}
        {filteredGroups.map(group => {
          const isTopBlock = group.block === 'TOP';
          const colsCount = group.columns; // 12 or 7

          return (
            <div 
              key={group.id}
              className="bg-slate-900/90 p-2 sm:p-2.5 rounded-lg border border-slate-800 shadow-2xs space-y-1.5"
            >
              {/* Group Title Bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.2 rounded text-[10.5px] font-black bg-blue-950 text-blue-300 border border-blue-800 font-mono">
                    {group.label} ({group.rowCode})
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 font-bold">
                    Rows R{group.startRow} - R{group.endRow} • {colsCount} Cols ({group.slotsPerGroup} P)
                  </span>
                </div>
                <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-950 px-1.5 py-0.2 rounded border border-slate-800">
                  {group.locatorPrefix}
                </span>
              </div>

              {/* Column Numbers Header */}
              <div className="flex items-center pl-9 pr-1 text-center text-[9px] font-mono font-bold text-slate-500">
                {Array.from({ length: colsCount }, (_, i) => {
                  const colNum = String(i + 1).padStart(2, '0');
                  return (
                    <div key={colNum} className="flex-1">
                      <span className="px-1 py-0.2 bg-slate-950 rounded text-slate-400 border border-slate-800/80">
                        {colNum}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Rows in this group */}
              <div className="space-y-1">
                {Array.from({ length: group.endRow - group.startRow + 1 }, (_, rowIdx) => {
                  const rowNum = group.startRow + rowIdx;
                  
                  return (
                    <div key={rowNum} className="flex items-center space-x-1.5">
                      {/* Row Label (Left) */}
                      <div className="w-8 text-center font-mono font-black text-[10px] text-slate-300 bg-slate-950 py-1 rounded border border-slate-800 shrink-0">
                        R{rowNum}
                      </div>

                      {/* Columns Grid */}
                      <div className={`flex-1 grid gap-0.5 sm:gap-1 ${
                        colsCount === 12 ? 'grid-cols-12' : 'grid-cols-7'
                      }`}>
                        {Array.from({ length: colsCount }, (_, colIdx) => {
                          const colNum = colIdx + 1;
                          const formattedCol = String(colNum).padStart(2, '0');
                          const locatorCode = `DA4D-1-R${rowNum}-${formattedCol}`;
                          const item = getItemAtSlot(group.id, rowNum, colNum);
                          const isMatch = isMatchSearch(item, locatorCode, group.id, rowNum);
                          const isStatusMatch = statusFilter === 'ALL' ||
                            (statusFilter === 'OCCUPIED' && !!item) ||
                            (statusFilter === 'EMPTY' && !item) ||
                            (statusFilter === 'AGING' && item && (item.agingDays > 30 || item.agingStatus === 'WARNING' || item.agingStatus === 'OVERDUE'));
                          const isSlotActive = isMatch && isStatusMatch;

                          // Highlight exact sample from reference image 2: DA4D-1-R8-06 (Group X2, Row 8, Col 06)
                          const isDiagramRedSample = (rowNum === 8 && colNum === 6) || (item && (item.agingStatus === 'OVERDUE' || item.remark?.includes('Red Sample')));

                          return (
                            <div
                              key={colNum}
                              id={`slot-floor-r${rowNum}-c${colNum}`}
                              onClick={() => setSelectedSlot({
                                groupId: group.id,
                                rowNumber: rowNum,
                                colNumber: colNum,
                                locatorCode,
                                item: item || null
                              })}
                              onMouseEnter={(e) => {
                                setHoveredSlot({
                                  groupId: group.id,
                                  rowNumber: rowNum,
                                  colNumber: colNum,
                                  locatorCode,
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
                              title={`Locator: ${locatorCode}${item ? `\nModel: ${item.modelHE}\nQty: ${item.quantity} U\nLine: ${item.useLine}` : ' (ว่าง - คลิกเพื่อรับเข้า)'}`}
                              className={`h-7.5 sm:h-8 rounded p-0.5 flex flex-col justify-between text-left transition-all cursor-pointer relative overflow-hidden border select-none ${
                                !isSlotActive
                                  ? 'opacity-20 grayscale'
                                  : item
                                  ? isDiagramRedSample
                                    ? 'bg-[#D9043E] text-white border-[#FF1744] shadow-xs ring-1 ring-[#FF1744]/50'
                                    : item.agingDays > 30
                                    ? 'bg-[#FFF4CC] text-[#7C4A03] border-[#F59E0B] shadow-2xs'
                                    : 'bg-[#EAF4FF] text-[#0F172A] border-[#60A5FA] shadow-2xs'
                                  : 'bg-[#0B1017] border-dashed border-[#273244] text-[#667085] hover:border-[#60A5FA] hover:bg-[#111823]'
                              }`}
                            >
                              {item ? (
                                <>
                                  {/* Slot top info */}
                                  <div className="flex items-center justify-between leading-none">
                                    <span className={`text-[7.5px] font-mono font-black ${
                                      isDiagramRedSample ? 'text-rose-100' : 'text-slate-800'
                                    }`}>
                                      {formattedCol}
                                    </span>
                                    <span className={`text-[6.5px] font-mono font-black px-0.5 rounded leading-none ${
                                      isDiagramRedSample ? 'bg-rose-950 text-rose-100' : 'bg-blue-200 text-blue-950'
                                    }`}>
                                      {item.useLine}
                                    </span>
                                  </div>

                                  {/* Model HE - Compact */}
                                  <div className="w-full leading-tight truncate my-auto">
                                    <span className={`text-[7.5px] sm:text-[8px] font-mono font-black tracking-tight truncate block ${
                                      isDiagramRedSample ? 'text-white drop-shadow-2xs' : 'text-blue-950'
                                    }`}>
                                      {item.modelHE}
                                    </span>
                                  </div>

                                  {/* Qty & Aging */}
                                  <div className="flex items-center justify-between pt-0.2 border-t border-black/10 text-[7px] font-mono font-black leading-none">
                                    <span className={isDiagramRedSample ? 'text-rose-100' : 'text-slate-900'}>
                                      {item.quantity}U
                                    </span>
                                    {item.agingDays > 30 && (
                                      <span className={`text-[6px] font-bold px-0.5 rounded-full ${
                                        isDiagramRedSample ? 'bg-white text-rose-900' : 'bg-amber-200 text-amber-900'
                                      }`}>
                                        {item.agingDays}d
                                      </span>
                                    )}
                                  </div>
                                </>
                              ) : (
                                /* Empty Slot Placeholder */
                                <div className="h-full flex flex-col items-center justify-between text-slate-400 select-none">
                                  <div className="w-full text-left">
                                    <span className="text-[7.5px] font-mono font-bold text-slate-400">
                                      {formattedCol}
                                    </span>
                                  </div>
                                  <span className="text-[7px] font-sans text-slate-300 leading-none">ว่าง</span>
                                  <div className="text-[6px] font-mono text-slate-300 text-right w-full">
                                    -
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* HOVER MINI-STATS OVERLAY FOR A4 FLOOR */}
      {hoveredSlot && (
        <SlotMiniStatsOverlay
          data={{
            title: `ลานวางพื้น DA4D-1 (กลุ่ม ${hoveredSlot.groupId})`,
            locatorCode: hoveredSlot.locatorCode,
            zoneName: `อาคาร A4 • ลานพื้นสีเหลือง`,
            positionLabel: `แถว R${hoveredSlot.rowNumber} • เสา ${String(hoveredSlot.colNumber).padStart(2, '0')}`,
            item: hoveredSlot.item,
            x: hoveredSlot.x,
            y: hoveredSlot.y
          }}
        />
      )}

      {/* UNIFIED PALLET SLOT ACTION MODAL */}
      <UnifiedSlotModal
        isOpen={!!selectedSlot}
        onClose={() => setSelectedSlot(null)}
        slotData={selectedSlot ? {
          sectorType: 'FLOOR_STAGING',
          buildingName: 'อาคาร A4',
          facilityId: 'FAC-A4-MAIN',
          zoneName: `กลุ่ม ${selectedSlot.groupId} (ลานวางพื้น DA4D-1)`,
          locatorCode: selectedSlot.locatorCode,
          bayOrGroupNumber: selectedSlot.groupId,
          rowNumber: selectedSlot.rowNumber,
          columnOrRailNumber: selectedSlot.colNumber,
          item: selectedSlot.item || null,
          maxCapacityPallets: 1
        } : null}
        onOpenScanner={onOpenScanner}
        onRelocateItem={onRelocateItem}
      />
    </div>
  );
};
