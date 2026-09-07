import React, { useMemo } from 'react';
import { InventoryItem, MovementLog, WmsStats, AgingThresholdConfig } from '../types';
import { 
  Package, 
  ShieldAlert, 
  ArrowDownRight, 
  ArrowUpRight, 
  Grid, 
  AlertTriangle,
  MapPin
} from 'lucide-react';
import { 
  ZoneKey, 
  ZoneKpiData, 
  getZoneKeyFromTab, 
  calculateZoneKpis,
  ZONE_SPECS
} from '../utils/zoneKpiHelper';

export interface TopKpiSummaryBarProps {
  items: InventoryItem[];
  logs?: MovementLog[];
  stats?: WmsStats;
  activeTab: string;
  activeFacilityId?: string;
  selectedZone?: ZoneKey; // Optional explicit zone override
  agingConfig?: AgingThresholdConfig;
  onSelectFilter?: (filterTab: string) => void;
  onNavigateToLayout?: (target: string) => void;
  onZoneChange?: (zone: ZoneKey) => void;
}

export const TopKpiSummaryBar: React.FC<TopKpiSummaryBarProps> = ({
  items = [],
  logs = [],
  stats,
  activeTab,
  activeFacilityId = 'ALL',
  selectedZone,
  agingConfig = {
    safeDaysMax: 14,
    warningDaysMax: 30,
    criticalDays: 30,
    autoAlertEnabled: true,
    notifyOnFifoViolation: true,
    customRuleName: 'มาตรฐาน LGE (14/30 วัน)'
  },
  onSelectFilter,
  onNavigateToLayout,
  onZoneChange
}) => {
  // Resolve effective ZoneKey
  const currentZoneKey = useMemo<ZoneKey>(() => {
    if (selectedZone) return selectedZone;
    return getZoneKeyFromTab(activeTab, activeFacilityId);
  }, [selectedZone, activeTab, activeFacilityId]);

  // Compute live KPI data specific to this zone
  const kpiData: ZoneKpiData = useMemo(() => {
    return calculateZoneKpis(items, logs, currentZoneKey, agingConfig, stats);
  }, [items, logs, currentZoneKey, agingConfig, stats]);

  const handleCardClick = (actionType: 'inventory' | 'safety' | 'in_logs' | 'out_logs' | 'layout' | 'aging') => {
    if (!onSelectFilter) return;
    switch (actionType) {
      case 'inventory':
      case 'safety':
        onSelectFilter('inventory');
        break;
      case 'in_logs':
      case 'out_logs':
        onSelectFilter('logs');
        break;
      case 'layout':
        if (onNavigateToLayout) {
          if (currentZoneKey === 'A2') onNavigateToLayout('A2_RAIL');
          else if (currentZoneKey === 'A4_FLOOR') onNavigateToLayout('A4_FLOOR');
          else if (currentZoneKey === 'A4_RACK' || currentZoneKey === 'A4') onNavigateToLayout('A4_RACK');
          else if (currentZoneKey === 'A5') onNavigateToLayout('A5_TENT');
          else if (currentZoneKey === 'CY3') onNavigateToLayout('CY3_TENT');
          else onNavigateToLayout('A4_RACK');
        } else {
          onSelectFilter('layout');
        }
        break;
      case 'aging':
        onSelectFilter('inventory');
        break;
    }
  };

  return (
    <div className="w-full shrink-0 animate-fadeIn space-y-1.5">
      {/* 6 Unified Dynamic KPI Summary Cards - Reacts instantly to Selected Zone */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 lg:gap-3.5">
        
        {/* Card 1: ยอดคงเหลือ (ตามโซนที่เลือก) */}
        <div 
          onClick={() => handleCardClick('inventory')}
          className="bg-slate-900/95 border border-slate-800 hover:border-blue-500/80 rounded-xl p-3 sm:p-3.5 text-white flex flex-col justify-between shadow-md relative overflow-hidden cursor-pointer transition-all group hover:bg-slate-850 active:scale-[0.99] min-h-[76px] sm:min-h-[82px]"
          title={`ดูรายการสต็อกของ ${kpiData.zoneName}`}
        >
          <div className="flex items-center justify-between leading-none">
            <div className="flex items-center space-x-1.5 min-w-0">
              <span className="text-xs sm:text-[13px] font-black text-slate-100 tracking-tight truncate">
                {currentZoneKey === 'ALL' ? 'ยอดคงเหลือรวม' : `ยอดคงเหลือ ${kpiData.zoneShortName}`}
              </span>
            </div>
            <div className="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-md bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/40 shrink-0">
              <Package className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline my-0.5 leading-none">
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
              {kpiData.totalUnits.toLocaleString()}
            </span>
            <span className="ml-1.5 text-xs text-slate-300 font-extrabold shrink-0">Units</span>
          </div>
          <div className="flex items-center justify-between text-[10.5px] font-black leading-tight">
            <div className="flex items-center space-x-1 text-emerald-400 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0 shadow-xs shadow-emerald-400/50"></span>
              <span className="truncate">{currentZoneKey === 'ALL' ? 'Real-Time Sync' : `โซน ${kpiData.badgeLabel}`}</span>
            </div>
            {currentZoneKey !== 'ALL' && (
              <span className="text-[10px] text-blue-400 font-bold bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-800/60">
                {kpiData.occupiedPallets} พาเลท
              </span>
            )}
          </div>
        </div>

        {/* Card 2: เตือน SAFETY STOCK */}
        <div 
          onClick={() => handleCardClick('safety')}
          className="bg-slate-900/95 border border-slate-800 hover:border-rose-500/80 rounded-xl p-3 sm:p-3.5 text-white flex flex-col justify-between shadow-md relative overflow-hidden cursor-pointer transition-all group hover:bg-slate-850 active:scale-[0.99] min-h-[76px] sm:min-h-[82px]"
          title={`ดูรายการที่ต่ำกว่า Safety Stock ใน ${kpiData.zoneName}`}
        >
          <div className="flex items-center justify-between leading-none">
            <span className="text-xs sm:text-[13px] font-black text-slate-100 tracking-tight truncate">
              เตือน SAFETY STOCK
            </span>
            <div className="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-md bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/40 shrink-0">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline my-0.5 leading-none">
            <span className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${kpiData.safetyStockAlertCount > 0 ? 'text-rose-500' : 'text-slate-300'}`}>
              {kpiData.safetyStockAlertCount}
            </span>
            <span className="ml-1.5 text-xs text-slate-300 font-extrabold shrink-0">รายการ</span>
          </div>
          <div className="text-[10.5px] font-black text-rose-400 truncate leading-tight">
            ต่ำกว่าเกณฑ์ {currentZoneKey !== 'ALL' ? `(${kpiData.zoneShortName})` : 'ความปลอดภัย'}
          </div>
        </div>

        {/* Card 3: สแกนรับเข้าวันนี้ */}
        <div 
          onClick={() => handleCardClick('in_logs')}
          className="bg-slate-900/95 border border-slate-800 hover:border-emerald-500/80 rounded-xl p-3 sm:p-3.5 text-white flex flex-col justify-between shadow-md relative overflow-hidden cursor-pointer transition-all group hover:bg-slate-855 active:scale-[0.99] min-h-[76px] sm:min-h-[82px]"
          title={`ประวัติการสแกนรับเข้า (${kpiData.zoneName})`}
        >
          <div className="flex items-center justify-between leading-none">
            <span className="text-xs sm:text-[13px] font-black text-slate-100 tracking-tight truncate">
              สแกนรับเข้าวันนี้
            </span>
            <div className="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40 shrink-0">
              <ArrowDownRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline my-0.5 leading-none">
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-emerald-400">
              +{kpiData.todayInScans}
            </span>
            <span className="ml-1.5 text-xs text-slate-300 font-extrabold shrink-0">Scan</span>
          </div>
          <div className="text-[10.5px] font-bold text-emerald-300 truncate leading-tight">
            {kpiData.inSubtitle}
          </div>
        </div>

        {/* Card 4: สแกนเบิกออกวันนี้ */}
        <div 
          onClick={() => handleCardClick('out_logs')}
          className="bg-slate-900/95 border border-slate-800 hover:border-sky-500/80 rounded-xl p-3 sm:p-3.5 text-white flex flex-col justify-between shadow-md relative overflow-hidden cursor-pointer transition-all group hover:bg-slate-855 active:scale-[0.99] min-h-[76px] sm:min-h-[82px]"
          title={`ประวัติการสแกนเบิกออก (${kpiData.zoneName})`}
        >
          <div className="flex items-center justify-between leading-none">
            <span className="text-xs sm:text-[13px] font-black text-slate-100 tracking-tight truncate">
              สแกนเบิกออกวันนี้
            </span>
            <div className="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-md bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/40 shrink-0">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline my-0.5 leading-none">
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-sky-400">
              -{kpiData.todayOutScans}
            </span>
            <span className="ml-1.5 text-xs text-slate-300 font-extrabold shrink-0">Scan</span>
          </div>
          <div className="text-[10.5px] font-bold text-sky-300 truncate leading-tight">
            {kpiData.outSubtitle}
          </div>
        </div>

        {/* Card 5: อัตราจัดเก็บ (Occupancy) */}
        <div 
          onClick={() => handleCardClick('layout')}
          className="bg-slate-900/95 border border-slate-800 hover:border-purple-500/80 rounded-xl p-3 sm:p-3.5 text-white flex flex-col justify-between shadow-md relative overflow-hidden cursor-pointer transition-all group hover:bg-slate-855 active:scale-[0.99] min-h-[76px] sm:min-h-[82px]"
          title={`ดูผังแปลนและการใช้พื้นที่ ${kpiData.zoneName}`}
        >
          <div className="flex items-center justify-between leading-none">
            <span className="text-xs sm:text-[13px] font-black text-slate-100 tracking-tight truncate">
              {kpiData.capacityTitle}
            </span>
            <div className="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-md bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/40 shrink-0">
              <Grid className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline my-0.5 leading-none">
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
              {kpiData.occupiedPallets}
            </span>
            <span className="ml-1.5 text-xs text-slate-300 font-extrabold shrink-0">
              / {kpiData.totalCapacityPallets.toLocaleString()} P
            </span>
          </div>
          <div className="flex items-center justify-between text-[10.5px] font-bold leading-tight truncate">
            <span className="text-slate-300 truncate">{kpiData.capacitySubtitle}:</span>
            <span className={`font-mono font-black ml-1 ${
              kpiData.occupancyRatePercent >= 90 
                ? 'text-rose-400' 
                : kpiData.occupancyRatePercent >= 75 
                ? 'text-amber-400' 
                : 'text-purple-400'
            }`}>
              {kpiData.occupancyRatePercent}%
            </span>
          </div>
        </div>

        {/* Card 6: เตือน AGING FIFO */}
        <div 
          onClick={() => handleCardClick('aging')}
          className="bg-slate-900/95 border border-slate-800 hover:border-amber-500/80 rounded-xl p-3 sm:p-3.5 text-white flex flex-col justify-between shadow-md relative overflow-hidden cursor-pointer transition-all group hover:bg-slate-855 active:scale-[0.99] min-h-[76px] sm:min-h-[82px]"
          title={`ดูรายการที่เกินเกณฑ์ Aging ใน ${kpiData.zoneName}`}
        >
          <div className="flex items-center justify-between leading-none">
            <span className="text-xs sm:text-[13px] font-black text-slate-100 tracking-tight truncate">
              เตือน AGING FIFO
            </span>
            <div className="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40 shrink-0">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline my-0.5 leading-none">
            <span className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${kpiData.agingAlertCount > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
              {kpiData.agingAlertCount}
            </span>
            <span className="ml-1.5 text-xs text-slate-300 font-extrabold shrink-0">Overdue</span>
          </div>
          <div className="text-[10.5px] font-bold text-amber-400 truncate leading-tight">
            เกิน {agingConfig?.criticalDays || 28} วัน ({agingConfig?.customRuleName || '14/30 วัน'})
          </div>
        </div>

      </div>
    </div>
  );
};
