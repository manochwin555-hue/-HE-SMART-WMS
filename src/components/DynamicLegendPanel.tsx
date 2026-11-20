import React, { useState } from 'react';
import { useTranslation } from '../i18n/i18nContext';
import { COLOR_TOKENS } from './common/WarehouseSlotToken';
import { resolveCanonicalCoordinate } from '../utils/locatorUtils';
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Layers,
  LayoutGrid,
  GitCommit,
  Tent,
  Warehouse,
  Sparkles,
  Search
} from 'lucide-react';

type SectorTab = 'ALL' | 'RACK' | 'FLOOR' | 'FLOW_RAIL' | 'TENT' | 'CY3';

export const DynamicLegendPanel: React.FC = () => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [activeSector, setActiveSector] = useState<SectorTab>('ALL');
  const [testLocatorInput, setTestLocatorInput] = useState<string>('DA4D-2-D02-L1-P1');

  // Realtime canonical decoder powered by resolveCanonicalCoordinate
  const decodeLocator = (code: string) => {
    const clean = code.trim().toUpperCase();
    if (!clean) {
      return {
        type: 'UNKNOWN',
        valid: false,
        building: 'กรอกรหัส Locator เพื่อตรวจสอบ',
        area: 'รองรับทั้ง 5 โซนคลังสินค้า (A4, A2, A5, CY3)',
        details: 'เลือกตัวอย่างด้านบนหรือพิมพ์รหัส เช่น DA4D-2-B01-L1-P1, DY3T-1.01-A01-L1-P1',
        canonical: '-',
        formula: 'DA4D-2-B01-L1-P1 | DA4D-1.01-X1-R01-C01 | DA2D-1-R01-01 | DA5T-1-01-R1-C01 | DY3T-1.01-A01-L1-P1'
      };
    }

    // 1. CY3 Outdoor Heavy Rack: DY3T-1.01-A01-L1-P1 .. DY3T-1.04-D25-L4-P2
    if (/^DY3T-1\.0[1-4]-[A-D]0*\d+-L[1-4](?:-P[12])?$/i.test(clean)) {
      const resolved = resolveCanonicalCoordinate({ locatorCode: clean });
      const rowDigit = clean.match(/DY3T-1\.0([1-4])/i)?.[1] || '1';
      const rowLetter = rowDigit === '1' ? 'A' : rowDigit === '2' ? 'B' : rowDigit === '3' ? 'C' : 'D';
      return {
        type: 'CY3',
        valid: true,
        building: 'CY3 Yard (Outdoor Heavy Rack)',
        area: `DY3T-1.0${rowDigit} (Row ${rowLetter} · 4-Tier Rack 400P)`,
        details: `แร็คกลางแจ้ง 4 ชั้น · แถว ${rowLetter} · เสา ${String(resolved.bayNumber).padStart(2, '0')} · ชั้น L${resolved.level} · พาเลท ${resolved.palletPosition || 'P1'}`,
        canonical: resolved.canonicalLocator,
        formula: '[DY3T] - [Row 1.01-1.04] - [Bay A01-D25] - [Level L1-L4] - [Pallet P1/P2]'
      };
    }

    // 2. A4 Selective Rack: DA4D-2-B01-L1-P1 .. DA4D-3-K05-L4-P2
    if (/^DA4D-[23]-[B-K]0*\d+-L[1-4](?:-P[12])?$/i.test(clean)) {
      const resolved = resolveCanonicalCoordinate({ locatorCode: clean });
      const isZone3 = ['G', 'H', 'I', 'J', 'K'].includes(resolved.zone);
      return {
        type: 'RACK',
        valid: true,
        building: 'A4 Building (Main Warehouse)',
        area: isZone3 ? 'DA4D-3 (Zone G-K 200P)' : 'DA4D-2 (Zone B-F 480P)',
        details: `Selective Rack 4 ชั้น · แถว ${resolved.zone} · เสา ${String(resolved.bayNumber).padStart(2, '0')} · ชั้น L${resolved.level} · พาเลท ${resolved.palletPosition || 'P1'}`,
        canonical: resolved.canonicalLocator,
        formula: '[DA4D-2/3] - [Row+Bay B01-K05] - [Level L1-L4] - [Pallet P1/P2]'
      };
    }

    // 3. A4 Floor Staging: DA4D-1.01-X1-R01-C01 (or global row DA4D-1-R07-01)
    if (/^DA4D-1(?:\.01)?-(?:X[1-8]-R0*\d+-(?:C)?0*\d+|R0*\d+-(?:C)?0*\d+)$/i.test(clean)) {
      const resolved = resolveCanonicalCoordinate({ locatorCode: clean });
      return {
        type: 'FLOOR_STAGING',
        valid: true,
        building: 'A4 Building (Main Warehouse)',
        area: `DA4D-1 (${resolved.zone} Floor Staging Grid 432P)`,
        details: `ลานวางพื้น 1:1 (1 ช่อง = 1 พาเลท) · กลุ่ม ${resolved.zone} · แถว R${String(resolved.bayNumber).padStart(2, '0')} · คอลัมน์ C${String(resolved.level).padStart(2, '0')}`,
        canonical: resolved.canonicalLocator,
        formula: '[DA4D-1.01] - [Group X1-X8] - [Row R01-R06] - [Col C01-C12]'
      };
    }

    // 4. A2 Flow Rail: DA2D-1-R01-01 (13 Rails x 8 Positions = 104P)
    if (/^DA2D-1-R0*\d+-(?:P)?0*\d+$/i.test(clean)) {
      const resolved = resolveCanonicalCoordinate({ locatorCode: clean });
      return {
        type: 'FLOW_RAIL',
        valid: true,
        building: 'A2 Building (Infeed Lines)',
        area: 'DA2D-1 (Gravity Flow Rail 13 Rails 104P)',
        details: `รางเลื่อนลูกกลิ้ง FIFO · ราง ${resolved.zone} · ตำแหน่งที่ ${String(resolved.bayNumber).padStart(2, '0')}${resolved.bayNumber === 1 ? ' (หน้าไลน์ Outfeed)' : resolved.bayNumber === 8 ? ' (จุดรับเข้า Infeed)' : ''}`,
        canonical: resolved.canonicalLocator,
        formula: '[DA2D-1] - [Rail R01-R13] - [Position 01-08]'
      };
    }

    // 5. A5 Canopy Tent: DA5T-1-01-R1-C01 or DA5T-1-01-R1-01
    if (/^DA5T-[1-4]-0*[1-7]-R[1-4]-(?:C)?0*[1-7]$/i.test(clean)) {
      const resolved = resolveCanonicalCoordinate({ locatorCode: clean });
      const grpMatch = clean.match(/^DA5T-[1-4]-0*([1-7])/i);
      const grp = grpMatch ? String(parseInt(grpMatch[1], 10)).padStart(2, '0') : '01';
      return {
        type: 'TENT',
        valid: true,
        building: 'A5 Tent Area (Outdoor Yard)',
        area: `DA5T-${resolved.zone.replace('T', '')} (4 Tents · 784P)`,
        details: `เต็นท์ผ้าใบ A5 · เต็นท์ ${resolved.zone.replace('T', '')} · กลุ่ม G${grp} · แถว R${resolved.level} · ช่อง C${String(resolved.bayNumber).padStart(2, '0')}`,
        canonical: resolved.canonicalLocator,
        formula: '[DA5T] - [Tent 1-4] - [Group 01-07] - [Row R1-R4] - [Col C01-C07]'
      };
    }

    return {
      type: 'UNKNOWN',
      valid: false,
      building: 'รูปแบบโค้ดไม่ตรงมาตรฐาน 5 โซน',
      area: 'ตรวจสอบรูปแบบ Locator Code อีกครั้ง',
      details: 'เลือกตัวอย่างด้านขวาบนหรือกรอกตามมาตรฐานจริงของแต่ละโซน',
      canonical: clean,
      formula: 'DA4D-2-B01-L1-P1 | DA4D-1.01-X1-R01-C01 | DA2D-1-R01-01 | DA5T-1-01-R1-C01 | DY3T-1.01-A01-L1-P1'
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
                คู่มือโค้ดสี &amp; โครงสร้างรหัสตำแหน่ง (Dynamic Legend &amp; Locator Guide)
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-400/30">
                {t('common.zone')} Guide
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              มาตรฐานรหัสพิกัด Locator จริงทั้ง 5 โซน (A4 Rack, A4 Floor, A2 Flow Rail, A5 Tent, CY3 Heavy Rack)
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <span className="text-[11px] hidden md:inline font-medium">
            {isExpanded ? t('navigation.hideMenu') : t('navigation.expandMenu')}
          </span>
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
                {t('common.all')}
              </button>
              <button
                onClick={() => setActiveSector('RACK')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center space-x-1 transition-all font-mono tabular-nums ${
                  activeSector === 'RACK'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span>DA4D-2/3 (680P)</span>
              </button>
              <button
                onClick={() => setActiveSector('FLOOR')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center space-x-1 transition-all font-mono tabular-nums ${
                  activeSector === 'FLOOR'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
                <span>DA4D-1 (432P)</span>
              </button>
              <button
                onClick={() => setActiveSector('FLOW_RAIL')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center space-x-1 transition-all font-mono tabular-nums ${
                  activeSector === 'FLOW_RAIL'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <GitCommit className="w-3.5 h-3.5 text-rose-400" />
                <span>DA2D-1 (104P)</span>
              </button>
              <button
                onClick={() => setActiveSector('TENT')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center space-x-1 transition-all font-mono tabular-nums ${
                  activeSector === 'TENT'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Tent className="w-3.5 h-3.5 text-emerald-400" />
                <span>DA5T Tent (784P)</span>
              </button>
              <button
                onClick={() => setActiveSector('CY3')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center space-x-1 transition-all font-mono tabular-nums ${
                  activeSector === 'CY3'
                    ? 'bg-violet-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Warehouse className="w-3.5 h-3.5 text-violet-400" />
                <span>DY3T CY3 (400P)</span>
              </button>
            </div>

            <span className="text-[11px] font-mono tabular-nums text-slate-400">
              {t('navigation.totalCapacity')}: <strong className="text-white">2,400 Pallets</strong>
            </span>
          </div>

          {/* 1. COLOR CODING EXPLANATION GRID */}
          <div className="space-y-2">
            <h4 className="text-xs font-black text-slate-300 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span>Color Coding Guide (HEX WMS Standard)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex items-start space-x-2.5">
                <div
                  className="w-5 h-5 rounded-md border shrink-0 mt-0.5"
                  style={{ backgroundColor: COLOR_TOKENS.EMPTY.bg, borderColor: COLOR_TOKENS.EMPTY.border }}
                />
                <div>
                  <div className="font-bold text-slate-300 text-xs">{COLOR_TOKENS.EMPTY.label}</div>
                  <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{COLOR_TOKENS.EMPTY.labelEn}</div>
                </div>
              </div>

              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex items-start space-x-2.5">
                <div
                  className="w-5 h-5 rounded-md border shrink-0 mt-0.5"
                  style={{ backgroundColor: COLOR_TOKENS.OCCUPIED.bg, borderColor: COLOR_TOKENS.OCCUPIED.border }}
                />
                <div>
                  <div className="font-bold text-slate-100 text-xs">{COLOR_TOKENS.OCCUPIED.label}</div>
                  <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{COLOR_TOKENS.OCCUPIED.labelEn}</div>
                </div>
              </div>

              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex items-start space-x-2.5">
                <div
                  className="w-5 h-5 rounded-md border shrink-0 mt-0.5"
                  style={{ backgroundColor: COLOR_TOKENS.AGING_WARNING.bg, borderColor: COLOR_TOKENS.AGING_WARNING.border }}
                />
                <div>
                  <div className="font-bold text-amber-300 text-xs">{COLOR_TOKENS.AGING_WARNING.label}</div>
                  <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{COLOR_TOKENS.AGING_WARNING.labelEn}</div>
                </div>
              </div>

              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex items-start space-x-2.5">
                <div
                  className="w-5 h-5 rounded-md border shrink-0 mt-0.5"
                  style={{ backgroundColor: COLOR_TOKENS.URGENT.bg, borderColor: COLOR_TOKENS.URGENT.border }}
                />
                <div>
                  <div className="font-bold text-orange-300 text-xs">{COLOR_TOKENS.URGENT.label}</div>
                  <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{COLOR_TOKENS.URGENT.labelEn}</div>
                </div>
              </div>

              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex items-start space-x-2.5">
                <div
                  className="w-5 h-5 rounded-md border shrink-0 mt-0.5"
                  style={{ backgroundColor: COLOR_TOKENS.OVERDUE_CRITICAL.bg, borderColor: COLOR_TOKENS.OVERDUE_CRITICAL.border }}
                />
                <div>
                  <div className="font-bold text-rose-300 text-xs">{COLOR_TOKENS.OVERDUE_CRITICAL.label}</div>
                  <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{COLOR_TOKENS.OVERDUE_CRITICAL.labelEn}</div>
                </div>
              </div>

              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex items-start space-x-2.5">
                <div
                  className="w-5 h-5 rounded-md border-2 shrink-0 mt-0.5"
                  style={{ backgroundColor: COLOR_TOKENS.OCCUPIED.bg, borderColor: COLOR_TOKENS.SEARCH_MATCH.border }}
                />
                <div>
                  <div className="font-bold text-emerald-300 text-xs">{COLOR_TOKENS.SEARCH_MATCH.label}</div>
                  <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{COLOR_TOKENS.SEARCH_MATCH.labelEn}</div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. NAMING CONVENTIONS BY SECTOR (ALL 5 ZONES WITH CANONICAL LOCATORS) */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h4 className="text-xs font-black text-slate-300 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Locator Naming Conventions (รหัสพิกัดที่ใช้งานจริงในระบบ)</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* 1. A4 Selective Rack */}
              {(activeSector === 'ALL' || activeSector === 'RACK') && (
                <div className="bg-slate-950/90 p-3.5 rounded-xl border border-blue-500/40 space-y-2">
                  <div className="flex items-center justify-between text-blue-300 font-bold gap-2">
                    <span className="flex items-center space-x-1.5 truncate">
                      <Layers className="w-4 h-4 text-blue-400 shrink-0" />
                      <span className="truncate">1. Selective Rack (DA4D-2 &amp; DA4D-3)</span>
                    </span>
                    <span className="text-[10px] font-mono tabular-nums bg-blue-900/60 px-2 py-0.5 rounded border border-blue-700 text-blue-200 shrink-0">
                      680 Pallets
                    </span>
                  </div>

                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono text-center space-y-1">
                    <div className="text-blue-400 font-black text-sm">DA4D-2-B01-L1-P1</div>
                    <div className="text-[10px] text-slate-400">
                      DA4D-2 (แถว B-F · 480P) · DA4D-3 (แถว G-K · 200P)
                    </div>
                  </div>
                </div>
              )}

              {/* 2. A4 Floor Staging */}
              {(activeSector === 'ALL' || activeSector === 'FLOOR') && (
                <div className="bg-slate-950/90 p-3.5 rounded-xl border border-amber-500/40 space-y-2">
                  <div className="flex items-center justify-between text-amber-300 font-bold gap-2">
                    <span className="flex items-center space-x-1.5 truncate">
                      <LayoutGrid className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="truncate">2. Floor Staging Grid (DA4D-1)</span>
                    </span>
                    <span className="text-[10px] font-mono tabular-nums bg-amber-900/60 px-2 py-0.5 rounded border border-amber-700 text-amber-200 shrink-0">
                      432 Pallets
                    </span>
                  </div>

                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono text-center space-y-1">
                    <div className="text-amber-400 font-black text-sm">DA4D-1.01-X1-R01-C01</div>
                    <div className="text-[10px] text-slate-400">
                      กลุ่ม X1-X4 (7 คอลัมน์) · X5-X8 (12 คอลัมน์)
                    </div>
                  </div>
                </div>
              )}

              {/* 3. A2 Flow Rail */}
              {(activeSector === 'ALL' || activeSector === 'FLOW_RAIL') && (
                <div className="bg-slate-950/90 p-3.5 rounded-xl border border-rose-500/40 space-y-2">
                  <div className="flex items-center justify-between text-rose-300 font-bold gap-2">
                    <span className="flex items-center space-x-1.5 truncate">
                      <GitCommit className="w-4 h-4 text-rose-400 shrink-0" />
                      <span className="truncate">3. Roller Flow Rail FIFO (DA2D-1)</span>
                    </span>
                    <span className="text-[10px] font-mono tabular-nums bg-rose-900/60 px-2 py-0.5 rounded border border-rose-700 text-rose-200 shrink-0">
                      104 Pallets
                    </span>
                  </div>

                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono text-center space-y-1">
                    <div className="text-rose-400 font-black text-sm">DA2D-1-R01-01</div>
                    <div className="text-[10px] text-slate-400">
                      13 ราง (R01-R13) x 8 ตำแหน่ง (01 Outfeed - 08 Infeed)
                    </div>
                  </div>
                </div>
              )}

              {/* 4. A5 Outdoor Canopy Tent */}
              {(activeSector === 'ALL' || activeSector === 'TENT') && (
                <div className="bg-slate-950/90 p-3.5 rounded-xl border border-emerald-500/40 space-y-2">
                  <div className="flex items-center justify-between text-emerald-300 font-bold gap-2">
                    <span className="flex items-center space-x-1.5 truncate">
                      <Tent className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="truncate">4. Outdoor Canopy Tent (DA5T)</span>
                    </span>
                    <span className="text-[10px] font-mono tabular-nums bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-700 text-emerald-200 shrink-0">
                      784 Pallets
                    </span>
                  </div>

                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono text-center space-y-1">
                    <div className="text-emerald-400 font-black text-sm">DA5T-1-01-R1-C01</div>
                    <div className="text-[10px] text-slate-400">
                      เต็นท์ 1-4 · กลุ่ม 01-07 · แถว R1-R4 · ช่อง C01-C07
                    </div>
                  </div>
                </div>
              )}

              {/* 5. CY3 Outdoor Heavy Rack */}
              {(activeSector === 'ALL' || activeSector === 'CY3') && (
                <div className="bg-slate-950/90 p-3.5 rounded-xl border border-violet-500/40 space-y-2">
                  <div className="flex items-center justify-between text-violet-300 font-bold gap-2">
                    <span className="flex items-center space-x-1.5 truncate">
                      <Warehouse className="w-4 h-4 text-violet-400 shrink-0" />
                      <span className="truncate">5. CY3 Heavy Rack (DY3T)</span>
                    </span>
                    <span className="text-[10px] font-mono tabular-nums bg-violet-900/60 px-2 py-0.5 rounded border border-violet-700 text-violet-200 shrink-0">
                      400 Pallets
                    </span>
                  </div>

                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono text-center space-y-1">
                    <div className="text-violet-400 font-black text-sm">DY3T-1.01-A01-L1-P1</div>
                    <div className="text-[10px] text-slate-400">
                      1.01-1.04 (แถว A-D) · เสา 01-25 · ชั้น L1-L4 · P1/P2
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
                  Live Locator Decoder (ถอดรหัสพิกัด Locator จริง)
                </span>
              </div>

              {/* Quick Samples */}
              <div className="flex flex-wrap items-center gap-1 text-[10px]">
                <span className="text-slate-400 mr-1">ตัวอย่าง:</span>
                <button
                  type="button"
                  onClick={() => setTestLocatorInput('DA4D-2-D02-L1-P1')}
                  className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 hover:bg-blue-900 font-mono font-bold"
                >
                  Rack D02
                </button>
                <button
                  type="button"
                  onClick={() => setTestLocatorInput('DA4D-1.01-X2-R06-C03')}
                  className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 hover:bg-amber-900 font-mono font-bold"
                >
                  Floor X2
                </button>
                <button
                  type="button"
                  onClick={() => setTestLocatorInput('DA2D-1-R03-02')}
                  className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 hover:bg-rose-900 font-mono font-bold"
                >
                  Rail R03
                </button>
                <button
                  type="button"
                  onClick={() => setTestLocatorInput('DA5T-1-04-R2-C03')}
                  className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900 font-mono font-bold"
                >
                  Tent T1
                </button>
                <button
                  type="button"
                  onClick={() => setTestLocatorInput('DY3T-1.04-D10-L4-P2')}
                  className="px-2 py-0.5 rounded bg-violet-950 text-violet-300 border border-violet-800 hover:bg-violet-900 font-mono font-bold"
                >
                  CY3 D10
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
                  placeholder="พิมพ์รหัส Locator เช่น DA4D-2-B01-L1-P1, DY3T-1.01-A01-L1-P1..."
                  className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-lg pl-9 pr-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Decoded Output Banner */}
            <div className={`p-3 bg-slate-900/90 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
              decodedResult.valid ? 'border-slate-700' : 'border-rose-500/40'
            }`}>
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                  <span className="font-bold text-slate-400">Building:</span>
                  <span className="font-black text-white">{decodedResult.building}</span>
                  <span className="text-slate-600">·</span>
                  <span className="font-bold text-slate-400">Zone:</span>
                  <span className={`font-black ${decodedResult.valid ? 'text-blue-400' : 'text-rose-400'}`}>
                    {decodedResult.area}
                  </span>
                  {decodedResult.valid && (
                    <>
                      <span className="text-slate-600">·</span>
                      <span className="font-mono text-amber-300 font-bold">{decodedResult.canonical}</span>
                    </>
                  )}
                </div>
                <div className="text-[11px] text-slate-300">
                  {decodedResult.details}
                </div>
              </div>
              <div className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800 shrink-0">
                Formula: {decodedResult.formula}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
