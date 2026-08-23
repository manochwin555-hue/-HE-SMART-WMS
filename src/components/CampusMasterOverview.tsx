import React, { useState, useMemo } from 'react';
import { InventoryItem, MovementType, ShelfLevel, StorageZone, WarehouseFacility } from '../types';
import { 
  Building2, 
  Layers, 
  GitCommit, 
  LayoutGrid, 
  Box, 
  ArrowUpRight, 
  Compass, 
  Search, 
  X, 
  MapPin, 
  TrendingUp, 
  ChevronRight, 
  ShieldCheck, 
  ClockAlert, 
  Activity, 
  BarChart3, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Maximize2,
  Tent,
  Sparkles,
  Truck,
  RotateCcw,
  MousePointerClick,
  Info
} from 'lucide-react';
import { RackLayout2D } from './RackLayout2D';
import { FlowRailFloorMap } from './FlowRailFloorMap';
import { A5TentFloorStagingMap } from './A5TentFloorStagingMap';
import { DynamicLegendPanel } from './DynamicLegendPanel';

interface CampusMasterOverviewProps {
  items: InventoryItem[];
  facilities?: WarehouseFacility[];
  searchQuery?: string;
  onNavigateToBuilding?: (buildingId: string) => void;
  onNavigateToZone: (target: 'A4_MACRO' | 'A4_RACK' | 'A4_FLOOR' | 'A4_3D' | 'A2_RAIL' | 'A2_MACRO' | 'A2_SPLIT' | 'A5_TENT' | 'A5_MACRO') => void;
  onOpenScanner?: (zone: StorageZone, bay: number, level: ShelfLevel, mode: MovementType) => void;
  onOpen3D?: (zone: StorageZone, bay: number) => void;
  onRelocateItem?: (item: InventoryItem) => void;
}

export type CampusViewTab = 'CAMPUS_ALL' | 'A4_FULL' | 'A2_FULL' | 'A5_FULL';

export const CampusMasterOverview: React.FC<CampusMasterOverviewProps> = ({
  items,
  facilities = [],
  searchQuery = '',
  onNavigateToBuilding,
  onNavigateToZone,
  onOpenScanner,
  onOpen3D,
  onRelocateItem
}) => {
  const [activeCampusTab, setActiveCampusTab] = useState<CampusViewTab>('CAMPUS_ALL');
  const [a4SubTab, setA4SubTab] = useState<'ALL' | 'MACRO' | 'RACK' | 'FLOOR' | '3D'>('ALL');
  const [selectedTentNumber, setSelectedTentNumber] = useState<number>(1);
  const [localSearch, setLocalSearch] = useState<string>(searchQuery);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);

  const activeQuery = localSearch.trim().toLowerCase();

  // Purple Zones (DA4D-2: 480P) and Orange Zones (DA4D-3: 200P)
  const purpleZones: StorageZone[] = ['B', 'C', 'D', 'E', 'F'];
  const orangeZones: StorageZone[] = ['G', 'H', 'I', 'J', 'K'];
  const floorXGroups = ['X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'X8'];

  // Campus Metrics Calculations
  const campusStats = useMemo(() => {
    // 1. A4 Building Items
    const a4RackItems = items.filter(it => 
      purpleZones.includes(it.zone) || 
      orangeZones.includes(it.zone) ||
      it.storageType === 'RACK' ||
      it.locatorCode.startsWith('DA4D-2.') ||
      it.locatorCode.startsWith('DA4D-3.') ||
      it.locatorCode.startsWith('DA4D-2-') ||
      it.locatorCode.startsWith('DA4D-3-')
    );
    const a4RackCapacity = 680; // 480 (B-F) + 200 (G-K)
    const a4RackOccupied = a4RackItems.length;

    // A4 Floor Items (DA4D-1 X1-X8)
    const a4FloorItems = items.filter(it => 
      floorXGroups.includes(it.zone) ||
      it.storageType === 'FLOOR_STAGING' ||
      it.locatorCode.startsWith('DA4D-1-') ||
      it.locatorCode.startsWith('DA4D-1.01-')
    );
    const a4FloorCapacity = 432; // X1-X4: 168 + X5-X7: 216 + X8: 48 = 432
    const a4FloorOccupied = a4FloorItems.length;

    const a4TotalCapacity = a4RackCapacity + a4FloorCapacity; // 1,112 Pallets
    const a4TotalOccupied = a4RackOccupied + a4FloorOccupied;
    const a4OccupancyPercent = Math.round((a4TotalOccupied / a4TotalCapacity) * 100);

    // Specific zone counts
    const da4d2Count = items.filter(it => purpleZones.includes(it.zone) || it.locatorCode.startsWith('DA4D-2')).length;
    const da4d3Count = items.filter(it => orangeZones.includes(it.zone) || it.locatorCode.startsWith('DA4D-3')).length;

    // 2. A2 Building Items (DA2D-1 Flow Rail R1-R20)
    const a2Items = items.filter(it => 
      it.zone.startsWith('R') ||
      it.zone.startsWith('FR') ||
      it.storageType === 'FLOW_RAIL' ||
      it.locatorCode.startsWith('DA2D-1-') ||
      it.facilityId === 'FAC-A2-RAIL'
    );
    const a2Capacity = 160; // 20 rails x 8 positions
    const a2Occupied = a2Items.length;
    const a2OccupancyPercent = Math.round((a2Occupied / a2Capacity) * 100);

    // 3. A5 Tent Items (DA5T-1, DA5T-2, DA5T-3, DA5T-4)
    const a5Items = items.filter(it =>
      it.facilityId === 'FAC-A5-TENT' ||
      it.locatorCode.includes('DA5T') ||
      (it.zone && it.zone.startsWith('T'))
    );
    const a5Capacity = 784; // 4 Tents x 7 Groups x 28 Slots (196 x 4)
    const a5Occupied = a5Items.length;
    const a5OccupancyPercent = Math.round((a5Occupied / a5Capacity) * 100);

    // Per Tent counts
    const tent1Count = items.filter(it => it.locatorCode.includes('DA5T-1')).length;
    const tent2Count = items.filter(it => it.locatorCode.includes('DA5T-2')).length;
    const tent3Count = items.filter(it => it.locatorCode.includes('DA5T-3')).length;
    const tent4Count = items.filter(it => it.locatorCode.includes('DA5T-4')).length;

    // Overall Campus
    const totalCampusCapacity = a4TotalCapacity + a2Capacity + a5Capacity; // 2,056 Pallets
    const totalCampusOccupied = a4TotalOccupied + a2Occupied + a5Occupied;
    const totalCampusPercent = Math.round((totalCampusOccupied / totalCampusCapacity) * 100);

    return {
      a4TotalCapacity,
      a4TotalOccupied,
      a4OccupancyPercent,
      a4RackCapacity,
      a4RackOccupied,
      a4RackPercent: Math.round((a4RackOccupied / a4RackCapacity) * 100),
      da4d2Count,
      da4d3Count,
      a4FloorCapacity,
      a4FloorOccupied,
      a4FloorPercent: Math.round((a4FloorOccupied / a4FloorCapacity) * 100),
      a2Capacity,
      a2Occupied,
      a2OccupancyPercent,
      a5Capacity,
      a5Occupied,
      a5OccupancyPercent,
      tent1Count,
      tent2Count,
      tent3Count,
      tent4Count,
      totalCampusCapacity,
      totalCampusOccupied,
      totalCampusPercent
    };
  }, [items]);

  // Check matching items for search
  const matchedItemCount = useMemo(() => {
    if (!activeQuery) return 0;
    return items.filter(it => 
      it.modelHE.toLowerCase().includes(activeQuery) ||
      it.partName.toLowerCase().includes(activeQuery) ||
      it.locatorCode.toLowerCase().includes(activeQuery) ||
      it.qrCode.toLowerCase().includes(activeQuery)
    ).length;
  }, [items, activeQuery]);

  // Helper navigate to zone functions
  const openA2FlowRail = () => {
    setActiveCampusTab('A2_FULL');
  };

  const openA4Rack = (zoneFocus?: 'B-F' | 'G-K') => {
    setActiveCampusTab('A4_FULL');
    setA4SubTab('RACK');
  };

  const openA4Floor = () => {
    setActiveCampusTab('A4_FULL');
    setA4SubTab('FLOOR');
  };

  const openA5Tent = (tentNum: number) => {
    setSelectedTentNumber(tentNum);
    setActiveCampusTab('A5_FULL');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-5 shadow-xs text-slate-900 space-y-5 min-w-0 max-w-full w-full">
      
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & INTERACTIVE NAVIGATION BAR                                */}
      {/* ========================================================================= */}
      <div className="space-y-3.5 border-b border-slate-200 pb-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2.5 flex-wrap">
              <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900">
                    ผังรวมอาคารคลังสินค้า (Campus Master Blueprint)
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-900 border border-blue-200">
                    ความจุรวมทั้งแคมปัส {campusStats.totalCampusCapacity.toLocaleString()} พาเลท
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                  <MousePointerClick className="w-3.5 h-3.5 text-blue-600 inline" />
                  <span className="font-semibold text-slate-700">คำแนะนำ:</span>
                  <span>คลิกที่แต่ละกล่องโซนในผังเพื่อเปิดเข้าดูรายละเอียดและจัดการสต็อกของโซนนั้นได้ทันที</span>
                </p>
              </div>
            </div>
          </div>

          {/* Quick Search across whole Campus */}
          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="ค้นหา P/No, Model, Locator ทุกอาคาร..."
              className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-blue-500 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-all shadow-2xs"
            />
            {localSearch && (
              <button
                onClick={() => setLocalSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {activeQuery && (
              <span className="absolute -bottom-5 right-1 text-[10px] text-blue-600 font-bold">
                พบ {matchedItemCount} รายการตรงคำค้น
              </span>
            )}
          </div>
        </div>

        {/* Multi-Building Capacity KPI Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          {/* Total Campus Capacity */}
          <div 
            onClick={() => setActiveCampusTab('CAMPUS_ALL')}
            className={`p-3 rounded-xl text-center border-2 transition-all cursor-pointer shadow-xs ${
              activeCampusTab === 'CAMPUS_ALL'
                ? 'bg-slate-900 text-white border-blue-500 ring-2 ring-blue-400'
                : 'bg-slate-900 text-white border-slate-800 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold mb-1">
              <span>🌐 แคมปัสรวม (A4+A2+A5)</span>
              <span className="font-mono text-blue-400 font-black">{campusStats.totalCampusPercent}%</span>
            </div>
            <span className="text-base sm:text-lg font-black font-mono tracking-tight block">
              {campusStats.totalCampusCapacity.toLocaleString()} P
            </span>
            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
              <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${campusStats.totalCampusPercent}%` }} />
            </div>
            <span className="text-[9px] text-slate-300 block font-medium mt-1">
              จัดเก็บ {campusStats.totalCampusOccupied} / ว่าง {campusStats.totalCampusCapacity - campusStats.totalCampusOccupied} P
            </span>
          </div>

          {/* A4 Building Total */}
          <div 
            onClick={() => {
              setActiveCampusTab('A4_FULL');
              setA4SubTab('ALL');
            }}
            className={`p-3 rounded-xl text-center border-2 transition-all cursor-pointer shadow-xs ${
              activeCampusTab === 'A4_FULL'
                ? 'bg-blue-50/90 border-blue-600 ring-2 ring-blue-400'
                : 'bg-white border-slate-200 hover:border-blue-400 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] text-slate-600 font-bold mb-1">
              <span>🏢 อาคาร A4 (แร็ค+พื้น)</span>
              <span className="font-mono text-blue-700 font-black">{campusStats.a4OccupancyPercent}%</span>
            </div>
            <span className="text-base sm:text-lg font-black font-mono tracking-tight text-slate-900 block">
              {campusStats.a4TotalCapacity} P
            </span>
            <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1.5 overflow-hidden">
              <div className="bg-blue-600 h-full rounded-full transition-all" style={{ width: `${campusStats.a4OccupancyPercent}%` }} />
            </div>
            <span className="text-[9px] text-slate-500 block font-medium mt-1">
              แร็ค {campusStats.a4RackOccupied}/680 • พื้น {campusStats.a4FloorOccupied}/432
            </span>
          </div>

          {/* A2 Building Total */}
          <div 
            onClick={() => setActiveCampusTab('A2_FULL')}
            className={`p-3 rounded-xl text-center border-2 transition-all cursor-pointer shadow-xs ${
              activeCampusTab === 'A2_FULL'
                ? 'bg-amber-50/90 border-amber-600 ring-2 ring-amber-400'
                : 'bg-white border-slate-200 hover:border-amber-400 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] text-slate-600 font-bold mb-1">
              <span>🏢 อาคาร A2 (Flow Rail)</span>
              <span className="font-mono text-amber-700 font-black">{campusStats.a2OccupancyPercent}%</span>
            </div>
            <span className="text-base sm:text-lg font-black font-mono tracking-tight text-slate-900 block">
              {campusStats.a2Capacity} P
            </span>
            <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1.5 overflow-hidden">
              <div className="bg-amber-500 h-full rounded-full transition-all" style={{ width: `${campusStats.a2OccupancyPercent}%` }} />
            </div>
            <span className="text-[9px] text-slate-500 block font-medium mt-1">
              20 ราง • จัดเก็บ {campusStats.a2Occupied}/160 P
            </span>
          </div>

          {/* A5 Tent Total */}
          <div 
            onClick={() => {
              setActiveCampusTab('A5_FULL');
              setSelectedTentNumber(1);
            }}
            className={`p-3 rounded-xl text-center border-2 transition-all cursor-pointer shadow-xs ${
              activeCampusTab === 'A5_FULL'
                ? 'bg-emerald-50/90 border-emerald-600 ring-2 ring-emerald-400'
                : 'bg-white border-slate-200 hover:border-emerald-400 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] text-slate-600 font-bold mb-1">
              <span>⛺ เต็นท์ A5 (Tent 1-4)</span>
              <span className="font-mono text-emerald-700 font-black">{campusStats.a5OccupancyPercent}%</span>
            </div>
            <span className="text-base sm:text-lg font-black font-mono tracking-tight text-slate-900 block">
              {campusStats.a5Capacity} P
            </span>
            <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1.5 overflow-hidden">
              <div className="bg-emerald-600 h-full rounded-full transition-all" style={{ width: `${campusStats.a5OccupancyPercent}%` }} />
            </div>
            <span className="text-[9px] text-slate-500 block font-medium mt-1">
              4 เต็นท์ • จัดเก็บ {campusStats.a5Occupied}/784 P
            </span>
          </div>
        </div>

        {/* View Switcher Tabs - Instant In-Page Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <div className="flex flex-wrap items-center gap-1 font-bold">
            <button
              id="btn-nav-campus-all"
              onClick={() => setActiveCampusTab('CAMPUS_ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
                activeCampusTab === 'CAMPUS_ALL'
                  ? 'bg-blue-600 text-white shadow-xs font-black'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>🗺️ ผังรวม 3 อาคาร (Campus Master Blueprint)</span>
            </button>
            <button
              id="btn-nav-a4-full"
              onClick={() => {
                setActiveCampusTab('A4_FULL');
                setA4SubTab('ALL');
              }}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
                activeCampusTab === 'A4_FULL'
                  ? 'bg-blue-600 text-white shadow-xs font-black'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>🏢 ผังอาคาร A4 (แร็ค 680P + พื้น 432P)</span>
            </button>
            <button
              id="btn-nav-a2-full"
              onClick={() => setActiveCampusTab('A2_FULL')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
                activeCampusTab === 'A2_FULL'
                  ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              <GitCommit className="w-3.5 h-3.5" />
              <span>🛤️ ผังอาคาร A2 (Flow Rail 160P)</span>
            </button>
            <button
              id="btn-nav-a5-full"
              onClick={() => {
                setActiveCampusTab('A5_FULL');
                setSelectedTentNumber(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
                activeCampusTab === 'A5_FULL'
                  ? 'bg-emerald-600 text-white shadow-xs font-black'
                  : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
              }`}
            >
              <Tent className="w-3.5 h-3.5" />
              <span>⛺ ผังอาคาร A5 &amp; เต็นท์ 1-4 (784P)</span>
            </button>
          </div>

          {/* Quick Return to Master Blueprint Button when in subview */}
          {activeCampusTab !== 'CAMPUS_ALL' && (
            <button
              id="btn-back-to-campus"
              onClick={() => setActiveCampusTab('CAMPUS_ALL')}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-[11px] font-bold flex items-center space-x-1 shadow-2xs transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>กลับสู่ผังรวม 3 อาคาร</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: CAMPUS MASTER BLUEPRINT (EXACT LAYOUT FROM USER'S ARCHITECTURAL IMAGE) */}
      {/* ========================================================================= */}
      {activeCampusTab === 'CAMPUS_ALL' && (
        <div className="space-y-4 animate-fadeIn">
          
          {/* Blueprint Canvas Container */}
          <div className="bg-slate-50/70 border-2 border-slate-300 rounded-2xl p-3 sm:p-6 shadow-inner overflow-x-auto">
            <div className="min-w-[960px] max-w-[1400px] mx-auto grid grid-cols-12 gap-5 items-start">
              
              {/* ================================================================= */}
              {/* 1. A2 BUILDING (Left Column)                                      */}
              {/* ================================================================= */}
              <div 
                id="blueprint-card-a2-building"
                className="col-span-3 bg-white border-2 border-slate-900 rounded-lg shadow-md relative flex flex-col justify-between"
                style={{ minHeight: '620px' }}
              >
                {/* Yellow Door / Dock Tabs on Left Wall (3 Tabs) */}
                <div className="absolute -left-2 top-24 w-3.5 h-9 bg-amber-200 border-2 border-amber-600 rounded-xs shadow-xs z-10" title="Dock / Door 1" />
                <div className="absolute -left-2 top-60 w-3.5 h-9 bg-amber-200 border-2 border-amber-600 rounded-xs shadow-xs z-10" title="Dock / Door 2" />
                <div className="absolute -left-2 bottom-24 w-3.5 h-9 bg-amber-200 border-2 border-amber-600 rounded-xs shadow-xs z-10" title="Dock / Door 3" />

                {/* Yellow Door / Dock Tabs on Right Wall (3 Tabs) */}
                <div className="absolute -right-2 top-24 w-3.5 h-9 bg-amber-200 border-2 border-amber-600 rounded-xs shadow-xs z-10" title="Transfer Gate 1" />
                <div className="absolute -right-2 top-60 w-3.5 h-9 bg-amber-200 border-2 border-amber-600 rounded-xs shadow-xs z-10" title="Transfer Gate 2" />
                <div className="absolute -right-2 bottom-24 w-3.5 h-9 bg-amber-200 border-2 border-amber-600 rounded-xs shadow-xs z-10" title="Transfer Gate 3" />

                {/* Building Title Header */}
                <div className="pt-4 pb-2 text-center border-b border-slate-100">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                    A2 Building
                  </h3>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 inline-block mt-0.5">
                    ความจุ 160 พาเลท (Flow Rail)
                  </span>
                </div>

                {/* Inner Dashed Working Zone (Blue border box from drawing) */}
                <div className="px-3 py-2 flex-1 flex flex-col justify-between">
                  <div className="border-2 border-dashed border-blue-400 bg-blue-50/30 rounded-lg p-2.5 flex-1 flex flex-col justify-between relative space-y-4">
                    
                    {/* TOP STORAGE ZONE: วางราง DA2D-1 R1- R20 (CLICKABLE) */}
                    <div 
                      id="zone-a2-flow-rail-r1-r20"
                      onClick={openA2FlowRail}
                      onMouseEnter={() => setHoveredZone('A2_RAIL')}
                      onMouseLeave={() => setHoveredZone(null)}
                      className={`border-2 border-red-500 rounded-lg p-2 bg-red-50/30 cursor-pointer transition-all duration-200 group relative ${
                        hoveredZone === 'A2_RAIL' ? 'scale-[1.02] shadow-lg ring-2 ring-red-400 bg-red-50' : 'hover:shadow-md'
                      }`}
                      style={{ minHeight: '130px' }}
                    >
                      {/* Sub-grid pattern inside like blueprint */}
                      <div className="w-full h-full bg-blue-500/80 hover:bg-blue-600 border border-blue-600 rounded p-2 text-white flex flex-col items-center justify-center text-center shadow-xs transition-colors">
                        <span className="text-xs font-black tracking-wide leading-tight">
                          วางราง
                        </span>
                        <span className="text-xs font-mono font-black text-amber-200 mt-0.5">
                          DA2D-1
                        </span>
                        <span className="text-[11px] font-mono font-bold text-white mt-0.5">
                          R1- R20
                        </span>
                        
                        <div className="mt-2 bg-slate-950/70 px-2 py-0.5 rounded text-[9px] font-mono text-emerald-300 flex items-center space-x-1">
                          <span>จัดเก็บ {campusStats.a2Occupied} / 160 P</span>
                        </div>
                      </div>

                      {/* Floating Click Tooltip on Hover */}
                      <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md whitespace-nowrap z-20 pointer-events-none flex items-center space-x-1">
                        <span>👆 คลิกเปิดผังรางเลื่อน A2 (160P)</span>
                      </div>
                    </div>

                    {/* LOWER ZONE: HE Line (Machinery Drawing Schematic) */}
                    <div className="border border-slate-300 bg-white rounded-lg p-2 relative overflow-hidden flex flex-col items-center justify-center shadow-2xs" style={{ minHeight: '160px' }}>
                      {/* Machinery Blueprint Visual Background */}
                      <div className="w-full space-y-1.5 opacity-70">
                        <div className="flex justify-between items-center text-[8px] font-mono text-slate-400 border-b border-slate-200 pb-1">
                          <span>⚙️ Station A-01</span>
                          <span>⚙️ Station A-02</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          <div className="h-6 bg-slate-100 border border-slate-300 rounded-[2px] flex items-center justify-center text-[7px] font-mono text-slate-500">Robot 1</div>
                          <div className="h-6 bg-slate-100 border border-slate-300 rounded-[2px] flex items-center justify-center text-[7px] font-mono text-slate-500">Press 2</div>
                          <div className="h-6 bg-slate-100 border border-slate-300 rounded-[2px] flex items-center justify-center text-[7px] font-mono text-slate-500">Test 3</div>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full w-full" />
                        <div className="grid grid-cols-2 gap-1 pt-1">
                          <div className="h-5 bg-slate-100 border border-slate-300 rounded-[2px]" />
                          <div className="h-5 bg-slate-100 border border-slate-300 rounded-[2px]" />
                        </div>
                      </div>

                      {/* Semi-transparent Blue Overlay Box labeled "HE Line" */}
                      <div className="absolute inset-x-4 inset-y-6 bg-blue-500/75 rounded-md flex flex-col items-center justify-center text-white font-black shadow-sm backdrop-blur-[1px] pointer-events-none">
                        <span className="text-sm tracking-widest leading-none">HE</span>
                        <span className="text-xs tracking-wider leading-none mt-1">Line</span>
                        <span className="text-[8px] font-medium text-blue-100 mt-1">ไลน์ประกอบชิ้นส่วน</span>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Bottom Office (Light Blue full-width block) */}
                <div 
                  id="zone-a2-office"
                  className="bg-blue-100/90 border-t-2 border-dashed border-blue-400 py-3 text-center rounded-b-md"
                >
                  <span className="text-xs font-black text-blue-900 tracking-wider">
                    Office
                  </span>
                  <span className="text-[9px] text-blue-700 block font-medium">
                    ห้องควบคุมการผลิต A2
                  </span>
                </div>
              </div>

              {/* ================================================================= */}
              {/* 2. A4 BUILDING (Middle Column)                                    */}
              {/* ================================================================= */}
              <div 
                id="blueprint-card-a4-building"
                className="col-span-4 bg-white border-2 border-slate-900 rounded-lg shadow-md relative flex flex-col justify-between"
                style={{ minHeight: '620px' }}
              >
                {/* Yellow Door / Dock Tabs on Left Wall (3 Tabs) */}
                <div className="absolute -left-2 top-24 w-3.5 h-9 bg-amber-200 border-2 border-amber-600 rounded-xs shadow-xs z-10" title="Dock / Door 1" />
                <div className="absolute -left-2 top-60 w-3.5 h-9 bg-amber-200 border-2 border-amber-600 rounded-xs shadow-xs z-10" title="Dock / Door 2" />
                <div className="absolute -left-2 bottom-24 w-3.5 h-9 bg-amber-200 border-2 border-amber-600 rounded-xs shadow-xs z-10" title="Dock / Door 3" />

                {/* Yellow Door / Dock Tabs on Right Wall (3 Tabs) */}
                <div className="absolute -right-2 top-24 w-3.5 h-9 bg-amber-200 border-2 border-amber-600 rounded-xs shadow-xs z-10" title="Transfer Gate 1" />
                <div className="absolute -right-2 top-60 w-3.5 h-9 bg-amber-200 border-2 border-amber-600 rounded-xs shadow-xs z-10" title="Transfer Gate 2" />
                <div className="absolute -right-2 bottom-24 w-3.5 h-9 bg-amber-200 border-2 border-amber-600 rounded-xs shadow-xs z-10" title="Transfer Gate 3" />

                {/* Building Title Header */}
                <div className="pt-4 pb-2 text-center border-b border-slate-100">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                    A4 Building
                  </h3>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 inline-block mt-0.5">
                    ความจุรวม 1,112 พาเลท (แร็ค 680P + วางพื้น 432P)
                  </span>
                </div>

                {/* Working Area Container */}
                <div className="px-3 py-2 flex-1 flex flex-col justify-between space-y-2">
                  
                  {/* Top Row: Rack DA4D-2 (B-F) and Rack DA4D-3 (G-K) */}
                  <div className="grid grid-cols-12 gap-2 items-start">
                    
                    {/* UPPER LEFT: Rack DA4D-2 B-F (CLICKABLE) */}
                    <div 
                      id="zone-a4-rack-da4d-2"
                      onClick={() => openA4Rack('B-F')}
                      onMouseEnter={() => setHoveredZone('DA4D_2')}
                      onMouseLeave={() => setHoveredZone(null)}
                      className={`col-span-7 border-2 border-red-500 rounded-lg p-2 bg-red-50/30 cursor-pointer transition-all duration-200 group relative ${
                        hoveredZone === 'DA4D_2' ? 'scale-[1.02] shadow-lg ring-2 ring-red-400 bg-red-50' : 'hover:shadow-md'
                      }`}
                      style={{ minHeight: '125px' }}
                    >
                      {/* Inner Blue Block with Label from Drawing */}
                      <div className="w-full h-full bg-blue-500/85 hover:bg-blue-600 border border-blue-600 rounded p-2 text-white flex flex-col items-center justify-center text-center shadow-xs transition-colors">
                        <span className="text-xs font-black tracking-wide leading-tight">
                          Rack
                        </span>
                        <span className="text-xs font-mono font-black text-amber-200 mt-0.5">
                          DA4D-2
                        </span>
                        <span className="text-[11px] font-mono font-bold text-white mt-0.5">
                          B-F
                        </span>
                        
                        <div className="mt-1.5 bg-slate-950/70 px-1.5 py-0.5 rounded text-[8px] font-mono text-emerald-300 flex items-center space-x-1">
                          <span>จัดเก็บ {campusStats.da4d2Count} / 480 P</span>
                        </div>
                      </div>

                      {/* Tooltip on Hover */}
                      <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md whitespace-nowrap z-20 pointer-events-none flex items-center space-x-1">
                        <span>👆 คลิกเปิดผังแร็ค B-F (480P)</span>
                      </div>
                    </div>

                    {/* UPPER RIGHT: Rack DA4D-3 G-K (CLICKABLE) */}
                    <div 
                      id="zone-a4-rack-da4d-3"
                      onClick={() => openA4Rack('G-K')}
                      onMouseEnter={() => setHoveredZone('DA4D_3')}
                      onMouseLeave={() => setHoveredZone(null)}
                      className={`col-span-5 border-2 border-red-500 rounded-lg p-2 bg-red-50/30 cursor-pointer transition-all duration-200 group relative ${
                        hoveredZone === 'DA4D_3' ? 'scale-[1.02] shadow-lg ring-2 ring-red-400 bg-red-50' : 'hover:shadow-md'
                      }`}
                      style={{ minHeight: '125px' }}
                    >
                      {/* Inner Blue Block with Label */}
                      <div className="w-full h-full bg-blue-500/85 hover:bg-blue-600 border border-blue-600 rounded p-1.5 text-white flex flex-col items-center justify-center text-center shadow-xs transition-colors">
                        <span className="text-xs font-black tracking-wide leading-tight">
                          Rack
                        </span>
                        <span className="text-xs font-mono font-black text-amber-200 mt-0.5">
                          DA4D-3
                        </span>
                        <span className="text-[11px] font-mono font-bold text-white mt-0.5">
                          G- K
                        </span>
                        
                        <div className="mt-1.5 bg-slate-950/70 px-1 py-0.5 rounded text-[8px] font-mono text-emerald-300 flex items-center space-x-1">
                          <span>{campusStats.da4d3Count} / 200 P</span>
                        </div>
                      </div>

                      {/* Tooltip on Hover */}
                      <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md whitespace-nowrap z-20 pointer-events-none flex items-center space-x-1">
                        <span>👆 คลิกเปิดแร็ค G-K (200P)</span>
                      </div>
                    </div>

                  </div>

                  {/* Middle Row: DA4D-1 X1-X8 (Yellow Background + Blue Block) AND HE Line */}
                  <div className="grid grid-cols-12 gap-2 items-stretch flex-1 pt-1">
                    
                    {/* MIDDLE LEFT: วางพื้น DA4D-1 X1 – X8 (Yellow Box + Clickable Blue Box) */}
                    <div 
                      id="zone-a4-floor-da4d-1"
                      onClick={openA4Floor}
                      onMouseEnter={() => setHoveredZone('DA4D_1')}
                      onMouseLeave={() => setHoveredZone(null)}
                      className={`col-span-7 bg-amber-100/75 border-2 border-dashed border-amber-400 rounded-lg p-2.5 flex flex-col justify-between cursor-pointer transition-all duration-200 group relative ${
                        hoveredZone === 'DA4D_1' ? 'scale-[1.02] shadow-lg ring-2 ring-amber-500 bg-amber-100' : 'hover:shadow-md'
                      }`}
                      style={{ minHeight: '220px' }}
                    >
                      <div className="flex justify-between items-center text-[9px] font-bold text-amber-900 border-b border-amber-300/60 pb-1">
                        <span>ลานวางพื้นสีเหลือง</span>
                        <span className="font-mono text-amber-950">432 P</span>
                      </div>

                      {/* Inner Blue Box exactly as drawing */}
                      <div className="bg-blue-500/85 group-hover:bg-blue-600 border border-blue-600 rounded-lg p-3 text-white flex flex-col items-center justify-center text-center shadow-xs transition-colors my-auto">
                        <span className="text-xs font-black tracking-wide leading-tight">
                          วางพื้น
                        </span>
                        <span className="text-xs font-mono font-black text-amber-200 mt-0.5">
                          DA4D-1
                        </span>
                        <span className="text-[11px] font-mono font-bold text-white mt-0.5">
                          X1 – X8
                        </span>

                        <div className="mt-2 bg-slate-950/70 px-2 py-0.5 rounded text-[9px] font-mono text-emerald-300">
                          จัดเก็บ {campusStats.a4FloorOccupied} / 432 P
                        </div>
                      </div>

                      {/* 8 Column Tags Preview */}
                      <div className="grid grid-cols-4 gap-0.5 text-[8px] font-mono text-center pt-1 text-amber-900 font-bold">
                        <span className="bg-amber-200/80 rounded py-0.5">X8</span>
                        <span className="bg-amber-200/80 rounded py-0.5">X7</span>
                        <span className="bg-amber-200/80 rounded py-0.5">X6</span>
                        <span className="bg-amber-200/80 rounded py-0.5">X5</span>
                        <span className="bg-amber-200/80 rounded py-0.5">X4</span>
                        <span className="bg-amber-200/80 rounded py-0.5">X3</span>
                        <span className="bg-amber-200/80 rounded py-0.5">X2</span>
                        <span className="bg-amber-200/80 rounded py-0.5">X1</span>
                      </div>

                      {/* Tooltip on Hover */}
                      <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md whitespace-nowrap z-20 pointer-events-none flex items-center space-x-1">
                        <span>👆 คลิกเปิดผังวางพื้น X1-X8 (432P)</span>
                      </div>
                    </div>

                    {/* MIDDLE RIGHT: HE Line (Assembly Machinery Drawing Schematic) */}
                    <div className="col-span-5 border border-slate-300 bg-white rounded-lg p-2 relative overflow-hidden flex flex-col items-center justify-center shadow-2xs" style={{ minHeight: '220px' }}>
                      {/* Machinery Schematic Illustration */}
                      <div className="w-full h-full flex flex-col justify-between opacity-70 py-1">
                        <div className="flex justify-between items-center text-[7px] font-mono text-slate-400">
                          <span>⚙️ Station 1</span>
                          <span>⚙️ Station 2</span>
                        </div>
                        <div className="space-y-1">
                          <div className="h-4 bg-slate-100 border border-slate-300 rounded-[2px]" />
                          <div className="h-4 bg-slate-100 border border-slate-300 rounded-[2px]" />
                          <div className="h-4 bg-slate-100 border border-slate-300 rounded-[2px]" />
                        </div>
                        <div className="flex justify-between items-center text-[7px] font-mono text-slate-400">
                          <span>⚙️ Station 3</span>
                          <span>⚙️ Station 4</span>
                        </div>
                        <div className="space-y-1">
                          <div className="h-4 bg-slate-100 border border-slate-300 rounded-[2px]" />
                          <div className="h-4 bg-slate-100 border border-slate-300 rounded-[2px]" />
                        </div>
                      </div>

                      {/* Semi-transparent Blue Overlay Box labeled "HE Line" */}
                      <div className="absolute inset-x-2 inset-y-8 bg-blue-500/75 rounded-md flex flex-col items-center justify-center text-white font-black shadow-sm backdrop-blur-[1px] pointer-events-none text-center">
                        <span className="text-sm tracking-widest leading-none">HE</span>
                        <span className="text-xs tracking-wider leading-none mt-1">Lin</span>
                        <span className="text-xs tracking-wider leading-none">e</span>
                        <span className="text-[7px] font-medium text-blue-100 mt-1">Main Line</span>
                      </div>
                    </div>

                  </div>

                </div>

                {/* Bottom Office (Light Blue full-width block) */}
                <div 
                  id="zone-a4-office"
                  className="bg-blue-100/90 border-t-2 border-dashed border-blue-400 py-3 text-center rounded-b-md mt-1"
                >
                  <span className="text-xs font-black text-blue-900 tracking-wider">
                    Office
                  </span>
                  <span className="text-[9px] text-blue-700 block font-medium">
                    ห้องควบคุมคลังสินค้า A4
                  </span>
                </div>
              </div>

              {/* ================================================================= */}
              {/* 3. A5 TENT FACILITY & YARD (Right Block with 4 Tents in 2x2 Grid) */}
              {/* ================================================================= */}
              <div 
                id="blueprint-card-a5-tents"
                className="col-span-5 border-2 border-dashed border-blue-400 bg-blue-50/20 rounded-xl p-3 sm:p-4 shadow-sm flex flex-col justify-between relative"
                style={{ minHeight: '620px' }}
              >
                {/* Header for A5 Tent Yard */}
                <div className="text-center pb-2 border-b border-blue-200">
                  <div className="flex items-center justify-center space-x-1.5">
                    <Tent className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                      A5 Tent Zone (ลานเต็นท์จัดเก็บ 4 หลัง)
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-300 inline-block mt-0.5">
                    ความจุรวม 784 พาเลท (4 เต็นท์ $\times$ 7 กลุ่ม $\times$ 28 ช่อง)
                  </span>
                </div>

                {/* 2x2 Grid of 4 Tents (Matching Image Layout Exactly: Top [Tent 2, Tent 4], Bottom [Tent 1, Tent 3]) */}
                <div className="grid grid-cols-2 gap-3.5 my-auto py-2">
                  
                  {/* ------------------------------------------------------------- */}
                  {/* TENT NO. 2 (TOP LEFT)                                         */}
                  {/* ------------------------------------------------------------- */}
                  <div 
                    id="tent-card-no-2"
                    onClick={() => openA5Tent(2)}
                    onMouseEnter={() => setHoveredZone('TENT_2')}
                    onMouseLeave={() => setHoveredZone(null)}
                    className={`bg-white border-2 border-red-600 rounded-md p-2 relative cursor-pointer transition-all duration-200 group ${
                      hoveredZone === 'TENT_2' ? 'scale-[1.03] shadow-xl ring-2 ring-red-400 bg-emerald-50/30' : 'hover:shadow-md'
                    }`}
                    style={{ minHeight: '190px' }}
                  >
                    {/* 4 Black Corner Pillars */}
                    <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-black border border-slate-400" />
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-black border border-slate-400" />
                    <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-black border border-slate-400" />
                    <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-black border border-slate-400" />

                    {/* Edge Structural Supports (Black markers along frame) */}
                    <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-black" />
                    <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-black" />
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black" />
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black" />

                    {/* Top Labels: Purple Pill "A5 Tent No. 2" and Dark Blue Badge "DA5T-2.01" */}
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <div className="bg-purple-200 border border-purple-400 text-purple-950 font-black text-[10px] px-2 py-0.5 rounded shadow-2xs">
                        A5 Tent No. 2
                      </div>
                      <div className="bg-slate-900 border border-slate-700 text-blue-300 font-mono font-bold text-[9px] px-1.5 py-0.5 rounded shadow-2xs">
                        DA5T -2.01
                      </div>
                    </div>

                    {/* Yellow Pallet Grid (7 Columns Schematic) */}
                    <div className="grid grid-cols-7 gap-0.5 bg-amber-50 p-1 rounded border border-amber-200 mb-1">
                      {['01', '02', '03', '04', '05', '06', '07'].map((col) => (
                        <div key={col} className="space-y-0.5">
                          <div className="text-[7px] font-mono text-center font-bold text-amber-900">{col}</div>
                          {Array.from({ length: 4 }).map((_, r) => (
                            <div 
                              key={r} 
                              className="h-3 rounded-[1px] bg-amber-200/90 border border-amber-400/80 flex items-center justify-center text-[6px] text-amber-950 font-mono"
                            />
                          ))}
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-center text-[9px] font-mono text-slate-600 pt-0.5">
                      <span>จัดเก็บ: <strong className="text-emerald-700 font-black">{campusStats.tent2Count}</strong>/196</span>
                      <span className="text-[8px] text-blue-600 font-bold group-hover:underline">เปิดผังเต็นท์ 2 →</span>
                    </div>
                  </div>

                  {/* ------------------------------------------------------------- */}
                  {/* TENT NO. 4 (TOP RIGHT)                                        */}
                  {/* ------------------------------------------------------------- */}
                  <div 
                    id="tent-card-no-4"
                    onClick={() => openA5Tent(4)}
                    onMouseEnter={() => setHoveredZone('TENT_4')}
                    onMouseLeave={() => setHoveredZone(null)}
                    className={`bg-white border-2 border-red-600 rounded-md p-2 relative cursor-pointer transition-all duration-200 group ${
                      hoveredZone === 'TENT_4' ? 'scale-[1.03] shadow-xl ring-2 ring-red-400 bg-emerald-50/30' : 'hover:shadow-md'
                    }`}
                    style={{ minHeight: '190px' }}
                  >
                    {/* 4 Black Corner Pillars */}
                    <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-black border border-slate-400" />
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-black border border-slate-400" />
                    <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-black border border-slate-400" />
                    <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-black border border-slate-400" />

                    {/* Edge Structural Supports */}
                    <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-black" />
                    <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-black" />
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black" />
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black" />

                    {/* Top Labels: Dark Blue Badge "DA5T-4.01", Purple Pill "A5 Tent No. 4", and RACK A */}
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <div className="bg-slate-900 border border-slate-700 text-blue-300 font-mono font-bold text-[9px] px-1.5 py-0.5 rounded shadow-2xs">
                        DA5T -4.01
                      </div>
                      <div className="bg-purple-200 border border-purple-400 text-purple-950 font-black text-[10px] px-2 py-0.5 rounded shadow-2xs">
                        A5 Tent No. 4
                      </div>
                      <span className="text-[8px] font-mono font-black text-rose-700 bg-rose-100 px-1 py-0.5 rounded border border-rose-300">
                        RACK A
                      </span>
                    </div>

                    {/* Yellow Pallet Grid (7 Columns Schematic) */}
                    <div className="grid grid-cols-7 gap-0.5 bg-amber-50 p-1 rounded border border-amber-200 mb-1">
                      {['01', '02', '03', '04', '05', '06', '07'].map((col) => (
                        <div key={col} className="space-y-0.5">
                          <div className="text-[7px] font-mono text-center font-bold text-amber-900">{col}</div>
                          {Array.from({ length: 4 }).map((_, r) => (
                            <div 
                              key={r} 
                              className={`h-3 rounded-[1px] border flex items-center justify-center text-[6px] font-mono ${
                                col === '07' 
                                  ? 'bg-rose-100 border-rose-400 text-rose-950' 
                                  : 'bg-amber-200/90 border-amber-400/80 text-amber-950'
                              }`}
                            />
                          ))}
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-center text-[9px] font-mono text-slate-600 pt-0.5">
                      <span>จัดเก็บ: <strong className="text-emerald-700 font-black">{campusStats.tent4Count}</strong>/196</span>
                      <span className="text-[8px] text-blue-600 font-bold group-hover:underline">เปิดผังเต็นท์ 4 →</span>
                    </div>
                  </div>

                  {/* ------------------------------------------------------------- */}
                  {/* TENT NO. 1 (BOTTOM LEFT)                                      */}
                  {/* ------------------------------------------------------------- */}
                  <div 
                    id="tent-card-no-1"
                    onClick={() => openA5Tent(1)}
                    onMouseEnter={() => setHoveredZone('TENT_1')}
                    onMouseLeave={() => setHoveredZone(null)}
                    className={`bg-white border-2 border-red-600 rounded-md p-2 relative cursor-pointer transition-all duration-200 group ${
                      hoveredZone === 'TENT_1' ? 'scale-[1.03] shadow-xl ring-2 ring-red-400 bg-emerald-50/30' : 'hover:shadow-md'
                    }`}
                    style={{ minHeight: '190px' }}
                  >
                    {/* 4 Black Corner Pillars */}
                    <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-black border border-slate-400" />
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-black border border-slate-400" />
                    <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-black border border-slate-400" />
                    <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-black border border-slate-400" />

                    {/* Edge Structural Supports */}
                    <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-black" />
                    <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-black" />
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black" />
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black" />

                    {/* Top Labels: Purple Pill "A5 Tent No. 1" and Dark Blue Badge "DA5T-1.01" */}
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <div className="bg-purple-200 border border-purple-400 text-purple-950 font-black text-[10px] px-2 py-0.5 rounded shadow-2xs">
                        A5 Tent No. 1
                      </div>
                      <div className="bg-slate-900 border border-slate-700 text-blue-300 font-mono font-bold text-[9px] px-1.5 py-0.5 rounded shadow-2xs">
                        DA5T -1.01
                      </div>
                    </div>

                    {/* Yellow Pallet Grid (7 Columns Schematic) */}
                    <div className="grid grid-cols-7 gap-0.5 bg-amber-50 p-1 rounded border border-amber-200 mb-1">
                      {['01', '02', '03', '04', '05', '06', '07'].map((col) => (
                        <div key={col} className="space-y-0.5">
                          <div className="text-[7px] font-mono text-center font-bold text-amber-900">{col}</div>
                          {Array.from({ length: 4 }).map((_, r) => (
                            <div 
                              key={r} 
                              className="h-3 rounded-[1px] bg-amber-200/90 border border-amber-400/80 flex items-center justify-center text-[6px] text-amber-950 font-mono"
                            />
                          ))}
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-center text-[9px] font-mono text-slate-600 pt-0.5">
                      <span>จัดเก็บ: <strong className="text-emerald-700 font-black">{campusStats.tent1Count}</strong>/196</span>
                      <span className="text-[8px] text-blue-600 font-bold group-hover:underline">เปิดผังเต็นท์ 1 →</span>
                    </div>
                  </div>

                  {/* ------------------------------------------------------------- */}
                  {/* TENT NO. 3 (BOTTOM RIGHT)                                     */}
                  {/* ------------------------------------------------------------- */}
                  <div 
                    id="tent-card-no-3"
                    onClick={() => openA5Tent(3)}
                    onMouseEnter={() => setHoveredZone('TENT_3')}
                    onMouseLeave={() => setHoveredZone(null)}
                    className={`bg-white border-2 border-red-600 rounded-md p-2 relative cursor-pointer transition-all duration-200 group ${
                      hoveredZone === 'TENT_3' ? 'scale-[1.03] shadow-xl ring-2 ring-red-400 bg-emerald-50/30' : 'hover:shadow-md'
                    }`}
                    style={{ minHeight: '190px' }}
                  >
                    {/* 4 Black Corner Pillars */}
                    <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-black border border-slate-400" />
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-black border border-slate-400" />
                    <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-black border border-slate-400" />
                    <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-black border border-slate-400" />

                    {/* Edge Structural Supports */}
                    <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-black" />
                    <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-black" />
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black" />
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black" />

                    {/* Top Labels: Dark Blue Badge "DA5T-3.01" and Purple Pill "A5 Tent No. 3" */}
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <div className="bg-slate-900 border border-slate-700 text-blue-300 font-mono font-bold text-[9px] px-1.5 py-0.5 rounded shadow-2xs">
                        DA5T -3.01
                      </div>
                      <div className="bg-purple-200 border border-purple-400 text-purple-950 font-black text-[10px] px-2 py-0.5 rounded shadow-2xs">
                        A5 Tent No. 3
                      </div>
                    </div>

                    {/* Yellow Pallet Grid (7 Columns Schematic) */}
                    <div className="grid grid-cols-7 gap-0.5 bg-amber-50 p-1 rounded border border-amber-200 mb-1">
                      {['01', '02', '03', '04', '05', '06', '07'].map((col) => (
                        <div key={col} className="space-y-0.5">
                          <div className="text-[7px] font-mono text-center font-bold text-amber-900">{col}</div>
                          {Array.from({ length: 4 }).map((_, r) => (
                            <div 
                              key={r} 
                              className="h-3 rounded-[1px] bg-amber-200/90 border border-amber-400/80 flex items-center justify-center text-[6px] text-amber-950 font-mono"
                            />
                          ))}
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-center text-[9px] font-mono text-slate-600 pt-0.5">
                      <span>จัดเก็บ: <strong className="text-emerald-700 font-black">{campusStats.tent3Count}</strong>/196</span>
                      <span className="text-[8px] text-blue-600 font-bold group-hover:underline">เปิดผังเต็นท์ 3 →</span>
                    </div>
                  </div>

                </div>

                {/* Bottom Summary Bar for Tents */}
                <div className="bg-emerald-100/90 border border-emerald-300 rounded-lg p-2 flex items-center justify-between text-xs text-emerald-950 font-bold">
                  <span>⛺ สรุปการจัดเก็บลานเต็นท์ A5</span>
                  <span className="font-mono text-emerald-900 font-black">
                    {campusStats.a5Occupied} / {campusStats.a5Capacity} พาเลท ({campusStats.a5OccupancyPercent}%)
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* Quick Zone Legend & Actions Guide */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2 text-slate-700">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="font-bold">สัญลักษณ์ผัง:</span>
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="px-2 py-0.5 rounded bg-red-100 border border-red-400 text-red-900 font-bold">
                  🟥 กรอบสีแดง = โซนจัดเก็บ (แร็ค / ราง / เต็นท์)
                </span>
                <span className="px-2 py-0.5 rounded bg-blue-100 border border-blue-400 text-blue-900 font-bold">
                  🟦 กล่องสีน้ำเงิน = รหัสโซนจัดเก็บ (กดเพื่อเปิดผัง)
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-100 border border-amber-400 text-amber-950 font-bold">
                  🟨 พื้นที่สีเหลือง = ลานวางพื้น DA4D-1 &amp; ผังพาเลทเต็นท์
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setActiveCampusTab('A4_FULL');
                  setA4SubTab('ALL');
                }}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs text-xs"
              >
                ผังอาคาร A4 →
              </button>
              <button
                onClick={() => setActiveCampusTab('A2_FULL')}
                className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg font-black shadow-xs text-xs"
              >
                ผังอาคาร A2 →
              </button>
              <button
                onClick={() => {
                  setActiveCampusTab('A5_FULL');
                  setSelectedTentNumber(1);
                }}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-black shadow-xs text-xs"
              >
                ผังเต็นท์ A5 →
              </button>
            </div>
          </div>

          {/* Dynamic Legend Panel for Campus Overview */}
          <DynamicLegendPanel />
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: A4 FULL BUILDING EMBEDDED MAP (Selective Rack & Floor Staging)    */}
      {/* ========================================================================= */}
      {activeCampusTab === 'A4_FULL' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Subview Action Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-blue-50 p-3 rounded-xl border border-blue-200">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
              <span className="text-xs sm:text-sm font-black text-blue-950">
                🏢 กำลังดู: ผังอาคาร A4 เต็มระบบ (ความจุ 1,112 พาเลท: แร็ค 680P + วางพื้น 432P)
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveCampusTab('CAMPUS_ALL')}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold shadow-2xs flex items-center space-x-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>กลับผังรวม 3 อาคาร</span>
              </button>
              <button
                onClick={() => setActiveCampusTab('A2_FULL')}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-black shadow-2xs flex items-center space-x-1 cursor-pointer"
              >
                <GitCommit className="w-3.5 h-3.5" />
                <span>ไปผัง A2 (ราง) →</span>
              </button>
              <button
                onClick={() => {
                  setActiveCampusTab('A5_FULL');
                  setSelectedTentNumber(1);
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black shadow-2xs flex items-center space-x-1 cursor-pointer"
              >
                <Tent className="w-3.5 h-3.5" />
                <span>ไปผัง A5 (เต็นท์) →</span>
              </button>
            </div>
          </div>

          {/* Embedded Full RackLayout2D Component */}
          <RackLayout2D
            items={items}
            searchQuery={localSearch}
            initialSectionTab={a4SubTab}
            onSelectBay={(z, b) => {
              if (onOpen3D) onOpen3D(z, b);
            }}
            onOpen3D={(z, b) => {
              if (onOpen3D) onOpen3D(z, b);
            }}
            onOpenScanner={onOpenScanner}
            onRelocateItem={onRelocateItem}
            onNavigateToCampus={() => setActiveCampusTab('CAMPUS_ALL')}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: A2 FULL FLOW RAIL EMBEDDED MAP (20 Rails - 160P)                  */}
      {/* ========================================================================= */}
      {activeCampusTab === 'A2_FULL' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Subview Action Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-amber-50 p-3 rounded-xl border border-amber-200">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-600 animate-pulse" />
              <span className="text-xs sm:text-sm font-black text-amber-950">
                🛤️ กำลังดู: ผังรางเลื่อน FIFO Flow Rail อาคาร A2 เต็มระบบ (20 รางเลื่อน • ความจุ 160 พาเลท)
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveCampusTab('CAMPUS_ALL')}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold shadow-2xs flex items-center space-x-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>กลับผังรวม 3 อาคาร</span>
              </button>
              <button
                onClick={() => {
                  setActiveCampusTab('A4_FULL');
                  setA4SubTab('ALL');
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs flex items-center space-x-1 cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>ไปผัง A4 (แร็ค/พื้น) →</span>
              </button>
              <button
                onClick={() => {
                  setActiveCampusTab('A5_FULL');
                  setSelectedTentNumber(1);
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black shadow-2xs flex items-center space-x-1 cursor-pointer"
              >
                <Tent className="w-3.5 h-3.5" />
                <span>ไปผัง A5 (เต็นท์) →</span>
              </button>
            </div>
          </div>

          {/* Embedded Full FlowRailFloorMap Component */}
          <FlowRailFloorMap
            items={items}
            searchQuery={localSearch}
            onOpenScanner={(z, b, l, m) => {
              if (onOpenScanner) onOpenScanner(z, b, l, m);
            }}
            onRelocateItem={onRelocateItem}
            onNavigateToCampus={() => setActiveCampusTab('CAMPUS_ALL')}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 4: A5 FULL TENT FACILITY EMBEDDED MAP (4 Tents - 784P)               */}
      {/* ========================================================================= */}
      {activeCampusTab === 'A5_FULL' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Subview Action Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
              <span className="text-xs sm:text-sm font-black text-emerald-950">
                ⛺ กำลังดู: ผังเต็นท์จัดเก็บวางพื้น A5 เต็มระบบ (4 หลัง Tent 1-4 • 7 กลุ่ม • ความจุ 784 พาเลท)
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveCampusTab('CAMPUS_ALL')}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold shadow-2xs flex items-center space-x-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>กลับผังรวม 3 อาคาร</span>
              </button>
              <button
                onClick={() => {
                  setActiveCampusTab('A4_FULL');
                  setA4SubTab('ALL');
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs flex items-center space-x-1 cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>ไปผัง A4 (แร็ค/พื้น) →</span>
              </button>
              <button
                onClick={() => setActiveCampusTab('A2_FULL')}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-black shadow-2xs flex items-center space-x-1 cursor-pointer"
              >
                <GitCommit className="w-3.5 h-3.5" />
                <span>ไปผัง A2 (ราง) →</span>
              </button>
            </div>
          </div>

          {/* Embedded Full A5TentFloorStagingMap Component */}
          <A5TentFloorStagingMap
            items={items}
            searchQuery={localSearch}
            initialTentNumber={selectedTentNumber}
            onOpenScanner={(z, b, l, m) => {
              if (onOpenScanner) onOpenScanner(z, b, l, m);
            }}
            onRelocateItem={onRelocateItem}
            onNavigateToCampus={() => setActiveCampusTab('CAMPUS_ALL')}
          />
        </div>
      )}

    </div>
  );
};
