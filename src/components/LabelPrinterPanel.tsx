import React, { useState, useMemo } from 'react';
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
  Package
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { InventoryItem, ZoneCapacityMaster, WarehouseFacility, CustomRackSlot, MasterDataItem, AgingThresholdConfig, StorageZone } from '../types';

interface LabelPrinterPanelProps {
  items?: InventoryItem[];
  zoneCapacities?: ZoneCapacityMaster[];
  facilities?: WarehouseFacility[];
  customSlots?: CustomRackSlot[];
  masterData?: MasterDataItem[];
  agingConfig?: AgingThresholdConfig;
}

export const LabelPrinterPanel: React.FC<LabelPrinterPanelProps> = ({
  items = [],
  zoneCapacities = [],
  facilities = [],
  customSlots = [],
  masterData = [],
  agingConfig = { safeDaysMax: 14, warningDaysMax: 30, criticalDays: 30, autoAlertEnabled: true }
}) => {
  const [activeMode, setActiveMode] = useState<'LOCATION' | 'PALLET_ITEM' | 'BATCH'>('LOCATION');

  // Real-Time Sync Animation & Timestamp State
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => new Date().toLocaleTimeString('th-TH'));
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleSyncAllZones = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setLastSyncTime(new Date().toLocaleTimeString('th-TH'));
      setIsRefreshing(false);
    }, 500);
  };

  // 1. Location Mode States
  const [selectedFacility, setSelectedFacility] = useState<string>('FAC-A4');
  const [selectedZone, setSelectedZone] = useState<string>('B');
  const [selectedBay, setSelectedBay] = useState<number>(1);
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [copies, setCopies] = useState<number>(1);
  const [labelSize, setLabelSize] = useState<'STANDARD_4x3' | 'COMPACT_3x2' | 'LARGE_A4'>('STANDARD_4x3');
  const [isPrinting, setIsPrinting] = useState(false);

  // 2. Material / Pallet Mode States
  const [materialSearch, setMaterialSearch] = useState<string>('');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [customQty, setCustomQty] = useState<number>(80);

  // 3. Batch Mode States
  const [batchZone, setBatchZone] = useState<string>('B');
  const [batchStartBay, setBatchStartBay] = useState<number>(1);
  const [batchEndBay, setBatchEndBay] = useState<number>(12);
  const [batchLevelFilter, setBatchLevelFilter] = useState<number | 'ALL'>('ALL');

  // Dynamic Zone List aggregation from standard zones + customSlots + facilities + flow rails
  const allAvailableZones = useMemo(() => {
    const zoneSet = new Set<string>();
    
    // Standard A4 Rack Zones
    ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'].forEach(z => zoneSet.add(z));

    // Floor Staging Zones
    ['X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'X8'].forEach(z => zoneSet.add(z));

    // A2 Flow Rail Lanes
    Array.from({ length: 20 }, (_, i) => `R${i + 1}`).forEach(z => zoneSet.add(z));

    // A5 Tent Zones
    ['T1', 'T2', 'T3', 'T4'].forEach(z => zoneSet.add(z));

    // Add any zones defined in customSlots
    customSlots.forEach(slot => {
      if (slot.zone) zoneSet.add(slot.zone);
    });

    // Add any zones defined in zoneCapacities
    zoneCapacities.forEach(zc => {
      if (zc.zone) zoneSet.add(zc.zone);
    });

    return Array.from(zoneSet);
  }, [customSlots, zoneCapacities]);

  // Determine prefix for Building code
  const getBuildingPrefix = (z: string) => {
    if (z.startsWith('R') || z.startsWith('FR')) return 'DA2D-1.01';
    if (z.startsWith('T')) return 'DA5T-1.01';
    if (['B', 'C', 'D'].includes(z)) return 'DA4D-1.02';
    if (['E', 'F'].includes(z)) return 'DA4D-1.05';
    if (['G', 'H', 'I', 'J', 'K'].includes(z)) return 'DA4D-1.06';
    if (z.startsWith('X')) return 'DA4D-1.01';
    return 'DA4D-CUSTOM';
  };

  const buildingPrefix = getBuildingPrefix(selectedZone);
  const fullLocatorCode = `${buildingPrefix}-${selectedZone}${selectedBay}-L${selectedLevel}`;

  // Find live item currently located at this locator code (Real-Time Lookup)
  const currentSlotItem = useMemo(() => {
    return items.find(
      it => 
        (it.zone === selectedZone && it.bayNumber === selectedBay && it.level === selectedLevel) ||
        it.locatorCode === fullLocatorCode
    );
  }, [items, selectedZone, selectedBay, selectedLevel, fullLocatorCode]);

  // Selected item for Material / Pallet Mode
  const activePalletItem = useMemo(() => {
    if (selectedItemId) {
      return items.find(i => i.id === selectedItemId) || items[0];
    }
    return items[0] || null;
  }, [items, selectedItemId]);

  // Download Single QR Code as PNG
  const handleDownloadPNG = (code: string, customCanvasId?: string) => {
    const canvasId = customCanvasId || `qr-canvas-${code}`;
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      alert('ไม่พบ Canvas รูปภาพ QR Code');
      return;
    }
    const link = document.createElement('a');
    link.download = `QR_Label_${code}.png`;
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

  // Generate Batch QR list
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
        const locCode = `${bPrefix}-${batchZone}${b}-L${l}`;
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

  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn w-full min-w-0 max-w-full">
      
      {/* Top Banner & Control Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm print:hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between pb-4 border-b border-slate-100 gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-100 text-blue-700 rounded-2xl">
              <Printer className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  ระบบพิมพ์ฉลาก QR Code & สติกเกอร์พิกัด (Live Label Printing Hub)
                </h2>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Real-Time All Zones</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                รองรับการพิมพ์ฉลากตำแหน่งจากทุกโซน (A2 Flow Rail, A4 แร็ค/พื้น, A5 ลานเต็นท์ และโซนที่สร้างใหม่) พร้อมระบุสถานะ Aging FIFO
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSyncAllZones}
              disabled={isRefreshing}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 shadow-2xs flex items-center space-x-1.5 transition-all active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>ซิงค์ข้อมูล Real-Time ({lastSyncTime})</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center space-x-1.5 transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์ฉลากทางเครื่องพิมพ์</span>
            </button>
          </div>
        </div>

        {/* Mode Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-4">
          <button
            onClick={() => setActiveMode('LOCATION')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeMode === 'LOCATION'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Grid className="w-4 h-4" />
            <span>1. ป้ายพิกัดช่องจัดเก็บ (Location QR)</span>
          </button>

          <button
            onClick={() => setActiveMode('PALLET_ITEM')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeMode === 'PALLET_ITEM'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>2. ป้ายสินค้า & พาเลท (Pallet Item & Aging Badge)</span>
          </button>

          <button
            onClick={() => setActiveMode('BATCH')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeMode === 'BATCH'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>3. พิมพ์ชุดใหญ่ต่อเนื่อง (Batch QR Sheet)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: LOCATION QR LABEL (ป้ายพิกัดตำแหน่ง)                               */}
      {/* ========================================================================= */}
      {activeMode === 'LOCATION' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Form: Real-Time Zone Selector */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm print:hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-blue-600" />
                <span>กำหนดพิกัดตำแหน่ง (Real-Time Zone Picker)</span>
              </h3>
              <span className="text-[11px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {allAvailableZones.length} โซนทั้งหมด
              </span>
            </div>

            {/* Zone Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">เลือกโซนจัดเก็บ (Zone):</label>
              <select
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <optgroup label="🏭 อาคาร A4 (Selective Rack)">
                  {['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'].map(z => (
                    <option key={z} value={z}>Zone {z} (Selective Rack DA4D)</option>
                  ))}
                </optgroup>
                <optgroup label="🏗️ อาคาร A4 (Floor Staging)">
                  {['X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'X8'].map(z => (
                    <option key={z} value={z}>Zone {z} (ลานกองพื้น DA4D-1)</option>
                  ))}
                </optgroup>
                <optgroup label="🛤️ อาคาร A2 (Flow Rail รางเลื่อน)">
                  {Array.from({ length: 20 }, (_, i) => `R${i + 1}`).map(z => (
                    <option key={z} value={z}>Zone {z} (รางเลื่อน DA2D-1)</option>
                  ))}
                </optgroup>
                <optgroup label="⛺ อาคาร A5 (ลานเต็นท์ภายนอก)">
                  {['T1', 'T2', 'T3', 'T4'].map(z => (
                    <option key={z} value={z}>เต็นท์ {z} (DA5T Staging)</option>
                  ))}
                </optgroup>
                {customSlots.filter(s => !['B','C','D','E','F','G','H','I','J','K','X1','X2','X3','X4','X5','X6','X7','X8'].includes(s.zone)).length > 0 && (
                  <optgroup label="✨ โซนใหม่ที่กำหนดเอง (Custom Added Zones)">
                    {customSlots.map(s => (
                      <option key={s.id} value={s.zone}>Zone {s.zone} - {s.description}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            {/* Bay & Level Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">หมายเลข Bay (ช่อง):</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={selectedBay}
                  onChange={(e) => setSelectedBay(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">ระดับชั้น (Level):</label>
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>ชั้น 1 (L1 - ชั้นล่างสุด)</option>
                  <option value={2}>ชั้น 2 (L2)</option>
                  <option value={3}>ชั้น 3 (L3)</option>
                  <option value={4}>ชั้น 4 (L4 - ชั้นบนสุด)</option>
                </select>
              </div>
            </div>

            {/* Live Stored Item Info in this Slot */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-700 flex items-center space-x-1">
                  <Package className="w-3.5 h-3.5 text-blue-600" />
                  <span>ข้อมูลสินค้าในช่องนี้ (Real-Time Live Status):</span>
                </span>
                {currentSlotItem ? (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded">
                    มีสินค้าจัดเก็บ
                  </span>
                ) : (
                  <span className="text-[10px] bg-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded">
                    ช่องว่าง (Empty)
                  </span>
                )}
              </div>

              {currentSlotItem ? (
                <div className="text-xs space-y-1 text-slate-600">
                  <div className="font-bold text-slate-900 font-mono">
                    Model: {currentSlotItem.modelHE} ({currentSlotItem.partName})
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span>จำนวนคงเหลือ: <strong className="text-emerald-600 font-mono">{currentSlotItem.quantity} U</strong></span>
                    <span>Line: <strong className="text-blue-700 font-mono">{currentSlotItem.useLine}</strong></span>
                  </div>
                  <div className="flex items-center space-x-2 pt-1">
                    <span className="text-[10px] text-slate-500">อายุจัดเก็บ:</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                      currentSlotItem.agingDays > agingConfig.criticalDays
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : currentSlotItem.agingDays > agingConfig.safeDaysMax
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {currentSlotItem.agingDays} วัน ({currentSlotItem.agingDays > agingConfig.criticalDays ? 'Overdue' : 'ปกติ'})
                    </span>
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
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>ดาวน์โหลดรูปภาพ (.png)</span>
              </button>
            </div>
          </div>

          {/* Right Preview: High-Fidelity Printable Label Card */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center p-6 bg-slate-100 rounded-2xl border border-slate-200 min-h-[440px]">
            <div className="text-xs font-bold text-slate-500 mb-3 flex items-center space-x-1.5 print:hidden">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>ตัวอย่างป้ายฉลากพิมพ์จริง (Print Preview)</span>
            </div>

            {/* The Actual Printable Physical Card */}
            <div 
              id="printable-label-card"
              className="w-full max-w-md bg-white border-2 border-slate-900 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4 print:shadow-none print:border-2"
            >
              {/* Card Header */}
              <div className="flex items-center justify-between pb-3 border-b-2 border-slate-900">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                  <span className="font-mono font-black text-sm tracking-wider text-slate-900 uppercase">
                    LG Electronics WMS
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-900 text-white rounded">
                  {buildingPrefix}
                </span>
              </div>

              {/* Card Center: Huge Visual Locator Name & QR Code */}
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-7 space-y-1">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    พิกัดตำแหน่งจัดเก็บ (Rack Locator):
                  </div>
                  <div className="text-3xl font-mono font-black text-slate-900 tracking-tight">
                    {selectedZone}{selectedBay}-L{selectedLevel}
                  </div>
                  <div className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200 inline-block">
                    {fullLocatorCode}
                  </div>

                  {currentSlotItem && (
                    <div className="pt-2 text-[10px] text-slate-600">
                      <div>Model: <strong className="text-slate-900">{currentSlotItem.modelHE}</strong></div>
                      <div>Line: <strong className="text-blue-600 font-bold">{currentSlotItem.useLine}</strong></div>
                    </div>
                  )}
                </div>

                {/* QR Code Canvas */}
                <div className="col-span-5 flex flex-col items-center justify-center p-2 bg-white border-2 border-slate-900 rounded-xl shadow-xs">
                  <QRCodeCanvas
                    id={`qr-canvas-${fullLocatorCode}`}
                    value={fullLocatorCode}
                    size={130}
                    level="H"
                    includeMargin={true}
                  />
                  <span className="text-[8px] font-mono font-bold text-slate-500 mt-1">SCAN LOCATOR</span>
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-3 border-t-2 border-slate-900 flex items-center justify-between text-[9px] font-mono text-slate-500">
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
      {/* MODE 2: MATERIAL / PALLET ITEM QR LABEL WITH AGING STATUS                  */}
      {/* ========================================================================= */}
      {activeMode === 'PALLET_ITEM' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left: Search & Select from Real-Time Items */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm print:hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                <Search className="w-4 h-4 text-purple-600" />
                <span>เลือกวัตถุดิบ / พาเลทจากทุกโซน (Live Search)</span>
              </h3>
              <span className="text-[11px] font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                {items.length} รายการ
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={materialSearch}
                onChange={(e) => setMaterialSearch(e.target.value)}
                placeholder="ค้นหา Model HE, Tool Name, Locator Code..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            {/* Live Inventory List with Aging Badges */}
            <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
              {items
                .filter(it => 
                  !materialSearch ||
                  it.modelHE.toLowerCase().includes(materialSearch.toLowerCase()) ||
                  it.partName.toLowerCase().includes(materialSearch.toLowerCase()) ||
                  it.locatorCode.toLowerCase().includes(materialSearch.toLowerCase())
                )
                .slice(0, 30)
                .map((item) => {
                  const isSelected = activePalletItem?.id === item.id;
                  const isOverdue = item.agingDays > agingConfig.criticalDays;
                  const isWarning = item.agingDays > agingConfig.safeDaysMax && item.agingDays <= agingConfig.criticalDays;

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedItemId(item.id);
                        setCustomQty(item.quantity);
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected 
                          ? 'border-purple-600 bg-purple-50 shadow-sm font-bold' 
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-mono font-bold text-slate-900">{item.modelHE}</div>
                        <div className="text-[11px] text-slate-600">{item.partName}</div>
                        <div className="text-[10px] text-blue-700 font-mono mt-0.5">{item.locatorCode}</div>
                      </div>

                      <div className="text-right space-y-1">
                        <div className="text-xs font-mono font-black text-emerald-600">{item.quantity} U</div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                          isOverdue 
                            ? 'bg-rose-50 text-rose-700 border-rose-200' 
                            : isWarning 
                            ? 'bg-amber-50 text-amber-800 border-amber-200' 
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          Aging {item.agingDays} วัน
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Right: Material Pallet Printable Card */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center p-6 bg-slate-100 rounded-2xl border border-slate-200 min-h-[440px]">
            {activePalletItem ? (
              <div 
                id="pallet-printable-card"
                className="w-full max-w-md bg-white border-2 border-slate-900 rounded-2xl p-6 shadow-xl space-y-4 print:shadow-none print:border-2"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b-2 border-slate-900">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
                    <span className="font-mono font-black text-sm text-slate-900 uppercase">
                      PALLET IDENTIFIER &bull; HE PRODUCTION
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-purple-100 text-purple-900 rounded border border-purple-300">
                    Line {activePalletItem.useLine}
                  </span>
                </div>

                {/* Model HE and Tool Part Name */}
                <div className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-7 space-y-2">
                    <div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase">รหัสวัตถุดิบ (Model HE):</div>
                      <div className="text-2xl font-mono font-black text-slate-900">{activePalletItem.modelHE}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-500">ชื่อ Tool:</div>
                      <div className="text-xs font-bold text-slate-800">{activePalletItem.partName}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-500">พิกัดจัดเก็บ:</div>
                      <div className="text-xs font-mono font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block">
                        {activePalletItem.locatorCode}
                      </div>
                    </div>
                  </div>

                  {/* QR Code */}
                  <div className="col-span-5 flex flex-col items-center justify-center p-2 bg-white border-2 border-slate-900 rounded-xl shadow-xs">
                    <QRCodeCanvas
                      id={`qr-pallet-canvas-${activePalletItem.qrCode}`}
                      value={activePalletItem.qrCode}
                      size={120}
                      level="H"
                      includeMargin={true}
                    />
                    <span className="text-[8px] font-mono font-bold text-slate-500 mt-1">{activePalletItem.qrCode}</span>
                  </div>
                </div>

                {/* Aging & Quantity Strip */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t-2 border-slate-900">
                  <div className="bg-slate-50 border border-slate-300 rounded-xl p-2 text-center">
                    <div className="text-[9px] font-bold text-slate-500">จำนวนพาเลท (Qty)</div>
                    <div className="text-lg font-mono font-black text-emerald-600">{customQty} Units</div>
                  </div>
                  <div className={`border rounded-xl p-2 text-center ${
                    activePalletItem.agingDays > agingConfig.criticalDays
                      ? 'bg-rose-50 border-rose-300 text-rose-700'
                      : activePalletItem.agingDays > agingConfig.safeDaysMax
                      ? 'bg-amber-50 border-amber-300 text-amber-800'
                      : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  }`}>
                    <div className="text-[9px] font-bold">สถานะ Aging FIFO</div>
                    <div className="text-sm font-black mt-0.5">
                      {activePalletItem.agingDays} วัน ({activePalletItem.agingDays > agingConfig.criticalDays ? 'Overdue' : 'ปกติ'})
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[9px] font-mono text-slate-500">
                  <span>SAFETY STOCK: {activePalletItem.safetyStock} U</span>
                  <span>PRINTED: {new Date().toLocaleDateString('th-TH')}</span>
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-400 text-xs">
                กรุณาเลือกรายการสินค้าจากรายการด้านซ้าย
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 3: BATCH QR SHEET (พิมพ์ชุดใหญ่ต่อเนื่อง)                              */}
      {/* ========================================================================= */}
      {activeMode === 'BATCH' && (
        <div className="space-y-4">
          {/* Batch Configuration Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 print:hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>กำหนดช่วงการสร้างป้ายพิมพ์ต่อเนื่อง (Batch Print Config)</span>
              </h3>
              <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                รวมทั้งหมด {batchList.length} ป้าย
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* Zone */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">เลือกโซน (Zone):</label>
                <select
                  value={batchZone}
                  onChange={(e) => setBatchZone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                >
                  {allAvailableZones.map(z => (
                    <option key={z} value={z}>Zone {z}</option>
                  ))}
                </select>
              </div>

              {/* Start Bay */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">จาก Bay ที่:</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={batchStartBay}
                  onChange={(e) => setBatchStartBay(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
                />
              </div>

              {/* End Bay */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">ถึง Bay ที่:</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={batchEndBay}
                  onChange={(e) => setBatchEndBay(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
                />
              </div>

              {/* Level Filter */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">ระดับชั้น (Level):</label>
                <select
                  value={batchLevelFilter}
                  onChange={(e) => setBatchLevelFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
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
                className="bg-white border-2 border-slate-900 rounded-xl p-3.5 shadow-sm space-y-2 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                  <span className="text-[9px] font-mono font-bold text-slate-500">{item.building}</span>
                  <span className="text-[9px] font-mono font-black bg-blue-100 text-blue-800 px-1 rounded">
                    LGE WMS
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xl font-mono font-black text-slate-900">{item.locationLabel}</div>
                    <div className="text-[9px] font-mono text-blue-700">{item.locatorCode}</div>
                    {item.currentItem && (
                      <div className="text-[9px] text-slate-600 font-bold mt-1">
                        {item.currentItem.modelHE} ({item.currentItem.quantity} U)
                      </div>
                    )}
                  </div>
                  <QRCodeCanvas
                    id={`qr-batch-canvas-${item.locatorCode}`}
                    value={item.locatorCode}
                    size={65}
                    level="M"
                    includeMargin={false}
                  />
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[8px] font-mono text-slate-400">
                  <span>RACK LOCATOR</span>
                  <button
                    onClick={() => handleDownloadPNG(item.locatorCode, `qr-batch-canvas-${item.locatorCode}`)}
                    className="text-blue-600 font-bold hover:underline print:hidden"
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
