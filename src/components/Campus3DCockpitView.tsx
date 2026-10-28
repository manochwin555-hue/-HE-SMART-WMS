import React, { useState } from 'react';
import { 
  InventoryItem, 
  StorageZone, 
  ShelfLevel, 
  MovementType, 
  WarehouseFacility, 
  MovementLog, 
  WmsStats, 
  AgingThresholdConfig 
} from '../types';
import { ZoneKpiFormalDashboard } from './ZoneKpiFormalDashboard';
import { CampusMasterOverview } from './CampusMasterOverview';
import { FlowRailFloorMap } from './FlowRailFloorMap';
import { DA4D1FloorStagingMap } from './DA4D1FloorStagingMap';
import { CY3TentRackMap } from './CY3TentRackMap';
import { A5TentFloorStagingMap } from './A5TentFloorStagingMap';
import { 
  Building2, 
  ExternalLink, 
  Grid
} from 'lucide-react';

interface Campus3DCockpitViewProps {
  items: InventoryItem[];
  facilities?: WarehouseFacility[];
  stats?: WmsStats;
  lowStockCount?: number;
  logs?: MovementLog[];
  agingConfig?: AgingThresholdConfig;
  onNavigateToZone: (target: 'A4_FLOOR' | 'A4_RACK' | 'A2_RAIL' | 'A5_TENT' | 'CY3_TENT', tentNum?: number) => void;
  onOpenScanner?: (zone: StorageZone, bay: number, level: ShelfLevel, mode: MovementType) => void;
  onBackToOverview?: () => void;
}

export const Campus3DCockpitView: React.FC<Campus3DCockpitViewProps> = ({
  items = [],
  stats,
  logs = [],
  agingConfig,
  onNavigateToZone,
  onOpenScanner
}) => {
  const [activeTab, setActiveTab] = useState<'ALL_COMPOSITE' | 'A2' | 'A4' | 'CY3' | 'A5'>('ALL_COMPOSITE');

  return (
    <div className="w-full h-full flex flex-col min-h-0 space-y-3 font-sans text-slate-100 animate-fadeIn">
      
      {/* Top Zone Switcher Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-lg shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-white">
              Master Campus 3D Twin &bull; ผังรวมทุกโซนในหน้าเดียว
            </h2>
            <p className="text-[11px] text-slate-400">
              รวม Layout 3D Twin ของอาคาร A2, A4, CY3 และ A5 Tent เข้าด้วยกันแบบ 100% ตามพิมพ์เขียวจริง
            </p>
          </div>
        </div>

        {/* View mode tabs */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
          <button
            onClick={() => setActiveTab('ALL_COMPOSITE')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'ALL_COMPOSITE' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>ผังรวม 4 โซน (Master Composite)</span>
          </button>
          <button
            onClick={() => setActiveTab('A2')}
            className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${activeTab === 'A2' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            อาคาร A2 (Flow Rail)
          </button>
          <button
            onClick={() => setActiveTab('A4')}
            className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${activeTab === 'A4' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            อาคาร A4 (Rack &amp; Floor)
          </button>
          <button
            onClick={() => setActiveTab('CY3')}
            className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${activeTab === 'CY3' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            CY3 Heavy Rack (Canopy)
          </button>
          <button
            onClick={() => setActiveTab('A5')}
            className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${activeTab === 'A5' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            A5 Tents (1-4)
          </button>
        </div>
      </div>

      {/* Main Composite Viewport Area */}
      <div className="flex-1 min-h-[600px] overflow-y-auto space-y-4 pr-1">
        {activeTab === 'ALL_COMPOSITE' && (
          <div className="w-full h-[680px] bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <CampusMasterOverview
              items={items}
              logs={logs}
              stats={stats}
              agingConfig={agingConfig}
              onNavigateToZone={onNavigateToZone as any}
              onOpenScanner={onOpenScanner}
            />
          </div>
        )}

        {activeTab === 'A2' && (
          <div className="h-[650px] bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <FlowRailFloorMap items={items} logs={logs} onOpenScanner={onOpenScanner || (() => {})} onNavigateToCampus={() => onNavigateToZone('A2_RAIL')} />
          </div>
        )}

        {activeTab === 'A4' && (
          <div className="h-[650px] bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <DA4D1FloorStagingMap items={items} logs={logs} onOpenScanner={onOpenScanner || (() => {})} onNavigateToCampus={() => onNavigateToZone('A4_FLOOR')} />
          </div>
        )}

        {activeTab === 'CY3' && (
          <div className="h-[650px] bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <CY3TentRackMap items={items} logs={logs} onOpenScanner={onOpenScanner || (() => {})} onNavigateToCampus={() => onNavigateToZone('CY3_TENT')} />
          </div>
        )}

        {activeTab === 'A5' && (
          <div className="h-[650px] bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <A5TentFloorStagingMap items={items} logs={logs} onOpenScanner={onOpenScanner || (() => {})} onNavigateToCampus={() => onNavigateToZone('A5_TENT')} />
          </div>
        )}
      </div>

      {/* Universal Bottom Footer Bar */}
      <ZoneKpiFormalDashboard zoneKey="ALL" items={items} logs={logs} stats={stats} agingConfig={agingConfig} />

    </div>
  );
};
