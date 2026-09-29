import React, { useState, useMemo } from 'react';
import { InventoryItem, MovementType, StorageZone, ShelfLevel, MovementLog } from '../types';
import { UnifiedSlotModal, UnifiedSlotData } from './UnifiedSlotModal';
import { SlotMiniStatsOverlay, MiniStatsSlotData } from './SlotMiniStatsOverlay';
import { WarehouseSlotFilter, WarehouseFilterType } from './common/WarehouseSlotFilter';
import { A2FlowRail3DView } from './zone-3d/A2FlowRail3DView';
import { ZoneKpiFormalDashboard } from './ZoneKpiFormalDashboard';
import { useTranslation } from '../i18n/i18nContext';
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
  ChevronRight,
  X,
  LayoutGrid,
  Info
} from 'lucide-react';

interface FlowRailFloorMapProps {
  items: InventoryItem[];
  logs?: MovementLog[];
  searchQuery?: string;
  onSelectSlot?: (stationId: string, zone: string, bayNumber: number, level: number) => void;
  onOpenScanner: (zone: StorageZone, bay: number, level: ShelfLevel, mode: MovementType) => void;
  onRelocateItem?: (item: InventoryItem) => void;
  onNavigateToCampus?: () => void;
}

// 16 Rails in DA2D-1 Flow Rail (Top to Bottom: R16 down to R1)
const ALL_RAILS = [16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

export const FlowRailFloorMap: React.FC<FlowRailFloorMapProps> = ({
  items,
  logs,
  searchQuery = '',
  onSelectSlot,
  onOpenScanner,
  onRelocateItem,
  onNavigateToCampus
}) => {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<'3D' | '2D'>('3D');
  const [selectedRailFilter, setSelectedRailFilter] = useState<'ALL' | 'TOP' | 'BOTTOM'>('ALL');
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

  // Filtered displayed rails
  const displayedRails = useMemo(() => {
    if (selectedRailFilter === 'TOP') return [16, 15, 14, 13, 12, 11, 10, 9];
    if (selectedRailFilter === 'BOTTOM') return [8, 7, 6, 5, 4, 3, 2, 1];
    return ALL_RAILS;
  }, [selectedRailFilter]);

  // Calculate statistics for DA2D-1 (16 Rails x 8 Positions = 128 Pallets)
  const stats = useMemo(() => {
    let totalSlots = 16 * 8; // 128 Pallets
    let occupiedSlots = 0;
    let agingCount = 0;
    let totalQty = 0;

    for (let r = 1; r <= 16; r++) {
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
    <div className="w-full h-full flex flex-col min-h-0 space-y-1.5 overflow-hidden animate-fadeIn font-sans">
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
              <ArrowLeft className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">โซน A2 รางเลื่อน (DA2D-1)</span>
              <span className="sm:hidden">A2 รางเลื่อน</span>
              <span className="px-1.5 py-0.2 rounded-full bg-blue-600/30 text-blue-300 font-mono text-[10px] border border-blue-500/30">
                128P
              </span>
            </button>
          )}
        </div>

        {/* ตรงกลาง: View Switcher + Status Filter + Rail Selector + Flow Direction (ลำดับมาตรฐานเดียวกัน) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {/* 1. View Switcher: [3D ผัง 3 มิติ] vs [แปลนบน (Top 2D)] */}
          <div className="inline-flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800 text-xs font-bold shrink-0">
            <button
              onClick={() => setViewMode('3D')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap ${
                viewMode === '3D'
                  ? 'bg-blue-600 text-white shadow-md ring-1 ring-blue-400/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
              title="แสดงโมเดล 3D รางเลื่อน (3D Twin)"
            >
              <Box className="w-3.5 h-3.5 text-blue-200" />
              <span>3D ผัง 3 มิติ</span>
            </button>
            <button
              onClick={() => setViewMode('2D')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap ${
                viewMode === '2D'
                  ? 'bg-blue-600 text-white shadow-md ring-1 ring-blue-400/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
              title="แสดงแปลนพื้น 2 มิติ (2D Plan)"
            >
              <Grid className="w-3.5 h-3.5 text-blue-200" />
              <span>แปลนพื้น (Top 2D)</span>
            </button>
          </div>

          {/* 2. Global Status Filter Pills */}
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

          {/* 3. Sub-Zone Selector: ราง R1-R16 */}
          <div className="inline-flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800 text-xs font-bold shrink-0">
            <button
              onClick={() => setSelectedRailFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                selectedRailFilter === 'ALL'
                  ? 'bg-blue-600 text-white font-black shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {t('common.all')} (R1-R16)
            </button>
            <button
              onClick={() => setSelectedRailFilter('TOP')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                selectedRailFilter === 'TOP'
                  ? 'bg-blue-600 text-white font-black shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              บน (R9-R16)
            </button>
            <button
              onClick={() => setSelectedRailFilter('BOTTOM')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                selectedRailFilter === 'BOTTOM'
                  ? 'bg-blue-600 text-white font-black shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              ล่าง (R1-R8)
            </button>
          </div>

          {/* Flow Direction Indicator */}
          <div className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-950 border border-slate-800 text-slate-300 shrink-0">
            <span className="text-emerald-400 font-black flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Outfeed
            </span>
            <span className="text-slate-700">|</span>
            <span className="text-blue-400 font-black flex items-center gap-1">
              Infeed <ArrowRight className="w-3.5 h-3.5" />
            </span>
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
              className="w-full h-8 bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-6 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
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
          {onOpenScanner && (
            <button
              onClick={() => onOpenScanner('R1' as any, 1, 1 as any, 'IN')}
              className="h-8 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
              title="เปิดกล้องสแกน KANBAN QR Code (รับเข้า/เบิกออก)"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">สแกน KANBAN</span>
            </button>
          )}
        </div>
      </header>

      {/* MAIN CONTAINER: Layout on Top (flex-1) + Ultra-compact KPI Cards at Bottom (shrink-0) */}
      <div className="flex-1 min-h-0 flex flex-col gap-1.5 overflow-hidden">
        {/* TOP: 3D Twin or 2D Flow Rail Plan */}
        <div className="flex-1 min-h-0 overflow-hidden bg-slate-950 rounded-xl border border-slate-800">
          {viewMode === '3D' && (
            <A2FlowRail3DView
              items={items}
              searchQuery={activeSearch}
              onSelectSlot={(rail, pos, item) => {
                const loc = `DA2D-1-R${rail}-${String(pos).padStart(2, '0')}`;
                setSelectedSlot({
                  railNumber: rail,
                  positionNumber: pos,
                  locatorCode: loc,
                  item: item || null
                });
                if (onSelectSlot) {
                  onSelectSlot('DA2D-1', `R${rail}`, pos, 1);
                }
              }}
              onOpenScanner={onOpenScanner}
            />
          )}

        {/* VIEW 3: 2D DETAILED GRID (1 BOX = 1 PALLET) */}
        {viewMode === '2D' && (
          <div className="w-full h-full min-h-0 overflow-y-auto">
            <div className="w-full bg-[#080B10] rounded-xl border border-slate-800 shadow-xs p-3 sm:p-4 space-y-3">
            
            {/* Detail Section Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs font-black text-slate-200">
                  DA2D-1 Rail Matrix (14 ราง x 8 ช่อง = 112P)
                </span>
                <span className="text-[10px] text-slate-400 font-mono font-semibold hidden sm:inline">
                  (Single Continuous Flow Grid • FIFO Gravity Rollers)
                </span>
              </div>

              {/* Compact Infeed/Outfeed Direction Indicators */}
              <div className="flex items-center space-x-2 text-[10.5px] text-slate-300 font-bold bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
                <span className="flex items-center space-x-0.5 text-emerald-400">
                  <ArrowLeft className="w-3 h-3 text-emerald-400" />
                  <span>Outfeed</span>
                </span>
                <span className="text-slate-600">┈┈</span>
                <span className="flex items-center space-x-0.5 text-blue-400">
                  <span>Infeed</span>
                  <ArrowRight className="w-3 h-3 text-blue-400" />
                </span>
              </div>
            </div>

            {/* Single Continuous Grid Container (Unified R1-R16) */}
            <div className="bg-slate-900/90 p-3 sm:p-4 rounded-2xl border border-slate-800 shadow-xs space-y-2.5">
              {/* Card Header Bar */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded bg-blue-600" />
                  <span className="text-xs font-black text-slate-200">
                    {selectedRailFilter === 'ALL' 
                      ? 'ผังรวมรางเลื่อน R1 - R16 (Continuous Single Grid)' 
                      : selectedRailFilter === 'TOP' 
                      ? 'รางเลื่อน R9 - R16' 
                      : 'รางเลื่อน R1 - R8'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono font-semibold">
                    ({displayedRails.length} Rails x 8 Positions = {displayedRails.length * 8} Pallets)
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold text-blue-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  {selectedRailFilter === 'ALL' ? 'R1-R16 (128P)' : selectedRailFilter === 'TOP' ? 'R9-R16 (64P)' : 'R1-R8 (64P)'}
                </span>
              </div>

              {/* 8 Columns Header Indicator (Block 01 to Block 08 with Infeed/Outfeed markers) */}
              <div className="flex items-center pl-10 pr-12 text-center text-[10.5px] font-mono font-bold text-slate-400">
                {['01', '02', '03', '04', '05', '06', '07', '08'].map((col, idx) => (
                  <div key={col} className="flex-1 px-0.5">
                    <div className="py-0.5 bg-slate-950 rounded border border-slate-800 flex items-center justify-center gap-1">
                      <span className="text-slate-500 text-[9px]">BLK</span>
                      <span className="text-slate-200 font-black">{col}</span>
                      {idx === 0 && <span className="text-[8px] text-emerald-400 font-sans">(หน้าไลน์)</span>}
                      {idx === 7 && <span className="text-[8px] text-blue-400 font-sans">(รับเข้า)</span>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Rails (Continuous, no divider line between R7 and R8) */}
              <div className="space-y-1.5">
                {displayedRails.map(railNum => {
                        const railZoneCode = `R${railNum}`;
                        
                        return (
                          <div 
                            key={railNum}
                            className="flex items-center space-x-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800/90 shadow-2xs hover:border-slate-700 transition-all"
                          >
                            {/* Rail Number Label (Left) */}
                            <div className="w-9 text-center font-mono font-black text-xs text-slate-200 bg-slate-900 py-2 rounded-lg border border-slate-800">
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

                                const isStatusMatch = statusFilter === 'ALL' ||
                                  (statusFilter === 'OCCUPIED' && !!item) ||
                                  (statusFilter === 'EMPTY' && !item) ||
                                  (statusFilter === 'AGING' && item && (item.agingDays > 30 || item.agingStatus === 'WARNING' || item.agingStatus === 'OVERDUE'));
                                const isSlotActive = isMatch && isStatusMatch;

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
                                      !isSlotActive
                                        ? 'opacity-20 grayscale'
                                        : item
                                        ? isDiagramRedSample
                                          ? 'bg-[#D9043E] text-white border-[#FF1744] shadow-xs'
                                          : item.agingDays > 30
                                          ? 'bg-[#FFF4CC] text-[#7C4A03] border-[#F59E0B] shadow-2xs'
                                          : 'bg-[#EAF4FF] text-[#0F172A] border-[#60A5FA] shadow-2xs'
                                        : 'bg-[#0B1017] border-dashed border-[#273244] text-[#667085] hover:border-[#60A5FA] hover:bg-[#111823]'
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
                            <div className="w-10 text-center font-mono font-black text-xs text-slate-200 bg-slate-900 py-2 rounded-lg border border-slate-800">
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
                </div>
              </div>
            )}
        </div>

        {/* BOTTOM: Ultra-compact KPI Cards (ความจุ, รับเข้า-รับออก, Aging) */}
        <div className="shrink-0">
          <ZoneKpiFormalDashboard
            zoneKey="A2"
            items={items}
            logs={logs}
          />
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
