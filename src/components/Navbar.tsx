import React, { useState } from 'react';
import { 
  Box, 
  Layers, 
  QrCode, 
  ListFilter, 
  ClockAlert, 
  Sparkles, 
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
  ArrowRightLeft
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenScanner: () => void;
  onOpenIntegration?: () => void;
  agingCount: number;
  lowStockCount?: number;
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
    dashboard: 'ภาพรวม (KPIs & Trends)',
    layout: 'แผนผัง Layout 2D & 3D',
    inventory: 'ค้นหา & Safety Stock',
    rack3d: '3D Rack Inspector (4 ชั้น)',
    scanner: 'สแกน QR รับ-เบิก',
    logs: 'รายการเบิก-รับ',
    aging: 'คุม FIFO & Aging',
    recommendations: 'ข้อเสนอแนะปรับปรุง',
    printer: 'พิมพ์ป้าย Label',
    subtitle: 'คลังสินค้าหลัก > โซน A-J (3D Rack & FIFO)',
    totalCapacity: 'ความจุรวม:',
  },
  en: {
    dashboard: 'Overview (KPIs & Trends)',
    layout: '2D & 3D Layout Map',
    inventory: 'Search & Safety Stock',
    rack3d: '3D Rack Inspector',
    scanner: 'QR Scan In/Out',
    logs: 'Movement Logs',
    aging: 'FIFO & Aging',
    recommendations: 'Recommendations',
    printer: 'Print Labels',
    subtitle: 'Main Warehouse > Zone A-J',
    totalCapacity: 'Total Cap:',
  },
  kh: {
    dashboard: 'ទិដ្ឋភាពទូទៅ',
    layout: 'ផែនទី Layout 2D & 3D',
    inventory: 'ស្វែងរក & ស្តុកសុវត្ថិភាព',
    rack3d: 'អ្នកត្រួតពិនិត្យធ្នើរ 3D',
    scanner: 'ស្កេន QR ចូល/ចេញ',
    logs: 'កំណត់ហេតុចលនា',
    aging: 'FIFO & ចាស់',
    recommendations: 'អនុសាសន៍',
    printer: 'បោះពុម្ពស្លាក',
    subtitle: 'ឃ្លាំងមេ > តំបន់ A-J',
    totalCapacity: 'សមត្ថភាពសរុប:',
  },
  mm: {
    dashboard: 'ခြုံငုံသုံးသပ်ချက်',
    layout: '2D & 3D အပြင်အဆင် မြေပုံ',
    inventory: 'ရှာဖွေရန်နှင့် ဘေးကင်းလုံခြုံရေး',
    rack3d: '3D စင်စစ်ဆေးသူ',
    scanner: 'QR စကင်ဖတ်ရန်',
    logs: 'လှုပ်ရှားမှုမှတ်တမ်းများ',
    aging: 'FIFO နှင့် အိုမင်းခြင်း',
    recommendations: 'အကြံပြုချက်များ',
    printer: 'တံဆိပ်များရိုက်နှိပ်ရန်',
    subtitle: 'ပင်မဂိုဒေါင် > ဇုန် A-J',
    totalCapacity: 'စုစုပေါင်းစွမ်းရည်:',
  },
  kr: {
    dashboard: '개요 (KPIs & Trends)',
    layout: '2D & 3D 레이아웃 지도',
    inventory: '검색 및 안전 재고',
    rack3d: '3D 랙 검사기',
    scanner: 'QR 스캔 입출고',
    logs: '이동 로그',
    aging: 'FIFO 및 노후화',
    recommendations: '권장 사항',
    printer: '라벨 인쇄',
    subtitle: '메인 창고 > 구역 A-J',
    totalCapacity: '총 용량:',
  }
};

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenScanner,
  onOpenIntegration,
  agingCount,
  lowStockCount = 0,
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

  const navItems = [
    { id: 'dashboard', label: t.dashboard, icon: Warehouse },
    { id: 'layout', label: t.layout, icon: Map, badge: 'MAP' },
    { id: 'inventory', label: t.inventory, icon: ShieldAlert, count: lowStockCount },
    { id: 'rack3d', label: t.rack3d, icon: Layers, badge: '3D' },
    { id: 'scanner', label: t.scanner, icon: QrCode },
    { id: 'logs', label: t.logs, icon: ListFilter },
    { id: 'aging', label: t.aging, icon: ClockAlert, count: agingCount },
    { id: 'recommendations', label: t.recommendations, icon: Sparkles },
    { id: 'printer', label: t.printer, icon: Printer },
    { id: 'master', label: 'Master List', icon: Box },
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
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-xs">
              WMS
            </div>
            <span className="font-bold text-sm tracking-tight text-white">WMS Pro</span>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          {onOpenIntegration && (
            <button
              onClick={onOpenIntegration}
              className="flex items-center space-x-1 bg-purple-600/90 hover:bg-purple-500 text-white text-[11px] px-2.5 py-1.5 rounded-lg font-bold shadow border border-purple-400/30"
              title="Odoo & OneDrive Bi-directional API Sync"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Odoo / OneDrive</span>
            </button>
          )}

          <button
            onClick={onOpenScanner}
            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg font-bold shadow"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>สแกน QR</span>
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
        className={`fixed md:sticky top-0 left-0 z-50 h-screen bg-slate-900 border-r border-slate-800 text-white flex flex-col justify-between transition-all duration-300 shadow-xl ${
          isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed ? 'md:w-16' : 'md:w-64'}`}
      >
        {/* Sidebar Header & Brand */}
        <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between">
          <div
            onClick={() => {
              setActiveTab('dashboard');
              setIsMobileOpen(false);
            }}
            className="flex items-center space-x-3 cursor-pointer overflow-hidden text-left"
          >
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-md">
              <Box className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <div className="truncate">
                <div className="flex items-center space-x-1.5">
                  <span className="font-extrabold text-base tracking-tight text-white">WMS Pro</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                    SMART
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
            title={isCollapsed ? 'ขยายแถบเมนู (Expand)' : 'ซ่อนแถบเมนู (Collapse)'}
          >
            {isCollapsed ? <PanelLeftOpen className="w-4 h-4 text-blue-400" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Quick Actions (QR Scan & Integration) */}
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

          {onOpenIntegration && (
            <button
              onClick={() => {
                onOpenIntegration();
                setIsMobileOpen(false);
              }}
              className={`w-full flex items-center justify-center space-x-2 bg-slate-800 hover:bg-purple-900/40 text-purple-300 border border-purple-500/30 font-bold rounded-xl py-2 transition-all shadow-sm active:scale-95 ${
                isCollapsed ? 'px-2' : 'px-3'
              }`}
              title="ตั้งค่า Odoo ERP & OneDrive Sync"
            >
              <ArrowRightLeft className="w-4 h-4 shrink-0 text-purple-400" />
              {!isCollapsed && <span className="text-[11px] truncate">Odoo & OneDrive API</span>}
            </button>
          )}
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
                <span>ความจุ:</span>
              </span>
              <span className="text-emerald-400 font-bold">680 Pallets</span>
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
