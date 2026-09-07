import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  InventoryItem, 
  AgingThresholdConfig 
} from '../types';
import { useTranslation } from '../i18n/i18nContext';
import { 
  Maximize2, 
  Minimize2, 
  Info, 
  ExternalLink, 
  LayoutGrid,
  ArrowRight,
  TrendingUp,
  Warehouse,
  RotateCcw,
  Sparkles,
  Layers,
  Truck
} from 'lucide-react';

interface MasterBlueprintLayoutProps {
  items?: InventoryItem[];
  agingConfig?: AgingThresholdConfig;
  onNavigateToZone?: (target: 'A4_FLOOR' | 'A4_RACK' | 'A2_RAIL' | 'A5_TENT' | 'CY3_TENT', tentNum?: number) => void;
  onOpenScanner?: (zone?: string, bay?: number, level?: number, model?: string) => void;
  onOpen3D?: (zone?: string, bay?: number) => void;
  isDarkMode?: boolean;
}

interface ItemInfoRow {
  depotArea: string;
  code: string;
  team: string;
  capacityPL: number;
  inventoryPL: number;
  inventoryEA: number;
  ratePercent: number;
  badge: string;
  navigateTarget: 'A2_RAIL' | 'A4_RACK' | 'A5_TENT' | 'CY3_TENT';
}

export const MasterBlueprintLayout: React.FC<MasterBlueprintLayoutProps> = ({
  items = [],
  agingConfig,
  onNavigateToZone,
  onOpenScanner,
  onOpen3D,
  isDarkMode: initialDarkMode = true,
}) => {
  const { t } = useTranslation();
  // Fullscreen & Compact Fit View states
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isFitViewport, setIsFitViewport] = useState<boolean>(false);
  const [dataMode, setDataMode] = useState<'PLAN_SPEC' | 'LIVE_WMS'>('PLAN_SPEC');
  const containerRef = useRef<HTMLDivElement>(null);

  // Selected detail modal
  const [selectedZone, setSelectedZone] = useState<{
    title: string;
    code: string;
    building: string;
    description: string;
    capacity: number;
    occupied: number;
    navigateTarget?: 'A4_FLOOR' | 'A4_RACK' | 'A2_RAIL' | 'A5_TENT' | 'CY3_TENT';
    tentNum?: number;
    itemsList: InventoryItem[];
  } | null>(null);

  // Listen to browser fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Toggle browser or fixed fullscreen
  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else {
          setIsFullscreen(true);
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (e) {
      // Fallback to internal fullscreen layout toggle
      setIsFullscreen(!isFullscreen);
    }
  };

  // Filtered items by zone for live calculation
  const liveStats = useMemo(() => {
    // A2 items: zone starts with R or FR or locator contains DA2D
    const a2Items = items.filter(it => 
      it.zone.startsWith('R') || it.zone.startsWith('FR') || (it.locatorCode && it.locatorCode.includes('DA2D-1'))
    );
    // A4 items: RACK B-K or FLOOR X1-X8
    const a4Items = items.filter(it => 
      ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'X8'].includes(it.zone) ||
      (it.locatorCode && (it.locatorCode.includes('DA4D') || it.locatorCode.includes('DA4R')))
    );
    // A5 items: zone A or DAST
    const a5Items = items.filter(it => 
      it.zone === 'A' || it.zone.startsWith('TENT') || (it.locatorCode && it.locatorCode.includes('DAST'))
    );
    // CY3 items: zone CY3 or DY3T
    const cy3Items = items.filter(it => 
      it.zone.startsWith('CY3') || (it.locatorCode && it.locatorCode.includes('DY3T'))
    );

    const a2PL = a2Items.length;
    const a2EA = a2Items.reduce((sum, it) => sum + (it.quantity || 0), 0);
    const a4PL = a4Items.length;
    const a4EA = a4Items.reduce((sum, it) => sum + (it.quantity || 0), 0);
    const a5PL = a5Items.length;
    const a5EA = a5Items.reduce((sum, it) => sum + (it.quantity || 0), 0);
    const cy3PL = cy3Items.length;
    const cy3EA = cy3Items.reduce((sum, it) => sum + (it.quantity || 0), 0);

    return {
      a2: { pl: a2PL || 94, ea: a2EA || 9309, cap: 160 },
      a4: { pl: a4PL || 70, ea: a4EA || 7370, cap: 1112 }, // 680 (Rack) + 432 (Floor)
      a5: { pl: a5PL || 121, ea: a5EA || 15427, cap: 784 },
      cy3: { pl: cy3PL || 671, ea: cy3EA || 33767, cap: 400 },
      a2Items,
      a4Items,
      a5Items,
      cy3Items
    };
  }, [items]);

  // Reference blueprint table data matching exactly 2D CAD specification
  const planSpecRows: ItemInfoRow[] = [
    { depotArea: 'A2 Building', code: 'DA2D-1 (Flow Rail)', team: '(Component Team)', capacityPL: 160, inventoryPL: 94, inventoryEA: 9309, ratePercent: 59, badge: 'A2', navigateTarget: 'A2_RAIL' },
    { depotArea: 'A4 Building', code: 'DA4D-1/2/3 (Rack + Floor)', team: '(Component Team)', capacityPL: 1112, inventoryPL: 70, inventoryEA: 7370, ratePercent: 6, badge: 'A4', navigateTarget: 'A4_RACK' },
    { depotArea: 'A5 Tent Yard', code: 'DAST 1-4 (Tents 1-4)', team: '(Material (A/C) Team)', capacityPL: 784, inventoryPL: 121, inventoryEA: 15427, ratePercent: 15, badge: 'A5', navigateTarget: 'A5_TENT' },
    { depotArea: 'CY3 Tent Yard', code: 'DY3T 1.01-1.04 (4-Tier Rack)', team: '(Material (A/C) Team)', capacityPL: 400, inventoryPL: 671, inventoryEA: 33767, ratePercent: 168, badge: 'CY3', navigateTarget: 'CY3_TENT' },
  ];

  // Dynamic live rows
  const liveRows: ItemInfoRow[] = [
    {
      depotArea: 'A2 Building',
      code: 'DA2D-1 (Flow Rail)',
      team: '(Component Team)',
      capacityPL: liveStats.a2.cap,
      inventoryPL: liveStats.a2.pl,
      inventoryEA: liveStats.a2.ea,
      ratePercent: Math.round((liveStats.a2.pl / liveStats.a2.cap) * 100),
      badge: 'A2',
      navigateTarget: 'A2_RAIL'
    },
    {
      depotArea: 'A4 Building',
      code: 'DA4D-1/2/3 (Rack + Floor)',
      team: '(Component Team)',
      capacityPL: liveStats.a4.cap,
      inventoryPL: liveStats.a4.pl,
      inventoryEA: liveStats.a4.ea,
      ratePercent: Math.round((liveStats.a4.pl / liveStats.a4.cap) * 100),
      badge: 'A4',
      navigateTarget: 'A4_RACK'
    },
    {
      depotArea: 'A5 Tent Yard',
      code: 'DAST 1-4 (Tents 1-4)',
      team: '(Material (A/C) Team)',
      capacityPL: liveStats.a5.cap,
      inventoryPL: liveStats.a5.pl,
      inventoryEA: liveStats.a5.ea,
      ratePercent: Math.round((liveStats.a5.pl / liveStats.a5.cap) * 100),
      badge: 'A5',
      navigateTarget: 'A5_TENT'
    },
    {
      depotArea: 'CY3 Tent Yard',
      code: 'DY3T 1.01-1.04 (4-Tier Rack)',
      team: '(Material (A/C) Team)',
      capacityPL: liveStats.cy3.cap,
      inventoryPL: liveStats.cy3.pl,
      inventoryEA: liveStats.cy3.ea,
      ratePercent: Math.round((liveStats.cy3.pl / liveStats.cy3.cap) * 100),
      badge: 'CY3',
      navigateTarget: 'CY3_TENT'
    },
  ];

  const currentTableRows = dataMode === 'PLAN_SPEC' ? planSpecRows : liveRows;

  // Calculate Grand Totals for summary table
  const totals = useMemo(() => {
    const cap = currentTableRows.reduce((sum, r) => sum + r.capacityPL, 0);
    const pl = currentTableRows.reduce((sum, r) => sum + r.inventoryPL, 0);
    const ea = currentTableRows.reduce((sum, r) => sum + r.inventoryEA, 0);
    const rate = cap > 0 ? Math.round((pl / cap) * 100) : 0;
    return { cap, pl, ea, rate };
  }, [currentTableRows]);

  // Helper to open zone detail
  const handleZoneClick = (
    title: string,
    code: string,
    building: string,
    description: string,
    capacity: number,
    occupied: number,
    navigateTarget?: 'A4_FLOOR' | 'A4_RACK' | 'A2_RAIL' | 'A5_TENT' | 'CY3_TENT',
    tentNum?: number,
    itemsList: InventoryItem[] = []
  ) => {
    setSelectedZone({
      title,
      code,
      building,
      description,
      capacity,
      occupied,
      navigateTarget,
      tentNum,
      itemsList
    });
  };

  return (
    <div 
      ref={containerRef}
      className={`w-full font-sans transition-all duration-200 text-slate-100 ${
        isFullscreen ? 'fixed inset-0 z-50 bg-slate-950 p-3 sm:p-4 overflow-y-auto flex flex-col justify-between' : 'space-y-3 sm:space-y-4'
      }`}
    >
      
      {/* ========================================================================= */}
      {/* TOP STATUS & CONTROL TOOLBAR                                              */}
      {/* ========================================================================= */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 shadow-md flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-blue-600/90 text-white flex items-center justify-center border border-blue-500/50 shadow-xs shrink-0">
            <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-sm sm:text-base font-black tracking-tight text-white">
                ผังรวมแม่บท 2D CAD (Master Blueprint)
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950/90 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-800/80">
                100% WAREHOUSE ONLY
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              แผนผังแม่บท 3 โซน (A2 Building &bull; A4 Building &bull; Tents A5 & CY3) และตารางสรุปข้อมูลสถิติ
            </p>
          </div>
        </div>

        {/* Action Controls: Fit Viewport Toggle, Data Mode Toggle, Fullscreen Toggle */}
        <div className="flex items-center space-x-2">
          {/* Data Mode Switcher */}
          <div className="bg-slate-950 border border-slate-800 p-0.5 rounded-lg flex items-center text-[11px] font-bold">
            <button
              onClick={() => setDataMode('PLAN_SPEC')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                dataMode === 'PLAN_SPEC'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              มาตรฐานแปลน CAD
            </button>
            <button
              onClick={() => setDataMode('LIVE_WMS')}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                dataMode === 'LIVE_WMS'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>คำนวณสด WMS</span>
            </button>
          </div>

          {/* Fit Viewport Toggle */}
          <button
            onClick={() => setIsFitViewport(!isFitViewport)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
              isFitViewport 
                ? 'bg-purple-950/80 border-purple-600 text-purple-200 shadow-xs' 
                : 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-300'
            }`}
            title="ปรับความสูงให้พอดีหน้าจอ มองเห็นแผนผังและตารางสรุปพร้อมกันในหน้าจอเดียว"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{isFitViewport ? 'มุมมองพอดีจอ (Fit)' : 'มุมมองกระชับ'}</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 transition-all flex items-center gap-1.5 active:scale-95 shadow-xs"
            title={isFullscreen ? 'ออกจากโหมดเต็มจอ' : 'ขยายเต็มหน้าจอ (Fullscreen)'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-amber-400" /> : <Maximize2 className="w-3.5 h-3.5 text-blue-400" />}
            <span className="hidden sm:inline">{isFullscreen ? 'ย่อหน้าจอ' : 'เต็มจอ'}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3-COLUMN MASTER BLUEPRINT GRID LAYOUT (A2, A4, A5 & CY3)                  */}
      {/* ========================================================================= */}
      <div className={`grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-3.5 items-stretch ${isFitViewport ? 'max-h-[58vh]' : ''}`}>
        
        {/* ======================================================================= */}
        {/* 1. COLUMN 1: A2 BUILDING (ซ้ายสุด - 4 Cols)                              */}
        {/*    คลังรางเลื่อน DA2D-1 (20 ราง x 8 ช่อง = 160 พาเลท)                    */}
        {/* ======================================================================= */}
        <div 
          id="col-a2-building"
          className="lg:col-span-4 bg-slate-900/95 border border-slate-800 hover:border-slate-700 rounded-xl p-3 shadow-md flex flex-col justify-between relative overflow-hidden transition-all"
        >
          {/* Dock Doors (Beige tabs on Left & Right) */}
          <div className="absolute -left-2 top-1/4 w-2 h-6 bg-amber-200/80 border border-amber-600/80 rounded-xs shadow-xs" title="Dock Door A2-1" />
          <div className="absolute -left-2 top-2/4 w-2 h-6 bg-amber-200/80 border border-amber-600/80 rounded-xs shadow-xs" title="Dock Door A2-2" />
          <div className="absolute -left-2 top-3/4 w-2 h-6 bg-amber-200/80 border border-amber-600/80 rounded-xs shadow-xs" title="Dock Door A2-3" />
          <div className="absolute -right-2 top-1/4 w-2 h-6 bg-amber-200/80 border border-amber-600/80 rounded-xs shadow-xs" title="Dock Door A2-4" />
          <div className="absolute -right-2 top-2/4 w-2 h-6 bg-amber-200/80 border border-amber-600/80 rounded-xs shadow-xs" title="Dock Door A2-5" />
          <div className="absolute -right-2 top-3/4 w-2 h-6 bg-amber-200/80 border border-amber-600/80 rounded-xs shadow-xs" title="Dock Door A2-6" />

          {/* Building Header - Unified Design System */}
          <div className="text-center pb-1.5 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-800 text-blue-300 rounded border border-slate-700">
                DA2D-1 &bull; 160 PL
              </span>
              <h2 className="text-base sm:text-lg font-black tracking-wide text-white">
                A2 Building
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-800 text-emerald-300 rounded border border-slate-700">
                20 Rails
              </span>
            </div>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5">
              คลังรางเลื่อน Flow Rail เต็มพื้นที่ (ขยายความสูงเต็มอาคาร &bull; ไม่มี HE LINE)
            </p>
          </div>

          {/* Floor Walkway / Infeed Road Header */}
          <div className="h-5 flex items-center justify-between px-2 text-[9px] font-mono text-slate-400 border-b border-dashed border-slate-800/80 my-1.5">
            <span>&larr; Main Forklift Infeed Road</span>
            <span>DA2D-1 Storage Zone &rarr;</span>
          </div>

          {/* Building Floor Content: DA2D-1 Container */}
          <div className="flex-1 flex flex-col justify-between my-1">
            <div 
              id="zone-da2d-1"
              onClick={() => handleZoneClick(
                'DA2D-1 Flow Rail R1-R20',
                'DA2D-1',
                'A2 Building',
                'ระบบจัดเก็บรางเลื่อน Flow Rail 20 ราง x 8 ช่อง = 160 พาเลท ต่อเนื่องเข้าสายการผลิต',
                160,
                liveStats.a2.pl,
                'A2_RAIL',
                undefined,
                liveStats.a2Items
              )}
              className="bg-slate-950/80 border border-slate-800 hover:border-blue-500/80 rounded-lg p-2.5 flex-1 flex flex-col justify-between cursor-pointer transition-all active:scale-[0.99] group shadow-inner"
            >
              {/* DA2D-1 Header */}
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs sm:text-sm font-black text-blue-400 font-mono tracking-wider">
                    DA2D-1
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 font-mono">
                    FLOW RAIL (R1 - R20)
                  </span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/60">
                    จัดเก็บ {liveStats.a2.pl} / 160 PL
                  </span>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    4 BLOCKS
                  </span>
                </div>
              </div>

              {/* Direction Flow Guide */}
              <div className="my-1.5 px-2 py-0.5 bg-slate-900 rounded flex items-center justify-between text-[8px] font-mono text-cyan-300 font-bold border border-slate-800">
                <span className="flex items-center gap-1">
                  <span className="text-rose-400">&larr;</span> จ่ายออก (Outfeed)
                </span>
                <span className="text-slate-400">ช่อง 01 &larr; ช่อง 08 (8 พาเลท / ราง)</span>
                <span className="flex items-center gap-1">
                  รับเข้า (Infeed) <span className="text-emerald-400">&rarr;</span>
                </span>
              </div>

              {/* 4 Full Banks (20 Rails) Expanding to fill height */}
              <div className="flex-1 flex flex-col justify-between space-y-1 bg-slate-900/90 rounded-md p-1.5 border border-slate-800 shadow-inner">
                {[
                  { label: 'Block 4 (ราง R16 - R20)', rails: [20, 19, 18, 17, 16] },
                  { label: 'Block 3 (ราง R11 - R15)', rails: [15, 14, 13, 12, 11] },
                  { label: 'Block 2 (ราง R06 - R10)', rails: [10, 9, 8, 7, 6] },
                  { label: 'Block 1 (ราง R01 - R05)', rails: [5, 4, 3, 2, 1] },
                ].map(bank => (
                  <div key={bank.label} className="bg-slate-850/90 p-1 rounded border border-slate-700/60 flex-1 flex flex-col justify-center">
                    <div className="text-[7px] font-mono text-slate-300 mb-0.5 flex justify-between px-0.5">
                      <span className="text-cyan-300 font-bold">{bank.label}</span>
                      <span className="text-slate-400">5 เลน &bull; 40 พาเลท</span>
                    </div>
                    <div className="space-y-0.5">
                      {bank.rails.map(railNum => (
                        <div key={railNum} className="flex items-center space-x-1">
                          <span className="w-3.5 text-[6.5px] font-mono font-black text-slate-300 text-right">R{railNum}</span>
                          <div className="grid grid-cols-8 gap-0.5 flex-1">
                            {Array.from({ length: 8 }).map((_, pIdx) => {
                              const pos = pIdx + 1;
                              const isRed = (railNum === 3 && pos === 2);
                              const isSampleOcc = isRed || (
                                (railNum === 20 && pos === 1) || 
                                (railNum === 20 && pos === 5) || 
                                (railNum === 18 && pos === 4) || 
                                (railNum === 14 && pos === 3) || 
                                (railNum === 11 && pos === 2) || 
                                (railNum === 9 && pos === 6) || 
                                (railNum === 6 && pos === 8) || 
                                (railNum === 2 && pos === 3) || 
                                (railNum === 1 && pos === 7)
                              );
                              return (
                                <div
                                  key={pos}
                                  className={`h-2 rounded-3xs border text-[5px] transition-all flex items-center justify-center font-mono ${
                                    isRed 
                                      ? 'bg-rose-600 border-rose-400 text-white font-black animate-pulse' 
                                      : isSampleOcc 
                                      ? 'bg-blue-600/80 border-blue-400 text-white font-bold' 
                                      : 'bg-slate-800/80 border-slate-700/60 text-slate-500'
                                  }`}
                                  title={`DA2D-1-R${railNum}-0${pos}`}
                                />
                              );
                            })}
                          </div>
                          <span className="w-3 text-[6px] font-mono text-slate-500 text-left">R{railNum}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Micro Metric Banner */}
                <div className="flex items-center justify-between text-[7.5px] text-slate-400 font-mono pt-1 border-t border-slate-800">
                  <span className="text-blue-300 font-bold">จัดเก็บ {liveStats.a2.pl} / 160 PL ({Math.round((liveStats.a2.pl / 160) * 100)}%)</span>
                  <span className="text-amber-400 font-bold">1 ช่อง = 1 พาเลท &bull; 20 ราง x 8 ช่อง</span>
                </div>
              </div>

              <div className="mt-1.5 text-center text-[11px] font-bold text-blue-400 group-hover:text-blue-300 group-hover:underline flex items-center justify-center gap-1">
                <span>เปิดดูผังรางเลื่อน 2D ละเอียด (A2 Flow Rail View)</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          </div>

          {/* Building Footer / Office */}
          <div className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg py-1 px-2.5 text-center text-[11px] font-bold shadow-2xs mt-1.5">
            Office A2 &bull; สำนักงานและควบคุมการจ่ายชิ้นส่วน
          </div>
        </div>


        {/* ======================================================================= */}
        {/* 2. COLUMN 2: A4 BUILDING (ตรงกลาง - 4 Cols)                             */}
        {/*    ส่วนบน: A4 RACK (DA4D-2 Rack B-F + DA4D-3 Rack G-K 12 Bays)          */}
        {/*    ส่วนล่าง: A4 วางพื้น (DA4D-1 FLOOR STAGING X1 - X8 &bull; 432 PL)     */}
        {/* ======================================================================= */}
        <div 
          id="col-a4-building"
          className="lg:col-span-4 bg-slate-900/95 border border-slate-800 hover:border-slate-700 rounded-xl p-3 shadow-md flex flex-col justify-between relative overflow-hidden transition-all"
        >
          {/* Dock Doors (Beige tabs on Left & Right) */}
          <div className="absolute -left-2 top-1/4 w-2 h-6 bg-amber-200/80 border border-amber-600/80 rounded-xs shadow-xs" title="Dock Door A4-1" />
          <div className="absolute -left-2 top-2/4 w-2 h-6 bg-amber-200/80 border border-amber-600/80 rounded-xs shadow-xs" title="Dock Door A4-2" />
          <div className="absolute -left-2 top-3/4 w-2 h-6 bg-amber-200/80 border border-amber-600/80 rounded-xs shadow-xs" title="Dock Door A4-3" />
          <div className="absolute -right-2 top-1/4 w-2 h-6 bg-amber-200/80 border border-amber-600/80 rounded-xs shadow-xs" title="Dock Door A4-4" />
          <div className="absolute -right-2 top-2/4 w-2 h-6 bg-amber-200/80 border border-amber-600/80 rounded-xs shadow-xs" title="Dock Door A4-5" />
          <div className="absolute -right-2 top-3/4 w-2 h-6 bg-amber-200/80 border border-amber-600/80 rounded-xs shadow-xs" title="Dock Door A4-6" />

          {/* Building Header - Unified Design System */}
          <div className="text-center pb-1.5 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-800 text-purple-300 rounded border border-slate-700">
                Rack B-K &bull; 680 PL
              </span>
              <h2 className="text-base sm:text-lg font-black tracking-wide text-white">
                A4 Building
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-800 text-amber-300 rounded border border-slate-700">
                Floor X1-X8 &bull; 432 PL
              </span>
            </div>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5">
              คลังหลักจัดเก็บชิ้นส่วน (แร็ค Selective 10 แถว x 12 ช่อง + ลานวางพื้นเต็มพื้นที่)
            </p>
          </div>

          {/* Floor Roadway Header */}
          <div className="h-5 flex items-center justify-between px-2 text-[9px] font-mono text-slate-400 border-b border-dashed border-slate-800/80 my-1.5">
            <span>Main Central Forklift Roadway</span>
            <span>A4 Staging &amp; Racks &rarr;</span>
          </div>

          {/* Building Interior Layout: TOP (A4 RACK) + BOTTOM (A4 FLOOR STAGING X1-X8) */}
          <div className="flex-1 flex flex-col justify-between space-y-2 my-1">
            
            {/* ------------------------------------------------------------------- */}
            {/* 2.1 ส่วนบน: A4 RACK (B-F 480 PL + G-K 200 PL)                         */}
            {/* ------------------------------------------------------------------- */}
            <div className="flex flex-col sm:flex-row gap-2">
              
              {/* BLOCK 1: RACK B-F (พื้นที่ ~58%) */}
              <div 
                id="zone-rack-bf"
                onClick={() => handleZoneClick(
                  'DA4D-2 Selective Rack (B-F)',
                  'DA4D-2',
                  'A4 Building',
                  'Selective Rack 5 แถว (B, C, D, E, F) แถวละ 12 ช่วงเสา x 4 ชั้น = 480 พาเลท',
                  480,
                  liveStats.a4.pl,
                  'A4_RACK',
                  undefined,
                  liveStats.a4Items.filter(it => ['B', 'C', 'D', 'E', 'F'].includes(it.zone))
                )}
                className="flex-[7] bg-slate-950/80 border border-slate-800 hover:border-purple-500/80 rounded-lg p-2 cursor-pointer transition-all active:scale-[0.99] group shadow-inner"
              >
                <div className="flex items-center justify-between pb-1 border-b border-slate-800 mb-1">
                  <div className="flex items-center space-x-1">
                    <span className="text-[11px] font-black text-blue-400 font-mono">
                      DA4D-2
                    </span>
                    <span className="text-[8px] font-mono font-bold text-purple-300">
                      RACK B-F
                    </span>
                  </div>
                  <span className="text-[7.5px] font-mono font-bold bg-purple-950/80 text-purple-200 border border-purple-800/60 px-1 py-0.2 rounded">
                    480 PL (12 Bays)
                  </span>
                </div>

                {/* 5 Rows (B, C, D, E, F), Each Row has 12 Horizontal Bays */}
                <div className="bg-slate-900/90 rounded p-1 border border-slate-800 space-y-0.5 shadow-inner">
                  {/* Bay Numbers Header (01 to 12) */}
                  <div className="flex items-center space-x-1">
                    <span className="w-3 text-[5.5px] text-slate-500 text-right">Row</span>
                    <div className="grid grid-cols-12 gap-0.5 flex-1 text-center">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <span key={i} className="text-[5.5px] font-mono text-slate-400 font-bold">
                          {i + 1}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 5 Rows B, C, D, E, F with 12 Bays each */}
                  {['B', 'C', 'D', 'E', 'F'].map(rowLetter => (
                    <div key={rowLetter} className="flex items-center space-x-1">
                      <span className="w-3 h-3 rounded bg-blue-600 text-white font-mono font-black text-[6.5px] flex items-center justify-center shrink-0">
                        {rowLetter}
                      </span>
                      <div className="grid grid-cols-12 gap-0.5 flex-1">
                        {Array.from({ length: 12 }).map((_, bIdx) => {
                          const bayNum = bIdx + 1;
                          const isD2 = (rowLetter === 'D' && bayNum === 2);
                          const isOcc = isD2 || (rowLetter === 'B' && (bayNum === 3 || bayNum === 9)) || (rowLetter === 'C' && bayNum === 7) || (rowLetter === 'F' && bayNum === 11);
                          return (
                            <div
                              key={bayNum}
                              className={`h-2 rounded-3xs border text-[4.5px] font-mono flex items-center justify-center transition-all ${
                                isD2
                                  ? 'bg-rose-600 border-rose-400 text-white font-black animate-pulse'
                                  : isOcc
                                  ? 'bg-purple-600/80 border-purple-400 text-white font-bold'
                                  : 'bg-slate-800/80 border-slate-700/60 text-slate-500'
                              }`}
                              title={`Row ${rowLetter} Bay ${bayNum < 10 ? '0' + bayNum : bayNum} (4 Levels)`}
                            >
                              {bayNum}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-1 text-[7.5px] font-bold text-slate-400 text-center group-hover:text-purple-300">
                  แร็ค B-F (12 ช่อง x 4 ชั้น) &rarr;
                </div>
              </div>

              {/* BLOCK 2: RACK G-K (พื้นที่ ~42%) */}
              <div 
                id="zone-rack-gk"
                onClick={() => handleZoneClick(
                  'DA4D-3 Selective Rack (G-K)',
                  'DA4D-3',
                  'A4 Building',
                  'Selective Rack 5 แถว (G, H, I, J, K) แถวละ 12 ช่วงเสา x 4 ชั้น = 200/240 พาเลท',
                  200,
                  liveStats.a4.pl,
                  'A4_RACK',
                  undefined,
                  liveStats.a4Items.filter(it => ['G', 'H', 'I', 'J', 'K'].includes(it.zone))
                )}
                className="flex-[5] bg-slate-950/80 border border-slate-800 hover:border-indigo-500/80 rounded-lg p-2 cursor-pointer transition-all active:scale-[0.99] group shadow-inner"
              >
                <div className="flex items-center justify-between pb-1 border-b border-slate-800 mb-1">
                  <div className="flex items-center space-x-1">
                    <span className="text-[11px] font-black text-blue-400 font-mono">
                      DA4D-3
                    </span>
                    <span className="text-[8px] font-mono font-bold text-indigo-300">
                      RACK G-K
                    </span>
                  </div>
                  <span className="text-[7.5px] font-mono font-bold bg-indigo-950/80 text-indigo-200 border border-indigo-800/60 px-1 py-0.2 rounded">
                    200 PL (12 Bays)
                  </span>
                </div>

                {/* 5 Rows (G, H, I, J, K), Each Row has 12 Horizontal Bays */}
                <div className="bg-slate-900/90 rounded p-1 border border-slate-800 space-y-0.5 shadow-inner">
                  {/* Bay Numbers Header (01 to 12) */}
                  <div className="flex items-center space-x-1">
                    <span className="w-3 text-[5.5px] text-slate-500 text-right">Row</span>
                    <div className="grid grid-cols-12 gap-0.5 flex-1 text-center">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <span key={i} className="text-[5.5px] font-mono text-slate-400 font-bold">
                          {i + 1}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 5 Rows G, H, I, J, K with 12 Bays each */}
                  {['G', 'H', 'I', 'J', 'K'].map(rowLetter => (
                    <div key={rowLetter} className="flex items-center space-x-1">
                      <span className="w-3 h-3 rounded bg-indigo-600 text-white font-mono font-black text-[6.5px] flex items-center justify-center shrink-0">
                        {rowLetter}
                      </span>
                      <div className="grid grid-cols-12 gap-0.5 flex-1">
                        {Array.from({ length: 12 }).map((_, bIdx) => {
                          const bayNum = bIdx + 1;
                          const isOcc = (rowLetter === 'G' && bayNum <= 5) || (rowLetter === 'H' && (bayNum === 2 || bayNum === 8)) || (rowLetter === 'K' && bayNum === 4);
                          return (
                            <div
                              key={bayNum}
                              className={`h-2 rounded-3xs border text-[4.5px] font-mono flex items-center justify-center transition-all ${
                                isOcc
                                  ? 'bg-indigo-600/80 border-indigo-400 text-white font-bold'
                                  : 'bg-slate-800/80 border-slate-700/60 text-slate-500'
                              }`}
                              title={`Row ${rowLetter} Bay ${bayNum < 10 ? '0' + bayNum : bayNum}`}
                            >
                              {bayNum}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-1 text-[7.5px] font-bold text-slate-400 text-center group-hover:text-indigo-300">
                  แร็ค G-K (12 ช่อง x 4 ชั้น) &rarr;
                </div>
              </div>

            </div>

            {/* ------------------------------------------------------------------- */}
            {/* 2.2 ส่วนล่าง: A4 วางพื้น (DA4D-1 FLOOR STAGING X1 - X8 &bull; 432 PL) */}
            {/*     แก้ไขให้โครงสร้างถูกต้องตามมาตรฐานจริง (X8-X5 และ X4-X1)          */}
            {/*     พร้อมทางเดินรถ Forklift / AGV Driveway กึ่งกลาง                  */}
            {/*     ธีมสีสอดคล้องกับ Design System สากล                             */}
            {/* ------------------------------------------------------------------- */}
            <div 
              id="zone-a4-floor"
              onClick={() => handleZoneClick(
                'DA4D-1 Floor Staging (X1-X8)',
                'DA4D-1',
                'A4 Building',
                'ลานกองพื้น 8 กลุ่มโซน (X1 - X8) ความจุ 432 พาเลท พร้อมช่องทางสัญจร AGV Driveway',
                432,
                liveStats.a4.pl,
                'A4_FLOOR',
                undefined,
                liveStats.a4Items.filter(it => it.zone.startsWith('X'))
              )}
              className="bg-slate-950/80 border border-slate-800 hover:border-amber-500/80 rounded-lg p-2.5 cursor-pointer transition-all active:scale-[0.99] group shadow-inner flex flex-col justify-between flex-1"
            >
              {/* Floor Header */}
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 mb-1.5">
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs sm:text-sm font-black text-amber-400 font-mono">
                    DA4D-1
                  </span>
                  <span className="text-[9px] font-mono font-bold text-slate-300">
                    A4 วางพื้น (FLOOR STAGING X1-X8 &bull; 432 PL)
                  </span>
                </div>
                <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/60">
                  เต็มพื้นที่ด้านล่าง 100%
                </span>
              </div>

              {/* Grid Layout of X1-X8 in 2 Distinct Blocks */}
              <div className="space-y-1.5 flex-1 flex flex-col justify-between bg-slate-900/90 rounded-md p-1.5 border border-slate-800">
                
                {/* BLOCK 1: X8 - X5 (Rows 25 - 46 &bull; 264 PL) */}
                <div className="space-y-1 bg-slate-850/90 p-1 rounded border border-slate-700/60">
                  <div className="flex items-center justify-between text-[7px] font-mono font-black text-amber-300 px-1">
                    <span>กลุ่มโซนวางพื้น X8 - X5 (Rows 25 - 46)</span>
                    <span className="text-slate-400">264 พาเลท (12 ช่องต่อแถว)</span>
                  </div>
                  {['X8', 'X7', 'X6', 'X5'].map((zoneCode) => (
                    <div key={zoneCode} className="flex items-center space-x-1">
                      <span className="w-4 text-[6.5px] font-mono font-black text-amber-300 text-left">
                        {zoneCode}
                      </span>
                      <div className="grid grid-cols-12 gap-0.5 flex-1">
                        {Array.from({ length: 12 }).map((_, i) => (
                          <div 
                            key={i} 
                            className="h-2 rounded-3xs bg-amber-500/80 border border-amber-400/80 hover:bg-amber-400 transition-colors"
                            title={`${zoneCode} ช่อง ${i + 1}`}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Central Forklift / AGV Driveway / Pathway */}
                <div className="flex items-center justify-between text-[7px] font-mono text-cyan-300 py-0.5 px-2 bg-slate-950 border border-slate-800 rounded font-bold">
                  <span className="flex items-center gap-1">
                    <Truck className="w-2.5 h-2.5 text-cyan-400" />
                    <span>&larr; ทางสัญจรหลักรถ AGV / Forklift</span>
                  </span>
                  <span className="font-black text-slate-300">ช่องทางขนส่งและลำเลียง</span>
                  <span>&rarr;</span>
                </div>

                {/* BLOCK 2: X4 - X1 (Rows 01 - 24 &bull; 168 PL) */}
                <div className="space-y-1 bg-slate-850/90 p-1 rounded border border-slate-700/60">
                  <div className="flex items-center justify-between text-[7px] font-mono font-black text-amber-300 px-1">
                    <span>กลุ่มโซนวางพื้น X4 - X1 (Rows 01 - 24)</span>
                    <span className="text-slate-400">168 พาเลท (7 ช่องต่อแถว)</span>
                  </div>
                  {['X4', 'X3', 'X2', 'X1'].map((zoneCode) => (
                    <div key={zoneCode} className="flex items-center space-x-1">
                      <span className="w-4 text-[6.5px] font-mono font-black text-amber-300 text-left">
                        {zoneCode}
                      </span>
                      <div className="grid grid-cols-7 gap-0.5 flex-1">
                        {Array.from({ length: 7 }).map((_, i) => (
                          <div 
                            key={i} 
                            className="h-2 rounded-3xs bg-amber-500/80 border border-amber-400/80 hover:bg-amber-400 transition-colors"
                            title={`${zoneCode} ช่อง ${i + 1}`}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

              </div>

              <div className="mt-1 text-center text-[10px] font-bold text-amber-400 group-hover:text-amber-300 group-hover:underline flex items-center justify-center gap-1">
                <span>เปิดดูผังลานวางพื้น A4 ละเอียด (X1 - X8 Floor View)</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>

          </div>

          {/* Building Footer / Office */}
          <div className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg py-1 px-2.5 text-center text-[11px] font-bold shadow-2xs mt-1.5">
            Office A4 &bull; ควบคุมคลังสินค้าและสำนักงานหลัก
          </div>
        </div>


        {/* ======================================================================= */}
        {/* 3. COLUMN 3: TENTS A5 & CY3 (ขวาสุด - 4 Cols)                           */}
        {/*    A5 Tent: 4 บล็อกย่อย (No. 1 ถึง No. 4) เรียง 2x2 Grid                 */}
        {/*    HE CY3 Tent: โครงสร้างแร็ค 4 แถว (A, B, C, D) 4 ชั้น x 25 ช่อง (400P) */}
        {/* ======================================================================= */}
        <div 
          id="col-tents-a5-cy3"
          className="lg:col-span-4 flex flex-col justify-between gap-3"
        >
          
          {/* ===================================================================== */}
          {/* 3.1 A5 TENT YARD (2x2 Grid of 4 Tents: No. 1 - No. 4)                 */}
          {/* ===================================================================== */}
          <div className="bg-slate-900/95 border border-slate-800 hover:border-slate-700 rounded-xl p-3 shadow-md flex-1 flex flex-col justify-between transition-all">
            
            {/* Header: A5 Tent - Unified Design System */}
            <div className="text-center pb-1.5 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-800 text-sky-300 rounded border border-slate-700">
                  DAST 1-4 &bull; 784 PL
                </span>
                <h2 className="text-base sm:text-lg font-black tracking-wide text-white flex items-center gap-1.5">
                  <span>⛺</span>
                  <span>A5 Tent Yard</span>
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-800 text-purple-300 rounded border border-slate-700">
                  4 Tents
                </span>
              </div>
              <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                ลานเต็นท์ 4 หลัง (ความจุ 784 พาเลท) &bull; จัดเก็บชิ้นส่วนภายนอก
              </p>
            </div>

            {/* 2x2 Grid of 4 Tents: No. 2, No. 4, No. 1, No. 3 */}
            <div className="grid grid-cols-2 gap-2 my-1.5">
              
              {/* TOP-LEFT: A5 Tent No. 2 (DAST-2.01) */}
              <div 
                id="tent-a5-no2"
                onClick={() => handleZoneClick(
                  'A5 Tent No. 2 (DAST-2.01)',
                  'DAST-2.01',
                  'A5 Tent Yard',
                  'เต็นท์ A5 หลังที่ 2 ประกอบด้วย 7 กลุ่มย่อย ความจุ 196 พาเลท',
                  196,
                  Math.round(liveStats.a5.pl / 4),
                  'A5_TENT',
                  2,
                  liveStats.a5Items
                )}
                className="bg-slate-950/80 border border-slate-800 hover:border-blue-500/80 rounded-md p-1.5 shadow-inner cursor-pointer transition-all group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="bg-blue-950/80 text-blue-300 border border-blue-800/60 font-mono font-bold text-[7.5px] px-1 py-0.2 rounded">
                    DAST-2.01
                  </span>
                  <span className="text-[7.5px] font-mono text-slate-400 font-bold">196P</span>
                </div>

                <div className="my-0.5 bg-slate-900/90 p-1 rounded-xs border border-slate-800">
                  <div className="grid grid-cols-7 gap-0.5 mb-0.5 text-center text-[5px] font-mono text-cyan-300 font-bold">
                    {['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'].map(g => (
                      <div key={g} className="bg-slate-800 rounded-3xs py-0.2">{g}</div>
                    ))}
                  </div>
                  <div className="space-y-0.5">
                    {Array.from({ length: 3 }).map((_, r) => (
                      <div key={r} className="grid grid-cols-7 gap-0.5">
                        {Array.from({ length: 7 }).map((_, c) => (
                          <div key={c} className="h-1.5 bg-amber-500/80 rounded-3xs border border-amber-400/60" />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-center pt-0.5 border-t border-slate-800">
                  <span className="bg-purple-950/80 text-purple-200 border border-purple-800/60 font-black text-[7.5px] px-1.5 py-0.2 rounded inline-block">
                    A5 Tent No. 2
                  </span>
                </div>
              </div>

              {/* TOP-RIGHT: A5 Tent No. 4 (DAST-4.01) */}
              <div 
                id="tent-a5-no4"
                onClick={() => handleZoneClick(
                  'A5 Tent No. 4 (DAST-4.01)',
                  'DAST-4.01',
                  'A5 Tent Yard',
                  'เต็นท์ A5 หลังที่ 4 ประกอบด้วย 6 กลุ่มย่อย + 1 Rack A ความจุ 196 พาเลท',
                  196,
                  Math.round(liveStats.a5.pl / 4),
                  'A5_TENT',
                  4,
                  liveStats.a5Items
                )}
                className="bg-slate-950/80 border border-slate-800 hover:border-blue-500/80 rounded-md p-1.5 shadow-inner cursor-pointer transition-all group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="bg-blue-950/80 text-blue-300 border border-blue-800/60 font-mono font-bold text-[7.5px] px-1 py-0.2 rounded">
                    DAST-4.01
                  </span>
                  <span className="text-[7.5px] font-mono text-slate-400 font-bold">196P</span>
                </div>

                <div className="my-0.5 bg-slate-900/90 p-1 rounded-xs border border-slate-800">
                  <div className="grid grid-cols-7 gap-0.5 mb-0.5 text-center text-[5px] font-mono font-bold">
                    {['G1', 'G2', 'G3', 'G4', 'G5', 'G6'].map(g => (
                      <div key={g} className="bg-slate-800 text-cyan-300 rounded-3xs py-0.2">{g}</div>
                    ))}
                    <div className="bg-pink-950 text-pink-300 border border-pink-800/80 rounded-3xs py-0.2 font-bold">R.A</div>
                  </div>
                  <div className="space-y-0.5">
                    {Array.from({ length: 3 }).map((_, r) => (
                      <div key={r} className="grid grid-cols-7 gap-0.5">
                        {Array.from({ length: 6 }).map((_, c) => (
                          <div key={c} className="h-1.5 bg-amber-500/80 rounded-3xs border border-amber-400/60" />
                        ))}
                        <div className="h-1.5 bg-pink-500/80 rounded-3xs border border-pink-400/80" title="Rack A" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-center pt-0.5 border-t border-slate-800">
                  <span className="bg-purple-950/80 text-purple-200 border border-purple-800/60 font-black text-[7.5px] px-1.5 py-0.2 rounded inline-block">
                    A5 Tent No. 4
                  </span>
                </div>
              </div>

              {/* BOTTOM-LEFT: A5 Tent No. 1 (DAST-1.01) */}
              <div 
                id="tent-a5-no1"
                onClick={() => handleZoneClick(
                  'A5 Tent No. 1 (DAST-1.01)',
                  'DAST-1.01',
                  'A5 Tent Yard',
                  'เต็นท์ A5 หลังที่ 1 ประกอบด้วย 7 กลุ่มย่อย ความจุ 196 พาเลท',
                  196,
                  Math.round(liveStats.a5.pl / 4),
                  'A5_TENT',
                  1,
                  liveStats.a5Items
                )}
                className="bg-slate-950/80 border border-slate-800 hover:border-blue-500/80 rounded-md p-1.5 shadow-inner cursor-pointer transition-all group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="bg-blue-950/80 text-blue-300 border border-blue-800/60 font-mono font-bold text-[7.5px] px-1 py-0.2 rounded">
                    DAST-1.01
                  </span>
                  <span className="text-[7.5px] font-mono text-slate-400 font-bold">196P</span>
                </div>

                <div className="my-0.5 bg-slate-900/90 p-1 rounded-xs border border-slate-800">
                  <div className="grid grid-cols-7 gap-0.5 mb-0.5 text-center text-[5px] font-mono text-cyan-300 font-bold">
                    {['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'].map(g => (
                      <div key={g} className="bg-slate-800 rounded-3xs py-0.2">{g}</div>
                    ))}
                  </div>
                  <div className="space-y-0.5">
                    {Array.from({ length: 3 }).map((_, r) => (
                      <div key={r} className="grid grid-cols-7 gap-0.5">
                        {Array.from({ length: 7 }).map((_, c) => (
                          <div key={c} className="h-1.5 bg-amber-500/80 rounded-3xs border border-amber-400/60" />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-center pt-0.5 border-t border-slate-800">
                  <span className="bg-purple-950/80 text-purple-200 border border-purple-800/60 font-black text-[7.5px] px-1.5 py-0.2 rounded inline-block">
                    A5 Tent No. 1
                  </span>
                </div>
              </div>

              {/* BOTTOM-RIGHT: A5 Tent No. 3 (DAST-3.01) */}
              <div 
                id="tent-a5-no3"
                onClick={() => handleZoneClick(
                  'A5 Tent No. 3 (DAST-3.01)',
                  'DAST-3.01',
                  'A5 Tent Yard',
                  'เต็นท์ A5 หลังที่ 3 ประกอบด้วย 7 กลุ่มย่อย ความจุ 196 พาเลท',
                  196,
                  Math.round(liveStats.a5.pl / 4),
                  'A5_TENT',
                  3,
                  liveStats.a5Items
                )}
                className="bg-slate-950/80 border border-slate-800 hover:border-blue-500/80 rounded-md p-1.5 shadow-inner cursor-pointer transition-all group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="bg-blue-950/80 text-blue-300 border border-blue-800/60 font-mono font-bold text-[7.5px] px-1 py-0.2 rounded">
                    DAST-3.01
                  </span>
                  <span className="text-[7.5px] font-mono text-slate-400 font-bold">196P</span>
                </div>

                <div className="my-0.5 bg-slate-900/90 p-1 rounded-xs border border-slate-800">
                  <div className="grid grid-cols-7 gap-0.5 mb-0.5 text-center text-[5px] font-mono text-cyan-300 font-bold">
                    {['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'].map(g => (
                      <div key={g} className="bg-slate-800 rounded-3xs py-0.2">{g}</div>
                    ))}
                  </div>
                  <div className="space-y-0.5">
                    {Array.from({ length: 3 }).map((_, r) => (
                      <div key={r} className="grid grid-cols-7 gap-0.5">
                        {Array.from({ length: 7 }).map((_, c) => (
                          <div key={c} className="h-1.5 bg-amber-500/80 rounded-3xs border border-amber-400/60" />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-center pt-0.5 border-t border-slate-800">
                  <span className="bg-purple-950/80 text-purple-200 border border-purple-800/60 font-black text-[7.5px] px-1.5 py-0.2 rounded inline-block">
                    A5 Tent No. 3
                  </span>
                </div>
              </div>

            </div>

            <div className="flex items-center justify-between text-[9px] font-bold text-slate-300 pt-1 border-t border-slate-800">
              <span className="text-sky-300 font-mono font-bold">
                จัดเก็บ A5: {liveStats.a5.pl} / 784 PL ({Math.round((liveStats.a5.pl / 784) * 100)}%)
              </span>
              <span className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer">
                เปิดโซน A5 &rarr;
              </span>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* 3.2 HE CY3 TENT (Outdoor Selective Rack: 4 Rows A-D x 4 Levels x 25) */}
          {/* ===================================================================== */}
          <div className="bg-slate-900/95 border border-slate-800 hover:border-slate-700 rounded-xl p-3 shadow-md flex-1 flex flex-col justify-between transition-all">
            
            {/* Header: HE CY3 Tent - Unified Design System */}
            <div className="text-center pb-1.5 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-800 text-rose-300 rounded border border-slate-700">
                  DY3T &bull; 400 PL
                </span>
                <h2 className="text-base sm:text-lg font-black tracking-wide text-white flex items-center gap-1.5">
                  <span>🏗️</span>
                  <span>HE CY3 Tent</span>
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-800 text-amber-300 rounded border border-slate-700">
                  Outdoor Rack
                </span>
              </div>
              <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                พื้นที่จำลอง Rack 4 แถว (A, B, C, D) &bull; แต่ละแถวมี 4 ชั้น x 25 ช่อง (แถวยาว 400P)
              </p>
            </div>

            {/* Red Bordered Enclosure for Outdoor Rack 4 Long Rows */}
            <div 
              id="tent-cy3-rack"
              onClick={() => handleZoneClick(
                'CY3 Tent Yard (Outdoor 4-Tier Selective Rack)',
                'DY3T 1.01-1.04',
                'CY3 Tent Yard',
                'โครงสร้างแร็คกลางแจ้ง 4 แถว (A, B, C, D) แต่ละแถวมี 4 ชั้น x 25 ช่วงเสา = 400 พาเลท',
                400,
                liveStats.cy3.pl,
                'CY3_TENT',
                undefined,
                liveStats.cy3Items
              )}
              className="my-1.5 bg-slate-950/80 border border-slate-800 hover:border-rose-500/80 rounded-lg p-2 cursor-pointer transition-all space-y-1 group flex-1 flex flex-col justify-between shadow-inner"
            >
              {[
                { row: 'A', code: 'DY3T-1.01' },
                { row: 'B', code: 'DY3T-1.02' },
                { row: 'C', code: 'DY3T-1.03' },
                { row: 'D', code: 'DY3T-1.04' },
              ].map((r, idx) => (
                <React.Fragment key={r.row}>
                  <div className="flex items-center space-x-1.5 w-full">
                    {/* Navy Row Badge */}
                    <div className="w-4 h-4 rounded bg-blue-900 text-white font-mono font-black text-[8px] flex items-center justify-center shrink-0 shadow-2xs">
                      {r.row}
                    </div>

                    {/* Multiplier Tag */}
                    <span className="text-[7px] font-mono font-bold text-slate-400 w-11 shrink-0">
                      4 ชั้น x 25 ช่อง
                    </span>

                    {/* 25 Bay Slots Grid (Long Horizontal Row) */}
                    <div 
                      className="flex-1 gap-px bg-slate-900/90 p-0.5 rounded border border-slate-800"
                      style={{ display: 'grid', gridTemplateColumns: 'repeat(25, minmax(0, 1fr))' }}
                    >
                      {Array.from({ length: 25 }).map((_, bIdx) => {
                        const bayNum = bIdx + 1;
                        return (
                          <div
                            key={bayNum}
                            className="h-2 bg-amber-500/80 rounded-3xs border border-amber-400/60 text-[4px] font-mono text-slate-950 flex items-center justify-center leading-none"
                            title={`Row ${r.row} Bay ${bayNum < 10 ? '0' + bayNum : bayNum} (4 Levels)`}
                          >
                            {bayNum}
                          </div>
                        );
                      })}
                    </div>

                    {/* Locator Badge */}
                    <span className="text-[7px] font-mono font-bold text-blue-300 w-11 text-right shrink-0">
                      {r.code}
                    </span>
                  </div>

                  {/* Center Forklift Pathway between Row B and Row C */}
                  {idx === 1 && (
                    <div className="py-0.5 px-2 bg-slate-900 border border-dashed border-slate-700 rounded flex items-center justify-between text-[6.5px] font-mono text-amber-300 font-bold">
                      <span>&larr; ทางวิ่งรถยก Forklift</span>
                      <span>Outdoor Forklift Road (ทางแยกกึ่งกลางแร็ค)</span>
                      <span>&rarr;</span>
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>

            <div className="flex items-center justify-between text-[9px] font-bold text-slate-300 pt-1 border-t border-slate-800">
              <span className="text-rose-400 font-mono font-black">
                ความจุ 4 แถว x 100 = 400 PL (Rate 168%)
              </span>
              <span className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer">
                เปิดโซน CY3 &rarr;
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 4. ITEM INFO SUMMARY (ตารางสรุปผลข้อมูลคลังสินค้า วางไว้ด้านล่างสุด)       */}
      {/*    จัดสัดส่วนให้กระชับ สมดุล และเข้ากับจอใหญ่/Fullscreen ได้พอดี            */}
      {/* ========================================================================= */}
      <div 
        id="item-info-summary"
        className="bg-slate-900/95 border border-slate-800 rounded-xl shadow-lg overflow-hidden shrink-0"
      >
        {/* Table Title Bar */}
        <div className="bg-slate-950 text-white px-3.5 sm:px-4 py-2 sm:py-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <span className="w-2 h-5 bg-amber-500 rounded-full shrink-0" />
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm sm:text-base font-black tracking-wide text-white">
                  Item Info Summary
                </h3>
                <span className="px-2 py-0.2 rounded-full text-[10px] font-bold font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  ตารางสรุปข้อมูลคลังสินค้าทุกอาคาร
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                สรุปความจุพาเลท (Capacity PL), สต็อกคงคลังพาเลท (Inventory PL), สต็อกชิ้นงาน (Inventory EA) และอัตราการจัดเก็บ (Rate %)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-[11px] font-mono font-bold text-slate-300">
            <span>{dataMode === 'PLAN_SPEC' ? '📋 อ้างอิง: ค่ามาตรฐานแปลน CAD 2D' : '⚡ อ้างอิง: ข้อมูลคำนวณสดจากระบบ WMS'}</span>
          </div>
        </div>

        {/* Compact Accessible Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-300">
                <th className="py-2.5 px-3.5 font-black tracking-tight">
                  พื้นที่จัดเก็บคลัง (Depot Area)
                </th>
                <th className="py-2.5 px-3.5 font-black tracking-tight">
                  ทีมงานรับผิดชอบ (Team)
                </th>
                <th className="py-2.5 px-3.5 font-black tracking-tight text-right">
                  Capacity (PL)
                </th>
                <th className="py-2.5 px-3.5 font-black tracking-tight text-right">
                  Inventory (PL)
                </th>
                <th className="py-2.5 px-3.5 font-black tracking-tight text-right">
                  Inventory (EA)
                </th>
                <th className="py-2.5 px-3.5 font-black tracking-tight text-right">
                  Rate (%)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {currentTableRows.map((row, idx) => {
                const isOver = row.ratePercent > 100;
                return (
                  <tr 
                    key={idx} 
                    onClick={() => {
                      if (onNavigateToZone) onNavigateToZone(row.navigateTarget);
                    }}
                    className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                    title={`คลิกเพื่อเปิดดูผัง ${row.depotArea}`}
                  >
                    {/* Depot Area */}
                    <td className="py-2 px-3.5">
                      <div className="flex items-center space-x-2">
                        <Warehouse className="w-4 h-4 text-blue-400 shrink-0" />
                        <div>
                          <div className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
                            <span>{row.depotArea}</span>
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 bg-blue-950 text-blue-300 rounded border border-blue-800/60">
                              {row.badge}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">{row.code}</div>
                        </div>
                      </div>
                    </td>

                    {/* Team */}
                    <td className="py-2 px-3.5">
                      <span className="text-[11px] font-semibold text-slate-300 px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                        {row.team}
                      </span>
                    </td>

                    {/* Capacity (PL) */}
                    <td className="py-2 px-3.5 text-right">
                      <span className="text-sm sm:text-base font-bold font-mono text-slate-200">
                        {row.capacityPL.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono ml-1">PL</span>
                    </td>

                    {/* Inventory (PL) */}
                    <td className="py-2 px-3.5 text-right">
                      <span className="text-sm sm:text-base font-bold font-mono text-blue-400">
                        {row.inventoryPL.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-blue-300 font-mono ml-1">PL</span>
                    </td>

                    {/* Inventory (EA) */}
                    <td className="py-2 px-3.5 text-right">
                      <span className="text-sm sm:text-base font-bold font-mono text-emerald-400">
                        {row.inventoryEA.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-emerald-300 font-mono ml-1">EA</span>
                    </td>

                    {/* Rate (%) */}
                    <td className="py-2 px-3.5 text-right">
                      <div className="flex flex-col items-end">
                        <span className={`px-2 py-0.5 rounded text-xs font-black font-mono border ${
                          isOver 
                            ? 'bg-rose-950/80 text-rose-300 border-rose-700 animate-pulse' 
                            : row.ratePercent > 50
                            ? 'bg-amber-950/80 text-amber-300 border-amber-700'
                            : 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                        }`}>
                          {row.ratePercent}%
                        </span>

                        {/* Visual Progress Bar */}
                        <div className="w-20 sm:w-24 h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              isOver 
                                ? 'bg-rose-500' 
                                : row.ratePercent > 50 
                                ? 'bg-amber-500' 
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(row.ratePercent, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* Total Summary Row */}
              <tr className="bg-slate-950 border-t-2 border-slate-700 font-bold">
                <td className="py-2.5 px-3.5">
                  <div className="text-xs sm:text-sm font-black text-white uppercase tracking-wider flex items-center space-x-1.5">
                    <TrendingUp className="w-4 h-4 text-amber-400" />
                    <span>Total / รวมทั้งสิ้น</span>
                  </div>
                  <div className="text-[9.5px] text-slate-400 mt-0.5 font-normal">
                    ทุกคลังสินค้าและเต็นท์ (A2, A4, A5, CY3)
                  </div>
                </td>
                <td className="py-2.5 px-3.5">
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    4 โซนหลัก
                  </span>
                </td>
                <td className="py-2.5 px-3.5 text-right">
                  <span className="text-base sm:text-lg font-black font-mono text-white">
                    {totals.cap.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono ml-1">PL</span>
                </td>
                <td className="py-2.5 px-3.5 text-right">
                  <span className="text-base sm:text-lg font-black font-mono text-blue-400">
                    {totals.pl.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-blue-300 font-mono ml-1">PL</span>
                </td>
                <td className="py-2.5 px-3.5 text-right">
                  <span className="text-base sm:text-lg font-black font-mono text-emerald-400">
                    {totals.ea.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-emerald-300 font-mono ml-1">EA</span>
                </td>
                <td className="py-2.5 px-3.5 text-right">
                  <span className="px-2.5 py-1 rounded text-sm font-black font-mono bg-blue-600 text-white shadow-xs">
                    {totals.rate}%
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer Notes */}
        <div className="px-3.5 py-1.5 bg-slate-950 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-slate-400">
          <div className="flex items-center space-x-1.5">
            <Info className="w-3.5 h-3.5 text-blue-400" />
            <span>* หมายเหตุ: ลานเต็นท์ CY3 มีอัตราจัดเก็บ 168% (เกินพิกัดความจุมาตรฐาน 400 พาเลท) มีการวางซ้อนและเสริมจุดรับเข้าชั่วคราว</span>
          </div>
          <div className="font-mono text-[10.5px] font-bold text-slate-300">
            ระบบตรวจสอบมาตรฐาน LGE Logistics WMS
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ZONE DETAIL POPUP MODAL                                                   */}
      {/* ========================================================================= */}
      {selectedZone && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="px-4 py-3 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-black">
                    {selectedZone.building}
                  </span>
                  <span className="px-2 py-0.5 bg-slate-800 text-blue-300 rounded text-[10px] font-mono font-bold">
                    {selectedZone.code}
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white mt-1">
                  {selectedZone.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedZone(null)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-base font-bold transition-all"
              >
                &times;
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3.5 overflow-y-auto">
              <p className="text-xs text-slate-300 leading-relaxed">
                {selectedZone.description}
              </p>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400">ความจุทั้งหมด</div>
                  <div className="text-sm font-mono font-black text-white mt-0.5">
                    {selectedZone.capacity} PL
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-blue-950/60 border border-blue-800/60 text-center">
                  <div className="text-[10px] text-blue-300">จัดเก็บอยู่จริง</div>
                  <div className="text-sm font-mono font-black text-blue-300 mt-0.5">
                    {selectedZone.occupied} PL
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-center">
                  <div className="text-[10px] text-emerald-300">อัตราการใช้งาน</div>
                  <div className="text-sm font-mono font-black text-emerald-300 mt-0.5">
                    {Math.round((selectedZone.occupied / (selectedZone.capacity || 1)) * 100)}%
                  </div>
                </div>
              </div>

              {/* Items in this zone */}
              {selectedZone.itemsList && selectedZone.itemsList.length > 0 ? (
                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-slate-200">
                    รายการสินค้าตัวอย่างที่จัดเก็บ ({selectedZone.itemsList.length} รายการ):
                  </div>
                  <div className="border border-slate-800 rounded-lg overflow-hidden max-h-44 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950 text-slate-300 font-bold border-b border-slate-800">
                        <tr>
                          <th className="p-2">Model HE</th>
                          <th className="p-2">พิกัด</th>
                          <th className="p-2 text-right">จำนวน</th>
                          <th className="p-2 text-center">Aging</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {selectedZone.itemsList.slice(0, 8).map(it => (
                          <tr key={it.id} className="hover:bg-slate-800/50">
                            <td className="p-2 font-bold text-white">{it.modelHE}</td>
                            <td className="p-2 text-blue-400">{it.locatorCode}</td>
                            <td className="p-2 text-right font-bold text-emerald-400">{it.quantity}</td>
                            <td className="p-2 text-center text-[11px]">{it.agingDays} วัน</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-950 rounded-lg text-center text-xs text-slate-400 border border-slate-800">
                  ไม่มีสินค้าค้างในโซนนี้ หรือเป็นพื้นที่พร้อมรับเข้าสินค้าใหม่
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={() => setSelectedZone(null)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-all"
              >
                ปิดหน้าต่าง
              </button>

              {selectedZone.navigateTarget && onNavigateToZone && (
                <button
                  onClick={() => {
                    const target = selectedZone.navigateTarget!;
                    const tNum = selectedZone.tentNum;
                    setSelectedZone(null);
                    onNavigateToZone(target, tNum);
                  }}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-md transition-all active:scale-95"
                >
                  <span>เปิดโซนนี้แบบเต็มจอ (Deep Dive)</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
