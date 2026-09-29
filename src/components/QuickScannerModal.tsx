import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  InventoryItem, 
  MasterDataItem, 
  MovementType, 
  ShelfLevel, 
  StorageZone, 
  UseLineMaster,
  ProtectionMethod,
  ProductType,
  ProductStorageType
} from '../types';
import { 
  X, 
  QrCode, 
  CheckCircle2, 
  AlertCircle,
  ArrowDownRight, 
  ArrowUpRight, 
  ArrowRightLeft,
  Camera, 
  Search, 
  Zap, 
  Box, 
  MapPin,
  ChevronDown,
  ChevronUp,
  Calendar,
  Clock,
  Keyboard,
  Building2,
  Copy,
  Plus,
  Trash2,
  Sparkles,
  Bookmark,
  Check,
  ArrowRight
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
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
    protectionMethod?: ProtectionMethod;
    productType?: ProductType;
    productStorageType?: ProductStorageType;
    targetZone?: StorageZone;
    targetBayNumber?: number;
    targetLevel?: ShelfLevel;
  }) => void;
  initialZone?: StorageZone;
  initialBayNumber?: number;
  initialLevel?: ShelfLevel;
  initialMode?: MovementType;
  existingItems: InventoryItem[];
  useLines?: UseLineMaster[];
  masterData?: MasterDataItem[];
}

export interface LearnedPart {
  modelHE: string;
  partName: string;
  stdQty: number;
  addedAt: string;
}

const LEARNED_PARTS_STORAGE_KEY = 'wms_learned_parts_v2';
const STANDARD_QTY_PRESETS = [80, 100, 120, 150, 180, 200, 220, 250, 300];

// Helper to retrieve custom learned parts from localStorage
const getSavedLearnedParts = (): LearnedPart[] => {
  try {
    const raw = localStorage.getItem(LEARNED_PARTS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

// Helper to format proper locator code across campus zones
export const formatLocatorCode = (z: StorageZone | string, bay: number, lvl: ShelfLevel | number): string => {
  const zStr = String(z);
  if (zStr.startsWith('CY3') || zStr.startsWith('DY3T')) {
    let rowCode = 'A';
    if (zStr.includes('B') || zStr.includes('1.02')) rowCode = 'B';
    else if (zStr.includes('C') || zStr.includes('1.03')) rowCode = 'C';
    else if (zStr.includes('D') || zStr.includes('1.04')) rowCode = 'D';
    const rowNum = rowCode === 'A' ? '1.01' : rowCode === 'B' ? '1.02' : rowCode === 'C' ? '1.03' : '1.04';
    return `DY3T-${rowNum}-${rowCode}${bay}-L${lvl}`;
  }
  if (zStr.startsWith('X')) {
    return `DA4D-1-${zStr}-${bay}`;
  }
  if (zStr.startsWith('R') || zStr.startsWith('FR')) {
    const railNum = zStr.replace(/\D/g, '');
    return `DA2D-1-R${railNum}-${String(bay).padStart(2, '0')}`;
  }
  if (zStr.startsWith('T') || zStr.startsWith('DA5T')) {
    const tentNum = zStr.replace(/\D/g, '') || '1';
    return `DA5T-${tentNum}.01-${String(bay).padStart(2, '0')}`;
  }
  return `${zStr}${bay}-L${lvl}`;
};

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
    { id: 'HE4', name: 'Line HE4' },
    { id: 'REPAIR', name: 'Line Repair' },
  ],
  masterData = [],
}) => {
  // 1. Transaction Type: IN (รับเข้า) / OUT (เบิกจ่าย) / TRANSFER (ย้ายพิกัด)
  const [type, setType] = useState<MovementType>(initialMode);

  // 2. Primary Mode: 'SCAN' or 'MANUAL'
  const [inputMode, setInputMode] = useState<'SCAN' | 'MANUAL'>('MANUAL');

  // Scanner States
  const [scanInput, setScanInput] = useState<string>('');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [showItemSearchDrawer, setShowItemSearchDrawer] = useState<boolean>(false);
  const [itemFilterQuery, setItemFilterQuery] = useState<string>('');

  // Core Fields
  const [modelHE, setModelHE] = useState<string>('ADL74920904');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState<boolean>(false);
  const [modelSearchQuery, setModelSearchQuery] = useState<string>('');
  const [learnedParts, setLearnedParts] = useState<LearnedPart[]>(() => getSavedLearnedParts());
  const [justLearnedMessage, setJustLearnedMessage] = useState<string | null>(null);

  // Source Locator (Directly linked from Layout click)
  const [zone, setZone] = useState<StorageZone>(initialZone);
  const [bayNumber, setBayNumber] = useState<number>(initialBayNumber);
  const [level, setLevel] = useState<ShelfLevel>(initialLevel);

  // Target Locator (For Transfer / Relocate mode)
  const [targetZone, setTargetZone] = useState<StorageZone>('F');
  const [targetBayNumber, setTargetBayNumber] = useState<number>(1);
  const [targetLevel, setTargetLevel] = useState<ShelfLevel>(1);

  const [useLine, setUseLine] = useState<string>('HE2');
  
  // Date & Time
  const [manualDate, setManualDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [manualTime, setManualTime] = useState<string>(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  // Quantity States
  const [actualQty, setActualQty] = useState<number>(80);
  const [labelQty, setLabelQty] = useState<number>(80);

  // Feedback & Validation
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedQR, setCopiedQR] = useState<boolean>(false);

  // Optional Remarks (Pallet details completely removed per user request)
  const [showAdvancedSettings, setShowAdvancedSettings] = useState<boolean>(false);
  const [remark, setRemark] = useState<string>('');
  const [batchMode, setBatchMode] = useState<boolean>(false);

  // Dropdown container ref
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  // Master catalog of all available models
  const availableModels = useMemo(() => {
    const map = new Map<string, { modelHE: string; partName: string; stdQty: number; isLearned?: boolean }>();
    
    // 1. Master Data
    masterData.forEach(m => {
      if (m.modelHE && !map.has(m.modelHE.toUpperCase())) {
        map.set(m.modelHE.toUpperCase(), { 
          modelHE: m.modelHE.toUpperCase(), 
          partName: m.partName || '', 
          stdQty: m.stdQtyPerPallet || 80,
          isLearned: false
        });
      }
    });

    // 2. Existing Items
    existingItems.forEach(it => {
      if (it.modelHE && !map.has(it.modelHE.toUpperCase())) {
        map.set(it.modelHE.toUpperCase(), { 
          modelHE: it.modelHE.toUpperCase(), 
          partName: it.partName || '', 
          stdQty: it.stdQtyPerPallet || 80,
          isLearned: false
        });
      }
    });

    // 3. Learned Parts
    learnedParts.forEach(lp => {
      const key = lp.modelHE.toUpperCase();
      if (!map.has(key)) {
        map.set(key, {
          modelHE: key,
          partName: lp.partName || 'Parts No จดจำใหม่',
          stdQty: lp.stdQty || 80,
          isLearned: true
        });
      } else {
        const item = map.get(key)!;
        map.set(key, { ...item, isLearned: true });
      }
    });

    if (!map.has('ADL74920904')) {
      map.set('ADL74920904', { 
        modelHE: 'ADL74920904', 
        partName: 'Inverter Main Board Module', 
        stdQty: 80,
        isLearned: false 
      });
    }

    return Array.from(map.values());
  }, [masterData, existingItems, learnedParts]);

  // Current matched part info
  const matchedPart = useMemo(() => {
    const target = modelHE.trim().toUpperCase();
    return availableModels.find(m => m.modelHE.toUpperCase() === target);
  }, [availableModels, modelHE]);

  // Dynamic filter when typing partial Parts No
  const filteredModels = useMemo(() => {
    const q = (modelSearchQuery || modelHE || '').trim().toUpperCase();
    if (!q) {
      return availableModels.slice(0, 10);
    }
    return availableModels
      .filter(m => 
        m.modelHE.toUpperCase().includes(q) || 
        m.partName.toUpperCase().includes(q)
      )
      .slice(0, 12);
  }, [availableModels, modelSearchQuery, modelHE]);

  // Check if current typed model is totally new
  const isCurrentModelNew = useMemo(() => {
    const clean = modelHE.trim().toUpperCase();
    if (!clean || clean.length < 3) return false;
    return !availableModels.some(m => m.modelHE.toUpperCase() === clean);
  }, [availableModels, modelHE]);

  // Current item in the clicked slot
  const currentSlotItem = useMemo(() => {
    return existingItems.find(it => it.zone === zone && it.bayNumber === bayNumber && it.level === level);
  }, [existingItems, zone, bayNumber, level]);

  // Target item in the target slot (for transfer)
  const targetSlotItem = useMemo(() => {
    return existingItems.find(it => it.zone === targetZone && it.bayNumber === targetBayNumber && it.level === targetLevel);
  }, [existingItems, targetZone, targetBayNumber, targetLevel]);

  // Current items in this bay across all levels (for IN mode level selection)
  const currentBayItems = useMemo(() => {
    return existingItems.filter(it => it.zone === zone && it.bayNumber === bayNumber);
  }, [existingItems, zone, bayNumber]);

  // Exact standard QR Code string formatted: [PartNo]_[Date]_[Time]_[Line]_[Qty]
  const composedQRString = useMemo(() => {
    const pModel = modelHE.trim().toUpperCase() || 'MODEL';
    const pDate = manualDate.trim() || '2026-09-29';
    const pTime = manualTime.trim() || '09:00';
    const pLine = useLine.trim() || 'HE2';
    const pQty = actualQty || 0;
    return `${pModel}_${pDate}_${pTime}_${pLine}_${pQty}`;
  }, [modelHE, manualDate, manualTime, useLine, actualQty]);

  // Auto-sync scanInput when in MANUAL mode
  useEffect(() => {
    if (inputMode === 'MANUAL') {
      setScanInput(composedQRString);
    }
  }, [inputMode, composedQRString]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync initial props when modal opens (DIRECTLY CONNECTED FROM LAYOUT CLICK)
  useEffect(() => {
    if (isOpen) {
      setZone(initialZone);
      setBayNumber(initialBayNumber);
      setLevel(initialLevel);
      setType(initialMode);
      setSuccessMessage(null);
      setValidationError(null);
      setCameraActive(false);
      setShowItemSearchDrawer(false);
      setIsModelDropdownOpen(false);
      setModelSearchQuery('');

      // Determine item in clicked slot
      const found = existingItems.find(
        (it) => it.zone === initialZone && it.bayNumber === initialBayNumber && it.level === initialLevel
      );

      if (found) {
        // Slot has item: Pre-fill with the exact item in the slot
        setModelHE(found.modelHE);
        setModelSearchQuery(found.modelHE);
        setUseLine(found.useLine);
        setLabelQty(found.quantity);
        setActualQty(initialMode === 'OUT' || initialMode === 'TRANSFER' ? found.quantity : (found.stdQtyPerPallet || 80));
        setScanInput(found.qrCode || `${found.modelHE}_2026-07-01_${found.useLine}_${found.quantity}`);
      } else {
        // Slot is empty
        setModelHE('ADL74920904');
        setModelSearchQuery('ADL74920904');
        setLabelQty(80);
        setActualQty(80);
        setUseLine('HE2');
        setScanInput('ADL74920904_2026-09-29_09:00_HE2_80');
      }

      // Set target zone for transfer (default to next zone)
      setTargetZone(initialZone === 'E' ? 'F' : 'E');
      setTargetBayNumber(1);
      setTargetLevel(1);
    }
  }, [isOpen, initialZone, initialBayNumber, initialLevel, initialMode, existingItems]);

  // Max Bays Calculation
  const getMaxBaysForZone = (z: string): number => {
    if (['B', 'C', 'D', 'E', 'F'].includes(z)) return 12;
    if (['G', 'H', 'I', 'J', 'K'].includes(z)) return 5;
    if (z.startsWith('CY3') || z.startsWith('DY3T')) return 25;
    if (z.startsWith('X')) return 12;
    if (z.startsWith('R') || z.startsWith('FR')) return 16;
    if (z.startsWith('T') || z.startsWith('DA5T')) return 20;
    return 12;
  };

  // Quick Date & Time Shortcuts
  const setDateToToday = () => {
    const d = new Date();
    setManualDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  };

  const setTimeToNow = () => {
    const d = new Date();
    setManualTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
  };

  // Select Model from Dropdown or Chip
  const handleSelectModel = (selectedModel: string, defaultStdQty?: number) => {
    setModelHE(selectedModel);
    setModelSearchQuery(selectedModel);
    setIsModelDropdownOpen(false);

    const match = availableModels.find(m => m.modelHE.toUpperCase() === selectedModel.toUpperCase());
    const std = defaultStdQty || match?.stdQty || 80;
    setActualQty(std);
    setLabelQty(std);
  };

  // Learn and remember a new Parts No
  const handleLearnNewPart = (newPartNo: string, customName?: string, defaultQty?: number) => {
    const clean = newPartNo.trim().toUpperCase();
    if (!clean) return;

    const newLearned: LearnedPart = {
      modelHE: clean,
      partName: customName || 'Custom New Model',
      stdQty: defaultQty || actualQty || 80,
      addedAt: new Date().toISOString()
    };

    const current = getSavedLearnedParts();
    const updated = [newLearned, ...current.filter(p => p.modelHE.toUpperCase() !== clean)].slice(0, 50);
    localStorage.setItem(LEARNED_PARTS_STORAGE_KEY, JSON.stringify(updated));
    setLearnedParts(updated);

    handleSelectModel(clean, newLearned.stdQty);
    setJustLearnedMessage(`✨ จดจำ "${clean}" เข้าระบบเรียบร้อยแล้ว`);
    setTimeout(() => setJustLearnedMessage(null), 3000);
  };

  // Delete a learned part
  const handleDeleteLearnedPart = (partToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const clean = partToDelete.toUpperCase();
    const current = getSavedLearnedParts();
    const updated = current.filter(p => p.modelHE.toUpperCase() !== clean);
    localStorage.setItem(LEARNED_PARTS_STORAGE_KEY, JSON.stringify(updated));
    setLearnedParts(updated);
  };

  // Parse Scanned or Typed String
  const handleRawScanInput = (raw: string) => {
    setScanInput(raw);
    if (!raw.trim()) return;

    const clean = raw.trim().toUpperCase();

    // Check if user scanned a Locator Tag
    const rackMatch = clean.match(/(?:DA4D-[23](?:\.01)?[-_]|LOC[-_]|ZONE[-_]|RACK[-_])?([B-K])[-_\s]*(?:BAY[-_\s]*)?0?([1-9]|1[0-2])(?:[-_\s]*(?:LEVEL|LVL|L)?[-_\s]*([1-4]))?/i);
    const cy3Match = clean.match(/(?:DY3T[-_]1\.0([1-4])|CY3[-_]([A-D]))[-_\s]*(?:([A-D])?0?([1-9]|1[0-9]|2[0-5]))(?:[-_\s]*(?:LEVEL|LVL|L)?[-_\s]*([1-4]))?/i);
    const floorMatch = clean.match(/(?:DA4D-1(?:\.01)?[-_])?(?:(X[1-8]))[-_\s]*0?([1-9]|1[0-2])?/i);
    const railMatch = clean.match(/(?:DA2D-1(?:\.01)?[-_])?(?:FR|R)(1[0-6]|[1-9])[-_\s]*0?([1-8])?/i);

    if (rackMatch && rackMatch[1]) {
      const z = rackMatch[1] as StorageZone;
      const b = parseInt(rackMatch[2], 10) || 1;
      const l = rackMatch[3] ? (parseInt(rackMatch[3], 10) as ShelfLevel) : 1;
      setZone(z);
      setBayNumber(b);
      setLevel(l);
      return;
    }

    if (cy3Match) {
      const rowNum = cy3Match[1] || '1';
      const rowLetter = (rowNum === '1' ? 'A' : rowNum === '2' ? 'B' : rowNum === '3' ? 'C' : 'D') as StorageZone;
      const cy3Zone = `CY3-${rowLetter}` as StorageZone;
      const bNum = cy3Match[3] ? parseInt(cy3Match[3], 10) : 1;
      const lNum = cy3Match[4] ? (parseInt(cy3Match[4], 10) as ShelfLevel) : 1;
      setZone(cy3Zone);
      setBayNumber(bNum);
      setLevel(lNum);
      return;
    }

    if (floorMatch) {
      const xGroup = (floorMatch[1] || 'X1').toUpperCase() as StorageZone;
      const colNum = floorMatch[2] ? parseInt(floorMatch[2], 10) : 1;
      setZone(xGroup);
      setBayNumber(colNum);
      setLevel(1);
      return;
    }

    if (railMatch) {
      const railNum = parseInt(railMatch[1], 10) || 1;
      const posNum = railMatch[2] ? parseInt(railMatch[2], 10) : 1;
      const railZone = `R${railNum}` as StorageZone;
      setZone(railZone);
      setBayNumber(posNum);
      setLevel(1);
      return;
    }

    // Parse as KANBAN QR string: [Model]_[Date]_[Time]_[Line]_[Qty]
    const parts = raw.split('_');
    if (parts.length >= 1 && parts[0].length >= 3) {
      const parsedModel = parts[0].toUpperCase();
      setModelHE(parsedModel);
      setModelSearchQuery(parsedModel);
    }
    if (parts.length >= 2 && /^\d{4}-\d{2}-\d{2}$/.test(parts[1])) {
      setManualDate(parts[1]);
    }
    if (parts.length >= 3 && /^\d{1,2}:\d{2}$/.test(parts[2])) {
      setManualTime(parts[2]);
    }
    if (parts.length >= 4) {
      const linePart = parts[3].toUpperCase();
      if (linePart.startsWith('HE') || linePart === 'REPAIR') {
        setUseLine(linePart);
      }
    }
    const lastPart = parts[parts.length - 1];
    if (lastPart && !isNaN(Number(lastPart))) {
      const parsedQty = Number(lastPart);
      setLabelQty(parsedQty);
      setActualQty(parsedQty);
    }
  };

  // Camera QR Scan Callback
  const handleQRScanDecoded = (decodedText: string) => {
    handleRawScanInput(decodedText);
    setSuccessMessage(`✅ สแกนสำเร็จ: ${decodedText}`);
    setCameraActive(false);
  };

  // Copy Composed QR String
  const handleCopyQRString = () => {
    navigator.clipboard.writeText(composedQRString);
    setCopiedQR(true);
    setTimeout(() => setCopiedQR(false), 2000);
  };

  // Form Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const cleanModel = modelHE.trim().toUpperCase();

    if (!cleanModel) {
      setValidationError('⚠️ กรุณาระบุรหัสสินค้า (Parts No)');
      return;
    }

    if (!actualQty || actualQty <= 0) {
      setValidationError('⚠️ กรุณาระบุจำนวนสินค้าให้มากกว่า 0');
      return;
    }

    // Stock OUT validation: Check against slot quantity
    if (type === 'OUT' && currentSlotItem && actualQty > currentSlotItem.quantity) {
      setValidationError(`⚠️ จำนวนที่ต้องการเบิก (${actualQty.toLocaleString()}) เกินกว่ายอดคงเหลือในช่อง (${currentSlotItem.quantity.toLocaleString()} ชิ้น)`);
      return;
    }

    // TRANSFER validation: Cannot transfer to same slot
    if (type === 'TRANSFER') {
      if (zone === targetZone && bayNumber === targetBayNumber && level === targetLevel) {
        setValidationError('⚠️ พิกัดปลายทางต้องไม่ซ้ำกับพิกัดต้นทาง');
        return;
      }
      if (currentSlotItem && actualQty > currentSlotItem.quantity) {
        setValidationError(`⚠️ จำนวนที่ต้องการย้าย (${actualQty.toLocaleString()}) เกินกว่ายอดคงเหลือในช่อง (${currentSlotItem.quantity.toLocaleString()} ชิ้น)`);
        return;
      }
    }

    // Automatically learn new Parts No if not already in system
    if (!availableModels.some(m => m.modelHE.toUpperCase() === cleanModel)) {
      handleLearnNewPart(cleanModel, 'Custom Added Part', actualQty);
    }

    const finalScanInput = inputMode === 'MANUAL'
      ? composedQRString
      : (scanInput.trim() || composedQRString);

    onSaveMovement({
      type,
      scanInput: finalScanInput,
      modelHE: cleanModel,
      zone,
      bayNumber,
      level,
      quantityCheck: labelQty,
      actualQty,
      useLine,
      remark,
      stdQtyPerPallet: 80,
      protectionMethod: 'NOT_APPLICABLE',
      targetZone: type === 'TRANSFER' ? targetZone : undefined,
      targetBayNumber: type === 'TRANSFER' ? targetBayNumber : undefined,
      targetLevel: type === 'TRANSFER' ? targetLevel : undefined,
    });

    const actionText = type === 'IN' ? 'รับเข้า' : type === 'OUT' ? 'เบิกจ่าย' : 'ย้ายพิกัด';
    const locText = formatLocatorCode(zone, bayNumber, level);
    const targetLocText = type === 'TRANSFER' ? ` -> ${formatLocatorCode(targetZone, targetBayNumber, targetLevel)}` : '';
    setSuccessMessage(`✅ บันทึก${actionText} ${cleanModel} ที่ ${locText}${targetLocText} (${actualQty.toLocaleString()} ชิ้น) สำเร็จ!`);

    if (batchMode) {
      setScanInput('');
      setRemark('');
      setTimeout(() => setSuccessMessage(null), 2500);
    } else {
      setTimeout(() => onClose(), 1000);
    }
  };

  // Filtered Items for Search Drawer
  const filteredExistingItems = useMemo(() => {
    if (!itemFilterQuery.trim()) return existingItems.slice(0, 8);
    const q = itemFilterQuery.toLowerCase().trim();
    return existingItems.filter(item => 
      item.modelHE.toLowerCase().includes(q) ||
      item.partName.toLowerCase().includes(q) ||
      item.locatorCode.toLowerCase().includes(q) ||
      item.useLine.toLowerCase().includes(q)
    ).slice(0, 15);
  }, [existingItems, itemFilterQuery]);

  // ALL HOOKS EXECUTED ABOVE. Early return placed cleanly after all hooks:
  if (!isOpen) return null;

  const isRackZone = !String(zone).startsWith('X') && !String(zone).startsWith('R') && !String(zone).startsWith('FR') && !String(zone).startsWith('T');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
      {/* POPUP CONTAINER */}
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg max-h-[94dvh] overflow-y-auto overscroll-contain text-slate-100 shadow-2xl relative flex flex-col">
        
        {/* ========================================================================= */}
        {/* 1. HEADER (CLEAN & MODERN)                                                */}
        {/* ========================================================================= */}
        <div className="px-4 py-3 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl shrink-0 ${
              type === 'IN' 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                : type === 'OUT'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
            }`}>
              {type === 'IN' && <ArrowDownRight className="w-5 h-5" />}
              {type === 'OUT' && <ArrowUpRight className="w-5 h-5" />}
              {type === 'TRANSFER' && <ArrowRightLeft className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-black text-sm sm:text-base tracking-tight text-white">
                  {type === 'IN' ? 'บันทึกรับเข้า (Stock IN)' : type === 'OUT' ? 'บันทึกเบิกจ่าย (Stock OUT)' : 'ย้ายตำแหน่งพิกัด (Transfer)'}
                </h3>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700">
                  WMS
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {type === 'IN' && 'รับชิ้นงานเข้าจัดเก็บในคลัง'}
                {type === 'OUT' && 'เบิกชิ้นงานจ่ายเข้าไลน์ผลิต'}
                {type === 'TRANSFER' && 'ย้ายสินค้าจากพิกัดเดิมไปยังพิกัดใหม่'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors shrink-0"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert Banner */}
        {successMessage && (
          <div className="mx-4 mt-3 p-2.5 bg-emerald-950/90 border border-emerald-500 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fadeIn shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">{successMessage}</span>
          </div>
        )}

        {/* Just Learned Alert Banner */}
        {justLearnedMessage && (
          <div className="mx-4 mt-2 p-2 bg-amber-950/80 border border-amber-500/60 rounded-xl text-amber-300 text-xs font-bold flex items-center gap-2 animate-fadeIn shrink-0">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">{justLearnedMessage}</span>
          </div>
        )}

        {/* Validation Error Banner */}
        {validationError && (
          <div className="mx-4 mt-3 p-2.5 bg-rose-950/90 border border-rose-500 rounded-xl text-rose-300 text-xs font-bold flex items-center gap-2 animate-fadeIn shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-3 sm:p-4 space-y-3 flex-1 flex flex-col">
          
          {/* ========================================================================= */}
          {/* 2. TRANSACTION TYPE SWITCHER: IN / OUT / TRANSFER                         */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => setType('IN')}
              className={`h-9 rounded-lg font-black text-xs sm:text-sm flex items-center justify-center gap-1 transition-all ${
                type === 'IN'
                  ? 'bg-emerald-600 text-white shadow-md ring-1 ring-emerald-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>รับเข้า (IN)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setType('OUT');
                if (currentSlotItem) {
                  setActualQty(currentSlotItem.quantity);
                }
              }}
              className={`h-9 rounded-lg font-black text-xs sm:text-sm flex items-center justify-center gap-1 transition-all ${
                type === 'OUT'
                  ? 'bg-blue-600 text-white shadow-md ring-1 ring-blue-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>เบิกออก (OUT)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setType('TRANSFER');
                if (currentSlotItem) {
                  setActualQty(currentSlotItem.quantity);
                }
              }}
              className={`h-9 rounded-lg font-black text-xs sm:text-sm flex items-center justify-center gap-1 transition-all ${
                type === 'TRANSFER'
                  ? 'bg-purple-600 text-white shadow-md ring-1 ring-purple-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>ย้ายพิกัด</span>
            </button>
          </div>

          {/* ========================================================================= */}
          {/* 3. INPUT MODE SWITCHER: SCAN vs MANUAL                                   */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => {
                setInputMode('SCAN');
                setCameraActive(false);
              }}
              className={`py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                inputMode === 'SCAN'
                  ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>สแกน QR / บาร์โค้ด</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setInputMode('MANUAL');
                setCameraActive(false);
              }}
              className={`py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                inputMode === 'MANUAL'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm ring-1 ring-amber-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>คีย์ข้อมูล KANBAN</span>
            </button>
          </div>

          {/* ========================================================================= */}
          {/* SCANNER VIEW (WHEN SCAN MODE ACTIVE)                                      */}
          {/* ========================================================================= */}
          {inputMode === 'SCAN' && (
            <div className="space-y-2 bg-slate-950/70 p-3 rounded-xl border border-slate-800 animate-fadeIn">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-slate-200 flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-blue-400" />
                  <span>ยิงบาร์โค้ด / สแกน KANBAN:</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowItemSearchDrawer(!showItemSearchDrawer)}
                  className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
                >
                  <Search className="w-3 h-3" />
                  <span>ค้นหาชิ้นงาน</span>
                </button>
              </div>

              <div className="relative flex items-center">
                <input
                  type="text"
                  value={scanInput}
                  onChange={(e) => handleRawScanInput(e.target.value)}
                  placeholder="ยิงบาร์โค้ดชิ้นงาน หรือ พิกัดเสา เช่น E6-L1..."
                  className="w-full h-10 bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-lg pl-3 pr-20 text-xs sm:text-sm font-mono font-bold text-blue-300 placeholder-slate-500 focus:outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setCameraActive(!cameraActive)}
                  className={`absolute right-1 h-8 px-2.5 rounded-md text-xs font-bold flex items-center gap-1 shadow-xs ${
                    cameraActive 
                      ? 'bg-rose-600 hover:bg-rose-500 text-white' 
                      : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{cameraActive ? 'ปิด' : 'กล้อง'}</span>
                </button>
              </div>

              {/* Camera Scanner Viewport */}
              {cameraActive && (
                <div className="space-y-1.5 p-2 bg-slate-950 rounded-xl border border-blue-500 shadow-lg mt-2">
                  <div className="flex items-center justify-between px-1 text-white text-xs">
                    <span className="font-bold flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                      <span>กำลังเปิดกล้องสแกน...</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setCameraActive(false)}
                      className="p-1 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <QRScanner onScan={handleQRScanDecoded} onClose={() => setCameraActive(false)} />
                </div>
              )}

              {/* Quick Item Search Drawer */}
              {showItemSearchDrawer && (
                <div className="bg-slate-900 border border-blue-500/40 rounded-xl p-2.5 space-y-2 animate-fadeIn mt-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={itemFilterQuery}
                      onChange={(e) => setItemFilterQuery(e.target.value)}
                      placeholder="ค้นหา Model, Zone หรือ Line..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1 text-xs pr-1">
                    {filteredExistingItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          handleSelectModel(item.modelHE, item.quantity);
                          setZone(item.zone);
                          setBayNumber(item.bayNumber);
                          setLevel(item.level);
                          setUseLine(item.useLine);
                          setShowItemSearchDrawer(false);
                        }}
                        className="w-full text-left p-1.5 rounded-lg bg-slate-950/80 hover:bg-blue-950/60 border border-slate-800 hover:border-blue-500/50 flex items-center justify-between"
                      >
                        <div className="truncate mr-2">
                          <span className="font-mono font-bold text-blue-400">{item.modelHE}</span>
                          <span className="text-[10px] text-slate-400 ml-1.5">Line {item.useLine}</span>
                        </div>
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono font-bold text-[10px]">
                          {item.locatorCode} ({item.quantity} ชิ้น)
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* 4. PARTS NO WITH AUTOCOMPLETE & SMART MEMORY                              */}
          {/* ========================================================================= */}
          <div className="space-y-1.5 bg-slate-950/70 p-3 rounded-xl border border-slate-800 relative" ref={modelDropdownRef}>
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-slate-200 flex items-center gap-1.5">
                <Box className="w-3.5 h-3.5 text-cyan-400" />
                <span>รหัสสินค้า (Parts No / Model):</span>
              </label>
              
              {matchedPart ? (
                <span className="text-[10px] font-bold text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800 truncate max-w-[190px]">
                  {matchedPart.partName || 'พบในแคตตาล็อก'}
                </span>
              ) : isCurrentModelNew ? (
                <button
                  type="button"
                  onClick={() => handleLearnNewPart(modelHE)}
                  className="text-[10px] font-bold text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 px-2 py-0.5 rounded border border-amber-500/40 flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>จดจำ Parts No นี้</span>
                </button>
              ) : null}
            </div>

            {/* Input with interactive autocomplete dropdown */}
            <div className="relative">
              <input
                type="text"
                value={modelHE}
                onFocus={() => {
                  setModelSearchQuery(modelHE);
                  setIsModelDropdownOpen(true);
                }}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setModelHE(val);
                  setModelSearchQuery(val);
                  setIsModelDropdownOpen(true);

                  const match = availableModels.find(m => m.modelHE.toUpperCase() === val);
                  if (match) {
                    setActualQty(match.stdQty);
                    setLabelQty(match.stdQty);
                  }
                }}
                placeholder="พิมพ์บางส่วนของ Parts No เช่น ADL, 749..."
                className="w-full h-10 bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-lg pl-3 pr-9 font-mono font-black text-sm text-cyan-300 placeholder-slate-500 focus:outline-none"
                required
              />

              <button
                type="button"
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dynamic Suggestions Dropdown Menu */}
              {isModelDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-cyan-500/40 rounded-xl shadow-2xl z-40 max-h-56 overflow-y-auto p-1.5 space-y-1 animate-fadeIn">
                  {/* Create New Part Button if not in list */}
                  {isCurrentModelNew && (
                    <button
                      type="button"
                      onClick={() => handleLearnNewPart(modelHE)}
                      className="w-full text-left p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs flex items-center justify-between text-amber-300 font-bold transition-colors group"
                    >
                      <div className="flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                        <span>จดจำ <span className="font-mono font-black text-white">{modelHE}</span> เป็น Parts No ใหม่</span>
                      </div>
                      <span className="text-[10px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.5 rounded">
                        จำเข้าระบบ
                      </span>
                    </button>
                  )}

                  {/* Filtered Available Models */}
                  {filteredModels.length > 0 ? (
                    filteredModels.map((m) => {
                      const isSelected = modelHE.toUpperCase() === m.modelHE.toUpperCase();
                      return (
                        <div
                          key={m.modelHE}
                          onClick={() => handleSelectModel(m.modelHE, m.stdQty)}
                          className={`w-full text-left p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-cyan-950/90 border-cyan-500 text-cyan-200 font-bold'
                              : 'bg-slate-950/50 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="truncate mr-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-black text-white">{m.modelHE}</span>
                              {m.isLearned && (
                                <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1 py-0.2 rounded font-bold">
                                  จดจำแล้ว
                                </span>
                              )}
                            </div>
                            {m.partName && (
                              <div className="text-[10.5px] text-slate-400 truncate">
                                {m.partName}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 font-mono font-bold text-[10px]">
                              {m.stdQty} ชิ้น/พาเลท
                            </span>
                            {m.isLearned && (
                              <button
                                type="button"
                                onClick={(e) => handleDeleteLearnedPart(m.modelHE, e)}
                                className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors"
                                title="ลบออกจากที่จดจำ"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : !isCurrentModelNew && (
                    <div className="text-center py-2 text-slate-500 text-xs">
                      ไม่พบ Parts No ที่ตรงกับการค้นหา
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Chips for Top & Learned Models */}
            <div className="flex items-center gap-1 overflow-x-auto pt-1 no-scrollbar">
              <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-0.5">
                <Bookmark className="w-2.5 h-2.5 text-slate-500" /> แนะนำ:
              </span>
              {availableModels.slice(0, 5).map((m) => (
                <button
                  key={m.modelHE}
                  type="button"
                  onClick={() => handleSelectModel(m.modelHE, m.stdQty)}
                  className={`h-6 px-2 rounded-md font-mono text-[10.5px] font-bold border transition-colors shrink-0 flex items-center gap-1 ${
                    modelHE.toUpperCase() === m.modelHE.toUpperCase()
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-600 hover:text-white'
                  }`}
                >
                  <span>{m.modelHE}</span>
                  {m.isLearned && <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>}
                </button>
              ))}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 5. LOCATOR SECTION (DIFFERENTIATED FOR IN vs OUT vs TRANSFER)             */}
          {/* ========================================================================= */}

          {/* MODE: STOCK OUT (LOCATOR IS LOCKED & DIRECTLY CONNECTED FROM LAYOUT CLICK) */}
          {type === 'OUT' && (
            <div className="bg-slate-950/80 p-3 rounded-xl border border-blue-500/40 space-y-2 shrink-0">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" />
                  <span>พิกัดเบิกจ่าย (เชื่อมโยงจากจุดที่คลิกในผัง):</span>
                </span>
                <span className="font-mono font-black text-amber-300 text-sm">
                  {formatLocatorCode(zone, bayNumber, level)}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <div className="text-[10px] text-slate-400">ตำแหน่งที่เลือก:</div>
                  <div className="font-bold text-white">
                    Zone {zone} &bull; Bay {bayNumber} &bull; ชั้น {level} ({level === 4 ? '5.5m' : level === 3 ? '3.8m' : level === 2 ? '2.1m' : 'พื้น'})
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400">สต็อกคงเหลือในช่องนี้:</div>
                  <div className="font-mono font-black text-emerald-400 text-sm">
                    {currentSlotItem ? `${currentSlotItem.quantity.toLocaleString()} ชิ้น` : 'ว่าง (0 ชิ้น)'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MODE: TRANSFER (SOURCE LOCKED + TARGET SELECTOR) */}
          {type === 'TRANSFER' && (
            <div className="bg-slate-950/80 p-3 rounded-xl border border-purple-500/40 space-y-2.5 shrink-0">
              <div className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                <ArrowRightLeft className="w-3.5 h-3.5 text-purple-400" />
                <span>การย้ายงานไป Locator อื่นๆ (Transfer Location):</span>
              </div>

              {/* Source & Target Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Source Locator (Locked from layout click) */}
                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400 mb-0.5">พิกัดต้นทาง (จุดที่เลือก):</div>
                  <div className="font-mono font-bold text-amber-300 text-xs">
                    {formatLocatorCode(zone, bayNumber, level)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    คงเหลือ: <span className="font-mono font-bold text-white">{currentSlotItem?.quantity || 0} ชิ้น</span>
                  </div>
                </div>

                {/* Target Locator (User Selects) */}
                <div className="p-2 bg-purple-950/30 rounded-lg border border-purple-500/30">
                  <div className="text-[10px] text-purple-300 font-bold mb-0.5 flex items-center gap-1">
                    <ArrowRight className="w-3 h-3 text-purple-400" />
                    <span>พิกัดปลายทางที่ต้องการย้าย:</span>
                  </div>
                  <div className="font-mono font-bold text-emerald-300 text-xs mb-1">
                    {formatLocatorCode(targetZone, targetBayNumber, targetLevel)}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {targetSlotItem ? (
                      <span className="text-amber-400 font-medium">มีสินค้าเดิม {targetSlotItem.quantity} ชิ้น</span>
                    ) : (
                      <span className="text-emerald-400 font-medium">🟢 ช่องว่างพร้อมย้ายเข้า</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Target Location Selectors */}
              <div className="grid grid-cols-3 gap-1.5 text-xs pt-0.5">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">โซนปลายทาง:</label>
                  <select
                    value={targetZone}
                    onChange={(e) => {
                      const newZ = e.target.value as StorageZone;
                      setTargetZone(newZ);
                      const maxB = getMaxBaysForZone(newZ);
                      if (targetBayNumber > maxB) setTargetBayNumber(1);
                    }}
                    className="w-full h-8 bg-slate-900 border border-slate-700 text-white rounded-lg px-1.5 text-xs font-bold focus:outline-none"
                  >
                    {['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'CY3-A', 'CY3-B', 'X1', 'X2', 'R1', 'R2', 'T1'].map(z => (
                      <option key={z} value={z}>{z}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Bay ปลายทาง:</label>
                  <select
                    value={targetBayNumber}
                    onChange={(e) => setTargetBayNumber(Number(e.target.value))}
                    className="w-full h-8 bg-slate-900 border border-slate-700 text-white rounded-lg px-1.5 text-xs font-mono font-bold focus:outline-none"
                  >
                    {Array.from({ length: getMaxBaysForZone(targetZone as string) }, (_, i) => i + 1).map((b) => (
                      <option key={b} value={b}>Bay {b}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">ชั้นปลายทาง:</label>
                  <select
                    value={targetLevel}
                    onChange={(e) => setTargetLevel(Number(e.target.value) as ShelfLevel)}
                    className="w-full h-8 bg-slate-900 border border-slate-700 text-white rounded-lg px-1.5 text-xs font-mono font-bold focus:outline-none"
                  >
                    <option value={1}>L1 (พื้น)</option>
                    <option value={2}>L2 (2.1m)</option>
                    <option value={3}>L3 (3.8m)</option>
                    <option value={4}>L4 (5.5m)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* MODE: STOCK IN (ALLOW CHOOSING / ADJUSTING LOCATOR) */}
          {type === 'IN' && (
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-2 shrink-0">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-slate-200 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>พิกัดจัดเก็บ (Storage Locator):</span>
                </label>
                <span className="font-mono font-bold text-amber-300 text-xs">
                  {formatLocatorCode(zone, bayNumber, level)}
                </span>
              </div>

              {/* Zone & Bay Selectors */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">โซนจัดเก็บ:</label>
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
                    }}
                    className="w-full h-8 bg-slate-900 border border-slate-700 text-white rounded-lg px-2 text-xs font-bold focus:outline-none"
                  >
                    <optgroup label="A4 แร็คมาตรฐาน (B-F)">
                      {['B', 'C', 'D', 'E', 'F'].map(z => (
                        <option key={z} value={z}>แร็ค Zone {z}</option>
                      ))}
                    </optgroup>
                    <optgroup label="A4 แร็คสูง (G-K)">
                      {['G', 'H', 'I', 'J', 'K'].map(z => (
                        <option key={z} value={z}>แร็คสูง Zone {z}</option>
                      ))}
                    </optgroup>
                    <optgroup label="CY3 เต็นท์ (A-D)">
                      {['CY3-A', 'CY3-B', 'CY3-C', 'CY3-D'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </optgroup>
                    <optgroup label="A4 ลานวางพื้น (X1-X8)">
                      {['X1','X2','X3','X4','X5','X6','X7','X8'].map(x => (
                        <option key={x} value={x}>{x} ลานกองพื้น</option>
                      ))}
                    </optgroup>
                    <optgroup label="A2 รางเลื่อน (R1-R16)">
                      {Array.from({ length: 16 }, (_, idx) => `R${idx + 1}`).map(r => (
                        <option key={r} value={r}>รางเลื่อน {r}</option>
                      ))}
                    </optgroup>
                    <optgroup label="A5 เต็นท์วางพื้น (T1-T4)">
                      {['T1', 'T2', 'T3', 'T4'].map(t => (
                        <option key={t} value={t}>เต็นท์ {t}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">ช่วงเสา / ช่องวาง (Bay):</label>
                  <select
                    value={bayNumber}
                    onChange={(e) => setBayNumber(Number(e.target.value))}
                    className="w-full h-8 bg-slate-900 border border-slate-700 text-white rounded-lg px-2 text-xs font-mono font-bold focus:outline-none"
                  >
                    {Array.from({ length: getMaxBaysForZone(zone as string) }, (_, i) => i + 1).map((b) => (
                      <option key={b} value={b}>Bay {b}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Level Selector Buttons */}
              {isRackZone ? (
                <div className="pt-1">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-slate-400 font-bold">เลือกระดับชั้น (Level):</span>
                    {(level === 3 || level === 4) && (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                        ชั้นสูง L{level}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-1.5">
                    {([4, 3, 2, 1] as ShelfLevel[]).map((lvl) => {
                      const item = currentBayItems.find((it) => it.level === lvl);
                      const isSelected = level === lvl;
                      const lvlLabel = lvl === 4 ? 'L4 (5.5m)' : lvl === 3 ? 'L3 (3.8m)' : lvl === 2 ? 'L2 (2.1m)' : 'L1 (พื้น)';

                      return (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setLevel(lvl)}
                          className={`p-1.5 rounded-lg border text-center transition-all flex flex-col items-center justify-center relative ${
                            isSelected
                              ? 'bg-emerald-500/20 border-emerald-400 text-white ring-1 ring-emerald-400'
                              : item
                              ? 'bg-slate-900 border-slate-700 text-slate-300'
                              : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <span className={`text-xs font-mono font-black ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                            {lvlLabel}
                          </span>
                          <div className="text-[9.5px] truncate w-full mt-0.5">
                            {item ? (
                              <span className="text-amber-300 font-bold truncate block">
                                📦 {item.quantity}
                              </span>
                            ) : (
                              <span className="text-emerald-400 font-medium truncate block">
                                🟢 ว่าง
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-emerald-400 flex items-center gap-1.5 bg-emerald-950/40 px-2.5 py-1.5 rounded-lg border border-emerald-800/50">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">พิกัดระดับพื้นราบ: Zone {zone} Bay {bayNumber}</span>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* 6. QUANTITY (CONFIRMATION, "เบิกทั้งหมด", PRESETS: 80 - 300)               */}
          {/* ========================================================================= */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-2.5 shrink-0">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-slate-200 flex items-center gap-1">
                <CheckCircle2 className={`w-3.5 h-3.5 ${type === 'IN' ? 'text-emerald-400' : type === 'OUT' ? 'text-blue-400' : 'text-purple-400'}`} />
                <span>จำนวนชิ้นงาน (Quantity):</span>
              </label>

              {/* "เบิกทั้งหมด" or "ย้ายทั้งหมด" Button */}
              {type === 'OUT' && currentSlotItem && (
                <button
                  type="button"
                  onClick={() => setActualQty(currentSlotItem.quantity)}
                  className="text-[11px] font-bold text-blue-300 hover:text-white bg-blue-500/20 hover:bg-blue-600 px-2.5 py-0.5 rounded-lg border border-blue-500/40 transition-colors flex items-center gap-1 active:scale-95"
                >
                  <Zap className="w-3 h-3 text-blue-400" />
                  <span>เบิกทั้งหมด ({currentSlotItem.quantity.toLocaleString()} ชิ้น)</span>
                </button>
              )}

              {type === 'TRANSFER' && currentSlotItem && (
                <button
                  type="button"
                  onClick={() => setActualQty(currentSlotItem.quantity)}
                  className="text-[11px] font-bold text-purple-300 hover:text-white bg-purple-500/20 hover:bg-purple-600 px-2.5 py-0.5 rounded-lg border border-purple-500/40 transition-colors flex items-center gap-1 active:scale-95"
                >
                  <Zap className="w-3 h-3 text-purple-400" />
                  <span>ย้ายทั้งหมด ({currentSlotItem.quantity.toLocaleString()} ชิ้น)</span>
                </button>
              )}
            </div>

            {/* Stepper Input */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActualQty(prev => Math.max(0, prev - 10))}
                className="w-10 h-10 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 font-black text-lg border border-slate-700 flex items-center justify-center shrink-0 active:scale-95"
              >
                -
              </button>

              <div className="relative flex-1">
                <input
                  type="number"
                  min="1"
                  value={actualQty || ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : Math.max(0, Number(e.target.value));
                    setActualQty(val);
                    setValidationError(null);
                  }}
                  placeholder="กรอกจำนวน..."
                  className={`w-full h-10 bg-slate-900 border rounded-lg text-center text-lg font-mono font-black text-white focus:outline-none ${
                    type === 'IN' ? 'border-slate-700 focus:border-emerald-400' : type === 'OUT' ? 'border-slate-700 focus:border-blue-400' : 'border-slate-700 focus:border-purple-400'
                  }`}
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                  ชิ้น
                </span>
              </div>

              <button
                type="button"
                onClick={() => setActualQty(prev => prev + 10)}
                className="w-10 h-10 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 font-black text-lg border border-slate-700 flex items-center justify-center shrink-0 active:scale-95"
              >
                +
              </button>
            </div>

            {/* Standard Presets (80 100 120 150 180 200 220 250 300) per user exact request */}
            <div className="space-y-1">
              <div className="text-[10.5px] text-slate-400 font-bold flex items-center justify-between">
                <span>จำนวนมาตรฐานที่กำหนด (Standard Lots):</span>
                <button
                  type="button"
                  onClick={() => setActualQty(0)}
                  className="text-[10px] text-slate-500 hover:text-rose-400"
                >
                  ล้างค่า
                </button>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
                {STANDARD_QTY_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setActualQty(preset);
                      setValidationError(null);
                    }}
                    className={`h-7 px-2.5 rounded-lg text-xs font-mono font-bold border transition-all shrink-0 ${
                      actualQty === preset
                        ? type === 'IN'
                          ? 'bg-emerald-500 text-slate-950 font-black border-emerald-400 shadow-sm'
                          : type === 'OUT'
                          ? 'bg-blue-500 text-white font-black border-blue-400 shadow-sm'
                          : 'bg-purple-500 text-white font-black border-purple-400 shadow-sm'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Confirmation Summary Card Before Executing */}
            <div className={`p-2.5 rounded-xl border text-xs space-y-1 ${
              type === 'OUT'
                ? 'bg-blue-950/40 border-blue-500/30 text-blue-200'
                : type === 'TRANSFER'
                ? 'bg-purple-950/40 border-purple-500/30 text-purple-200'
                : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
            }`}>
              <div className="font-bold flex items-center justify-between text-white">
                <span>
                  {type === 'OUT' && '📋 สรุปการเบิกจ่าย (Confirmation):'}
                  {type === 'TRANSFER' && '🔄 สรุปการย้ายพิกัด (Confirmation):'}
                  {type === 'IN' && '📥 สรุปการรับเข้าจัดเก็บ (Confirmation):'}
                </span>
                <span className="font-mono text-sm font-black text-amber-300">
                  {actualQty.toLocaleString()} ชิ้น
                </span>
              </div>

              <div className="text-[11px] text-slate-300 space-y-0.5">
                <div>• รหัสสินค้า: <span className="font-mono font-bold text-white">{modelHE}</span></div>
                <div>• พิกัด: <span className="font-mono font-bold text-amber-300">{formatLocatorCode(zone, bayNumber, level)}</span> {type === 'TRANSFER' ? `➔ ${formatLocatorCode(targetZone, targetBayNumber, targetLevel)}` : `(Line ${useLine})`}</div>
                {type === 'OUT' && currentSlotItem && (
                  <div>
                    • ยอดคงเหลือในช่อง: 
                    <span className={`font-mono font-bold ml-1 ${currentSlotItem.quantity - actualQty === 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {(currentSlotItem.quantity - actualQty).toLocaleString()} ชิ้น
                      {currentSlotItem.quantity - actualQty === 0 && ' (เบิกหมดช่อง/ช่องจะว่าง)'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 7. PRODUCTION INFO: LINE, DATE, TIME                                      */}
          {/* ========================================================================= */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-2 shrink-0">
            {/* Production Line Chips */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-amber-400" />
                <span>ไลน์ผลิตที่เบิก/รับ (Line):</span>
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {useLines.map((line) => {
                  const isActive = useLine === line.id;
                  return (
                    <button
                      key={line.id}
                      type="button"
                      onClick={() => setUseLine(line.id)}
                      className={`h-8 rounded-lg text-xs font-bold transition-all border ${
                        isActive
                          ? 'bg-amber-500 text-slate-950 font-black border-amber-400 shadow-sm'
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      {line.name?.replace('Line ', '') || line.id}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date & Time Row */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <div>
                <div className="flex items-center justify-between text-[11px] mb-0.5">
                  <span className="text-slate-300 font-bold flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" /> วันที่:
                  </span>
                  <button
                    type="button"
                    onClick={setDateToToday}
                    className="text-[9.5px] px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded font-bold"
                  >
                    วันนี้
                  </button>
                </div>
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full h-8 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-lg px-2 font-mono text-xs text-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] mb-0.5">
                  <span className="text-slate-300 font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" /> เวลา:
                  </span>
                  <button
                    type="button"
                    onClick={setTimeToNow}
                    className="text-[9.5px] px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded font-bold"
                  >
                    ตอนนี้
                  </button>
                </div>
                <input
                  type="time"
                  value={manualTime}
                  onChange={(e) => setManualTime(e.target.value)}
                  className="w-full h-8 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-lg px-2 font-mono text-xs text-white focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Compact Live QR Preview */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/90 border border-slate-800 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="bg-white p-0.5 rounded shrink-0">
                  <QRCodeSVG value={composedQRString} size={28} level="M" marginSize={0} />
                </div>
                <div className="truncate">
                  <div className="text-[9.5px] text-slate-400">ชุดข้อมูล KANBAN (QR):</div>
                  <div className="font-mono text-[11px] font-black text-cyan-300 truncate">
                    {composedQRString}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyQRString}
                className="text-[10px] text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 border border-slate-700 flex items-center gap-1 shrink-0"
                title="คัดลอกข้อความ KANBAN"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedQR ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 8. OPTIONAL REMARK & BATCH MODE (PALLET DETAILS COMPLETELY REMOVED)       */}
          {/* ========================================================================= */}
          <div className="border border-slate-800 rounded-xl overflow-hidden shrink-0">
            <button
              type="button"
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              className="w-full px-3 py-2 bg-slate-950/40 hover:bg-slate-900 text-slate-400 flex items-center justify-between text-xs font-medium transition-colors"
            >
              <span>หมายเหตุเพิ่มเติม & โหมดการทำงาน</span>
              <div className="flex items-center gap-1 text-[10px]">
                {showAdvancedSettings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </div>
            </button>

            {showAdvancedSettings && (
              <div className="p-3 bg-slate-950 space-y-2 border-t border-slate-800 animate-fadeIn text-xs">
                {/* Remark Input */}
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">หมายเหตุการดำเนินงาน:</label>
                  <input
                    type="text"
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    placeholder="ระบุหมายเหตุ เช่น งานเร่งด่วน, ย้ายจุดวาง, Lot พิเศษ..."
                    className="w-full h-8 bg-slate-900 border border-slate-700 rounded-lg px-2.5 text-xs text-white placeholder-slate-500"
                  />
                </div>

                {/* Continuous Batch Mode */}
                <div className="flex items-center gap-2 pt-0.5">
                  <input 
                    type="checkbox" 
                    id="batchModeToggle"
                    checked={batchMode}
                    onChange={(e) => setBatchMode(e.target.checked)}
                    className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700"
                  />
                  <label htmlFor="batchModeToggle" className="text-xs text-slate-300 cursor-pointer">
                    บันทึกแบบต่อเนื่อง (Batch Mode - ไม่ปิดหน้าต่างอัตโนมัติ)
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* 9. SUBMIT CONFIRM BUTTON                                                  */}
          {/* ========================================================================= */}
          <div className="pt-1 mt-auto shrink-0">
            <button
              type="submit"
              disabled={!actualQty || actualQty <= 0}
              className={`w-full h-11 rounded-xl font-black text-sm text-white shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.99] ${
                !actualQty || actualQty <= 0
                  ? 'bg-slate-800 cursor-not-allowed text-slate-500'
                  : type === 'IN'
                  ? 'bg-emerald-600 hover:bg-emerald-500 ring-1 ring-emerald-400'
                  : type === 'OUT'
                  ? 'bg-blue-600 hover:bg-blue-500 ring-1 ring-blue-400'
                  : 'bg-purple-600 hover:bg-purple-500 ring-1 ring-purple-400'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>
                {actualQty > 0
                  ? type === 'IN'
                    ? `ยืนยันรับเข้า ${modelHE} (${actualQty.toLocaleString()} ชิ้น)`
                    : type === 'OUT'
                    ? `ยืนยันเบิกจ่าย ${modelHE} (${actualQty.toLocaleString()} ชิ้น)`
                    : `ยืนยันย้าย ${modelHE} (${actualQty.toLocaleString()} ชิ้น) ➔ ${formatLocatorCode(targetZone, targetBayNumber, targetLevel)}`
                  : 'กรุณาระบุจำนวนสินค้า'}
              </span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
