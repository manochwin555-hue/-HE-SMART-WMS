import React, { useState } from 'react';
import { InventoryItem, MovementType, ShelfLevel, StorageZone, WarehouseFacility, MovementLog, WmsStats, AgingThresholdConfig, CustomRackSlot } from '../types';
import { MasterBlueprintLayout } from './MasterBlueprintLayout';
import { Campus3DCockpitView } from './Campus3DCockpitView';
import { 
  Building2, 
  Box, 
  Layers, 
  Maximize2, 
  Minimize2, 
  ChevronDown, 
  ChevronUp, 
  Eye, 
  Sparkles,
  Info,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

interface CampusMasterOverviewProps {
  items: InventoryItem[];
  facilities?: WarehouseFacility[];
  stats?: WmsStats;
  lowStockCount?: number;
  logs?: MovementLog[];
  agingConfig?: AgingThresholdConfig;
  customSlots?: CustomRackSlot[];
  initialMode?: 'UNIFIED_DUAL' | '2D_BLUEPRINT' | '3D_COCKPIT';
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
  initialMode = 'UNIFIED_DUAL',
  onNavigateToZone,
  onOpenScanner,
  onOpen3D,
}) => {
  const [overviewMode, setOverviewMode] = useState<'UNIFIED_DUAL' | '2D_BLUEPRINT' | '3D_COCKPIT'>(initialMode);
  const [is3DExpanded, setIs3DExpanded] = useState<boolean>(true);

  // Quick stats across the 4 physical zones (matching physical reality & Image 3)
  const zoneBreakdown = [
    { id: 'A2', name: 'A2 Building', code: 'DA2D-1 (Flow Rail)', cap: 112, pl: 94, ea: 9309, pct: 84, color: 'blue' },
    { id: 'A4', name: 'A4 Building', code: 'DA4D-1/2/3 (Rack + Floor)', cap: 1112, pl: 70, ea: 7370, pct: 6, color: 'amber' },
    { id: 'A5', name: 'A5 Tent Yard', code: 'DAST 1-4 (4 Canopy Tents)', cap: 784, pl: 121, ea: 15427, pct: 15, color: 'emerald' },
    { id: 'CY3', name: 'CY3 Tent Yard', code: 'DY3T 1.01-1.04 (4 Outdoor Racks)', cap: 400, pl: 671, ea: 33767, pct: 168, color: 'orange' },
  ];

  const totalCap = 2408;
  const totalPL = 956;
  const totalEA = 65873;
  const totalOccupancy = Math.round((totalPL / totalCap) * 100);

  return (
    <div className="w-full min-w-0 max-w-full space-y-4 animate-fadeIn">
      {/* ========================================================================= */}
      {/* UNIFIED COCKPIT MASTER CONTROLLER BAR                                     */}
      {/* ========================================================================= */}
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
        {/* Left branding */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center border border-blue-400/40 shadow-lg shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                3D Campus Digital Twin &bull; ผังรวมแม่บท
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-700/80 text-[10px] font-mono font-bold">
                DUAL-ENGINE COCKPIT
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              ผสาน 3D Campus WebGL กับแปลน 2D CAD แม่บท เชื่อมโยงข้อมูล 1:1 ครบทั้ง 4 โซน (รวม 2,408 ช่องจัดเก็บ)
            </p>
          </div>
        </div>

        {/* Mode Switcher Buttons */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-950 border border-slate-800 p-1 rounded-xl flex items-center gap-1 text-xs font-bold shadow-inner">
            <button
              onClick={() => setOverviewMode('UNIFIED_DUAL')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                overviewMode === 'UNIFIED_DUAL'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-300" />
              <span>ผังรวมคู่ 3D + 2D</span>
            </button>

            <button
              onClick={() => setOverviewMode('3D_COCKPIT')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                overviewMode === '3D_COCKPIT'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Box className="w-3.5 h-3.5 text-indigo-300" />
              <span>3D Digital Twin เต็มจอ</span>
            </button>

            <button
              onClick={() => setOverviewMode('2D_BLUEPRINT')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                overviewMode === '2D_BLUEPRINT'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-emerald-300" />
              <span>2D CAD Blueprint เฉพาะ 2D</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. 3D DIGITAL TWIN COCKPIT SECTION (Integrated or Full)                   */}
      {/* ========================================================================= */}
      {(overviewMode === 'UNIFIED_DUAL' || overviewMode === '3D_COCKPIT') && (
        <div className="relative rounded-2xl overflow-hidden border border-slate-800/90 shadow-2xl bg-[#070B12] transition-all">
          {/* Section Header for UNIFIED_DUAL */}
          {overviewMode === 'UNIFIED_DUAL' && (
            <div className="bg-slate-900/90 border-b border-slate-800/80 px-4 py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-white font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>3D Campus Digital Twin Cockpit View (โมเดล 3D จำลองกายภาพ 4 โซน)</span>
                </div>
                <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-400 border-l border-slate-700 pl-3">
                  <span>A2: 14 ราง</span> &bull; 
                  <span>A4: 10 แถวแร็ค + ลาน X1-X8</span> &bull; 
                  <span>A5: 4 เต็นท์</span> &bull; 
                  <span>CY3: 4 แถวกลางแจ้ง</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIs3DExpanded(!is3DExpanded)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 flex items-center gap-1 font-bold text-[11px] transition-all"
                >
                  {is3DExpanded ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>ย่อขนาด 3D</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span>ขยายขนาด 3D</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setOverviewMode('3D_COCKPIT')}
                  className="px-2.5 py-1 rounded-lg bg-blue-600/30 text-blue-300 hover:bg-blue-600/50 border border-blue-500/30 flex items-center gap-1 font-bold text-[11px] transition-all"
                  title="เปิดโหมด 3D เต็มจอ"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>เต็มจอ</span>
                </button>
              </div>
            </div>
          )}

          {/* 3D Canvas Body */}
          {(overviewMode === '3D_COCKPIT' || is3DExpanded) && (
            <div className={overviewMode === 'UNIFIED_DUAL' ? 'h-[440px] sm:h-[480px] w-full overflow-hidden' : 'w-full'}>
              <Campus3DCockpitView
                items={items}
                facilities={facilities}
                stats={stats}
                lowStockCount={lowStockCount}
                logs={logs}
                agingConfig={agingConfig}
                onNavigateToZone={(target, tentNum) => {
                  if (onNavigateToZone) {
                    onNavigateToZone(target as any, tentNum);
                  }
                }}
                onOpenScanner={(zone, bay, level, mode) => {
                  if (onOpenScanner) {
                    onOpenScanner(zone, bay, level, mode);
                  }
                }}
                onBackToOverview={() => setOverviewMode('UNIFIED_DUAL')}
              />
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. 2D MASTER BLUEPRINT CAD SECTION                                        */}
      {/* ========================================================================= */}
      {(overviewMode === 'UNIFIED_DUAL' || overviewMode === '2D_BLUEPRINT') && (
        <div className="space-y-4">
          <MasterBlueprintLayout
            items={items}
            agingConfig={agingConfig}
            onNavigateToZone={(target, tentNum) => {
              if (onNavigateToZone) {
                onNavigateToZone(target as any, tentNum);
              }
            }}
            onOpenScanner={(zone, bay, level, model) => {
              if (onOpenScanner) {
                onOpenScanner(zone as StorageZone, bay || 1, (level || 1) as ShelfLevel, 'IN');
              }
            }}
            onOpen3D={(zone, bay) => {
              if (onOpen3D) {
                onOpen3D(zone as StorageZone, bay || 1);
              }
            }}
            onOpen3DView={() => setOverviewMode('3D_COCKPIT')}
          />
        </div>
      )}
    </div>
  );
};
