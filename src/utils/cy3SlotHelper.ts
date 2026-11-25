import { InventoryItem, ShelfLevel } from '../types';

export type CY3RowCode = 'A' | 'B' | 'C' | 'D';

export interface CY3RowSpec {
  code: CY3RowCode;
  z: number;
  sign: string;
  bays: number;
  color: string;
}

/**
 * Authoritative CY3 High-Bay Tent Row Configuration:
 * - Row A (DY3T-1.01): 25 Bays (100 P)
 * - Row B (DY3T-1.02): 23 Bays (92 P)
 * - Row C (DY3T-1.03): 23 Bays (92 P)
 * - Row D (DY3T-1.04): 25 Bays (100 P)
 * Total: 96 Bays x 4 Levels = 384 Pallets (768 P1/P2 physical positions)
 */
export const CY3_ROW_SPECS: CY3RowSpec[] = [
  { code: 'A', z: -12.0, sign: 'DY3T-1.01', bays: 25, color: '#3b82f6' },
  { code: 'B', z: -4.5, sign: 'DY3T-1.02', bays: 23, color: '#10b981' },
  { code: 'C', z: 4.5, sign: 'DY3T-1.03', bays: 23, color: '#f59e0b' },
  { code: 'D', z: 12.0, sign: 'DY3T-1.04', bays: 25, color: '#8b5cf6' },
];

export const CY3_ROW_BY_CODE: Record<CY3RowCode, CY3RowSpec> = {
  A: CY3_ROW_SPECS[0],
  B: CY3_ROW_SPECS[1],
  C: CY3_ROW_SPECS[2],
  D: CY3_ROW_SPECS[3],
};

export interface ResolvedCy3Slot {
  row: CY3RowCode;
  bay: number;
  level: ShelfLevel;
  pos: 'P1' | 'P2';
  key: string;
  locator: string;
}

export function isCy3InventoryItem(it: InventoryItem | null | undefined): boolean {
  if (!it || typeof it.quantity !== 'number' || it.quantity <= 0) return false;
  const locUpper = (it.locatorCode || '').toUpperCase();
  const zoneUpper = String(it.zone || '').toUpperCase();
  const facId = (it.facilityId || '').toUpperCase();
  return locUpper.includes('DY3T') || zoneUpper.startsWith('CY3') || zoneUpper.startsWith('DY3T') || facId === 'FAC-CY3-TENT';
}

export function resolveCy3ItemSlot(it: InventoryItem): ResolvedCy3Slot | null {
  if (!isCy3InventoryItem(it)) return null;

  const locUpper = (it.locatorCode || '').toUpperCase();
  const zoneUpper = String(it.zone || '').toUpperCase();

  let r: CY3RowCode = 'A';
  if (locUpper.includes('DY3T-1.01') || zoneUpper === 'CY3-A' || zoneUpper === 'A') r = 'A';
  else if (locUpper.includes('DY3T-1.02') || zoneUpper === 'CY3-B' || zoneUpper === 'B') r = 'B';
  else if (locUpper.includes('DY3T-1.03') || zoneUpper === 'CY3-C' || zoneUpper === 'C') r = 'C';
  else if (locUpper.includes('DY3T-1.04') || zoneUpper === 'CY3-D' || zoneUpper === 'D') r = 'D';

  let bay = it.bayNumber || 1;
  let lvl = Number(it.level || 1);
  let pos: 'P1' | 'P2' = (it.palletPosition || 'P1').toUpperCase() === 'P2' ? 'P2' : 'P1';

  const m = locUpper.match(/DY3T-1(?:\.0([1-4]))?-(?:([A-D]))?0*(\d+)-L(\d)(?:-P([12]))?/i);
  if (m) {
    if (m[2]) {
      r = m[2].toUpperCase() as CY3RowCode;
    } else if (m[1]) {
      r = (['A', 'B', 'C', 'D'][parseInt(m[1], 10) - 1] || r) as CY3RowCode;
    }
    bay = parseInt(m[3], 10);
    lvl = parseInt(m[4], 10);
    if (m[5]) pos = m[5] === '2' ? 'P2' : 'P1';
  } else if (locUpper.includes('-P2')) {
    pos = 'P2';
  }

  const spec = CY3_ROW_BY_CODE[r];
  if (!spec || bay < 1 || bay > spec.bays || lvl < 1 || lvl > 4) {
    return null;
  }

  const safeLvl = lvl as ShelfLevel;
  const key = `${r}-${bay}-${safeLvl}-${pos}`;
  const locator = `${spec.sign}-${r}${String(bay).padStart(2, '0')}-L${safeLvl}-${pos}`;

  return { row: r, bay, level: safeLvl, pos, key, locator };
}

export function buildCy3SlotMap(items: InventoryItem[]): Map<string, InventoryItem> {
  const map = new Map<string, InventoryItem>();
  items.forEach(it => {
    const resolved = resolveCy3ItemSlot(it);
    if (resolved) {
      map.set(resolved.key, it);
    }
  });
  return map;
}
