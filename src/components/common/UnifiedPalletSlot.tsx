import React, { useState } from 'react';
import { InventoryItem } from '../../types';
import { evaluateSlotStatus, COLOR_TOKENS } from './WarehouseSlotToken';
import { 
  Package, 
  Clock, 
  AlertTriangle, 
  MapPin, 
  ExternalLink,
  Layers,
  ArrowRight
} from 'lucide-react';

export interface UnifiedPalletSlotProps {
  /** Target locator code (e.g. DA2D-1.01-R01-01, DA4D-1.01-X1-R01-01, DA4D-2.01-B01-L1) */
  locatorCode: string;
  /** Primary inventory item (if occupied) */
  item?: InventoryItem | null;
  /** Is this slot matching current search query */
  isSearchMatch?: boolean;
  /** Short label to display inside the slot (e.g. "01", "R1", "L1", or Model name) */
  slotLabel?: string;
  /** Subtitle inside slot (e.g. Qty, P/No) */
  slotSubLabel?: string;
  /** Coordinate label displayed alongside (Column / Row / Bay) */
  coordLabel?: string;
  /** Warning & Critical thresholds */
  warningDays?: number;
  criticalDays?: number;
  /** Click handler */
  onClick?: () => void;
  /** Fixed custom size or aspect ratio classes (default: aspect-[4/3] or aspect-square) */
  aspectClass?: string;
  /** Show tooltip on hover (default: true) */
  showTooltip?: boolean;
  /** Extra CSS classes */
  className?: string;
}

export const UnifiedPalletSlot: React.FC<UnifiedPalletSlotProps> = ({
  locatorCode,
  item,
  isSearchMatch = false,
  slotLabel,
  slotSubLabel,
  coordLabel,
  warningDays = 14,
  criticalDays = 30,
  onClick,
  aspectClass = 'aspect-[4/3] min-w-[32px] min-h-[32px]',
  showTooltip = true,
  className = '',
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Evaluate status and design color tokens
  const statusInfo = evaluateSlotStatus(item, isSearchMatch, warningDays, criticalDays);

  return (
    <div className="relative group inline-block w-full">
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          backgroundColor: statusInfo.bgHex,
          borderColor: isHovered ? '#58A6FF' : statusInfo.borderHex,
        }}
        className={`w-full ${aspectClass} rounded-md border flex flex-col items-center justify-center p-1 relative transition-all duration-150 select-none ${
          isHovered
            ? 'ring-2 ring-[#58A6FF] shadow-lg shadow-blue-500/30 scale-[1.03] z-20'
            : 'hover:border-[#58A6FF]'
        } ${className}`}
        title={locatorCode}
      >
        {/* Top Mini Tag or Coordinate */}
        {coordLabel && (
          <span className="text-[9px] font-mono font-bold text-[#8B949E] tracking-tighter truncate leading-none">
            {coordLabel}
          </span>
        )}

        {/* Center Primary Label */}
        <span 
          className="text-[11px] font-black font-mono tracking-tight truncate max-w-full leading-tight"
          style={{ color: statusInfo.textColorHex }}
        >
          {slotLabel || (item ? item.modelHE.split('-')[0] : locatorCode.split('-').pop())}
        </span>

        {/* Sub Label / Qty */}
        {slotSubLabel && (
          <span className="text-[9px] font-mono opacity-80 truncate leading-none mt-0.5" style={{ color: statusInfo.textColorHex }}>
            {slotSubLabel}
          </span>
        )}

        {/* Status Indicator Icon */}
        {statusInfo.isOverdue && (
          <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-white animate-pulse" />
        )}
      </button>

      {/* Standard Interactive Hover Popup Card Tooltip */}
      {showTooltip && isHovered && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-[#161B22] border border-[#30363D] rounded-xl p-3 shadow-2xl z-50 pointer-events-none text-left animate-fadeIn">
          {/* Header */}
          <div className="flex items-center justify-between pb-1.5 border-b border-[#30363D]">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="text-xs font-mono font-black text-white">{locatorCode}</span>
            </div>
            <span
              className="px-1.5 py-0.5 text-[10px] font-bold rounded"
              style={{
                backgroundColor: statusInfo.bgHex,
                color: statusInfo.textColorHex,
              }}
            >
              {statusInfo.label}
            </span>
          </div>

          {/* Body Content */}
          {item ? (
            <div className="mt-2 space-y-1 text-xs">
              <div className="flex items-baseline justify-between">
                <span className="text-[#8B949E] text-[11px]">Model:</span>
                <span className="font-bold text-white font-mono">{item.modelHE}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-[#8B949E] text-[11px]">Part Name:</span>
                <span className="text-slate-200 truncate max-w-[140px]">{item.partName}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-[#8B949E] text-[11px]">จำนวน:</span>
                <span className="font-bold font-mono text-emerald-400">{item.quantity.toLocaleString()} {item.unit || 'Units'}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-[#8B949E] text-[11px]">อายุจัดเก็บ (Aging):</span>
                <span className={`font-bold font-mono ${
                  item.agingDays > criticalDays ? 'text-rose-400' : item.agingDays > warningDays ? 'text-amber-400' : 'text-slate-300'
                }`}>
                  {item.agingDays} วัน {item.agingDays > criticalDays ? '(วิกฤต)' : item.agingDays > warningDays ? '(เตือน FIFO)' : '(ปกติ)'}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-[#8B949E] text-[11px]">ไลน์เป้าหมาย:</span>
                <span className="text-blue-300 font-mono text-[11px]">{item.useLine || 'Main HE'}</span>
              </div>
            </div>
          ) : (
            <div className="mt-2 text-center py-2 text-xs text-[#8B949E]">
              <span>ช่องว่างพร้อมจัดเก็บ (Empty Position)</span>
            </div>
          )}

          {/* Footer hint */}
          <div className="mt-2 pt-1.5 border-t border-[#30363D] flex items-center justify-between text-[10px] text-[#8B949E]">
            <span>คลิกเพื่อดูรายละเอียด / สแกน</span>
            <ArrowRight className="w-3 h-3 text-blue-400" />
          </div>
        </div>
      )}
    </div>
  );
};
