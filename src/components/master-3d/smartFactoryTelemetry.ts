import { AgingThresholdConfig, InventoryItem, MovementLog, WmsStats } from '../../types';
import { ZoneKey, ZONE_SPECS, filterItemsByZone, filterLogsByZone } from '../../utils/zoneKpiHelper';
import { mapGlobalRowToXGroup } from '../../utils/locatorUtils';
import { buildCy3SlotMap } from '../../utils/cy3SlotHelper';

export type BuildingKey = 'A2' | 'A4' | 'CY3' | 'A5';
export type AgingTier = 'NORMAL' | 'WARNING' | 'URGENT' | 'OVERDUE';

export interface AgingCounts {
  NORMAL: number;
  WARNING: number;
  URGENT: number;
  OVERDUE: number;
}

export interface SubZoneTelemetry {
  zoneKey: Exclude<ZoneKey, 'ALL' | 'A4'>;
  buildingKey: BuildingKey;
  label: string;
  shortLabel: string;
  code: string;
  capacity: number;
  occupied: number;
  empty: number;
  occupancyPct: number;
  totalUnits: number;
  inScans: number;
  outScans: number;
  agingCounts: AgingCounts;
  lowSafetyCount: number;
  status: 'ALERT' | 'ACTIVE' | 'STANDBY';
}

export interface BuildingTelemetry {
  buildingKey: BuildingKey;
  occupied: number;
  total: number;
  percent: number;
  totalUnits: number;
  inCount: number;
  outCount: number;
  agingCounts: AgingCounts;
  safeCount: number;
  warningCount: number;
  overdueCount: number;
  lowSafetyCount: number;
  status: 'ALERT' | 'ACTIVE' | 'STANDBY';
}

export interface FactoryAlertItem {
  id: string;
  buildingKey: BuildingKey;
  zoneKey: Exclude<ZoneKey, 'ALL' | 'A4'>;
  locatorCode: string;
  modelHE: string;
  partName: string;
  quantity: number;
  safetyStock: number;
  agingDays: number;
  tier: AgingTier;
  isLowSafety: boolean;
  reason: string;
  priorityScore: number;
}

export interface SmartFactoryTelemetry {
  totalCapacity: number;
  occupiedPallets: number;
  emptyPallets: number;
  occupancyPct: number;
  totalUnits: number;
  todayInScans: number;
  todayOutScans: number;
  agingCounts: AgingCounts;
  lowSafetyCount: number;
  alertCount: number;
  subZones: SubZoneTelemetry[];
  buildings: Record<BuildingKey, BuildingTelemetry>;
  alerts: FactoryAlertItem[];
}

export const AGING_TIER_META: Record<
  AgingTier,
  {
    label: string;
    shortLabel: string;
    hex: string;
    badgeText: string;
    pillClass: string;
    barClass: string;
  }
> = {
  NORMAL: {
    label: 'ปกติ (Normal)',
    shortLabel: 'ปกติ',
    hex: '#0284c7',
    badgeText: 'OK',
    pillClass: 'bg-sky-500/15 text-sky-300 border-sky-500/40',
    barClass: 'bg-sky-500',
  },
  WARNING: {
    label: 'เฝ้าระวัง (Warning)',
    shortLabel: 'เตือน',
    hex: '#f59e0b',
    badgeText: 'WARN',
    pillClass: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
    barClass: 'bg-amber-500',
  },
  URGENT: {
    label: 'เร่งด่วน (Urgent)',
    shortLabel: 'ด่วน',
    hex: '#f97316',
    badgeText: 'URG',
    pillClass: 'bg-orange-500/15 text-orange-300 border-orange-500/40',
    barClass: 'bg-orange-500',
  },
  OVERDUE: {
    label: 'เกินกำหนด / NG',
    shortLabel: 'เกินกำหนด',
    hex: '#ef4444',
    badgeText: 'CRIT',
    pillClass: 'bg-red-500/15 text-red-300 border-red-500/40',
    barClass: 'bg-red-500',
  },
};

export function resolveEffectiveAgingThresholds(agingConfig?: AgingThresholdConfig) {
  const safeDaysMax = agingConfig?.safeDaysMax ?? 14;
  const warningDaysMax = agingConfig?.warningDaysMax ?? Math.max(safeDaysMax + 7, 24);
  const criticalDays = agingConfig?.criticalDays ?? Math.max(warningDaysMax + 4, 30);
  return { safeDaysMax, warningDaysMax, criticalDays };
}

export function resolveItemAgingTier(
  item: InventoryItem,
  agingConfig?: AgingThresholdConfig
): AgingTier {
  const { safeDaysMax, warningDaysMax, criticalDays } = resolveEffectiveAgingThresholds(agingConfig);
  const days = Number(item.agingDays ?? 0);
  const status = String(item.agingStatus || '').toUpperCase();

  if (
    item.holdStatus ||
    status === 'OVERDUE' ||
    status === 'EXPIRED' ||
    status === 'DUE_TODAY' ||
    status === 'CONDITION_NG' ||
    days >= criticalDays
  ) {
    return 'OVERDUE';
  }
  if (status === 'URGENT' || days > warningDaysMax) {
    return 'URGENT';
  }
  if (status === 'WARNING' || days > safeDaysMax) {
    return 'WARNING';
  }
  return 'NORMAL';
}

export function classifyItemBuildingAndZone(item: InventoryItem): {
  buildingKey: BuildingKey;
  subZoneKey: Exclude<ZoneKey, 'ALL' | 'A4'>;
} {
  const loc = (item.locatorCode || '').toUpperCase();
  const z = String(item.zone || '').toUpperCase();
  const fac = (item.facilityId || '').toUpperCase();

  if (loc.startsWith('DY3T') || z.startsWith('CY3') || z.startsWith('DY3T') || fac === 'FAC-CY3-TENT') {
    return { buildingKey: 'CY3', subZoneKey: 'CY3' };
  }
  if (loc.startsWith('DA5T') || loc.startsWith('DAST') || z.startsWith('T') || z.startsWith('A5') || fac === 'FAC-A5-TENT') {
    return { buildingKey: 'A5', subZoneKey: 'A5' };
  }
  if (loc.startsWith('DA2D') || /^(R|FR)(1[0-3]|[1-9])$/i.test(z) || fac === 'FAC-A2-RAIL') {
    return { buildingKey: 'A2', subZoneKey: 'A2' };
  }
  if (
    loc.startsWith('DA4D-1') ||
    ['X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'X8', 'FLOOR', 'STAGING'].includes(z) ||
    fac === 'FAC-A4-FLOOR'
  ) {
    return { buildingKey: 'A4', subZoneKey: 'A4_FLOOR' };
  }
  return { buildingKey: 'A4', subZoneKey: 'A4_RACK' };
}

function emptyCounts(): AgingCounts {
  return { NORMAL: 0, WARNING: 0, URGENT: 0, OVERDUE: 0 };
}

const SUB_ZONE_DEFS: Array<{
  zoneKey: Exclude<ZoneKey, 'ALL' | 'A4'>;
  buildingKey: BuildingKey;
  label: string;
  shortLabel: string;
  code: string;
}> = [
  { zoneKey: 'A2', buildingKey: 'A2', label: 'A2 Flow Rail', shortLabel: 'A2 ราง', code: 'DA2D-1' },
  { zoneKey: 'A4_RACK', buildingKey: 'A4', label: 'A4 Selective Racks', shortLabel: 'A4 แร็ค', code: 'DA4D-2/3' },
  { zoneKey: 'A4_FLOOR', buildingKey: 'A4', label: 'A4 Floor Staging', shortLabel: 'A4 วางพื้น', code: 'DA4D-1' },
  { zoneKey: 'A5', buildingKey: 'A5', label: 'A5 Canopy Tents (1-4)', shortLabel: 'A5 เต็นท์', code: 'DA5T-1..4' },
  { zoneKey: 'CY3', buildingKey: 'CY3', label: 'CY3 High-Bay Tent', shortLabel: 'CY3 แร็ค', code: 'DY3T-1.01..04' },
];

export function computeSmartFactoryTelemetry(
  items: InventoryItem[] = [],
  logs: MovementLog[] = [],
  agingConfig?: AgingThresholdConfig,
  stats?: WmsStats
): SmartFactoryTelemetry {
  const validItems = items.filter(it => it && Number(it.quantity) > 0);
  const totalAgingCounts = emptyCounts();
  const alerts: FactoryAlertItem[] = [];

  const subZones: SubZoneTelemetry[] = SUB_ZONE_DEFS.map(def => {
    const spec = ZONE_SPECS[def.zoneKey];
    const zItems = filterItemsByZone(validItems, def.zoneKey);
    const zLogs = filterLogsByZone(logs, def.zoneKey);
    const counts = emptyCounts();

    let totalUnits = 0;
    let lowSafetyCount = 0;

    zItems.forEach(it => {
      totalUnits += Number(it.quantity) || 0;
      const tier = resolveItemAgingTier(it, agingConfig);
      counts[tier] += 1;
      totalAgingCounts[tier] += 1;

      const safety = it.safetyStock ?? 300;
      const isLowSafety = Number(it.quantity) <= safety;
      if (isLowSafety) lowSafetyCount += 1;

      if (tier !== 'NORMAL' || isLowSafety) {
        const priorityScore =
          (tier === 'OVERDUE' ? 400 : tier === 'URGENT' ? 300 : tier === 'WARNING' ? 200 : 100) +
          (isLowSafety ? 50 : 0) +
          Math.min(99, Number(it.agingDays || 0));

        const reasonParts: string[] = [];
        if (tier === 'OVERDUE') reasonParts.push(`เกินกำหนด ${it.agingDays} วัน`);
        else if (tier === 'URGENT') reasonParts.push(`เร่งด่วน ${it.agingDays} วัน`);
        else if (tier === 'WARNING') reasonParts.push(`เฝ้าระวัง ${it.agingDays} วัน`);
        if (isLowSafety) reasonParts.push(`ต่ำกว่า Safety (${it.quantity}/${safety})`);

        alerts.push({
          id: it.id || `${it.locatorCode}-${it.modelHE}`,
          buildingKey: def.buildingKey,
          zoneKey: def.zoneKey,
          locatorCode: it.locatorCode || def.code,
          modelHE: it.modelHE,
          partName: it.partName,
          quantity: Number(it.quantity) || 0,
          safetyStock: safety,
          agingDays: Number(it.agingDays) || 0,
          tier,
          isLowSafety,
          reason: reasonParts.join(' • '),
          priorityScore,
        });
      }
    });

    const inScans = zLogs.filter(l => l.type === 'IN').length;
    const outScans = zLogs.filter(l => l.type === 'OUT').length;
    const occupied = zItems.length;
    const capacity = spec.capacity;
    const empty = Math.max(0, capacity - occupied);
    const occupancyPct = Math.min(100, Math.round((occupied / Math.max(1, capacity)) * 100));

    let status: 'ALERT' | 'ACTIVE' | 'STANDBY' = 'STANDBY';
    if (counts.OVERDUE > 0 || counts.URGENT > 0 || lowSafetyCount > 0) {
      status = 'ALERT';
    } else if (occupied > 0 || inScans > 0 || outScans > 0) {
      status = 'ACTIVE';
    }

    return {
      zoneKey: def.zoneKey,
      buildingKey: def.buildingKey,
      label: def.label,
      shortLabel: def.shortLabel,
      code: def.code,
      capacity,
      occupied,
      empty,
      occupancyPct,
      totalUnits,
      inScans,
      outScans,
      agingCounts: counts,
      lowSafetyCount,
      status,
    };
  });

  const buildings = {} as Record<BuildingKey, BuildingTelemetry>;
  (['A2', 'A4', 'CY3', 'A5'] as BuildingKey[]).forEach(bKey => {
    const subs = subZones.filter(s => s.buildingKey === bKey);
    const occupied = subs.reduce((a, b) => a + b.occupied, 0);
    const total = subs.reduce((a, b) => a + b.capacity, 0);
    const totalUnits = subs.reduce((a, b) => a + b.totalUnits, 0);
    const inCount = subs.reduce((a, b) => a + b.inScans, 0);
    const outCount = subs.reduce((a, b) => a + b.outScans, 0);
    const lowSafetyCount = subs.reduce((a, b) => a + b.lowSafetyCount, 0);
    const agingCounts: AgingCounts = {
      NORMAL: subs.reduce((a, b) => a + b.agingCounts.NORMAL, 0),
      WARNING: subs.reduce((a, b) => a + b.agingCounts.WARNING, 0),
      URGENT: subs.reduce((a, b) => a + b.agingCounts.URGENT, 0),
      OVERDUE: subs.reduce((a, b) => a + b.agingCounts.OVERDUE, 0),
    };
    const status: 'ALERT' | 'ACTIVE' | 'STANDBY' = subs.some(s => s.status === 'ALERT')
      ? 'ALERT'
      : subs.some(s => s.status === 'ACTIVE')
      ? 'ACTIVE'
      : 'STANDBY';

    buildings[bKey] = {
      buildingKey: bKey,
      occupied,
      total,
      percent: Math.min(100, Math.round((occupied / Math.max(1, total)) * 100)),
      totalUnits,
      inCount,
      outCount,
      agingCounts,
      safeCount: agingCounts.NORMAL,
      warningCount: agingCounts.WARNING + agingCounts.URGENT,
      overdueCount: agingCounts.OVERDUE,
      lowSafetyCount,
      status,
    };
  });

  const totalCapacity = subZones.reduce((a, b) => a + b.capacity, 0); // 2,400 P
  const occupiedPallets = subZones.reduce((a, b) => a + b.occupied, 0);
  const emptyPallets = Math.max(0, totalCapacity - occupiedPallets);
  const occupancyPct = Math.min(100, Math.round((occupiedPallets / Math.max(1, totalCapacity)) * 100));
  const totalUnits = subZones.reduce((a, b) => a + b.totalUnits, 0);
  const logInTotal = logs.filter(l => l.type === 'IN').length;
  const logOutTotal = logs.filter(l => l.type === 'OUT').length;
  const todayInScans = logInTotal > 0 ? logInTotal : stats?.todayInScanCount ?? 0;
  const todayOutScans = logOutTotal > 0 ? logOutTotal : stats?.todayOutScanCount ?? 0;
  const lowSafetyCount = subZones.reduce((a, b) => a + b.lowSafetyCount, 0);

  alerts.sort((a, b) => b.priorityScore - a.priorityScore || b.agingDays - a.agingDays);

  return {
    totalCapacity,
    occupiedPallets,
    emptyPallets,
    occupancyPct,
    totalUnits,
    todayInScans,
    todayOutScans,
    agingCounts: totalAgingCounts,
    lowSafetyCount,
    alertCount: alerts.length,
    subZones,
    buildings,
    alerts,
  };
}

/**
 * Normalizes items into fast per-building slot lookup maps matching each zone's exact 3D view conventions.
 */
export interface CampusSlotMaps {
  a2Map: Map<string, InventoryItem>; // key: `${rail}-${pos}`
  a4RackMap: Map<string, InventoryItem>; // key: `${row}-${bay}-${lvl}-${pos}`
  a4FloorMap: Map<string, InventoryItem>; // key: `${xGroup}-${localRow}-${col}`
  a5TentMap: Map<string, InventoryItem>; // key: `${tentId}-${grp}-${r}-${c}`
  cy3Map: Map<string, InventoryItem>; // key: `${row}-${bay}-${lvl}-${pos}`
}

export function buildCampusSlotMaps(items: InventoryItem[] = []): CampusSlotMaps {
  const a2Map = new Map<string, InventoryItem>();
  const a4RackMap = new Map<string, InventoryItem>();
  const a4FloorMap = new Map<string, InventoryItem>();
  const a5TentMap = new Map<string, InventoryItem>();
  const cy3Map = buildCy3SlotMap(items);

  const a4RackRows = new Set(['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K']);
  const a4FloorZones = new Set(['X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'X8']);

  items.forEach(it => {
    if (!it || Number(it.quantity) <= 0) return;
    const loc = (it.locatorCode || '').trim().toUpperCase();
    const z = String(it.zone || '').trim().toUpperCase();
    const { buildingKey, subZoneKey } = classifyItemBuildingAndZone(it);

    if (buildingKey === 'A2') {
      let rail = 0;
      let pos = 0;
      const m = loc.match(/DA2D-1-R0*(\d+)-(?:P)?0*(\d+)/i);
      if (m) {
        rail = parseInt(m[1], 10);
        pos = parseInt(m[2], 10);
      } else if (z.startsWith('R') || z.startsWith('FR')) {
        rail = parseInt(z.replace(/\D/g, ''), 10) || 0;
        pos = it.bayNumber || 1;
      }
      if (rail >= 1 && rail <= 13 && pos >= 1 && pos <= 8) {
        a2Map.set(`${rail}-${pos}`, it);
      }
      return;
    }

    if (buildingKey === 'CY3') {
      return;
    }

    if (buildingKey === 'A5') {
      let tentNum = 1;
      let grp = 1;
      let rowNum = 1;
      let colNum = 1;

      const fullMatch = loc.match(/DA5T[-.]?([1-4])[-.]0*(\d+)-R([1-4])-(?:C)?0*(\d+)/i);
      if (fullMatch) {
        tentNum = parseInt(fullMatch[1], 10);
        grp = parseInt(fullMatch[2], 10);
        rowNum = parseInt(fullMatch[3], 10);
        colNum = parseInt(fullMatch[4], 10);
      } else {
        const tM = loc.match(/(?:DA5T[-.]?|T)([1-4])/i) || z.match(/T([1-4])/i);
        if (tM) tentNum = parseInt(tM[1], 10);
        const gM = loc.match(/-0?([1-7])-R/i) || z.match(/T[1-4]-0?([1-7])/i);
        if (gM) grp = parseInt(gM[1], 10);
        const rM = loc.match(/R([1-4])/i);
        if (rM) rowNum = parseInt(rM[1], 10);
        else if (it.level >= 1 && it.level <= 4) rowNum = it.level;
        const cM = loc.match(/R[1-4]-(?:C)?0*(\d+)/i);
        if (cM) colNum = parseInt(cM[1], 10);
        else if (it.bayNumber >= 1 && it.bayNumber <= 7) colNum = it.bayNumber;
      }

      if (tentNum >= 1 && tentNum <= 4 && grp >= 1 && grp <= 7 && rowNum >= 1 && rowNum <= 4 && colNum >= 1 && colNum <= 7) {
        a5TentMap.set(`${tentNum}-${grp}-${rowNum}-${colNum}`, it);
      }
      return;
    }

    if (subZoneKey === 'A4_FLOOR') {
      const globalMatch = loc.match(/DA4D-1-R0*(\d+)-(?:C)?0*(\d+)/i);
      if (globalMatch) {
        const gRow = parseInt(globalMatch[1], 10);
        const col = parseInt(globalMatch[2], 10);
        const mapped = mapGlobalRowToXGroup(gRow);
        a4FloorMap.set(`${mapped.xGroup}-${mapped.localRow}-${col}`, it);
        return;
      }
      if (a4FloorZones.has(z)) {
        a4FloorMap.set(`${z}-${it.bayNumber || 1}-${Number(it.level) || 1}`, it);
        return;
      }
      const xMatch = loc.match(/(X[1-8])-(?:R)?0*(\d+)-(?:C)?0*(\d+)/i);
      if (xMatch) {
        a4FloorMap.set(`${xMatch[1]}-${parseInt(xMatch[2], 10)}-${parseInt(xMatch[3], 10)}`, it);
      }
      return;
    }

    // A4 Rack (match A4UnifiedFactory3DView priority: explicit row zone -> locator regex)
    const rackMatch = loc.match(/DA4D-[23]-([B-K])(?:0)?(\d+)-L(\d)(?:-P([12]))?/i);
    if (a4RackRows.has(z)) {
      const bay = it.bayNumber || (rackMatch ? parseInt(rackMatch[2], 10) : 1);
      const lvl = Number(it.level) || (rackMatch ? parseInt(rackMatch[3], 10) : 1);
      const posRaw = it.palletPosition || (rackMatch?.[4] ? `P${rackMatch[4]}` : loc.includes('-P2') ? 'P2' : 'P1');
      const pos = posRaw.toUpperCase() === 'P2' ? 'P2' : 'P1';
      a4RackMap.set(`${z}-${bay}-${lvl}-${pos}`, it);
    } else if (rackMatch) {
      const row = rackMatch[1].toUpperCase();
      const bay = parseInt(rackMatch[2], 10);
      const lvl = parseInt(rackMatch[3], 10);
      const posRaw = rackMatch[4] ? `P${rackMatch[4]}` : it.palletPosition || (loc.includes('-P2') ? 'P2' : 'P1');
      const pos = posRaw.toUpperCase() === 'P2' ? 'P2' : 'P1';
      a4RackMap.set(`${row}-${bay}-${lvl}-${pos}`, it);
    }
  });

  return { a2Map, a4RackMap, a4FloorMap, a5TentMap, cy3Map };
}
