import React, { useState, useMemo } from 'react';
import { InventoryItem, MovementType, ShelfLevel, StorageZone, WarehouseFacility, AgingThresholdConfig } from '../types';
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
  Boxes,
  MapPin,
  ClockAlert,
  ShieldCheck,
  AlertOctagon,
  CalendarClock,
  Wrench,
  Check,
  AlertCircle
} from 'lucide-react';
import { HighlightText, getZoneMeta } from './GlobalSearchZoneLookup';

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
  onOpenVinylAction?: (item: InventoryItem) => void;
  agingConfig?: AgingThresholdConfig;
  onQuickPickItem?: (item: InventoryItem) => void;
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
  onOpenVinylAction,
  agingConfig,
  onQuickPickItem,
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

  // Helper function to resolve aging 5-level classification & presentation
  const getAgingInfo = (days: number = 0, status?: string) => {
    const safeMax = agingConfig?.safeDaysMax ?? 21;
    const warnMin = agingConfig?.warningDaysMin ?? 22;
    const warnMax = agingConfig?.warningDaysMax ?? 24;
    const urgMin = agingConfig?.urgentDaysMin ?? 25;
    const urgMax = agingConfig?.urgentDaysMax ?? 27;
    const dueD = agingConfig?.dueDay ?? 28;
    const critD = agingConfig?.criticalDays ?? 28;

    if (days > critD || status === 'EXPIRED' || status === 'OVERDUE' || status === 'CONDITION_NG') {
      return {
        level: 'EXPIRED' as const,
        label: 'EXPIRED',
        thaiLabel: `เกินเกณฑ์วิกฤต (>${critD} วัน)`,
        daysText: `${days} วัน (เกินเกณฑ์)`,
        badgeBg: 'bg-rose-100 text-rose-800 border-rose-300',
        badgePill: 'bg-rose-600 text-white',
        borderCard: 'border-rose-400 bg-rose-50/50',
        activeRing: 'ring-2 ring-rose-500 bg-rose-100/70 border-rose-500',
        dotColor: 'bg-rose-500',
        actionNeeded: 'Re-wrap / ตรวจสภาพด่วน',
        icon: Flame
      };
    }
    if (days === dueD || status === 'DUE_TODAY') {
      return {
        level: 'DUE_TODAY' as const,
        label: 'DUE TODAY',
        thaiLabel: `ครบกำหนดวันนี้ (${dueD} วัน)`,
        daysText: `${dueD} วัน (วันสุดท้าย)`,
        badgeBg: 'bg-red-50 text-red-700 border-red-300 font-bold',
        badgePill: 'bg-red-600 text-white',
        borderCard: 'border-red-400 bg-red-50/50',
        activeRing: 'ring-2 ring-red-500 bg-red-100/70 border-red-500',
        dotColor: 'bg-red-500',
        actionNeeded: 'เบิกจ่ายเข้าไลน์วันนี้',
        icon: CalendarClock
      };
    }
    if ((days >= urgMin && days <= urgMax) || status === 'URGENT') {
      return {
        level: 'URGENT' as const,
        label: 'URGENT',
        thaiLabel: `เร่งด่วน (${urgMin}-${urgMax} วัน)`,
        daysText: `${days} วัน (เร่งด่วน)`,
        badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
        badgePill: 'bg-amber-600 text-white',
        borderCard: 'border-amber-400 bg-amber-50/40',
        activeRing: 'ring-2 ring-amber-500 bg-amber-100/70 border-amber-500',
        dotColor: 'bg-amber-500',
        actionNeeded: 'เร่งระบายสินค้าเข้าไลน์',
        icon: AlertTriangle
      };
    }
    if ((days >= warnMin && days <= warnMax) || status === 'WARNING') {
      return {
        level: 'WARNING' as const,
        label: 'WARNING',
        thaiLabel: `เฝ้าระวัง (${warnMin}-${warnMax} วัน)`,
        daysText: `${days} วัน (เฝ้าระวัง)`,
        badgeBg: 'bg-yellow-100 text-yellow-900 border-yellow-300',
        badgePill: 'bg-yellow-600 text-white',
        borderCard: 'border-yellow-400 bg-yellow-50/30',
        activeRing: 'ring-2 ring-yellow-500 bg-yellow-100/70 border-yellow-500',
        dotColor: 'bg-yellow-500',
        actionNeeded: 'จัดเตรียมแผนเบิกจ่าย',
        icon: Clock
      };
    }
    return {
      level: 'NORMAL' as const,
      label: 'NORMAL',
      thaiLabel: `ปกติ (0-${safeMax} วัน)`,
      daysText: `${days} วัน`,
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-300',
      badgePill: 'bg-emerald-600 text-white',
      borderCard: 'border-emerald-300 bg-emerald-50/20',
      activeRing: 'ring-2 ring-emerald-500 bg-emerald-100/70 border-emerald-500',
      dotColor: 'bg-emerald-500',
      actionNeeded: 'หมุนเวียนสต็อกปกติ',
      icon: CheckCircle2
    };
  };

  // Helper check if rubber cap is required
  const checkRubberCap = (item: InventoryItem) => {
    const loc = `${item.facilityId || ''} ${item.zone} ${item.locatorCode}`.toUpperCase();
    const isOutdoor = loc.includes('CY3') || loc.includes('A5') || loc.includes('OUTDOOR') || loc.includes('CANOPY');
    const days = item.agingDays || 0;
    const indoorThreshold = agingConfig?.indoorRubberCapDays ?? 28;

    if (isOutdoor) {
      return {
        required: true,
        reason: 'Outdoor (CY3/A5 บังคับใส่วันแรก Day 0+)',
        label: 'Outdoor Cap'
      };
    }
    if (days > indoorThreshold) {
      return {
        required: true,
        reason: `Indoor > ${indoorThreshold} วัน (บังคับใส่จุกยาง/Re-wrapping)`,
        label: 'Overdue Cap'
      };
    }
    return {
      required: false,
      reason: `Indoor ≤ ${indoorThreshold} วัน (อนุโลม)`,
      label: 'Cap OK'
    };
  };

  // Dynamic Aging 5-Level Summary Statistics
  const agingSummaryStats = useMemo(() => {
    let normal = 0;
    let warning = 0;
    let urgent = 0;
    let dueToday = 0;
    let expired = 0;
    let rubberCapCount = 0;

    const safeMax = agingConfig?.safeDaysMax ?? 21;
    const warnMin = agingConfig?.warningDaysMin ?? 22;
    const warnMax = agingConfig?.warningDaysMax ?? 24;
    const urgMin = agingConfig?.urgentDaysMin ?? 25;
    const urgMax = agingConfig?.urgentDaysMax ?? 27;
    const dueD = agingConfig?.dueDay ?? 28;
    const critD = agingConfig?.criticalDays ?? 28;

    items.forEach((it) => {
      const days = it.agingDays || 0;
      const status = it.agingStatus;

      if (days > critD || status === 'EXPIRED' || status === 'OVERDUE' || status === 'CONDITION_NG') {
        expired++;
      } else if (days === dueD || status === 'DUE_TODAY') {
        dueToday++;
      } else if ((days >= urgMin && days <= urgMax) || status === 'URGENT') {
        urgent++;
      } else if ((days >= warnMin && days <= warnMax) || status === 'WARNING') {
        warning++;
      } else {
        normal++;
      }

      if (checkRubberCap(it).required) {
        rubberCapCount++;
      }
    });

    const total = items.length || 1;
    return {
      normal,
      normalPct: Math.round((normal / total) * 100),
      warning,
      warningPct: Math.round((warning / total) * 100),
      urgent,
      urgentPct: Math.round((urgent / total) * 100),
      dueToday,
      dueTodayPct: Math.round((dueToday / total) * 100),
      expired,
      expiredPct: Math.round((expired / total) * 100),
      rubberCapCount,
      rubberCapPct: Math.round((rubberCapCount / total) * 100),
      overdueGroup: warning + urgent + dueToday + expired,
      totalItems: items.length
    };
  }, [items, agingConfig]);

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

      let matchZone = true;
      if (zoneFilter !== 'ALL') {
        const loc = (item.locatorCode || '').toUpperCase();
        const zoneStr = (String(item.zone || '')).toUpperCase();
        const facId = item.facilityId || '';

        if (zoneFilter === 'A2') {
          matchZone = facId === 'FAC-A2-RAIL' || loc.startsWith('DA2D') || zoneStr.startsWith('R') || zoneStr.startsWith('FR') || zoneStr.startsWith('FL');
        } else if (zoneFilter === 'A4_FLOOR') {
          matchZone = facId === 'FAC-A4-FLOOR' || (loc.startsWith('DA4D-1') && !['B','C','D','E','F','G','H','I','J','K'].includes(zoneStr)) || ['X1','X2','X3','X4','X5','X6','X7','X8','FLOOR','STAGING'].includes(zoneStr);
        } else if (zoneFilter === 'A4_RACK') {
          matchZone = facId === 'FAC-A4-RACK' || loc.startsWith('DA4D-2') || loc.startsWith('DA4D-3') || ['B','C','D','E','F','G','H','I','J','K'].includes(zoneStr);
        } else if (zoneFilter === 'A5') {
          matchZone = facId === 'FAC-A5-TENT' || loc.startsWith('DA5T') || loc.startsWith('DAST') || zoneStr.startsWith('T');
        } else if (zoneFilter === 'CY3') {
          matchZone = facId === 'FAC-CY3-TENT' || loc.startsWith('DY3T') || zoneStr.startsWith('CY3');
        } else {
          matchZone = item.zone === zoneFilter || loc.includes(`-${zoneFilter}`);
        }
      }
      const matchLine = lineFilter === 'ALL' || item.useLine === lineFilter;
      const matchLevel = levelFilter === 'ALL' || String(item.level) === levelFilter;
      
      // Comprehensive 5-level Aging & Rubber Cap Filter
      const days = item.agingDays || 0;
      const status = item.agingStatus;
      const safeMax = agingConfig?.safeDaysMax ?? 21;
      const warnMin = agingConfig?.warningDaysMin ?? 22;
      const warnMax = agingConfig?.warningDaysMax ?? 24;
      const urgMin = agingConfig?.urgentDaysMin ?? 25;
      const urgMax = agingConfig?.urgentDaysMax ?? 27;
      const dueD = agingConfig?.dueDay ?? 28;
      const critD = agingConfig?.criticalDays ?? 28;

      let matchAging = true;
      if (agingFilter === 'NORMAL') {
        matchAging = (days <= safeMax && status !== 'EXPIRED' && status !== 'DUE_TODAY' && status !== 'URGENT' && status !== 'WARNING') || status === 'NORMAL' || status === 'SAFE';
      } else if (agingFilter === 'WARNING') {
        matchAging = status === 'WARNING' || (days >= warnMin && days <= warnMax);
      } else if (agingFilter === 'URGENT') {
        matchAging = status === 'URGENT' || (days >= urgMin && days <= urgMax);
      } else if (agingFilter === 'DUE_TODAY') {
        matchAging = status === 'DUE_TODAY' || days === dueD;
      } else if (agingFilter === 'EXPIRED') {
        matchAging = status === 'EXPIRED' || status === 'OVERDUE' || status === 'CONDITION_NG' || days > critD;
      } else if (agingFilter === 'OVERDUE_GROUP') {
        matchAging = days >= warnMin || ['WARNING', 'URGENT', 'DUE_TODAY', 'EXPIRED', 'OVERDUE', 'CONDITION_NG'].includes(status || '');
      } else if (agingFilter === 'RUBBER_CAP') {
        matchAging = checkRubberCap(item).required;
      }

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
          if (comparison === 0 && a.storageInDate && b.storageInDate) {
            comparison = a.storageInDate.localeCompare(b.storageInDate);
          }
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
    globalSafetyThreshold,
    agingConfig
  ]);

  // Real-time Part No Zone Breakdown when searching
  const searchedPartDistributions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return [];

    // Group items matching the search query by modelHE
    const map = new Map<string, InventoryItem[]>();
    for (const item of filteredAndSortedItems) {
      const arr = map.get(item.modelHE) || [];
      arr.push(item);
      map.set(item.modelHE, arr);
    }

    const results = [];
    for (const [model, modelItems] of map.entries()) {
      const totalQty = modelItems.reduce((acc, it) => acc + it.quantity, 0);
      const totalPallets = modelItems.reduce((acc, it) => {
        const std = it.stdQtyPerPallet || 80;
        return acc + (it.fullPallets ?? Math.ceil(it.quantity / std));
      }, 0);
      const partName = modelItems[0]?.partName || model;

      // Group by zone
      const zoneGroup = new Map<string, { qty: number; count: number; items: InventoryItem[] }>();
      for (const it of modelItems) {
        const z = String(it.zone);
        const curr = zoneGroup.get(z) || { qty: 0, count: 0, items: [] };
        curr.qty += it.quantity;
        curr.count += 1;
        curr.items.push(it);
        zoneGroup.set(z, curr);
      }

      const zoneList = Array.from(zoneGroup.entries()).map(([z, data]) => {
        const meta = getZoneMeta(z);
        return {
          zone: z,
          meta,
          qty: data.qty,
          count: data.count,
          items: data.items,
        };
      }).sort((a, b) => b.qty - a.qty);

      results.push({
        model,
        partName,
        totalQty,
        totalPallets,
        zoneCount: zoneList.length,
        locationCount: modelItems.length,
        zones: zoneList
      });
    }

    results.sort((a, b) => b.totalQty - a.totalQty);
    return results;
  }, [filteredAndSortedItems, searchTerm]);

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
      'Aging Status',
      'Aging Level (5 Levels)',
      'Rubber Cap Rule'
    ];

    const rows = filteredAndSortedItems.map((item) => {
      const thresh = getSafetyStock(item);
      const isLow = item.quantity <= thresh;
      const deficit = getDeficit(item);
      const agingInfo = getAgingInfo(item.agingDays || 0, item.agingStatus);
      const rubberCap = checkRubberCap(item);

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
        item.agingStatus || 'SAFE',
        agingInfo.level,
        `"${rubberCap.reason}"`
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
            รวมศูนย์ควบคุมสต็อก Safety Stock และติดตามอายุจัดเก็บ (FIFO / Aging 5 ระดับ) ในหน้าเดียว
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

      {/* 📊 AGING 5-LEVEL SUMMARY CARDS DASHBOARD (Interactive Filter) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
            <ClockAlert className="w-4 h-4 text-amber-600" />
            <span>สรุปสถานะอายุสต็อก 5 ระดับ (ตามเกณฑ์ Vinyl Wrapping &amp; กฎ 28 วัน)</span>
            <span className="text-[10px] text-slate-400 font-normal">
              (คลิกการ์ดเพื่อกรองตารางทันที)
            </span>
          </div>
          {agingFilter !== 'ALL' && (
            <button
              onClick={() => setAgingFilter('ALL')}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 inline-flex items-center space-x-1"
            >
              <span>กำลังกรอง: {agingFilter}</span>
              <X className="w-3 h-3 ml-0.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {/* Card 1: NORMAL (0-21 วัน) */}
          <div
            onClick={() => setAgingFilter(prev => prev === 'NORMAL' ? 'ALL' : 'NORMAL')}
            className={`rounded-xl p-2.5 border transition-all cursor-pointer select-none relative overflow-hidden ${
              agingFilter === 'NORMAL'
                ? 'ring-2 ring-emerald-500 bg-emerald-100/70 border-emerald-500 shadow-sm'
                : 'bg-emerald-50/50 hover:bg-emerald-50 border-emerald-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-600 text-white">
                1. NORMAL
              </span>
              <span className="text-[10px] font-bold text-emerald-700">0 - {agingConfig?.safeDaysMax ?? 21} วัน</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div className="text-xl font-black font-mono text-emerald-900">
                {agingSummaryStats.normal}
              </div>
              <div className="text-[11px] font-bold text-emerald-700">
                {agingSummaryStats.normalPct}%
              </div>
            </div>
            <div className="text-[10px] text-emerald-700 mt-1 truncate">
              ปลอดภัย หมุนเวียนปกติ
            </div>
            {agingFilter === 'NORMAL' && (
              <div className="absolute right-1 bottom-1">
                <Check className="w-3.5 h-3.5 text-emerald-700" />
              </div>
            )}
          </div>

          {/* Card 2: WARNING */}
          <div
            onClick={() => setAgingFilter(prev => prev === 'WARNING' ? 'ALL' : 'WARNING')}
            className={`rounded-xl p-2.5 border transition-all cursor-pointer select-none relative overflow-hidden ${
              agingFilter === 'WARNING'
                ? 'ring-2 ring-yellow-500 bg-yellow-100/80 border-yellow-500 shadow-sm'
                : 'bg-yellow-50/60 hover:bg-yellow-50 border-yellow-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-yellow-600 text-white">
                2. WARNING
              </span>
              <span className="text-[10px] font-bold text-yellow-800">{agingConfig?.warningDaysMin ?? 22} - {agingConfig?.warningDaysMax ?? 24} วัน</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div className="text-xl font-black font-mono text-yellow-900">
                {agingSummaryStats.warning}
              </div>
              <div className="text-[11px] font-bold text-yellow-800">
                {agingSummaryStats.warningPct}%
              </div>
            </div>
            <div className="text-[10px] text-yellow-800 mt-1 truncate">
              เริ่มมีอายุ เตรียมแผนเบิก
            </div>
            {agingFilter === 'WARNING' && (
              <div className="absolute right-1 bottom-1">
                <Check className="w-3.5 h-3.5 text-yellow-800" />
              </div>
            )}
          </div>

          {/* Card 3: URGENT */}
          <div
            onClick={() => setAgingFilter(prev => prev === 'URGENT' ? 'ALL' : 'URGENT')}
            className={`rounded-xl p-2.5 border transition-all cursor-pointer select-none relative overflow-hidden ${
              agingFilter === 'URGENT'
                ? 'ring-2 ring-amber-500 bg-amber-100/80 border-amber-500 shadow-sm'
                : 'bg-amber-50/60 hover:bg-amber-50 border-amber-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-600 text-white">
                3. URGENT
              </span>
              <span className="text-[10px] font-bold text-amber-800">{agingConfig?.urgentDaysMin ?? 25} - {agingConfig?.urgentDaysMax ?? 27} วัน</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div className="text-xl font-black font-mono text-amber-900">
                {agingSummaryStats.urgent}
              </div>
              <div className="text-[11px] font-bold text-amber-800">
                {agingSummaryStats.urgentPct}%
              </div>
            </div>
            <div className="text-[10px] text-amber-800 mt-1 truncate">
              เร่งด่วน ระบายเข้าไลน์
            </div>
            {agingFilter === 'URGENT' && (
              <div className="absolute right-1 bottom-1">
                <Check className="w-3.5 h-3.5 text-amber-800" />
              </div>
            )}
          </div>

          {/* Card 4: DUE TODAY */}
          <div
            onClick={() => setAgingFilter(prev => prev === 'DUE_TODAY' ? 'ALL' : 'DUE_TODAY')}
            className={`rounded-xl p-2.5 border transition-all cursor-pointer select-none relative overflow-hidden ${
              agingFilter === 'DUE_TODAY'
                ? 'ring-2 ring-red-500 bg-red-100/80 border-red-500 shadow-sm'
                : 'bg-red-50/60 hover:bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-red-600 text-white">
                4. DUE TODAY
              </span>
              <span className="text-[10px] font-bold text-red-800">{agingConfig?.dueDay ?? 28} วัน</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div className="text-xl font-black font-mono text-red-900">
                {agingSummaryStats.dueToday}
              </div>
              <div className="text-[11px] font-bold text-red-800">
                {agingSummaryStats.dueTodayPct}%
              </div>
            </div>
            <div className="text-[10px] text-red-800 mt-1 truncate">
              ครบกำหนด เบิกจ่ายวันนี้
            </div>
            {agingFilter === 'DUE_TODAY' && (
              <div className="absolute right-1 bottom-1">
                <Check className="w-3.5 h-3.5 text-red-800" />
              </div>
            )}
          </div>

          {/* Card 5: EXPIRED */}
          <div
            onClick={() => setAgingFilter(prev => prev === 'EXPIRED' ? 'ALL' : 'EXPIRED')}
            className={`rounded-xl p-2.5 border transition-all cursor-pointer select-none relative overflow-hidden ${
              agingFilter === 'EXPIRED'
                ? 'ring-2 ring-rose-500 bg-rose-100/90 border-rose-500 shadow-sm'
                : 'bg-rose-50/70 hover:bg-rose-50 border-rose-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-600 text-white">
                5. EXPIRED
              </span>
              <span className="text-[10px] font-bold text-rose-800">&gt; {agingConfig?.criticalDays ?? 28} วัน</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div className="text-xl font-black font-mono text-rose-900 flex items-center space-x-1">
                <span>{agingSummaryStats.expired}</span>
                {agingSummaryStats.expired > 0 && (
                  <Flame className="w-4 h-4 text-rose-600 animate-pulse" />
                )}
              </div>
              <div className="text-[11px] font-bold text-rose-800">
                {agingSummaryStats.expiredPct}%
              </div>
            </div>
            <div className="text-[10px] text-rose-800 mt-1 truncate">
              เกินเกณฑ์ ตรวจสภาพ/Wrap
            </div>
            {agingFilter === 'EXPIRED' && (
              <div className="absolute right-1 bottom-1">
                <Check className="w-3.5 h-3.5 text-rose-800" />
              </div>
            )}
          </div>

          {/* Card 6: Rubber Cap Rule Summary */}
          <div
            onClick={() => setAgingFilter(prev => prev === 'RUBBER_CAP' ? 'ALL' : 'RUBBER_CAP')}
            className={`rounded-xl p-2.5 border transition-all cursor-pointer select-none relative overflow-hidden ${
              agingFilter === 'RUBBER_CAP'
                ? 'ring-2 ring-indigo-500 bg-indigo-100/90 border-indigo-500 shadow-sm'
                : 'bg-indigo-50/50 hover:bg-indigo-50 border-indigo-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-indigo-600 text-white flex items-center space-x-1">
                <Wrench className="w-2.5 h-2.5 mr-0.5" />
                <span>RUBBER CAP</span>
              </span>
              <span className="text-[10px] font-bold text-indigo-700">จุกยาง</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div className="text-xl font-black font-mono text-indigo-900">
                {agingSummaryStats.rubberCapCount}
              </div>
              <div className="text-[11px] font-bold text-indigo-700">
                {agingSummaryStats.rubberCapPct}%
              </div>
            </div>
            <div className="text-[10px] text-indigo-700 mt-1 truncate">
              CY3/A5 หรือ &gt;{agingConfig?.indoorRubberCapDays ?? 28} วัน
            </div>
            {agingFilter === 'RUBBER_CAP' && (
              <div className="absolute right-1 bottom-1">
                <Check className="w-3.5 h-3.5 text-indigo-700" />
              </div>
            )}
          </div>
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
            <option value="ALL">🌐 ทุกโซน/ทุกคลัง</option>
            <optgroup label="📍 โซนหลัก (Main Campus Zones)">
              <option value="A2">โรง 2: A2 (รางเลื่อน DA2D-1)</option>
              <option value="A4_FLOOR">โรง 4: A4 วางพื้น (DA4D-1 Staging)</option>
              <option value="A4_RACK">โรง 4: A4 แร็ค (Selective B-K)</option>
              <option value="A5">ลานเต็นท์ A5 (Tents 1-4)</option>
              <option value="CY3">เต็นท์คลัง CY3 (4-Tier Racks)</option>
            </optgroup>
            <optgroup label="📦 Selective Racks (A4)">
              {(['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'] as StorageZone[]).map((z) => (
                <option key={z} value={z}>
                  Rack {z}
                </option>
              ))}
            </optgroup>
            <optgroup label="⛺ Tent / Rail Sub-zones">
              {(['FR1', 'FR2', 'FR3', 'FR4', 'FL-A', 'FL-B', 'FL-C', 'FL-D', 'T1', 'T2', 'T3', 'T4'] as StorageZone[]).map((z) => (
                <option key={z} value={z}>
                  Zone {z}
                </option>
              ))}
            </optgroup>
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

          {/* Comprehensive 5-Level Aging Status Filter Dropdown */}
          <select
            value={agingFilter}
            onChange={(e) => setAgingFilter(e.target.value)}
            className={`border font-bold px-2.5 py-1 rounded-lg text-xs focus:outline-none ${
              agingFilter !== 'ALL'
                ? 'bg-amber-950 border-amber-500 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-200 focus:border-blue-500'
            }`}
          >
            <option value="ALL">ทุก Aging (ทั้งหมด)</option>
            <option value="NORMAL">🟢 1. NORMAL (0-21 วัน)</option>
            <option value="WARNING">🟡 2. WARNING (22-24 วัน)</option>
            <option value="URGENT">🟠 3. URGENT (25-27 วัน)</option>
            <option value="DUE_TODAY">🔴 4. DUE TODAY (28 วัน)</option>
            <option value="EXPIRED">🚨 5. EXPIRED (&gt; 28 วัน)</option>
            <option value="OVERDUE_GROUP">⚠️ กลุ่มเตือน/ค้างทั้งหมด (&ge; 22 วัน)</option>
            <option value="RUBBER_CAP">🪛 ต้องใส่ Rubber Cap (จุกยาง)</option>
          </select>

          {/* Sort By Dropdown Selector */}
          <div className="flex items-center space-x-1 shrink-0 bg-slate-800 border border-slate-700 rounded-lg px-2 py-0.5">
            <ArrowUpDown className="w-3 h-3 text-slate-400" />
            <select
              value={`${sortField}_${sortDirection}`}
              onChange={(e) => {
                const [f, d] = e.target.value.split('_');
                if (f === 'AGING' && d === 'DAYS') {
                  // handle AGING_DAYS_DESC vs AGING_DAYS_ASC
                  const parts = e.target.value.split('_');
                  setSortField('AGING_DAYS');
                  setSortDirection(parts[2] as SortDirection);
                } else {
                  const val = e.target.value;
                  if (val.startsWith('AGING_DAYS_')) {
                    setSortField('AGING_DAYS');
                    setSortDirection(val.endsWith('DESC') ? 'DESC' : 'ASC');
                  } else {
                    const lastUnderscore = val.lastIndexOf('_');
                    const field = val.substring(0, lastUnderscore) as SortField;
                    const dir = val.substring(lastUnderscore + 1) as SortDirection;
                    setSortField(field);
                    setSortDirection(dir);
                  }
                }
              }}
              className="bg-transparent text-slate-200 font-bold text-xs focus:outline-none cursor-pointer"
            >
              <option value="AGING_DAYS_DESC">⏰ FIFO (เก่าสุดไปใหม่สุด)</option>
              <option value="AGING_DAYS_ASC">🆕 LIFO (ใหม่สุดไปเก่าสุด)</option>
              <option value="STATUS_ASC">⚠️ ขาด Safety Stock มากสุด</option>
              <option value="QTY_ASC">📉 ยอดเหลือน้อยสุด &rarr; มากสุด</option>
              <option value="QTY_DESC">📈 ยอดเหลือมากสุด &rarr; น้อยสุด</option>
              <option value="MODEL_ASC">🔤 รหัส Model HE (A - Z)</option>
              <option value="LOCATOR_ASC">📍 พิกัดจัดเก็บ (Locator)</option>
              <option value="LINE_ASC">🏭 ไลน์ผลิต (Line)</option>
            </select>
          </div>
        </div>

        {/* Row 2: Status Filter Tabs & Quick Priority Sorters */}
        <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Status Filter Chips */}
          <div className="flex items-center flex-wrap gap-1.5 font-bold">
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

            {/* Quick Sorters: Featured FIFO Button */}
            <button
              onClick={() => applyPresetSort('AGING_DAYS', 'DESC')}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all flex items-center space-x-1 ${
                sortField === 'AGING_DAYS' && sortDirection === 'DESC'
                  ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-md ring-2 ring-amber-300/60 scale-105'
                  : 'bg-slate-800/80 text-amber-300 border-amber-600/40 hover:bg-amber-950/40'
              }`}
              title="จัดเรียงสินค้าตามหลัก FIFO (ค้างนานสุด/เข้าก่อน อยู่บนสุดเพื่อเบิกจ่ายก่อน)"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>⏰ เรียง FIFO (เก่าสุดก่อน)</span>
            </button>

            <button
              onClick={() => applyPresetSort('AGING_DAYS', 'ASC')}
              className={`px-2 py-1 rounded-lg border text-[11px] font-bold transition-all ${
                sortField === 'AGING_DAYS' && sortDirection === 'ASC'
                  ? 'bg-slate-100 text-slate-900 border-white font-black'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
              title="จัดเรียงสินค้าใหม่สุดก่อน"
            >
              🆕 ใหม่สุดก่อน
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
                setSortField('AGING_DAYS');
                setSortDirection('DESC');
              }}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] font-bold transition-all flex items-center space-x-1 border border-slate-700"
              title="สลับเป็นเรียง FIFO ด่วน"
            >
              <Clock className="w-3 h-3 text-amber-400" />
              <span>โหมด FIFO</span>
            </button>
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

      {/* Real-time Zone Distribution Breakdown Card for Searched Part Numbers */}
      {searchTerm.trim() && searchedPartDistributions.length > 0 && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950 border-2 border-blue-500/40 rounded-xl p-3 sm:p-4 text-white shadow-md space-y-3 animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                  <span>📍 สรุปตำแหน่งจัดเก็บของ Part No. ที่ค้นหา (Stock by Zone)</span>
                  <span className="text-[11px] font-normal text-slate-300">
                    — คำค้น: <span className="font-mono font-bold text-amber-300">"{searchTerm}"</span>
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  บอกพิกัดทันทีว่า Part No. นี้เก็บไว้ที่โซนไหนบ้าง และมีจำนวนเท่าไหร่ (คลิกที่โซนเพื่อกรองตารางได้ทันที)
                </p>
              </div>
            </div>

            {zoneFilter !== 'ALL' && (
              <button
                onClick={() => setZoneFilter('ALL')}
                className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs inline-flex items-center gap-1 transition-all"
              >
                <span>กำลังกรอง Zone {zoneFilter} (คลิกเพื่อดูทุกโซน)</span>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* List of Matched Parts with Zone Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {searchedPartDistributions.slice(0, 4).map((p) => (
              <div
                key={p.model}
                className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 space-y-2 hover:border-blue-500/50 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-mono font-black text-xs sm:text-sm text-amber-300">
                      <HighlightText text={p.model} search={searchTerm} />
                    </div>
                    <div className="text-[11px] text-slate-300 truncate font-medium">
                      <HighlightText text={p.partName} search={searchTerm} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono font-black text-xs sm:text-sm text-emerald-400">
                      {p.totalQty.toLocaleString()} U
                    </span>
                    <div className="text-[10px] text-slate-400">
                      ({p.totalPallets} พาเลท / {p.locationCount} ช่อง)
                    </div>
                  </div>
                </div>

                {/* Zone Breakdown Pills */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/60">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    เก็บอยู่ที่:
                  </span>
                  {p.zones.map((z) => (
                    <button
                      key={z.zone}
                      onClick={() => setZoneFilter(z.zone === zoneFilter ? 'ALL' : z.zone)}
                      className={`px-2 py-1 rounded-md text-[11px] font-bold border inline-flex items-center space-x-1.5 transition-all ${
                        zoneFilter === z.zone
                          ? 'bg-blue-600 text-white border-blue-400 ring-2 ring-blue-400/50 scale-105'
                          : `${z.meta.colorBg} hover:brightness-125`
                      }`}
                      title={`คลิกเพื่อกรองตารางดูเฉพาะ Zone ${z.zone}`}
                    >
                      <span className={`px-1 py-0.2 rounded text-[9.5px] font-black ${z.meta.badgeBg}`}>
                        Zone {z.zone}
                      </span>
                      <span className="font-mono font-black text-white">
                        {z.qty.toLocaleString()} ชิ้น
                      </span>
                      <span className="text-[9.5px] opacity-80">
                        ({z.count} ช่อง)
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {searchedPartDistributions.length > 4 && (
            <div className="text-[11px] text-slate-400 text-center font-medium">
              และอีก {searchedPartDistributions.length - 4} รหัส Part No. แสดงในตารางด้านล่าง...
            </div>
          )}
        </div>
      )}

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
                title="คลิกเพื่อสลับเรียงตามหลัก FIFO (ค้างนานสุดก่อน หรือ ใหม่สุดก่อน)"
              >
                <div className="flex items-center justify-center space-x-1">
                  <span>อายุสต็อก (FIFO/Aging)</span>
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
                const agingInfo = getAgingInfo(agingDays, item.agingStatus);
                const rubberCap = checkRubberCap(item);

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
                      <HighlightText text={item.modelHE} search={searchTerm} />
                    </td>

                    {/* Tool Name */}
                    <td className="px-3.5 py-2.5 font-medium text-slate-800">
                      <div>
                        <HighlightText text={item.partName} search={searchTerm} />
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 truncate max-w-xs mt-0.5">
                        QR: <HighlightText text={item.qrCode} search={searchTerm} />
                      </div>
                    </td>

                    {/* Locator Code - Separated Rack & Level */}
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-extrabold text-[10px] border border-blue-200">
                          Rack <HighlightText text={`${item.zone}${item.bayNumber}`} search={searchTerm} />
                        </span>
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-extrabold text-[10px] border border-amber-200">
                          ชั้น <HighlightText text={item.level} search={searchTerm} />
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        <HighlightText text={item.locatorCode} search={searchTerm} />
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

                    {/* Aging Days Badge & Rubber Cap Requirement */}
                    <td className="px-3.5 py-2.5 text-center">
                      <div className="flex flex-col items-center justify-center gap-1">
                        {/* 5-Level Badge */}
                        <span
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded font-black text-[10px] border shadow-2xs ${agingInfo.badgeBg}`}
                        >
                          {agingInfo.level === 'EXPIRED' ? (
                            <Flame className="w-3 h-3 text-rose-600 animate-pulse" />
                          ) : agingInfo.level === 'DUE_TODAY' ? (
                            <AlertCircle className="w-3 h-3 text-red-600 animate-bounce" />
                          ) : agingInfo.level === 'URGENT' || agingInfo.level === 'WARNING' ? (
                            <Clock className="w-3 h-3 text-amber-600" />
                          ) : (
                            <Check className="w-3 h-3 text-emerald-600" />
                          )}
                          <span>{agingDays} วัน ({agingInfo.label})</span>
                        </span>

                        {/* Rubber Cap Alert Badge if required */}
                        {rubberCap.required && (
                          <span
                            className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200"
                            title={rubberCap.reason}
                          >
                            <Wrench className="w-2.5 h-2.5 text-indigo-600 mr-0.5" />
                            <span>ใส่จุกยาง</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Line */}
                    <td className="px-3.5 py-2.5 text-center">
                      <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold text-[10px] border border-indigo-200">
                        Line <HighlightText text={item.useLine} search={searchTerm} />
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
                        
                        {item.protectionMethod === 'VINYL_WRAPPING' && onOpenVinylAction && (
                           <button
                             onClick={() => onOpenVinylAction(item)}
                             className="px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs inline-flex items-center space-x-1 shadow-sm transition-all active:scale-95"
                             title="จัดการ Vinyl Wrapping (ต่ออายุ / อัปเดตสถานะ NG)"
                           >
                             <Flame className="w-3.5 h-3.5" />
                           </button>
                        )}

                        <button
                          onClick={() => {
                            if (onQuickPickItem) {
                              onQuickPickItem(item);
                            } else {
                              onOpenScanForLevel(item.zone, item.bayNumber, item.level, 'OUT');
                            }
                          }}
                          className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 inline-flex items-center space-x-1 shadow-sm transition-all active:scale-95"
                          title={onQuickPickItem ? "เบิกจ่ายด่วน (FIFO Pick)" : "เบิกออก"}
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

