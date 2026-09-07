import React from 'react';
import { 
  Building2, 
  Search, 
  X, 
  QrCode, 
  ChevronRight 
} from 'lucide-react';

export interface TabOption {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
  color?: string;
}

export interface ZoneStandardToolbarProps {
  /** Zone name (e.g. โซน A2 (Flow Rail)) */
  zoneTitle: string;
  /** Capacity badge text (e.g. 160P, 680P) */
  capacityBadge?: string;
  /** Accent dot color (e.g. bg-blue-400, bg-amber-400, bg-emerald-400, bg-rose-400) */
  dotColorClass?: string;
  /** Callback to navigate back to Campus Master Overview */
  onNavigateToCampus?: () => void;
  
  /** View Switcher Tabs (e.g. 2D / 3D, Top View / Isometric / Elevation) */
  viewTabs?: TabOption[];
  activeViewTab?: string;
  onSelectViewTab?: (tabId: string) => void;

  /** Status / Sub Filter Tabs (e.g. ทั้งหมด, มีของ, ว่าง, Aging) */
  statusTabs?: TabOption[];
  activeStatusTab?: string;
  onSelectStatusTab?: (tabId: string) => void;

  /** Optional custom center controls (like Bank filters or Level filters) */
  customControls?: React.ReactNode;

  /** Search value and handler */
  searchValue: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;

  /** QR Scanner trigger */
  onOpenScanner?: () => void;
}

export const ZoneStandardToolbar: React.FC<ZoneStandardToolbarProps> = ({
  zoneTitle,
  capacityBadge,
  dotColorClass = 'bg-blue-400',
  onNavigateToCampus,
  viewTabs,
  activeViewTab,
  onSelectViewTab,
  statusTabs,
  activeStatusTab,
  onSelectStatusTab,
  customControls,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'ค้นหา Part No, Model, Locator...',
  onOpenScanner,
}) => {
  return (
    <div className="h-12 w-full px-3 sm:px-4 bg-[#161B22] border border-[#30363D] rounded-xl text-white shadow-md flex items-center justify-between gap-2.5 overflow-x-auto select-none shrink-0 z-10">
      
      {/* 1. Left Group: Breadcrumb + Zone Title & Capacity */}
      <div className="flex items-center gap-2 shrink-0">
        {onNavigateToCampus && (
          <button
            onClick={onNavigateToCampus}
            className="h-8 px-2.5 rounded-lg bg-[#21262D] hover:bg-[#30363D] text-slate-300 hover:text-white border border-[#30363D] flex items-center gap-1.5 text-xs font-bold transition-colors shrink-0"
            title="กลับสู่ผังรวม (Master Blueprint)"
          >
            <Building2 className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">ผังรวม</span>
          </button>
        )}

        {onNavigateToCampus && <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0 hidden xs:inline" />}

        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`w-2.5 h-2.5 rounded-full ${dotColorClass} animate-pulse shrink-0`} />
          <h2 className="text-xs sm:text-[13px] font-black tracking-tight text-white whitespace-nowrap">
            {zoneTitle}
          </h2>
          {capacityBadge && (
            <span className="text-[10.5px] font-mono font-black px-2 py-0.5 bg-[#21262D] text-blue-400 border border-[#30363D] rounded-md shrink-0">
              {capacityBadge}
            </span>
          )}
        </div>
      </div>

      {/* 2. Center Group: Filter Switcher & View Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto shrink-0 no-scrollbar">
        {/* View Switcher Tabs */}
        {viewTabs && viewTabs.length > 0 && (
          <div className="inline-flex items-center bg-[#0D1117] p-0.5 rounded-lg border border-[#30363D] h-8 shrink-0">
            {viewTabs.map((tab) => {
              const isActive = activeViewTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectViewTab && onSelectViewTab(tab.id)}
                  className={`h-7 px-2.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    isActive
                      ? 'bg-[#2F81F7] text-white font-black shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-[#21262D]'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`text-[10px] font-mono px-1 py-0.2 rounded ${isActive ? 'bg-white/20 text-white' : 'bg-[#21262D] text-slate-400'}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Custom Center Controls (e.g. Bank/Level selector) */}
        {customControls}

        {/* Status Filter Tabs */}
        {statusTabs && statusTabs.length > 0 && (
          <div className="inline-flex items-center bg-[#0D1117] p-0.5 rounded-lg border border-[#30363D] h-8 shrink-0">
            {statusTabs.map((tab) => {
              const isActive = activeStatusTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectStatusTab && onSelectStatusTab(tab.id)}
                  className={`h-7 px-2.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    isActive
                      ? tab.color || 'bg-[#2F81F7] text-white font-black shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-[#21262D]'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`text-[10px] font-mono px-1 py-0.2 rounded ${isActive ? 'bg-white/20 text-white' : 'bg-[#21262D] text-slate-400'}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Right Group: Search Input + QR Scanner Button */}
      <div className="flex items-center gap-2 shrink-0 ml-auto">
        {/* Search Input (Standardized H-8, W-200 to W-240) */}
        <div className="relative w-44 sm:w-56 h-8 flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-8 bg-[#0D1117] border border-[#30363D] focus:border-[#58A6FF] rounded-lg pl-8 pr-7 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
          />
          {searchValue && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-white"
              title="ล้างคำค้นหา"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* QR Scanner Button */}
        {onOpenScanner && (
          <button
            onClick={onOpenScanner}
            className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 border border-emerald-500/50 shadow-xs transition-colors shrink-0"
            title="เปิดกล้องสแกน QR Code เพื่อค้นหา / รับเข้า / เบิกจ่าย"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">สแกน QR</span>
          </button>
        )}
      </div>
    </div>
  );
};
