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
    if (z.startsWith('R') || z.startsWith('FR')) return 8;
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
    const railMatch = clean.match(/(?:DA2D-1(?:\.01)?[-_])?(?:FR|R)(1[0-3]|[1-9])[-_\s]*0?([1-8])?/i);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-xs animate-fadeIn">
      {/* POPUP CONTAINER - Visible Frame, Compact Max-Height, No Overflow Spilling */}
      <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl w-full max-w-lg max-h-[85vh] text-slate-100 shadow-2xl relative flex flex-col overflow-hidden">
        
        {/* ========================================================================= */}
        {/* 1. HEADER (CLEAN & MODERN)                                                */}
        {/* ========================================================================= */}
        <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg shrink-0 ${
              type === 'IN' 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                : type === 'OUT'
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
            }`}>
              {type === 'IN' && <ArrowDownRight className="w-4 h-4" />}
              {type === 'OUT' && <ArrowUpRight className="w-4 h-4" />}
              {type === 'TRANSFER' && <ArrowRightLeft className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-black text-sm tracking-tight text-white flex items-center gap-1.5">
                <span>
                  {type === 'IN' ? '📥 รับเข้าสินค้า (Stock IN)' : type === 'OUT' ? '📤 เบิกออกสินค้า (Stock OUT)' : '🔄 ย้ายพิกัดสินค้า (Transfer)'}
                </span>
                <span className="text-[9.5px] font-mono px-1 py-0.2 bg-slate-800 text-slate-400 rounded">
                  {formatLocatorCode(zone, bayNumber, level)}
                </span>
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors shrink-0"
            title="ปิดหน้าต่าง"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* 2. TRANSACTION TYPE SWITCHER (IN / OUT / TRANSFER)                        */}
        {/* ========================================================================= */}
        <div className="px-3 pt-2 pb-1 bg-slate-950/40 shrink-0">
          <div className="grid grid-cols-3 gap-1 p-0.5 bg-slate-950 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setType('IN')}
              className={`h-8 rounded-lg font-black text-xs flex items-center justify-center gap-1 transition-all ${
                type === 'IN'
                  ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
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
              className={`h-8 rounded-lg font-black text-xs flex items-center justify-center gap-1 transition-all ${
                type === 'OUT'
                  ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
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
              className={`h-8 rounded-lg font-black text-xs flex items-center justify-center gap-1 transition-all ${
                type === 'TRANSFER'
                  ? 'bg-purple-600 text-white shadow-sm ring-1 ring-purple-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>ย้ายพิกัด</span>
            </button>
          </div>
        </div>

        {/* Success Alert Banner */}
        {successMessage && (
          <div className="mx-3 mt-1.5 p-2 bg-emerald-950/90 border border-emerald-500 rounded-lg text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fadeIn shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">{successMessage}</span>
          </div>
        )}

        {/* Validation Error Banner */}
        {validationError && (
          <div className="mx-3 mt-1.5 p-2 bg-rose-950/90 border border-rose-500 rounded-lg text-rose-300 text-xs font-bold flex items-center gap-2 animate-fadeIn shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="truncate">{validationError}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. SCROLLABLE FORM BODY (CONCISE & UNCLUTTERED)                            */}
        {/* ========================================================================= */}
        <form onSubmit={handleSubmit} className="px-3 sm:px-4 py-2 space-y-2.5 overflow-y-auto flex-1 text-xs">

          {/* Quick Scan / Barcode One-Liner */}
          <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800 flex items-center gap-1.5">
            <div className="relative flex-1 flex items-center">
              <QrCode className="w-3.5 h-3.5 text-blue-400 absolute left-2.5 pointer-events-none" />
              <input
                type="text"
                value={scanInput}
                onChange={(e) => handleRawScanInput(e.target.value)}
                placeholder="ยิงบาร์โค้ด หรือ พิมพ์ KANBAN..."
                className="w-full h-8 bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-lg pl-8 pr-16 text-xs font-mono text-blue-300 placeholder-slate-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setCameraActive(!cameraActive)}
                className={`absolute right-1 h-6 px-2 rounded text-[11px] font-bold flex items-center gap-1 ${
                  cameraActive 
                    ? 'bg-rose-600 hover:bg-rose-500 text-white' 
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                <Camera className="w-3 h-3" />
                <span>{cameraActive ? 'ปิด' : 'กล้อง'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowItemSearchDrawer(!showItemSearchDrawer)}
              className="h-8 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold border border-slate-700 flex items-center gap-1 shrink-0"
              title="ค้นหารายการชิ้นงานในคลัง"
            >
              <Search className="w-3 h-3 text-cyan-400" />
              <span className="hidden sm:inline">ค้นหา</span>
            </button>
          </div>

          {/* Camera Scanner Viewport if active */}
          {cameraActive && (
            <div className="p-2 bg-slate-950 rounded-xl border border-blue-500 shadow-lg">
              <div className="flex items-center justify-between pb-1 text-white text-[11px]">
                <span className="font-bold flex items-center gap-1 text-blue-400">
                  <Camera className="w-3 h-3 animate-pulse" />
                  <span>กำลังสแกนผ่านกล้อง...</span>
                </span>
                <button
                  type="button"
                  onClick={() => setCameraActive(false)}
                  className="p-0.5 text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <QRScanner onScan={handleQRScanDecoded} onClose={() => setCameraActive(false)} />
            </div>
          )}

          {/* Search Drawer if active */}
          {showItemSearchDrawer && (
            <div className="bg-slate-950 border border-blue-500/40 rounded-xl p-2 space-y-1.5 animate-fadeIn">
              <input
                type="text"
                value={itemFilterQuery}
                onChange={(e) => setItemFilterQuery(e.target.value)}
                placeholder="ค้นหา Model, Zone หรือ Line..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                autoFocus
              />
              <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
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
                    className="w-full text-left p-1.5 rounded bg-slate-900 hover:bg-blue-950/60 border border-slate-800 flex items-center justify-between"
                  >
                    <div className="truncate mr-2">
                      <span className="font-mono font-bold text-blue-400">{item.modelHE}</span>
                      <span className="text-[10px] text-slate-400 ml-1.5">{item.partName} (Line {item.useLine})</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono font-bold text-[10px]">
                      {item.locatorCode} ({item.quantity} ชิ้น)
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* FIELD 1: MODEL HE / PART NO */}
          <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 relative" ref={modelDropdownRef}>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-300 flex items-center gap-1 text-[11px]">
                <Box className="w-3.5 h-3.5 text-cyan-400" />
                <span>รหัสสินค้า (Parts No / Model HE):</span>
              </label>
              {matchedPart?.partName && (
                <span className="text-[10px] text-cyan-300 font-bold truncate max-w-[200px]">
                  {matchedPart.partName}
                </span>
              )}
            </div>

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
                placeholder="กรอก Parts No..."
                className="w-full h-8 bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-lg pl-2.5 pr-8 font-mono font-black text-xs text-cyan-300 placeholder-slate-500 focus:outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Suggestions Dropdown */}
              {isModelDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-cyan-500/50 rounded-xl shadow-2xl z-40 max-h-40 overflow-y-auto p-1 space-y-1 animate-fadeIn">
                  {filteredModels.map((m) => (
                    <div
                      key={m.modelHE}
                      onClick={() => handleSelectModel(m.modelHE, m.stdQty)}
                      className="w-full text-left p-1.5 rounded-lg bg-slate-950/70 hover:bg-slate-800 border border-slate-800 text-xs flex items-center justify-between cursor-pointer"
                    >
                      <div className="truncate mr-2">
                        <span className="font-mono font-black text-white">{m.modelHE}</span>
                        {m.partName && <span className="text-[10px] text-slate-400 ml-1.5 truncate">{m.partName}</span>}
                      </div>
                      <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 font-mono font-bold text-[10px]">
                        {m.stdQty} ชิ้น
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Chips for Models */}
            <div className="flex items-center gap-1 overflow-x-auto pt-1.5 no-scrollbar">
              <span className="text-[9.5px] text-slate-500 shrink-0">แนะนำ:</span>
              {availableModels.slice(0, 4).map((m) => (
                <button
                  key={m.modelHE}
                  type="button"
                  onClick={() => handleSelectModel(m.modelHE, m.stdQty)}
                  className={`h-5 px-1.5 rounded font-mono text-[10px] font-bold border transition-colors shrink-0 ${
                    modelHE.toUpperCase() === m.modelHE.toUpperCase()
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {m.modelHE}
                </button>
              ))}
            </div>
          </div>

          {/* FIELD 2: LOCATOR (IN / OUT / TRANSFER) */}
          {type === 'IN' && (
            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <label className="font-bold text-slate-300 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>พิกัดจัดเก็บ (Storage Locator):</span>
                </label>
                <span className="font-mono font-black text-amber-300 text-xs">
                  {formatLocatorCode(zone, bayNumber, level)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">โซน:</label>
                  <select
                    value={zone}
                    onChange={(e) => {
                      const newZ = e.target.value as StorageZone;
                      setZone(newZ);
                      const maxB = getMaxBaysForZone(newZ);
                      setBayNumber(Math.min(bayNumber, maxB));
                      const newL = (newZ.startsWith('X') || newZ.startsWith('R') || newZ.startsWith('T') || newZ.startsWith('FR')) ? 1 : level;
                      setLevel(newL as ShelfLevel);
                    }}
                    className="w-full h-7 bg-slate-900 border border-slate-700 text-white rounded-lg px-1.5 text-xs font-bold focus:outline-none"
                  >
                    <optgroup label="A4 แร็คมาตรฐาน (B-F)">
                      {['B', 'C', 'D', 'E', 'F'].map(z => <option key={z} value={z}>แร็ค Zone {z}</option>)}
                    </optgroup>
                    <optgroup label="A4 แร็คสูง (G-K)">
                      {['G', 'H', 'I', 'J', 'K'].map(z => <option key={z} value={z}>แร็คสูง Zone {z}</option>)}
                    </optgroup>
                    <optgroup label="CY3 เต็นท์">
                      {['CY3-A', 'CY3-B', 'CY3-C', 'CY3-D'].map(c => <option key={c} value={c}>{c}</option>)}
                    </optgroup>
                    <optgroup label="A4 ลานวางพื้น (X1-X8)">
                      {['X1','X2','X3','X4','X5','X6','X7','X8'].map(x => <option key={x} value={x}>{x} ลานกองพื้น</option>)}
                    </optgroup>
                    <optgroup label="A2 รางเลื่อน (R1-R13)">
                      {Array.from({ length: 13 }, (_, idx) => `R${idx + 1}`).map(r => <option key={r} value={r}>รางเลื่อน {r}</option>)}
                    </optgroup>
                    <optgroup label="A5 เต็นท์วางพื้น (T1-T4)">
                      {['T1', 'T2', 'T3', 'T4'].map(t => <option key={t} value={t}>เต็นท์ {t}</option>)}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">ช่วงเสา / Bay:</label>
                  <select
                    value={bayNumber}
                    onChange={(e) => setBayNumber(Number(e.target.value))}
                    className="w-full h-7 bg-slate-900 border border-slate-700 text-white rounded-lg px-1.5 text-xs font-mono font-bold focus:outline-none"
                  >
                    {Array.from({ length: getMaxBaysForZone(zone as string) }, (_, i) => i + 1).map((b) => (
                      <option key={b} value={b}>Bay {b}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Level Selector Buttons */}
              {isRackZone && (
                <div className="pt-1">
                  <div className="grid grid-cols-4 gap-1">
                    {([4, 3, 2, 1] as ShelfLevel[]).map((lvl) => {
                      const item = currentBayItems.find((it) => it.level === lvl);
                      const isSelected = level === lvl;
                      return (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setLevel(lvl)}
                          className={`py-1 rounded-md text-center transition-all text-xs font-bold border ${
                            isSelected
                              ? 'bg-emerald-600 text-white border-emerald-400 shadow-xs'
                              : item
                              ? 'bg-slate-900 border-slate-700 text-amber-300'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          L{lvl} {item ? `(${item.quantity})` : '• ว่าง'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {type === 'OUT' && (
            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-blue-500/40 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">พิกัดเบิกออก (ต้นทาง):</span>
                <span className="font-mono font-black text-amber-300 text-sm">
                  {formatLocatorCode(zone, bayNumber, level)}
                </span>
                <span className="text-[10.5px] text-slate-400 ml-1.5">
                  (Zone {zone} &bull; Bay {bayNumber} &bull; ชั้น {level})
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">สต็อกในช่อง:</span>
                <span className="font-mono font-black text-emerald-400 text-sm">
                  {currentSlotItem ? `${currentSlotItem.quantity.toLocaleString()} ชิ้น` : 'ว่าง (0)'}
                </span>
              </div>
            </div>
          )}

          {type === 'TRANSFER' && (
            <div className="bg-slate-950/70 p-3 rounded-xl border border-purple-500/40 space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-1 border-b border-purple-900/40">
                <div>
                  <span className="text-[10px] text-slate-400 block">พิกัดต้นทาง (Origin):</span>
                  <span className="font-mono font-bold text-amber-300">
                    {formatLocatorCode(zone, bayNumber, level)}
                  </span>
                  <span className="text-[10px] text-slate-400 ml-1">
                    ({currentSlotItem?.quantity || 0} ชิ้น)
                  </span>
                </div>
                <div className="flex items-center gap-1 text-purple-300 font-bold">
                  <span>➔ ย้ายไป</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-purple-300 block font-bold">พิกัดปลายทางใหม่ (Destination):</span>
                  <span className="font-mono font-black text-emerald-300 text-sm">
                    {formatLocatorCode(targetZone, targetBayNumber, targetLevel)}
                  </span>
                </div>
              </div>

              {/* Quick Zone Selector Pills */}
              <div>
                <label className="block text-[10px] font-bold text-slate-300 mb-1">1. เลือกโซนปลายทาง (Zone):</label>
                <div className="flex flex-wrap gap-1">
                  {['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'CY3-A', 'CY3-B', 'X1'].map((z) => {
                    const isSel = targetZone === z;
                    return (
                      <button
                        key={z}
                        type="button"
                        onClick={() => {
                          setTargetZone(z as StorageZone);
                          const maxB = getMaxBaysForZone(z as StorageZone);
                          if (targetBayNumber > maxB) setTargetBayNumber(1);
                        }}
                        className={`h-7 px-2.5 rounded-lg text-xs font-black transition-all border ${
                          isSel
                            ? 'bg-purple-600 text-white border-purple-400 shadow-sm ring-1 ring-purple-400'
                            : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                        }`}
                      >
                        {z}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bay & Level Selection in a clean row */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                {/* Bay Number Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-slate-300">2. เลือก Bay ปลายทาง:</label>
                    <span className="text-[10px] font-mono text-purple-300 font-bold">Bay {targetBayNumber}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setTargetBayNumber(prev => Math.max(1, prev - 1))}
                      className="w-7 h-7 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-white font-bold rounded-lg flex items-center justify-center shrink-0"
                    >
                      -
                    </button>
                    <select
                      value={targetBayNumber}
                      onChange={(e) => setTargetBayNumber(Number(e.target.value))}
                      className="flex-1 h-7 bg-slate-900 border border-slate-700 text-white rounded-lg px-2 text-xs font-mono font-bold focus:outline-none"
                    >
                      {Array.from({ length: getMaxBaysForZone(targetZone as string) }, (_, i) => i + 1).map((b) => (
                        <option key={b} value={b}>Bay {b}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const maxB = getMaxBaysForZone(targetZone as string);
                        setTargetBayNumber(prev => Math.min(maxB, prev + 1));
                      }}
                      className="w-7 h-7 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-white font-bold rounded-lg flex items-center justify-center shrink-0"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Level Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-slate-300">3. เลือกระดับชั้น:</label>
                    <span className="text-[10px] font-mono text-purple-300 font-bold">L{targetLevel}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {([1, 2, 3, 4] as ShelfLevel[]).map((lvl) => {
                      const isSel = targetLevel === lvl;
                      return (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setTargetLevel(lvl)}
                          className={`h-7 rounded-lg text-xs font-mono font-black border transition-all ${
                            isSel
                              ? 'bg-purple-600 text-white border-purple-400 shadow-sm'
                              : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                          }`}
                        >
                          L{lvl}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FIELD 3: QUANTITY (STEPPER + COMPACT PRESETS + ALL BUTTON) */}
          <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <label className="font-bold text-slate-300 flex items-center gap-1">
                <CheckCircle2 className={`w-3.5 h-3.5 ${type === 'IN' ? 'text-emerald-400' : type === 'OUT' ? 'text-blue-400' : 'text-purple-400'}`} />
                <span>จำนวนชิ้นงาน (Quantity):</span>
              </label>

              {(type === 'OUT' || type === 'TRANSFER') && currentSlotItem && (
                <button
                  type="button"
                  onClick={() => setActualQty(currentSlotItem.quantity)}
                  className="text-[10.5px] font-bold text-amber-300 hover:text-white bg-amber-500/20 hover:bg-amber-600 px-2 py-0.5 rounded border border-amber-500/40 transition-colors flex items-center gap-1"
                >
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>{type === 'OUT' ? 'เบิกทั้งหมด' : 'ย้ายทั้งหมด'} ({currentSlotItem.quantity.toLocaleString()} ชิ้น)</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActualQty(prev => Math.max(0, prev - 10))}
                className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 font-black text-base border border-slate-700 flex items-center justify-center shrink-0 active:scale-95"
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
                  className={`w-full h-8 bg-slate-900 border rounded-lg text-center text-base font-mono font-black text-white focus:outline-none ${
                    type === 'IN' ? 'border-slate-700 focus:border-emerald-400' : type === 'OUT' ? 'border-slate-700 focus:border-blue-400' : 'border-slate-700 focus:border-purple-400'
                  }`}
                  required
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 pointer-events-none">
                  ชิ้น
                </span>
              </div>

              <button
                type="button"
                onClick={() => setActualQty(prev => prev + 10)}
                className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 font-black text-base border border-slate-700 flex items-center justify-center shrink-0 active:scale-95"
              >
                +
              </button>

              {/* Quick Lots */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0 pl-1">
                {[80, 100, 120, 150, 200].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setActualQty(preset);
                      setValidationError(null);
                    }}
                    className={`h-8 px-2 rounded-lg text-xs font-mono font-bold border transition-all ${
                      actualQty === preset
                        ? type === 'IN'
                          ? 'bg-emerald-500 text-slate-950 font-black border-emerald-400'
                          : type === 'OUT'
                          ? 'bg-blue-500 text-white font-black border-blue-400'
                          : 'bg-purple-500 text-white font-black border-purple-400'
                        : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* FIELD 4: PRODUCTION LINE & DATE (ONE COMPACT ROW) */}
          <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-400 mb-0.5 font-bold">
                  {type === 'OUT' ? 'ไลน์ที่นำไปใช้ (Usage Line):' : 'ไลน์ผลิต (Use Line):'}
                </label>
                <div className="grid grid-cols-5 gap-1">
                  {useLines.map((line) => {
                    const isActive = useLine === line.id;
                    return (
                      <button
                        key={line.id}
                        type="button"
                        onClick={() => setUseLine(line.id)}
                        className={`h-7 rounded text-[11px] font-bold border transition-all ${
                          isActive
                            ? 'bg-amber-500 text-slate-950 font-black border-amber-400'
                            : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {line.name?.replace('Line ', '') || line.id}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                  <span className="font-bold">วันที่บันทึก:</span>
                  <button
                    type="button"
                    onClick={setDateToToday}
                    className="text-[9px] text-amber-400 hover:underline"
                  >
                    วันนี้
                  </button>
                </div>
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full h-7 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded px-2 font-mono text-xs text-white focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Optional Remark Input */}
            <div className="pt-1">
              <input
                type="text"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="หมายเหตุเพิ่มเติม (ถ้ามี เช่น Lot พิเศษ, งานด่วน)..."
                className="w-full h-7 bg-slate-900 border border-slate-800 focus:border-slate-600 rounded px-2 text-[11px] text-white placeholder-slate-500 focus:outline-none"
              />
            </div>
          </div>

        </form>

        {/* ========================================================================= */}
        {/* 4. FIXED FOOTER (VISIBLE FRAME, CLEAR CANCEL & CONFIRM BUTTONS)            */}
        {/* ========================================================================= */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition-colors shrink-0"
          >
            ยกเลิก
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!actualQty || actualQty <= 0}
            className={`flex-1 h-10 rounded-xl font-black text-xs sm:text-sm text-white shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-[0.99] ${
              !actualQty || actualQty <= 0
                ? 'bg-slate-800 cursor-not-allowed text-slate-500'
                : type === 'IN'
                ? 'bg-emerald-600 hover:bg-emerald-500 ring-1 ring-emerald-400'
                : type === 'OUT'
                ? 'bg-blue-600 hover:bg-blue-500 ring-1 ring-blue-400'
                : 'bg-purple-600 hover:bg-purple-500 ring-1 ring-purple-400'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>
              {actualQty > 0
                ? type === 'IN'
                  ? `ยืนยันรับเข้า (${actualQty.toLocaleString()} ชิ้น)`
                  : type === 'OUT'
                  ? `ยืนยันเบิกออก (${actualQty.toLocaleString()} ชิ้น)`
                  : `ยืนยันย้าย (${actualQty.toLocaleString()} ชิ้น) ➔ ${formatLocatorCode(targetZone, targetBayNumber, targetLevel)}`
                : 'กรุณาระบุจำนวน'}
            </span>
          </button>
        </div>

      </div>
    </div>
  );
};
