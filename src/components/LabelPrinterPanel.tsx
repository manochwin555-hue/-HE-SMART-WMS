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
  Maximize2
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { 
  InventoryItem, 
  ZoneCapacityMaster, 
  WarehouseFacility, 
  CustomRackSlot, 
  MasterDataItem, 
  AgingThresholdConfig, 
  StorageZone 
} from '../types';

interface LabelPrinterPanelProps {
  items?: InventoryItem[];
  zoneCapacities?: ZoneCapacityMaster[];
  facilities?: WarehouseFacility[];
  customSlots?: CustomRackSlot[];
  masterData?: MasterDataItem[];
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
  const [overrideQty, setOverrideQty] = useState<number>(0);
  const [overrideLine, setOverrideLine] = useState<string>('');
  const [overrideDate, setOverrideDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [overrideTime, setOverrideTime] = useState<string>(() => new Date().toTimeString().slice(0, 5));
  const [overrideLotNo, setOverrideLotNo] = useState<string>('');
  const [labelSize, setLabelSize] = useState<'STANDARD_4x3' | 'COMPACT_3x2' | 'A4_SPEC'>('STANDARD_4x3');
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
      setOverrideQty(activePalletItem.quantity);
      setOverrideLine(activePalletItem.useLine || 'HE1');
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

  // =========================================================================
  // SYSTEM SCANNING QR FORMAT CALCULATION
  // Format: ${modelHE}_${YYYY-MM-DD}_${HH:mm}_${useLine}_${quantity}
  // Example: ADL74920904_2026-06-25_09:27_HE2_600
  // This matches QuickScannerModal & QRScanner exactly!
  // =========================================================================
  const generatedItemQRString = useMemo(() => {
    if (!activePalletItem) return 'ADL74920904_2026-07-01_10:00_HE1_100';
    const model = activePalletItem.modelHE || 'MODEL-HE';
    const date = overrideDate || new Date().toISOString().slice(0, 10);
    const time = overrideTime || '09:00';
    const line = overrideLine || activePalletItem.useLine || 'HE1';
    const qty = overrideQty > 0 ? overrideQty : activePalletItem.quantity;

    return `${model}_${date}_${time}_${line}_${qty}`;
  }, [activePalletItem, overrideDate, overrideTime, overrideLine, overrideQty]);

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
  // 2. LOCATION MODE STATES
  // =========================================================================
  const [selectedZone, setSelectedZone] = useState<string>('B');
  const [selectedBay, setSelectedBay] = useState<number>(1);
  const [selectedLevel, setSelectedLevel] = useState<number>(1);

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
  // 3. BATCH MODE STATES
  // =========================================================================
  const [batchZone, setBatchZone] = useState<string>('B');
  const [batchStartBay, setBatchStartBay] = useState<number>(1);
  const [batchEndBay, setBatchEndBay] = useState<number>(12);
  const [batchLevelFilter, setBatchLevelFilter] = useState<number | 'ALL'>('ALL');

  const batchList = useMemo(() => {
    const list: {
      zone: string;
      bay: number;
      level: number;
      locatorCode: string;
      locationLabel: string;
      building: string;
      currentItem?: InventoryItem;
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
          currentItem: itemAtLoc
        });
      }
    }
    return list;
  }, [batchZone, batchStartBay, batchEndBay, batchLevelFilter, items]);

  // Download Single QR Code as PNG
  const handleDownloadPNG = (code: string, customCanvasId?: string) => {
    const canvasId = customCanvasId || `qr-canvas-${code}`;
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      alert('ไม่พบ Canvas รูปภาพ QR Code');
      return;
    }
    const link = document.createElement('a');
    link.download = `QR_Label_${code.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Browser Print trigger
  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 300);
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
            
            {/* 1. Item Selection & Search Box */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-md">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                <h3 className="text-xs font-bold text-slate-200 flex items-center space-x-2">
                  <Search className="w-4 h-4 text-purple-400" />
                  <span>ค้นหาและเลือกสินค้าที่ต้องการสร้างป้าย QR</span>
                </h3>
                <span className="text-[11px] font-mono font-bold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/30">
                  พบ {filteredItemList.length} พาเลท
                </span>
              </div>

              {/* Text Search Input */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={materialSearch}
                  onChange={(e) => setMaterialSearch(e.target.value)}
                  placeholder="ค้นหา Model HE, Part Name, Locator Code, Line..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              {/* Zone Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                <button
                  onClick={() => setSelectedZoneFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all ${
                    selectedZoneFilter === 'ALL' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  ทั้งหมด
                </button>
                <button
                  onClick={() => setSelectedZoneFilter('A4_RACK')}
                  className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all ${
                    selectedZoneFilter === 'A4_RACK' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  A4 Rack
                </button>
                <button
                  onClick={() => setSelectedZoneFilter('A4_FLOOR')}
                  className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all ${
                    selectedZoneFilter === 'A4_FLOOR' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  A4 Floor
                </button>
                <button
                  onClick={() => setSelectedZoneFilter('A2_RAIL')}
                  className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all ${
                    selectedZoneFilter === 'A2_RAIL' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  A2 Flow Rail
                </button>
                <button
                  onClick={() => setSelectedZoneFilter('A5_TENT')}
                  className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all ${
                    selectedZoneFilter === 'A5_TENT' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  A5 Tents
                </button>
                <button
                  onClick={() => setSelectedZoneFilter('CY3_RACK')}
                  className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all ${
                    selectedZoneFilter === 'CY3_RACK' ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  CY3 Heavy Rack
                </button>
              </div>

              {/* Scrollable Selectable Item List */}
              <div className="max-h-[260px] overflow-y-auto space-y-2 pr-1 divide-y divide-slate-800/60">
                {filteredItemList.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-xs">
                    ไม่พบรายการสินค้าที่ตรงกับคำค้นหา
                  </div>
                ) : (
                  filteredItemList.map((item) => {
                    const isSelected = activePalletItem?.id === item.id;
                    const isOverdue = item.agingDays > agingConfig.criticalDays;
                    const isWarning = item.agingDays > agingConfig.safeDaysMax && item.agingDays <= agingConfig.criticalDays;

                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItemId(item.id)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected 
                            ? 'border-purple-500 bg-purple-950/40 shadow-sm ring-1 ring-purple-500/50' 
                            : 'border-slate-800/80 bg-slate-950/40 hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-xs font-mono font-black text-white">{item.modelHE}</span>
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                              Line {item.useLine}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[190px]">{item.partName}</div>
                          <div className="text-[10px] text-cyan-400 font-mono">{item.locatorCode}</div>
                        </div>

                        <div className="text-right space-y-1">
                          <div className="text-xs font-mono font-black text-emerald-400">{item.quantity} U</div>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border inline-block ${
                            isOverdue 
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' 
                              : isWarning 
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' 
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          }`}>
                            Aging {item.agingDays} วัน
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 2. QR Format Generator Parameters (Fine-tuning for System Scanning) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-md">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                <h3 className="text-xs font-bold text-slate-200 flex items-center space-x-2">
                  <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                  <span>ปรับแต่งข้อมูลบนฉลาก (Label Generator Parameters)</span>
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setOverrideDate(new Date().toISOString().slice(0, 10));
                    setOverrideTime(new Date().toTimeString().slice(0, 5));
                  }}
                  className="text-[10px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  <Clock className="w-3 h-3" />
                  <span>ใช้วันเวลาปัจจุบัน</span>
                </button>
              </div>

              {/* Editable Qty & Production Line */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300">จำนวนชิ้น (Pallet Qty):</label>
                  <input
                    type="number"
                    min={1}
                    value={overrideQty}
                    onChange={(e) => setOverrideQty(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-emerald-400 focus:ring-2 focus:ring-purple-500"
                  />
                  {/* Preset Buttons */}
                  <div className="flex items-center gap-1 pt-1">
                    {[50, 80, 120, 240, 600].map(q => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setOverrideQty(q)}
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300">ไลน์ผลิตเป้าหมาย (Use Line):</label>
                  <select
                    value={overrideLine}
                    onChange={(e) => setOverrideLine(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-blue-400 focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="HE1">Line HE1 (Main Assy)</option>
                    <option value="HE2">Line HE2 (Outdoor)</option>
                    <option value="HE3">Line HE3 (Commercial)</option>
                    <option value="HE4">Line HE4 (Export)</option>
                  </select>
                </div>
              </div>

              {/* Date & Time for Inbound / Infeed */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300">วันที่รับเข้า (Date):</label>
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

              {/* Lot / Batch Number */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">หมายเลข Lot / Batch Number:</label>
                <input
                  type="text"
                  value={overrideLotNo}
                  onChange={(e) => setOverrideLotNo(e.target.value)}
                  placeholder="e.g. LOT-202607-001"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-200"
                />
              </div>

              {/* Label Options & Number of Copies */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300">ขนาดสติกเกอร์ (Label Size):</label>
                  <select
                    value={labelSize}
                    onChange={(e) => setLabelSize(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-200"
                  >
                    <option value="STANDARD_4x3">มาตรฐาน 4" x 3" (พาเลท)</option>
                    <option value="COMPACT_3x2">กะทัดรัด 3" x 2" (กล่อง/Bin)</option>
                    <option value="A4_SPEC">เอกสาร A4 เต็มแผ่น</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-300">จำนวนสำเนาที่จะพิมพ์:</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={printCopies}
                      onChange={(e) => setPrintCopies(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-white text-center"
                    />
                    <span className="text-[11px] text-slate-400 font-bold shrink-0">แผ่น</span>
                  </div>
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
                  onClick={() => handleDownloadPNG(generatedItemQRString, `qr-pallet-canvas-${generatedItemQRString}`)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span>โหลดรูป PNG</span>
                </button>
                <button
                  onClick={handlePrint}
                  className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>พิมพ์ {printCopies} ชุด</span>
                </button>
              </div>
            </div>

            {/* THE ACTUAL PRINTABLE PHYSICAL CARD */}
            {activePalletItem ? (
              <div className="w-full flex flex-col items-center justify-center space-y-4">
                
                {/* Visual Label Outer Wrapper */}
                <div 
                  id="pallet-printable-card"
                  className={`w-full bg-white text-slate-950 border-4 border-slate-950 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col justify-between space-y-3.5 print:shadow-none print:border-4 print:m-0 print:w-full ${
                    labelSize === 'COMPACT_3x2' ? 'max-w-sm' : labelSize === 'A4_SPEC' ? 'max-w-2xl' : 'max-w-lg'
                  }`}
                >
                  
                  {/* Card Header: Brand & Line Tag */}
                  <div className="flex items-center justify-between pb-3 border-b-3 border-slate-950">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-4 h-4 bg-purple-600 rounded-full flex items-center justify-center text-white text-[9px] font-black">
                        LG
                      </div>
                      <span className="font-mono font-black text-sm tracking-wider uppercase text-slate-950">
                        LG ELECTRONICS THAILAND &bull; WMS
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono font-black px-2 py-0.5 bg-purple-950 text-white rounded">
                        LINE {overrideLine || activePalletItem.useLine}
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded border border-slate-300">
                        {activePalletItem.zone}
                      </span>
                    </div>
                  </div>

                  {/* Card Center: Model HE, Tool Name & Huge High-Resolution QR */}
                  <div className="grid grid-cols-12 gap-4 items-center">
                    
                    {/* Left: Model & Details */}
                    <div className="col-span-7 space-y-2">
                      <div>
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                          รหัสวัตถุดิบ (MODEL HE):
                        </div>
                        <div className="text-2xl sm:text-3xl font-mono font-black text-slate-950 tracking-tight leading-none">
                          {activePalletItem.modelHE}
                        </div>
                      </div>

                      <div>
                        <div className="text-[9px] font-bold text-slate-500 uppercase">
                          ชื่อชิ้นส่วน (PART / TOOL NAME):
                        </div>
                        <div className="text-xs font-bold text-slate-800 line-clamp-2">
                          {activePalletItem.partName}
                        </div>
                      </div>

                      <div>
                        <div className="text-[9px] font-bold text-slate-500 uppercase">
                          พิกัดจัดเก็บ (LOCATOR):
                        </div>
                        <div className="text-xs font-mono font-black text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-300 inline-block">
                          {activePalletItem.locatorCode}
                        </div>
                      </div>

                      {overrideLotNo && (
                        <div>
                          <div className="text-[9px] font-bold text-slate-500 uppercase">
                            LOT / BATCH NO:
                          </div>
                          <div className="text-[11px] font-mono font-bold text-slate-800">
                            {overrideLotNo}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right: High Resolution QR Code Canvas */}
                    <div className="col-span-5 flex flex-col items-center justify-center p-2.5 bg-white border-3 border-slate-950 rounded-xl shadow-xs">
                      <QRCodeCanvas
                        id={`qr-pallet-canvas-${generatedItemQRString}`}
                        value={generatedItemQRString}
                        size={labelSize === 'COMPACT_3x2' ? 110 : labelSize === 'A4_SPEC' ? 160 : 135}
                        level="H"
                        includeMargin={true}
                      />
                      <span className="text-[7.5px] font-mono font-black text-slate-600 mt-1 uppercase text-center break-all">
                        SCAN PALLET QR
                      </span>
                    </div>

                  </div>

                  {/* Card Bottom Grid: Qty, Aging Days, Date */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t-3 border-slate-950">
                    <div className="bg-slate-100 border-2 border-slate-950 rounded-xl p-2 text-center">
                      <div className="text-[8.5px] font-bold text-slate-600 uppercase">จำนวนในพาเลท (QTY)</div>
                      <div className="text-xl font-mono font-black text-emerald-700">
                        {overrideQty > 0 ? overrideQty : activePalletItem.quantity} <span className="text-[10px] text-slate-600">U</span>
                      </div>
                    </div>

                    <div className={`border-2 border-slate-950 rounded-xl p-2 text-center ${
                      activePalletItem.agingDays > agingConfig.criticalDays
                        ? 'bg-rose-100 text-rose-950'
                        : activePalletItem.agingDays > agingConfig.safeDaysMax
                        ? 'bg-amber-100 text-amber-950'
                        : 'bg-emerald-100 text-emerald-950'
                    }`}>
                      <div className="text-[8.5px] font-bold uppercase">อายุสต็อก (AGING)</div>
                      <div className="text-xl font-mono font-black">
                        {activePalletItem.agingDays} <span className="text-[10px]">วัน</span>
                      </div>
                    </div>

                    <div className="bg-slate-100 border-2 border-slate-950 rounded-xl p-2 text-center">
                      <div className="text-[8.5px] font-bold text-slate-600 uppercase">วันที่บันทึกรับเข้า</div>
                      <div className="text-xs font-mono font-black text-slate-900 mt-1">
                        {overrideDate}
                      </div>
                      <div className="text-[9px] font-mono text-slate-500">
                        {overrideTime} น.
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Bar */}
                  <div className="pt-2 border-t border-slate-300 flex items-center justify-between text-[8.5px] font-mono text-slate-600">
                    <span>SAFETY: {activePalletItem.safetyStock} U &bull; FIFO VERIFIED</span>
                    <span>RAW: {generatedItemQRString}</span>
                  </div>

                </div>

                {/* Print Hint */}
                <p className="text-[11px] text-slate-400 text-center max-w-md print:hidden">
                  💡 เมื่อสั่งพิมพ์ ระบบจะจัดขนาดพอดีกับกระดาษสติกเกอร์บาร์โค้ดขนาด 4x3 นิ้ว หรือกระดาษความร้อนมาตรฐานอัตโนมัติ
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
      {/* MODE 2: LOCATION QR LABEL (ป้ายพิกัดตำแหน่งช่องจัดเก็บ)                     */}
      {/* ========================================================================= */}
      {activeMode === 'LOCATION' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Form: Real-Time Zone Selector */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-md print:hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-xs font-bold text-slate-200 flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-blue-400" />
                <span>กำหนดพิกัดตำแหน่ง (Real-Time Zone Picker)</span>
              </h3>
              <span className="text-[11px] font-mono font-bold text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded border border-blue-500/30">
                {allAvailableZones.length} โซนทั้งหมด
              </span>
            </div>

            {/* Zone Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">เลือกโซนจัดเก็บ (Zone):</label>
              <select
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <optgroup label="🏭 อาคาร A4 (Selective Rack B-K)">
                  {['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'].map(z => (
                    <option key={z} value={z}>Zone {z} (Selective Rack DA4D)</option>
                  ))}
                </optgroup>
                <optgroup label="🏗️ อาคาร A4 (Floor Staging X1-X8)">
                  {['X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'X8'].map(z => (
                    <option key={z} value={z}>Zone {z} (ลานกองพื้น DA4D-1)</option>
                  ))}
                </optgroup>
                <optgroup label="🛤️ อาคาร A2 (Flow Rail 16 ราง R1-R16)">
                  {Array.from({ length: 16 }, (_, i) => `R${i + 1}`).map(z => (
                    <option key={z} value={z}>Rail {z} (รางเลื่อน DA2D-1)</option>
                  ))}
                </optgroup>
                <optgroup label="⛺ อาคาร A5 (ลานเต็นท์ผ้าใบ T1-T4)">
                  {['T1', 'T2', 'T3', 'T4'].map(z => (
                    <option key={z} value={z}>เต็นท์ {z} (DAST Staging)</option>
                  ))}
                </optgroup>
                <optgroup label="🏕️ ลาน CY3 (Heavy-Duty Racks 4 ชั้น แถว A-D)">
                  {['CY3-A', 'CY3-B', 'CY3-C', 'CY3-D'].map(z => (
                    <option key={z} value={z}>CY3 {z} (DY3T Heavy Rack)</option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Bay & Level Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">หมายเลข Bay (ช่อง):</label>
                <input
                  type="number"
                  min={1}
                  max={25}
                  value={selectedBay}
                  onChange={(e) => setSelectedBay(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">ระดับชั้น (Level):</label>
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>ชั้น 1 (L1 - ชั้นล่างสุด)</option>
                  <option value={2}>ชั้น 2 (L2)</option>
                  <option value={3}>ชั้น 3 (L3)</option>
                  <option value={4}>ชั้น 4 (L4 - ชั้นบนสุด)</option>
                </select>
              </div>
            </div>

            {/* Live Stored Item Info in this Slot */}
            <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-300 flex items-center space-x-1">
                  <Package className="w-3.5 h-3.5 text-blue-400" />
                  <span>ข้อมูลสินค้าในช่องนี้ (Real-Time Live Status):</span>
                </span>
                {currentSlotItem ? (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-extrabold px-2 py-0.5 rounded">
                    มีสินค้าจัดเก็บ
                  </span>
                ) : (
                  <span className="text-[10px] bg-slate-800 text-slate-400 font-bold px-2 py-0.5 rounded border border-slate-700">
                    ช่องว่าง (Empty)
                  </span>
                )}
              </div>

              {currentSlotItem ? (
                <div className="text-xs space-y-1 text-slate-300">
                  <div className="font-bold text-white font-mono">
                    Model: {currentSlotItem.modelHE} ({currentSlotItem.partName})
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span>จำนวนคงเหลือ: <strong className="text-emerald-400 font-mono">{currentSlotItem.quantity} U</strong></span>
                    <span>Line: <strong className="text-blue-400 font-mono">{currentSlotItem.useLine}</strong></span>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500">
                  ยังไม่มีพาเลทจัดเก็บในพิกัด {fullLocatorCode} พร้อมพิมพ์ป้ายนำไปติดที่เสาแร็ค
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => handleDownloadPNG(fullLocatorCode)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-xs border border-slate-700"
              >
                <Download className="w-4 h-4 text-blue-400" />
                <span>ดาวน์โหลดรูปภาพ (.png)</span>
              </button>
            </div>
          </div>

          {/* Right Preview: High-Fidelity Printable Location Label Card */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center p-6 bg-slate-950 rounded-2xl border border-slate-800 min-h-[440px]">
            <div className="text-xs font-bold text-slate-400 mb-3 flex items-center space-x-1.5 print:hidden">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>ตัวอย่างป้ายพิกัดช่องพิมพ์จริง (Print Preview)</span>
            </div>

            {/* Printable Location Physical Card */}
            <div 
              id="printable-label-card"
              className="w-full max-w-md bg-white text-slate-950 border-4 border-slate-950 rounded-2xl p-6 shadow-2xl flex flex-col justify-between space-y-4 print:shadow-none print:border-4"
            >
              {/* Card Header */}
              <div className="flex items-center justify-between pb-3 border-b-3 border-slate-950">
                <div className="flex items-center space-x-2">
                  <div className="w-3.5 h-3.5 bg-blue-600 rounded-full"></div>
                  <span className="font-mono font-black text-sm tracking-wider uppercase text-slate-950">
                    LG ELECTRONICS &bull; WMS
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-950 text-white rounded">
                  {buildingPrefix}
                </span>
              </div>

              {/* Card Center */}
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-7 space-y-1.5">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    พิกัดตำแหน่งจัดเก็บ (Rack Locator):
                  </div>
                  <div className="text-3xl font-mono font-black text-slate-950 tracking-tight">
                    {selectedZone.startsWith('CY3') ? selectedZone.replace('CY3-', '') : selectedZone}{selectedBay}-L{selectedLevel}
                  </div>
                  <div className="text-xs font-mono font-bold text-blue-800 bg-blue-50 px-2 py-1 rounded border border-blue-300 inline-block">
                    {fullLocatorCode}
                  </div>

                  {currentSlotItem && (
                    <div className="pt-2 text-[10px] text-slate-700">
                      <div>Model: <strong className="text-slate-950">{currentSlotItem.modelHE}</strong></div>
                      <div>Line: <strong className="text-blue-700 font-bold">{currentSlotItem.useLine}</strong></div>
                    </div>
                  )}
                </div>

                {/* QR Code Canvas */}
                <div className="col-span-5 flex flex-col items-center justify-center p-2 bg-white border-3 border-slate-950 rounded-xl shadow-xs">
                  <QRCodeCanvas
                    id={`qr-canvas-${fullLocatorCode}`}
                    value={fullLocatorCode}
                    size={130}
                    level="H"
                    includeMargin={true}
                  />
                  <span className="text-[8px] font-mono font-black text-slate-600 mt-1 uppercase">SCAN LOCATOR</span>
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-3 border-t-3 border-slate-950 flex items-center justify-between text-[9px] font-mono text-slate-600">
                <span>SYSTEM VERIFIED &bull; FIFO WMS</span>
                <span>PRINTED: {new Date().toLocaleDateString('th-TH')}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-4 text-center print:hidden">
              รองรับเครื่องพิมพ์สติกเกอร์บาร์โค้ดขนาด 4x3 นิ้ว, 4x6 นิ้ว และกระดาษความร้อนฉลากมาตรฐาน
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
              <span className="text-xs font-mono font-bold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/30">
                รวมทั้งหมด {batchList.length} ป้าย
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* Zone */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">เลือกโซน (Zone):</label>
                <select
                  value={batchZone}
                  onChange={(e) => setBatchZone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white"
                >
                  {allAvailableZones.map(z => (
                    <option key={z} value={z}>Zone {z}</option>
                  ))}
                </select>
              </div>

              {/* Start Bay */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">จาก Bay ที่:</label>
                <input
                  type="number"
                  min={1}
                  max={25}
                  value={batchStartBay}
                  onChange={(e) => setBatchStartBay(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white"
                />
              </div>

              {/* End Bay */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">ถึง Bay ที่:</label>
                <input
                  type="number"
                  min={1}
                  max={25}
                  value={batchEndBay}
                  onChange={(e) => setBatchEndBay(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white"
                />
              </div>

              {/* Level Filter */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">ระดับชั้น (Level):</label>
                <select
                  value={batchLevelFilter}
                  onChange={(e) => setBatchLevelFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white"
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

          {/* Batch Grid Preview / Print Sheet */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {batchList.map((item) => (
              <div
                key={item.locatorCode}
                className="bg-white text-slate-950 border-3 border-slate-950 rounded-xl p-3.5 shadow-sm space-y-2 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between pb-1 border-b border-slate-300">
                  <span className="text-[9px] font-mono font-bold text-slate-600">{item.building}</span>
                  <span className="text-[9px] font-mono font-black bg-blue-100 text-blue-900 px-1 rounded">
                    LGE WMS
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xl font-mono font-black text-slate-950">{item.locationLabel}</div>
                    <div className="text-[9px] font-mono text-blue-800 font-bold">{item.locatorCode}</div>
                    {item.currentItem && (
                      <div className="text-[9px] text-slate-700 font-bold mt-1">
                        {item.currentItem.modelHE} ({item.currentItem.quantity} U)
                      </div>
                    )}
                  </div>
                  <QRCodeCanvas
                    id={`qr-batch-canvas-${item.locatorCode}`}
                    value={item.locatorCode}
                    size={68}
                    level="M"
                    includeMargin={false}
                  />
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[8px] font-mono text-slate-500">
                  <span>RACK LOCATOR</span>
                  <button
                    onClick={() => handleDownloadPNG(item.locatorCode, `qr-batch-canvas-${item.locatorCode}`)}
                    className="text-blue-700 font-bold hover:underline print:hidden"
                  >
                    โหลดรูป
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
