import React from 'react';
import { useTranslation } from '../../i18n/i18nContext';
import { Layers, Box, CircleDashed, Clock } from 'lucide-react';

export type WarehouseFilterType = 'ALL' | 'OCCUPIED' | 'EMPTY' | 'AGING';

export interface WarehouseFilterCounts {
  total: number;
  occupied: number;
  empty: number;
  aging: number;
}

export interface WarehouseSlotFilterProps {
  activeFilter: WarehouseFilterType;
  onFilterChange: (filter: WarehouseFilterType) => void;
  counts: WarehouseFilterCounts;
  className?: string;
  compact?: boolean;
}

export const WarehouseSlotFilter: React.FC<WarehouseSlotFilterProps> = ({
  activeFilter,
  onFilterChange,
  counts,
  className = '',
  compact = false
}) => {
  const { t } = useTranslation();

  const filterOptions: Array<{
    id: WarehouseFilterType;
    label: string;
    count: number;
    icon: React.ElementType;
    activeStyle: string;
    badgeStyle: string;
    iconColor: string;
  }> = [
    {
      id: 'ALL',
      label: t('warehouseFilter.all'),
      count: counts.total,
      icon: Layers,
      activeStyle: 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/30 ring-1 ring-blue-400/50',
      badgeStyle: 'bg-blue-950/70 text-blue-200 border border-blue-400/40',
      iconColor: 'text-blue-300'
    },
    {
      id: 'OCCUPIED',
      label: t('warehouseFilter.occupied'),
      count: counts.occupied,
      icon: Box,
      activeStyle: 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/30 ring-1 ring-emerald-400/50',
      badgeStyle: 'bg-emerald-950/70 text-emerald-200 border border-emerald-400/40',
      iconColor: 'text-emerald-300'
    },
    {
      id: 'EMPTY',
      label: t('warehouseFilter.empty'),
      count: counts.empty,
      icon: CircleDashed,
      activeStyle: 'bg-slate-600 border-slate-400 text-white shadow-lg shadow-slate-900/30 ring-1 ring-slate-300/50',
      badgeStyle: 'bg-slate-950/70 text-slate-200 border border-slate-400/40',
      iconColor: 'text-slate-300'
    },
    {
      id: 'AGING',
      label: t('warehouseFilter.aging'),
      count: counts.aging,
      icon: Clock,
      activeStyle: 'bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-900/30 ring-1 ring-amber-400/50',
      badgeStyle: 'bg-amber-950/70 text-amber-200 border border-amber-400/40',
      iconColor: 'text-amber-300'
    }
  ];

  return (
    <div
      role="group"
      aria-label="Global Warehouse Slot Filter"
      className={`inline-flex items-center gap-1.5 p-1 rounded-xl bg-[#0D1118] border border-[#273244] overflow-x-auto max-w-full scrollbar-none shrink-0 ${className}`}
    >
      {filterOptions.map((opt) => {
        const Icon = opt.icon;
        const isActive = activeFilter === opt.id;

        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onFilterChange(opt.id)}
            aria-pressed={isActive}
            className={`
              relative px-3 py-1.5 text-xs font-bold rounded-lg border transition-all duration-150
              flex items-center gap-2 whitespace-nowrap select-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/80
              ${isActive 
                ? opt.activeStyle 
                : 'bg-[#111722] border-[#273244] text-slate-300 hover:text-white hover:bg-slate-800/80 hover:border-slate-600'
              }
              ${compact ? 'px-2 py-1 text-[11px]' : ''}
            `}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : opt.iconColor} shrink-0`} />
            <span className="font-semibold tracking-wide">{opt.label}</span>
            <span
              className={`
                inline-flex items-center justify-center px-1.5 py-0.5 rounded-md text-[11px] font-mono font-bold leading-none shrink-0
                ${isActive 
                  ? 'bg-black/30 text-white border border-white/20' 
                  : 'bg-slate-800/90 text-slate-300 border border-slate-700/60'
                }
              `}
            >
              {opt.count}
            </span>
          </button>
        );
      })}
    </div>
  );
};
