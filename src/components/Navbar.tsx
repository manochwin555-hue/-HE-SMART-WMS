import React, { useState } from 'react';
import { 
  Box, 
  Layers, 
  QrCode, 
  ListFilter, 
  ClockAlert, 
  Warehouse,
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
  Map,
  GitCommit,
  Building2,
  ChevronDown,
  Compass,
  Tent,
  LayoutGrid
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

  const activeFacility = facilities.find(f => f.id === activeFacilityId);

  const navItems = [
    { id: 'blueprint', label: t('navigation.blueprint'), icon: Map, badge: 'MAP' },
    { id: 'a4_floor', label: t('navigation.a4_floor'), icon: LayoutGrid, badge: '432P' },
    { id: 'a4_rack', label: t('navigation.a4_rack'), icon: Layers, badge: '680P' },
    { id: 'flow_floor', label: t('navigation.flow'), icon: GitCommit, badge: 'A2' },
    { id: 'tent_layout', label: t('navigation.tent'), icon: Tent, badge: 'A5' },
    { id: 'cy3_layout', label: t('navigation.cy3'), icon: Layers, badge: 'CY3' },
    { id: 'inventory', label: t('navigation.inventory'), icon: ShieldAlert, count: lowStockCount },
    { id: 'logs', label: t('navigation.logs'), icon: ListFilter },
    { id: 'printer', label: t('navigation.printer'), icon: Printer },
    { id: 'master', label: t('navigation.master'), icon: Box },
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
        <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between">
          <div
            onClick={() => {
              setActiveTab('blueprint');
              setIsMobileOpen(false);
            }}
            className="flex items-center space-x-2.5 cursor-pointer overflow-hidden text-left"
          >
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-md">
              <Box className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <div className="truncate">
                <div className="flex items-center space-x-1.5">
                  <span className="font-black text-sm tracking-tight text-white truncate">HEX WMS LGETH</span>
                  <span className="text-[8px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    LIVE
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium truncate">{t.subtitle}</p>
              </div>
            )}
          </div>

          {/* Desktop Toggle Collapse Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors border border-slate-700/60"
            title={isCollapsed ? 'ขยายแถบเมนู' : 'ซ่อนแถบเมนู'}
          >
            {isCollapsed ? <PanelLeftOpen className="w-4 h-4 text-blue-400" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Quick Actions (QR Scan) */}
        <div className="p-3 space-y-2">
          <button
            onClick={() => {
              onOpenScanner();
              setIsMobileOpen(false);
            }}
            className={`w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl py-2.5 transition-all shadow-md active:scale-95 ${
              isCollapsed ? 'px-2' : 'px-3'
            }`}
            title="สแกน QR รับ-เบิกสินค้า"
          >
            <QrCode className="w-4 h-4 shrink-0 text-white" />
            {!isCollapsed && <span className="text-xs truncate">สแกน QR (IN/OUT)</span>}
          </button>
        </div>

        {/* Left-Aligned Menu Tabs */}
        <nav className="flex-1 px-2.5 py-2 space-y-1 overflow-y-auto no-scrollbar text-left">
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
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <div className="flex items-center space-x-3 truncate">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'}`} />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </div>

                {!isCollapsed && (
                  <div className="flex items-center space-x-1 shrink-0 ml-1">
                    {item.badge && (
                      <span className={`px-1.5 py-0.2 text-[9px] font-extrabold rounded ${
                        isActive ? 'bg-blue-700 text-blue-100' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                    {item.count !== undefined && item.count > 0 && (
                      <span className="px-1.5 py-0.2 text-[10px] font-black rounded-full bg-amber-500 text-slate-950 animate-pulse">
                        {item.count}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Actions: Capacity, Language, Dark mode, Fullscreen */}
        <div className="p-3 border-t border-slate-800/80 space-y-2 text-left">
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

          <div className={`flex items-center ${isCollapsed ? 'flex-col space-y-2' : 'justify-between space-x-1'}`}>
            {/* Language Selector */}
            {!isCollapsed ? (
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
            ) : null}

            <div className="flex items-center space-x-1">
              {/* Theme Mode Toggle (Light / Dark) */}
              {setThemeMode ? (
                <div className="flex items-center bg-slate-800/90 rounded-lg p-0.5 border border-slate-700/80">
                  <button
                    onClick={() => setThemeMode('light')}
                    className={`p-1.5 rounded-md transition-all ${
                      themeMode === 'light' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-white'
                    }`}
                    title="สว่าง (Light Mode)"
                  >
                    <Sun className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setThemeMode('dark')}
                    className={`p-1.5 rounded-md transition-all ${
                      themeMode === 'dark' ? 'bg-blue-600 text-white font-bold shadow' : 'text-slate-400 hover:text-white'
                    }`}
                    title="มืด (Dark Mode)"
                  >
                    <Moon className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : toggleDarkMode ? (
                <button
                  onClick={toggleDarkMode}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/80"
                  title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
                >
                  {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
                </button>
              ) : null}

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
        </div>
      </aside>
    </>
  );
};
