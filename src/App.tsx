import React, { useState, useEffect } from 'react';
import { InventoryItem, MovementLog, MovementType, ShelfLevel, StorageZone, WmsStats, MasterDataItem, UseLineMaster, TargetUseLineMaster, ZoneCapacityMaster, WarehouseFacility, AgingThresholdConfig, CustomRackSlot, ProtectionMethod, ProductType, ProductStorageType } from './types';
import { 
  INITIAL_ITEMS, 
  INITIAL_LOGS, 
  INITIAL_STATS, 
  INITIAL_FACILITIES, 
  INITIAL_MASTER_DATA,
  SAMPLE_SIMULATION_ITEMS,
  SAMPLE_SIMULATION_LOGS,
  SAMPLE_SIMULATION_STATS
} from './data/mockData';
import { useTranslation } from './i18n/i18nContext';
import { Navbar } from './components/Navbar';
import { DashboardKPIs } from './components/DashboardKPIs';
import { RackLayout2D } from './components/RackLayout2D';
import { Rack3DViewer } from './components/Rack3DViewer';
import { QuickScannerModal } from './components/QuickScannerModal';
import { VinylWrappingActionModal } from './components/VinylWrappingActionModal';
import { MovementLogsTable } from './components/MovementLogsTable';
import { AgingFifoPanel } from './components/AgingFifoPanel';
import { InventoryListPanel } from './components/InventoryListPanel';
import { MasterListPanel } from './components/MasterListPanel';
import { FlowRailFloorMap } from './components/FlowRailFloorMap';
import { A5TentFloorStagingMap } from './components/A5TentFloorStagingMap';
import { CY3TentRackMap } from './components/CY3TentRackMap';
import { DA4D1FloorStagingMap } from './components/DA4D1FloorStagingMap';
import { Campus3DCockpitView } from './components/Campus3DCockpitView';
import { CampusMasterOverview } from './components/CampusMasterOverview';
import { GlobalSearchZoneLookup } from './components/GlobalSearchZoneLookup';
import { calculateVinylWrappingStatus, getBangkokDateString } from './utils/vinylWrappingRule';
import { recalculateInventoryConsistency, validateSlotPlacement, getModelStdCapacity } from './utils/inventoryConsistency';
import { resolveCanonicalCoordinate } from './utils/locatorUtils';
import { Search, X } from 'lucide-react';

const initialMasterData: MasterDataItem[] = INITIAL_MASTER_DATA;

const initialZoneCapacities: ZoneCapacityMaster[] = [
  { zone: 'B', standardPalletsPerBay: 8, defaultStdQtyPerPallet: 80, description: 'Rack Zone B (8 Pallets / Bay)' },
  { zone: 'C', standardPalletsPerBay: 8, defaultStdQtyPerPallet: 80, description: 'Rack Zone C (8 Pallets / Bay)' },
  { zone: 'D', standardPalletsPerBay: 8, defaultStdQtyPerPallet: 80, description: 'Rack Zone D (8 Pallets / Bay)' },
  { zone: 'E', standardPalletsPerBay: 8, defaultStdQtyPerPallet: 80, description: 'Rack Zone E (8 Pallets / Bay)' },
  { zone: 'F', standardPalletsPerBay: 8, defaultStdQtyPerPallet: 80, description: 'Rack Zone F (8 Pallets / Bay)' },
  { zone: 'G', standardPalletsPerBay: 8, defaultStdQtyPerPallet: 80, description: 'Rack Zone G (8 Pallets / Bay)' },
  { zone: 'H', standardPalletsPerBay: 8, defaultStdQtyPerPallet: 80, description: 'Rack Zone H (8 Pallets / Bay)' },
  { zone: 'I', standardPalletsPerBay: 8, defaultStdQtyPerPallet: 80, description: 'Rack Zone I (8 Pallets / Bay)' },
  { zone: 'J', standardPalletsPerBay: 8, defaultStdQtyPerPallet: 80, description: 'Rack Zone J (8 Pallets / Bay)' },
  { zone: 'K', standardPalletsPerBay: 8, defaultStdQtyPerPallet: 80, description: 'Rack Zone K (8 Pallets / Bay)' },
];

export default function App() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<string>('a4_rack');
  const [showZoneTopSearch, setShowZoneTopSearch] = useState<boolean>(false);
  const isZoneTab = ['blueprint', 'dashboard', 'campus_overview', 'a4_floor', 'a4_rack', 'layout', 'flow_floor', 'tent_layout', 'cy3_layout'].includes(activeTab);

  // Auto-close zone top search dropdown when switching tabs
  useEffect(() => {
    setShowZoneTopSearch(false);
  }, [activeTab]);
  const [activeStation, setActiveStation] = useState<string>('ALL');
  const [language, setLanguage] = useState<string>('th');
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    return 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.add('dark');
    localStorage.setItem('themeMode', 'dark');
    localStorage.setItem('theme', 'dark');
  }, [themeMode]);

  const [masterData, setMasterData] = useState<MasterDataItem[]>(initialMasterData);
  const [useLines, setUseLines] = useState<UseLineMaster[]>(() => {
    const saved = localStorage.getItem('lge_wms_use_lines');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return [
      { id: 'HE1', name: 'Line HE1', description: 'สายการผลิตเครื่องทำความร้อน HE1 (โรง A2)' },
      { id: 'HE2', name: 'Line HE2', description: 'สายการผลิตเครื่องทำความร้อน HE2 (โรง A2)' },
      { id: 'HE3', name: 'Line HE3', description: 'สายการผลิตเครื่องทำความร้อน HE3 (โรง A2)' },
      { id: 'HE4', name: 'Line HE4', description: 'สายการผลิตเครื่องทำความร้อน HE4 (โรง A4)' },
      { id: 'HE5', name: 'Line HE5', description: 'สายการผลิตเครื่องทำความร้อน HE5 (โรง A4)' },
      { id: 'REPAIR', name: 'Line Repair', description: 'โซนงานซ่อมแก้ไข (Repair Station)' },
    ];
  });

  useEffect(() => {
    localStorage.setItem('lge_wms_use_lines', JSON.stringify(useLines));
  }, [useLines]);

  const [targetUseLines, setTargetUseLines] = useState<TargetUseLineMaster[]>(() => {
    const saved = localStorage.getItem('lge_wms_target_use_lines');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return [
      { id: 'A2', name: 'Line A2', description: 'สายการประกอบหลัก A2 (Main Assembly Plant A2)' },
      { id: 'A4', name: 'Line A4', description: 'สายการประกอบหลัก A4 (Main Assembly Plant A4)' },
      { id: 'A6', name: 'Line A6', description: 'สายการประกอบ A6 (Assembly Line A6)' },
      { id: 'A7', name: 'Line A7', description: 'สายการประกอบ A7 (Assembly Line A7)' },
      { id: 'A8', name: 'Line A8', description: 'สายการประกอบ A8 (Assembly Line A8)' },
      { id: 'A9', name: 'Line A9', description: 'สายการประกอบ A9 (Assembly Line A9)' },
      { id: 'SUB_LINE', name: 'Sub Line', description: 'สายงานย่อยเตรียมชิ้นส่วน (Sub-Assembly Staging Line)' }
    ];
  });

  useEffect(() => {
    localStorage.setItem('lge_wms_target_use_lines', JSON.stringify(targetUseLines));
  }, [targetUseLines]);
  const [zoneCapacities, setZoneCapacities] = useState<ZoneCapacityMaster[]>(initialZoneCapacities);
  const [facilities, setFacilities] = useState<WarehouseFacility[]>(INITIAL_FACILITIES);
  const [activeFacilityId, setActiveFacilityId] = useState<string>('ALL');
  
  const [items, setItems] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem('lge_wms_items');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return recalculateInventoryConsistency(parsed, initialMasterData);
        }
      } catch (e) {
        // ignore
      }
    }
    return recalculateInventoryConsistency(INITIAL_ITEMS, initialMasterData);
  });

  const [logs, setLogs] = useState<MovementLog[]>(() => {
    const saved = localStorage.getItem('lge_wms_logs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return INITIAL_LOGS;
  });

  const [stats, setStats] = useState<WmsStats>(INITIAL_STATS);

  // Sync items and logs to localStorage
  useEffect(() => {
    localStorage.setItem('lge_wms_items', JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem('lge_wms_logs', JSON.stringify(logs));
  }, [logs]);

  // Handler to clear all simulated stock and movement logs
  const handleClearAllData = () => {
    if (window.confirm('คุณต้องการล้างข้อมูลสต็อกสินค้าและประวัติการเคลื่อนย้ายทั้งหมดเพื่อเตรียมพร้อมกรอกข้อมูลจริงใช่หรือไม่?')) {
      setItems([]);
      setLogs([]);
      setStats({
        totalBalanceUnits: 0,
        todayInScanCount: 0,
        todayOutScanCount: 0,
        occupiedRacksCount: 0,
        totalRackCapacity: 680,
        agingAlertCount: 0,
        rackBFOccupied: 0,
        rackBFCapacity: 480,
        rackJGOccupied: 0,
        rackJGCapacity: 200
      });
      localStorage.setItem('lge_wms_items', JSON.stringify([]));
      localStorage.setItem('lge_wms_logs', JSON.stringify([]));
      alert('🧹 ล้างข้อมูลเรียบร้อยแล้ว! ระบบพร้อมสำหรับการสแกน/กรอกข้อมูลจริง');
    }
  };

  // Handler to load sample simulation data
  const handleLoadSampleData = () => {
    if (window.confirm('คุณต้องการโหลดข้อมูลจำลองตัวอย่าง (Sample Simulation Data) สำหรับทดสอบระบบใช่หรือไม่?')) {
      setItems(SAMPLE_SIMULATION_ITEMS);
      setLogs(SAMPLE_SIMULATION_LOGS);
      setStats(SAMPLE_SIMULATION_STATS);
      localStorage.setItem('lge_wms_items', JSON.stringify(SAMPLE_SIMULATION_ITEMS));
      localStorage.setItem('lge_wms_logs', JSON.stringify(SAMPLE_SIMULATION_LOGS));
      alert('🔄 โหลดข้อมูลจำลองตัวอย่างเรียบร้อยแล้ว!');
    }
  };

  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>('');
  const [a4InitialTab, setA4InitialTab] = useState<'FLOOR_DA4D1' | 'RACK_ZONES' | 'FULL3D'>('FULL3D');
  const [a5InitialTent, setA5InitialTent] = useState<number | undefined>(undefined);
  const [selectedPrintItemId, setSelectedPrintItemId] = useState<string>('');

  // Dynamic Aging Threshold Config State (New 5-Level 28-day standard)
  const [agingConfig, setAgingConfig] = useState<AgingThresholdConfig>(() => {
    const defaultVal: AgingThresholdConfig = {
      safeDaysMin: 0,
      safeDaysMax: 21,
      warningDaysMin: 22,
      warningDaysMax: 24,
      urgentDaysMin: 25,
      urgentDaysMax: 27,
      dueDay: 28,
      criticalDays: 28,
      indoorRubberCapDays: 28,
      autoAlertEnabled: true,
      notifyOnFifoViolation: true,
      customRuleName: 'มาตรฐาน Vinyl Wrapping 5 ระดับ (รอบ 28 วัน)'
    };

    const saved = localStorage.getItem('lge_wms_aging_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // If legacy preset (14/30 or 29/42) was cached, upgrade to new 28-day standard
        if (parsed.safeDaysMax === 29 || parsed.safeDaysMax === 14 || parsed.criticalDays === 42 || parsed.criticalDays === 30 || !parsed.warningDaysMin) {
          return {
            ...defaultVal,
            ...parsed,
            safeDaysMin: 0,
            safeDaysMax: parsed.safeDaysMax === 29 || parsed.safeDaysMax === 14 ? 21 : parsed.safeDaysMax,
            warningDaysMin: parsed.warningDaysMin ?? 22,
            warningDaysMax: parsed.warningDaysMax === 42 || parsed.warningDaysMax === 30 ? 24 : (parsed.warningDaysMax ?? 24),
            urgentDaysMin: parsed.urgentDaysMin ?? 25,
            urgentDaysMax: parsed.urgentDaysMax ?? 27,
            dueDay: parsed.dueDay ?? 28,
            criticalDays: parsed.criticalDays === 42 || parsed.criticalDays === 30 ? 28 : (parsed.criticalDays ?? 28),
            indoorRubberCapDays: parsed.indoorRubberCapDays ?? 28,
            customRuleName: parsed.customRuleName && !parsed.customRuleName.includes('14/30') ? parsed.customRuleName : 'มาตรฐาน Vinyl Wrapping 5 ระดับ (รอบ 28 วัน)'
          };
        }
        return {
          ...defaultVal,
          ...parsed
        };
      } catch {
        // ignore
      }
    }
    return defaultVal;
  });

  useEffect(() => {
    localStorage.setItem('lge_wms_aging_config', JSON.stringify(agingConfig));
  }, [agingConfig]);

  // Dynamic Custom Rack & Storage Slots
  const [customSlots, setCustomSlots] = useState<CustomRackSlot[]>([
    { id: 'RACK-B', stationId: 'STATION_1', zone: 'B', bayNumber: 12, maxLevels: 4, storageType: 'RACK', capacityPerLevel: 2, status: 'ACTIVE', description: 'Selective Rack Zone B' },
    { id: 'RACK-C', stationId: 'STATION_1', zone: 'C', bayNumber: 12, maxLevels: 4, storageType: 'RACK', capacityPerLevel: 2, status: 'ACTIVE', description: 'Selective Rack Zone C' },
    { id: 'RACK-D', stationId: 'STATION_1', zone: 'D', bayNumber: 12, maxLevels: 4, storageType: 'RACK', capacityPerLevel: 2, status: 'ACTIVE', description: 'Selective Rack Zone D' },
    { id: 'RACK-E', stationId: 'STATION_1', zone: 'E', bayNumber: 12, maxLevels: 4, storageType: 'RACK', capacityPerLevel: 2, status: 'ACTIVE', description: 'Selective Rack Zone E' },
    { id: 'RACK-F', stationId: 'STATION_1', zone: 'F', bayNumber: 12, maxLevels: 4, storageType: 'RACK', capacityPerLevel: 2, status: 'ACTIVE', description: 'Selective Rack Zone F' },
    { id: 'RACK-G', stationId: 'STATION_1', zone: 'G', bayNumber: 5, maxLevels: 4, storageType: 'RACK', capacityPerLevel: 1, status: 'ACTIVE', description: 'Rack Zone G (Top Area)' },
    { id: 'RACK-H', stationId: 'STATION_1', zone: 'H', bayNumber: 5, maxLevels: 4, storageType: 'RACK', capacityPerLevel: 1, status: 'ACTIVE', description: 'Rack Zone H (Top Area)' },
    { id: 'RACK-I', stationId: 'STATION_1', zone: 'I', bayNumber: 5, maxLevels: 4, storageType: 'RACK', capacityPerLevel: 1, status: 'ACTIVE', description: 'Rack Zone I (Top Area)' },
    { id: 'RACK-J', stationId: 'STATION_1', zone: 'J', bayNumber: 5, maxLevels: 4, storageType: 'RACK', capacityPerLevel: 1, status: 'ACTIVE', description: 'Rack Zone J (Top Area)' },
    { id: 'RACK-K', stationId: 'STATION_1', zone: 'K', bayNumber: 5, maxLevels: 4, storageType: 'RACK', capacityPerLevel: 1, status: 'ACTIVE', description: 'Rack Zone K (Top Area)' },
    { id: 'FLOW-01', stationId: 'STATION_2', zone: 'FR1', bayNumber: 1, maxLevels: 1, storageType: 'FLOW_RAIL', capacityPerLevel: 5, status: 'ACTIVE', description: 'Flow Roller Lane 1' },
    { id: 'FLOW-02', stationId: 'STATION_2', zone: 'FR2', bayNumber: 1, maxLevels: 1, storageType: 'FLOW_RAIL', capacityPerLevel: 5, status: 'ACTIVE', description: 'Flow Roller Lane 2' },
    { id: 'FLOOR-A', stationId: 'STATION_2', zone: 'FL-A', bayNumber: 4, maxLevels: 1, storageType: 'FLOOR_STAGING', capacityPerLevel: 4, status: 'ACTIVE', description: 'Floor Staging Zone A' },
    { id: 'FLOOR-B', stationId: 'STATION_2', zone: 'FL-B', bayNumber: 4, maxLevels: 1, storageType: 'FLOOR_STAGING', capacityPerLevel: 4, status: 'ACTIVE', description: 'Floor Staging Zone B' },
  ]);

  // Handle drill-down navigation from Master Campus overview to specific building/zone
  const handleCampusZoneNavigation = (target: 'A4_MACRO' | 'A4_RACK' | 'A4_FLOOR' | 'A4_3D' | 'A2_RAIL' | 'A2_MACRO' | 'A2_SPLIT' | 'A5_TENT' | 'A5_MACRO' | 'CY3_TENT', tentNum?: number) => {
    if (target === 'A4_RACK' || target === 'A4_3D') {
      setA4InitialTab('FULL3D');
      setActiveTab('a4_rack');
    } else if (target === 'A4_FLOOR' || target === 'A4_MACRO') {
      setA4InitialTab('FLOOR_DA4D1');
      setActiveTab('a4_floor');
    } else if (target === 'A2_RAIL' || target === 'A2_MACRO' || target === 'A2_SPLIT') {
      setActiveTab('flow_floor');
    } else if (target === 'A5_TENT' || target === 'A5_MACRO') {
      setA5InitialTent(tentNum);
      setActiveTab('tent_layout');
    } else if (target === 'CY3_TENT') {
      setActiveTab('cy3_layout');
    }
  };

  // Filtered items based on activeFacilityId
  const displayedItems = activeFacilityId === 'ALL'
    ? items
    : items.filter(it => it.facilityId === activeFacilityId || (!it.facilityId && activeFacilityId === 'FAC-A4'));

  // Count items below safety stock
  const lowStockCount = displayedItems.filter((it) => it.quantity <= (it.safetyStock ?? 300)).length;

  // 3D Inspector active state
  const [selected3DZone, setSelected3DZone] = useState<StorageZone>('E');
  const [selected3DBay, setSelected3DBay] = useState<number>(6);

  // Scanner Modal state
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [scannerZone, setScannerZone] = useState<StorageZone>('E');
  const [scannerBay, setScannerBay] = useState<number>(6);
  const [scannerLevel, setScannerLevel] = useState<ShelfLevel>(1);
  const [scannerMode, setScannerMode] = useState<MovementType>('IN');
  const [scannerLocatorCode, setScannerLocatorCode] = useState<string | undefined>(undefined);
  const [scannerPalletPosition, setScannerPalletPosition] = useState<string | undefined>(undefined);
  const [scannerTargetItem, setScannerTargetItem] = useState<InventoryItem | null>(null);

  // Vinyl Action Modal state
  const [activeVinylItem, setActiveVinylItem] = useState<InventoryItem | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const handleVinylActionSave = (updatedItem: InventoryItem, log: any) => {
     // Re-calculate the actual logic status for the updated item
     let finalAgingStatus = updatedItem.agingStatus;
     let finalHoldStatus = updatedItem.holdStatus;
     let finalHoldReason = updatedItem.holdReason;
     
     if (updatedItem.protectionMethod === 'VINYL_WRAPPING' && updatedItem.wrappingDate) {
        const todayStr = getBangkokDateString(new Date());
        const vinylRes = calculateVinylWrappingStatus(updatedItem.wrappingDate, todayStr, updatedItem.wrappingCondition);
        finalAgingStatus = vinylRes.agingStatus;
        finalHoldStatus = vinylRes.holdStatus;
        finalHoldReason = vinylRes.holdReason;
     }

     const newItems = items.map(it => 
       it.id === updatedItem.id 
         ? { ...updatedItem, agingStatus: finalAgingStatus, holdStatus: finalHoldStatus, holdReason: finalHoldReason } 
         : it
     );
     setItems(newItems);
     setAuditLogs(prev => [log, ...prev]);
     setActiveVinylItem(null);
  };

  // Trigger Scanner Modal with target location
  
  // Recalculate stats dynamically when items change
  useEffect(() => {
    const threshold = agingConfig?.criticalDays || 30;
    const newAgingAlertCount = items.filter(it => 
      ['WARNING', 'URGENT', 'DUE_TODAY', 'EXPIRED', 'CONDITION_NG', 'DATA_INCOMPLETE'].includes(it.agingStatus) || 
      it.agingDays > threshold
    ).length;
    
    setStats(prev => {
      if (prev.agingAlertCount !== newAgingAlertCount) {
        return { ...prev, agingAlertCount: newAgingAlertCount };
      }
      return prev;
    });
  }, [items, agingConfig]);

  const handleOpenScanner = (
    targetZone: StorageZone = selected3DZone,
    targetBay: number = selected3DBay,
    targetLevel: ShelfLevel = 1,
    mode: MovementType = 'IN',
    locatorCode?: string,
    palletPosition?: string,
    targetItem?: InventoryItem | null
  ) => {
    setScannerZone(targetZone);
    setScannerBay(targetBay);
    setScannerLevel(targetLevel);
    setScannerMode(mode);
    setScannerLocatorCode(locatorCode);
    setScannerPalletPosition(palletPosition);
    setScannerTargetItem(targetItem || null);
    setIsScannerOpen(true);
  };

  // Open layout view for specific zone & bay
  const handleOpen3DForBay = (zone: StorageZone, bayNumber: number) => {
    setSelected3DZone(zone);
    setSelected3DBay(bayNumber);
    if (typeof zone === 'string' && (zone.startsWith('CY3') || zone.startsWith('DY3T'))) {
      setActiveTab('cy3_layout');
    } else if (typeof zone === 'string' && (zone.startsWith('FL-') || zone.startsWith('X') || zone === 'A' || zone.includes('FLOOR') || zone.includes('DA4D-1'))) {
      setActiveTab('a4_floor');
    } else {
      setA4InitialTab('RACK_ZONES');
      setActiveTab('a4_rack');
    }
  };

  // Handle Save from Scanner Modal
  const handleSaveMovement = (data: {
    type: MovementType;
    scanInput: string;
    modelHE: string;
    zone: StorageZone;
    bayNumber: number;
    level: ShelfLevel;
    quantityCheck: number;
    actualQty: number;
    useLine: string;
    remark: string;
    stdQtyPerPallet?: number;
    fullPallets?: number;
    looseQty?: number;
    protectionMethod?: ProtectionMethod;
    productType?: ProductType;
    productStorageType?: ProductStorageType;
    targetZone?: StorageZone;
    targetBayNumber?: number;
    targetLevel?: ShelfLevel;
    palletPosition?: string;
    locatorCode?: string;
    targetItemId?: string;
    targetLocatorCode?: string;
  }) => {
    const {
      type,
      scanInput,
      modelHE,
      zone,
      bayNumber,
      level,
      quantityCheck,
      actualQty,
      useLine,
      remark,
      stdQtyPerPallet = 80,
      fullPallets,
      looseQty,
      protectionMethod = 'NOT_APPLICABLE',
      productType,
      productStorageType,
      targetZone,
      targetBayNumber,
      targetLevel,
      palletPosition,
      locatorCode: incomingLocatorCode,
      targetItemId,
      targetLocatorCode: incomingTargetLocatorCode
    } = data;

    // Determine canonical locatorCode, storageType, facilityId using resolveCanonicalCoordinate
    const resolved = resolveCanonicalCoordinate({
      zone,
      bayNumber,
      level,
      palletPosition,
      locatorCode: incomingLocatorCode
    });

    const locatorCode = resolved.canonicalLocator;
    const cleanZone = resolved.zone;
    const cleanPalletPos = resolved.palletPosition || 'P1';

    let storageType: 'RACK' | 'FLOW_RAIL' | 'FLOOR_STAGING' = 'RACK';
    let facilityId = 'FAC-A4-RACK';

    const zStr = String(cleanZone);
    if (zStr.startsWith('CY3') || zStr.startsWith('DY3T')) {
      storageType = 'RACK';
      facilityId = 'FAC-CY3-TENT';
    } else if (zStr.startsWith('T') || zStr.startsWith('DA5T')) {
      storageType = 'FLOOR_STAGING';
      facilityId = 'FAC-A5-TENT';
    } else if (zStr.startsWith('X') || zStr.startsWith('DA4D-1')) {
      storageType = 'FLOOR_STAGING';
      facilityId = 'FAC-A4-FLOOR';
    } else if (zStr.startsWith('R') || zStr.startsWith('FR')) {
      storageType = 'FLOW_RAIL';
      facilityId = 'FAC-A2-RAIL';
    } else {
      storageType = 'RACK';
      facilityId = 'FAC-A4-RACK';
    }

    const qtyGap = actualQty - quantityCheck;

    // 1. Locate Target Inventory Item
    let updatedItems = [...items];
    let existingIndex = -1;

    // Highest priority: exact ID
    if (targetItemId) {
      existingIndex = updatedItems.findIndex(it => it.id === targetItemId);
    }
    // Second priority: exact canonical locator code match
    if (existingIndex < 0 && locatorCode) {
      existingIndex = updatedItems.findIndex(it => {
        if (it.locatorCode === locatorCode) return true;
        const resIt = resolveCanonicalCoordinate({
          zone: it.zone,
          bayNumber: it.bayNumber,
          level: it.level,
          palletPosition: it.palletPosition,
          locatorCode: it.locatorCode
        });
        return resIt.canonicalLocator === locatorCode;
      });
    }
    // Third priority: zone, bay, level, and palletPosition
    if (existingIndex < 0) {
      existingIndex = updatedItems.findIndex(it => {
        const resIt = resolveCanonicalCoordinate({
          zone: it.zone,
          bayNumber: it.bayNumber,
          level: it.level,
          palletPosition: it.palletPosition,
          locatorCode: it.locatorCode
        });
        return (
          resIt.zone === cleanZone &&
          resIt.bayNumber === bayNumber &&
          resIt.level === level &&
          (cleanPalletPos ? (resIt.palletPosition === cleanPalletPos || (!it.palletPosition && cleanPalletPos === 'P1')) : true)
        );
      });
    }

    let newBalance = stats.totalBalanceUnits;

    // Validate slot placement to strictly reject mixing different models on the same pallet position
    if (type === 'IN') {
      const placementVal = validateSlotPlacement(locatorCode, cleanPalletPos, modelHE, updatedItems, actualQty, masterData);
      if (!placementVal.allowed) {
        alert(placementVal.reason || '⚠️ ไม่อนุญาตให้จัดเก็บปน Model ในพาเลทเดียวกัน');
        return;
      }
    }

    // Evaluate Vinyl Wrapping Status for IN
    let agingStatusVal: any = 'SAFE';
    let holdStatusVal = false;
    let holdReasonVal = undefined;
    let agingStartDateStr = undefined;
    let dueDateStr = undefined;
    
    if (type === 'IN' && protectionMethod === 'VINYL_WRAPPING') {
       const todayStr = getBangkokDateString(new Date());
       const vinylRes = calculateVinylWrappingStatus(todayStr, todayStr, 'OK');
       agingStatusVal = vinylRes.agingStatus;
       holdStatusVal = vinylRes.holdStatus;
       holdReasonVal = vinylRes.holdReason;
       agingStartDateStr = vinylRes.agingStartDate;
       dueDateStr = vinylRes.dueDate;
    }

    const effectiveStdCapacity = stdQtyPerPallet || getModelStdCapacity(modelHE, masterData);

    if (type === 'IN') {
      if (existingIndex >= 0) {
        // Merge into existing pallet of the same model
        const item = updatedItems[existingIndex];
        item.quantity += actualQty;
        item.stdQtyPerPallet = effectiveStdCapacity;
        item.fullPallets = fullPallets ?? Math.floor(item.quantity / effectiveStdCapacity);
        item.looseQty = looseQty ?? (item.quantity % effectiveStdCapacity);
        if (modelHE) item.modelHE = modelHE;
        if (useLine) item.useLine = useLine;
      } else {
        const newItem: InventoryItem = {
          id: `item-${cleanZone}${bayNumber}-${level}-${cleanPalletPos}-${Date.now()}`,
          modelHE,
          partName: `Part ${modelHE}`,
          quantity: actualQty,
          stdQtyPerPallet: effectiveStdCapacity,
          fullPallets: fullPallets ?? Math.floor(actualQty / effectiveStdCapacity),
          looseQty: looseQty ?? (actualQty % effectiveStdCapacity),
          qrCode: scanInput,
          locatorCode,
          zone: cleanZone,
          bayNumber,
          level,
          palletPosition: cleanPalletPos as 'P1' | 'P2',
          storageType,
          facilityId,
          useLine,
          storageInDate: new Date().toISOString(),
          agingDays: 0,
          agingStatus: agingStatusVal,
          priorityUse: false,
          remark,
          protectionMethod,
          productType,
          productStorageType,
          wrappingCondition: protectionMethod === 'VINYL_WRAPPING' ? 'OK' : 'NOT_INSPECTED',
          holdStatus: holdStatusVal,
          holdReason: holdReasonVal,
          agingStartDate: agingStartDateStr,
          dueDate: dueDateStr,
          productionDate: agingStartDateStr,
          wrappingDate: agingStartDateStr
        };
        updatedItems.push(newItem);
      }
    } else if (type === 'TRANSFER' && targetZone && targetBayNumber && targetLevel) {
      // 🔄 TRANSFER: Move goods from source locator to target locator
      let sourceItem = existingIndex >= 0 ? updatedItems[existingIndex] : null;

      // Calculate target locator code
      let targetLocatorCode = incomingTargetLocatorCode;
      let targetStorageType = storageType;
      let targetFacilityId = facilityId;
      const tZStr = String(targetZone);

      if (tZStr.startsWith('CY3') || tZStr.startsWith('DY3T')) {
        const rowCode = tZStr.replace('CY3-', '').charAt(0) || 'A';
        const rowNum = rowCode === 'A' ? '1.01' : rowCode === 'B' ? '1.02' : rowCode === 'C' ? '1.03' : '1.04';
        targetLocatorCode = targetLocatorCode || `DY3T-${rowNum}-${rowCode}${String(targetBayNumber).padStart(2, '0')}-L${targetLevel}-P1`;
        targetStorageType = 'RACK';
        targetFacilityId = 'FAC-CY3-TENT';
      } else if (tZStr.startsWith('X') || tZStr.startsWith('DA4D-1')) {
        targetLocatorCode = targetLocatorCode || `DA4D-1.01-${tZStr}-R${targetBayNumber}-C${String(targetLevel).padStart(2, '0')}`;
        targetStorageType = 'FLOOR_STAGING';
        targetFacilityId = 'FAC-A4-FLOOR';
      } else if (tZStr.startsWith('T') || tZStr.startsWith('DA5T')) {
        const tentNum = tZStr.replace(/\D/g, '') || '1';
        targetLocatorCode = targetLocatorCode || `DA5T-${tentNum}-01-R${targetLevel}-C${String(targetBayNumber).padStart(2, '0')}`;
        targetStorageType = 'FLOOR_STAGING';
        targetFacilityId = 'FAC-A5-TENT';
      } else if (tZStr.startsWith('R') || tZStr.startsWith('FR')) {
        const railNum = tZStr.replace(/\D/g, '') || '1';
        targetLocatorCode = targetLocatorCode || `DA2D-1-R${String(railNum).padStart(2, '0')}-${String(targetBayNumber).padStart(2, '0')}`;
        targetStorageType = 'FLOW_RAIL';
        targetFacilityId = 'FAC-A2-RAIL';
      } else {
        const prefix = ['G', 'H', 'I', 'J', 'K'].includes(tZStr) ? 'DA4D-3' : 'DA4D-2';
        targetLocatorCode = targetLocatorCode || `${prefix}-${tZStr}${String(targetBayNumber).padStart(2, '0')}-L${targetLevel}-P1`;
        targetStorageType = 'RACK';
        targetFacilityId = 'FAC-A4-RACK';
      }

      // Validate target slot against mixed models
      const transferPlacementVal = validateSlotPlacement(targetLocatorCode, 'P1', modelHE, updatedItems, actualQty, masterData);
      if (!transferPlacementVal.allowed) {
        alert(transferPlacementVal.reason || '⚠️ ไม่อนุญาตให้ย้ายสินค้าไปปน Model กับตำแหน่งปลายทาง');
        return;
      }

      if (existingIndex >= 0) {
        const currentQty = updatedItems[existingIndex].quantity;
        const remaining = currentQty - actualQty;
        if (remaining <= 0) {
          updatedItems.splice(existingIndex, 1);
        } else {
          updatedItems[existingIndex].quantity = remaining;
        }
      }

      // Add or merge into target slot
      const targetIndex = updatedItems.findIndex(
        it => it.locatorCode === targetLocatorCode || (it.zone === targetZone && it.bayNumber === targetBayNumber && it.level === targetLevel)
      );
      if (targetIndex >= 0) {
        updatedItems[targetIndex].quantity += actualQty;
      } else {
        const transferStdCap = getModelStdCapacity(modelHE, masterData) || sourceItem?.stdQtyPerPallet || effectiveStdCapacity;
        const transferredItem: InventoryItem = {
          id: `item-${targetZone}${targetBayNumber}-${targetLevel}-${Date.now()}`,
          modelHE,
          partName: sourceItem?.partName || `Part ${modelHE}`,
          quantity: actualQty,
          stdQtyPerPallet: transferStdCap,
          fullPallets: Math.floor(actualQty / transferStdCap),
          looseQty: actualQty % transferStdCap,
          qrCode: sourceItem?.qrCode || scanInput,
          locatorCode: targetLocatorCode,
          zone: targetZone,
          bayNumber: targetBayNumber,
          level: targetLevel,
          palletPosition: 'P1',
          storageType: targetStorageType,
          facilityId: targetFacilityId,
          useLine: sourceItem?.useLine || useLine,
          storageInDate: sourceItem?.storageInDate || new Date().toISOString(),
          agingDays: sourceItem?.agingDays || 0,
          agingStatus: sourceItem?.agingStatus || 'SAFE',
          priorityUse: false,
          remark: `ย้ายจาก ${locatorCode} -> ${targetLocatorCode}`,
          protectionMethod: 'NOT_APPLICABLE'
        };
        updatedItems.push(transferredItem);
      }
    } else {
      // OUT (เบิกจ่าย): ลบหรือลดเฉพาะพาเลทที่เลือก
      if (existingIndex >= 0) {
        const currentQty = updatedItems[existingIndex].quantity;
        const remaining = currentQty - actualQty;
        if (remaining <= 0) {
          updatedItems.splice(existingIndex, 1); // ลบเฉพาะพาเลทเป้าหมายเท่านั้น ไม่กระทบพาเลทอื่นบนคานเดียวกัน
        } else {
          updatedItems[existingIndex].quantity = remaining;
          const stdCap = updatedItems[existingIndex].stdQtyPerPallet || effectiveStdCapacity;
          updatedItems[existingIndex].fullPallets = Math.floor(remaining / stdCap);
          updatedItems[existingIndex].looseQty = remaining % stdCap;
        }
      }
    }

    // 2. Perform Sanity Check & Inventory Consistency
    const sanitizedItems = recalculateInventoryConsistency(updatedItems, masterData);
    setItems(sanitizedItems);

    const calculatedTotalBalance = sanitizedItems.reduce((acc, it) => acc + it.quantity, 0);

    // 3. Add Transaction Log
    const targetLocText = (type === 'TRANSFER' && targetZone)
      ? `DA4D-1.05-${targetZone}${targetBayNumber}-L${targetLevel}`
      : locatorCode;

    const newLog: MovementLog = {
      id: `log-${Date.now()}`,
      scanInput,
      type,
      modelHE,
      locatorCode: targetLocText,
      locatorGroup: 'DA4D-1',
      locatorDetail: type === 'TRANSFER' 
        ? `ย้ายพิกัดจาก ${locatorCode} ไปยัง ${targetLocText}`
        : `วางพื้น/Rack โรง 4 ชั้น ${level}`,
      quantityCheck,
      actualQty,
      qtyGap,
      balanceQty: calculatedTotalBalance,
      useLine,
      scanStatus: 'DONE',
      issueDate: new Date().toISOString().slice(0, 10),
      createdOn: new Date().toISOString().replace('T', ' ').slice(0, 19),
      remark: type === 'TRANSFER' ? `🔄 ย้ายตำแหน่ง [${locatorCode}] -> [${targetLocText}]` : remark,
    };

    setLogs([newLog, ...logs]);

    // 4. Update Stats
    setStats((prev) => ({
      ...prev,
      totalBalanceUnits: calculatedTotalBalance,
      todayInScanCount: type === 'IN' ? prev.todayInScanCount + 1 : prev.todayInScanCount,
      todayOutScanCount: type === 'OUT' ? prev.todayOutScanCount + 1 : prev.todayOutScanCount,
      occupiedRacksCount: sanitizedItems.length,
    }));
  };

  // Quick pick aging item
  const handleQuickPickAgingItem = (item: InventoryItem) => {
    handleOpenScanner(item.zone, item.bayNumber, item.level, 'OUT');
  };

  // Stock Relocation Handler
  const handleRelocateItem = (
    itemId: string,
    newZone: string,
    newBay: number,
    newLevel: number,
    newStorageType: any
  ) => {
    const targetItem = items.find(i => i.id === itemId);
    if (!targetItem) return;

    const oldLocator = targetItem.locatorCode;
    const newLocatorCode = `DA4D-1.05-${newZone}${newBay}-L${newLevel}`;

    const updatedItems = items.map(it => {
      if (it.id === itemId) {
        return {
          ...it,
          zone: newZone as StorageZone,
          bayNumber: newBay,
          level: newLevel as ShelfLevel,
          storageType: newStorageType,
          locatorCode: newLocatorCode,
          remark: `ย้ายจาก ${oldLocator} -> ${newLocatorCode}`
        };
      }
      return it;
    });

    const sanitizedItems = recalculateInventoryConsistency(updatedItems, masterData);
    setItems(sanitizedItems);

    // Add Transfer Movement Log
    const newLog: MovementLog = {
      id: `log-reloc-${Date.now()}`,
      scanInput: `${targetItem.modelHE}_RELOC_${newLocatorCode}`,
      type: 'OUT',
      modelHE: targetItem.modelHE,
      locatorCode: newLocatorCode,
      locatorGroup: 'DA4D-1',
      locatorDetail: `ย้ายตำแหน่งจาก ${oldLocator} ไป ${newLocatorCode}`,
      quantityCheck: targetItem.quantity,
      actualQty: targetItem.quantity,
      qtyGap: 0,
      balanceQty: stats.totalBalanceUnits,
      useLine: targetItem.useLine,
      scanStatus: 'DONE',
      issueDate: new Date().toISOString().slice(0, 10),
      createdOn: new Date().toISOString().replace('T', ' ').slice(0, 19),
      remark: `🔄 ย้ายพิกัดสินค้า [${oldLocator}] -> [${newLocatorCode}]`
    };

    setLogs([newLog, ...logs]);
  };

  const appContainerRef = React.useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      appContainerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div ref={appContainerRef} className="min-h-screen w-full bg-[#07090D] text-[#F4F7FB] font-sans antialiased selection:bg-blue-600 selection:text-white flex flex-col md:flex-row min-w-0 max-w-full overflow-x-hidden">
      {/* Collapsible Left Navigation Sidebar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        facilities={facilities}
        activeFacilityId={activeFacilityId}
        setActiveFacilityId={setActiveFacilityId}
        activeStation={activeStation}
        setActiveStation={setActiveStation}
        onOpenScanner={() => handleOpenScanner()}
        agingCount={stats.agingAlertCount}
        lowStockCount={lowStockCount}
        isFullscreen={isFullscreen}
        toggleFullscreen={toggleFullscreen}
        language={language}
        setLanguage={setLanguage}
        isDarkMode={themeMode !== 'light'}
        toggleDarkMode={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')}
        themeMode={themeMode}
        setThemeMode={setThemeMode}
      />

      {/* Flexible Right Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden w-full relative">


        {/* Sticky Top Bar: Hidden on Zone Pages by Default (matching Full Screen), Shown on Data Tables (Inventory, Logs, Master, Printer) or when toggled */}
        {!isFullscreen && (!isZoneTab || showZoneTopSearch) && (
          <div className="shrink-0 sticky top-0 z-30 bg-slate-900 border-b border-slate-800 shadow-md animate-fadeIn">
            <header className="px-2.5 sm:px-4 py-1 sm:py-1.5 flex items-center justify-between gap-2 sm:gap-3 w-full">
              <div className="flex items-center space-x-1.5 sm:space-x-2 min-w-0 shrink-0">
                <span className="sm:hidden text-xs font-black text-slate-100 truncate">
                  HEX WMS
                </span>
                <span className="hidden sm:inline text-xs sm:text-[13px] font-black text-slate-200 tracking-tight truncate">
                  {t('common.systemSubtitle')}
                </span>
                <span className="px-1.5 sm:px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[9.5px] sm:text-[10.5px] font-mono font-black border border-blue-500/40 shrink-0">
                  A2 &bull; A4 &bull; A5 &bull; CY3
                </span>
              </div>
              
              {/* Global Search Bar with Real-time Zone Breakdown Lookup */}
              <div className="flex-1 max-w-xl min-w-[170px]">
                <GlobalSearchZoneLookup
                  items={items}
                  searchQuery={globalSearchQuery}
                  onSearchChange={setGlobalSearchQuery}
                  onNavigateToZone={handleCampusZoneNavigation}
                  onSelectTab={setActiveTab}
                  onOpen3DForLocator={(z, b) => handleOpen3DForBay(z, b)}
                  onOpenScanForLevel={(z, b, l, m) => handleOpenScanner(z, b, l, m)}
                  placeholder={t('common.searchPlaceholder')}
                />
              </div>

              <div className="flex items-center space-x-1.5 shrink-0">
                <button
                  onClick={() => {
                    // Global export inventory to Excel
                    const headers = ['Model HE', 'Tool Name', 'Quantity', 'Safety Stock', 'Locator Code', 'Zone', 'Bay', 'Level', 'Line', 'QR Code'];
                    const rows = items.map((it) => [
                      it.modelHE,
                      `"${it.partName}"`,
                      it.quantity,
                      it.safetyStock ?? 300,
                      it.locatorCode,
                      it.zone,
                      it.bayNumber,
                      it.level,
                      it.useLine,
                      `"${it.qrCode}"`
                    ]);
                    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement('a');
                    link.setAttribute('href', encodedUri);
                    link.setAttribute('download', `WMS_Inventory_Excel_${new Date().toISOString().slice(0, 10)}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="px-2.5 sm:px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-xs flex items-center space-x-1 sm:space-x-1.5 transition-all active:scale-95 shrink-0 h-7 sm:h-7.5"
                >
                  <span className="sm:hidden">📊 CSV</span>
                  <span className="hidden sm:inline">📊 {t('common.exportExcel')}</span>
                </button>

                {/* Close Search Bar Button when opened on Zone Views */}
                {isZoneTab && showZoneTopSearch && (
                  <button
                    onClick={() => setShowZoneTopSearch(false)}
                    className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors"
                    title="ซ่อนแถบค้นหา (กลับสู่โหมดเต็มผัง)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </header>
          </div>
        )}

        {/* Main Content Container (No window scroll on Zone Views, fits screen perfectly) */}
        <main className={`w-full flex-1 ${isZoneTab ? 'overflow-hidden p-1 sm:p-1.5' : 'overflow-y-auto px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 space-y-3'} transition-all flex flex-col min-h-0`}>

          {/* Dynamic Tab Views: Unified Master Map ("ผังรวม") - Pure 3D Digital Twin Layout */}
          {(activeTab === 'campus_overview' || activeTab === 'blueprint') && (
            <div className="w-full h-full flex-1 min-h-0 flex flex-col overflow-hidden animate-fadeIn">
              <CampusMasterOverview
                items={displayedItems}
                facilities={facilities}
                stats={stats}
                lowStockCount={lowStockCount}
                logs={logs}
                agingConfig={agingConfig}
                onNavigateToZone={handleCampusZoneNavigation}
                onOpenScanner={(z, b, l, m) => handleOpenScanner(z as any, b, l as any, m || 'IN')}
                onOpen3D={(z, b) => handleOpen3DForBay(z as any, b)}
              />
            </div>
          )}


          {/* 🟨 SEPARATE VIEW 1: A4 FLOOR STAGING (DA4D-1 432 Pallets) */}
          {activeTab === 'a4_floor' && (
            <div className="w-full h-full flex-1 min-h-0 flex flex-col overflow-hidden animate-fadeIn">
              <DA4D1FloorStagingMap
                items={displayedItems}
                logs={logs}
                searchQuery={globalSearchQuery}
                onOpenScanner={(z, b, l, m) => handleOpenScanner(z, b, l, m)}
                onRelocateItem={(item) => {
                  handleOpenScanner(item.zone, item.bayNumber, item.level, 'TRANSFER');
                }}
                onNavigateToRack={() => setActiveTab('a4_rack')}
                onNavigateToCampus={() => setActiveTab('campus_overview')}
                onToggleFullscreen={toggleFullscreen}
                isDashboardFullscreen={isFullscreen}
              />
            </div>
          )}

          {/* 🏗️ SEPARATE VIEW 2: A4 SELECTIVE RACKS (DA4D-2 & DA4D-3 680 Pallets) */}
          {(activeTab === 'a4_rack' || activeTab === 'layout') && (
            <div className="w-full h-full flex-1 min-h-0 flex flex-col overflow-hidden animate-fadeIn">
              <RackLayout2D
                items={displayedItems}
                logs={logs}
                searchQuery={globalSearchQuery}
                initialSectionTab={a4InitialTab}
                onSelectBay={(z, b) => handleOpen3DForBay(z, b)}
                onOpen3D={(z, b) => handleOpen3DForBay(z, b)}
                onOpenScanner={(z, b, l, m) => handleOpenScanner(z, b, l, m)}
                onRelocateItem={(item) => {
                  handleOpenScanner(item.zone, item.bayNumber, item.level, 'TRANSFER');
                }}
                onNavigateToFloor={() => setActiveTab('a4_floor')}
                onNavigateToCampus={() => setActiveTab('campus_overview')}
                isDashboardFullscreen={isFullscreen}
              />
            </div>
          )}

          {activeTab === 'flow_floor' && (
            <div className="w-full h-full flex-1 min-h-0 flex flex-col overflow-hidden animate-fadeIn">
              <FlowRailFloorMap
                items={displayedItems}
                logs={logs}
                searchQuery={globalSearchQuery}
                onSelectSlot={(st, z, b, l) => {
                  setScannerZone(z as StorageZone);
                  setScannerBay(b);
                  setScannerLevel(l as ShelfLevel);
                }}
                onOpenScanner={(z, b, l, m) => handleOpenScanner(z, b, l, m)}
                onRelocateItem={(item) => {
                  handleOpenScanner(item.zone, item.bayNumber, item.level, 'TRANSFER');
                }}
                onNavigateToCampus={() => setActiveTab('campus_overview')}
              />
            </div>
          )}

          {activeTab === 'tent_layout' && (
            <div className="w-full h-full flex-1 min-h-0 flex flex-col overflow-hidden animate-fadeIn">
              <A5TentFloorStagingMap
                items={displayedItems}
                logs={logs}
                searchQuery={globalSearchQuery}
                initialTentNumber={a5InitialTent}
                onSelectSlot={(tentId, groupNumber, rowCode, columnNumber) => {
                  // Pre-set scanner target with appropriate zone/bay if scanned
                  setScannerZone('A' as StorageZone);
                  setScannerBay(groupNumber);
                  setScannerLevel(1 as ShelfLevel);
                }}
                onOpenScanner={(z, b, l, m) => handleOpenScanner(z, b, l, m)}
                onRelocateItem={(item) => {
                  handleOpenScanner(item.zone, item.bayNumber, item.level, 'TRANSFER');
                }}
                onNavigateToCampus={() => setActiveTab('campus_overview')}
              />
            </div>
          )}

          {activeTab === 'cy3_layout' && (
            <div className="w-full h-full flex-1 min-h-0 flex flex-col overflow-hidden animate-fadeIn">
              <CY3TentRackMap
                items={displayedItems}
                logs={logs}
                searchQuery={globalSearchQuery}
                onOpenScanner={(z, b, l, m) => handleOpenScanner(z, b, l, m)}
                onRelocateItem={(item) => {
                  handleOpenScanner(item.zone, item.bayNumber, item.level, 'TRANSFER');
                }}
                onNavigateToCampus={() => setActiveTab('campus_overview')}
                onPrintLabel={(item) => {
                  setSelectedPrintItemId(item.id);
                  setActiveTab('printer');
                }}
              />
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="animate-fadeIn">
              <InventoryListPanel
                items={displayedItems}
                facilities={facilities}
                activeFacilityId={activeFacilityId}
                setActiveFacilityId={setActiveFacilityId}
                globalSearchQuery={globalSearchQuery}
                onUpdateSearchQuery={setGlobalSearchQuery}
                onOpen3DForLocator={(z, b) => handleOpen3DForBay(z, b)}
                onOpenScanForLevel={(z, b, l, m) => handleOpenScanner(z, b, l, m)}
                onOpenVinylAction={item => setActiveVinylItem(item)}
                agingConfig={agingConfig}
                onQuickPickItem={handleQuickPickAgingItem}
                onPrintLabel={(item) => {
                  setSelectedPrintItemId(item.id);
                  setActiveTab('printer');
                }}
              />
            </div>
          )}

          {activeTab === 'rack3d' && (
            <div className="animate-fadeIn">
              <Rack3DViewer
                selectedZone={selected3DZone}
                selectedBayNumber={selected3DBay}
                items={displayedItems}
                zoneCapacities={zoneCapacities}
                onSelectBayAndZone={(z, b) => {
                  setSelected3DZone(z);
                  setSelected3DBay(b);
                }}
                onOpenScanForLevel={(z, b, l, m) => handleOpenScanner(z, b, l, m)}
                onBackToDashboard={() => setActiveTab('layout')}
              />
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="animate-fadeIn">
              <MovementLogsTable
                logs={logs}
                auditLogs={auditLogs}
                onOpen3DForLocator={(z, b) => handleOpen3DForBay(z, b)}
              />
            </div>
          )}

          {activeTab === 'master' && (
            <div className="animate-fadeIn">
              <MasterListPanel
                masterData={masterData}
                setMasterData={setMasterData}
                useLines={useLines}
                setUseLines={setUseLines}
                targetUseLines={targetUseLines}
                setTargetUseLines={setTargetUseLines}
                zoneCapacities={zoneCapacities}
                setZoneCapacities={setZoneCapacities}
                items={items}
                setItems={setItems}
                facilities={facilities}
                setFacilities={setFacilities}
                activeFacilityId={activeFacilityId}
                setActiveFacilityId={setActiveFacilityId}
                agingConfig={agingConfig}
                setAgingConfig={setAgingConfig}
                customSlots={customSlots}
                setCustomSlots={setCustomSlots}
                onClearAllData={handleClearAllData}
                onLoadSampleData={handleLoadSampleData}
              />
            </div>
          )}
        </main>

        {/* Footer Info */}
        <footer className="h-12 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-4 sm:px-6 lg:px-8 text-xs text-slate-500 uppercase tracking-wider shrink-0 mt-auto w-full">
          <span className="font-semibold text-slate-700 dark:text-slate-300">{t('common.copyright')}</span>
          <span className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            {t('common.serverStatusOnline')}
          </span>
        </footer>
      </div>

      {/* Quick QR Scanner Modal */}
      <QuickScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onSaveMovement={handleSaveMovement}
        initialZone={scannerZone}
        initialBayNumber={scannerBay}
        initialLevel={scannerLevel}
        initialMode={scannerMode}
        initialLocatorCode={scannerLocatorCode}
        initialPalletPosition={scannerPalletPosition}
        initialItem={scannerTargetItem}
        existingItems={items}
        useLines={useLines}
        targetUseLines={targetUseLines}
        masterData={masterData}
      />
      
      {/* Vinyl Action Modal */}
      <VinylWrappingActionModal
        isOpen={!!activeVinylItem}
        item={activeVinylItem}
        onClose={() => setActiveVinylItem(null)}
        onSave={handleVinylActionSave}
      />
    </div>
  );
}
