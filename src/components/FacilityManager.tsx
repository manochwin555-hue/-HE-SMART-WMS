import React, { useState, useMemo } from 'react';
import { WarehouseFacility, StorageLocationType, InventoryItem } from '../types';
import { 
  Building2, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  Layers, 
  MapPin, 
  Phone, 
  User, 
  FileText, 
  ShieldCheck, 
  AlertCircle, 
  Sparkles, 
  X, 
  Printer, 
  ArrowRight,
  Database,
  Grid,
  Check,
  Building
} from 'lucide-react';

interface FacilityManagerProps {
  facilities: WarehouseFacility[];
  setFacilities: React.Dispatch<React.SetStateAction<WarehouseFacility[]>>;
  activeFacilityId: string;
  setActiveFacilityId: (id: string) => void;
  items: InventoryItem[];
  onNavigateToLayout?: (facility: WarehouseFacility) => void;
}

export const FacilityManager: React.FC<FacilityManagerProps> = ({
  facilities,
  setFacilities,
  activeFacilityId,
  setActiveFacilityId,
  items,
  onNavigateToLayout
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE'>('ALL');
  
  // Modal / Form state for Add / Edit
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFacilityId, setEditingFacilityId] = useState<string | null>(null);
  const [facilityForm, setFacilityForm] = useState<{
    code: string;
    name: string;
    building: string;
    storageTypes: StorageLocationType[];
    zonesInput: string;
    totalCapacityPallets: number;
    description: string;
    managerName: string;
    contactNumber: string;
    status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
    isDefault: boolean;
  }>({
    code: '',
    name: '',
    building: '',
    storageTypes: ['RACK', 'FLOOR_STAGING'],
    zonesInput: 'A, B, C',
    totalCapacityPallets: 200,
    description: '',
    managerName: '',
    contactNumber: '',
    status: 'ACTIVE',
    isDefault: false
  });

  // Success Notification state
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Compute stats per facility
  const facilityStats = useMemo(() => {
    const statsMap: Record<string, { totalItems: number; totalPallets: number; totalQty: number }> = {};
    
    facilities.forEach(fac => {
      statsMap[fac.id] = { totalItems: 0, totalPallets: 0, totalQty: 0 };
    });

    items.forEach(item => {
      // Check direct facilityId or matching zone
      let facId = item.facilityId;
      if (!facId) {
        const found = facilities.find(f => f.zones.includes(item.zone));
        if (found) facId = found.id;
      }
      
      if (facId && statsMap[facId]) {
        statsMap[facId].totalItems += 1;
        statsMap[facId].totalPallets += item.fullPallets || Math.ceil(item.quantity / (item.stdQtyPerPallet || 80)) || 1;
        statsMap[facId].totalQty += item.quantity;
      }
    });

    return statsMap;
  }, [facilities, items]);

  // Filter facilities
  const filteredFacilities = useMemo(() => {
    return facilities.filter(fac => {
      const matchSearch = 
        fac.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fac.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fac.building.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fac.zones.some(z => z.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (fac.managerName && fac.managerName.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchStatus = statusFilter === 'ALL' || fac.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [facilities, searchTerm, statusFilter]);

  // Open Form for Create
  const handleOpenCreate = () => {
    setEditingFacilityId(null);
    setFacilityForm({
      code: `BLDG-${facilities.length + 1}`,
      name: '',
      building: '',
      storageTypes: ['RACK', 'FLOOR_STAGING'],
      zonesInput: 'Z1, Z2, Z3',
      totalCapacityPallets: 200,
      description: '',
      managerName: '',
      contactNumber: '',
      status: 'ACTIVE',
      isDefault: false
    });
    setIsFormOpen(true);
  };

  // Open Form for Edit
  const handleOpenEdit = (fac: WarehouseFacility) => {
    setEditingFacilityId(fac.id);
    setFacilityForm({
      code: fac.code,
      name: fac.name,
      building: fac.building,
      storageTypes: fac.storageTypes || ['RACK'],
      zonesInput: fac.zones.join(', '),
      totalCapacityPallets: fac.totalCapacityPallets,
      description: fac.description || '',
      managerName: fac.managerName || '',
      contactNumber: fac.contactNumber || '',
      status: fac.status,
      isDefault: !!fac.isDefault
    });
    setIsFormOpen(true);
  };

  // Toggle Storage Type in Form
  const handleToggleStorageType = (st: StorageLocationType) => {
    if (facilityForm.storageTypes.includes(st)) {
      if (facilityForm.storageTypes.length === 1) return; // at least 1
      setFacilityForm({
        ...facilityForm,
        storageTypes: facilityForm.storageTypes.filter(t => t !== st)
      });
    } else {
      setFacilityForm({
        ...facilityForm,
        storageTypes: [...facilityForm.storageTypes, st]
      });
    }
  };

  // Save Facility
  const handleSaveFacility = (e: React.FormEvent) => {
    e.preventDefault();

    if (!facilityForm.name.trim()) {
      showNotification('error', 'กรุณาระบุชื่อสถานที่จัดเก็บ (Facility Name)');
      return;
    }
    if (!facilityForm.code.trim()) {
      showNotification('error', 'กรุณาระบุรหัสสถานที่ (Facility Code)');
      return;
    }

    const parsedZones = facilityForm.zonesInput
      .split(',')
      .map(z => z.trim().toUpperCase())
      .filter(z => z.length > 0);

    if (parsedZones.length === 0) {
      showNotification('error', 'กรุณาระบุโซนจัดเก็บอย่างน้อย 1 โซน');
      return;
    }

    if (editingFacilityId) {
      // Update existing
      setFacilities(prev => prev.map(fac => {
        if (fac.id === editingFacilityId) {
          return {
            ...fac,
            code: facilityForm.code.trim().toUpperCase(),
            name: facilityForm.name.trim(),
            building: facilityForm.building.trim() || facilityForm.name.trim(),
            storageTypes: facilityForm.storageTypes,
            zones: parsedZones,
            totalCapacityPallets: Number(facilityForm.totalCapacityPallets) || 100,
            description: facilityForm.description.trim(),
            managerName: facilityForm.managerName.trim(),
            contactNumber: facilityForm.contactNumber.trim(),
            status: facilityForm.status,
            isDefault: facilityForm.isDefault
          };
        }
        if (facilityForm.isDefault && fac.id !== editingFacilityId) {
          return { ...fac, isDefault: false };
        }
        return fac;
      }));
      showNotification('success', `อัปเดตข้อมูลสถานที่ ${facilityForm.name} เรียบร้อยแล้ว`);
    } else {
      // Create new
      const newId = `FAC-${facilityForm.code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')}-${Date.now().toString().slice(-4)}`;
      const newFacility: WarehouseFacility = {
        id: newId,
        code: facilityForm.code.trim().toUpperCase(),
        name: facilityForm.name.trim(),
        building: facilityForm.building.trim() || facilityForm.name.trim(),
        storageTypes: facilityForm.storageTypes,
        zones: parsedZones,
        totalCapacityPallets: Number(facilityForm.totalCapacityPallets) || 100,
        description: facilityForm.description.trim(),
        managerName: facilityForm.managerName.trim(),
        contactNumber: facilityForm.contactNumber.trim(),
        status: facilityForm.status,
        isDefault: facilityForm.isDefault
      };

      setFacilities(prev => {
        if (newFacility.isDefault) {
          return [...prev.map(f => ({ ...f, isDefault: false })), newFacility];
        }
        return [...prev, newFacility];
      });
      showNotification('success', `ลงทะเบียนคลังสินค้าใหม่ "${newFacility.name}" สำเร็จ`);
    }

    setIsFormOpen(false);
  };

  // Delete Facility
  const handleDeleteFacility = (fac: WarehouseFacility) => {
    const stats = facilityStats[fac.id];
    if (stats && stats.totalItems > 0) {
      if (!confirm(`คลังสินค้า "${fac.name}" มีสินค้าจัดเก็บอยู่จำนวน ${stats.totalItems} รายการ (${stats.totalQty} ชิ้น)\nคุณแน่ใจหรือไม่ที่จะลบสถานที่นี้?`)) {
        return;
      }
    } else {
      if (!confirm(`คุณต้องการลบสถานที่จัดเก็บ "${fac.name}" (${fac.code}) ใช่หรือไม่?`)) {
        return;
      }
    }

    setFacilities(prev => prev.filter(f => f.id !== fac.id));
    if (activeFacilityId === fac.id) {
      setActiveFacilityId('ALL');
    }
    showNotification('success', `ลบสถานที่จัดเก็บ ${fac.name} เรียบร้อยแล้ว`);
  };

  // Quick Preset Add
  const handleAddPreset = (presetType: 'A2' | 'A4' | 'A3') => {
    if (presetType === 'A2') {
      const exists = facilities.some(f => f.code === 'A2-BLDG');
      if (exists) {
        showNotification('error', 'มีคลังสินค้าอาคาร A2 ในระบบแล้ว');
        return;
      }
      const newFac: WarehouseFacility = {
        id: `FAC-A2-${Date.now().toString().slice(-4)}`,
        code: 'A2-BLDG',
        name: 'A2 Building Floor and Rail',
        building: 'A2 Building (อาคารเตรียมชิ้นส่วน & รางเลื่อน)',
        storageTypes: ['FLOW_RAIL', 'FLOOR_STAGING'],
        zones: ['FR1', 'FR2', 'FR3', 'FR4', 'FR5', 'FR6', 'FR7', 'FR8', 'FL-A', 'FL-B', 'FL-C', 'FL-D'],
        totalCapacityPallets: 104,
        description: 'ติดตั้งรางเลื่อน FIFO Gravity Roller Lanes 8 ราง และลานบล็อกพาเลทวางบนพื้น 4 โซนย่อย',
        managerName: 'วิชัย โลจิสติกส์',
        contactNumber: '02-123-4567 ต่อ 205',
        status: 'ACTIVE',
        isDefault: false
      };
      setFacilities(prev => [...prev, newFac]);
      showNotification('success', 'เพิ่มคลังแม่แบบ A2 Building Floor and Rail เรียบร้อย');
    } else if (presetType === 'A4') {
      const exists = facilities.some(f => f.code === 'A4-BLDG');
      if (exists) {
        showNotification('error', 'มีคลังสินค้าอาคาร A4 ในระบบแล้ว');
        return;
      }
      const newFac: WarehouseFacility = {
        id: `FAC-A4-${Date.now().toString().slice(-4)}`,
        code: 'A4-BLDG',
        name: 'A4 Building Rack and Floor',
        building: 'A4 Building (อาคารคลังหลัก & โครงสร้าง Rack)',
        storageTypes: ['RACK', 'FLOOR_STAGING'],
        zones: ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'FL-A4'],
        totalCapacityPallets: 680,
        description: 'Selective Rack 4 ชั้น (Zone B-F 12 Bays, Zone G-K 5 Bays) และพื้นที่ Buffer กองพื้น',
        managerName: 'สมชาย คลังใหญ่',
        contactNumber: '02-123-4567 ต่อ 401',
        status: 'ACTIVE',
        isDefault: true
      };
      setFacilities(prev => [...prev, newFac]);
      showNotification('success', 'เพิ่มคลังแม่แบบ A4 Building Rack and Floor เรียบร้อย');
    } else {
      const newFac: WarehouseFacility = {
        id: `FAC-A3-${Date.now().toString().slice(-4)}`,
        code: 'A3-BLDG',
        name: 'A3 Building Sub-Assembly & Buffer',
        building: 'A3 Building (อาคารประกอบย่อย & คลังกันชน)',
        storageTypes: ['RACK', 'FLOW_RAIL'],
        zones: ['A3-R1', 'A3-R2', 'A3-FR1', 'A3-FR2'],
        totalCapacityPallets: 180,
        description: 'พื้นที่จัดเก็บชิ้นส่วนสำหรับไลน์ประกอบย่อย Sub-Assembly A3',
        managerName: 'กิตติศักดิ์ ชิ้นส่วน',
        contactNumber: '02-123-4567 ต่อ 302',
        status: 'ACTIVE',
        isDefault: false
      };
      setFacilities(prev => [...prev, newFac]);
      showNotification('success', 'เพิ่มคลังแม่แบบ A3 Building Sub-Assembly เรียบร้อย');
    }
  };

  return (
    <div id="facility-manager-root" className="space-y-6">
      {/* Notification Toast */}
      {notification && (
        <div 
          id="facility-notification-banner"
          className={`p-4 rounded-xl flex items-center justify-between border shadow-lg transition-all animate-fadeIn ${
            notification.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center space-x-3">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span className="text-sm font-medium">{notification.message}</span>
          </div>
          <button 
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Quick Summary Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 relative overflow-hidden backdrop-blur shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2.5 bg-blue-500/20 border border-blue-500/30 rounded-xl text-blue-400">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                  <span>จัดการคลังและอาคารจัดเก็บ (Facility Manager)</span>
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {facilities.length} สถานที่
                  </span>
                </h2>
                <p className="text-sm text-slate-400">
                  ลงทะเบียนและจัดการสถานที่จัดเก็บสินค้าทั้งหมด (e.g. A4 Building Rack & Floor, A2 Building Floor & Rail)
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              id="btn-add-new-facility"
              onClick={handleOpenCreate}
              className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-sm shadow-lg shadow-blue-500/20 flex items-center space-x-2 transition-all transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>+ ลงทะเบียนคลัง / อาคารใหม่</span>
            </button>
          </div>
        </div>

        {/* Quick Presets / Template suggestions */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-2 text-xs text-slate-400 font-medium">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>เพิ่มแม่แบบสำเร็จรูป (Quick Templates):</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleAddPreset('A4')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 flex items-center space-x-1.5 transition-colors"
            >
              <Building className="w-3.5 h-3.5 text-blue-400" />
              <span>A4 Building Rack and Floor</span>
            </button>
            <button
              onClick={() => handleAddPreset('A2')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 flex items-center space-x-1.5 transition-colors"
            >
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>A2 Building Floor and Rail</span>
            </button>
            <button
              onClick={() => handleAddPreset('A3')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 flex items-center space-x-1.5 transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 text-purple-400" />
              <span>A3 Sub-Assembly Store</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="facility-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาชื่อคลัง, รหัส, อาคาร, โซน..."
            className="w-full bg-slate-800/90 border border-slate-700 text-slate-200 text-sm rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap">สถานะ:</span>
          {(['ALL', 'ACTIVE', 'MAINTENANCE', 'INACTIVE'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              {st === 'ALL' && 'ทั้งหมด'}
              {st === 'ACTIVE' && '🟢 ใช้งานปกติ (Active)'}
              {st === 'MAINTENANCE' && '🟡 ซ่อมบำรุง'}
              {st === 'INACTIVE' && '⚪ ปิดชั่วคราว'}
            </button>
          ))}
        </div>
      </div>

      {/* Facilities Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredFacilities.map((facility) => {
          const stats = facilityStats[facility.id] || { totalItems: 0, totalPallets: 0, totalQty: 0 };
          const occupancyRate = facility.totalCapacityPallets > 0 
            ? Math.round((stats.totalPallets / facility.totalCapacityPallets) * 100)
            : 0;
          const isActiveSite = activeFacilityId === facility.id;

          return (
            <div
              key={facility.id}
              id={`facility-card-${facility.id}`}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between ${
                isActiveSite
                  ? 'bg-slate-900 border-blue-500 shadow-xl shadow-blue-500/10 ring-1 ring-blue-500'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 shadow-lg'
              }`}
            >
              {/* Card Header */}
              <div className="p-5 border-b border-slate-800/80 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 bg-slate-800 text-blue-400 font-mono text-xs font-bold rounded-md border border-slate-700">
                        {facility.code}
                      </span>
                      {facility.isDefault && (
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-bold rounded-full border border-amber-500/30">
                          ⭐ คลังตั้งต้น (Default)
                        </span>
                      )}
                      {isActiveSite && (
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-500/30 flex items-center space-x-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span>กำลังเปิดดูอยู่ (Active Site)</span>
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-white line-clamp-1">
                      {facility.name}
                    </h3>
                    <p className="text-xs text-slate-400 flex items-center space-x-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{facility.building}</span>
                    </p>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(facility)}
                      className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="แก้ไขข้อมูลคลัง"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteFacility(facility)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                      title="ลบคลังสินค้า"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Storage Types Badges */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {facility.storageTypes?.map((st) => (
                    <span
                      key={st}
                      className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700 flex items-center space-x-1"
                    >
                      {st === 'RACK' && <span>🏢 Selective Rack</span>}
                      {st === 'FLOW_RAIL' && <span>🛤️ FIFO Flow Rail</span>}
                      {st === 'FLOOR_STAGING' && <span>📦 Floor Staging</span>}
                    </span>
                  ))}
                </div>
              </div>

              {/* Card Body & Capacity Meter */}
              <div className="p-5 space-y-4">
                {/* Capacity & Usage Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium">ความจุพาเลท (Pallet Occupancy):</span>
                    <span className="font-bold text-slate-200">
                      {stats.totalPallets} / {facility.totalCapacityPallets} พาเลท ({occupancyRate}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        occupancyRate >= 90
                          ? 'bg-rose-500'
                          : occupancyRate >= 70
                          ? 'bg-amber-500'
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(2, occupancyRate))}%` }}
                    />
                  </div>
                </div>

                {/* Metrics Pill Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-800 space-y-0.5">
                    <div className="text-slate-400 text-[11px]">จำนวนรายการสินค้า:</div>
                    <div className="text-white font-bold text-sm flex items-baseline space-x-1">
                      <span>{stats.totalItems}</span>
                      <span className="text-[10px] text-slate-400 font-normal">SKUs</span>
                    </div>
                  </div>
                  <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-800 space-y-0.5">
                    <div className="text-slate-400 text-[11px]">ยอดรวมสินค้าคงคลัง:</div>
                    <div className="text-white font-bold text-sm flex items-baseline space-x-1">
                      <span>{stats.totalQty.toLocaleString()}</span>
                      <span className="text-[10px] text-slate-400 font-normal">ชิ้น</span>
                    </div>
                  </div>
                </div>

                {/* Zones List */}
                <div className="space-y-1">
                  <div className="text-[11px] text-slate-400 font-medium">โซนที่รับผิดชอบ (Storage Zones):</div>
                  <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                    {facility.zones.map((z) => (
                      <span
                        key={z}
                        className="px-1.5 py-0.5 bg-slate-800/90 text-slate-300 text-[10px] font-mono font-semibold rounded border border-slate-700"
                      >
                        Zone {z}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Manager / Contact */}
                {facility.managerName && (
                  <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/60">
                    <div className="flex items-center space-x-1 truncate">
                      <User className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="truncate">{facility.managerName}</span>
                    </div>
                    {facility.contactNumber && (
                      <div className="flex items-center space-x-1 text-slate-400 shrink-0 ml-2">
                        <Phone className="w-3 h-3 text-slate-500" />
                        <span>{facility.contactNumber}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="p-4 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    setActiveFacilityId(facility.id);
                    showNotification('success', `สลับสถานที่ทำงานหลักเป็น "${facility.name}"`);
                  }}
                  className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                    isActiveSite
                      ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  {isActiveSite ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>ใช้งานอยู่นี้</span>
                    </>
                  ) : (
                    <span>🎯 เลือกเป็น Active Site</span>
                  )}
                </button>

                {onNavigateToLayout && (
                  <button
                    onClick={() => {
                      setActiveFacilityId(facility.id);
                      onNavigateToLayout(facility);
                    }}
                    className="px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-semibold flex items-center space-x-1 transition-colors"
                    title="ไปที่ผังคลังสินค้านี้"
                  >
                    <span>ดูผังคลัง</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filteredFacilities.length === 0 && (
          <div className="col-span-full py-12 text-center bg-slate-900/40 border border-slate-800 rounded-2xl p-8 space-y-3">
            <Building2 className="w-12 h-12 text-slate-600 mx-auto" />
            <div className="text-base font-bold text-slate-300">ไม่พบสถานที่จัดเก็บตามเงื่อนไข</div>
            <p className="text-sm text-slate-500">ลองเปลี่ยนคำค้นหา หรือกดปุ่ม "ลงทะเบียนคลัง / อาคารใหม่" ด้านบน</p>
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>ลงทะเบียนคลังสินค้าใหม่ทันที</span>
            </button>
          </div>
        )}
      </div>

      {/* Add / Edit Facility Modal Dialog */}
      {isFormOpen && (
        <div 
          id="facility-form-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur z-10">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {editingFacilityId ? 'แก้ไขข้อมูลคลังสินค้า / อาคารจัดเก็บ' : 'ลงทะเบียนสถานที่จัดเก็บใหม่ (Register Facility)'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    กำหนดรหัสคลัง, ชื่ออาคาร, ชนิดการจัดเก็บ (Rack, Flow Rail, Floor) และโซนจัดเก็บ
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveFacility} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Facility Code */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    รหัสสถานที่ (Facility Code) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={facilityForm.code}
                    onChange={(e) => setFacilityForm({ ...facilityForm, code: e.target.value })}
                    placeholder="e.g. A4-BLDG, A2-BLDG, WH-MAIN"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-500">รหัสย่อสำหรับใช้ในระบบและบาร์โค้ด</span>
                </div>

                {/* Facility Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    ชื่อสถานที่จัดเก็บ (Facility Name) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={facilityForm.name}
                    onChange={(e) => setFacilityForm({ ...facilityForm, name: e.target.value })}
                    placeholder="e.g. A2 Building Floor and Rail, A4 Building Rack and Floor"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-500">ชื่อทางการสำหรับแสดงผลทั่วทั้งระบบ</span>
                </div>
              </div>

              {/* Building & Location Description */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  ชื่ออาคาร / ที่ตั้ง (Building / Location Area)
                </label>
                <input
                  type="text"
                  value={facilityForm.building}
                  onChange={(e) => setFacilityForm({ ...facilityForm, building: e.target.value })}
                  placeholder="e.g. A4 Building (อาคารคลังหลัก & โครงสร้าง Rack), A2 Building (อาคารเตรียมชิ้นส่วน)"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Storage Types Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">
                  รูปแบบการจัดเก็บภายในสถานที่นี้ (Storage Location Types) <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'RACK' as const, label: 'Selective Rack', desc: 'ชั้นวางพาเลทโครงสร้างเหล็ก 4 ชั้น' },
                    { id: 'FLOW_RAIL' as const, label: 'FIFO Flow Rail', desc: 'รางเลื่อนลูกกลิ้งส่งจ่ายด่วน' },
                    { id: 'FLOOR_STAGING' as const, label: 'Floor Staging', desc: 'ลานบล็อกพาเลทวางบนพื้น' },
                  ].map((type) => {
                    const isChecked = facilityForm.storageTypes.includes(type.id);
                    return (
                      <div
                        key={type.id}
                        onClick={() => handleToggleStorageType(type.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-blue-600/20 border-blue-500 text-blue-300 ring-1 ring-blue-500/50'
                            : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold">{type.label}</span>
                          <div className={`w-4 h-4 rounded flex items-center justify-center text-[10px] ${isChecked ? 'bg-blue-500 text-white' : 'border border-slate-600'}`}>
                            {isChecked && '✓'}
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-400">{type.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Zones and Total Capacity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Zones input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    รายการโซนจัดเก็บ (Zones - คั่นด้วยจุลภาค) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={facilityForm.zonesInput}
                    onChange={(e) => setFacilityForm({ ...facilityForm, zonesInput: e.target.value })}
                    placeholder="e.g. B, C, D, E, F, G, H, I, J, K หรือ FR1, FR2, FL-A, FL-B"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-500">ระบุรหัสโซนคั่นด้วยเครื่องหมายจุลภาค (,)</span>
                </div>

                {/* Total Capacity */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    ความจุพาเลทสูงสุดรวม (Max Pallet Capacity) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={facilityForm.totalCapacityPallets}
                    onChange={(e) => setFacilityForm({ ...facilityForm, totalCapacityPallets: parseInt(e.target.value) || 0 })}
                    placeholder="e.g. 680"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-500">จำนวนพาเลทสูงสุดที่สถานที่นี้สามารถรองรับได้</span>
                </div>
              </div>

              {/* Manager & Contact */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    ผู้รับผิดชอบ / หัวหน้าคลัง (Manager Name)
                  </label>
                  <input
                    type="text"
                    value={facilityForm.managerName}
                    onChange={(e) => setFacilityForm({ ...facilityForm, managerName: e.target.value })}
                    placeholder="e.g. สมชาย คลังใหญ่ (หัวหน้าคลัง A4)"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">
                    เบอร์ติดต่อภายใน (Phone Extension)
                  </label>
                  <input
                    type="text"
                    value={facilityForm.contactNumber}
                    onChange={(e) => setFacilityForm({ ...facilityForm, contactNumber: e.target.value })}
                    placeholder="e.g. 02-123-4567 ต่อ 401"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Description / Notes */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  หมายเหตุ / รายละเอียดสถานที่
                </label>
                <textarea
                  rows={2}
                  value={facilityForm.description}
                  onChange={(e) => setFacilityForm({ ...facilityForm, description: e.target.value })}
                  placeholder="e.g. อาคาร A4 สำหรับจัดเก็บชิ้นส่วนหลัก พร้อมทางเข้าออกรถโฟล์คลิฟต์ 2 ฝั่ง"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Status and Default Option */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-800/40 rounded-xl border border-slate-800">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-300">สถานะคลัง (Status):</label>
                  <select
                    value={facilityForm.status}
                    onChange={(e) => setFacilityForm({ ...facilityForm, status: e.target.value as any })}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="ACTIVE">🟢 เปิดใช้งานปกติ (ACTIVE)</option>
                    <option value="MAINTENANCE">🟡 กำลังซ่อมบำรุง (MAINTENANCE)</option>
                    <option value="INACTIVE">⚪ ปิดชั่วคราว (INACTIVE)</option>
                  </select>
                </div>

                <label className="flex items-center space-x-2 cursor-pointer text-xs font-medium text-slate-300">
                  <input
                    type="checkbox"
                    checked={facilityForm.isDefault}
                    onChange={(e) => setFacilityForm({ ...facilityForm, isDefault: e.target.checked })}
                    className="rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>ตั้งเป็นคลังเริ่มต้นหลักของระบบ (Default Warehouse)</span>
                </label>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition-colors flex items-center space-x-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingFacilityId ? 'บันทึกการเปลี่ยนแปลง' : 'ยืนยันลงทะเบียนสถานที่'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
