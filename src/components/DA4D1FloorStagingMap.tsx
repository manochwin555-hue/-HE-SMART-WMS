import React, { useState, useMemo } from 'react';
import { InventoryItem, MovementType, StorageZone, ShelfLevel } from '../types';
import { UnifiedSlotModal, UnifiedSlotData } from './UnifiedSlotModal';
import { SlotMiniStatsOverlay, MiniStatsSlotData } from './SlotMiniStatsOverlay';
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
  Clock
} from 'lucide-react';

interface DA4D1FloorStagingMapProps {
  items: InventoryItem[];
  searchQuery?: string;
  onOpenScanner?: (zone: StorageZone, bay: number, level: ShelfLevel, mode: MovementType) => void;
  onRelocateItem?: (item: InventoryItem) => void;
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
  onRelocateItem
}) => {
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<'ALL' | 'TOP' | 'BOTTOM' | string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OCCUPIED' | 'EMPTY' | 'AGING'>('ALL');
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
    <div className="space-y-4">
      {/* Header Banner & Capacity Summary */}
      <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-yellow-500/10 border-2 border-amber-400/60 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500 text-slate-950 flex items-center space-x-1 shadow-xs">
                <Building2 className="w-3.5 h-3.5" />
                <span>A4 Building • โซนวางพื้นสีเหลือง</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                DA4D-1 (กลุ่ม X1 ถึง X8)
              </span>
              <span className="text-[11px] font-mono text-slate-600">
                รูปแบบพิกัด: <span className="text-blue-700 font-black">DA4D-1-R[Row]-[Column]</span> (เช่น <span className="text-rose-700 font-bold">DA4D-1-R8-06</span>)
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center space-x-2">
              <span>MCS Heat Exchanger Inventory Layout (ผังจัดวางพื้น DA4D-1)</span>
            </h3>
            <p className="text-xs text-slate-600 max-w-3xl">
              โครงสร้างจัดวางบนพื้นรวม 8 กลุ่ม (X1 - X8) ความจุรวม <span className="font-bold text-slate-900">432 พาเลท</span> (1 กล่อง = 1 พาเลท) แบ่งเป็นบล็อกบน X5-X8 (12 เสา) และบล็อกล่าง X1-X4 (7 เสา)
            </p>
          </div>

          {/* Area Capacity Breakdown Cards */}
          <div className="flex items-center flex-wrap gap-2 text-xs">
            <div className="bg-white border-2 border-amber-400 px-3.5 py-2 rounded-xl text-center shadow-xs min-w-[95px]">
              <span className="text-[10px] text-amber-900 block font-bold">DA4D-1 Capacity</span>
              <span className="text-base font-black text-slate-900 font-mono">432</span>
              <span className="text-[9px] text-slate-500 ml-0.5">Pallets</span>
            </div>
            <div className="bg-blue-50 border border-blue-200 px-3 py-2 rounded-xl text-center min-w-[90px]">
              <span className="text-[10px] text-blue-700 block font-bold">จัดเก็บแล้ว</span>
              <span className="text-sm font-black text-blue-900 font-mono">{stats.occupiedSlots}</span>
              <span className="text-[9px] text-blue-700 ml-0.5">({stats.utilizationRate}%)</span>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl text-center min-w-[85px]">
              <span className="text-[10px] text-emerald-700 block font-bold">ช่องว่าง</span>
              <span className="text-sm font-black text-emerald-900 font-mono">{stats.emptySlots}</span>
              <span className="text-[9px] text-emerald-700 ml-0.5">P</span>
            </div>
            {stats.agingCount > 0 && (
              <div className="bg-rose-50 border border-rose-300 px-3 py-2 rounded-xl text-center min-w-[85px] animate-pulse">
                <span className="text-[10px] text-rose-700 block font-bold">Aging Alert</span>
                <span className="text-sm font-black text-rose-900 font-mono">{stats.agingCount}</span>
                <span className="text-[9px] text-rose-700 ml-0.5">P</span>
              </div>
            )}
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="mt-4 pt-3 border-t border-amber-300/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Group Filter Chips */}
          <div className="flex items-center flex-wrap gap-1.5 font-bold">
            <span className="text-slate-600 text-[11px] mr-1">กลุ่มพื้นที่:</span>
            <button
              onClick={() => setSelectedGroupFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                selectedGroupFilter === 'ALL'
                  ? 'bg-amber-500 text-slate-950 border-amber-600 font-black shadow-xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              ทั้งหมด (X1 - X8)
            </button>
            <button
              onClick={() => setSelectedGroupFilter('TOP')}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                selectedGroupFilter === 'TOP'
                  ? 'bg-amber-500 text-slate-950 border-amber-600 font-black shadow-xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              บล็อกบน (X5-X8: 264P)
            </button>
            <button
              onClick={() => setSelectedGroupFilter('BOTTOM')}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                selectedGroupFilter === 'BOTTOM'
                  ? 'bg-amber-500 text-slate-950 border-amber-600 font-black shadow-xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              บล็อกล่าง (X1-X4: 168P)
            </button>
            {DA4D1_GROUPS.map(g => (
              <button
                key={g.id}
                onClick={() => setSelectedGroupFilter(g.id)}
                className={`px-2 py-1 rounded-lg border text-[11px] transition-all ${
                  selectedGroupFilter === g.id
                    ? 'bg-blue-600 text-white border-blue-700 font-black'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {g.id}
              </button>
            ))}
          </div>

          {/* Quick Search in DA4D-1 */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหา Model, Locator (DA4D-1-R8-06...)"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full bg-white border border-slate-300 text-slate-900 text-xs rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* MATRIX OF X GROUPS (TOP TO BOTTOM: X8 down to X1) */}
      <div className="bg-amber-50/40 border-2 border-amber-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-6">
        
        {/* Top 12 Columns Indicator Header */}
        <div className="flex items-center justify-between px-2 pb-2 border-b border-amber-200/80">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-xs font-black text-slate-800">
              DA4D-1 Floor Staging Matrix (1 Box = 1 Pallet Slot)
            </span>
          </div>
          <div className="flex items-center space-x-3 text-[11px] font-bold">
            <span className="flex items-center space-x-1 text-slate-600">
              <span className="w-3 h-3 bg-white border border-slate-300 rounded-xs inline-block" />
              <span>ว่าง</span>
            </span>
            <span className="flex items-center space-x-1 text-blue-800">
              <span className="w-3 h-3 bg-blue-100 border border-blue-400 rounded-xs inline-block" />
              <span>จัดเก็บ</span>
            </span>
            <span className="flex items-center space-x-1 text-rose-800">
              <span className="w-3 h-3 bg-rose-600 rounded-xs inline-block" />
              <span>Sample Highlight</span>
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
              className="bg-white p-3 sm:p-4 rounded-xl border border-amber-200/90 shadow-2xs space-y-2.5"
            >
              {/* Group Title Bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-black bg-amber-100 text-amber-950 border border-amber-300 font-mono">
                    {group.label} ({group.rowCode})
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 font-bold">
                    Rows R{group.startRow} - R{group.endRow} • {colsCount} Columns ({group.slotsPerGroup} Pallets)
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                  {group.locatorPrefix}
                </span>
              </div>

              {/* Column Numbers Header */}
              <div className="flex items-center pl-12 pr-2 text-center text-[10px] font-mono font-bold text-slate-500">
                {Array.from({ length: colsCount }, (_, i) => {
                  const colNum = String(i + 1).padStart(2, '0');
                  return (
                    <div key={colNum} className="flex-1">
                      <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700">
                        {colNum}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Rows in this group */}
              <div className="space-y-1.5">
                {Array.from({ length: group.endRow - group.startRow + 1 }, (_, rowIdx) => {
                  const rowNum = group.startRow + rowIdx;
                  
                  return (
                    <div key={rowNum} className="flex items-center space-x-2">
                      {/* Row Label (Left) */}
                      <div className="w-10 text-center font-mono font-black text-xs text-slate-700 bg-slate-100 py-1.5 rounded-md border border-slate-200">
                        R{rowNum}
                      </div>

                      {/* Columns Grid */}
                      <div className={`flex-1 grid gap-1 ${
                        colsCount === 12 ? 'grid-cols-12' : 'grid-cols-7'
                      }`}>
                        {Array.from({ length: colsCount }, (_, colIdx) => {
                          const colNum = colIdx + 1;
                          const formattedCol = String(colNum).padStart(2, '0');
                          const locatorCode = `DA4D-1-R${rowNum}-${formattedCol}`;
                          const item = getItemAtSlot(group.id, rowNum, colNum);
                          const isMatch = isMatchSearch(item, locatorCode, group.id, rowNum);

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
                              className={`h-16 rounded-md p-1 flex flex-col justify-between text-left transition-all cursor-pointer relative overflow-hidden border select-none ${
                                !isMatch
                                  ? 'opacity-25'
                                  : item
                                  ? isDiagramRedSample
                                    ? 'bg-rose-700 text-white border-rose-900 shadow-md ring-2 ring-rose-500/50 hover:brightness-110' // EXACT RED SAMPLE from Image 2!
                                    : item.agingDays > 30
                                    ? 'bg-amber-100 text-slate-900 border-amber-500 shadow-2xs hover:border-amber-600'
                                    : 'bg-blue-50 text-slate-900 border-blue-400 shadow-2xs hover:border-blue-600'
                                  : 'bg-slate-50/80 border-dashed border-slate-300 hover:border-amber-500 hover:bg-amber-50/50'
                              }`}
                            >
                              {item ? (
                                <>
                                  {/* Slot top info */}
                                  <div className="flex items-center justify-between">
                                    <span className={`text-[8px] font-mono font-black ${
                                      isDiagramRedSample ? 'text-rose-100' : 'text-slate-600'
                                    }`}>
                                      {formattedCol}
                                    </span>
                                    <span className={`text-[7px] font-black px-1 rounded ${
                                      isDiagramRedSample ? 'bg-rose-950 text-rose-100' : 'bg-blue-200 text-blue-900'
                                    }`}>
                                      {item.useLine}
                                    </span>
                                  </div>

                                  {/* Model HE */}
                                  <div className="leading-tight py-0.2">
                                    <p className={`text-[8px] font-mono font-extrabold truncate ${
                                      isDiagramRedSample ? 'text-white' : 'text-blue-950'
                                    }`}>
                                      {item.modelHE}
                                    </p>
                                  </div>

                                  {/* Qty & Aging */}
                                  <div className="flex items-center justify-between pt-0.5 border-t border-black/10">
                                    <span className={`text-[8px] font-mono font-black ${
                                      isDiagramRedSample ? 'text-white' : 'text-slate-900'
                                    }`}>
                                      {item.quantity}U
                                    </span>
                                    {item.agingDays > 30 && (
                                      <span className={`text-[7px] font-bold px-0.5 rounded ${
                                        isDiagramRedSample ? 'bg-white text-rose-900' : 'bg-amber-200 text-amber-900'
                                      }`}>
                                        {item.agingDays}d
                                      </span>
                                    )}
                                  </div>
                                </>
                              ) : (
                                /* Vacant slot */
                                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                  <span className="text-[9px] font-mono font-bold text-slate-300">
                                    {formattedCol}
                                  </span>
                                  <span className="text-[7px] font-semibold text-slate-400">ว่าง</span>
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
