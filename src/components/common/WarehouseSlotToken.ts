import { InventoryItem } from '../../types';

/**
 * Standard Design Color Tokens for Warehouse Pallets & Slots
 */
export const COLOR_TOKENS = {
  EMPTY: {
    bg: '#21262D',
    border: '#30363D',
    text: '#8B949E',
    glow: 'rgba(48, 54, 61, 0.4)',
    label: 'พื้นที่ว่าง',
    labelEn: 'Empty Slot',
    hex: '#21262D',
  },
  OCCUPIED: {
    bg: '#2F81F7', // Blue for normal items
    border: '#58A6FF',
    text: '#FFFFFF',
    glow: 'rgba(47, 129, 247, 0.4)',
    label: 'จัดเก็บปกติ',
    labelEn: 'Occupied',
    hex: '#2F81F7',
  },
  VINYL_NORMAL: {
    bg: '#238636', // Green for Vinyl Normal
    border: '#2EA043',
    text: '#FFFFFF',
    glow: 'rgba(35, 134, 54, 0.4)',
    label: 'ปกติ (Vinyl)',
    labelEn: 'Normal (Vinyl)',
    hex: '#238636',
  },
  AGING_WARNING: {
    bg: '#D29922', // Yellow/Amber
    border: '#E3B341',
    text: '#FFFFFF',
    glow: 'rgba(210, 153, 34, 0.4)',
    label: 'เตือน (Warning)',
    labelEn: 'Warning',
    hex: '#D29922',
  },
  URGENT: {
    bg: '#D97706', // Orange
    border: '#F59E0B',
    text: '#FFFFFF',
    glow: 'rgba(217, 119, 6, 0.4)',
    label: 'เร่งด่วน (Urgent)',
    labelEn: 'Urgent',
    hex: '#D97706',
  },
  OVERDUE_CRITICAL: {
    bg: '#F85149', // Red for Critical / Due Today
    border: '#FF7B72',
    text: '#FFFFFF',
    glow: 'rgba(248, 81, 73, 0.5)',
    label: 'วิกฤต / ครบกำหนด (Due)',
    labelEn: 'Critical / Due',
    hex: '#F85149',
  },
  EXPIRED: {
    bg: '#8B0000', // Dark Red
    border: '#B22222',
    text: '#FFFFFF',
    glow: 'rgba(139, 0, 0, 0.5)',
    label: 'เกินกำหนด (Expired)',
    labelEn: 'Expired',
    hex: '#8B0000',
  },
  CONDITION_NG: {
    bg: '#7F1D1D', // Dark Red
    border: '#B91C1C',
    text: '#FFFFFF',
    glow: 'rgba(127, 29, 29, 0.5)',
    label: 'สภาพ NG',
    labelEn: 'Condition NG',
    hex: '#7F1D1D',
  },
  DATA_INCOMPLETE: {
    bg: '#6E40C9', // Purple
    border: '#8957E5',
    text: '#FFFFFF',
    glow: 'rgba(110, 64, 201, 0.4)',
    label: 'ข้อมูลไม่ครบ',
    labelEn: 'Data Incomplete',
    hex: '#6E40C9',
  },
  SEARCH_MATCH: {
    bg: '#2EA043',
    border: '#3FB950',
    text: '#FFFFFF',
    glow: 'rgba(46, 160, 67, 0.5)',
    label: 'ตรงกับผลค้นหา',
    labelEn: 'Search Highlight',
    hex: '#2EA043',
  },
} as const;

export type SlotStatusType = 'EMPTY' | 'OCCUPIED' | 'VINYL_NORMAL' | 'AGING_WARNING' | 'URGENT' | 'OVERDUE_CRITICAL' | 'EXPIRED' | 'CONDITION_NG' | 'DATA_INCOMPLETE' | 'SEARCH_MATCH';

export interface SlotStatusResult {
  status: SlotStatusType;
  bgHex: string;
  borderHex: string;
  textColorHex: string;
  glowHex: string;
  label: string;
  isOccupied: boolean;
  isAging: boolean;
  isOverdue: boolean;
  isMatch: boolean;
}

/**
 * Universal evaluator for slot status and colors
 */
export function evaluateSlotStatus(
  item: InventoryItem | null | undefined,
  isSearchMatch = false,
  warningDaysThreshold = 14,
  criticalDaysThreshold = 30
): SlotStatusResult {
  if (isSearchMatch && item) {
    return {
      status: 'SEARCH_MATCH',
      bgHex: COLOR_TOKENS.SEARCH_MATCH.bg,
      borderHex: COLOR_TOKENS.SEARCH_MATCH.border,
      textColorHex: COLOR_TOKENS.SEARCH_MATCH.text,
      glowHex: COLOR_TOKENS.SEARCH_MATCH.glow,
      label: COLOR_TOKENS.SEARCH_MATCH.label,
      isOccupied: true,
      isAging: item.agingDays > warningDaysThreshold,
      isOverdue: item.agingDays > criticalDaysThreshold,
      isMatch: true,
    };
  }

  if (!item) {
    return {
      status: 'EMPTY',
      bgHex: COLOR_TOKENS.EMPTY.bg,
      borderHex: COLOR_TOKENS.EMPTY.border,
      textColorHex: COLOR_TOKENS.EMPTY.text,
      glowHex: COLOR_TOKENS.EMPTY.glow,
      label: COLOR_TOKENS.EMPTY.label,
      isOccupied: false,
      isAging: false,
      isOverdue: false,
      isMatch: false,
    };
  }

  // 1. Check for Critical/Hold Statuses First
  if (item.agingStatus === 'CONDITION_NG' || item.wrappingCondition && ['TORN', 'LOOSE', 'WET', 'CONTAMINATED', 'OPEN'].includes(item.wrappingCondition)) {
    return {
      status: 'CONDITION_NG',
      bgHex: COLOR_TOKENS.CONDITION_NG.bg,
      borderHex: COLOR_TOKENS.CONDITION_NG.border,
      textColorHex: COLOR_TOKENS.CONDITION_NG.text,
      glowHex: COLOR_TOKENS.CONDITION_NG.glow,
      label: COLOR_TOKENS.CONDITION_NG.label,
      isOccupied: true,
      isAging: true,
      isOverdue: true,
      isMatch: false,
    };
  }

  if (item.agingStatus === 'DATA_INCOMPLETE') {
    return {
      status: 'DATA_INCOMPLETE',
      bgHex: COLOR_TOKENS.DATA_INCOMPLETE.bg,
      borderHex: COLOR_TOKENS.DATA_INCOMPLETE.border,
      textColorHex: COLOR_TOKENS.DATA_INCOMPLETE.text,
      glowHex: COLOR_TOKENS.DATA_INCOMPLETE.glow,
      label: COLOR_TOKENS.DATA_INCOMPLETE.label,
      isOccupied: true,
      isAging: false,
      isOverdue: false,
      isMatch: false,
    };
  }

  if (item.agingStatus === 'EXPIRED') {
    return {
      status: 'EXPIRED',
      bgHex: COLOR_TOKENS.EXPIRED.bg,
      borderHex: COLOR_TOKENS.EXPIRED.border,
      textColorHex: COLOR_TOKENS.EXPIRED.text,
      glowHex: COLOR_TOKENS.EXPIRED.glow,
      label: COLOR_TOKENS.EXPIRED.label,
      isOccupied: true,
      isAging: true,
      isOverdue: true,
      isMatch: false,
    };
  }

  if (item.agingStatus === 'DUE_TODAY' || item.agingStatus === 'OVERDUE' || item.agingDays > criticalDaysThreshold) {
    return {
      status: 'OVERDUE_CRITICAL',
      bgHex: COLOR_TOKENS.OVERDUE_CRITICAL.bg,
      borderHex: COLOR_TOKENS.OVERDUE_CRITICAL.border,
      textColorHex: COLOR_TOKENS.OVERDUE_CRITICAL.text,
      glowHex: COLOR_TOKENS.OVERDUE_CRITICAL.glow,
      label: COLOR_TOKENS.OVERDUE_CRITICAL.label,
      isOccupied: true,
      isAging: true,
      isOverdue: true,
      isMatch: false,
    };
  }

  if (item.agingStatus === 'URGENT') {
    return {
      status: 'URGENT',
      bgHex: COLOR_TOKENS.URGENT.bg,
      borderHex: COLOR_TOKENS.URGENT.border,
      textColorHex: COLOR_TOKENS.URGENT.text,
      glowHex: COLOR_TOKENS.URGENT.glow,
      label: COLOR_TOKENS.URGENT.label,
      isOccupied: true,
      isAging: true,
      isOverdue: false,
      isMatch: false,
    };
  }

  if (item.agingStatus === 'WARNING' || item.agingDays > warningDaysThreshold) {
    return {
      status: 'AGING_WARNING',
      bgHex: COLOR_TOKENS.AGING_WARNING.bg,
      borderHex: COLOR_TOKENS.AGING_WARNING.border,
      textColorHex: COLOR_TOKENS.AGING_WARNING.text,
      glowHex: COLOR_TOKENS.AGING_WARNING.glow,
      label: COLOR_TOKENS.AGING_WARNING.label,
      isOccupied: true,
      isAging: true,
      isOverdue: false,
      isMatch: false,
    };
  }

  if (item.agingStatus === 'NORMAL') {
    return {
      status: 'VINYL_NORMAL',
      bgHex: COLOR_TOKENS.VINYL_NORMAL.bg,
      borderHex: COLOR_TOKENS.VINYL_NORMAL.border,
      textColorHex: COLOR_TOKENS.VINYL_NORMAL.text,
      glowHex: COLOR_TOKENS.VINYL_NORMAL.glow,
      label: COLOR_TOKENS.VINYL_NORMAL.label,
      isOccupied: true,
      isAging: false,
      isOverdue: false,
      isMatch: false,
    };
  }

  // Fallback for SAFE or generic
  return {
    status: 'OCCUPIED',
    bgHex: COLOR_TOKENS.OCCUPIED.bg,
    borderHex: COLOR_TOKENS.OCCUPIED.border,
    textColorHex: COLOR_TOKENS.OCCUPIED.text,
    glowHex: COLOR_TOKENS.OCCUPIED.glow,
    label: COLOR_TOKENS.OCCUPIED.label,
    isOccupied: true,
    isAging: false,
    isOverdue: false,
    isMatch: false,
  };
}
