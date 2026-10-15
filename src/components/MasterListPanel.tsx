import React, { useState } from 'react';
import { MasterDataItem, UseLineMaster, ZoneCapacityMaster, StorageZone, InventoryItem, CustomRackSlot, StorageLocationType, WarehouseFacility, AgingThresholdConfig } from '../types';
import { FacilityManager } from './FacilityManager';
import { DynamicLegendPanel } from './DynamicLegendPanel';
import { AgingFifoPanel } from './AgingFifoPanel';
import { useTranslation } from '../i18n/i18nContext';
import { 
  Settings, 
  Save, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Factory, 
  Database, 
  Layers, 
  Box, 
  ArrowLeftRight, 
  MapPin, 
  Grid, 
  GitCommit, 
  CheckCircle2, 
  AlertCircle,
  FolderPlus,
  RefreshCw,
  Building2,
  BookOpen,
  HelpCircle,
  Sparkles,
  Flame,
  Clock,
  Sliders,
  ShieldAlert,
  Wrench
} from 'lucide-react';

interface MasterListPanelProps {
  masterData: MasterDataItem[];
  setMasterData: React.Dispatch<React.SetStateAction<MasterDataItem[]>>;
  useLines: UseLineMaster[];
  setUseLines: React.Dispatch<React.SetStateAction<UseLineMaster[]>>;
  zoneCapacities: ZoneCapacityMaster[];
  setZoneCapacities: React.Dispatch<React.SetStateAction<ZoneCapacityMaster[]>>;
  items: InventoryItem[];
  setItems: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  onRelocateItem?: (itemId: string, newZone: string, newBay: number, newLevel: number, newStorageType: StorageLocationType) => void;
  facilities?: WarehouseFacility[];
  setFacilities?: React.Dispatch<React.SetStateAction<WarehouseFacility[]>>;
  activeFacilityId?: string;
  setActiveFacilityId?: (id: string) => void;
  onNavigateToLayout?: (facility: WarehouseFacility) => void;
  agingConfig?: AgingThresholdConfig;
  setAgingConfig?: React.Dispatch<React.SetStateAction<AgingThresholdConfig>>;
  customSlots?: CustomRackSlot[];
  setCustomSlots?: React.Dispatch<React.SetStateAction<CustomRackSlot[]>>;
}

export const MasterListPanel: React.FC<MasterListPanelProps> = ({
  masterData,
  setMasterData,
  useLines,
  setUseLines,
  zoneCapacities,
  setZoneCapacities,
  items,
  setItems,
  onRelocateItem,
  facilities = [],
  setFacilities,
  activeFacilityId = 'ALL',
  setActiveFacilityId = () => {},
  onNavigateToLayout,
  agingConfig = { safeDaysMax: 14, warningDaysMax: 30, criticalDays: 30, autoAlertEnabled: true, notifyOnFifoViolation: true, customRuleName: 'มาตรฐาน LGE (14/30 วัน)' },
  setAgingConfig,
  customSlots: propCustomSlots,
  setCustomSlots: propSetCustomSlots
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'FACILITIES' | 'AGING_CONFIG' | 'GUIDE_LEGEND' | 'ITEMS' | 'LINES' | 'ZONE_CAPACITY' | 'RACK_LOCATIONS' | 'RELOCATE'>('AGING_CONFIG');

  // States for Master Item list
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<MasterDataItem | null>(null);

  // States for Use Lines list
  const [lineSearch, setLineSearch] = useState('');
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editLineForm, setEditLineForm] = useState<UseLineMaster | null>(null);
  const [lineSuccessMsg, setLineSuccessMsg] = useState<string | null>(null);

  // States for Zone Capacities list
  const [editingZone, setEditingZone] = useState<StorageZone | null>(null);
  const [editZoneForm, setEditZoneForm] = useState<ZoneCapacityMaster | null>(null);

  // Initial custom slots if not provided from parent
  const [localCustomSlots, setLocalCustomSlots] = useState<CustomRackSlot[]>([
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

  const customSlots = propCustomSlots || localCustomSlots;
  const setCustomSlots = propSetCustomSlots || setLocalCustomSlots;

  const [newSlotForm, setNewSlotForm] = useState<{
    zone: string;
    stationId: string;
    baysCount: number;
    maxLevels: number;
    storageType: StorageLocationType;
    capacityPerLevel: number;
    description: string;
  }>({
    zone: '',
    stationId: 'STATION_1',
    baysCount: 10,
    maxLevels: 4,
    storageType: 'RACK',
    capacityPerLevel: 2,
    description: ''
  });

  const [isAddingSlot, setIsAddingSlot] = useState(false);

  // States for Stock Relocation (ย้ายตำแหน่ง)
  const [relocateSearch, setRelocateSearch] = useState('');
  const [selectedItemToMove, setSelectedItemToMove] = useState<InventoryItem | null>(null);
  const [targetZone, setTargetZone] = useState<string>('B');
  const [targetBay, setTargetBay] = useState<number>(1);
  const [targetLevel, setTargetLevel] = useState<number>(1);
  const [targetStorageType, setTargetStorageType] = useState<StorageLocationType>('RACK');
  const [relocateSuccessMsg, setRelocateSuccessMsg] = useState<string | null>(null);

  // Filter Items
  const filteredData = masterData.filter(d => 
    d.modelHE.toLowerCase().includes(search.toLowerCase()) || 
    d.partName.toLowerCase().includes(search.toLowerCase())
  );

  // Filter Lines
  const filteredLines = useLines.filter(l =>
    l.id.toLowerCase().includes(lineSearch.toLowerCase()) ||
    l.name.toLowerCase().includes(lineSearch.toLowerCase()) ||
    (l.description && l.description.toLowerCase().includes(lineSearch.toLowerCase()))
  );

  // Item Handlers
  const handleEdit = (item: MasterDataItem) => {
    setEditingId(item.modelHE);
    setEditForm({ ...item });
  };

  const handleSave = () => {
    if (editForm) {
      if (editingId === 'new') {
        if (masterData.some(d => d.modelHE.trim().toLowerCase() === editForm.modelHE.trim().toLowerCase())) {
          alert('รหัส Model HE นี้มีอยู่แล้วในระบบ');
          return;
        }
        if (!editForm.modelHE.trim()) {
          alert('กรุณากรอกรหัส Model HE');
          return;
        }
        setMasterData([...masterData, { ...editForm, modelHE: editForm.modelHE.trim().toUpperCase() }]);
      } else {
        setMasterData(masterData.map(d => d.modelHE === editingId ? editForm : d));
      }
      setEditingId(null);
      setEditForm(null);
    }
  };

  const handleDelete = (modelHE: string) => {
    if (confirm(`คุณต้องการลบรหัส ${modelHE} ใช่หรือไม่?`)) {
      setMasterData(masterData.filter(d => d.modelHE !== modelHE));
    }
  };

  const handleAddNew = () => {
    setEditingId('new');
    setEditForm({ modelHE: '', partName: '', safetyStock: 300, stdQtyPerPallet: 80 });
  };

  // Use Line Handlers
  const handleEditLine = (line: UseLineMaster) => {
    setEditingLineId(line.id);
    setEditLineForm({ ...line });
  };

  const handleCancelLine = () => {
    setEditingLineId(null);
    setEditLineForm(null);
  };

  const handleSaveLine = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (editLineForm) {
      const trimmedId = editLineForm.id.trim().toUpperCase();
      const trimmedName = editLineForm.name.trim();
      if (!trimmedId) {
        alert('กรุณากรอกรหัสไลน์ผลิต (Line ID เช่น HE1, HE6)');
        return;
      }
      if (!trimmedName) {
        alert('กรุณากรอกชื่อไลน์ผลิต (Line Name เช่น Line HE6)');
        return;
      }
      if (editingLineId === 'new') {
        if (useLines.some(l => l.id.toUpperCase() === trimmedId)) {
          alert(`รหัสไลน์ผลิต "${trimmedId}" นี้มีอยู่แล้วในระบบ กรุณาใช้รหัสอื่น`);
          return;
        }
        const newLine: UseLineMaster = { 
          id: trimmedId, 
          name: trimmedName, 
          description: editLineForm.description?.trim() || '' 
        };
        setUseLines([...useLines, newLine]);
        setLineSuccessMsg(`✅ เพิ่มไลน์ผลิตใหม่ [${trimmedId} - ${trimmedName}] เรียบร้อยแล้ว!`);
      } else {
        // Edit existing line
        const oldId = editingLineId;
        const updatedLine: UseLineMaster = {
          id: trimmedId,
          name: trimmedName,
          description: editLineForm.description?.trim() || ''
        };
        setUseLines(useLines.map(l => l.id === oldId ? updatedLine : l));

        // Cascade update in items if line ID changed
        if (oldId && oldId !== trimmedId) {
          setItems(prevItems => prevItems.map(it => it.useLine === oldId ? { ...it, useLine: trimmedId } : it));
        }
        setLineSuccessMsg(`✅ บันทึกการแก้ไขไลน์ผลิต [${trimmedId}] เรียบร้อยแล้ว!`);
      }
      setEditingLineId(null);
      setEditLineForm(null);

      setTimeout(() => {
        setLineSuccessMsg(null);
      }, 4000);
    }
  };

  const handleDeleteLine = (id: string) => {
    const allocatedCount = items.filter(it => it.useLine === id).length;
    const warningExtra = allocatedCount > 0 ? ` (คำเตือน: มีสินค้า/พาเลทในระบบ ${allocatedCount} รายการที่กำลังอ้างอิงไลน์นี้)` : '';
    if (confirm(`คุณต้องการลบไลน์ ${id} ใช่หรือไม่?${warningExtra}`)) {
      setUseLines(useLines.filter(l => l.id !== id));
      setLineSuccessMsg(`🗑️ ลบไลน์ผลิต [${id}] สำเร็จ`);
      setTimeout(() => setLineSuccessMsg(null), 3000);
    }
  };

  const handleAddNewLine = () => {
    if (editingLineId === 'new') {
      setEditingLineId(null);
      setEditLineForm(null);
    } else {
      setEditingLineId('new');
      setEditLineForm({ id: '', name: '', description: '' });
    }
  };

  // Zone Capacity Handlers
  const handleEditZone = (zc: ZoneCapacityMaster) => {
    setEditingZone(zc.zone);
    setEditZoneForm({ ...zc });
  };

  const handleSaveZone = () => {
    if (editZoneForm && editingZone) {
      setZoneCapacities(zoneCapacities.map(z => z.zone === editingZone ? editZoneForm : z));
      setEditingZone(null);
      setEditZoneForm(null);
    }
  };

  // Create New Rack / Location Handler
  const handleCreateRackSlot = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanZone = newSlotForm.zone.trim().toUpperCase();
    if (!cleanZone) {
      alert('กรุณากรอกรหัสโซน / ชื่อ Rack');
      return;
    }

    const newSlot: CustomRackSlot = {
      id: `${newSlotForm.storageType}-${cleanZone}`,
      stationId: newSlotForm.stationId,
      zone: cleanZone,
      bayNumber: Number(newSlotForm.baysCount),
      maxLevels: Number(newSlotForm.maxLevels),
      storageType: newSlotForm.storageType,
      capacityPerLevel: Number(newSlotForm.capacityPerLevel),
      description: newSlotForm.description || `โซนจัดเก็บ ${cleanZone} (${newSlotForm.storageType})`,
      status: 'ACTIVE'
    };

    setCustomSlots([...customSlots, newSlot]);

    // Also add to zoneCapacities if not present
    if (!zoneCapacities.some(z => z.zone === cleanZone)) {
      setZoneCapacities([
        ...zoneCapacities,
        {
          zone: cleanZone as StorageZone,
          standardPalletsPerBay: newSlotForm.maxLevels * newSlotForm.capacityPerLevel,
          defaultStdQtyPerPallet: 80,
          description: `Zone ${cleanZone} (${newSlotForm.storageType})`
        }
      ]);
    }

    setIsAddingSlot(false);
    setNewSlotForm({
      zone: '',
      stationId: 'STATION_1',
      baysCount: 10,
      maxLevels: 4,
      storageType: 'RACK',
      capacityPerLevel: 2,
      description: ''
    });
    alert(`สร้างช่องจัดเก็บ Zone ${cleanZone} สำเร็จเรียบร้อย!`);
  };

  // Relocate Stock Item Handler
  const handleExecuteRelocate = () => {
    if (!selectedItemToMove) return;

    const oldLoc = selectedItemToMove.locatorCode;
    const newLocatorCode = `DA4D-1.05-${targetZone}${targetBay}-L${targetLevel}`;

    const updatedItem: InventoryItem = {
      ...selectedItemToMove,
      zone: targetZone as StorageZone,
      bayNumber: targetBay,
      level: targetLevel as any,
      storageType: targetStorageType,
      locatorCode: newLocatorCode,
      remark: `ย้ายจาก ${oldLoc} มา ${newLocatorCode} เมื่อ ${new Date().toLocaleTimeString('th-TH')}`
    };

    if (onRelocateItem) {
      onRelocateItem(selectedItemToMove.id, targetZone, targetBay, targetLevel, targetStorageType);
    } else {
      setItems(items.map(it => it.id === selectedItemToMove.id ? updatedItem : it));
    }

    setRelocateSuccessMsg(`✅ ย้ายสินค้า ${selectedItemToMove.modelHE} จาก [${oldLoc}] ไปยัง [${newLocatorCode}] สำเร็จ!`);
    setSelectedItemToMove(null);

    setTimeout(() => {
      setRelocateSuccessMsg(null);
    }, 4000);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full w-full min-w-0 max-w-full animate-fadeIn">
      {/* Header & Main Mode Tabs */}
      <div className="bg-slate-50 px-3.5 sm:px-6 py-3 sm:py-4 border-b border-slate-200 space-y-3 sm:space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center space-x-2">
                <span>ตั้งค่าข้อมูลหลัก & เครื่องมือจัดการคลัง (Master & Tools)</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-mono text-[10px] font-black border border-blue-200">
                  WMS HUB
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                จัดการรหัสวัตถุดิบ (Model HE), เพิ่ม/แก้ไขไลน์ผลิต (Production Lines), สร้างช่อง Rack และเครื่องมือย้ายตำแหน่งสินค้า (Relocation)
              </p>
            </div>
          </div>

          {/* Sub Tab Buttons */}
          <div className="flex overflow-x-auto sm:flex-wrap bg-slate-200/90 p-1.5 rounded-xl border border-slate-300 gap-1.5 scrollbar-thin shadow-inner">
            <button
              id="tab-btn-facilities"
              onClick={() => setActiveTab('FACILITIES')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                activeTab === 'FACILITIES'
                  ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-500 font-black'
                  : 'bg-white/80 hover:bg-white text-slate-700 hover:text-slate-950 border border-slate-300 shadow-2xs'
              }`}
            >
              <Building2 className={`w-3.5 h-3.5 ${activeTab === 'FACILITIES' ? 'text-white' : 'text-blue-600'}`} />
              <span>🏢 จัดการคลัง & อาคาร</span>
              {activeTab === 'FACILITIES' && <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse ml-0.5" />}
            </button>

            <button
              id="tab-btn-lines"
              onClick={() => setActiveTab('LINES')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                activeTab === 'LINES'
                  ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-500 font-black'
                  : 'bg-white/80 hover:bg-white text-slate-700 hover:text-slate-950 border border-slate-300 shadow-2xs'
              }`}
            >
              <Factory className={`w-3.5 h-3.5 ${activeTab === 'LINES' ? 'text-white' : 'text-emerald-600'}`} />
              <span>🏭 ไลน์ผลิต ({useLines.length})</span>
              {activeTab === 'LINES' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-200 animate-pulse ml-0.5" />}
            </button>

            <button
              id="tab-btn-items"
              onClick={() => setActiveTab('ITEMS')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                activeTab === 'ITEMS'
                  ? 'bg-cyan-700 text-white shadow-md ring-2 ring-cyan-500 font-black'
                  : 'bg-white/80 hover:bg-white text-slate-700 hover:text-slate-950 border border-slate-300 shadow-2xs'
              }`}
            >
              <Database className={`w-3.5 h-3.5 ${activeTab === 'ITEMS' ? 'text-white' : 'text-cyan-700'}`} />
              <span>📦 Master Items ({masterData.length})</span>
              {activeTab === 'ITEMS' && <span className="w-1.5 h-1.5 rounded-full bg-cyan-200 animate-pulse ml-0.5" />}
            </button>

            <button
              id="tab-btn-relocate-tools"
              onClick={() => setActiveTab('RELOCATE')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                activeTab === 'RELOCATE'
                  ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400 font-black'
                  : 'bg-white/80 hover:bg-white text-slate-800 hover:text-slate-950 border border-slate-300 shadow-2xs'
              }`}
              title="แท็บเครื่องมือย้ายตำแหน่งสินค้า (Relocation Tool)"
            >
              <Wrench className={`w-3.5 h-3.5 ${activeTab === 'RELOCATE' ? 'text-slate-950' : 'text-amber-600'}`} />
              <span>🛠️ เครื่องมือย้ายตำแหน่ง</span>
              {activeTab === 'RELOCATE' && <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-pulse ml-0.5" />}
            </button>

            <button
              id="tab-btn-rack-locations"
              onClick={() => setActiveTab('RACK_LOCATIONS')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                activeTab === 'RACK_LOCATIONS'
                  ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-500 font-black'
                  : 'bg-white/80 hover:bg-white text-slate-700 hover:text-slate-950 border border-slate-300 shadow-2xs'
              }`}
            >
              <FolderPlus className={`w-3.5 h-3.5 ${activeTab === 'RACK_LOCATIONS' ? 'text-white' : 'text-indigo-600'}`} />
              <span>🏗️ สร้างช่อง Rack ({customSlots.length})</span>
              {activeTab === 'RACK_LOCATIONS' && <span className="w-1.5 h-1.5 rounded-full bg-indigo-200 animate-pulse ml-0.5" />}
            </button>

            <button
              id="tab-btn-zone-capacity"
              onClick={() => setActiveTab('ZONE_CAPACITY')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                activeTab === 'ZONE_CAPACITY'
                  ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-500 font-black'
                  : 'bg-white/80 hover:bg-white text-slate-700 hover:text-slate-950 border border-slate-300 shadow-2xs'
              }`}
            >
              <Layers className={`w-3.5 h-3.5 ${activeTab === 'ZONE_CAPACITY' ? 'text-white' : 'text-purple-600'}`} />
              <span>ความจุ Rack ({zoneCapacities.length})</span>
              {activeTab === 'ZONE_CAPACITY' && <span className="w-1.5 h-1.5 rounded-full bg-purple-200 animate-pulse ml-0.5" />}
            </button>

            <button
              id="tab-btn-aging-config"
              onClick={() => setActiveTab('AGING_CONFIG')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                activeTab === 'AGING_CONFIG'
                  ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-500 font-black'
                  : 'bg-white/80 hover:bg-white text-slate-700 hover:text-slate-950 border border-slate-300 shadow-2xs'
              }`}
            >
              <Flame className={`w-3.5 h-3.5 ${activeTab === 'AGING_CONFIG' ? 'text-white' : 'text-rose-600'}`} />
              <span>⏱️ เกณฑ์ Aging FIFO</span>
              {activeTab === 'AGING_CONFIG' && <span className="w-1.5 h-1.5 rounded-full bg-rose-200 animate-pulse ml-0.5" />}
            </button>

            <button
              id="tab-btn-guide-legend"
              onClick={() => setActiveTab('GUIDE_LEGEND')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                activeTab === 'GUIDE_LEGEND'
                  ? 'bg-slate-800 text-white shadow-md ring-2 ring-slate-600 font-black'
                  : 'bg-white/80 hover:bg-white text-slate-700 hover:text-slate-950 border border-slate-300 shadow-2xs'
              }`}
            >
              <BookOpen className={`w-3.5 h-3.5 ${activeTab === 'GUIDE_LEGEND' ? 'text-white' : 'text-indigo-600'}`} />
              <span>📘 คู่มือโค้ดสี & รหัสพิกัด</span>
              {activeTab === 'GUIDE_LEGEND' && <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-pulse ml-0.5" />}
            </button>
          </div>
        </div>

        {/* Toolbar per tab */}
        {activeTab === 'FACILITIES' && (
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="text-xs text-slate-600 font-medium flex items-center space-x-2">
              <span className="font-bold text-slate-800">ศูนย์ควบคุมสถานที่จัดเก็บ (Warehouse Facility Hub):</span>
              <span>เพิ่ม/แก้ไข อาคารคลังสินค้าและรูปแบบการจัดเก็บ (Rack, Flow Rail, Floor Staging)</span>
            </div>
          </div>
        )}
        {activeTab === 'GUIDE_LEGEND' && (
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="text-xs text-slate-600 font-medium flex items-center space-x-2">
              <span className="font-bold text-slate-800">📘 คู่มือโค้ดสี &amp; โครงสร้างรหัสตำแหน่ง (Dynamic Legend &amp; Naming Convention):</span>
              <span>มาตรฐานรหัสพิกัดทั้ง 3 โซน (A4 แร็ค/พื้น, A2 รางเลื่อน FIFO, A5 ลานกองเต็นท์) และโค้ดสีแสดงความหนาแน่น</span>
            </div>
          </div>
        )}
        {activeTab === 'ITEMS' && (
          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="ค้นหา Model HE, Tool Name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              onClick={handleAddNew}
              className="flex items-center justify-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shrink-0 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่ม Model HE ใหม่</span>
            </button>
          </div>
        )}

        {activeTab === 'LINES' && (
          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="ค้นหาไลน์ผลิต (e.g. HE1, Line HE2)..."
                value={lineSearch}
                onChange={(e) => setLineSearch(e.target.value)}
              />
            </div>
            <button
              onClick={handleAddNewLine}
              className="flex items-center justify-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shrink-0 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มไลน์ผลิตใหม่</span>
            </button>
          </div>
        )}

        {activeTab === 'RACK_LOCATIONS' && (
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="text-xs text-slate-600 font-medium">
              💡 สามารถเพิ่ม Rack ใหม่, รางเลื่อน Flow Rail หรือพื้นที่วางบนพื้น Floor Staging พร้อมระบุความจุและจำนวน Bay
            </div>
            <button
              onClick={() => setIsAddingSlot(!isAddingSlot)}
              className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{isAddingSlot ? 'ปิดแบบฟอร์ม' : 'สร้างช่องจัดเก็บ / Rack ใหม่'}</span>
            </button>
          </div>
        )}

        {activeTab === 'RELOCATE' && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ArrowLeftRight className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>ระบบย้ายตำแหน่งสินค้า (Stock Relocation & Slot Re-assignment):</strong> เลือกพาเลทสินค้าจากช่องต้นทาง แล้วย้ายไปยัง Rack, รางเลื่อน หรือลานกองพื้นปลายทาง
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Main Tab Content */}
      <div className="overflow-x-auto flex-1 p-4">
        {/* TAB 0: FACILITY MANAGER */}
        {activeTab === 'FACILITIES' && (
          <FacilityManager 
            facilities={facilities}
            setFacilities={setFacilities}
            activeFacilityId={activeFacilityId}
            setActiveFacilityId={setActiveFacilityId}
            items={items}
            onNavigateToLayout={onNavigateToLayout}
          />
        )}

        {/* TAB 0.1: DYNAMIC AGING THRESHOLD CONFIGURATION */}
        {activeTab === 'AGING_CONFIG' && (
          <AgingFifoPanel
            agingConfig={agingConfig}
            setAgingConfig={setAgingConfig}
            items={items}
          />
        )}

        {/* TAB 0.5: DYNAMIC LEGEND & NAMING CONVENTION GUIDE */}
        {activeTab === 'GUIDE_LEGEND' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-600 text-white rounded-lg shadow-xs">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-blue-950">
                    📘 ศูนย์รวมคู่มือโค้ดสี & มาตรฐานรหัสตำแหน่งคลัง (Dynamic Legend & Naming Guide)
                  </h3>
                  <p className="text-xs text-blue-800/80 mt-0.5">
                    คู่มือนี้ถูกย้ายมารวมไว้ที่หน้าตั้งค่า (Settings) เพื่อความสะอาดและไม่เกะกะสายตาในหน้าผังแผนที่หลัก
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-mono bg-white px-2.5 py-1 rounded-md border border-blue-200 text-blue-900 font-bold">
                  3 อาคารหลัก: A4 (Selective Rack) • A2 (Flow Rail) • A5 (Tent Staging)
                </span>
              </div>
            </div>

            <DynamicLegendPanel />
          </div>
        )}

        {/* TAB 1: MASTER ITEMS */}
        {activeTab === 'ITEMS' && (
          <div className="space-y-4">
            {editingId === 'new' && (
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200 space-y-3">
                <h3 className="text-xs font-bold text-blue-900">เพิ่มรายการ Model HE ใหม่</h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Model HE Code:</label>
                    <input
                      type="text"
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-mono font-bold uppercase"
                      placeholder="e.g. ADL99999999"
                      value={editForm?.modelHE || ''}
                      onChange={e => setEditForm(prev => prev ? { ...prev, modelHE: e.target.value } : null)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Tool / Part Name:</label>
                    <input
                      type="text"
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs"
                      placeholder="e.g. Plate Cover"
                      value={editForm?.partName || ''}
                      onChange={e => setEditForm(prev => prev ? { ...prev, partName: e.target.value } : null)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Safety Stock (Min):</label>
                    <input
                      type="number"
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold"
                      value={editForm?.safetyStock || 0}
                      onChange={e => setEditForm(prev => prev ? { ...prev, safetyStock: Number(e.target.value) } : null)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Std Qty Per Pallet:</label>
                    <input
                      type="number"
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold"
                      value={editForm?.stdQtyPerPallet || 80}
                      onChange={e => setEditForm(prev => prev ? { ...prev, stdQtyPerPallet: Number(e.target.value) } : null)}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                  <button onClick={() => setEditingId(null)} className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded">
                    ยกเลิก
                  </button>
                  <button onClick={handleSave} className="px-4 py-1.5 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 shadow-xs">
                    บันทึก Model HE
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="px-3.5 py-3">#</th>
                    <th className="px-3.5 py-3">Model HE</th>
                    <th className="px-3.5 py-3">Tool Name</th>
                    <th className="px-3.5 py-3 text-center">Safety Stock (Min)</th>
                    <th className="px-3.5 py-3 text-center">Std Qty / Pallet</th>
                    <th className="px-3.5 py-3 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredData.map((item, idx) => (
                    <tr key={item.modelHE} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3.5 py-2.5 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="px-3.5 py-2.5 font-mono font-bold text-slate-900">{item.modelHE}</td>
                      <td className="px-3.5 py-2.5 font-medium text-slate-800">{item.partName}</td>
                      <td className="px-3.5 py-2.5 text-center font-mono font-bold text-amber-700">{item.safetyStock.toLocaleString()} U</td>
                      <td className="px-3.5 py-2.5 text-center font-mono font-bold text-slate-700">{item.stdQtyPerPallet || 80} U</td>
                      <td className="px-3.5 py-2.5 text-right">
                        <div className="inline-flex items-center space-x-1">
                          <button 
                            onClick={() => {
                              setEditingId(item.modelHE);
                              setEditForm({ ...item });
                            }} 
                            className="px-2 py-1 rounded-md text-blue-700 hover:text-white bg-blue-50 hover:bg-blue-600 border border-blue-200 transition-all font-bold text-[10.5px] flex items-center space-x-1" 
                            title="แก้ไขข้อมูล Item"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>แก้ไข</span>
                          </button>
                          <button onClick={() => handleDelete(item.modelHE)} className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all" title="ลบรายการ">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: USE LINES (ไลน์ผลิต) */}
        {activeTab === 'LINES' && (
          <div className="space-y-4 animate-fadeIn">
            {lineSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold animate-fadeIn flex items-center justify-between shadow-xs">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{lineSuccessMsg}</span>
                </div>
                <button 
                  onClick={() => setLineSuccessMsg(null)} 
                  className="text-emerald-700 hover:text-emerald-950 font-bold text-xs p-1"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Add / Edit Line Form Card */}
            {editingLineId !== null && editLineForm && (
              <form onSubmit={handleSaveLine} className="p-4 bg-gradient-to-br from-emerald-50/90 to-teal-50/70 border-2 border-emerald-400 rounded-2xl shadow-md space-y-3.5 animate-scaleUp">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
                      {editingLineId === 'new' ? <Plus className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-emerald-950 flex items-center space-x-2">
                        <span>{editingLineId === 'new' ? '➕ เพิ่มไลน์ผลิตใหม่ (Add New Line)' : `✏️ แก้ไขข้อมูลไลน์ผลิต [${editingLineId}]`}</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-200/80 text-emerald-900 font-mono text-[10px] font-bold">
                          {editingLineId === 'new' ? 'NEW RECORD' : 'EDIT MODE'}
                        </span>
                      </h3>
                      <p className="text-[11px] text-emerald-800/80">
                        {editingLineId === 'new' 
                          ? 'ระบุรหัสไลน์ ชื่อเรียกสายการผลิต และรายละเอียดเพื่อใช้ในการเบิก-จ่ายและพิมพ์ฉลาก QR' 
                          : 'สามารถแก้ไขรหัสไลน์ ชื่อเรียก และคำอธิบายสายการผลิต (ระบบจะอัปเดตข้อมูลพาเลทที่เกี่ยวข้องอัตโนมัติ)'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelLine}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 transition-colors"
                    title="ยกเลิก"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      รหัสไลน์ผลิต (Line ID) <span className="text-rose-600">*</span>:
                    </label>
                    <input
                      type="text"
                      className="w-full bg-white border border-emerald-300 rounded-lg px-3 py-2 text-xs font-mono font-black uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                      placeholder="e.g. HE1, HE6, REPAIR"
                      value={editLineForm.id}
                      onChange={e => setEditLineForm({ ...editLineForm, id: e.target.value.toUpperCase() })}
                      required
                    />
                    <p className="text-[10px] text-slate-500 mt-1 font-mono">ตัวพิมพ์ใหญ่ เช่น HE1, HE2, HE6</p>
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      ชื่อไลน์ผลิต (Line Name) <span className="text-rose-600">*</span>:
                    </label>
                    <input
                      type="text"
                      className="w-full bg-white border border-emerald-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                      placeholder="e.g. Line HE6 (Export Zone)"
                      value={editLineForm.name}
                      onChange={e => setEditLineForm({ ...editLineForm, name: e.target.value })}
                      required
                    />
                    <p className="text-[10px] text-slate-500 mt-1">ชื่อเรียกทางการของสายการผลิต</p>
                  </div>

                  <div className="sm:col-span-5">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      คำอธิบาย / สายงาน (Description):
                    </label>
                    <input
                      type="text"
                      className="w-full bg-white border border-emerald-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                      placeholder="e.g. สายการผลิตเครื่องทำความร้อน HE6 (โรง A2/A4)"
                      value={editLineForm.description || ''}
                      onChange={e => setEditLineForm({ ...editLineForm, description: e.target.value })}
                    />
                    <p className="text-[10px] text-slate-500 mt-1">อาคารโรงงานหรือวัตถุประสงค์การใช้งาน</p>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-emerald-200/80">
                  <button
                    type="button"
                    onClick={handleCancelLine}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    ยกเลิก (Cancel)
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md flex items-center space-x-1.5 transition-all active:scale-95"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{editingLineId === 'new' ? 'บันทึกและเพิ่มไลน์ใหม่' : 'บันทึกการแก้ไขไลน์'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="px-3.5 py-3">#</th>
                    <th className="px-3.5 py-3">รหัสไลน์ (Line ID)</th>
                    <th className="px-3.5 py-3">ชื่อไลน์ผลิต (Line Name)</th>
                    <th className="px-3.5 py-3">คำอธิบาย / รายละเอียด</th>
                    <th className="px-3.5 py-3 text-center">พาเลทที่ใช้งานในคลัง</th>
                    <th className="px-3.5 py-3 text-right">จัดการรายการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLines.map((line, idx) => {
                    const allocatedItemsCount = items.filter(it => it.useLine === line.id).length;
                    const isEditingThis = editingLineId === line.id;
                    return (
                      <tr 
                        key={line.id} 
                        className={`transition-colors ${
                          isEditingThis ? 'bg-emerald-50/80 ring-1 ring-emerald-300' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="px-3.5 py-2.5 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="px-3.5 py-2.5">
                          <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 font-mono font-black text-xs border border-emerald-200 inline-flex items-center space-x-1 shadow-2xs">
                            <Factory className="w-3 h-3 text-emerald-600" />
                            <span>{line.id}</span>
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 font-bold text-slate-900">{line.name}</td>
                        <td className="px-3.5 py-2.5 text-slate-600">{line.description || '-'}</td>
                        <td className="px-3.5 py-2.5 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-mono font-bold ${
                            allocatedItemsCount > 0 
                              ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            {allocatedItemsCount} พาเลท
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-right">
                          <div className="inline-flex items-center space-x-1.5">
                            <button
                              onClick={() => handleEditLine(line)}
                              className="px-2.5 py-1.5 rounded-lg text-emerald-700 hover:text-white bg-emerald-50 hover:bg-emerald-600 border border-emerald-300 transition-all font-bold text-[11px] flex items-center space-x-1 shadow-2xs"
                              title="แก้ไขข้อมูลไลน์ผลิตนี้"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>แก้ไข</span>
                            </button>
                            <button 
                              onClick={() => handleDeleteLine(line.id)} 
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all" 
                              title="ลบไลน์นี้"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredLines.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400">
                        ไม่พบข้อมูลไลน์ผลิตที่ตรงกับการค้นหา
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: ZONE CAPACITIES */}
        {activeTab === 'ZONE_CAPACITY' && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="px-3.5 py-3">Rack Zone</th>
                    <th className="px-3.5 py-3 text-center">ความจุมาตรฐาน (Pallets/Bay)</th>
                    <th className="px-3.5 py-3 text-center">มาตรฐานชิ้นต่อพาเลท</th>
                    <th className="px-3.5 py-3">รายละเอียด</th>
                    <th className="px-3.5 py-3 text-right">แก้ไข</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {zoneCapacities.map((zc) => (
                    <tr key={zc.zone} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3.5 py-2.5">
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-extrabold text-[10px] border border-blue-200">
                          Zone {zc.zone}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-center font-mono font-bold text-slate-800">{zc.standardPalletsPerBay} พาเลท</td>
                      <td className="px-3.5 py-2.5 text-center font-mono font-bold text-slate-700">{zc.defaultStdQtyPerPallet} ตัว</td>
                      <td className="px-3.5 py-2.5 text-slate-500">{zc.description || '-'}</td>
                      <td className="px-3.5 py-2.5 text-right">
                        <button onClick={() => handleEditZone(zc)} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-all" title="แก้ไข">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: CREATE RACK & LOCATION MANAGER */}
        {activeTab === 'RACK_LOCATIONS' && (
          <div className="space-y-6">
            {/* Create Rack Form */}
            {isAddingSlot && (
              <form onSubmit={handleCreateRackSlot} className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-4 animate-scaleUp">
                <h3 className="text-sm font-black text-indigo-950 flex items-center space-x-2">
                  <FolderPlus className="w-4 h-4 text-indigo-600" />
                  <span>สร้างช่องจัดเก็บ / Rack / รางเลื่อน / ลานกองพื้นใหม่</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">สถานที่ / สถานี (Station):</label>
                    <select
                      value={newSlotForm.stationId}
                      onChange={e => setNewSlotForm({ ...newSlotForm, stationId: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                    >
                      <option value="STATION_1">🏢 อาคารหลัก: Rack Zone B-K</option>
                      <option value="STATION_2">🛤️ สถานี 2: รางเลื่อน Flow Rail & ลานกองพื้น</option>
                      <option value="STATION_3">🏗️ สถานี 3: ลานรับสินค้า & Buffer Staging</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">ประเภทพื้นที่จัดเก็บ (Storage Type):</label>
                    <select
                      value={newSlotForm.storageType}
                      onChange={e => setNewSlotForm({ ...newSlotForm, storageType: e.target.value as StorageLocationType })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                    >
                      <option value="RACK">📦 Selective Rack (ชั้นวาง 4 ชั้น)</option>
                      <option value="FLOW_RAIL">🛤️ Flow Rail (รางเลื่อนลูกกลิ้ง FIFO)</option>
                      <option value="FLOOR_STAGING">🏗️ Floor Staging (ลานวางกองบนพื้น)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">รหัส Zone / ชื่อช่อง:</label>
                    <input
                      type="text"
                      placeholder="เช่น L, M, RAIL-09, FL-E"
                      value={newSlotForm.zone}
                      onChange={e => setNewSlotForm({ ...newSlotForm, zone: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold uppercase"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">จำนวน Bay / Lanes / Blocks:</label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={newSlotForm.baysCount}
                      onChange={e => setNewSlotForm({ ...newSlotForm, baysCount: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">จำนวนชั้น (Max Levels):</label>
                    <select
                      value={newSlotForm.maxLevels}
                      onChange={e => setNewSlotForm({ ...newSlotForm, maxLevels: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                    >
                      <option value={1}>1 ชั้น (Ground / Floor / Flow Rail)</option>
                      <option value={2}>2 ชั้น (Heavy 2-Tier)</option>
                      <option value={3}>3 ชั้น (3-Tier Rack)</option>
                      <option value={4}>4 ชั้น (Standard Selective Rack)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">ความจุต่อชั้น (Pallets / Level):</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={newSlotForm.capacityPerLevel}
                      onChange={e => setNewSlotForm({ ...newSlotForm, capacityPerLevel: Number(e.target.value) })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">คำอธิบายเพิ่มเติม:</label>
                    <input
                      type="text"
                      placeholder="เช่น ช่องจัดเก็บส่วนต่อขยาย สำหรับชิ้นส่วนพิเศษ"
                      value={newSlotForm.description}
                      onChange={e => setNewSlotForm({ ...newSlotForm, description: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t border-indigo-200/80">
                  <button
                    type="button"
                    onClick={() => setIsAddingSlot(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs"
                  >
                    บันทึกสร้างช่องใหม่
                  </button>
                </div>
              </form>
            )}

            {/* Existing Custom Slots Table */}
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="px-3.5 py-3">รหัสช่อง / Zone</th>
                    <th className="px-3.5 py-3">ประเภทพื้นที่</th>
                    <th className="px-3.5 py-3">สถานีจัดเก็บ</th>
                    <th className="px-3.5 py-3 text-center">จำนวน Bay</th>
                    <th className="px-3.5 py-3 text-center">ชั้น (Levels)</th>
                    <th className="px-3.5 py-3 text-center">ความจุรวม (Pallets)</th>
                    <th className="px-3.5 py-3">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customSlots.map((slot) => (
                    <tr key={slot.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3.5 py-2.5 font-mono font-bold text-slate-900">
                        {slot.zone} <span className="text-slate-400 font-normal text-[10px]">({slot.id})</span>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          slot.storageType === 'RACK' 
                            ? 'bg-blue-50 text-blue-800 border-blue-200' 
                            : slot.storageType === 'FLOW_RAIL'
                            ? 'bg-amber-50 text-amber-900 border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}>
                          {slot.storageType === 'RACK' ? '📦 Selective Rack' : slot.storageType === 'FLOW_RAIL' ? '🛤️ Flow Rail' : '🏗️ Floor Staging'}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-700 font-medium">
                        {slot.stationId === 'STATION_1' ? '🏢 อาคารหลัก' : '🛤️ สถานี 2'}
                      </td>
                      <td className="px-3.5 py-2.5 text-center font-mono font-bold text-slate-800">{slot.bayNumber}</td>
                      <td className="px-3.5 py-2.5 text-center font-mono font-bold text-slate-800">{slot.maxLevels}</td>
                      <td className="px-3.5 py-2.5 text-center font-mono font-bold text-blue-700">
                        {slot.bayNumber * slot.maxLevels * slot.capacityPerLevel} P
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-extrabold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>พร้อมใช้งาน</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: RELOCATE STOCK (ย้ายตำแหน่งสินค้า) */}
        {activeTab === 'RELOCATE' && (
          <div className="space-y-6">
            {relocateSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold animate-fadeIn flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{relocateSuccessMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Select Item to move */}
              <div className="lg:col-span-6 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <Box className="w-4 h-4 text-blue-600" />
                    <span>1. เลือกสินค้าที่ต้องการย้าย:</span>
                  </h3>
                  <div className="relative w-48">
                    <input
                      type="text"
                      placeholder="ค้นหารหัสสินค้า..."
                      value={relocateSearch}
                      onChange={e => setRelocateSearch(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                    />
                  </div>
                </div>

                <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
                  {items
                    .filter(i => 
                      !relocateSearch ||
                      i.modelHE.toLowerCase().includes(relocateSearch.toLowerCase()) ||
                      i.locatorCode.toLowerCase().includes(relocateSearch.toLowerCase())
                    )
                    .map(item => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItemToMove(item)}
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                          selectedItemToMove?.id === item.id
                            ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-blue-400'
                        }`}
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-black">{item.modelHE}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              selectedItemToMove?.id === item.id ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {item.useLine}
                            </span>
                          </div>
                          <p className={`text-[11px] truncate ${selectedItemToMove?.id === item.id ? 'text-blue-100' : 'text-slate-500'}`}>
                            {item.partName}
                          </p>
                          <p className={`text-[10px] font-mono mt-0.5 ${selectedItemToMove?.id === item.id ? 'text-amber-200' : 'text-amber-700'}`}>
                            📍 ตำแหน่งปัจจุบัน: {item.locatorCode} (Zone {item.zone} Bay {item.bayNumber} L{item.level})
                          </p>
                        </div>
                        <div className="text-right font-bold text-sm">
                          {item.quantity.toLocaleString()} U
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Right Column: Select Destination */}
              <div className="lg:col-span-6 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <h3 className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                  <MapPin className="w-4 h-4 text-amber-600" />
                  <span>2. เลือกพิกัดปลายทางที่ต้องการย้ายไป:</span>
                </h3>

                {selectedItemToMove ? (
                  <div className="space-y-4">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs space-y-1">
                      <div className="font-bold text-blue-900">สินค้าที่กำลังจะย้าย:</div>
                      <div className="font-mono font-black text-slate-900">{selectedItemToMove.modelHE} - {selectedItemToMove.partName}</div>
                      <div className="text-slate-600">จำนวน: <strong>{selectedItemToMove.quantity}</strong> ชิ้น | ตำแหน่งเดิม: <strong>{selectedItemToMove.locatorCode}</strong></div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">ประเภทพื้นที่ปลายทาง:</label>
                        <select
                          value={targetStorageType}
                          onChange={e => setTargetStorageType(e.target.value as StorageLocationType)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                        >
                          <option value="RACK">📦 Selective Rack (Zone B - K)</option>
                          <option value="FLOW_RAIL">🛤️ Flow Rail (รางเลื่อนลูกกลิ้ง)</option>
                          <option value="FLOOR_STAGING">🏗️ Floor Staging (ลานกองบนพื้น)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">โซนปลายทาง (Target Zone):</label>
                        <select
                          value={targetZone}
                          onChange={e => setTargetZone(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                        >
                          {targetStorageType === 'RACK' ? (
                            (['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'] as StorageZone[]).map(z => (
                              <option key={z} value={z}>Zone {z}</option>
                            ))
                          ) : targetStorageType === 'FLOW_RAIL' ? (
                            Array.from({ length: 8 }, (_, i) => `FR${i + 1}`).map(fr => (
                              <option key={fr} value={fr}>ราง Lane {fr}</option>
                            ))
                          ) : (
                            ['FL-A', 'FL-B', 'FL-C', 'FL-D'].map(fl => (
                              <option key={fl} value={fl}>ลาน {fl}</option>
                            ))
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Rack / Bay / Block:</label>
                        <select
                          value={targetBay}
                          onChange={e => setTargetBay(Number(e.target.value))}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                        >
                          {Array.from({ length: ['G','H','I','J','K'].includes(targetZone) ? 5 : 12 }, (_, i) => i + 1).map(b => (
                            <option key={b} value={b}>Bay {b}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">ชั้น (Shelf Level 1-4):</label>
                        <select
                          value={targetLevel}
                          onChange={e => setTargetLevel(Number(e.target.value))}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                        >
                          <option value={1}>ชั้น 1 (L1 Ground)</option>
                          <option value={2}>ชั้น 2 (L2 Heavy)</option>
                          <option value={3}>ชั้น 3 (L3 Standard)</option>
                          <option value={4}>ชั้น 4 (L4 Top)</option>
                        </select>
                      </div>
                    </div>

                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 text-xs flex items-center justify-between">
                      <div>
                        <span className="text-slate-600">รหัสพิกัดใหม่ที่จะได้รับ:</span>
                        <p className="font-mono font-black text-amber-950 text-sm">
                          DA4D-1.05-{targetZone}{targetBay}-L{targetLevel}
                        </p>
                      </div>
                      <button
                        onClick={handleExecuteRelocate}
                        className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-black text-xs flex items-center space-x-1.5 shadow-sm transition-transform active:scale-95"
                      >
                        <ArrowLeftRight className="w-4 h-4" />
                        <span>ยืนยันย้ายตำแหน่งทันที</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                    กรุณาคลิกเลือกสินค้าจากรายการทางด้านซ้ายมือก่อน
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
