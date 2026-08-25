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
  Tv,
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
  Tent
} from 'lucide-react';

import { WarehouseFacility } from '../types';

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
  themeMode?: 'light' | 'dark' | 'hdmi';
  setThemeMode?: (mode: 'light' | 'dark' | 'hdmi') => void;
}

const translations: Record<string, Record<string, string>> = {
  th: {
    dashboard: 'แดชบอร์ด (KPIs)',
    layout: 'ผัง A4 (แร็ค/พื้น)',
    campus: 'ผังรวม (A2/A4/A5)',
    flow: 'ผัง A2 (รางเลื่อน)',
    tent: 'ผัง A5 (เต็นท์)',
    inventory: 'สต็อก & Safety Stock',
    rack3d: '3D Rack Inspector',
    scanner: 'สแกน QR รับ-เบิก',
    logs: 'ประวัติรับ-เบิก',
    aging: 'FIFO / Aging',
    printer: 'พิมพ์ฉลาก (Label)',
    master: 'Master Data & ตั้งค่า',
    subtitle: 'LGETH Warehouse Automation',
    totalCapacity: 'ความจุรวม:',
  },
  en: {
    dashboard: 'Executive Hub (GMES & KPIs)',
    layout: 'A4 Map (Rack/Floor)',
    campus: 'Campus (A2/A4/A5)',
    flow: 'A2 Map (Flow Rail)',
    tent: 'A5 Map (Tents)',
    inventory: 'Inventory & Safety',
    rack3d: '3D Rack Inspector',
    scanner: 'QR Scan In/Out',
    logs: 'Movement Logs',
    aging: 'FIFO & Aging',
    printer: 'Print Labels',
    master: 'Master Data & Settings',
    subtitle: 'LGETH Warehouse Automation',
    totalCapacity: 'Total Cap:',
  },
  kh: {
    dashboard: 'ផ្ទាំងគ្រប់គ្រង',
    layout: 'ប្លង់ A4',
    campus: 'ប្លង់រួម A2/A4/A5',
    flow: 'ប្លង់ A2 (ផ្លូវរអិល)',
    tent: 'ប្លង់ A5 (តង់)',
    inventory: 'ស្តុក & សុវត្ថិភាព',
    rack3d: 'អ្នកត្រួតពិនិត្យ 3D',
    scanner: 'ស្កេន QR',
    logs: 'កំណត់ហេតុ',
    aging: 'FIFO & Aging',
    printer: 'បោះពុម្ពស្លាក',
    master: 'ទិន្នន័យមេ',
    subtitle: 'LGETH Warehouse Automation',
    totalCapacity: 'សមត្ថភាពសរុប:',
  },
  mm: {
    dashboard: 'ဒက်ရှ်ဘုတ်',
    layout: 'A4 မြေပုံ',
    campus: 'A2/A4/A5 မြေပုံ',
    flow: 'A2 မြေပုံ (ရထားလမ်း)',
    tent: 'A5 မြေပုံ (တဲ)',
    inventory: 'စာရင်းနှင့် သိုလှောင်မှု',
    rack3d: '3D စင်စစ်ဆေးသူ',
    scanner: 'QR စကင်',
    logs: 'မှတ်တမ်းများ',
    aging: 'FIFO နှင့် သက်တမ်း',
    printer: 'တံဆိပ်ရိုက်နှိပ်ခြင်း',
    master: 'ပင်မဒေတာ',
    subtitle: 'LGETH Warehouse Automation',
    totalCapacity: 'စုစုပေါင်းစွမ်းရည်:',
  },
  kr: {
    dashboard: '대시보드 (KPIs)',
    layout: 'A4 배치도 (랙/평치)',
    campus: '캠퍼스 종합 (A2/A4/A5)',
    flow: 'A2 배치도 (플로우레일)',
    tent: 'A5 배치도 (야외텐트)',
    inventory: '재고 및 안전재고',
    rack3d: '3D 랙 인스펙터',
    scanner: 'QR 스캔 입출고',
    logs: '입출고 이력',
    aging: 'FIFO / 에이징',
    printer: '라벨 인쇄',
    master: '기준 정보 & 설정',
    subtitle: 'LGETH Warehouse Automation',
    totalCapacity: '총 용량:',
  }
};

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
  language = 'th',
  setLanguage,
  isDarkMode = false,
  toggleDarkMode,
  themeMode = 'light',
  setThemeMode,
}) => {
  const t = translations[language] || translations['th'];
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  const activeFacility = facilities.find(f => f.id === activeFacilityId);

  const navItems = [
    { id: 'campus_overview', label: t.campus, icon: Warehouse, badge: 'SITE' },
    { id: 'layout', label: t.layout, icon: Map, badge: 'A4' },
    { id: 'flow_floor', label: t.flow, icon: GitCommit, badge: 'A2' },
    { id: 'tent_layout', label: t.tent, icon: Tent, badge: 'A5' },
    { id: 'inventory', label: t.inventory, icon: ShieldAlert, count: lowStockCount },
    { id: 'rack3d', label: t.rack3d, icon: Layers, badge: '3D' },
    { id: 'scanner', label: t.scanner, icon: QrCode },
    { id: 'logs', label: t.logs, icon: ListFilter },
    { id: 'aging', label: t.aging, icon: ClockAlert, count: agingCount },
    { id: 'printer', label: t.printer, icon: Printer },
    { id: 'master', label: t.master, icon: Box },
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
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setActiveTab('campus_overview')}>
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
              setActiveTab('campus_overview');
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
                <span>{activeFacility ? `${activeFacility.code} จุ:` : 'ความจุรวมทุกคลัง:'}</span>
              </span>
              <span className="text-emerald-400 font-bold">
                {activeFacility 
                  ? `${activeFacility.totalCapacityPallets} Pallets` 
                  : `${facilities.reduce((acc, f) => acc + f.totalCapacityPallets, 0) || 680} Pallets`}
              </span>
            </div>
          )}

          <div className={`flex items-center ${isCollapsed ? 'flex-col space-y-2' : 'justify-between space-x-1'}`}>
            {/* Language Selector */}
            {!isCollapsed ? (
              <select
                className="bg-slate-800 text-slate-300 border border-slate-700/80 rounded-lg px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer w-full"
                value={language}
                onChange={(e) => setLanguage && setLanguage(e.target.value)}
              >
                <option value="th">🇹🇭 TH</option>
                <option value="en">🇬🇧 EN</option>
                <option value="kh">🇰🇭 KH</option>
                <option value="mm">🇲🇲 MM</option>
                <option value="kr">🇰🇷 KR</option>
              </select>
            ) : null}

            <div className="flex items-center space-x-1">
              {/* Theme Mode Toggle (Light / Dark / HDMI) */}
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
                    title="มืด True Black (Dark Mode)"
                  >
                    <Moon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setThemeMode('hdmi')}
                    className={`p-1.5 rounded-md transition-all ${
                      themeMode === 'hdmi' ? 'bg-sky-400 text-slate-950 font-bold shadow ring-1 ring-sky-300' : 'text-slate-400 hover:text-white'
                    }`}
                    title="HDMI Monitor (TV High Contrast Mode)"
                  >
                    <Tv className="w-3.5 h-3.5" />
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
