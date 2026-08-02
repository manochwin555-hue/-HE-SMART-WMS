import React, { useState } from 'react';
import { MovementLog, StorageZone } from '../types';
import { 
  ListFilter, 
  Search, 
  Download, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Layers, 
  ArrowDownRight, 
  ArrowUpRight,
  Filter
} from 'lucide-react';

interface MovementLogsTableProps {
  logs: MovementLog[];
  onOpen3DForLocator: (zone: StorageZone, bayNumber: number) => void;
}

export const MovementLogsTable: React.FC<MovementLogsTableProps> = ({
  logs,
  onOpen3DForLocator,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [zoneFilter, setZoneFilter] = useState<string>('ALL');
  const [lineFilter, setLineFilter] = useState<string>('ALL');
  const [gapFilter, setGapFilter] = useState<string>('ALL');

  // Filter logs logic
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.scanInput.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.modelHE.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.locatorCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.useLine.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || log.scanStatus === statusFilter;
    const matchesType = typeFilter === 'ALL' || log.type === typeFilter;
    const matchesLine = lineFilter === 'ALL' || log.useLine === lineFilter;

    // Check Zone matching from locator code or string
    const matchesZone = zoneFilter === 'ALL' || log.locatorCode.includes(`-${zoneFilter}`) || log.locatorCode.startsWith(zoneFilter);

    // Check Gap Discrepancy
    const matchesGap =
      gapFilter === 'ALL' ||
      (gapFilter === 'MATCH' && log.qtyGap === 0) ||
      (gapFilter === 'DISCREPANCY' && log.qtyGap !== 0);

    return matchesSearch && matchesStatus && matchesType && matchesLine && matchesZone && matchesGap;
  });

  // Export to Excel / CSV Function with UTF-8 BOM for Excel compatibility
  const handleExportCSV = (filenameFormat: string = 'Excel') => {
    const headers = [
      'Scan Input QR Tag',
      'Movement Type',
      'Model HE',
      'Locator Code',
      'Quantity Check',
      'Actual Qty',
      'Quantity Gap',
      'Balance Qty',
      'Use Line',
      'Scan Status',
      'Created On Date Time'
    ];

    const rows = filteredLogs.map((l) => [
      `"${l.scanInput}"`,
      l.type,
      l.modelHE,
      l.locatorCode,
      l.quantityCheck,
      l.actualQty,
      l.qtyGap,
      l.balanceQty,
      l.useLine,
      l.scanStatus,
      `"${l.createdOn}"`
    ]);

    // UTF-8 BOM (\uFEFF) ensures Thai characters render properly in Microsoft Excel
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('download', `WMS_Movement_Logs_${filenameFormat}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to parse zone, bay & level from locator string e.g. "DA4D-1.02-B11-L1"
  const parseLocator = (loc: string): { zone: StorageZone; bay: number; level: string } | null => {
    const parts = loc.split('-');
    if (parts.length >= 3) {
      const code = parts[2]; // e.g. "B11" or "E6"
      const zoneMatch = code.charAt(0) as StorageZone;
      const bayMatch = parseInt(code.substring(1), 10);
      const levelMatch = parts[3] ? parts[3].replace(/^L/i, '') : '1';
      if (zoneMatch && !isNaN(bayMatch)) {
        return { zone: zoneMatch, bay: bayMatch, level: levelMatch };
      }
    }
    return null;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm text-slate-900 space-y-4">
      {/* Table Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <ListFilter className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-800">
              ประวัติการสแกนรับเข้า - เบิกออก (Scan Movement Logs)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            บันทึกประวัติยิงบาร์โค้ด QR ล่าสุด แก้ไขปัญหา <span className="text-amber-700 font-mono font-bold">#BAD_EXPR</span> เดิมของระบบ Odoo
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleExportCSV('Excel')}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center space-x-1.5 transition-all"
          >
            <Download className="w-4 h-4 text-white" />
            <span>ส่งออก Excel (.csv)</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาตาม Model, Locator, Scan Code..."
              className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm"
            />
          </div>

          {/* Status Filter */}
          <div className="flex bg-slate-200/80 p-1 rounded-lg border border-slate-200 text-xs">
            {['ALL', 'DONE', 'WAIT_QR'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`flex-1 py-1 rounded-md font-medium transition-all ${
                  statusFilter === st ? 'bg-blue-600 text-white shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'ALL' ? 'ทุกสถานะ' : st === 'DONE' ? 'เสร็จสิ้น (DONE)' : 'รอ QR'}
              </button>
            ))}
          </div>

          {/* Movement Type Filter */}
          <div className="flex bg-slate-200/80 p-1 rounded-lg border border-slate-200 text-xs">
            {['ALL', 'IN', 'OUT'].map((tp) => (
              <button
                key={tp}
                onClick={() => setTypeFilter(tp)}
                className={`flex-1 py-1 rounded-md font-medium transition-all ${
                  typeFilter === tp ? 'bg-blue-600 text-white shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tp === 'ALL' ? 'ทั้ง IN/OUT' : tp === 'IN' ? 'รับเข้า (IN)' : 'เบิกออก (OUT)'}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Dropdowns: Zone, Line, Gap Discrepancy */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Zone Filter */}
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500 font-medium">Zone:</span>
              <select
                value={zoneFilter}
                onChange={(e) => setZoneFilter(e.target.value)}
                className="bg-white border border-slate-300 text-slate-800 font-bold px-2 py-1 rounded-lg focus:outline-none focus:border-blue-500 shadow-sm"
              >
                <option value="ALL">ทุก Zone (B-K)</option>
                {(['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'] as StorageZone[]).map((z) => (
                  <option key={z} value={z}>Zone {z}</option>
                ))}
              </select>
            </div>

            {/* Line Filter */}
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500 font-medium">Line:</span>
              <select
                value={lineFilter}
                onChange={(e) => setLineFilter(e.target.value)}
                className="bg-white border border-slate-300 text-slate-800 font-bold px-2 py-1 rounded-lg focus:outline-none focus:border-blue-500 shadow-sm"
              >
                <option value="ALL">ทุก Line (HE1-3)</option>
                <option value="HE1">Line HE1</option>
                <option value="HE2">Line HE2</option>
                <option value="HE3">Line HE3</option>
              </select>
            </div>

            {/* Gap Filter */}
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500 font-medium">ผลต่างจำนวน (Gap):</span>
              <select
                value={gapFilter}
                onChange={(e) => setGapFilter(e.target.value)}
                className="bg-white border border-slate-300 text-slate-800 font-bold px-2 py-1 rounded-lg focus:outline-none focus:border-blue-500 shadow-sm"
              >
                <option value="ALL">ทั้งหมด (Gap)</option>
                <option value="MATCH">ตรงตามป้าย (Gap = 0)</option>
                <option value="DISCREPANCY">มีผลต่าง (Gap ≠ 0)</option>
              </select>
            </div>
          </div>

          {(searchTerm || statusFilter !== 'ALL' || typeFilter !== 'ALL' || zoneFilter !== 'ALL' || lineFilter !== 'ALL' || gapFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('ALL');
                setTypeFilter('ALL');
                setZoneFilter('ALL');
                setLineFilter('ALL');
                setGapFilter('ALL');
              }}
              className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-[11px] transition-all"
            >
              ล้างตัวกรอง
            </button>
          )}
        </div>
      </div>

      {/* Logs Data Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] border-b border-slate-200">
            <tr>
              <th className="px-3.5 py-3">ประเภท</th>
              <th className="px-3.5 py-3">Scan Input (QR String)</th>
              <th className="px-3.5 py-3">Model HE</th>
              <th className="px-3.5 py-3">ตำแหน่ง (Rack & ชั้น)</th>
              <th className="px-3.5 py-3 text-right">Qty Check</th>
              <th className="px-3.5 py-3 text-right">Actual Qty</th>
              <th className="px-3.5 py-3 text-right">Gap</th>
              <th className="px-3.5 py-3 text-right">Balance Qty</th>
              <th className="px-3.5 py-3">Line</th>
              <th className="px-3.5 py-3">สถานะ (Status)</th>
              <th className="px-3.5 py-3 text-center">ส่อง 3D</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => {
                const locInfo = parseLocator(log.locatorCode);

                return (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    {/* Type IN / OUT */}
                    <td className="px-3.5 py-2.5">
                      {log.type === 'IN' ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-extrabold border border-emerald-200 text-[10px]">
                          <ArrowDownRight className="w-3 h-3 text-emerald-600" />
                          <span>รับเข้า IN</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-sky-50 text-sky-700 font-extrabold border border-sky-200 text-[10px]">
                          <ArrowUpRight className="w-3 h-3 text-sky-600" />
                          <span>เบิกออก OUT</span>
                        </span>
                      )}
                    </td>

                    {/* Scan Input */}
                    <td className="px-3.5 py-2.5 font-mono text-[11px] text-blue-700 font-semibold max-w-xs truncate">
                      {log.scanInput}
                    </td>

                    {/* Model HE */}
                    <td className="px-3.5 py-2.5 font-mono font-bold text-slate-900">
                      {log.modelHE}
                    </td>

                    {/* Locator - Separated Rack & Level */}
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-extrabold text-[10px] border border-blue-200">
                          Rack {locInfo ? `${locInfo.zone}${locInfo.bay}` : log.locatorCode}
                        </span>
                        {locInfo && (
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-extrabold text-[10px] border border-amber-200">
                            ชั้น {locInfo.level}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {log.locatorCode}
                      </div>
                    </td>

                    {/* Quantities */}
                    <td className="px-3.5 py-2.5 text-right font-mono font-bold text-slate-800">
                      {log.quantityCheck}
                    </td>

                    <td className="px-3.5 py-2.5 text-right font-mono font-bold text-emerald-600">
                      {log.actualQty}
                    </td>

                    <td className={`px-3.5 py-2.5 text-right font-mono font-bold ${log.qtyGap !== 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                      {log.qtyGap}
                    </td>

                    <td className="px-3.5 py-2.5 text-right font-mono font-extrabold text-slate-900">
                      {log.balanceQty}
                    </td>

                    {/* Line */}
                    <td className="px-3.5 py-2.5">
                      <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold text-[10px] border border-indigo-200">
                        {log.useLine}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-3.5 py-2.5">
                      {log.scanStatus === 'DONE' ? (
                        <span className="inline-flex items-center space-x-1 text-emerald-600 text-[11px] font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>DONE | เสร็จสิ้น</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-amber-600 text-[11px] font-bold">
                          <Clock className="w-3.5 h-3.5" />
                          <span>WAIT QR | รอสแกน</span>
                        </span>
                      )}
                    </td>

                    {/* 3D Action */}
                    <td className="px-3.5 py-2.5 text-center">
                      {locInfo ? (
                        <button
                          onClick={() => onOpen3DForLocator(locInfo.zone, locInfo.bay)}
                          className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-all border border-blue-200 inline-flex items-center justify-center"
                          title="ส่องช่องนี้ในรูปแบบ 3D"
                        >
                          <Layers className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[10px]">-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={11} className="py-8 text-center text-slate-500 font-medium">
                  ไม่พบรายการสแกนตรงกับเงื่อนไขการค้นหา
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
