import React, { useState, useEffect } from 'react';
import { InventoryItem, MasterDataItem, MovementType, ShelfLevel, StorageZone, UseLineMaster } from '../types';
import { 
  X, 
  QrCode, 
  CheckCircle2, 
  AlertCircle,
  ArrowDownRight, 
  ArrowUpRight, 
  Camera, 
  Search, 
  Zap, 
  Repeat, 
  Box, 
  MapPin,
  ChevronDown,
  ChevronUp,
  Sliders,
  Edit3,
  Layers
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
  const [isEditingModel, setIsEditingModel] = useState<boolean>(false);
  const [zone, setZone] = useState<StorageZone>(initialZone);
  const [bayNumber, setBayNumber] = useState<number>(initialBayNumber);
  const [level, setLevel] = useState<ShelfLevel>(initialLevel);
  const [showManualLocatorPicker, setShowManualLocatorPicker] = useState<boolean>(false);
  const [labelQty, setLabelQty] = useState<number>(600);
  const [actualQty, setActualQty] = useState<number>(600);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [useLine, setUseLine] = useState<string>('HE2');
  const [remark, setRemark] = useState<string>('');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [batchMode, setBatchMode] = useState<boolean>(false);
  const [itemFilterQuery, setItemFilterQuery] = useState<string>('');
  const [showItemSearchDrawer, setShowItemSearchDrawer] = useState<boolean>(false);

  // Collapsible Advanced Pallet Tools
  const [showAdvancedTools, setShowAdvancedTools] = useState<boolean>(false);
  const [calcMode, setCalcMode] = useState<'PALLET' | 'DIRECT'>('DIRECT');
  const [stdQtyPerPalletInput, setStdQtyPerPalletInput] = useState<number>(80);
  const [fullPalletsInput, setFullPalletsInput] = useState<number>(1);
  const [looseQtyInput, setLooseQtyInput] = useState<number>(0);

  // Filter existing items for quick search drawer
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
      const initialLoc = formatLocatorCode(initialZone, initialBayNumber, initialLevel);
      setLocatorScanInput(initialLoc);
      setType(initialMode);
      setSuccessMessage(null);
      setValidationError(null);
      setShowManualLocatorPicker(false);
      setIsEditingModel(false);

      if (String(initialZone).startsWith('CY3') || String(initialZone).startsWith('DY3T')) {
        const rowCode = String(initialZone).replace('CY3-', '');
        const rowNum = rowCode === 'A' ? '1.01' : rowCode === 'B' ? '1.02' : rowCode === 'C' ? '1.03' : '1.04';
        setLocatorDetectedMsg(`⛺ เต็นท์ CY3: แถว ${rowCode} Bay ${rowCode}${initialBayNumber} ชั้น ${initialLevel} (DY3T-${rowNum}-${rowCode}${initialBayNumber}-L${initialLevel})`);
      } else {
        setLocatorDetectedMsg(null);
      }

      // Pre-fill existing item if present at level
      const found = existingItems.find(
        (it) => it.zone === initialZone && it.bayNumber === initialBayNumber && it.level === initialLevel
      );

      if (found) {
        setModelHE(found.modelHE);
        setLabelQty(found.quantity);
        setActualQty(found.quantity);
        setUseLine(found.useLine);
        setScanInput(found.qrCode || `${found.modelHE}_2026-07-01_${found.useLine}_${found.quantity}`);
      } else {
        setScanInput('ADL74920904_2026-06-25_09:27_HE2_600');
        setModelHE('ADL74920904');
        setLabelQty(600);
        setActualQty(600);
        setUseLine('HE2');
      }
    }
  }, [isOpen, initialZone, initialBayNumber, initialLevel, initialMode, existingItems]);

  if (!isOpen) return null;

  // Determine current Zone Category & Max Bay limits
  const isA4FloorStaging = (zone as string).startsWith('X');
  const isA2FlowRail = (zone as string).startsWith('R') || (zone as string).startsWith('FR');
  const isA5Tent = (zone as string).startsWith('T') || (zone as string).startsWith('DA5T');
  const isCY3Tent = (zone as string).startsWith('CY3') || (zone as string).startsWith('DY3T');
  const isRackZone = !isA4FloorStaging && !isA2FlowRail && !isA5Tent; // CY3 Tent or A4 Rack (B-K)

  // Current items in this bay across all levels
  const currentBayItems = existingItems.filter(
    (it) => it.zone === zone && it.bayNumber === bayNumber
  );
  const activeLevelItem = currentBayItems.find((it) => it.level === level);

  const handleSelectLevel = (targetLvl: ShelfLevel) => {
    setLevel(targetLvl);
    const newLoc = formatLocatorCode(zone, bayNumber, targetLvl);
    setLocatorScanInput(newLoc);

    if (isCY3Tent) {
      const rowCode = (zone as string).replace('CY3-', '');
      const rowNum = rowCode === 'A' ? '1.01' : rowCode === 'B' ? '1.02' : rowCode === 'C' ? '1.03' : '1.04';
      setLocatorDetectedMsg(`⛺ เต็นท์ CY3: แถว ${rowCode} Bay ${rowCode}${bayNumber} ชั้น ${targetLvl} (DY3T-${rowNum}-${rowCode}${bayNumber}-L${targetLvl})`);
    } else if (!isA4FloorStaging && !isA2FlowRail && !isA5Tent) {
      setLocatorDetectedMsg(`พิกัด: Zone ${zone} Bay ${bayNumber} ชั้น ${targetLvl}`);
    }

    // Auto-populate item data in OUT mode if found
    const targetItem = currentBayItems.find((it) => it.level === targetLvl);
    if (targetItem) {
      if (type === 'OUT') {
        setModelHE(targetItem.modelHE);
        setLabelQty(targetItem.quantity);
        setActualQty(targetItem.quantity);
        setUseLine(targetItem.useLine);
        setScanInput(targetItem.qrCode || `${targetItem.modelHE}_2026-07-01_${targetItem.useLine}_${targetItem.quantity}`);
      }
    }
  };

  const getMaxBaysForZone = (z: string): number => {
    if (['B', 'C', 'D', 'E', 'F'].includes(z)) return 12;
    if (['G', 'H', 'I', 'J', 'K'].includes(z)) return 5;
    if (z.startsWith('CY3') || z.startsWith('DY3T')) return 25;
    if (z.startsWith('X')) return 12;
    if (z.startsWith('R') || z.startsWith('FR')) return 8;
    if (z.startsWith('T') || z.startsWith('DA5T')) return 20;
    return 12;
  };

  const getBayLabelForZone = (z: string): string => {
    if (['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'].includes(z)) return 'ช่วงเสา (Bay):';
    if (z.startsWith('CY3') || z.startsWith('DY3T')) return 'ช่วงเสา (Bay 1-25):';
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
      const rowNum = floorMatch[2] ? parseInt(floorMatch[2], 10) : undefined;
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
      setLocatorDetectedMsg(`🏗️ ลานกองพื้น A4: DA4D-1 ${xGroup} Col ${String(colNum).padStart(2, '0')}`);

      const existing = existingItems.find(i => 
        (i.zone === xGroup && i.bayNumber === colNum) || 
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
      setLocatorDetectedMsg(`🛞 รางเลื่อน A2: DA2D-1 Rail R${railNum} Pos ${String(posNum).padStart(2, '0')}`);

      const existing = existingItems.find(i => 
        (i.zone === railZone && i.bayNumber === posNum) || 
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
      setLocatorDetectedMsg(`⛺ ลานเต็นท์ A5: DAST-${tentNum}.01 Tent ${tentZone} Slot ${slotNum}`);

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

    // 3.5 CY3 Tent Yard (DY3T-1.01 to DY3T-1.04, CY3-A to CY3-D, 4 Levels): e.g. "DY3T-1.01-A1-L1", "DY3T-1.01-A12-L4", "DY3T-1.02-B25-L2", "DY3T-1.04-D22-L3"
    const cy3Match = clean.match(/(?:DY3T[-_]1\.0([1-4])|CY3[-_]([A-D])|DY3T[-_]([A-D]))[-_\s]*(?:([A-D])?0?([1-9]|1[0-9]|2[0-5]))(?:[-_\s]*(?:LEVEL|LVL|L)?[-_\s]*([1-4]))?/i);
    if (cy3Match && (clean.includes('DY3T') || clean.includes('CY3'))) {
      const numCode = cy3Match[1];
      const letterCode = cy3Match[2] || cy3Match[3] || cy3Match[4];
      const rowLetter = letterCode ? letterCode.toUpperCase() : (numCode === '1' ? 'A' : numCode === '2' ? 'B' : numCode === '3' ? 'C' : 'D');
      const bNum = cy3Match[5] ? parseInt(cy3Match[5], 10) : 1;
      const lNum = cy3Match[6] ? (parseInt(cy3Match[6], 10) as ShelfLevel) : 1;
      const cy3Zone = `CY3-${rowLetter}` as StorageZone;
      const rowNum = rowLetter === 'A' ? '1.01' : rowLetter === 'B' ? '1.02' : rowLetter === 'C' ? '1.03' : '1.04';
      const locTag = `DY3T-${rowNum}-${rowLetter}${bNum}-L${lNum}`;

      setZone(cy3Zone);
      setBayNumber(bNum);
      setLevel(lNum);
      setLocatorDetectedMsg(`⛺ เต็นท์ CY3: แถว ${rowLetter} Bay ${rowLetter}${bNum} ชั้น ${lNum} (${locTag})`);

      const existing = existingItems.find(i => 
        (i.zone === cy3Zone && i.bayNumber === bNum && i.level === lNum) ||
        (i.locatorCode.includes(`DY3T-${rowNum}-${rowLetter}${bNum}-L${lNum}`)) ||
        (i.locatorCode.includes(`-${rowLetter}${bNum}-L${lNum}`)) ||
        (i.locatorCode.includes(`-${String(bNum).padStart(2, '0')}-L${lNum}`))
      );
      if (existing) {
        setModelHE(existing.modelHE);
        setUseLine(existing.useLine);
        if (type === 'OUT') {
          setLabelQty(existing.quantity);
          setActualQty(existing.quantity);
          setScanInput(existing.qrCode || `${existing.modelHE}_2026-07-01_${existing.useLine}_${existing.quantity}`);
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
        
        const bldgArea = isHigh ? 'A4 High Rack (DA4D-3)' : 'A4 Selective Rack (DA4D-2)';
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

  // Auto Parse Product QR Code string
  const handleScanInputChange = (raw: string) => {
    setScanInput(raw);
    if (!raw.trim()) return;

    // If user scanned a locator tag into product input, redirect to locator
    const clean = raw.trim().toUpperCase();
    if (/^(?:LOC[-_]|DA4D|DA2D|DAST|DA5T)?[B-K|X|R|T](?:[1-9]|1[0-9]|20)?(?:[-_]L?[1-4])?$/i.test(clean)) {
      handleLocatorInputChange(clean);
      return;
    }

    // Pattern example: "ADL74920904_2026-06-25_09:27_HE2_600"
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
      setSuccessMessage(`📍 สแกนพิกัดสำเร็จ: ${decodedText}`);
    } else {
      const clean = decodedText.trim().toUpperCase();
      if (/^(?:DA4D|DA2D|DAST|DA5T|LOC[-_])?[B-K|X|R|T](?:[1-9]|1[0-9]|20)?(?:[-_]L?[1-4])?$/i.test(clean)) {
        handleLocatorInputChange(clean);
        setSuccessMessage(`📍 ตรวจพบว่าเป็น QR พิกัดเสา: ${decodedText}`);
      } else {
        handleScanInputChange(decodedText);
        setSuccessMessage(`📦 สแกนป้ายสินค้าสำเร็จ: ${decodedText}`);
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
  const matchedPart = existingItems.find(i => i.modelHE === modelHE) || masterData.find(m => m.modelHE === modelHE);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!actualQty || actualQty <= 0) {
      setValidationError('⚠️ กรุณาระบุจำนวนสินค้าให้มากกว่า 0');
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

    setSuccessMessage(`✅ บันทึกสแกน ${type === 'IN' ? 'รับเข้า' : 'เบิกจ่าย'} ${modelHE} ตำแหน่ง ${zone}${bayNumber}-L${level} (${actualQty.toLocaleString()} ชิ้น) สำเร็จ!`);
    
    if (batchMode) {
      setScanInput('');
      setRemark('');
      setTimeout(() => {
        setSuccessMessage(null);
      }, 2000);
    } else {
      setTimeout(() => {
        onClose();
      }, 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
      {/* MOBILE-RESPONSIVE CLEAN CONTAINER */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md max-h-[92dvh] overflow-y-auto overscroll-contain p-3.5 sm:p-5 text-slate-100 shadow-2xl relative flex flex-col">
        
        {/* CLEAN HEADER */}
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl shrink-0 ${type === 'IN' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-black text-sm sm:text-base tracking-tight text-white">
                  สแกน QR Code คลังสินค้า
                </h3>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded border border-slate-700">
                  A2/A4/A5
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                แร็ค, ลานกองพื้น, รางเลื่อน และเต็นท์
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
          <div className="my-2 p-2 bg-emerald-950/80 border border-emerald-600 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fadeIn shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">{successMessage}</span>
          </div>
        )}

        {/* Validation Error Banner */}
        {validationError && (
          <div className="my-2 p-2 bg-rose-950/80 border border-rose-600 rounded-xl text-rose-300 text-xs font-bold flex items-center gap-2 animate-fadeIn shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-2.5 space-y-2.5 flex-1 flex flex-col">
          
          {/* 1. MOVEMENT TYPE SWITCHER (IN / OUT) */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => setType('IN')}
              className={`h-9 rounded-lg font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all active:scale-98 ${
                type === 'IN'
                  ? 'bg-emerald-600 text-white shadow-md ring-1 ring-emerald-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <ArrowDownRight className="w-4 h-4" />
              <span>รับเข้าจัดเก็บ (IN)</span>
            </button>

            <button
              type="button"
              onClick={() => setType('OUT')}
              className={`h-9 rounded-lg font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all active:scale-98 ${
                type === 'OUT'
                  ? 'bg-blue-600 text-white shadow-md ring-1 ring-blue-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>เบิกจ่ายไลน์ (OUT)</span>
            </button>
          </div>

          {/* 2. PRODUCT QR SCAN SECTION */}
          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 space-y-1.5 shrink-0">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-slate-200 flex items-center gap-1">
                <Box className="w-3.5 h-3.5 text-blue-400" />
                <span>1. รหัสสินค้า / QR บาร์โค้ด:</span>
              </label>
              <button
                type="button"
                onClick={() => setShowItemSearchDrawer(!showItemSearchDrawer)}
                className="text-blue-400 hover:text-blue-300 text-[11px] font-bold flex items-center gap-1"
              >
                <Search className="w-3 h-3" />
                <span>{showItemSearchDrawer ? 'ปิดค้นหา' : 'ค้นหาในคลัง'}</span>
              </button>
            </div>

            {/* Quick Item Filter Search Drawer */}
            {showItemSearchDrawer && (
              <div className="bg-slate-900 border border-blue-500/40 rounded-xl p-2 space-y-1.5 animate-fadeIn">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={itemFilterQuery}
                    onChange={(e) => setItemFilterQuery(e.target.value)}
                    placeholder="ค้นหา Model, Zone, Line..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="max-h-32 overflow-y-auto space-y-1 text-xs pr-1">
                  {filteredExistingItems.length > 0 ? (
                    filteredExistingItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectFilteredItem(item)}
                        className="w-full text-left p-1.5 rounded-lg bg-slate-950/80 hover:bg-blue-950/60 border border-slate-800 hover:border-blue-500/50 transition-colors flex items-center justify-between group"
                      >
                        <div className="truncate mr-2">
                          <span className="font-mono font-bold text-blue-400 group-hover:text-blue-300">
                            {item.modelHE}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-1.5">
                            Line {item.useLine}
                          </span>
                        </div>
                        <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-mono font-bold text-[10px]">
                          {item.locatorCode || `${item.zone}${item.bayNumber}`} ({item.quantity} ชิ้น)
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-1.5 text-slate-500 text-xs">
                      ไม่พบรายการที่ค้นหา
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Barcode Input Field */}
            <div className="relative flex items-center">
              <input
                type="text"
                value={scanInput}
                onChange={(e) => handleScanInputChange(e.target.value)}
                placeholder="ยิงบาร์โค้ด หรือพิมพ์ QR สินค้า..."
                className="w-full h-10 bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-lg pl-3 pr-20 text-xs sm:text-sm font-mono font-bold text-blue-300 placeholder-slate-500 focus:outline-none"
                required
              />
              <button
                type="button"
                onClick={() => handleToggleCamera('PRODUCT')}
                className="absolute right-1 h-7 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md text-[11px] font-bold flex items-center gap-1"
              >
                <Camera className="w-3.5 h-3.5 text-blue-400" />
                <span>{cameraActive && cameraTarget === 'PRODUCT' ? 'ปิด' : 'กล้อง'}</span>
              </button>
            </div>

            {/* Parsed Model & Line Info Badge */}
            <div className="flex items-center justify-between text-xs pt-0.5">
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-slate-400 font-bold text-[11px]">Model:</span>
                {isEditingModel ? (
                  <input
                    type="text"
                    value={modelHE}
                    onChange={(e) => setModelHE(e.target.value)}
                    onBlur={() => setIsEditingModel(false)}
                    autoFocus
                    className="h-5 px-1 bg-slate-900 border border-blue-500 rounded text-xs font-mono font-bold text-blue-300"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingModel(true)}
                    className="font-mono font-black text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <span>{modelHE}</span>
                    <Edit3 className="w-2.5 h-2.5 opacity-60" />
                  </button>
                )}
                {matchedPart?.partName && (
                  <span className="text-[10.5px] text-slate-400 truncate hidden sm:inline">
                    ({matchedPart.partName})
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <span className="text-slate-400 font-bold text-[11px]">ไลน์:</span>
                <select
                  value={useLine}
                  onChange={(e) => setUseLine(e.target.value)}
                  className="h-6 bg-slate-900 border border-slate-700 text-amber-300 rounded px-1 text-[11px] font-bold focus:outline-none"
                >
                  {useLines.map((line) => (
                    <option key={line.id} value={line.id}>
                      {line.name || line.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Camera View Finder (If Activated) */}
          {cameraActive && (
            <div className="space-y-1.5 p-2 bg-slate-950 rounded-xl border border-blue-500 shadow-lg shrink-0">
              <div className="flex items-center justify-between px-1 text-white text-xs">
                <span className="font-bold flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                  <span>
                    กำลังสแกน: {cameraTarget === 'LOCATOR' ? '🎯 ป้ายพิกัด' : '📦 ป้ายสินค้า'}
                  </span>
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCameraTarget(cameraTarget === 'LOCATOR' ? 'PRODUCT' : 'LOCATOR')}
                    className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-[10px] font-bold text-white"
                  >
                    สลับไป{cameraTarget === 'LOCATOR' ? 'สินค้า' : 'พิกัด'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCameraActive(false)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <QRScanner onScan={handleQRScan} onClose={() => setCameraActive(false)} />
            </div>
          )}

          {/* 3. STORAGE LOCATOR SECTION (SIMPLE & CLEAN) */}
          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 space-y-2 shrink-0">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-slate-200 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>2. พิกัดจัดเก็บ (Locator Tag):</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowManualLocatorPicker(!showManualLocatorPicker)}
                  className="text-slate-400 hover:text-amber-300 text-[11px] font-bold flex items-center gap-0.5"
                >
                  <span>{showManualLocatorPicker ? 'ซ่อน' : 'เลือกเอง'}</span>
                  {showManualLocatorPicker ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleCamera('LOCATOR')}
                  className="h-6 px-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded text-[11px] font-bold flex items-center gap-1"
                >
                  <Camera className="w-3 h-3" />
                  <span>{cameraActive && cameraTarget === 'LOCATOR' ? 'ปิด' : 'กล้อง'}</span>
                </button>
              </div>
            </div>

            {/* Locator Input */}
            <div className="relative flex items-center">
              <input
                type="text"
                value={locatorScanInput}
                onChange={(e) => handleLocatorInputChange(e.target.value)}
                placeholder="ยิงบาร์โค้ดพิกัด (เช่น E6-L1, X3, R12, T1-05)..."
                className="w-full h-10 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-lg px-3 text-xs sm:text-sm font-mono font-bold text-amber-300 placeholder-slate-500 focus:outline-none"
                required
              />
            </div>

            {/* Compact Manual Selector (Only when opened) */}
            {showManualLocatorPicker && (
              <div className="grid grid-cols-12 gap-1.5 p-2 bg-slate-900 rounded-lg border border-slate-800 animate-fadeIn text-xs">
                <div className="col-span-5">
                  <label className="block text-[10px] text-slate-400 mb-0.5">โซน:</label>
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
                      const newLoc = formatLocatorCode(newZ, newB, newL);
                      setLocatorScanInput(newLoc);
                    }}
                    className="w-full h-7 bg-slate-950 border border-slate-700 text-white rounded px-1.5 text-xs font-bold focus:outline-none"
                  >
                    <optgroup label="A4 Selective Rack (B-F)">
                      {['B', 'C', 'D', 'E', 'F'].map(z => (
                        <option key={z} value={z}>Zone {z}</option>
                      ))}
                    </optgroup>
                    <optgroup label="A4 High Rack (G-K)">
                      {['G', 'H', 'I', 'J', 'K'].map(z => (
                        <option key={z} value={z}>Zone {z}</option>
                      ))}
                    </optgroup>
                    <optgroup label="A4 Floor (X1-X8)">
                      {['X1','X2','X3','X4','X5','X6','X7','X8'].map(x => (
                        <option key={x} value={x}>{x} Floor</option>
                      ))}
                    </optgroup>
                    <optgroup label="A2 Flow Rail (R1-R20)">
                      {Array.from({ length: 20 }, (_, idx) => `R${idx + 1}`).map(r => (
                        <option key={r} value={r}>Rail {r}</option>
                      ))}
                    </optgroup>
                    <optgroup label="A5 Tent (T1-T4)">
                      {['T1', 'T2', 'T3', 'T4'].map(t => (
                        <option key={t} value={t}>Tent {t}</option>
                      ))}
                    </optgroup>
                    <optgroup label="CY3 Tent (4-Floor Rack)">
                      {['CY3-A', 'CY3-B', 'CY3-C', 'CY3-D'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div className="col-span-4">
                  <label className="block text-[10px] text-slate-400 mb-0.5">{getBayLabelForZone(zone as string)}</label>
                  <select
                    value={bayNumber}
                    onChange={(e) => {
                      const newB = Number(e.target.value);
                      setBayNumber(newB);
                      const newLoc = formatLocatorCode(zone, newB, level);
                      setLocatorScanInput(newLoc);
                    }}
                    className="w-full h-7 bg-slate-950 border border-slate-700 text-white rounded px-1.5 text-xs font-mono font-bold focus:outline-none"
                  >
                    {Array.from({ length: getMaxBaysForZone(zone as string) }, (_, i) => i + 1).map((b) => (
                      <option key={b} value={b}>
                        {isA4FloorStaging ? `Col ${b}` : isA2FlowRail ? `Pos ${b}` : isA5Tent ? `Slot ${b}` : `Bay ${b}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-3">
                  <label className="block text-[10px] text-slate-400 mb-0.5">ชั้น:</label>
                  {isA4FloorStaging || isA2FlowRail || isA5Tent ? (
                    <div className="w-full h-7 bg-slate-950 border border-slate-800 text-slate-400 rounded flex items-center justify-center text-[10.5px] font-bold">
                      ชั้น 1 (พื้น)
                    </div>
                  ) : (
                    <select
                      value={level}
                      onChange={(e) => {
                        const newL = Number(e.target.value) as ShelfLevel;
                        setLevel(newL);
                        const newLoc = formatLocatorCode(zone, bayNumber, newL);
                        setLocatorScanInput(newLoc);
                      }}
                      className="w-full h-7 bg-slate-950 border border-slate-700 text-amber-300 rounded px-1 text-xs font-bold focus:outline-none"
                    >
                      <option value={1}>L1</option>
                      <option value={2}>L2</option>
                      <option value={3}>L3</option>
                      <option value={4}>L4</option>
                    </select>
                  )}
                </div>
              </div>
            )}

            {/* Clean Location Indicator & Shelf Floor Pills (Simple, Flat, No clutter) */}
            {isRackZone ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                  <span className="text-amber-300 font-bold">
                    Zone {zone} &bull; Bay {bayNumber} &bull; ชั้น {level}
                  </span>
                  <span className="text-[10px]">เลือกระดับชั้น (L1-L4):</span>
                </div>

                {/* 4 Level Quick Pills in Clean Horizontal Grid */}
                <div className="grid grid-cols-4 gap-1.5">
                  {([4, 3, 2, 1] as ShelfLevel[]).map((lvl) => {
                    const item = currentBayItems.find((it) => it.level === lvl);
                    const isSelected = level === lvl;
                    const lvlLabel = lvl === 4 ? 'L4 (5.5m)' : lvl === 3 ? 'L3 (3.8m)' : lvl === 2 ? 'L2 (2.1m)' : 'L1 (พื้น)';

                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => handleSelectLevel(lvl)}
                        className={`p-1.5 rounded-lg border text-center transition-all flex flex-col items-center justify-center ${
                          isSelected
                            ? type === 'OUT'
                              ? 'bg-amber-500/20 border-amber-400 text-white shadow-xs ring-1 ring-amber-400'
                              : 'bg-emerald-500/20 border-emerald-400 text-white shadow-xs ring-1 ring-emerald-400'
                            : item
                            ? 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                            : 'bg-slate-900/40 border-slate-800 text-slate-500 hover:border-slate-700'
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
              <div className="text-xs text-emerald-400 flex items-center gap-1.5 bg-emerald-950/40 px-2 py-1 rounded-lg border border-emerald-800/50">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  {locatorDetectedMsg || `พิกัดจัดเก็บระดับพื้นราบ (L1): Zone ${zone} ${isA4FloorStaging ? `Col ${bayNumber}` : isA2FlowRail ? `Pos ${bayNumber}` : `Slot ${bayNumber}`}`}
                </span>
              </div>
            )}
          </div>

          {/* 4. QUANTITY INPUT (CLEAN & DIRECT) */}
          <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 space-y-2 shrink-0">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold text-slate-200 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>3. จำนวนสินค้า (Qty):</span>
              </label>
              {labelQty > 0 && (
                <button
                  type="button"
                  onClick={() => setActualQty(labelQty)}
                  className="text-[10.5px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20"
                >
                  ตามป้าย ({labelQty.toLocaleString()} ชิ้น)
                </button>
              )}
            </div>

            {/* Stepper + Input */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActualQty(prev => Math.max(0, prev - (stdQtyPerPalletInput || 80)))}
                className="w-10 h-10 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 font-black text-base border border-slate-700 flex items-center justify-center shrink-0"
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
                  className="w-full h-10 bg-slate-900 border border-slate-700 focus:border-emerald-400 rounded-lg text-center text-lg font-mono font-black text-white focus:outline-none"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                  ชิ้น
                </span>
              </div>

              <button
                type="button"
                onClick={() => setActualQty(prev => prev + (stdQtyPerPalletInput || 80))}
                className="w-10 h-10 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 font-black text-base border border-slate-700 flex items-center justify-center shrink-0"
              >
                +
              </button>
            </div>

            {/* Preset Adjuster Chips */}
            <div className="flex items-center gap-1 overflow-x-auto pt-0.5">
              {[+10, +80, +160, 480, 600].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    const newQty = preset > 100 ? preset : actualQty + preset;
                    setActualQty(newQty);
                    setValidationError(null);
                  }}
                  className="h-6 px-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded text-[11px] font-mono font-bold shrink-0"
                >
                  {preset > 100 ? `${preset}` : `+${preset}`}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setActualQty(0)}
                className="h-6 px-2 bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-800 rounded text-[11px] font-bold shrink-0 ml-auto"
              >
                ล้าง
              </button>
            </div>
          </div>

          {/* 5. COLLAPSIBLE PALLET / REMARK (COLLAPSED BY DEFAULT) */}
          <div className="border border-slate-800 rounded-xl overflow-hidden shrink-0">
            <button
              type="button"
              onClick={() => setShowAdvancedTools(!showAdvancedTools)}
              className="w-full px-3 py-1.5 bg-slate-950/40 hover:bg-slate-900 text-slate-400 flex items-center justify-between text-xs font-medium"
            >
              <span className="flex items-center gap-1">
                <Sliders className="w-3 h-3 text-slate-400" />
                <span>ตัวเลือกเพิ่มเติม (คำนวณพาเลท, หมายเหตุ)</span>
              </span>
              <div className="flex items-center gap-1 text-[10px]">
                {showAdvancedTools ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </div>
            </button>

            {showAdvancedTools && (
              <div className="p-2.5 bg-slate-950 space-y-2 border-t border-slate-800 animate-fadeIn text-xs">
                {/* Pallet Breakdown Calculator */}
                <div className="grid grid-cols-3 gap-1.5">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">มาตรฐาน/พาเลท:</label>
                    <input
                      type="number"
                      min="1"
                      value={stdQtyPerPalletInput}
                      onChange={(e) => {
                        const val = Math.max(1, Number(e.target.value));
                        setStdQtyPerPalletInput(val);
                        updateQuantitiesFromPallets(val, fullPalletsInput, looseQtyInput);
                      }}
                      className="w-full h-7 bg-slate-900 border border-slate-700 rounded px-1.5 text-center font-mono font-bold text-blue-300"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">จำนวนพาเลท:</label>
                    <input
                      type="number"
                      min="0"
                      value={fullPalletsInput}
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value));
                        setFullPalletsInput(val);
                        updateQuantitiesFromPallets(stdQtyPerPalletInput, val, looseQtyInput);
                      }}
                      className="w-full h-7 bg-slate-900 border border-slate-700 rounded px-1.5 text-center font-mono font-bold text-blue-300"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">เศษ (Loose):</label>
                    <input
                      type="number"
                      min="0"
                      value={looseQtyInput}
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value));
                        setLooseQtyInput(val);
                        updateQuantitiesFromPallets(stdQtyPerPalletInput, fullPalletsInput, val);
                      }}
                      className="w-full h-7 bg-slate-900 border border-slate-700 rounded px-1.5 text-center font-mono font-bold text-amber-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">หมายเหตุ:</label>
                  <input
                    type="text"
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    placeholder="ระบุหมายเหตุ..."
                    className="w-full h-7 bg-slate-900 border border-slate-700 rounded px-2 text-xs text-white placeholder-slate-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-0.5">
                  <input 
                    type="checkbox" 
                    id="batchModeToggleClean"
                    checked={batchMode}
                    onChange={(e) => setBatchMode(e.target.checked)}
                    className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700"
                  />
                  <label htmlFor="batchModeToggleClean" className="text-xs text-slate-300 cursor-pointer">
                    สแกนต่อเนื่อง (Batch Mode)
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* 6. PRIMARY ACTION BUTTON */}
          <div className="pt-1 mt-auto shrink-0">
            <button
              type="submit"
              disabled={!actualQty || actualQty <= 0}
              className={`w-full h-11 rounded-xl font-black text-sm text-white shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.99] ${
                !actualQty || actualQty <= 0
                  ? 'bg-slate-800 cursor-not-allowed text-slate-500'
                  : type === 'IN'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950'
                  : 'bg-blue-600 hover:bg-blue-500 shadow-blue-950'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>
                {actualQty > 0
                  ? `ยืนยัน${type === 'IN' ? 'รับเข้าจัดเก็บ' : 'เบิกจ่าย'} (${actualQty.toLocaleString()} ชิ้น)`
                  : 'กรุณาระบุจำนวนสินค้า'}
              </span>
            </button>
          </div>
        </form>

        {/* Note: ประวัติการสแกนด้านล่างถูกนำออกตามที่ผู้ใช้ร้องขอ ("ประวะติ ด้านล่าง เอาออก") */}

      </div>
    </div>
  );
};
