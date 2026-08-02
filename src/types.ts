export type StorageZone = 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K';

export type MovementType = 'IN' | 'OUT';

export type ScanStatus = 'DONE' | 'WAIT_QR' | 'WAIT_LOCATOR' | 'QTY_GAP' | 'AGING_ALERT';

export type ShelfLevel = 1 | 2 | 3 | 4; // 4 ชั้น per bay

export interface MasterDataItem {
  modelHE: string;
  partName: string; // Tool Name
  safetyStock: number;
  stdQtyPerPallet?: number; // มาตรฐานจำนวนชิ้นต่อ 1 พาเลทเต็ม (e.g. 80 ตัว/pallet)
}

export interface UseLineMaster {
  id: string; // e.g. "HE1"
  name: string; // e.g. "Line HE1"
  description?: string;
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
  stdQtyPerPallet?: number; // มาตรฐานชิ้นต่อพาเลท (e.g. 80)
  fullPallets?: number; // จำนวนพาเลทเต็ม (e.g. 3)
  looseQty?: number; // จำนวนเศษ (e.g. 70)
  safetyStock?: number; // Minimum required inventory threshold
  qrCode: string;
  locatorCode: string; // e.g. "DA4D-1.05-E6-L3"
  zone: StorageZone;
  bayNumber: number; // 1 - 12 for B-F, 1 - 5 for G-K
  level: ShelfLevel; // ชั้น 1, 2, 3, 4
  useLine: string; // e.g. "HE1", "HE2", "HE3"
  storageInDate: string; // ISO date string
  agingDays: number;
  agingStatus: 'SAFE' | 'WARNING' | 'OVERDUE';
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
  scanStatus: ScanStatus;
  issueDate: string;
  createdOn: string;
  remark?: string;
  agingDays?: number;
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
