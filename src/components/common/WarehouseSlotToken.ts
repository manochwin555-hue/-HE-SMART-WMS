import { InventoryItem } from '../../types';

/**
 * Standard Centralized Design Color Tokens for Warehouse Pallets & Slots
 * Follows the HEX WMS LGETH Global Status Design System
 */
export const COLOR_TOKENS = {
  EMPTY: {
    bg: '#0B1017',
    border: '#273244',
    text: '#667085',
    subtext: '#586274',
    glow: 'rgba(39, 50, 68, 0.4)',
    label: 'พื้นที่ว่าง',
    labelEn: 'Empty / Available',
    hex: '#0B1017',
  },
  OCCUPIED: {
    bg: '#EAF4FF',
    border: '#60A5FA',
    text: '#0F172A',
    subtext: '#334155',
    glow: 'rgba(96, 165, 250, 0.4)',
    label: 'จัดเก็บปกติ',
    labelEn: 'Occupied / Normal',
    hex: '#EAF4FF',
  },
  VINYL_NORMAL: {
    bg: '#EAF4FF',
    border: '#60A5FA',
    text: '#0F172A',
    subtext: '#334155',
    glow: 'rgba(96, 165, 250, 0.4)',
    label: 'ปกติ',
    labelEn: 'Normal',
    hex: '#EAF4FF',
  },
  AGING_WARNING: {
    bg: '#FFF4CC',
    border: '#F59E0B',
    text: '#7C4A03',
    subtext: '#B45309',
    glow: 'rgba(245, 158, 11, 0.4)',
    label: 'เตือน Aging',
    labelEn: 'Aging / Warning',
    hex: '#FFF4CC',
  },
  URGENT: {
    bg: '#FFF0D6',
    border: '#F97316',
    text: '#9A3412',
    subtext: '#C2410C',
    glow: 'rgba(249, 115, 22, 0.4)',
    label: 'เร่งด่วน',
    labelEn: 'Urgent',
    hex: '#FFF0D6',
  },
  OVERDUE_CRITICAL: {
    bg: '#D9043E',
    border: '#FF1744',
    text: '#FFFFFF',
    subtext: '#FFE4E6',
    glow: 'rgba(217, 4, 62, 0.5)',
    label: 'วิกฤต / หมดอายุ',
    labelEn: 'Critical / Expired',
    hex: '#D9043E',
  },
  EXPIRED: {
    bg: '#D9043E',
    border: '#FF1744',
    text: '#FFFFFF',
    subtext: '#FFE4E6',
    glow: 'rgba(217, 4, 62, 0.5)',
    label: 'เกินกำหนด (Expired)',
    labelEn: 'Expired',
    hex: '#D9043E',
  },
  CONDITION_NG: {
    bg: '#D9043E',
    border: '#FF1744',
    text: '#FFFFFF',
    subtext: '#FFE4E6',
    glow: 'rgba(217, 4, 62, 0.5)',
    label: 'สภาพ NG',
    labelEn: 'Condition NG',
    hex: '#D9043E',
  },
  DATA_INCOMPLETE: {
    bg: '#6E40C9',
    border: '#8957E5',
    text: '#FFFFFF',
    subtext: '#E9D5FF',
    glow: 'rgba(110, 64, 201, 0.4)',
    label: 'ข้อมูลไม่ครบ',
    labelEn: 'Data Incomplete',
    hex: '#6E40C9',
  },
  SEARCH_MATCH: {
    border: '#10B981',
    ring: '#10B981',
    glow: 'rgba(16, 185, 129, 0.5)',
    label: 'เลือก / ผลการค้นหา',
    labelEn: 'Search Match / Selected',
  },
} as const;

export type SlotStatusType = 
  | 'EMPTY' 
  | 'OCCUPIED' 
  | 'VINYL_NORMAL' 
  | 'AGING_WARNING' 
  | 'URGENT' 
  | 'OVERDUE_CRITICAL' 
  | 'EXPIRED' 
  | 'CONDITION_NG' 
  | 'DATA_INCOMPLETE' 
  | 'SEARCH_MATCH';

export interface SlotStatusResult {
  status: SlotStatusType;
  bgHex: string;
  borderHex: string;
  textColorHex: string;
  ringHex?: string;
  glowHex: string;
  label: string;
  isOccupied: boolean;
  isAging: boolean;
  isUrgent: boolean;
  isOverdue: boolean;
  isMatch: boolean;
}

/**
 * Universal evaluator for slot status and colors
 * Preserves underlying business status and overlays green selection/search ring when matched
 */
export function evaluateSlotStatus(
  item: InventoryItem | null | undefined,
  isSearchMatch = false,
  warningDaysThreshold = 14,
  criticalDaysThreshold = 30
): SlotStatusResult {
  // 1. Determine underlying status
  let baseStatus: SlotStatusType = 'EMPTY';
  let bgHex: string = COLOR_TOKENS.EMPTY.bg;
  let borderHex: string = COLOR_TOKENS.EMPTY.border;
  let textColorHex: string = COLOR_TOKENS.EMPTY.text;
  let glowHex: string = COLOR_TOKENS.EMPTY.glow;
  let label: string = COLOR_TOKENS.EMPTY.label;
  let isOccupied = false;
  let isAging = false;
  let isUrgent = false;
  let isOverdue = false;

  if (item) {
    isOccupied = true;

    if (
      item.agingStatus === 'EXPIRED' ||
      item.agingStatus === 'CONDITION_NG' ||
      (item.wrappingCondition && ['TORN', 'LOOSE', 'WET', 'CONTAMINATED', 'OPEN'].includes(item.wrappingCondition)) ||
      item.agingStatus === 'OVERDUE' ||
      item.agingDays > criticalDaysThreshold
    ) {
      baseStatus = item.agingStatus === 'EXPIRED' ? 'EXPIRED' : 'OVERDUE_CRITICAL';
      bgHex = COLOR_TOKENS.OVERDUE_CRITICAL.bg;
      borderHex = COLOR_TOKENS.OVERDUE_CRITICAL.border;
      textColorHex = COLOR_TOKENS.OVERDUE_CRITICAL.text;
      glowHex = COLOR_TOKENS.OVERDUE_CRITICAL.glow;
      label = COLOR_TOKENS.OVERDUE_CRITICAL.label;
      isAging = true;
      isOverdue = true;
    } else if (item.agingStatus === 'URGENT') {
      baseStatus = 'URGENT';
      bgHex = COLOR_TOKENS.URGENT.bg;
      borderHex = COLOR_TOKENS.URGENT.border;
      textColorHex = COLOR_TOKENS.URGENT.text;
      glowHex = COLOR_TOKENS.URGENT.glow;
      label = COLOR_TOKENS.URGENT.label;
      isAging = true;
      isUrgent = true;
    } else if (item.agingStatus === 'WARNING' || item.agingDays > warningDaysThreshold) {
      baseStatus = 'AGING_WARNING';
      bgHex = COLOR_TOKENS.AGING_WARNING.bg;
      borderHex = COLOR_TOKENS.AGING_WARNING.border;
      textColorHex = COLOR_TOKENS.AGING_WARNING.text;
      glowHex = COLOR_TOKENS.AGING_WARNING.glow;
      label = COLOR_TOKENS.AGING_WARNING.label;
      isAging = true;
    } else if (item.agingStatus === 'DATA_INCOMPLETE') {
      baseStatus = 'DATA_INCOMPLETE';
      bgHex = COLOR_TOKENS.DATA_INCOMPLETE.bg;
      borderHex = COLOR_TOKENS.DATA_INCOMPLETE.border;
      textColorHex = COLOR_TOKENS.DATA_INCOMPLETE.text;
      glowHex = COLOR_TOKENS.DATA_INCOMPLETE.glow;
      label = COLOR_TOKENS.DATA_INCOMPLETE.label;
    } else {
      baseStatus = 'OCCUPIED';
      bgHex = COLOR_TOKENS.OCCUPIED.bg;
      borderHex = COLOR_TOKENS.OCCUPIED.border;
      textColorHex = COLOR_TOKENS.OCCUPIED.text;
      glowHex = COLOR_TOKENS.OCCUPIED.glow;
      label = COLOR_TOKENS.OCCUPIED.label;
    }
  }

  // 2. Interaction state (Search Match / Selected) overrides border to Green #10B981
  if (isSearchMatch) {
    return {
      status: baseStatus,
      bgHex,
      borderHex: COLOR_TOKENS.SEARCH_MATCH.border,
      textColorHex,
      ringHex: COLOR_TOKENS.SEARCH_MATCH.ring,
      glowHex: COLOR_TOKENS.SEARCH_MATCH.glow,
      label,
      isOccupied,
      isAging,
      isUrgent,
      isOverdue,
      isMatch: true,
    };
  }

  return {
    status: baseStatus,
    bgHex,
    borderHex,
    textColorHex,
    glowHex,
    label,
    isOccupied,
    isAging,
    isUrgent,
    isOverdue,
    isMatch: false,
  };
}
