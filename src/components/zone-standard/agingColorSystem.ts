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
    bgClass: 'bg-[#0B1017]',
    textClass: 'text-[#667085]',
    borderClass: 'border-[#273244]',
    hoverClass: 'hover:bg-[#111823] hover:border-[#384860]',
    ringClass: 'ring-[#273244]',
    hexColor: '#0B1017',
    label: 'พื้นที่ว่าง (Empty)',
    daysRange: 'ไม่มีสินค้า'
  },
  NORMAL: {
    bgClass: 'bg-[#EAF4FF]',
    textClass: 'text-[#0F172A] font-bold',
    borderClass: 'border-[#60A5FA]',
    hoverClass: 'hover:bg-[#D4E8FF] hover:border-[#3B82F6]',
    ringClass: 'ring-[#60A5FA]',
    hexColor: '#EAF4FF',
    label: 'ปกติ (NORMAL)',
    daysRange: '0 - 21 วัน'
  },
  WARNING: {
    bgClass: 'bg-[#FFF4CC]',
    textClass: 'text-[#7C4A03] font-black',
    borderClass: 'border-[#F59E0B]',
    hoverClass: 'hover:bg-[#FFE999] hover:border-[#D97706]',
    ringClass: 'ring-[#F59E0B]',
    hexColor: '#FFF4CC',
    label: 'เตือน (WARNING)',
    daysRange: '22 - 24 วัน'
  },
  URGENT: {
    bgClass: 'bg-[#FFF4CC]',
    textClass: 'text-[#7C4A03] font-black',
    borderClass: 'border-[#F59E0B]',
    hoverClass: 'hover:bg-[#FFE999] hover:border-[#D97706]',
    ringClass: 'ring-[#F59E0B]',
    hexColor: '#FFF4CC',
    label: 'ด่วน (URGENT)',
    daysRange: '25 - 27 วัน'
  },
  EXPIRED: {
    bgClass: 'bg-[#D9043E]',
    textClass: 'text-white font-black',
    borderClass: 'border-[#FF1744]',
    hoverClass: 'hover:bg-[#B50333] hover:border-[#FF5277]',
    ringClass: 'ring-[#FF1744]',
    hexColor: '#D9043E',
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
    hexColor: '#0B1017',
    badgeClass: 'bg-[#0B1017] text-[#667085] border border-[#273244]'
  },
  {
    category: 'NORMAL',
    label: 'ปกติ (NORMAL)',
    daysRange: '0 - 21 วัน',
    hexColor: '#EAF4FF',
    badgeClass: 'bg-[#EAF4FF] text-[#0F172A] font-bold border border-[#60A5FA]'
  },
  {
    category: 'WARNING',
    label: 'เตือน (WARNING)',
    daysRange: '22 - 24 วัน',
    hexColor: '#FFF4CC',
    badgeClass: 'bg-[#FFF4CC] text-[#7C4A03] font-bold border border-[#F59E0B]'
  },
  {
    category: 'URGENT',
    label: 'ด่วน (URGENT)',
    daysRange: '25 - 27 วัน',
    hexColor: '#FFF4CC',
    badgeClass: 'bg-[#FFF4CC] text-[#7C4A03] font-bold border border-[#F59E0B]'
  },
  {
    category: 'EXPIRED',
    label: 'เกินกำหนด (EXPIRED)',
    daysRange: '> 28 วัน',
    hexColor: '#D9043E',
    badgeClass: 'bg-[#D9043E] text-white font-bold border border-[#FF1744]'
  }
];
