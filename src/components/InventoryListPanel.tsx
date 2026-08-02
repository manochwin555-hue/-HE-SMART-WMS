import React, { useState, useMemo } from 'react';
import { InventoryItem, MovementType, ShelfLevel, StorageZone } from '../types';
import { 
  Search, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  ArrowUpRight, 
  ArrowDownRight, 
  SlidersHorizontal,
  Package,
  X,
  Sparkles,
  Download
} from 'lucide-react';

interface InventoryListPanelProps {
  items: InventoryItem[];
  globalSearchQuery?: string;
  onUpdateSearchQuery?: (q: string) => void;
  onOpen3DForLocator: (zone: StorageZone, bayNumber: number) => void;
  onOpenScanForLevel: (
    zone: StorageZone,
    bayNumber: number,
    level: ShelfLevel,
    mode: MovementType
  ) => void;
}

export const InventoryListPanel: React.FC<InventoryListPanelProps> = ({
  items,
  globalSearchQuery = '',
  onUpdateSearchQuery,
  onOpen3DForLocator,
  onOpenScanForLevel,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>(globalSearchQuery);
  const [filterMode, setFilterMode] = useState<'ALL' | 'LOW_STOCK' | 'SAFE_STOCK'>('ALL');
  const [globalSafetyThreshold, setGlobalSafetyThreshold] = useState<number>(300);
  const [zoneFilter, setZoneFilter] = useState<string>('ALL');
  const [lineFilter, setLineFilter] = useState<string>('ALL');
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [agingFilter, setAgingFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'DEFAULT' | 'QTY_ASC' | 'QTY_DESC' | 'AGING_DESC' | 'MODEL_ASC'>('DEFAULT');

  // Keep local search term synchronized if global search query changes from parent
  React.useEffect(() => {
    if (globalSearchQuery !== undefined) {
      setSearchTerm(globalSearchQuery);
    }
  }, [globalSearchQuery]);

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    if (onUpdateSearchQuery) {
      onUpdateSearchQuery(val);
    }
  };

  // Helper to get effective safety stock
  const getSafetyStock = (item: InventoryItem) => {
    return item.safetyStock ?? globalSafetyThreshold;
  };

  // Calculate low stock items count
  const lowStockItems = useMemo(() => {
    return items.filter((item) => item.quantity <= getSafetyStock(item));
  }, [items, globalSafetyThreshold]);

  // Filter and sort items according to criteria
  const filteredItems = useMemo(() => {
    const list = items.filter((item) => {
      const query = searchTerm.toLowerCase().trim();
      const matchSearch =
        !query ||
        item.modelHE.toLowerCase().includes(query) ||
        item.partName.toLowerCase().includes(query) ||
        item.locatorCode.toLowerCase().includes(query) ||
        item.qrCode.toLowerCase().includes(query) ||
        `zone ${item.zone}`.toLowerCase().includes(query) ||
        `${item.zone}${item.bayNumber}`.toLowerCase().includes(query) ||
        `rack ${item.zone}${item.bayNumber}`.toLowerCase().includes(query) ||
        `ชั้น ${item.level}`.toLowerCase().includes(query) ||
        `ชั้น${item.level}`.toLowerCase().includes(query) ||
        `level ${item.level}`.toLowerCase().includes(query) ||
        `l${item.level}`.toLowerCase().includes(query) ||
        item.useLine.toLowerCase().includes(query);

      const isLowStock = item.quantity <= getSafetyStock(item);
      const matchFilterMode =
        filterMode === 'ALL' ||
        (filterMode === 'LOW_STOCK' && isLowStock) ||
        (filterMode === 'SAFE_STOCK' && !isLowStock);

      const matchZone = zoneFilter === 'ALL' || item.zone === zoneFilter;
      const matchLine = lineFilter === 'ALL' || item.useLine === lineFilter;
      const matchLevel = levelFilter === 'ALL' || String(item.level) === levelFilter;
      const matchAging = agingFilter === 'ALL' || item.agingStatus === agingFilter;

      return matchSearch && matchFilterMode && matchZone && matchLine && matchLevel && matchAging;
    });

    if (sortBy === 'QTY_ASC') {
      return [...list].sort((a, b) => a.quantity - b.quantity);
    } else if (sortBy === 'QTY_DESC') {
      return [...list].sort((a, b) => b.quantity - a.quantity);
    } else if (sortBy === 'AGING_DESC') {
      return [...list].sort((a, b) => b.agingDays - a.agingDays);
    } else if (sortBy === 'MODEL_ASC') {
      return [...list].sort((a, b) => a.modelHE.localeCompare(b.modelHE));
    }

    return list;
  }, [items, searchTerm, filterMode, zoneFilter, lineFilter, levelFilter, agingFilter, sortBy, globalSafetyThreshold]);

  // Export filtered inventory list to CSV
  const handleExportCSV = () => {
    const headers = [
      'Model HE',
      'Tool Name',
      'Quantity',
      'Safety Stock',
      'Stock Status',
      'Locator Code',
      'Zone',
      'Bay',
      'Level',
      'Use Line',
      'QR Code Tag',
      'Aging Days'
    ];

    const rows = filteredItems.map((item) => {
      const thresh = getSafetyStock(item);
      const isLow = item.quantity <= thresh;
      return [
        item.modelHE,
        `"${item.partName}"`,
        item.quantity,
        thresh,
        isLow ? 'LOW_SAFETY_STOCK' : 'SAFE_STOCK',
        item.locatorCode,
        item.zone,
        item.bayNumber,
        `Level ${item.level}`,
        item.useLine,
        `"${item.qrCode}"`,
        item.agingDays
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `inventory_safety_stock_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm text-slate-900 space-y-6">
      {/* Header & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-red-50 text-red-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
              ค้นหาวัตถุดิบ & ระบบเตือน Safety Stock (Inventory Search & Threshold Alerts)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            ค้นหาวัตถุดิบตาม Model HE, Location Code (Zone/Bay/Level) หรือ QR Barcode พร้อมระบบแจ้งเตือนวัตถุดิบต่ำกว่าเกณฑ์ความปลอดภัย
          </p>
        </div>

        {/* Quick Summary KPIs */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-800 flex items-center space-x-2 text-xs font-bold">
            <AlertTriangle className="w-4 h-4 text-red-600 animate-pulse" />
            <span>ต่ำกว่า Safety Stock: {lowStockItems.length} รายการ</span>
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center space-x-1.5 shadow-sm transition-all"
          >
            <Download className="w-4 h-4" />
            <span>ส่งออก CSV</span>
          </button>
        </div>
      </div>

      {/* Main Search Bar & Threshold Control */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
          {/* Global Input Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="ค้นหาวัตถุดิบ เช่น ADL74920904, E6, DA4D, Zone E, Line HE1, QR Tag..."
              className="w-full bg-white border border-slate-300 focus:border-blue-500 rounded-lg pl-10 pr-9 py-2 text-xs text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
            />
            {searchTerm && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-2.5 p-0.5 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Safety Stock Threshold Slider / Input */}
          <div className="flex items-center space-x-3 bg-white px-3.5 py-2 rounded-lg border border-slate-200 shadow-sm text-xs shrink-0">
            <SlidersHorizontal className="w-4 h-4 text-amber-600" />
            <span className="text-slate-600 font-semibold">เกณฑ์ Safety Stock กลาง:</span>
            <input
              type="number"
              value={globalSafetyThreshold}
              onChange={(e) => setGlobalSafetyThreshold(Math.max(10, Number(e.target.value)))}
              className="w-20 bg-slate-50 border border-slate-300 rounded px-2 py-0.5 text-xs font-bold text-slate-800 text-center focus:outline-none focus:border-blue-500"
            />
            <span className="text-slate-500 font-medium">Units</span>
          </div>
        </div>

        {/* Filter Pills & Quick Chips */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 text-xs">
          {/* Status Filter Tabs */}
          <div className="flex bg-slate-200/70 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setFilterMode('ALL')}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                filterMode === 'ALL'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              ทั้งหมด ({items.length})
            </button>
            <button
              onClick={() => setFilterMode('LOW_STOCK')}
              className={`px-3 py-1 rounded-md font-semibold transition-all flex items-center space-x-1.5 ${
                filterMode === 'LOW_STOCK'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-red-700 hover:bg-red-100/50'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>เตือน Safety Stock ({lowStockItems.length})</span>
            </button>
            <button
              onClick={() => setFilterMode('SAFE_STOCK')}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${
                filterMode === 'SAFE_STOCK'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              ยอดคงเหลือปลอดภัย ({items.length - lowStockItems.length})
            </button>
          </div>

          {/* Secondary Multi-Criteria Filter Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Zone Filter Dropdown */}
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500 font-medium">Zone:</span>
              <select
                value={zoneFilter}
                onChange={(e) => setZoneFilter(e.target.value)}
                className="bg-white border border-slate-300 text-slate-800 font-bold px-2 py-1 rounded-lg text-xs focus:outline-none focus:border-blue-500 shadow-sm"
              >
                <option value="ALL">ทุก Zone (B-K)</option>
                {(['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'] as StorageZone[]).map((z) => (
                  <option key={z} value={z}>Zone {z}</option>
                ))}
              </select>
            </div>

            {/* Line Filter Dropdown */}
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500 font-medium">Line:</span>
              <select
                value={lineFilter}
                onChange={(e) => setLineFilter(e.target.value)}
                className="bg-white border border-slate-300 text-slate-800 font-bold px-2 py-1 rounded-lg text-xs focus:outline-none focus:border-blue-500 shadow-sm"
              >
                <option value="ALL">ทุก Line (HE1-3)</option>
                <option value="HE1">Line HE1</option>
                <option value="HE2">Line HE2</option>
                <option value="HE3">Line HE3</option>
              </select>
            </div>

            {/* Level Filter Dropdown */}
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500 font-medium">ชั้น (Level):</span>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="bg-white border border-slate-300 text-slate-800 font-bold px-2 py-1 rounded-lg text-xs focus:outline-none focus:border-blue-500 shadow-sm"
              >
                <option value="ALL">ทุกชั้น (1-4)</option>
                <option value="1">ชั้น 1</option>
                <option value="2">ชั้น 2</option>
                <option value="3">ชั้น 3</option>
                <option value="4">ชั้น 4</option>
              </select>
            </div>

            {/* Aging Status Filter Dropdown */}
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500 font-medium">สถานะ Aging:</span>
              <select
                value={agingFilter}
                onChange={(e) => setAgingFilter(e.target.value)}
                className="bg-white border border-slate-300 text-slate-800 font-bold px-2 py-1 rounded-lg text-xs focus:outline-none focus:border-blue-500 shadow-sm"
              >
                <option value="ALL">ทุกสถานะ Aging</option>
                <option value="SAFE">ปกติ (Safe)</option>
                <option value="WARNING">เริ่มจัดเก็บนาน (Warning)</option>
                <option value="OVERDUE">Overdue (&gt;30 วัน)</option>
              </select>
            </div>

            {/* Sorting Dropdown */}
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500 font-medium">เรียงตาม:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-white border border-slate-300 text-blue-700 font-bold px-2 py-1 rounded-lg text-xs focus:outline-none focus:border-blue-500 shadow-sm"
              >
                <option value="DEFAULT">ดั้งเดิม</option>
                <option value="QTY_ASC">จำนวนคงเหลือ (น้อย → มาก)</option>
                <option value="QTY_DESC">จำนวนคงเหลือ (มาก → น้อย)</option>
                <option value="AGING_DESC">อายุจัดเก็บ (นานที่สุดก่อน)</option>
                <option value="MODEL_ASC">Model HE (A-Z)</option>
              </select>
            </div>

            {/* Clear Filters Button */}
            {(zoneFilter !== 'ALL' || lineFilter !== 'ALL' || levelFilter !== 'ALL' || agingFilter !== 'ALL' || sortBy !== 'DEFAULT' || searchTerm) && (
              <button
                onClick={() => {
                  setZoneFilter('ALL');
                  setLineFilter('ALL');
                  setLevelFilter('ALL');
                  setAgingFilter('ALL');
                  setSortBy('DEFAULT');
                  handleSearchChange('');
                }}
                className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-[11px] transition-all"
              >
                ล้างตัวกรองทั้งหมด
              </button>
            )}
          </div>
        </div>

        {/* Quick Search Suggestions */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
          <span className="font-semibold text-slate-600">คำค้นหาแนะนำ:</span>
          {['ADL74920904', 'ACG76284709', 'E6', 'B11', 'Line HE2', 'Level 1'].map((tag) => (
            <button
              key={tag}
              onClick={() => handleSearchChange(tag)}
              className="px-2 py-0.5 rounded bg-white hover:bg-blue-50 text-blue-700 font-mono font-medium border border-slate-200 transition-all active:scale-95"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Table List */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] border-b border-slate-200">
            <tr>
              <th className="px-3.5 py-3">สถานะ Safety Stock</th>
              <th className="px-3.5 py-3">รหัสวัตถุดิบ (Model HE)</th>
              <th className="px-3.5 py-3">ชื่อ Tool (Tool Name)</th>
              <th className="px-3.5 py-3">ตำแหน่งจัดเก็บ (Rack & ชั้น)</th>
              <th className="px-3.5 py-3 text-right">ยอดคงเหลือ (Actual Qty)</th>
              <th className="px-3.5 py-3 text-center">จัดวางตามพาเลท (Pallet Breakdown)</th>
              <th className="px-3.5 py-3 text-right">เกณฑ์ Safety Stock</th>
              <th className="px-3.5 py-3 text-center">ไลน์ผลิต</th>
              <th className="px-3.5 py-3 text-center">ส่อง 3D Rack / สแกน</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => {
                const safetyThreshold = getSafetyStock(item);
                const isLowStock = item.quantity <= safetyThreshold;
                const gapToSafety = safetyThreshold - item.quantity;

                const std = item.stdQtyPerPallet || 80;
                const fullP = item.fullPallets ?? Math.floor(item.quantity / std);
                const loose = item.looseQty ?? (item.quantity % std);

                return (
                  <tr
                    key={item.id}
                    className={`transition-colors hover:bg-slate-50 ${
                      isLowStock ? 'bg-red-50/40 border-l-4 border-l-red-500' : ''
                    }`}
                  >
                    {/* Safety Stock Badge */}
                    <td className="px-3.5 py-3">
                      {isLowStock ? (
                        <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-red-100 text-red-800 font-bold text-[11px] border border-red-200">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600 animate-pulse shrink-0" />
                          <span>ต่ำกว่าเกณฑ์ (ขาด {gapToSafety} U)</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-semibold text-[11px] border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>ปลอดภัย (Safe)</span>
                        </div>
                      )}
                    </td>

                    {/* Model HE */}
                    <td className="px-3.5 py-3 font-mono font-bold text-blue-700 text-sm">
                      {item.modelHE}
                    </td>

                    {/* Tool Name */}
                    <td className="px-3.5 py-3 font-medium text-slate-800">
                      <div>{item.partName}</div>
                      <div className="text-[10px] font-mono text-slate-400 truncate max-w-xs mt-0.5">
                        QR: {item.qrCode}
                      </div>
                    </td>

                    {/* Locator Code - Separated Rack & Level */}
                    <td className="px-3.5 py-3">
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-extrabold text-[11px] border border-blue-300 shadow-xs">
                          Rack {item.zone}{item.bayNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-extrabold text-[11px] border border-amber-300 shadow-xs">
                          ชั้น {item.level}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-1 flex items-center space-x-1">
                        <span className="text-slate-400">Locator:</span>
                        <span className="font-semibold">{item.locatorCode}</span>
                      </div>
                    </td>

                    {/* Actual Qty */}
                    <td className="px-3.5 py-3 text-right font-mono font-black text-sm">
                      <span className={isLowStock ? 'text-red-600' : 'text-emerald-600'}>
                        {item.quantity.toLocaleString()} Units
                      </span>
                    </td>

                    {/* Pallet Breakdown */}
                    <td className="px-3.5 py-3 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className="font-mono text-xs font-bold text-slate-800 px-2 py-0.5 bg-blue-50 border border-blue-200 rounded">
                          📦 {fullP} พาเลทเต็ม {loose > 0 ? `+ เศษ ${loose} ตัว` : ''}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                          ({std} ตัว/Pallet)
                        </span>
                      </div>
                    </td>

                    {/* Safety Stock Threshold */}
                    <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-600">
                      {safetyThreshold.toLocaleString()} Units
                    </td>

                    {/* Line */}
                    <td className="px-3.5 py-3 text-center">
                      <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold text-[10px] border border-indigo-200">
                        Line {item.useLine}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-3.5 py-3 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => onOpen3DForLocator(item.zone, item.bayNumber)}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 inline-flex items-center space-x-1 shadow-sm"
                          title="ส่องช่องนี้ในรูปแบบ 3D"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>3D Rack</span>
                        </button>

                        <button
                          onClick={() => onOpenScanForLevel(item.zone, item.bayNumber, item.level, 'IN')}
                          className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center space-x-1 shadow-sm"
                          title="เติมสินค้าเพิ่ม"
                        >
                          <ArrowDownRight className="w-3.5 h-3.5" />
                          <span>เติม</span>
                        </button>

                        <button
                          onClick={() => onOpenScanForLevel(item.zone, item.bayNumber, item.level, 'OUT')}
                          className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 inline-flex items-center space-x-1 shadow-sm"
                          title="เบิกออก"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" />
                          <span>เบิก</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="text-center py-12 px-4 text-slate-500 space-y-2">
                  <Package className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="font-bold text-slate-700">ไม่พบวัตถุดิบตรงตามเงื่อนไขค้นหา</p>
                  <p className="text-xs text-slate-400">
                    ลองพิมพ์รหัสอื่น เช่น ADL, ACG หรือเปลี่ยนเงื่อนไขการกรอง
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Tip */}
      <div className="pt-2 text-[11px] text-slate-500 flex items-center space-x-2">
        <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
        <span>
          ระบบ Safety Stock Alert จะแจ้งเตือนทันทีเมื่อจำนวนคงเหลือลดลงต่ำกว่าเกณฑ์ความปลอดภัย ช่วยป้องกันปัญหาการขาดวัตถุดิบในสายการผลิต
        </span>
      </div>
    </div>
  );
};
