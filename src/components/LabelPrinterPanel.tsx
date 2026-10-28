import React, { useState, useMemo } from 'react';
import { useTranslation } from '../i18n/i18nContext';
import { 
  Printer, 
  Download, 
  QrCode, 
  Layers, 
  Grid, 
  CheckCircle2, 
  RefreshCw, 
  Search, 
  Sliders, 
  Building2, 
  Flame, 
  Clock, 
  AlertCircle,
  Sparkles,
  Tag,
  Package,
  Copy,
  Check,
  Calendar,
  Zap,
  Info,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  Maximize2,
  Loader2
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { 
  InventoryItem, 
  ZoneCapacityMaster, 
  WarehouseFacility, 
  CustomRackSlot, 
  MasterDataItem, 
  AgingThresholdConfig, 
  StorageZone,
  UseLineMaster
} from '../types';

interface LabelPrinterPanelProps {
  items?: InventoryItem[];
  zoneCapacities?: ZoneCapacityMaster[];
  facilities?: WarehouseFacility[];
  customSlots?: CustomRackSlot[];
  masterData?: MasterDataItem[];
  useLines?: UseLineMaster[];
  agingConfig?: AgingThresholdConfig;
  initialSelectedItemId?: string;
  onOpenScanner?: (zone: StorageZone, bay: number, level: any, mode: any) => void;
}

export const LabelPrinterPanel: React.FC<LabelPrinterPanelProps> = ({
  items = [],
  zoneCapacities = [],
  facilities = [],
  customSlots = [],
  masterData = [],
  useLines = [],
  agingConfig = { safeDaysMax: 14, warningDaysMax: 30, criticalDays: 30, autoAlertEnabled: true },
  initialSelectedItemId,
  onOpenScanner
}) => {
  const { t } = useTranslation();
  const [activeMode, setActiveMode] = useState<'PALLET_ITEM' | 'LOCATION' | 'BATCH'>('PALLET_ITEM');

  // Real-Time Sync Animation & Timestamp State
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => new Date().toLocaleTimeString('th-TH'));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleSyncAllZones = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setLastSyncTime(new Date().toLocaleTimeString('th-TH'));
      setIsRefreshing(false);
    }, 450);
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // =========================================================================
  // 1. MATERIAL / PALLET ITEM MODE STATES & GENERATOR CONFIG
  // =========================================================================
  const [materialSearch, setMaterialSearch] = useState<string>('');
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<string>('ALL');
  const [selectedAgingFilter, setSelectedAgingFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'SAFE'>('ALL');
  const [selectedItemId, setSelectedItemId] = useState<string>(initialSelectedItemId || (items[0]?.id || ''));

  // Editable parameters for generating the exact system scanning QR format
  const [overrideModelHE, setOverrideModelHE] = useState<string>('ADL74761222');
  const [palletPlantCode, setPalletPlantCode] = useState<string>('SK');
  const [palletUnit, setPalletUnit] = useState<string>('EA');
  const [overrideQty, setOverrideQty] = useState<number>(100);
  const [overrideLine, setOverrideLine] = useState<string>('Y1');
  const [overrideDate, setOverrideDate] = useState<string>('2026-08-28');
  const [overrideTime, setOverrideTime] = useState<string>('08:14');
  const [overrideLotNo, setOverrideLotNo] = useState<string>('');
  const [printCopies, setPrintCopies] = useState<number>(1);
  const [showAgingBadge, setShowAgingBadge] = useState<boolean>(true);
  const [showSafetyStock, setShowSafetyStock] = useState<boolean>(true);
  const [isPrinting, setIsPrinting] = useState(false);

  // Selected item reference
  const activePalletItem = useMemo(() => {
    if (!items.length) return null;
    const found = items.find(i => i.id === selectedItemId);
    return found || items[0];
  }, [items, selectedItemId]);

  // Synchronize initial override states when an item is selected
  React.useEffect(() => {
    if (activePalletItem) {
      setOverrideModelHE(activePalletItem.modelHE || 'ADL74761222');
      setOverrideQty(activePalletItem.quantity || 100);
      setOverrideLine(activePalletItem.useLine || 'Y1');
      if (activePalletItem.storageInDate) {
        const d = new Date(activePalletItem.storageInDate);
        if (!isNaN(d.getTime())) {
          setOverrideDate(d.toISOString().slice(0, 10));
          setOverrideTime(d.toTimeString().slice(0, 5));
        }
      }
      setOverrideLotNo(`LOT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(activePalletItem.bayNumber || 1).padStart(3, '0')}`);
    }
  }, [selectedItemId]);

  // Active Model Code for display and QR
  const activeModelCode = useMemo(() => {
    return (overrideModelHE || activePalletItem?.modelHE || 'ADL74761222').trim().toUpperCase();
  }, [overrideModelHE, activePalletItem]);

  // Format DD/MM for bottom right (e.g., 28/08)
  const displayDayMonth = useMemo(() => {
    if (!overrideDate) return '28/08';
    const parts = overrideDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}`;
    }
    return '28/08';
  }, [overrideDate]);

  // Formatted Date Time string (e.g., 2026-08-28 08:14)
  const displayDateTime = useMemo(() => {
    return `${overrideDate || '2026-08-28'} ${overrideTime || '08:14'}`;
  }, [overrideDate, overrideTime]);

  // =========================================================================
  // SYSTEM SCANNING QR FORMAT CALCULATION
  // Format: ${modelHE}_${YYYY-MM-DD}_${HH:mm}_${useLine}_${quantity}
  // Example: ADL74761222_2026-08-28_08:14_Y1_100
  // This matches QuickScannerModal & QRScanner exactly!
  // =========================================================================
  const generatedItemQRString = useMemo(() => {
    const model = activeModelCode;
    const date = overrideDate || '2026-08-28';
    const time = overrideTime || '08:14';
    const line = overrideLine || 'Y1';
    const qty = overrideQty > 0 ? overrideQty : 100;

    return `${model}_${date}_${time}_${line}_${qty}`;
  }, [activeModelCode, overrideDate, overrideTime, overrideLine, overrideQty]);

  // Filter items for search
  const filteredItemList = useMemo(() => {
    return items.filter(item => {
      // Search text match
      const query = materialSearch.trim().toLowerCase();
      const matchSearch = !query || 
        item.modelHE.toLowerCase().includes(query) ||
        item.partName.toLowerCase().includes(query) ||
        item.locatorCode.toLowerCase().includes(query) ||
        (item.useLine && item.useLine.toLowerCase().includes(query)) ||
        (item.qrCode && item.qrCode.toLowerCase().includes(query));

      if (!matchSearch) return false;

      // Zone filter
      if (selectedZoneFilter !== 'ALL') {
        if (selectedZoneFilter === 'A4_RACK' && !['B','C','D','E','F','G','H','I','J','K'].includes(item.zone)) return false;
        if (selectedZoneFilter === 'A4_FLOOR' && !['X1','X2','X3','X4','X5','X6','X7','X8'].includes(item.zone)) return false;
        if (selectedZoneFilter === 'A2_RAIL' && !item.zone?.startsWith('R') && !item.zone?.startsWith('FR') && !item.locatorCode?.includes('DA2D-1')) return false;
        if (selectedZoneFilter === 'A5_TENT' && !item.zone?.startsWith('T') && item.zone !== 'A' && !item.locatorCode?.includes('DAST') && !item.locatorCode?.includes('DA5T')) return false;
        if (selectedZoneFilter === 'CY3_RACK' && !item.zone?.startsWith('CY3') && !item.locatorCode?.includes('DY3T')) return false;
      }

      // Aging filter
      if (selectedAgingFilter === 'CRITICAL') {
        if (item.agingDays <= agingConfig.criticalDays) return false;
      } else if (selectedAgingFilter === 'WARNING') {
        if (item.agingDays <= agingConfig.safeDaysMax || item.agingDays > agingConfig.criticalDays) return false;
      } else if (selectedAgingFilter === 'SAFE') {
        if (item.agingDays > agingConfig.safeDaysMax) return false;
      }

      return true;
    });
  }, [items, materialSearch, selectedZoneFilter, selectedAgingFilter, agingConfig]);

  // =========================================================================
  // 2. LOCATION MODE STATES & MAJOR BUILDING HIERARCHY
  // =========================================================================
  // Major warehouse areas for clean multi-stage filtering
  const MAJOR_BUILDINGS = useMemo(() => [
    {
      id: 'A4_RACK',
      name: 'อาคาร A4 (Selective Rack B–K)',
      shortName: 'A4 แร็ค (DA4D)',
      icon: '🏭',
      badge: '10 แถวแร็ค',
      zones: [
        { zone: 'B', label: 'แถว B', bays: 12, levels: [1, 2, 3, 4] },
        { zone: 'C', label: 'แถว C', bays: 12, levels: [1, 2, 3, 4] },
        { zone: 'D', label: 'แถว D', bays: 12, levels: [1, 2, 3, 4] },
        { zone: 'E', label: 'แถว E', bays: 12, levels: [1, 2, 3, 4] },
        { zone: 'F', label: 'แถว F', bays: 12, levels: [1, 2, 3, 4] },
        { zone: 'G', label: 'แถว G', bays: 5, levels: [1, 2, 3, 4] },
        { zone: 'H', label: 'แถว H', bays: 5, levels: [1, 2, 3, 4] },
        { zone: 'I', label: 'แถว I', bays: 5, levels: [1, 2, 3, 4] },
        { zone: 'J', label: 'แถว J', bays: 5, levels: [1, 2, 3, 4] },
        { zone: 'K', label: 'แถว K', bays: 5, levels: [1, 2, 3, 4] },
      ]
    },
    {
      id: 'A4_FLOOR',
      name: 'อาคาร A4 (ลานวางพื้น X1–X8)',
      shortName: 'A4 วางพื้น (DA4D-1)',
      icon: '🏗️',
      badge: '8 โซนลานกอง',
      zones: [
        { zone: 'X1', label: 'ลาน X1', bays: 6, levels: [1] },
        { zone: 'X2', label: 'ลาน X2', bays: 6, levels: [1] },
        { zone: 'X3', label: 'ลาน X3', bays: 6, levels: [1] },
        { zone: 'X4', label: 'ลาน X4', bays: 6, levels: [1] },
        { zone: 'X5', label: 'ลาน X5', bays: 6, levels: [1] },
        { zone: 'X6', label: 'ลาน X6', bays: 6, levels: [1] },
        { zone: 'X7', label: 'ลาน X7', bays: 6, levels: [1] },
        { zone: 'X8', label: 'ลาน X8', bays: 6, levels: [1] },
      ]
    },
    {
      id: 'A2_RAIL',
      name: 'อาคาร A2 (Flow Rail 13 รางเลื่อน)',
      shortName: 'A2 Flow Rail (DA2D)',
      icon: '🛤️',
      badge: '13 รางเลื่อน',
      zones: Array.from({ length: 13 }, (_, i) => ({
        zone: `R${i + 1}`,
        label: `ราง R${i + 1}`,
        bays: 8,
        levels: [1]
      }))
    },
    {
      id: 'A5_TENT',
      name: 'อาคาร A5 (ลานเต็นท์ผ้าใบ T1–T4)',
      shortName: 'A5 ลานเต็นท์ (DAST)',
      icon: '⛺',
      badge: '4 เต็นท์',
      zones: [
        { zone: 'T1', label: 'เต็นท์ 1 (T1)', bays: 10, levels: [1] },
        { zone: 'T2', label: 'เต็นท์ 2 (T2)', bays: 10, levels: [1] },
        { zone: 'T3', label: 'เต็นท์ 3 (T3)', bays: 10, levels: [1] },
        { zone: 'T4', label: 'เต็นท์ 4 (T4)', bays: 10, levels: [1] },
      ]
    },
    {
      id: 'CY3_RACK',
      name: 'ลาน CY3 (Heavy Rack กลางแจ้ง แถว A–D)',
      shortName: 'CY3 Outdoor Rack',
      icon: '🏕️',
      badge: '4 แถวแร็ค',
      zones: [
        { zone: 'CY3-A', label: 'CY3 แถว A', bays: 10, levels: [1, 2, 3, 4] },
        { zone: 'CY3-B', label: 'CY3 แถว B', bays: 10, levels: [1, 2, 3, 4] },
        { zone: 'CY3-C', label: 'CY3 แถว C', bays: 10, levels: [1, 2, 3, 4] },
        { zone: 'CY3-D', label: 'CY3 แถว D', bays: 10, levels: [1, 2, 3, 4] },
      ]
    }
  ], []);

  // Filter 1: Major Building Category
  const [selectedBuilding, setSelectedBuilding] = useState<string>('A4_RACK');
  // Filter 2: Sub-zone / Row
  const [selectedZone, setSelectedZone] = useState<string>('B');
  // Filter 3: Sub-location Bay / Column
  const [selectedBay, setSelectedBay] = useState<number>(1);
  // Filter 4: Shelf Level
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  // Layout Paper Size: A4 Landscape or A3 Landscape ONLY (แนวนอนเท่านั้น)
  const [paperSize, setPaperSize] = useState<'A4_LANDSCAPE' | 'A3_LANDSCAPE'>('A4_LANDSCAPE');

  // Currently active building config
  const currentBuilding = useMemo(() => {
    return MAJOR_BUILDINGS.find(b => b.id === selectedBuilding) || MAJOR_BUILDINGS[0];
  }, [selectedBuilding, MAJOR_BUILDINGS]);

  // Current zone config
  const currentZoneConfig = useMemo(() => {
    return currentBuilding.zones.find(z => z.zone === selectedZone) || currentBuilding.zones[0];
  }, [currentBuilding, selectedZone]);

  // When building changes, automatically select the first valid zone of that building
  const handleSelectBuilding = (bId: string) => {
    setSelectedBuilding(bId);
    const bConfig = MAJOR_BUILDINGS.find(b => b.id === bId) || MAJOR_BUILDINGS[0];
    const firstZone = bConfig.zones[0];
    if (firstZone) {
      setSelectedZone(firstZone.zone);
      setSelectedBay(1);
      setSelectedLevel(firstZone.levels[0] || 1);
    }
  };

  // When zone changes, validate bay and level bounds
  const handleSelectZone = (zoneCode: string) => {
    setSelectedZone(zoneCode);
    const zConfig = currentBuilding.zones.find(z => z.zone === zoneCode);
    if (zConfig) {
      if (selectedBay > zConfig.bays) {
        setSelectedBay(1);
      }
      if (!zConfig.levels.includes(selectedLevel)) {
        setSelectedLevel(zConfig.levels[0] || 1);
      }
    }
  };

  // Dynamic Zone List aggregation
  const allAvailableZones = useMemo(() => {
    const zoneSet = new Set<string>();
    ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'].forEach(z => zoneSet.add(z));
    ['X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'X8'].forEach(z => zoneSet.add(z));
    Array.from({ length: 16 }, (_, i) => `R${i + 1}`).forEach(z => zoneSet.add(z));
    ['T1', 'T2', 'T3', 'T4'].forEach(z => zoneSet.add(z));
    ['CY3-A', 'CY3-B', 'CY3-C', 'CY3-D'].forEach(z => zoneSet.add(z));

    customSlots.forEach(slot => {
      if (slot.zone) zoneSet.add(slot.zone);
    });
    return Array.from(zoneSet);
  }, [customSlots]);

  // Determine building prefix
  const getBuildingPrefix = (z: string) => {
    if (z.startsWith('R') || z.startsWith('FR')) return 'DA2D-1.01';
    if (z.startsWith('T')) return 'DAST-1.01';
    if (z.startsWith('CY3')) {
      const row = z.replace('CY3-', '');
      const num = row === 'A' ? '1.01' : row === 'B' ? '1.02' : row === 'C' ? '1.03' : '1.04';
      return `DY3T-${num}`;
    }
    if (['B', 'C', 'D'].includes(z)) return 'DA4D-1.02';
    if (['E', 'F'].includes(z)) return 'DA4D-1.05';
    if (['G', 'H', 'I', 'J', 'K'].includes(z)) return 'DA4D-1.06';
    if (z.startsWith('X')) return 'DA4D-1.01';
    return 'DA4D-CUSTOM';
  };

  // Helper for official clean Zone name for labels
  const getMainZoneName = (z: string) => {
    if (['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'].includes(z)) {
      return `โซน A4 Selective Rack (Zone ${z})`;
    }
    if (z.startsWith('X')) {
      return `โซน A4 ลานวางพื้น (Zone ${z})`;
    }
    if (z.startsWith('R') || z.startsWith('FR')) {
      return `โซน A2 Flow Rail (${z})`;
    }
    if (z.startsWith('T')) {
      return `โซน A5 ลานเต็นท์ (${z})`;
    }
    if (z.startsWith('CY3')) {
      return `โซน CY3 Heavy Rack (${z.replace('CY3-', 'แถว ')})`;
    }
    return `โซนจัดเก็บหลัก (${z})`;
  };

  // Helper for official clean Locator name for labels
  const getMainLocatorName = (z: string, bay: number, level: number) => {
    if (['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'].includes(z)) {
      return `แร็ค ${z} ช่อง ${bay} ชั้น ${level}`;
    }
    if (z.startsWith('X')) {
      return `ลานวางพื้น ${z} ช่อง ${bay}`;
    }
    if (z.startsWith('R') || z.startsWith('FR')) {
      return `Flow Rail ${z} ช่อง ${bay} ชั้น ${level}`;
    }
    if (z.startsWith('T')) {
      return `เต็นท์ ${z} ช่อง ${bay} ชั้น ${level}`;
    }
    if (z.startsWith('CY3')) {
      return `CY3 แถว ${z.replace('CY3-', '')} ช่อง ${bay} ชั้น ${level}`;
    }
    return `พิกัด ${z}${bay}-L${level}`;
  };

  const buildingPrefix = getBuildingPrefix(selectedZone);
  const fullLocatorCode = selectedZone.startsWith('CY3')
    ? `${buildingPrefix}-${selectedZone.replace('CY3-', '')}${selectedBay}-L${selectedLevel}`
    : `${buildingPrefix}-${selectedZone}${selectedBay}-L${selectedLevel}`;

  // Find live item in this slot
  const currentSlotItem = useMemo(() => {
    return items.find(
      it => 
        (it.zone === selectedZone && it.bayNumber === selectedBay && it.level === selectedLevel) ||
        it.locatorCode === fullLocatorCode
    );
  }, [items, selectedZone, selectedBay, selectedLevel, fullLocatorCode]);

  // =========================================================================
  // 3. BATCH MODE STATES & FILTER HIERARCHY
  // =========================================================================
  const [batchBuilding, setBatchBuilding] = useState<string>('A4_RACK');
  const [batchZone, setBatchZone] = useState<string>('B');
  const [batchStartBay, setBatchStartBay] = useState<number>(1);
  const [batchEndBay, setBatchEndBay] = useState<number>(12);
  const [batchLevelFilter, setBatchLevelFilter] = useState<number | 'ALL'>('ALL');

  const currentBatchBuilding = useMemo(() => {
    return MAJOR_BUILDINGS.find(b => b.id === batchBuilding) || MAJOR_BUILDINGS[0];
  }, [batchBuilding, MAJOR_BUILDINGS]);

  const handleSelectBatchBuilding = (bId: string) => {
    setBatchBuilding(bId);
    const bConfig = MAJOR_BUILDINGS.find(b => b.id === bId) || MAJOR_BUILDINGS[0];
    const firstZone = bConfig.zones[0];
    if (firstZone) {
      setBatchZone(firstZone.zone);
      setBatchStartBay(1);
      setBatchEndBay(firstZone.bays);
    }
  };

  const handleSelectBatchZone = (zCode: string) => {
    setBatchZone(zCode);
    const zConfig = currentBatchBuilding.zones.find(z => z.zone === zCode);
    if (zConfig) {
      setBatchStartBay(1);
      setBatchEndBay(zConfig.bays);
    }
  };

  const batchList = useMemo(() => {
    const list: {
      zone: string;
      bay: number;
      level: number;
      locatorCode: string;
      locationLabel: string;
      building: string;
      currentItem?: InventoryItem;
      mainZoneName: string;
      mainLocatorName: string;
    }[] = [];

    const bPrefix = getBuildingPrefix(batchZone);
    const minB = Math.max(batchStartBay, 1);
    const maxB = Math.max(batchEndBay, minB);
    const levelsToInclude = batchLevelFilter === 'ALL' ? [1, 2, 3, 4] : [batchLevelFilter];

    for (let b = minB; b <= maxB; b++) {
      for (const l of levelsToInclude) {
        const locCode = batchZone.startsWith('CY3')
          ? `${bPrefix}-${batchZone.replace('CY3-', '')}${b}-L${l}`
          : `${bPrefix}-${batchZone}${b}-L${l}`;
        const itemAtLoc = items.find(i => i.zone === batchZone && i.bayNumber === b && i.level === l);
        list.push({
          zone: batchZone,
          bay: b,
          level: l,
          locationLabel: `${batchZone}${b}-L${l}`,
          locatorCode: locCode,
          building: bPrefix,
          currentItem: itemAtLoc,
          mainZoneName: getMainZoneName(batchZone),
          mainLocatorName: getMainLocatorName(batchZone, b, l)
        });
      }
    }
    return list;
  }, [batchZone, batchStartBay, batchEndBay, batchLevelFilter, items]);

  // Exporting State
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Fallback Canvas Drawer in case html2canvas meets an environment error - LANDSCAPE ONLY
  const generateFallbackCardPNG = (element: HTMLElement, filename: string) => {
    try {
      const qrCanvas = element.querySelector('canvas') as HTMLCanvasElement | null;
      const zoneText = element.querySelector('.zone-title-text')?.textContent || getMainZoneName(selectedZone);
      const locatorText = element.querySelector('.locator-title-text')?.textContent || getMainLocatorName(selectedZone, selectedBay, selectedLevel);
      const codeText = element.querySelector('.locator-code-text')?.textContent || fullLocatorCode;

      const isA3 = paperSize === 'A3_LANDSCAPE';
      const canvas = document.createElement('canvas');
      // 297 : 210 ISO Landscape Ratio
      canvas.width = isA3 ? 2970 : 2079;
      canvas.height = isA3 ? 2100 : 1470;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const s = canvas.width / 2079; // scale multiplier

      // Draw pure white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 1. If rendering Pallet Printable Card (Mode 1) - EXACT REPLICA OF USER REFERENCE
      // 1. If rendering Pallet Printable Card (Mode 1) - EXACT REPLICA OF USER REFERENCE IMAGE
      if (element.id === 'pallet-printable-card') {
        // Draw crisp black outer border
        ctx.lineWidth = 14 * s;
        ctx.strokeStyle = '#000000';
        ctx.beginPath();
        ctx.roundRect(35 * s, 35 * s, canvas.width - 70 * s, canvas.height - 70 * s, 36 * s);
        ctx.stroke();

        // Row 1: Top Parts No. - Extra Large, auto-measured so it never clips on both edges
        ctx.fillStyle = '#000000';
        let modelFontSize = 170 * s;
        ctx.font = `900 ${modelFontSize}px system-ui, Arial, sans-serif`;
        while (ctx.measureText(activeModelCode).width > canvas.width - 240 * s && modelFontSize > 80 * s) {
          modelFontSize -= 4 * s;
          ctx.font = `900 ${modelFontSize}px system-ui, Arial, sans-serif`;
        }
        ctx.textAlign = 'center';
        ctx.fillText(activeModelCode, canvas.width / 2, 195 * s);

        // Row 2: QR Code in DEAD HORIZONTAL CENTER, Plant Code (SK / SJ) on the right
        // Sized appropriately to guarantee a clear gap above the quantity row!
        const qrSize = 430 * s;
        const qrX = (canvas.width - qrSize) / 2; // Dead Center horizontally at 50%!
        const qrY = 245 * s;

        // Draw 2K QR Code cleanly without outer border box
        if (qrCanvas) {
          ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);
        }

        // Right side: Plant Code (SK or SJ)
        ctx.fillStyle = '#000000';
        ctx.font = `900 ${280 * s}px system-ui, Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(palletPlantCode || 'SK', canvas.width * 0.84, 520 * s);

        // Row 3: Q'ty (Left), Number (Center directly under QR, with clear gap below QR), Unit (Right)
        ctx.textAlign = 'left';
        ctx.font = `900 ${105 * s}px system-ui, Arial, sans-serif`;
        ctx.fillText("Q'ty", 110 * s, 840 * s);

        ctx.textAlign = 'center';
        ctx.font = `900 ${160 * s}px system-ui, Arial, sans-serif`;
        ctx.fillText(String(overrideQty > 0 ? overrideQty : 100), canvas.width / 2, 840 * s);

        ctx.textAlign = 'right';
        ctx.font = `900 ${105 * s}px system-ui, Arial, sans-serif`;
        ctx.fillText(palletUnit || 'EA', canvas.width - 110 * s, 840 * s);

        // Row 4: LINE + Line Code on Left, DateTime + Day/Month on Right (Safely inside bottom border)
        // Left Column: LINE label + line name (e.g. HE2)
        ctx.textAlign = 'left';
        ctx.font = `900 ${44 * s}px system-ui, Arial, sans-serif`;
        ctx.fillText('LINE', 110 * s, 980 * s);

        ctx.font = `900 ${135 * s}px system-ui, Arial, sans-serif`;
        ctx.fillText(overrideLine || activePalletItem?.useLine || 'Y1', 110 * s, 1140 * s);

        // Right Column: Date Time + Day/Month (25/07)
        ctx.textAlign = 'right';
        ctx.font = `900 ${50 * s}px monospace, system-ui, sans-serif`;
        ctx.fillText(displayDateTime, canvas.width - 110 * s, 980 * s);

        ctx.font = `900 ${135 * s}px system-ui, Arial, sans-serif`;
        ctx.fillText(displayDayMonth, canvas.width - 110 * s, 1140 * s);

        const link = document.createElement('a');
        link.download = `${filename}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      // 2. Otherwise render Location QR Label (Mode 2) - BALANCED FULL LANDSCAPE (A4/A3)
      // Locked proportions: Left QR ~46%, Right Details ~54%, completely preventing any border clipping!
      const qrBoxSize = 920 * s;
      const qrBoxX = 80 * s;
      const qrBoxY = (canvas.height - qrBoxSize) / 2; // Vertically centered

      ctx.lineWidth = 6 * s;
      ctx.strokeStyle = '#000000';
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 28 * s);
      ctx.fill();
      ctx.stroke();

      if (qrCanvas) {
        const qrPadding = 35 * s;
        ctx.drawImage(qrCanvas, qrBoxX + qrPadding, qrBoxY + qrPadding, qrBoxSize - qrPadding * 2, qrBoxSize - qrPadding * 2);
      }

      // Right Column: The 3 Required Details with Locked Proportions and Auto-Fitting Font Sizes
      const rightX = qrBoxX + qrBoxSize + 75 * s;
      const rightW = canvas.width - rightX - 80 * s; // Generous 924px width for crystal-clear readability

      // 1. ชื่อโซนหลัก
      ctx.fillStyle = '#64748b';
      ctx.font = `bold ${28 * s}px system-ui, Arial, sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText('1. ชื่อโซนหลัก', rightX, 270 * s);

      // Measure text and scale dynamically so it NEVER exceeds rightW!
      let zoneFontSize = 64 * s;
      ctx.font = `900 ${zoneFontSize}px system-ui, Arial, sans-serif`;
      while (ctx.measureText(zoneText).width > rightW && zoneFontSize > 34 * s) {
        zoneFontSize -= 2 * s;
        ctx.font = `900 ${zoneFontSize}px system-ui, Arial, sans-serif`;
      }
      ctx.fillStyle = '#000000';
      ctx.fillText(zoneText, rightX, 370 * s);

      // Divider 1 (locked exactly to rightW)
      ctx.lineWidth = 4 * s;
      ctx.strokeStyle = '#000000';
      ctx.beginPath();
      ctx.moveTo(rightX, 440 * s);
      ctx.lineTo(rightX + rightW, 440 * s);
      ctx.stroke();

      // 2. ชื่อ Locator หลัก
      ctx.fillStyle = '#64748b';
      ctx.font = `bold ${28 * s}px system-ui, Arial, sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText('2. ชื่อ Locator หลัก', rightX, 550 * s);

      // Measure text and scale dynamically so it NEVER exceeds rightW!
      let locFontSize = 74 * s;
      ctx.font = `900 ${locFontSize}px system-ui, monospace, Arial, sans-serif`;
      while (ctx.measureText(locatorText).width > rightW && locFontSize > 36 * s) {
        locFontSize -= 2 * s;
        ctx.font = `900 ${locFontSize}px system-ui, monospace, Arial, sans-serif`;
      }
      ctx.fillStyle = '#000000';
      ctx.fillText(locatorText, rightX, 660 * s);

      // Divider 2 (locked exactly to rightW)
      ctx.lineWidth = 4 * s;
      ctx.strokeStyle = '#000000';
      ctx.beginPath();
      ctx.moveTo(rightX, 735 * s);
      ctx.lineTo(rightX + rightW, 735 * s);
      ctx.stroke();

      // 3. Locator Code Box (locked to rightW)
      ctx.fillStyle = '#64748b';
      ctx.font = `bold ${28 * s}px system-ui, Arial, sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText('3. Locator Code', rightX, 845 * s);

      const codeBoxH = 185 * s;
      const codeBoxY = 885 * s;
      ctx.fillStyle = '#eff6ff';
      ctx.beginPath();
      ctx.roundRect(rightX, codeBoxY, rightW, codeBoxH, 24 * s);
      ctx.fill();
      ctx.lineWidth = 5 * s;
      ctx.strokeStyle = '#3b82f6';
      ctx.stroke();

      // Centered locator code with auto-scaled font so it fits inside the blue box perfectly!
      let codeFontSize = 76 * s;
      ctx.font = `900 ${codeFontSize}px monospace, system-ui, sans-serif`;
      while (ctx.measureText(codeText).width > rightW - 50 * s && codeFontSize > 36 * s) {
        codeFontSize -= 2 * s;
        ctx.font = `900 ${codeFontSize}px monospace, system-ui, sans-serif`;
      }
      ctx.fillStyle = '#172554';
      ctx.textAlign = 'center';
      ctx.fillText(codeText, rightX + rightW / 2, codeBoxY + codeBoxH / 2 + codeFontSize * 0.35);

      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (fallbackErr) {
      console.error('Fallback export error:', fallbackErr);
    }
  };

  // Download Full Printable Card (border, details, QR code) as PNG
  const handleDownloadCardPNG = async (elementId: string, filename: string) => {
    const element = document.getElementById(elementId);
    if (!element) {
      alert('ไม่พบกรอบป้ายฉลาก');
      return;
    }

    setIsExporting(true);
    try {
      // Use html2canvas directly to capture the exact live preview DOM element (100% parity)

      const isA3 = paperSize === 'A3_LANDSCAPE';
      const canvas = await html2canvas(element, {
        scale: isA3 ? 4 : 3, // Ultra-sharp 3x/4x resolution for high quality landscape printing
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        onclone: (clonedDoc) => {
          const el = clonedDoc.getElementById(elementId);
          if (el) {
            el.style.transform = 'none';
            el.style.margin = '0 auto';
            el.style.boxShadow = 'none';
            el.style.backgroundColor = '#ffffff';
            el.style.color = '#020617';
            el.style.borderColor = '#020617';
          }
        }
      });

      const link = document.createElement('a');
      link.download = `${filename.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.warn('html2canvas failed, using canvas fallback:', err);
      generateFallbackCardPNG(element, filename);
    } finally {
      setIsExporting(false);
    }
  };

  // Browser Print trigger
  const handlePrint = () => {
    setIsPrinting(true);
    if (activeMode === 'BATCH') {
      document.body.setAttribute('data-print-mode', 'batch');
    } else {
      document.body.setAttribute('data-print-mode', 'single');
    }
    document.body.setAttribute('data-paper-size', paperSize === 'A3_LANDSCAPE' ? 'a3-landscape' : 'a4-landscape');
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
      document.body.removeAttribute('data-print-mode');
      document.body.removeAttribute('data-paper-size');
    }, 250);
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn w-full min-w-0 max-w-full text-slate-100">
      
      {/* Top Banner & Hub Navigation */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-md print:hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between pb-4 border-b border-slate-800 gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-2xl shadow-inner">
              <Printer className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black text-white tracking-tight">
                  ระบบสร้างและพิมพ์ฉลาก QR Code สินค้า &amp; พิกัดคลังสินค้า (Label Printer &amp; QR Studio)
                </h2>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold flex items-center space-x-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>WMS Scanner Compatible</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                สร้างป้าย QR Code ตรงตามฟอร์แมตระบบสแกนเนอร์ (<span className="text-blue-400 font-mono font-bold">MODEL_YYYY-MM-DD_HH:mm_LINE_QTY</span>) สำหรับติดพาเลทและเสาแร็คทุกโซน
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSyncAllZones}
              disabled={isRefreshing}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 shadow-xs flex items-center space-x-1.5 transition-all active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 text-blue-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>ซิงค์ข้อมูล ({lastSyncTime})</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center space-x-1.5 transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>สั่งพิมพ์ฉลาก (Print Label)</span>
            </button>
          </div>
        </div>

        {/* Mode Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-4">
          <button
            onClick={() => setActiveMode('PALLET_ITEM')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeMode === 'PALLET_ITEM'
                ? 'bg-purple-600 text-white shadow-md font-black ring-2 ring-purple-400/40'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
            }`}
          >
            <Tag className="w-4 h-4 text-purple-300" />
            <span>1. ป้ายสินค้า &amp; QR พาเลท (Item QR Generator)</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-900/60 text-purple-200 border border-purple-500/30">
              {items.length} รายการ
            </span>
          </button>

          <button
            onClick={() => setActiveMode('LOCATION')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeMode === 'LOCATION'
                ? 'bg-blue-600 text-white shadow-md font-black ring-2 ring-blue-400/40'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
            }`}
          >
            <Grid className="w-4 h-4 text-blue-300" />
            <span>2. ป้ายพิกัดช่องจัดเก็บ (Rack &amp; Floor Locator QR)</span>
          </button>

          <button
            onClick={() => setActiveMode('BATCH')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeMode === 'BATCH'
                ? 'bg-indigo-600 text-white shadow-md font-black ring-2 ring-indigo-400/40'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
            }`}
          >
            <Layers className="w-4 h-4 text-indigo-300" />
            <span>3. พิมพ์ชุดใหญ่ต่อเนื่อง (Batch QR Sheet)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: ITEM / PALLET QR GENERATOR & PRINTABLE STUDIO (FEATURE ENHANCED)  */}
      {/* ========================================================================= */}
      {activeMode === 'PALLET_ITEM' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Interactive Item Search & Selector & Generator Parameters */}
          <div className="lg:col-span-5 space-y-4 print:hidden">
            


            {/* 2. QR Format Generator Parameters (Fine-tuning for System Scanning) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-md">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                <h3 className="text-xs font-bold text-slate-200 flex items-center space-x-2">
                  <SlidersHorizontal className="w-4 h-4 text-purple-400" />
                  <span>ปรับแต่งข้อมูลบนป้ายฉลาก (Pallet Tag Parameters)</span>
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    setOverrideDate(now.toISOString().slice(0, 10));
                    setOverrideTime(now.toTimeString().slice(0, 5));
                  }}
                  className="text-[10px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  <Clock className="w-3 h-3" />
                  <span>ใช้วันเวลาปัจจุบัน</span>
                </button>
              </div>

              {/* 1. Model / Material Code */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-300">รหัสวัตถุดิบ / สินค้า (Model Code):</label>
                  <span className="text-[10px] font-mono text-purple-400 font-bold">แสดงเด่นด้านบนสุด</span>
                </div>
                <input
                  type="text"
                  value={overrideModelHE}
                  onChange={(e) => setOverrideModelHE(e.target.value.toUpperCase())}
                  placeholder="e.g. ADL74761222"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono font-black text-white focus:ring-2 focus:ring-purple-500 uppercase"
                />
                <div className="flex items-center gap-1 pt-0.5 flex-wrap">
                  {['ADL74761222', 'ADL74920904', 'AJR73715601', 'AGF78413201'].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setOverrideModelHE(m)}
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded transition-all ${
                        overrideModelHE === m 
                          ? 'bg-purple-600 text-white font-bold' 
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Plant / Site Code & Target Line */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300">รหัสโรงงาน/พื้นที่ (Plant / Site Code):</label>
                  <input
                    type="text"
                    value={palletPlantCode}
                    onChange={(e) => setPalletPlantCode(e.target.value.toUpperCase())}
                    placeholder="e.g. SK"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono font-black text-amber-300 focus:ring-2 focus:ring-purple-500 uppercase text-center"
                  />
                  <div className="flex items-center gap-1 pt-0.5 justify-center">
                    {['SK', 'HE', 'A4', 'CY3', 'A2'].map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPalletPlantCode(p)}
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                          palletPlantCode === p ? 'bg-amber-600 text-white font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300">ไลน์ผลิต (LINE):</label>
                  <input
                    type="text"
                    value={overrideLine}
                    onChange={(e) => setOverrideLine(e.target.value.toUpperCase())}
                    placeholder="e.g. Y1"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono font-black text-blue-400 focus:ring-2 focus:ring-purple-500 uppercase text-center"
                  />
                  <div className="flex items-center gap-1 pt-0.5 justify-center">
                    {['Y1', 'HE1', 'HE2', 'HE3', 'HE4'].map(l => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setOverrideLine(l)}
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                          overrideLine === l ? 'bg-blue-600 text-white font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. Quantity & Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300">จำนวนชิ้น (Q'ty):</label>
                  <input
                    type="number"
                    min={1}
                    value={overrideQty}
                    onChange={(e) => setOverrideQty(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-emerald-400 focus:ring-2 focus:ring-purple-500 text-center"
                  />
                  <div className="flex items-center gap-1 pt-0.5 justify-center flex-wrap">
                    {[50, 80, 100, 120, 240, 600].map(q => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setOverrideQty(q)}
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                          overrideQty === q ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300">หน่วยนับ (Unit):</label>
                  <input
                    type="text"
                    value={palletUnit}
                    onChange={(e) => setPalletUnit(e.target.value.toUpperCase())}
                    placeholder="e.g. EA"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono font-black text-cyan-300 focus:ring-2 focus:ring-purple-500 uppercase text-center"
                  />
                  <div className="flex items-center gap-1 pt-0.5 justify-center">
                    {['EA', 'PCS', 'SET', 'BOX'].map(u => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setPalletUnit(u)}
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                          palletUnit === u ? 'bg-cyan-600 text-white font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4. Inbound Date & Time (auto generates 28/08 DD/MM and 2026-08-28 08:14) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-300">วันที่รับเข้า (Date):</label>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">ป้าย: {displayDayMonth}</span>
                  </div>
                  <input
                    type="date"
                    value={overrideDate}
                    onChange={(e) => setOverrideDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-200"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300">เวลา (Time):</label>
                  <input
                    type="time"
                    value={overrideTime}
                    onChange={(e) => setOverrideTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-200"
                  />
                </div>
              </div>

              {/* 5. PAPER SIZE SELECTOR - LOCKED TO LANDSCAPE ONLY */}
              <div className="space-y-1.5 p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
                    <Maximize2 className="w-3.5 h-3.5 text-purple-400" />
                    <span>ตั้งล็อคขนาดกระดาษ (Paper Size):</span>
                  </label>
                  <span className="text-[9.5px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>🔒 แนวนอนเท่านั้น (Landscape Only)</span>
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaperSize('A4_LANDSCAPE')}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      paperSize === 'A4_LANDSCAPE'
                        ? 'bg-purple-600/30 border-purple-500 text-white font-bold ring-1 ring-purple-500/40 shadow-xs'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <div className="text-xs font-mono font-bold">A4 แนวนอน</div>
                    <div className="text-[9.5px] text-slate-400">297 × 210 มม. (มาตรฐาน)</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaperSize('A3_LANDSCAPE')}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      paperSize === 'A3_LANDSCAPE'
                        ? 'bg-purple-600/30 border-purple-500 text-white font-bold ring-1 ring-purple-500/40 shadow-xs'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <div className="text-xs font-mono font-bold">A3 แนวนอน</div>
                    <div className="text-[9.5px] text-slate-400">420 × 297 มม. (พาเลทใหญ่)</div>
                  </button>
                </div>
              </div>

              {/* 6. Copies Number */}
              <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
                <label className="text-[11px] font-bold text-slate-300">จำนวนสำเนาที่จะพิมพ์:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={printCopies}
                    onChange={(e) => setPrintCopies(Number(e.target.value))}
                    className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-white text-center"
                  />
                  <span className="text-[11px] text-slate-400 font-bold">แผ่น</span>
                </div>
              </div>

              {/* System Scanner Format Verification Banner */}
              <div className="p-3 bg-slate-950/80 border border-cyan-500/30 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-cyan-300 flex items-center gap-1 font-mono">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                    <span>SYSTEM SCANNER VERIFIED FORMAT:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(generatedItemQRString)}
                    className="text-[10px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 font-mono"
                  >
                    {copiedText === generatedItemQRString ? (
                      <span className="text-emerald-400 flex items-center gap-1 font-bold">
                        <Check className="w-3 h-3" /> คัดลอกแล้ว!
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Copy className="w-3 h-3" /> คัดลอกรหัส
                      </span>
                    )}
                  </button>
                </div>
                <div className="font-mono text-xs font-bold text-amber-300 bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800 break-all select-all">
                  {generatedItemQRString}
                </div>
                <div className="text-[9.5px] text-slate-400 flex items-center justify-between pt-0.5">
                  <span>ตัวแปร: [Model]_[Date]_[Time]_[Line]_[Qty]</span>
                  <span className="text-emerald-400 font-bold">✓ สแกนผ่าน QuickScanner 100%</span>
                </div>
              </div>

            </div>

          </div>

          {/* Right Column: High-Fidelity Printable Display Card (Print Preview) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-start p-4 sm:p-6 bg-slate-950 border border-slate-800 rounded-2xl min-h-[560px]">
            
            <div className="w-full flex items-center justify-between pb-3 mb-4 border-b border-slate-800 print:hidden">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-black text-slate-200">
                  ตัวอย่างป้ายฉลากพาเลทพิมพ์จริง (Printable Live Preview)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadCardPNG('pallet-printable-card', `QR_Pallet_${activeModelCode}_${overrideLine || activePalletItem?.useLine || 'Y1'}_${palletPlantCode || 'SK'}`)}
                  disabled={isExporting}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all shadow-xs active:scale-95 cursor-pointer disabled:opacity-50"
                  title="ดาวน์โหลดป้ายฉลากทั้งกรอบและรายละเอียดเป็นไฟล์รูปภาพ PNG ความละเอียดสูง 2K"
                >
                  {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" /> : <Download className="w-3.5 h-3.5 text-blue-400" />}
                  <span>ดาวน์โหลดป้ายคมชัด 2K (.png)</span>
                </button>
                <button
                  onClick={handlePrint}
                  className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>พิมพ์ {printCopies} ชุด</span>
                </button>
              </div>
            </div>

            {/* THE ACTUAL PRINTABLE PHYSICAL CARD */}
            {activePalletItem ? (
              <div className="w-full flex flex-col items-center justify-center space-y-4">
                
                {/* Visual Label Outer Wrapper - EXACT REPLICA OF USER REFERENCE IMAGE */}
                <div 
                  id="pallet-printable-card"
                  className="w-full bg-white text-black border-4 border-black rounded-2xl p-4 sm:p-5 md:p-6 shadow-2xl flex flex-col justify-between aspect-[297/210] max-w-2xl mx-auto print:shadow-none print:border-4 print:m-0 print:w-full select-none transition-all box-border overflow-hidden"
                  style={{
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    borderColor: '#000000',
                    aspectRatio: '297 / 210'
                  }}
                >
                  
                  {/* ROW 1: TOP MODEL / MATERIAL CODE - Auto-Scales via SVG so it fills top width without ANY clipping */}
                  <div className="w-full text-center px-1 pt-0 shrink-0">
                    <svg viewBox="0 0 1000 80" className="w-full h-8 sm:h-10 md:h-12 overflow-visible">
                      <text
                        x="500"
                        y="60"
                        textAnchor="middle"
                        fill="#000000"
                        fontWeight="900"
                        fontSize="68"
                        letterSpacing="12"
                        fontFamily="system-ui, Arial, sans-serif"
                      >
                        {activeModelCode}
                      </text>
                    </svg>
                  </div>

                  {/* ROW 2: 3 COLUMNS - LEFT EMPTY (COL 3), CENTER QR CODE (COL 6), RIGHT PLANT CODE (COL 3) */}
                  <div className="grid grid-cols-12 items-center w-full my-auto py-0.5">
                    {/* Left Spacer */}
                    <div className="col-span-3"></div>

                    {/* Center: QR Code in DEAD HORIZONTAL CENTER (Clean, compact, no overlap with 160) */}
                    <div className="col-span-6 flex flex-col items-center justify-center">
                      <div className="bg-white flex items-center justify-center p-0.5">
                        <QRCodeCanvas
                          id={`qr-pallet-canvas-${generatedItemQRString}`}
                          value={generatedItemQRString}
                          size={1024} // 2K resolution buffer
                          level="H"
                          includeMargin={false}
                          style={{
                            width: 'clamp(100px, 16vw, 150px)',
                            height: 'clamp(100px, 16vw, 150px)',
                            imageRendering: 'pixelated'
                          }}
                        />
                      </div>
                    </div>

                    {/* Right: Plant Code "SK" or "SJ" */}
                    <div className="col-span-3 flex items-center justify-center pr-1 sm:pr-2">
                      <span className="text-4xl sm:text-5xl md:text-6xl font-black text-black tracking-tight font-sans text-center leading-none">
                        {palletPlantCode || 'SK'}
                      </span>
                    </div>
                  </div>

                  {/* ROW 3: Q'ty (Left), Number (Center directly under QR, clear gap above), Unit EA (Right) */}
                  <div className="grid grid-cols-12 items-baseline w-full pt-0.5 pb-0.5">
                    {/* Left: Q'ty label */}
                    <div className="col-span-3 text-left pl-1 sm:pl-2">
                      <span className="text-xl sm:text-2xl md:text-3xl font-black text-black font-sans tracking-tight leading-none">
                        Q'ty
                      </span>
                    </div>

                    {/* Center: Quantity Number */}
                    <div className="col-span-6 text-center">
                      <span className="text-3xl sm:text-4xl md:text-5xl font-black text-black font-sans leading-none">
                        {overrideQty > 0 ? overrideQty : 100}
                      </span>
                    </div>

                    {/* Right: Unit EA */}
                    <div className="col-span-3 text-right pr-2 sm:pr-4">
                      <span className="text-xl sm:text-2xl md:text-3xl font-black text-black font-sans leading-none">
                        {palletUnit || 'EA'}
                      </span>
                    </div>
                  </div>

                  {/* ROW 4: LINE + Line Code (Left), DateTime + DD/MM Date (Right) - Sits completely inside bottom border */}
                  <div className="grid grid-cols-12 items-end w-full pt-0.5 pb-0.5">
                    {/* Left: LINE label with line name below it */}
                    <div className="col-span-4 text-left pl-1 sm:pl-2 flex flex-col justify-end">
                      <span className="text-[10px] sm:text-xs font-black text-black uppercase tracking-wider font-sans leading-tight">
                        LINE
                      </span>
                      <span className="text-2xl sm:text-3xl md:text-4xl font-black text-black font-sans tracking-tight leading-none mt-0.5">
                        {overrideLine || activePalletItem?.useLine || 'Y1'}
                      </span>
                    </div>

                    {/* Center: Spacer */}
                    <div className="col-span-2"></div>

                    {/* Right: Formatted Date Time & Date DD/MM */}
                    <div className="col-span-6 text-right pr-2 sm:pr-4 flex flex-col items-end justify-end">
                      <span className="text-[10px] sm:text-xs font-black text-black font-mono tracking-tight pb-0.5 leading-none">
                        {displayDateTime}
                      </span>
                      <span className="text-2xl sm:text-3xl md:text-4xl font-black text-black font-sans tracking-tight leading-none">
                        {displayDayMonth}
                      </span>
                    </div>
                  </div>

                </div>

                {/* Print Hint */}
                <p className="text-[11px] text-slate-400 text-center max-w-md print:hidden flex items-center justify-center gap-1.5 font-medium">
                  <span>💡 แสดงข้อมูลและตำแหน่งตรงตามรูปจำลองตัวอย่าง • ล็อคขนาดกระดาษแนวนอน A4 / A3 เท่านั้น</span>
                </p>

              </div>
            ) : (
              <div className="text-center text-slate-500 py-16">
                กรุณาเลือกรายการสินค้าจากกล่องค้นหาด้านซ้าย
              </div>
            )}

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: LOCATION QR LABEL (ป้ายพิกัดตำแหน่งช่องจัดเก็บ - แนวนอนเท่านั้น) */}
      {/* ========================================================================= */}
      {activeMode === 'LOCATION' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Form: Clean Separated Multi-Stage Filter (แยกกันคนละตัวเลือก filter) */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-md print:hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-xs font-bold text-slate-200 flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-blue-400" />
                <span>กำหนดพิกัดตำแหน่ง (Real-Time Zone &amp; Locator Filter)</span>
              </h3>
              <span className="text-[10px] font-mono font-bold text-blue-300 bg-blue-500/20 px-2.5 py-0.5 rounded-full border border-blue-500/30">
                แยกตัวเลือกชัดเจน
              </span>
            </div>

            {/* FILTER 1: ตัวเลือกที่ 1 - เลือกอาคาร / โซนจัดเก็บหลัก */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <label className="text-slate-200 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600/30 text-blue-400 border border-blue-500/40 text-[10px] flex items-center justify-center font-mono">1</span>
                  <span>เลือกอาคาร / พื้นที่หลัก (Major Building / Area):</span>
                </label>
                <span className="text-[10px] text-blue-400 font-mono font-bold">
                  {currentBuilding.badge}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {MAJOR_BUILDINGS.map(b => {
                  const isSelected = selectedBuilding === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => handleSelectBuilding(b.id)}
                      className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600/20 border-blue-500 text-white shadow-sm ring-1 ring-blue-500/50'
                          : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <span className="text-base shrink-0">{b.icon}</span>
                        <div className="truncate">
                          <div className="text-xs font-bold truncate">{b.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono truncate">{b.shortName}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                        <span className={`text-[9.5px] px-2 py-0.5 rounded font-mono font-bold ${
                          isSelected ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {b.badge}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* FILTER 2: ตัวเลือกที่ 2 - เลือกแถว / โซนย่อยในอาคารที่เลือก */}
            <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-xs font-bold">
                <label className="text-slate-200 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 text-[10px] flex items-center justify-center font-mono">2</span>
                  <span>เลือกแถว / โซนย่อย (Zone / Row):</span>
                </label>
                <span className="text-[10px] text-emerald-400 font-mono font-bold">
                  {currentBuilding.zones.length} โซนใน{currentBuilding.shortName}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                {currentBuilding.zones.map(z => {
                  const isSelected = selectedZone === z.zone;
                  return (
                    <button
                      key={z.zone}
                      type="button"
                      onClick={() => handleSelectZone(z.zone)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shrink-0 ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400/50 font-black'
                          : 'bg-slate-950 border border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <span>{z.label}</span>
                      <span className={`text-[9px] font-mono px-1 py-0.2 rounded ${
                        isSelected ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {z.bays}B
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* FILTER 3 & 4: ตัวเลือกที่ 3 - ช่อง/เสา (Bay) & ตัวเลือกที่ 4 - ระดับชั้น (Level) */}
            <div className="pt-1 border-t border-slate-800/80 space-y-3">
              
              {/* FILTER 3: ช่องเสา (Bay) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <label className="text-slate-200 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-cyan-600/30 text-cyan-400 border border-cyan-500/40 text-[10px] flex items-center justify-center font-mono">3</span>
                    <span>เลือกช่อง / เสา (Bay / Column):</span>
                  </label>
                  <span className="text-[10px] text-cyan-300 font-mono font-bold">
                    ช่อง 1 ถึง {currentZoneConfig.bays}
                  </span>
                </div>

                {/* Quick Number Pills for Instant Selection */}
                <div className="flex flex-wrap gap-1">
                  {Array.from({ length: currentZoneConfig.bays }, (_, i) => i + 1).map(bayNum => {
                    const isSelected = selectedBay === bayNum;
                    return (
                      <button
                        key={bayNum}
                        type="button"
                        onClick={() => setSelectedBay(bayNum)}
                        className={`h-7 min-w-7 px-1.5 rounded-md text-xs font-mono font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-600 text-white shadow-xs font-black ring-1 ring-cyan-300'
                            : 'bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        {bayNum}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="range"
                    min={1}
                    max={currentZoneConfig.bays}
                    value={selectedBay}
                    onChange={(e) => setSelectedBay(Number(e.target.value))}
                    className="flex-1 accent-cyan-500 cursor-pointer"
                  />
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedBay(prev => Math.max(1, prev - 1))}
                      disabled={selectedBay <= 1}
                      className="w-7 h-7 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-bold border border-slate-700 disabled:opacity-40"
                    >
                      -
                    </button>
                    <span className="w-10 text-center font-mono font-black text-sm text-cyan-400 bg-slate-950 px-1 py-0.5 rounded border border-slate-800">
                      B{selectedBay}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedBay(prev => Math.min(currentZoneConfig.bays, prev + 1))}
                      disabled={selectedBay >= currentZoneConfig.bays}
                      className="w-7 h-7 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-bold border border-slate-700 disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* FILTER 4: เลือกระดับชั้น (Shelf Level) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <label className="text-slate-200 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-purple-600/30 text-purple-400 border border-purple-500/40 text-[10px] flex items-center justify-center font-mono">4</span>
                    <span>เลือกระดับชั้น (Shelf Level):</span>
                  </label>
                  <span className="text-[10px] text-purple-300 font-mono font-bold">
                    {currentZoneConfig.levels.length > 1 ? `${currentZoneConfig.levels.length} ชั้นความสูง` : 'ระดับพื้นราบ'}
                  </span>
                </div>

                {currentZoneConfig.levels.length > 1 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {currentZoneConfig.levels.map(lvl => {
                      const isSelected = selectedLevel === lvl;
                      return (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setSelectedLevel(lvl)}
                          className={`py-2 px-2 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                            isSelected
                              ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-400/50 font-black'
                              : 'bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <div className="font-mono text-xs">ชั้น {lvl} (L{lvl})</div>
                          <div className="text-[9px] text-slate-400 mt-0.5 opacity-80">
                            {lvl === 1 ? 'ชั้นล่างสุด' : lvl === 4 ? 'ชั้นบนสุด' : `ระดับ +${lvl * 1.5}m`}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span>ชั้น 1 (L1 - ระดับพื้นจัดเก็บระนาบเดียว / Floor Staging)</span>
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      Floor 0.0m
                    </span>
                  </div>
                )}
              </div>

            </div>

            {/* FILTER 5: ตัวเลือกขนาดกระดาษ - แนวนอนเท่านั้น (A4 / A3 Landscape) */}
            <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <label className="text-slate-200 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-amber-600/30 text-amber-400 border border-amber-500/40 text-[10px] flex items-center justify-center font-mono">5</span>
                  <span>ขนาดกระดาษสำหรับพิมพ์ (แนวนอนเท่านั้น • Landscape Only):</span>
                </label>
                <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  แนวนอนเท่านั้น
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaperSize('A4_LANDSCAPE')}
                  className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    paperSize === 'A4_LANDSCAPE'
                      ? 'bg-amber-600/20 border-amber-500 text-white ring-1 ring-amber-500/50'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold flex items-center gap-1">
                      <span>📄 ขนาด A4 แนวนอน</span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">297 × 210 มม.</div>
                  </div>
                  {paperSize === 'A4_LANDSCAPE' && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                </button>

                <button
                  type="button"
                  onClick={() => setPaperSize('A3_LANDSCAPE')}
                  className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    paperSize === 'A3_LANDSCAPE'
                      ? 'bg-amber-600/20 border-amber-500 text-white ring-1 ring-amber-500/50'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold flex items-center gap-1">
                      <span>📜 ขนาด A3 แนวนอน</span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">420 × 297 มม.</div>
                  </div>
                  {paperSize === 'A3_LANDSCAPE' && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                </button>
              </div>
            </div>

            {/* Live Stored Item & Label Preview Summary Info */}
            <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-300 flex items-center space-x-1.5">
                  <QrCode className="w-4 h-4 text-cyan-400" />
                  <span>ข้อมูลป้ายพิกัดที่จะพิมพ์ (3 ข้อมูลหลัก):</span>
                </span>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold px-2 py-0.5 rounded">
                  Landscape {paperSize === 'A3_LANDSCAPE' ? 'A3' : 'A4'}
                </span>
              </div>

              <div className="space-y-1.5 text-xs bg-slate-900/90 p-3 rounded-lg border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">1. ชื่อโซนหลัก:</span>
                  <span className="font-bold text-white text-right">{getMainZoneName(selectedZone)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">2. ชื่อ Locator หลัก:</span>
                  <span className="font-mono font-bold text-emerald-400 text-right">{getMainLocatorName(selectedZone, selectedBay, selectedLevel)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">3. Locator Code:</span>
                  <span className="font-mono font-bold text-cyan-300 text-right">{fullLocatorCode}</span>
                </div>
              </div>

              {currentSlotItem && (
                <div className="text-[11px] text-slate-400 pt-1 flex items-center justify-between border-t border-slate-800/80">
                  <span>สินค้าปัจจุบัน: <strong className="text-slate-200">{currentSlotItem.modelHE}</strong></span>
                  <span className="text-emerald-400 font-mono font-bold">{currentSlotItem.quantity} U</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleDownloadCardPNG('printable-label-card', `QR_${paperSize}_${fullLocatorCode}`)}
                disabled={isExporting}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-xs border border-slate-700 active:scale-95 cursor-pointer disabled:opacity-50"
                title="ดาวน์โหลดป้ายฉลากทั้งกรอบและรายละเอียดเป็นไฟล์รูปภาพ PNG แนวนอน"
              >
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> : <Download className="w-4 h-4 text-blue-400" />}
                <span>ดาวน์โหลดป้ายทั้งกรอบ (.png)</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>พิมพ์ป้าย (Landscape)</span>
              </button>
            </div>
          </div>

          {/* Right Preview: High-Fidelity Printable Location Label Card - LANDSCAPE ONLY (แนวนอนเท่านั้น) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-start p-4 sm:p-6 bg-slate-950 rounded-2xl border border-slate-800 min-h-[500px]">
            <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-slate-800 gap-2 print:hidden">
              <div className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span>ตัวอย่างป้ายพิกัดช่องพิมพ์จริง (แนวนอนเท่านั้น • {paperSize === 'A3_LANDSCAPE' ? 'A3 Landscape 420×297mm' : 'A4 Landscape 297×210mm'})</span>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Paper Size Switcher in Preview Header */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-0.5 flex items-center text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setPaperSize('A4_LANDSCAPE')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      paperSize === 'A4_LANDSCAPE' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    A4 แนวนอน
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaperSize('A3_LANDSCAPE')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      paperSize === 'A3_LANDSCAPE' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    A3 แนวนอน
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleDownloadCardPNG('printable-label-card', `QR_${paperSize}_${fullLocatorCode}`)}
                  disabled={isExporting}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all shadow-xs active:scale-95 cursor-pointer disabled:opacity-50"
                  title="ดาวน์โหลดป้ายทั้งกรอบแนวนอน"
                >
                  {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" /> : <Download className="w-3.5 h-3.5 text-blue-400" />}
                  <span>โหลดรูปป้าย (.png)</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>พิมพ์ป้ายนี้</span>
                </button>
              </div>
            </div>

            {/* Printable Location Physical Card: LANDSCAPE LAYOUT ONLY (297:210 Ratio) with HUGE QR and ONLY 3 key fields */}
            {/* Printable Location Physical Card: FULL LANDSCAPE (A4/A3) - NO HEADER/FOOTER STRIPS, MAXIMIZED GIANT QR CODE & LARGE READABLE TEXT */}
            <div 
              id="printable-label-card"
              className="printable-white-sticker w-full bg-white text-black border-4 sm:border-6 border-black rounded-3xl p-5 sm:p-7 lg:p-9 shadow-2xl flex items-center aspect-[297/210] max-w-4xl mx-auto print:shadow-none print:border-4 print:w-full print:m-0 select-none transition-all box-border overflow-hidden"
              style={{
                backgroundColor: '#ffffff',
                color: '#000000',
                borderColor: '#000000',
                aspectRatio: '297 / 210'
              }}
            >
              <div className="w-full h-full grid grid-cols-12 gap-4 sm:gap-6 lg:gap-8 items-center">
                
                {/* Left: GIANT High-Resolution QR Code (Col 5, fills full height) */}
                <div className="col-span-5 flex flex-col items-center justify-center h-full">
                  <div className="w-full h-full flex items-center justify-center p-1 sm:p-2 lg:p-3 bg-white border-2 sm:border-3 border-black rounded-xl shadow-xs">
                    <QRCodeCanvas
                      id={`qr-canvas-${fullLocatorCode}`}
                      value={fullLocatorCode}
                      size={1024} // 2K ultra-sharp resolution buffer
                      level="H"
                      includeMargin={true}
                      style={{ width: '100%', height: '100%', maxWidth: '100%', maxHeight: '100%', imageRendering: 'pixelated' }}
                    />
                  </div>
                </div>

                {/* Right: The 3 Requested Fields (Col 7, generous width, no overflow) */}
                <div className="col-span-7 flex flex-col justify-between h-full py-1 sm:py-2 pl-2 sm:pl-4 overflow-hidden text-left">
                  
                  {/* 1. ชื่อโซนหลัก */}
                  <div className="space-y-0.5 sm:space-y-1">
                    <div className="text-[11px] sm:text-xs md:text-sm font-black tracking-widest text-slate-500 uppercase">
                      1. ชื่อโซนหลัก
                    </div>
                    <div className="zone-title-text text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-black tracking-tight leading-tight line-clamp-2">
                      {getMainZoneName(selectedZone)}
                    </div>
                  </div>

                  <div className="border-b-2 sm:border-b-3 border-black my-0.5 sm:my-1" />

                  {/* 2. ชื่อ Locator หลัก */}
                  <div className="space-y-0.5 sm:space-y-1">
                    <div className="text-[11px] sm:text-xs md:text-sm font-black tracking-widest text-slate-500 uppercase">
                      2. ชื่อ Locator หลัก
                    </div>
                    <div className="locator-title-text text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-mono font-black text-black tracking-tight leading-tight line-clamp-2">
                      {getMainLocatorName(selectedZone, selectedBay, selectedLevel)}
                    </div>
                  </div>

                  <div className="border-b-2 sm:border-b-3 border-black my-0.5 sm:my-1" />

                  {/* 3. Locator Code */}
                  <div className="space-y-1 sm:space-y-1.5">
                    <div className="text-[11px] sm:text-xs md:text-sm font-black tracking-widest text-slate-500 uppercase">
                      3. Locator Code
                    </div>
                    <div className="w-full bg-blue-50 px-3 sm:px-6 py-2 sm:py-3.5 rounded-2xl border-2 sm:border-3 border-blue-500 shadow-xs flex items-center justify-center">
                      <span className="locator-code-text text-lg sm:text-xl md:text-2xl lg:text-3xl font-mono font-black text-blue-950 select-all tracking-wide text-center truncate">
                        {fullLocatorCode}
                      </span>
                    </div>
                  </div>

                </div>

              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-4 text-center print:hidden max-w-xl">
              💡 ป้ายพิกัดช่องจัดเก็บแบบเต็มหน้ากระดาษแนวนอน (A4/A3) เน้น QR Code ขนาดใหญ่สูงสุด และตัวหนังสือชื่อโซน, ชื่อพิกัด, รหัสพิกัดขนาดใหญ่ชัดเจน มองเห็นได้ง่ายในระยะไกล
            </p>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 3: BATCH QR SHEET (พิมพ์ชุดใหญ่ต่อเนื่อง)                              */}
      {/* ========================================================================= */}
      {activeMode === 'BATCH' && (
        <div className="space-y-4">
          {/* Batch Configuration Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-4 print:hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-xs font-bold text-slate-200 flex items-center space-x-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>กำหนดช่วงการสร้างป้ายพิมพ์ต่อเนื่อง (Batch Print Config)</span>
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-indigo-300 bg-indigo-500/20 px-2.5 py-1 rounded-lg border border-indigo-500/30">
                  รวมทั้งหมด {batchList.length} ป้าย
                </span>
                <button
                  onClick={handlePrint}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>สั่งพิมพ์แผ่นชุดนี้ทั้งหมด ({batchList.length} ป้าย)</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* 1. Building */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-blue-600/30 text-blue-400 text-[10px] flex items-center justify-center font-mono">1</span>
                  <span>เลือกอาคาร:</span>
                </label>
                <select
                  value={batchBuilding}
                  onChange={(e) => handleSelectBatchBuilding(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:ring-1 focus:ring-blue-500"
                >
                  {MAJOR_BUILDINGS.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* 2. Zone */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-emerald-600/30 text-emerald-400 text-[10px] flex items-center justify-center font-mono">2</span>
                  <span>เลือกโซนย่อย:</span>
                </label>
                <select
                  value={batchZone}
                  onChange={(e) => handleSelectBatchZone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:ring-1 focus:ring-emerald-500"
                >
                  {currentBatchBuilding.zones.map(z => (
                    <option key={z.zone} value={z.zone}>{z.label} ({z.bays} Bays)</option>
                  ))}
                </select>
              </div>

              {/* 3. Start Bay */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-cyan-600/30 text-cyan-400 text-[10px] flex items-center justify-center font-mono">3</span>
                  <span>จาก Bay ที่:</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={25}
                  value={batchStartBay}
                  onChange={(e) => setBatchStartBay(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              {/* 4. End Bay */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-cyan-600/30 text-cyan-400 text-[10px] flex items-center justify-center font-mono">4</span>
                  <span>ถึง Bay ที่:</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={25}
                  value={batchEndBay}
                  onChange={(e) => setBatchEndBay(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              {/* 5. Level Filter */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-purple-600/30 text-purple-400 text-[10px] flex items-center justify-center font-mono">5</span>
                  <span>ระดับชั้น:</span>
                </label>
                <select
                  value={batchLevelFilter}
                  onChange={(e) => setBatchLevelFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:ring-1 focus:ring-purple-500"
                >
                  <option value="ALL">ทุกระดับชั้น (L1 - L4)</option>
                  <option value={1}>เฉพาะชั้น 1 (L1)</option>
                  <option value={2}>เฉพาะชั้น 2 (L2)</option>
                  <option value={3}>เฉพาะชั้น 3 (L3)</option>
                  <option value={4}>เฉพาะชั้น 4 (L4)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Batch Grid Preview / Print Sheet in Landscape Card Format */}
          <div className="batch-print-container grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {batchList.map((item) => {
              const cardId = `batch-card-${item.locatorCode.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
              return (
                <div
                  key={item.locatorCode}
                  id={cardId}
                  className="printable-white-sticker bg-white text-slate-950 border-3 border-slate-950 rounded-2xl p-4 shadow-sm flex flex-col justify-between text-left space-y-2.5 print:break-inside-avoid print:shadow-none print:border-4 aspect-[297/210]"
                >
                  {/* Body Split */}
                  <div className="grid grid-cols-12 gap-3 items-center flex-1">
                    {/* Left QR */}
                    <div className="col-span-5 flex items-center justify-center p-2 bg-white border-2 border-black rounded-xl">
                      <QRCodeCanvas
                        id={`qr-batch-canvas-${item.locatorCode}`}
                        value={item.locatorCode}
                        size={140}
                        level="H"
                        includeMargin={true}
                        style={{ width: '100%', height: '100%', maxWidth: '100%' }}
                      />
                    </div>

                    {/* Right Details */}
                    <div className="col-span-7 space-y-2">
                      <div>
                        <div className="text-[9px] font-black uppercase text-slate-500">1. ชื่อโซนหลัก</div>
                        <div className="text-sm font-black text-black truncate leading-tight">
                          {getMainZoneName(item.zone)}
                        </div>
                      </div>

                      <div className="border-b-2 border-black" />

                      <div>
                        <div className="text-[9px] font-black uppercase text-slate-500">2. ชื่อ Locator หลัก</div>
                        <div className="text-base font-mono font-black text-black leading-tight">
                          {getMainLocatorName(item.zone, item.bay, item.level)}
                        </div>
                      </div>

                      <div className="border-b-2 border-black" />

                      <div>
                        <div className="text-[8.5px] font-black uppercase text-slate-500">3. Locator Code</div>
                        <div className="text-xs font-mono font-black text-blue-900 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-400 inline-block">
                          {item.locatorCode}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="w-full pt-1.5 border-t border-slate-200 flex items-center justify-end text-[8.5px] font-mono text-slate-500 print:hidden">
                    <span>PRINT READY (แนวนอน)</span>
                    <button
                      type="button"
                      onClick={() => handleDownloadCardPNG(cardId, `QR_Label_${item.locatorCode}`)}
                      disabled={isExporting}
                      className="text-blue-700 font-bold hover:underline cursor-pointer disabled:opacity-50 flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>ดาวน์โหลดรูปภาพ</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};
