import React, { useState } from 'react';
import { InventoryItem } from '../types';
import { 
  Building2, 
  Layers, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  ArrowUpRight, 
  ShieldAlert, 
  BarChart3, 
  Info,
  ChevronRight,
  Filter,
  Boxes,
  Zap
} from 'lucide-react';

interface WarehouseCapacityDashboardProps {
  items: InventoryItem[];
  onNavigateToZone?: (target: 'A4_MACRO' | 'A4_RACK' | 'A4_FLOOR' | 'A4_3D' | 'A2_RAIL' | 'A2_MACRO' | 'A2_SPLIT' | 'A5_TENT' | 'A5_MACRO') => void;
  onNavigateToBuilding?: (buildingId: string) => void;
}

export interface ZoneCapacityItem {
  id: string;
  name: string;
  building: 'A2' | 'A4' | 'A5';
  buildingName: string;
  type: 'RACK' | 'FLOW_RAIL' | 'FLOOR_STAGING' | 'TENT';
  typeLabel: string;
  capacityPallets: number;
  occupiedPallets: number;
  occupancyRate: number; // 0 - 100+
  overcapacityThreshold: number; // e.g. 90% or 100%
  isOvercapacity: boolean;
  isNearCapacity: boolean;
  totalQtyUnits: number;
  agingCount: number;
  targetNavigation: 'A4_MACRO' | 'A4_RACK' | 'A4_FLOOR' | 'A4_3D' | 'A2_RAIL' | 'A2_MACRO' | 'A2_SPLIT' | 'A5_TENT' | 'A5_MACRO';
  description: string;
}

export const WarehouseCapacityDashboard: React.FC<WarehouseCapacityDashboardProps> = ({
  items,
  onNavigateToZone,
  onNavigateToBuilding
}) => {
  const [selectedBuildingFilter, setSelectedBuildingFilter] = useState<'ALL' | 'A4' | 'A2' | 'A5'>('ALL');
  const [showOvercapacityOnly, setShowOvercapacityOnly] = useState<boolean>(false);

  // 1. Calculate Real-Time Zone Capacities
  const purpleZones = ['B', 'C', 'D', 'E', 'F'];
  const orangeZones = ['G', 'H', 'I', 'J', 'K'];
  const floorXGroups = ['X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'X8'];

  // Zone Breakdown Data
  const zoneList: ZoneCapacityItem[] = [
    // --- A2 BUILDING ---
    {
      id: 'ZONE_A2_FLOW_RAIL',
      name: 'DA2D-1 (รางเลื่อน 20 ราง R1-R20)',
      building: 'A2',
      buildingName: 'อาคาร A2 (Flow Rail)',
      type: 'FLOW_RAIL',
      typeLabel: 'รางเลื่อน (Flow Rail)',
      capacityPallets: 160,
      occupiedPallets: items.filter(it => 
        it.zone.startsWith('R') || 
        it.zone.startsWith('FR') || 
        it.storageType === 'FLOW_RAIL' || 
        it.locatorCode.startsWith('DA2D-1-')
      ).length,
      occupancyRate: 0,
      overcapacityThreshold: 90,
      isOvercapacity: false,
      isNearCapacity: false,
      totalQtyUnits: items.filter(it => 
        it.zone.startsWith('R') || 
        it.zone.startsWith('FR') || 
        it.storageType === 'FLOW_RAIL' || 
        it.locatorCode.startsWith('DA2D-1-')
      ).reduce((acc, it) => acc + it.quantity, 0),
      agingCount: items.filter(it => 
        (it.zone.startsWith('R') || it.zone.startsWith('FR') || it.storageType === 'FLOW_RAIL' || it.locatorCode.startsWith('DA2D-1-')) &&
        (it.agingDays > 30 || it.agingStatus === 'WARNING' || it.agingStatus === 'OVERDUE')
      ).length,
      targetNavigation: 'A2_RAIL',
      description: '20 ราง x 8 ตำแหน่งพาเลท จัดส่งตรงเข้าสู่ไลน์ประกอบ HE'
    },

    // --- A4 BUILDING ---
    {
      id: 'ZONE_A4_RACK_DA4D2',
      name: 'DA4D-2 (แร็คสูง B-F 12 Bays)',
      building: 'A4',
      buildingName: 'อาคาร A4 (Rack & Floor)',
      type: 'RACK',
      typeLabel: 'ชั้นวางสูง (High Rack)',
      capacityPallets: 480, // 5 racks x 12 bays x 4 levels - 240 double counted = 480
      occupiedPallets: items.filter(it => 
        purpleZones.includes(it.zone) || 
        it.locatorCode.startsWith('DA4D-2.') || 
        it.locatorCode.startsWith('DA4D-2-')
      ).length,
      occupancyRate: 0,
      overcapacityThreshold: 90,
      isOvercapacity: false,
      isNearCapacity: false,
      totalQtyUnits: items.filter(it => 
        purpleZones.includes(it.zone) || 
        it.locatorCode.startsWith('DA4D-2.') || 
        it.locatorCode.startsWith('DA4D-2-')
      ).reduce((acc, it) => acc + it.quantity, 0),
      agingCount: items.filter(it => 
        (purpleZones.includes(it.zone) || it.locatorCode.startsWith('DA4D-2.') || it.locatorCode.startsWith('DA4D-2-')) &&
        (it.agingDays > 30 || it.agingStatus === 'WARNING' || it.agingStatus === 'OVERDUE')
      ).length,
      targetNavigation: 'A4_RACK',
      description: 'แร็คโซนสีม่วง 5 แถว (B, C, D, E, F) แถวละ 12 เบย์ สูง 4 ชั้น'
    },
    {
      id: 'ZONE_A4_RACK_DA4D3',
      name: 'DA4D-3 (แร็คสูง G-K 5 Bays)',
      building: 'A4',
      buildingName: 'อาคาร A4 (Rack & Floor)',
      type: 'RACK',
      typeLabel: 'ชั้นวางสูง (High Rack)',
      capacityPallets: 200, // 5 racks x 5 bays x 4 levels = 200
      occupiedPallets: items.filter(it => 
        orangeZones.includes(it.zone) || 
        it.locatorCode.startsWith('DA4D-3.') || 
        it.locatorCode.startsWith('DA4D-3-')
      ).length,
      occupancyRate: 0,
      overcapacityThreshold: 90,
      isOvercapacity: false,
      isNearCapacity: false,
      totalQtyUnits: items.filter(it => 
        orangeZones.includes(it.zone) || 
        it.locatorCode.startsWith('DA4D-3.') || 
        it.locatorCode.startsWith('DA4D-3-')
      ).reduce((acc, it) => acc + it.quantity, 0),
      agingCount: items.filter(it => 
        (orangeZones.includes(it.zone) || it.locatorCode.startsWith('DA4D-3.') || it.locatorCode.startsWith('DA4D-3-')) &&
        (it.agingDays > 30 || it.agingStatus === 'WARNING' || it.agingStatus === 'OVERDUE')
      ).length,
      targetNavigation: 'A4_RACK',
      description: 'แร็คโซนสีส้ม 5 แถว (G, H, I, J, K) แถวละ 5 เบย์ สูง 4 ชั้น'
    },
    {
      id: 'ZONE_A4_FLOOR_DA4D1',
      name: 'DA4D-1 (ลานวางพื้น X1-X8)',
      building: 'A4',
      buildingName: 'อาคาร A4 (Rack & Floor)',
      type: 'FLOOR_STAGING',
      typeLabel: 'วางพื้น (Floor Staging)',
      capacityPallets: 432,
      occupiedPallets: items.filter(it => 
        floorXGroups.includes(it.zone) || 
        it.storageType === 'FLOOR_STAGING' || 
        it.locatorCode.startsWith('DA4D-1-') || 
        it.locatorCode.startsWith('DA4D-1.01-')
      ).length,
      occupancyRate: 0,
      overcapacityThreshold: 85,
      isOvercapacity: false,
      isNearCapacity: false,
      totalQtyUnits: items.filter(it => 
        floorXGroups.includes(it.zone) || 
        it.storageType === 'FLOOR_STAGING' || 
        it.locatorCode.startsWith('DA4D-1-') || 
        it.locatorCode.startsWith('DA4D-1.01-')
      ).reduce((acc, it) => acc + it.quantity, 0),
      agingCount: items.filter(it => 
        (floorXGroups.includes(it.zone) || it.storageType === 'FLOOR_STAGING' || it.locatorCode.startsWith('DA4D-1-') || it.locatorCode.startsWith('DA4D-1.01-')) &&
        (it.agingDays > 30 || it.agingStatus === 'WARNING' || it.agingStatus === 'OVERDUE')
      ).length,
      targetNavigation: 'A4_FLOOR',
      description: 'ลานพื้นสีเหลือง 8 กลุ่ม (X1-X4: 168P, X5-X7: 216P, X8: 48P)'
    },

    // --- A5 TENT FACILITY (4 Tents) ---
    {
      id: 'ZONE_A5_TENT_1',
      name: 'DA5T-1 (เต็นท์ A5 Tent No. 1)',
      building: 'A5',
      buildingName: 'ลานเต็นท์ A5 (Tent 1-4)',
      type: 'TENT',
      typeLabel: 'เต็นท์ภายนอก (Outdoor Tent)',
      capacityPallets: 196, // 7 groups x 28 slots
      occupiedPallets: items.filter(it => it.locatorCode.includes('DA5T-1') || (it.zone === 'T1')).length,
      occupancyRate: 0,
      overcapacityThreshold: 90,
      isOvercapacity: false,
      isNearCapacity: false,
      totalQtyUnits: items.filter(it => it.locatorCode.includes('DA5T-1') || (it.zone === 'T1')).reduce((acc, it) => acc + it.quantity, 0),
      agingCount: items.filter(it => (it.locatorCode.includes('DA5T-1') || it.zone === 'T1') && (it.agingDays > 30 || it.agingStatus === 'WARNING' || it.agingStatus === 'OVERDUE')).length,
      targetNavigation: 'A5_TENT',
      description: 'เต็นท์ 1: 7 กลุ่มคอลัมน์ (01-07) คอลัมน์ละ 28 ช่องพาเลท'
    },
    {
      id: 'ZONE_A5_TENT_2',
      name: 'DA5T-2 (เต็นท์ A5 Tent No. 2)',
      building: 'A5',
      buildingName: 'ลานเต็นท์ A5 (Tent 1-4)',
      type: 'TENT',
      typeLabel: 'เต็นท์ภายนอก (Outdoor Tent)',
      capacityPallets: 196,
      occupiedPallets: items.filter(it => it.locatorCode.includes('DA5T-2') || (it.zone === 'T2')).length,
      occupancyRate: 0,
      overcapacityThreshold: 90,
      isOvercapacity: false,
      isNearCapacity: false,
      totalQtyUnits: items.filter(it => it.locatorCode.includes('DA5T-2') || (it.zone === 'T2')).reduce((acc, it) => acc + it.quantity, 0),
      agingCount: items.filter(it => (it.locatorCode.includes('DA5T-2') || it.zone === 'T2') && (it.agingDays > 30 || it.agingStatus === 'WARNING' || it.agingStatus === 'OVERDUE')).length,
      targetNavigation: 'A5_TENT',
      description: 'เต็นท์ 2: 7 กลุ่มคอลัมน์ (01-07) คอลัมน์ละ 28 ช่องพาเลท'
    },
    {
      id: 'ZONE_A5_TENT_3',
      name: 'DA5T-3 (เต็นท์ A5 Tent No. 3)',
      building: 'A5',
      buildingName: 'ลานเต็นท์ A5 (Tent 1-4)',
      type: 'TENT',
      typeLabel: 'เต็นท์ภายนอก (Outdoor Tent)',
      capacityPallets: 196,
      occupiedPallets: items.filter(it => it.locatorCode.includes('DA5T-3') || (it.zone === 'T3')).length,
      occupancyRate: 0,
      overcapacityThreshold: 90,
      isOvercapacity: false,
      isNearCapacity: false,
      totalQtyUnits: items.filter(it => it.locatorCode.includes('DA5T-3') || (it.zone === 'T3')).reduce((acc, it) => acc + it.quantity, 0),
      agingCount: items.filter(it => (it.locatorCode.includes('DA5T-3') || it.zone === 'T3') && (it.agingDays > 30 || it.agingStatus === 'WARNING' || it.agingStatus === 'OVERDUE')).length,
      targetNavigation: 'A5_TENT',
      description: 'เต็นท์ 3: 7 กลุ่มคอลัมน์ (01-07) คอลัมน์ละ 28 ช่องพาเลท'
    },
    {
      id: 'ZONE_A5_TENT_4',
      name: 'DA5T-4 (เต็นท์ A5 Tent No. 4 & Rack A)',
      building: 'A5',
      buildingName: 'ลานเต็นท์ A5 (Tent 1-4)',
      type: 'TENT',
      typeLabel: 'เต็นท์ภายนอก (Outdoor Tent)',
      capacityPallets: 196,
      occupiedPallets: items.filter(it => it.locatorCode.includes('DA5T-4') || (it.zone === 'T4')).length,
      occupancyRate: 0,
      overcapacityThreshold: 90,
      isOvercapacity: false,
      isNearCapacity: false,
      totalQtyUnits: items.filter(it => it.locatorCode.includes('DA5T-4') || (it.zone === 'T4')).reduce((acc, it) => acc + it.quantity, 0),
      agingCount: items.filter(it => (it.locatorCode.includes('DA5T-4') || it.zone === 'T4') && (it.agingDays > 30 || it.agingStatus === 'WARNING' || it.agingStatus === 'OVERDUE')).length,
      targetNavigation: 'A5_TENT',
      description: 'เต็นท์ 4: 7 กลุ่มคอลัมน์ (01-07) พร้อมพื้นที่ Rack A'
    }
  ];

  // Calculate percentages and overcapacity flags
  zoneList.forEach(z => {
    z.occupancyRate = Math.round((z.occupiedPallets / z.capacityPallets) * 100);
    z.isOvercapacity = z.occupancyRate >= z.overcapacityThreshold;
    z.isNearCapacity = z.occupancyRate >= 75 && z.occupancyRate < z.overcapacityThreshold;
  });

  // Filtered Zones based on selection
  const filteredZones = zoneList.filter(z => {
    if (selectedBuildingFilter !== 'ALL' && z.building !== selectedBuildingFilter) return false;
    if (showOvercapacityOnly && !z.isOvercapacity && !z.isNearCapacity) return false;
    return true;
  });

  // Aggregate stats
  const totalCapacity = zoneList.reduce((acc, z) => acc + z.capacityPallets, 0); // 2,056 Pallets
  const totalOccupied = zoneList.reduce((acc, z) => acc + z.occupiedPallets, 0);
  const totalAvailable = totalCapacity - totalOccupied;
  const overallOccupancy = Math.round((totalOccupied / totalCapacity) * 100);

  const overcapacityZones = zoneList.filter(z => z.isOvercapacity);
  const nearCapacityZones = zoneList.filter(z => z.isNearCapacity);

  // Helper for progress bar color
  const getProgressBarColor = (rate: number, isOver: boolean) => {
    if (isOver || rate >= 90) return 'bg-rose-600';
    if (rate >= 75) return 'bg-amber-500';
    if (rate >= 50) return 'bg-blue-600';
    return 'bg-emerald-500';
  };

  const getProgressBgColor = (rate: number, isOver: boolean) => {
    if (isOver || rate >= 90) return 'bg-rose-100 text-rose-800 border-rose-300';
    if (rate >= 75) return 'bg-amber-100 text-amber-800 border-amber-300';
    return 'bg-emerald-100 text-emerald-800 border-emerald-300';
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs space-y-6 text-slate-900">
      
      {/* Header and Filter Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-xs">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
                <span>แดชบอร์ดความจุคลังสินค้า (Warehouse Capacity Dashboard)</span>
              </h2>
              <p className="text-xs text-slate-500">
                สรุปสถานะการใช้พื้นที่แบบ Real-time แยกตามโซน (A2, A4, A5) พร้อมระบบแจ้งเตือนโซนพื้นที่วิกฤต (Overcapacity Alert)
              </p>
            </div>
          </div>
        </div>

        {/* Building and Status Filter Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Building Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            {(['ALL', 'A4', 'A2', 'A5'] as const).map(b => (
              <button
                key={b}
                onClick={() => setSelectedBuildingFilter(b)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  selectedBuildingFilter === b
                    ? 'bg-white text-slate-900 shadow-xs font-black'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {b === 'ALL' ? 'ทุกอาคาร' : `อาคาร ${b}`}
              </button>
            ))}
          </div>

          {/* Overcapacity toggle button */}
          <button
            onClick={() => setShowOvercapacityOnly(!showOvercapacityOnly)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center space-x-1.5 ${
              showOvercapacityOnly
                ? 'bg-rose-50 border-rose-400 text-rose-700 ring-2 ring-rose-400'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${showOvercapacityOnly ? 'text-rose-600' : 'text-slate-400'}`} />
            <span>เฉพาะโซนวิกฤต / ใกล้เต็ม ({overcapacityZones.length + nearCapacityZones.length})</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Campus Capacity */}
        <div className="p-4 rounded-xl bg-slate-900 text-white shadow-xs border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold">
            <span>🌐 ความจุรวมทั้งแคมปัส</span>
            <span className="font-mono text-blue-400 text-sm font-black">{overallOccupancy}%</span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black font-mono tracking-tight">{totalCapacity.toLocaleString()}</span>
            <span className="text-xs text-slate-400">พาเลท (Pallets)</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-blue-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${overallOccupancy}%` }} 
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 font-mono pt-1">
            <span>ใช้ไป {totalOccupied.toLocaleString()} P</span>
            <span>ว่าง {totalAvailable.toLocaleString()} P</span>
          </div>
        </div>

        {/* Overcapacity Warning Count */}
        <div className={`p-4 rounded-xl border transition-all space-y-2 ${
          overcapacityZones.length > 0
            ? 'bg-rose-50/80 border-rose-400 text-rose-950'
            : 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
        }`}>
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="flex items-center space-x-1">
              <ShieldAlert className={`w-4 h-4 ${overcapacityZones.length > 0 ? 'text-rose-600' : 'text-emerald-600'}`} />
              <span>โซนความจุเกิน (Overcapacity)</span>
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              overcapacityZones.length > 0 ? 'bg-rose-200 text-rose-900' : 'bg-emerald-200 text-emerald-900'
            }`}>
              เกณฑ์ &ge; 90%
            </span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className={`text-2xl font-black font-mono tracking-tight ${
              overcapacityZones.length > 0 ? 'text-rose-700' : 'text-emerald-700'
            }`}>
              {overcapacityZones.length}
            </span>
            <span className="text-xs text-slate-600">โซนที่ต้องบริหารจัดการเร่งด่วน</span>
          </div>
          <p className="text-[10px] text-slate-600">
            {overcapacityZones.length > 0 
              ? `พบโซนที่มีอัตราการจัดเก็บหนาแน่นเกินกำหนด แนะนำให้โยกย้ายสต็อก` 
              : `สถานะปกติ ไม่มีโซนใดเกินขีดจำกัดความจุ`}
          </p>
        </div>

        {/* Near Capacity Zones Count */}
        <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-300 text-amber-950 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-amber-900">
            <span className="flex items-center space-x-1">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>โซนเฝ้าระวัง (75% - 89%)</span>
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-900">
              เฝ้าระวัง
            </span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black font-mono tracking-tight text-amber-800">
              {nearCapacityZones.length}
            </span>
            <span className="text-xs text-slate-600">โซนใกล้เต็ม</span>
          </div>
          <p className="text-[10px] text-slate-600">
            โซนที่มีความจุเข้าใกล้จุดวิกฤต ควรเตรียมแผนจัดสรรพื้นที่รองรับสินค้าเข้า
          </p>
        </div>

        {/* Optimal / Free Space */}
        <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 text-blue-950 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-blue-900">
            <span className="flex items-center space-x-1">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <span>พื้นที่ว่างพร้อมรับเข้า</span>
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-200 text-blue-900">
              Free Slots
            </span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black font-mono tracking-tight text-blue-700">
              {totalAvailable.toLocaleString()}
            </span>
            <span className="text-xs text-slate-600">พาเลท ({100 - overallOccupancy}%)</span>
          </div>
          <p className="text-[10px] text-slate-600">
            จำนวนตำแหน่งพาเลทที่สามารถสแกนรับสินค้า (IN) เข้าจัดเก็บได้ทันที
          </p>
        </div>
      </div>

      {/* Overcapacity Critical Alert Banner (Shows when any zone is overcapacity) */}
      {overcapacityZones.length > 0 && (
        <div className="p-4 bg-rose-50 border-2 border-rose-500 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-rose-600 text-white shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-rose-950">
                แจ้งเตือนหัวหน้าคลัง: พบ {overcapacityZones.length} โซนมีความจุเกินกำหนด (Overcapacity)
              </h4>
              <p className="text-xs text-rose-800 mt-0.5">
                {overcapacityZones.map(z => `${z.name} (${z.occupancyRate}%)`).join(', ')} ควรเร่งกระจายสินค้าไปยังโซนที่มีพื้นที่ว่างเพื่อป้องกันความแออัด
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Zone Breakdown Table & Progress Bars */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900 flex items-center space-x-2">
            <Boxes className="w-4 h-4 text-blue-600" />
            <span>รายละเอียดความจุแยกรายโซน (Zone Breakdown)</span>
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            แสดง {filteredZones.length} จาก {zoneList.length} โซน
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredZones.map(zone => {
            const isOver = zone.isOvercapacity;
            const isNear = zone.isNearCapacity;

            return (
              <div
                key={zone.id}
                id={`capacity-card-${zone.id}`}
                className={`p-4 rounded-xl border-2 transition-all duration-200 relative group flex flex-col justify-between ${
                  isOver
                    ? 'bg-rose-50/40 border-rose-400 hover:border-rose-600 shadow-xs'
                    : isNear
                    ? 'bg-amber-50/40 border-amber-400 hover:border-amber-600 shadow-xs'
                    : 'bg-slate-50/60 border-slate-200 hover:border-blue-400 hover:bg-white'
                }`}
              >
                <div>
                  {/* Top Bar: Zone Name, Building Tag & Status */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          zone.building === 'A2' 
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : zone.building === 'A4'
                            ? 'bg-blue-100 text-blue-900 border border-blue-300'
                            : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        }`}>
                          อาคาร {zone.building}
                        </span>
                        <h4 className="text-sm font-black text-slate-900 group-hover:text-blue-700 transition-colors">
                          {zone.name}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {zone.description}
                      </p>
                    </div>

                    {/* Badge */}
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black shrink-0 border ${
                      getProgressBgColor(zone.occupancyRate, isOver)
                    }`}>
                      {isOver ? '🚨 Overcapacity' : isNear ? '⚠️ ใกล้เต็ม' : '✅ ปกติ'} ({zone.occupancyRate}%)
                    </span>
                  </div>

                  {/* Dynamic Progress Bar */}
                  <div className="space-y-1.5 my-3">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-slate-600 font-bold">
                        อัตราการใช้งาน (Occupancy)
                      </span>
                      <span className="font-black text-slate-900">
                        {zone.occupiedPallets} / {zone.capacityPallets} พาเลท ({zone.occupancyRate}%)
                      </span>
                    </div>

                    {/* Progress Track */}
                    <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden p-0.5 border border-slate-300/60 shadow-inner">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(zone.occupancyRate, isOver)}`}
                        style={{ width: `${Math.min(100, zone.occupancyRate)}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>ว่าง {zone.capacityPallets - zone.occupiedPallets} P</span>
                      <span>รวมจัดเก็บ {zone.totalQtyUnits.toLocaleString()} ชิ้น</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action and Details */}
                <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2 mt-2">
                  <div className="flex items-center space-x-2 text-[10px] text-slate-500 font-medium">
                    {zone.agingCount > 0 && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold">
                        สต็อกค้าง {zone.agingCount} รายการ
                      </span>
                    )}
                    <span>ประเภท: {zone.typeLabel}</span>
                  </div>

                  {/* Navigate to Zone Button */}
                  {onNavigateToZone && (
                    <button
                      onClick={() => onNavigateToZone(zone.targetNavigation)}
                      className="px-3 py-1.5 bg-white hover:bg-blue-600 text-slate-700 hover:text-white border border-slate-300 hover:border-blue-600 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 shadow-2xs group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 cursor-pointer"
                    >
                      <span>เปิดดูผังโซนนี้</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
