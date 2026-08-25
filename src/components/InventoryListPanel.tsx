import React, { useState, useMemo } from 'react';
import { InventoryItem, MovementType, ShelfLevel, StorageZone, WarehouseFacility } from '../types';
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
  Download,
  Building2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Clock,
  Flame,
  Filter,
  RefreshCw,
  Boxes
} from 'lucide-react';

interface InventoryListPanelProps {
  items: InventoryItem[];
  facilities?: WarehouseFacility[];
  activeFacilityId?: string;
  setActiveFacilityId?: (id: string) => void;
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

export type SortField = 
  | 'STATUS' 
  | 'MODEL' 
  | 'PART_NAME' 
  | 'LOCATOR' 
  | 'QTY' 
  | 'PALLETS' 
  | 'SAFETY_STOCK' 
  | 'DEFICIT' 
  | 'AGING_DAYS' 
  | 'LINE';

export type SortDirection = 'ASC' | 'DESC';

export const InventoryListPanel: React.FC<InventoryListPanelProps> = ({
  items,
  facilities = [],
  activeFacilityId = 'ALL',
  setActiveFacilityId,
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
  const [facilityFilter, setFacilityFilter] = useState<string>(activeFacilityId);
  
  // Dynamic Sorting States
  const [sortField, setSortField] = useState<SortField>('STATUS');
  const [sortDirection, setSortDirection] = useState<SortDirection>('ASC');

  // Keep local search term synchronized if global search query changes from parent
  React.useEffect(() => {
    if (globalSearchQuery !== undefined) {
      setSearchTerm(globalSearchQuery);
    }
  }, [globalSearchQuery]);

  // Keep facility filter synchronized
  React.useEffect(() => {
    if (activeFacilityId !== undefined) {
      setFacilityFilter(activeFacilityId);
    }
  }, [activeFacilityId]);

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

  // Helper to get deficit gap (positive means low stock / shortage)
  const getDeficit = (item: InventoryItem) => {
    const safety = getSafetyStock(item);
    return Math.max(0, safety - item.quantity);
  };

  // Calculate low stock items count
  const lowStockItems = useMemo(() => {
    return items.filter((item) => item.quantity <= getSafetyStock(item));
  }, [items, globalSafetyThreshold]);

  // Handle header click to toggle sort or switch direction
  const handleSortClick = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction
      setSortDirection(prev => (prev === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortField(field);
      // Default to ascending for text/names/locators, descending for aging/deficit/qty priorities
      if (field === 'AGING_DAYS' || field === 'DEFICIT') {
        setSortDirection('DESC');
      } else if (field === 'QTY') {
        setSortDirection('ASC'); // Default show lowest first to spot stockouts
      } else {
        setSortDirection('ASC');
      }
    }
  };

  // Preset Sort Handlers for Rapid Action Toolbar
  const applyPresetSort = (field: SortField, direction: SortDirection) => {
    setSortField(field);
    setSortDirection(direction);
  };

  // Filter and sort items according to criteria
  const filteredAndSortedItems = useMemo(() => {
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
      const matchFacility = facilityFilter === 'ALL' || item.facilityId === facilityFilter || (!item.facilityId && facilityFilter === 'FAC-A4');

      return matchSearch && matchFilterMode && matchZone && matchLine && matchLevel && matchAging && matchFacility;
    });

    // Dynamic Multi-field Sorting
    return [...list].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'STATUS': {
          const aLow = a.quantity <= getSafetyStock(a);
          const bLow = b.quantity <= getSafetyStock(b);
          if (aLow && !bLow) comparison = -1;
          else if (!aLow && bLow) comparison = 1;
          else comparison = getDeficit(b) - getDeficit(a); // Higher deficit first within low
          break;
        }
        case 'MODEL':
          comparison = a.modelHE.localeCompare(b.modelHE);
          break;
        case 'PART_NAME':
          comparison = a.partName.localeCompare(b.partName);
          break;
        case 'LOCATOR':
          comparison = a.locatorCode.localeCompare(b.locatorCode);
          break;
        case 'QTY':
          comparison = a.quantity - b.quantity;
          break;
        case 'PALLETS': {
          const stdA = a.stdQtyPerPallet || 80;
          const palletsA = a.fullPallets ?? (a.quantity / stdA);
          const stdB = b.stdQtyPerPallet || 80;
          const palletsB = b.fullPallets ?? (b.quantity / stdB);
          comparison = palletsA - palletsB;
          break;
        }
        case 'SAFETY_STOCK':
          comparison = getSafetyStock(a) - getSafetyStock(b);
          break;
        case 'DEFICIT':
          comparison = getDeficit(a) - getDeficit(b);
          break;
        case 'AGING_DAYS':
          comparison = (a.agingDays || 0) - (b.agingDays || 0);
          break;
        case 'LINE':
          comparison = a.useLine.localeCompare(b.useLine);
          break;
        default:
          comparison = 0;
      }

      return sortDirection === 'ASC' ? comparison : -comparison;
    });
  }, [
    items, 
    searchTerm, 
    filterMode, 
    zoneFilter, 
    lineFilter, 
    levelFilter, 
    agingFilter, 
    facilityFilter, 
    sortField, 
    sortDirection, 
    globalSafetyThreshold
  ]);

  // Export filtered inventory list to CSV
  const handleExportCSV = () => {
    const headers = [
      'Model HE',
      'Tool Name',
      'Quantity',
      'Safety Stock',
      'Stock Status',
      'Shortage Deficit (Units)',
      'Locator Code',
      'Zone',
      'Bay',
      'Level',
      'Use Line',
      'QR Code Tag',
      'Aging Days',
      'Aging Status'
    ];

    const rows = filteredAndSortedItems.map((item) => {
      const thresh = getSafetyStock(item);
      const isLow = item.quantity <= thresh;
      const deficit = getDeficit(item);
      return [
        item.modelHE,
        `"${item.partName}"`,
        item.quantity,
        thresh,
        isLow ? 'LOW_SAFETY_STOCK' : 'SAFE_STOCK',
        deficit,
        item.locatorCode,
        item.zone,
        item.bayNumber,
        `Level ${item.level}`,
        item.useLine,
        `"${item.qrCode}"`,
        item.agingDays || 0,
        item.agingStatus || 'SAFE'
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

  // Helper render sort header icon
  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity ml-1 inline-block" />;
    }
    return sortDirection === 'ASC' ? (
      <ArrowUp className="w-3.5 h-3.5 text-blue-600 ml-1 inline-block font-bold" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-blue-600 ml-1 inline-block font-bold" />
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-5 lg:p-6 shadow-sm text-slate-900 space-y-4 sm:space-y-6 w-full min-w-0 max-w-full">
      {/* Header & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 sm:pb-4 border-b border-slate-200 gap-3 sm:gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Package className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-800">
              รายการสต็อก &amp; ควบคุม Safety Stock (Inventory Master List)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            ค้นหาวัตถุดิบตาม Model HE, พิกัดจัดเก็บ พร้อมระบบจัดเรียงไดนามิก (Aging Days, ยอดคงเหลือ, ส่วนต่างวิกฤต)
          </p>
        </div>

        {/* Quick Summary KPIs & Export */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center space-x-1.5 text-xs font-bold">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600 animate-pulse" />
            <span>ต่ำกว่า Safety: {lowStockItems.length} รายการ</span>
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center space-x-1.5 transition-all"
          >
            <Download className="w-4 h-4 text-white" />
            <span>ส่งออก Excel (.csv)</span>
          </button>
        </div>
      </div>

      {/* Compact Main Search Bar & Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 sm:p-3 text-white shadow-xs space-y-2.5">
        {/* Row 1: Global Search + Safety Threshold + Multi Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Global Input Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="ค้นหา P/No, Model, Locator, Zone, Line, QR..."
              className="w-full bg-slate-800 border border-slate-700 focus:border-blue-500 rounded-lg pl-8 pr-7 py-1 text-xs text-white placeholder-slate-400 focus:outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Safety Stock Threshold Input */}
          <div className="flex items-center space-x-1.5 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 text-xs shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-300 font-semibold text-[11px]">Safety:</span>
            <input
              type="number"
              value={globalSafetyThreshold}
              onChange={(e) => setGlobalSafetyThreshold(Math.max(10, Number(e.target.value)))}
              className="w-14 bg-slate-900 border border-slate-600 rounded px-1.5 py-0.5 text-xs font-bold text-amber-300 text-center focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Facility Filter */}
          {facilities.length > 0 && (
            <select
              value={facilityFilter}
              onChange={(e) => {
                setFacilityFilter(e.target.value);
                if (setActiveFacilityId) {
                  setActiveFacilityId(e.target.value);
                }
              }}
              className="bg-slate-800 border border-slate-700 text-blue-300 font-bold px-2 py-1 rounded-lg text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">🌐 ทุกคลัง</option>
              {facilities.map((fac) => (
                <option key={fac.id} value={fac.id}>
                  {fac.name}
                </option>
              ))}
            </select>
          )}

          {/* Zone Filter */}
          <select
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 font-bold px-2 py-1 rounded-lg text-xs focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">ทุก Zone</option>
            {(['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'FR1', 'FR2', 'FR3', 'FR4', 'FL-A', 'FL-B', 'FL-C', 'FL-D', 'T1', 'T2', 'T3', 'T4'] as StorageZone[]).map((z) => (
              <option key={z} value={z}>
                Zone {z}
              </option>
            ))}
          </select>

          {/* Line Filter */}
          <select
            value={lineFilter}
            onChange={(e) => setLineFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 font-bold px-2 py-1 rounded-lg text-xs focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">ทุก Line</option>
            {['HE1', 'HE2', 'HE3', 'REPAIR'].map((line) => (
              <option key={line} value={line}>
                Line {line}
              </option>
            ))}
          </select>
          {/* Level Filter */}
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 font-bold px-2 py-1 rounded-lg text-xs focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">ทุกชั้น</option>
            <option value="1">ชั้น 1</option>
            <option value="2">ชั้น 2</option>
            <option value="3">ชั้น 3</option>
            <option value="4">ชั้น 4</option>
          </select>

          {/* Aging Status Filter */}
          <select
            value={agingFilter}
            onChange={(e) => setAgingFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 font-bold px-2 py-1 rounded-lg text-xs focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">ทุก Aging</option>
            <option value="SAFE">ปกติ (&le;15 วัน)</option>
            <option value="WARNING">เริ่มค้าง (16-30 วัน)</option>
            <option value="OVERDUE">Overdue (&gt;30 วัน)</option>
          </select>
        </div>

        {/* Row 2: Status Filter Tabs & Quick Priority Sorters */}
        <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Status Filter Chips */}
          <div className="flex items-center flex-wrap gap-1 font-bold">
            <button
              onClick={() => setFilterMode('ALL')}
              className={`px-2.5 py-1 rounded-lg border text-xs transition-all ${
                filterMode === 'ALL'
                  ? 'bg-blue-600 text-white border-blue-500 font-black shadow-xs'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              ทั้งหมด ({items.length})
            </button>
            <button
              onClick={() => setFilterMode('LOW_STOCK')}
              className={`px-2.5 py-1 rounded-lg border text-xs transition-all flex items-center space-x-1 ${
                filterMode === 'LOW_STOCK'
                  ? 'bg-red-600 text-white border-red-500 font-black shadow-xs'
                  : 'bg-slate-800 text-red-400 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>ขาด Safety ({lowStockItems.length})</span>
            </button>
            <button
              onClick={() => setFilterMode('SAFE_STOCK')}
              className={`px-2.5 py-1 rounded-lg border text-xs transition-all ${
                filterMode === 'SAFE_STOCK'
                  ? 'bg-emerald-600 text-white border-emerald-500 font-black shadow-xs'
                  : 'bg-slate-800 text-emerald-400 border-slate-700 hover:bg-slate-700'
              }`}
            >
              สต็อกปกติ ({items.length - lowStockItems.length})
            </button>

            <div className="h-4 w-px bg-slate-700 mx-1 hidden sm:block"></div>

            {/* Quick Sorters */}
            <button
              onClick={() => applyPresetSort('AGING_DAYS', 'DESC')}
              className={`px-2 py-1 rounded-lg border text-[11px] font-bold transition-all ${
                sortField === 'AGING_DAYS' && sortDirection === 'DESC'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                  : 'bg-slate-800/80 text-amber-300 border-slate-700 hover:bg-slate-700'
              }`}
              title="จัดเรียงสินค้าค้างนานสุดก่อน (FIFO)"
            >
              ⏰ FIFO นานสุด
            </button>
            <button
              onClick={() => applyPresetSort('QTY', 'ASC')}
              className={`px-2 py-1 rounded-lg border text-[11px] font-bold transition-all ${
                sortField === 'QTY' && sortDirection === 'ASC'
                  ? 'bg-rose-600 text-white border-rose-500 font-black'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              📉 เหลือน้อย
            </button>
            <button
              onClick={() => applyPresetSort('LOCATOR', 'ASC')}
              className={`px-2 py-1 rounded-lg border text-[11px] font-bold transition-all ${
                sortField === 'LOCATOR'
                  ? 'bg-blue-600 text-white border-blue-500 font-black'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              🏢 ตามพิกัด
            </button>
            <button
              onClick={() => applyPresetSort('MODEL', 'ASC')}
              className={`px-2 py-1 rounded-lg border text-[11px] font-bold transition-all ${
                sortField === 'MODEL' && sortDirection === 'ASC'
                  ? 'bg-indigo-600 text-white border-indigo-500 font-black'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              🔤 Model A-Z
            </button>
          </div>

          {/* Reset Filters / Sort Button */}
          <div className="flex items-center gap-1.5 ml-auto">
            {(zoneFilter !== 'ALL' || lineFilter !== 'ALL' || levelFilter !== 'ALL' || agingFilter !== 'ALL' || facilityFilter !== 'ALL' || searchTerm) && (
              <button
                onClick={() => {
                  setZoneFilter('ALL');
                  setLineFilter('ALL');
                  setLevelFilter('ALL');
                  setAgingFilter('ALL');
                  setFacilityFilter('ALL');
                  if (setActiveFacilityId) setActiveFacilityId('ALL');
                  handleSearchChange('');
                }}
                className="px-2 py-1 bg-red-900/40 hover:bg-red-900/60 text-red-300 rounded-lg text-[11px] font-bold transition-all border border-red-800"
              >
                ล้างตัวกรอง
              </button>
            )}
            <button
              onClick={() => {
                setSortField('STATUS');
                setSortDirection('ASC');
              }}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] font-bold transition-all flex items-center space-x-1 border border-slate-700"
              title="รีเซ็ตการจัดเรียงเป็นค่าเริ่มต้น"
            >
              <RefreshCw className="w-3 h-3" />
              <span>รีเซ็ต</span>
            </button>
          </div>
        </div>
      </div>

      {/* Inventory Table List with Interactive Sortable Columns */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] border-b border-slate-200 select-none">
            <tr>
              {/* Column 1: Safety Stock Status */}
              <th 
                onClick={() => handleSortClick('STATUS')}
                className="px-3.5 py-3 cursor-pointer hover:bg-slate-100 transition-colors group"
                title="คลิกเพื่อสลับการเรียงลำดับสถานะความปลอดภัย"
              >
                <div className="flex items-center space-x-1">
                  <span>สถานะ Safety Stock</span>
                  {renderSortIndicator('STATUS')}
                </div>
              </th>

              {/* Column 2: Model HE */}
              <th 
                onClick={() => handleSortClick('MODEL')}
                className="px-3.5 py-3 cursor-pointer hover:bg-slate-100 transition-colors group"
                title="คลิกเพื่อเรียงรหัส Model HE (A-Z / Z-A)"
              >
                <div className="flex items-center space-x-1">
                  <span>รหัสวัตถุดิบ (Model HE)</span>
                  {renderSortIndicator('MODEL')}
                </div>
              </th>

              {/* Column 3: Tool Name */}
              <th 
                onClick={() => handleSortClick('PART_NAME')}
                className="px-3.5 py-3 cursor-pointer hover:bg-slate-100 transition-colors group"
                title="คลิกเพื่อเรียงชื่อ Tool Name"
              >
                <div className="flex items-center space-x-1">
                  <span>ชื่อ Tool (Tool Name)</span>
                  {renderSortIndicator('PART_NAME')}
                </div>
              </th>

              {/* Column 4: Locator & Zone */}
              <th 
                onClick={() => handleSortClick('LOCATOR')}
                className="px-3.5 py-3 cursor-pointer hover:bg-slate-100 transition-colors group"
                title="คลิกเพื่อเรียงตำแหน่งจัดเก็บตามพิกัด Rack / Bay / ชั้น"
              >
                <div className="flex items-center space-x-1">
                  <span>ตำแหน่ง (Rack &amp; ชั้น)</span>
                  {renderSortIndicator('LOCATOR')}
                </div>
              </th>

              {/* Column 5: Actual Quantity */}
              <th 
                onClick={() => handleSortClick('QTY')}
                className="px-3.5 py-3 text-right cursor-pointer hover:bg-slate-100 transition-colors group"
                title="คลิกเพื่อเรียงยอดคงเหลือ (น้อยไปมาก หรือ มากไปน้อย)"
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>ยอดคงเหลือ (Qty)</span>
                  {renderSortIndicator('QTY')}
                </div>
              </th>

              {/* Column 6: Pallet Breakdown */}
              <th 
                onClick={() => handleSortClick('PALLETS')}
                className="px-3.5 py-3 text-center cursor-pointer hover:bg-slate-100 transition-colors group"
                title="คลิกเพื่อเรียงตามจำนวนพาเลท"
              >
                <div className="flex items-center justify-center space-x-1">
                  <span>จำนวนพาเลท</span>
                  {renderSortIndicator('PALLETS')}
                </div>
              </th>

              {/* Column 7: Safety Stock Threshold */}
              <th 
                onClick={() => handleSortClick('SAFETY_STOCK')}
                className="px-3.5 py-3 text-right cursor-pointer hover:bg-slate-100 transition-colors group"
                title="คลิกเพื่อเรียงตามเกณฑ์ Safety Stock"
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>เกณฑ์ Safety</span>
                  {renderSortIndicator('SAFETY_STOCK')}
                </div>
              </th>

              {/* Column 8: Aging Days & FIFO Status */}
              <th 
                onClick={() => handleSortClick('AGING_DAYS')}
                className="px-3.5 py-3 text-center cursor-pointer hover:bg-slate-100 transition-colors group"
                title="คลิกเพื่อเรียงอายุการจัดเก็บ (FIFO / Overdue)"
              >
                <div className="flex items-center justify-center space-x-1">
                  <span>อายุสต็อก (Aging)</span>
                  {renderSortIndicator('AGING_DAYS')}
                </div>
              </th>

              {/* Column 9: Line */}
              <th 
                onClick={() => handleSortClick('LINE')}
                className="px-3.5 py-3 text-center cursor-pointer hover:bg-slate-100 transition-colors group"
                title="คลิกเพื่อเรียงตามไลน์ผลิต"
              >
                <div className="flex items-center justify-center space-x-1">
                  <span>ไลน์ผลิต</span>
                  {renderSortIndicator('LINE')}
                </div>
              </th>

              {/* Column 10: Action buttons */}
              <th className="px-3.5 py-3 text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredAndSortedItems.length > 0 ? (
              filteredAndSortedItems.map((item) => {
                const safetyThreshold = getSafetyStock(item);
                const isLowStock = item.quantity <= safetyThreshold;
                const gapToSafety = safetyThreshold - item.quantity;

                const std = item.stdQtyPerPallet || 80;
                const fullP = item.fullPallets ?? Math.floor(item.quantity / std);
                const loose = item.looseQty ?? (item.quantity % std);
                const agingDays = item.agingDays || 0;

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    {/* Safety Stock Badge */}
                    <td className="px-3.5 py-2.5">
                      {isLowStock ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-extrabold border border-rose-200 text-[10px]">
                          <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                          <span>ต่ำกว่าเกณฑ์ (ขาด {gapToSafety})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-extrabold border border-emerald-200 text-[10px]">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>ปกติ (Safe)</span>
                        </span>
                      )}
                    </td>

                    {/* Model HE */}
                    <td className="px-3.5 py-2.5 font-mono font-bold text-slate-900">
                      {item.modelHE}
                    </td>

                    {/* Tool Name */}
                    <td className="px-3.5 py-2.5 font-medium text-slate-800">
                      <div>{item.partName}</div>
                      <div className="text-[10px] font-mono text-slate-400 truncate max-w-xs mt-0.5">
                        QR: {item.qrCode}
                      </div>
                    </td>

                    {/* Locator Code - Separated Rack & Level */}
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-extrabold text-[10px] border border-blue-200">
                          Rack {item.zone}{item.bayNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-extrabold text-[10px] border border-amber-200">
                          ชั้น {item.level}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {item.locatorCode}
                      </div>
                    </td>

                    {/* Actual Qty */}
                    <td className="px-3.5 py-2.5 text-right font-mono font-bold text-emerald-600">
                      {item.quantity.toLocaleString()} U
                    </td>

                    {/* Pallet Breakdown */}
                    <td className="px-3.5 py-2.5 text-center">
                      <span className="font-mono text-[11px] font-bold text-slate-800 px-2 py-0.5 bg-blue-50 border border-blue-200 rounded">
                        {fullP} P {loose > 0 ? `+ ${loose}` : ''}
                      </span>
                    </td>

                    {/* Safety Stock Threshold */}
                    <td className="px-3.5 py-2.5 text-right font-mono font-bold text-slate-600">
                      {safetyThreshold.toLocaleString()} U
                    </td>

                    {/* Aging Days Badge */}
                    <td className="px-3.5 py-2.5 text-center">
                      {agingDays > 30 ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-extrabold border border-rose-200 text-[10px] animate-pulse">
                          <Flame className="w-3 h-3 text-rose-600" />
                          <span>{agingDays} วัน (Overdue)</span>
                        </span>
                      ) : agingDays > 15 ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-extrabold border border-amber-200 text-[10px]">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>{agingDays} วัน (เตือน)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-extrabold border border-emerald-200 text-[10px]">
                          <span>{agingDays} วัน</span>
                        </span>
                      )}
                    </td>

                    {/* Line */}
                    <td className="px-3.5 py-2.5 text-center">
                      <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold text-[10px] border border-indigo-200">
                        Line {item.useLine}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-3.5 py-2.5 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => onOpen3DForLocator(item.zone, item.bayNumber)}
                          className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-all border border-blue-200 inline-flex items-center justify-center"
                          title="ส่องช่องนี้ในรูปแบบ 3D"
                        >
                          <Layers className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => onOpenScanForLevel(item.zone, item.bayNumber, item.level, 'IN')}
                          className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center space-x-1 shadow-sm transition-all active:scale-95"
                          title="เติมสินค้าเพิ่ม"
                        >
                          <ArrowDownRight className="w-3.5 h-3.5" />
                          <span>เติม</span>
                        </button>

                        <button
                          onClick={() => onOpenScanForLevel(item.zone, item.bayNumber, item.level, 'OUT')}
                          className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 inline-flex items-center space-x-1 shadow-sm transition-all active:scale-95"
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
                <td colSpan={10} className="py-8 text-center text-slate-500 font-medium">
                  ไม่พบวัตถุดิบตรงกับเงื่อนไขการค้นหา
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
          💡 คุณสามารถคลิกที่หัวตารางทุกคอลัมน์ (เช่น Aging Days, ยอดคงเหลือ, หรือ รหัส Model) เพื่อสลับการเรียงลำดับจากน้อยไปมาก หรือมากไปน้อยได้อย่างอิสระ
        </span>
      </div>
    </div>
  );
};

