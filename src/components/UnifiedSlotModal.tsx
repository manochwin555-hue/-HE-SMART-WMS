import React, { useState, useEffect } from 'react';
import { InventoryItem, MovementType, ShelfLevel, StorageZone } from '../types';
import { useTranslation } from '../i18n/i18nContext';
import { 
  X, 
  Box, 
  QrCode, 
  ArrowRightLeft, 
  ArrowUpRight,
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
  const { t } = useTranslation();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-xs animate-fadeIn">
      {/* POPUP CONTAINER - Visible Frame, Compact Max-Height, No Overflow Spilling */}
      <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-slate-100 animate-scaleUp">
        
        {/* MODAL HEADER */}
        <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-lg shrink-0 ${
              currentItem ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
              <IconComponent className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400">
                  {zoneName}
                </span>
                <span className="text-[10px] text-slate-500">•</span>
                <span className="text-[10px] font-bold text-slate-300">
                  {theme.sectorLabel}
                </span>
              </div>
              <div className="flex items-center gap-1.5 pt-0.5">
                <h3 className="text-base font-black font-mono tracking-tight text-white">
                  {activeLocatorCode}
                </h3>
                <button
                  onClick={handleCopyActiveLocator}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                  title="คัดลอกรหัสตำแหน่ง"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors shrink-0"
            title="ปิดหน้าต่าง"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* MULTI-LEVEL RACK SELECTOR (If multi-level bay) */}
        {isMultiLevel && (
          <div className="bg-slate-950/60 px-3 py-1.5 border-b border-slate-800 flex items-center justify-between text-xs shrink-0">
            <span className="text-slate-400 font-bold text-[11px] flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>เลือกระดับชั้น (Rack L1-L4):</span>
            </span>
            <div className="flex items-center gap-1">
              {([4, 3, 2, 1] as ShelfLevel[]).map((lvl) => {
                const lvlItem = bayItems.find(it => it.level === lvl);
                const isSelected = selectedLevel === lvl;
                return (
                  <button
                    key={lvl}
                    onClick={() => setSelectedLevel(lvl)}
                    className={`h-6 px-2 rounded font-mono font-bold text-[11px] transition-all flex items-center gap-1 ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs ring-1 ring-blue-400'
                        : lvlItem
                        ? 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700'
                        : 'bg-slate-900 text-slate-500 border border-slate-800 hover:text-slate-300'
                    }`}
                  >
                    <span>L{lvl}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${lvlItem ? 'bg-amber-400' : 'bg-slate-600'}`} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* MODAL BODY (COMPACT & CLEAN DETAILS) */}
        <div className="p-3.5 overflow-y-auto space-y-3 text-xs flex-1">
          
          {/* OCCUPIED ITEM DETAILS */}
          {currentItem ? (
            <div className="space-y-2.5">
              
              {/* Product Header Card */}
              <div className="p-3 bg-slate-950/80 rounded-xl border border-blue-500/40 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-blue-400 block tracking-wider uppercase">MODEL / PART NO</span>
                    <h4 className="text-base font-black text-white font-mono truncate">
                      {currentItem.modelHE}
                    </h4>
                    <p className="text-[11px] text-slate-300 font-medium truncate mt-0.5">{currentItem.partName}</p>
                  </div>
                  <span className="text-xs font-black bg-blue-600 text-white px-2 py-0.5 rounded-lg shrink-0">
                    Line {currentItem.useLine || 'HE1'}
                  </span>
                </div>

                {/* Grid Metrics */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">จำนวนจัดเก็บ:</span>
                    <span className="text-base font-black text-emerald-400 font-mono">
                      {currentItem.quantity.toLocaleString()} <span className="text-xs font-normal text-slate-400">ชิ้น</span>
                    </span>
                  </div>

                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">อายุจัดเก็บ (Aging):</span>
                    <span className={`text-xs font-black flex items-center gap-1 mt-0.5 ${
                      currentItem.agingDays > 30 ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>{currentItem.agingDays} วัน ({currentItem.agingStatus})</span>
                    </span>
                  </div>
                </div>

                {/* Storage Date */}
                <div className="flex items-center justify-between text-[10.5px] text-slate-400 pt-0.5">
                  <span>วันที่รับเข้า:</span>
                  <span className="font-mono text-slate-200 font-bold">
                    {currentItem.storageInDate ? new Date(currentItem.storageInDate).toLocaleDateString('th-TH') : '-'}
                  </span>
                </div>

                {/* Remark note if any */}
                {currentItem.remark && (
                  <div className="bg-amber-950/40 p-2 rounded-lg border border-amber-500/30 text-amber-300 text-[11px]">
                    <strong>💡 หมายเหตุ:</strong> {currentItem.remark}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* EMPTY SLOT DETAILS */
            <div className="py-6 px-4 text-center bg-slate-950/60 rounded-xl border border-slate-800 space-y-2.5">
              <div className="w-10 h-10 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-white">ตำแหน่งว่าง (พร้อมรับเข้าสินค้า)</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  พิกัด <span className="font-mono font-bold text-amber-300">{activeLocatorCode}</span> พร้อมสำหรับจัดเก็บพาเลท
                </p>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenScanner) {
                      onOpenScanner(parsed.zone, parsed.bay, parsed.level, 'IN');
                    }
                    onClose();
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md inline-flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>สแกนรับสินค้าเข้าตำแหน่งนี้ (IN)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER ACTIONS (CLEAN, COMPACT, NEVER HIDDEN) */}
        <div className="bg-slate-950 p-3 border-t border-slate-800 flex items-center justify-between gap-2 text-xs shrink-0">
          {currentItem ? (
            <>
              <div className="flex items-center gap-1.5 flex-1">
                {onOpenScanner && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenScanner(parsed.zone, parsed.bay, parsed.level, 'OUT');
                      onClose();
                    }}
                    className="flex-1 h-9 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-xs flex items-center justify-center gap-1 transition-all"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>เบิกออก (OUT)</span>
                  </button>
                )}

                {onRelocateItem && (
                  <button
                    type="button"
                    onClick={() => {
                      onRelocateItem(currentItem);
                      onClose();
                    }}
                    className="flex-1 h-9 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg shadow-xs flex items-center justify-center gap-1 transition-all"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>ย้ายพิกัด</span>
                  </button>
                )}

                {onPrintLabel && (
                  <button
                    type="button"
                    onClick={() => {
                      onPrintLabel(currentItem);
                      onClose();
                    }}
                    className="h-9 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold rounded-lg border border-slate-700 flex items-center gap-1 transition-all shrink-0"
                    title="พิมพ์ฉลาก KANBAN"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">พิมพ์ฉลาก</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="h-9 px-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-bold rounded-lg transition-colors shrink-0"
              >
                ปิด
              </button>
            </>
          ) : (
            <div className="w-full flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="h-9 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg transition-colors"
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
