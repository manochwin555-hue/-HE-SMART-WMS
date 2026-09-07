import { InventoryItem } from '../../types';

export type AgingCategory = 'EMPTY' | 'NORMAL' | 'WARNING' | 'URGENT' | 'EXPIRED';

/**
 * Standard Aging Days Configuration:
 * - EMPTY: No item present (#1E293B)
 * - NORMAL: 0 - 21 days (Blue/Green)
 * - WARNING: 22 - 24 days (Yellow)
 * - URGENT: 25 - 27 days (Orange)
 * - EXPIRED: 28+ days / Due today (Red)
 */
export const getAgingCategory = (item?: InventoryItem | null): AgingCategory => {
  if (!item) return 'EMPTY';
  const days = item.agingDays ?? 0;
  if (days <= 21) return 'NORMAL';
  if (days <= 24) return 'WARNING';
  if (days <= 27) return 'URGENT';
  return 'EXPIRED';
};

export interface AgingStyleConfig {
  bgClass: string;
  textClass: string;
  borderClass: string;
  hoverClass: string;
  ringClass: string;
  hexColor: string;
  label: string;
  daysRange: string;
}

export const AGING_STYLES: Record<AgingCategory, AgingStyleConfig> = {
  EMPTY: {
    bgClass: 'bg-[#1E293B]',
    textClass: 'text-slate-400',
    borderClass: 'border-slate-700/80',
    hoverClass: 'hover:bg-slate-800 hover:border-slate-500',
    ringClass: 'ring-slate-600',
    hexColor: '#1E293B',
    label: 'ช่องว่าง (Empty)',
    daysRange: 'ไม่มีสินค้า'
  },
  NORMAL: {
    bgClass: 'bg-blue-600',
    textClass: 'text-white',
    borderClass: 'border-blue-400',
    hoverClass: 'hover:bg-blue-500 hover:border-blue-300',
    ringClass: 'ring-blue-400',
    hexColor: '#2563EB',
    label: 'ปกติ (NORMAL)',
    daysRange: '0 - 21 วัน'
  },
  WARNING: {
    bgClass: 'bg-amber-400',
    textClass: 'text-slate-950 font-black',
    borderClass: 'border-amber-300',
    hoverClass: 'hover:bg-amber-300 hover:border-amber-200',
    ringClass: 'ring-amber-400',
    hexColor: '#FBBF24',
    label: 'เตือน (WARNING)',
    daysRange: '22 - 24 วัน'
  },
  URGENT: {
    bgClass: 'bg-orange-500',
    textClass: 'text-white font-black',
    borderClass: 'border-orange-400',
    hoverClass: 'hover:bg-orange-400 hover:border-orange-300',
    ringClass: 'ring-orange-400',
    hexColor: '#F97316',
    label: 'ด่วน (URGENT)',
    daysRange: '25 - 27 วัน'
  },
  EXPIRED: {
    bgClass: 'bg-red-600',
    textClass: 'text-white font-black',
    borderClass: 'border-red-500',
    hoverClass: 'hover:bg-red-500 hover:border-red-300',
    ringClass: 'ring-red-500',
    hexColor: '#DC2626',
    label: 'เกินกำหนด (EXPIRED)',
    daysRange: '> 28 วัน'
  }
};

export const AGING_LEGEND_ITEMS: Array<{
  category: AgingCategory;
  label: string;
  daysRange: string;
  hexColor: string;
  badgeClass: string;
}> = [
  {
    category: 'EMPTY',
    label: 'ว่าง (Empty)',
    daysRange: 'ไม่มีสินค้า',
    hexColor: '#1E293B',
    badgeClass: 'bg-[#1E293B] text-slate-300 border border-slate-700'
  },
  {
    category: 'NORMAL',
    label: 'ปกติ (NORMAL)',
    daysRange: '0 - 21 วัน',
    hexColor: '#2563EB',
    badgeClass: 'bg-blue-600 text-white border border-blue-400'
  },
  {
    category: 'WARNING',
    label: 'เตือน (WARNING)',
    daysRange: '22 - 24 วัน',
    hexColor: '#FBBF24',
    badgeClass: 'bg-amber-400 text-slate-950 font-bold border border-amber-300'
  },
  {
    category: 'URGENT',
    label: 'ด่วน (URGENT)',
    daysRange: '25 - 27 วัน',
    hexColor: '#F97316',
    badgeClass: 'bg-orange-500 text-white font-bold border border-orange-400'
  },
  {
    category: 'EXPIRED',
    label: 'เกินกำหนด (EXPIRED)',
    daysRange: '> 28 วัน',
    hexColor: '#DC2626',
    badgeClass: 'bg-red-600 text-white font-bold border border-red-500'
  }
];
