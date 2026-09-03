import React, { useState, useMemo, useEffect } from 'react';
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
  Minimize2,
  Printer,
  Info,
  Cpu,
  Boxes,
  Zap,
  Play,
  Pause,
  Rotate3d,
  Sparkles,
  Search,
  X,
  Radio,
  Truck,
  Forklift
} from 'lucide-react';
import { 
  A2EmbossedLinesVerticalSection, 
  A4EmbossedLinesVerticalSection,
  A2EmbossedLinesSection,
  A4EmbossedLinesColumn,
  A2_HE_EMBOSSED_LINES,
  A4_HE_EMBOSSED_LINES
} from './EmbossedHELineLayout';

// Live Zone Movement Item Interface
interface LiveZoneEvent {
  id: string;
  time: string;
  zoneName: string;
  action: 'IN' | 'OUT' | 'MOVE' | 'FEED';
  modelHE: string;
  qty: number;
  fromLocator: string;
  toLocator: string;
  status: 'กำลังเบิก' | 'ลำเลียง AGV' | 'เข้าสู่ไลน์ผลิต' | 'จัดเก็บแล้ว';
}

interface CampusMasterOverviewProps {
  items: InventoryItem[];
  facilities?: WarehouseFacility[];
  stats?: WmsStats;
  lowStockCount?: number;
  logs?: MovementLog[];
  agingConfig?: AgingThresholdConfig;
  customSlots?: CustomRackSlot[];
  onNavigateToBuilding?: (buildingId: string) => void;
  onNavigateToZone?: (target: 'A4_MACRO' | 'A4_RACK' | 'A4_FLOOR' | 'A4_3D' | 'A2_RAIL' | 'A2_MACRO' | 'A2_SPLIT' | 'A5_TENT' | 'A5_MACRO' | 'CY3_TENT', tentNum?: number) => void;
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
  const [isFullMapModal, setIsFullMapModal] = useState<boolean>(false);
  const [isLiveActive, setIsLiveActive] = useState<boolean>(true);
  const [activeLiveEvents, setActiveLiveEvents] = useState<LiveZoneEvent[]>([
    {
      id: 'ev-1',
      time: '14:22:10',
      zoneName: 'A2 Rail (R18)',
      action: 'FEED',
      modelHE: 'ADL74920904',
      qty: 1,
      fromLocator: 'DA2D-1-R18-01',
      toLocator: 'HE-1 Line',
      status: 'เข้าสู่ไลน์ผลิต'
    },
    {
      id: 'ev-2',
      time: '14:21:45',
      zoneName: 'A4 Floor (X6)',
      action: 'MOVE',
      modelHE: 'MEG61839001',
      qty: 1,
      fromLocator: 'DA4D-1-R32-04',
      toLocator: 'HE-4 Line',
      status: 'ลำเลียง AGV'
    },
    {
      id: 'ev-3',
      time: '14:20:12',
      zoneName: 'A4 Rack (D02)',
      action: 'IN',
      modelHE: 'ADL73339002',
      qty: 2,
      fromLocator: 'Infeed Dock A4-2',
      toLocator: 'DA4D-2-D02-03',
      status: 'จัดเก็บแล้ว'
    },
    {
      id: 'ev-4',
      time: '14:18:30',
      zoneName: 'A5 Tent 4 (Rack A)',
      action: 'MOVE',
      modelHE: 'ACG76284709',
      qty: 1,
      fromLocator: 'DAST-4.01-A-02',
      toLocator: 'A4 Staging',
      status: 'กำลังเบิก'
    },
    {
      id: 'ev-5',
      time: '14:16:05',
      zoneName: 'CY3 Tent (Row B)',
      action: 'IN',
      modelHE: 'AEB73820101',
      qty: 1,
      fromLocator: 'Truck Dock CY3',
      toLocator: 'DY3T-1.02-B12-02',
      status: 'จัดเก็บแล้ว'
    }
  ]);

  const [activeZonePulse, setActiveZonePulse] = useState<{
    a2: boolean;
    a4Rack: boolean;
    a4Floor: boolean;
    a5: boolean;
    cy3: boolean;
  }>({
    a2: true,
    a4Rack: false,
    a4Floor: true,
    a5: false,
    cy3: true
  });

  // Cycle real-time live events to show dynamic warehouse movement
  useEffect(() => {
    if (!isLiveActive) return;
    const interval = setInterval(() => {
      const zones = [
        { name: 'A2 Rail (R' + (Math.floor(Math.random() * 20) + 1) + ')', zoneKey: 'a2', action: 'FEED' as const, model: 'ADL74920904', from: 'DA2D-1-R' + (Math.floor(Math.random() * 20) + 1) + '-01', to: 'HE-' + (Math.floor(Math.random() * 3) + 1) + ' Line', status: 'เข้าสู่ไลน์ผลิต' as const },
        { name: 'A4 Floor (X' + (Math.floor(Math.random() * 8) + 1) + ')', zoneKey: 'a4Floor', action: 'MOVE' as const, model: 'MEG61839001', from: 'DA4D-1-R' + (Math.floor(Math.random() * 40) + 1) + '-02', to: 'HE-4 Line (AGV)', status: 'ลำเลียง AGV' as const },
        { name: 'A4 Rack (' + ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'][Math.floor(Math.random() * 10)] + '0' + (Math.floor(Math.random() * 9) + 1) + ')', zoneKey: 'a4Rack', action: 'IN' as const, model: 'ADL73339002', from: 'Dock Infeed', to: 'DA4D-2 Slot', status: 'จัดเก็บแล้ว' as const },
        { name: 'A5 Tent ' + (Math.floor(Math.random() * 4) + 1), zoneKey: 'a5', action: 'MOVE' as const, model: 'ACG76284709', from: 'DAST Tent Yard', to: 'Main Assembly', status: 'กำลังเบิก' as const },
        { name: 'CY3 Tent (Row ' + ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)] + ')', zoneKey: 'cy3', action: 'IN' as const, model: 'AEB73820101', from: 'Truck Infeed', to: 'DY3T-Rack', status: 'จัดเก็บแล้ว' as const }
      ];
      const pick = zones[Math.floor(Math.random() * zones.length)];
      const now = new Date().toLocaleTimeString('th-TH');
      const newEv: LiveZoneEvent = {
        id: 'ev-' + Date.now(),
        time: now,
        zoneName: pick.name,
        action: pick.action,
        modelHE: pick.model,
        qty: Math.floor(Math.random() * 2) + 1,
        fromLocator: pick.from,
        toLocator: pick.to,
        status: pick.status
      };

      setActiveLiveEvents(prev => [newEv, ...prev.slice(0, 5)]);
      setActiveZonePulse(prev => ({
        ...prev,
        [pick.zoneKey]: true
      }));

      setTimeout(() => {
        setActiveZonePulse(prev => ({
          ...prev,
          [pick.zoneKey]: false
        }));
      }, 2500);

    }, 3800);

    return () => clearInterval(interval);
  }, [isLiveActive]);

  const [selectedSlotDetail, setSelectedSlotDetail] = useState<{
    title: string;
    building: string;
    zone: string;
    type: string;
    capacity: number;
    occupied: number;
    itemsList: InventoryItem[];
    overdueCount: number;
    linkTarget?: 'A4_RACK' | 'A4_FLOOR' | 'A2_RAIL' | 'A5_TENT' | 'CY3_TENT';
    tentNum?: number;
  } | null>(null);

  const [lastSyncTime, setLastSyncTime] = useState<string>(() => new Date().toLocaleTimeString('th-TH'));
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const matchingCount = useMemo(() => {
    if (!searchQuery.trim()) return 0;
    const q = searchQuery.toLowerCase().trim();
    return items.filter(it => 
      it.modelHE.toLowerCase().includes(q) || 
      it.locatorCode.toLowerCase().includes(q) ||
      it.partName.toLowerCase().includes(q)
    ).length;
  }, [items, searchQuery]);

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

    // CY3 Tent (4-Tier Rack) items
    const cy3Items = items.filter(it => 
      it.facilityId === 'FAC-CY3-TENT' || 
      it.locatorCode.includes('DY3T') || 
      String(it.zone).startsWith('CY3')
    );
    const cy3Occupied = cy3Items.length;
    const cy3Capacity = 400;

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
      cy3Items,
      cy3Occupied,
      cy3Capacity,
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
    linkTarget?: 'A4_RACK' | 'A4_FLOOR' | 'A2_RAIL' | 'A5_TENT' | 'CY3_TENT',
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
  const handleDirectNavigate = (target: 'A4_RACK' | 'A4_FLOOR' | 'A2_RAIL' | 'A5_TENT' | 'CY3_TENT', tentNum?: number) => {
    if (onNavigateToZone) {
      onNavigateToZone(target, tentNum);
    }
  };

  return (
    <div className="space-y-2 animate-fadeIn w-full min-w-0 max-w-full">
      {/* ULTRA-COMPACT ENTERPRISE TOOLBAR: HEIGHT <= 36px */}
      <div className="h-9 px-2 sm:px-2.5 bg-slate-900 border border-slate-800 rounded-lg text-white shadow-xs flex items-center justify-between gap-1.5 overflow-x-auto">
        
        {/* Left Group: Title + Segmented Mode Switcher + Zone Quick Jump */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Title & Badge */}
          <div className="flex items-center gap-1.5 shrink-0 mr-1">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-[12px] font-black tracking-tight text-white whitespace-nowrap">
              โซนรวมแคมปัส (Master Blueprint)
            </span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded hidden sm:inline">
              2,704P
            </span>
          </div>

          {/* View Mode Selector: Single Segmented Group (H: 26px, Font: 11px, Pad: 2px 8px) */}
          <div className="inline-flex items-center bg-slate-800 p-0.5 rounded-md border border-slate-700 h-[26px] shrink-0">
            <button
              onClick={() => setViewMode('REALISTIC')}
              className={`h-[22px] px-2 py-0.5 rounded text-[11px] font-bold transition-colors flex items-center gap-1 ${
                viewMode === 'REALISTIC'
                  ? 'bg-blue-600 text-white font-black shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Rotate3d className="w-3 h-3" />
              <span>โซน 3D</span>
            </button>
            <button
              onClick={() => setViewMode('HEATMAP')}
              className={`h-[22px] px-2 py-0.5 rounded text-[11px] font-bold transition-colors flex items-center gap-1 ${
                viewMode === 'HEATMAP'
                  ? 'bg-purple-600 text-white font-black shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Activity className="w-3 h-3" />
              <span>ความหนาแน่น</span>
            </button>
            <button
              onClick={() => setViewMode('AGING_FIFO')}
              className={`h-[22px] px-2 py-0.5 rounded text-[11px] font-bold transition-colors flex items-center gap-1 ${
                viewMode === 'AGING_FIFO'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Flame className="w-3 h-3" />
              <span>Aging FIFO</span>
            </button>
          </div>

          {/* Quick Zone Jump Segmented Control (H: 26px, Font: 11px, Pad: 2px 8px) */}
          <div className="hidden md:inline-flex items-center bg-slate-800 p-0.5 rounded-md border border-slate-700 h-[26px] shrink-0">
            <button
              onClick={() => handleDirectNavigate('A2_RAIL')}
              className="h-[22px] px-2 py-0.5 rounded text-[11px] font-bold text-blue-300 hover:text-white hover:bg-blue-600/50 transition-colors"
              title="เปิดโซนรางเลื่อน A2 (DA2D-1)"
            >
              A2 Rail (160P)
            </button>
            <button
              onClick={() => handleDirectNavigate('A4_RACK')}
              className="h-[22px] px-2 py-0.5 rounded text-[11px] font-bold text-purple-300 hover:text-white hover:bg-purple-600/50 transition-colors"
              title="เปิดโซนแร็ค A4 (B-K)"
            >
              A4 Rack (1,040P)
            </button>
            <button
              onClick={() => handleDirectNavigate('A4_FLOOR')}
              className="h-[22px] px-2 py-0.5 rounded text-[11px] font-bold text-amber-300 hover:text-white hover:bg-amber-600/50 transition-colors"
              title="เปิดโซนวางพื้น A4 (X1-X8)"
            >
              A4 Floor (720P)
            </button>
            <button
              onClick={() => handleDirectNavigate('A5_TENT')}
              className="h-[22px] px-2 py-0.5 rounded text-[11px] font-bold text-emerald-300 hover:text-white hover:bg-emerald-600/50 transition-colors"
              title="เปิดโซนเต็นท์ A5 (Tent 1-4)"
            >
              A5 Tent (784P)
            </button>
            <button
              onClick={() => handleDirectNavigate('CY3_TENT')}
              className="h-[22px] px-2 py-0.5 rounded text-[11px] font-bold text-rose-300 hover:text-white hover:bg-rose-600/50 transition-colors"
              title="เปิดโซนเต็นท์ CY3 (4-Floor Rack)"
            >
              CY3 Tent (400P)
            </button>
          </div>

          {/* Real-Time Sync Button */}
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="h-[26px] px-2 py-0.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md text-[11px] font-bold text-slate-300 hover:text-white flex items-center gap-1 shadow-xs transition-colors shrink-0"
            title="ซิงค์ข้อมูล Real-Time"
          >
            <RefreshCw className={`w-3 h-3 text-blue-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden xl:inline">{lastSyncTime}</span>
          </button>

          {/* Live Movements Real-Time Toggle */}
          <button
            onClick={() => setIsLiveActive(!isLiveActive)}
            className={`h-[26px] px-2 py-0.5 rounded-md text-[11px] font-black flex items-center gap-1 shadow-xs transition-all border shrink-0 ${
              isLiveActive 
                ? 'bg-emerald-600/90 hover:bg-emerald-500 text-white border-emerald-400' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'
            }`}
            title="เปิด/ปิด การแสดงการเคลื่อนไหวงาน Real-time"
          >
            <Radio className={`w-3 h-3 ${isLiveActive ? 'text-emerald-200 animate-pulse' : 'text-slate-500'}`} />
            <span>{isLiveActive ? 'Live Real-Time' : 'Live พัก'}</span>
          </button>

          {/* Full-Screen Blueprint Map Button */}
          <button
            onClick={() => setIsFullMapModal(true)}
            className="h-[26px] px-2.5 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-[11px] font-black flex items-center gap-1 shadow-xs transition-all border border-indigo-400 active:scale-95 shrink-0"
            title="ขยายโซนแคมปัสดูเต็มจอ (Full Screen Master Map)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ขยายดูเต็มจอ</span>
          </button>
        </div>

        {/* Right Group: Inline Compact Search (Max-Width 220px, Height 26px) */}
        <div className="relative w-full max-w-[220px] h-[26px] shrink-0 flex items-center ml-auto">
          <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="ค้นหา Model, Locator..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-[26px] bg-slate-800 border border-slate-700 text-white placeholder-slate-400 text-[11px] rounded-md pl-6.5 pr-6 focus:outline-none focus:border-blue-500 transition-colors"
          />
          {searchQuery && (
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {matchingCount > 0 && (
                <span className="text-[9px] font-mono font-bold bg-blue-500/30 text-blue-300 px-1 rounded">
                  {matchingCount}
                </span>
              )}
              <button
                onClick={() => setSearchQuery('')}
                className="p-0.5 text-slate-400 hover:text-white"
                title="ล้างการค้นหา"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* MAIN BLUEPRINT MASTER VIEW WITH REALISTIC 3D VISUALS */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-2.5 sm:p-3 space-y-2.5">

        {/* Live Warehouse Movement Real-time Feed Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 shadow-xs text-white">
          <div className="flex items-center space-x-2 shrink-0">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-black text-emerald-300 tracking-tight flex items-center gap-1">
              <Activity className="w-3.5 h-3.5" />
              <span>การเคลื่อนไหวงาน Real-Time แต่ละโซน:</span>
            </span>
          </div>

          {/* Scrolling Live Event Stream */}
          <div className="flex-1 min-w-0 overflow-x-auto flex items-center space-x-2 scrollbar-none py-0.5">
            {activeLiveEvents.slice(0, 3).map((ev) => (
              <div 
                key={ev.id}
                className="bg-slate-800/90 border border-slate-700/80 rounded px-2 py-0.5 flex items-center space-x-1.5 text-[11px] font-mono shrink-0 shadow-2xs"
              >
                <span className="text-slate-400 text-[10px]">{ev.time}</span>
                <span className="font-bold text-amber-300">{ev.zoneName}</span>
                <span className="text-slate-300">&rarr;</span>
                <span className="text-white font-bold">{ev.modelHE}</span>
                <span className={`px-1 rounded text-[9.5px] font-bold ${
                  ev.action === 'FEED' ? 'bg-blue-900/80 text-blue-200 border border-blue-700' :
                  ev.action === 'MOVE' ? 'bg-amber-900/80 text-amber-200 border border-amber-700' :
                  'bg-emerald-900/80 text-emerald-200 border border-emerald-700'
                }`}>
                  {ev.status}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center space-x-1 shrink-0 text-[10.5px] font-bold text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
            <span>A2, A4, A5, CY3 ซิงค์สด 100%</span>
          </div>
        </div>

        {/* Blueprint Layout Grid (A2, A4, A5) - Accurate to Reference Images */}
        {/* Blueprint Layout Grid (A2, A4, A5, CY3) - Perfectly Fitted to Viewport with 12-Column CSS Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 xl:gap-4 bg-slate-100/90 p-3 sm:p-4 rounded-2xl border-2 border-slate-300 relative overflow-hidden">
          
          {/* ========================================================================= */}
          {/* 1. A2 BUILDING (Left Column - 4 Cols)                                     */}
          {/* ========================================================================= */}
          <div className="lg:col-span-4 xl:col-span-4 bg-white border-2 border-slate-900 rounded-xl p-3 relative flex flex-col justify-between shadow-xl min-h-0">
            
            {/* Dock Doors (Beige tabs on Left & Right) */}
            <div className="absolute -left-2.5 top-1/4 w-2.5 h-7 bg-amber-200 border border-amber-600 rounded-xs shadow-xs" title="Dock Door A2-1" />
            <div className="absolute -left-2.5 top-2/4 w-2.5 h-7 bg-amber-200 border border-amber-600 rounded-xs shadow-xs" title="Dock Door A2-2" />
            <div className="absolute -left-2.5 top-3/4 w-2.5 h-7 bg-amber-200 border border-amber-600 rounded-xs shadow-xs" title="Dock Door A2-3" />
            <div className="absolute -right-2.5 top-1/4 w-2.5 h-7 bg-amber-200 border border-amber-600 rounded-xs shadow-xs" title="Dock Door A2-4" />
            <div className="absolute -right-2.5 top-2/4 w-2.5 h-7 bg-amber-200 border border-amber-600 rounded-xs shadow-xs" title="Dock Door A2-5" />
            <div className="absolute -right-2.5 top-3/4 w-2.5 h-7 bg-amber-200 border border-amber-600 rounded-xs shadow-xs" title="Dock Door A2-6" />

            {/* Building Header */}
            <div className="text-center pb-1.5 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded border border-blue-200">
                  DA2D-1 &bull; 160 P
                </span>
                <h3 className="text-base font-black text-slate-900 tracking-wide">A2 Building</h3>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded border border-emerald-200">
                  HE 1-3
                </span>
              </div>
              <div className="text-[10px] font-bold text-slate-500 mt-0.5">โรงงานประกอบคอยล์และแผงทำความร้อน A2</div>
            </div>

            {/* A2 Blueprint Area: DA2D-1 Flow Rail (Top) + HE-1, HE-2, HE-3 (Bottom) */}
            <div className="my-2.5 flex-1 flex flex-col justify-between space-y-2.5 min-h-0">
              
              {/* TOP: Red Bordered Box DA2D-1 Flow Rail Grid - Compact Locked Aspect Ratio */}
              <div 
                onClick={() => handleDirectNavigate('A2_RAIL')}
                className="border-2 border-red-500 bg-white/95 rounded-lg p-2 text-center cursor-pointer shadow-md hover:border-red-600 transition-all active:scale-95 group shrink-0"
              >
                <div className="flex items-center justify-between pb-1 border-b border-red-100">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-black text-blue-700 tracking-wider">DA2D-1</span>
                    <span className="text-[8.5px] font-bold text-slate-700 font-mono">FLOW RAIL (R1 - R20)</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-[8px] font-mono font-bold text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-200">
                      จัดเก็บ {metrics.a2Occupied} / {metrics.a2Capacity} P
                    </span>
                    <span className="text-[8px] font-mono font-bold text-red-600 bg-red-50 px-1 py-0.2 rounded border border-red-200">
                      4 BLOCKS
                    </span>
                  </div>
                </div>

                {/* Flow Rail 4 Full Blocks (Block 4: R16-20, Block 3: R11-15, Block 2: R6-10, Block 1: R1-5) - ALL 20 RAILS x 8 POSITIONS */}
                <div className="my-1.5 bg-slate-900 rounded p-1.5 border border-slate-800 text-left shadow-inner space-y-1">
                  {/* Direction Flow Bar */}
                  <div className="flex items-center justify-between text-[7px] text-cyan-300 font-mono px-0.5 font-bold">
                    <span className="flex items-center gap-0.5">
                      <span className="text-rose-400">&larr;</span> Outfeed (HE-1/2/3)
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
                    <div key={bank.bankId} className="bg-slate-800/90 p-1 rounded-xs border border-slate-700/70">
                      <div className="flex items-center justify-between text-[6.5px] font-mono text-slate-300 px-0.5 mb-0.5">
                        <span className="font-black text-cyan-300">{bank.name}</span>
                        <span className="text-[6px] text-slate-400 font-bold">5 Rails &bull; 40 Pallets</span>
                      </div>
                      <div className="space-y-0.5">
                        {bank.rails.map((railNum) => {
                          return (
                            <div key={railNum} className="flex items-center space-x-1">
                              <span className="w-3.5 text-[6px] font-mono font-black text-slate-300 text-right">R{railNum}</span>
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
                    <span className="text-blue-300 font-bold">จัดเก็บ {metrics.a2Occupied} / {metrics.a2Capacity} P</span>
                    <span className="text-amber-400 font-bold">1 ช่อง = 1 พาเลท (20 ราง x 8 ช่อง = 160 Slots)</span>
                  </div>
                </div>

                <div className="text-[9px] font-bold text-slate-600 flex items-center justify-center space-x-1 group-hover:text-blue-600">
                  <span>เปิดโซนจัดวางแบบราง 20 เลน (Rail Matrix) &rarr;</span>
                </div>
              </div>

              {/* BOTTOM: PRODUCTION HE LINES (HE-1, HE-2, HE-3) - Equal length matching A4 */}
              <div className="h-[340px] shrink-0 flex flex-col">
                <A2EmbossedLinesVerticalSection />
              </div>

            </div>

            {/* Office Footer */}
            <div className="bg-[#bfdbfe] border border-blue-300 text-[#1e3a8a] rounded-lg py-1.5 text-center shadow-inner mt-1 shrink-0">
              <div className="font-black text-xs">Office</div>
              <div className="text-[9.5px] text-blue-900 font-medium">ห้องควบคุมการผลิตและสำนักงาน A2</div>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* 2. A4 BUILDING (Middle Column - 5 Cols)                                   */}
          {/* ========================================================================= */}
          <div className="lg:col-span-5 xl:col-span-5 bg-white border-2 border-slate-900 rounded-xl p-3 relative flex flex-col justify-between shadow-xl min-h-0">
            
            {/* Dock Doors (Beige tabs on Left & Right) */}
            <div className="absolute -left-2.5 top-1/4 w-2.5 h-7 bg-amber-200 border border-amber-600 rounded-xs shadow-xs" title="Dock Door A4-1" />
            <div className="absolute -left-2.5 top-2/4 w-2.5 h-7 bg-amber-200 border border-amber-600 rounded-xs shadow-xs" title="Dock Door A4-2" />
            <div className="absolute -left-2.5 top-3/4 w-2.5 h-7 bg-amber-200 border border-amber-600 rounded-xs shadow-xs" title="Dock Door A4-3" />
            <div className="absolute -right-2.5 top-1/4 w-2.5 h-7 bg-amber-200 border border-amber-600 rounded-xs shadow-xs" title="Dock Door A4-4" />
            <div className="absolute -right-2.5 top-2/4 w-2.5 h-7 bg-amber-200 border border-amber-600 rounded-xs shadow-xs" title="Dock Door A4-5" />
            <div className="absolute -right-2.5 top-3/4 w-2.5 h-7 bg-amber-200 border border-amber-600 rounded-xs shadow-xs" title="Dock Door A4-6" />

            {/* Building Header */}
            <div className="text-center pb-1.5 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded border border-purple-200">
                  Rack B-K (680P)
                </span>
                <h3 className="text-base font-black text-slate-900 tracking-wide">A4 Building</h3>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded border border-amber-200">
                  Floor X1-X8 (432P)
                </span>
              </div>
              <div className="text-[10px] font-bold text-slate-500 mt-0.5">คลังหลักจัดเก็บชิ้นส่วน (แร็ค Selective + วางพื้น + สายการผลิต HE-4/5)</div>
            </div>

            {/* Warehouse Interior Grid (Left: Racks & Floor Staging | Right: HE-4 & HE-5 Lines) */}
            <div className="my-2.5 flex-1 grid grid-cols-12 gap-2.5 min-h-0">
              
              {/* LEFT SUB-COLUMN (7 Cols): DA4D-2 Rack (12 Bays) + DA4D-3 Rack (5 Bays) + DA4D-1 Floor Staging */}
              <div className="col-span-7 flex flex-col justify-between space-y-2 min-h-0">
                
                {/* 1. TOP: DA4D-2 SELECTIVE RACK (B-F) - ALL 12 BAYS ACCURATE */}
                <div 
                  onClick={() => handleDirectNavigate('A4_RACK')}
                  className="border-2 border-red-500 bg-white rounded-lg p-1.5 shadow-md cursor-pointer hover:border-red-600 transition-all active:scale-95 group text-center shrink-0"
                >
                  <div className="flex items-center justify-between pb-0.5 border-b border-purple-100">
                    <div className="flex items-center space-x-1">
                      <span className="text-xs font-black text-blue-700">DA4D-2</span>
                      <span className="text-[8.5px] font-bold text-purple-700 font-mono">RACK B-F</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-[7.5px] font-mono font-bold text-purple-700 bg-purple-100 px-1 py-0.2 rounded">
                        {metrics.bfOccupied} / 480 P
                      </span>
                      <span className="text-[7.5px] font-mono font-bold text-slate-600 bg-slate-100 px-1 py-0.2 rounded">
                        12 BAYS &bull; 4L
                      </span>
                    </div>
                  </div>

                  {/* 12 Vertical Bays (12 down to 01) across 5 columns B, C, D, E, F */}
                  <div className="my-1 bg-slate-900 rounded p-1 border border-slate-800 shadow-inner">
                    {/* Columns Header */}
                    <div className="grid grid-cols-5 gap-0.5 mb-0.5 text-center">
                      {['B', 'C', 'D', 'E', 'F'].map((zoneKey) => (
                        <div key={zoneKey} className="bg-blue-600 text-white rounded text-[7px] font-mono font-black py-0.2 shadow-2xs">
                          {zoneKey}
                        </div>
                      ))}
                    </div>

                    {/* ALL 12 VERTICAL BAYS (12 down to 01) */}
                    <div className="space-y-0.5">
                      {[12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((bayNum) => (
                        <div key={bayNum} className="grid grid-cols-5 gap-0.5">
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
                                title={`Rack ${zoneKey}${bayNum < 10 ? '0' + bayNum : bayNum} (4 Levels)`}
                              >
                                <span>{bayNum < 10 ? '0' + bayNum : bayNum}</span>
                                {isOccupied && <span className="text-[4.5px] leading-none opacity-90">{bayItems.length}L</span>}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-[6px] text-slate-400 font-mono pt-0.5 mt-0.5 border-t border-slate-800">
                      <span>Bays 01-12 (4 Levels)</span>
                      <span className="text-purple-300 font-bold">{metrics.bfOccupied} / 480 P</span>
                      <span>D2 Highlight</span>
                    </div>
                  </div>

                  <div className="text-[8.5px] font-bold text-slate-600 flex items-center justify-center space-x-1 group-hover:text-blue-600">
                    <span>เปิดโซนแร็ค 2D & 3D &rarr;</span>
                  </div>
                </div>

                {/* 2. MIDDLE: DA4D-3 RACK (G-K) - 5 BAYS */}
                <div 
                  onClick={() => handleDirectNavigate('A4_RACK')}
                  className="border border-slate-300 bg-white rounded-lg p-1 shadow-xs cursor-pointer hover:border-blue-400 transition-all active:scale-95 group text-center shrink-0"
                >
                  <div className="flex items-center justify-between pb-0.5 border-b border-slate-200">
                    <div className="flex items-center space-x-1">
                      <span className="text-[10px] font-black text-blue-700">DA4D-3</span>
                      <span className="text-[8px] font-bold text-indigo-700 font-mono">RACK G-K</span>
                    </div>
                    <span className="text-[7.5px] font-mono font-bold text-amber-800 bg-amber-100 px-1 py-0.2 rounded">
                      {metrics.jgOccupied} / 200 P (5 BAYS)
                    </span>
                  </div>

                  {/* 5 Vertical Columns (G, H, I, J, K) with 5 vertical bays */}
                  <div className="my-0.5 bg-slate-900 rounded p-1 shadow-inner border border-slate-800">
                    <div className="grid grid-cols-5 gap-0.5 mb-0.5 text-center">
                      {['G', 'H', 'I', 'J', 'K'].map((z) => (
                        <div key={z} className="bg-indigo-600 text-white rounded text-[6.5px] font-mono font-black py-0.2 shadow-2xs">
                          {z}
                        </div>
                      ))}
                    </div>
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
                </div>

                {/* 3. BOTTOM: DA4D-1 FLOOR STAGING (X1-X8) - Compact Balanced Height */}
                <div 
                  onClick={() => handleDirectNavigate('A4_FLOOR')}
                  className="border-2 border-amber-400 bg-amber-50/95 rounded-lg p-1.5 shadow-md cursor-pointer hover:border-amber-500 transition-all active:scale-95 group text-center flex flex-col justify-between shrink-0"
                >
                  <div className="flex items-center justify-between pb-0.5 border-b border-amber-200">
                    <div className="flex items-center space-x-1">
                      <span className="text-xs font-black text-amber-900">DA4D-1</span>
                      <span className="text-[8px] font-bold text-amber-800 font-mono">FLOOR STAGING (X1-X8)</span>
                    </div>
                    <span className="text-[8px] font-mono font-bold text-amber-950 bg-amber-200 px-1 py-0.2 rounded border border-amber-300">
                      {metrics.a4FloorOccupied} / 432 P
                    </span>
                  </div>

                  {/* Floor Staging Matrix: X8-X5 on Top, Driveway, X4-X1 on Bottom */}
                  <div className="my-1 bg-[#fef9c3] rounded p-1 border border-amber-300 shadow-inner space-y-0.5">
                    {/* Top Group: X8, X7, X6, X5 (12 Cols each - 264 Pallets) */}
                    <div className="space-y-0.5 bg-amber-100/70 p-0.5 rounded border border-amber-200">
                      <div className="flex items-center justify-between text-[5.5px] font-black text-amber-950 font-mono px-0.5">
                        <span>X8 - X5 (Rows 25-46)</span>
                        <span className="text-amber-800">264 P</span>
                      </div>
                      {[
                        { id: 'X8', rows: 'R43-46' },
                        { id: 'X7', rows: 'R37-42' },
                        { id: 'X6', rows: 'R31-36' },
                        { id: 'X5', rows: 'R25-30' }
                      ].map((grp) => (
                        <div key={grp.id} className="flex items-center space-x-0.5">
                          <span className="w-4 text-[5.5px] font-mono font-black text-amber-950 text-left">{grp.id}</span>
                          <div className="grid grid-cols-12 gap-0.5 flex-1">
                            {Array.from({ length: 12 }).map((_, i) => {
                              const bayNum = i + 1;
                              const isOccupied = items.some(it => it.zone === grp.id && it.bayNumber === bayNum) || 
                                ((grp.id === 'X8' && (i === 1 || i === 11)) || (grp.id === 'X7' && i === 3) || (grp.id === 'X6' && i === 8) || (grp.id === 'X5' && i === 6));
                              return (
                                <div 
                                  key={i} 
                                  className={`h-1.5 rounded-3xs border transition-all ${
                                    isOccupied 
                                      ? 'bg-blue-600 border-blue-400' 
                                      : 'bg-amber-300/80 border-amber-500/60'
                                  }`}
                                  title={`${grp.id} Bay ${bayNum}`}
                                />
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* AGV Center Road Divider */}
                    <div className="flex items-center justify-between text-[5.5px] text-amber-950 font-mono py-0.2 px-1 bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200 rounded border border-amber-400 font-bold">
                      <span>&larr; AGV Driveway</span>
                      <span className="text-amber-900 font-black">Feed to HE-4 & HE-5</span>
                      <span>&rarr;</span>
                    </div>

                    {/* Bottom Group: X4, X3, X2, X1 (7 Cols each - 168 Pallets) */}
                    <div className="space-y-0.5 bg-amber-100/70 p-0.5 rounded border border-amber-200">
                      <div className="flex items-center justify-between text-[5.5px] font-black text-amber-950 font-mono px-0.5">
                        <span>X4 - X1 (Rows 01-24)</span>
                        <span className="text-amber-800">168 P</span>
                      </div>
                      {[
                        { id: 'X4', rows: 'R19-24' },
                        { id: 'X3', rows: 'R13-18' },
                        { id: 'X2', rows: 'R07-12' },
                        { id: 'X1', rows: 'R01-06' }
                      ].map((grp) => (
                        <div key={grp.id} className="flex items-center space-x-0.5">
                          <span className="w-4 text-[5.5px] font-mono font-black text-amber-950 text-left">{grp.id}</span>
                          <div className="grid grid-cols-7 gap-0.5 flex-1">
                            {Array.from({ length: 7 }).map((_, i) => {
                              const bayNum = i + 1;
                              const isOccupied = items.some(it => it.zone === grp.id && it.bayNumber === bayNum) ||
                                ((grp.id === 'X4' && i === 1) || (grp.id === 'X3' && i === 4) || (grp.id === 'X1' && i === 2));
                              return (
                                <div 
                                  key={i} 
                                  className={`h-1.5 rounded-3xs border transition-all ${
                                    isOccupied 
                                      ? 'bg-blue-600 border-blue-400' 
                                      : 'bg-amber-300/80 border-amber-500/60'
                                  }`}
                                  title={`${grp.id} Bay ${bayNum}`}
                                />
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="text-[8.5px] font-bold text-amber-900 group-hover:underline flex items-center justify-center space-x-1">
                    <span>เปิดโซนลานวางพื้น 2D ละเอียด (X1 - X8) &rarr;</span>
                  </div>
                </div>

              </div>

              {/* RIGHT SUB-COLUMN (5 Cols): Embossed HE-4 & HE-5 Production Lines (Equal height matching A2) */}
              <div className="col-span-5 h-[340px] shrink-0 flex flex-col">
                <A4EmbossedLinesVerticalSection />
              </div>

            </div>

            {/* Office Footer */}
            <div className="bg-[#bfdbfe] border border-blue-300 text-[#1e3a8a] rounded-lg py-1.5 text-center shadow-inner mt-1 shrink-0">
              <div className="font-black text-xs">Office</div>
              <div className="text-[9.5px] text-blue-900 font-medium">ห้องควบคุมคลังสินค้าและสำนักงาน A4</div>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* 3. RIGHT SECTION: A5 TENT YARD (TOP) & CY3 TENT YARD (BOTTOM) (3 Cols)    */}
          {/* ========================================================================= */}
          <div className="lg:col-span-3 xl:col-span-3 flex flex-col justify-between gap-3 h-full min-h-0">
            
            {/* 3.1 A5 TENT ZONE (Top Section - 4 Tents with 7 Sub-Groups Each) */}
            <div className="border-2 border-dashed border-sky-400 rounded-xl p-2.5 bg-[#cce5e8]/40 flex flex-col justify-between shadow-md flex-1">
              
              {/* Header */}
              <div className="text-center pb-1 border-b border-sky-300">
                <h3 className="text-xs font-black text-slate-900 tracking-wide flex items-center justify-center space-x-1">
                  <span>⛺</span>
                  <span>A5 Tent Yard (ลานเต็นท์ 4 หลัง)</span>
                </h3>
                <div className="text-[9px] font-bold text-slate-600">
                  ความจุ 784 พาเลท (DAST-1.01 ถึง 4.01 &bull; 7 กลุ่มย่อย/เต็นท์)
                </div>
              </div>

              {/* 2x2 Grid of 4 Tent Cards simulating 7 sub-groups in each tent */}
              <div className="my-1.5 grid grid-cols-2 gap-1.5">
                
                {/* TENT NO. 2 (DAST-2.01) - 7 Sub-Groups (G1-G7) */}
                <div 
                  onClick={() => handleDirectNavigate('A5_TENT', 2)}
                  className="border-2 border-red-600 bg-white rounded-lg p-1 shadow-xs cursor-pointer hover:border-sky-500 transition-all active:scale-95 group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between pb-0.5">
                    <span className="bg-purple-100 text-purple-900 font-bold text-[7.5px] px-1 py-0.2 rounded">
                      A5 Tent 2
                    </span>
                    <span className="bg-blue-900 text-blue-100 font-mono font-bold text-[7.5px] px-1 py-0.2 rounded">
                      DAST-2.01
                    </span>
                  </div>

                  {/* 7 Sub-Groups Grid Simulation */}
                  <div className="my-0.5 bg-slate-900 p-1 rounded-xs border border-slate-800">
                    <div className="grid grid-cols-7 gap-0.5 mb-0.5 text-center text-[5px] font-mono font-black text-cyan-300">
                      {['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'].map(g => (
                        <div key={g} className="bg-slate-800 rounded-3xs py-0.2">{g}</div>
                      ))}
                    </div>
                    <div className="space-y-0.5">
                      {Array.from({ length: 4 }).map((_, r) => (
                        <div key={r} className="grid grid-cols-7 gap-0.5">
                          {Array.from({ length: 7 }).map((_, c) => (
                            <div key={c} className="h-1 bg-[#fde047] rounded-3xs border border-amber-500/60" />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[7.5px] font-bold text-slate-700 pt-0.5 border-t border-slate-100">
                    <span>{metrics.tent2Count} / 196 P</span>
                    <span className="text-blue-600 group-hover:underline">&rarr;</span>
                  </div>
                </div>

                {/* TENT NO. 4 (DAST-4.01) - 6 Standard Sub-Groups + 1 Rack A */}
                <div 
                  onClick={() => handleDirectNavigate('A5_TENT', 4)}
                  className="border-2 border-red-600 bg-white rounded-lg p-1 shadow-xs cursor-pointer hover:border-sky-500 transition-all active:scale-95 group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between pb-0.5">
                    <span className="bg-blue-900 text-blue-100 font-mono font-bold text-[7.5px] px-1 py-0.2 rounded">
                      DAST-4.01
                    </span>
                    <span className="bg-purple-100 text-purple-900 font-bold text-[7.5px] px-1 py-0.2 rounded">
                      A5 Tent 4
                    </span>
                  </div>

                  {/* 6 Sub-Groups + 1 Rack A */}
                  <div className="my-0.5 bg-slate-900 p-1 rounded-xs border border-slate-800">
                    <div className="grid grid-cols-7 gap-0.5 mb-0.5 text-center text-[5px] font-mono font-black">
                      {['G1', 'G2', 'G3', 'G4', 'G5', 'G6'].map(g => (
                        <div key={g} className="bg-slate-800 text-cyan-300 rounded-3xs py-0.2">{g}</div>
                      ))}
                      <div className="bg-pink-900 text-pink-200 rounded-3xs py-0.2 font-bold">R.A</div>
                    </div>
                    <div className="space-y-0.5">
                      {Array.from({ length: 4 }).map((_, r) => (
                        <div key={r} className="grid grid-cols-7 gap-0.5">
                          {Array.from({ length: 6 }).map((_, c) => (
                            <div key={c} className="h-1 bg-[#fde047] rounded-3xs border border-amber-500/60" />
                          ))}
                          <div className="h-1 bg-pink-400 rounded-3xs border border-pink-600" title="Rack A" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[7.5px] font-bold text-slate-700 pt-0.5 border-t border-slate-100">
                    <span>{metrics.tent4Count} / 196 P</span>
                    <span className="text-pink-600 font-bold group-hover:underline">Rack A &rarr;</span>
                  </div>
                </div>

                {/* TENT NO. 1 (DAST-1.01) - 7 Sub-Groups (G1-G7) */}
                <div 
                  onClick={() => handleDirectNavigate('A5_TENT', 1)}
                  className="border-2 border-red-600 bg-white rounded-lg p-1 shadow-xs cursor-pointer hover:border-sky-500 transition-all active:scale-95 group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between pb-0.5">
                    <span className="bg-purple-100 text-purple-900 font-bold text-[7.5px] px-1 py-0.2 rounded">
                      A5 Tent 1
                    </span>
                    <span className="bg-blue-900 text-blue-100 font-mono font-bold text-[7.5px] px-1 py-0.2 rounded">
                      DAST-1.01
                    </span>
                  </div>

                  {/* 7 Sub-Groups Grid Simulation */}
                  <div className="my-0.5 bg-slate-900 p-1 rounded-xs border border-slate-800">
                    <div className="grid grid-cols-7 gap-0.5 mb-0.5 text-center text-[5px] font-mono font-black text-cyan-300">
                      {['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'].map(g => (
                        <div key={g} className="bg-slate-800 rounded-3xs py-0.2">{g}</div>
                      ))}
                    </div>
                    <div className="space-y-0.5">
                      {Array.from({ length: 4 }).map((_, r) => (
                        <div key={r} className="grid grid-cols-7 gap-0.5">
                          {Array.from({ length: 7 }).map((_, c) => (
                            <div key={c} className="h-1 bg-[#fde047] rounded-3xs border border-amber-500/60" />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[7.5px] font-bold text-slate-700 pt-0.5 border-t border-slate-100">
                    <span>{metrics.tent1Count} / 196 P</span>
                    <span className="text-blue-600 group-hover:underline">&rarr;</span>
                  </div>
                </div>

                {/* TENT NO. 3 (DAST-3.01) - 7 Sub-Groups (G1-G7) */}
                <div 
                  onClick={() => handleDirectNavigate('A5_TENT', 3)}
                  className="border-2 border-red-600 bg-white rounded-lg p-1 shadow-xs cursor-pointer hover:border-sky-500 transition-all active:scale-95 group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between pb-0.5">
                    <span className="bg-blue-900 text-blue-100 font-mono font-bold text-[7.5px] px-1 py-0.2 rounded">
                      DAST-3.01
                    </span>
                    <span className="bg-purple-100 text-purple-900 font-bold text-[7.5px] px-1 py-0.2 rounded">
                      A5 Tent 3
                    </span>
                  </div>

                  {/* 7 Sub-Groups Grid Simulation */}
                  <div className="my-0.5 bg-slate-900 p-1 rounded-xs border border-slate-800">
                    <div className="grid grid-cols-7 gap-0.5 mb-0.5 text-center text-[5px] font-mono font-black text-cyan-300">
                      {['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'].map(g => (
                        <div key={g} className="bg-slate-800 rounded-3xs py-0.2">{g}</div>
                      ))}
                    </div>
                    <div className="space-y-0.5">
                      {Array.from({ length: 4 }).map((_, r) => (
                        <div key={r} className="grid grid-cols-7 gap-0.5">
                          {Array.from({ length: 7 }).map((_, c) => (
                            <div key={c} className="h-1 bg-[#fde047] rounded-3xs border border-amber-500/60" />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[7.5px] font-bold text-slate-700 pt-0.5 border-t border-slate-100">
                    <span>{metrics.tent3Count} / 196 P</span>
                    <span className="text-blue-600 group-hover:underline">&rarr;</span>
                  </div>
                </div>

              </div>

              {/* Bottom Summary Banner */}
              <div className="bg-white/90 border border-sky-300 text-slate-800 rounded-lg py-1 px-2 text-center text-[9px] font-bold shadow-2xs flex items-center justify-between">
                <span>จัดเก็บ A5</span>
                <span className="text-emerald-700 font-mono font-black">
                  {metrics.a5TotalOccupied} / 784 P ({Math.round((metrics.a5TotalOccupied / 784) * 100)}%)
                </span>
              </div>
            </div>

            {/* 3.2 CY3 TENT YARD (Outdoor Rack - ALL 4 ROWS x 25 BAYS) - Full Width Expansion */}
            <div className="border-2 border-red-500 rounded-xl p-2.5 bg-white flex flex-col justify-between shadow-md relative group hover:border-red-600 transition-all flex-1">
              {/* Header */}
              <div className="flex items-center justify-between pb-1 border-b border-red-200">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <div>
                    <h3 className="text-xs font-black text-slate-900 tracking-tight">
                      ลานเต็นท์ CY3 (Outdoor Rack)
                    </h3>
                    <div className="text-[8.5px] font-bold text-slate-500">
                      4 ชั้น &bull; 4 แถว (A-D) &bull; 25 ช่วงเสา &bull; 400 P
                    </div>
                  </div>
                </div>
                <span className="px-1.5 py-0.5 bg-red-100 text-red-800 text-[8px] font-mono font-bold rounded border border-red-200">
                  DY3T 1.01-1.04
                </span>
              </div>

              {/* Miniature Layout Blueprint of CY3: 4 Rows (A, B, C, D) with ALL 25 BAYS */}
              <div 
                onClick={() => handleDirectNavigate('CY3_TENT')}
                className="my-1.5 bg-slate-950 rounded-lg p-2 border border-slate-800 shadow-inner cursor-pointer hover:border-rose-400 transition-all flex flex-col justify-between space-y-1.5 w-full"
              >
                {/* 4 Rows A, B, C, D with ALL 25 BAYS */}
                {[
                  { row: 'A', code: 'DY3T-1.01' },
                  { row: 'B', code: 'DY3T-1.02' },
                  { row: 'C', code: 'DY3T-1.03' },
                  { row: 'D', code: 'DY3T-1.04' },
                ].map((r, idx) => {
                  const rowItems = metrics.cy3Items.filter(it => it.zone === `CY3-${r.row}` || it.locatorCode.includes(r.code));
                  return (
                    <React.Fragment key={r.row}>
                      <div className="flex items-center space-x-1.5 w-full">
                        {/* Navy Row Badge */}
                        <div className="w-4 h-4 rounded bg-blue-700 text-white font-mono font-black text-[8px] flex items-center justify-center shrink-0 shadow-2xs">
                          {r.row}
                        </div>

                        {/* 25 Bay Miniature Rack Bar (ALL 25 BAYS 01-25) */}
                        <div 
                          className="flex-1 gap-px bg-slate-900 p-0.5 rounded border border-slate-800"
                          style={{ display: 'grid', gridTemplateColumns: 'repeat(25, minmax(0, 1fr))' }}
                        >
                          {Array.from({ length: 25 }).map((_, bIdx) => {
                            const bayNum = bIdx + 1;
                            const bayItems = rowItems.filter(it => it.bayNumber === bayNum);
                            const isOcc = bayItems.length > 0;
                            const hasAging = bayItems.some(it => it.agingDays > 30);
                            return (
                              <div
                                key={bayNum}
                                className={`h-2.5 rounded-3xs border transition-all ${
                                  isOcc
                                    ? hasAging
                                      ? 'bg-amber-400 border-amber-300'
                                      : 'bg-rose-500 border-rose-400'
                                    : 'bg-slate-800 border-slate-700/60'
                                }`}
                                title={`Row ${r.row} Bay ${bayNum < 10 ? '0' + bayNum : bayNum} (${bayItems.length}/4 Levels)`}
                              />
                            );
                          })}
                        </div>

                        {/* Locator Tag */}
                        <span className="text-[7.5px] font-mono text-slate-400 w-11 text-right shrink-0">
                          {r.code}
                        </span>
                      </div>

                      {/* Center Forklift Pathway between B & C */}
                      {idx === 1 && (
                        <div className="py-0.5 px-1.5 bg-amber-500/20 border border-dashed border-amber-500/40 rounded flex items-center justify-between text-[6.5px] font-mono text-amber-300">
                          <span>&larr; Forklift Way</span>
                          <span className="text-amber-200 font-bold">โครงสร้างแร็ค 4 ชั้น (4 Levels)</span>
                          <span>&rarr;</span>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Bottom Quick Bar & Direct Link */}
              <div className="flex items-center justify-between text-[8.5px] font-bold text-slate-700 pt-0.5 border-t border-slate-100">
                <span className="text-rose-700 font-mono font-black">
                  จัดเก็บ {metrics.cy3Occupied} / {metrics.cy3Capacity} P ({Math.round((metrics.cy3Occupied / metrics.cy3Capacity) * 100)}%)
                </span>
                <button
                  onClick={() => handleDirectNavigate('CY3_TENT')}
                  className="text-rose-600 hover:text-rose-800 flex items-center space-x-0.5 group-hover:underline cursor-pointer"
                >
                  <span>เปิดโซน CY3 (2.5D)</span>
                  <ArrowUpRight className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* FULL SCREEN MASTER BLUEPRINT MODAL */}
      {isFullMapModal && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col animate-fadeIn">
          {/* Top Bar for Fullscreen View */}
          <div className="h-10 px-4 bg-slate-900 border-b border-slate-800 text-white flex items-center justify-between shadow-md">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-sm font-black text-white tracking-wide">
                HEX WMS &bull; โซนรวมโรงงานและลานพักแคมปัสเต็มจอ (Full Screen Master Map)
              </span>
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs font-mono font-bold rounded border border-blue-500/40">
                A2 &bull; A4 &bull; A5 &bull; CY3
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsFullMapModal(false)}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black rounded-lg shadow-sm flex items-center space-x-1 transition-all"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>ย่อกลับ (Exit Fullscreen)</span>
              </button>
            </div>
          </div>

          {/* Fullscreen Body Content */}
          <div className="flex-1 overflow-auto p-3 bg-slate-900/90 flex flex-col">
            <div className="w-full h-full flex flex-col space-y-3">
              {/* Toolbar in Fullscreen */}
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 flex items-center justify-between text-white">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-black text-amber-300">โหมดแสดงผล:</span>
                  <div className="inline-flex bg-slate-800 p-0.5 rounded-md border border-slate-700">
                    <button
                      onClick={() => setViewMode('REALISTIC')}
                      className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                        viewMode === 'REALISTIC' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      โซน 3D เสมือนจริง
                    </button>
                    <button
                      onClick={() => setViewMode('HEATMAP')}
                      className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                        viewMode === 'HEATMAP' ? 'bg-purple-600 text-white' : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      ความหนาแน่น (Heatmap)
                    </button>
                    <button
                      onClick={() => setViewMode('AGING_FIFO')}
                      className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                        viewMode === 'AGING_FIFO' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      เตือน Aging FIFO
                    </button>
                  </div>
                </div>

                <div className="text-xs text-emerald-400 font-mono font-bold flex items-center space-x-1.5">
                  <Activity className="w-4 h-4 animate-pulse" />
                  <span>Real-Time Stream: A2 (160P), A4 (1,760P), A5 (784P), CY3 (400P)</span>
                </div>
              </div>

              {/* Blueprint Grid Container inside Fullscreen */}
              <div className="flex-1 bg-white rounded-xl p-3 border border-slate-700 shadow-xl overflow-auto">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[800px] bg-slate-100 p-3 rounded-xl border border-slate-300">
                  {/* Reuse Blueprint columns by triggering regular rendering */}
                  <div className="col-span-12 text-center text-xs text-slate-500 py-1 font-bold">
                    โซนแสดงผลขยายระดับความละเอียดสูง (Full Scale 100%) &bull; คลิกที่โซนเพื่อเจาะลึกข้อมูลพิกัด
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
                    <span>เปิดโซนเต็มหน้าจอ</span>
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
