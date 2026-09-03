import React, { useState, useEffect } from 'react';
import { InventoryItem, MovementLog, MovementType, ShelfLevel, StorageZone, WmsStats, MasterDataItem, UseLineMaster, ZoneCapacityMaster, WarehouseFacility, AgingThresholdConfig, CustomRackSlot } from './types';
import { INITIAL_ITEMS, INITIAL_LOGS, INITIAL_STATS, INITIAL_FACILITIES } from './data/mockData';
import { Navbar } from './components/Navbar';
import { DashboardKPIs } from './components/DashboardKPIs';
import { RackLayout2D } from './components/RackLayout2D';
import { Rack3DViewer } from './components/Rack3DViewer';
import { QuickScannerModal } from './components/QuickScannerModal';
import { MovementLogsTable } from './components/MovementLogsTable';
import { AgingFifoPanel } from './components/AgingFifoPanel';
import { InventoryListPanel } from './components/InventoryListPanel';
import { LabelPrinterPanel } from './components/LabelPrinterPanel';
import { MasterListPanel } from './components/MasterListPanel';
import { FlowRailFloorMap } from './components/FlowRailFloorMap';
import { CampusMasterOverview } from './components/CampusMasterOverview';
import { A5TentFloorStagingMap } from './components/A5TentFloorStagingMap';
import { CY3TentRackMap } from './components/CY3TentRackMap';
import { DA4D1FloorStagingMap } from './components/DA4D1FloorStagingMap';
import { TopKpiSummaryBar } from './components/TopKpiSummaryBar';
import { GlobalSearchZoneLookup } from './components/GlobalSearchZoneLookup';

// Extract initial master data from INITIAL_ITEMS
const initialMasterData: MasterDataItem[] = Array.from(new Set(INITIAL_ITEMS.map(i => i.modelHE))).map(modelHE => {
  const item = INITIAL_ITEMS.find(i => i.modelHE === modelHE)!;
  return {
    modelHE,
    partName: item.partName,
    safetyStock: item.safetyStock || 300,
    stdQtyPerPallet: item.stdQtyPerPallet || 80
  };
});

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
  const [activeTab, setActiveTab] = useState<string>('campus_overview');
  const [activeStation, setActiveStation] = useState<string>('ALL');
  const [language, setLanguage] = useState<string>('th');
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'hdmi'>(() => {
    const saved = localStorage.getItem('themeMode') || localStorage.getItem('theme');
    if (saved === 'hdmi') return 'hdmi';
    if (saved === 'dark' || saved === 'true') return 'dark';
    return 'light';
  });

  useEffect(() => {
    document.documentElement.classList.remove('dark', 'hdmi');
    if (themeMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (themeMode === 'hdmi') {
      document.documentElement.classList.add('dark', 'hdmi');
    }
    localStorage.setItem('themeMode', themeMode);
    localStorage.setItem('theme', themeMode === 'light' ? 'light' : 'dark');
  }, [themeMode]);

  const [masterData, setMasterData] = useState<MasterDataItem[]>(initialMasterData);
  const [useLines, setUseLines] = useState<UseLineMaster[]>([
    { id: 'HE1', name: 'Line HE1', description: 'สายการผลิตเครื่องทำความร้อน HE1 (โรง A2)' },
    { id: 'HE2', name: 'Line HE2', description: 'สายการผลิตเครื่องทำความร้อน HE2 (โรง A2)' },
    { id: 'HE3', name: 'Line HE3', description: 'สายการผลิตเครื่องทำความร้อน HE3 (โรง A2)' },
    { id: 'HE4', name: 'Line HE4', description: 'สายการผลิตเครื่องทำความร้อน HE4 (โรง A4)' },
    { id: 'HE5', name: 'Line HE5', description: 'สายการผลิตเครื่องทำความร้อน HE5 (โรง A4)' },
    { id: 'REPAIR', name: 'Line Repair', description: 'โซนงานซ่อมแก้ไข (Repair Station)' },
  ]);
  const [zoneCapacities, setZoneCapacities] = useState<ZoneCapacityMaster[]>(initialZoneCapacities);
  const [facilities, setFacilities] = useState<WarehouseFacility[]>(INITIAL_FACILITIES);
  const [activeFacilityId, setActiveFacilityId] = useState<string>('ALL');
  const [items, setItems] = useState<InventoryItem[]>(INITIAL_ITEMS);
  const [logs, setLogs] = useState<MovementLog[]>(INITIAL_LOGS);
  const [stats, setStats] = useState<WmsStats>(INITIAL_STATS);
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>('');
  const [a4InitialTab, setA4InitialTab] = useState<'FLOOR_DA4D1' | 'RACK_ZONES' | 'FULL3D'>('FLOOR_DA4D1');
  const [a5InitialTent, setA5InitialTent] = useState<number>(1);

  // Dynamic Aging Threshold Config State
  const [agingConfig, setAgingConfig] = useState<AgingThresholdConfig>(() => {
    const saved = localStorage.getItem('lge_wms_aging_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return {
      safeDaysMax: 14,
      warningDaysMax: 30,
      criticalDays: 30,
      autoAlertEnabled: true,
      notifyOnFifoViolation: true,
      customRuleName: 'มาตรฐาน LGE (14/30 วัน)'
    };
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
    if (target === 'A4_RACK') {
      setA4InitialTab('RACK_ZONES');
      setActiveTab('a4_rack');
    } else if (target === 'A4_FLOOR' || target === 'A4_MACRO') {
      setA4InitialTab('FLOOR_DA4D1');
      setActiveTab('a4_floor');
    } else if (target === 'A4_3D') {
      setA4InitialTab('FULL3D');
      setActiveTab('a4_rack');
    } else if (target === 'A2_RAIL' || target === 'A2_MACRO' || target === 'A2_SPLIT') {
      setActiveTab('flow_floor');
    } else if (target === 'A5_TENT' || target === 'A5_MACRO') {
      if (tentNum) setA5InitialTent(tentNum);
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

  // Trigger Scanner Modal with target location
  const handleOpenScanner = (
    targetZone: StorageZone = selected3DZone,
    targetBay: number = selected3DBay,
    targetLevel: ShelfLevel = 1,
    mode: MovementType = 'IN'
  ) => {
    setScannerZone(targetZone);
    setScannerBay(targetBay);
    setScannerLevel(targetLevel);
    setScannerMode(mode);
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
    } = data;

    let locatorCode = `DA4D-1.05-${zone}${bayNumber}-L${level}`;
    let storageType: 'RACK' | 'FLOW_RAIL' | 'FLOOR_STAGING' = 'RACK';
    let facilityId = activeFacilityId === 'ALL' ? 'FAC-A4-RACK' : activeFacilityId;

    if (String(zone).startsWith('CY3') || String(zone).startsWith('DY3T')) {
      const rowCode = String(zone).replace('CY3-', '');
      const rowNum = rowCode === 'A' ? '1.01' : rowCode === 'B' ? '1.02' : rowCode === 'C' ? '1.03' : '1.04';
      locatorCode = `DY3T-${rowNum}-${rowCode}${bayNumber}-L${level}`;
      storageType = 'RACK';
      facilityId = 'FAC-CY3-TENT';
    } else if (String(zone).startsWith('R') || String(zone).startsWith('FR')) {
      const railNum = String(zone).replace(/\D/g, '');
      const formattedPos = String(bayNumber).padStart(2, '0');
      locatorCode = `DA2D-1-R${railNum}-${formattedPos}`;
      storageType = 'FLOW_RAIL';
      facilityId = 'FAC-A2-RAIL';
    } else if (String(zone).startsWith('FL') || String(zone).startsWith('A1')) {
      locatorCode = `A2-FL-${zone}-${String(bayNumber).padStart(2, '0')}`;
      storageType = 'FLOOR_STAGING';
      facilityId = 'FAC-A2-RAIL';
    }

    const qtyGap = actualQty - quantityCheck;

    // 1. Update or create Inventory Item
    let updatedItems = [...items];
    const existingIndex = updatedItems.findIndex(
      (it) => it.zone === zone && it.bayNumber === bayNumber && it.level === level
    );

    let newBalance = stats.totalBalanceUnits;

    if (type === 'IN') {
      newBalance += actualQty;
      if (existingIndex >= 0) {
        const item = updatedItems[existingIndex];
        item.quantity += actualQty;
        item.stdQtyPerPallet = stdQtyPerPallet;
        item.fullPallets = fullPallets ?? Math.floor(item.quantity / stdQtyPerPallet);
        item.looseQty = looseQty ?? (item.quantity % stdQtyPerPallet);
      } else {
        const newItem: InventoryItem = {
          id: `item-${zone}${bayNumber}-${level}-${Date.now()}`,
          modelHE,
          partName: `Part ${modelHE}`,
          quantity: actualQty,
          stdQtyPerPallet,
          fullPallets: fullPallets ?? Math.floor(actualQty / stdQtyPerPallet),
          looseQty: looseQty ?? (actualQty % stdQtyPerPallet),
          qrCode: scanInput,
          locatorCode,
          zone,
          bayNumber,
          level,
          storageType,
          facilityId,
          useLine,
          storageInDate: new Date().toISOString(),
          agingDays: 0,
          agingStatus: 'SAFE',
          priorityUse: false,
          remark,
        };
        updatedItems.push(newItem);
      }
    } else {
      // OUT (เบิกจ่าย)
      newBalance = Math.max(0, newBalance - actualQty);
      if (existingIndex >= 0) {
        const currentQty = updatedItems[existingIndex].quantity;
        const remaining = currentQty - actualQty;
        if (remaining <= 0) {
          updatedItems.splice(existingIndex, 1); // Remove item if 0
        } else {
          updatedItems[existingIndex].quantity = remaining;
        }
      }
    }

    setItems(updatedItems);

    // 2. Add Transaction Log
    const newLog: MovementLog = {
      id: `log-${Date.now()}`,
      scanInput,
      type,
      modelHE,
      locatorCode,
      locatorGroup: 'DA4D-1',
      locatorDetail: `วางพื้น/Rack โรง 4 ชั้น ${level}`,
      quantityCheck,
      actualQty,
      qtyGap,
      balanceQty: newBalance,
      useLine,
      scanStatus: 'DONE',
      issueDate: new Date().toISOString().slice(0, 10),
      createdOn: new Date().toISOString().replace('T', ' ').slice(0, 19),
      remark,
    };

    setLogs([newLog, ...logs]);

    // 3. Update Stats
    setStats((prev) => ({
      ...prev,
      totalBalanceUnits: newBalance,
      todayInScanCount: type === 'IN' ? prev.todayInScanCount + 1 : prev.todayInScanCount,
      todayOutScanCount: type === 'OUT' ? prev.todayOutScanCount + 1 : prev.todayOutScanCount,
      occupiedRacksCount: updatedItems.length,
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

    setItems(updatedItems);

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
    <div ref={appContainerRef} className="min-h-screen w-full bg-slate-50 text-slate-900 font-sans antialiased selection:bg-blue-500 selection:text-white flex flex-col md:flex-row min-w-0 max-w-full overflow-x-hidden">
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
        toggleDarkMode={() => setThemeMode(themeMode === 'light' ? 'dark' : themeMode === 'dark' ? 'hdmi' : 'light')}
        themeMode={themeMode}
        setThemeMode={setThemeMode}
      />

      {/* Flexible Right Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden w-full">
        {/* Sticky & Locked Top Bar (Locked on Scroll) */}
        {!isFullscreen && (
          <div className="shrink-0 sticky top-0 z-30 bg-slate-900 border-b border-slate-800 shadow-md">
            <header className="px-2.5 sm:px-4 py-1 sm:py-1.5 flex items-center justify-between gap-2 sm:gap-3 w-full">
              <div className="flex items-center space-x-1.5 sm:space-x-2 min-w-0 shrink-0">
                <span className="sm:hidden text-xs font-black text-slate-100 truncate">
                  HEX WMS
                </span>
                <span className="hidden sm:inline text-xs sm:text-[13px] font-black text-slate-200 tracking-tight truncate">
                  ระบบจัดการคลังสินค้าอัตโนมัติ (HEX WMS Automation System)
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
                  placeholder="🔍 พิมพ์ Part No. / Model (บอกทันทีว่าอยู่โซนไหน เท่าไหร่บ้าง)..."
                />
              </div>

              <div className="flex items-center space-x-2 shrink-0">
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
                  <span className="hidden sm:inline">📊 ส่งออกข้อมูล Excel (.csv)</span>
                </button>
              </div>
            </header>

            {/* Unified Global Top KPI Summary Bar (Locked at Top, Hidden on printer and master tabs) */}
            {activeTab !== 'printer' && activeTab !== 'master' && (
              <div className="px-2 sm:px-3 lg:px-4 py-1 sm:py-1.5 bg-slate-950/95 border-t border-slate-800/80">
                <TopKpiSummaryBar
                  items={items}
                  logs={logs}
                  stats={stats}
                  activeTab={activeTab}
                  activeFacilityId={activeFacilityId}
                  agingConfig={agingConfig}
                  onSelectFilter={(tab) => setActiveTab(tab)}
                  onNavigateToLayout={(target) => handleCampusZoneNavigation(target as any)}
                />
              </div>
            )}
          </div>
        )}

        {/* Scrollable Main Content Container */}
        <main className="w-full flex-1 overflow-y-auto overflow-x-hidden px-2 sm:px-3 lg:px-4 py-2 sm:py-2.5 space-y-3 transition-all">

          {/* Dynamic Tab Views */}
          {(activeTab === 'dashboard' || activeTab === 'campus_overview') && (
            <div className="space-y-6 animate-fadeIn">
              <CampusMasterOverview
                items={displayedItems}
                facilities={facilities}
                stats={stats}
                lowStockCount={lowStockCount}
                logs={logs}
                agingConfig={agingConfig}
                customSlots={customSlots}
                onNavigateToZone={handleCampusZoneNavigation}
                onOpenScanner={(z, b, l, m) => handleOpenScanner(z, b, l, m)}
                onOpen3D={(z, b) => handleOpen3DForBay(z, b)}
                onRelocateItem={(item) => {
                  setActiveTab('master');
                }}
                onSelectFilter={(tab) => setActiveTab(tab)}
                onOpenPrinter={() => setActiveTab('printer')}
              />
            </div>
          )}

          {/* 🟨 SEPARATE VIEW 1: A4 FLOOR STAGING (DA4D-1 432 Pallets) */}
          {activeTab === 'a4_floor' && (
            <div className="space-y-4 animate-fadeIn">
              <DA4D1FloorStagingMap
                items={displayedItems}
                searchQuery={globalSearchQuery}
                onOpenScanner={(z, b, l, m) => handleOpenScanner(z, b, l, m)}
                onRelocateItem={(item) => {
                  setActiveTab('master');
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
            <div className="space-y-6 animate-fadeIn">
              <RackLayout2D
                items={displayedItems}
                searchQuery={globalSearchQuery}
                initialSectionTab={a4InitialTab}
                onSelectBay={(z, b) => handleOpen3DForBay(z, b)}
                onOpen3D={(z, b) => handleOpen3DForBay(z, b)}
                onOpenScanner={(z, b, l, m) => handleOpenScanner(z, b, l, m)}
                onRelocateItem={(item) => {
                  setActiveTab('master');
                }}
                onNavigateToFloor={() => setActiveTab('a4_floor')}
                onNavigateToCampus={() => setActiveTab('campus_overview')}
                isDashboardFullscreen={isFullscreen}
              />
            </div>
          )}

          {activeTab === 'flow_floor' && (
            <div className="space-y-6 animate-fadeIn">
              <FlowRailFloorMap
                items={displayedItems}
                searchQuery={globalSearchQuery}
                onSelectSlot={(st, z, b, l) => {
                  setScannerZone(z as StorageZone);
                  setScannerBay(b);
                  setScannerLevel(l as ShelfLevel);
                }}
                onOpenScanner={(z, b, l, m) => handleOpenScanner(z, b, l, m)}
                onRelocateItem={(item) => {
                  setActiveTab('master');
                }}
                onNavigateToCampus={() => setActiveTab('campus_overview')}
              />
            </div>
          )}

          {activeTab === 'tent_layout' && (
            <div className="space-y-6 animate-fadeIn">
              <A5TentFloorStagingMap
                items={displayedItems}
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
                  setActiveTab('master');
                }}
                onNavigateToCampus={() => setActiveTab('campus_overview')}
              />
            </div>
          )}

          {activeTab === 'cy3_layout' && (
            <div className="space-y-6 animate-fadeIn">
              <CY3TentRackMap
                items={displayedItems}
                searchQuery={globalSearchQuery}
                onOpenScanner={(z, b, l, m) => handleOpenScanner(z, b, l, m)}
                onRelocateItem={(item) => {
                  setActiveTab('master');
                }}
                onNavigateToCampus={() => setActiveTab('campus_overview')}
                onPrintLabel={(item) => {
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
                onOpen3DForLocator={(z, b) => handleOpen3DForBay(z, b)}
              />
            </div>
          )}

          {activeTab === 'aging' && (
            <div className="animate-fadeIn">
              <AgingFifoPanel
                items={displayedItems}
                agingConfig={agingConfig}
                onOpen3DForLocator={(z, b) => handleOpen3DForBay(z, b)}
                onQuickPickItem={handleQuickPickAgingItem}
                onOpenAgingSettings={() => setActiveTab('master')}
              />
            </div>
          )}

          {activeTab === 'printer' && (
            <div className="animate-fadeIn">
              <LabelPrinterPanel
                items={items}
                agingConfig={agingConfig}
                facilities={facilities}
                customSlots={customSlots}
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
                zoneCapacities={zoneCapacities}
                setZoneCapacities={setZoneCapacities}
                items={items}
                setItems={setItems}
                onRelocateItem={handleRelocateItem}
                facilities={facilities}
                setFacilities={setFacilities}
                activeFacilityId={activeFacilityId}
                setActiveFacilityId={setActiveFacilityId}
                agingConfig={agingConfig}
                setAgingConfig={setAgingConfig}
                customSlots={customSlots}
                setCustomSlots={setCustomSlots}
                onNavigateToLayout={(fac) => {
                  setActiveFacilityId(fac.id);
                  if (fac.id === 'FAC-A5-TENT' || fac.storageTypes.includes('FLOOR_STAGING') && !fac.storageTypes.includes('RACK') && !fac.storageTypes.includes('FLOW_RAIL')) {
                    setActiveTab('tent_layout');
                  } else if (fac.storageTypes.includes('FLOW_RAIL') && !fac.storageTypes.includes('RACK')) {
                    setActiveTab('flow_floor');
                  } else {
                    setActiveTab('layout');
                  }
                }}
              />
            </div>
          )}
        </main>

        {/* Footer Info */}
        <footer className="h-12 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-4 sm:px-6 lg:px-8 text-xs text-slate-500 uppercase tracking-wider shrink-0 mt-auto w-full">
          <span className="font-semibold text-slate-700 dark:text-slate-300">HEX WMS LGETH © 2026</span>
          <span className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Server Status: Online
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
        existingItems={items}
        useLines={useLines}
        masterData={masterData}
      />
    </div>
  );
}
