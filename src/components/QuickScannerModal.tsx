import React, { useState, useEffect } from 'react';
import { InventoryItem, MasterDataItem, MovementType, ShelfLevel, StorageZone, UseLineMaster } from '../types';
import { 
  X, 
  QrCode, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowDownRight, 
  ArrowUpRight, 
  Camera, 
  Sparkles,
  Search,
  Zap,
  Repeat,
  Box,
  Package
} from 'lucide-react';
import { QRScanner } from './QRScanner';

interface QuickScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveMovement: (data: {
    type: MovementType;
    scanInput: string;
    modelHE: string;
    zone: StorageZone;
    bayNumber: number;
    level: ShelfLevel;
    quantityCheck: number;
    actualQty: number;
    useLine: string;
    remark: string;
    stdQtyPerPallet?: number;
    fullPallets?: number;
    looseQty?: number;
  }) => void;
  initialZone?: StorageZone;
  initialBayNumber?: number;
  initialLevel?: ShelfLevel;
  initialMode?: MovementType;
  existingItems: InventoryItem[];
  useLines?: UseLineMaster[];
  masterData?: MasterDataItem[];
}

export const QuickScannerModal: React.FC<QuickScannerModalProps> = ({
  isOpen,
  onClose,
  onSaveMovement,
  initialZone = 'E',
  initialBayNumber = 6,
  initialLevel = 1,
  initialMode = 'IN',
  existingItems,
  useLines = [
    { id: 'HE1', name: 'Line HE1' },
    { id: 'HE2', name: 'Line HE2' },
    { id: 'HE3', name: 'Line HE3' },
    { id: 'REPAIR', name: 'Line Repair' },
  ],
  masterData = [],
}) => {
  const [type, setType] = useState<MovementType>(initialMode);
  const [scanInput, setScanInput] = useState<string>('');
  const [modelHE, setModelHE] = useState<string>('ADL74920904');
  const [zone, setZone] = useState<StorageZone>(initialZone);
  const [bayNumber, setBayNumber] = useState<number>(initialBayNumber);
  const [level, setLevel] = useState<ShelfLevel>(initialLevel);
  const [labelQty, setLabelQty] = useState<number>(600);
  const [actualQty, setActualQty] = useState<number>(600);
  const [useLine, setUseLine] = useState<string>('HE2');
  const [remark, setRemark] = useState<string>('');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [batchMode, setBatchMode] = useState<boolean>(false);
  const [itemFilterQuery, setItemFilterQuery] = useState<string>('');
  const [showItemSearchDrawer, setShowItemSearchDrawer] = useState<boolean>(false);

  // Filter existing items for quick lookup selection
  const filteredExistingItems = existingItems.filter((item) => {
    if (!itemFilterQuery.trim()) return true;
    const q = itemFilterQuery.toLowerCase().trim();
    return (
      item.modelHE.toLowerCase().includes(q) ||
      item.partName.toLowerCase().includes(q) ||
      item.locatorCode.toLowerCase().includes(q) ||
      item.useLine.toLowerCase().includes(q) ||
      `zone ${item.zone}`.toLowerCase().includes(q)
    );
  });

  const [calcMode, setCalcMode] = useState<'PALLET' | 'DIRECT'>('PALLET');
  const [stdQtyPerPalletInput, setStdQtyPerPalletInput] = useState<number>(80);
  const [fullPalletsInput, setFullPalletsInput] = useState<number>(1);
  const [looseQtyInput, setLooseQtyInput] = useState<number>(0);

  const updateQuantitiesFromPallets = (std: number, full: number, loose: number) => {
    const total = (full * std) + loose;
    setLabelQty(total);
    setActualQty(total);
  };

  const handleSelectFilteredItem = (item: InventoryItem) => {
    setModelHE(item.modelHE);
    setZone(item.zone);
    setBayNumber(item.bayNumber);
    setLevel(item.level);
    
    const std = item.stdQtyPerPallet || 80;
    setStdQtyPerPalletInput(std);
    if (item.fullPallets !== undefined && item.looseQty !== undefined) {
      setFullPalletsInput(item.fullPallets);
      setLooseQtyInput(item.looseQty);
    } else {
      setFullPalletsInput(Math.floor(item.quantity / std));
      setLooseQtyInput(item.quantity % std);
    }

    setLabelQty(item.quantity);
    setActualQty(item.quantity);
    setUseLine(item.useLine);
    setScanInput(item.qrCode || `${item.modelHE}_2026-07-01_${item.useLine}_${item.quantity}`);
    setShowItemSearchDrawer(false);
  };

  // Sync initial props when modal opens
  useEffect(() => {
    if (isOpen) {
      setZone(initialZone);
      setBayNumber(initialBayNumber);
      setLevel(initialLevel);
      setType(initialMode);
      setSuccessMessage(null);

      // Pre-fill existing item if present at level
      const found = existingItems.find(
        (it) => it.zone === initialZone && it.bayNumber === initialBayNumber && it.level === initialLevel
      );

      if (found) {
        setModelHE(found.modelHE);
        setLabelQty(found.quantity);
        setActualQty(found.quantity);
        setUseLine(found.useLine);
        setScanInput(found.qrCode || `${found.modelHE}_2026-07-01_HE1_${found.quantity}`);
      } else {
        setScanInput('ADL74920904_2026-06-25_09:27_HE2_600');
      }
    }
  }, [isOpen, initialZone, initialBayNumber, initialLevel, initialMode, existingItems]);

  if (!isOpen) return null;

  // Auto Parse QR Code string when changed
  const handleScanInputChange = (raw: string) => {
    setScanInput(raw);
    if (!raw.trim()) return;

    // Pattern format example: "ADL74920904_2026-06-25_09:27_HE2_600"
    const parts = raw.split('_');
    if (parts.length >= 1 && parts[0].length >= 5) {
      setModelHE(parts[0]);
    }
    if (parts.length >= 4 && parts[3].startsWith('HE')) {
      setUseLine(parts[3]);
    }
    const lastPart = parts[parts.length - 1];
    if (lastPart && !isNaN(Number(lastPart))) {
      const parsedQty = Number(lastPart);
      setLabelQty(parsedQty);
      setActualQty(parsedQty);
    }
  };

  const handleQRScan = (decodedText: string) => {
    handleScanInputChange(decodedText);
    setCameraActive(false);
  };

  // Preset QR Strings for quick one-click testing
  const presets = [
    { label: 'ADL74920904 (600 U)', qr: 'ADL74920904_2026-06-25_09:27_HE2_600' },
    { label: 'ACG76284709 (480 U)', qr: 'ACG76284709_2026-06-24_09:10_HE3_480' },
    { label: 'ACG74184707 (420 U)', qr: 'ACG74184707_2026-07-07_08:37_HE1_420' },
    { label: 'ADL74761254 (80 U)', qr: 'ADL74761254_2026-07-14_18:29_HE1_80' }
  ];

  const qtyGap = actualQty - labelQty;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSaveMovement({
      type,
      scanInput,
      modelHE,
      zone,
      bayNumber,
      level,
      quantityCheck: labelQty,
      actualQty,
      useLine,
      remark,
      stdQtyPerPallet: stdQtyPerPalletInput,
      fullPallets: calcMode === 'PALLET' ? fullPalletsInput : Math.floor(actualQty / stdQtyPerPalletInput),
      looseQty: calcMode === 'PALLET' ? looseQtyInput : (actualQty % stdQtyPerPalletInput)
    });

    setSuccessMessage(`บันทึกสแกน ${type === 'IN' ? 'รับเข้า' : 'เบิกออก'} ${modelHE} ตำแหน่ง ${zone}${bayNumber}-L${level} เรียบร้อย!`);
    
    if (batchMode) {
      setScanInput('');
      setRemark('');
      setTimeout(() => {
        setSuccessMessage(null);
      }, 2000);
    } else {
      setTimeout(() => {
        onClose();
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 text-slate-900 shadow-xl relative overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl ${type === 'IN' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg tracking-tight text-slate-900">
                สแกน QR Code บันทึกคลังสินค้า
              </h3>
              <p className="text-xs text-slate-500">
                รองรับ Hardware Barcode Scanner / กล้อง / พิมพ์ข้อความ QR
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert Banner */}
        {successMessage && (
          <div className="my-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center space-x-2 animate-bounce">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Mode Selector (IN / OUT) */}
          <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setType('IN')}
              className={`py-2.5 rounded-lg font-bold text-xs flex items-center justify-center space-x-2 transition-all ${
                type === 'IN'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownRight className="w-4 h-4" />
              <span>รับเข้า = IN</span>
            </button>

            <button
              type="button"
              onClick={() => setType('OUT')}
              className={`py-2.5 rounded-lg font-bold text-xs flex items-center justify-center space-x-2 transition-all ${
                type === 'OUT'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>เบิกออก = OUT</span>
            </button>
          </div>

          {/* Quick Preset Chips & Item Search Tool */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>เลือกตัวอย่าง QR Tag หรือ ค้นหารายการด่วน:</span>
              <button
                type="button"
                onClick={() => setShowItemSearchDrawer(!showItemSearchDrawer)}
                className="text-blue-600 hover:text-blue-800 font-bold flex items-center space-x-1"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{showItemSearchDrawer ? 'ซ่อนตัวกรอง' : 'ค้นหารายการในคลัง (Filter)'}</span>
              </button>
            </div>

            {/* Quick Item Filter Search Drawer */}
            {showItemSearchDrawer && (
              <div className="bg-slate-50 border border-blue-200 rounded-xl p-3 space-y-2 shadow-inner">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    value={itemFilterQuery}
                    onChange={(e) => setItemFilterQuery(e.target.value)}
                    placeholder="พิมพ์รหัส Model, Zone, Line หรือชื่อสินค้า..."
                    className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1 text-xs pr-1">
                  {filteredExistingItems.length > 0 ? (
                    filteredExistingItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectFilteredItem(item)}
                        className="w-full text-left p-2 rounded bg-white hover:bg-blue-50 border border-slate-200 transition-all flex items-center justify-between group"
                      >
                        <div>
                          <div className="font-mono font-bold text-blue-600 group-hover:text-blue-700">
                            {item.modelHE}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {item.partName} | Line {item.useLine}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-1 justify-end mb-0.5">
                            <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-900 font-extrabold text-[10px]">
                              Rack {item.zone}{item.bayNumber}
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-extrabold text-[10px]">
                              ชั้น {item.level}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500">
                            คงเหลือ {item.quantity.toLocaleString()} ชิ้น
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-3 text-slate-400 text-xs">
                      ไม่พบรายการที่ค้นหา
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-1.5">
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleScanInputChange(p.qr)}
                  className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] rounded-md font-mono border border-slate-200 transition-all active:scale-95"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* QR Scan Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ข้อความสแกน QR / Barcode (Scan Input):
            </label>
            <div className="relative">
              <input
                type="text"
                value={scanInput}
                onChange={(e) => handleScanInputChange(e.target.value)}
                placeholder="ยิงบาร์โค้ด หรือพิมพ์ข้อความ QR..."
                className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-blue-700 font-mono font-bold focus:outline-none focus:bg-white"
                required
              />
              <button
                type="button"
                onClick={() => setCameraActive(!cameraActive)}
                className="absolute right-2 top-2 p-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-semibold flex items-center space-x-1 shadow-sm"
              >
                <Camera className="w-3.5 h-3.5 text-blue-600" />
                <span>{cameraActive ? 'ปิดกล้อง' : 'กล้อง'}</span>
              </button>
            </div>
          </div>

          {/* Camera View Finder */}
          {cameraActive && (
            <QRScanner onScan={handleQRScan} onClose={() => setCameraActive(false)} />
          )}

          {/* Locator Details Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Zone:</label>
              <select
                value={zone}
                onChange={(e) => setZone(e.target.value as StorageZone)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-2.5 py-2 text-xs font-bold focus:outline-none focus:border-blue-500 focus:bg-white"
              >
                {(['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'] as StorageZone[]).map((z) => (
                  <option key={z} value={z}>Zone {z}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Rack (Bay):</label>
              <select
                value={bayNumber}
                onChange={(e) => setBayNumber(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-2.5 py-2 text-xs font-bold focus:outline-none focus:border-blue-500 focus:bg-white"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((b) => (
                  <option key={b} value={b}>Bay {b}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-amber-700 dark:text-amber-400 mb-1">
                ชั้น (Level 1-4):
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(Number(e.target.value) as ShelfLevel)}
                className="w-full bg-blue-50 border border-blue-200 text-blue-800 rounded-lg px-2.5 py-2 text-xs font-bold focus:outline-none"
              >
                <option value={1}>ชั้น 1 (L1 Ground)</option>
                <option value={2}>ชั้น 2 (L2 Heavy)</option>
                <option value={3}>ชั้น 3 (L3 Standard)</option>
                <option value={4}>ชั้น 4 (L4 Top)</option>
              </select>
            </div>
          </div>

          {/* Model & Line Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                รหัสสินค้า (Model HE):
              </label>
              <input
                type="text"
                value={modelHE}
                onChange={(e) => setModelHE(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-xs font-mono font-bold focus:outline-none focus:border-blue-500 focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                นำไปใช้ไลน์ (Use Line):
              </label>
              <select
                value={useLine}
                onChange={(e) => setUseLine(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:border-blue-500 focus:bg-white"
              >
                {useLines.map((line) => (
                  <option key={line.id} value={line.id}>
                    {line.name || line.id}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pallet Breakdown & Capacity Calculator Box */}
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-blue-900">
                <Box className="w-4 h-4 text-blue-600" />
                <span>คำนวณตามพาเลท (Pallet Breakdown Calculator)</span>
              </div>
              <div className="flex bg-white p-0.5 rounded-lg border border-blue-200 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setCalcMode('PALLET')}
                  className={`px-2.5 py-0.5 rounded transition-all ${
                    calcMode === 'PALLET' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ตามพาเลท
                </button>
                <button
                  type="button"
                  onClick={() => setCalcMode('DIRECT')}
                  className={`px-2.5 py-0.5 rounded transition-all ${
                    calcMode === 'DIRECT' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ป้อนจำนวนรวม
                </button>
              </div>
            </div>

            {calcMode === 'PALLET' ? (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      มาตรฐาน / พาเลทเต็ม:
                    </label>
                    <div className="flex items-center">
                      <input
                        type="number"
                        min="1"
                        value={stdQtyPerPalletInput}
                        onChange={(e) => {
                          const val = Math.max(1, Number(e.target.value));
                          setStdQtyPerPalletInput(val);
                          updateQuantitiesFromPallets(val, fullPalletsInput, looseQtyInput);
                        }}
                        className="w-full bg-white border border-blue-300 rounded-lg px-2 py-1 text-xs font-mono font-bold text-blue-800 text-center focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-500 ml-1">ตัว</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      จำนวนพาเลทเต็ม:
                    </label>
                    <div className="flex items-center">
                      <input
                        type="number"
                        min="0"
                        value={fullPalletsInput}
                        onChange={(e) => {
                          const val = Math.max(0, Number(e.target.value));
                          setFullPalletsInput(val);
                          updateQuantitiesFromPallets(stdQtyPerPalletInput, val, looseQtyInput);
                        }}
                        className="w-full bg-white border border-blue-300 rounded-lg px-2 py-1 text-xs font-mono font-bold text-blue-800 text-center focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-500 ml-1">Pallet</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-amber-800 mb-1">
                      จำนวนเศษ (Loose):
                    </label>
                    <div className="flex items-center">
                      <input
                        type="number"
                        min="0"
                        value={looseQtyInput}
                        onChange={(e) => {
                          const val = Math.max(0, Number(e.target.value));
                          setLooseQtyInput(val);
                          updateQuantitiesFromPallets(stdQtyPerPalletInput, fullPalletsInput, val);
                        }}
                        className="w-full bg-white border border-amber-300 rounded-lg px-2 py-1 text-xs font-mono font-bold text-amber-800 text-center focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-500 ml-1">ตัว</span>
                    </div>
                  </div>
                </div>

                {/* Formula Breakdown Live Display */}
                <div className="p-2 bg-blue-100/80 border border-blue-300 rounded-lg text-xs text-blue-900 font-medium flex items-center justify-between">
                  <div>
                    <span className="font-bold text-blue-800">สูตรคำนวณ: </span>
                    <span className="font-mono">
                      ({stdQtyPerPalletInput} × {fullPalletsInput} พาเลทเต็ม) + {looseQtyInput} เศษ
                    </span>
                  </div>
                  <div className="font-mono font-bold text-blue-900 bg-white px-2 py-0.5 rounded border border-blue-300 shadow-sm">
                    = {(fullPalletsInput * stdQtyPerPalletInput) + looseQtyInput} ชิ้นรวม ({fullPalletsInput + (looseQtyInput > 0 ? 1 : 0)} พาเลท)
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">
                คุณกำลังป้อนจำนวนรวมโดยตรงในช่องนับจริง (Actual Quantity) ด้านล่าง
              </p>
            )}
          </div>

          {/* Quantities & Gap Check */}
          <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block text-[11px] text-slate-600 font-semibold mb-1">จำนวนป้าย QR:</label>
              <input
                type="number"
                value={labelQty}
                onChange={(e) => setLabelQty(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 text-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-bold text-center"
              />
            </div>

            <div>
              <label className="block text-[11px] text-emerald-700 font-bold mb-1">นับจริง (Actual):</label>
              <input
                type="number"
                value={actualQty}
                onChange={(e) => setActualQty(Number(e.target.value))}
                className="w-full bg-white border border-emerald-300 text-emerald-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-center"
              />
            </div>

            <div>
              <label className="block text-[11px] text-amber-700 font-semibold mb-1">ส่วนต่าง (Gap):</label>
              <div className={`text-xs font-bold py-1.5 text-center rounded-lg ${qtyGap === 0 ? 'bg-slate-200 text-slate-600' : 'bg-amber-100 text-amber-800 border border-amber-200'}`}>
                {qtyGap}
              </div>
            </div>
          </div>

          {/* Remark */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">หมายเหตุเพิ่มเติม:</label>
            <input
              type="text"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="ระบุหมายเหตุถ้ามี (เช่น Pallet ชำรุด, Lot พิเศษ)..."
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <input 
              type="checkbox" 
              id="batchModeToggle"
              checked={batchMode}
              onChange={(e) => setBatchMode(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <label htmlFor="batchModeToggle" className="text-xs font-bold text-slate-700 flex items-center cursor-pointer">
              <Repeat className="w-4 h-4 mr-1 text-slate-500" />
              โหมดสแกนต่อเนื่อง (Batch Mode)
            </label>
            <span className="text-[10px] text-slate-500 ml-2">
              (สแกนแล้วไม่ปิดหน้าต่าง)
            </span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className={`w-full py-3 rounded-xl font-bold text-sm text-white shadow-sm flex items-center justify-center space-x-2 transition-all active:scale-98 ${
              type === 'IN'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <Zap className="w-4 h-4 text-white" />
            <span>ยืนยันสแกน {type === 'IN' ? 'รับเข้าจัดเก็บ' : 'เบิกจ่ายวัตถุดิบ'} (One Save)</span>
          </button>
        </form>
      </div>
    </div>
  );
};
