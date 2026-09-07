import React, { useState, useMemo } from 'react';
import { InventoryItem, MovementType, ShelfLevel, StorageZone } from '../../types';
import { UnifiedZoneHeader, UnifiedZoneKpiStats, ZoneFilterStatus } from './UnifiedZoneHeader';
import { UnifiedActionModal, UnifiedModalSlotInfo } from './UnifiedActionModal';
import { getAgingCategory, AGING_STYLES } from './agingColorSystem';
import { Truck, Layers, Eye } from 'lucide-react';

export interface MultiLevelRackRowConfig {
  rowCode: string; // e.g. "A", "B", "C", "D" or "Rack B", "Rack C"
  zoneId: StorageZone;
  locatorSign: string; // e.g. "DY3T-1.01" or "DA4D-2-B"
  totalBays: number; // e.g. 25 for CY3, 12 for A4 Selective Racks
  description?: string;
  hasBottomDriveway?: boolean; // Forklift road below this row
  drivewayLabel?: string;
}

export interface MultiLevelRackZoneLayoutProps {
  zoneTitle: string;
  zoneSubtitle?: string;
  locatorSign?: string;
  facilityCode?: string;
  rows: MultiLevelRackRowConfig[];
  items: InventoryItem[];
  searchQuery?: string;
  onOpenScanner: (zone: StorageZone, bay: number, level: ShelfLevel, mode: MovementType) => void;
  onRelocateItem?: (item: InventoryItem) => void;
  onOpen3D?: (zone: StorageZone, bay: number) => void;
  onNavigateBack?: () => void;
  backButtonLabel?: string;
  onPrintLabel?: (item: InventoryItem) => void;
  isDashboardFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const MultiLevelRackZoneLayout: React.FC<MultiLevelRackZoneLayoutProps> = ({
  zoneTitle,
  zoneSubtitle,
  locatorSign,
  facilityCode,
  rows,
  items,
  searchQuery = '',
  onOpenScanner,
  onRelocateItem,
  onOpen3D,
  onNavigateBack,
  backButtonLabel,
  onPrintLabel,
  isDashboardFullscreen,
  onToggleFullscreen
}) => {
  const [localSearch, setLocalSearch] = useState<string>(searchQuery);
  const [filterStatus, setFilterStatus] = useState<ZoneFilterStatus>('ALL');
  const [activeLevelFilter, setActiveLevelFilter] = useState<number | 'ALL'>('ALL');
  const [selectedRowCode, setSelectedRowCode] = useState<string>('ALL');
  const [selectedSlotForModal, setSelectedSlotForModal] = useState<UnifiedModalSlotInfo | null>(null);

  // Map items by composite key: `${zoneId}-${bay}-${level}` and by locatorCode
  const { slotItemMap, bayItemsMap } = useMemo(() => {
    const slotMap = new Map<string, InventoryItem>();
    const bayMap = new Map<string, InventoryItem[]>();

    items.forEach((it) => {
      const key = `${String(it.zone).toUpperCase()}-${it.bayNumber}-${it.level}`;
      slotMap.set(key, it);

      // Also map by locator code
      if (it.locatorCode) {
        slotMap.set(it.locatorCode.trim().toLowerCase(), it);
      }

      const bayKey = `${String(it.zone).toUpperCase()}-${it.bayNumber}`;
      const existing = bayMap.get(bayKey) || [];
      existing.push(it);
      bayMap.set(bayKey, existing);
    });

    return { slotItemMap: slotMap, bayItemsMap: bayMap };
  }, [items]);

  // Total capacity & KPI calculation
  const { totalCapacity, occupiedPallets, rowMetrics, kpiStats } = useMemo(() => {
    let capacity = 0;
    let occupied = 0;
    let overdue = 0;
    let warning = 0;
    let totalUnits = 0;
    const rowCounts: Record<string, number> = {};

    rows.forEach((row) => {
      const rowCap = row.totalBays * 4; // 4 floors per bay
      capacity += rowCap;
      let rowOcc = 0;

      for (let b = 1; b <= row.totalBays; b++) {
        for (let l = 1; l <= 4; l++) {
          const key = `${String(row.zoneId).toUpperCase()}-${b}-${l}`;
          const item = slotItemMap.get(key);
          if (item) {
            occupied++;
            rowOcc++;
            totalUnits += item.quantity || 0;
            if (item.agingDays > 27) overdue++;
            else if (item.agingDays > 21) warning++;
          }
        }
      }
      rowCounts[row.rowCode] = rowOcc;
    });

    const stats: UnifiedZoneKpiStats = {
      totalInventoryUnits: totalUnits,
      safetyStockAlertCount: items.filter(it => it.safetyStock && it.quantity <= it.safetyStock).length,
      todayScanInCount: Math.max(3, Math.round(occupied * 0.12)),
      todayScanOutCount: Math.max(1, Math.round(occupied * 0.06)),
      occupiedPallets: occupied,
      totalCapacityPallets: capacity,
      agingOverdueCount: overdue,
      agingWarningCount: warning,
      emptyPalletsCount: capacity - occupied
    };

    return {
      totalCapacity: capacity,
      occupiedPallets: occupied,
      rowMetrics: rowCounts,
      kpiStats: stats
    };
  }, [rows, items, slotItemMap]);

  // Direct click handler for an individual level (L1 - L4)
  const handleLevelClick = (
    row: MultiLevelRackRowConfig,
    bayNumber: number,
    level: ShelfLevel
  ) => {
    const key = `${String(row.zoneId).toUpperCase()}-${bayNumber}-${level}`;
    const item = slotItemMap.get(key) || null;
    const bayKey = `${String(row.zoneId).toUpperCase()}-${bayNumber}`;
    const bayItems = bayItemsMap.get(bayKey) || [];

    // Format standardized locator tag for level
    let tag = `${row.locatorSign}-${row.rowCode}${bayNumber}-L${level}`;
    if (row.locatorSign.startsWith('DA4D')) {
      tag = `${row.locatorSign}-${bayNumber}-L${level}`;
    }

    setSelectedSlotForModal({
      zoneName: `${zoneTitle} - แถว ${row.rowCode}`,
      zoneId: row.zoneId,
      bayNumber,
      level,
      locatorTag: tag,
      isRack: true,
      item,
      facilityCode,
      bayItems
    });
  };

  // Click handler for whole bay header
  const handleBayHeaderClick = (row: MultiLevelRackRowConfig, bayNumber: number) => {
    const bayKey = `${String(row.zoneId).toUpperCase()}-${bayNumber}`;
    const bayItems = bayItemsMap.get(bayKey) || [];
    const firstItem = bayItems[0] || null;

    let tag = `${row.locatorSign}-${row.rowCode}${bayNumber}-L1`;
    if (row.locatorSign.startsWith('DA4D')) {
      tag = `${row.locatorSign}-${bayNumber}-L1`;
    }

    setSelectedSlotForModal({
      zoneName: `${zoneTitle} - แถว ${row.rowCode}`,
      zoneId: row.zoneId,
      bayNumber,
      level: (firstItem?.level || 1) as ShelfLevel,
      locatorTag: tag,
      isRack: true,
      item: firstItem,
      facilityCode,
      bayItems
    });
  };

  const activeSearch = localSearch.trim().toLowerCase();
  const filteredRows = selectedRowCode === 'ALL' 
    ? rows 
    : rows.filter(r => r.rowCode === selectedRowCode);

  return (
    <div className="w-full space-y-3">
      {/* ========================================================================= */}
      {/* 1. UNIFIED HEADER & CONTROL BAR                                           */}
      {/* ========================================================================= */}
      <UnifiedZoneHeader
        zoneTitle={zoneTitle}
        zoneSubtitle={zoneSubtitle}
        locatorSign={locatorSign}
        facilityCode={facilityCode}
        stats={kpiStats}
        searchQuery={localSearch}
        onSearchChange={setLocalSearch}
        filterStatus={filterStatus}
        onFilterStatusChange={setFilterStatus}
        activeLevel={activeLevelFilter}
        onLevelChange={setActiveLevelFilter}
        onOpenQuickScanner={() => onOpenScanner(rows[0]?.zoneId || 'B', 1, 1, 'IN')}
        isFullscreen={isDashboardFullscreen}
        onToggleFullscreen={onToggleFullscreen}
        onNavigateBack={onNavigateBack}
        backButtonLabel={backButtonLabel}
        isRackZone={true}
      />

      {/* Row Quick Selector Pills (e.g. All, Row A, Row B...) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <span className="text-xs font-bold text-slate-400 shrink-0">เลือกแถวแร็ค:</span>
        <button
          onClick={() => setSelectedRowCode('ALL')}
          className={`h-7 px-3 rounded-lg text-xs font-bold transition-all shrink-0 ${
            selectedRowCode === 'ALL'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
          }`}
        >
          ทุกแถว ({rows.length} แถว)
        </button>

        {rows.map((r) => {
          const occ = rowMetrics[r.rowCode] || 0;
          const cap = r.totalBays * 4;
          const isSel = selectedRowCode === r.rowCode;
          return (
            <button
              key={r.rowCode}
              onClick={() => setSelectedRowCode(isSel ? 'ALL' : r.rowCode)}
              className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                isSel
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <span>{r.rowCode}</span>
              <span className="text-[10px] font-mono opacity-80">
                ({occ}/{cap}P)
              </span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 2. 4-TIER VERTICAL STACK RACK ROWS (Template 2: MultiLevelRackZoneLayout)  */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        {filteredRows.map((row) => {
          const rowCapacity = row.totalBays * 4;
          const rowOccupied = rowMetrics[row.rowCode] || 0;

          return (
            <React.Fragment key={row.rowCode}>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4 shadow-xl space-y-3">
                
                {/* Row Master Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    {/* Row Badge */}
                    <div className="w-8 h-8 rounded-lg bg-[#002060] border border-blue-400/60 flex items-center justify-center text-white font-black text-sm shadow-md shrink-0">
                      {row.rowCode.length > 2 ? row.rowCode.replace(/[^A-Za-z0-9]/g, '').slice(-2) : row.rowCode}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-black text-white">
                          แร็คแถว {row.rowCode}
                        </h3>
                        <span className="text-xs font-mono font-bold text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-500/30">
                          X 4 Floor
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {row.description || `${row.totalBays} ช่องเสา x 4 ชั้น = ${rowCapacity} พาเลท`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block leading-none">ความจุแถว:</span>
                      <span className="text-xs font-mono font-bold text-slate-200">
                        {rowOccupied} / {rowCapacity} P
                      </span>
                    </div>

                    <div className="bg-[#002060] border border-blue-400/50 text-white rounded-lg px-2.5 py-1 text-center shadow-md">
                      <span className="text-[10px] text-blue-200 block font-sans">Locator Tag:</span>
                      <span className="font-mono font-black text-xs tracking-tight block">
                        {row.locatorSign}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Horizontal Scrollable Rack Bays Container */}
                <div className="overflow-x-auto pb-2 pt-1">
                  <div 
                    className="grid gap-2"
                    style={{
                      gridTemplateColumns: `repeat(${row.totalBays}, minmax(130px, 1fr))`,
                      minWidth: `${row.totalBays * 138}px`
                    }}
                  >
                    {Array.from({ length: row.totalBays }, (_, idx) => {
                      const bayNum = idx + 1;
                      const bayKey = `${String(row.zoneId).toUpperCase()}-${bayNum}`;
                      const bayItems = bayItemsMap.get(bayKey) || [];
                      const bayOccupiedCount = bayItems.length; // 0 to 4
                      const isBayFull = bayOccupiedCount === 4;
                      const isBayEmpty = bayOccupiedCount === 0;

                      // Check if bay matches search query
                      const isSearchMatch = activeSearch && (
                        bayItems.some(it => 
                          it.modelHE.toLowerCase().includes(activeSearch) ||
                          it.partName.toLowerCase().includes(activeSearch) ||
                          it.locatorCode.toLowerCase().includes(activeSearch)
                        ) ||
                        `${row.rowCode}${bayNum}`.toLowerCase().includes(activeSearch) ||
                        `bay ${bayNum}`.toLowerCase().includes(activeSearch)
                      );

                      // Check filter status
                      if (filterStatus === 'OCCUPIED' && isBayEmpty) return <div key={bayNum} className="opacity-20" />;
                      if (filterStatus === 'EMPTY' && !isBayEmpty) return <div key={bayNum} className="opacity-20" />;
                      if (filterStatus === 'AGING' && !bayItems.some(it => it.agingDays > 21)) return <div key={bayNum} className="opacity-20" />;

                      return (
                        <div
                          key={bayNum}
                          className={`bg-slate-950/90 rounded-xl border p-1.5 flex flex-col justify-between transition-all space-y-1.5 ${
                            isSearchMatch
                              ? 'ring-2 ring-amber-400 border-amber-300 shadow-xl bg-amber-950/20 scale-102 z-10'
                              : 'border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {/* Bay Header: Bay Number + Occupancy Badge */}
                          <button
                            type="button"
                            onClick={() => handleBayHeaderClick(row, bayNum)}
                            className={`w-full py-1 px-1.5 rounded-lg flex items-center justify-between text-xs font-mono font-black transition-colors ${
                              isBayFull
                                ? 'bg-blue-600 text-white'
                                : bayOccupiedCount > 0
                                ? 'bg-blue-900/60 text-blue-200 hover:bg-blue-800'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                            title={`Bay ${row.rowCode}${bayNum} (${bayOccupiedCount}/4 ชั้น)`}
                          >
                            <span>Bay {String(bayNum).padStart(2, '0')}</span>
                            <span className="text-[10px] px-1 py-0.2 rounded bg-black/30 font-bold">
                              {bayOccupiedCount}/4 L
                            </span>
                          </button>

                          {/* ========================================================= */}
                          {/* 4 VERTICAL STACKED LEVELS: L4 -> L3 -> L2 -> L1           */}
                          {/* Large Touch Target (36px - 40px height) for Mobile/Tablet */}
                          {/* ========================================================= */}
                          <div className="w-full flex flex-col gap-1.5">
                            {([4, 3, 2, 1] as const).map((lvl) => {
                              const slotKey = `${String(row.zoneId).toUpperCase()}-${bayNum}-${lvl}`;
                              const lvlItem = slotItemMap.get(slotKey) || null;
                              const isOccupied = !!lvlItem;
                              const agingCat = getAgingCategory(lvlItem);
                              const agingStyle = AGING_STYLES[agingCat];

                              // Level filter dimming
                              const isLevelFiltered = activeLevelFilter !== 'ALL' && activeLevelFilter !== lvl;

                              return (
                                <button
                                  key={lvl}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleLevelClick(row, bayNum, lvl);
                                  }}
                                  className={`w-full min-h-[38px] sm:min-h-[42px] px-2 py-1 rounded-lg border text-left flex items-center justify-between transition-all select-none transform active:scale-95 cursor-pointer shadow-xs ${
                                    isLevelFiltered
                                      ? 'opacity-25 grayscale'
                                      : ''
                                  } ${agingStyle.bgClass} ${agingStyle.borderClass} ${agingStyle.hoverClass}`}
                                  title={`คลิกสแกนชั้น L${lvl} (Bay ${row.rowCode}${bayNum}) | ${isOccupied ? `${lvlItem.modelHE} (${lvlItem.quantity} ชิ้น, Aging ${lvlItem.agingDays} วัน)` : 'ว่าง (Empty)'}`}
                                >
                                  {/* Left: Level Tag (L4, L3, L2, L1) */}
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className={`text-[11px] font-mono font-black leading-none ${agingStyle.textClass}`}>
                                      L{lvl}
                                    </span>
                                  </div>

                                  {/* Center: Model HE Code or 'ว่าง' */}
                                  <div className="flex-1 px-1.5 overflow-hidden text-center truncate">
                                    {isOccupied ? (
                                      <span className={`text-[10px] sm:text-[11px] font-mono font-black tracking-tight truncate block ${agingStyle.textClass}`}>
                                        {lvlItem.modelHE}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 font-sans block truncate">
                                        ว่าง
                                      </span>
                                    )}
                                  </div>

                                  {/* Right: Pallet Badge or Status */}
                                  <div className="shrink-0 text-right">
                                    {isOccupied ? (
                                      <span className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded leading-none block ${
                                        agingCat === 'WARNING' ? 'bg-black/20 text-slate-950' : 'bg-black/30 text-white'
                                      }`}>
                                        {lvlItem.fullPallets ? `${lvlItem.fullPallets}P` : '1P'}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-mono text-slate-500 font-bold block">
                                        —
                                      </span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Forklift Driveway / Road marking between rows */}
              {row.hasBottomDriveway && (
                <div className="w-full bg-slate-950/80 border-y-2 border-dashed border-amber-500/60 py-2.5 px-4 rounded-xl flex items-center justify-between text-amber-300 font-bold text-xs shadow-inner">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-amber-400" />
                    <span>{row.drivewayLabel || 'ทางวิ่งรถยก Forklift Aisle (ความกว้าง 4.0 ม. &bull; จำกัดความเร็ว ≤ 10 km/h)'}</span>
                  </div>
                  <span className="text-[10px] font-mono text-amber-400/80 uppercase tracking-widest hidden sm:inline">
                    FORKLIFT LANE ONLY
                  </span>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 3. UNIFIED ACTION MODAL                                                    */}
      {/* ========================================================================= */}
      <UnifiedActionModal
        isOpen={!!selectedSlotForModal}
        onClose={() => setSelectedSlotForModal(null)}
        slotInfo={selectedSlotForModal}
        onOpenScanner={onOpenScanner}
        onRelocateItem={onRelocateItem}
        onOpen3D={onOpen3D}
        onPrintLabel={onPrintLabel}
      />
    </div>
  );
};
