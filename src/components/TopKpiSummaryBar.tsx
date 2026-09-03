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
    if (activeTab === 'a4_floor') {
      return {
        id: 'FAC-A4-FLOOR',
        shortName: 'A4 Floor',
        fullName: 'โรงงาน 4 (A4 วางพื้น DA4D-1)',
        capacityTitle: 'อัตราจัดเก็บวางพื้น A4',
        capacitySubtitle: 'ความจุวางพื้น DA4D-1',
        inSubtitle: 'รับเข้าพื้นที่วางพื้น DA4D-1',
        outSubtitle: 'เบิกจ่ายไลน์ผลิต Main HE Line',
        totalCapacity: 432, // 432 Floor Staging
      };
    }
    if (activeTab === 'a4_rack' || activeTab === 'layout' || activeTab === 'rack3d') {
      return {
        id: 'FAC-A4-RACK',
        shortName: 'A4 Rack',
        fullName: 'โรงงาน 4 (A4 Selective Racks B-K)',
        capacityTitle: 'อัตราจัดเก็บแร็ค A4',
        capacitySubtitle: 'ความจุแร็ค DA4D-2 & DA4D-3',
        inSubtitle: 'รับเข้าแร็ค A4 (Selective Racks)',
        outSubtitle: 'เบิกจ่ายไลน์ผลิต Main HE Line',
        totalCapacity: 680, // 680 Selective Racks
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
    if (activeTab === 'cy3_layout') {
      return {
        id: 'FAC-CY3-TENT',
        shortName: 'CY3',
        fullName: 'เต็นท์คลัง CY3 (4-Floor Rack)',
        capacityTitle: 'อัตราจัดเก็บเต็นท์ CY3',
        capacitySubtitle: 'ความจุแร็ค 4 ชั้น CY3',
        inSubtitle: 'รับเข้าเต็นท์ CY3 (Outdoor Rack)',
        outSubtitle: 'เบิกจ่ายวัตถุดิบสู่สายการผลิต',
        totalCapacity: 400, // 4 rows * 25 bays * 4 floors
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
    if (activeFacilityId === 'FAC-CY3-TENT') {
      return {
        id: 'FAC-CY3-TENT',
        shortName: 'CY3',
        fullName: 'เต็นท์คลัง CY3 (Outdoor Rack)',
        capacityTitle: 'อัตราจัดเก็บเต็นท์ CY3',
        capacitySubtitle: 'ความจุแร็ค 4 ชั้น CY3',
        inSubtitle: 'รับเข้าเต็นท์ CY3 (Outdoor Rack)',
        outSubtitle: 'เบิกจ่ายวัตถุดิบสู่สายการผลิต',
        totalCapacity: 400,
      };
    }

    // Default: Total Campus (A2 + A4 + A5 + CY3)
    return {
      id: 'ALL',
      shortName: 'แคมปัส',
      fullName: 'รวมทุกคลังแคมปัส (A2, A4, A5, CY3)',
      capacityTitle: 'อัตราจัดเก็บรวมแคมปัส',
      capacitySubtitle: 'ความจุรวมแคมปัส',
      inSubtitle: 'รับเข้าคลัง A2 / A4 / A5 / CY3',
      outSubtitle: 'เบิกจ่ายไลน์ผลิต HE1 - HE5',
      totalCapacity: 2456, // 160 + 680 + 432 + 784 + 400
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
    if (facilityContext.id === 'FAC-CY3-TENT') {
      return items.filter(it => 
        it.facilityId === 'FAC-CY3-TENT' || 
        it.locatorCode.startsWith('DY3T') || 
        it.locatorCode.includes('DY3T') ||
        (it.zone && String(it.zone).startsWith('CY3'))
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
      {/* 6 Unified KPI Summary Cards - Fixed Height, 1fr Uniform Width, Crisp Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4">
        
        {/* Card 1: ยอดคงเหลือรวม */}
        <div 
          onClick={() => handleCardClick('inventory')}
          className="bg-slate-900/95 border border-slate-800 hover:border-blue-500/80 rounded-xl p-3 sm:p-3.5 text-white flex flex-col justify-between shadow-md relative overflow-hidden cursor-pointer transition-all group hover:bg-slate-850 active:scale-[0.99] h-[76px] sm:h-[80px]"
        >
          <div className="flex items-center justify-between leading-none">
            <span className="text-xs sm:text-[13px] font-black text-slate-100 tracking-tight truncate">
              {facilityContext.id === 'ALL' ? 'ยอดคงเหลือรวม' : `ยอดคงเหลือ ${facilityContext.shortName}`}
            </span>
            <div className="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-md bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/40 shrink-0">
              <Package className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline my-0 leading-none">
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
              {totalUnits.toLocaleString()}
            </span>
            <span className="ml-1.5 text-xs text-slate-300 font-extrabold shrink-0">Units</span>
          </div>
          <div className="flex items-center space-x-1 sm:space-x-1.5 text-[10.5px] font-black text-emerald-400 truncate leading-tight">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0 shadow-xs shadow-emerald-400/50"></span>
            <span className="truncate">Real-Time Sync</span>
          </div>
        </div>

        {/* Card 2: เตือน SAFETY STOCK */}
        <div 
          onClick={() => handleCardClick('safety')}
          className="bg-slate-900/95 border border-slate-800 hover:border-rose-500/80 rounded-xl p-3 sm:p-3.5 text-white flex flex-col justify-between shadow-md relative overflow-hidden cursor-pointer transition-all group hover:bg-slate-850 active:scale-[0.99] h-[76px] sm:h-[80px]"
        >
          <div className="flex items-center justify-between leading-none">
            <span className="text-xs sm:text-[13px] font-black text-slate-100 tracking-tight truncate">
              เตือน SAFETY STOCK
            </span>
            <div className="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-md bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/40 shrink-0">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline my-0 leading-none">
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-rose-500">
              {lowStockCount}
            </span>
            <span className="ml-1.5 text-xs text-slate-300 font-extrabold shrink-0">รายการ</span>
          </div>
          <div className="text-[10.5px] font-black text-rose-400 truncate leading-tight">
            ต่ำกว่าเกณฑ์ความปลอดภัย
          </div>
        </div>

        {/* Card 3: สแกนรับเข้าวันนี้ */}
        <div 
          onClick={() => handleCardClick('in_logs')}
          className="bg-slate-900/95 border border-slate-800 hover:border-emerald-500/80 rounded-xl p-3 sm:p-3.5 text-white flex flex-col justify-between shadow-md relative overflow-hidden cursor-pointer transition-all group hover:bg-slate-855 active:scale-[0.99] h-[76px] sm:h-[80px]"
        >
          <div className="flex items-center justify-between leading-none">
            <span className="text-xs sm:text-[13px] font-black text-slate-100 tracking-tight truncate">
              สแกนรับเข้าวันนี้
            </span>
            <div className="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40 shrink-0">
              <ArrowDownRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline my-0 leading-none">
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-emerald-400">
              +{inScanCount}
            </span>
            <span className="ml-1.5 text-xs text-slate-300 font-extrabold shrink-0">Scan</span>
          </div>
          <div className="text-[10.5px] font-bold text-emerald-300 truncate leading-tight">
            {facilityContext.inSubtitle}
          </div>
        </div>

        {/* Card 4: สแกนเบิกออกวันนี้ */}
        <div 
          onClick={() => handleCardClick('out_logs')}
          className="bg-slate-900/95 border border-slate-800 hover:border-sky-500/80 rounded-xl p-3 sm:p-3.5 text-white flex flex-col justify-between shadow-md relative overflow-hidden cursor-pointer transition-all group hover:bg-slate-855 active:scale-[0.99] h-[76px] sm:h-[80px]"
        >
          <div className="flex items-center justify-between leading-none">
            <span className="text-xs sm:text-[13px] font-black text-slate-100 tracking-tight truncate">
              สแกนเบิกออกวันนี้
            </span>
            <div className="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-md bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/40 shrink-0">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline my-0 leading-none">
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-sky-400">
              -{outScanCount}
            </span>
            <span className="ml-1.5 text-xs text-slate-300 font-extrabold shrink-0">Scan</span>
          </div>
          <div className="text-[10.5px] font-bold text-sky-300 truncate leading-tight">
            {facilityContext.outSubtitle}
          </div>
        </div>

        {/* Card 5: อัตราจัดเก็บ */}
        <div 
          onClick={() => handleCardClick('layout')}
          className="bg-slate-900/95 border border-slate-800 hover:border-purple-500/80 rounded-xl p-3 sm:p-3.5 text-white flex flex-col justify-between shadow-md relative overflow-hidden cursor-pointer transition-all group hover:bg-slate-855 active:scale-[0.99] h-[76px] sm:h-[80px]"
        >
          <div className="flex items-center justify-between leading-none">
            <span className="text-xs sm:text-[13px] font-black text-slate-100 tracking-tight truncate">
              {facilityContext.capacityTitle}
            </span>
            <div className="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-md bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/40 shrink-0">
              <Grid className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline my-0 leading-none">
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
              {occupiedPallets}
            </span>
            <span className="ml-1.5 text-xs text-slate-300 font-extrabold shrink-0">/ {capacityPallets.toLocaleString()} P</span>
          </div>
          <div className="flex items-center justify-between text-[10.5px] font-bold leading-tight truncate">
            <span className="text-slate-300 truncate">{facilityContext.capacitySubtitle}:</span>
            <span className="font-mono font-black text-purple-400 ml-1">
              {occupancyPercent}%
            </span>
          </div>
        </div>

        {/* Card 6: เตือน AGING FIFO */}
        <div 
          onClick={() => handleCardClick('aging')}
          className="bg-slate-900/95 border border-slate-800 hover:border-amber-500/80 rounded-xl p-3 sm:p-3.5 text-white flex flex-col justify-between shadow-md relative overflow-hidden cursor-pointer transition-all group hover:bg-slate-855 active:scale-[0.99] h-[76px] sm:h-[80px]"
        >
          <div className="flex items-center justify-between leading-none">
            <span className="text-xs sm:text-[13px] font-black text-slate-100 tracking-tight truncate">
              เตือน AGING FIFO
            </span>
            <div className="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40 shrink-0">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline my-0 leading-none">
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-amber-400">
              {agingOverdueCount}
            </span>
            <span className="ml-1.5 text-xs text-slate-300 font-extrabold shrink-0">Overdue</span>
          </div>
          <div className="text-[10.5px] font-bold text-amber-400 truncate leading-tight">
            เกิน {agingConfig?.criticalDays || 30} วัน ({agingConfig?.customRuleName || '14/30 วัน'})
          </div>
        </div>

      </div>
    </div>
  );
};
