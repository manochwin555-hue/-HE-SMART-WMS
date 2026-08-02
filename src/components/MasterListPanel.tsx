import React, { useState } from 'react';
import { MasterDataItem, UseLineMaster, ZoneCapacityMaster, StorageZone } from '../types';
import { Settings, Save, Search, Plus, Edit2, Trash2, Factory, Database, Layers, Box } from 'lucide-react';

interface MasterListPanelProps {
  masterData: MasterDataItem[];
  setMasterData: React.Dispatch<React.SetStateAction<MasterDataItem[]>>;
  useLines: UseLineMaster[];
  setUseLines: React.Dispatch<React.SetStateAction<UseLineMaster[]>>;
  zoneCapacities: ZoneCapacityMaster[];
  setZoneCapacities: React.Dispatch<React.SetStateAction<ZoneCapacityMaster[]>>;
}

export const MasterListPanel: React.FC<MasterListPanelProps> = ({
  masterData,
  setMasterData,
  useLines,
  setUseLines,
  zoneCapacities,
  setZoneCapacities,
}) => {
  const [activeTab, setActiveTab] = useState<'ITEMS' | 'LINES' | 'ZONE_CAPACITY'>('ITEMS');
  
  // States for Master Item list
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<MasterDataItem | null>(null);

  // States for Use Lines list
  const [lineSearch, setLineSearch] = useState('');
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editLineForm, setEditLineForm] = useState<UseLineMaster | null>(null);

  // States for Zone Capacities list
  const [editingZone, setEditingZone] = useState<StorageZone | null>(null);
  const [editZoneForm, setEditZoneForm] = useState<ZoneCapacityMaster | null>(null);

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

  const handleSaveLine = () => {
    if (editLineForm) {
      const trimmedId = editLineForm.id.trim().toUpperCase();
      if (!trimmedId) {
        alert('กรุณากรอกรหัสไลน์ผลิต');
        return;
      }
      if (editingLineId === 'new') {
        if (useLines.some(l => l.id.toUpperCase() === trimmedId)) {
          alert('รหัสไลน์ผลิตนี้มีอยู่แล้วในระบบ');
          return;
        }
        setUseLines([...useLines, { ...editLineForm, id: trimmedId }]);
      } else {
        setUseLines(useLines.map(l => l.id === editingLineId ? { ...editLineForm, id: trimmedId } : l));
      }
      setEditingLineId(null);
      setEditLineForm(null);
    }
  };

  const handleDeleteLine = (id: string) => {
    if (confirm(`คุณต้องการลบไลน์ ${id} ใช่หรือไม่?`)) {
      setUseLines(useLines.filter(l => l.id !== id));
    }
  };

  const handleAddNewLine = () => {
    setEditingLineId('new');
    setEditLineForm({ id: '', name: '', description: '' });
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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full animate-fadeIn">
      {/* Header & Main Mode Tabs */}
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">ตั้งค่าข้อมูลหลัก (Master List & Capacity Settings)</h2>
              <p className="text-xs text-slate-500">
                จัดการรหัสวัตถุดิบ (Model HE), ไลน์ผลิต (Use Lines) และ ความจุมาตรฐานแต่ละ Zone (Standard Capacity Per Bay)
              </p>
            </div>
          </div>

          {/* Sub Tab Buttons */}
          <div className="flex bg-slate-200/80 p-1 rounded-lg border border-slate-300">
            <button
              onClick={() => setActiveTab('ITEMS')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                activeTab === 'ITEMS'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Master Items ({masterData.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('LINES')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                activeTab === 'LINES'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Factory className="w-3.5 h-3.5" />
              <span>ไลน์ผลิต ({useLines.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('ZONE_CAPACITY')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                activeTab === 'ZONE_CAPACITY'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>ความจุ Rack ราย Zone ({zoneCapacities.length})</span>
            </button>
          </div>
        </div>

        {/* Toolbar per tab */}
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

        {activeTab === 'ZONE_CAPACITY' && (
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Box className="w-4 h-4 text-purple-600" />
              <span>
                <strong>การตั้งค่า Standard Capacity Per Bay:</strong> กำหนดจำนวนพาเลทสูงสุดต่อ 1 Bay สำหรับ Rack ในแต่ละ Zone เพื่อนำไปคำนวณใน 3D Rack Inspector
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto flex-1">
        {activeTab === 'ITEMS' && (
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">รหัสวัตถุดิบ (Model HE / P/No)</th>
                <th className="px-6 py-3">ชื่อ Tool (Tool Name / Part Name)</th>
                <th className="px-6 py-3">มาตรฐานชิ้น / 1 พาเลทเต็ม</th>
                <th className="px-6 py-3">เกณฑ์ Safety Stock (Units)</th>
                <th className="px-6 py-3 text-right">จัดการ (Actions)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {editingId === 'new' && editForm && (
                <tr className="bg-blue-50/50">
                  <td className="px-6 py-4">
                    <input
                      type="text"
                      value={editForm.modelHE}
                      onChange={e => setEditForm({ ...editForm, modelHE: e.target.value })}
                      className="w-full px-2 py-1.5 border border-blue-300 rounded focus:outline-none focus:border-blue-500 font-mono text-sm uppercase"
                      placeholder="e.g. 1112..."
                      autoFocus
                    />
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="text"
                      value={editForm.partName}
                      onChange={e => setEditForm({ ...editForm, partName: e.target.value })}
                      className="w-full px-2 py-1.5 border border-blue-300 rounded focus:outline-none focus:border-blue-500 text-sm"
                      placeholder="e.g. SK 18FPI..."
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        value={editForm.stdQtyPerPallet ?? 80}
                        onChange={e => setEditForm({ ...editForm, stdQtyPerPallet: Math.max(1, Number(e.target.value)) })}
                        className="w-24 px-2 py-1.5 border border-blue-300 rounded focus:outline-none focus:border-blue-500 text-sm font-mono font-bold text-blue-700"
                      />
                      <span className="text-xs text-slate-500 font-medium">ตัว/Pallet</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="number"
                      value={editForm.safetyStock}
                      onChange={e => setEditForm({ ...editForm, safetyStock: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 border border-blue-300 rounded focus:outline-none focus:border-blue-500 text-sm font-mono"
                    />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button onClick={handleSave} className="p-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded">
                        <Save className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-xs text-slate-500 hover:text-slate-700 underline px-2">ยกเลิก</button>
                    </div>
                  </td>
                </tr>
              )}
              
              {filteredData.map(item => (
                <tr key={item.modelHE} className="hover:bg-slate-50/80 transition-colors">
                  {editingId === item.modelHE && editForm ? (
                    <>
                      <td className="px-6 py-4 font-mono font-bold text-slate-400 cursor-not-allowed">
                        {item.modelHE}
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={editForm.partName}
                          onChange={e => setEditForm({ ...editForm, partName: e.target.value })}
                          className="w-full px-2 py-1.5 border border-blue-300 rounded focus:outline-none focus:border-blue-500 text-sm"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-1">
                          <input
                            type="number"
                            value={editForm.stdQtyPerPallet ?? 80}
                            onChange={e => setEditForm({ ...editForm, stdQtyPerPallet: Math.max(1, Number(e.target.value)) })}
                            className="w-24 px-2 py-1.5 border border-blue-300 rounded focus:outline-none focus:border-blue-500 text-sm font-mono font-bold text-blue-700"
                          />
                          <span className="text-xs text-slate-500 font-medium">ตัว/Pallet</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          value={editForm.safetyStock}
                          onChange={e => setEditForm({ ...editForm, safetyStock: Number(e.target.value) })}
                          className="w-full px-2 py-1.5 border border-blue-300 rounded focus:outline-none focus:border-blue-500 text-sm font-mono"
                        />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button onClick={handleSave} className="p-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded">
                            <Save className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingId(null)} className="text-xs text-slate-500 hover:text-slate-700 underline px-2">ยกเลิก</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4 font-mono font-semibold text-blue-700">{item.modelHE}</td>
                      <td className="px-6 py-4 font-medium text-slate-800">{item.partName}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          📦 {item.stdQtyPerPallet || 80} ตัว / Pallet
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono">{item.safetyStock}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button onClick={() => handleEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="แก้ไข">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(item.modelHE)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="ลบรายการ">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}

              {filteredData.length === 0 && editingId !== 'new' && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    ไม่พบข้อมูล Master Item
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {activeTab === 'LINES' && (
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">รหัสไลน์ (Line Code)</th>
                <th className="px-6 py-3">ชื่อไลน์ผลิต (Use Line Name)</th>
                <th className="px-6 py-3">รายละเอียด / หมายเหตุ</th>
                <th className="px-6 py-3 text-right">จัดการ (Actions)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {editingLineId === 'new' && editLineForm && (
                <tr className="bg-emerald-50/50">
                  <td className="px-6 py-4">
                    <input
                      type="text"
                      value={editLineForm.id}
                      onChange={e => setEditLineForm({ ...editLineForm, id: e.target.value })}
                      className="w-full px-2 py-1.5 border border-emerald-300 rounded focus:outline-none focus:border-emerald-500 font-mono text-sm uppercase"
                      placeholder="e.g. HE4, LINE-A..."
                      autoFocus
                    />
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="text"
                      value={editLineForm.name}
                      onChange={e => setEditLineForm({ ...editLineForm, name: e.target.value })}
                      className="w-full px-2 py-1.5 border border-emerald-300 rounded focus:outline-none focus:border-emerald-500 text-sm"
                      placeholder="e.g. Line HE4..."
                    />
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="text"
                      value={editLineForm.description || ''}
                      onChange={e => setEditLineForm({ ...editLineForm, description: e.target.value })}
                      className="w-full px-2 py-1.5 border border-emerald-300 rounded focus:outline-none focus:border-emerald-500 text-sm"
                      placeholder="คำอธิบาย..."
                    />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button onClick={handleSaveLine} className="p-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded">
                        <Save className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingLineId(null)} className="text-xs text-slate-500 hover:text-slate-700 underline px-2">ยกเลิก</button>
                    </div>
                  </td>
                </tr>
              )}

              {filteredLines.map(line => (
                <tr key={line.id} className="hover:bg-slate-50/80 transition-colors">
                  {editingLineId === line.id && editLineForm ? (
                    <>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={editLineForm.id}
                          onChange={e => setEditLineForm({ ...editLineForm, id: e.target.value })}
                          className="w-full px-2 py-1.5 border border-emerald-300 rounded focus:outline-none focus:border-emerald-500 font-mono text-sm uppercase"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={editLineForm.name}
                          onChange={e => setEditLineForm({ ...editLineForm, name: e.target.value })}
                          className="w-full px-2 py-1.5 border border-emerald-300 rounded focus:outline-none focus:border-emerald-500 text-sm"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={editLineForm.description || ''}
                          onChange={e => setEditLineForm({ ...editLineForm, description: e.target.value })}
                          className="w-full px-2 py-1.5 border border-emerald-300 rounded focus:outline-none focus:border-emerald-500 text-sm"
                        />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button onClick={handleSaveLine} className="p-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded">
                            <Save className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingLineId(null)} className="text-xs text-slate-500 hover:text-slate-700 underline px-2">ยกเลิก</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4 font-mono font-bold text-indigo-700">{line.id}</td>
                      <td className="px-6 py-4 font-semibold text-slate-800">{line.name}</td>
                      <td className="px-6 py-4 text-xs text-slate-500">{line.description || '-'}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button onClick={() => handleEditLine(line)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="แก้ไข">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteLine(line.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="ลบรายการ">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}

              {filteredLines.length === 0 && editingLineId !== 'new' && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    ไม่พบข้อมูลไลน์ผลิต
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {activeTab === 'ZONE_CAPACITY' && (
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Storage Zone</th>
                <th className="px-6 py-3">ความจุมาตรฐาน (Standard Pallets / Bay)</th>
                <th className="px-6 py-3">มาตรฐานชิ้น / พาเลทเริ่มต้น (Default Qty/Pallet)</th>
                <th className="px-6 py-3">คำอธิบายรายละเอียด Zone</th>
                <th className="px-6 py-3 text-right">จัดการ (Actions)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {zoneCapacities.map(zc => (
                <tr key={zc.zone} className="hover:bg-slate-50/80 transition-colors">
                  {editingZone === zc.zone && editZoneForm ? (
                    <>
                      <td className="px-6 py-4 font-mono font-bold text-purple-700">
                        Zone {zc.zone}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            min="1"
                            value={editZoneForm.standardPalletsPerBay}
                            onChange={e => setEditZoneForm({ ...editZoneForm, standardPalletsPerBay: Math.max(1, Number(e.target.value)) })}
                            className="w-24 px-2 py-1.5 border border-purple-300 rounded focus:outline-none focus:border-purple-500 font-mono font-bold text-purple-800 text-sm"
                          />
                          <span className="text-xs text-slate-500 font-medium">Pallets / Bay</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            min="1"
                            value={editZoneForm.defaultStdQtyPerPallet}
                            onChange={e => setEditZoneForm({ ...editZoneForm, defaultStdQtyPerPallet: Math.max(1, Number(e.target.value)) })}
                            className="w-24 px-2 py-1.5 border border-purple-300 rounded focus:outline-none focus:border-purple-500 font-mono font-bold text-purple-800 text-sm"
                          />
                          <span className="text-xs text-slate-500 font-medium">ตัว / Pallet</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={editZoneForm.description || ''}
                          onChange={e => setEditZoneForm({ ...editZoneForm, description: e.target.value })}
                          className="w-full px-2 py-1.5 border border-purple-300 rounded focus:outline-none focus:border-purple-500 text-sm"
                        />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button onClick={handleSaveZone} className="p-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded">
                            <Save className="w-4 h-4" />
                          </button>
                          <button onClick={() => setEditingZone(null)} className="text-xs text-slate-500 hover:text-slate-700 underline px-2">ยกเลิก</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4 font-mono font-bold text-purple-800">
                        <span className="px-2.5 py-1 bg-purple-100 border border-purple-200 rounded-lg text-purple-900">
                          Zone {zc.zone}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-slate-800">
                        <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-slate-800">
                          📦 {zc.standardPalletsPerBay} Pallets / Bay
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono font-semibold text-blue-700">
                        {zc.defaultStdQtyPerPallet} ตัว / Pallet
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600">
                        {zc.description || `- Rack จัดเก็บ Zone ${zc.zone}`}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleEditZone(zc)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="แก้ไขความจุ">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
