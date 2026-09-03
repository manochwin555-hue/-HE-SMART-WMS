import React, { useState, useMemo, useRef, useEffect } from 'react';
import { InventoryItem, MovementType, ShelfLevel, StorageZone } from '../types';
import { 
  Search, 
  X, 
  MapPin, 
  Package, 
  Building2, 
  Layers, 
  ArrowRight, 
  ExternalLink,
  ChevronRight,
  Boxes,
  Compass,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';

export interface GlobalSearchZoneLookupProps {
  items: InventoryItem[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onNavigateToZone?: (target: 'A4_MACRO' | 'A4_RACK' | 'A4_FLOOR' | 'A4_3D' | 'A2_RAIL' | 'A2_MACRO' | 'A2_SPLIT' | 'A5_TENT' | 'A5_MACRO' | 'CY3_TENT', tentNum?: number) => void;
  onSelectTab?: (tab: string) => void;
  onOpenScanForLevel?: (zone: StorageZone, bayNumber: number, level: ShelfLevel, mode: MovementType) => void;
  onOpen3DForLocator?: (zone: StorageZone, bayNumber: number) => void;
  placeholder?: string;
  className?: string;
}

export const getZoneMeta = (zoneStr: string) => {
  const z = String(zoneStr || '').toUpperCase();
  if (['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'].includes(z)) {
    return {
      facilityCode: 'A4',
      facilityName: 'โรงงาน A4 (แร็ค 680P)',
      storageType: 'แร็ค 4 ชั้น (Selective Rack)',
      targetTab: 'a4_rack',
      campusTarget: 'A4_RACK' as const,
      colorBg: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      badgeBg: 'bg-blue-600 text-white',
    };
  }
  if (z.startsWith('FL-') || z.startsWith('X') || z === 'A' || z.includes('FLOOR') || z.includes('DA4D-1')) {
    return {
      facilityCode: 'A4',
      facilityName: 'โรงงาน A4 (วางพื้น 432P)',
      storageType: 'พาเลทวางพื้น (Floor Staging DA4D-1)',
      targetTab: 'a4_floor',
      campusTarget: 'A4_FLOOR' as const,
      colorBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      badgeBg: 'bg-amber-600 text-white',
    };
  }
  if (z.startsWith('FR') || z.startsWith('R')) {
    return {
      facilityCode: 'A2',
      facilityName: 'โรงงาน A2',
      storageType: 'รางเลื่อนส่งตรง (Flow Rail)',
      targetTab: 'flow_floor',
      campusTarget: 'A2_RAIL' as const,
      colorBg: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      badgeBg: 'bg-purple-600 text-white',
    };
  }
  if (z.startsWith('T') || z.startsWith('DA5T')) {
    const tentNum = parseInt(z.replace(/\D/g, '') || '1', 10);
    return {
      facilityCode: 'A5',
      facilityName: `ลานเต็นท์ A5 (เต็นท์ ${tentNum})`,
      storageType: 'ลานจัดเก็บเต็นท์ (Tent Staging)',
      targetTab: 'tent_layout',
      campusTarget: 'A5_TENT' as const,
      tentNum,
      colorBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      badgeBg: 'bg-emerald-600 text-white',
    };
  }
  if (z.startsWith('CY3') || z.startsWith('DY3T')) {
    return {
      facilityCode: 'CY3',
      facilityName: 'เต็นท์ CY3 (4-Floor Rack)',
      storageType: 'แร็ค 4 ชั้น (4-Floor Rack)',
      targetTab: 'cy3_layout',
      campusTarget: 'CY3_TENT' as const,
      colorBg: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
      badgeBg: 'bg-teal-600 text-white',
    };
  }
  return {
    facilityCode: 'WMS',
    facilityName: 'คลังสินค้า',
    storageType: `Zone ${zoneStr}`,
    targetTab: 'layout',
    campusTarget: 'A4_RACK' as const,
    colorBg: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
    badgeBg: 'bg-slate-700 text-white',
  };
};

export const HighlightText: React.FC<{ text: string | number; search: string; className?: string }> = ({
  text,
  search,
  className = ''
}) => {
  const str = String(text ?? '');
  if (!search || !search.trim()) return <span className={className}>{str}</span>;

  const trimmed = search.trim();
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = str.split(new RegExp(`(${escaped})`, 'gi'));

  if (parts.length === 1) return <span className={className}>{str}</span>;

  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.toLowerCase() === trimmed.toLowerCase() ? (
          <mark
            key={i}
            className="bg-amber-300 text-slate-950 font-black px-0.5 rounded shadow-xs mx-0.2"
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </span>
  );
};

export interface PartZoneDistribution {
  modelHE: string;
  partName: string;
  totalQuantity: number;
  totalPallets: number;
  distinctZoneCount: number;
  locationCount: number;
  zones: {
    zone: string;
    zoneLabel: string;
    facilityCode: string;
    facilityName: string;
    storageType: string;
    targetTab: string;
    campusTarget: 'A4_MACRO' | 'A4_RACK' | 'A4_FLOOR' | 'A4_3D' | 'A2_RAIL' | 'A2_MACRO' | 'A2_SPLIT' | 'A5_TENT' | 'A5_MACRO' | 'CY3_TENT';
    tentNum?: number;
    colorBg: string;
    badgeBg: string;
    quantity: number;
    palletCount: number;
    items: InventoryItem[];
  }[];
}

export const GlobalSearchZoneLookup: React.FC<GlobalSearchZoneLookupProps> = ({
  items,
  searchQuery,
  onSearchChange,
  onNavigateToZone,
  onSelectTab,
  onOpenScanForLevel,
  onOpen3DForLocator,
  placeholder = 'ค้นหา Part No. / Model (ดูว่าเก็บที่ไหน เท่าไหร่บ้าง)...',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Keyboard shortcut: Press "/" to focus search box
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== inputRef.current && !(document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Aggregate matched parts and their zone distributions
  const searchDistribution = useMemo<PartZoneDistribution[]>(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return [];

    // Find all items matching part number, model, locator, or QR
    const matchedItems = items.filter((it) => {
      return (
        it.modelHE.toLowerCase().includes(q) ||
        it.partName.toLowerCase().includes(q) ||
        it.locatorCode.toLowerCase().includes(q) ||
        it.qrCode.toLowerCase().includes(q) ||
        `zone ${it.zone}`.toLowerCase().includes(q) ||
        `${it.zone}${it.bayNumber}`.toLowerCase().includes(q) ||
        it.useLine.toLowerCase().includes(q)
      );
    });

    if (matchedItems.length === 0) return [];

    // Group by modelHE
    const grouped = new Map<string, InventoryItem[]>();
    for (const it of matchedItems) {
      const existing = grouped.get(it.modelHE) || [];
      existing.push(it);
      grouped.set(it.modelHE, existing);
    }

    const results: PartZoneDistribution[] = [];

    for (const [modelHE, groupItems] of grouped.entries()) {
      const partName = groupItems[0]?.partName || modelHE;
      const totalQuantity = groupItems.reduce((acc, it) => acc + (it.quantity || 0), 0);
      const totalPallets = groupItems.reduce((acc, it) => {
        const std = it.stdQtyPerPallet || 80;
        return acc + (it.fullPallets ?? Math.ceil((it.quantity || 0) / std));
      }, 0);

      // Group by zone
      const zoneMap = new Map<string, InventoryItem[]>();
      for (const it of groupItems) {
        const z = String(it.zone);
        const zItems = zoneMap.get(z) || [];
        zItems.push(it);
        zoneMap.set(z, zItems);
      }

      const zones = Array.from(zoneMap.entries()).map(([zone, zItems]) => {
        const meta = getZoneMeta(zone);
        const zQty = zItems.reduce((sum, i) => sum + (i.quantity || 0), 0);
        const zPallets = zItems.reduce((sum, i) => {
          const std = i.stdQtyPerPallet || 80;
          return sum + (i.fullPallets ?? Math.ceil((i.quantity || 0) / std));
        }, 0);

        return {
          zone,
          zoneLabel: `Zone ${zone}`,
          facilityCode: meta.facilityCode,
          facilityName: meta.facilityName,
          storageType: meta.storageType,
          targetTab: meta.targetTab,
          campusTarget: meta.campusTarget,
          tentNum: meta.tentNum,
          colorBg: meta.colorBg,
          badgeBg: meta.badgeBg,
          quantity: zQty,
          palletCount: zPallets,
          items: zItems,
        };
      });

      // Sort zones with highest quantity first
      zones.sort((a, b) => b.quantity - a.quantity);

      results.push({
        modelHE,
        partName,
        totalQuantity,
        totalPallets,
        distinctZoneCount: zones.length,
        locationCount: groupItems.length,
        zones,
      });
    }

    // Sort models by total quantity descending
    results.sort((a, b) => b.totalQuantity - a.totalQuantity);

    return results;
  }, [items, searchQuery]);

  const totalMatchedUnits = useMemo(() => {
    return searchDistribution.reduce((sum, p) => sum + p.totalQuantity, 0);
  }, [searchDistribution]);

  const handleSelectZoneTarget = (target: any, tentNum?: number) => {
    if (onNavigateToZone) {
      onNavigateToZone(target, tentNum);
    }
    setIsOpen(false);
  };

  const handleOpenInventoryWithFilter = (model: string) => {
    onSearchChange(model);
    if (onSelectTab) {
      onSelectTab('inventory');
    }
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Bar Input Container */}
      <div className="relative flex items-center">
        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex items-center">
          <Search className="w-3.5 h-3.5 text-blue-400" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            onSearchChange(e.target.value);
            setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full h-7 sm:h-7.5 bg-slate-950/80 hover:bg-slate-950 text-white placeholder-slate-400 border border-slate-700/80 hover:border-slate-600 focus:border-blue-500 rounded-lg pl-8 pr-16 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-medium shadow-inner"
        />

        {/* Right side controls: Clear button & Hotkey indicator */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
          {searchQuery ? (
            <button
              type="button"
              onClick={() => {
                onSearchChange('');
                inputRef.current?.focus();
              }}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="ล้างคำค้นหา"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9.5px] font-mono font-bold text-slate-400 bg-slate-800/90 border border-slate-700 rounded shadow-xs pointer-events-none">
              /
            </kbd>
          )}

          {searchDistribution.length > 0 && searchQuery && (
            <span className="px-1.5 py-0.2 bg-blue-500/20 text-blue-300 text-[9px] font-mono font-bold rounded border border-blue-500/40">
              {searchDistribution.length}
            </span>
          )}
        </div>
      </div>

      {/* Interactive Live Zone Breakdown Dropdown Popover */}
      {isOpen && searchQuery.trim().length > 0 && (
        <div className="absolute left-0 sm:right-0 sm:left-auto mt-1.5 w-[92vw] sm:w-[540px] md:w-[620px] max-w-2xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-fadeIn text-white text-xs">
          {/* Header Bar */}
          <div className="px-3.5 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2 min-w-0">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="truncate">
                <span className="font-bold text-slate-200">
                  พิกัดจัดเก็บ Part No.:{' '}
                </span>
                <span className="font-mono font-black text-amber-300">
                  "{searchQuery}"
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0 text-[11px]">
              {searchDistribution.length > 0 ? (
                <span className="text-emerald-400 font-bold">
                  พบ {searchDistribution.length} Part No. ({totalMatchedUnits.toLocaleString()} ชิ้น)
                </span>
              ) : (
                <span className="text-slate-400">ไม่พบข้อมูล</span>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Results List / Zone Breakdown Cards */}
          <div className="max-h-[68vh] overflow-y-auto divide-y divide-slate-800 p-2 space-y-2">
            {searchDistribution.length > 0 ? (
              searchDistribution.map((part) => (
                <div
                  key={part.modelHE}
                  className="bg-slate-950/60 hover:bg-slate-950 p-3 rounded-lg border border-slate-800/80 transition-all space-y-2.5"
                >
                  {/* Part Header & Overall Stats */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className="font-mono font-black text-sm text-amber-300">
                          <HighlightText text={part.modelHE} search={searchQuery} />
                        </span>
                        <span className="text-slate-400 text-xs truncate">
                          • <HighlightText text={part.partName} search={searchQuery} />
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span>เก็บใน <strong>{part.distinctZoneCount}</strong> โซน</span>
                        <span>•</span>
                        <span>รวม <strong>{part.locationCount}</strong> ตำแหน่งพิกัด</span>
                      </div>
                    </div>

                    {/* Overall Units & Action Button */}
                    <div className="text-right shrink-0">
                      <div className="font-mono font-black text-emerald-400 text-sm">
                        {part.totalQuantity.toLocaleString()} ชิ้น
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {part.totalPallets} พาเลท
                      </div>
                    </div>
                  </div>

                  {/* Zone-by-Zone Breakdown (บอกว่า Part no นี้ เก็บไว้ที่โซนไหนบ้าง เท่าไหร่บ้าง) */}
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-blue-400" />
                        <span>การกระจายตามโซนจัดเก็บ (Stored in Zones):</span>
                      </span>
                      <button
                        onClick={() => handleOpenInventoryWithFilter(part.modelHE)}
                        className="text-blue-400 hover:text-blue-300 font-semibold inline-flex items-center gap-0.5 text-[10px]"
                      >
                        <span>ดูในตารางสต็อก</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {part.zones.map((zInfo) => (
                        <div
                          key={zInfo.zone}
                          className={`p-2 rounded-lg border flex flex-col justify-between transition-all ${zInfo.colorBg} hover:brightness-110`}
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex items-center space-x-1.5 truncate">
                              <span className={`px-1.5 py-0.2 rounded font-mono font-black text-[10px] ${zInfo.badgeBg}`}>
                                Zone {zInfo.zone}
                              </span>
                              <span className="font-bold text-slate-200 text-xs truncate">
                                {zInfo.facilityName}
                              </span>
                            </div>
                            <span className="font-mono font-black text-xs text-white shrink-0">
                              {zInfo.quantity.toLocaleString()} ชิ้น
                            </span>
                          </div>

                          <div className="text-[10px] text-slate-300 mt-1 flex items-center justify-between">
                            <span className="text-slate-400 truncate">
                              {zInfo.storageType} ({zInfo.palletCount} P)
                            </span>
                            <button
                              onClick={() => handleSelectZoneTarget(zInfo.campusTarget, zInfo.tentNum)}
                              className="text-white hover:underline font-bold text-[10px] inline-flex items-center gap-0.5 shrink-0 ml-1"
                              title={`เปิดผัง ${zInfo.facilityName}`}
                            >
                              <span>เปิดผัง</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Specific Locators in this Zone */}
                          <div className="mt-1.5 pt-1 border-t border-slate-700/50 flex flex-wrap gap-1">
                            {zInfo.items.slice(0, 4).map((it) => (
                              <button
                                key={it.id}
                                onClick={() => {
                                  if (onOpen3DForLocator) {
                                    onOpen3DForLocator(it.zone, it.bayNumber);
                                  } else {
                                    handleSelectZoneTarget(zInfo.campusTarget, zInfo.tentNum);
                                  }
                                }}
                                className="px-1.5 py-0.5 rounded bg-slate-900/90 hover:bg-slate-800 text-[9.5px] font-mono text-slate-300 hover:text-white border border-slate-700 inline-flex items-center gap-1 transition-colors"
                                title={`คลิกเพื่อดูพิกัด ${it.locatorCode} (${it.quantity} ชิ้น)`}
                              >
                                <span className="text-amber-300 font-bold">
                                  {it.zone}{it.bayNumber}-L{it.level}
                                </span>
                                <span>: {it.quantity}</span>
                              </button>
                            ))}
                            {zInfo.items.length > 4 && (
                              <span className="text-[9px] text-slate-400 self-center">
                                + อีก {zInfo.items.length - 4} ช่อง
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-400 space-y-2">
                <Package className="w-8 h-8 text-slate-600 mx-auto" />
                <div className="text-xs">
                  ไม่พบ Part No. หรือตำแหน่งจัดเก็บที่ตรงกับ "{searchQuery}"
                </div>
                <div className="text-[10px] text-slate-500">
                  ลองค้นหาด้วยรหัส Model เช่น "ADL", "749", "ACG", หรือชื่อ เช่น "HEATER", "BASE"
                </div>
              </div>
            )}
          </div>

          {/* Footer Shortcuts */}
          <div className="px-3.5 py-2 bg-slate-950 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span>💡 แตะปุ่ม <strong>"เปิดผัง"</strong> เพื่อข้ามไปยังแผนผังตำแหน่งนั้นได้ทันที</span>
            </span>
            <button
              onClick={() => {
                if (onSelectTab) onSelectTab('inventory');
                setIsOpen(false);
              }}
              className="text-blue-400 hover:underline font-bold inline-flex items-center gap-1"
            >
              <span>ดูในตารางสต็อกแบบเต็ม</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
