import React from 'react';
import { InventoryItem, MovementType, ShelfLevel, StorageZone, WarehouseFacility, MovementLog, WmsStats, AgingThresholdConfig, CustomRackSlot } from '../types';
import { MasterBlueprintLayout } from './MasterBlueprintLayout';

interface CampusMasterOverviewProps {
  items: InventoryItem[];
  facilities?: WarehouseFacility[];
  stats?: WmsStats;
  lowStockCount?: number;
  logs?: MovementLog[];
  agingConfig?: AgingThresholdConfig;
  customSlots?: CustomRackSlot[];
  onNavigateToBuilding?: (buildingId: string) => void;
  onNavigateToZone?: (target: 'A4_MACRO' | 'A4_RACK' | 'A4_FLOOR' | 'A4_3D' | 'A2_RAIL' | 'A2_MACRO' | 'A2_SPLIT' | 'A5_TENT' | 'A5_MACRO' | 'CY3_TENT', tentNum?: number) => void;
  onOpenScanner?: (zone: StorageZone, bay: number, level: ShelfLevel, mode: MovementType) => void;
  onOpen3D?: (zone: StorageZone, bay: number) => void;
  onRelocateItem?: (item: InventoryItem) => void;
  onSelectFilter?: (filter: string) => void;
  onOpenPrinter?: () => void;
}

export const CampusMasterOverview: React.FC<CampusMasterOverviewProps> = ({
  items,
  agingConfig = { safeDaysMax: 14, warningDaysMax: 30, criticalDays: 30, autoAlertEnabled: true, notifyOnFifoViolation: true, customRuleName: 'มาตรฐาน LGE (14/30 วัน)' },
  onNavigateToZone,
  onOpenScanner,
  onOpen3D,
}) => {
  return (
    <div className="w-full min-w-0 max-w-full animate-fadeIn">
      <MasterBlueprintLayout
        items={items}
        agingConfig={agingConfig}
        onNavigateToZone={(target, tentNum) => {
          if (onNavigateToZone) {
            onNavigateToZone(target as any, tentNum);
          }
        }}
        onOpenScanner={(zone, bay, level, model) => {
          if (onOpenScanner) {
            onOpenScanner(zone as StorageZone, bay || 1, (level || 1) as ShelfLevel, 'IN');
          }
        }}
        onOpen3D={(zone, bay) => {
          if (onOpen3D) {
            onOpen3D(zone as StorageZone, bay || 1);
          }
        }}
      />
    </div>
  );
};
