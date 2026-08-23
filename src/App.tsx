import React, { useState, useEffect } from 'react';
import { InventoryItem, MovementLog, MovementType, ShelfLevel, StorageZone, WmsStats, MasterDataItem, UseLineMaster, ZoneCapacityMaster, WarehouseFacility } from './types';
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
  const [activeTab, setActiveTab] = useState<string>('dashboard');
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
    { id: 'HE1', name: 'Line HE1', description: 'สายการผลิตเครื่องทำความร้อน HE1' },
    { id: 'HE2', name: 'Line HE2', description: 'สายการผลิตเครื่องทำความร้อน HE2' },
    { id: 'HE3', name: 'Line HE3', description: 'สายการผลิตเครื่องทำความร้อน HE3' },
    { id: 'REPAIR', name: 'Line Repair', description: 'โซนงานซ่อมแก้ไข (Repair Station)' },
  ]);
  const [zoneCapacities, setZoneCapacities] = useState<ZoneCapacityMaster[]>(initialZoneCapacities);
  const [facilities, setFacilities] = useState<WarehouseFacility[]>(INITIAL_FACILITIES);
  const [activeFacilityId, setActiveFacilityId] = useState<string>('ALL');
  const [items, setItems] = useState<InventoryItem[]>(INITIAL_ITEMS);
  const [logs, setLogs] = useState<MovementLog[]>(INITIAL_LOGS);
  const [stats, setStats] = useState<WmsStats>(INITIAL_STATS);
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>('');

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

  // Open 3D Inspector for specific zone & bay
  const handleOpen3DForBay = (zone: StorageZone, bayNumber: number) => {
    setSelected3DZone(zone);
    setSelected3DBay(bayNumber);
    setActiveTab('rack3d');
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

    const locatorCode = `DA4D-1.05-${zone}${bayNumber}-L${level}`;
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
      <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden w-full">
        <main className="w-full max-w-none px-2.5 sm:px-4 lg:px-6 py-3 sm:py-4 space-y-4 sm:space-y-5 transition-all min-w-0 max-w-full overflow-x-hidden flex-1">
          {!(isFullscreen && activeTab === 'dashboard') && (
            <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-3.5 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 w-full">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={globalSearchQuery}
                  onChange={(e) => {
                    setGlobalSearchQuery(e.target.value);
                    if (activeTab !== 'inventory' && activeTab !== 'dashboard' && activeTab !== 'layout') {
                      setActiveTab('inventory');
                    }
                  }}
                  placeholder="🔍 สแกน / พิมพ์ค้นหาวัตถุดิบด่วน (Model HE, Location Code เช่น DA4D-1.02-B11-L1, QR Barcode...)"
                  className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 rounded-lg px-3.5 py-2 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white transition-all shadow-xs"
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
                  className="w-full sm:w-auto justify-center px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center space-x-1.5 transition-all active:scale-95"
                >
                  <span>📊 ส่งออกข้อมูล Excel (.csv)</span>
                </button>
              </div>
            </div>
          )}

          {/* Dynamic Tab Views */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fadeIn">
              {/* KPI Dashboard Banner - Rendered strictly on ภาพรวม page only */}
              <DashboardKPIs
                stats={stats}
                lowStockCount={lowStockCount}
                onSelectFilter={(tab) => setActiveTab(tab)}
                logs={logs}
                items={displayedItems}
              />

              {/* Quick Navigation Card to Layout Map */}
              <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-xl p-5 text-white flex flex-col md:flex-row items-center justify-between gap-4 shadow-md border border-blue-800">
                <div className="space-y-1">
                  <h3 className="font-extrabold text-base flex items-center space-x-2">
                    <span>🗺️ แผนผังคลังสินค้าแบบโต้ตอบ (2D & 3D Interactive Layout Map)</span>
                  </h3>
                  <p className="text-xs text-blue-200">
                    สำรวจตำแหน่งจัดเก็บ Zone B-K, ระบบ Heatmap แสดงความหนาแน่น และส่องภาพ 3D เสมือนจริง
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab('layout')}
                  className="px-5 py-2.5 bg-blue-500 hover:bg-blue-400 text-white font-extrabold rounded-lg text-xs shadow-md transition-all shrink-0 active:scale-95 flex items-center space-x-2"
                >
                  <span>เปิดดูแผนผัง Layout 2D/3D Map →</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'layout' && (
            <div className="space-y-6 animate-fadeIn">
              <RackLayout2D
                items={displayedItems}
                searchQuery={globalSearchQuery}
                onSelectBay={(z, b) => handleOpen3DForBay(z, b)}
                onOpen3D={(z, b) => handleOpen3DForBay(z, b)}
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
                onOpen3DForLocator={(z, b) => handleOpen3DForBay(z, b)}
                onQuickPickItem={handleQuickPickAgingItem}
              />
            </div>
          )}

          {activeTab === 'printer' && (
            <div className="animate-fadeIn">
              <LabelPrinterPanel />
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
                onNavigateToLayout={(fac) => {
                  setActiveFacilityId(fac.id);
                  if (fac.storageTypes.includes('FLOW_RAIL') && !fac.storageTypes.includes('RACK')) {
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
        <footer className="h-12 border-t border-slate-200 bg-white flex items-center justify-between px-4 sm:px-6 lg:px-8 text-xs text-slate-500 uppercase tracking-wider shrink-0 mt-auto w-full">
          <span className="font-medium text-slate-600">Warehouse Management System Pro © 2026</span>
          <span className="flex items-center gap-2 font-bold text-slate-700">
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
