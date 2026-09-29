import React, { useState } from 'react';
import { 
  Warehouse, 
  Rows3, 
  QrCode, 
  History, 
  ClockAlert, 
  ShieldCheck,
  ShieldAlert,
  Search,
  Printer,
  Maximize,
  Minimize,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Building2,
  Compass,
  Tent,
  TentTree,
  Grid3X3,
  SlidersHorizontal,
  PackageSearch,
  Database,
  Boxes,
  LayoutDashboard
} from 'lucide-react';

import { WarehouseFacility } from '../types';
import { useTranslation } from '../i18n/i18nContext';
import { Language } from '../i18n/types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenScanner: () => void;
  onOpenIntegration?: () => void;
  agingCount: number;
  lowStockCount?: number;
  facilities?: WarehouseFacility[];
  activeFacilityId?: string;
  setActiveFacilityId?: (facilityId: string) => void;
  activeStation?: string;
  setActiveStation?: (stationId: string) => void;
  isFullscreen?: boolean;
  toggleFullscreen?: () => void;
  language?: string;
  setLanguage?: (lang: string) => void;
  isDarkMode?: boolean;
  toggleDarkMode?: () => void;
  themeMode?: 'light' | 'dark';
  setThemeMode?: (mode: 'light' | 'dark') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenScanner,
  agingCount,
  lowStockCount = 0,
  facilities = [],
  activeFacilityId = 'ALL',
  setActiveFacilityId,
  activeStation,
  setActiveStation,
  isFullscreen = false,
  toggleFullscreen,
  isDarkMode = false,
  toggleDarkMode,
  themeMode = 'light',
  setThemeMode,
}) => {
  const { language, setLanguage, t } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  const handleToggleCollapse = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
    // Dispatch window resize events during and after transition so 3D canvases adjust smoothly
    window.dispatchEvent(new Event('resize'));
    setTimeout(() => window.dispatchEvent(new Event('resize')), 150);
    setTimeout(() => window.dispatchEvent(new Event('resize')), 320);
  };

  const activeFacility = facilities.find(f => f.id === activeFacilityId);

  const navItems = [
    { id: 'blueprint', label: t('navigation.blueprint'), icon: Compass },
    { id: 'a4_floor', label: t('navigation.a4_floor'), icon: Grid3X3 },
    { id: 'a4_rack', label: t('navigation.a4_rack'), icon: Rows3 },
    { id: 'flow_floor', label: t('navigation.flow'), icon: SlidersHorizontal },
    { id: 'tent_layout', label: t('navigation.tent'), icon: Tent },
    { id: 'cy3_layout', label: t('navigation.cy3'), icon: TentTree },
    { id: 'inventory', label: t('navigation.inventory'), icon: PackageSearch, count: lowStockCount },
    { id: 'logs', label: t('navigation.logs'), icon: History },
    { id: 'printer', label: t('navigation.printer'), icon: Printer },
    { id: 'master', label: t('navigation.master'), icon: Database },
  ];


  return (
    <>
      {/* Mobile Top Bar (Visible only on small screens < md) */}
      <div className="md:hidden sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-200 hover:text-white"
          >
            {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setActiveTab('blueprint')}>
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-xs">
              HEX
            </div>
            <span className="font-extrabold text-sm tracking-tight text-white">HEX WMS LGETH</span>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={onOpenScanner}
            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg font-bold shadow"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>สแกน</span>
          </button>
        </div>
      </div>

      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Main Sidebar Component */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-screen bg-slate-900 border-r border-slate-800 text-white flex flex-col justify-between transition-all duration-300 shadow-xl shrink-0 ${
          isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed ? 'md:w-16' : 'md:w-64'}`}
      >
        {/* Sidebar Header & Brand (HEX WMS LGETH) */}
        <div className={`border-b border-slate-800/80 ${isCollapsed ? 'p-2 flex items-center justify-center' : 'p-3.5 flex items-center justify-between'}`}>
          {isCollapsed ? (
            <button
              onClick={() => handleToggleCollapse(false)}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 text-blue-400 hover:text-white hover:bg-slate-700 transition-colors border border-slate-700/60 shadow-sm"
              title="ขยายแถบเมนู (Expand Sidebar)"
            >
              <PanelLeftOpen className="w-5 h-5" />
            </button>
          ) : (
            <>
              <div
                onClick={() => {
                  setActiveTab('blueprint');
                  setIsMobileOpen(false);
                }}
                className="flex items-center space-x-2.5 cursor-pointer overflow-hidden text-left"
              >
                <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-md">
                  <Warehouse className="w-5 h-5 text-white" />
                </div>
                <div className="truncate">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-black text-sm tracking-tight text-white truncate">HEX WMS LGETH</span>
                    <span className="text-[8px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                      LIVE
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium truncate">{t.subtitle}</p>
                </div>
              </div>

              {/* Desktop Toggle Collapse Button */}
              <button
                onClick={() => handleToggleCollapse(true)}
                className="hidden md:flex p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors border border-slate-700/60"
                title="ซ่อนแถบเมนู (Collapse Sidebar)"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Quick Actions (QR Scan) */}
        <div className={`p-2.5 ${isCollapsed ? 'flex justify-center' : 'space-y-2'}`}>
          <button
            onClick={() => {
              onOpenScanner();
              setIsMobileOpen(false);
            }}
            className={`flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 ${
              isCollapsed ? 'w-10 h-10 p-0' : 'w-full py-2.5 px-3 space-x-2'
            }`}
            title="สแกน QR รับ-เบิกสินค้า"
          >
            <QrCode className="w-4 h-4 shrink-0 text-white" />
            {!isCollapsed && <span className="text-xs truncate">สแกน QR (IN/OUT)</span>}
          </button>
        </div>

        {/* Left-Aligned Menu Tabs */}
        <nav className={`flex-1 ${isCollapsed ? 'px-2' : 'px-2.5'} py-2 space-y-1 overflow-y-auto no-scrollbar text-left`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileOpen(false);
                }}
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center h-10 w-10 mx-auto px-0' : 'justify-between px-3 py-2.5'
                } rounded-xl text-xs font-semibold transition-all group relative ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} truncate`}>
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'}`} />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </div>

                {item.count !== undefined && item.count > 0 && (
                  isCollapsed ? (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  ) : (
                    <span className="px-1.5 py-0.2 text-[10px] font-black rounded-full bg-amber-500 text-slate-950 animate-pulse shrink-0 ml-1">
                      {item.count}
                    </span>
                  )
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Actions: Capacity, Language, Dark mode, Fullscreen */}
        <div className="p-2.5 border-t border-slate-800/80 space-y-2 text-left">
          {!isCollapsed && (
            <div className="flex items-center justify-between text-[11px] bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700/60">
              <span className="text-slate-400 font-medium flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>{activeFacility ? `${activeFacility.code}:` : `${t('navigation.totalCapacity')}`}</span>
              </span>
              <span className="text-emerald-400 font-bold">
                {activeFacility 
                  ? `${activeFacility.totalCapacityPallets} ${t('common.pallets')}` 
                  : `${facilities.reduce((acc, f) => acc + f.totalCapacityPallets, 0) || 680} ${t('common.pallets')}`}
              </span>
            </div>
          )}

          {isCollapsed ? (
            <div className="flex flex-col items-center space-y-2 py-1">
              {toggleFullscreen && (
                <button
                  onClick={toggleFullscreen}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-colors shadow-sm"
                  title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                >
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between space-x-1.5">
              {/* Language Selector */}
              <select
                className="bg-slate-800 text-slate-300 border border-slate-700/80 rounded-lg px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer w-full font-sans"
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
              >
                <option value="th">🇹🇭 TH - ไทย</option>
                <option value="en">🇬🇧 EN - English</option>
                <option value="kh">🇰🇭 KH - ខ្មែរ</option>
                <option value="mm">🇲🇲 MM - မြန်မာ</option>
                <option value="kr">🇰🇷 KR - 한국어</option>
              </select>

              <div className="flex items-center space-x-1 shrink-0">
                {/* Fullscreen Toggle */}
                {toggleFullscreen && (
                  <button
                    onClick={toggleFullscreen}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/80"
                    title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                  >
                    {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
