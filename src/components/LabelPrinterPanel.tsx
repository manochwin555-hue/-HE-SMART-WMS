import React, { useState } from 'react';
import { Printer, Download, QrCode, Layers, Grid, CheckCircle2, RefreshCw } from 'lucide-react';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';

export const LabelPrinterPanel: React.FC = () => {
  const [mode, setMode] = useState<'SINGLE' | 'BATCH'>('SINGLE');

  // Single Label State
  const [zone, setZone] = useState('E');
  const [bay, setBay] = useState<number>(6);
  const [level, setLevel] = useState<number>(4);
  const [copies, setCopies] = useState<number>(1);
  const [isPrinting, setIsPrinting] = useState(false);

  // Batch Generator State
  const [batchZone, setBatchZone] = useState('E');
  const [startBay, setStartBay] = useState<number>(1);
  const [endBay, setEndBay] = useState<number>(12);
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<number | 'ALL'>('ALL');

  // Helper for Building/Rack Code
  const getBuildingCode = (z: string) => {
    if (['B', 'C', 'D'].includes(z)) return 'DA4D-1.02';
    if (['E', 'F'].includes(z)) return 'DA4D-1.05';
    return 'DA4D-1.06'; // default for G-K
  };

  const buildingCode = getBuildingCode(zone);
  const locatorCode = `${buildingCode}-${zone}${bay}-L${level}`;

  // Download PNG for a single canvas
  const handleDownloadPNG = (code: string, customCanvasId?: string) => {
    const canvasId = customCanvasId || `qr-canvas-${code}`;
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      alert('ไม่พบ Canvas รูปภาพ QR Code');
      return;
    }
    const link = document.createElement('a');
    link.download = `QR_Location_${code}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 400);
  };

  // Generate batch items list
  const getBatchItems = () => {
    const items: { zone: string; bay: number; level: number; locatorCode: string; locationLabel: string }[] = [];
    const bCode = getBuildingCode(batchZone);
    const maxB = ['G', 'H', 'I', 'J', 'K'].includes(batchZone) ? Math.min(endBay, 5) : Math.min(endBay, 12);
    const minB = Math.max(startBay, 1);

    const levelsToInclude = selectedLevelFilter === 'ALL' ? [1, 2, 3, 4] : [selectedLevelFilter];

    for (let b = minB; b <= maxB; b++) {
      for (const l of levelsToInclude) {
        items.push({
          zone: batchZone,
          bay: b,
          level: l,
          locationLabel: `${batchZone}${b}-L${l}`,
          locatorCode: `${bCode}-${batchZone}${b}-L${l}`,
        });
      }
    }
    return items;
  };

  const batchList = getBatchItems();

  // Batch download all PNGs sequentially
  const handleDownloadAllBatchPNG = () => {
    if (batchList.length === 0) return;
    let delay = 0;
    batchList.forEach((item) => {
      setTimeout(() => {
        handleDownloadPNG(item.locatorCode, `qr-batch-canvas-${item.locatorCode}`);
      }, delay);
      delay += 250; // stagger downloads so browser allows them
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fadeIn w-full min-w-0 max-w-full">
      {/* Top Banner & Mode Toggle */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-5 lg:p-6 shadow-sm print:hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 sm:pb-4 border-b border-slate-100 gap-3 sm:gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
              <Printer className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">ระบบพิมพ์ & ดาวน์โหลดป้าย QR Code ตำแหน่ง Rack</h2>
              <p className="text-xs text-slate-500">
                สร้างบาร์โค้ด QR Code สำหรับติดป้ายชั้นวางสินค้า (Shelves / Racks) รองรับการดาวน์โหลดไฟล์ PNG และพิมพ์ป้ายสติ๊กเกอร์
              </p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setMode('SINGLE')}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-md font-bold transition-all ${
                mode === 'SINGLE' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>พิมพ์ป้ายเดี่ยว (Single Location)</span>
            </button>
            <button
              onClick={() => setMode('BATCH')}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-md font-bold transition-all ${
                mode === 'BATCH' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid className="w-4 h-4" />
              <span>สร้างป้ายยกชุด (Batch Range)</span>
            </button>
          </div>
        </div>

        {/* Mode 1: Single Location QR Generator */}
        {mode === 'SINGLE' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
            {/* Controls */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Zone (โซนจัดเก็บ)
                </label>
                <select
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                >
                  {['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'].map((z) => (
                    <option key={z} value={z}>
                      Zone {z}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bay (ช่อง)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={['G', 'H', 'I', 'J', 'K'].includes(zone) ? 5 : 12}
                    value={bay}
                    onChange={(e) => setBay(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Level (ชั้น 1-4)
                  </label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                  >
                    <option value={1}>ชั้น 1 (L1 Ground)</option>
                    <option value={2}>ชั้น 2 (L2 Heavy)</option>
                    <option value={3}>ชั้น 3 (L3 Standard)</option>
                    <option value={4}>ชั้น 4 (L4 Top)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  จำนวนชุดพิมพ์ (Copies)
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={copies}
                  onChange={(e) => setCopies(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => handleDownloadPNG(locatorCode, 'single-qr-canvas')}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>ดาวน์โหลดรูป QR (.PNG)</span>
                </button>

                <button
                  onClick={handlePrint}
                  disabled={isPrinting}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <Printer className="w-4 h-4" />
                  <span>สั่งพิมพ์ป้าย (Print Label)</span>
                </button>
              </div>
            </div>

            {/* Live Preview Panel */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 flex flex-col items-center justify-center min-h-[320px]">
              <h3 className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider">
                ตัวอย่างป้าย QR Code (Label Preview)
              </h3>

              {/* Simulated Label Boundary */}
              <div className="bg-white p-5 shadow-md border-2 border-slate-800 rounded-xl w-full max-w-xs flex flex-col items-center justify-center space-y-3">
                <div className="bg-slate-900 text-white px-4 py-1 rounded-md text-2xl font-black tracking-tight">
                  {zone}{bay}-L{level}
                </div>

                {/* Visible Canvas used for PNG Export */}
                <div className="p-2 border-2 border-slate-200 rounded-lg bg-white inline-block">
                  <QRCodeCanvas
                    id="single-qr-canvas"
                    value={locatorCode}
                    size={170}
                    level="H"
                    includeMargin={true}
                  />
                </div>

                <div className="text-center">
                  <p className="text-xs font-bold text-slate-500 uppercase">Rack Location Code</p>
                  <p className="text-sm font-mono font-black text-slate-900">{locatorCode}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mode 2: Batch Range QR Generator */}
        {mode === 'BATCH' && (
          <div className="pt-6 space-y-6">
            {/* Controls Header */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">โซน (Zone)</label>
                <select
                  value={batchZone}
                  onChange={(e) => setBatchZone(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold"
                >
                  {['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'].map((z) => (
                    <option key={z} value={z}>
                      Zone {z}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ช่วงช่อง (Bay Start - End)</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={startBay}
                    onChange={(e) => setStartBay(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold text-center"
                  />
                  <span className="text-slate-400 font-bold">-</span>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={endBay}
                    onChange={(e) => setEndBay(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">กรองชั้น (Level)</label>
                <select
                  value={selectedLevelFilter}
                  onChange={(e) =>
                    setSelectedLevelFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold"
                >
                  <option value="ALL">ทุกชั้น (ชั้น 1 - 4)</option>
                  <option value={1}>เฉพาะ ชั้น 1 (L1)</option>
                  <option value={2}>เฉพาะ ชั้น 2 (L2)</option>
                  <option value={3}>เฉพาะ ชั้น 3 (L3)</option>
                  <option value={4}>เฉพาะ ชั้น 4 (L4)</option>
                </select>
              </div>

              <div className="flex items-end gap-2">
                <button
                  onClick={handleDownloadAllBatchPNG}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow transition-colors flex items-center justify-center space-x-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ดาวน์โหลด PNG ทั้งหมด</span>
                </button>
                <button
                  onClick={handlePrint}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow transition-colors flex items-center justify-center space-x-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>สั่งพิมพ์ทั้งหมด</span>
                </button>
              </div>
            </div>

            {/* Generated Grid Preview */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-700">
                  รายการป้ายทั้งหมด ({batchList.length} ตำแหน่ง)
                </span>
                <span className="text-xs text-slate-500">
                  คลิกปุ่มดาวน์โหลดแต่ละป้ายเพื่อเซฟไฟล์ภาพ .PNG ได้ทันที
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {batchList.map((item) => (
                  <div
                    key={item.locatorCode}
                    className="bg-white border border-slate-300 rounded-xl p-3 flex flex-col items-center justify-between shadow-sm hover:border-blue-500 transition-all space-y-2"
                  >
                    <div className="bg-slate-800 text-white font-black text-xs px-2.5 py-0.5 rounded text-center w-full">
                      {item.locationLabel}
                    </div>

                    <div className="p-1 bg-white border border-slate-200 rounded">
                      <QRCodeCanvas
                        id={`qr-batch-canvas-${item.locatorCode}`}
                        value={item.locatorCode}
                        size={110}
                        level="H"
                        includeMargin={true}
                      />
                    </div>

                    <p className="text-[10px] font-mono font-bold text-slate-700 text-center truncate w-full">
                      {item.locatorCode}
                    </p>

                    <button
                      onClick={() => handleDownloadPNG(item.locatorCode, `qr-batch-canvas-${item.locatorCode}`)}
                      className="w-full py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 text-slate-700 font-bold text-[10px] rounded flex items-center justify-center space-x-1 transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      <span>โหลด PNG</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actual Print Content (Visible only during window.print()) */}
      <div className="hidden print:block">
        {mode === 'SINGLE' ? (
          Array.from({ length: copies }).map((_, idx) => (
            <div
              key={idx}
              className="print-label-container w-[10cm] h-[7.5cm] flex flex-col items-center justify-center bg-white p-4 box-border page-break-after"
            >
              <h1 className="text-5xl font-black text-black tracking-tighter mb-3 text-center">
                {zone}{bay}-L{level}
              </h1>
              <div className="mb-3">
                <QRCodeSVG value={locatorCode} size={180} level="H" includeMargin={false} />
              </div>
              <p className="text-xl font-mono font-bold text-black text-center">{locatorCode}</p>
            </div>
          ))
        ) : (
          batchList.map((item) => (
            <div
              key={item.locatorCode}
              className="print-label-container w-[10cm] h-[7.5cm] flex flex-col items-center justify-center bg-white p-4 box-border page-break-after"
            >
              <h1 className="text-5xl font-black text-black tracking-tighter mb-3 text-center">
                {item.locationLabel}
              </h1>
              <div className="mb-3">
                <QRCodeSVG value={item.locatorCode} size={180} level="H" includeMargin={false} />
              </div>
              <p className="text-xl font-mono font-bold text-black text-center">{item.locatorCode}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
