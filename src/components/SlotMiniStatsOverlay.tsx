import React from 'react';
import { InventoryItem } from '../types';
import { Package, Calendar, Box, Clock, ShieldAlert, CheckCircle2, Layers, MapPin, Tag } from 'lucide-react';

export interface MiniStatsSlotData {
  title: string;
  locatorCode: string;
  item: InventoryItem | null;
  items?: InventoryItem[]; // For multi-level bays like Rack 2D (L1-L4)
  zoneName?: string;
  positionLabel?: string;
  x: number;
  y: number;
}

interface SlotMiniStatsOverlayProps {
  data: MiniStatsSlotData | null;
}

export const SlotMiniStatsOverlay: React.FC<SlotMiniStatsOverlayProps> = ({ data }) => {
  if (!data) return null;

  const { title, locatorCode, item, items = [], zoneName, positionLabel, x, y } = data;

  // Window bounds calculation to keep tooltip strictly inside viewport
  const tooltipWidth = items.length > 1 ? 320 : 280;
  const estimatedHeight = items.length > 1 ? 260 : 210;

  const left = Math.min(Math.max(10, x + 15), window.innerWidth - tooltipWidth - 15);
  const top = Math.min(Math.max(10, y - estimatedHeight / 2), window.innerHeight - estimatedHeight - 15);

  return (
    <div
      className="fixed z-50 pointer-events-none transition-all duration-75 text-xs animate-in fade-in zoom-in-95 duration-100"
      style={{ left, top, width: `${tooltipWidth}px` }}
    >
      <div className="bg-slate-900/95 backdrop-blur-md text-white border-2 border-blue-500/80 rounded-xl p-3 shadow-2xl shadow-black/60 ring-1 ring-white/10 space-y-2.5">
        
        {/* Header: Locator Code and Status Badge */}
        <div className="flex items-center justify-between border-b border-slate-700/80 pb-2">
          <div className="flex items-center space-x-1.5 truncate">
            <div className="p-1 rounded-md bg-blue-600 text-white">
              <MapPin className="w-3.5 h-3.5" />
            </div>
            <div className="truncate">
              <div className="font-black font-mono text-xs text-blue-300 truncate">
                {locatorCode || title}
              </div>
              {positionLabel && (
                <div className="text-[10px] text-slate-400 font-sans truncate">
                  {positionLabel}
                </div>
              )}
            </div>
          </div>

          {/* Status Indicator */}
          {item || items.some(Boolean) ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center space-x-1 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>มีสินค้า</span>
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
              ว่าง (Empty)
            </span>
          )}
        </div>

        {/* Single Item Details (for A2 Flow Rail, A4 Floor Staging, A5 Tent) */}
        {items.length <= 1 && item && (
          <div className="space-y-2">
            {/* Part / Model Info */}
            <div className="bg-slate-800/80 rounded-lg p-2 border border-slate-700/60 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 flex items-center space-x-1">
                  <Tag className="w-3 h-3 text-blue-400" />
                  <span>ชื่อสินค้า / Model:</span>
                </span>
                <span className="font-mono font-black text-amber-300 text-xs truncate max-w-[140px]">
                  {item.modelHE}
                </span>
              </div>

              <div className="text-[11px] font-semibold text-slate-200 truncate" title={item.partName}>
                {item.partName}
              </div>

              {item.partNumber && item.partNumber !== item.modelHE && (
                <div className="text-[10px] font-mono text-slate-400 truncate">
                  P/No: {item.partNumber}
                </div>
              )}
            </div>

            {/* Qty & Inbound Date (Required by User) */}
            <div className="grid grid-cols-2 gap-1.5">
              {/* จำนวนคงเหลือ (Remaining Quantity) */}
              <div className="bg-slate-800/90 rounded-lg p-2 border border-slate-700/60 flex flex-col justify-between">
                <span className="text-[10px] text-slate-400 flex items-center space-x-1">
                  <Box className="w-3 h-3 text-emerald-400" />
                  <span>จำนวนคงเหลือ</span>
                </span>
                <div className="mt-1 flex items-baseline space-x-1">
                  <span className="text-sm font-black font-mono text-emerald-300">
                    {item.quantity.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-400">{item.unit || 'ชิ้น'}</span>
                </div>
                {item.fullPallets !== undefined && (
                  <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                    {item.fullPallets} พาเลท
                  </span>
                )}
              </div>

              {/* วันที่รับเข้า (Inbound Date) & Aging */}
              <div className="bg-slate-800/90 rounded-lg p-2 border border-slate-700/60 flex flex-col justify-between">
                <span className="text-[10px] text-slate-400 flex items-center space-x-1">
                  <Calendar className="w-3 h-3 text-blue-400" />
                  <span>วันที่รับเข้า</span>
                </span>
                <div className="mt-1">
                  <span className="text-[11px] font-bold font-mono text-slate-200 block">
                    {item.inboundDate || item.lastUpdated?.slice(0, 10) || '-'}
                  </span>
                  <span className={`text-[9px] font-mono font-bold mt-0.5 inline-block ${
                    item.agingDays > 30 ? 'text-rose-400' : 'text-slate-400'
                  }`}>
                    อายุสต็อก {item.agingDays ?? 0} วัน
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Tag: Use Line / Remark */}
            {(item.useLine || item.remark) && (
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                <span>สายการผลิต: <strong className="text-slate-200">{item.useLine || '-'}</strong></span>
                {item.agingStatus === 'OVERDUE' && (
                  <span className="text-rose-400 font-bold flex items-center space-x-0.5">
                    <ShieldAlert className="w-3 h-3" />
                    <span>สต็อกค้างนาน!</span>
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Multi-Level Rack Bay Summary (L1 to L4 for 2D Rack Layout) */}
        {items.length > 1 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] text-slate-400 pb-1 border-b border-slate-800">
              <span className="flex items-center space-x-1">
                <Layers className="w-3 h-3 text-blue-400" />
                <span>รายละเอียด 4 ชั้นวาง (Levels 1-4)</span>
              </span>
              <span className="font-mono text-blue-300 font-bold">
                รวม {items.reduce((acc, it) => acc + (it ? it.quantity : 0), 0).toLocaleString()} ชิ้น
              </span>
            </div>

            <div className="space-y-1.5">
              {[4, 3, 2, 1].map(levelNum => {
                const lvlItem = items.find(it => it && it.level === levelNum);
                return (
                  <div
                    key={levelNum}
                    className={`p-1.5 rounded-md border text-[11px] flex items-center justify-between ${
                      lvlItem
                        ? 'bg-slate-800 border-slate-700 text-slate-200'
                        : 'bg-slate-900/50 border-dashed border-slate-800 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <span className="font-mono font-bold text-blue-400 w-5">
                        L{levelNum}:
                      </span>
                      {lvlItem ? (
                        <div className="truncate">
                          <span className="font-mono font-bold text-amber-300 truncate block">
                            {lvlItem.modelHE}
                          </span>
                          <span className="text-[9px] text-slate-400 truncate block">
                            {lvlItem.partName}
                          </span>
                        </div>
                      ) : (
                        <span className="italic text-slate-500">ว่าง (Empty)</span>
                      )}
                    </div>

                    {lvlItem && (
                      <div className="text-right shrink-0 font-mono ml-2">
                        <div className="font-black text-emerald-300 text-xs">
                          {lvlItem.quantity.toLocaleString()} U
                        </div>
                        <div className="text-[9px] text-slate-400">
                          {lvlItem.inboundDate || lvlItem.lastUpdated?.slice(0, 10)}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty Slot Instructions */}
        {!item && items.length <= 1 && (
          <div className="py-2 text-center text-slate-400 space-y-1">
            <p className="text-[11px]">ช่องว่างพร้อมใช้งาน</p>
            <p className="text-[10px] text-blue-400 font-semibold">
              💡 คลิกที่ช่องเพื่อเปิดสแกนรับสินค้าเข้า (IN)
            </p>
          </div>
        )}

      </div>
    </div>
  );
};
