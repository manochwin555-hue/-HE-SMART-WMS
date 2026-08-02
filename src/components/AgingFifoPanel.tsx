import React, { useState, useMemo } from 'react';
import { InventoryItem, StorageZone } from '../types';
import { 
  ClockAlert, 
  AlertTriangle, 
  Layers, 
  ArrowUpRight, 
  CheckCircle2, 
  ShieldAlert,
  Flame,
  Search,
  Filter,
  X,
  Package
} from 'lucide-react';

interface AgingFifoPanelProps {
  items: InventoryItem[];
  onOpen3DForLocator: (zone: StorageZone, bayNumber: number) => void;
  onQuickPickItem: (item: InventoryItem) => void;
}

export const AgingFifoPanel: React.FC<AgingFifoPanelProps> = ({
  items,
  onOpen3DForLocator,
  onQuickPickItem,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [zoneFilter, setZoneFilter] = useState<string>('ALL');
  const [agingCategory, setAgingCategory] = useState<'ALL' | 'NORMAL' | 'WARNING' | 'OVERDUE'>('ALL');
  const [lineFilter, setLineFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'AGING_DESC' | 'QTY_ASC' | 'QTY_DESC' | 'MODEL_ASC'>('AGING_DESC');

  const safeCount = items.filter((i) => i.agingDays <= 14).length;
  const warningCount = items.filter((i) => i.agingDays > 14 && i.agingDays <= 30).length;
  const overdueCount = items.filter((i) => i.agingDays > 30).length;

  // Filter and sort items according to search & filter criteria
  const filteredAgingItems = useMemo(() => {
    const list = items.filter((item) => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.modelHE.toLowerCase().includes(q) ||
        item.partName.toLowerCase().includes(q) ||
        item.locatorCode.toLowerCase().includes(q) ||
        item.useLine.toLowerCase().includes(q) ||
        `zone ${item.zone}`.toLowerCase().includes(q) ||
        `${item.zone}${item.bayNumber}`.toLowerCase().includes(q);

      const matchZone = zoneFilter === 'ALL' || item.zone === zoneFilter;
      const matchLine = lineFilter === 'ALL' || item.useLine === lineFilter;

      let matchCategory = true;
      if (agingCategory === 'NORMAL') {
        matchCategory = item.agingDays <= 14;
      } else if (agingCategory === 'WARNING') {
        matchCategory = item.agingDays > 14 && item.agingDays <= 30;
      } else if (agingCategory === 'OVERDUE') {
        matchCategory = item.agingDays > 30;
      }

      return matchSearch && matchZone && matchLine && matchCategory;
    });

    if (sortBy === 'QTY_ASC') {
      return [...list].sort((a, b) => a.quantity - b.quantity);
    } else if (sortBy === 'QTY_DESC') {
      return [...list].sort((a, b) => b.quantity - a.quantity);
    } else if (sortBy === 'MODEL_ASC') {
      return [...list].sort((a, b) => a.modelHE.localeCompare(b.modelHE));
    }

    // Default: FIFO order by Aging Days highest first
    return [...list].sort((a, b) => b.agingDays - a.agingDays);
  }, [items, searchTerm, zoneFilter, agingCategory, lineFilter, sortBy]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm text-slate-900 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <ClockAlert className="w-5 h-5 text-amber-500 animate-pulse" />
            <h2 className="text-lg font-bold text-slate-800">
              ระบบควบคุม Aging & ลำดับการเบิกจ่าย FIFO (First-In, First-Out)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            แนะนำลำดับการเบิกจ่ายวัตถุดิบตามอายุการจัดเก็บ ป้องกันวัตถุดิบเสื่อมสภาพค้างคลัง
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs text-emerald-800 font-semibold">ระยะจัดเก็บปกติ (&lt; 14 วัน)</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{safeCount} <span className="text-xs text-slate-500 font-medium">รายการ</span></div>
          </div>
          <CheckCircle2 className="w-8 h-8 text-emerald-600 opacity-80" />
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs text-amber-800 font-semibold">เริ่มค้างนาน (15 - 30 วัน)</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{warningCount} <span className="text-xs text-slate-500 font-medium">รายการ</span></div>
          </div>
          <AlertTriangle className="w-8 h-8 text-amber-600 opacity-80" />
        </div>

        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs text-red-800 font-semibold">เตือน FIFO Overdue (&gt; 30 วัน)</div>
            <div className="text-2xl font-bold text-red-600 mt-1">{overdueCount} <span className="text-xs text-slate-500 font-medium">รายการ</span></div>
          </div>
          <Flame className="w-8 h-8 text-red-500 animate-bounce" />
        </div>
      </div>

      {/* Filter and Search Bar for FIFO Picking List */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหารายการเบิก เช่น ADL74920904, E6, Zone E, Line HE2..."
              className="w-full bg-white border border-slate-300 focus:border-blue-500 rounded-lg pl-9 pr-8 py-2 text-xs text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Aging Status Filter Tabs */}
          <div className="flex bg-slate-200/80 p-1 rounded-lg border border-slate-200 text-xs shrink-0">
            <button
              onClick={() => setAgingCategory('ALL')}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                agingCategory === 'ALL' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              ทั้งหมด ({items.length})
            </button>
            <button
              onClick={() => setAgingCategory('NORMAL')}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                agingCategory === 'NORMAL' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              ปกติ ({safeCount})
            </button>
            <button
              onClick={() => setAgingCategory('WARNING')}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                agingCategory === 'WARNING' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              เริ่มค้าง ({warningCount})
            </button>
            <button
              onClick={() => setAgingCategory('OVERDUE')}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                agingCategory === 'OVERDUE' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Overdue ({overdueCount})
            </button>
          </div>
        </div>

        {/* Dropdowns for Zone, Line & Sorting */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Zone Filter */}
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500 font-medium">Zone:</span>
              <select
                value={zoneFilter}
                onChange={(e) => setZoneFilter(e.target.value)}
                className="bg-white border border-slate-300 text-slate-800 font-bold px-2 py-1 rounded-lg focus:outline-none focus:border-blue-500 shadow-sm"
              >
                <option value="ALL">ทุก Zone (B-K)</option>
                {(['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'] as StorageZone[]).map((z) => (
                  <option key={z} value={z}>Zone {z}</option>
                ))}
              </select>
            </div>

            {/* Line Filter */}
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500 font-medium">Line:</span>
              <select
                value={lineFilter}
                onChange={(e) => setLineFilter(e.target.value)}
                className="bg-white border border-slate-300 text-slate-800 font-bold px-2 py-1 rounded-lg focus:outline-none focus:border-blue-500 shadow-sm"
              >
                <option value="ALL">ทุก Line (HE1-3)</option>
                <option value="HE1">Line HE1</option>
                <option value="HE2">Line HE2</option>
                <option value="HE3">Line HE3</option>
              </select>
            </div>

            {/* Sort Selector */}
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500 font-medium">เรียงตาม:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-white border border-slate-300 text-blue-700 font-bold px-2 py-1 rounded-lg focus:outline-none focus:border-blue-500 shadow-sm"
              >
                <option value="AGING_DESC">อายุจัดเก็บ FIFO (นานที่สุดก่อน)</option>
                <option value="QTY_ASC">จำนวนคงเหลือ (น้อย → มาก)</option>
                <option value="QTY_DESC">จำนวนคงเหลือ (มาก → น้อย)</option>
                <option value="MODEL_ASC">Model HE (A-Z)</option>
              </select>
            </div>
          </div>

          {(searchTerm || zoneFilter !== 'ALL' || agingCategory !== 'ALL' || lineFilter !== 'ALL' || sortBy !== 'AGING_DESC') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setZoneFilter('ALL');
                setAgingCategory('ALL');
                setLineFilter('ALL');
                setSortBy('AGING_DESC');
              }}
              className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-[11px] transition-all"
            >
              ล้างตัวกรอง
            </button>
          )}
        </div>
      </div>

      {/* FIFO Recommendation Priority List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
            <span>ลำดับแนะนำเบิกออกก่อน (Priority Pick List)</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold border border-amber-200">
              พบ {filteredAgingItems.length} รายการ
            </span>
          </h3>
        </div>

        {filteredAgingItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAgingItems.map((item) => {
            const isCritical = item.agingDays > 30;

            return (
              <div
                key={item.id}
                className={`rounded-xl p-4 border transition-all ${
                  isCritical
                    ? 'bg-amber-50/50 border-amber-300 hover:border-amber-400 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-sm text-blue-600">
                    {item.modelHE}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isCritical
                        ? 'bg-red-100 text-red-700 border border-red-200 animate-pulse'
                        : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {item.agingDays} วัน
                  </span>
                </div>

                <p className="text-xs font-semibold text-slate-800 mt-1">{item.partName}</p>

                <div className="mt-3 py-2 px-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">ตำแหน่งจัดเก็บ:</span>
                    <div className="flex items-center space-x-1">
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-extrabold text-[11px] border border-blue-200">
                        Rack {item.zone}{item.bayNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-extrabold text-[11px] border border-amber-200">
                        ชั้น {item.level}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">จำนวนคงเหลือ:</span>
                    <span className="font-bold text-emerald-600">{item.quantity.toLocaleString()} U</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">ไลน์เป้าหมาย:</span>
                    <span className="font-bold text-indigo-700">Line {item.useLine}</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center space-x-2">
                  <button
                    onClick={() => onQuickPickItem(item)}
                    className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center space-x-1 shadow-sm active:scale-95 transition-all"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>เลือกเบิกชิ้นนี้</span>
                  </button>

                  <button
                    onClick={() => onOpen3DForLocator(item.zone, item.bayNumber)}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                    title="ส่อง 3D Rack ช่องนี้"
                  >
                    <Layers className="w-4 h-4 text-blue-600" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        ) : (
          <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-300 rounded-xl space-y-2">
            <Package className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-700 text-sm">ไม่พบรายการเบิกที่ตรงตามเงื่อนไขตัวกรอง</p>
            <p className="text-xs text-slate-400">
              ลองล้างเงื่อนไขตัวกรองหรือพิมพ์คำค้นหาอื่น
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
