import React, { useState, useMemo } from 'react';
import { InventoryItem, ProductType, AgingStatus } from '../types';
import { 
  Package, 
  Layers, 
  ShieldAlert, 
  AlertTriangle, 
  Clock, 
  Warehouse, 
  CheckCircle2, 
  BarChart2, 
  PieChart as PieChartIcon, 
  Grid,
  Filter,
  ArrowUpRight,
  Boxes,
  Tag,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';

interface StockSummaryReportProps {
  items: InventoryItem[];
  onSelectFilter?: (filter: string) => void;
}

type AnalysisViewMode = 'CATEGORY' | 'STATUS' | 'FACILITY';
type MetricType = 'UNITS' | 'PALLETS';

export const StockSummaryReport: React.FC<StockSummaryReportProps> = ({ items, onSelectFilter }) => {
  const [viewMode, setViewMode] = useState<AnalysisViewMode>('CATEGORY');
  const [metricType, setMetricType] = useState<MetricType>('UNITS');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  // --- 1. Top High-Level Metrics ---
  const overallSummary = useMemo(() => {
    let totalUnits = 0;
    let totalPallets = 0;
    const modelSet = new Set<string>();
    const locatorSet = new Set<string>();
    let holdCount = 0;
    let agingAlertCount = 0;

    items.forEach((item) => {
      totalUnits += item.quantity || 0;
      const pallets = item.fullPallets ?? (item.stdQtyPerPallet ? Math.ceil(item.quantity / item.stdQtyPerPallet) : 1);
      totalPallets += pallets;
      modelSet.add(item.modelHE);
      if (item.locatorCode) locatorSet.add(item.locatorCode);
      if (item.holdStatus) holdCount++;
      if (['WARNING', 'URGENT', 'EXPIRED', 'OVERDUE', 'DUE_TODAY'].includes(item.agingStatus)) {
        agingAlertCount++;
      }
    });

    return {
      totalUnits,
      totalPallets,
      totalModels: modelSet.size,
      occupiedLocators: locatorSet.size,
      holdCount,
      agingAlertCount,
      totalItemsCount: items.length
    };
  }, [items]);

  // --- 2. Category / Product Type Breakdown ---
  const categoryData = useMemo(() => {
    const categoriesMap: Record<string, {
      type: ProductType | 'OTHER';
      label: string;
      color: string;
      bgColor: string;
      units: number;
      pallets: number;
      itemCount: number;
      models: Set<string>;
      holdCount: number;
      agingCount: number;
    }> = {
      IN_HOUSE: {
        type: 'IN_HOUSE',
        label: 'ชิ้นส่วนในบ้าน (In-House)',
        color: '#3b82f6', // Blue
        bgColor: 'bg-blue-500',
        units: 0,
        pallets: 0,
        itemCount: 0,
        models: new Set(),
        holdCount: 0,
        agingCount: 0
      },
      CSKD: {
        type: 'CSKD',
        label: 'ชิ้นส่วนส่งออก (CSKD)',
        color: '#10b981', // Emerald
        bgColor: 'bg-emerald-500',
        units: 0,
        pallets: 0,
        itemCount: 0,
        models: new Set(),
        holdCount: 0,
        agingCount: 0
      },
      DO: {
        type: 'DO',
        label: 'สินค้าสำเร็จรูป (DO)',
        color: '#8b5cf6', // Purple
        bgColor: 'bg-purple-500',
        units: 0,
        pallets: 0,
        itemCount: 0,
        models: new Set(),
        holdCount: 0,
        agingCount: 0
      },
      OTHER: {
        type: 'OTHER',
        label: 'ทั่วไป / อื่นๆ (Other)',
        color: '#f59e0b', // Amber
        bgColor: 'bg-amber-500',
        units: 0,
        pallets: 0,
        itemCount: 0,
        models: new Set(),
        holdCount: 0,
        agingCount: 0
      }
    };

    items.forEach((item) => {
      // Determine product category
      let catKey = item.productType || 'OTHER';
      if (!categoriesMap[catKey]) catKey = 'OTHER';

      const target = categoriesMap[catKey];
      target.units += item.quantity || 0;
      const pallets = item.fullPallets ?? (item.stdQtyPerPallet ? Math.ceil(item.quantity / item.stdQtyPerPallet) : 1);
      target.pallets += pallets;
      target.itemCount += 1;
      target.models.add(item.modelHE);

      if (item.holdStatus) target.holdCount++;
      if (['WARNING', 'URGENT', 'EXPIRED', 'OVERDUE'].includes(item.agingStatus)) {
        target.agingCount++;
      }
    });

    const totalVal = metricType === 'UNITS' ? overallSummary.totalUnits : overallSummary.totalPallets;

    return Object.values(categoriesMap).map((cat) => {
      const val = metricType === 'UNITS' ? cat.units : cat.pallets;
      const percentage = totalVal > 0 ? ((val / totalVal) * 100).toFixed(1) : '0';

      return {
        key: cat.type,
        name: cat.label,
        value: val,
        units: cat.units,
        pallets: cat.pallets,
        modelCount: cat.models.size,
        itemCount: cat.itemCount,
        percentage: Number(percentage),
        holdCount: cat.holdCount,
        agingCount: cat.agingCount,
        color: cat.color,
        bgColor: cat.bgColor
      };
    });
  }, [items, metricType, overallSummary]);

  // --- 3. Storage Status & Aging Breakdown ---
  const statusData = useMemo(() => {
    const statusMap = {
      NORMAL: {
        key: 'NORMAL',
        label: 'ปกติ (0-21 วัน)',
        color: '#10b981', // Emerald
        bgColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        count: 0,
        units: 0,
        pallets: 0
      },
      WARNING: {
        key: 'WARNING',
        label: 'เฝ้าระวัง (22-24 วัน)',
        color: '#eab308', // Yellow
        bgColor: 'bg-yellow-50 text-yellow-800 border-yellow-200',
        count: 0,
        units: 0,
        pallets: 0
      },
      URGENT: {
        key: 'URGENT',
        label: 'ด่วนที่สุด (25-27 วัน)',
        color: '#f97316', // Orange
        bgColor: 'bg-orange-50 text-orange-800 border-orange-200',
        count: 0,
        units: 0,
        pallets: 0
      },
      EXPIRED: {
        key: 'EXPIRED',
        label: 'เกินกำหนด (>28 วัน)',
        color: '#ef4444', // Red
        bgColor: 'bg-red-50 text-red-800 border-red-200',
        count: 0,
        units: 0,
        pallets: 0
      },
      HOLD: {
        key: 'HOLD',
        label: 'ติดล็อก QC (Hold)',
        color: '#a855f7', // Purple
        bgColor: 'bg-purple-50 text-purple-800 border-purple-200',
        count: 0,
        units: 0,
        pallets: 0
      }
    };

    items.forEach((item) => {
      const pallets = item.fullPallets ?? (item.stdQtyPerPallet ? Math.ceil(item.quantity / item.stdQtyPerPallet) : 1);
      
      if (item.holdStatus) {
        statusMap.HOLD.count += 1;
        statusMap.HOLD.units += item.quantity || 0;
        statusMap.HOLD.pallets += pallets;
      } else if (['EXPIRED', 'OVERDUE'].includes(item.agingStatus)) {
        statusMap.EXPIRED.count += 1;
        statusMap.EXPIRED.units += item.quantity || 0;
        statusMap.EXPIRED.pallets += pallets;
      } else if (['URGENT', 'DUE_TODAY'].includes(item.agingStatus)) {
        statusMap.URGENT.count += 1;
        statusMap.URGENT.units += item.quantity || 0;
        statusMap.URGENT.pallets += pallets;
      } else if (item.agingStatus === 'WARNING') {
        statusMap.WARNING.count += 1;
        statusMap.WARNING.units += item.quantity || 0;
        statusMap.WARNING.pallets += pallets;
      } else {
        statusMap.NORMAL.count += 1;
        statusMap.NORMAL.units += item.quantity || 0;
        statusMap.NORMAL.pallets += pallets;
      }
    });

    const totalVal = metricType === 'UNITS' ? overallSummary.totalUnits : overallSummary.totalPallets;

    return Object.values(statusMap).map((st) => {
      const val = metricType === 'UNITS' ? st.units : st.pallets;
      const percentage = totalVal > 0 ? ((val / totalVal) * 100).toFixed(1) : '0';

      return {
        ...st,
        value: val,
        percentage: Number(percentage)
      };
    });
  }, [items, metricType, overallSummary]);

  // --- 4. Facility Zone Breakdown ---
  const facilityData = useMemo(() => {
    const zonesConfig = [
      {
        id: 'A4_RACK',
        name: 'อาคาร A4 แร็คจัดเก็บสูง (Selective Rack)',
        code: 'A4-RACK',
        maxCapacityPallets: 680,
        color: '#2563eb', // Blue
        filterMatch: (item: InventoryItem) => ['B','C','D','E','F','G','H','I','J','K'].includes(item.zone)
      },
      {
        id: 'A4_FLOOR',
        name: 'อาคาร A4 พื้นที่วางพื้น (Floor Staging)',
        code: 'A4-FLOOR',
        maxCapacityPallets: 432,
        color: '#0891b2', // Cyan
        filterMatch: (item: InventoryItem) => ['X1','X2','X3','X4','X5','X6','X7','X8'].includes(item.zone) || item.locatorCode.startsWith('DA4D-1')
      },
      {
        id: 'A2_RAIL',
        name: 'อาคาร A2 คลังรางเลื่อน (Flow Rail)',
        code: 'A2-RAIL',
        maxCapacityPallets: 160,
        color: '#059669', // Emerald
        filterMatch: (item: InventoryItem) => item.facilityId === 'FAC-A2-RAIL' || item.locatorCode.startsWith('DA2D-1') || (item.zone && (item.zone.startsWith('R') || item.zone.startsWith('FR')))
      },
      {
        id: 'A5_TENT',
        name: 'อาคาร A5 ลานเต็นท์จัดเก็บ (Tent Staging)',
        code: 'A5-TENT',
        maxCapacityPallets: 784,
        color: '#d97706', // Amber
        filterMatch: (item: InventoryItem) => item.facilityId === 'FAC-A5-TENT' || item.locatorCode.includes('DA5T') || (item.zone && item.zone.startsWith('T'))
      },
      {
        id: 'CY3_TENT',
        name: 'โซน CY3 แร็คเต็นท์ (CY3 Rack)',
        code: 'CY3-TENT',
        maxCapacityPallets: 400,
        color: '#7c3aed', // Purple
        filterMatch: (item: InventoryItem) => item.facilityId === 'FAC-CY3-TENT' || item.locatorCode.includes('CY3')
      }
    ];

    return zonesConfig.map((z) => {
      const zoneItems = items.filter(z.filterMatch);
      let units = 0;
      let pallets = 0;
      let agingCount = 0;

      zoneItems.forEach((it) => {
        units += it.quantity || 0;
        const p = it.fullPallets ?? (it.stdQtyPerPallet ? Math.ceil(it.quantity / it.stdQtyPerPallet) : 1);
        pallets += p;
        if (['WARNING', 'URGENT', 'EXPIRED', 'OVERDUE'].includes(it.agingStatus)) agingCount++;
      });

      const utilizationPercent = Math.min(100, Math.round((pallets / z.maxCapacityPallets) * 100));

      return {
        id: z.id,
        name: z.name,
        code: z.code,
        units,
        pallets,
        maxCapacityPallets: z.maxCapacityPallets,
        utilizationPercent,
        agingCount,
        color: z.color,
        itemCount: zoneItems.length
      };
    });
  }, [items]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
      {/* --- HEADER BAR --- */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-slate-900">
                รายงานสรุปปริมาณสินค้าคงคลัง (Stock Summary Report)
              </h3>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                <span>Real-time Sync</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              สรุปปริมาณและสัดส่วนสินค้าคงคลังแยกตาม Category, สถานะจัดเก็บ และโซนคลังสินค้า
            </p>
          </div>
        </div>

        {/* CONTROLS: View Mode Tabs & Metric Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Segmented Control */}
          <div className="bg-slate-100 p-0.5 rounded-lg border border-slate-200 flex items-center text-xs font-bold">
            <button
              onClick={() => setViewMode('CATEGORY')}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center space-x-1 ${
                viewMode === 'CATEGORY'
                  ? 'bg-white text-blue-700 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>ตาม Category</span>
            </button>
            <button
              onClick={() => setViewMode('STATUS')}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center space-x-1 ${
                viewMode === 'STATUS'
                  ? 'bg-white text-blue-700 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>ตาม Aging / สถานะ</span>
            </button>
            <button
              onClick={() => setViewMode('FACILITY')}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center space-x-1 ${
                viewMode === 'FACILITY'
                  ? 'bg-white text-blue-700 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Warehouse className="w-3.5 h-3.5" />
              <span>ตามโซนคลัง</span>
            </button>
          </div>

          {/* Metric Toggle (Units / Pallets) */}
          <div className="bg-slate-100 p-0.5 rounded-lg border border-slate-200 flex items-center text-xs font-bold shrink-0">
            <button
              onClick={() => setMetricType('UNITS')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                metricType === 'UNITS'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ชิ้น (Units)
            </button>
            <button
              onClick={() => setMetricType('PALLETS')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                metricType === 'PALLETS'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              พาเลท (Pallets)
            </button>
          </div>
        </div>
      </div>

      {/* --- TOP SUMMARY METRICS CARDS STRIP --- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {/* Total Quantity */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase">สต็อกรวมสุทธิ</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-black text-slate-900">
              {overallSummary.totalUnits.toLocaleString()}
            </span>
            <span className="text-[10px] font-bold text-slate-500">ชิ้น</span>
          </div>
        </div>

        {/* Total Pallets */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase">พาเลทจัดเก็บรวม</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-black text-blue-600">
              {overallSummary.totalPallets.toLocaleString()}
            </span>
            <span className="text-[10px] font-bold text-slate-500">Pallets</span>
          </div>
        </div>

        {/* Active Models */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase">จำนวนรุ่น/Model</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-black text-slate-900">
              {overallSummary.totalModels}
            </span>
            <span className="text-[10px] font-bold text-slate-500">รุ่น</span>
          </div>
        </div>

        {/* Occupied Locators */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-500 uppercase">ตำแหน่งที่ใช้งาน</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-black text-indigo-600">
              {overallSummary.occupiedLocators}
            </span>
            <span className="text-[10px] font-bold text-slate-500">ช่อง</span>
          </div>
        </div>

        {/* Hold Count */}
        <div className={`border rounded-lg p-2.5 flex flex-col justify-between ${
          overallSummary.holdCount > 0 
            ? 'bg-purple-50 border-purple-200' 
            : 'bg-slate-50 border-slate-200'
        }`}>
          <span className="text-[10px] font-bold text-purple-700 uppercase">ติดล็อก QC / Hold</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-black text-purple-800">
              {overallSummary.holdCount}
            </span>
            <span className="text-[10px] font-bold text-purple-600">รายการ</span>
          </div>
        </div>

        {/* Aging Alerts */}
        <div className={`border rounded-lg p-2.5 flex flex-col justify-between ${
          overallSummary.agingAlertCount > 0 
            ? 'bg-amber-50 border-amber-200' 
            : 'bg-slate-50 border-slate-200'
        }`}>
          <span className="text-[10px] font-bold text-amber-700 uppercase">เตือน Aging</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-lg font-black text-amber-800">
              {overallSummary.agingAlertCount}
            </span>
            <span className="text-[10px] font-bold text-amber-600">รายการ</span>
          </div>
        </div>
      </div>

      {/* --- MAIN BODY SECTION BASED ON VIEW MODE --- */}

      {/* MODE 1: BY CATEGORY */}
      {viewMode === 'CATEGORY' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1">
          {/* Chart View (7 Cols) */}
          <div className="lg:col-span-7 bg-slate-50/70 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <BarChart2 className="w-4 h-4 text-blue-600" />
                <span>แผนภูมิเปรียบเทียบตาม Category ({metricType === 'UNITS' ? 'ชิ้น' : 'พาเลท'})</span>
              </span>
              <span className="text-[11px] font-medium text-slate-500">
                รวม 100% สต็อก
              </span>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} margin={{ top: 10, right: 15, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 10, fill: '#475569', fontWeight: 'bold' }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: '#64748b' }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.5rem',
                      color: '#fff',
                      fontSize: '11px'
                    }}
                    formatter={(val: any, name: any, props: any) => [
                      `${Number(val).toLocaleString()} ${metricType === 'UNITS' ? 'ชิ้น' : 'พาเลท'} (${props.payload.percentage}%)`,
                      'ปริมาณคงคลัง'
                    ]}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {categoryData.map((entry, index) => (
                      <Cell key={`cat-cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-center gap-4 pt-2 border-t border-slate-200 text-[11px] font-bold text-slate-600">
              {categoryData.map((cat) => (
                <div key={cat.key} className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: cat.color }} />
                  <span>{cat.name.split(' ')[0]} ({cat.percentage}%)</span>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Table (5 Cols) */}
          <div className="lg:col-span-5 space-y-3">
            <span className="text-xs font-bold text-slate-800 block mb-1">
              สัดส่วนและสถานะราย Category
            </span>

            <div className="space-y-2.5">
              {categoryData.map((cat) => (
                <div 
                  key={cat.key}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-3 hover:border-slate-300 transition-all"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span>{cat.name}</span>
                    </div>
                    <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {cat.percentage}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 rounded-full h-2 mt-2 overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500" 
                      style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-2.5 pt-2 border-t border-slate-200 text-[11px]">
                    <div>
                      <span className="text-slate-500 block text-[10px]">ปริมาณสุทธิ</span>
                      <strong className="text-slate-800">{cat.units.toLocaleString()} ชิ้น</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">จำนวนพาเลท</span>
                      <strong className="text-slate-800">{cat.pallets} Pallets</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">จำนวนรุ่น</span>
                      <strong className="text-slate-800">{cat.modelCount} Models</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: BY AGING / STATUS */}
      {viewMode === 'STATUS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1">
          {/* Donut Chart (5 Cols) */}
          <div className="lg:col-span-5 bg-slate-50/70 border border-slate-200 rounded-xl p-4 flex flex-col justify-between items-center text-center">
            <span className="text-xs font-bold text-slate-800 mb-1 w-full text-left flex items-center space-x-1.5">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>สัดส่วนตามสถานะ Aging & QC Hold</span>
            </span>

            <div className="h-56 w-full my-auto">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`status-pie-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.5rem',
                      color: '#fff',
                      fontSize: '11px'
                    }}
                    formatter={(val: any, name: any, props: any) => [
                      `${Number(val).toLocaleString()} ${metricType === 'UNITS' ? 'ชิ้น' : 'พาเลท'} (${props.payload.percentage}%)`,
                      props.payload.label
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="text-[11px] text-slate-500 font-medium pt-2 border-t border-slate-200 w-full flex items-center justify-around">
              <span>🟢 ปกติ: {statusData.find(s=>s.key==='NORMAL')?.percentage}%</span>
              <span>🟡 เฝ้าระวัง: {statusData.find(s=>s.key==='WARNING')?.percentage}%</span>
              <span>🔴 เกินกำหนด: {statusData.find(s=>s.key==='EXPIRED')?.percentage}%</span>
            </div>
          </div>

          {/* Status Breakdown List (7 Cols) */}
          <div className="lg:col-span-7 space-y-2.5">
            <span className="text-xs font-bold text-slate-800 block mb-1">
              รายละเอียดและคำแนะนำจัดการตามสถานะ
            </span>

            {statusData.map((st) => (
              <div 
                key={st.key}
                className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition-all"
              >
                <div className="flex items-center space-x-3">
                  <span 
                    className="w-3 h-3 rounded-full shrink-0" 
                    style={{ backgroundColor: st.color }} 
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      {st.label}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      จำนวน {st.count} รายการ ({st.percentage}% ของสต็อกทั้งหมด)
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200 text-right">
                  <div>
                    <span className="text-[10px] text-slate-500 block font-medium">ปริมาณ</span>
                    <span className="text-xs font-black text-slate-800">
                      {st.units.toLocaleString()} ชิ้น
                    </span>
                  </div>
                  <div className="min-w-[60px]">
                    <span className="text-[10px] text-slate-500 block font-medium">พาเลท</span>
                    <span className="text-xs font-black text-blue-600">
                      {st.pallets} P
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODE 3: BY FACILITY / ZONE */}
      {viewMode === 'FACILITY' && (
        <div className="space-y-3 pt-1">
          <span className="text-xs font-bold text-slate-800 block">
            การกระจายตัวของสต็อกสินค้าแยกตามพื้นที่คลังสินค้า (Facility Location)
          </span>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {facilityData.map((fac) => (
              <div 
                key={fac.id}
                className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5 hover:border-slate-300 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      {fac.name}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">
                      รหัส: {fac.code}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    fac.utilizationPercent >= 85 
                      ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}>
                    ใช้งาน {fac.utilizationPercent}%
                  </span>
                </div>

                {/* Capacity utilization bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-600">
                    <span>ความจุพาเลท ({fac.pallets} / {fac.maxCapacityPallets} P)</span>
                    <span>{fac.utilizationPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500" 
                      style={{ 
                        width: `${fac.utilizationPercent}%`, 
                        backgroundColor: fac.color 
                      }} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-[11px]">
                  <div>
                    <span className="text-slate-500 block text-[10px]">ยอดชิ้นส่วนคงเหลือ</span>
                    <strong className="text-slate-800">{fac.units.toLocaleString()} ชิ้น</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">เตือน Aging ในโซน</span>
                    <strong className={fac.agingCount > 0 ? 'text-amber-700 font-bold' : 'text-slate-700'}>
                      {fac.agingCount} รายการ
                    </strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- FOOTER ACTION & QUICK RECOMMENDATION BANNER --- */}
      <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-2 text-slate-600">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            💡 สามารถกดสลับมุมมองหรือคลิกตรวจสอบรายละเอียดเพิ่มเติมในเมนู <strong>สต็อกสินค้า</strong> หรือ <strong>อายุจัดเก็บ (FIFO)</strong> ได้ทันที
          </span>
        </div>

        {onSelectFilter && (
          <button
            onClick={() => onSelectFilter('inventory')}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-2xs flex items-center space-x-1 transition-all shrink-0 self-end sm:self-auto"
          >
            <span>ตรวจสอบสต็อกทั้งหมด</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
