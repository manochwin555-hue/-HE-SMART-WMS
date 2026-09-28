import React, { useState, useMemo } from 'react';
import { InventoryItem, MovementType, ShelfLevel, StorageZone } from '../types';
import { evaluateSlotStatus, COLOR_TOKENS } from './common/WarehouseSlotToken';
import { 
  Building2, 
  Layers, 
  QrCode, 
  ChevronRight, 
  ArrowUpRight, 
  Clock, 
  AlertTriangle, 
  Box, 
  Filter,
  CheckCircle2, 
  TrendingUp, 
  Search,
  Sparkles,
  Info
} from 'lucide-react';

interface A4FrontElevationViewProps {
  items: InventoryItem[];
  searchQuery?: string;
  floorFilter?: 'ALL' | 1 | 2 | 3 | 4;
  filterStatus?: 'ALL' | 'OCCUPIED' | 'EMPTY' | 'AGING';
  selectedZone?: StorageZone;
  onSelectZone?: (zone: StorageZone) => void;
  onSlotClick: (zone: StorageZone, bayNum: number, locatorSign: string, targetLevel?: ShelfLevel) => void;
  onSlotHover: (e: React.MouseEvent, zone: StorageZone, bayNum: number, locatorSign: string) => void;
  onSlotLeave: () => void;
  onOpenScanner?: (zone: StorageZone, bay: number, level: ShelfLevel, mode: MovementType) => void;
}

interface A4RowElevationConfig {
  rowCode: StorageZone;
  locatorPrefix: string;
  name: string;
  description: string;
  totalBays: number;
}

const A4_ELEVATION_ROWS: A4RowElevationConfig[] = [
  { rowCode: 'B', locatorPrefix: 'DA4D-2-B', name: 'แร็ค B (DA4D-2-B)', description: 'Selective Rack 12 ช่องเสา x 4 ชั้น (ทิศเหนือติดถนน Forklift Aisle 1)', totalBays: 12 },
  { rowCode: 'C', locatorPrefix: 'DA4D-2-C', name: 'แร็ค C (DA4D-2-C)', description: 'Selective Rack 12 ช่องเสา x 4 ชั้น (ประกบหลังแร็ค D)', totalBays: 12 },
  { rowCode: 'D', locatorPrefix: 'DA4D-2-D', name: 'แร็ค D (DA4D-2-D)', description: 'Selective Rack 12 ช่องเสา x 4 ชั้น (ประกบหลังแร็ค C หันหน้า Aisle 2)', totalBays: 12 },
  { rowCode: 'E', locatorPrefix: 'DA4D-2-E', name: 'แร็ค E (DA4D-2-E)', description: 'Selective Rack 12 ช่องเสา x 4 ชั้น (ประกบหลังแร็ค F)', totalBays: 12 },
  { rowCode: 'F', locatorPrefix: 'DA4D-2-F', name: 'แร็ค F (DA4D-2-F)', description: 'Selective Rack 12 ช่องเสา x 4 ชั้น (ทิศใต้ติดถนน Aisle 3)', totalBays: 12 },
  { rowCode: 'G', locatorPrefix: 'DA4D-3-G', name: 'แร็ค G (DA4D-3-G)', description: 'Selective Rack ปีกขวา 5 ช่องเสา x 4 ชั้น (DA4D-3)', totalBays: 5 },
  { rowCode: 'H', locatorPrefix: 'DA4D-3-H', name: 'แร็ค H (DA4D-3-H)', description: 'Selective Rack ปีกขวา 5 ช่องเสา x 4 ชั้น (DA4D-3)', totalBays: 5 },
  { rowCode: 'I', locatorPrefix: 'DA4D-3-I', name: 'แร็ค I (DA4D-3-I)', description: 'Selective Rack ปีกขวา 5 ช่องเสา x 4 ชั้น (DA4D-3)', totalBays: 5 },
  { rowCode: 'J', locatorPrefix: 'DA4D-3-J', name: 'แร็ค J (DA4D-3-J)', description: 'Selective Rack ปีกขวา 5 ช่องเสา x 4 ชั้น (DA4D-3)', totalBays: 5 },
  { rowCode: 'K', locatorPrefix: 'DA4D-3-K', name: 'แร็ค K (DA4D-3-K)', description: 'Selective Rack ปีกขวา 5 ช่องเสา x 4 ชั้น (DA4D-3)', totalBays: 5 },
];

export const A4FrontElevationView: React.FC<A4FrontElevationViewProps> = ({
  items,
  searchQuery = '',
  floorFilter = 'ALL',
  filterStatus = 'ALL',
  selectedZone,
  onSelectZone,
  onSlotClick,
  onSlotHover,
  onSlotLeave,
  onOpenScanner
}) => {
  const [internalActiveRow, setInternalActiveRow] = useState<StorageZone>('B');
  const [selectedFloor, setSelectedFloor] = useState<'ALL' | ShelfLevel>(floorFilter as any);

  const activeRow = useMemo(() => {
    if (selectedZone && ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'].includes(selectedZone)) {
      return selectedZone;
    }
    return internalActiveRow;
  }, [selectedZone, internalActiveRow]);

  const handleRowSelect = (rowCode: StorageZone) => {
    setInternalActiveRow(rowCode);
    if (onSelectZone) {
      onSelectZone(rowCode);
    }
  };

  // Map key: `${zone}-${bayNum}-${level}`
  const slotMap = useMemo(() => {
    const map = new Map<string, InventoryItem>();
    items.forEach(it => {
      // Direct zone match
      if (['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'].includes(it.zone)) {
        const key = `${it.zone}-${it.bayNumber}-${it.level}`;
        map.set(key, it);
      }
      // Also match locatorCode e.g. DA4D-2-B03-L2 or DA4D-3-G01-L4
      if (it.locatorCode) {
        const match = it.locatorCode.match(/DA4D-[23]-([B-K])(?:0?(\d+))?-L(\d)/i);
        if (match) {
          const z = match[1].toUpperCase() as StorageZone;
          const b = parseInt(match[2] || `${it.bayNumber}`, 10);
          const l = parseInt(match[3] || `${it.level}`, 10);
          map.set(`${z}-${b}-${l}`, it);
        }
      }
    });
    return map;
  }, [items]);

  const currentRowConfig = useMemo(() => {
    return A4_ELEVATION_ROWS.find(r => r.rowCode === activeRow) || A4_ELEVATION_ROWS[0];
  }, [activeRow]);

  const activeSearch = searchQuery.trim().toLowerCase();

  // Levels from top to bottom (L4 at top, L1 at bottom)
  const levels: ShelfLevel[] = [4, 3, 2, 1];

  const levelHeights: Record<number, string> = {
    4: 'L4 (+4.5m)',
    3: 'L3 (+3.0m)',
    2: 'L2 (+1.5m)',
    1: 'L1 (Floor 0.0m)'
  };

  return (
    <div className="space-y-3 font-sans">
      
      {/* 1. ROW SELECTOR TOOLBAR (B, C, D, E, F, G, H, I, J, K) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 shadow-md flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="text-xs font-bold text-slate-400 shrink-0 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>เลือกแถวแร็ค:</span>
          </span>

          {A4_ELEVATION_ROWS.map((r) => {
            const isSel = activeRow === r.rowCode;
            // Count items in this row
            const count = Array.from(slotMap.entries()).filter(([k]) => k.startsWith(`${r.rowCode}-`)).length;
            const cap = r.totalBays * 4;

            return (
              <button
                key={r.rowCode}
                onClick={() => handleRowSelect(r.rowCode)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                  isSel
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                <span>แถว {r.rowCode}</span>
                <span className="text-[10px] font-mono opacity-80">
                  ({count}/{cap}P)
                </span>
              </button>
            );
          })}
        </div>

        {/* Row Info Badge */}
        <div className="text-right shrink-0">
          <span className="text-[10px] text-slate-400 block font-mono leading-none">
            {currentRowConfig.locatorPrefix}
          </span>
          <span className="text-xs font-bold text-blue-300">
            {currentRowConfig.totalBays} Bays &bull; 4 Floors ({currentRowConfig.totalBays * 4} Pallets)
          </span>
        </div>
      </div>

      {/* 2. RACK ELEVATION SCHEMATIC (Front Elevation Elevation View) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xl overflow-x-auto">
        
        {/* Rack Header Banner */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#002060] border border-blue-400/50 flex items-center justify-center text-white font-black text-base shadow-md">
              {currentRowConfig.rowCode}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                <span>มุมมองหน้าตรง (Front Elevation View) - แถว {currentRowConfig.rowCode}</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                  L1 - L4
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {currentRowConfig.description}
              </p>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 hidden md:block">
            คลิกที่ช่องเพื่อดูประวัติ / รับเข้า / เบิกจ่าย / พิมพ์ป้าย
          </div>
        </div>

        {/* Bay Grid with Blue Upright Columns, Diagonal Steel Bracing & Floor Elevation Lines */}
        <div className="min-w-[780px] space-y-3">
          {levels.map((level) => {
            // Check floor filter
            if (selectedFloor !== 'ALL' && selectedFloor !== level) return null;

            return (
              <div key={level} className="flex items-stretch gap-2.5">
                {/* Level Height Axis Label */}
                <div className="w-20 shrink-0 bg-slate-950/90 border border-blue-900/50 rounded-lg p-1.5 flex flex-col justify-center text-right pr-2.5 shadow-inner">
                  <span className="font-mono font-black text-xs text-blue-400 flex items-center justify-end gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    ชั้น {level}
                  </span>
                  <span className="font-mono text-[9.5px] text-slate-400">
                    {levelHeights[level]}
                  </span>
                </div>

                {/* Bay Columns for this Level framed by Blue Upright Posts & Orange Beams */}
                <div className="flex-1 flex items-stretch">
                  {Array.from({ length: currentRowConfig.totalBays }, (_, i) => i + 1).map((bayNum) => {
                    const slotKey = `${currentRowConfig.rowCode}-${bayNum}-${level}`;
                    const item = slotMap.get(slotKey);
                    const locatorCode = `${currentRowConfig.locatorPrefix}-${String(bayNum).padStart(2, '0')}-L${level}`;

                    const isMatch = Boolean(
                      activeSearch && (
                        (item?.modelHE && item.modelHE.toLowerCase().includes(activeSearch)) ||
                        (item?.partNumber && item.partNumber.toLowerCase().includes(activeSearch)) ||
                        (item?.palletId && item.palletId.toLowerCase().includes(activeSearch)) ||
                        locatorCode.toLowerCase().includes(activeSearch)
                      )
                    );

                    const slotStatus = evaluateSlotStatus(item, isMatch);
                    const token = COLOR_TOKENS[slotStatus.status] || COLOR_TOKENS.OCCUPIED;

                    // Status filter check
                    if (filterStatus === 'OCCUPIED' && !item) return null;
                    if (filterStatus === 'EMPTY' && item) return null;
                    if (filterStatus === 'AGING' && (!item || item.agingDays <= 28)) return null;

                    return (
                      <div key={bayNum} className="flex-1 flex items-stretch relative group/bay">
                        {/* 1. Left Blue Support Column (เสาเหล็กสีน้ำเงิน) */}
                        <div className="w-2 bg-blue-700 border-x border-blue-500/80 flex flex-col justify-around items-center py-1 z-10 shrink-0 shadow-md">
                          <span className="w-0.5 h-1 bg-blue-950 rounded-full" />
                          <span className="w-0.5 h-1 bg-blue-950 rounded-full" />
                          <span className="w-0.5 h-1 bg-blue-950 rounded-full" />
                          <span className="w-0.5 h-1 bg-blue-950 rounded-full" />
                        </div>

                        {/* 2. Bay Slot Content with Diagonal Steel Bracing in Background */}
                        <div className="flex-1 flex flex-col relative px-0.5">
                          {/* Diagonal Steel Bracing SVG Background (โครงถักค้ำยัน) */}
                          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20 text-blue-400 z-0">
                            <line x1="0" y1="0" x2="100%" y2="100%" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                            <line x1="100%" y1="0" x2="0" y2="100%" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                          </svg>

                          <div
                            onClick={() => onSlotClick(currentRowConfig.rowCode, bayNum, locatorCode, level)}
                            onMouseMove={(e) => onSlotHover(e, currentRowConfig.rowCode, bayNum, locatorCode)}
                            onMouseLeave={onSlotLeave}
                            style={{
                              backgroundColor: slotStatus.bgHex,
                              borderColor: isMatch ? '#10B981' : slotStatus.borderHex,
                              boxShadow: isMatch ? '0 0 12px rgba(16, 185, 129, 0.5)' : undefined,
                            }}
                            className="relative z-1 flex-1 rounded-sm border p-1.5 transition-all cursor-pointer select-none min-h-[72px] flex flex-col justify-between hover:scale-[1.03] hover:z-30 hover:shadow-xl"
                          >
                            {/* Top: Bay Number + Level Indicator */}
                            <div className="flex items-center justify-between text-[10px] leading-none">
                              <span
                                className="font-mono font-black"
                                style={{ color: slotStatus.textColorHex }}
                              >
                                B{String(bayNum).padStart(2, '0')}
                              </span>
                              <span className="font-mono text-[9px] text-slate-400 font-bold">
                                L{level}
                              </span>
                            </div>

                            {/* Center: Model or Empty state */}
                            <div className="my-1 text-center">
                              {item ? (
                                <div className="space-y-0.5">
                                  <span className="font-mono font-black text-[11px] text-white block truncate leading-tight">
                                    {item.modelHE}
                                  </span>
                                  <span className="font-mono font-bold text-[10px] text-slate-300 block leading-none">
                                    {item.quantity} EA
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[10px] font-bold text-slate-500 italic block">
                                  ว่าง (Empty)
                                </span>
                              )}
                            </div>

                            {/* Bottom: Aging Days or Empty pill */}
                            <div className="flex items-center justify-between text-[9px] font-mono">
                              {item ? (
                                <>
                                  <span className={`px-1 py-0.2 rounded font-bold ${
                                    item.agingDays > 28 ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-slate-800 text-slate-300'
                                  }`}>
                                    {item.agingDays}d
                                  </span>
                                  <span className="text-slate-400 truncate max-w-[42px]">
                                    {item.partName || 'Part'}
                                  </span>
                                </>
                              ) : (
                                <span className="text-slate-600 block w-full text-center">
                                  พร้อมเก็บ
                                </span>
                              )}
                            </div>
                          </div>

                          {/* 3. Orange Horizontal Load Beam (คานรับน้ำหนักสีส้ม) below L2, L3, L4 (L1 is on floor) */}
                          {level > 1 ? (
                            <div className="h-1.5 bg-orange-600 border-t border-orange-400 rounded-xs flex items-center justify-between px-0.5 mt-0.5 shadow-xs">
                              <span className="w-1 h-1 rounded-full bg-orange-200" title="Beam Connector Lock" />
                              <span className="w-1 h-1 rounded-full bg-orange-200" title="Beam Connector Lock" />
                            </div>
                          ) : (
                            <div className="h-0.5 bg-slate-700 mt-0.5" />
                          )}
                        </div>

                        {/* Rightmost column for the last bay */}
                        {bayNum === currentRowConfig.totalBays && (
                          <div className="w-2 bg-blue-700 border-x border-blue-500/80 flex flex-col justify-around items-center py-1 z-10 shrink-0 shadow-md">
                            <span className="w-0.5 h-1 bg-blue-950 rounded-full" />
                            <span className="w-0.5 h-1 bg-blue-950 rounded-full" />
                            <span className="w-0.5 h-1 bg-blue-950 rounded-full" />
                            <span className="w-0.5 h-1 bg-blue-950 rounded-full" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Concrete Floor Level Line with Yellow Post Base Protectors */}
          <div className="flex items-center gap-2.5 pt-1.5 border-t-2 border-slate-700">
            <div className="w-20 text-right pr-2.5 text-[10px] font-mono text-slate-400 font-bold">
              0.0m Concrete
            </div>
            <div className="flex-1 flex items-center">
              {Array.from({ length: currentRowConfig.totalBays + 1 }, (_, i) => i + 1).map((b) => (
                <div key={b} className="flex-1 flex justify-start items-center">
                  {/* Yellow Corner Base Protector Guard (การ์ดกันกระแทกสีเหลือง) */}
                  <div 
                    className="w-3.5 h-4 bg-yellow-400 border border-yellow-200 rounded-t-xs shadow-md flex items-center justify-center -mt-1"
                    title={`Yellow Base Guard - Pillar ${b}`}
                  >
                    <span className="w-1 h-1 rounded-full bg-slate-900" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Architectural Rack Components Legend */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-3 bg-blue-600 border border-blue-400 rounded-xs inline-block" />
                <span className="text-slate-300 font-bold">เสาแร็คสีน้ำเงิน (Blue Uprights)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-4 h-1.5 bg-orange-600 border border-orange-400 rounded-xs inline-block" />
                <span className="text-slate-300 font-bold">คานรับน้ำหนักสีส้ม (Orange Beams)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 border border-dashed border-blue-400 rounded-xs inline-flex items-center justify-center text-[8px] text-blue-300">✕</span>
                <span className="text-slate-300 font-bold">โครงถักค้ำยัน (Steel Bracing)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-3 bg-yellow-400 border border-yellow-200 rounded-t-xs inline-block" />
                <span className="text-slate-300 font-bold">การ์ดกันกระแทกสีเหลือง (Base Guards)</span>
              </span>
            </div>
            <div className="font-mono text-[10px] text-blue-400">
              Selective Pallet Rack Structural Standard
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
