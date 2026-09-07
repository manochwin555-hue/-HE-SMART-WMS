import { InventoryItem, AgingStatus, WrappingCondition, AgingThresholdConfig } from '../types';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface VinylWrappingInput {
  startDate: string | Date; // วันที่เริ่มจัดเก็บ (ป้องกันการรีเซ็ตเมื่อห่อใหม่)
  currentCondition: string; // สถานะปัจจุบัน เช่น 'OK', 'NG', 'CONDITION_NG'
  location: string;         // พื้นที่จัดเก็บ เช่น 'CY3', 'A5 Tent', 'A2', 'A4 Rack'
}

export interface VinylWrappingOutput {
  agingDays: number;
  agingStatus: AgingStatus;
  requiresRubberCap: boolean; // คำแนะนำการใส่จุกยาง (Rubber Cap)
  recommendation: string;     // ข้อความแนะนำการจัดการ
}

export interface VinylStatusResult {
  agingStartDate?: string;
  dueDate?: string;
  ageDays: number;
  remainingDays: number;
  agingStatus: AgingStatus;
  holdStatus: boolean;
  holdReason?: string;
}

// ============================================================================
// Timezone Helpers (Asia/Bangkok)
// ============================================================================

/**
 * ฟังก์ชันดึงค่าวันที่ในเขตเวลา Asia/Bangkok
 * (ใช้ป้องกันปัญหา Timezone Mismatch ระหว่าง Client และ Server)
 */
export function getBangkokDate(date: string | Date = new Date()): Date {
  const tzString = new Date(date).toLocaleString("en-US", { timeZone: "Asia/Bangkok" });
  return new Date(tzString);
}

/**
 * Helper แปลงวันที่เป็น String (YYYY-MM-DD) ในโซน Asia/Bangkok
 */
export function getBangkokDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', { 
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(date);
}

/**
 * Helper to parse a YYYY-MM-DD string as a UTC midnight date to calculate calendar days exactly.
 */
function parseDateStringAsUTC(dateStr: string): Date {
  // Append T00:00:00Z to ensure it parses as exact UTC midnight
  return new Date(`${dateStr}T00:00:00Z`);
}

// ============================================================================
// Core Logic: Vinyl Wrapping & Rubber Cap Rules
// ============================================================================

/**
 * ฟังก์ชันประเมินสถานะ Aging และคำแนะนำเรื่อง Rubber Cap ตามเงื่อนไขพื้นที่จัดเก็บ
 */
export function evaluateVinylWrappingRule(
  input: VinylWrappingInput,
  config?: Partial<AgingThresholdConfig>
): VinylWrappingOutput {
  const { startDate, currentCondition, location } = input;

  const normalMax = config?.safeDaysMax ?? 21;
  const warningMin = config?.warningDaysMin ?? 22;
  const warningMax = config?.warningDaysMax ?? 24;
  const urgentMin = config?.urgentDaysMin ?? 25;
  const urgentMax = config?.urgentDaysMax ?? 27;
  const dueDay = config?.dueDay ?? 28;
  const criticalDays = config?.criticalDays ?? 28;
  const indoorCapDays = config?.indoorRubberCapDays ?? 28;

  // 1. คำนวณวันหมดอายุ (Calendar Days) ในเขตเวลา Asia/Bangkok เสมอ
  const bkkNow = getBangkokDate();
  const bkkStart = getBangkokDate(startDate);
  
  // Set เป็นเวลาเที่ยงคืนเพื่อหาค่าความต่างของวันได้แม่นยำ (ตัดเศษชั่วโมง/นาทีทิ้ง)
  bkkNow.setHours(0, 0, 0, 0);
  bkkStart.setHours(0, 0, 0, 0);
  
  const diffTime = bkkNow.getTime() - bkkStart.getTime();
  const agingDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

  // 2. จัดการ Condition Override (หากพบว่าเสียหาย แจ้งเตือนทันที)
  if (currentCondition === 'NG' || currentCondition === 'CONDITION_NG' || ['TORN', 'LOOSE', 'WET', 'CONTAMINATED', 'OPEN'].includes(currentCondition)) {
    return {
      agingDays,
      agingStatus: 'CONDITION_NG',
      requiresRubberCap: false,
      recommendation: 'สถานะสินค้าเสียหาย (CONDITION_NG) ต้องได้รับการตรวจสอบสภาพพลาสติก หรือแก้ไขทันที!'
    };
  }

  // 3. ประเมิน Aging (รอบ 28 วัน)
  let status: AgingStatus = 'NORMAL';
  if (agingDays > criticalDays) {
    status = 'EXPIRED';
  } else if (agingDays === dueDay) {
    status = 'DUE_TODAY';
  } else if (agingDays >= urgentMin && agingDays <= urgentMax) {
    status = 'URGENT';
  } else if (agingDays >= warningMin && agingDays <= warningMax) {
    status = 'WARNING';
  } else {
    // 0-21 วัน (NORMAL)
    status = 'NORMAL';
  }

  // 4. กฎ Location & Rubber Cap Rules
  const locUpper = location.toUpperCase();
  // กลุ่ม 1: CY3 & A5 นอกอาคาร/เต็นท์
  const isGroup1 = locUpper.includes('CY3') || locUpper.includes('A5') || locUpper.includes('OUTDOOR') || locUpper.includes('CANOPY');
  // กลุ่ม 2: ในอาคาร (A2, A4)
  const isGroup2 = locUpper.includes('A2') || locUpper.includes('A4') || locUpper.includes('INDOOR');

  let requiresRubberCap = false;
  let recommendation = 'ปกติ';

  if (isGroup1) {
    // กลุ่มที่ 1: บังคับใส่ Rubber Cap เสมอตั้งแต่วันแรก (Day 0+)
    requiresRubberCap = true;
    recommendation = status === 'EXPIRED' 
      ? `สินค้าเกิน ${criticalDays} วันและอยู่นอกอาคาร ต้องตรวจสอบสภาพด่วน! (บังคับใส่จุกยาง)`
      : 'จัดเก็บนอกอาคาร/เต็นท์ บังคับใส่จุกยาง (Rubber Cap) เสมอตั้งแต่วันแรก (Day 0+)';
  } else if (isGroup2) {
    // กลุ่มที่ 2: อนุโลมในอาคาร ไม่ต้องใส่จุกยาง ยกเว้นเกิน indoorCapDays (> 28 วัน)
    if (status === 'EXPIRED' || agingDays > indoorCapDays) {
      requiresRubberCap = true;
      recommendation = `สินค้าในอาคารมีอายุเกิน ${indoorCapDays} วัน ต้องตรวจสอบ Wrapping หรือทำการใส่จุกยาง (Rubber Cap) ทันที!`;
    } else {
      requiresRubberCap = false;
      recommendation = 'จัดเก็บในอาคาร อนุโลมยังไม่ต้องใส่จุกยาง (Rubber Cap)';
    }
  } else {
    // พื้นที่อื่นๆ ที่ไม่ระบุแน่ชัด (ใช้เกณฑ์ความปลอดภัย)
    if (agingDays > indoorCapDays) {
      requiresRubberCap = true;
      recommendation = `อายุเกิน ${indoorCapDays} วัน ต้องตรวจสอบ Wrapping หรือทำการใส่จุกยางทันที!`;
    } else {
      requiresRubberCap = false;
      recommendation = 'จัดเก็บปกติ (ไม่บังคับจุกยาง)';
    }
  }

  return {
    agingDays,
    agingStatus: status,
    requiresRubberCap,
    recommendation
  };
}

// ============================================================================
// Legacy compatibility
// ============================================================================

/**
 * Calculates the aging status for a Vinyl Wrapping item based on its production and wrapping dates.
 */
export function calculateVinylWrappingStatus(
  productionDate?: string,
  wrappingDate?: string,
  condition?: WrappingCondition,
  currentDateObj: Date = new Date() 
): VinylStatusResult {
  
  // 1. Determine Aging Start Date (String comparison works well for YYYY-MM-DD)
  // การ Re-wrapping ต้องไม่รีเซ็ตวันที่เริ่มต้น
  let agingStartDateStr = '';
  if (productionDate && wrappingDate) {
    agingStartDateStr = productionDate < wrappingDate ? productionDate : wrappingDate;
  } else if (productionDate) {
    agingStartDateStr = productionDate;
  } else if (wrappingDate) {
    agingStartDateStr = wrappingDate;
  }
  
  if (!agingStartDateStr) {
    agingStartDateStr = getBangkokDateString(currentDateObj);
  }

  // 2. ใช้ Core Logic ในการคำนวณวันและสถานะ 
  // (สมมุติ location เป็น UNKNOWN เพื่อใช้ผลลัพธ์ fallback)
  const evalResult = evaluateVinylWrappingRule({
    startDate: agingStartDateStr,
    currentCondition: condition || 'OK',
    location: 'UNKNOWN'
  });

  const startMidnight = parseDateStringAsUTC(agingStartDateStr);
  const dueMidnight = new Date(startMidnight.getTime());
  dueMidnight.setDate(dueMidnight.getDate() + 28);
  const dueDateStr = dueMidnight.toISOString().split('T')[0];

  const isHold = ['EXPIRED', 'DUE_TODAY', 'CONDITION_NG'].includes(evalResult.agingStatus);

  return {
    agingStartDate: agingStartDateStr,
    dueDate: dueDateStr,
    ageDays: evalResult.agingDays,
    remainingDays: Math.max(0, 28 - evalResult.agingDays),
    agingStatus: evalResult.agingStatus,
    holdStatus: isHold,
    holdReason: isHold ? evalResult.recommendation : undefined
  };
}

/**
 * Validates if an item can use Vinyl Wrapping
 */
export function validateVinylWrappingAllowed(
  productType?: string,
  storageType?: string
): { allowed: boolean; reason?: string } {
  if (productType === 'CSKD' || productType === 'DO') {
    return { allowed: false, reason: `Product Type '${productType}' ไม่อนุญาตให้ใช้ Vinyl Wrapping` };
  }
  if (storageType === 'CANOPY' || storageType === 'OUTDOOR') {
    return { allowed: false, reason: `Storage Type '${storageType}' ไม่อนุญาตให้ใช้ Vinyl Wrapping` };
  }
  if (productType !== 'IN_HOUSE') {
     return { allowed: false, reason: 'อนุญาตเฉพาะ In-House Product' };
  }
  if (storageType !== 'INDOOR') {
     return { allowed: false, reason: 'อนุญาตเฉพาะ Indoor Storage' };
  }
  return { allowed: true };
}
