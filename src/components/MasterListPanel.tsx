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
  ShieldAlert
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
  onClearAllData?: () => void;
  onLoadSampleData?: () => void;
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
  facilities = [],
  setFacilities,
  activeFacilityId = 'ALL',
  setActiveFacilityId = () => {},
  onNavigateToLayout,
  agingConfig = { safeDaysMax: 14, warningDaysMax: 30, criticalDays: 30, autoAlertEnabled: true, notifyOnFifoViolation: true, customRuleName: 'มาตรฐาน LGE (14/30 วัน)' },
  setAgingConfig,
  customSlots: propCustomSlots,
  setCustomSlots: propSetCustomSlots,
  onClearAllData,
  onLoadSampleData
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'FACILITIES' | 'AGING_CONFIG' | 'GUIDE_LEGEND' | 'ITEMS' | 'LINES' | 'ZONE_CAPACITY' | 'RACK_LOCATIONS' | 'DATA_CLEANUP'>('AGING_CONFIG');

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



  return (
    <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-800 overflow-hidden flex flex-col h-full w-full min-w-0 max-w-full animate-fadeIn text-slate-100">
      {/* Header & Main Mode Tabs */}
      <div className="bg-slate-900/95 px-3.5 sm:px-6 py-3 sm:py-4 border-b border-slate-800 space-y-3 sm:space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30 shadow-inner">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight flex items-center space-x-2">
                <span>ตั้งค่าข้อมูลหลัก &amp; เครื่องมือจัดการคลัง (Master &amp; Tools)</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono text-[10px] font-black border border-blue-500/30">
                  WMS HUB
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                จัดการรหัสวัตถุดิบ (Model HE), เพิ่ม/แก้ไขไลน์ผลิต (Production Lines), สร้างช่อง Rack และการจัดการระบบคลังสินค้า
              </p>
            </div>
          </div>

          {/* Sub Tab Buttons - Dark Theme & High Contrast */}
          <div className="flex overflow-x-auto sm:flex-wrap bg-slate-950 p-1.5 rounded-xl border border-slate-800 gap-1.5 scrollbar-thin shadow-inner">
            <button
              id="tab-btn-facilities"
              onClick={() => setActiveTab('FACILITIES')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                activeTab === 'FACILITIES'
                  ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400 font-black shadow-blue-900/50'
                  : 'bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 shadow-2xs'
              }`}
            >
              <Building2 className={`w-3.5 h-3.5 ${activeTab === 'FACILITIES' ? 'text-white' : 'text-blue-400'}`} />
              <span>🏢 จัดการคลัง &amp; อาคาร</span>
              {activeTab === 'FACILITIES' && <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse ml-0.5" />}
            </button>

            <button
              id="tab-btn-lines"
              onClick={() => setActiveTab('LINES')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                activeTab === 'LINES'
                  ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400 font-black shadow-emerald-900/50'
                  : 'bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 shadow-2xs'
              }`}
            >
              <Factory className={`w-3.5 h-3.5 ${activeTab === 'LINES' ? 'text-white' : 'text-emerald-400'}`} />
              <span>🏭 ไลน์ผลิต ({useLines.length})</span>
              {activeTab === 'LINES' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-200 animate-pulse ml-0.5" />}
            </button>

            <button
              id="tab-btn-items"
              onClick={() => setActiveTab('ITEMS')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                activeTab === 'ITEMS'
                  ? 'bg-cyan-600 text-white shadow-md ring-2 ring-cyan-400 font-black shadow-cyan-900/50'
                  : 'bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 shadow-2xs'
              }`}
            >
              <Database className={`w-3.5 h-3.5 ${activeTab === 'ITEMS' ? 'text-white' : 'text-cyan-400'}`} />
              <span>📦 Master Items ({masterData.length})</span>
              {activeTab === 'ITEMS' && <span className="w-1.5 h-1.5 rounded-full bg-cyan-200 animate-pulse ml-0.5" />}
            </button>



            <button
              id="tab-btn-rack-locations"
              onClick={() => setActiveTab('RACK_LOCATIONS')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                activeTab === 'RACK_LOCATIONS'
                  ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400 font-black shadow-indigo-900/50'
                  : 'bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 shadow-2xs'
              }`}
            >
              <FolderPlus className={`w-3.5 h-3.5 ${activeTab === 'RACK_LOCATIONS' ? 'text-white' : 'text-indigo-400'}`} />
              <span>🏗️ สร้างช่อง Rack ({customSlots.length})</span>
              {activeTab === 'RACK_LOCATIONS' && <span className="w-1.5 h-1.5 rounded-full bg-indigo-200 animate-pulse ml-0.5" />}
            </button>

            <button
              id="tab-btn-zone-capacity"
              onClick={() => setActiveTab('ZONE_CAPACITY')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                activeTab === 'ZONE_CAPACITY'
                  ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-400 font-black shadow-purple-900/50'
                  : 'bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 shadow-2xs'
              }`}
            >
              <Layers className={`w-3.5 h-3.5 ${activeTab === 'ZONE_CAPACITY' ? 'text-white' : 'text-purple-400'}`} />
              <span>ความจุ Rack ({zoneCapacities.length})</span>
              {activeTab === 'ZONE_CAPACITY' && <span className="w-1.5 h-1.5 rounded-full bg-purple-200 animate-pulse ml-0.5" />}
            </button>

            <button
              id="tab-btn-aging-config"
              onClick={() => setActiveTab('AGING_CONFIG')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                activeTab === 'AGING_CONFIG'
                  ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-400 font-black shadow-rose-900/50'
                  : 'bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 shadow-2xs'
              }`}
            >
              <Flame className={`w-3.5 h-3.5 ${activeTab === 'AGING_CONFIG' ? 'text-white' : 'text-rose-400'}`} />
              <span>⏱️ เกณฑ์ Aging FIFO</span>
              {activeTab === 'AGING_CONFIG' && <span className="w-1.5 h-1.5 rounded-full bg-rose-200 animate-pulse ml-0.5" />}
            </button>

            <button
              id="tab-btn-guide-legend"
              onClick={() => setActiveTab('GUIDE_LEGEND')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                activeTab === 'GUIDE_LEGEND'
                  ? 'bg-slate-700 text-white shadow-md ring-2 ring-slate-500 font-black shadow-slate-900/50'
                  : 'bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 shadow-2xs'
              }`}
            >
              <BookOpen className={`w-3.5 h-3.5 ${activeTab === 'GUIDE_LEGEND' ? 'text-white' : 'text-indigo-400'}`} />
              <span>📘 คู่มือโค้ดสี &amp; รหัสพิกัด</span>
              {activeTab === 'GUIDE_LEGEND' && <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-pulse ml-0.5" />}
            </button>

            <button
              id="tab-btn-data-cleanup"
              onClick={() => setActiveTab('DATA_CLEANUP')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                activeTab === 'DATA_CLEANUP'
                  ? 'bg-red-600 text-white shadow-md ring-2 ring-red-400 font-black shadow-red-900/50'
                  : 'bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 shadow-2xs'
              }`}
              title="ล้างข้อมูลสต็อกและประวัติการเคลื่อนย้ายทั้งหมด เพื่อเตรียมพร้อมกรอกข้อมูลจริง"
            >
              <Trash2 className={`w-3.5 h-3.5 ${activeTab === 'DATA_CLEANUP' ? 'text-white' : 'text-red-400'}`} />
              <span>🧹 ล้างข้อมูลจริง / Load Sim</span>
              {activeTab === 'DATA_CLEANUP' && <span className="w-1.5 h-1.5 rounded-full bg-red-200 animate-pulse ml-0.5" />}
            </button>
          </div>
        </div>

        {/* Toolbar per tab */}
        {activeTab === 'FACILITIES' && (
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="text-xs text-slate-400 font-medium flex items-center space-x-2">
              <span className="font-bold text-slate-200">ศูนย์ควบคุมสถานที่จัดเก็บ (Warehouse Facility Hub):</span>
              <span>เพิ่ม/แก้ไข อาคารคลังสินค้าและรูปแบบการจัดเก็บ (Rack, Flow Rail, Floor Staging)</span>
            </div>
          </div>
        )}
        {activeTab === 'GUIDE_LEGEND' && (
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="text-xs text-slate-400 font-medium flex items-center space-x-2">
              <span className="font-bold text-slate-200">📘 คู่มือโค้ดสี &amp; โครงสร้างรหัสตำแหน่ง (Dynamic Legend &amp; Naming Convention):</span>
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
                className="block w-full pl-9 pr-3 py-2 border border-slate-700 rounded-xl text-xs bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="ค้นหา Model HE, Tool Name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              onClick={handleAddNew}
              className="flex items-center justify-center space-x-1.5 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 shadow-md active:scale-95"
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
                className="block w-full pl-9 pr-3 py-2 border border-slate-700 rounded-xl text-xs bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="ค้นหาไลน์ผลิต (e.g. HE1, Line HE2)..."
                value={lineSearch}
                onChange={(e) => setLineSearch(e.target.value)}
              />
            </div>
            <button
              onClick={handleAddNewLine}
              className="flex items-center justify-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 shadow-md active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มไลน์ผลิตใหม่</span>
            </button>
          </div>
        )}

        {activeTab === 'RACK_LOCATIONS' && (
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="text-xs text-slate-400 font-medium">
              💡 สามารถเพิ่ม Rack ใหม่, รางเลื่อน Flow Rail หรือพื้นที่วางบนพื้น Floor Staging พร้อมระบุความจุและจำนวน Bay
            </div>
            <button
              onClick={() => setIsAddingSlot(!isAddingSlot)}
              className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>{isAddingSlot ? 'ปิดแบบฟอร์ม' : 'สร้างช่องจัดเก็บ / Rack ใหม่'}</span>
            </button>
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
              <div className="bg-slate-950 p-4 rounded-xl border border-cyan-500/30 space-y-3 shadow-md">
                <h3 className="text-xs font-bold text-cyan-300">เพิ่มรายการ Model HE ใหม่</h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Model HE Code:</label>
                    <input
                      type="text"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold uppercase text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                      placeholder="e.g. ADL99999999"
                      value={editForm?.modelHE || ''}
                      onChange={e => setEditForm(prev => prev ? { ...prev, modelHE: e.target.value } : null)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Tool / Part Name:</label>
                    <input
                      type="text"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                      placeholder="e.g. Plate Cover"
                      value={editForm?.partName || ''}
                      onChange={e => setEditForm(prev => prev ? { ...prev, partName: e.target.value } : null)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Safety Stock (Min):</label>
                    <input
                      type="number"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                      value={editForm?.safetyStock || 0}
                      onChange={e => setEditForm(prev => prev ? { ...prev, safetyStock: Number(e.target.value) } : null)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Std Qty Per Pallet:</label>
                    <input
                      type="number"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                      value={editForm?.stdQtyPerPallet || 80}
                      onChange={e => setEditForm(prev => prev ? { ...prev, stdQtyPerPallet: Number(e.target.value) } : null)}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2 pt-2">
                  <button onClick={() => setEditingId(null)} className="px-3 py-1 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg">
                    ยกเลิก
                  </button>
                  <button onClick={handleSave} className="px-4 py-1.5 bg-cyan-600 text-white rounded-lg text-xs font-bold hover:bg-cyan-500 shadow-md transition-all active:scale-95">
                    บันทึก Model HE
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 shadow-md">
              <table className="w-full text-left text-xs text-slate-200">
                <thead className="bg-slate-900/90 text-slate-300 font-bold uppercase text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="px-3.5 py-3">#</th>
                    <th className="px-3.5 py-3">Model HE</th>
                    <th className="px-3.5 py-3">Tool Name</th>
                    <th className="px-3.5 py-3 text-center">Safety Stock (Min)</th>
                    <th className="px-3.5 py-3 text-center">Std Qty / Pallet</th>
                    <th className="px-3.5 py-3 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredData.map((item, idx) => (
                    <tr key={item.modelHE} className="hover:bg-slate-900/60 transition-colors">
                      <td className="px-3.5 py-2.5 text-slate-500 font-mono">{idx + 1}</td>
                      <td className="px-3.5 py-2.5 font-mono font-black text-white">{item.modelHE}</td>
                      <td className="px-3.5 py-2.5 font-medium text-slate-200">{item.partName}</td>
                      <td className="px-3.5 py-2.5 text-center font-mono font-bold text-amber-400">{item.safetyStock.toLocaleString()} U</td>
                      <td className="px-3.5 py-2.5 text-center font-mono font-bold text-emerald-400">{item.stdQtyPerPallet || 80} U</td>
                      <td className="px-3.5 py-2.5 text-right">
                        <div className="inline-flex items-center space-x-1">
                          <button 
                            onClick={() => {
                              setEditingId(item.modelHE);
                              setEditForm({ ...item });
                            }} 
                            className="px-2.5 py-1 rounded-lg text-cyan-300 hover:text-white bg-cyan-950/60 hover:bg-cyan-600 border border-cyan-800/60 transition-all font-bold text-[10.5px] flex items-center space-x-1" 
                            title="แก้ไขข้อมูล Item"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>แก้ไข</span>
                          </button>
                          <button onClick={() => handleDelete(item.modelHE)} className="p-1.5 rounded-lg text-rose-400 hover:text-rose-200 hover:bg-rose-950/60 border border-transparent hover:border-rose-800/50 transition-all" title="ลบรายการ">
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
              <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold animate-fadeIn flex items-center justify-between shadow-xs">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{lineSuccessMsg}</span>
                </div>
                <button 
                  onClick={() => setLineSuccessMsg(null)} 
                  className="text-emerald-400 hover:text-white font-bold text-xs p-1"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Add / Edit Line Form Card */}
            {editingLineId !== null && editLineForm && (
              <form onSubmit={handleSaveLine} className="p-4 bg-slate-950 border-2 border-emerald-500/50 rounded-2xl shadow-xl space-y-3.5 animate-scaleUp">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
                      {editingLineId === 'new' ? <Plus className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white flex items-center space-x-2">
                        <span>{editingLineId === 'new' ? '➕ เพิ่มไลน์ผลิตใหม่ (Add New Line)' : `✏️ แก้ไขข้อมูลไลน์ผลิต [${editingLineId}]`}</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/40">
                          {editingLineId === 'new' ? 'NEW RECORD' : 'EDIT MODE'}
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {editingLineId === 'new' 
                          ? 'ระบุรหัสไลน์ ชื่อเรียกสายการผลิต และรายละเอียดเพื่อใช้ในการเบิก-จ่ายและพิมพ์ฉลาก QR' 
                          : 'สามารถแก้ไขรหัสไลน์ ชื่อเรียก และคำอธิบายสายการผลิต (ระบบจะอัปเดตข้อมูลพาเลทที่เกี่ยวข้องอัตโนมัติ)'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelLine}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="ยกเลิก"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      รหัสไลน์ผลิต (Line ID) <span className="text-rose-400">*</span>:
                    </label>
                    <input
                      type="text"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono font-black uppercase text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                      placeholder="e.g. HE1, HE6, REPAIR"
                      value={editLineForm.id}
                      onChange={e => setEditLineForm({ ...editLineForm, id: e.target.value.toUpperCase() })}
                      required
                    />
                    <p className="text-[10px] text-slate-500 mt-1 font-mono">ตัวพิมพ์ใหญ่ เช่น HE1, HE2, HE6</p>
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      ชื่อไลน์ผลิต (Line Name) <span className="text-rose-400">*</span>:
                    </label>
                    <input
                      type="text"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                      placeholder="e.g. Line HE6 (Export Zone)"
                      value={editLineForm.name}
                      onChange={e => setEditLineForm({ ...editLineForm, name: e.target.value })}
                      required
                    />
                    <p className="text-[10px] text-slate-500 mt-1">ชื่อเรียกทางการของสายการผลิต</p>
                  </div>

                  <div className="sm:col-span-5">
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      คำอธิบาย / สายงาน (Description):
                    </label>
                    <input
                      type="text"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                      placeholder="e.g. สายการผลิตเครื่องทำความร้อน HE6 (โรง A2/A4)"
                      value={editLineForm.description || ''}
                      onChange={e => setEditLineForm({ ...editLineForm, description: e.target.value })}
                    />
                    <p className="text-[10px] text-slate-500 mt-1">อาคารโรงงานหรือวัตถุประสงค์การใช้งาน</p>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={handleCancelLine}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-850 transition-colors"
                  >
                    ยกเลิก (Cancel)
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md flex items-center space-x-1.5 transition-all active:scale-95"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{editingLineId === 'new' ? 'บันทึกและเพิ่มไลน์ใหม่' : 'บันทึกการแก้ไขไลน์'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 shadow-md">
              <table className="w-full text-left text-xs text-slate-200">
                <thead className="bg-slate-900/90 text-slate-300 font-bold uppercase text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="px-3.5 py-3">#</th>
                    <th className="px-3.5 py-3">รหัสไลน์ (Line ID)</th>
                    <th className="px-3.5 py-3">ชื่อไลน์ผลิต (Line Name)</th>
                    <th className="px-3.5 py-3">คำอธิบาย / รายละเอียด</th>
                    <th className="px-3.5 py-3 text-center">พาเลทที่ใช้งานในคลัง</th>
                    <th className="px-3.5 py-3 text-right">จัดการรายการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredLines.map((line, idx) => {
                    const allocatedItemsCount = items.filter(it => it.useLine === line.id).length;
                    const isEditingThis = editingLineId === line.id;
                    return (
                      <tr 
                        key={line.id} 
                        className={`transition-colors ${
                          isEditingThis ? 'bg-emerald-950/40 ring-1 ring-emerald-500/40' : 'hover:bg-slate-900/60'
                        }`}
                      >
                        <td className="px-3.5 py-2.5 text-slate-500 font-mono">{idx + 1}</td>
                        <td className="px-3.5 py-2.5">
                          <span className="px-2.5 py-1 rounded-md bg-emerald-950/60 text-emerald-300 font-mono font-black text-xs border border-emerald-500/30 inline-flex items-center space-x-1 shadow-2xs">
                            <Factory className="w-3 h-3 text-emerald-400" />
                            <span>{line.id}</span>
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 font-bold text-white">{line.name}</td>
                        <td className="px-3.5 py-2.5 text-slate-400">{line.description || '-'}</td>
                        <td className="px-3.5 py-2.5 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-mono font-bold ${
                            allocatedItemsCount > 0 
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {allocatedItemsCount} พาเลท
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-right">
                          <div className="inline-flex items-center space-x-1.5">
                            <button
                              onClick={() => handleEditLine(line)}
                              className="px-2.5 py-1.5 rounded-lg text-emerald-300 hover:text-white bg-emerald-950/60 hover:bg-emerald-600 border border-emerald-500/30 transition-all font-bold text-[11px] flex items-center space-x-1 shadow-2xs"
                              title="แก้ไขข้อมูลไลน์ผลิตนี้"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>แก้ไข</span>
                            </button>
                            <button 
                              onClick={() => handleDeleteLine(line.id)} 
                              className="p-1.5 rounded-lg text-rose-400 hover:text-rose-200 hover:bg-rose-950/60 border border-transparent hover:border-rose-800/50 transition-all" 
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
                      <td colSpan={6} className="text-center py-8 text-slate-500">
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
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 shadow-md">
              <table className="w-full text-left text-xs text-slate-200">
                <thead className="bg-slate-900/90 text-slate-300 font-bold uppercase text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="px-3.5 py-3">Rack Zone</th>
                    <th className="px-3.5 py-3 text-center">ความจุมาตรฐาน (Pallets/Bay)</th>
                    <th className="px-3.5 py-3 text-center">มาตรฐานชิ้นต่อพาเลท</th>
                    <th className="px-3.5 py-3">รายละเอียด</th>
                    <th className="px-3.5 py-3 text-right">แก้ไข</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {zoneCapacities.map((zc) => (
                    <tr key={zc.zone} className="hover:bg-slate-900/60 transition-colors">
                      <td className="px-3.5 py-2.5">
                        <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-extrabold text-[10px] border border-blue-500/30">
                          Zone {zc.zone}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-center font-mono font-bold text-emerald-400">{zc.standardPalletsPerBay} พาเลท</td>
                      <td className="px-3.5 py-2.5 text-center font-mono font-bold text-cyan-400">{zc.defaultStdQtyPerPallet} ตัว</td>
                      <td className="px-3.5 py-2.5 text-slate-400">{zc.description || '-'}</td>
                      <td className="px-3.5 py-2.5 text-right">
                        <button onClick={() => handleEditZone(zc)} className="p-1.5 rounded-lg text-blue-400 hover:text-white hover:bg-blue-600/30 border border-transparent hover:border-blue-500/30 transition-all" title="แก้ไข">
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
              <form onSubmit={handleCreateRackSlot} className="p-4 bg-slate-950 border border-indigo-500/30 rounded-2xl space-y-4 animate-scaleUp shadow-xl">
                <h3 className="text-sm font-black text-white flex items-center space-x-2">
                  <FolderPlus className="w-4 h-4 text-indigo-400" />
                  <span>สร้างช่องจัดเก็บ / Rack / รางเลื่อน / ลานกองพื้นใหม่</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">สถานที่ / สถานี (Station):</label>
                    <select
                      value={newSlotForm.stationId}
                      onChange={e => setNewSlotForm({ ...newSlotForm, stationId: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="STATION_1">🏢 อาคารหลัก: Rack Zone B-K</option>
                      <option value="STATION_2">🛤️ สถานี 2: รางเลื่อน Flow Rail &amp; ลานกองพื้น</option>
                      <option value="STATION_3">🏗️ สถานี 3: ลานรับสินค้า &amp; Buffer Staging</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">ประเภทพื้นที่จัดเก็บ (Storage Type):</label>
                    <select
                      value={newSlotForm.storageType}
                      onChange={e => setNewSlotForm({ ...newSlotForm, storageType: e.target.value as StorageLocationType })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="RACK">📦 Selective Rack (ชั้นวาง 4 ชั้น)</option>
                      <option value="FLOW_RAIL">🛤️ Flow Rail (รางเลื่อนลูกกลิ้ง FIFO)</option>
                      <option value="FLOOR_STAGING">🏗️ Floor Staging (ลานวางกองบนพื้น)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">รหัส Zone / ชื่อช่อง:</label>
                    <input
                      type="text"
                      placeholder="เช่น L, M, RAIL-09, FL-E"
                      value={newSlotForm.zone}
                      onChange={e => setNewSlotForm({ ...newSlotForm, zone: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold uppercase text-white focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">จำนวน Bay / Lanes / Blocks:</label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={newSlotForm.baysCount}
                      onChange={e => setNewSlotForm({ ...newSlotForm, baysCount: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">จำนวนชั้น (Max Levels):</label>
                    <select
                      value={newSlotForm.maxLevels}
                      onChange={e => setNewSlotForm({ ...newSlotForm, maxLevels: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value={1}>1 ชั้น (Ground / Floor / Flow Rail)</option>
                      <option value={2}>2 ชั้น (Heavy 2-Tier)</option>
                      <option value={3}>3 ชั้น (3-Tier Rack)</option>
                      <option value={4}>4 ชั้น (Standard Selective Rack)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">ความจุต่อชั้น (Pallets / Level):</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={newSlotForm.capacityPerLevel}
                      onChange={e => setNewSlotForm({ ...newSlotForm, capacityPerLevel: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">คำอธิบายเพิ่มเติม:</label>
                    <input
                      type="text"
                      placeholder="เช่น ช่องจัดเก็บส่วนต่อขยาย สำหรับชิ้นส่วนพิเศษ"
                      value={newSlotForm.description}
                      onChange={e => setNewSlotForm({ ...newSlotForm, description: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAddingSlot(false)}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-md transition-all active:scale-95"
                  >
                    บันทึกสร้างช่องใหม่
                  </button>
                </div>
              </form>
            )}

            {/* Existing Custom Slots Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 shadow-md">
              <table className="w-full text-left text-xs text-slate-200">
                <thead className="bg-slate-900/90 text-slate-300 font-bold uppercase text-[11px] border-b border-slate-800">
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
                <tbody className="divide-y divide-slate-800/80">
                  {customSlots.map((slot) => (
                    <tr key={slot.id} className="hover:bg-slate-900/60 transition-colors">
                      <td className="px-3.5 py-2.5 font-mono font-bold text-white">
                        {slot.zone} <span className="text-slate-500 font-normal text-[10px]">({slot.id})</span>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          slot.storageType === 'RACK' 
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' 
                            : slot.storageType === 'FLOW_RAIL'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        }`}>
                          {slot.storageType === 'RACK' ? '📦 Selective Rack' : slot.storageType === 'FLOW_RAIL' ? '🛤️ Flow Rail' : '🏗️ Floor Staging'}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-300 font-medium">
                        {slot.stationId === 'STATION_1' ? '🏢 อาคารหลัก' : '🛤️ สถานี 2'}
                      </td>
                      <td className="px-3.5 py-2.5 text-center font-mono font-bold text-white">{slot.bayNumber}</td>
                      <td className="px-3.5 py-2.5 text-center font-mono font-bold text-white">{slot.maxLevels}</td>
                      <td className="px-3.5 py-2.5 text-center font-mono font-bold text-blue-400">
                        {slot.bayNumber * slot.maxLevels * slot.capacityPerLevel} P
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-extrabold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
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


        {activeTab === 'DATA_CLEANUP' && (
          <div className="p-4 sm:p-6 space-y-6 animate-fadeIn">
            <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 p-5 sm:p-6 space-y-5 shadow-xl">
              <div className="flex items-center space-x-3 text-red-400">
                <div className="p-3 bg-red-500/20 rounded-xl border border-red-500/30">
                  <Trash2 className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white tracking-tight">ล้างข้อมูลสต็อกสินค้า &amp; ประวัติทั้งหมด (System Reset State)</h3>
                  <p className="text-xs text-slate-400 mt-0.5">เตรียมความพร้อมสำหรับเริ่มคีย์ลงข้อมูลสินค้าจริงของโรงงาน HE Smart WMS</p>
                </div>
              </div>

              <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800 text-xs text-slate-300 space-y-2.5">
                <p className="font-bold text-amber-300 flex items-center space-x-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span>คำชี้แจงการปรับสภาวะข้อมูลเตรียมลงข้อมูลจริง:</span>
                </p>
                <ul className="list-disc list-inside space-y-1.5 text-slate-300 pl-1 leading-relaxed">
                  <li>การล้างข้อมูลจะทำการลบ **รายการสินค้าสต็อกปัจจุบัน ({items.length} รายการ)** ออกทั้งหมด</li>
                  <li>การล้างข้อมูลจะทำการลบ **ประวัติการบันทึกสแกนเข้า-ออก (Movement History Logs)** ออกทั้งหมด</li>
                  <li>**Master Data สำคัญยังอยู่ครบ 100%**: โครงสร้างอาคาร A2 / A4 / A5 / CY3, รหัส Model HE, รายชื่อไลน์ผลิต (Line HE1-HE5, Repair) และเกณฑ์ FIFO Aging จะยังคงอยู่ครบถ้วนพร้อมกรอกข้อมูลทันที</li>
                </ul>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={onClearAllData}
                  className="px-5 py-3 bg-red-600 hover:bg-red-500 text-white font-black text-xs rounded-xl shadow-lg flex items-center space-x-2 transition-all active:scale-95 border border-red-400/30"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>🧹 ล้างข้อมูลสต็อกและประวัติทั้งหมด (ปรับเป็น 0 รายการ)</span>
                </button>

                <button
                  onClick={onLoadSampleData}
                  className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs rounded-xl shadow-md flex items-center space-x-2 transition-all active:scale-95 border border-slate-700"
                >
                  <RefreshCw className="w-4 h-4 text-blue-400" />
                  <span>🔄 โหลดข้อมูลจำลองตัวอย่าง (Load Sample Simulation Data)</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
