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
  const [viewMode, setViewMode] = useState<'RAIL_GRID' | 'SPLIT' | 'BUILDING_MAP'>('RAIL_GRID');
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
    <div className="space-y-5 animate-fadeIn">
      {/* Header & Overview Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-5 rounded-2xl shadow-lg border border-slate-700/80">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2.5 flex-wrap">
              {onNavigateToCampus && (
                <button
                  onClick={onNavigateToCampus}
                  className="px-2.5 py-0.5 rounded-full text-xs font-black bg-slate-700 hover:bg-slate-600 text-white flex items-center space-x-1 shadow-sm transition-all"
                >
                  <span>🏢 ◂ ผังรวมแคมปัส A2/A4</span>
                </button>
              )}
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-500 text-white flex items-center space-x-1 shadow-sm">
                <Building2 className="w-3.5 h-3.5" />
                <span>A2 Building</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                โซน DA2D-1 (20 ราง x 8 ตำแหน่ง = 160 พาเลท)
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                รูปแบบ Locator: <span className="text-blue-300 font-bold">DA2D-1-R[ราง]-[ตำแหน่ง 01-08]</span>
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white flex items-center space-x-2">
              <span>ผังวางงานแบบรางเลื่อน A2 Building (DA2D-1 Flow Rail Layout)</span>
            </h2>
            <p className="text-xs text-slate-300 max-w-3xl">
              โครงสร้างจัดเก็บแบบรางเลื่อนลูกกลิ้ง 20 ราง (R1 ถึง R20) แต่ละรางมี 8 ตำแหน่งพาเลท (1 กล่อง = 1 พาเลท) ไหลตามระบบ FIFO Infeed ➡️ Outfeed
            </p>
          </div>

          {/* KPI Snapshot Pills */}
          <div className="flex items-center flex-wrap gap-2 text-xs">
            <div className="bg-slate-800/90 border border-slate-700 px-3 py-2 rounded-xl text-center min-w-[90px]">
              <span className="text-[10px] text-slate-400 block font-semibold">ความจุรวม</span>
              <span className="text-sm font-black text-white font-mono">{stats.totalSlots}</span>
              <span className="text-[9px] text-slate-400 ml-0.5">Pallets</span>
            </div>
            <div className="bg-blue-950/80 border border-blue-600/50 px-3 py-2 rounded-xl text-center min-w-[90px]">
              <span className="text-[10px] text-blue-300 block font-semibold">จัดเก็บแล้ว</span>
              <span className="text-sm font-black text-blue-400 font-mono">{stats.occupiedSlots}</span>
              <span className="text-[9px] text-blue-300 ml-0.5">({stats.utilizationRate}%)</span>
            </div>
            <div className="bg-emerald-950/80 border border-emerald-600/50 px-3 py-2 rounded-xl text-center min-w-[85px]">
              <span className="text-[10px] text-emerald-300 block font-semibold">ช่องว่าง</span>
              <span className="text-sm font-black text-emerald-400 font-mono">{stats.emptySlots}</span>
              <span className="text-[9px] text-emerald-300 ml-0.5">P</span>
            </div>
            {stats.agingCount > 0 && (
              <div className="bg-rose-950/80 border border-rose-600/50 px-3 py-2 rounded-xl text-center min-w-[85px] animate-pulse">
                <span className="text-[10px] text-rose-300 block font-semibold">Aging Alert</span>
                <span className="text-sm font-black text-rose-400 font-mono">{stats.agingCount}</span>
                <span className="text-[9px] text-rose-300 ml-0.5">P</span>
              </div>
            )}
          </div>
        </div>

        {/* Toolbar & View Mode Switcher */}
        <div className="mt-4 pt-3 border-t border-slate-700/70 flex flex-wrap items-center justify-between gap-3">
          {/* View Mode Buttons */}
          <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-700 gap-1 text-xs font-bold">
            <button
              id="view-mode-rail-grid"
              onClick={() => setViewMode('RAIL_GRID')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'RAIL_GRID' 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>ผังราง 20 เลน (DA2D-1 Detail Grid)</span>
            </button>
            <button
              id="view-mode-split"
              onClick={() => setViewMode('SPLIT')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'SPLIT' 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>ผังอาคาร + ผังราง (Split View)</span>
            </button>
            <button
              id="view-mode-building"
              onClick={() => setViewMode('BUILDING_MAP')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'BUILDING_MAP' 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>ผังรวมอาคาร A2 (Building Plan)</span>
            </button>
          </div>

          {/* Filter by Bank */}
          <div className="flex items-center flex-wrap gap-1.5 text-xs font-bold">
            <span className="text-slate-400 text-[11px] mr-1">กลุ่มราง:</span>
            <button
              onClick={() => setSelectedBankFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg border transition-all ${
                selectedBankFilter === 'ALL'
                  ? 'bg-slate-200 text-slate-900 border-slate-300'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              ทั้งหมด (R1-R20)
            </button>
            {RAIL_BANKS.map(bank => (
              <button
                key={bank.bankId}
                onClick={() => setSelectedBankFilter(bank.bankId as any)}
                className={`px-2.5 py-1 rounded-lg border transition-all ${
                  selectedBankFilter === bank.bankId
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                {bank.title.split(':')[0]}
              </button>
            ))}
          </div>

          {/* Quick Search */}
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหา Model, Locator (DA2D-1-R20...)"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-slate-100 text-xs rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* MAIN CONTAINER LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* LEFT COLUMN: A2 BUILDING ARCHITECTURAL MAP (VISIBLE IN 'SPLIT' OR 'BUILDING_MAP') */}
        {(viewMode === 'BUILDING_MAP' || viewMode === 'SPLIT') && (
          <div className={`${viewMode === 'SPLIT' ? 'lg:col-span-4' : 'lg:col-span-12'} bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4`}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-sm font-black text-slate-900">A2 Building Macro Plan</h3>
                  <p className="text-[11px] text-slate-500">ผังพื้นที่รวมอาคาร A2 และตำแหน่งพื้นที่วางรางเลื่อน DA2D-1</p>
                </div>
              </div>
              <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                Floor Plan
              </span>
            </div>

            {/* Architectural Building Diagram (Matches the uploaded reference image) */}
            <div className="bg-slate-50 rounded-xl border-2 border-slate-800 p-4 relative min-h-[460px] flex flex-col justify-between overflow-hidden shadow-inner">
              
              {/* Building Title */}
              <div className="text-center font-black text-slate-900 text-base tracking-wider py-1 border-b border-slate-300/80 bg-white/70 rounded-lg">
                A2 Building
              </div>

              {/* Doors / Gates on Left and Right Walls */}
              {/* Left Wall Doors */}
              <div className="absolute left-0 top-[28%] -translate-x-1/2 w-3.5 h-10 bg-amber-300 border-2 border-amber-600 rounded-sm shadow-xs flex items-center justify-center">
                <span className="text-[7px] font-black text-amber-950 rotate-90">DOOR</span>
              </div>
              <div className="absolute left-0 top-[60%] -translate-x-1/2 w-3.5 h-10 bg-amber-300 border-2 border-amber-600 rounded-sm shadow-xs flex items-center justify-center">
                <span className="text-[7px] font-black text-amber-950 rotate-90">DOOR</span>
              </div>
              <div className="absolute left-0 top-[82%] -translate-x-1/2 w-3.5 h-10 bg-amber-300 border-2 border-amber-600 rounded-sm shadow-xs flex items-center justify-center">
                <span className="text-[7px] font-black text-amber-950 rotate-90">DOOR</span>
              </div>

              {/* Right Wall Doors */}
              <div className="absolute right-0 top-[28%] translate-x-1/2 w-3.5 h-10 bg-amber-300 border-2 border-amber-600 rounded-sm shadow-xs flex items-center justify-center">
                <span className="text-[7px] font-black text-amber-950 -rotate-90">DOOR</span>
              </div>
              <div className="absolute right-0 top-[60%] translate-x-1/2 w-3.5 h-10 bg-amber-300 border-2 border-amber-600 rounded-sm shadow-xs flex items-center justify-center">
                <span className="text-[7px] font-black text-amber-950 -rotate-90">DOOR</span>
              </div>
              <div className="absolute right-0 top-[82%] translate-x-1/2 w-3.5 h-10 bg-amber-300 border-2 border-amber-600 rounded-sm shadow-xs flex items-center justify-center">
                <span className="text-[7px] font-black text-amber-950 -rotate-90">DOOR</span>
              </div>

              {/* Center Open Staging / Main Walkway */}
              <div className="my-auto grid grid-cols-12 gap-3 p-2">
                {/* Left side walkway & staging */}
                <div className="col-span-5 flex flex-col justify-center items-center text-center p-3 border border-dashed border-slate-300 rounded-xl bg-white/50 space-y-2">
                  <span className="text-[11px] font-bold text-slate-500">ทางสัญจร &amp; ขนถ่ายหลัก</span>
                  <span className="text-[10px] text-slate-400">Main Forklift / AGV Path</span>
                  <div className="w-full flex items-center justify-center space-x-1 py-4 border-y border-dashed border-slate-200 text-slate-400">
                    <ArrowRight className="w-4 h-4 text-blue-500 rotate-90 animate-bounce" />
                  </div>
                  <span className="text-[9px] font-mono text-slate-400">Receiving Staging Zone</span>
                </div>

                {/* Right side DA2D-1 & Assembly Area */}
                <div className="col-span-7 space-y-3">
                  
                  {/* DA2D-1 FLOW RAIL STORAGE AREA (Red Outline Box from reference) */}
                  <div 
                    onClick={() => setViewMode('RAIL_GRID')}
                    className="p-3 bg-rose-50/70 border-2 border-rose-600 rounded-xl shadow-md hover:ring-2 hover:ring-rose-500 transition-all cursor-pointer relative group"
                  >
                    {/* Area Badge */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-blue-700 font-mono bg-blue-100 px-2 py-0.5 rounded border border-blue-300">
                        DA2D-1
                      </span>
                      <span className="text-[10px] font-bold text-rose-800 bg-rose-200/80 px-2 py-0.5 rounded-full flex items-center space-x-1">
                        <GitCommit className="w-3 h-3" />
                        <span>พื้นที่วางราง (Flow Rail)</span>
                      </span>
                    </div>

                    {/* Micro illustration of 20 Rails */}
                    <div className="space-y-1 bg-white/80 p-2 rounded-lg border border-rose-200 shadow-inner">
                      <div className="text-[9px] font-bold text-slate-600 flex justify-between">
                        <span>20 Rails (R1 - R20)</span>
                        <span className="text-blue-600 font-mono font-black">{stats.occupiedSlots}/160 P</span>
                      </div>
                      <div className="grid grid-rows-4 gap-1">
                        {[4, 3, 2, 1].map(b => (
                          <div key={b} className="h-3 bg-slate-200 rounded flex space-x-0.5 p-0.5 border border-slate-300">
                            {Array.from({ length: 8 }, (_, i) => (
                              <div 
                                key={i} 
                                className={`flex-1 rounded-[2px] ${
                                  b === 1 && i === 1 
                                    ? 'bg-rose-600' // Highlight R3-02 matching diagram!
                                    : (b + i) % 3 === 0 ? 'bg-blue-500' : 'bg-white'
                                }`} 
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                      <div className="text-[8px] text-slate-400 flex items-center justify-between pt-0.5">
                        <span>⬅️ Outfeed</span>
                        <span className="font-mono text-rose-700 font-bold">R3-02 Sample</span>
                        <span>Infeed ➡️</span>
                      </div>
                    </div>

                    <div className="mt-2 text-center text-[10px] font-bold text-blue-700 group-hover:underline flex items-center justify-center space-x-1">
                      <span>คลิกเพื่อดูผังซูมแบบละเอียด</span>
                      <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>

                  {/* Production / Assembly Line Layout Diagram (Below DA2D-1) */}
                  <div className="p-3 bg-slate-100 rounded-xl border border-slate-300/80 space-y-1.5 text-center">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-700">
                      <span>⚙️ ไลน์ประกอบ &amp; ผลิต (Assembly Line)</span>
                      <span className="text-[9px] bg-slate-200 px-1.5 py-0.2 rounded">HE1 / HE2 / HE3</span>
                    </div>
                    {/* Visual Assembly Tracks */}
                    <div className="grid grid-cols-3 gap-1.5 py-1">
                      <div className="h-16 bg-white border border-slate-300 rounded p-1 flex flex-col justify-between text-[8px] text-slate-500">
                        <span className="font-bold text-blue-800">Station A</span>
                        <div className="h-1 bg-emerald-400 rounded-full" />
                        <span>Pre-Assembly</span>
                      </div>
                      <div className="h-16 bg-white border border-slate-300 rounded p-1 flex flex-col justify-between text-[8px] text-slate-500">
                        <span className="font-bold text-blue-800">Station B</span>
                        <div className="h-1 bg-blue-400 rounded-full" />
                        <span>Main Insertion</span>
                      </div>
                      <div className="h-16 bg-white border border-slate-300 rounded p-1 flex flex-col justify-between text-[8px] text-slate-500">
                        <span className="font-bold text-blue-800">Station C</span>
                        <div className="h-1 bg-amber-400 rounded-full" />
                        <span>Quality QA</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Section: Office Area (Light Blue block matching user's image) */}
              <div className="bg-sky-100 border-2 border-dashed border-sky-400 text-sky-950 font-bold py-3 px-4 rounded-xl text-center shadow-xs flex items-center justify-center space-x-2">
                <span className="text-sm font-black tracking-wide">Office</span>
                <span className="text-[10px] font-normal text-sky-700">(สำนักงาน &amp; ฝ่ายควบคุมคลังสินค้า A2)</span>
              </div>
            </div>
          </div>
        )}

        {/* RIGHT / MAIN COLUMN: DA2D-1 20-RAIL DETAILED GRID (1 BOX = 1 PALLET) */}
        {(viewMode === 'RAIL_GRID' || viewMode === 'SPLIT') && (
          <div className={`${viewMode === 'SPLIT' ? 'lg:col-span-8' : 'lg:col-span-12'} bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-5`}>
            
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
                                    className={`h-20 rounded-lg p-1.5 flex flex-col justify-between text-left transition-all cursor-pointer relative overflow-hidden border-2 select-none ${
                                      !isMatch
                                        ? 'opacity-30'
                                        : item
                                        ? isDiagramRedSample
                                          ? 'bg-rose-700 text-white border-rose-900 shadow-md ring-2 ring-rose-500/50 hover:brightness-110' // EXACT RED BOX from diagram!
                                          : item.agingDays > 30
                                          ? 'bg-amber-100 text-slate-900 border-amber-500 shadow-xs hover:border-amber-600'
                                          : 'bg-blue-50 text-slate-900 border-blue-400 shadow-xs hover:border-blue-600'
                                        : 'bg-slate-50/70 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/40'
                                    }`}
                                  >
                                    {item ? (
                                      <>
                                        {/* Top bar in box: Slot Position and Line */}
                                        <div className="flex items-center justify-between">
                                          <span className={`text-[9px] font-mono font-black truncate ${
                                            isDiagramRedSample ? 'text-rose-100' : 'text-slate-700'
                                          }`}>
                                            {formattedPos}
                                          </span>
                                          <span className={`text-[8px] font-black px-1 rounded ${
                                            isDiagramRedSample 
                                              ? 'bg-rose-950 text-rose-100 border border-rose-400/40' 
                                              : 'bg-blue-200 text-blue-900'
                                          }`}>
                                            {item.useLine}
                                          </span>
                                        </div>

                                        {/* Middle info: Model HE & Qty */}
                                        <div className="leading-tight py-0.5">
                                          <p className={`text-[9px] font-mono font-extrabold truncate ${
                                            isDiagramRedSample ? 'text-white' : 'text-blue-950'
                                          }`}>
                                            {item.modelHE}
                                          </p>
                                          <p className={`text-[8px] truncate font-medium ${
                                            isDiagramRedSample ? 'text-rose-100' : 'text-slate-600'
                                          }`}>
                                            {item.partName}
                                          </p>
                                        </div>

                                        {/* Bottom info: Quantity & Locator */}
                                        <div className="flex items-center justify-between pt-0.5 border-t border-black/10">
                                          <span className={`text-[9px] font-mono font-black ${
                                            isDiagramRedSample ? 'text-white' : 'text-slate-900'
                                          }`}>
                                            {item.quantity} U
                                          </span>
                                          {item.agingDays > 30 && (
                                            <span className={`text-[7px] font-bold px-1 rounded-full ${
                                              isDiagramRedSample ? 'bg-white text-rose-900' : 'bg-amber-200 text-amber-900'
                                            }`}>
                                              {item.agingDays}d
                                            </span>
                                          )}
                                        </div>
                                      </>
                                    ) : (
                                      /* Empty Slot Placeholder */
                                      <div className="h-full flex flex-col items-center justify-center text-slate-400 group-hover:text-blue-600">
                                        <span className="text-[11px] font-mono font-black text-slate-300">
                                          {formattedPos}
                                        </span>
                                        <span className="text-[8px] font-semibold text-slate-400">ว่าง</span>
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
        )}
      </div>

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
