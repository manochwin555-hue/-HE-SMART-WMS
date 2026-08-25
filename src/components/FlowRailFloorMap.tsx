import React, { useState, useMemo } from 'react';
import { InventoryItem, MovementType, StorageZone, ShelfLevel } from '../types';
import { UnifiedSlotModal, UnifiedSlotData } from './UnifiedSlotModal';
import { SlotMiniStatsOverlay, MiniStatsSlotData } from './SlotMiniStatsOverlay';
import { 
  GitCommit, 
  Layers, 
  Box, 
  Search, 
  ArrowRight, 
  ArrowLeft,
  AlertTriangle, 
  Plus, 
  ArrowLeftRight, 
  Maximize2, 
  QrCode, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  Filter,
  Grid,
  MapPin,
  TrendingDown,
  Building2,
  Eye,
  Columns,
  Maximize,
  Minimize2,
  Printer,
  ChevronRight
} from 'lucide-react';

interface FlowRailFloorMapProps {
  items: InventoryItem[];
  searchQuery?: string;
  onSelectSlot?: (stationId: string, zone: string, bayNumber: number, level: number) => void;
  onOpenScanner: (zone: StorageZone, bay: number, level: ShelfLevel, mode: MovementType) => void;
  onRelocateItem?: (item: InventoryItem) => void;
  onNavigateToCampus?: () => void;
}

// 4 Rail Banks (5 Rails each = 20 Rails total)
const RAIL_BANKS = [
  {
    bankId: 'BANK_4',
    title: 'Block 4: ราง R16 - R20',
    rails: [20, 19, 18, 17, 16] // Top to bottom
  },
  {
    bankId: 'BANK_3',
    title: 'Block 3: ราง R11 - R15',
    rails: [15, 14, 13, 12, 11]
  },
  {
    bankId: 'BANK_2',
    title: 'Block 2: ราง R6 - R10',
    rails: [10, 9, 8, 7, 6]
  },
  {
    bankId: 'BANK_1',
    title: 'Block 1: ราง R1 - R5',
    rails: [5, 4, 3, 2, 1]
  }
];

export const FlowRailFloorMap: React.FC<FlowRailFloorMapProps> = ({
  items,
  searchQuery = '',
  onSelectSlot,
  onOpenScanner,
  onRelocateItem,
  onNavigateToCampus
}) => {
  const [selectedBankFilter, setSelectedBankFilter] = useState<'ALL' | 'BANK_4' | 'BANK_3' | 'BANK_2' | 'BANK_1'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OCCUPIED' | 'EMPTY' | 'AGING'>('ALL');
  const [localSearch, setLocalSearch] = useState<string>('');
  
  // Selected slot detail modal
  const [selectedSlot, setSelectedSlot] = useState<{
    railNumber: number;
    positionNumber: number;
    locatorCode: string;
    item: InventoryItem | null;
  } | null>(null);

  // Hover state for Mini-Stats Overlay
  const [hoveredSlot, setHoveredSlot] = useState<{
    railNumber: number;
    positionNumber: number;
    locatorCode: string;
    item: InventoryItem | null;
    x: number;
    y: number;
  } | null>(null);

  const activeSearch = searchQuery || localSearch;

  // Find item for a specific rail & position (1 Box = 1 Pallet)
  const getItemAtSlot = (railNum: number, posNum: number): InventoryItem | undefined => {
    const formattedPos = String(posNum).padStart(2, '0');
    const exactLocator = `DA2D-1-R${railNum}-${formattedPos}`;
    const altLocator1 = `DA2D-1-R${railNum}-${posNum}`;
    const altLocator2 = `DA2D-1-R${String(railNum).padStart(2, '0')}-${formattedPos}`;

    return items.find(it => {
      // 1. Check exact locator code match
      if (it.locatorCode === exactLocator || it.locatorCode === altLocator1 || it.locatorCode === altLocator2) {
        return true;
      }
      // 2. Check zone / bay match (zone = 'R3', bayNumber = 2)
      if ((it.zone === `R${railNum}` || it.zone === `FR${railNum}`) && it.bayNumber === posNum) {
        return true;
      }
      return false;
    });
  };

  // Search filter helper
  const isMatchSearch = (item: InventoryItem | undefined, locator: string) => {
    if (!activeSearch.trim()) return true;
    const q = activeSearch.toLowerCase().trim();
    if (locator.toLowerCase().includes(q)) return true;
    if (!item) return false;
    return (
      item.modelHE.toLowerCase().includes(q) ||
      item.partName.toLowerCase().includes(q) ||
      item.useLine.toLowerCase().includes(q) ||
      (item.remark && item.remark.toLowerCase().includes(q))
    );
  };

  // Calculate statistics for DA2D-1
  const stats = useMemo(() => {
    let totalSlots = 20 * 8; // 160 Pallets
    let occupiedSlots = 0;
    let agingCount = 0;
    let totalQty = 0;

    for (let r = 1; r <= 20; r++) {
      for (let p = 1; p <= 8; p++) {
        const it = getItemAtSlot(r, p);
        if (it) {
          occupiedSlots++;
          totalQty += it.quantity;
          if (it.agingDays > 30 || it.agingStatus === 'WARNING' || it.agingStatus === 'OVERDUE') {
            agingCount++;
          }
        }
      }
    }

    return {
      totalSlots,
      occupiedSlots,
      emptySlots: totalSlots - occupiedSlots,
      utilizationRate: Math.round((occupiedSlots / totalSlots) * 100),
      agingCount,
      totalQty
    };
  }, [items]);

  return (
    <div className="space-y-3 animate-fadeIn">
      {/* Compact Header & Unified Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 sm:p-3 text-white shadow-xs space-y-2.5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2 flex-wrap">
            {onNavigateToCampus && (
              <button
                onClick={onNavigateToCampus}
                className="px-2.5 py-1 rounded-lg text-xs font-black bg-slate-800 hover:bg-slate-700 text-white flex items-center space-x-1 shadow-xs transition-all active:scale-95"
              >
                <span>🏢 ◂ รวมแคมปัส</span>
              </button>
            )}
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
              <h2 className="text-sm sm:text-base font-black tracking-tight text-white">
                ผังรางเลื่อน A2 Building (DA2D-1 Flow Rail)
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/30">
              ความจุ 160 P (20 ราง)
            </span>
          </div>

          {/* Compact Inline Capacity Indicators */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="px-2.5 py-1 rounded-lg font-bold text-[11px] bg-blue-950/80 text-blue-300 border border-blue-800">
              จัดเก็บ {stats.occupiedSlots}/{stats.totalSlots} P ({stats.utilizationRate}%)
            </span>
            <span className="px-2.5 py-1 rounded-lg font-bold text-[11px] bg-emerald-950/80 text-emerald-300 border border-emerald-800">
              ว่าง {stats.emptySlots} P
            </span>
            {stats.agingCount > 0 && (
              <span className="px-2.5 py-1 rounded-lg font-bold text-[11px] bg-rose-950/80 text-rose-300 border border-rose-800 animate-pulse">
                Aging {stats.agingCount} P
              </span>
            )}
          </div>
        </div>

        {/* Compact Filter Strip */}
        <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Filter by Bank */}
          <div className="flex items-center flex-wrap gap-1 font-bold">
            <span className="text-slate-400 text-[11px] mr-1">กลุ่มราง:</span>
            <button
              onClick={() => setSelectedBankFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg border transition-all text-xs ${
                selectedBankFilter === 'ALL'
                  ? 'bg-blue-600 text-white border-blue-500 font-black shadow-xs'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              ทั้งหมด (R1-R20)
            </button>
            {RAIL_BANKS.map(bank => (
              <button
                key={bank.bankId}
                onClick={() => setSelectedBankFilter(bank.bankId as any)}
                className={`px-2.5 py-1 rounded-lg border transition-all text-xs font-mono ${
                  selectedBankFilter === bank.bankId
                    ? 'bg-blue-600 text-white border-blue-500 font-black'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {bank.title.split(':')[0]}
              </button>
            ))}
          </div>

          {/* Quick Search */}
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหา Model, Locator (DA2D-1-R20...)"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-400 text-xs rounded-lg pl-8 pr-7 py-1 focus:outline-none focus:border-blue-500"
            />
            {localSearch && (
              <button
                onClick={() => setLocalSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MAIN CONTAINER LAYOUT: DA2D-1 20-RAIL DETAILED GRID (1 BOX = 1 PALLET) */}
      <div className="w-full">
        <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-5">
            
            {/* Detail Section Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-700 font-bold">
                  <GitCommit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center space-x-2">
                    <span>ผังจัดวางแบบราง 20 เลน (DA2D-1 Rail Matrix)</span>
                    <span className="text-[10px] bg-blue-100 text-blue-900 px-2.5 py-0.5 rounded-full font-bold">
                      1 กล่อง = 1 พาเลท (160 Slots)
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    แสดง 4 บล็อกราง (Block 1 - 4), ราง R1 ถึง R20, แต่ละรางมี 8 ตำแหน่งพาเลท (01 ถึง 08)
                  </p>
                </div>
              </div>

              {/* Infeed/Outfeed Direction Indicators */}
              <div className="flex items-center space-x-3 text-[11px] text-slate-700 font-bold bg-slate-100/90 px-3 py-1.5 rounded-xl border border-slate-200">
                <span className="flex items-center space-x-1 text-emerald-700">
                  <ArrowLeft className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Outfeed (เบิกจ่าย)</span>
                </span>
                <span className="text-slate-300">┈┈┈┈</span>
                <span className="flex items-center space-x-1 text-blue-700">
                  <span>Infeed (โหลดเข้า)</span>
                  <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                </span>
              </div>
            </div>

            {/* Filtered Rail Banks Loop */}
            <div className="space-y-6">
              {RAIL_BANKS.filter(b => selectedBankFilter === 'ALL' || selectedBankFilter === b.bankId).map((bank, bankIdx) => {
                return (
                  <div 
                    key={bank.bankId}
                    className="bg-slate-50/70 p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3"
                  >
                    {/* Bank Header Bar */}
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded bg-blue-600" />
                        <span className="text-xs font-black text-slate-800">{bank.title}</span>
                        <span className="text-[10px] text-slate-500 font-mono font-semibold">
                          (5 Rails x 8 Positions = 40 Pallets)
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">
                        {bank.bankId}
                      </span>
                    </div>

                    {/* 8 Columns Header Indicator */}
                    <div className="flex items-center pl-10 pr-12 text-center text-[10px] font-mono font-bold text-slate-500">
                      {['01', '02', '03', '04', '05', '06', '07', '08'].map(col => (
                        <div key={col} className="flex-1">
                          <span className="px-2 py-0.5 bg-slate-200/80 rounded text-slate-700">
                            {col}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Rails in this Bank */}
                    <div className="space-y-2">
                      {bank.rails.map(railNum => {
                        const railZoneCode = `R${railNum}`;
                        
                        return (
                          <div 
                            key={railNum}
                            className="flex items-center space-x-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all"
                          >
                            {/* Rail Number Label (Left) */}
                            <div className="w-9 text-center font-mono font-black text-xs text-slate-800 bg-slate-100 py-2 rounded-lg border border-slate-200">
                              R{railNum}
                            </div>

                            {/* 8 Pallet Slots (Boxes) along this Rail */}
                            <div className="flex-1 grid grid-cols-8 gap-1.5">
                              {Array.from({ length: 8 }, (_, slotIdx) => {
                                const posNum = slotIdx + 1;
                                const formattedPos = String(posNum).padStart(2, '0');
                                const locatorCode = `DA2D-1-R${railNum}-${formattedPos}`;
                                const item = getItemAtSlot(railNum, posNum);
                                const isMatch = isMatchSearch(item, locatorCode);

                                // Check special solid red indicator like in the user's diagram for R3-02
                                const isDiagramRedSample = (railNum === 3 && posNum === 2) || (item && (item.agingStatus === 'OVERDUE' || item.remark?.includes('Red Mark')));

                                // Apply status filter
                                if (statusFilter === 'OCCUPIED' && !item) return null;
                                if (statusFilter === 'EMPTY' && item) return null;
                                if (statusFilter === 'AGING' && (!item || item.agingDays <= 30)) return null;

                                return (
                                  <div
                                    key={posNum}
                                    id={`slot-box-${railNum}-${posNum}`}
                                    onClick={() => setSelectedSlot({
                                      railNumber: railNum,
                                      positionNumber: posNum,
                                      locatorCode,
                                      item: item || null
                                    })}
                                    onMouseEnter={(e) => {
                                      setHoveredSlot({
                                        railNumber: railNum,
                                        positionNumber: posNum,
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
                                      !isMatch
                                        ? 'opacity-30'
                                        : item
                                        ? isDiagramRedSample
                                          ? 'bg-rose-700 text-white border-rose-900 shadow-xs ring-1 ring-rose-500/50 hover:brightness-110' // EXACT RED BOX from diagram!
                                          : item.agingDays > 30
                                          ? 'bg-amber-100 text-slate-900 border-amber-500 shadow-2xs hover:border-amber-600'
                                          : 'bg-blue-50 text-slate-900 border-blue-400 shadow-2xs hover:border-blue-600'
                                        : 'bg-slate-50/70 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/40'
                                    }`}
                                  >
                                    {item ? (
                                      <>
                                        {/* Top bar in box: Slot Position and Line */}
                                        <div className="flex items-center justify-between leading-none">
                                          <span className={`text-[7.5px] font-mono font-black truncate ${
                                            isDiagramRedSample ? 'text-rose-100' : 'text-slate-800'
                                          }`}>
                                            {formattedPos}
                                          </span>
                                          <span className={`text-[6.5px] font-mono font-black px-0.5 rounded leading-none ${
                                            isDiagramRedSample 
                                              ? 'bg-rose-950 text-rose-100 border border-rose-400/40' 
                                              : 'bg-blue-200 text-blue-950'
                                          }`}>
                                            {item.useLine}
                                          </span>
                                        </div>

                                        {/* Middle info: Model HE - Bold & Compact */}
                                        <div className="w-full leading-tight truncate my-auto">
                                          <span className={`text-[7.5px] sm:text-[8px] font-mono font-black tracking-tight truncate block ${
                                            isDiagramRedSample ? 'text-white drop-shadow-2xs' : 'text-blue-950'
                                          }`}>
                                            {item.modelHE}
                                          </span>
                                        </div>

                                        {/* Bottom info: Quantity & Locator */}
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
                                            {formattedPos}
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

                            {/* Rail Number Label on Right (Matches Reference Diagram) */}
                            <div className="w-10 text-center font-mono font-black text-xs text-slate-900 bg-slate-100 py-2 rounded-lg border border-slate-300">
                              R{railNum}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Bottom Column Labels Footer */}
                    <div className="flex items-center pl-10 pr-12 text-center text-[10px] font-mono font-bold text-slate-500 pt-1">
                      {['01', '02', '03', '04', '05', '06', '07', '08'].map(col => (
                        <div key={col} className="flex-1">
                          <span className="text-slate-400 font-mono text-[9px]">{col}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      {/* FLOATING HOVER MINI-STATS OVERLAY FOR FLOW RAILS */}
      {hoveredSlot && (
        <SlotMiniStatsOverlay
          data={{
            title: `รางเลื่อน R${hoveredSlot.railNumber} - ช่อง ${String(hoveredSlot.positionNumber).padStart(2, '0')}`,
            locatorCode: hoveredSlot.locatorCode,
            zoneName: `Flow Rail R${hoveredSlot.railNumber} (อาคาร A2)`,
            positionLabel: `ตำแหน่งรางลำดับที่ ${hoveredSlot.positionNumber} จาก 8 ช่อง (FIFO Flow)`,
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
          sectorType: 'FLOW_RAIL',
          buildingName: 'อาคาร A2',
          facilityId: 'FAC-A2-MAIN',
          zoneName: `รางเลื่อน R${selectedSlot.railNumber} (DA2D-1 วางราง)`,
          locatorCode: selectedSlot.locatorCode,
          bayOrGroupNumber: selectedSlot.railNumber,
          rowNumber: selectedSlot.railNumber,
          columnOrRailNumber: selectedSlot.positionNumber,
          item: selectedSlot.item || null,
          maxCapacityPallets: 1
        } : null}
        onOpenScanner={(zone, bay, level, mode) => {
          if (selectedSlot) {
            onOpenScanner(`R${selectedSlot.railNumber}` as StorageZone, selectedSlot.positionNumber, 1, mode);
          }
        }}
        onRelocateItem={onRelocateItem}
      />
    </div>
  );
};
