import React, { useState, useMemo, useEffect } from 'react';
import { MasterDataItem, UseLineMaster, TargetUseLineMaster, ZoneCapacityMaster, StorageZone, InventoryItem, CustomRackSlot, StorageLocationType, WarehouseFacility, AgingThresholdConfig } from '../types';
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
  ShieldAlert,
  Target
} from 'lucide-react';

interface MasterListPanelProps {
  masterData: MasterDataItem[];
  setMasterData: React.Dispatch<React.SetStateAction<MasterDataItem[]>>;
  useLines: UseLineMaster[];
  setUseLines: React.Dispatch<React.SetStateAction<UseLineMaster[]>>;
  targetUseLines?: TargetUseLineMaster[];
  setTargetUseLines?: React.Dispatch<React.SetStateAction<TargetUseLineMaster[]>>;
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
  targetUseLines: propTargetUseLines,
  setTargetUseLines: propSetTargetUseLines,
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
  const [activeTab, setActiveTab] = useState<'LINES' | 'TARGET_LINES' | 'MASTER_PARTS' | 'AGING_CONFIG' | 'GUIDE_LEGEND'>('MASTER_PARTS');

  // Local fallback for targetUseLines if not provided
  const [localTargetUseLines, setLocalTargetUseLines] = useState<TargetUseLineMaster[]>([
    { id: 'A2', name: 'Line A2', description: 'สายการประกอบหลัก A2 (Main Assembly Plant A2)' },
    { id: 'A4', name: 'Line A4', description: 'สายการประกอบหลัก A4 (Main Assembly Plant A4)' },
    { id: 'A6', name: 'Line A6', description: 'สายการประกอบ A6 (Assembly Line A6)' },
    { id: 'A7', name: 'Line A7', description: 'สายการประกอบ A7 (Assembly Line A7)' },
    { id: 'A8', name: 'Line A8', description: 'สายการประกอบ A8 (Assembly Line A8)' },
    { id: 'A9', name: 'Line A9', description: 'สายการประกอบ A9 (Assembly Line A9)' },
    { id: 'SUB_LINE', name: 'Sub Line', description: 'สายงานย่อยเตรียมชิ้นส่วน (Sub-Assembly Staging Line)' }
  ]);

  const activeTargetUseLines = propTargetUseLines || localTargetUseLines;
  const setActiveTargetUseLines = propSetTargetUseLines || setLocalTargetUseLines;

  // States for Master Item list
  const [search, setSearch] = useState('');
  const [lineFilter, setLineFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [toolFilter, setToolFilter] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<MasterDataItem | null>(null);

  // Helper to extract all assigned production lines for a item
  const getItemLines = (item: MasterDataItem): string[] => {
    if (item.useLines && item.useLines.length > 0) {
      return item.useLines;
    }
    if (item.useLine) {
      return item.useLine.split(/,\s*/).map(s => s.trim()).filter(Boolean);
    }
    return ['HE1'];
  };

  // Real-time duplicate check when adding or editing a Part No
  const cleanEditingModel = editForm?.modelHE?.trim().toUpperCase() || '';
  const isDuplicatePartNo = Boolean(
    cleanEditingModel &&
    masterData.some(d => 
      (editingId === 'new' || d.modelHE.toUpperCase() !== editingId?.toUpperCase()) && 
      d.modelHE.trim().toUpperCase() === cleanEditingModel
    )
  );

  // States for Use Lines list
  const [lineSearch, setLineSearch] = useState('');
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editLineForm, setEditLineForm] = useState<UseLineMaster | null>(null);
  const [lineSuccessMsg, setLineSuccessMsg] = useState<string | null>(null);
  const [lastDeletedLine, setLastDeletedLine] = useState<UseLineMaster | null>(null);

  // States for Target Use Lines list (Red-Orange theme)
  const [targetLineSearch, setTargetLineSearch] = useState('');
  const [editingTargetLineId, setEditingTargetLineId] = useState<string | null>(null);
  const [editTargetLineForm, setEditTargetLineForm] = useState<TargetUseLineMaster | null>(null);
  const [targetLineSuccessMsg, setTargetLineSuccessMsg] = useState<string | null>(null);
  const [lastDeletedTargetLine, setLastDeletedTargetLine] = useState<TargetUseLineMaster | null>(null);

  // In-app Delete Confirmation Modal State (replaces blocked native window.confirm)
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    isOpen: boolean;
    title: string;
    itemName: string;
    warningText?: string;
    onConfirm: () => void;
  } | null>(null);

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
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [editSlotForm, setEditSlotForm] = useState<CustomRackSlot | null>(null);

  // Auto-sanitize masterData to guarantee no duplicate modelHE exists
  useEffect(() => {
    const seen = new Set<string>();
    let hasDup = false;
    const clean: MasterDataItem[] = [];
    for (const d of masterData) {
      if (!d || !d.modelHE) continue;
      const key = d.modelHE.trim().toUpperCase();
      if (seen.has(key)) {
        hasDup = true;
      } else {
        seen.add(key);
        clean.push(d);
      }
    }
    if (hasDup) {
      setMasterData(clean);
      try {
        localStorage.setItem('lge_wms_master_data', JSON.stringify(clean));
      } catch (e) {}
    }
  }, [masterData, setMasterData]);

  // Multi-criteria Filter for Master Items (Search text + Line + Type + Tool) with uniqueness guarantee
  const filteredData = useMemo(() => {
    const seen = new Set<string>();
    return masterData.filter(d => {
      if (!d || !d.modelHE) return false;
      const key = d.modelHE.trim().toUpperCase();
      if (seen.has(key)) return false;
      seen.add(key);

      const matchesSearch = 
        !search ||
        d.modelHE.toLowerCase().includes(search.toLowerCase()) || 
        d.partName.toLowerCase().includes(search.toLowerCase());

      const lines = getItemLines(d);
      const matchesLine = lineFilter === 'ALL' || lines.includes(lineFilter) || d.useLine === lineFilter;
      const matchesType = typeFilter === 'ALL' || (d.productType || 'Evaporator') === typeFilter;
      const matchesTool = !toolFilter || d.partName.toLowerCase().includes(toolFilter.toLowerCase());

      return matchesSearch && matchesLine && matchesType && matchesTool;
    });
  }, [masterData, search, lineFilter, typeFilter, toolFilter]);

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
      const cleanModel = editForm.modelHE.trim().toUpperCase();
      if (!cleanModel) {
        alert('กรุณากรอกรหัส Model HE (Parts No)');
        return;
      }
      const isDup = masterData.some(d => 
        (editingId === 'new' || d.modelHE.toUpperCase() !== editingId?.toUpperCase()) && 
        d.modelHE.trim().toUpperCase() === cleanModel
      );
      if (isDup) {
        alert(`⚠️ แจ้งเตือน: รหัส Master Parts No "${cleanModel}" มีอยู่ในระบบแล้ว กรุณาตรวจสอบและใช้รหัสที่ไม่ซ้ำกัน`);
        return;
      }

      let updated: MasterDataItem[];
      const finalLines = editForm.useLines && editForm.useLines.length > 0 ? editForm.useLines : [editForm.useLine || 'HE1'];
      if (editingId === 'new') {
        const newItem: MasterDataItem = {
          ...editForm,
          modelHE: cleanModel,
          useLines: finalLines,
          useLine: finalLines[0] || 'HE1',
          productType: editForm.productType || (typeFilter !== 'ALL' ? (typeFilter as any) : 'Evaporator'),
          safetyStock: editForm.safetyStock || 300,
          stdQtyPerPallet: editForm.stdQtyPerPallet || (cleanModel === 'ACG74184707' ? 88 : cleanModel === 'ADL73081111' ? 150 : cleanModel === '5006' ? 50 : 80)
        };
        updated = [newItem, ...masterData];
      } else {
        updated = masterData.map(d => d.modelHE === editingId ? { 
          ...editForm, 
          modelHE: cleanModel,
          useLines: finalLines,
          useLine: finalLines[0] || 'HE1'
        } : d);
      }
      setMasterData(updated);
      try {
        localStorage.setItem('lge_wms_master_data', JSON.stringify(updated));
      } catch (e) {
        // ignore
      }
      setEditingId(null);
      setEditForm(null);
    }
  };

  const handleDelete = (modelHE: string) => {
    const updated = masterData.filter(d => d.modelHE !== modelHE);
    setMasterData(updated);
    try {
      localStorage.setItem('lge_wms_master_data', JSON.stringify(updated));
    } catch (e) {
      // ignore
    }
  };

  const handleAddNew = () => {
    setEditingId('new');
    setEditForm({
      modelHE: '',
      partName: '',
      safetyStock: 300,
      stdQtyPerPallet: 80,
      useLine: lineFilter !== 'ALL' ? lineFilter : (useLines[0]?.id || 'HE1'),
      productType: typeFilter !== 'ALL' ? (typeFilter as any) : 'Evaporator'
    });
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

  const executeDeleteLine = (id: string, targetLine: UseLineMaster) => {
    const updated = useLines.filter(l => l.id !== id);
    setUseLines(updated);
    try {
      localStorage.setItem('lge_wms_use_lines', JSON.stringify(updated));
    } catch (e) {
      // ignore
    }
    setLastDeletedLine(targetLine);
    setLineSuccessMsg(`🗑️ ลบไลน์ผลิต [${id} - ${targetLine.name}] ออกจากระบบเรียบร้อยแล้ว`);
    setTimeout(() => setLineSuccessMsg(null), 5000);
  };

  const handleDeleteLine = (id: string) => {
    const targetLine = useLines.find(l => l.id === id);
    if (!targetLine) return;

    const allocatedCount = items.filter(it => it.useLine === id).length;
    if (allocatedCount > 0) {
      // Show in-app custom modal if items are currently stored under this line
      setConfirmDeleteModal({
        isOpen: true,
        title: 'ยืนยันการลบไลน์ผลิต',
        itemName: `${id} - ${targetLine.name}`,
        warningText: `คำเตือน: มีสินค้า/พาเลทในระบบ ${allocatedCount} รายการที่กำลังระบุไลน์นี้ (พาเลทจะยังคงอยู่ในคลัง)`,
        onConfirm: () => {
          executeDeleteLine(id, targetLine);
          setConfirmDeleteModal(null);
        }
      });
    } else {
      // Direct delete without blocking iframe
      executeDeleteLine(id, targetLine);
    }
  };

  const handleUndoDeleteLine = () => {
    if (lastDeletedLine) {
      const restored = [...useLines, lastDeletedLine];
      setUseLines(restored);
      try {
        localStorage.setItem('lge_wms_use_lines', JSON.stringify(restored));
      } catch (e) {
        // ignore
      }
      setLastDeletedLine(null);
      setLineSuccessMsg(`✅ กู้คืนไลน์ผลิต [${lastDeletedLine.id} - ${lastDeletedLine.name}] เรียบร้อยแล้ว`);
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

  // Filter Target Lines
  const filteredTargetLines = activeTargetUseLines.filter(l =>
    l.id.toLowerCase().includes(targetLineSearch.toLowerCase()) ||
    l.name.toLowerCase().includes(targetLineSearch.toLowerCase()) ||
    (l.description && l.description.toLowerCase().includes(targetLineSearch.toLowerCase()))
  );

  // Target Use Line Handlers (Red-Orange Theme)
  const handleEditTargetLine = (line: TargetUseLineMaster) => {
    setEditingTargetLineId(line.id);
    setEditTargetLineForm({ ...line });
  };

  const handleCancelTargetLine = () => {
    setEditingTargetLineId(null);
    setEditTargetLineForm(null);
  };

  const handleSaveTargetLine = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (editTargetLineForm) {
      const trimmedId = editTargetLineForm.id.trim().toUpperCase();
      const trimmedName = editTargetLineForm.name.trim();
      if (!trimmedId) {
        alert('กรุณากรอกรหัสไลน์ที่นำไปใช้ (Line ID เช่น A2, A4, A6, A8, SUB_LINE)');
        return;
      }
      if (!trimmedName) {
        alert('กรุณากรอกชื่อไลน์ที่นำไปใช้ (Line Name เช่น Line A2)');
        return;
      }
      if (editingTargetLineId === 'new') {
        if (activeTargetUseLines.some(l => l.id.toUpperCase() === trimmedId)) {
          alert(`รหัสไลน์ที่นำไปใช้ "${trimmedId}" นี้มีอยู่แล้วในระบบ กรุณาใช้รหัสอื่น`);
          return;
        }
        const newLine: TargetUseLineMaster = {
          id: trimmedId,
          name: trimmedName,
          description: editTargetLineForm.description?.trim() || ''
        };
        const updatedList = [...activeTargetUseLines, newLine];
        setActiveTargetUseLines(updatedList);
        try {
          localStorage.setItem('lge_wms_target_use_lines', JSON.stringify(updatedList));
        } catch (err) {}
        setTargetLineSuccessMsg(`✅ เพิ่มไลน์ที่นำไปใช้ใหม่ [${trimmedId} - ${trimmedName}] เรียบร้อยแล้ว!`);
      } else {
        const oldId = editingTargetLineId;
        const updatedLine: TargetUseLineMaster = {
          id: trimmedId,
          name: trimmedName,
          description: editTargetLineForm.description?.trim() || ''
        };
        const updatedList = activeTargetUseLines.map(l => l.id === oldId ? updatedLine : l);
        setActiveTargetUseLines(updatedList);
        try {
          localStorage.setItem('lge_wms_target_use_lines', JSON.stringify(updatedList));
        } catch (err) {}
        if (oldId && oldId !== trimmedId) {
          setItems(prevItems => prevItems.map(it => it.useLine === oldId ? { ...it, useLine: trimmedId } : it));
        }
        setTargetLineSuccessMsg(`✅ บันทึกการแก้ไขไลน์ที่นำไปใช้ [${trimmedId}] เรียบร้อยแล้ว!`);
      }
      setEditingTargetLineId(null);
      setEditTargetLineForm(null);

      setTimeout(() => setTargetLineSuccessMsg(null), 4000);
    }
  };

  const executeDeleteTargetLine = (id: string, targetLine: TargetUseLineMaster) => {
    const updated = activeTargetUseLines.filter(l => l.id !== id);
    setActiveTargetUseLines(updated);
    try {
      localStorage.setItem('lge_wms_target_use_lines', JSON.stringify(updated));
    } catch (e) {
      // ignore
    }
    setLastDeletedTargetLine(targetLine);
    setTargetLineSuccessMsg(`🗑️ ลบไลน์ที่นำไปใช้ [${id} - ${targetLine.name}] ออกจากระบบเรียบร้อยแล้ว`);
    setTimeout(() => setTargetLineSuccessMsg(null), 5000);
  };

  const handleDeleteTargetLine = (id: string) => {
    const targetLine = activeTargetUseLines.find(l => l.id === id);
    if (!targetLine) return;

    const allocatedCount = items.filter(it => it.useLine === id).length;
    if (allocatedCount > 0) {
      setConfirmDeleteModal({
        isOpen: true,
        title: 'ยืนยันการลบไลน์ที่นำไปใช้',
        itemName: `${id} - ${targetLine.name}`,
        warningText: `คำเตือน: มีสินค้า/พาเลทในระบบ ${allocatedCount} รายการที่กำลังระบุไลน์นี้`,
        onConfirm: () => {
          executeDeleteTargetLine(id, targetLine);
          setConfirmDeleteModal(null);
        }
      });
    } else {
      executeDeleteTargetLine(id, targetLine);
    }
  };

  const handleUndoDeleteTargetLine = () => {
    if (lastDeletedTargetLine) {
      const restored = [...activeTargetUseLines, lastDeletedTargetLine];
      setActiveTargetUseLines(restored);
      try {
        localStorage.setItem('lge_wms_target_use_lines', JSON.stringify(restored));
      } catch (e) {
        // ignore
      }
      setLastDeletedTargetLine(null);
      setTargetLineSuccessMsg(`✅ กู้คืนไลน์ที่นำไปใช้ [${lastDeletedTargetLine.id} - ${lastDeletedTargetLine.name}] เรียบร้อยแล้ว`);
      setTimeout(() => setTargetLineSuccessMsg(null), 3000);
    }
  };

  const handleAddNewTargetLine = () => {
    if (editingTargetLineId === 'new') {
      setEditingTargetLineId(null);
      setEditTargetLineForm(null);
    } else {
      setEditingTargetLineId('new');
      setEditTargetLineForm({ id: '', name: '', description: '' });
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

  const handleEditSlot = (slot: CustomRackSlot) => {
    setEditingSlotId(slot.id);
    setEditSlotForm({ ...slot });
  };

  const handleSaveSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSlotForm || !editingSlotId) return;

    setCustomSlots(customSlots.map(s => s.id === editingSlotId ? editSlotForm : s));
    setEditingSlotId(null);
    setEditSlotForm(null);
    alert('อัปเดตข้อมูลช่องจัดเก็บเรียบร้อยแล้ว');
  };

  const handleDeleteSlot = (id: string, _zone: string) => {
    const updated = customSlots.filter(s => s.id !== id);
    setCustomSlots(updated);
    try {
      localStorage.setItem('lge_wms_custom_slots', JSON.stringify(updated));
    } catch (e) {
      // ignore
    }
  };



  return (
    <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-800 overflow-hidden flex flex-col h-full w-full min-w-0 max-w-full animate-fadeIn text-slate-100 flex-1">
      {/* Header & Main Mode Tabs */}
      <div className="bg-slate-900/95 px-3.5 sm:px-6 py-3 sm:py-4 border-b border-slate-800 space-y-3 sm:space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
          </div>

          {/* Sub Tab Buttons - Dark Theme & High Contrast */}
          <div className="flex overflow-x-auto sm:flex-wrap bg-slate-950 p-1.5 rounded-xl border border-slate-800 gap-1.5 scrollbar-thin shadow-inner">
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
              id="tab-btn-target-lines"
              onClick={() => setActiveTab('TARGET_LINES')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                activeTab === 'TARGET_LINES'
                  ? 'bg-orange-600 text-white shadow-md ring-2 ring-orange-400 font-black shadow-orange-900/50'
                  : 'bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 shadow-2xs'
              }`}
            >
              <Target className={`w-3.5 h-3.5 ${activeTab === 'TARGET_LINES' ? 'text-white' : 'text-orange-400'}`} />
              <span>🎯 ไลน์ที่นำไปใช้ ({activeTargetUseLines.length})</span>
              {activeTab === 'TARGET_LINES' && <span className="w-1.5 h-1.5 rounded-full bg-orange-200 animate-pulse ml-0.5" />}
            </button>

            <button
              id="tab-btn-master-parts"
              onClick={() => setActiveTab('MASTER_PARTS')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                activeTab === 'MASTER_PARTS'
                  ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400 font-black shadow-blue-900/50'
                  : 'bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 shadow-2xs'
              }`}
            >
              <Box className={`w-3.5 h-3.5 ${activeTab === 'MASTER_PARTS' ? 'text-white' : 'text-blue-400'}`} />
              <span>📦 Master Parts Management ({masterData.length})</span>
              {activeTab === 'MASTER_PARTS' && <span className="w-1.5 h-1.5 rounded-full bg-blue-200 animate-pulse ml-0.5" />}
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
          </div>
        </div>

        {/* Toolbar per tab */}
        {activeTab === 'GUIDE_LEGEND' && (
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="text-xs text-slate-400 font-medium flex items-center space-x-2">
              <span className="font-bold text-slate-200">📘 คู่มือโค้ดสี &amp; โครงสร้างรหัสตำแหน่ง (Dynamic Legend &amp; Naming Convention):</span>
              <span>มาตรฐานรหัสพิกัดทั้ง 3 โซน (A4 แร็ค/พื้น, A2 รางเลื่อน FIFO, A5 ลานกองเต็นท์) และโค้ดสีแสดงความหนาแน่น</span>
            </div>
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

        {activeTab === 'TARGET_LINES' && (
          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-9 pr-3 py-2 border border-slate-700 rounded-xl text-xs bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="ค้นหาไลน์ที่นำไปใช้ (e.g. A2, A4, SUB_LINE)..."
                value={targetLineSearch}
                onChange={(e) => setTargetLineSearch(e.target.value)}
              />
            </div>
            <button
              onClick={handleAddNewTargetLine}
              className="flex items-center justify-center space-x-1.5 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 shadow-md active:scale-95 border border-orange-400/30"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มไลน์ที่นำไปใช้ใหม่</span>
            </button>
          </div>
        )}

        {activeTab === 'MASTER_PARTS' && (
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
            <div className="flex flex-1 flex-wrap items-center gap-2">
              {/* Search Box */}
              <div className="relative flex-1 min-w-[200px]">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-9 pr-3 py-2 border border-slate-700 rounded-xl text-xs bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ค้นหา Parts No, Tool หรือประเภท (Evap/Con)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Line Filter */}
              <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 shrink-0">
                <Factory className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <select
                  value={lineFilter}
                  onChange={(e) => setLineFilter(e.target.value)}
                  className="bg-transparent text-xs text-white focus:outline-none font-medium cursor-pointer"
                  title="ฟิลเตอร์ตามไลน์ผลิต"
                >
                  <option value="ALL" className="bg-slate-900 text-slate-200">🏭 ทุกไลน์ผลิต (ทั้งหมด)</option>
                  {useLines.map(line => (
                    <option key={line.id} value={line.id} className="bg-slate-900 text-slate-200">
                      Line {line.id}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type Filter */}
              <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 shrink-0">
                <Layers className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="bg-transparent text-xs text-white focus:outline-none font-medium cursor-pointer"
                  title="ฟิลเตอร์ตามประเภทงาน"
                >
                  <option value="ALL" className="bg-slate-900 text-slate-200">📦 ทุกประเภทงาน (ทั้งหมด)</option>
                  <option value="Evaporator" className="bg-slate-900 text-slate-200">Evaporator (คอยล์เย็น)</option>
                  <option value="Condenser" className="bg-slate-900 text-slate-200">Condenser (คอยล์ร้อน)</option>
                </select>
              </div>

              {/* Reset filter button */}
              {(lineFilter !== 'ALL' || typeFilter !== 'ALL' || search) && (
                <button
                  onClick={() => { setSearch(''); setLineFilter('ALL'); setTypeFilter('ALL'); }}
                  className="text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition-colors border border-slate-800"
                  title="ล้างตัวกรองทั้งหมด"
                >
                  ล้างตัวกรอง
                </button>
              )}
            </div>

            <button
              onClick={handleAddNew}
              className="flex items-center justify-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 shadow-md active:scale-95 border border-blue-400/30"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่ม Master Part ใหม่</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Tab Content */}
      <div className="overflow-x-auto flex-1 p-2 sm:p-4 min-h-0">
        {/* TAB: MASTER PARTS MANAGEMENT */}
        {activeTab === 'MASTER_PARTS' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Box className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-bold text-white">
                    ตารางข้อมูล Master Parts No. ทั้งหมดในระบบ (แสดง {filteredData.length} จาก {masterData.length} รายการ)
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">เชื่อมโยงอัตโนมัติกับ QuickScannerModal</span>
              </div>

              <div className="overflow-auto max-h-[60vh]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-900/95 text-slate-300 font-mono sticky top-0 border-b border-slate-800 z-10 shadow-md">
                    <tr>
                      <th className="py-2.5 px-3 min-w-[170px] bg-slate-900/95">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-1 font-bold text-cyan-400">
                            <span>Part NO (Model)</span>
                          </div>
                          <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="🔍 ค้นหา Part No..."
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                      </th>
                      <th className="py-2.5 px-3 min-w-[180px] bg-slate-900/95">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-1 font-bold text-emerald-400">
                            <Factory className="w-3.5 h-3.5" />
                            <span>ไลน์ผลิต (Line)</span>
                          </div>
                          <select
                            value={lineFilter}
                            onChange={(e) => setLineFilter(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none focus:border-emerald-500 cursor-pointer font-bold"
                          >
                            <option value="ALL">🏭 ทุกไลน์ผลิต (ทั้งหมด)</option>
                            {useLines.map(line => (
                              <option key={line.id} value={line.id}>Line {line.id}</option>
                            ))}
                          </select>
                        </div>
                      </th>
                      <th className="py-2.5 px-3 min-w-[160px] bg-slate-900/95">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-1 font-bold text-blue-400">
                            <Layers className="w-3.5 h-3.5" />
                            <span>ประเภทงาน (Type)</span>
                          </div>
                          <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none focus:border-blue-500 cursor-pointer font-bold"
                          >
                            <option value="ALL">📦 ทุกประเภทงาน</option>
                            <option value="Evaporator">Evaporator (คอยล์เย็น)</option>
                            <option value="Condenser">Condenser (คอยล์ร้อน)</option>
                          </select>
                        </div>
                      </th>
                      <th className="py-2.5 px-3 min-w-[180px] bg-slate-900/95">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-1 font-bold text-amber-400">
                            <Box className="w-3.5 h-3.5" />
                            <span>Tools / รายละเอียด</span>
                          </div>
                          <input
                            type="text"
                            value={toolFilter}
                            onChange={(e) => setToolFilter(e.target.value)}
                            placeholder="🔍 ฟิลเตอร์ Tool..."
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </th>
                      <th className="py-2.5 px-3 text-right min-w-[130px] bg-slate-900/95">
                        <div className="space-y-1 text-right">
                          <span className="font-bold text-slate-300">จำนวน/พาเลท (Std Qty)</span>
                          {(lineFilter !== 'ALL' || typeFilter !== 'ALL' || search || toolFilter) && (
                            <button
                              onClick={() => { setSearch(''); setLineFilter('ALL'); setTypeFilter('ALL'); setToolFilter(''); }}
                              className="block ml-auto text-[10px] text-rose-400 hover:text-rose-300 underline font-bold"
                            >
                              ล้างตัวกรอง
                            </button>
                          )}
                        </div>
                      </th>
                      <th className="py-2.5 px-3 text-center min-w-[90px] bg-slate-900/95">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {editingId === 'new' && isDuplicatePartNo && (
                      <tr className="bg-rose-950/80 border-y border-rose-500/70 animate-fadeIn">
                        <td colSpan={6} className="py-2.5 px-4 text-xs font-bold text-rose-200">
                          <div className="flex items-center space-x-2">
                            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 animate-pulse" />
                            <span>
                              ⚠️ แจ้งเตือน: รหัส Parts No <strong className="text-white underline font-mono">"{cleanEditingModel}"</strong> มีอยู่ในระบบแล้ว! (ข้อมูลซ้ำซ้อน ระบบไม่อนุญาตให้บันทึกซ้ำ)
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}

                    {editingId === 'new' && editForm && (
                      <tr className="bg-blue-950/40 animate-fadeIn">
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={editForm.modelHE}
                            onChange={(e) => setEditForm({ ...editForm, modelHE: e.target.value })}
                            placeholder="ระบุ Part No..."
                            className={`w-full bg-slate-900 border rounded px-2 py-1 text-xs uppercase focus:outline-none transition-all ${
                              isDuplicatePartNo 
                                ? 'border-rose-500 text-rose-300 ring-2 ring-rose-500/40 bg-rose-950/30 font-bold' 
                                : 'border-blue-500 text-white focus:ring-1 focus:ring-blue-400'
                            }`}
                            autoFocus
                          />
                          {isDuplicatePartNo && (
                            <span className="text-[10px] text-rose-400 font-bold mt-0.5 block">
                              ⚠️ รหัสนี้ซ้ำกับรายการที่มีอยู่
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex flex-wrap gap-1 max-w-[220px]">
                            {useLines.map(line => {
                              const currentLines = editForm.useLines || (editForm.useLine ? editForm.useLine.split(/,\s*/) : ['HE1']);
                              const isSelected = currentLines.includes(line.id);
                              return (
                                <button
                                  key={line.id}
                                  type="button"
                                  onClick={() => {
                                    const newLines = isSelected
                                      ? currentLines.filter(l => l !== line.id)
                                      : [...currentLines, line.id];
                                    setEditForm({
                                      ...editForm,
                                      useLines: newLines,
                                      useLine: newLines[0] || 'HE1'
                                    });
                                  }}
                                  className={`px-1.5 py-0.5 text-[10px] font-bold rounded border transition-all ${
                                    isSelected 
                                      ? 'bg-emerald-600 text-white border-emerald-400 font-black shadow-xs' 
                                      : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'
                                  }`}
                                >
                                  {line.id}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={editForm.productType || (typeFilter !== 'ALL' ? (typeFilter as any) : 'Evaporator')}
                            onChange={(e) => setEditForm({ ...editForm, productType: e.target.value as any })}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none"
                          >
                            <option value="Evaporator">Evaporator</option>
                            <option value="Condenser">Condenser</option>
                          </select>
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={editForm.partName}
                            onChange={(e) => setEditForm({ ...editForm, partName: e.target.value })}
                            placeholder="Tool Name (e.g. SK, U12)"
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            value={editForm.stdQtyPerPallet || 80}
                            onChange={(e) => setEditForm({ ...editForm, stdQtyPerPallet: Number(e.target.value) })}
                            className="w-20 text-right bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-cyan-300 font-bold focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-3 text-center space-x-1">
                          <button
                            onClick={handleSave}
                            disabled={isDuplicatePartNo || !cleanEditingModel}
                            className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                              isDuplicatePartNo || !cleanEditingModel
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md active:scale-95'
                            }`}
                            title={isDuplicatePartNo ? 'ไม่สามารถบันทึกได้เนื่องจากรหัส Part No ซ้ำกัน' : 'บันทึก'}
                          >
                            บันทึก
                          </button>
                          <button
                            onClick={() => { setEditingId(null); setEditForm(null); }}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px]"
                          >
                            ยกเลิก
                          </button>
                        </td>
                      </tr>
                    )}

                    {filteredData.length === 0 && editingId !== 'new' && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <Box className="w-8 h-8 text-slate-600" />
                            <span className="text-xs font-medium">ไม่พบรายการ Master Parts No ตามเงื่อนไขการค้นหา/ฟิลเตอร์</span>
                            {(search || lineFilter !== 'ALL' || typeFilter !== 'ALL' || toolFilter) && (
                              <button
                                onClick={() => { setSearch(''); setLineFilter('ALL'); setTypeFilter('ALL'); setToolFilter(''); }}
                                className="text-xs text-blue-400 hover:text-blue-300 underline font-bold mt-1"
                              >
                                ล้างตัวกรองทั้งหมด
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}

                    {filteredData.map((item, idx) => {
                      const isEditing = editingId === item.modelHE;
                      if (isEditing && editForm) {
                        return (
                          <tr key={`${item.modelHE}-${item.useLine || ''}-${idx}`} className="bg-blue-950/40 animate-fadeIn">
                            <td className="py-2 px-3 font-bold text-cyan-300">{item.modelHE}</td>
                            <td className="py-2 px-3">
                              <div className="flex flex-wrap gap-1 max-w-[220px]">
                                {useLines.map(line => {
                                  const currentLines = editForm.useLines || (editForm.useLine ? editForm.useLine.split(/,\s*/) : ['HE1']);
                                  const isSelected = currentLines.includes(line.id);
                                  return (
                                    <button
                                      key={line.id}
                                      type="button"
                                      onClick={() => {
                                        const newLines = isSelected
                                          ? currentLines.filter(l => l !== line.id)
                                          : [...currentLines, line.id];
                                        setEditForm({
                                          ...editForm,
                                          useLines: newLines,
                                          useLine: newLines[0] || 'HE1'
                                        });
                                      }}
                                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded border transition-all ${
                                        isSelected 
                                          ? 'bg-emerald-600 text-white border-emerald-400 font-black shadow-xs' 
                                          : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'
                                      }`}
                                    >
                                      {line.id}
                                    </button>
                                  );
                                })}
                              </div>
                            </td>
                            <td className="py-2 px-3">
                              <select
                                value={editForm.productType || 'Evaporator'}
                                onChange={(e) => setEditForm({ ...editForm, productType: e.target.value as any })}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none"
                              >
                                <option value="Evaporator">Evaporator</option>
                                <option value="Condenser">Condenser</option>
                              </select>
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={editForm.partName}
                                onChange={(e) => setEditForm({ ...editForm, partName: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none"
                              />
                            </td>
                            <td className="py-2 px-3 text-right">
                              <input
                                type="number"
                                value={editForm.stdQtyPerPallet || 80}
                                onChange={(e) => setEditForm({ ...editForm, stdQtyPerPallet: Number(e.target.value) })}
                                className="w-20 text-right bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-cyan-300 font-bold focus:outline-none"
                              />
                            </td>
                            <td className="py-2 px-3 text-center space-x-1">
                              <button
                                onClick={handleSave}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold"
                              >
                                บันทึก
                              </button>
                              <button
                                onClick={() => { setEditingId(null); setEditForm(null); }}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px]"
                              >
                                ยกเลิก
                              </button>
                            </td>
                          </tr>
                        );
                      }

                      const linesList = getItemLines(item);

                      return (
                        <tr key={`${item.modelHE}-${item.useLine || ''}-${idx}`} className="hover:bg-slate-800/40 transition-colors group">
                          <td className="py-2 px-3">
                            <span className="font-bold text-cyan-400 group-hover:text-cyan-300">{item.modelHE}</span>
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex flex-wrap gap-1 items-center">
                              {linesList.map((lineId, lIdx) => (
                                <span
                                  key={`${lineId}-${lIdx}`}
                                  className="px-2 py-0.5 rounded text-[10px] font-black border bg-emerald-950/80 text-emerald-300 border-emerald-500/40 shadow-xs"
                                >
                                  {lineId}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              item.productType === 'Condenser' 
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                                : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                            }`}>
                              {item.productType || 'Evaporator'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-300 truncate max-w-[200px]" title={item.partName}>
                            {item.partName}
                          </td>
                          <td className="py-2 px-3 text-right font-black text-cyan-300 text-sm">
                            {item.stdQtyPerPallet} <span className="text-[10px] text-slate-300 font-bold">ชิ้น</span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center justify-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleEdit(item)}
                                className="p-1.5 text-blue-400 hover:text-white hover:bg-blue-600 rounded-lg transition-all"
                                title="แก้ไขข้อมูล"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setConfirmDeleteModal({
                                    isOpen: true,
                                    title: 'ยืนยันการลบข้อมูล Master Part',
                                    itemName: item.modelHE,
                                    warningText: 'คำเตือน: ข้อมูลนี้จะถูกลบออกจากฐานข้อมูลหลัก',
                                    onConfirm: () => {
                                      handleDelete(item.modelHE);
                                      setConfirmDeleteModal(null);
                                    }
                                  });
                                }}
                                className="p-1.5 text-rose-400 hover:text-white hover:bg-rose-600 rounded-lg transition-all"
                                title="ลบข้อมูล"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: USE LINES (ไลน์ผลิต) */}
        {activeTab === 'LINES' && (
          <div className="space-y-4 animate-fadeIn">
            {lineSuccessMsg && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 rounded-xl text-xs font-bold animate-fadeIn flex items-center justify-between shadow-md">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{lineSuccessMsg}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {lastDeletedLine && (
                    <button
                      type="button"
                      onClick={handleUndoDeleteLine}
                      className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-xs transition-all active:scale-95 flex items-center space-x-1"
                      title="กู้คืนไลน์ที่เพิ่งลบ"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>เลิกทำ (Undo)</span>
                    </button>
                  )}
                  <button 
                    type="button"
                    onClick={() => setLineSuccessMsg(null)} 
                    className="text-emerald-400 hover:text-white font-bold text-xs p-1"
                  >
                    ✕
                  </button>
                </div>
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

        {/* TAB 2.5: TARGET USE LINES (ไลน์ที่นำไปใช้ - Red-Orange Theme) */}
        {activeTab === 'TARGET_LINES' && (
          <div className="space-y-4 animate-fadeIn">
            {targetLineSuccessMsg && (
              <div className="p-3 bg-orange-950/80 border border-orange-500/50 text-amber-200 rounded-xl text-xs font-bold animate-fadeIn flex items-center justify-between shadow-md">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{targetLineSuccessMsg}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {lastDeletedTargetLine && (
                    <button
                      type="button"
                      onClick={handleUndoDeleteTargetLine}
                      className="px-2.5 py-1 bg-orange-700 hover:bg-orange-600 text-white rounded-lg text-xs font-bold shadow-xs transition-all active:scale-95 flex items-center space-x-1"
                      title="กู้คืนไลน์ที่เพิ่งลบ"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>เลิกทำ (Undo)</span>
                    </button>
                  )}
                  <button 
                    type="button"
                    onClick={() => setTargetLineSuccessMsg(null)} 
                    className="text-amber-400 hover:text-white font-bold text-xs p-1"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* Add / Edit Target Line Form Card */}
            {editingTargetLineId !== null && editTargetLineForm && (
              <form onSubmit={handleSaveTargetLine} className="p-4 bg-slate-950 border-2 border-orange-500/60 rounded-2xl shadow-xl space-y-3.5 animate-scaleUp">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 bg-orange-600 text-white rounded-xl shadow-xs">
                      {editingTargetLineId === 'new' ? <Plus className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white flex items-center space-x-2">
                        <span>{editingTargetLineId === 'new' ? '🎯 เพิ่มไลน์ที่นำไปใช้ใหม่ (Add Target Line)' : `✏️ แก้ไขข้อมูลไลน์ที่นำไปใช้ [${editingTargetLineId}]`}</span>
                        <span className="px-2 py-0.5 rounded bg-orange-950/80 text-amber-300 font-mono text-[10px] font-bold border border-orange-500/40">
                          {editingTargetLineId === 'new' ? 'NEW TARGET RECORD' : 'EDIT TARGET LINE'}
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {editingTargetLineId === 'new' 
                          ? 'ระบุรหัสไลน์ที่นำไปใช้ (เช่น A2, A4, A6, A7, A8, A9, SUB_LINE) เพื่ออ้างอิงสายการผลิตเป้าหมาย' 
                          : 'สามารถแก้ไขรหัสไลน์ที่นำไปใช้ ชื่อเรียก และรายละเอียดสายงาน'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelTargetLine}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="ยกเลิก"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      รหัสไลน์ที่นำไปใช้ (LINE ID) <span className="text-rose-400">*</span>:
                    </label>
                    <input
                      type="text"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono font-black uppercase text-amber-300 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-2xs"
                      placeholder="e.g. A2, A4, A6, A8, SUB_LINE"
                      value={editTargetLineForm.id}
                      onChange={e => setEditTargetLineForm({ ...editTargetLineForm, id: e.target.value.toUpperCase() })}
                      required
                    />
                    <p className="text-[10px] text-slate-500 mt-1 font-mono">ตัวพิมพ์ใหญ่ เช่น A2, A4, A6, A8, SUB_LINE</p>
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      ชื่อไลน์ที่นำไปใช้ (LINE NAME) <span className="text-rose-400">*</span>:
                    </label>
                    <input
                      type="text"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-2xs"
                      placeholder="e.g. Line A2 (Main Assembly)"
                      value={editTargetLineForm.name}
                      onChange={e => setEditTargetLineForm({ ...editTargetLineForm, name: e.target.value })}
                      required
                    />
                    <p className="text-[10px] text-slate-500 mt-1">ชื่อเรียกสายการผลิตปลายทางที่นำไปใช้</p>
                  </div>

                  <div className="sm:col-span-5">
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      คำอธิบาย / รายละเอียด (Description):
                    </label>
                    <input
                      type="text"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-2xs"
                      placeholder="e.g. สายการประกอบหลัก A2 โรงงานเตรียมชิ้นส่วน"
                      value={editTargetLineForm.description || ''}
                      onChange={e => setEditTargetLineForm({ ...editTargetLineForm, description: e.target.value })}
                    />
                    <p className="text-[10px] text-slate-500 mt-1">รายละเอียดแผนกหรืออาคารการประกอบ</p>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={handleCancelTargetLine}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-850 transition-colors"
                  >
                    ยกเลิก (Cancel)
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-black shadow-md flex items-center space-x-1.5 transition-all active:scale-95 border border-orange-400/30"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{editingTargetLineId === 'new' ? 'บันทึกและเพิ่มไลน์ใหม่' : 'บันทึกการแก้ไขไลน์'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Table matching Screenshot image_9155bb7d.png but in Red-Orange Theme */}
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 shadow-md">
              <table className="w-full text-left text-xs text-slate-200">
                <thead className="bg-slate-900/90 text-slate-300 font-bold uppercase text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="px-3.5 py-3">#</th>
                    <th className="px-3.5 py-3">รหัสไลน์ที่นำไปใช้ (LINE ID)</th>
                    <th className="px-3.5 py-3">ชื่อไลน์นำไปใช้ (LINE NAME)</th>
                    <th className="px-3.5 py-3">คำอธิบาย / รายละเอียด</th>
                    <th className="px-3.5 py-3 text-center">พาเลทที่ใช้งานในคลัง</th>
                    <th className="px-3.5 py-3 text-right">จัดการรายการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredTargetLines.map((line, idx) => {
                    const allocatedItemsCount = items.filter(it => it.useLine === line.id).length;
                    const isEditingThis = editingTargetLineId === line.id;
                    return (
                      <tr 
                        key={line.id} 
                        className={`transition-colors ${
                          isEditingThis ? 'bg-orange-950/40 ring-1 ring-orange-500/40' : 'hover:bg-slate-900/60'
                        }`}
                      >
                        <td className="px-3.5 py-2.5 text-slate-500 font-mono">{idx + 1}</td>
                        <td className="px-3.5 py-2.5">
                          <span className="px-2.5 py-1 rounded-md bg-orange-950/80 text-amber-300 font-mono font-black text-xs border border-orange-500/40 inline-flex items-center space-x-1 shadow-2xs">
                            <Target className="w-3 h-3 text-amber-400" />
                            <span>{line.id}</span>
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 font-bold text-white">{line.name}</td>
                        <td className="px-3.5 py-2.5 text-slate-400">{line.description || '-'}</td>
                        <td className="px-3.5 py-2.5 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-mono font-bold ${
                            allocatedItemsCount > 0 
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {allocatedItemsCount} พาเลท
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-right">
                          <div className="inline-flex items-center space-x-1.5">
                            <button
                              onClick={() => handleEditTargetLine(line)}
                              className="px-2.5 py-1.5 rounded-lg text-amber-300 hover:text-white bg-orange-950/70 hover:bg-orange-600 border border-orange-500/40 transition-all font-bold text-[11px] flex items-center space-x-1 shadow-2xs"
                              title="แก้ไขข้อมูลไลน์ที่นำไปใช้"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>แก้ไข</span>
                            </button>
                            <button 
                              onClick={() => handleDeleteTargetLine(line.id)} 
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
                  {filteredTargetLines.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-500">
                        ไม่พบข้อมูลไลน์ที่นำไปใช้ที่ตรงกับการค้นหา
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: AGING FIFO CONFIG */}
        {activeTab === 'AGING_CONFIG' && setAgingConfig && (
          <div className="animate-fadeIn h-full overflow-auto">
            <AgingFifoPanel 
              agingConfig={agingConfig || { safeDaysMin: 0, safeDaysMax: 21, warningDaysMin: 22, warningDaysMax: 24, urgentDaysMin: 25, urgentDaysMax: 27, dueDay: 28, criticalDays: 28, indoorRubberCapDays: 28, autoAlertEnabled: true, notifyOnFifoViolation: true, customRuleName: '' }} 
              setAgingConfig={setAgingConfig} 
              items={items}
            />
          </div>
        )}

        {/* TAB: COLOR CODE GUIDE */}
        {activeTab === 'GUIDE_LEGEND' && (
          <div className="animate-fadeIn h-full overflow-auto">
            <DynamicLegendPanel />
          </div>
        )}
      </div>

      {/* In-app Custom Delete Confirmation Modal */}
      {confirmDeleteModal && confirmDeleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn">
          <div className="bg-slate-900 border-2 border-rose-500/50 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 text-white animate-scaleUp">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">{confirmDeleteModal.title}</h3>
                <p className="text-xs text-rose-300 font-mono font-bold mt-0.5">{confirmDeleteModal.itemName}</p>
              </div>
            </div>

            {confirmDeleteModal.warningText && (
              <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl text-xs text-amber-200 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{confirmDeleteModal.warningText}</span>
              </div>
            )}

            <p className="text-xs text-slate-300">
              คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้ออกจากระบบอย่างถาวร?
            </p>

            <div className="flex items-center justify-end space-x-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmDeleteModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                ยกเลิก (Cancel)
              </button>
              <button
                type="button"
                onClick={confirmDeleteModal.onConfirm}
                className="px-4 py-2 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-500 shadow-md flex items-center space-x-1.5 transition-all active:scale-95 border border-rose-400/30"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ยืนยันการลบ (Delete)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
