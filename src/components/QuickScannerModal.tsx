import React, { useState, useEffect } from 'react';
import { InventoryItem, MasterDataItem, MovementType, ShelfLevel, StorageZone, UseLineMaster } from '../types';
import { 
  X, 
  QrCode, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle,
  ArrowDownRight, 
  ArrowUpRight, 
  Camera, 
  Search, 
  Zap, 
  Repeat, 
  Box, 
  History, 
  Trash2, 
  RotateCcw, 
  MapPin,
  ChevronDown,
  ChevronUp,
  Sliders,
  Sparkles,
  Building2,
  Layers,
  HelpCircle
} from 'lucide-react';
import { QRScanner } from './QRScanner';

export interface RecentScanEntry {
  id: string;
  type: MovementType;
  modelHE: string;
  partName?: string;
  zone: StorageZone;
  bayNumber: number;
  level: ShelfLevel;
  actualQty: number;
  useLine: string;
  scanInput: string;
  stdQtyPerPallet?: number;
  fullPallets?: number;
  looseQty?: number;
  timestamp: string;
}

const DEFAULT_RECENT_SCANS: RecentScanEntry[] = [
  {
    id: 'scan-init-1',
    type: 'IN',
    modelHE: 'ADL74920904',
    partName: 'HE Core Frame Bracket',
    zone: 'E',
    bayNumber: 6,
    level: 1,
    actualQty: 480,
    useLine: 'HE2',
    scanInput: 'ADL74920904_2026-08-20_HE2_480',
    stdQtyPerPallet: 80,
    fullPallets: 6,
    looseQty: 0,
    timestamp: '10:45 น.'
  },
  {
    id: 'scan-init-2',
    type: 'OUT',
    modelHE: 'ACG76284709',
    partName: 'Compressor Mounting Bracket',
    zone: 'D',
    bayNumber: 4,
    level: 2,
    actualQty: 160,
    useLine: 'HE1',
    scanInput: 'ACG76284709_2026-08-20_HE1_160',
    stdQtyPerPallet: 80,
    fullPallets: 2,
    looseQty: 0,
    timestamp: '09:30 น.'
  }
];

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
  const [locatorScanInput, setLocatorScanInput] = useState<string>(`${initialZone}${initialBayNumber}-L${initialLevel}`);
  const [locatorDetectedMsg, setLocatorDetectedMsg] = useState<string | null>(null);
  const [cameraTarget, setCameraTarget] = useState<'PRODUCT' | 'LOCATOR'>('PRODUCT');
  const [modelHE, setModelHE] = useState<string>('ADL74920904');
  const [zone, setZone] = useState<StorageZone>(initialZone);
  const [bayNumber, setBayNumber] = useState<number>(initialBayNumber);
  const [level, setLevel] = useState<ShelfLevel>(initialLevel);
  const [labelQty, setLabelQty] = useState<number>(600);
  const [actualQty, setActualQty] = useState<number>(600);
  const [isQtyConfirmed, setIsQtyConfirmed] = useState<boolean>(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [useLine, setUseLine] = useState<string>('HE2');
  const [remark, setRemark] = useState<string>('');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [batchMode, setBatchMode] = useState<boolean>(false);
  const [itemFilterQuery, setItemFilterQuery] = useState<string>('');
  const [showItemSearchDrawer, setShowItemSearchDrawer] = useState<boolean>(false);

  // Collapsible UI state for clean layout
  const [showAdvancedTools, setShowAdvancedTools] = useState<boolean>(false);
  const [showRecentScans, setShowRecentScans] = useState<boolean>(true);

  // Pallet Breakdown Calculator state
  const [calcMode, setCalcMode] = useState<'PALLET' | 'DIRECT'>('PALLET');
  const [stdQtyPerPalletInput, setStdQtyPerPalletInput] = useState<number>(80);
  const [fullPalletsInput, setFullPalletsInput] = useState<number>(1);
  const [looseQtyInput, setLooseQtyInput] = useState<number>(0);

  // Recent Scans State & Persistence
  const [recentScans, setRecentScans] = useState<RecentScanEntry[]>(() => {
    try {
      const saved = localStorage.getItem('wms_recent_scans');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load recent scans:', e);
    }
    return DEFAULT_RECENT_SCANS;
  });

  const handleReSelectScan = (scan: RecentScanEntry) => {
    setType(scan.type);
    setModelHE(scan.modelHE);
    setZone(scan.zone);
    setBayNumber(scan.bayNumber);
    setLevel(scan.level);
    setLocatorScanInput(`${scan.zone}${scan.bayNumber}-L${scan.level}`);
    setActualQty(scan.actualQty);
    setLabelQty(scan.actualQty);
    setUseLine(scan.useLine);
    setScanInput(scan.scanInput);
    if (scan.stdQtyPerPallet) setStdQtyPerPalletInput(scan.stdQtyPerPallet);
    if (scan.fullPallets !== undefined) setFullPalletsInput(scan.fullPallets);
    if (scan.looseQty !== undefined) setLooseQtyInput(scan.looseQty);
    setSuccessMessage(`⚡ โหลดข้อมูลการสแกนล่าสุด ${scan.modelHE} (${scan.zone}${scan.bayNumber}-L${scan.level}) เรียบร้อย!`);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 2000);
  };

  const handleClearRecentScans = () => {
    setRecentScans([]);
    try {
      localStorage.removeItem('wms_recent_scans');
    } catch (e) {}
  };

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
    setLocatorScanInput(item.locatorCode || `${item.zone}${item.bayNumber}-L${item.level}`);
    
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
      setLocatorScanInput(`${initialZone}${initialBayNumber}-L${initialLevel}`);
      setType(initialMode);
      setSuccessMessage(null);
      setLocatorDetectedMsg(null);

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

  // Determine current Zone Category & Max Bay/Level limits
  const isA4SelectiveRack = ['B', 'C', 'D', 'E', 'F'].includes(zone as string);
  const isA4HighRack = ['G', 'H', 'I', 'J', 'K'].includes(zone as string);
  const isA4FloorStaging = (zone as string).startsWith('X');
  const isA2FlowRail = (zone as string).startsWith('R') || (zone as string).startsWith('FR');
  const isA5Tent = (zone as string).startsWith('T') || (zone as string).startsWith('DA5T');

  const getMaxBaysForZone = (z: string): number => {
    if (['B', 'C', 'D', 'E', 'F'].includes(z)) return 12;
    if (['G', 'H', 'I', 'J', 'K'].includes(z)) return 5;
    if (z.startsWith('X')) return 12;
    if (z.startsWith('R') || z.startsWith('FR')) return 8;
    if (z.startsWith('T') || z.startsWith('DA5T')) return 20;
    return 12;
  };

  const getBayLabelForZone = (z: string): string => {
    if (['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'].includes(z)) return 'ช่วงเสา (Bay):';
    if (z.startsWith('X')) return 'คอลัมน์ (Col):';
    if (z.startsWith('R') || z.startsWith('FR')) return 'ตำแหน่งราง (Pos):';
    if (z.startsWith('T') || z.startsWith('DA5T')) return 'ช่องจัดวาง (Slot):';
    return 'ตำแหน่ง (Bay/Col):';
  };

  // Comprehensive Auto-Parse Locator QR Code string from ANY zone in the entire campus
  const handleLocatorInputChange = (raw: string) => {
    setLocatorScanInput(raw);
    if (!raw.trim()) {
      setLocatorDetectedMsg(null);
      return;
    }

    const clean = raw.trim().toUpperCase();

    // 1. A4 Floor Staging (DA4D-1, X1-X8): e.g. "DA4D-1.01-X3", "DA4D-1-X3-04", "DA4D-1-R8-06", "X2-05", "X3"
    const floorMatch = clean.match(/(?:DA4D-1(?:\.01)?[-_])?(?:(X[1-8])|R([1-9]|[1-4][0-9]|48))[-_\s]*0?([1-9]|1[0-2])?/i);
    if (floorMatch && (floorMatch[1] || clean.startsWith('DA4D-1') || /^X[1-8]/i.test(clean))) {
      let xGroup = floorMatch[1]?.toUpperCase();
      let rowNum = floorMatch[2] ? parseInt(floorMatch[2], 10) : undefined;
      const colNum = floorMatch[3] ? parseInt(floorMatch[3], 10) : 1;

      if (rowNum && !xGroup) {
        const xIndex = Math.min(8, Math.max(1, Math.ceil(rowNum / 6)));
        xGroup = `X${xIndex}`;
      } else if (!xGroup) {
        xGroup = 'X1';
      }

      setZone(xGroup);
      setBayNumber(colNum);
      setLevel(1);
      setLocatorDetectedMsg(`🏗️ ลานกองพื้น A4: DA4D-1 ${xGroup} Col ${String(colNum).padStart(2, '0')} (Floor Staging)`);

      const existing = existingItems.find(i => 
        i.zone === xGroup && i.bayNumber === colNum || 
        i.locatorCode.includes(xGroup)
      );
      if (existing) {
        setModelHE(existing.modelHE);
        setUseLine(existing.useLine);
        if (type === 'OUT') {
          setLabelQty(existing.quantity);
          setActualQty(existing.quantity);
        }
      }
      return;
    }

    // 2. A2 Flow Rail (DA2D-1, R1-R20, FR1-FR20): e.g. "DA2D-1.01-R12", "DA2D-1-R20-01", "R12-03", "FR5-02", "R3"
    const railMatch = clean.match(/(?:DA2D-1(?:\.01)?[-_])?(?:FR|R)(20|1[0-9]|[1-9])[-_\s]*0?([1-8])?/i);
    if (railMatch && (clean.includes('DA2D-1') || clean.startsWith('R') || clean.startsWith('FR'))) {
      const railNum = parseInt(railMatch[1], 10);
      const posNum = railMatch[2] ? parseInt(railMatch[2], 10) : 1;
      const railZone = `R${railNum}`;
      
      setZone(railZone);
      setBayNumber(posNum);
      setLevel(1);
      setLocatorDetectedMsg(`🛞 รางเลื่อน A2: DA2D-1 Rail R${railNum} Pos ${String(posNum).padStart(2, '0')} (Flow Rail)`);

      const existing = existingItems.find(i => 
        i.zone === railZone && i.bayNumber === posNum || 
        i.zone === `FR${railNum}` || 
        i.locatorCode.includes(`R${railNum}-`)
      );
      if (existing) {
        setModelHE(existing.modelHE);
        setUseLine(existing.useLine);
        if (type === 'OUT') {
          setLabelQty(existing.quantity);
          setActualQty(existing.quantity);
        }
      }
      return;
    }

    // 3. A5 Tent Yard (DAST-1 to DAST-4, T1-T4): e.g. "DAST-1.01-T1-A", "DA5T-2.01", "T2-08", "T3", "DAST-4"
    const tentMatch = clean.match(/(?:DA[5S]T[-_]([1-4])(?:\.01)?|T([1-4]))(?:[-_\s]*0?([1-9]|1[0-9]|20))?/i);
    if (tentMatch && (clean.includes('DAST') || clean.includes('DA5T') || /^T[1-4]/i.test(clean))) {
      const tentNum = tentMatch[1] || tentMatch[2] || '1';
      const slotNum = tentMatch[3] ? parseInt(tentMatch[3], 10) : 1;
      const tentZone = `T${tentNum}`;

      setZone(tentZone);
      setBayNumber(slotNum);
      setLevel(1);
      setLocatorDetectedMsg(`⛺ ลานเต็นท์ A5: DAST-${tentNum}.01 Tent ${tentZone} Slot ${slotNum} (Outdoor)`);

      const existing = existingItems.find(i => 
        i.zone === tentZone || i.locatorCode.includes(`DA5T-${tentNum}`) || i.locatorCode.includes(`DAST-${tentNum}`)
      );
      if (existing) {
        setModelHE(existing.modelHE);
        setUseLine(existing.useLine);
        if (type === 'OUT') {
          setLabelQty(existing.quantity);
          setActualQty(existing.quantity);
        }
      }
      return;
    }

    // 4. A4 Selective Racks (B-F) & High Racks (G-K): e.g. "DA4D-2-B6-L1", "DA4D-3-G2-L3", "E6-L1", "B5-L2", "LOC-E-06-L1", "K5"
    const rackMatch = clean.match(/(?:DA4D-[23](?:\.01)?[-_]|LOC[-_]|ZONE[-_]|RACK[-_])?([B-K])[-_\s]*(?:BAY[-_\s]*)?0?([1-9]|1[0-2])(?:[-_\s]*(?:LEVEL|LVL|L)?[-_\s]*([1-4]))?/i);
    if (rackMatch) {
      const z = rackMatch[1] as StorageZone;
      const b = parseInt(rackMatch[2], 10);
      const l = rackMatch[3] ? (parseInt(rackMatch[3], 10) as ShelfLevel) : 1;

      const validZones: StorageZone[] = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
      if (validZones.includes(z)) {
        const isHigh = ['G', 'H', 'I', 'J', 'K'].includes(z);
        const maxBay = isHigh ? 5 : 12;
        const validBay = Math.min(maxBay, Math.max(1, b));

        setZone(z);
        setBayNumber(validBay);
        setLevel(l);
        
        const bldgArea = isHigh ? 'A4 DA4D-3 (High Rack)' : 'A4 DA4D-2 (Selective Rack)';
        setLocatorDetectedMsg(`🏢 ${bldgArea}: Zone ${z} Bay ${validBay} ชั้น ${l}`);

        const existing = existingItems.find(i => i.zone === z && i.bayNumber === validBay && (!l || i.level === l));
        if (existing) {
          setModelHE(existing.modelHE);
          setUseLine(existing.useLine);
          if (type === 'OUT') {
            setLabelQty(existing.quantity);
            setActualQty(existing.quantity);
          }
        }
      }
    }
  };

  // Auto Parse Product QR Code string when changed
  const handleScanInputChange = (raw: string) => {
    setScanInput(raw);
    if (!raw.trim()) return;

    // If user scanned a locator tag format into product input, redirect to locator
    const clean = raw.trim().toUpperCase();
    if (/^(?:LOC[-_]|DA4D|DA2D|DAST|DA5T)?[B-K|X|R|T](?:[1-9]|1[0-9]|20)?(?:[-_]L?[1-4])?$/i.test(clean)) {
      handleLocatorInputChange(clean);
      return;
    }

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
    if (cameraTarget === 'LOCATOR') {
      handleLocatorInputChange(decodedText);
      setSuccessMessage(`📍 สแกนพิกัดเสา/ตำแหน่งสำเร็จ: ${decodedText}`);
    } else {
      const clean = decodedText.trim().toUpperCase();
      if (/^(?:DA4D|DA2D|DAST|DA5T|LOC[-_])?[B-K|X|R|T](?:[1-9]|1[0-9]|20)?(?:[-_]L?[1-4])?$/i.test(clean)) {
        handleLocatorInputChange(clean);
        setSuccessMessage(`📍 ตรวจพบว่าเป็น QR พิกัดเสา: ${decodedText}`);
      } else {
        handleScanInputChange(decodedText);
      }
    }
    setCameraActive(false);
  };

  const handleToggleCamera = (target: 'PRODUCT' | 'LOCATOR') => {
    if (cameraActive && cameraTarget === target) {
      setCameraActive(false);
    } else {
      setCameraTarget(target);
      setCameraActive(true);
    }
  };

  const qtyGap = actualQty - labelQty;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validation: Require operator to enter/confirm quantity
    if (!actualQty || actualQty <= 0) {
      setValidationError('⚠️ กรุณากรอกและยืนยันจำนวนที่ตรวจนับจริง (Confirmed Qty) ให้มากกว่า 0 ก่อนกดยืนยัน');
      return;
    }

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

    // Record into recent scans list
    const newScanEntry: RecentScanEntry = {
      id: 'scan-' + Date.now(),
      type,
      modelHE,
      partName: existingItems.find(i => i.modelHE === modelHE)?.partName || masterData.find(m => m.modelHE === modelHE)?.partName || 'Raw Material',
      zone,
      bayNumber,
      level,
      actualQty,
      useLine,
      scanInput: scanInput || modelHE,
      stdQtyPerPallet: stdQtyPerPalletInput,
      fullPallets: calcMode === 'PALLET' ? fullPalletsInput : Math.floor(actualQty / stdQtyPerPalletInput),
      looseQty: calcMode === 'PALLET' ? looseQtyInput : (actualQty % stdQtyPerPalletInput),
      timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.'
    };

    setRecentScans(prev => {
      const updated = [newScanEntry, ...prev.filter(s => !(s.modelHE === newScanEntry.modelHE && s.zone === newScanEntry.zone && s.bayNumber === newScanEntry.bayNumber && s.level === newScanEntry.level && s.type === newScanEntry.type))].slice(0, 10);
      try {
        localStorage.setItem('wms_recent_scans', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    setSuccessMessage(`✅ บันทึกสแกน ${type === 'IN' ? 'รับเข้า' : 'เบิกออก'} ${modelHE} ตำแหน่ง ${zone}${bayNumber}-L${level} สำเร็จ!`);
    
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full max-h-[94vh] overflow-y-auto p-4 sm:p-5 text-slate-900 shadow-2xl relative">
        
        {/* TOP HEADER */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center space-x-2.5">
            <div className={`p-2 rounded-xl shrink-0 ${type === 'IN' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base tracking-tight text-slate-900 flex items-center space-x-1.5">
                <span>สแกน QR Code คลังสินค้า</span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full border border-slate-300">
                  ทุกโซน A2/A4/A5
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                รองรับพิกัดแร็ค, ลานกองพื้น, รางเลื่อน และเต็นท์
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all shrink-0"
            title="ปิดหน้าต่างสแกน"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert Banner */}
        {successMessage && (
          <div className="my-2.5 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center space-x-2 animate-fadeIn shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Validation Error Banner */}
        {validationError && (
          <div className="my-2.5 p-2.5 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-xs font-bold flex items-center space-x-2 animate-fadeIn shadow-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          
          {/* 1. Mode Selector (IN / OUT) */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setType('IN')}
              className={`py-2 rounded-lg font-black text-xs flex items-center justify-center space-x-1.5 transition-all ${
                type === 'IN'
                  ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <ArrowDownRight className="w-4 h-4" />
              <span>📥 รับเข้าจัดเก็บ (IN)</span>
            </button>

            <button
              type="button"
              onClick={() => setType('OUT')}
              className={`py-2 rounded-lg font-black text-xs flex items-center justify-center space-x-1.5 transition-all ${
                type === 'OUT'
                  ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>📤 เบิกจ่ายไลน์ (OUT)</span>
            </button>
          </div>

          {/* 2. Product QR Scan Input */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">
                1. รหัสสินค้า / บาร์โค้ด QR สินค้า:
              </label>
              <button
                type="button"
                onClick={() => setShowItemSearchDrawer(!showItemSearchDrawer)}
                className="text-blue-600 hover:text-blue-800 text-[11px] font-bold flex items-center space-x-1"
              >
                <Search className="w-3 h-3" />
                <span>{showItemSearchDrawer ? 'ซ่อนค้นหา' : '🔍 ค้นหาในคลัง'}</span>
              </button>
            </div>

            {/* Quick Item Filter Search Drawer */}
            {showItemSearchDrawer && (
              <div className="bg-slate-50 border border-blue-200 rounded-xl p-2.5 space-y-2 shadow-inner">
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
                        className="w-full text-left p-1.5 rounded bg-white hover:bg-blue-50 border border-slate-200 transition-all flex items-center justify-between group"
                      >
                        <div className="truncate mr-2">
                          <div className="font-mono font-bold text-blue-600 group-hover:text-blue-700 truncate">
                            {item.modelHE}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate">
                            {item.partName} | Line {item.useLine}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="flex items-center space-x-1 justify-end mb-0.5">
                            <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-900 font-extrabold text-[10px]">
                              {item.locatorCode || `Zone ${item.zone}${item.bayNumber}`}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500">
                            คงเหลือ {item.quantity.toLocaleString()} ชิ้น
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-2 text-slate-400 text-xs">
                      ไม่พบรายการที่ค้นหา
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="relative">
              <input
                type="text"
                value={scanInput}
                onChange={(e) => handleScanInputChange(e.target.value)}
                placeholder="ยิงบาร์โค้ด หรือพิมพ์ข้อความ QR สินค้า..."
                className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-xl pl-3.5 pr-20 py-2 text-xs text-blue-700 font-mono font-bold focus:outline-none focus:bg-white transition-all shadow-xs"
                required
              />
              <button
                type="button"
                onClick={() => handleToggleCamera('PRODUCT')}
                className="absolute right-1 top-1 p-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-semibold flex items-center space-x-1 shadow-2xs"
              >
                <Camera className="w-3.5 h-3.5 text-blue-600" />
                <span>{cameraActive && cameraTarget === 'PRODUCT' ? 'ปิดกล้อง' : 'กล้อง'}</span>
              </button>
            </div>
          </div>

          {/* Camera View Finder */}
          {cameraActive && (
            <div className="space-y-2 p-2 bg-slate-900 rounded-xl border border-blue-500 shadow-lg">
              <div className="flex items-center justify-between px-2 text-white text-xs">
                <span className="font-bold flex items-center space-x-1.5">
                  <Camera className="w-4 h-4 text-cyan-400 animate-pulse" />
                  <span>
                    กำลังสแกน: {cameraTarget === 'LOCATOR' ? '🎯 ป้าย QR พิกัดตำแหน่ง (ทุกโซน)' : '📦 ป้าย QR สินค้า'}
                  </span>
                </span>
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => setCameraTarget(cameraTarget === 'LOCATOR' ? 'PRODUCT' : 'LOCATOR')}
                    className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-[10px] font-bold text-white transition-all"
                  >
                    สลับไปสแกน {cameraTarget === 'LOCATOR' ? 'ป้ายสินค้า' : 'ป้ายพิกัด'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCameraActive(false)}
                    className="p-1 text-slate-400 hover:text-white rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <QRScanner onScan={handleQRScan} onClose={() => setCameraActive(false)} />
            </div>
          )}

          {/* 3. 📍 Universal Locator Tag Scanner (ครอบคลุมทุกโซนในคลัง) */}
          <div className="p-3 bg-gradient-to-r from-amber-50/70 to-orange-50/40 border border-amber-300 rounded-xl space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-amber-950 flex items-center space-x-1.5">
                <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
                <span>2. สแกน / ระบุพิกัดจัดเก็บ (All Zones Locator Tag):</span>
              </label>
              <button
                type="button"
                onClick={() => handleToggleCamera('LOCATOR')}
                className="p-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-lg text-[10px] font-bold flex items-center space-x-1 shadow-2xs transition-all"
              >
                <Camera className="w-3.5 h-3.5 text-amber-700" />
                <span>{cameraActive && cameraTarget === 'LOCATOR' ? 'ปิดกล้อง' : 'สแกนพิกัด'}</span>
              </button>
            </div>

            {/* Quick scan tag string input */}
            <div className="relative">
              <input
                type="text"
                value={locatorScanInput}
                onChange={(e) => handleLocatorInputChange(e.target.value)}
                placeholder="ยิงบาร์โค้ดพิกัด (เช่น DA4D-2-B6-L1, DA4D-1-X3, DA2D-1-R12, DAST-1.01-T1, E6-L1)..."
                className="w-full bg-white border border-amber-300 focus:border-amber-500 rounded-xl px-3 py-1.5 text-xs text-amber-950 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-2xs transition-all"
              />
            </div>

            {/* Detected Tag Badge */}
            {locatorDetectedMsg && (
              <div className="text-[11px] bg-emerald-50 text-emerald-800 font-bold px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center space-x-1.5 animate-fadeIn">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{locatorDetectedMsg}</span>
              </div>
            )}

            {/* Structured Zone Selector with Categorized OptGroups */}
            <div className="grid grid-cols-12 gap-2 pt-0.5">
              
              {/* Zone Category & Name */}
              <div className="col-span-5">
                <label className="block text-[10px] font-bold text-slate-700 mb-0.5">โซน / พื้นที่:</label>
                <select
                  value={zone}
                  onChange={(e) => {
                    const newZ = e.target.value as StorageZone;
                    setZone(newZ);
                    const maxB = getMaxBaysForZone(newZ);
                    const newB = Math.min(bayNumber, maxB);
                    setBayNumber(newB);
                    const newL = (newZ.startsWith('X') || newZ.startsWith('R') || newZ.startsWith('T') || newZ.startsWith('FR')) ? 1 : level;
                    setLevel(newL as ShelfLevel);
                    setLocatorScanInput(`${newZ}${newB}-L${newL}`);
                  }}
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-2 py-1 text-xs font-bold focus:outline-none focus:border-amber-500 shadow-2xs"
                >
                  <optgroup label="🏢 อาคาร A4 (Selective Rack: DA4D-2)">
                    <option value="B">Zone B (Selective Bay 1-12)</option>
                    <option value="C">Zone C (Selective Bay 1-12)</option>
                    <option value="D">Zone D (Selective Bay 1-12)</option>
                    <option value="E">Zone E (Selective Bay 1-12)</option>
                    <option value="F">Zone F (Selective Bay 1-12)</option>
                  </optgroup>
                  <optgroup label="🏢 อาคาร A4 (High Rack: DA4D-3)">
                    <option value="G">Zone G (High Rack Bay 1-5)</option>
                    <option value="H">Zone H (High Rack Bay 1-5)</option>
                    <option value="I">Zone I (High Rack Bay 1-5)</option>
                    <option value="J">Zone J (High Rack Bay 1-5)</option>
                    <option value="K">Zone K (High Rack Bay 1-5)</option>
                  </optgroup>
                  <optgroup label="🏗️ อาคาร A4 (ลานวางพื้น: DA4D-1)">
                    <option value="X1">Zone X1 (Floor Staging)</option>
                    <option value="X2">Zone X2 (Floor Staging)</option>
                    <option value="X3">Zone X3 (Floor Staging)</option>
                    <option value="X4">Zone X4 (Floor Staging)</option>
                    <option value="X5">Zone X5 (Floor Staging)</option>
                    <option value="X6">Zone X6 (Floor Staging)</option>
                    <option value="X7">Zone X7 (Floor Staging)</option>
                    <option value="X8">Zone X8 (Floor Staging)</option>
                  </optgroup>
                  <optgroup label="🛞 อาคาร A2 (รางเลื่อน Flow Rail: DA2D-1)">
                    {Array.from({ length: 20 }, (_, idx) => {
                      const rNum = idx + 1;
                      return (
                        <option key={`R${rNum}`} value={`R${rNum}`}>
                          Rail R{rNum} (Flow Rail 1-8)
                        </option>
                      );
                    })}
                  </optgroup>
                  <optgroup label="⛺ ลานเต็นท์ A5 ด้านนอก (DAST 1-4)">
                    <option value="T1">Tent 1 (DAST-1.01)</option>
                    <option value="T2">Tent 2 (DAST-2.01)</option>
                    <option value="T3">Tent 3 (DAST-3.01)</option>
                    <option value="T4">Tent 4 (DAST-4.01)</option>
                  </optgroup>
                </select>
              </div>

              {/* Dynamic Bay / Column / Slot */}
              <div className="col-span-3">
                <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                  {getBayLabelForZone(zone as string)}
                </label>
                <select
                  value={bayNumber}
                  onChange={(e) => {
                    const newB = Number(e.target.value);
                    setBayNumber(newB);
                    setLocatorScanInput(`${zone}${newB}-L${level}`);
                  }}
                  className="w-full bg-white border border-slate-300 text-slate-900 rounded-lg px-2 py-1 text-xs font-bold focus:outline-none focus:border-amber-500 shadow-2xs font-mono"
                >
                  {Array.from({ length: getMaxBaysForZone(zone as string) }, (_, i) => i + 1).map((b) => (
                    <option key={b} value={b}>
                      {isA4FloorStaging ? `Col ${b}` : isA2FlowRail ? `Pos ${b}` : isA5Tent ? `Slot ${b}` : `Bay ${b}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Shelf Level (1-4 for Racks, Level 1 Ground for Floor/Rail/Tent) */}
              <div className="col-span-4">
                <label className="block text-[10px] font-bold text-amber-900 mb-0.5">
                  ชั้น (Shelf Level):
                </label>
                {isA4FloorStaging || isA2FlowRail || isA5Tent ? (
                  <div className="w-full bg-slate-100 border border-slate-300 text-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-center">
                    ชั้น 1 (พื้นราบ)
                  </div>
                ) : (
                  <select
                    value={level}
                    onChange={(e) => {
                      const newL = Number(e.target.value) as ShelfLevel;
                      setLevel(newL);
                      setLocatorScanInput(`${zone}${bayNumber}-L${newL}`);
                    }}
                    className="w-full bg-white border border-amber-400 text-amber-950 rounded-lg px-2 py-1 text-xs font-black focus:outline-none shadow-2xs"
                  >
                    <option value={1}>ชั้น 1 (L1 Ground)</option>
                    <option value={2}>ชั้น 2 (L2 Heavy)</option>
                    <option value={3}>ชั้น 3 (L3 Standard)</option>
                    <option value={4}>ชั้น 4 (L4 Top)</option>
                  </select>
                )}
              </div>

            </div>
          </div>

          {/* 4. Model & Production Line Fields */}
          <div className="grid grid-cols-12 gap-2">
            
            {/* Model HE */}
            <div className="col-span-7">
              <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                รหัสสินค้า (Model HE):
              </label>
              <input
                type="text"
                value={modelHE}
                onChange={(e) => setModelHE(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold focus:outline-none focus:border-blue-500 focus:bg-white shadow-2xs"
                required
              />
            </div>

            {/* Use Line */}
            <div className="col-span-5">
              <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                ไลน์ผลิต (Line):
              </label>
              <select
                value={useLine}
                onChange={(e) => setUseLine(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-2 py-1.5 text-xs font-bold focus:outline-none focus:border-blue-500 focus:bg-white shadow-2xs"
              >
                {useLines.map((line) => (
                  <option key={line.id} value={line.id}>
                    {line.name || line.id}
                  </option>
                ))}
              </select>
            </div>

          </div>

          {/* 5. 🔍 DUAL QUANTITY VERIFICATION (จำนวนจากป้าย QR vs พนักงานกรอกยืนยัน) */}
          <div className="p-3 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-emerald-50/70 border-2 border-indigo-200 rounded-xl space-y-2.5 shadow-xs">
            
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-indigo-950 flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>3. ตรวจสอบ & ยืนยันจำนวนสินค้า (Quantity Dual-Verification)</span>
              </span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full border border-indigo-200">
                พนักงานต้องยืนยันยอด
              </span>
            </div>

            {/* Two Side-by-Side Quantity Boxes */}
            <div className="grid grid-cols-2 gap-2.5">
              
              {/* Box 1: ดึงจากป้าย QR Code (Reference Qty from QR) */}
              <div className="p-2.5 bg-white rounded-lg border border-blue-200 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-extrabold text-blue-900 flex items-center space-x-1">
                    <QrCode className="w-3.5 h-3.5 text-blue-600" />
                    <span>จำนวนจากป้าย QR:</span>
                  </label>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded border border-blue-100">
                    ดึงจาก QR
                  </span>
                </div>
                
                <div className="relative my-1">
                  <input
                    type="number"
                    min="0"
                    value={labelQty}
                    onChange={(e) => {
                      const val = Math.max(0, Number(e.target.value));
                      setLabelQty(val);
                    }}
                    className="w-full bg-blue-50/60 border border-blue-300 text-blue-900 rounded-lg px-2 py-1.5 text-sm font-mono font-black text-center focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="text-[10px] text-slate-500 text-center">
                  ยอดตามข้อมูลปาร์ตบาร์โค้ด
                </div>
              </div>

              {/* Box 2: พนักงานตรวจนับและกรอกยืนยันเอง (Operator Confirmed Qty) */}
              <div className="p-2.5 bg-white rounded-lg border-2 border-emerald-400 shadow-2xs ring-2 ring-emerald-400/20 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-black text-emerald-900 flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>พนักงานกรอกยืนยันเอง: *</span>
                  </label>
                  <span className="text-[9px] font-black px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded border border-emerald-300 animate-pulse">
                    จำเป็น
                  </span>
                </div>
                
                <div className="relative my-1">
                  <input
                    type="number"
                    min="1"
                    value={actualQty || ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : Math.max(0, Number(e.target.value));
                      setActualQty(val);
                      setValidationError(null);
                    }}
                    placeholder="กรอกยอดนับจริง..."
                    className="w-full bg-emerald-50/80 border-2 border-emerald-500 text-emerald-950 rounded-lg px-2 py-1.5 text-sm font-mono font-black text-center focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 shadow-inner"
                    required
                  />
                </div>
                <div className="text-[10px] text-emerald-700 font-bold text-center">
                  ยอดที่พนักงานนับจริงหน้างาน
                </div>
              </div>

            </div>

            {/* Quick Action Buttons for Operator */}
            <div className="flex flex-wrap items-center justify-between gap-1 pt-1">
              <button
                type="button"
                onClick={() => {
                  setActualQty(labelQty);
                  setValidationError(null);
                }}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold shadow-2xs flex items-center space-x-1 transition-all"
              >
                <CheckCircle2 className="w-3 h-3 text-white" />
                <span>⚡ ยืนยันยอดเท่าป้าย QR ({labelQty.toLocaleString()} ชิ้น)</span>
              </button>

              <div className="flex items-center space-x-1">
                {[+10, +80, +160, 480, 600].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      const newQty = preset > 100 ? preset : actualQty + preset;
                      setActualQty(newQty);
                      setValidationError(null);
                    }}
                    className="px-1.5 py-0.5 bg-white hover:bg-slate-100 text-slate-700 hover:text-blue-700 border border-slate-300 rounded text-[10px] font-mono font-bold transition-colors shadow-2xs"
                  >
                    {preset > 100 ? `${preset}` : `+${preset}`}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setActualQty(0);
                  }}
                  className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded text-[10px] font-bold"
                  title="ล้างเพื่อกรอกใหม่"
                >
                  ล้าง
                </button>
              </div>
            </div>

            {/* Real-time Verification Status Banner */}
            {actualQty > 0 ? (
              qtyGap === 0 ? (
                <div className="p-2 bg-emerald-100/90 border border-emerald-300 rounded-lg text-emerald-900 text-xs font-bold flex items-center space-x-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <div className="flex-1 flex items-center justify-between">
                    <span>✅ ยอดตรงกันสมบูรณ์ (ป้าย: {labelQty.toLocaleString()} = ยืนยัน: {actualQty.toLocaleString()} ชิ้น)</span>
                    <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.2 rounded font-extrabold">ถูกต้อง</span>
                  </div>
                </div>
              ) : (
                <div className="p-2 bg-amber-100 border border-amber-300 rounded-lg text-amber-950 text-xs font-bold flex items-center space-x-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <div className="flex-1">
                    <span className="text-amber-900">
                      ⚠️ พบส่วนต่าง (Gap): ป้าย QR ระบุ <strong>{labelQty.toLocaleString()}</strong> ชิ้น แต่พนักงานยืนยัน <strong>{actualQty.toLocaleString()}</strong> ชิ้น
                    </span>
                    <div className="text-[11px] font-mono font-extrabold text-amber-800 mt-0.5">
                      ส่วนต่าง: {qtyGap > 0 ? `+${qtyGap.toLocaleString()}` : qtyGap.toLocaleString()} ชิ้น ({qtyGap > 0 ? 'เกิน' : 'ขาด'})
                    </div>
                  </div>
                </div>
              )
            ) : (
              <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs font-bold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>⚠️ กรุณาระบุจำนวนที่ตรวจนับจริงเพื่อยืนยันก่อนกดรับงานหรือเบิกงาน</span>
              </div>
            )}

          </div>

          {/* 6. COLLAPSIBLE ADVANCED TOOLS (Pallet Breakdown, Notes, Batch Mode) */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <button
              type="button"
              onClick={() => setShowAdvancedTools(!showAdvancedTools)}
              className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-between text-xs font-bold transition-colors"
            >
              <span className="flex items-center space-x-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-600" />
                <span>ตัวเลือกเสริม & คำนวณพาเลทละเอียด (Pallet Calc & Gap)</span>
              </span>
              <div className="flex items-center space-x-1 text-[11px] text-slate-500">
                <span>{showAdvancedTools ? 'ซ่อน' : 'แสดงเครื่องมือ'}</span>
                {showAdvancedTools ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </div>
            </button>

            {showAdvancedTools && (
              <div className="p-3 bg-white space-y-3 border-t border-slate-200 animate-fadeIn text-xs">
                
                {/* Pallet Breakdown Calculator */}
                <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1 font-bold text-blue-900">
                      <Box className="w-3.5 h-3.5 text-blue-600" />
                      <span>คำนวณพาเลท (Pallet Breakdown Calculator)</span>
                    </div>
                    <div className="flex bg-white p-0.5 rounded border border-blue-200 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setCalcMode('PALLET')}
                        className={`px-2 py-0.5 rounded transition-all ${
                          calcMode === 'PALLET' ? 'bg-blue-600 text-white font-bold' : 'text-slate-600'
                        }`}
                      >
                        ตามพาเลท
                      </button>
                      <button
                        type="button"
                        onClick={() => setCalcMode('DIRECT')}
                        className={`px-2 py-0.5 rounded transition-all ${
                          calcMode === 'DIRECT' ? 'bg-blue-600 text-white font-bold' : 'text-slate-600'
                        }`}
                      >
                        ป้อนจำนวนตรง
                      </button>
                    </div>
                  </div>

                  {calcMode === 'PALLET' && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                            มาตรฐาน/พาเลท:
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={stdQtyPerPalletInput}
                            onChange={(e) => {
                              const val = Math.max(1, Number(e.target.value));
                              setStdQtyPerPalletInput(val);
                              updateQuantitiesFromPallets(val, fullPalletsInput, looseQtyInput);
                            }}
                            className="w-full bg-white border border-blue-300 rounded px-2 py-1 text-center font-mono font-bold text-blue-800"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                            จำนวนพาเลทเต็ม:
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={fullPalletsInput}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value));
                              setFullPalletsInput(val);
                              updateQuantitiesFromPallets(stdQtyPerPalletInput, val, looseQtyInput);
                            }}
                            className="w-full bg-white border border-blue-300 rounded px-2 py-1 text-center font-mono font-bold text-blue-800"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-amber-800 mb-0.5">
                            จำนวนเศษ (Loose):
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={looseQtyInput}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value));
                              setLooseQtyInput(val);
                              updateQuantitiesFromPallets(stdQtyPerPalletInput, fullPalletsInput, val);
                            }}
                            className="w-full bg-white border border-amber-300 rounded px-2 py-1 text-center font-mono font-bold text-amber-800"
                          />
                        </div>
                      </div>

                      <div className="p-1.5 bg-blue-100/80 rounded text-[11px] text-blue-900 font-mono font-bold flex items-center justify-between">
                        <span>สูตร: ({stdQtyPerPalletInput} × {fullPalletsInput}P) + {looseQtyInput}</span>
                        <span>= {(fullPalletsInput * stdQtyPerPalletInput) + looseQtyInput} ชิ้น</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Gap Check */}
                <div className="grid grid-cols-3 gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <label className="block text-[10px] text-slate-600 font-bold mb-0.5">จำนวนป้าย QR:</label>
                    <input
                      type="number"
                      value={labelQty}
                      onChange={(e) => setLabelQty(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-emerald-700 font-bold mb-0.5">นับจริง (Actual):</label>
                    <input
                      type="number"
                      value={actualQty}
                      onChange={(e) => setActualQty(Number(e.target.value))}
                      className="w-full bg-white border border-emerald-300 text-emerald-800 rounded px-2 py-1 text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-amber-700 font-bold mb-0.5">ส่วนต่าง (Gap):</label>
                    <div className={`py-1 text-center rounded font-bold ${qtyGap === 0 ? 'bg-slate-200 text-slate-600' : 'bg-amber-100 text-amber-800 border border-amber-200'}`}>
                      {qtyGap}
                    </div>
                  </div>
                </div>

                {/* Remark */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 mb-0.5">หมายเหตุเพิ่มเติม:</label>
                  <input
                    type="text"
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    placeholder="ระบุหมายเหตุ (เช่น Pallet ชำรุด, Lot พิเศษ)..."
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                {/* Batch Mode */}
                <div className="flex items-center space-x-2 pt-1">
                  <input 
                    type="checkbox" 
                    id="batchModeToggleClean"
                    checked={batchMode}
                    onChange={(e) => setBatchMode(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <label htmlFor="batchModeToggleClean" className="text-xs font-bold text-slate-700 flex items-center cursor-pointer">
                    <Repeat className="w-3.5 h-3.5 mr-1 text-slate-500" />
                    <span>โหมดสแกนต่อเนื่อง (Batch Mode - สแกนแล้วไม่ปิดหน้าต่าง)</span>
                  </label>
                </div>

              </div>
            )}
          </div>

          {/* 7. PRIMARY SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={!actualQty || actualQty <= 0}
            className={`w-full py-2.5 rounded-xl font-black text-xs sm:text-sm text-white shadow-md flex items-center justify-center space-x-2 transition-transform active:scale-98 ${
              !actualQty || actualQty <= 0
                ? 'bg-slate-400 cursor-not-allowed opacity-75'
                : type === 'IN'
                ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-400/30'
                : 'bg-blue-600 hover:bg-blue-700 ring-2 ring-blue-400/30'
            }`}
          >
            <Zap className="w-4 h-4 text-white" />
            <span>
              {actualQty > 0
                ? `⚡ ยืนยันสแกน ${type === 'IN' ? 'รับเข้าจัดเก็บ' : 'เบิกจ่ายวัตถุดิบ'} (ยืนยันยอด: ${actualQty.toLocaleString()} ชิ้น)`
                : `⚠️ กรุณากรอกและยืนยันจำนวนก่อน ${type === 'IN' ? 'รับเข้า' : 'เบิกจ่าย'}`}
            </span>
          </button>
        </form>

        {/* 7. RECENT SCANS SECTION (Collapsible & Compact) */}
        <div className="mt-4 pt-3 border-t border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => setShowRecentScans(!showRecentScans)}
              className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 hover:text-blue-600 transition-colors"
            >
              <History className="w-3.5 h-3.5 text-blue-600" />
              <span>ประวัติการสแกนล่าสุด ({recentScans.length})</span>
              {showRecentScans ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {recentScans.length > 0 && (
              <button
                type="button"
                onClick={handleClearRecentScans}
                className="text-[10px] font-semibold text-slate-400 hover:text-red-600 flex items-center space-x-1 px-1.5 py-0.5 rounded hover:bg-red-50 transition-colors"
                title="ล้างประวัติ"
              >
                <Trash2 className="w-3 h-3" />
                <span>ล้างประวัติ</span>
              </button>
            )}
          </div>

          {showRecentScans && (
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {recentScans.length > 0 ? (
                recentScans.map((scan) => {
                  const isScanIn = scan.type === 'IN';
                  return (
                    <div
                      key={scan.id}
                      className="flex items-center justify-between p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all"
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase shrink-0 ${
                            isScanIn
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-blue-100 text-blue-800 border border-blue-300'
                          }`}
                        >
                          {isScanIn ? 'IN' : 'OUT'}
                        </span>
                        <div className="min-w-0 truncate">
                          <span className="font-mono font-bold text-xs text-slate-900 mr-1.5">
                            {scan.modelHE}
                          </span>
                          <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-1 py-0.2 rounded border border-amber-200 mr-1">
                            {scan.zone}{scan.bayNumber}-L{scan.level}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {scan.actualQty} ชิ้น ({scan.useLine})
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleReSelectScan(scan)}
                        className="px-2 py-0.5 text-[10px] font-bold bg-white hover:bg-blue-600 hover:text-white text-blue-700 border border-slate-300 rounded shadow-2xs transition-all flex items-center space-x-1 shrink-0 ml-1.5 active:scale-95"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        <span>เลือกซ้ำ</span>
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-2 text-slate-400 text-[11px]">
                  ยังไม่มีประวัติการสแกนล่าสุด
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
