import React from 'react';
import { 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight, 
  Plus, 
  Minus, 
  RotateCcw,
  Compass
} from 'lucide-react';

interface CameraControlOverlayProps {
  onPan: (dx: number, dz: number) => void;
  onZoom: (zoomIn: boolean) => void;
  onReset: () => void;
  onPreset?: (preset: string) => void;
  activePreset?: string;
  presets?: { key: string; label: string }[];
}

export const CameraControlOverlay: React.FC<CameraControlOverlayProps> = ({
  onPan,
  onZoom,
  onReset,
  onPreset,
  activePreset = 'ALL',
  presets = [
    { key: 'ALL', label: 'ภาพรวม 45°' },
    { key: 'TOP_DOWN', label: 'แปลนบน 85°' },
    { key: 'FRONT', label: 'หน้าตรง 0°' },
    { key: 'SIDE', label: 'ด้านข้าง' }
  ]
}) => {
  const panStep = 4.5;

  return (
    <>
      {/* Top-Right Camera Presets Bar */}
      {onPreset && presets.length > 0 && (
        <div className="absolute top-3 right-3 pointer-events-auto z-20 flex items-center gap-1 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-1 rounded-xl shadow-2xl">
          <div className="flex items-center gap-1.5 px-2 py-0.5 text-[10.5px] font-bold text-slate-300 border-r border-slate-700">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">มุมมองผัง 3D</span>
          </div>
          {presets.map(p => (
            <button
              key={p.key}
              onClick={() => onPreset(p.key)}
              className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all shrink-0 ${
                activePreset === p.key 
                  ? 'bg-blue-600 text-white shadow-md ring-1 ring-blue-400/50' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* EDGE-ANCHORED PAN BUTTONS (No Central D-Pad blocking viewport) */}
      
      {/* 1. Top Edge Pan Up Button */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 pointer-events-auto z-20">
        <button
          onClick={() => onPan(0, -panStep)}
          className="px-3 py-1.5 bg-slate-900/90 hover:bg-cyan-600/50 backdrop-blur-md border border-slate-700/80 hover:border-cyan-500 rounded-xl shadow-xl text-slate-200 hover:text-white flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95 group"
          title="เลื่อนมุมมองขึ้นด้านบน"
          type="button"
        >
          <ArrowUp className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform text-cyan-400" />
          <span className="hidden sm:inline text-[11px]">เลื่อนขึ้น</span>
        </button>
      </div>

      {/* 2. Bottom Edge Pan Down Button */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 pointer-events-auto z-20">
        <button
          onClick={() => onPan(0, panStep)}
          className="px-3 py-1.5 bg-slate-900/90 hover:bg-cyan-600/50 backdrop-blur-md border border-slate-700/80 hover:border-cyan-500 rounded-xl shadow-xl text-slate-200 hover:text-white flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95 group"
          title="เลื่อนมุมมองลงด้านล่าง"
          type="button"
        >
          <ArrowDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform text-cyan-400" />
          <span className="hidden sm:inline text-[11px]">เลื่อนลง</span>
        </button>
      </div>

      {/* 3. Left Edge Pan Left Button */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-auto z-20">
        <button
          onClick={() => onPan(-panStep, 0)}
          className="p-2.5 bg-slate-900/90 hover:bg-cyan-600/50 backdrop-blur-md border border-slate-700/80 hover:border-cyan-500 rounded-xl shadow-xl text-slate-200 hover:text-white flex items-center justify-center transition-all active:scale-95 group"
          title="เลื่อนมุมมองไปทางซ้าย"
          type="button"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform text-cyan-400" />
        </button>
      </div>

      {/* 4. Right Edge Pan Right Button */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-auto z-20">
        <button
          onClick={() => onPan(panStep, 0)}
          className="p-2.5 bg-slate-900/90 hover:bg-cyan-600/50 backdrop-blur-md border border-slate-700/80 hover:border-cyan-500 rounded-xl shadow-xl text-slate-200 hover:text-white flex items-center justify-center transition-all active:scale-95 group"
          title="เลื่อนมุมมองไปทางขวา"
          type="button"
        >
          <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform text-cyan-400" />
        </button>
      </div>

      {/* Bottom-Right Compact Zoom & Reset Dock */}
      <div className="absolute bottom-3 right-3 pointer-events-auto z-20 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-1.5 rounded-xl shadow-2xl flex items-center gap-1.5 text-slate-200">
        <button
          onClick={onReset}
          className="px-2.5 h-7 rounded-lg bg-blue-600/30 hover:bg-blue-600/60 border border-blue-500/60 flex items-center justify-center text-blue-300 hover:text-white transition-all active:scale-95 text-[11px] font-bold gap-1"
          title="รีเซ็ตตำแหน่งกล้องเริ่มต้น"
          type="button"
        >
          <RotateCcw className="w-3 h-3" />
          <span>รีเซ็ต</span>
        </button>

        <div className="w-[1px] h-5 bg-slate-700 mx-0.5" />

        <button
          onClick={() => onZoom(true)}
          className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-slate-200 hover:text-white transition-all active:scale-95"
          title="ซูมเข้า (Zoom In)"
          type="button"
        >
          <Plus className="w-3.5 h-3.5 text-emerald-400" />
        </button>
        <button
          onClick={() => onZoom(false)}
          className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-slate-200 hover:text-white transition-all active:scale-95"
          title="ซูมออก (Zoom Out)"
          type="button"
        >
          <Minus className="w-3.5 h-3.5 text-rose-400" />
        </button>
      </div>
    </>
  );
};
