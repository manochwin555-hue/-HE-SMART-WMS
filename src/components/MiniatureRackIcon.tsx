import React from 'react';

interface MiniatureRackIconProps {
  levelsOccupied?: number; // 0 to 4
  levelStates?: ('EMPTY' | 'OCCUPIED' | 'AGING' | 'OVERDUE')[];
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
}

export const MiniatureRackIcon: React.FC<MiniatureRackIconProps> = ({
  levelsOccupied = 0,
  levelStates,
  className = '',
  size = 'md',
  showLabels = false
}) => {
  // If levelStates not provided, compute from levelsOccupied
  const states = levelStates || [
    levelsOccupied >= 1 ? 'OCCUPIED' : 'EMPTY', // L1
    levelsOccupied >= 2 ? 'OCCUPIED' : 'EMPTY', // L2
    levelsOccupied >= 3 ? 'OCCUPIED' : 'EMPTY', // L3
    levelsOccupied >= 4 ? 'OCCUPIED' : 'EMPTY', // L4
  ];

  const getColor = (st: 'EMPTY' | 'OCCUPIED' | 'AGING' | 'OVERDUE') => {
    switch (st) {
      case 'OCCUPIED':
        return 'bg-blue-600 border-blue-400';
      case 'AGING':
        return 'bg-amber-500 border-amber-300';
      case 'OVERDUE':
        return 'bg-rose-600 border-rose-400';
      case 'EMPTY':
      default:
        return 'bg-[#edd9af] border-[#cbb07e]';
    }
  };

  const dims = {
    sm: { width: 'w-4', height: 'h-6', gap: 'gap-[1px]', barHeight: 'h-[3px]', text: 'text-[6px]' },
    md: { width: 'w-5', height: 'h-8', gap: 'gap-[1.5px]', barHeight: 'h-[4.5px]', text: 'text-[7px]' },
    lg: { width: 'w-7', height: 'h-11', gap: 'gap-[2px]', barHeight: 'h-[6px]', text: 'text-[8px]' }
  }[size];

  return (
    <div className={`inline-flex flex-col items-center relative ${dims.width} p-0.5 bg-slate-950/80 border border-slate-700/80 rounded ${className}`}>
      {/* Rack Left and Right Steel Upright lines */}
      <div className="absolute left-[1px] top-0.5 bottom-0.5 w-[1.5px] bg-blue-400 rounded-full" />
      <div className="absolute right-[1px] top-0.5 bottom-0.5 w-[1.5px] bg-blue-400 rounded-full" />

      {/* 4 Levels: L4 (Top) down to L1 (Bottom) */}
      <div className={`w-full flex flex-col justify-between ${dims.gap} my-auto z-10 px-[1.5px]`}>
        {[3, 2, 1, 0].map((idx) => {
          const lvlNum = idx + 1;
          const st = states[idx] || 'EMPTY';
          return (
            <div
              key={lvlNum}
              className={`w-full ${dims.barHeight} rounded-xs border flex items-center justify-center ${getColor(st)}`}
              title={`ชั้น L${lvlNum}: ${st}`}
            >
              {showLabels && (
                <span className={`${dims.text} font-mono font-bold leading-none ${st === 'EMPTY' ? 'text-slate-900' : 'text-white'}`}>
                  {lvlNum}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
