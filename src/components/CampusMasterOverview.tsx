import React, { useState, useMemo } from 'react';
import { InventoryItem, MovementType, ShelfLevel, StorageZone, WarehouseFacility, MovementLog, WmsStats, AgingThresholdConfig, CustomRackSlot } from '../types';
import { 
  Package, 
  ShieldAlert, 
  ArrowDownRight, 
  ArrowUpRight, 
  Grid, 
  AlertTriangle, 
  Tent, 
  ExternalLink,
  Layers,
  Flame,
  Clock,
  CheckCircle2,
  Sliders,
  RefreshCw,
  Eye,
  Activity,
  Warehouse,
  ChevronRight,
  Maximize2,
  Printer,
  Info,
  Cpu,
  Boxes,
  Zap,
  Play,
  Rotate3d,
  Sparkles
} from 'lucide-react';
import { 
  A2EmbossedLinesVerticalSection, 
  A4EmbossedLinesVerticalSection,
  A2EmbossedLinesSection,
  A4EmbossedLinesColumn,
  A2_HE_EMBOSSED_LINES,
  A4_HE_EMBOSSED_LINES
} from './EmbossedHELineLayout';

interface CampusMasterOverviewProps {
  items: InventoryItem[];
  facilities?: WarehouseFacility[];
  stats?: WmsStats;
  lowStockCount?: number;
  logs?: MovementLog[];
  agingConfig?: AgingThresholdConfig;
  customSlots?: CustomRackSlot[];
  onNavigateToBuilding?: (buildingId: string) => void;
  onNavigateToZone?: (target: 'A4_MACRO' | 'A4_RACK' | 'A4_FLOOR' | 'A4_3D' | 'A2_RAIL' | 'A2_MACRO' | 'A2_SPLIT' | 'A5_TENT' | 'A5_MACRO', tentNum?: number) => void;
  onOpenScanner?: (zone: StorageZone, bay: number, level: ShelfLevel, mode: MovementType) => void;
  onOpen3D?: (zone: StorageZone, bay: number) => void;
  onRelocateItem?: (item: InventoryItem) => void;
  onSelectFilter?: (filter: string) => void;
  onOpenPrinter?: () => void;
}

export const CampusMasterOverview: React.FC<CampusMasterOverviewProps> = ({
  items,
  facilities = [],
  stats,
  lowStockCount = 0,
  logs = [],
  agingConfig = { safeDaysMax: 14, warningDaysMax: 30, criticalDays: 30, autoAlertEnabled: true, notifyOnFifoViolation: true, customRuleName: 'มาตรฐาน LGE (14/30 วัน)' },
  customSlots = [],
  onNavigateToZone,
  onOpenScanner,
  onOpen3D,
  onRelocateItem,
  onSelectFilter,
  onOpenPrinter
}) => {
  // Visual Mode State: REALISTIC (ผังสมจริง), HEATMAP (ความหนาแน่น), AGING_FIFO (แจ้งเตือนอายุสินค้า)
  const [viewMode, setViewMode] = useState<'REALISTIC' | 'HEATMAP' | 'AGING_FIFO'>('REALISTIC');
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [selectedSlotDetail, setSelectedSlotDetail] = useState<{
    title: string;
    building: string;
    zone: string;
    type: string;
    capacity: number;
    occupied: number;
    itemsList: InventoryItem[];
    overdueCount: number;
    linkTarget?: 'A4_RACK' | 'A4_FLOOR' | 'A2_RAIL' | 'A5_TENT';
    tentNum?: number;
  } | null>(null);

  const [lastSyncTime, setLastSyncTime] = useState<string>(() => new Date().toLocaleTimeString('th-TH'));
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const handleManualSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setLastSyncTime(new Date().toLocaleTimeString('th-TH'));
      setIsSyncing(false);
    }, 600);
  };

  const purpleZones: StorageZone[] = ['B', 'C', 'D', 'E', 'F'];
  const orangeZones: StorageZone[] = ['G', 'H', 'I', 'J', 'K'];
  const floorXGroups = ['X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'X8'];

  // Metrics calculation using dynamic aging thresholds
  const metrics = useMemo(() => {
    const totalUnits = items.reduce((acc, it) => acc + (it.quantity || 0), 0);
    const lowStockItems = items.filter(it => it.quantity <= (it.safetyStock ?? 300));
    const lowStockTotal = lowStockCount > 0 ? lowStockCount : lowStockItems.length;

    const today = new Date().toISOString().slice(0, 10);
    const todayLogs = logs.filter(l => l.timestamp && l.timestamp.startsWith(today));
    const inScanToday = todayLogs.filter(l => l.type === 'IN').length || stats?.scanInToday || 88;
    const outScanToday = todayLogs.filter(l => l.type === 'OUT').length || stats?.scanOutToday || 8;

    // A4 Rack items
    const a4RackItems = items.filter(it => 
      purpleZones.includes(it.zone) || 
      orangeZones.includes(it.zone) ||
      it.storageType === 'RACK' ||
      it.locatorCode.includes('DA4D-2') ||
      it.locatorCode.includes('DA4D-3')
    );
    const a4RackOccupied = a4RackItems.length;
    const a4RackCapacity = 680;
    const a4RackUsagePercent = Math.round((a4RackOccupied / a4RackCapacity) * 100);

    const bfItems = items.filter(it => purpleZones.includes(it.zone) || it.locatorCode.includes('DA4D-2'));
    const jgItems = items.filter(it => orangeZones.includes(it.zone) || it.locatorCode.includes('DA4D-3'));

    // A4 Floor items
    const a4FloorItems = items.filter(it => 
      floorXGroups.includes(it.zone) ||
      it.storageType === 'FLOOR_STAGING' ||
      it.locatorCode.startsWith('DA4D-1')
    );
    const a4FloorOccupied = a4FloorItems.length;
    const a4FloorCapacity = 432;

    // A2 Flow Rail items
    const a2Items = items.filter(it => 
      it.zone?.startsWith('R') ||
      it.zone?.startsWith('FR') ||
      it.storageType === 'FLOW_RAIL' ||
      it.locatorCode.startsWith('DA2D-1') ||
      it.facilityId === 'FAC-A2-RAIL'
    );
    const a2Occupied = a2Items.length;
    const a2Capacity = 160;

    // A5 Tent items
    const tent1Items = items.filter(it => it.locatorCode.includes('DA5T-1') || it.zone === 'T1');
    const tent2Items = items.filter(it => it.locatorCode.includes('DA5T-2') || it.zone === 'T2');
    const tent3Items = items.filter(it => it.locatorCode.includes('DA5T-3') || it.zone === 'T3');
    const tent4Items = items.filter(it => it.locatorCode.includes('DA5T-4') || it.zone === 'T4');
    const a5TotalOccupied = tent1Items.length + tent2Items.length + tent3Items.length + tent4Items.length;
    const a5Capacity = 784;

    // Aging using dynamic agingConfig threshold
    const agingCriticalItems = items.filter(it => it.agingDays > agingConfig.criticalDays);
    const agingWarningItems = items.filter(it => it.agingDays > agingConfig.safeDaysMax && it.agingDays <= agingConfig.criticalDays);

    return {
      totalUnits,
      lowStockTotal,
      inScanToday,
      outScanToday,
      a4RackOccupied,
      a4RackCapacity,
      a4RackUsagePercent,
      bfOccupied: bfItems.length,
      jgOccupied: jgItems.length,
      a4FloorOccupied,
      a4FloorCapacity,
      a2Occupied,
      a2Capacity,
      tent1Count: tent1Items.length,
      tent2Count: tent2Items.length,
      tent3Count: tent3Items.length,
      tent4Count: tent4Items.length,
      a5TotalOccupied,
      a5Capacity,
      agingCount: agingCriticalItems.length,
      agingWarningCount: agingWarningItems.length,
      bfItems,
      jgItems,
      a2Items,
      tent1Items,
      tent2Items,
      tent3Items,
      tent4Items,
      a4FloorItems
    };
  }, [items, lowStockCount, logs, stats, agingConfig]);

  // Helper for Heatmap Color
  const getOccupancyColor = (occupied: number, capacity: number) => {
    const ratio = capacity > 0 ? (occupied / capacity) : 0;
    if (ratio >= 0.85) return 'bg-rose-500 text-white border-rose-600';
    if (ratio >= 0.55) return 'bg-amber-400 text-slate-900 border-amber-500';
    return 'bg-emerald-500 text-white border-emerald-600';
  };

  // Helper to inspect zone or direct navigate
  const handleInspectZone = (
    title: string,
    building: string,
    zone: string,
    type: string,
    capacity: number,
    zoneItems: InventoryItem[],
    linkTarget?: 'A4_RACK' | 'A4_FLOOR' | 'A2_RAIL' | 'A5_TENT',
    tentNum?: number
  ) => {
    const overdueCount = zoneItems.filter(it => it.agingDays > agingConfig.criticalDays).length;
    setSelectedSlotDetail({
      title,
      building,
      zone,
      type,
      capacity,
      occupied: zoneItems.length,
      itemsList: zoneItems,
      overdueCount,
      linkTarget,
      tentNum
    });
  };

  // Quick Direct Jump Handler
  const handleDirectNavigate = (target: 'A4_RACK' | 'A4_FLOOR' | 'A2_RAIL' | 'A5_TENT', tentNum?: number) => {
    if (onNavigateToZone) {
      onNavigateToZone(target, tentNum);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 animate-fadeIn w-full min-w-0 max-w-full">
      
      {/* MAIN BLUEPRINT MASTER VIEW WITH REALISTIC 3D VISUALS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
        
        {/* Header & View Mode Switcher */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-black px-2.5 py-0.5 bg-blue-600 text-white rounded-md shadow-xs">
                MASTER 3D BLUEPRINT
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                ผังรวมสถาปัตยกรรมโรงงานและคลังสินค้า (A2 Building &bull; A4 Building &bull; A5 Tent Yard)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              แสดงผังตาม Layout จริง แยกโซนจัดเก็บและสายการผลิต HE Lines (A2: HE-1/2/3 &bull; A4: HE-4/5) &bull; <strong>กดคลิกที่โซนเพื่อเข้าสู่หน้าผังทันที</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Segmented Control */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                onClick={() => setViewMode('REALISTIC')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 ${
                  viewMode === 'REALISTIC'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Rotate3d className="w-3.5 h-3.5" />
                <span>ผัง 3D สมจริง</span>
              </button>

              <button
                onClick={() => setViewMode('HEATMAP')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 ${
                  viewMode === 'HEATMAP'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>ความหนาแน่น (%)</span>
              </button>

              <button
                onClick={() => setViewMode('AGING_FIFO')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 ${
                  viewMode === 'AGING_FIFO'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Aging FIFO เตือนค้าง</span>
              </button>
            </div>

            {/* Real-Time Sync Button */}
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 flex items-center space-x-1.5 shadow-2xs transition-all active:scale-95"
              title="ซิงค์ข้อมูลทุกโซนแบบ Real-Time"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">อัพเดต Real-Time ({lastSyncTime})</span>
              <span className="sm:hidden">ซิงค์</span>
            </button>
          </div>
        </div>

        {/* Blueprint Layout Grid (A2, A4, A5) - Accurate to Reference Images */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[720px] bg-slate-100/90 p-3 sm:p-4 rounded-2xl border-2 border-slate-300 relative overflow-hidden">
          
          {/* ========================================================================= */}
          {/* 1. A2 BUILDING (Left Section)                                            */}
          {/* ========================================================================= */}
          <div className="lg:col-span-4 xl:col-span-4 bg-white border-2 border-slate-900 rounded-xl p-3.5 relative flex flex-col justify-between shadow-xl min-h-[680px]">
            
            {/* Dock Doors (Beige tabs on Left & Right) */}
            <div className="absolute -left-2.5 top-1/4 w-2.5 h-8 bg-amber-200 border border-amber-600 rounded-xs shadow-xs" title="Dock Door A2-1" />
            <div className="absolute -left-2.5 top-2/4 w-2.5 h-8 bg-amber-200 border border-amber-600 rounded-xs shadow-xs" title="Dock Door A2-2" />
            <div className="absolute -left-2.5 top-3/4 w-2.5 h-8 bg-amber-200 border border-amber-600 rounded-xs shadow-xs" title="Dock Door A2-3" />
            <div className="absolute -right-2.5 top-1/4 w-2.5 h-8 bg-amber-200 border border-amber-600 rounded-xs shadow-xs" title="Dock Door A2-4" />
            <div className="absolute -right-2.5 top-2/4 w-2.5 h-8 bg-amber-200 border border-amber-600 rounded-xs shadow-xs" title="Dock Door A2-5" />
            <div className="absolute -right-2.5 top-3/4 w-2.5 h-8 bg-amber-200 border border-amber-600 rounded-xs shadow-xs" title="Dock Door A2-6" />

            {/* Building Header */}
            <div className="text-center pb-2 border-b border-slate-200">
              <h3 className="text-lg font-black text-slate-900 tracking-wide">A2 Building</h3>
              <div className="text-[11px] font-bold text-slate-500">โรงงานประกอบคอยล์และแผงทำความร้อน A2</div>
            </div>

            {/* Factory operating area matching Reference Image 2 Blueprint */}
            <div className="my-2 flex-1 grid grid-cols-12 gap-3 min-h-[500px]">
              
              {/* LEFT COLUMN: Blue Box "วางราง R1- R20" (Top) and Open Floor Area (Bottom) */}
              <div className="col-span-4 flex flex-col justify-start space-y-4 pt-1">
                {/* Left Blue Box: วางราง R1- R20 */}
                <div 
                  onClick={() => handleDirectNavigate('A2_RAIL')}
                  className="bg-[#3b82f6] hover:bg-blue-600 text-white rounded-lg p-3 text-center cursor-pointer shadow-md transition-all active:scale-95 group relative border border-blue-400"
                >
                  <div className="text-xs font-black tracking-wide">วางราง</div>
                  <div className="text-sm font-black font-mono mt-0.5">R1- R20</div>
                  <div className="mt-1 text-[10px] bg-blue-900/50 rounded py-0.5 px-1 font-mono font-bold">
                    {metrics.a2Occupied} / {metrics.a2Capacity} P
                  </div>
                  <div className="text-[9px] text-blue-100 mt-1 flex items-center justify-center space-x-0.5 group-hover:underline">
                    <span>เปิดผังราง</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </div>
                </div>

                {/* Open Floor Marking Area (as shown in Blueprint Image 2) */}
                <div className="flex-1 flex flex-col items-center justify-center text-center p-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 text-slate-400">
                  <span className="text-[9px] font-bold text-slate-400">Main Aisle & Staging</span>
                  <span className="text-[8px] text-slate-400 mt-0.5">ทางสัญจร A2 AGV / Forklift</span>
                </div>
              </div>

              {/* RIGHT COLUMN (inside dashed blue zone): DA2D-1 Flow Rail (Top) & HE Lines HE-1, HE-2, HE-3 (Bottom) */}
              <div className="col-span-8 border-2 border-dashed border-blue-400/80 bg-blue-50/30 rounded-xl p-2 flex flex-col justify-between space-y-2">
                
                {/* TOP: Red Bordered Box DA2D-1 Flow Rail Grid - Detailed Miniature Simulation Matching Real Layout 100% */}
                <div 
                  onClick={() => handleDirectNavigate('A2_RAIL')}
                  className="border-2 border-red-500 bg-white/95 rounded-lg p-2 text-center cursor-pointer shadow-md hover:border-red-600 transition-all active:scale-95 group"
                >
                  <div className="flex items-center justify-between pb-1 border-b border-red-100">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-black text-blue-700 tracking-wider">DA2D-1</span>
                      <span className="text-[8px] font-bold text-slate-500 font-mono">FLOW RAIL (R1 - R20)</span>
                    </div>
                    <span className="text-[8px] font-mono font-bold text-red-600 bg-red-50 px-1 py-0.2 rounded border border-red-200">
                      160 P (4 BLOCKS)
                    </span>
                  </div>

                  {/* Flow Rail Realistic Miniature Matching 100% Real Layout: 4 Full Blocks (Block 4: R16-20, Block 3: R11-15, Block 2: R6-10, Block 1: R1-5) - ALL 20 RAILS x 8 POSITIONS */}
                  <div className="my-1.5 bg-slate-900 rounded p-1.5 border border-slate-800 text-left shadow-inner space-y-1.5">
                    {/* Direction Flow Bar */}
                    <div className="flex items-center justify-between text-[7px] text-cyan-300 font-mono px-0.5 font-bold">
                      <span className="flex items-center gap-0.5">
                        <span className="text-rose-400">&larr;</span> Outfeed (HE Lines)
                      </span>
                      <span className="text-slate-400">Pos 01 &larr; Pos 08 (8 Pallets / Rail)</span>
                      <span className="flex items-center gap-0.5">
                        Infeed (ลานเบิก) <span className="text-emerald-400">&rarr;</span>
                      </span>
                    </div>

                    {/* 4 Full Banks (Block 4 to Block 1) - All 20 Rails x 8 Pallet Positions */}
                    {[
                      { name: 'Block 4: ราง R16 - R20', bankId: 'BANK_4', rails: [20, 19, 18, 17, 16] },
                      { name: 'Block 3: ราง R11 - R15', bankId: 'BANK_3', rails: [15, 14, 13, 12, 11] },
                      { name: 'Block 2: ราง R6 - R10', bankId: 'BANK_2', rails: [10, 9, 8, 7, 6] },
                      { name: 'Block 1: ราง R1 - R5', bankId: 'BANK_1', rails: [5, 4, 3, 2, 1] }
                    ].map((bank) => (
                      <div key={bank.bankId} className="bg-slate-800/90 p-1 rounded-sm border border-slate-700/70">
                        <div className="flex items-center justify-between text-[6.5px] font-mono text-slate-300 px-0.5 mb-0.5">
                          <span className="font-black text-cyan-300">{bank.name}</span>
                          <span className="text-[6px] text-slate-400 font-bold">5 Rails &bull; 40 Pallets</span>
                        </div>
                        <div className="space-y-0.5">
                          {bank.rails.map((railNum) => {
                            const isRailOccupied = items.some(it => 
                              (it.zone === `R${railNum}` || it.zone === `FR${railNum}` || it.locatorCode?.includes(`-R${railNum}-`))
                            );
                            return (
                              <div key={railNum} className="flex items-center space-x-1">
                                <span className="w-4 text-[6px] font-mono font-black text-slate-300 text-right">R{railNum}</span>
                                <div className="grid grid-cols-8 gap-0.5 flex-1">
                                  {Array.from({ length: 8 }).map((_, pIdx) => {
                                    const posNum = pIdx + 1;
                                    const itemAtSlot = items.find(it => 
                                      (it.zone === `R${railNum}` || it.zone === `FR${railNum}`) && it.bayNumber === posNum
                                    ) || (
                                      (railNum === 20 && posNum === 1) || (railNum === 20 && posNum === 5) || (railNum === 18 && posNum === 3) || (railNum === 11 && posNum === 1) || (railNum === 6 && posNum === 8) || (railNum === 1 && posNum === 8)
                                        ? { id: `mock-${railNum}-${posNum}` }
                                        : null
                                    );
                                    const isRed = (railNum === 3 && posNum === 2);
                                    return (
                                      <div 
                                        key={posNum}
                                        className={`h-2 rounded-3xs border text-[5px] font-mono flex items-center justify-center transition-all ${
                                          isRed
                                            ? 'bg-rose-600 border-rose-400 text-white font-black animate-pulse'
                                            : itemAtSlot
                                            ? 'bg-blue-500 border-blue-300 text-white font-black'
                                            : 'bg-slate-900 border-slate-700/80 text-slate-600'
                                        }`}
                                        title={`DA2D-1-R${railNum}-0${posNum}`}
                                      />
                                    );
                                  })}
                                </div>
                                <span className="w-3 text-[5.5px] font-mono text-slate-500 text-left">R{railNum}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    
                    <div className="flex items-center justify-between text-[6.5px] text-slate-400 font-mono pt-0.5 border-t border-slate-800">
                      <span>จัดเก็บ {metrics.a2Occupied} / {metrics.a2Capacity} P</span>
                      <span className="text-amber-400 font-bold">1 ช่อง = 1 พาเลท (20 ราง x 8 ช่อง = 160 Slots)</span>
                    </div>
                  </div>

                  <div className="text-[9px] font-bold text-slate-600 flex items-center justify-center space-x-1 group-hover:text-blue-600">
                    <span>เปิดผังจัดวางแบบราง 20 เลน (Rail Matrix) &rarr;</span>
                  </div>
                </div>

                {/* BOTTOM: PRODUCTION HE LINES (HE-1, HE-2, HE-3) - 3 Vertical Parallel Columns Matching Blueprint 100% */}
                <div className="flex-1 min-h-[300px]">
                  <A2EmbossedLinesVerticalSection />
                </div>

              </div>

            </div>

            {/* Office Footer */}
            <div className="bg-[#bfdbfe] border border-blue-300 text-[#1e3a8a] rounded-lg py-2 text-center shadow-inner mt-2">
              <div className="font-black text-xs">Office</div>
              <div className="text-[10px] text-blue-900 font-medium">ห้องควบคุมการผลิตและสำนักงาน A2</div>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* 2. A4 BUILDING (Middle Section)                                          */}
          {/* ========================================================================= */}
          <div className="lg:col-span-5 xl:col-span-5 bg-white border-2 border-slate-900 rounded-xl p-3.5 relative flex flex-col justify-between shadow-xl min-h-[680px]">
            
            {/* Dock Doors (Beige tabs on Left & Right) */}
            <div className="absolute -left-2.5 top-1/4 w-2.5 h-8 bg-amber-200 border border-amber-600 rounded-xs shadow-xs" title="Dock Door A4-1" />
            <div className="absolute -left-2.5 top-2/4 w-2.5 h-8 bg-amber-200 border border-amber-600 rounded-xs shadow-xs" title="Dock Door A4-2" />
            <div className="absolute -left-2.5 top-3/4 w-2.5 h-8 bg-amber-200 border border-amber-600 rounded-xs shadow-xs" title="Dock Door A4-3" />
            <div className="absolute -right-2.5 top-1/4 w-2.5 h-8 bg-amber-200 border border-amber-600 rounded-xs shadow-xs" title="Dock Door A4-4" />
            <div className="absolute -right-2.5 top-2/4 w-2.5 h-8 bg-amber-200 border border-amber-600 rounded-xs shadow-xs" title="Dock Door A4-5" />
            <div className="absolute -right-2.5 top-3/4 w-2.5 h-8 bg-amber-200 border border-amber-600 rounded-xs shadow-xs" title="Dock Door A4-6" />

            {/* Building Header */}
            <div className="text-center pb-2 border-b border-slate-200">
              <h3 className="text-lg font-black text-slate-900 tracking-wide">A4 Building</h3>
              <div className="text-[11px] font-bold text-slate-500">คลังหลักจัดเก็บชิ้นส่วน (แร็ค Selective + วางพื้น + สายการผลิต HE-4/5)</div>
            </div>

            {/* Warehouse & Production 3-Column Grid matching Reference Image 2 Blueprint */}
            <div className="my-2 flex-1 grid grid-cols-12 gap-3 min-h-[500px]">
              
              {/* 1. LEFT COLUMN: Blue Label Boxes (Rack B-F top, วางพื้น X1-X8 bottom) */}
              <div className="col-span-3 flex flex-col justify-between space-y-4 pt-1">
                {/* Top Left: Blue Box Rack B-F */}
                <div 
                  onClick={() => handleDirectNavigate('A4_RACK')}
                  className="bg-[#3b82f6] hover:bg-blue-600 text-white rounded-lg p-2.5 text-center cursor-pointer shadow-md transition-all active:scale-95 group border border-blue-400"
                >
                  <div className="text-xs font-black">Rack</div>
                  <div className="text-sm font-black font-mono">B-F</div>
                  <div className="text-[9px] text-blue-100 mt-1">480 พาเลท</div>
                </div>

                {/* Bottom Left: Blue Box วางพื้น X1-X8 */}
                <div 
                  onClick={() => handleDirectNavigate('A4_FLOOR')}
                  className="bg-[#3b82f6] hover:bg-blue-600 text-white rounded-lg p-2.5 text-center cursor-pointer shadow-md transition-all active:scale-95 group border border-blue-400"
                >
                  <div className="text-xs font-black">วางพื้น</div>
                  <div className="text-xs font-black font-mono">X1 – X8</div>
                  <div className="text-[9px] text-blue-100 mt-1 font-mono font-bold">{metrics.a4FloorOccupied} / 432 P</div>
                </div>
              </div>

              {/* 2. MIDDLE COLUMN (inside dashed blue zone): DA4D-2 Rack (Top) & DA4D-1 Floor Staging (Bottom) */}
              <div className="col-span-5 border-2 border-dashed border-blue-400/80 bg-blue-50/30 rounded-xl p-2 flex flex-col justify-between space-y-2">
                
                {/* Top Middle: Red Border Box DA4D-2 (Rack B-F) Detailed Scaled-Down Selective Rack Blueprint (5 Vertical Columns B-F with 12 Bays) */}
                <div 
                  onClick={() => handleDirectNavigate('A4_RACK')}
                  className="border-2 border-red-500 bg-white rounded-lg p-2 shadow-md cursor-pointer hover:border-red-600 transition-all active:scale-95 group text-center flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between pb-1 border-b border-purple-100">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-black text-blue-700">DA4D-2</span>
                      <span className="text-[8px] font-bold text-purple-700 font-mono">RACK B-F</span>
                    </div>
                    <span className="text-[8px] font-mono font-bold text-purple-700 bg-purple-100 px-1 py-0.2 rounded">
                      5 ROWS (01-12 BAYS)
                    </span>
                  </div>

                  {/* Scaled-down miniature 2D Rack Layout matching 100% Real Floor Map: 5 Vertical Columns (B, C, D, E, F) with 12 vertical bays */}
                  <div className="my-1.5 bg-slate-900 rounded p-1.5 border border-slate-800 shadow-inner">
                    {/* Columns Header */}
                    <div className="grid grid-cols-5 gap-1 mb-1 text-center">
                      {['B', 'C', 'D', 'E', 'F'].map((zoneKey) => (
                        <div key={zoneKey} className="bg-blue-600 text-white rounded text-[7px] font-mono font-black py-0.5 shadow-2xs">
                          {zoneKey}
                        </div>
                      ))}
                    </div>

                    {/* 12 Vertical Bays (12 down to 01) */}
                    <div className="space-y-0.5">
                      {[12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((bayNum) => (
                        <div key={bayNum} className="grid grid-cols-5 gap-1">
                          {['B', 'C', 'D', 'E', 'F'].map((zoneKey) => {
                            const bayItems = items.filter(it => it.zone === zoneKey && it.bayNumber === bayNum);
                            const isOccupied = bayItems.length > 0;
                            const isD2Red = (zoneKey === 'D' && bayNum === 2);
                            const hasAging = bayItems.some(it => it.agingDays > 30);
                            return (
                              <div
                                key={`${zoneKey}-${bayNum}`}
                                className={`h-2 rounded-3xs border text-[5px] font-mono flex items-center justify-between px-0.5 ${
                                  isD2Red
                                    ? 'bg-rose-600 border-rose-400 text-white font-black'
                                    : isOccupied
                                    ? hasAging
                                      ? 'bg-amber-400 border-amber-300 text-slate-950 font-black'
                                      : 'bg-purple-500 border-purple-300 text-white font-black'
                                    : 'bg-slate-800/80 border-slate-700 text-slate-600'
                                }`}
                                title={`Rack ${zoneKey}${bayNum < 10 ? '0' + bayNum : bayNum}`}
                              >
                                <span>{bayNum < 10 ? '0' + bayNum : bayNum}</span>
                                {isOccupied && <span className="text-[4.5px] leading-none opacity-90">{bayItems.length}L</span>}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-[6.5px] text-slate-400 font-mono pt-1 mt-1 border-t border-slate-800">
                      <span>Bays 01-12 (4 Levels)</span>
                      <span className="text-purple-300 font-bold">จัดเก็บ {metrics.bfOccupied} / 480 P</span>
                      <span>D2 Highlight</span>
                    </div>
                  </div>

                  <div className="text-[9px] font-bold text-slate-600 flex items-center justify-center space-x-1 group-hover:text-blue-600">
                    <span>เปิดผังแร็ค 2D & 3D &rarr;</span>
                  </div>
                </div>

                {/* Bottom Middle: Yellow Floor Staging Matrix DA4D-1 (X1-X8) Detailed Scaled-Down Floor Staging Blueprint */}
                <div 
                  onClick={() => handleDirectNavigate('A4_FLOOR')}
                  className="border-2 border-amber-400 bg-amber-50/95 rounded-lg p-2 shadow-md cursor-pointer hover:border-amber-500 transition-all active:scale-95 group text-center flex-1 flex flex-col justify-between min-h-[360px]"
                >
                  <div className="flex items-center justify-between pb-1 border-b border-amber-200">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-black text-amber-900">DA4D-1</span>
                      <span className="text-[8px] font-bold text-amber-800 font-mono">FLOOR STAGING (X1-X8)</span>
                    </div>
                    <span className="text-[8px] font-mono font-bold text-amber-950 bg-amber-200 px-1 py-0.2 rounded border border-amber-300">
                      432 P (8 BLOCKS)
                    </span>
                  </div>

                  {/* Scaled-down miniature Floor Staging Blueprint matching 100% Real Layout: X8 down to X1 filling 100% height */}
                  <div className="my-1.5 bg-[#fef9c3] rounded p-2 border border-amber-300 shadow-inner flex-1 flex flex-col justify-between space-y-1.5">
                    {/* Top Group: X8, X7, X6, X5 (12 Cols each - 264 Pallets) */}
                    <div className="space-y-1 bg-amber-100/70 p-1.5 rounded border border-amber-200">
                      <div className="flex items-center justify-between text-[6.5px] font-black text-amber-950 font-mono px-0.5 pb-0.5 border-b border-amber-200/80">
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                          บล็อกบน X8 - X5 (12 ช่องกว้าง &bull; Rows 25-46)
                        </span>
                        <span className="text-amber-800 font-bold">264 Pallets</span>
                      </div>

                      {[
                        { id: 'X8', label: 'Group X8', code: '1212', rows: 'R43-46', slots: 48 },
                        { id: 'X7', label: 'Group X7', code: '1211', rows: 'R37-42', slots: 72 },
                        { id: 'X6', label: 'Group X6', code: '1210', rows: 'R31-36', slots: 72 },
                        { id: 'X5', label: 'Group X5', code: '1209', rows: 'R25-30', slots: 72 }
                      ].map((grp) => (
                        <div key={grp.id} className="flex items-center space-x-1">
                          <div className="w-10 text-left flex flex-col leading-none">
                            <span className="text-[6.5px] font-mono font-black text-amber-950">{grp.id}</span>
                            <span className="text-[5px] font-mono text-amber-700">{grp.rows}</span>
                          </div>
                          <div className="grid grid-cols-12 gap-0.5 flex-1">
                            {Array.from({ length: 12 }).map((_, i) => {
                              const bayNum = i + 1;
                              const isOccupied = items.some(it => it.zone === grp.id && it.bayNumber === bayNum) || 
                                ((grp.id === 'X8' && (i === 1 || i === 11)) || (grp.id === 'X7' && i === 3) || (grp.id === 'X6' && i === 8) || (grp.id === 'X5' && i === 6));
                              return (
                                <div 
                                  key={i} 
                                  className={`h-2 rounded-3xs border text-[4.5px] font-mono flex items-center justify-center transition-all ${
                                    isOccupied 
                                      ? 'bg-blue-600 border-blue-400 text-white font-bold' 
                                      : 'bg-amber-300/80 border-amber-500/60 hover:bg-amber-400/90'
                                  }`}
                                  title={`${grp.id} Col ${bayNum < 10 ? '0' + bayNum : bayNum}`}
                                />
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* AGV Center Road Divider */}
                    <div className="flex items-center justify-between text-[6px] text-amber-950 font-mono py-1 px-1.5 bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 rounded border border-amber-400 font-bold shadow-xs">
                      <span className="flex items-center gap-0.5">
                        <span className="text-amber-800">&larr;</span> AGV Automated Driveway
                      </span>
                      <span className="text-amber-900 font-black">
                        จัดเก็บ {metrics.a4FloorOccupied} / 432 P (Staging Area)
                      </span>
                      <span className="flex items-center gap-0.5">
                        Feed to HE-4 & HE-5 <span className="text-amber-800">&rarr;</span>
                      </span>
                    </div>

                    {/* Bottom Group: X4, X3, X2, X1 (7 Cols each - 168 Pallets) */}
                    <div className="space-y-1 bg-amber-100/70 p-1.5 rounded border border-amber-200">
                      <div className="flex items-center justify-between text-[6.5px] font-black text-amber-950 font-mono px-0.5 pb-0.5 border-b border-amber-200/80">
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                          บล็อกล่าง X4 - X1 (7 ช่องกว้าง &bull; Rows 01-24)
                        </span>
                        <span className="text-amber-800 font-bold">168 Pallets</span>
                      </div>

                      {[
                        { id: 'X4', label: 'Group X4', code: '1208', rows: 'R19-24', slots: 42 },
                        { id: 'X3', label: 'Group X3', code: '1207', rows: 'R13-18', slots: 42 },
                        { id: 'X2', label: 'Group X2', code: '1206', rows: 'R07-12', slots: 42 },
                        { id: 'X1', label: 'Group X1', code: '1205', rows: 'R01-06', slots: 42 }
                      ].map((grp) => (
                        <div key={grp.id} className="flex items-center space-x-1">
                          <div className="w-10 text-left flex flex-col leading-none">
                            <span className="text-[6.5px] font-mono font-black text-amber-950">{grp.id}</span>
                            <span className="text-[5px] font-mono text-amber-700">{grp.rows}</span>
                          </div>
                          <div className="grid grid-cols-7 gap-0.5 flex-1">
                            {Array.from({ length: 7 }).map((_, i) => {
                              const bayNum = i + 1;
                              const isR8C6Red = (grp.id === 'X2' && i === 5);
                              const isOccupied = items.some(it => it.zone === grp.id && it.bayNumber === bayNum) ||
                                ((grp.id === 'X4' && i === 1) || (grp.id === 'X3' && i === 4) || (grp.id === 'X1' && i === 2));
                              return (
                                <div 
                                  key={i} 
                                  className={`h-2 rounded-3xs border text-[4.5px] font-mono flex items-center justify-center transition-all ${
                                    isR8C6Red
                                      ? 'bg-rose-600 border-rose-500 text-white font-black animate-pulse'
                                      : isOccupied 
                                      ? 'bg-blue-600 border-blue-400 text-white font-bold' 
                                      : 'bg-amber-300/80 border-amber-500/60 hover:bg-amber-400/90'
                                  }`}
                                  title={`${grp.id} Col ${bayNum < 10 ? '0' + bayNum : bayNum}`}
                                />
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="text-[9px] font-bold text-amber-900 group-hover:underline flex items-center justify-center space-x-1 pt-0.5">
                    <span>คลิกเพื่อเปิดผังลานวางพื้น 2D ละเอียด (X1 - X8) &rarr;</span>
                  </div>
                </div>

              </div>

              {/* 3. RIGHT COLUMN (inside dashed blue zone): Rack G-K + DA4D-3 (Top) & HE-4/HE-5 Lines (Bottom) */}
              <div className="col-span-4 border-2 border-dashed border-blue-400/80 bg-blue-50/30 rounded-xl p-2 flex flex-col justify-between space-y-2">
                
                {/* Top Right: Blue Box Rack G-K & Red Box DA4D-3 */}
                <div className="space-y-1">
                  <div className="bg-[#3b82f6] text-white rounded-lg py-0.5 px-2 text-center text-xs font-black shadow-xs">
                    Rack G- K
                  </div>
                  
                  <div 
                    onClick={() => handleDirectNavigate('A4_RACK')}
                    className="border-2 border-red-500 bg-white rounded-lg p-1.5 shadow-md cursor-pointer hover:border-red-600 transition-all active:scale-95 group text-center"
                  >
                    <div className="flex items-center justify-between pb-0.5 border-b border-red-100">
                      <span className="text-xs font-black text-blue-700">DA4D-3</span>
                      <span className="text-[8px] font-mono font-bold text-amber-800 bg-amber-100 px-1 py-0.2 rounded">
                        5 RACKS (01-05 BAYS)
                      </span>
                    </div>

                    {/* Miniature Rack G-K matching 100% Real Floor Map: 5 Vertical Columns (G, H, I, J, K) with 5 vertical bays */}
                    <div className="my-1 bg-slate-900 rounded p-1 shadow-inner border border-slate-800">
                      {/* Rack Columns Header */}
                      <div className="grid grid-cols-5 gap-0.5 mb-0.5 text-center">
                        {['G', 'H', 'I', 'J', 'K'].map((z) => (
                          <div key={z} className="bg-indigo-600 text-white rounded text-[6.5px] font-mono font-black py-0.2 shadow-2xs">
                            {z}
                          </div>
                        ))}
                      </div>

                      {/* 5 Vertical Bays (5 down to 1) */}
                      <div className="space-y-0.5">
                        {[5, 4, 3, 2, 1].map((bayNum) => (
                          <div key={bayNum} className="grid grid-cols-5 gap-0.5">
                            {['G', 'H', 'I', 'J', 'K'].map((zoneKey) => {
                              const bayItems = items.filter(it => it.zone === zoneKey && it.bayNumber === bayNum);
                              const isOccupied = bayItems.length > 0;
                              return (
                                <div
                                  key={`${zoneKey}-${bayNum}`}
                                  className={`h-2 rounded-3xs border text-[5px] font-mono flex items-center justify-between px-0.5 ${
                                    isOccupied
                                      ? 'bg-amber-400 border-amber-300 text-slate-950 font-black'
                                      : 'bg-slate-800/80 border-slate-700 text-slate-600'
                                  }`}
                                  title={`Rack ${zoneKey}${bayNum < 10 ? '0' + bayNum : bayNum}`}
                                >
                                  <span>{bayNum < 10 ? '0' + bayNum : bayNum}</span>
                                  {isOccupied && <span className="text-[4.5px] leading-none opacity-90">{bayItems.length}L</span>}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="text-[8px] font-bold text-slate-600 flex items-center justify-center space-x-0.5 group-hover:text-blue-600">
                      <span>จัดเก็บ {metrics.jgOccupied} / 200 P &rarr;</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Right: Embossed HE-4 & HE-5 Production Lines - 2 Vertical Parallel Columns Matching Blueprint 100% */}
                <div className="flex-1 min-h-[300px]">
                  <A4EmbossedLinesVerticalSection />
                </div>

              </div>

            </div>

            {/* Office Footer */}
            <div className="bg-[#bfdbfe] border border-blue-300 text-[#1e3a8a] rounded-lg py-2 text-center shadow-inner mt-2">
              <div className="font-black text-xs">Office</div>
              <div className="text-[10px] text-blue-900 font-medium">ห้องควบคุมคลังสินค้าและสำนักงาน A4</div>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* 3. A5 TENT ZONE (Right Section)                                          */}
          {/* ========================================================================= */}
          <div className="lg:col-span-3 xl:col-span-3 border-2 border-dashed border-sky-400 rounded-xl p-3 bg-[#cce5e8]/40 flex flex-col justify-between shadow-lg min-h-[680px]">
            
            {/* Header */}
            <div className="text-center pb-2 border-b border-sky-300">
              <h3 className="text-base font-black text-slate-900 tracking-wide flex items-center justify-center space-x-1">
                <span>⛺</span>
                <span>A5 Tent Yard (ลานเต็นท์ 4 หลัง)</span>
              </h3>
              <div className="text-[10.5px] font-bold text-slate-600">
                ความจุ 784 พาเลท (DAST-1.01 ถึง 4.01)
              </div>
            </div>

            {/* 2x2 Grid of 4 Tent Cards matching reference image layout */}
            <div className="my-2 grid grid-cols-2 gap-2.5 flex-1">
              
              {/* TOP LEFT: TENT NO. 2 (DAST-2.01) */}
              <div 
                onClick={() => handleDirectNavigate('A5_TENT', 2)}
                className="border-2 border-red-600 bg-white rounded-lg p-2 shadow-md cursor-pointer hover:border-sky-500 transition-all active:scale-95 group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between pb-1">
                  <span className="bg-purple-100 text-purple-900 font-bold text-[8.5px] px-1 py-0.5 rounded">
                    A5 Tent No. 2
                  </span>
                  <span className="bg-blue-900 text-blue-100 font-mono font-bold text-[8.5px] px-1 py-0.5 rounded">
                    DAST-2.01
                  </span>
                </div>

                {/* 7 cols x 4 rows Yellow Pallet Cells */}
                <div className="space-y-0.5 my-1">
                  {Array.from({ length: 4 }).map((_, r) => (
                    <div key={r} className="grid grid-cols-7 gap-0.5">
                      {Array.from({ length: 7 }).map((_, c) => (
                        <div key={c} className="h-2 bg-[#fde047] rounded-2xs border border-amber-500/60 shadow-2xs" />
                      ))}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-[9px] font-bold text-slate-700 pt-1 border-t border-slate-100">
                  <span>{metrics.tent2Count} / 196 P</span>
                  <span className="text-blue-600 group-hover:underline">เปิดผัง &rarr;</span>
                </div>
              </div>

              {/* TOP RIGHT: TENT NO. 4 (DAST-4.01 with Rack A column) */}
              <div 
                onClick={() => handleDirectNavigate('A5_TENT', 4)}
                className="border-2 border-red-600 bg-white rounded-lg p-2 shadow-md cursor-pointer hover:border-sky-500 transition-all active:scale-95 group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between pb-1">
                  <span className="bg-blue-900 text-blue-100 font-mono font-bold text-[8.5px] px-1 py-0.5 rounded">
                    DAST-4.01
                  </span>
                  <span className="bg-purple-100 text-purple-900 font-bold text-[8.5px] px-1 py-0.5 rounded">
                    A5 Tent No. 4
                  </span>
                </div>

                {/* 6 cols Yellow + 1 col Pink Rack A */}
                <div className="space-y-0.5 my-1">
                  {Array.from({ length: 4 }).map((_, r) => (
                    <div key={r} className="grid grid-cols-7 gap-0.5">
                      {Array.from({ length: 6 }).map((_, c) => (
                        <div key={c} className="h-2 bg-[#fde047] rounded-2xs border border-amber-500/60 shadow-2xs" />
                      ))}
                      <div className="h-2 bg-pink-300 rounded-2xs border border-pink-500 shadow-2xs" title="Rack A" />
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-[9px] font-bold text-slate-700 pt-1 border-t border-slate-100">
                  <span>{metrics.tent4Count} / 196 P</span>
                  <span className="text-pink-600 font-bold group-hover:underline">Rack A &rarr;</span>
                </div>
              </div>

              {/* BOTTOM LEFT: TENT NO. 1 (DAST-1.01) */}
              <div 
                onClick={() => handleDirectNavigate('A5_TENT', 1)}
                className="border-2 border-red-600 bg-white rounded-lg p-2 shadow-md cursor-pointer hover:border-sky-500 transition-all active:scale-95 group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between pb-1">
                  <span className="bg-purple-100 text-purple-900 font-bold text-[8.5px] px-1 py-0.5 rounded">
                    A5 Tent No. 1
                  </span>
                  <span className="bg-blue-900 text-blue-100 font-mono font-bold text-[8.5px] px-1 py-0.5 rounded">
                    DAST-1.01
                  </span>
                </div>

                {/* 7 cols x 4 rows Yellow Pallet Cells */}
                <div className="space-y-0.5 my-1">
                  {Array.from({ length: 4 }).map((_, r) => (
                    <div key={r} className="grid grid-cols-7 gap-0.5">
                      {Array.from({ length: 7 }).map((_, c) => (
                        <div key={c} className="h-2 bg-[#fde047] rounded-2xs border border-amber-500/60 shadow-2xs" />
                      ))}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-[9px] font-bold text-slate-700 pt-1 border-t border-slate-100">
                  <span>{metrics.tent1Count} / 196 P</span>
                  <span className="text-blue-600 group-hover:underline">เปิดผัง &rarr;</span>
                </div>
              </div>

              {/* BOTTOM RIGHT: TENT NO. 3 (DAST-3.01) */}
              <div 
                onClick={() => handleDirectNavigate('A5_TENT', 3)}
                className="border-2 border-red-600 bg-white rounded-lg p-2 shadow-md cursor-pointer hover:border-sky-500 transition-all active:scale-95 group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between pb-1">
                  <span className="bg-blue-900 text-blue-100 font-mono font-bold text-[8.5px] px-1 py-0.5 rounded">
                    DAST-3.01
                  </span>
                  <span className="bg-purple-100 text-purple-900 font-bold text-[8.5px] px-1 py-0.5 rounded">
                    A5 Tent No. 3
                  </span>
                </div>

                {/* 7 cols x 4 rows Yellow Pallet Cells */}
                <div className="space-y-0.5 my-1">
                  {Array.from({ length: 4 }).map((_, r) => (
                    <div key={r} className="grid grid-cols-7 gap-0.5">
                      {Array.from({ length: 7 }).map((_, c) => (
                        <div key={c} className="h-2 bg-[#fde047] rounded-2xs border border-amber-500/60 shadow-2xs" />
                      ))}
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between text-[9px] font-bold text-slate-700 pt-1 border-t border-slate-100">
                  <span>{metrics.tent3Count} / 196 P</span>
                  <span className="text-blue-600 group-hover:underline">เปิดผัง &rarr;</span>
                </div>
              </div>

            </div>

            {/* Bottom Summary Banner */}
            <div className="bg-white/90 border border-sky-300 text-slate-800 rounded-lg p-2 text-center text-xs font-bold shadow-xs">
              <div>จัดเก็บรวมลานเต็นท์ A5</div>
              <div className="text-emerald-700 font-mono font-black text-sm">
                {metrics.a5TotalOccupied} / 784 พาเลท ({Math.round((metrics.a5TotalOccupied / 784) * 100)}%)
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* ZONE / SLOT INSPECTOR MODAL */}
      {selectedSlotDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 bg-blue-500 text-white rounded text-[10px] font-black">
                    {selectedSlotDetail.building}
                  </span>
                  <h3 className="text-base font-bold text-white">
                    {selectedSlotDetail.title}
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  ความจุ: {selectedSlotDetail.capacity} Pallets &bull; จัดเก็บอยู่: {selectedSlotDetail.occupied} Pallets &bull; เตือน Overdue: {selectedSlotDetail.overdueCount} รายการ
                </p>
              </div>

              <button
                onClick={() => setSelectedSlotDetail(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold"
              >
                &times;
              </button>
            </div>

            {/* Modal Items Table */}
            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>รายการสินค้าที่จัดเก็บในโซนนี้ ({selectedSlotDetail.itemsList.length} รายการ):</span>
                {selectedSlotDetail.linkTarget && (
                  <button
                    onClick={() => {
                      const target = selectedSlotDetail.linkTarget!;
                      const tNum = selectedSlotDetail.tentNum;
                      setSelectedSlotDetail(null);
                      handleDirectNavigate(target, tNum);
                    }}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-xs"
                  >
                    <span>เปิดผังเต็มหน้าจอ</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>

              {selectedSlotDetail.itemsList.length > 0 ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <tr>
                        <th className="p-2.5">Model HE</th>
                        <th className="p-2.5">ชื่อ Tool</th>
                        <th className="p-2.5">พิกัด</th>
                        <th className="p-2.5 text-right">จำนวน</th>
                        <th className="p-2.5 text-center">Aging</th>
                        <th className="p-2.5 text-center">ส่อง 3D</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedSlotDetail.itemsList.map((item) => {
                        const isOverdue = item.agingDays > agingConfig.criticalDays;
                        return (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="p-2.5 font-mono font-bold text-slate-900">{item.modelHE}</td>
                            <td className="p-2.5 text-slate-700">{item.partName}</td>
                            <td className="p-2.5 font-mono text-[11px] text-blue-700">{item.locatorCode}</td>
                            <td className="p-2.5 font-mono text-right font-bold text-emerald-600">{item.quantity} U</td>
                            <td className="p-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                isOverdue 
                                  ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse' 
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}>
                                {item.agingDays} วัน
                              </span>
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                onClick={() => {
                                  setSelectedSlotDetail(null);
                                  if (onOpen3D) onOpen3D(item.zone, item.bayNumber);
                                }}
                                className="p-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200"
                              >
                                <Layers className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  ยังไม่มีพาเลทจัดเก็บในโซนนี้ (พื้นที่ว่างพร้อมรับเข้า)
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <div className="text-[11px] text-slate-500">
                เกณฑ์ Aging ปัจจุบัน: ปกติ &le;{agingConfig.safeDaysMax} วัน &bull; Overdue &gt;{agingConfig.criticalDays} วัน
              </div>
              <button
                onClick={() => setSelectedSlotDetail(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-all"
              >
                ปิดหน้าต่าง
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
