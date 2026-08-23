import React, { useState, useMemo } from 'react';
import { InventoryItem, MovementType } from '../types';
import { 
  GitCommit, 
  Layers, 
  Box, 
  Search, 
  ArrowRight, 
  AlertTriangle, 
  Plus, 
  ArrowLeftRight, 
  Maximize2, 
  QrCode, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  Filter,
  Grid,
  MapPin,
  TrendingDown
} from 'lucide-react';

interface FlowRailFloorMapProps {
  items: InventoryItem[];
  searchQuery?: string;
  onSelectSlot: (stationId: string, zone: string, bayNumber: number, level: number) => void;
  onOpenScanner: (zone: any, bay: number, level: any, mode: MovementType) => void;
  onRelocateItem?: (item: InventoryItem) => void;
}

export const FlowRailFloorMap: React.FC<FlowRailFloorMapProps> = ({
  items,
  searchQuery = '',
  onSelectSlot,
  onOpenScanner,
  onRelocateItem
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'OCCUPIED' | 'AGING' | 'FLOW_ONLY' | 'FLOOR_ONLY'>('ALL');
  const [selectedSlotDetail, setSelectedSlotDetail] = useState<{
    type: 'FLOW_RAIL' | 'FLOOR_STAGING';
    id: string;
    title: string;
    items: InventoryItem[];
    capacity: number;
  } | null>(null);

  // Define Flow Rail Lanes (8 Lanes)
  const flowLanes = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => {
      const laneId = `RAIL-0${i + 1}`;
      const laneZone = `FR${i + 1}`;
      // Find items mapped to this rail lane
      const laneItems = items.filter(
        it => it.storageType === 'FLOW_RAIL' && (it.zone === laneZone || it.locatorCode.includes(laneId))
      );
      return {
        id: laneId,
        zone: laneZone,
        name: `รางเลื่อน Lane ${i + 1}`,
        desc: `Gravity FIFO Track ${i + 1} (Infeed -> Outfeed)`,
        capacityPallets: 5,
        items: laneItems,
        totalQty: laneItems.reduce((acc, curr) => acc + curr.quantity, 0)
      };
    });
  }, [items]);

  // Define Floor Staging Areas (4 Zones x 4 Blocks each = 16 Blocks)
  const floorZones = useMemo(() => {
    const zones = ['FL-A', 'FL-B', 'FL-C', 'FL-D'];
    return zones.map(zCode => {
      const blocks = Array.from({ length: 4 }, (_, bi) => {
        const blockNum = bi + 1;
        const blockId = `${zCode}-0${blockNum}`;
        const blockItems = items.filter(
          it => it.storageType === 'FLOOR_STAGING' && (it.zone === zCode && it.bayNumber === blockNum)
        );
        return {
          id: blockId,
          zone: zCode,
          bayNumber: blockNum,
          name: `บล็อก ${zCode}-${blockNum}`,
          capacityPallets: 4,
          items: blockItems,
          totalQty: blockItems.reduce((acc, curr) => acc + curr.quantity, 0)
        };
      });

      return {
        code: zCode,
        title: zCode === 'FL-A' ? 'โซน A: วัตถุดิบด่วน (Fast Mover Staging)' :
               zCode === 'FL-B' ? 'โซน B: ลานสต็อกพาเลทใหญ่ (Heavy Bulk Block)' :
               zCode === 'FL-C' ? 'โซน C: สต็อกพักรอตรวจสอบ (Inspection Buffer)' :
                                 'โซน D: ลานพาเลทหมุนเวียน (Return & Staging)',
        blocks
      };
    });
  }, [items]);

  // Search filter
  const isItemMatch = (it: InventoryItem) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      it.modelHE.toLowerCase().includes(q) ||
      it.partName.toLowerCase().includes(q) ||
      it.locatorCode.toLowerCase().includes(q) ||
      it.useLine.toLowerCase().includes(q)
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Description Card */}
      <div className="bg-gradient-to-r from-amber-900 via-orange-950 to-slate-900 text-white p-5 rounded-2xl shadow-md border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500 text-slate-950 flex items-center space-x-1">
              <span>สถานีที่ 2</span>
            </span>
            <h2 className="text-lg sm:text-xl font-black text-amber-100 flex items-center space-x-2">
              <span>พื้นที่วางบนรางเลื่อน (Flow Rail) & ลานกองพื้น (Floor Staging)</span>
            </h2>
          </div>
          <p className="text-xs text-amber-200/80 max-w-2xl">
            ระบบจัดการพื้นที่จัดเก็บพิเศษนอกเหนือจาก Selective Rack: รางเลื่อนลูกกลิ้ง FIFO Gravity Track และลานบล็อกพาเลทวางกองบนพื้น
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2">
          <div className="bg-slate-900/80 p-1 rounded-xl border border-amber-500/40 flex text-xs font-bold">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all ${filterType === 'ALL' ? 'bg-amber-500 text-slate-950 font-black shadow-xs' : 'text-slate-300 hover:text-white'}`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setFilterType('FLOW_ONLY')}
              className={`px-3 py-1.5 rounded-lg transition-all ${filterType === 'FLOW_ONLY' ? 'bg-amber-500 text-slate-950 font-black shadow-xs' : 'text-slate-300 hover:text-white'}`}
            >
              🛤️ เฉพาะรางเลื่อน ({flowLanes.length})
            </button>
            <button
              onClick={() => setFilterType('FLOOR_ONLY')}
              className={`px-3 py-1.5 rounded-lg transition-all ${filterType === 'FLOOR_ONLY' ? 'bg-amber-500 text-slate-950 font-black shadow-xs' : 'text-slate-300 hover:text-white'}`}
            >
              🏗️ เฉพาะลานกองพื้น (16 บล็อก)
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1: FLOW RAIL GRAVITY ROLLER LANES (รางเลื่อนลูกกลิ้ง FIFO) */}
      {(filterType === 'ALL' || filterType === 'FLOW_ONLY') && (
        <div className="bg-white rounded-2xl border border-amber-200/80 shadow-xs p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                <GitCommit className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center space-x-2">
                  <span>🛤️ รางเลื่อนลูกกลิ้งแรงโน้มถ่วง (Flow Rail FIFO Tracks)</span>
                  <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                    8 Lanes (จุได้ 40 พาเลท)
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  ไหลจากจุดโหลดเข้า (Infeed) ไปยังจุดเบิกออก (Outfeed) ตามหลักการ First-In First-Out
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-[11px] text-slate-600 font-semibold bg-amber-50/80 px-3 py-1.5 rounded-lg border border-amber-200">
              <span>⬅️ ด้านเบิกออก (Outfeed)</span>
              <span className="text-amber-400">┈┈┈┈</span>
              <span>ด้านนำเข้า (Infeed) ➡️</span>
            </div>
          </div>

          {/* Flow Lanes Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            {flowLanes.map((lane, laneIdx) => {
              const occupiedCount = lane.items.length;
              const hasAging = lane.items.some(i => i.agingDays > 30);
              const isMatch = lane.items.some(isItemMatch);

              return (
                <div
                  key={lane.id}
                  onClick={() => setSelectedSlotDetail({
                    type: 'FLOW_RAIL',
                    id: lane.id,
                    title: lane.name,
                    items: lane.items,
                    capacity: lane.capacityPallets
                  })}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                    hasAging 
                      ? 'bg-amber-50/60 border-amber-300 hover:border-amber-400' 
                      : occupiedCount > 0 
                      ? 'bg-slate-50 border-slate-300 hover:border-amber-500 shadow-xs' 
                      : 'bg-white border-dashed border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-black text-slate-900 font-mono px-2 py-0.5 bg-slate-200 text-slate-800 rounded">
                        {lane.id}
                      </span>
                      <span className="text-xs font-bold text-slate-700">{lane.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {hasAging && (
                        <span className="flex items-center space-x-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300 animate-pulse">
                          <Clock className="w-3 h-3" />
                          <span>Aging Alert</span>
                        </span>
                      )}
                      <span className="text-[11px] font-black text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded-md border border-amber-200">
                        {occupiedCount}/{lane.capacityPallets} พาเลท ({lane.totalQty.toLocaleString()} ชิ้น)
                      </span>
                    </div>
                  </div>

                  {/* Visual Roller Flow Track (Pallets sliding along gravity track) */}
                  <div className="bg-slate-200/90 p-2 rounded-xl border border-slate-300 flex items-center justify-between space-x-2 relative">
                    {/* Background roller track stripes */}
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:8px_8px] pointer-events-none" />

                    {/* 5 Pallet Slot visual positions */}
                    {Array.from({ length: lane.capacityPallets }, (_, pos) => {
                      const itemAtPos = lane.items[pos];
                      return (
                        <div
                          key={pos}
                          className={`flex-1 h-16 rounded-lg p-1.5 flex flex-col justify-between text-left transition-all relative ${
                            itemAtPos
                              ? itemAtPos.agingDays > 30
                                ? 'bg-amber-200 border-2 border-amber-500 shadow-xs'
                                : 'bg-white border-2 border-blue-500 shadow-xs'
                              : 'border border-dashed border-slate-300 bg-slate-100/50 flex items-center justify-center text-[10px] text-slate-400'
                          }`}
                        >
                          {itemAtPos ? (
                            <>
                              <div className="flex items-center justify-between">
                                <span className="text-[8px] font-black text-slate-900 font-mono truncate max-w-[60px]">
                                  P{pos + 1}
                                </span>
                                <span className="text-[8px] font-bold px-1 rounded bg-blue-100 text-blue-800">
                                  {itemAtPos.useLine}
                                </span>
                              </div>
                              <div className="leading-tight">
                                <p className="text-[9px] font-mono font-bold text-blue-900 truncate">
                                  {itemAtPos.modelHE}
                                </p>
                                <p className="text-[8px] font-extrabold text-slate-700">
                                  {itemAtPos.quantity} U
                                </p>
                              </div>
                            </>
                          ) : (
                            <span className="text-[10px] font-mono text-slate-300 font-bold">ช่องว่าง</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Flow Direction Indicator Footer */}
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 px-1">
                    <span className="font-semibold text-emerald-700 flex items-center space-x-1">
                      <ArrowRight className="w-3 h-3 text-emerald-600" />
                      <span>จุดเบิกออก (Outfeed)</span>
                    </span>
                    <span className="text-slate-400">รางลาดเอียง Gravity Slope 2.5%</span>
                    <span className="font-semibold text-blue-700 flex items-center space-x-1">
                      <span>จุดโหลดเข้า (Infeed)</span>
                      <ArrowRight className="w-3 h-3 text-blue-600" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 2: FLOOR STAGING AREAS (พื้นที่วางกองบนพื้นทั่วไป) */}
      {(filterType === 'ALL' || filterType === 'FLOOR_ONLY') && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
                <Grid className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center space-x-2">
                  <span>🏗️ ลานวางกองบนพื้นทั่วไป (Floor Staging & Block Stacking)</span>
                  <span className="text-[10px] bg-blue-100 text-blue-900 px-2 py-0.5 rounded-full font-bold">
                    4 โซนย่อย (16 บล็อกพาเลท)
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  พื้นที่สำหรับวางพักพาเลทขนาดใหญ่ วัตถุดิบหมุนเวียนเร็ว และงานจัดเตรียมก่อนจ่ายเข้าไลน์ผลิต
                </p>
              </div>
            </div>
          </div>

          {/* 4 Floor Zones Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {floorZones.map(zoneGroup => (
              <div key={zoneGroup.code} className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-amber-500" />
                    <span>{zoneGroup.title}</span>
                  </span>
                  <span className="text-[10px] font-bold text-slate-500">
                    Zone {zoneGroup.code}
                  </span>
                </div>

                {/* 4 Blocks in this Zone */}
                <div className="grid grid-cols-2 gap-2.5">
                  {zoneGroup.blocks.map(block => {
                    const occupied = block.items.length;
                    const hasAging = block.items.some(i => i.agingDays > 30);
                    const firstItem = block.items[0];

                    return (
                      <div
                        key={block.id}
                        onClick={() => setSelectedSlotDetail({
                          type: 'FLOOR_STAGING',
                          id: block.id,
                          title: block.name,
                          items: block.items,
                          capacity: block.capacityPallets
                        })}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between h-28 relative ${
                          hasAging
                            ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-300'
                            : occupied > 0
                            ? 'bg-white border-blue-300 shadow-2xs hover:border-blue-500 hover:shadow-md'
                            : 'bg-white/60 border-dashed border-slate-200 hover:border-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-900 font-mono">
                            {block.id}
                          </span>
                          {occupied > 0 ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                              {occupied}/{block.capacityPallets} P
                            </span>
                          ) : (
                            <span className="text-[9px] text-slate-400">ว่าง</span>
                          )}
                        </div>

                        {firstItem ? (
                          <div className="leading-tight">
                            <p className="text-[10px] font-mono font-bold text-blue-900 truncate">
                              {firstItem.modelHE}
                            </p>
                            <p className="text-[10px] font-extrabold text-slate-700 mt-0.5">
                              {block.totalQty.toLocaleString()} <span className="text-[8px] font-normal text-slate-400">ชิ้น</span>
                            </p>
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-400 italic">พร้อมจัดวาง</p>
                        )}

                        <div className="flex items-center justify-between text-[9px] text-slate-400 border-t border-slate-100 pt-1 mt-1">
                          <span>Floor Block</span>
                          <span className="text-blue-600 font-bold hover:underline">ดูรายละเอียด &gt;</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SLOT DETAIL POPUP MODAL */}
      {selectedSlotDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-scaleUp">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-black text-white">{selectedSlotDetail.title} ({selectedSlotDetail.id})</h3>
                  <p className="text-[11px] text-slate-400">
                    ประเภท: {selectedSlotDetail.type === 'FLOW_RAIL' ? '🛤️ รางเลื่อนลูกกลิ้ง Flow Rail' : '🏗️ ลานวางกองบนพื้น Floor Staging'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSlotDetail(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <span className="font-bold text-slate-700">ความจุทั้งหมด:</span>
                <span className="font-mono font-black text-blue-700">
                  {selectedSlotDetail.items.length} / {selectedSlotDetail.capacity} พาเลท
                </span>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800">รายการพาเลทที่จัดเก็บ ณ ตำแหน่งนี้:</h4>
                {selectedSlotDetail.items.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    ไม่มีสินค้าในตำแหน่งนี้ (ตำแหน่งว่าง พร้อมรับสินค้าเข้า)
                  </div>
                ) : (
                  selectedSlotDetail.items.map((item, idx) => (
                    <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-black text-slate-900 font-mono">{item.modelHE}</span>
                          <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">
                            {item.useLine}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">{item.partName}</p>
                        <p className="text-[10px] text-amber-700 mt-0.5 font-bold">
                          ⏱️ Aging: {item.agingDays} วัน ({item.storageInDate ? new Date(item.storageInDate).toLocaleDateString() : '-'})
                        </p>
                      </div>
                      <div className="text-right space-y-1.5">
                        <div className="text-sm font-black text-slate-900 font-mono">
                          {item.quantity.toLocaleString()} U
                        </div>
                        {onRelocateItem && (
                          <button
                            onClick={() => {
                              onRelocateItem(item);
                              setSelectedSlotDetail(null);
                            }}
                            className="flex items-center space-x-1 text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 px-2 py-1 rounded shadow-xs"
                          >
                            <ArrowLeftRight className="w-3 h-3" />
                            <span>ย้ายตำแหน่ง</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => {
                  onOpenScanner(
                    selectedSlotDetail.id.slice(0, 3),
                    1,
                    1,
                    'IN'
                  );
                  setSelectedSlotDetail(null);
                }}
                className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-xs"
              >
                <QrCode className="w-4 h-4" />
                <span>สแกนรับสินค้าเข้าจุดนี้</span>
              </button>
              <button
                onClick={() => setSelectedSlotDetail(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
