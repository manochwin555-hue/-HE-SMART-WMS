import React from 'react';
import { InventoryItem, MovementType, ShelfLevel, StorageZone } from '../../types';
import { A4UnifiedFactory3DView } from './A4UnifiedFactory3DView';

interface A4FloorStaging3DViewProps {
  items: InventoryItem[];
  searchQuery?: string;
  onSelectSlot: (group: string, row: number, col: number, item?: InventoryItem) => void;
  onSelectAnySlot?: (type: 'RACK' | 'FLOOR', locator: string, item?: InventoryItem) => void;
  onDoubleClickSlot?: (group: string, row: number, col: number, item?: InventoryItem) => void;
  onOpenScanner?: (zone: StorageZone, bay: number, level: ShelfLevel, mode: MovementType, locatorCode?: string, palletPosition?: string, item?: InventoryItem) => void;
  onNavigateToCampus?: () => void;
}

export const A4FloorStaging3DView: React.FC<A4FloorStaging3DViewProps> = ({
  items,
  searchQuery = '',
  onSelectSlot,
  onSelectAnySlot,
  onDoubleClickSlot,
  onOpenScanner,
  onNavigateToCampus
}) => {
  return (
    <A4UnifiedFactory3DView
      items={items}
      searchQuery={searchQuery}
      initialFocus="FLOOR"
      onSelectSlot={(type, locator, item) => {
        if (onSelectAnySlot) {
          onSelectAnySlot(type, locator, item);
          return;
        }
        if (type === 'FLOOR') {
          const match = locator.match(/X([1-8])-R(\d+)-C(\d+)/i);
          if (match) {
            onSelectSlot(`X${match[1]}`, parseInt(match[2], 10), parseInt(match[3], 10), item);
          } else {
            onSelectSlot('X1', 1, 1, item);
          }
        }
      }}
      onDoubleClickSlot={(type, locator, item) => {
        if (type === 'FLOOR' && onDoubleClickSlot) {
          const match = locator.match(/X([1-8])-R(\d+)-C(\d+)/i);
          if (match) {
            onDoubleClickSlot(`X${match[1]}`, parseInt(match[2], 10), parseInt(match[3], 10), item);
          } else {
            onDoubleClickSlot('X1', 1, 1, item);
          }
        }
      }}
      onOpenScanner={onOpenScanner}
      onNavigateToCampus={onNavigateToCampus}
    />
  );
};
