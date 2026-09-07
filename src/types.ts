export type StorageZone = 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | string;

export type StorageLocationType = 'RACK' | 'FLOW_RAIL' | 'FLOOR_STAGING';

// --- NEW TYPES FOR VINYL WRAPPING ---
export type ProtectionMethod = 'RUBBER_CAP' | 'VINYL_WRAPPING' | 'NOT_APPLICABLE';
export type ProductType = 'IN_HOUSE' | 'CSKD' | 'DO' | 'OTHER';
export type ProductStorageType = 'INDOOR' | 'CANOPY' | 'OUTDOOR'; 
export type WrappingCondition = 'OK' | 'TORN' | 'LOOSE' | 'WET' | 'CONTAMINATED' | 'OPEN' | 'NOT_INSPECTED';
export type AgingStatus = 'SAFE' | 'WARNING' | 'OVERDUE' | 'NORMAL' | 'URGENT' | 'DUE_TODAY' | 'EXPIRED' | 'CONDITION_NG' | 'DATA_INCOMPLETE';
// ------------------------------------

export interface WarehouseFacility {
  id: string; // e.g. "FAC-A4-MAIN", "FAC-A2-RAIL"
  code: string; // e.g. "A4-BLDG", "A2-BLDG"
  name: string; // e.g. "A4 Building Rack and Floor", "A2 Building Floor and Rail"
  building: string; // e.g. "อาคาร A4", "อาคาร A2"
  storageTypes: StorageLocationType[];
  zones: string[];
  totalCapacityPallets: number;
  description?: string;
  managerName?: string;
  contactNumber?: string;
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
  isDefault?: boolean;
}

export interface StorageStation {
  id: string;
  name: string;
  code: string;
  description: string;
  type: 'RACK_MAIN' | 'FLOW_AND_FLOOR' | 'CUSTOM';
  zones: string[];
  totalCapacityPallets: number;
}

export type MovementType = 'IN' | 'OUT' | 'TRANSFER';

export type ScanStatus = 'DONE' | 'WAIT_QR' | 'WAIT_LOCATOR' | 'QTY_GAP' | 'AGING_ALERT';

export type ShelfLevel = 1 | 2 | 3 | 4; // 4 ชั้น per bay

export interface CustomRackSlot {
  id: string;
  facilityId?: string; // e.g. 'FAC-A4-MAIN' | 'FAC-A2-RAIL'
  stationId: string;
  zone: string;
  bayNumber: number;
  maxLevels: number;
  storageType: StorageLocationType;
  capacityPerLevel: number;
  description?: string;
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
}

export interface MasterDataItem {
  modelHE: string;
  partName: string; // Tool Name
  safetyStock: number;
  stdQtyPerPallet?: number; // มาตรฐานจำนวนชิ้นต่อ 1 พาเลทเต็ม (e.g. 80 ตัว/pallet)
  protectionMethod?: ProtectionMethod; // Default NOT_APPLICABLE
  productType?: ProductType;
  storageType?: ProductStorageType;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: 'UPDATE_STATUS' | 'RE_WRAPPING' | 'CONDITION_UPDATE' | 'MANUAL_EDIT' | 'SYSTEM_EVALUATION';
  itemId: string;
  modelHE: string;
  locatorCode: string;
  oldValue: string;
  newValue: string;
  reason?: string;
  user?: string;
}

export interface UseLineMaster {
  id: string; // e.g. "HE1"
  name: string; // e.g. "Line HE1"
  description?: string;
}

export interface AgingThresholdConfig {
  safeDaysMin?: number; // e.g. 0 (0 to safeDaysMax is Normal)
  safeDaysMax: number; // e.g. 21 (0 - 21 is Normal)
  warningDaysMin?: number; // e.g. 22 (warningDaysMin to warningDaysMax is Warning)
  warningDaysMax: number; // e.g. 24 (22 - 24 is Warning)
  urgentDaysMin?: number; // e.g. 25 (urgentDaysMin to urgentDaysMax is Urgent)
  urgentDaysMax?: number; // e.g. 27 (25 - 27 is Urgent)
  dueDay?: number; // e.g. 28 (Day 28 is Due Today)
  criticalDays: number; // e.g. 28 (> 28 is Expired)
  indoorRubberCapDays?: number; // e.g. 28 (> 28 for indoor A2/A4)
  autoAlertEnabled: boolean;
  notifyOnFifoViolation?: boolean;
  customRuleName?: string;
  // Vinyl Wrapping Rule settings
  vinylWarningStartDay?: number; // Default 22
  vinylUrgentStartDay?: number; // Default 25
  vinylMaxDueDays?: number; // Default 28
}

export interface ZoneCapacityMaster {
  zone: StorageZone;
  standardPalletsPerBay: number; // ความจุมาตรฐานกี่พาเลท ต่อ 1 Bay (e.g. 8 พาเลท/Bay)
  defaultStdQtyPerPallet: number; // มาตรฐานชิ้นต่อพาเลท (e.g. 80 ตัว/Pallet)
  description?: string;
}

export interface InventoryItem {
  id: string;
  modelHE: string; // e.g. "ADL74920904", "ACG76284709"
  partName: string;
  quantity: number;
  unit?: string;
  stdQtyPerPallet?: number; // มาตรฐานชิ้นต่อพาเลท (e.g. 80)
  fullPallets?: number; // จำนวนพาเลทเต็ม (e.g. 3)
  looseQty?: number; // จำนวนเศษ (e.g. 70)
  safetyStock?: number; // Minimum required inventory threshold
  qrCode: string;
  locatorCode: string; // e.g. "DA4D-1.05-E6-L3"
  zone: StorageZone;
  bayNumber: number; // 1 - 12 for B-F, 1 - 5 for G-K
  level: ShelfLevel; // ชั้น 1, 2, 3, 4
  storageType?: StorageLocationType; // 'RACK' | 'FLOW_RAIL' | 'FLOOR_STAGING'
  facilityId?: string; // e.g. 'FAC-A4-MAIN' | 'FAC-A2-RAIL'
  stationId?: string; // e.g. 'STATION_1' | 'STATION_2'
  useLine: string; // e.g. "HE1", "HE2", "HE3"
  storageInDate: string; // ISO date string
  
  // Base Aging
  agingDays: number;
  agingStatus: AgingStatus; // Modified to extended type
  
  // Vinyl Wrapping specific properties
  lotNumber?: string;
  protectionMethod?: ProtectionMethod;
  productType?: ProductType;
  productStorageType?: ProductStorageType;
  productionDate?: string; 
  wrappingDate?: string; 
  agingStartDate?: string; 
  dueDate?: string; 
  remainingDays?: number;
  wrappingCondition?: WrappingCondition;
  holdStatus?: boolean;
  holdReason?: string;
  lastInspectionDate?: string;
  lastInspectedBy?: string;
  qualityDisposition?: string;
  reWrappingDate?: string;
  originalDueDate?: string;

  priorityUse: boolean;
  palletBarcode?: string;
  remark?: string;
  lastCycleCountQty?: number;
  lastCycleCountDate?: string;
  varianceQty?: number;
}

export interface CycleCountRecord {
  id: string;
  modelHE: string;
  partName: string;
  locatorCode: string;
  systemQty: number;
  physicalQty: number;
  varianceQty: number;
  lastCountDate: string;
  counterName: string;
  status: 'MATCH' | 'SURPLUS' | 'SHORTAGE';
  resolved?: boolean;
}

export interface RackBay {
  id: string; // e.g. "E6"
  zone: StorageZone;
  number: number; // 1..12
  capacityPallets: number; // e.g. 4 pallets (1 per level)
  levels: {
    level: ShelfLevel;
    item?: InventoryItem;
    isOccupied: boolean;
  }[];
}

export interface MovementLog {
  id: string;
  scanInput: string;
  type: MovementType;
  modelHE: string;
  locatorCode: string;
  locatorGroup: string;
  locatorDetail: string;
  quantityCheck: number;
  actualQty: number;
  qtyGap: number;
  balanceQty: number;
  useLine: string;
  facilityId?: string;
  scanStatus: ScanStatus;
  issueDate: string;
  createdOn: string;
  remark?: string;
  agingDays?: number;
  // Vinyl properties
  holdStatus?: boolean;
  holdReason?: string;
  qualityDisposition?: string;
  reWrappingDate?: string;
}

export interface WmsStats {
  totalBalanceUnits: number;
  todayInScanCount: number;
  todayOutScanCount: number;
  occupiedRacksCount: number;
  totalRackCapacity: number;
  agingAlertCount: number;
  rackBFOccupied: number;
  rackBFCapacity: number;
  rackJGOccupied: number;
  rackJGCapacity: number;
}

