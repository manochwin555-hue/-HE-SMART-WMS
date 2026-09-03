import React, { useState, useEffect } from 'react';
import { InventoryItem, MovementType, ShelfLevel, StorageZone } from '../types';
import { 
  X, 
  Box, 
  QrCode, 
  ArrowRightLeft, 
  Layers, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Check, 
  Printer, 
  ExternalLink,
  Calendar,
  Building2,
  GitCommit,
  Tent,
  LayoutGrid
} from 'lucide-react';

export interface UnifiedSlotData {
  sectorType: 'RACK' | 'FLOOR_STAGING' | 'FLOW_RAIL' | 'TENT';
  buildingName: string;
  facilityId?: string;
  zoneName: string;
  locatorCode: string;
  bayOrGroupNumber?: number | string;
  level?: ShelfLevel | number;
  columnOrRailNumber?: number | string;
  rowNumber?: number | string;
  maxCapacityPallets?: number;
  item?: InventoryItem | null;
  bayItems?: InventoryItem[]; // When viewing full bay with L1-L4
}

interface UnifiedSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  slotData: UnifiedSlotData | null;
  onOpenScanner?: (zone: StorageZone, bay: number, level: ShelfLevel, mode: MovementType) => void;
  onRelocateItem?: (item: InventoryItem) => void;
  onOpen3D?: (zone: StorageZone, bay: number) => void;
  onPrintLabel?: (item: InventoryItem) => void;
}

export const UnifiedSlotModal: React.FC<UnifiedSlotModalProps> = ({
  isOpen,
  onClose,
  slotData,
  onOpenScanner,
  onRelocateItem,
  onOpen3D,
  onPrintLabel
}) => {
  const [copied, setCopied] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<ShelfLevel>(1);

  // Sync selectedLevel when slotData changes
  useEffect(() => {
    if (slotData?.level) {
      setSelectedLevel(slotData.level);
    } else {
      setSelectedLevel(1);
    }
  }, [slotData?.level, slotData?.locatorCode]);

  if (!isOpen || !slotData) return null;

  const {
    sectorType,
    buildingName,
    facilityId,
    zoneName,
    locatorCode,
    bayOrGroupNumber,
    level,
    columnOrRailNumber,
    rowNumber,
    item,
    bayItems = []
  } = slotData;

  // Determine active item if multi-level bay
  const isMultiLevel = sectorType === 'RACK' && bayItems.length > 0;
  const currentItem = isMultiLevel 
    ? (bayItems.find(it => it.level === selectedLevel) || null)
    : item;

  const handleCopyLocator = () => {
    navigator.clipboard.writeText(locatorCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  // Sector Theme Configuration
  const getSectorTheme = () => {
    switch (sectorType) {
      case 'RACK':
        return {
          icon: Layers,
          badgeBg: 'bg-blue-100 text-blue-800 border-blue-300',
          titleColor: 'text-blue-900',
          accentBg: 'bg-blue-600',
          sectorLabel: 'Selective Rack (แร็คสูง 4 ชั้น)'
        };
      case 'FLOOR_STAGING':
        return {
          icon: LayoutGrid,
          badgeBg: 'bg-amber-100 text-amber-900 border-amber-300',
          titleColor: 'text-amber-950',
          accentBg: 'bg-amber-500',
          sectorLabel: 'Floor Staging (ลานวางพื้น 1:1)'
        };
      case 'FLOW_RAIL':
        return {
          icon: GitCommit,
          badgeBg: 'bg-rose-100 text-rose-800 border-rose-300',
          titleColor: 'text-rose-950',
          accentBg: 'bg-rose-600',
          sectorLabel: 'Flow Rail (รางเลื่อนลูกกลิ้ง FIFO)'
        };
      case 'TENT':
        return {
          icon: Tent,
          badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          titleColor: 'text-emerald-950',
          accentBg: 'bg-emerald-600',
          sectorLabel: 'Outdoor Tent (เต็นท์จัดเก็บภายนอก)'
        };
      default:
        return {
          icon: Box,
          badgeBg: 'bg-slate-100 text-slate-800 border-slate-300',
          titleColor: 'text-slate-900',
          accentBg: 'bg-slate-800',
          sectorLabel: 'Storage Location'
        };
    }
  };

  const theme = getSectorTheme();
  const IconComponent = theme.icon;

  // Active locator code that dynamically reflects selected level (computed directly without conditional hook)
  let activeLocatorCode = locatorCode || '';
  if (locatorCode && isMultiLevel) {
    if (locatorCode.match(/-L[1-4]$/i)) {
      activeLocatorCode = locatorCode.replace(/-L[1-4]$/i, `-L${selectedLevel}`);
    } else {
      activeLocatorCode = `${locatorCode}-L${selectedLevel}`;
    }
  }

  // Extract numeric zone and bay for scanner callback
  const parseZoneAndBay = () => {
    let z: StorageZone = 'B';
    let b = 1;
    let l: ShelfLevel = (selectedLevel as ShelfLevel) || (level as ShelfLevel) || 1;

    if (sectorType === 'RACK') {
      // Check CY3 locator: e.g. DY3T-1.01-A1-L1 or CY3-A
      if (locatorCode.includes('DY3T') || (facilityId && facilityId.includes('CY3')) || zoneName.includes('CY3')) {
        const cy3Match = locatorCode.match(/DY3T-1\.0([1-4])-(?:([A-D]))?(\d+)/i);
        if (cy3Match) {
          const numCode = cy3Match[1];
          const letter = cy3Match[2] || (numCode === '1' ? 'A' : numCode === '2' ? 'B' : numCode === '3' ? 'C' : 'D');
          z = `CY3-${letter}` as StorageZone;
          b = parseInt(cy3Match[3], 10);
        } else if (zoneName.includes('Row A') || zoneName.includes('1.01')) {
          z = 'CY3-A';
          b = typeof bayOrGroupNumber === 'number' ? bayOrGroupNumber : 1;
        } else if (zoneName.includes('Row B') || zoneName.includes('1.02')) {
          z = 'CY3-B';
          b = typeof bayOrGroupNumber === 'number' ? bayOrGroupNumber : 1;
        } else if (zoneName.includes('Row C') || zoneName.includes('1.03')) {
          z = 'CY3-C';
          b = typeof bayOrGroupNumber === 'number' ? bayOrGroupNumber : 1;
        } else if (zoneName.includes('Row D') || zoneName.includes('1.04')) {
          z = 'CY3-D';
          b = typeof bayOrGroupNumber === 'number' ? bayOrGroupNumber : 1;
        }
      } else {
        const match = locatorCode.match(/([B-K])(\d+)/i);
        if (match) {
          z = match[1].toUpperCase() as StorageZone;
          b = parseInt(match[2], 10);
        }
      }
    } else if (sectorType === 'FLOW_RAIL') {
      const match = locatorCode.match(/R(\d+)-(\d+)/i);
      if (match) {
        z = `R${match[1]}` as StorageZone;
        b = parseInt(match[2], 10);
      }
    } else if (sectorType === 'TENT') {
      const match = locatorCode.match(/DA5T-(\d+)\.01-(\d+)/i);
      if (match) {
        z = `T${match[1]}` as StorageZone;
        b = parseInt(match[2], 10);
      }
    } else if (sectorType === 'FLOOR_STAGING') {
      const match = locatorCode.match(/X(\d+)/i);
      if (match) {
        z = `X${match[1]}` as StorageZone;
        b = typeof bayOrGroupNumber === 'number' ? bayOrGroupNumber : 1;
      }
    }

    return { zone: z, bay: b, level: l };
  };

  const parsed = parseZoneAndBay();

  const handleCopyActiveLocator = () => {
    navigator.clipboard.writeText(activeLocatorCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp">
        
        {/* MODAL HEADER */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-start justify-between relative">
          <div className="space-y-1.5 pr-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-md font-black text-[11px] border flex items-center space-x-1 ${theme.badgeBg}`}>
                <IconComponent className="w-3.5 h-3.5" />
                <span>{theme.sectorLabel}</span>
              </span>
              <span className="text-xs text-slate-300 font-medium flex items-center space-x-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>{buildingName}</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-200 font-bold">{zoneName}</span>
              </span>
            </div>

            {/* Locator Code with Copy */}
            <div className="flex items-center space-x-2 pt-1">
              <h3 className="text-lg sm:text-xl font-black font-mono tracking-tight text-white">
                {activeLocatorCode}
              </h3>
              <button
                onClick={handleCopyActiveLocator}
                className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="คัดลอกรหัสตำแหน่ง"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              {isMultiLevel && (
                <span className="px-2 py-0.5 rounded-md bg-blue-600/80 text-white font-mono font-bold text-[11px] border border-blue-400">
                  ชั้น {selectedLevel} (L{selectedLevel})
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors absolute top-4 right-4"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MULTI-LEVEL RACK SELECTOR (If multi-level bay) */}
        {isMultiLevel && (
          <div className="bg-slate-100 p-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-700 font-black text-xs px-1 flex items-center space-x-1.5">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>แยกระดับชั้นชัดเจน (Rack 4 Floors):</span>
            </span>
            <div className="flex items-center space-x-1.5">
              {([4, 3, 2, 1] as ShelfLevel[]).map((lvl) => {
                const lvlItem = bayItems.find(it => it.level === lvl);
                return (
                  <button
                    key={lvl}
                    onClick={() => setSelectedLevel(lvl)}
                    className={`px-3 py-1.5 rounded-lg font-mono font-bold transition-all text-xs flex items-center space-x-1.5 ${
                      selectedLevel === lvl
                        ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400 scale-105'
                        : lvlItem
                        ? 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-50'
                        : 'bg-slate-200/70 text-slate-500 border border-dashed border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <span>L{lvl}</span>
                    <span className="text-[10px] opacity-75">
                      {lvl === 4 ? '(บนสุด)' : lvl === 1 ? '(ติดพื้น)' : ''}
                    </span>
                    {lvlItem ? (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-emerald-600" />
                    ) : (
                      <span className="text-[10px] text-slate-400">ว่าง</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* MODAL BODY */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          
          {/* LOCATION SPECIFICATION TABLE */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold">โซน / พื้นที่:</span>
              <span className="font-bold text-slate-800 truncate block">{zoneName}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold">
                {sectorType === 'FLOW_RAIL' ? 'รางที่ (Rail):' : sectorType === 'TENT' ? 'กลุ่ม (Group):' : sectorType === 'FLOOR_STAGING' ? 'กลุ่ม (Group):' : 'ช่อง (Bay):'}
              </span>
              <span className="font-bold text-slate-800 font-mono">
                {bayOrGroupNumber || rowNumber || '-'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold">
                {sectorType === 'FLOW_RAIL' ? 'ตำแหน่งลำดับ (Pos):' : sectorType === 'RACK' ? 'ระดับชั้น (Level):' : 'คอลัมน์ (Col):'}
              </span>
              <span className="font-bold text-slate-800 font-mono">
                {sectorType === 'RACK' ? `L${selectedLevel || level || 1}` : columnOrRailNumber || '-'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold">สถานะช่อง:</span>
              <span className={`font-black text-[11px] inline-flex items-center space-x-1 ${
                currentItem ? 'text-emerald-700' : 'text-slate-500'
              }`}>
                {currentItem ? '● จัดเก็บพาเลทแล้ว' : '○ ตำแหน่งว่าง'}
              </span>
            </div>
          </div>

          {/* OCCUPIED ITEM DETAILS */}
          {currentItem ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-black text-slate-900 flex items-center space-x-1.5">
                  <Box className="w-4 h-4 text-blue-600" />
                  <span>ข้อมูลพาเลทที่จัดเก็บ ณ ตำแหน่งนี้</span>
                </span>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  1 พาเลทมาตรฐาน (Standard Pallet)
                </span>
              </div>

              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200 space-y-3.5">
                {/* Model & Tool Part Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-blue-700 block tracking-wider uppercase">MODEL / HE NO.</span>
                    <h4 className="text-lg font-black text-blue-950 font-mono">
                      {currentItem.modelHE}
                    </h4>
                    <p className="text-xs text-slate-700 font-semibold mt-0.5">{currentItem.partName}</p>
                  </div>
                  <span className="text-xs font-black bg-blue-600 text-white px-2.5 py-1 rounded-lg shrink-0">
                    Line {currentItem.useLine || 'HE1'}
                  </span>
                </div>

                {/* Grid Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-3 border-t border-blue-200/70">
                  <div className="bg-white p-2.5 rounded-lg border border-blue-100 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block">จำนวนชิ้นที่จัดเก็บ:</span>
                    <span className="text-base font-black text-slate-900 font-mono">
                      {currentItem.quantity.toLocaleString()} <span className="text-xs font-normal text-slate-500">ชิ้น</span>
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-lg border border-blue-100 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block">สถานะ Aging / FIFO:</span>
                    <span className={`text-xs font-black flex items-center space-x-1 mt-0.5 ${
                      currentItem.agingDays > 30 ? 'text-rose-600' : 'text-emerald-600'
                    }`}>
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>{currentItem.agingDays} วัน ({currentItem.agingStatus})</span>
                    </span>
                  </div>

                  <div className="col-span-2 sm:col-span-1 bg-white p-2.5 rounded-lg border border-blue-100 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block">วันเวลาที่นำเข้า:</span>
                    <span className="text-[11px] font-mono text-slate-700 block mt-0.5">
                      {currentItem.storageInDate ? new Date(currentItem.storageInDate).toLocaleDateString('th-TH') : '-'}
                    </span>
                  </div>
                </div>

                {/* QR Barcode & Lot code */}
                {currentItem.qrCode && (
                  <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-blue-100 text-[11px]">
                    <div className="flex items-center space-x-2">
                      <QrCode className="w-4 h-4 text-blue-600" />
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase">QR Barcode Payload:</span>
                        <span className="font-mono font-bold text-slate-800">{currentItem.qrCode}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Remark note if any */}
                {currentItem.remark && (
                  <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-amber-900 text-[11px]">
                    <strong>💡 หมายเหตุ:</strong> {currentItem.remark}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* EMPTY SLOT DETAILS */
            <div className="py-8 px-4 text-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-black text-slate-800">ช่องวางนี้ยังว่าง (พร้อมรับพาเลทเข้า)</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                ตำแหน่ง <span className="font-mono font-bold text-blue-700">{locatorCode}</span> พร้อมจัดเก็บ 1 พาเลทมาตรฐาน (ความจุ 80–120 ชิ้น)
              </p>
              <div className="pt-2">
                <button
                  onClick={() => {
                    if (onOpenScanner) {
                      onOpenScanner(parsed.zone, parsed.bay, parsed.level, 'IN');
                    }
                    onClose();
                  }}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl text-xs shadow-md inline-flex items-center space-x-2 transition-all active:scale-95"
                >
                  <QrCode className="w-4 h-4" />
                  <span>สแกนรับสินค้าเข้าตำแหน่งนี้ (Scan IN)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER ACTIONS */}
        <div className="bg-slate-50 p-3.5 sm:p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          {currentItem ? (
            <>
              <div className="flex flex-wrap items-center gap-1.5">
                {onOpenScanner && (
                  <button
                    onClick={() => {
                      onOpenScanner(parsed.zone, parsed.bay, parsed.level, 'OUT');
                      onClose();
                    }}
                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg shadow-xs flex items-center space-x-1.5 transition-all"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>สแกนเบิกออก (PICK)</span>
                  </button>
                )}

                {onRelocateItem && (
                  <button
                    onClick={() => {
                      onRelocateItem(currentItem);
                      onClose();
                    }}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg shadow-xs flex items-center space-x-1.5 transition-all"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>ย้ายตำแหน่ง</span>
                  </button>
                )}

                {onPrintLabel && (
                  <button
                    onClick={() => {
                      onPrintLabel(currentItem);
                      onClose();
                    }}
                    className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-lg shadow-2xs flex items-center space-x-1.5 transition-all"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-500" />
                    <span>พิมพ์ป้าย QR</span>
                  </button>
                )}
              </div>

              {sectorType === 'RACK' && onOpen3D && (
                <button
                  onClick={() => {
                    onOpen3D(parsed.zone, parsed.bay);
                    onClose();
                  }}
                  className="px-3 py-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-800 font-bold rounded-lg flex items-center space-x-1.5 transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>ดูใน 3D Viewer</span>
                </button>
              )}
            </>
          ) : (
            <div className="w-full flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition-colors"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
