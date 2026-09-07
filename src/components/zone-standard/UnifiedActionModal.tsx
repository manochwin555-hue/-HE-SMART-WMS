import React, { useState } from 'react';
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
  Barcode
} from 'lucide-react';
import { InventoryItem, MovementType, ShelfLevel, StorageZone } from '../../types';
import { getAgingCategory, AGING_STYLES } from './agingColorSystem';

export interface UnifiedModalSlotInfo {
  zoneName: string;
  zoneId: StorageZone;
  bayNumber: number;
  level: ShelfLevel;
  locatorTag: string;
  isRack?: boolean;
  item?: InventoryItem | null;
  facilityCode?: string;
  bayItems?: InventoryItem[]; // Other levels in the same bay if rack
}

export interface UnifiedActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  slotInfo: UnifiedModalSlotInfo | null;
  onOpenScanner?: (zone: StorageZone, bay: number, level: ShelfLevel, mode: MovementType) => void;
  onRelocateItem?: (item: InventoryItem) => void;
  onOpen3D?: (zone: StorageZone, bay: number) => void;
  onPrintLabel?: (item: InventoryItem) => void;
}

export const UnifiedActionModal: React.FC<UnifiedActionModalProps> = ({
  isOpen,
  onClose,
  slotInfo,
  onOpenScanner,
  onRelocateItem,
  onOpen3D,
  onPrintLabel
}) => {
  const [copied, setCopied] = useState(false);
  const [currentLevel, setCurrentLevel] = useState<ShelfLevel>(slotInfo?.level || 1);

  if (!isOpen || !slotInfo) return null;

  const {
    zoneName,
    zoneId,
    bayNumber,
    level,
    locatorTag,
    isRack = false,
    item,
    facilityCode,
    bayItems = []
  } = slotInfo;

  // Active item depending on selected level if rack with multiple items
  const activeLevel = isRack ? currentLevel : level;
  const activeItem = isRack && bayItems.length > 0
    ? (bayItems.find(it => it.level === activeLevel) || (activeLevel === level ? item : null))
    : item;

  // Active locator tag dynamically updated for level
  let displayLocator = locatorTag;
  if (isRack && locatorTag) {
    if (locatorTag.match(/-L[1-4]$/i)) {
      displayLocator = locatorTag.replace(/-L[1-4]$/i, `-L${activeLevel}`);
    } else if (!locatorTag.includes(`-L`)) {
      displayLocator = `${locatorTag}-L${activeLevel}`;
    }
  }

  const handleCopyLocator = () => {
    navigator.clipboard.writeText(displayLocator);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const agingCategory = getAgingCategory(activeItem);
  const agingStyle = AGING_STYLES[agingCategory];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl transform transition-all text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ========================================================================= */}
        {/* MODAL HEADER                                                              */}
        {/* ========================================================================= */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
              {isRack ? <Layers className="w-5 h-5" /> : <Box className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-400">
                  {zoneName}
                </span>
                {facilityCode && (
                  <span className="text-[10px] font-mono text-slate-500">
                    [{facilityCode}]
                  </span>
                )}
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-500/40">
                  {isRack ? `แร็ค ชั้น ${activeLevel}` : 'ลานวางพื้น 1:1'}
                </span>
              </div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>พิกัด:</span>
                <span className="font-mono text-blue-400 underline decoration-blue-500/40">
                  {displayLocator}
                </span>
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Level Switcher tabs if in Rack mode */}
        {isRack && (
          <div className="bg-slate-950/70 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">เลือกระดับชั้น (L1 - L4):</span>
            <div className="inline-flex gap-1.5">
              {([4, 3, 2, 1] as const).map((lvl) => {
                const lvlItem = bayItems.find(it => it.level === lvl);
                const isSelected = activeLevel === lvl;
                return (
                  <button
                    key={lvl}
                    onClick={() => setCurrentLevel(lvl)}
                    className={`h-7 px-2.5 rounded-md text-xs font-mono font-black transition-all flex items-center gap-1 ${
                      isSelected
                        ? 'bg-blue-600 text-white ring-2 ring-blue-400 shadow-sm'
                        : lvlItem
                        ? 'bg-slate-800 text-blue-300 border border-slate-700 hover:bg-slate-700'
                        : 'bg-slate-950 text-slate-500 border border-slate-800 hover:text-slate-300'
                    }`}
                  >
                    <span>L{lvl}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${lvlItem ? 'bg-blue-400' : 'bg-slate-600'}`} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL BODY CONTENT                                                        */}
        {/* ========================================================================= */}
        <div className="p-4 space-y-3.5 max-h-[70vh] overflow-y-auto">
          
          {/* Locator Quick Copy Bar */}
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Barcode className="w-4 h-4 text-slate-400" />
              <div>
                <span className="text-[10px] text-slate-400 block leading-tight">Locator Tag Barcode:</span>
                <span className="font-mono text-xs sm:text-sm font-black text-white tracking-wide">
                  {displayLocator}
                </span>
              </div>
            </div>
            <button
              onClick={handleCopyLocator}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
            </button>
          </div>

          {/* ITEM DETAILS OR EMPTY STATE */}
          {activeItem ? (
            <div className="space-y-3">
              {/* Product Info Card */}
              <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">
                      รหัสสินค้า (Model HE):
                    </span>
                    <h4 className="text-lg font-black text-white font-mono tracking-tight text-blue-400">
                      {activeItem.modelHE}
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {activeItem.partName}
                    </p>
                  </div>

                  {/* Status Badge */}
                  <span className={`px-2.5 py-1 rounded-md text-xs font-bold font-mono border ${agingStyle.bgClass} ${agingStyle.textClass} ${agingStyle.borderClass}`}>
                    {agingStyle.label}
                  </span>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-700">
                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">จำนวนจัดเก็บ:</span>
                    <span className="text-sm font-mono font-black text-white">
                      {activeItem.quantity.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">ชิ้น</span>
                    </span>
                  </div>

                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">จำนวนพาเลท:</span>
                    <span className="text-sm font-mono font-black text-emerald-400">
                      {activeItem.fullPallets ?? 1} <span className="text-[10px] text-slate-400 font-normal">Pallet</span>
                    </span>
                  </div>

                  <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-slate-400 block">อายุจัดเก็บ (Aging):</span>
                    <span className={`text-sm font-mono font-black flex items-center gap-1 ${
                      activeItem.agingDays > 27 ? 'text-rose-400' : activeItem.agingDays > 21 ? 'text-amber-400' : 'text-blue-400'
                    }`}>
                      <Clock className="w-3.5 h-3.5" />
                      <span>{activeItem.agingDays} วัน</span>
                    </span>
                  </div>
                </div>

                {/* Date & UseLine */}
                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <span>นำเข้า: {activeItem.storageInDate ? new Date(activeItem.storageInDate).toLocaleDateString('th-TH') : '-'}</span>
                  <span>สายผลิต: <strong className="text-slate-200">{activeItem.useLine || 'HE1'}</strong></span>
                </div>
              </div>
            </div>
          ) : (
            /* EMPTY SLOT CALLOUT */
            <div className="py-7 px-4 text-center bg-slate-950 rounded-xl border-2 border-dashed border-slate-700 space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#1E293B] border border-slate-700 text-blue-400 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white">ช่องวางนี้ยังว่าง (Empty Slot)</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  ตำแหน่ง <span className="font-mono font-bold text-blue-400">{displayLocator}</span> พร้อมรับพาเลทมาตรฐานเข้าจัดเก็บ
                </p>
              </div>
              <div className="pt-1">
                <button
                  onClick={() => {
                    if (onOpenScanner) {
                      onOpenScanner(zoneId, bayNumber, activeLevel, 'IN');
                    }
                    onClose();
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md inline-flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <QrCode className="w-4 h-4" />
                  <span>สแกนรับสินค้าเข้าตำแหน่งนี้ (Scan IN)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* MODAL FOOTER ACTIONS                                                      */}
        {/* ========================================================================= */}
        <div className="bg-slate-950 p-3.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          {activeItem ? (
            <div className="flex flex-wrap items-center gap-1.5 w-full justify-between">
              <div className="flex flex-wrap items-center gap-1.5">
                {/* Scan OUT Button */}
                {onOpenScanner && (
                  <button
                    onClick={() => {
                      onOpenScanner(zoneId, bayNumber, activeLevel, 'OUT');
                      onClose();
                    }}
                    className="h-9 px-3.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>สแกนเบิกออก (Scan OUT)</span>
                  </button>
                )}

                {/* Relocate Button */}
                {onRelocateItem && (
                  <button
                    onClick={() => {
                      onRelocateItem(activeItem);
                      onClose();
                    }}
                    className="h-9 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>ย้ายตำแหน่ง</span>
                  </button>
                )}

                {/* Print Label Button */}
                {onPrintLabel && (
                  <button
                    onClick={() => {
                      onPrintLabel(activeItem);
                      onClose();
                    }}
                    className="h-9 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>พิมพ์ QR</span>
                  </button>
                )}
              </div>

              {/* 3D Viewer Button */}
              {isRack && onOpen3D && (
                <button
                  onClick={() => {
                    onOpen3D(zoneId, bayNumber);
                    onClose();
                  }}
                  className="h-9 px-3 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 font-bold rounded-lg border border-indigo-500/40 flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>ดู 3D</span>
                </button>
              )}
            </div>
          ) : (
            <div className="w-full flex justify-end">
              <button
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
