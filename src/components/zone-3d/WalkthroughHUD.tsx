import React, { useEffect, useState } from 'react';
import { 
  X, 
  Footprints,
  Navigation,
  Sparkles,
  Zap,
  MousePointerClick,
  Layers,
  ChevronDown,
  Play,
  Pause
} from 'lucide-react';
import { WalkwayAisle, WalkwayPoint } from './walkthroughConfig';
import { InventoryItem } from '../../types';

interface WalkthroughHUDProps {
  walkways: WalkwayAisle[];
  activeAisle: WalkwayAisle;
  currentPointIndex: number;
  currentPoint: WalkwayPoint;
  isAutoPatrol: boolean;
  onToggleAutoPatrol: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onTurnLeft: () => void;
  onTurnRight: () => void;
  onSelectAisle: (aisleId: string) => void;
  onSelectPoint: (pointIdx: number) => void;
  onExitWalkthrough: () => void;
  nearbyItem?: {
    locator: string;
    item?: InventoryItem;
    distance?: number;
  } | null;
}

export const WalkthroughHUD: React.FC<WalkthroughHUDProps> = ({
  walkways,
  activeAisle,
  currentPointIndex,
  currentPoint,
  isAutoPatrol,
  onToggleAutoPatrol,
  onStepForward,
  onStepBackward,
  onTurnLeft,
  onTurnRight,
  onSelectAisle,
  onSelectPoint,
  onExitWalkthrough,
  nearbyItem
}) => {
  const [showAisleDropdown, setShowAisleDropdown] = useState(false);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        onStepForward();
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        onStepBackward();
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        onTurnLeft();
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        onTurnRight();
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        onToggleAutoPatrol();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onExitWalkthrough();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStepForward, onStepBackward, onTurnLeft, onTurnRight, onToggleAutoPatrol, onExitWalkthrough]);

  const totalPoints = activeAisle.points.length;
  const progressPct = Math.round(((currentPointIndex + 1) / totalPoints) * 100);

  return (
    <div className="absolute inset-0 pointer-events-none z-30 flex flex-col justify-between p-3 sm:p-4 font-sans select-none overflow-hidden">
      
      {/* 1. TOP BAR: MINIMAL GOOGLE STREET VIEW LOCATION & EXIT */}
      <div className="flex items-start justify-between gap-3 pointer-events-auto">
        
        {/* Compact Location Pill with Aisle Quick Switcher */}
        <div className="relative">
          <div className="bg-slate-950/90 backdrop-blur-md border border-sky-500/40 px-3.5 py-2 rounded-xl shadow-xl flex items-center gap-3 text-white ring-1 ring-sky-500/20 max-w-md">
            <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center text-white shadow-md shrink-0">
              <Footprints className="w-4 h-4 animate-pulse" />
            </div>

            <div className="min-w-0 pr-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-orange-500/20 text-orange-400 font-mono font-bold uppercase tracking-wider">
                  Street View 360°
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {currentPointIndex + 1}/{totalPoints}
                </span>
              </div>

              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-xs font-black text-white truncate max-w-[200px] sm:max-w-[240px]">
                  {activeAisle.name}
                </p>
                {walkways.length > 1 && (
                  <button
                    onClick={() => setShowAisleDropdown(v => !v)}
                    className="p-0.5 rounded text-sky-400 hover:text-white hover:bg-slate-800 transition-all"
                    title="สลับซอยทางเดิน"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Aisle Switch Dropdown */}
          {showAisleDropdown && (
            <div className="absolute top-full left-0 mt-1.5 w-64 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl p-1.5 z-40 animate-fadeIn">
              <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
                เลือกเส้นทางเดิน
              </div>
              <div className="space-y-0.5 max-h-48 overflow-y-auto">
                {walkways.map(w => (
                  <button
                    key={w.id}
                    onClick={() => {
                      onSelectAisle(w.id);
                      setShowAisleDropdown(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                      w.id === activeAisle.id
                        ? 'bg-sky-600 text-white font-bold shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: w.color }} />
                    <span className="truncate">{w.shortName}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Top Right Controls: Auto Patrol & Clean Exit Button */}
        <div className="flex items-center gap-2">
          {/* Auto Patrol Toggle */}
          <button
            onClick={onToggleAutoPatrol}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md border ${
              isAutoPatrol
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-300 ring-2 ring-amber-400/50 animate-pulse'
                : 'bg-slate-900/90 hover:bg-slate-800 text-white border-slate-700'
            }`}
            title="เดินตรวจอัตโนมัติ (กด Spacebar)"
          >
            {isAutoPatrol ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span className="hidden sm:inline">{isAutoPatrol ? 'หยุดเดิน' : 'เดินอัตโนมัติ'}</span>
          </button>

          {/* Exit Street View Button */}
          <button
            onClick={onExitWalkthrough}
            className="px-3 py-1.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white border border-rose-400/50 transition-all flex items-center gap-1.5 shadow-lg active:scale-95"
            title="ออกจากโหมดเดินตรวจ (กด ESC)"
          >
            <X className="w-4 h-4" />
            <span>ออกโหมดเดิน</span>
          </button>
        </div>
      </div>

      {/* 2. MIDDLE-LEFT: NEARBY PROXIMITY TOOLTIP */}
      {nearbyItem && (
        <div className="self-start mt-2 bg-slate-950/90 backdrop-blur-md border border-emerald-500/50 p-3 rounded-xl shadow-xl text-xs max-w-xs pointer-events-auto animate-fadeIn ring-1 ring-emerald-500/20">
          <div className="flex items-center justify-between gap-2 mb-1 pb-1 border-b border-slate-800">
            <span className="font-mono font-bold text-emerald-400 flex items-center gap-1 text-[11px]">
              <Zap className="w-3 h-3 text-amber-400" />
              <span>พิกัด: {nearbyItem.locator}</span>
            </span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-bold">
              {nearbyItem.item ? 'มีสินค้า' : 'ว่าง'}
            </span>
          </div>
          {nearbyItem.item ? (
            <div className="space-y-0.5 text-slate-300">
              <p className="font-bold text-white truncate text-[11.5px]">{nearbyItem.item.modelHE}</p>
              <p className="text-[10.5px] text-slate-400 truncate">{nearbyItem.item.partName}</p>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-0.5">
                <span>จำนวน: <strong className="text-white">{nearbyItem.item.quantity}</strong> EA</span>
                <span>&bull;</span>
                <span className={nearbyItem.item.agingDays > 30 ? 'text-rose-400 font-bold' : ''}>
                  Aging {nearbyItem.item.agingDays}d
                </span>
              </div>
            </div>
          ) : (
            <p className="text-slate-400 text-[10.5px]">ช่องว่างพร้อมจัดเก็บ</p>
          )}
        </div>
      )}

      {/* 3. BOTTOM-CENTER: MINIMALIST STREET VIEW INSTRUCTION HINT PILL */}
      <div className="self-center pointer-events-auto">
        <div className="bg-slate-950/85 backdrop-blur-md border border-slate-700/80 px-4 py-2 rounded-full shadow-2xl flex items-center gap-2.5 text-white text-xs ring-1 ring-white/10">
          <MousePointerClick className="w-4 h-4 text-sky-400 animate-bounce" />
          <span className="font-medium text-slate-200 text-[11.5px]">
            <strong className="text-white font-bold">คลิกที่พื้นหรือเป้าบนทางเดิน</strong> เพื่อก้าวไปจุดนั้น &bull; <strong className="text-slate-300">ลากเมาส์</strong> เพื่อหมุนมองรอบทิศ 360°
          </span>
        </div>
      </div>

    </div>
  );
};
