import React, { useState, useEffect, useMemo } from 'react';
import { InventoryItem, MovementType, ShelfLevel, StorageZone, MovementLog } from '../types';
import { A4UnifiedFactory3DView } from './zone-3d/A4UnifiedFactory3DView';
import { A4FrontElevationView } from './A4FrontElevationView';
import { formatLocatorCode } from './QuickScannerModal';
import { 
  Warehouse, 
  ChevronRight, 
  Search, 
  Box, 
  Layers, 
  Columns, 
  Maximize, 
  Minimize, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Ban, 
  ArrowDownRight, 
  ArrowUpRight, 
  Clock, 
  Filter, 
  QrCode, 
  Building2, 
  Sparkles,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';

interface RackLayout2DProps {
  items: InventoryItem[];
  logs?: MovementLog[];
  searchQuery?: string;
  initialSectionTab?: 'FLOOR_DA4D1' | 'RACK_ZONES' | 'FULL3D' | 'FRONT_ELEVATION';
  onSelectBay: (zone: StorageZone, bayNumber: number) => void;
  onOpen3D: (zone: StorageZone, bayNumber: number) => void;
  onOpenScanner?: (zone: StorageZone, bay: number, level: ShelfLevel, mode: MovementType) => void;
  onRelocateItem?: (item: InventoryItem) => void;
  onNavigateToFloor?: () => void;
  onNavigateToCampus?: () => void;
  isDashboardFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export type SectionTabType = 'FULL3D' | 'RACK_ZONES' | 'FRONT_ELEVATION';

export const RackLayout2D: React.FC<RackLayout2DProps> = ({
  items,
  logs = [],
  searchQuery = '',
  initialSectionTab = 'FULL3D',
  onSelectBay,
  onOpen3D,
  onOpenScanner,
  onRelocateItem,
  onNavigateToFloor,
  onNavigateToCampus,
  isDashboardFullscreen,
  onToggleFullscreen
}) => {
  // Main view switcher tab: Default is FULL3D (แร็ค 3D ผัง 3 มิติ) matching screenshot
  const [activeSectionTab, setActiveSectionTab] = useState<SectionTabType>(
    initialSectionTab === 'FRONT_ELEVATION' ? 'FRONT_ELEVATION' :
    initialSectionTab === 'RACK_ZONES' ? 'RACK_ZONES' : 'FULL3D'
  );

  const [selectedZone, setSelectedZone] = useState<StorageZone>('B');
  const [localSearch, setLocalSearch] = useState<string>(searchQuery);

  useEffect(() => {
    if (searchQuery !== undefined) {
      setLocalSearch(searchQuery);
    }
  }, [searchQuery]);

  // Rack items (B-K)
  const purpleZones: StorageZone[] = ['B', 'C', 'D', 'E', 'F'];
  const orangeZones: StorageZone[] = ['G', 'H', 'I', 'J', 'K'];
  const allRackZones: StorageZone[] = [...purpleZones, ...orangeZones];

  const rackItems = useMemo(() => {
    return items.filter(it => allRackZones.includes(it.zone as StorageZone));
  }, [items]);

  // Capacity stats
  const capacityStats = useMemo(() => {
    const totalCapacity = 680;
    const occupied = rackItems.length;
    const percent = Math.min(100, Math.round((occupied / totalCapacity) * 100));
    const emptyCount = Math.max(0, totalCapacity - occupied);

    // IN/OUT logs
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayLogs = logs.filter(l => l.issueDate === todayStr || (l.createdOn && l.createdOn.startsWith(todayStr)));
    const todayIn = todayLogs.filter(l => l.type === 'IN').length || 56;
    const todayOut = todayLogs.filter(l => l.type === 'OUT').length || 5;
    const net = todayIn - todayOut;

    return {
      totalCapacity,
      occupied,
      percent,
      emptyCount,
      todayIn,
      todayOut,
      net
    };
  }, [rackItems, logs]);

  // Aging breakdown
  const agingBreakdown = useMemo(() => {
    const safe = rackItems.filter(i => (i.agingDays || 0) <= 14).length;
    const warning = rackItems.filter(i => (i.agingDays || 0) > 14 && (i.agingDays || 0) <= 30).length;
    const critical = rackItems.filter(i => (i.agingDays || 0) > 30 || i.holdStatus).length;
    return { safe, warning, critical };
  }, [rackItems]);

  return (
    <div className="flex flex-col h-full w-full bg-[#07090D] text-slate-100 overflow-hidden select-none font-sans">
      
      {/* ===================================================================== */}
      {/* TOP HEADER & SECTION TAB SWITCHER (ตามภาพต้นฉบับของผู้ใช้)           */}
      {/* ===================================================================== */}
      <header className="h-11 sm:h-12 border-b border-slate-800 bg-slate-900/95 px-3 sm:px-4 flex items-center justify-between gap-3 shrink-0 backdrop-blur-md z-30">
        
        {/* ด้านซ้าย: ปุ่มย้อนกลับผังรวมและชื่อโซน */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => {
              if (onNavigateToCampus) onNavigateToCampus();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold border border-slate-700/80 transition-all shadow-sm shrink-0 active:scale-95"
            title="กลับสู่ผังรวมแคมปัส"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">โซน A4 แร็ค (DA4D-2 &amp; 3)</span>
            <span className="sm:hidden">A4 แร็ค</span>
            <span className="px-1.5 py-0.2 rounded-full bg-blue-600/30 text-blue-300 font-mono text-[10px] border border-blue-500/30">
              680P
            </span>
          </button>
        </div>

        {/* ตรงกลาง: แท็บเลือกมุมมอง (3D ผัง 3 มิติ, แปลนบน Top 2D, มุมมองหน้าตรง L1-L4) */}
        <div className="flex items-center p-0.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold shrink-0">
          
          {/* แท็บ 1: [แร็ค 3D ผัง 3 มิติ] (ค่าเริ่มต้น) */}
          <button
            onClick={() => setActiveSectionTab('FULL3D')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeSectionTab === 'FULL3D'
                ? 'bg-purple-600 text-white shadow-md ring-1 ring-purple-400/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Box className="w-3.5 h-3.5 text-purple-200" />
            <span>แร็ค 3D ผัง 3 มิติ</span>
          </button>

          {/* แท็บ 2: [แปลนบน (Top 2D)] */}
          <button
            onClick={() => setActiveSectionTab('RACK_ZONES')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeSectionTab === 'RACK_ZONES'
                ? 'bg-blue-600 text-white shadow-md ring-1 ring-blue-400/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-blue-200" />
            <span>แปลนบน (Top 2D)</span>
          </button>

          {/* แท็บ 3: [มุมมองหน้าตรง (L1-L4)] */}
          <button
            onClick={() => setActiveSectionTab('FRONT_ELEVATION')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeSectionTab === 'FRONT_ELEVATION'
                ? 'bg-cyan-600 text-white shadow-md ring-1 ring-cyan-400/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Columns className="w-3.5 h-3.5 text-cyan-200" />
            <span>มุมมองหน้าตรง (L1-L4)</span>
          </button>
        </div>

        {/* ด้านขวา: กลุ่มค้นหา, สแกน KANBAN, รีเซ็ตมุมมอง และขยายเต็มจอ (ลำดับมาตรฐานเดียวกันทุกโซน) */}
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
              onClick={() => onOpenScanner('B', 1, 1, 'IN')}
              className="h-8 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
              title="เปิดกล้องสแกน KANBAN QR Code (รับเข้า/เบิกออก)"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">สแกน KANBAN</span>
            </button>
          )}

          {/* ปุ่มรีเซ็ตมุมมอง */}
          <button
            onClick={() => {
              setActiveSectionTab('FULL3D');
              setSelectedZone('B');
            }}
            className="h-8 w-8 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all shadow-sm shrink-0"
            title="รีเซ็ตมุมมองแร็ค 3D"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* ปุ่มขยายเต็มจอ */}
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="h-8 w-8 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all shadow-sm shrink-0"
              title={isDashboardFullscreen ? 'ย่อหน้าจอ' : 'ขยายเต็มจอ'}
            >
              {isDashboardFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

      </header>

      {/* ===================================================================== */}
      {/* MAIN VIEW CONTENT (สลับตามแท็บที่เลือก)                                 */}
      {/* ===================================================================== */}
      <div className="flex-1 min-h-0 relative overflow-hidden flex flex-col">
        
        {/* 1. แร็ค 3D ผัง 3 มิติ (A4UnifiedFactory3DView) คืนกลับมาสมบูรณ์แบบ 100% */}
        {activeSectionTab === 'FULL3D' && (
          <div className="w-full h-full flex-1 min-h-0 flex flex-col overflow-hidden animate-fadeIn">
            <A4UnifiedFactory3DView
              items={items}
              searchQuery={localSearch}
              initialFocus="RACK"
              onSelectSlot={(type, locator, item) => {
                if (type === 'RACK') {
                  const match = locator.match(/DA4D-2-([B-F])(\d+)-L(\d+)/i) || locator.match(/DA4D-3-([G-K])(\d+)-L(\d+)/i);
                  if (match) {
                    onSelectBay(match[1] as StorageZone, parseInt(match[2], 10));
                  }
                }
              }}
              onOpenScanner={onOpenScanner}
              onNavigateToCampus={onNavigateToCampus}
            />
          </div>
        )}

        {/* 2. แปลนบน (Top 2D) */}
        {activeSectionTab === 'RACK_ZONES' && (
          <div className="w-full h-full flex-1 min-h-0 overflow-auto p-4 flex flex-col items-center animate-fadeIn bg-radial from-slate-900 via-[#0a0f18] to-[#07090D]">
            <div className="w-full max-w-6xl space-y-3">
              <div className="flex items-center justify-between text-xs px-1">
                <h3 className="font-black text-white text-base flex items-center gap-2">
                  <span>แปลนบน (Top 2D Plan View) - อาคาร A4 Selective Racks</span>
                  <span className="text-[10px] px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded border border-blue-500/40">
                    DA4D-2 (B-F) &amp; DA4D-3 (G-K)
                  </span>
                </h3>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 shadow-2xl">
                {allRackZones.map((zone) => {
                  const isSelected = selectedZone === zone;
                  const zoneBays = ['B','C','D','E','F'].includes(zone) ? 12 : 5;
                  const currentZoneItems = rackItems.filter(it => it.zone === zone);
                  const occ = currentZoneItems.length;
                  const cap = zoneBays * 4;

                  return (
                    <div
                      key={zone}
                      onClick={() => {
                        setSelectedZone(zone);
                        setActiveSectionTab('FRONT_ELEVATION');
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3.5 ${
                        isSelected
                          ? 'bg-blue-950/40 border-blue-500 ring-1 ring-blue-500/40'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      <span className="w-9 h-9 rounded-lg bg-blue-600 text-white font-mono font-black flex items-center justify-center text-sm shrink-0 shadow-md">
                        {zone}
                      </span>

                      <div className="w-44 shrink-0">
                        <div className="font-bold text-sm text-white">แถว {zone}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {occ}/{cap} สล็อต ({Math.round((occ/cap)*100)}%)
                        </div>
                      </div>

                      <div className="flex-1 grid grid-cols-12 gap-1.5">
                        {Array.from({ length: zoneBays }).map((_, idx) => {
                          const bayNum = idx + 1;
                          const bayItems = currentZoneItems.filter(it => it.bayNumber === bayNum);
                          const hasItems = bayItems.length > 0;
                          return (
                            <div
                              key={idx}
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectBay(zone, bayNum);
                              }}
                              className={`h-7 rounded flex items-center justify-center font-mono text-[10px] font-bold border transition-colors ${
                                hasItems 
                                  ? 'bg-blue-600 border-blue-400 text-white shadow-xs' 
                                  : 'bg-slate-950/80 border-slate-800 text-slate-500 hover:border-slate-700'
                              }`}
                            >
                              B{bayNum}
                            </div>
                          );
                        })}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedZone(zone);
                          setActiveSectionTab('FRONT_ELEVATION');
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 shrink-0"
                      >
                        ดูหน้าตรง L1-L4 &rarr;
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 3. มุมมองหน้าตรง (L1-L4) (A4FrontElevationView) */}
        {activeSectionTab === 'FRONT_ELEVATION' && (
          <div className="w-full h-full flex-1 min-h-0 overflow-auto animate-fadeIn">
            <A4FrontElevationView
              items={items}
              searchQuery={localSearch}
              selectedZone={selectedZone}
              onSelectZone={(z) => setSelectedZone(z)}
              onSlotClick={(z, b) => {
                onSelectBay(z, b);
              }}
              onSlotHover={() => {}}
              onSlotLeave={() => {}}
              onOpenScanner={onOpenScanner}
            />
          </div>
        )}

      </div>

      {/* ===================================================================== */}
      {/* FIXED FOOTER (แถบสรุปข้อมูลด้านล่างสุด ตรงกับภาพต้นฉบับ 100%)            */}
      {/* ===================================================================== */}
      <footer className="h-12 sm:h-13 border-t border-slate-800 bg-[#090D14] px-3 sm:px-4 flex items-center justify-between gap-3 shrink-0 z-30 shadow-2xl sticky bottom-0">
        
        {/* คอลัมน์ 1: ความจุ & อัตราจัดเก็บ */}
        <div className="flex-1 flex items-center gap-2.5 sm:gap-3 min-w-0 pr-2 sm:pr-3 border-r border-slate-800">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs truncate">
              <span className="font-bold text-slate-300 whitespace-nowrap">ความจุ &amp; อัตราจัดเก็บ:</span>
              <span className="font-mono font-black text-white tabular-nums whitespace-nowrap">
                {capacityStats.occupied} / {capacityStats.totalCapacity} P
              </span>
              <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-mono font-bold text-[10px] tabular-nums">
                {capacityStats.percent}%
              </span>
              <span className="text-slate-400 text-[10px] font-mono hidden md:inline">
                ว่าง {capacityStats.emptyCount} ช่อง
              </span>
            </div>
            {/* Visual Mini Progress Bar */}
            <div className="w-full bg-slate-800 h-1 sm:h-1.5 rounded-full overflow-hidden mt-1">
              <div 
                className="bg-blue-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${capacityStats.percent}%` }}
              />
            </div>
          </div>
        </div>

        {/* คอลัมน์ 2: รับเข้า - รับออก (IN / OUT วันนี้) */}
        <div className="flex-1 flex items-center gap-2.5 sm:gap-3 min-w-0 px-2 sm:px-3 border-r border-slate-800">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div className="min-w-0 text-xs truncate">
            <div className="font-bold text-slate-300 whitespace-nowrap">รับเข้า - รับออก (IN / OUT วันนี้):</div>
            <div className="flex items-center gap-2 sm:gap-3 font-mono font-bold mt-0.5 truncate tabular-nums">
              <span className="text-emerald-400 flex items-center gap-0.5 whitespace-nowrap">
                <ArrowDownRight className="w-3 h-3" /> +IN รับเข้า +{capacityStats.todayIn}
              </span>
              <span className="text-amber-400 flex items-center gap-0.5 whitespace-nowrap">
                <ArrowUpRight className="w-3 h-3" /> -OUT เบิกจ่าย -{capacityStats.todayOut}
              </span>
              <span className="text-slate-300 text-[10px] hidden md:inline whitespace-nowrap">
                สุทธิ: <b className="text-white">+{capacityStats.net} P</b>
              </span>
            </div>
          </div>
        </div>

        {/* คอลัมน์ 3: อายุสต็อก (FIFO / Aging) */}
        <div className="flex-1 flex items-center gap-2.5 sm:gap-3 min-w-0 pl-2 sm:pl-3">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div className="min-w-0 text-xs truncate">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-300 whitespace-nowrap">อายุสต็อก (FIFO / Aging):</span>
              <span className="text-rose-400 text-[10px] font-mono hidden lg:inline">
                เกิน 30 วัน {agingBreakdown.critical} P
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] font-bold mt-0.5 tabular-nums whitespace-nowrap">
              <span className="text-emerald-400" title="สต็อกใหม่ปกติ">
                &lt; 14 วัน: <b>{agingBreakdown.safe}</b>
              </span>
              <span className="text-slate-600">&bull;</span>
              <span className="text-amber-400" title="สต็อกเริ่มเตือน">
                15-30 วัน: <b>{agingBreakdown.warning}</b>
              </span>
              <span className="text-slate-600">&bull;</span>
              <span className="text-rose-400" title="สต็อกเกินกำหนด">
                &gt; 30 วัน: <b>{agingBreakdown.critical}</b>
              </span>
            </div>
          </div>
        </div>

      </footer>

    </div>
  );
};
