import { InventoryItem, MasterDataItem } from '../types';
import { resolveCanonicalCoordinate } from './locatorUtils';

/**
 * Retrieves standard pallet capacity for a given model from Master Data or default.
 * Defaults to 50 for Model 5006, 80 for Model 904/ADL74920904, or 80 fallback.
 */
export const getModelStdCapacity = (modelHE: string, masterData: MasterDataItem[] = []): number => {
  if (!modelHE) return 80;
  const clean = modelHE.trim().toUpperCase();

  // 1. Direct match in Master Data
  const master = masterData.find(m => m.modelHE.toUpperCase() === clean);
  if (master && master.stdQtyPerPallet && master.stdQtyPerPallet > 0) {
    return master.stdQtyPerPallet;
  }

  // 2. Known model rules (e.g., 5006 = 50, 904 = 80)
  if (clean.includes('5006')) {
    return 50;
  }
  if (clean.includes('904') || clean.includes('ADL74920904')) {
    return 80;
  }

  return 80;
};

export interface PalletCapacityEvaluation {
  isOvercapacity: boolean;
  capacityRatio: number; // e.g. 1.3 for 130%
  capacityPercent: number; // e.g. 130
  badgeColor: string;
  badgeTextColor: string;
  label: string;
  status: 'UNDER' | 'FULL' | 'OVER';
}

/**
 * Evaluates whether a pallet's quantity is within standard capacity, full, or overcapacity.
 */
export const evaluatePalletCapacity = (quantity: number, stdCapacity: number): PalletCapacityEvaluation => {
  const cap = stdCapacity > 0 ? stdCapacity : 80;
  const qty = Math.max(0, quantity);
  const ratio = Number((qty / cap).toFixed(2));
  const percent = Math.round((qty / cap) * 100);

  if (qty > cap) {
    return {
      isOvercapacity: true,
      capacityRatio: ratio,
      capacityPercent: percent,
      badgeColor: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
      badgeTextColor: 'text-amber-400',
      label: `⚠️ เกินความจุพาเลท (${percent}%) [Flexible Batch]`,
      status: 'OVER'
    };
  }

  if (qty === cap) {
    return {
      isOvercapacity: false,
      capacityRatio: 1,
      capacityPercent: 100,
      badgeColor: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
      badgeTextColor: 'text-emerald-400',
      label: `✅ เต็มพาเลทมาตรฐาน (100%)`,
      status: 'FULL'
    };
  }

  return {
    isOvercapacity: false,
    capacityRatio: ratio,
    capacityPercent: percent,
    badgeColor: 'bg-blue-500/20 border-blue-500/40 text-blue-300',
    badgeTextColor: 'text-blue-400',
    label: `📦 ปกติ (${percent}%)`,
    status: 'UNDER'
  };
};

/**
 * Canonical coordinate key helper to prevent phantom coordinate collisions.
 */
export const getPhysicalSlotKey = (item: {
  locatorCode?: string;
  zone: string;
  bayNumber: number;
  level: number;
  palletPosition?: string;
}): string => {
  const resolved = resolveCanonicalCoordinate({
    zone: item.zone,
    bayNumber: item.bayNumber,
    level: item.level,
    palletPosition: item.palletPosition,
    locatorCode: item.locatorCode
  });
  return resolved.canonicalLocator;
};

export interface SlotValidationResult {
  allowed: boolean;
  reason?: string;
  existingItem?: InventoryItem;
  canMerge: boolean;
  projectedTotal?: number;
  stdCapacity?: number;
}

/**
 * Validates whether an incoming or transferred item can be placed into a slot.
 * Enforces rule:
 * - Reject mixing different models on the same pallet position.
 * - Allow merging same model into existing pallet.
 */
export const validateSlotPlacement = (
  targetLocator: string | undefined,
  targetPalletPos: string | undefined,
  incomingModel: string,
  existingItems: InventoryItem[],
  incomingQty: number = 0,
  masterData: MasterDataItem[] = []
): SlotValidationResult => {
  if (!incomingModel || !targetLocator) {
    return { allowed: true, canMerge: false };
  }

  const cleanIncomingModel = incomingModel.trim().toUpperCase();
  const cleanTargetLoc = targetLocator.trim().toUpperCase();
  const cleanPos = (targetPalletPos || (cleanTargetLoc.includes('-P2') ? 'P2' : 'P1')).toUpperCase();

  // Find if slot is currently occupied
  const existing = existingItems.find(it => {
    if (it.locatorCode && it.locatorCode.trim().toUpperCase() === cleanTargetLoc) {
      return true;
    }
    // Also check position match if rack
    const itPos = (it.palletPosition || (it.locatorCode?.includes('-P2') ? 'P2' : 'P1')).toUpperCase();
    if (itPos === cleanPos && it.locatorCode?.replace(/-P[12]$/i, '') === cleanTargetLoc.replace(/-P[12]$/i, '')) {
      return true;
    }
    return false;
  });

  if (!existing) {
    return {
      allowed: true,
      canMerge: false,
      projectedTotal: incomingQty,
      stdCapacity: getModelStdCapacity(incomingModel, masterData)
    };
  }

  const existingModel = existing.modelHE.trim().toUpperCase();
  const stdCapacity = existing.stdQtyPerPallet || getModelStdCapacity(existingModel, masterData);

  // Model mixing check: Reject different models
  if (existingModel !== cleanIncomingModel) {
    return {
      allowed: false,
      reason: `⛔ ตำแหน่ง ${cleanTargetLoc} มีสินค้า Model: ${existing.modelHE} (${existing.quantity} ชิ้น) อยู่แล้ว ไม่อนุญาตให้จัดเก็บปน Model ในพาเลทเดียวกัน`,
      existingItem: existing,
      canMerge: false
    };
  }

  // Same model: Allow merging
  const projectedTotal = existing.quantity + incomingQty;
  return {
    allowed: true,
    canMerge: true,
    existingItem: existing,
    projectedTotal,
    stdCapacity
  };
};

/**
 * Recalculates inventory consistency across all items in WMS.
 * 1. Eliminates phantom entries (zero/negative quantity, empty locator/model).
 * 2. Resolves overlapping coordinates (merges same model, isolates duplicates).
 * 3. Enforces model-specific pallet capacity standards (stdQtyPerPallet).
 * 4. Updates fullPallets, looseQty, isOvercapacity, capacityRatio.
 */
export const recalculateInventoryConsistency = (
  items: InventoryItem[],
  masterData: MasterDataItem[] = []
): InventoryItem[] => {
  if (!items || items.length === 0) return [];

  // Group items by physical slot key
  const slotMap = new Map<string, InventoryItem[]>();

  items.forEach(rawItem => {
    // Basic sanity checks: quantity must be positive and model must not be empty
    if (!rawItem || typeof rawItem.quantity !== 'number' || rawItem.quantity <= 0) {
      return; // Discard phantom / zero / negative items
    }
    if (!rawItem.modelHE || !rawItem.modelHE.trim()) {
      return; // Discard invalid model entries
    }

    const key = getPhysicalSlotKey(rawItem);
    const existingGroup = slotMap.get(key) || [];
    existingGroup.push({ ...rawItem });
    slotMap.set(key, existingGroup);
  });

  const sanitizedList: InventoryItem[] = [];

  slotMap.forEach((groupItems) => {
    if (groupItems.length === 1) {
      // Single item in slot: calculate standard capacity metrics
      const item = groupItems[0];
      const stdCap = item.stdQtyPerPallet || getModelStdCapacity(item.modelHE, masterData);
      const capEval = evaluatePalletCapacity(item.quantity, stdCap);

      sanitizedList.push({
        ...item,
        stdQtyPerPallet: stdCap,
        fullPallets: Math.floor(item.quantity / stdCap),
        looseQty: item.quantity % stdCap,
        isOvercapacity: capEval.isOvercapacity,
        capacityRatio: capEval.capacityRatio
      });
      return;
    }

    // Multiple items claimed the same physical slot coordinate:
    // Check if they are of the same model (can be merged)
    const primaryModel = groupItems[0].modelHE.trim().toUpperCase();
    const allSameModel = groupItems.every(
      it => it.modelHE.trim().toUpperCase() === primaryModel
    );

    if (allSameModel) {
      // Merge same-model duplicates into 1 canonical item record
      const totalQty = groupItems.reduce((sum, it) => sum + it.quantity, 0);
      const oldestDate = groupItems.reduce((oldest, it) => {
        if (!oldest) return it.storageInDate;
        return new Date(it.storageInDate).getTime() < new Date(oldest).getTime()
          ? it.storageInDate
          : oldest;
      }, groupItems[0].storageInDate);

      const maxAgingDays = Math.max(...groupItems.map(it => it.agingDays || 0));
      const stdCap = groupItems[0].stdQtyPerPallet || getModelStdCapacity(primaryModel, masterData);
      const capEval = evaluatePalletCapacity(totalQty, stdCap);

      const mergedItem: InventoryItem = {
        ...groupItems[0],
        quantity: totalQty,
        stdQtyPerPallet: stdCap,
        fullPallets: Math.floor(totalQty / stdCap),
        looseQty: totalQty % stdCap,
        storageInDate: oldestDate,
        agingDays: maxAgingDays,
        isOvercapacity: capEval.isOvercapacity,
        capacityRatio: capEval.capacityRatio,
        remark: groupItems
          .map(it => it.remark)
          .filter(Boolean)
          .join('; ') || undefined
      };
      sanitizedList.push(mergedItem);
    } else {
      // Conflicting different models in the exact same slot:
      // Keep the most recent valid item and flag the conflict
      const latestItem = groupItems.reduce((latest, it) => {
        return new Date(it.storageInDate || 0).getTime() > new Date(latest.storageInDate || 0).getTime()
          ? it
          : latest;
      }, groupItems[0]);

      const stdCap = latestItem.stdQtyPerPallet || getModelStdCapacity(latestItem.modelHE, masterData);
      const capEval = evaluatePalletCapacity(latestItem.quantity, stdCap);

      sanitizedList.push({
        ...latestItem,
        stdQtyPerPallet: stdCap,
        fullPallets: Math.floor(latestItem.quantity / stdCap),
        looseQty: latestItem.quantity % stdCap,
        isOvercapacity: capEval.isOvercapacity,
        capacityRatio: capEval.capacityRatio
      });
    }
  });

  return sanitizedList;
};
