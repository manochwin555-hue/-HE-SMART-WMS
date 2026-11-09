import React from 'react';
import { Activity, Box, Zap } from 'lucide-react';
import { LODLevel } from './RackLODManager';

interface LODPerformanceBadgeProps {
  fps: number;
  lodLevel: LODLevel;
  distance?: number;
  highCount?: number;
  proxyCount?: number;
  className?: string;
}

export const LODPerformanceBadge: React.FC<LODPerformanceBadgeProps> = ({
  fps,
  lodLevel,
  distance,
  highCount,
  proxyCount,
  className = '',
}) => {
  // Determine FPS status color
  const fpsColor =
    fps >= 55 ? 'text-emerald-400' : fps >= 30 ? 'text-amber-400' : 'text-rose-400';
  const pulseColor =
    fps >= 55 ? 'bg-emerald-400' : fps >= 30 ? 'bg-amber-400' : 'bg-rose-400';

  // Determine LOD badge color & label
  const lodBadgeConfig = {
    HIGH: {
      label: 'HIGH DETAIL',
      badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
      iconClass: 'text-cyan-400',
    },
    PROXY: {
      label: 'PROXY BOX (LOD)',
      badgeClass: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
      iconClass: 'text-orange-400',
    },
    HYBRID: {
      label: 'HYBRID LOD',
      badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
      iconClass: 'text-purple-400',
    },
  }[lodLevel];

  return (
    <div
      className={`pointer-events-auto z-20 flex items-center gap-2 bg-slate-900/85 backdrop-blur-md border border-slate-700/80 px-2.5 py-1 rounded-xl shadow-lg text-[11px] font-mono select-none transition-all ${className}`}
    >
      {/* FPS Readout */}
      <div className="flex items-center gap-1.5 pr-2 border-r border-slate-700/70">
        <span className="relative flex h-2 w-2">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${pulseColor}`}
          />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${pulseColor}`} />
        </span>
        <span className={`font-bold ${fpsColor}`}>{fps}</span>
        <span className="text-[10px] text-slate-400 font-sans">FPS</span>
      </div>

      {/* LOD Status */}
      <div className="flex items-center gap-1.5">
        <Box className={`w-3 h-3 ${lodBadgeConfig.iconClass}`} />
        <span
          className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold border tracking-wider ${lodBadgeConfig.badgeClass}`}
        >
          {lodBadgeConfig.label}
        </span>
      </div>

      {/* Distance or Ratio Metric */}
      {distance !== undefined && distance > 0 && (
        <span className="hidden sm:inline text-[10px] text-slate-400 pl-1 border-l border-slate-700/70 font-sans">
          {distance}m
        </span>
      )}

      {/* Optional mesh count readout */}
      {highCount !== undefined && proxyCount !== undefined && (
        <span className="hidden md:inline text-[9.5px] text-slate-400 font-sans">
          ({highCount}H / {proxyCount}P)
        </span>
      )}
    </div>
  );
};
