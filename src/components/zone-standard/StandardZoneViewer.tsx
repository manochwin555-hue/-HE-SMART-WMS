import React, { useState } from 'react';
import { InventoryItem, MovementType, ShelfLevel, StorageZone } from '../../types';
import { SingleLevelZoneLayout, SingleLevelSectionConfig, SingleLevelSlotDefinition } from './SingleLevelZoneLayout';
import { MultiLevelRackZoneLayout, MultiLevelRackRowConfig } from './MultiLevelRackZoneLayout';
import { Layers, LayoutGrid, Box, Tent, GitCommit } from 'lucide-react';

export interface StandardZoneViewerProps {
  items: InventoryItem[];
  initialZone?: 'A4_RACK' | 'CY3_TENT' | 'A4_FLOOR' | 'A2_FLOW' | 'A5_TENT';
  searchQuery?: string;
  onOpenScanner: (zone: StorageZone, bay: number, level: ShelfLevel, mode: MovementType) => void;
  onRelocateItem?: (item: InventoryItem) => void;
  onOpen3D?: (zone: StorageZone, bay: number) => void;
  onNavigateBack?: () => void;
  onPrintLabel?: (item: InventoryItem) => void;
  isDashboardFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const StandardZoneViewer: React.FC<StandardZoneViewerProps> = ({
  items,
  initialZone = 'CY3_TENT',
  searchQuery = '',
  onOpenScanner,
  onRelocateItem,
  onOpen3D,
  onNavigateBack,
  onPrintLabel,
  isDashboardFullscreen,
  onToggleFullscreen
}) => {
  const [activeZone, setActiveZone] = useState<'A4_RACK' | 'CY3_TENT' | 'A4_FLOOR' | 'A2_FLOW' | 'A5_TENT'>(initialZone);

  // =========================================================================
  // 1. CONFIGURATION: CY3 TENT RACK (Template 2: MultiLevelRackZoneLayout)
  // =========================================================================
  const cy3Rows: MultiLevelRackRowConfig[] = [
    {
      rowCode: 'Row A',
      zoneId: 'CY3-A',
      locatorSign: 'DY3T-1.01',
      totalBays: 25,
      description: 'แร็คแถว A (ทิศเหนือ) - 25 ช่องเสา x 4 ชั้น = 100 พาเลท',
      hasBottomDriveway: true,
      drivewayLabel: 'ทางวิ่งรถยก Forklift Aisle A-B (กว้าง 4.0 ม. | จำกัดความเร็ว ≤ 10 km/h)'
    },
    {
      rowCode: 'Row B',
      zoneId: 'CY3-B',
      locatorSign: 'DY3T-1.02',
      totalBays: 25,
      description: 'แร็คแถว B (ประกบแถว C) - 25 ช่องเสา x 4 ชั้น = 100 พาเลท',
      hasBottomDriveway: false
    },
    {
      rowCode: 'Row C',
      zoneId: 'CY3-C',
      locatorSign: 'DY3T-1.03',
      totalBays: 25,
      description: 'แร็คแถว C (ประกบแถว B) - 25 ช่องเสา x 4 ชั้น = 100 พาเลท',
      hasBottomDriveway: true,
      drivewayLabel: 'ทางวิ่งรถยก Forklift Aisle C-D (กว้าง 4.0 ม. | จำกัดความเร็ว ≤ 10 km/h)'
    },
    {
      rowCode: 'Row D',
      zoneId: 'CY3-D',
      locatorSign: 'DY3T-1.04',
      totalBays: 25,
      description: 'แร็คแถว D (ทิศใต้) - 25 ช่องเสา x 4 ชั้น = 100 พาเลท',
      hasBottomDriveway: false
    }
  ];

  // =========================================================================
  // 2. CONFIGURATION: A4 SELECTIVE RACK (Template 2: MultiLevelRackZoneLayout)
  // =========================================================================
  const a4RackRows: MultiLevelRackRowConfig[] = [
    { rowCode: 'Rack B', zoneId: 'B', locatorSign: 'DA4D-2-B', totalBays: 12, description: 'แร็ค B (Selective Rack) - 12 ช่องเสา x 4 ชั้น', hasBottomDriveway: true },
    { rowCode: 'Rack C', zoneId: 'C', locatorSign: 'DA4D-2-C', totalBays: 12, description: 'แร็ค C (Selective Rack) - 12 ช่องเสา x 4 ชั้น', hasBottomDriveway: false },
    { rowCode: 'Rack D', zoneId: 'D', locatorSign: 'DA4D-2-D', totalBays: 12, description: 'แร็ค D (Selective Rack) - 12 ช่องเสา x 4 ชั้น', hasBottomDriveway: true },
    { rowCode: 'Rack E', zoneId: 'E', locatorSign: 'DA4D-2-E', totalBays: 12, description: 'แร็ค E (Selective Rack) - 12 ช่องเสา x 4 ชั้น', hasBottomDriveway: false },
    { rowCode: 'Rack F', zoneId: 'F', locatorSign: 'DA4D-2-F', totalBays: 12, description: 'แร็ค F (Selective Rack) - 12 ช่องเสา x 4 ชั้น', hasBottomDriveway: true },
    { rowCode: 'Rack G', zoneId: 'G', locatorSign: 'DA4D-3-G', totalBays: 5, description: 'แร็ค G (Selective Rack) - 5 ช่องเสา x 4 ชั้น', hasBottomDriveway: false },
    { rowCode: 'Rack H', zoneId: 'H', locatorSign: 'DA4D-3-H', totalBays: 5, description: 'แร็ค H (Selective Rack) - 5 ช่องเสา x 4 ชั้น', hasBottomDriveway: false },
    { rowCode: 'Rack I', zoneId: 'I', locatorSign: 'DA4D-3-I', totalBays: 5, description: 'แร็ค I (Selective Rack) - 5 ช่องเสา x 4 ชั้น', hasBottomDriveway: false },
    { rowCode: 'Rack J', zoneId: 'J', locatorSign: 'DA4D-3-J', totalBays: 5, description: 'แร็ค J (Selective Rack) - 5 ช่องเสา x 4 ชั้น', hasBottomDriveway: false },
    { rowCode: 'Rack K', zoneId: 'K', locatorSign: 'DA4D-3-K', totalBays: 5, description: 'แร็ค K (Selective Rack) - 5 ช่องเสา x 4 ชั้น', hasBottomDriveway: false },
  ];

  // =========================================================================
  // 3. CONFIGURATION: A4 FLOOR STAGING (Template 1: SingleLevelZoneLayout)
  // =========================================================================
  const a4FloorSections: SingleLevelSectionConfig[] = [
    {
      id: 'X8',
      title: 'ลานวางพื้น Group X8 (Block ด้านบน)',
      subtitle: '4 แถว x 12 ช่อง = 48 พาเลท',
      locatorPrefix: 'DA4D-1.01-X8',
      columns: 12,
      slots: Array.from({ length: 48 }, (_, i) => {
        const row = 43 + Math.floor(i / 12);
        const col = (i % 12) + 1;
        return {
          id: `X8-${row}-${col}`,
          locatorCode: `DA4D-1-X8-${String(i + 1).padStart(2, '0')}`,
          displayCode: `R${row}-${String(col).padStart(2, '0')}`,
          zone: 'X8',
          bayNumber: i + 1,
          groupOrRow: row,
          columnNumber: col
        };
      })
    },
    {
      id: 'X7',
      title: 'ลานวางพื้น Group X7 (Block ด้านบน)',
      subtitle: '6 แถว x 12 ช่อง = 72 พาเลท',
      locatorPrefix: 'DA4D-1.01-X7',
      columns: 12,
      slots: Array.from({ length: 72 }, (_, i) => {
        const row = 37 + Math.floor(i / 12);
        const col = (i % 12) + 1;
        return {
          id: `X7-${row}-${col}`,
          locatorCode: `DA4D-1-X7-${String(i + 1).padStart(2, '0')}`,
          displayCode: `R${row}-${String(col).padStart(2, '0')}`,
          zone: 'X7',
          bayNumber: i + 1,
          groupOrRow: row,
          columnNumber: col
        };
      })
    },
    {
      id: 'X4',
      title: 'ลานวางพื้น Group X4 (Block ด้านล่าง)',
      subtitle: '6 แถว x 7 ช่อง = 42 พาเลท',
      locatorPrefix: 'DA4D-1.02-X4',
      columns: 7,
      slots: Array.from({ length: 42 }, (_, i) => {
        const row = 19 + Math.floor(i / 7);
        const col = (i % 7) + 1;
        return {
          id: `X4-${row}-${col}`,
          locatorCode: `DA4D-1-X4-${String(i + 1).padStart(2, '0')}`,
          displayCode: `R${row}-${String(col).padStart(2, '0')}`,
          zone: 'X4',
          bayNumber: i + 1,
          groupOrRow: row,
          columnNumber: col
        };
      })
    },
    {
      id: 'X1',
      title: 'ลานวางพื้น Group X1 (Block ด้านล่าง)',
      subtitle: '6 แถว x 7 ช่อง = 42 พาเลท',
      locatorPrefix: 'DA4D-1.02-X1',
      columns: 7,
      slots: Array.from({ length: 42 }, (_, i) => {
        const row = 1 + Math.floor(i / 7);
        const col = (i % 7) + 1;
        return {
          id: `X1-${row}-${col}`,
          locatorCode: `DA4D-1-X1-${String(i + 1).padStart(2, '0')}`,
          displayCode: `R${row}-${String(col).padStart(2, '0')}`,
          zone: 'X1',
          bayNumber: i + 1,
          groupOrRow: row,
          columnNumber: col
        };
      })
    }
  ];

  // =========================================================================
  // 4. CONFIGURATION: A2 FLOW RAIL (Template 1: SingleLevelZoneLayout)
  // =========================================================================
  const a2RailSections: SingleLevelSectionConfig[] = [
    {
      id: 'BANK_4',
      title: 'Block 4: ราง R16 - R20 (5 ราง x 8 ช่อง = 40 พาเลท)',
      subtitle: 'ระบบลูกกลิ้งไหล FIFO ทิศทาง In -> Out',
      locatorPrefix: 'DA2D-1-R16-20',
      columns: 8,
      slots: [20, 19, 18, 17, 16].flatMap((railNum) =>
        Array.from({ length: 8 }, (_, idx) => ({
          id: `R${railNum}-${idx + 1}`,
          locatorCode: `DA2D-1-R${railNum}-${String(idx + 1).padStart(2, '0')}`,
          displayCode: `R${railNum}-${String(idx + 1).padStart(2, '0')}`,
          zone: `R${railNum}`,
          bayNumber: idx + 1,
          groupOrRow: railNum,
          columnNumber: idx + 1
        }))
      )
    },
    {
      id: 'BANK_3',
      title: 'Block 3: ราง R11 - R15 (5 ราง x 8 ช่อง = 40 พาเลท)',
      subtitle: 'ระบบลูกกลิ้งไหล FIFO ทิศทาง In -> Out',
      locatorPrefix: 'DA2D-1-R11-15',
      columns: 8,
      slots: [15, 14, 13, 12, 11].flatMap((railNum) =>
        Array.from({ length: 8 }, (_, idx) => ({
          id: `R${railNum}-${idx + 1}`,
          locatorCode: `DA2D-1-R${railNum}-${String(idx + 1).padStart(2, '0')}`,
          displayCode: `R${railNum}-${String(idx + 1).padStart(2, '0')}`,
          zone: `R${railNum}`,
          bayNumber: idx + 1,
          groupOrRow: railNum,
          columnNumber: idx + 1
        }))
      )
    },
    {
      id: 'BANK_2',
      title: 'Block 2: ราง R6 - R10 (5 ราง x 8 ช่อง = 40 พาเลท)',
      subtitle: 'ระบบลูกกลิ้งไหล FIFO ทิศทาง In -> Out',
      locatorPrefix: 'DA2D-1-R6-10',
      columns: 8,
      slots: [10, 9, 8, 7, 6].flatMap((railNum) =>
        Array.from({ length: 8 }, (_, idx) => ({
          id: `R${railNum}-${idx + 1}`,
          locatorCode: `DA2D-1-R${railNum}-${String(idx + 1).padStart(2, '0')}`,
          displayCode: `R${railNum}-${String(idx + 1).padStart(2, '0')}`,
          zone: `R${railNum}`,
          bayNumber: idx + 1,
          groupOrRow: railNum,
          columnNumber: idx + 1
        }))
      )
    },
    {
      id: 'BANK_1',
      title: 'Block 1: ราง R1 - R5 (5 ราง x 8 ช่อง = 40 พาเลท)',
      subtitle: 'ระบบลูกกลิ้งไหล FIFO ทิศทาง In -> Out',
      locatorPrefix: 'DA2D-1-R1-5',
      columns: 8,
      slots: [5, 4, 3, 2, 1].flatMap((railNum) =>
        Array.from({ length: 8 }, (_, idx) => ({
          id: `R${railNum}-${idx + 1}`,
          locatorCode: `DA2D-1-R${railNum}-${String(idx + 1).padStart(2, '0')}`,
          displayCode: `R${railNum}-${String(idx + 1).padStart(2, '0')}`,
          zone: `R${railNum}`,
          bayNumber: idx + 1,
          groupOrRow: railNum,
          columnNumber: idx + 1
        }))
      )
    }
  ];

  // =========================================================================
  // 5. CONFIGURATION: A5 TENT (Template 1: SingleLevelZoneLayout)
  // =========================================================================
  const a5TentSections: SingleLevelSectionConfig[] = [
    {
      id: 'TENT_1_FRONT',
      title: 'เต็นท์ที่ 1 (A5 Tent 1) - กลุ่มเสา 01-04',
      subtitle: '4 กลุ่ม x 28 พาเลท = 112 พาเลท',
      locatorPrefix: 'DA5T-1.01',
      columns: 7,
      slots: Array.from({ length: 28 }, (_, idx) => ({
        id: `T1-01-${idx + 1}`,
        locatorCode: `DA5T-1.01-${String(idx + 1).padStart(2, '0')}`,
        displayCode: `A5-01-${String(idx + 1).padStart(2, '0')}`,
        zone: 'T1',
        bayNumber: idx + 1,
        columnNumber: (idx % 7) + 1
      }))
    },
    {
      id: 'TENT_1_BACK',
      title: 'เต็นท์ที่ 1 (A5 Tent 1) - กลุ่มเสา 05-07',
      subtitle: '3 กลุ่ม x 28 พาเลท = 84 พาเลท',
      locatorPrefix: 'DA5T-1.02',
      columns: 7,
      slots: Array.from({ length: 28 }, (_, idx) => ({
        id: `T1-05-${idx + 1}`,
        locatorCode: `DA5T-1.02-${String(idx + 1).padStart(2, '0')}`,
        displayCode: `A5-05-${String(idx + 1).padStart(2, '0')}`,
        zone: 'T1',
        bayNumber: idx + 29,
        columnNumber: (idx % 7) + 1
      }))
    }
  ];

  return (
    <div className="w-full space-y-3">
      {/* Zone Switcher Ribbon */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 flex flex-wrap items-center justify-between gap-2 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-slate-300 uppercase tracking-wider">
            เลือกโซนคลังสินค้า (Standardized WMS):
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* Template 2 Zones */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-blue-500/30 gap-1">
            <span className="text-[10px] font-bold text-blue-400 px-1 uppercase flex items-center gap-1">
              <Layers className="w-3 h-3" />
              Template 2 (แร็ค 4 ชั้น):
            </span>
            <button
              onClick={() => setActiveZone('CY3_TENT')}
              className={`h-7 px-2.5 rounded-md text-xs font-bold transition-all ${
                activeZone === 'CY3_TENT'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              CY3 Tent (4 ชั้น)
            </button>
            <button
              onClick={() => setActiveZone('A4_RACK')}
              className={`h-7 px-2.5 rounded-md text-xs font-bold transition-all ${
                activeZone === 'A4_RACK'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              A4 Rack (B-K 4 ชั้น)
            </button>
          </div>

          {/* Template 1 Zones */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-amber-500/30 gap-1">
            <span className="text-[10px] font-bold text-amber-400 px-1 uppercase flex items-center gap-1">
              <LayoutGrid className="w-3 h-3" />
              Template 1 (วางพื้น 1:1):
            </span>
            <button
              onClick={() => setActiveZone('A4_FLOOR')}
              className={`h-7 px-2.5 rounded-md text-xs font-bold transition-all ${
                activeZone === 'A4_FLOOR'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              A4 วางพื้น (DA4D-1)
            </button>
            <button
              onClick={() => setActiveZone('A2_FLOW')}
              className={`h-7 px-2.5 rounded-md text-xs font-bold transition-all ${
                activeZone === 'A2_FLOW'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              A2 Flow Rail (รางเลื่อน)
            </button>
            <button
              onClick={() => setActiveZone('A5_TENT')}
              className={`h-7 px-2.5 rounded-md text-xs font-bold transition-all ${
                activeZone === 'A5_TENT'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              A5 Tent (ลานเต็นท์)
            </button>
          </div>
        </div>
      </div>

      {/* RENDER ZONE BY TEMPLATE */}
      {activeZone === 'CY3_TENT' && (
        <MultiLevelRackZoneLayout
          zoneTitle="โซน CY3 เต็นท์คลังสินค้า (4-Tier Selective Rack)"
          zoneSubtitle="เต็นท์จัดเก็บภายนอก CY3 &bull; แร็ค 4 ชั้น"
          locatorSign="DY3T-1"
          facilityCode="FAC-CY3-TENT"
          rows={cy3Rows}
          items={items}
          searchQuery={searchQuery}
          onOpenScanner={onOpenScanner}
          onRelocateItem={onRelocateItem}
          onOpen3D={onOpen3D}
          onNavigateBack={onNavigateBack}
          onPrintLabel={onPrintLabel}
          isDashboardFullscreen={isDashboardFullscreen}
          onToggleFullscreen={onToggleFullscreen}
        />
      )}

      {activeZone === 'A4_RACK' && (
        <MultiLevelRackZoneLayout
          zoneTitle="โซน A4 แร็คจัดเก็บสูง (DA4D-2 & DA4D-3 680P)"
          zoneSubtitle="โรงงาน 4 อาคาร A4 &bull; แร็ค B ถึง K สูง 4 ชั้น"
          locatorSign="DA4D-2/3"
          facilityCode="FAC-A4-RACK"
          rows={a4RackRows}
          items={items}
          searchQuery={searchQuery}
          onOpenScanner={onOpenScanner}
          onRelocateItem={onRelocateItem}
          onOpen3D={onOpen3D}
          onNavigateBack={onNavigateBack}
          onPrintLabel={onPrintLabel}
          isDashboardFullscreen={isDashboardFullscreen}
          onToggleFullscreen={onToggleFullscreen}
        />
      )}

      {activeZone === 'A4_FLOOR' && (
        <SingleLevelZoneLayout
          zoneTitle="โซน A4 ลานวางพื้น (DA4D-1 Floor Staging 432P)"
          zoneSubtitle="โรงงาน 4 อาคาร A4 &bull; ลานวางพื้น Group X1-X8"
          locatorSign="DA4D-1"
          facilityCode="FAC-A4-FLOOR"
          sections={a4FloorSections}
          items={items}
          searchQuery={searchQuery}
          onOpenScanner={onOpenScanner}
          onRelocateItem={onRelocateItem}
          onNavigateBack={onNavigateBack}
          onPrintLabel={onPrintLabel}
          isDashboardFullscreen={isDashboardFullscreen}
          onToggleFullscreen={onToggleFullscreen}
        />
      )}

      {activeZone === 'A2_FLOW' && (
        <SingleLevelZoneLayout
          zoneTitle="โซน A2 รางเลื่อนลูกกลิ้ง (A2 Flow Rail DA2D-1 160P)"
          zoneSubtitle="โรงงาน 2 อาคาร A2 &bull; ราง R1-R20 ลูกกลิ้ง FIFO"
          locatorSign="DA2D-1"
          facilityCode="FAC-A2-RAIL"
          sections={a2RailSections}
          items={items}
          searchQuery={searchQuery}
          onOpenScanner={onOpenScanner}
          onRelocateItem={onRelocateItem}
          onNavigateBack={onNavigateBack}
          onPrintLabel={onPrintLabel}
          isDashboardFullscreen={isDashboardFullscreen}
          onToggleFullscreen={onToggleFullscreen}
        />
      )}

      {activeZone === 'A5_TENT' && (
        <SingleLevelZoneLayout
          zoneTitle="โซน A5 ลานเต็นท์จัดเก็บ (A5 Outdoor Tents 1-4)"
          zoneSubtitle="ลานจัดเก็บเต็นท์ภายนอก A5 &bull; 1:1 พาเลท"
          locatorSign="DA5T-1"
          facilityCode="FAC-A5-TENT"
          sections={a5TentSections}
          items={items}
          searchQuery={searchQuery}
          onOpenScanner={onOpenScanner}
          onRelocateItem={onRelocateItem}
          onNavigateBack={onNavigateBack}
          onPrintLabel={onPrintLabel}
          isDashboardFullscreen={isDashboardFullscreen}
          onToggleFullscreen={onToggleFullscreen}
        />
      )}
    </div>
  );
};
