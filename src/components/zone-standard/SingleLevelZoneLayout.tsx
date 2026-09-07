import React, { useState, useMemo } from 'react';
import { InventoryItem, MovementType, ShelfLevel, StorageZone } from '../../types';
import { UnifiedZoneHeader, UnifiedZoneKpiStats, ZoneFilterStatus } from './UnifiedZoneHeader';
import { UnifiedActionModal, UnifiedModalSlotInfo } from './UnifiedActionModal';
import { getAgingCategory, AGING_STYLES } from './agingColorSystem';

export interface SingleLevelSlotDefinition {
  id: string;
  locatorCode: string;
  displayCode: string; // e.g. "R16-01" or "X1-01"
  zone: StorageZone;
  bayNumber: number;
  groupOrRow?: string | number;
  columnNumber?: number;
}

export interface SingleLevelSectionConfig {
  id: string;
  title: string;
  subtitle?: string;
  locatorPrefix?: string;
  slots: SingleLevelSlotDefinition[];
  columns?: number; // Grid columns count, e.g. 7, 8, 12
}

export interface SingleLevelZoneLayoutProps {
  zoneTitle: string;
  zoneSubtitle?: string;
  locatorSign?: string;
  facilityCode?: string;
  sections: SingleLevelSectionConfig[];
  items: InventoryItem[];
  searchQuery?: string;
  onOpenScanner: (zone: StorageZone, bay: number, level: ShelfLevel, mode: MovementType) => void;
  onRelocateItem?: (item: InventoryItem) => void;
  onNavigateBack?: () => void;
  backButtonLabel?: string;
  onPrintLabel?: (item: InventoryItem) => void;
  isDashboardFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const SingleLevelZoneLayout: React.FC<SingleLevelZoneLayoutProps> = ({
  zoneTitle,
  zoneSubtitle,
  locatorSign,
  facilityCode,
  sections,
  items,
  searchQuery = '',
  onOpenScanner,
  onRelocateItem,
  onNavigateBack,
  backButtonLabel,
  onPrintLabel,
  isDashboardFullscreen,
  onToggleFullscreen
}) => {
  const [localSearch, setLocalSearch] = useState<string>(searchQuery);
  const [filterStatus, setFilterStatus] = useState<ZoneFilterStatus>('ALL');
  const [selectedSlotForModal, setSelectedSlotForModal] = useState<UnifiedModalSlotInfo | null>(null);

  // Map items by locatorCode (normalized)
  const itemMap = useMemo(() => {
    const map = new Map<string, InventoryItem>();
    items.forEach((it) => {
      if (it.locatorCode) {
        map.set(it.locatorCode.trim().toLowerCase(), it);
      }
      // Also map simplified zone-bay keys
      map.set(`${String(it.zone).toLowerCase()}-${it.bayNumber}`, it);
    });
    return map;
  }, [items]);

  // Compute total capacity & occupied counts across all sections
  const { totalCapacity, occupiedSlots, kpiStats } = useMemo(() => {
    let capacity = 0;
    let occupied = 0;
    let overdue = 0;
    let warning = 0;
    let totalUnits = 0;

    sections.forEach((sec) => {
      capacity += sec.slots.length;
      sec.slots.forEach((s) => {
        const item = itemMap.get(s.locatorCode.trim().toLowerCase()) || 
                     itemMap.get(`${String(s.zone).toLowerCase()}-${s.bayNumber}`);
        if (item) {
          occupied++;
          totalUnits += item.quantity || 0;
          if (item.agingDays > 27) overdue++;
          else if (item.agingDays > 21) warning++;
        }
      });
    });

    const stats: UnifiedZoneKpiStats = {
      totalInventoryUnits: totalUnits,
      safetyStockAlertCount: items.filter(it => it.safetyStock && it.quantity <= it.safetyStock).length,
      todayScanInCount: Math.max(3, Math.round(occupied * 0.1)),
      todayScanOutCount: Math.max(1, Math.round(occupied * 0.05)),
      occupiedPallets: occupied,
      totalCapacityPallets: capacity,
      agingOverdueCount: overdue,
      agingWarningCount: warning,
      emptyPalletsCount: capacity - occupied
    };

    return { totalCapacity: capacity, occupiedSlots: occupied, kpiStats: stats };
  }, [sections, items, itemMap]);

  // Handle slot click to open unified modal with pre-filled locator tag
  const handleSlotClick = (slot: SingleLevelSlotDefinition) => {
    const item = itemMap.get(slot.locatorCode.trim().toLowerCase()) || 
                 itemMap.get(`${String(slot.zone).toLowerCase()}-${slot.bayNumber}`) || null;

    setSelectedSlotForModal({
      zoneName: zoneTitle,
      zoneId: slot.zone,
      bayNumber: slot.bayNumber,
      level: 1, // Single-level floor is always level 1
      locatorTag: slot.locatorCode,
      isRack: false,
      item,
      facilityCode
    });
  };

  const activeSearch = localSearch.trim().toLowerCase();

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
        onOpenQuickScanner={() => onOpenScanner('B', 1, 1, 'IN')}
        isFullscreen={isDashboardFullscreen}
        onToggleFullscreen={onToggleFullscreen}
        onNavigateBack={onNavigateBack}
        backButtonLabel={backButtonLabel}
        isRackZone={false}
      />

      {/* ========================================================================= */}
      {/* 2. 2D PALLET GRID SECTIONS (Template 1: SingleLevelZoneLayout)             */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        {sections.map((section) => {
          return (
            <div 
              key={section.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-3 sm:p-4 shadow-lg space-y-3"
            >
              {/* Section Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <h3 className="text-sm font-black text-white">
                    {section.title}
                  </h3>
                  {section.subtitle && (
                    <span className="text-xs text-slate-400">
                      &bull; {section.subtitle}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {section.locatorPrefix && (
                    <span className="text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded">
                      {section.locatorPrefix}
                    </span>
                  )}
                  <span className="text-[11px] font-mono text-slate-400">
                    {section.slots.length} พาเลท
                  </span>
                </div>
              </div>

              {/* 2D Pallet Grid */}
              <div 
                className="grid gap-1.5 sm:gap-2"
                style={{
                  gridTemplateColumns: `repeat(${section.columns || Math.min(12, Math.max(4, Math.ceil(Math.sqrt(section.slots.length * 1.8))))}, minmax(0, 1fr))`
                }}
              >
                {section.slots.map((slot) => {
                  const item = itemMap.get(slot.locatorCode.trim().toLowerCase()) || 
                               itemMap.get(`${String(slot.zone).toLowerCase()}-${slot.bayNumber}`) || null;
                  
                  const isOccupied = !!item;
                  const agingCat = getAgingCategory(item);
                  const agingStyle = AGING_STYLES[agingCat];

                  // Search match filter
                  const isSearchMatch = activeSearch && (
                    slot.locatorCode.toLowerCase().includes(activeSearch) ||
                    slot.displayCode.toLowerCase().includes(activeSearch) ||
                    (item && (
                      item.modelHE.toLowerCase().includes(activeSearch) ||
                      item.partName.toLowerCase().includes(activeSearch)
                    ))
                  );

                  // Filter status check
                  if (filterStatus === 'OCCUPIED' && !isOccupied) return <div key={slot.id} className="opacity-20" />;
                  if (filterStatus === 'EMPTY' && isOccupied) return <div key={slot.id} className="opacity-20" />;
                  if (filterStatus === 'AGING' && (!item || item.agingDays <= 21)) return <div key={slot.id} className="opacity-20" />;

                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => handleSlotClick(slot)}
                      className={`min-h-[56px] sm:min-h-[64px] p-1.5 sm:p-2 rounded-lg border flex flex-col justify-between text-left transition-all select-none transform active:scale-95 cursor-pointer shadow-xs ${
                        isSearchMatch
                          ? 'ring-2 ring-amber-400 scale-102 z-10 shadow-lg'
                          : ''
                      } ${agingStyle.bgClass} ${agingStyle.borderClass} ${agingStyle.hoverClass}`}
                      title={`พิกัด: ${slot.locatorCode} | ${isOccupied ? `Model: ${item.modelHE} (${item.quantity} ชิ้น)` : 'ว่าง พร้อมรับเข้า'}`}
                    >
                      {/* Top Row: Locator ID Badge */}
                      <div className="flex items-center justify-between w-full leading-none">
                        <span className={`text-[10px] sm:text-[11px] font-mono font-black truncate ${agingStyle.textClass}`}>
                          {slot.displayCode}
                        </span>
                        {isOccupied && (
                          <span className={`text-[8.5px] sm:text-[9.5px] font-mono font-bold px-1 py-0.2 rounded leading-none ${
                            agingCat === 'WARNING' ? 'bg-black/20 text-slate-950' : 'bg-black/30 text-white'
                          }`}>
                            {item.agingDays}d
                          </span>
                        )}
                      </div>

                      {/* Middle Row: Model Code or Status */}
                      <div className="my-auto w-full truncate">
                        {isOccupied ? (
                          <span className={`text-[11px] sm:text-xs font-mono font-black tracking-tight block truncate ${agingStyle.textClass}`}>
                            {item.modelHE}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-sans block truncate">
                            ว่าง (Empty)
                          </span>
                        )}
                      </div>

                      {/* Bottom Row: Pallet count / Status label */}
                      <div className="flex items-center justify-between w-full pt-1 border-t border-black/15 text-[9px] font-mono">
                        <span className={`font-bold ${agingStyle.textClass}`}>
                          {isOccupied ? `${item.quantity.toLocaleString()} U` : '1P Ready'}
                        </span>
                        <span className={`text-[8.5px] uppercase font-bold opacity-80 ${agingStyle.textClass}`}>
                          {agingStyle.label.split(' ')[0]}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
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
        onPrintLabel={onPrintLabel}
      />
    </div>
  );
};
