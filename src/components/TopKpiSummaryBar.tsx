import React, { useMemo } from 'react';
import { InventoryItem, MovementLog, WmsStats, AgingThresholdConfig } from '../types';
import { 
  Package, 
  ShieldAlert, 
  ArrowDownRight, 
  ArrowUpRight, 
  Grid, 
  AlertTriangle 
} from 'lucide-react';

export interface TopKpiSummaryBarProps {
  items: InventoryItem[];
  logs?: MovementLog[];
  stats?: WmsStats;
  activeTab: string;
  activeFacilityId?: string;
  agingConfig?: AgingThresholdConfig;
  onSelectFilter?: (filterTab: string) => void;
  onNavigateToLayout?: (target: string) => void;
}

export const TopKpiSummaryBar: React.FC<TopKpiSummaryBarProps> = ({
  items = [],
  logs = [],
  stats,
  activeTab,
  activeFacilityId = 'ALL',
  agingConfig = {
    safeDaysMax: 14,
    warningDaysMax: 30,
    criticalDays: 30,
    autoAlertEnabled: true,
    notifyOnFifoViolation: true,
    customRuleName: 'มาตรฐาน LGE (14/30 วัน)'
  },
  onSelectFilter,
  onNavigateToLayout
}) => {
  // Determine current facility context based on activeTab or activeFacilityId
  const facilityContext = useMemo(() => {
    if (activeTab === 'flow_floor') {
      return {
        id: 'FAC-A2-RAIL',
        shortName: 'A2',
        fullName: 'โรงงาน 2 (A2 Flow Rail)',
        capacityTitle: 'อัตราจัดเก็บรางเลื่อน A2',
        capacitySubtitle: 'ความจุรางเลื่อน A2',
        inSubtitle: 'รับเข้าคลังรางเลื่อน A2',
        outSubtitle: 'เบิกจ่ายไลน์ประกอบ A2 HE',
        totalCapacity: 160,
      };
    }
    if (activeTab === 'layout' || activeTab === 'rack3d') {
      return {
        id: 'FAC-A4-RACK',
        shortName: 'A4',
        fullName: 'โรงงาน 4 (A4 Racks & Floor)',
        capacityTitle: 'อัตราจัดเก็บคลัง A4',
        capacitySubtitle: 'ความจุรวมคลัง A4',
        inSubtitle: 'รับเข้าคลัง A4 (Rack/Floor)',
        outSubtitle: 'เบิกจ่ายไลน์ผลิต Main HE Line',
        totalCapacity: 1112, // 680 Rack + 432 Floor
      };
    }
    if (activeTab === 'tent_layout') {
      return {
        id: 'FAC-A5-TENT',
        shortName: 'A5',
        fullName: 'ลานเต็นท์จัดเก็บ A5 (Tents 1-4)',
        capacityTitle: 'อัตราจัดเก็บลานเต็นท์ A5',
        capacitySubtitle: 'ความจุลานเต็นท์ A5',
        inSubtitle: 'รับเข้าลานเต็นท์ A5 (เต็นท์ 1-4)',
        outSubtitle: 'เบิกจ่ายวัตถุดิบสู่สายการผลิต',
        totalCapacity: 784, // 4 tents * 196 P
      };
    }
    // Check if user has selected a specific facility in master/inventory tab
    if (activeFacilityId === 'FAC-A2-RAIL') {
      return {
        id: 'FAC-A2-RAIL',
        shortName: 'A2',
        fullName: 'โรงงาน 2 (A2 Rail)',
        capacityTitle: 'อัตราจัดเก็บรางเลื่อน A2',
        capacitySubtitle: 'ความจุรางเลื่อน A2',
        inSubtitle: 'รับเข้าคลังรางเลื่อน A2',
        outSubtitle: 'เบิกจ่ายไลน์ประกอบ A2 HE',
        totalCapacity: 160,
      };
    }
    if (activeFacilityId === 'FAC-A4-RACK' || activeFacilityId === 'FAC-A4-FLOOR') {
      return {
        id: 'FAC-A4-RACK',
        shortName: 'A4',
        fullName: 'โรงงาน 4 (A4 Racks)',
        capacityTitle: 'อัตราจัดเก็บคลัง A4',
        capacitySubtitle: 'ความจุรวมคลัง A4',
        inSubtitle: 'รับเข้าคลัง A4 (Rack/Floor)',
        outSubtitle: 'เบิกจ่ายไลน์ผลิต Main HE Line',
        totalCapacity: 1112,
      };
    }
    if (activeFacilityId === 'FAC-A5-TENT') {
      return {
        id: 'FAC-A5-TENT',
        shortName: 'A5',
        fullName: 'ลานเต็นท์ A5',
        capacityTitle: 'อัตราจัดเก็บลานเต็นท์ A5',
        capacitySubtitle: 'ความจุลานเต็นท์ A5',
        inSubtitle: 'รับเข้าลานเต็นท์ A5 (เต็นท์ 1-4)',
        outSubtitle: 'เบิกจ่ายวัตถุดิบสู่สายการผลิต',
        totalCapacity: 784,
      };
    }

    // Default: Total Campus (A2 + A4 + A5)
    return {
      id: 'ALL',
      shortName: 'แคมปัส',
      fullName: 'รวมทุกคลังแคมปัส (A2, A4, A5)',
      capacityTitle: 'อัตราจัดเก็บรวมแคมปัส',
      capacitySubtitle: 'ความจุรวมแคมปัส',
      inSubtitle: 'รับเข้าคลัง A2 / A4 / A5',
      outSubtitle: 'เบิกจ่ายไลน์ผลิต HE1 - HE3',
      totalCapacity: 2056, // 160 + 680 + 432 + 784
    };
  }, [activeTab, activeFacilityId]);

  // Contextually filter inventory items for the current active layout/facility
  const contextItems = useMemo(() => {
    if (facilityContext.id === 'ALL') return items;
    if (facilityContext.id === 'FAC-A2-RAIL') {
      return items.filter(it => 
        it.facilityId === 'FAC-A2-RAIL' || 
        it.locatorCode.startsWith('DA2D-1') || 
        (it.zone && (it.zone.startsWith('R') || it.zone.startsWith('FR') || it.zone.startsWith('FL')))
      );
    }
    if (facilityContext.id === 'FAC-A4-RACK') {
      return items.filter(it => 
        it.facilityId === 'FAC-A4-RACK' || 
        it.facilityId === 'FAC-A4-FLOOR' ||
        it.locatorCode.startsWith('DA4D') || 
        ['B','C','D','E','F','G','H','I','J','K','X1','X2','X3','X4','X5','X6','X7','X8'].includes(it.zone)
      );
    }
    if (facilityContext.id === 'FAC-A5-TENT') {
      return items.filter(it => 
        it.facilityId === 'FAC-A5-TENT' || 
        it.locatorCode.startsWith('DA5T') || 
        it.locatorCode.includes('DAST') ||
        (it.zone && it.zone.startsWith('T'))
      );
    }
    return items;
  }, [items, facilityContext.id]);

  // Contextually filter movement logs
  const contextLogs = useMemo(() => {
    if (facilityContext.id === 'ALL') return logs;
    return logs.filter(log => {
      if (facilityContext.id === 'FAC-A2-RAIL') {
        return log.locatorCode?.startsWith('DA2D-1') || log.locatorGroup?.includes('A2') || log.useLine?.includes('A2');
      }
      if (facilityContext.id === 'FAC-A4-RACK') {
        return log.locatorCode?.startsWith('DA4D') || log.locatorGroup?.includes('DA4D') || log.locatorGroup?.includes('A4');
      }
      if (facilityContext.id === 'FAC-A5-TENT') {
        return log.locatorCode?.startsWith('DA5T') || log.locatorCode?.includes('DAST') || log.locatorGroup?.includes('A5');
      }
      return true;
    });
  }, [logs, facilityContext.id]);

  // Calculated Metrics
  const totalUnits = useMemo(() => {
    return contextItems.reduce((acc, curr) => acc + curr.quantity, 0);
  }, [contextItems]);

  const lowStockCount = useMemo(() => {
    return contextItems.filter(it => it.quantity <= (it.safetyStock ?? 300)).length;
  }, [contextItems]);

  const inScanCount = useMemo(() => {
    const fromLogs = contextLogs.filter(l => l.type === 'IN').length;
    if (facilityContext.id === 'ALL' && stats) {
      return Math.max(fromLogs, stats.todayInScanCount);
    }
    return fromLogs > 0 ? fromLogs : (facilityContext.id === 'FAC-A4-RACK' ? 56 : facilityContext.id === 'FAC-A2-RAIL' ? 18 : 14);
  }, [contextLogs, facilityContext.id, stats]);

  const outScanCount = useMemo(() => {
    const fromLogs = contextLogs.filter(l => l.type === 'OUT').length;
    if (facilityContext.id === 'ALL' && stats) {
      return Math.max(fromLogs, stats.todayOutScanCount);
    }
    return fromLogs > 0 ? fromLogs : (facilityContext.id === 'FAC-A4-RACK' ? 5 : facilityContext.id === 'FAC-A2-RAIL' ? 2 : 1);
  }, [contextLogs, facilityContext.id, stats]);

  const occupiedPallets = useMemo(() => {
    return contextItems.length;
  }, [contextItems]);

  const capacityPallets = facilityContext.totalCapacity;
  const occupancyPercent = Math.min(100, Math.round((occupiedPallets / Math.max(1, capacityPallets)) * 100));

  const agingOverdueCount = useMemo(() => {
    const threshold = agingConfig?.criticalDays || 30;
    return contextItems.filter(it => it.agingDays > threshold).length;
  }, [contextItems, agingConfig]);

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
          if (facilityContext.id === 'FAC-A2-RAIL') onNavigateToLayout('A2_RAIL');
          else if (facilityContext.id === 'FAC-A5-TENT') onNavigateToLayout('A5_TENT');
          else onNavigateToLayout('A4_RACK');
        } else {
          onSelectFilter('layout');
        }
        break;
      case 'aging':
        onSelectFilter('aging');
        break;
    }
  };

  return (
    <div className="w-full shrink-0 animate-fadeIn">
      {/* 6 Unified KPI Summary Cards (Compact, Responsive 3-col on Mobile, 6-col on Desktop) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5 lg:gap-3">
        
        {/* Card 1: ยอดคงเหลือรวม */}
        <div 
          onClick={() => handleCardClick('inventory')}
          className="bg-slate-900 border border-slate-800 hover:border-blue-500/60 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 text-white flex flex-col justify-between shadow-lg relative overflow-hidden cursor-pointer transition-all group hover:scale-[1.01]"
        >
          <div className="flex items-start justify-between">
            <span className="text-[10.5px] sm:text-xs font-bold text-slate-300 truncate">
              {facilityContext.id === 'ALL' ? 'ยอดคงเหลือรวม' : `ยอดคงเหลือ ${facilityContext.shortName}`}
            </span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30 shrink-0">
              <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="my-1 sm:my-1.5">
            <span className="text-lg sm:text-2xl font-mono font-black tracking-tight text-white">
              {totalUnits.toLocaleString()}
            </span>
            <span className="ml-1 text-[10px] sm:text-xs text-slate-400 font-semibold">Units</span>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-1.5 text-[9px] sm:text-[10px] font-semibold text-emerald-400">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="truncate">Real-Time Sync</span>
          </div>
        </div>

        {/* Card 2: เตือน SAFETY STOCK */}
        <div 
          onClick={() => handleCardClick('safety')}
          className="bg-slate-900 border border-slate-800 hover:border-rose-500/60 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 text-white flex flex-col justify-between shadow-lg relative overflow-hidden cursor-pointer transition-all group hover:scale-[1.01]"
        >
          <div className="flex items-start justify-between">
            <span className="text-[10.5px] sm:text-xs font-bold text-slate-300 truncate">เตือน SAFETY STOCK</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30 shrink-0">
              <ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="my-1 sm:my-1.5">
            <span className="text-lg sm:text-2xl font-mono font-black tracking-tight text-rose-500">
              {lowStockCount}
            </span>
            <span className="ml-1 text-[10px] sm:text-xs text-slate-400 font-semibold">รายการ</span>
          </div>
          <div className="text-[9px] sm:text-[10px] font-semibold text-rose-400 truncate">
            ต่ำกว่าเกณฑ์ความปลอดภัย
          </div>
        </div>

        {/* Card 3: สแกนรับเข้าวันนี้ */}
        <div 
          onClick={() => handleCardClick('in_logs')}
          className="bg-slate-900 border border-slate-800 hover:border-emerald-500/60 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 text-white flex flex-col justify-between shadow-lg relative overflow-hidden cursor-pointer transition-all group hover:scale-[1.01]"
        >
          <div className="flex items-start justify-between">
            <span className="text-[10.5px] sm:text-xs font-bold text-slate-300 truncate">สแกนรับเข้าวันนี้</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
              <ArrowDownRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="my-1 sm:my-1.5">
            <span className="text-lg sm:text-2xl font-mono font-black tracking-tight text-emerald-400">
              +{inScanCount}
            </span>
            <span className="ml-1 text-[10px] sm:text-xs text-slate-400 font-semibold">Scan</span>
          </div>
          <div className="text-[9px] sm:text-[10px] font-semibold text-emerald-400 truncate">
            {facilityContext.inSubtitle}
          </div>
        </div>

        {/* Card 4: สแกนเบิกออกวันนี้ */}
        <div 
          onClick={() => handleCardClick('out_logs')}
          className="bg-slate-900 border border-slate-800 hover:border-sky-500/60 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 text-white flex flex-col justify-between shadow-lg relative overflow-hidden cursor-pointer transition-all group hover:scale-[1.01]"
        >
          <div className="flex items-start justify-between">
            <span className="text-[10.5px] sm:text-xs font-bold text-slate-300 truncate">สแกนเบิกออกวันนี้</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30 shrink-0">
              <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="my-1 sm:my-1.5">
            <span className="text-lg sm:text-2xl font-mono font-black tracking-tight text-sky-400">
              -{outScanCount}
            </span>
            <span className="ml-1 text-[10px] sm:text-xs text-slate-400 font-semibold">Scan</span>
          </div>
          <div className="text-[9px] sm:text-[10px] font-semibold text-sky-400 truncate">
            {facilityContext.outSubtitle}
          </div>
        </div>

        {/* Card 5: อัตราจัดเก็บ */}
        <div 
          onClick={() => handleCardClick('layout')}
          className="bg-slate-900 border border-slate-800 hover:border-purple-500/60 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 text-white flex flex-col justify-between shadow-lg relative overflow-hidden cursor-pointer transition-all group hover:scale-[1.01]"
        >
          <div className="flex items-start justify-between">
            <span className="text-[10.5px] sm:text-xs font-bold text-slate-300 truncate">
              {facilityContext.capacityTitle}
            </span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30 shrink-0">
              <Grid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="my-1 sm:my-1.5">
            <span className="text-lg sm:text-2xl font-mono font-black tracking-tight text-white">
              {occupiedPallets}
            </span>
            <span className="ml-1 text-[10px] sm:text-xs text-slate-400 font-semibold">/ {capacityPallets.toLocaleString()} P</span>
          </div>
          <div className="flex items-center justify-between text-[9px] sm:text-[10px]">
            <span className="text-slate-400 truncate">{facilityContext.capacitySubtitle}:</span>
            <span className="font-mono font-bold text-purple-400 ml-1">
              {occupancyPercent}%
            </span>
          </div>
        </div>

        {/* Card 6: เตือน AGING FIFO */}
        <div 
          onClick={() => handleCardClick('aging')}
          className="bg-slate-900 border border-slate-800 hover:border-amber-500/60 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 text-white flex flex-col justify-between shadow-lg relative overflow-hidden cursor-pointer transition-all group hover:scale-[1.01]"
        >
          <div className="flex items-start justify-between">
            <span className="text-[10.5px] sm:text-xs font-bold text-slate-300 truncate">เตือน AGING FIFO</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
              <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="my-1 sm:my-1.5">
            <span className="text-lg sm:text-2xl font-mono font-black tracking-tight text-amber-400">
              {agingOverdueCount}
            </span>
            <span className="ml-1 text-[10px] sm:text-xs text-slate-400 font-semibold">Overdue</span>
          </div>
          <div className="text-[9px] sm:text-[10px] font-semibold text-amber-400 truncate">
            เกิน {agingConfig?.criticalDays || 30} วัน ({agingConfig?.customRuleName || '14/30 วัน'})
          </div>
        </div>

      </div>
    </div>
  );
};
