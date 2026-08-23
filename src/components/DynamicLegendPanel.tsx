import React, { useState } from 'react';
import { 
  Info, 
  ChevronDown, 
  ChevronUp, 
  Layers, 
  LayoutGrid, 
  GitCommit, 
  Tent, 
  HelpCircle, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Sparkles,
  Search,
  ArrowRight,
  MapPin,
  Flame
} from 'lucide-react';

export const DynamicLegendPanel: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [activeSector, setActiveSector] = useState<'ALL' | 'RACK' | 'FLOOR' | 'FLOW_RAIL' | 'TENT'>('ALL');
  const [testLocatorInput, setTestLocatorInput] = useState<string>('DA4D-2.01-D02-L1');

  // Realtime decoder for interactive locator tester
  const decodeLocator = (code: string) => {
    const clean = code.trim().toUpperCase();
    
    // Pattern 1: Selective Rack (e.g. DA4D-2.01-D02-L1 or DA4D-1.05-E6-L3)
    if (clean.includes('DA4D-2') || clean.includes('DA4D-3') || (clean.startsWith('DA4D-') && clean.includes('-L'))) {
      const parts = clean.split('-');
      const building = 'อาคาร A4 (คลังหลัก)';
      const subZone = clean.includes('DA4D-2') ? 'DA4D-2 (Zone B-F 480P)' : clean.includes('DA4D-3') ? 'DA4D-3 (Zone G-K 200P)' : 'Rack Zone';
      const bayPart = parts[2] || parts[1] || '';
      const levelPart = parts[3] || parts[2] || '';
      return {
        type: 'RACK',
        valid: true,
        building,
        area: subZone,
        details: `ชั้นวาง Selective Rack 4 ชั้น • แถว/ช่อง: ${bayPart} • ชั้นความสูง: ${levelPart}`,
        formula: '[อาคาร DA4D] - [โซนแร็ค] - [แถว+ช่อง Bay] - [ชั้น L1-L4]'
      };
    }

    // Pattern 2: Floor Staging (e.g. DA4D-1.01-X1-R01-01)
    if (clean.includes('DA4D-1') || clean.includes('X1') || clean.includes('X2') || clean.includes('X3') || clean.includes('X4') || clean.includes('X5') || clean.includes('X6') || clean.includes('X7') || clean.includes('X8')) {
      return {
        type: 'FLOOR_STAGING',
        valid: true,
        building: 'อาคาร A4 (คลังหลัก)',
        area: 'DA4D-1 (ลานวางพื้นสีเหลือง 432P)',
        details: `ลานจัดวางบนพื้น 1:1 (1 ช่อง = 1 พาเลท) • กลุ่ม ${clean}`,
        formula: '[อาคาร DA4D] - [โซนพื้น 1.01] - [กลุ่ม X1-X8] - [แถว R01-R48] - [คอลัมน์ 01-12]'
      };
    }

    // Pattern 3: Flow Rail (e.g. DA2D-1.01-R01-01 or DA2D-1-R3-02)
    if (clean.includes('DA2D') || clean.startsWith('R') || clean.startsWith('FR')) {
      return {
        type: 'FLOW_RAIL',
        valid: true,
        building: 'อาคาร A2 (เตรียมชิ้นส่วนเข้าไลน์)',
        area: 'DA2D-1 (รางเลื่อนลูกกลิ้ง 20 ราง 160P)',
        details: `ระบบรางลูกกลิ้งสไลด์ FIFO • เข้าไลน์ประกอบ HE1-3`,
        formula: '[อาคาร DA2D] - [โซนราง 1.01] - [หมายเลขราง R01-R20] - [ตำแหน่งลูกกลิ้ง 01-08]'
      };
    }

    // Pattern 4: Tent (e.g. DA5T-1.01-01-R1-01)
    if (clean.includes('DA5T') || clean.includes('TENT') || clean.startsWith('T1') || clean.startsWith('T2') || clean.startsWith('T3') || clean.startsWith('T4')) {
      return {
        type: 'TENT',
        valid: true,
        building: 'พื้นที่เต็นท์ A5 (Outdoor Tent Yard)',
        area: 'เต็นท์จัดเก็บภายนอก (4 หลัง 784P)',
        details: `เต็นท์ผ้าใบโครงเหล็ก • 7 กลุ่มคอลัมน์ (01-07) x 28 ช่อง`,
        formula: '[อาคารเต็นท์ DA5T] - [เต็นท์ 1-4] - [กลุ่ม 01-07] - [แถว R1-R4] - [คอลัมน์ 01-07]'
      };
    }

    return {
      type: 'UNKNOWN',
      valid: false,
      building: 'ไม่พบรูปแบบที่ระบุ',
      area: 'รูปแบบไม่ตรงกับมาตรฐาน 4 โซน',
      details: 'โปรดตรวจสอบรหัสตำแหน่ง หรือเลือกรหัสตัวอย่างด้านล่าง',
      formula: 'DA4D-2.01-B01-L1 / DA4D-1.01-X1-R01-01 / DA2D-1.01-R01-01 / DA5T-1.01-01-R1-01'
    };
  };

  const decodedResult = decodeLocator(testLocatorInput);

  return (
    <div className="bg-slate-900 text-white rounded-2xl border-2 border-slate-800 shadow-xl overflow-hidden transition-all duration-300">
      
      {/* HEADER BAR */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-3.5 sm:p-4 bg-slate-800/90 hover:bg-slate-800 flex items-center justify-between cursor-pointer border-b border-slate-700 select-none"
      >
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-xs">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xs sm:text-sm font-black text-white">
                📘 Dynamic Legend &amp; Naming Conventions Guide
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                คู่มือโค้ดสี &amp; รูปแบบรหัสตำแหน่ง
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              คำอธิบายสัญลักษณ์ สี และโครงสร้างรหัสพิกัดจัดเก็บทั้ง 4 โซน (Rack, Floor, Flow Rail, Tent)
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <span className="text-[11px] hidden md:inline font-medium">{isExpanded ? 'ย่อแผงคู่มือ' : 'ขยายดูคู่มือ'}</span>
          <div className="p-1 rounded-md bg-slate-700 text-slate-200">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {/* EXPANDED CONTENT */}
      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-5 text-xs">
          
          {/* SECTOR SWITCHER TABS */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setActiveSector('ALL')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeSector === 'ALL'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                ดูทุกโซน (All Sectors)
              </button>
              <button
                onClick={() => setActiveSector('RACK')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center space-x-1 transition-all ${
                  activeSector === 'RACK'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span>แร็คสูง DA4D-2/3 (680P)</span>
              </button>
              <button
                onClick={() => setActiveSector('FLOOR')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center space-x-1 transition-all ${
                  activeSector === 'FLOOR'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
                <span>วางพื้น DA4D-1 (432P)</span>
              </button>
              <button
                onClick={() => setActiveSector('FLOW_RAIL')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center space-x-1 transition-all ${
                  activeSector === 'FLOW_RAIL'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <GitCommit className="w-3.5 h-3.5 text-rose-400" />
                <span>รางเลื่อน DA2D-1 (160P)</span>
              </button>
              <button
                onClick={() => setActiveSector('TENT')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center space-x-1 transition-all ${
                  activeSector === 'TENT'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Tent className="w-3.5 h-3.5 text-emerald-400" />
                <span>เต็นท์นอก A5 (784P)</span>
              </button>
            </div>
            
            <span className="text-[11px] font-mono text-slate-400">
              รวมความจุแคมปัส: <strong>2,056 พาเลท</strong>
            </span>
          </div>

          {/* 1. COLOR CODING EXPLANATION GRID */}
          <div className="space-y-2">
            <h4 className="text-xs font-black text-slate-300 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span>ความหมายของโค้ดสี (Color Coding Guide)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              
              {/* Color 1: Empty */}
              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex items-start space-x-2.5">
                <div className="w-5 h-5 rounded-md border-2 border-dashed border-slate-400 bg-slate-900 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white">ช่องว่าง (Empty Slot)</div>
                  <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                    ตำแหน่งพร้อมรับพาเลทเข้า (Scan IN)
                  </div>
                </div>
              </div>

              {/* Color 2: Stored Normal */}
              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex items-start space-x-2.5">
                <div className="w-5 h-5 rounded-md bg-blue-600 border border-blue-400 shadow-xs shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white">จัดเก็บปกติ (Normal Stored)</div>
                  <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                    มีชิ้นส่วนจัดเก็บ อายุจัดเก็บยังอยู่ในเกณฑ์ดี (&le;30 วัน)
                  </div>
                </div>
              </div>

              {/* Color 3: Aging Warning */}
              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex items-start space-x-2.5">
                <div className="w-5 h-5 rounded-md bg-amber-500 border border-amber-300 shadow-xs shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-amber-300">เตือน Aging (&gt;30 วัน)</div>
                  <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                    ชิ้นส่วนเริ่มค้างสต็อก ควรหยิบใช้งานแบบ FIFO
                  </div>
                </div>
              </div>

              {/* Color 4: Critical Sample / Red */}
              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex items-start space-x-2.5">
                <div className="w-5 h-5 rounded-md bg-rose-600 border border-rose-400 shadow-xs shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <div className="font-bold text-rose-300">ตัวอย่างพิเศษ (Sample / Urgent)</div>
                  <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                    จุดมาร์กตัวอย่างตามผังโรงงาน (เช่น D2-L1, R3-02)
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* 2. NAMING CONVENTIONS BY SECTOR */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h4 className="text-xs font-black text-slate-300 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>โครงสร้างรูปแบบรหัสตำแหน่งแต่ละโซน (Locator Naming Conventions)</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              
              {/* Rack Locator Scheme */}
              {(activeSector === 'ALL' || activeSector === 'RACK') && (
                <div className="bg-slate-950/90 p-3.5 rounded-xl border border-blue-500/40 space-y-2">
                  <div className="flex items-center justify-between text-blue-300 font-bold">
                    <span className="flex items-center space-x-1.5">
                      <Layers className="w-4 h-4 text-blue-400" />
                      <span>1. โซน Selective Rack (DA4D-2 &amp; DA4D-3)</span>
                    </span>
                    <span className="text-[10px] font-mono bg-blue-900/60 px-2 py-0.5 rounded border border-blue-700 text-blue-200">
                      680 พาเลท
                    </span>
                  </div>

                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono text-center">
                    <span className="text-blue-400 font-black text-sm">DA4D-2.01-B01-L1</span>
                  </div>

                  <div className="grid grid-cols-4 gap-1 text-[10px] text-center">
                    <div className="bg-slate-800 p-1.5 rounded">
                      <div className="font-bold text-blue-300">DA4D</div>
                      <div className="text-[9px] text-slate-400">อาคาร A4</div>
                    </div>
                    <div className="bg-slate-800 p-1.5 rounded">
                      <div className="font-bold text-blue-300">2.01</div>
                      <div className="text-[9px] text-slate-400">แร็ค DA4D-2</div>
                    </div>
                    <div className="bg-slate-800 p-1.5 rounded">
                      <div className="font-bold text-blue-300">B01</div>
                      <div className="text-[9px] text-slate-400">แถว B ช่อง 01</div>
                    </div>
                    <div className="bg-slate-800 p-1.5 rounded">
                      <div className="font-bold text-blue-300">L1</div>
                      <div className="text-[9px] text-slate-400">ชั้น L1 ถึง L4</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Floor Staging Scheme */}
              {(activeSector === 'ALL' || activeSector === 'FLOOR') && (
                <div className="bg-slate-950/90 p-3.5 rounded-xl border border-amber-500/40 space-y-2">
                  <div className="flex items-center justify-between text-amber-300 font-bold">
                    <span className="flex items-center space-x-1.5">
                      <LayoutGrid className="w-4 h-4 text-amber-400" />
                      <span>2. โซนจัดวางพื้นสีเหลือง (DA4D-1 Floor Staging)</span>
                    </span>
                    <span className="text-[10px] font-mono bg-amber-900/60 px-2 py-0.5 rounded border border-amber-700 text-amber-200">
                      432 พาเลท
                    </span>
                  </div>

                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono text-center">
                    <span className="text-amber-400 font-black text-sm">DA4D-1.01-X1-R01-01</span>
                  </div>

                  <div className="grid grid-cols-5 gap-1 text-[10px] text-center">
                    <div className="bg-slate-800 p-1.5 rounded">
                      <div className="font-bold text-amber-300">DA4D</div>
                      <div className="text-[9px] text-slate-400">อาคาร A4</div>
                    </div>
                    <div className="bg-slate-800 p-1.5 rounded">
                      <div className="font-bold text-amber-300">1.01</div>
                      <div className="text-[9px] text-slate-400">ลานวางพื้น</div>
                    </div>
                    <div className="bg-slate-800 p-1.5 rounded">
                      <div className="font-bold text-amber-300">X1</div>
                      <div className="text-[9px] text-slate-400">กลุ่ม X1-X8</div>
                    </div>
                    <div className="bg-slate-800 p-1.5 rounded">
                      <div className="font-bold text-amber-300">R01</div>
                      <div className="text-[9px] text-slate-400">แถว R01-R48</div>
                    </div>
                    <div className="bg-slate-800 p-1.5 rounded">
                      <div className="font-bold text-amber-300">01</div>
                      <div className="text-[9px] text-slate-400">คอลัมน์ 01-12</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Flow Rail Scheme */}
              {(activeSector === 'ALL' || activeSector === 'FLOW_RAIL') && (
                <div className="bg-slate-950/90 p-3.5 rounded-xl border border-rose-500/40 space-y-2">
                  <div className="flex items-center justify-between text-rose-300 font-bold">
                    <span className="flex items-center space-x-1.5">
                      <GitCommit className="w-4 h-4 text-rose-400" />
                      <span>3. โซนรางเลื่อนลูกกลิ้ง FIFO (DA2D-1 Flow Rail)</span>
                    </span>
                    <span className="text-[10px] font-mono bg-rose-900/60 px-2 py-0.5 rounded border border-rose-700 text-rose-200">
                      160 พาเลท
                    </span>
                  </div>

                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono text-center">
                    <span className="text-rose-400 font-black text-sm">DA2D-1.01-R01-01</span>
                  </div>

                  <div className="grid grid-cols-4 gap-1 text-[10px] text-center">
                    <div className="bg-slate-800 p-1.5 rounded">
                      <div className="font-bold text-rose-300">DA2D</div>
                      <div className="text-[9px] text-slate-400">อาคาร A2</div>
                    </div>
                    <div className="bg-slate-800 p-1.5 rounded">
                      <div className="font-bold text-rose-300">1.01</div>
                      <div className="text-[9px] text-slate-400">โซนรางเลื่อน</div>
                    </div>
                    <div className="bg-slate-800 p-1.5 rounded">
                      <div className="font-bold text-rose-300">R01</div>
                      <div className="text-[9px] text-slate-400">รางที่ 1 (R1-20)</div>
                    </div>
                    <div className="bg-slate-800 p-1.5 rounded">
                      <div className="font-bold text-rose-300">01</div>
                      <div className="text-[9px] text-slate-400">ตำแหน่ง 01-08</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Outdoor Tent Scheme */}
              {(activeSector === 'ALL' || activeSector === 'TENT') && (
                <div className="bg-slate-950/90 p-3.5 rounded-xl border border-emerald-500/40 space-y-2">
                  <div className="flex items-center justify-between text-emerald-300 font-bold">
                    <span className="flex items-center space-x-1.5">
                      <Tent className="w-4 h-4 text-emerald-400" />
                      <span>4. เต็นท์จัดเก็บภายนอก A5 (Outdoor Tent Yard)</span>
                    </span>
                    <span className="text-[10px] font-mono bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-700 text-emerald-200">
                      784 พาเลท
                    </span>
                  </div>

                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono text-center">
                    <span className="text-emerald-400 font-black text-sm">DA5T-1.01-01-R1-01</span>
                  </div>

                  <div className="grid grid-cols-5 gap-1 text-[10px] text-center">
                    <div className="bg-slate-800 p-1.5 rounded">
                      <div className="font-bold text-emerald-300">DA5T</div>
                      <div className="text-[9px] text-slate-400">เต็นท์ A5</div>
                    </div>
                    <div className="bg-slate-800 p-1.5 rounded">
                      <div className="font-bold text-emerald-300">1.01</div>
                      <div className="text-[9px] text-slate-400">Tent 1 (1-4)</div>
                    </div>
                    <div className="bg-slate-800 p-1.5 rounded">
                      <div className="font-bold text-emerald-300">01</div>
                      <div className="text-[9px] text-slate-400">กลุ่ม 01-07</div>
                    </div>
                    <div className="bg-slate-800 p-1.5 rounded">
                      <div className="font-bold text-emerald-300">R1</div>
                      <div className="text-[9px] text-slate-400">แถว R1-R4</div>
                    </div>
                    <div className="bg-slate-800 p-1.5 rounded">
                      <div className="font-bold text-emerald-300">01</div>
                      <div className="text-[9px] text-slate-400">คอลัมน์ 01-07</div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* 3. INTERACTIVE LOCATOR DECODER SANDBOX */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="font-black text-white text-xs">
                  ทดสอบถอดรหัสตำแหน่งแบบเรียลไทม์ (Live Locator Decoder)
                </span>
              </div>
              
              {/* Quick Samples */}
              <div className="flex flex-wrap items-center gap-1 text-[10px]">
                <span className="text-slate-400 mr-1">ตัวอย่าง:</span>
                <button
                  onClick={() => setTestLocatorInput('DA4D-2.01-D02-L1')}
                  className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 hover:bg-blue-900 font-mono font-bold"
                >
                  แร็ค D02
                </button>
                <button
                  onClick={() => setTestLocatorInput('DA4D-1.01-X2-R06-03')}
                  className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 hover:bg-amber-900 font-mono font-bold"
                >
                  พื้น X2
                </button>
                <button
                  onClick={() => setTestLocatorInput('DA2D-1.01-R03-02')}
                  className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 hover:bg-rose-900 font-mono font-bold"
                >
                  ราง R03
                </button>
                <button
                  onClick={() => setTestLocatorInput('DA5T-1.01-04-R2-03')}
                  className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900 font-mono font-bold"
                >
                  เต็นท์ T1
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={testLocatorInput}
                  onChange={(e) => setTestLocatorInput(e.target.value)}
                  placeholder="พิมพ์รหัสพิกัด เช่น DA4D-2.01-B05-L2..."
                  className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-lg pl-9 pr-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Decoded Output Banner */}
            <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center space-x-2 text-[11px]">
                  <span className="font-bold text-slate-400">อาคาร:</span>
                  <span className="font-black text-white">{decodedResult.building}</span>
                  <span className="text-slate-600">•</span>
                  <span className="font-bold text-slate-400">พื้นที่:</span>
                  <span className="font-black text-blue-400">{decodedResult.area}</span>
                </div>
                <div className="text-[11px] text-slate-300 mt-1">
                  {decodedResult.details}
                </div>
              </div>
              <div className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800 shrink-0">
                โครงสร้าง: {decodedResult.formula}
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
};
