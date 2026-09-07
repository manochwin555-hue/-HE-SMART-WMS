import React from 'react';
import { 
  Package, 
  ShieldAlert, 
  ArrowDownRight, 
  ArrowUpRight, 
  Layers, 
  AlertTriangle,
  Search,
  X,
  QrCode,
  Filter,
  Maximize2,
  Minimize2,
  RefreshCw,
  Building2,
  ChevronRight
} from 'lucide-react';
import { AGING_LEGEND_ITEMS } from './agingColorSystem';

export interface UnifiedZoneKpiStats {
  totalInventoryUnits: number;
  safetyStockAlertCount: number;
  todayScanInCount: number;
  todayScanOutCount: number;
  occupiedPallets: number;
  totalCapacityPallets: number;
  agingOverdueCount: number;
  agingWarningCount?: number;
  emptyPalletsCount?: number;
}

export type ZoneFilterStatus = 'ALL' | 'OCCUPIED' | 'EMPTY' | 'AGING';

export interface UnifiedZoneHeaderProps {
  zoneTitle: string;
  zoneSubtitle?: string;
  locatorSign?: string;
  facilityCode?: string;
  stats: UnifiedZoneKpiStats;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterStatus: ZoneFilterStatus;
  onFilterStatusChange: (status: ZoneFilterStatus) => void;
  activeLevel?: number | 'ALL';
  onLevelChange?: (level: number | 'ALL') => void;
  onOpenQuickScanner?: () => void;
  onRefresh?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onNavigateBack?: () => void;
  backButtonLabel?: string;
  isRackZone?: boolean;
}

export const UnifiedZoneHeader: React.FC<UnifiedZoneHeaderProps> = ({
  zoneTitle,
  zoneSubtitle,
  locatorSign,
  facilityCode,
  stats,
  searchQuery,
  onSearchChange,
  filterStatus,
  onFilterStatusChange,
  activeLevel = 'ALL',
  onLevelChange,
  onOpenQuickScanner,
  onRefresh,
  isFullscreen,
  onToggleFullscreen,
  onNavigateBack,
  backButtonLabel = 'กลับหน้าภาพรวมแคมปัส',
  isRackZone = false
}) => {
  const occupancyPercent = stats.totalCapacityPallets > 0
    ? Math.round((stats.occupiedPallets / stats.totalCapacityPallets) * 100)
    : 0;

  return (
    <div className="w-full space-y-2.5">
      {/* ========================================================================= */}
      {/* 1. TOP KPI BAR (6 Standard KPI Cards)                                    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {/* KPI 1: ยอดคงเหลือ */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 shadow-sm hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold">ยอดคงเหลือ</span>
            <Package className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-lg sm:text-xl font-black text-white font-mono tracking-tight leading-none">
            {stats.totalInventoryUnits.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 truncate">
            {zoneSubtitle || 'ชิ้นในระบบ'}
          </div>
        </div>

        {/* KPI 2: เตือน SAFETY STOCK */}
        <div className={`border rounded-lg p-2.5 shadow-sm transition-colors ${
          stats.safetyStockAlertCount > 0 
            ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
            : 'bg-slate-900 border-slate-800 text-slate-300'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold">เตือน SAFETY STOCK</span>
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-lg sm:text-xl font-black font-mono tracking-tight leading-none text-amber-400">
            {stats.safetyStockAlertCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 truncate">
            {stats.safetyStockAlertCount > 0 ? 'รายการต่ำกว่าเกณฑ์' : 'สต็อกอยู่ในเกณฑ์'}
          </div>
        </div>

        {/* KPI 3: สแกนรับวันนี้ */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 shadow-sm hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold">สแกนรับวันนี้</span>
            <ArrowDownRight className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-400 font-mono tracking-tight leading-none">
            +{stats.todayScanInCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 truncate">
            สแกนเข้าคลังวันนี้
          </div>
        </div>

        {/* KPI 4: สแกนเบิกวันนี้ */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 shadow-sm hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold">สแกนเบิกวันนี้</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-lg sm:text-xl font-black text-rose-400 font-mono tracking-tight leading-none">
            -{stats.todayScanOutCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 truncate">
            เบิกจ่ายสู่สายการผลิต
          </div>
        </div>

        {/* KPI 5: อัตราจัดเก็บ (%) */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 shadow-sm hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-semibold">อัตราจัดเก็บ</span>
            <Layers className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="flex items-baseline gap-1.5 leading-none">
            <span className="text-lg sm:text-xl font-black text-white font-mono tracking-tight">
              {stats.occupiedPallets}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              / {stats.totalCapacityPallets} P
            </span>
            <span className={`ml-auto text-xs font-black font-mono ${
              occupancyPercent >= 90 ? 'text-rose-400' : occupancyPercent >= 75 ? 'text-amber-400' : 'text-blue-400'
            }`}>
              {occupancyPercent}%
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                occupancyPercent >= 90 ? 'bg-rose-500' : occupancyPercent >= 75 ? 'bg-amber-400' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(100, occupancyPercent)}%` }}
            />
          </div>
        </div>

        {/* KPI 6: เตือน AGING FIFO */}
        <div className={`border rounded-lg p-2.5 shadow-sm transition-colors ${
          stats.agingOverdueCount > 0
            ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
            : 'bg-slate-900 border-slate-800 text-slate-300'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold">เตือน AGING FIFO</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-lg sm:text-xl font-black font-mono tracking-tight leading-none text-rose-400">
            {stats.agingOverdueCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 truncate">
            {stats.agingOverdueCount > 0 ? 'รายการเกินกำหนด (>28 วัน)' : 'ไม่มีสินค้าค้างเกินกำหนด'}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. FILTER & SEARCH CONTROL BAR                                           */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 shadow-md flex flex-wrap items-center justify-between gap-2.5">
        
        {/* Left: Zone Title & Breadcrumb */}
        <div className="flex items-center gap-2">
          {onNavigateBack && (
            <button
              onClick={onNavigateBack}
              className="h-8 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors"
              title={backButtonLabel}
            >
              <span>←</span>
              <span className="hidden md:inline">{backButtonLabel}</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm sm:text-base font-black text-white leading-tight">
                  {zoneTitle}
                </h2>
                {locatorSign && (
                  <span className="text-[10px] font-mono font-bold bg-blue-900/60 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded">
                    {locatorSign}
                  </span>
                )}
                {facilityCode && (
                  <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
                    [{facilityCode}]
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {isRackZone ? 'โครงสร้างแร็คจัดเก็บ 4 ชั้น (Selective Rack 4-Level Stack)' : 'ลานจัดเก็บบริเวณพื้น 1:1 พาเลท (Single Level Grid)'}
              </p>
            </div>
          </div>
        </div>

        {/* Center & Right Controls */}
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          
          {/* Search Input */}
          <div className="relative w-44 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="ค้นหา Model / Locator..."
              className="w-full h-8 pl-8 pr-7 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                title="ล้างคำค้นหา"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter Segmented Buttons */}
          <div className="inline-flex bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => onFilterStatusChange('ALL')}
              className={`h-7 px-2.5 rounded-md text-[11px] font-bold transition-all ${
                filterStatus === 'ALL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => onFilterStatusChange('OCCUPIED')}
              className={`h-7 px-2.5 rounded-md text-[11px] font-bold transition-all ${
                filterStatus === 'OCCUPIED'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              มีของ ({stats.occupiedPallets})
            </button>
            <button
              onClick={() => onFilterStatusChange('EMPTY')}
              className={`h-7 px-2.5 rounded-md text-[11px] font-bold transition-all ${
                filterStatus === 'EMPTY'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              ว่าง ({stats.emptyPalletsCount ?? (stats.totalCapacityPallets - stats.occupiedPallets)})
            </button>
            <button
              onClick={() => onFilterStatusChange('AGING')}
              className={`h-7 px-2.5 rounded-md text-[11px] font-bold transition-all ${
                filterStatus === 'AGING'
                  ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                  : 'text-amber-400/80 hover:text-amber-300 hover:bg-slate-800'
              }`}
            >
              Aging Warning
            </button>
          </div>

          {/* Rack Level Filter (L4, L3, L2, L1) when in Rack Zone */}
          {isRackZone && onLevelChange && (
            <div className="inline-flex bg-slate-950 p-0.5 rounded-lg border border-slate-800">
              <button
                onClick={() => onLevelChange('ALL')}
                className={`h-7 px-2 rounded-md text-[10px] font-bold transition-all ${
                  activeLevel === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                ทุกชั้น
              </button>
              {([4, 3, 2, 1] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => onLevelChange(lvl)}
                  className={`h-7 px-2 rounded-md text-[10px] font-mono font-bold transition-all ${
                    Number(activeLevel) === lvl
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  L{lvl}
                </button>
              ))}
            </div>
          )}

          {/* Quick Scanner Action Button */}
          {onOpenQuickScanner && (
            <button
              onClick={onOpenQuickScanner}
              className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md inline-flex items-center gap-1.5 transition-all active:scale-95 shrink-0"
              title="สแกน QR / Kanban รับเข้า-เบิกออก"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>สแกน QR / Kanban</span>
            </button>
          )}

          {/* Refresh button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="h-8 w-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center justify-center transition-colors shrink-0"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Fullscreen button */}
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="h-8 w-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center justify-center transition-colors shrink-0"
              title={isFullscreen ? 'ย่อหน้าจอ' : 'ขยายเต็มจอ'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. AGING COLOR SCHEME LEGEND (ระบบสีสถานะ Aging)                         */}
      {/* ========================================================================= */}
      <div className="bg-slate-900/80 border border-slate-800/90 rounded-lg px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
          <span>ระบบสี Aging:</span>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px]">
          {AGING_LEGEND_ITEMS.map((item) => (
            <div key={item.category} className="flex items-center gap-1.5">
              <span 
                className={`w-3 h-3 rounded-xs shrink-0 ${item.badgeClass}`}
                style={{ backgroundColor: item.hexColor }}
              />
              <span className="text-slate-300 font-medium">
                {item.label}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                ({item.daysRange})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
