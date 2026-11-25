import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Activity,
  Building2,
  Eye,
  ExternalLink,
  Flame,
  Grid,
  Layers,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Sparkles,
  Square,
} from 'lucide-react';
import {
  AgingThresholdConfig,
  InventoryItem,
  MovementLog,
  MovementType,
  ShelfLevel,
  StorageZone,
  WarehouseFacility,
  WmsStats,
} from '../types';
import { ZoneKey } from '../utils/zoneKpiHelper';
import {
  AGING_TIER_META,
  AgingTier,
  BuildingKey,
  CampusSlotMaps,
  FactoryAlertItem,
  buildCampusSlotMaps,
  computeSmartFactoryTelemetry,
  resolveItemAgingTier,
} from './master-3d/smartFactoryTelemetry';
import {
  BuildingMetaInfo,
  BottomFactoryHudPanel,
} from './master-3d/SmartFactoryHudPanels';
import { createRealisticForklift } from './zone-3d/forkliftModel';
import { CY3_ROW_SPECS } from '../utils/cy3SlotHelper';

interface CampusMasterOverviewProps {
  items: InventoryItem[];
  facilities?: WarehouseFacility[];
  stats?: WmsStats;
  lowStockCount?: number;
  logs?: MovementLog[];
  agingConfig?: AgingThresholdConfig;
  onNavigateToZone: (
    target:
      | 'A4_MACRO'
      | 'A4_RACK'
      | 'A4_FLOOR'
      | 'A4_3D'
      | 'A2_RAIL'
      | 'A2_MACRO'
      | 'A2_SPLIT'
      | 'A5_TENT'
      | 'A5_MACRO'
      | 'CY3_TENT',
    tentNum?: number
  ) => void;
  onOpenScanner?: (
    zone: StorageZone,
    bay: number,
    level: ShelfLevel,
    mode: MovementType,
    locatorCode?: string,
    palletPosition?: string,
    item?: InventoryItem | null
  ) => void;
  onOpen3D?: (zone: StorageZone, bay: number) => void;
}

interface BuildingSpec extends BuildingMetaInfo {
  zoneKey: ZoneKey;
  capacity: number;
  position: { x: number; y: number; z: number };
  size: { w: number; h: number; d: number };
  cameraFocusPos: { x: number; y: number; z: number };
  cameraFocusTarget: { x: number; y: number; z: number };
}

const BUILDINGS: Record<BuildingKey, BuildingSpec> = {
  A2: {
    key: 'A2',
    name: 'อาคาร A2 - Flow Rail',
    shortName: 'A2 Flow Rail',
    zoneKey: 'A2',
    targetNavigation: 'A2_RAIL',
    capacity: 104,
    accentHex: '#38bdf8',
    position: { x: -60, y: 0, z: -2 },
    size: { w: 50, h: 16, d: 84 },
    cameraFocusPos: { x: -86, y: 46, z: 62 },
    cameraFocusTarget: { x: -60, y: 3, z: -2 },
    description: 'อาคารขนาด 50x84m (เท่า A4) รางเลื่อนโซนท้าย 13 แถว x 8 ตำแหน่ง (104 ช่อง) พร้อมลานโฟล์คลิฟท์ด้านหน้า',
  },
  A4: {
    key: 'A4',
    name: 'อาคาร A4 - Rack & Floor Staging',
    shortName: 'A4 Unified Hall',
    zoneKey: 'A4',
    targetNavigation: 'A4_FLOOR',
    capacity: 1112,
    accentHex: '#0ea5e9',
    position: { x: 0, y: 0, z: -2 },
    size: { w: 50, h: 16, d: 84 },
    cameraFocusPos: { x: -24, y: 48, z: 64 },
    cameraFocusTarget: { x: 0, y: 4, z: -2 },
    description: 'อาคารแนวตั้งรวม Selective Rack B-K (680P) + ลานวางพื้น X1-X8 (432P) รวม 1,112 P',
  },
  CY3: {
    key: 'CY3',
    name: 'CY3 - High-Bay Tent (384 P)',
    shortName: 'CY3 High-Bay',
    zoneKey: 'CY3',
    targetNavigation: 'CY3_TENT',
    capacity: 384,
    accentHex: '#f97316',
    position: { x: 66, y: 0, z: -26 },
    size: { w: 68, h: 15, d: 34 },
    cameraFocusPos: { x: 34, y: 38, z: 18 },
    cameraFocusTarget: { x: 66, y: 4, z: -26 },
    description: 'เต็นท์โครงสร้างสูงยาว X-Ray คลุมแร็ค A, D (25 Bay) และ B, C (23 Bay) x 4 ชั้น (384 P)',
  },
  A5: {
    key: 'A5',
    name: 'อาคาร A5 - Tent Yard (4 เต็นท์)',
    shortName: 'A5 Tent Yard',
    zoneKey: 'A5',
    targetNavigation: 'A5_TENT',
    capacity: 784,
    accentHex: '#0284c7',
    position: { x: 69, y: 0, z: 24 },
    size: { w: 74, h: 10.5, d: 45 },
    cameraFocusPos: { x: 69, y: 46, z: 68 },
    cameraFocusTarget: { x: 69, y: 1.5, z: 24 },
    description: 'เต็นท์ผ้าใบโค้งครบทั้ง 4 เต็นท์ (Tent 1-4) จัดผัง 2x2 พร้อมตารางช่องจอด 784 ช่องตามผังโซน A5',
  },
};

const OVERVIEW_CAMERA_POS = { x: -20, y: 102, z: 132 };
const OVERVIEW_CAMERA_TARGET = { x: 8, y: 2, z: -2 };
const TOP_CAMERA_POS = { x: 8, y: 196, z: 10 };
const TOP_CAMERA_TARGET = { x: 8, y: 0, z: -2 };

interface TourWaypoint {
  id: string;
  buildingKey: BuildingKey | 'OVERVIEW';
  title: string;
  description: string;
  cameraPos: { x: number; y: number; z: number };
  targetPos: { x: number; y: number; z: number };
  duration: number;
}

const TOUR_WAYPOINTS: TourWaypoint[] = [
  {
    id: 'overview',
    buildingKey: 'OVERVIEW',
    title: 'ภาพรวมโรงงานอัจฉริยะ 3D (Smart Factory Digital Twin)',
    description: 'มุมมองโครงสร้าง X-Ray ทั้ง 4 อาคารหลัก A2, A4, CY3 และ A5 ความจุรวม 2,384 พาเลท',
    cameraPos: OVERVIEW_CAMERA_POS,
    targetPos: OVERVIEW_CAMERA_TARGET,
    duration: 7,
  },
  {
    id: 'a2',
    buildingKey: 'A2',
    title: '1. อาคาร A2 - Flow Rail (DA2D-1)',
    description: 'รางเลื่อนลูกกลิ้ง 13 แถว (R01-R13) ในโครงสร้างอาคาร X-Ray ความจุ 104 พาเลท',
    cameraPos: BUILDINGS.A2.cameraFocusPos,
    targetPos: BUILDINGS.A2.cameraFocusTarget,
    duration: 7,
  },
  {
    id: 'a4',
    buildingKey: 'A4',
    title: '2. อาคาร A4 - Rack B-K & Floor Staging X1-X8',
    description: 'อาคารหลักแนวตั้งรวม Selective Rack 680P และลานวางพื้น 432P ในโครงสร้างเดียว (1,112 P)',
    cameraPos: BUILDINGS.A4.cameraFocusPos,
    targetPos: BUILDINGS.A4.cameraFocusTarget,
    duration: 8,
  },
  {
    id: 'cy3',
    buildingKey: 'CY3',
    title: '3. โซน CY3 - High-Bay Tent (A/D 25 • B/C 23 Bays)',
    description: 'เต็นท์ทรงสูงยาวแบบ X-Ray คลุมแร็คแถว A, D (25 ช่อง) และ B, C (23 ช่อง) 4 ชั้น (384 P)',
    cameraPos: BUILDINGS.CY3.cameraFocusPos,
    targetPos: BUILDINGS.CY3.cameraFocusTarget,
    duration: 8,
  },
  {
    id: 'a5',
    buildingKey: 'A5',
    title: '4. โซน A5 - Tent Yard (Tent 1 ถึง Tent 4)',
    description: 'กลุ่มเต็นท์โค้ง X-Ray เต็มผังทั้ง 4 เต็นท์ แบ่งทางแยกโฟล์คลิฟท์ 2x2 (784 P)',
    cameraPos: BUILDINGS.A5.cameraFocusPos,
    targetPos: BUILDINGS.A5.cameraFocusTarget,
    duration: 8,
  },
];

// --- Canvas Texture Builders ---
function createBillboardLabelTexture(
  title: string,
  subtitle: string,
  accentHex: string,
  statusText: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 136;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgba(8, 14, 26, 0.92)';
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 4;

  const r = 18;
  ctx.beginPath();
  ctx.moveTo(r, 6);
  ctx.lineTo(canvas.width - r, 6);
  ctx.quadraticCurveTo(canvas.width - 6, 6, canvas.width - 6, r);
  ctx.lineTo(canvas.width - 6, canvas.height - r);
  ctx.quadraticCurveTo(canvas.width - 6, canvas.height - 6, canvas.width - r, canvas.height - 6);
  ctx.lineTo(r, canvas.height - 6);
  ctx.quadraticCurveTo(6, canvas.height - 6, 6, canvas.height - r);
  ctx.lineTo(6, r);
  ctx.quadraticCurveTo(6, 6, r, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Left technical vertical bar
  ctx.fillStyle = accentHex;
  ctx.fillRect(20, 24, 8, 88);

  // Title (capped maxWidth so it never overlaps right status tag)
  ctx.textAlign = 'left';
  ctx.font = 'bold 28px system-ui, sans-serif';
  ctx.fillStyle = '#f8fafc';
  ctx.fillText(title, 44, 52, 415);

  // Subtitle
  ctx.font = 'bold 23px monospace, system-ui, sans-serif';
  ctx.fillStyle = accentHex;
  ctx.fillText(subtitle, 44, 96, 510);

  // Right status tag
  ctx.font = 'bold 20px monospace, sans-serif';
  const tagColor = statusText === 'ALERT' ? '#f97316' : statusText === 'ACTIVE' ? '#38bdf8' : '#94a3b8';
  ctx.fillStyle = tagColor;
  ctx.textAlign = 'right';
  ctx.fillText(statusText, canvas.width - 26, 50);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function createA4RackHeadDecalTexture(
  rowName: string,
  subCode: string,
  color: string,
  totalBays: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 512, 256);
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#facc15';
  ctx.strokeRect(7, 7, 498, 242);
  ctx.fillStyle = '#090d16';
  ctx.fillRect(18, 18, 476, 220);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 90px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`แร็ค ${rowName}`, 256, 82);
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 36px system-ui, sans-serif';
  ctx.fillText(`${subCode} (${totalBays} ช่อง x 4 ชั้น)`, 256, 172);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createA4BayLabelTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 128, 64);
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 124, 60);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 64, 32);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createA4FloorZoneBadgeTexture(zoneId: string, rows: number, cols: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 512, 256);
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#38bdf8';
  ctx.strokeRect(5, 5, 502, 246);
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(15, 15, 482, 110);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 68px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`โซน ${zoneId}`, 256, 70);
  ctx.fillStyle = '#facc15';
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillText(`DA4D-1.01 • ${cols} ช่อง x ${rows} แถว (${cols * rows} PL)`, 256, 180);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createA4FloorAxisDecalTexture(prefix: 'C' | 'R', num: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 128, 64);
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#facc15';
  ctx.strokeRect(2, 2, 124, 60);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 34px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${prefix}${String(num).padStart(2, '0')}`, 64, 32);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createCY3RackHeadDecalTexture(
  rowName: string,
  signCode: string,
  color: string,
  bayCount = 25
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 512, 256);
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#f97316';
  ctx.strokeRect(6, 6, 500, 244);
  ctx.fillStyle = '#070c17';
  ctx.fillRect(16, 16, 480, 224);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 84px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`แร็ค ${rowName}`, 256, 86);
  ctx.fillStyle = color;
  ctx.font = 'bold 34px system-ui, sans-serif';
  ctx.fillText(`${signCode} (${bayCount} ช่อง x 4 ชั้น)`, 256, 174);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createCY3BayLabelTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 128, 64);
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 124, 60);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 64, 32);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createA2SignTexture(text: string, bgColor: string, textColor: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.roundRect(6, 6, canvas.width - 12, canvas.height - 12, 16);
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = textColor;
  ctx.stroke();
  ctx.fillStyle = textColor;
  ctx.font = '900 62px monospace, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createA2FloorDecalTexture(railNum: number, side: 'OUTFEED' | 'INFEED'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const isOutfeed = side === 'OUTFEED';
  const mainColor = isOutfeed ? '#f59e0b' : '#10b981';
  const textLabel = `R${String(railNum).padStart(2, '0')}`;
  const subLabel = isOutfeed ? 'OUT (หน้าไลน์ HE)' : 'IN (จุดรับเข้า)';

  ctx.fillStyle = mainColor;
  ctx.fillRect(0, 0, 512, 256);
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#ffffff';
  ctx.strokeRect(8, 8, 496, 240);
  ctx.fillStyle = '#090d16';
  ctx.fillRect(20, 20, 472, 216);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 120px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(textLabel, 256, 100);

  ctx.fillStyle = mainColor;
  ctx.font = 'bold 34px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(subLabel, 256, 188);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function createFlowArrowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 64);
  ctx.fillStyle = '#facc15';
  for (let i = 0; i < 3; i++) {
    const startX = 60 + i * 60;
    ctx.beginPath();
    ctx.moveTo(startX, 32);
    ctx.lineTo(startX + 30, 10);
    ctx.lineTo(startX + 45, 10);
    ctx.lineTo(startX + 20, 32);
    ctx.lineTo(startX + 45, 54);
    ctx.lineTo(startX + 30, 54);
    ctx.closePath();
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createFloorZoneTagTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 220;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(8, 22, 42, 0.94)';
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(6, 6, canvas.width - 12, canvas.height - 12, 10);
  ctx.fill();
  ctx.stroke();
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#e0f2fe';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createA5TentFloorDecalTexture(tentId: number, signCode: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 512, 128);
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#38bdf8';
  ctx.strokeRect(4, 4, 504, 120);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 52px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`เต็นท์ผ้าใบ ${tentId}`, 256, 45);
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 24px monospace, system-ui, sans-serif';
  ctx.fillText(`${signCode} • 7 กลุ่ม (196 PL)`, 256, 95);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function createA5GroupFloorTexture(grpNum: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 256, 128);
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#facc15';
  ctx.strokeRect(4, 4, 248, 120);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 62px "Segoe UI", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`กลุ่ม ${grpNum}`, 128, 50);
  ctx.fillStyle = '#facc15';
  ctx.font = 'bold 22px monospace, system-ui, sans-serif';
  ctx.fillText(`G0${grpNum} • 28 PL`, 128, 98);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function createBuildingHeatmapTexture(metrics: {
  occupied: number;
  safeCount: number;
  warningCount: number;
  overdueCount: number;
}): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 256);
  ctx.fillStyle = 'rgba(6, 11, 20, 0.5)';
  ctx.fillRect(0, 0, 256, 256);

  let baseColor = '#0ea5e9';
  if (metrics.overdueCount > 0) baseColor = '#ef4444';
  else if (metrics.warningCount > 0) baseColor = '#f59e0b';

  const hotspotsCount = Math.max(8, Math.min(26, metrics.occupied + 6));
  for (let i = 0; i < hotspotsCount; i++) {
    const x = 32 + ((i * 37 + 13) % 192);
    const y = 32 + ((i * 53 + 29) % 192);
    const r = 24 + ((i * 13) % 30);

    let spotColor = 'rgba(14, 165, 233, 0.72)';
    if (metrics.overdueCount > 0 && i % 3 === 0) spotColor = 'rgba(239, 68, 68, 0.88)';
    else if (metrics.warningCount > 0 && i % 2 === 0) spotColor = 'rgba(245, 158, 11, 0.82)';

    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, spotColor);
    grad.addColorStop(1, 'rgba(6, 11, 20, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = baseColor;
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 248, 248);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Helper: Build a glowing translucent X-Ray factory shell with cyan-blue & orange wireframe highlights
 */
function buildFactoryXrayShell(params: {
  width: number;
  wallHeight: number;
  roofPeakAdd: number;
  depth: number;
  baseY: number;
  bayDivisionsX: number;
  bayDivisionsZ: number;
  shellColor?: string;
  cyanHex?: string;
  orangeHex?: string;
}): THREE.Group {
  const {
    width,
    wallHeight,
    roofPeakAdd,
    depth,
    baseY,
    bayDivisionsX,
    bayDivisionsZ,
    shellColor = '#93c5fd',
    cyanHex = '#0284c7',
    orangeHex = '#ea580c',
  } = params;

  const shellGrp = new THREE.Group();
  const halfW = width / 2;
  const halfD = depth / 2;
  const eaveY = baseY + wallHeight;
  const apexY = eaveY + roofPeakAdd;

  // Translucent studio architectural glazing
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: shellColor,
    transparent: true,
    opacity: 0.13,
    roughness: 0.2,
    metalness: 0.08,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  // Side walls (Left/Right along X, Front/Back along Z)
  const wallLeft = new THREE.Mesh(new THREE.PlaneGeometry(depth, wallHeight), glassMat);
  wallLeft.rotation.y = Math.PI / 2;
  wallLeft.position.set(-halfW, baseY + wallHeight / 2, 0);
  const wallRight = new THREE.Mesh(new THREE.PlaneGeometry(depth, wallHeight), glassMat);
  wallRight.rotation.y = Math.PI / 2;
  wallRight.position.set(halfW, baseY + wallHeight / 2, 0);

  const wallFront = new THREE.Mesh(new THREE.PlaneGeometry(width, wallHeight), glassMat);
  wallFront.position.set(0, baseY + wallHeight / 2, halfD);
  const wallBack = new THREE.Mesh(new THREE.PlaneGeometry(width, wallHeight), glassMat);
  wallBack.position.set(0, baseY + wallHeight / 2, -halfD);
  shellGrp.add(wallLeft, wallRight, wallFront, wallBack);

  // Translucent sloped gable roof panels
  const slopeRun = halfW;
  const slopeLen = Math.sqrt(slopeRun * slopeRun + roofPeakAdd * roofPeakAdd);
  const slopeAngle = Math.atan2(roofPeakAdd, slopeRun);

  const roofLeft = new THREE.Mesh(new THREE.PlaneGeometry(slopeLen, depth), glassMat);
  roofLeft.rotation.x = -Math.PI / 2;
  roofLeft.rotation.y = slopeAngle;
  roofLeft.position.set(-halfW / 2, eaveY + roofPeakAdd / 2, 0);

  const roofRight = new THREE.Mesh(new THREE.PlaneGeometry(slopeLen, depth), glassMat);
  roofRight.rotation.x = -Math.PI / 2;
  roofRight.rotation.y = -slopeAngle;
  roofRight.position.set(halfW / 2, eaveY + roofPeakAdd / 2, 0);
  shellGrp.add(roofLeft, roofRight);

  // Crisp Structural Portal Frames & Ridge Lines
  const cyanLineMat = new THREE.LineBasicMaterial({ color: cyanHex, transparent: true, opacity: 0.72 });
  const orangeLineMat = new THREE.LineBasicMaterial({ color: orangeHex, transparent: true, opacity: 0.8 });

  const portalVerts: number[] = [];
  for (let i = 0; i <= bayDivisionsZ; i++) {
    const z = -halfD + (i / bayDivisionsZ) * depth;
    // Left column
    portalVerts.push(-halfW, baseY, z, -halfW, eaveY, z);
    // Left rafter
    portalVerts.push(-halfW, eaveY, z, 0, apexY, z);
    // Right rafter
    portalVerts.push(0, apexY, z, halfW, eaveY, z);
    // Right column
    portalVerts.push(halfW, eaveY, z, halfW, baseY, z);
  }
  const portalGeo = new THREE.BufferGeometry();
  portalGeo.setAttribute('position', new THREE.Float32BufferAttribute(portalVerts, 3));
  shellGrp.add(new THREE.LineSegments(portalGeo, cyanLineMat));

  // Cross-truss intermediate X columns if building is wide along X
  if (bayDivisionsX > 1) {
    const frontBackVerts: number[] = [];
    for (let ix = 1; ix < bayDivisionsX; ix++) {
      const x = -halfW + (ix / bayDivisionsX) * width;
      frontBackVerts.push(x, baseY, -halfD, x, eaveY, -halfD);
      frontBackVerts.push(x, baseY, halfD, x, eaveY, halfD);
    }
    const fbGeo = new THREE.BufferGeometry();
    fbGeo.setAttribute('position', new THREE.Float32BufferAttribute(frontBackVerts, 3));
    shellGrp.add(new THREE.LineSegments(fbGeo, cyanLineMat));
  }

  // Cyan longitudinal eaves & base perimeter lines
  const eaveVerts = [
    -halfW, eaveY, -halfD, -halfW, eaveY, halfD,
    halfW, eaveY, -halfD, halfW, eaveY, halfD,
    -halfW, eaveY, -halfD, halfW, eaveY, -halfD,
    -halfW, eaveY, halfD, halfW, eaveY, halfD,
  ];
  const eaveGeo = new THREE.BufferGeometry();
  eaveGeo.setAttribute('position', new THREE.Float32BufferAttribute(eaveVerts, 3));
  shellGrp.add(new THREE.LineSegments(eaveGeo, cyanLineMat));

  // Orange Highlight Structural Beams (Ridge Apex + Mid-Wall Crane Rails + Purlins)
  const midRailY = baseY + wallHeight * 0.56;
  const midRoofY = eaveY + roofPeakAdd * 0.5;
  const orangeVerts = [
    // Ridge apex glow beam
    0, apexY, -halfD, 0, apexY, halfD,
    // Roof mid purlins
    -halfW / 2, midRoofY, -halfD, -halfW / 2, midRoofY, halfD,
    halfW / 2, midRoofY, -halfD, halfW / 2, midRoofY, halfD,
    // Side horizontal crane / highlight belts
    -halfW, midRailY, -halfD, -halfW, midRailY, halfD,
    halfW, midRailY, -halfD, halfW, midRailY, halfD,
    -halfW, midRailY, -halfD, halfW, midRailY, -halfD,
    -halfW, midRailY, halfD, halfW, midRailY, halfD,
  ];
  const orangeGeo = new THREE.BufferGeometry();
  orangeGeo.setAttribute('position', new THREE.Float32BufferAttribute(orangeVerts, 3));
  shellGrp.add(new THREE.LineSegments(orangeGeo, orangeLineMat));

  return shellGrp;
}

/**
 * Helper: Build CY3 Tall Elongated Arched X-Ray Tent Structure (ทรงสูงยาว) spanning 25 bays
 */
function buildCY3HighBayTentShell(width: number, depth: number, eaveH: number, peakAdd: number): THREE.Group {
  const tentGrp = new THREE.Group();
  const halfW = width / 2;
  const halfD = depth / 2;
  const baseY = 0.8;
  const eaveY = baseY + eaveH;
  const apexY = eaveY + peakAdd;

  const cyanLineMat = new THREE.LineBasicMaterial({ color: '#0284c7', transparent: true, opacity: 0.78 });
  const orangeLineMat = new THREE.LineBasicMaterial({ color: '#ea580c', transparent: true, opacity: 0.85 });
  const tentGlassMat = new THREE.MeshPhysicalMaterial({
    color: '#cbd5e1',
    transparent: true,
    opacity: 0.16,
    roughness: 0.22,
    metalness: 0.08,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  // 14 arched ribs spaced evenly along the 68m length
  const numBays = 13;
  const colVerts: number[] = [];
  for (let i = 0; i <= numBays; i++) {
    const px = -halfW + (i / numBays) * width;
    // Tall steel side columns (Front & Rear along Z)
    colVerts.push(px, baseY, -halfD, px, eaveY, -halfD);
    colVerts.push(px, baseY, halfD, px, eaveY, halfD);

    // Arched roof truss rib across Z
    const archCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(px, eaveY, -halfD),
      new THREE.Vector3(px, apexY + 1.8, 0),
      new THREE.Vector3(px, eaveY, halfD)
    );
    const pts = archCurve.getPoints(20);
    const archGeo = new THREE.BufferGeometry().setFromPoints(pts);
    tentGrp.add(new THREE.Line(archGeo, i % 3 === 0 ? orangeLineMat : cyanLineMat));
  }
  const colGeo = new THREE.BufferGeometry();
  colGeo.setAttribute('position', new THREE.Float32BufferAttribute(colVerts, 3));
  tentGrp.add(new THREE.LineSegments(colGeo, cyanLineMat));

  // Longitudinal Orange & Cyan Purlins / Eave Rails
  const longCyanVerts = [
    -halfW, eaveY, -halfD, halfW, eaveY, -halfD,
    -halfW, eaveY, halfD, halfW, eaveY, halfD,
    -halfW, baseY + eaveH * 0.5, -halfD, halfW, baseY + eaveH * 0.5, -halfD,
    -halfW, baseY + eaveH * 0.5, halfD, halfW, baseY + eaveH * 0.5, halfD,
  ];
  const longCyanGeo = new THREE.BufferGeometry();
  longCyanGeo.setAttribute('position', new THREE.Float32BufferAttribute(longCyanVerts, 3));
  tentGrp.add(new THREE.LineSegments(longCyanGeo, cyanLineMat));

  const ridgePeakActualY = eaveY + (peakAdd + 1.8) * 0.5; // midpoint of quadratic bezier at t=0.5
  const orangePurlinVerts = [
    -halfW, ridgePeakActualY, 0, halfW, ridgePeakActualY, 0,
    -halfW, eaveY + (ridgePeakActualY - eaveY) * 0.68, -halfD * 0.52,
    halfW, eaveY + (ridgePeakActualY - eaveY) * 0.68, -halfD * 0.52,
    -halfW, eaveY + (ridgePeakActualY - eaveY) * 0.68, halfD * 0.52,
    halfW, eaveY + (ridgePeakActualY - eaveY) * 0.68, halfD * 0.52,
  ];
  const orangePurlinGeo = new THREE.BufferGeometry();
  orangePurlinGeo.setAttribute('position', new THREE.Float32BufferAttribute(orangePurlinVerts, 3));
  tentGrp.add(new THREE.LineSegments(orangePurlinGeo, orangeLineMat));

  // Translucent Arched Canopy Roof Mesh
  const roofCurveRadius = (depth * depth) / (8 * (ridgePeakActualY - eaveY)) + (ridgePeakActualY - eaveY) / 2;
  const halfAngle = Math.asin(Math.min(0.99, halfD / roofCurveRadius));
  const canopyGeo = new THREE.CylinderGeometry(
    roofCurveRadius,
    roofCurveRadius,
    width + 0.3,
    28,
    1,
    true,
    -halfAngle,
    halfAngle * 2
  );
  const canopyMesh = new THREE.Mesh(canopyGeo, tentGlassMat);
  canopyMesh.rotation.z = Math.PI / 2;
  canopyMesh.position.y = ridgePeakActualY - roofCurveRadius;
  tentGrp.add(canopyMesh);

  // Translucent X-Ray Side Curtains (Partial upper screen so racks stay crystal-clear)
  const curtainH = eaveH * 0.45;
  const curtainBack = new THREE.Mesh(new THREE.PlaneGeometry(width, curtainH), tentGlassMat);
  curtainBack.position.set(0, eaveY - curtainH / 2, -halfD);
  const curtainFront = new THREE.Mesh(new THREE.PlaneGeometry(width, curtainH), tentGlassMat);
  curtainFront.position.set(0, eaveY - curtainH / 2, halfD);
  tentGrp.add(curtainBack, curtainFront);

  return tentGrp;
}

function disposeObject3DSubtree(root: THREE.Object3D, skipSharedGeos: Set<THREE.BufferGeometry>, skipSharedMats: Set<THREE.Material>) {
  root.traverse(obj => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry && !skipSharedGeos.has(mesh.geometry)) {
      mesh.geometry.dispose();
    }
    if (mesh.material) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach(m => {
        if (m && !skipSharedMats.has(m)) {
          m.dispose();
        }
      });
    }
  });
}

export const CampusMasterOverview: React.FC<CampusMasterOverviewProps> = ({
  items = [],
  logs = [],
  stats,
  agingConfig,
  onNavigateToZone,
  onOpenScanner,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // Interactive UI state
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingKey | null>(null);
  const [hoveredBuilding, setHoveredBuilding] = useState<BuildingKey | null>(null);
  const [hoverTooltip, setHoverTooltip] = useState<{ x: number; y: number; buildingKey: BuildingKey } | null>(null);
  const [hoveredCy3Slot, setHoveredCy3Slot] = useState<{
    x: number;
    y: number;
    row: 'A' | 'B' | 'C' | 'D';
    bay: number;
    level: ShelfLevel;
    pos: 'P1' | 'P2';
    locator: string;
    item?: InventoryItem;
  } | null>(null);
  const [colorMode, setColorMode] = useState<'UTILIZATION' | 'AGING' | 'URGENT'>('AGING');
  const [activeAgingFilter, setActiveAgingFilter] = useState<AgingTier | null>(null);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [showXrayShells, setShowXrayShells] = useState<boolean>(true);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);
  const [cameraPreset, setCameraPreset] = useState<'ISO_45' | 'TOP_85'>('ISO_45');

  // Collapsible bottom KPI HUD dock
  const [bottomHudOpen, setBottomHudOpen] = useState<boolean>(true);

  // Guided Tour Mode state
  const [isTourActive, setIsTourActive] = useState<boolean>(false);
  const [isTourPaused, setIsTourPaused] = useState<boolean>(false);
  const [tourStep, setTourStep] = useState<number>(0);
  const [tourProgress, setTourProgress] = useState<number>(0);

  // Sync aging threshold config with Settings live updates
  const [effectiveAgingConfig, setEffectiveAgingConfig] = useState<AgingThresholdConfig | undefined>(() => {
    if (agingConfig) return agingConfig;
    try {
      const saved = localStorage.getItem('lge_wms_aging_config');
      if (saved) return JSON.parse(saved);
    } catch {}
    return undefined;
  });

  useEffect(() => {
    if (agingConfig) {
      setEffectiveAgingConfig(agingConfig);
      return;
    }
    const syncStorage = () => {
      try {
        const saved = localStorage.getItem('lge_wms_aging_config');
        if (saved) setEffectiveAgingConfig(JSON.parse(saved));
      } catch {}
    };
    window.addEventListener('lge_aging_config_updated', syncStorage as EventListener);
    window.addEventListener('storage', syncStorage);
    return () => {
      window.removeEventListener('lge_aging_config_updated', syncStorage as EventListener);
      window.removeEventListener('storage', syncStorage);
    };
  }, [agingConfig]);

  // Real-time Telemetry + Exact Campus Slot Maps
  const telemetry = useMemo(
    () => computeSmartFactoryTelemetry(items, logs, effectiveAgingConfig, stats),
    [items, logs, effectiveAgingConfig, stats]
  );

  const slotMaps: CampusSlotMaps = useMemo(() => buildCampusSlotMaps(items), [items]);

  // Three.js object refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const labelSpritesRef = useRef<Map<BuildingKey, THREE.Sprite>>(new Map());
  const buildingMeshesRef = useRef<Map<BuildingKey, THREE.Group>>(new Map());
  const xrayShellsGroupRef = useRef<Map<BuildingKey, THREE.Group>>(new Map());
  const dynamicPalletsGroupRef = useRef<THREE.Group | null>(null);
  const boundingBoxesRef = useRef<Map<BuildingKey, THREE.Mesh>>(new Map());
  const heatmapMeshesRef = useRef<Map<BuildingKey, THREE.Mesh>>(new Map());
  const cy3SlotHitMeshesRef = useRef<THREE.Mesh[]>([]);
  const cy3HoverHighlightRef = useRef<THREE.LineSegments | null>(null);

  // Target camera state + active transition flag so user OrbitControls drag never fights lerp
  const cameraTargetPos = useRef<THREE.Vector3>(
    new THREE.Vector3(OVERVIEW_CAMERA_POS.x, OVERVIEW_CAMERA_POS.y, OVERVIEW_CAMERA_POS.z)
  );
  const controlsTargetPos = useRef<THREE.Vector3>(
    new THREE.Vector3(OVERVIEW_CAMERA_TARGET.x, OVERVIEW_CAMERA_TARGET.y, OVERVIEW_CAMERA_TARGET.z)
  );
  const isCameraTransitioningRef = useRef<boolean>(false);

  // Refs synced to animation loop
  const isTourActiveRef = useRef(isTourActive);
  const isTourPausedRef = useRef(isTourPaused);
  const tourStepRef = useRef(tourStep);
  const tourTimerRef = useRef(0);
  const showHeatmapRef = useRef(showHeatmap);
  const colorModeRef = useRef(colorMode);
  const hoveredBuildingRef = useRef<BuildingKey | null>(hoveredBuilding);
  const selectedBuildingRef = useRef<BuildingKey | null>(selectedBuilding);

  useEffect(() => {
    isTourActiveRef.current = isTourActive;
  }, [isTourActive]);
  useEffect(() => {
    isTourPausedRef.current = isTourPaused;
  }, [isTourPaused]);
  useEffect(() => {
    tourStepRef.current = tourStep;
  }, [tourStep]);
  useEffect(() => {
    showHeatmapRef.current = showHeatmap;
  }, [showHeatmap]);
  useEffect(() => {
    colorModeRef.current = colorMode;
  }, [colorMode]);
  useEffect(() => {
    hoveredBuildingRef.current = hoveredBuilding;
  }, [hoveredBuilding]);
  useEffect(() => {
    selectedBuildingRef.current = selectedBuilding;
  }, [selectedBuilding]);

  // Helper to request smooth camera glide
  const flyCameraTo = useCallback((cam: { x: number; y: number; z: number }, tgt: { x: number; y: number; z: number }) => {
    cameraTargetPos.current.set(cam.x, cam.y, cam.z);
    controlsTargetPos.current.set(tgt.x, tgt.y, tgt.z);
    isCameraTransitioningRef.current = true;
  }, []);

  const handleSelectBuilding = useCallback(
    (bKey: BuildingKey) => {
      setSelectedBuilding(bKey);
      setHoveredCy3Slot(null);
      if (cy3HoverHighlightRef.current) cy3HoverHighlightRef.current.visible = false;
      const spec = BUILDINGS[bKey];
      flyCameraTo(spec.cameraFocusPos, spec.cameraFocusTarget);
    },
    [flyCameraTo]
  );

  const handleResetView = useCallback(() => {
    setSelectedBuilding(null);
    setHoveredCy3Slot(null);
    if (cy3HoverHighlightRef.current) cy3HoverHighlightRef.current.visible = false;
    setCameraPreset('ISO_45');
    flyCameraTo(OVERVIEW_CAMERA_POS, OVERVIEW_CAMERA_TARGET);
  }, [flyCameraTo]);

  const handleTopPlanView = useCallback(() => {
    setCameraPreset('TOP_85');
    flyCameraTo(TOP_CAMERA_POS, TOP_CAMERA_TARGET);
  }, [flyCameraTo]);

  const handleSelectBuildingRef = useRef(handleSelectBuilding);
  handleSelectBuildingRef.current = handleSelectBuilding;
  const handleResetViewRef = useRef(handleResetView);
  handleResetViewRef.current = handleResetView;
  const onOpenScannerRef = useRef(onOpenScanner);
  onOpenScannerRef.current = onOpenScanner;

  // Shared Geometries & Materials cache for fast dynamic pallet updates
  const sharedPalletAssetsRef = useRef<{
    geos: Set<THREE.BufferGeometry>;
    mats: Set<THREE.Material>;
    woodMat: THREE.MeshStandardMaterial;
    tierMats: Record<AgingTier, THREE.MeshStandardMaterial>;
    dimmedMat: THREE.MeshStandardMaterial;
    edgeWireMat: THREE.LineBasicMaterial;
    urgentWireMat: THREE.LineBasicMaterial;
    cy3HitGeo: THREE.BoxGeometry;
    cy3HitMat: THREE.MeshBasicMaterial;
  } | null>(null);

  // =========================================================================
  // 1. INITIALIZE DARK-TECH 3D SMART FACTORY SCENE ONCE
  // =========================================================================
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 1000;
    const height = container.clientHeight || 650;

    // Software WebGL probe
    let isSoftwareGl = false;
    try {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
      const dbg = gl?.getExtension('WEBGL_debug_renderer_info');
      const rendererStr = dbg && gl ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
      isSoftwareGl = /SwiftShader|llvmpipe|Software/i.test(rendererStr);
    } catch {}

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f1f5f9');
    scene.fog = new THREE.FogExp2('#f1f5f9', 0.0014);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.5, 950);
    camera.position.set(OVERVIEW_CAMERA_POS.x, OVERVIEW_CAMERA_POS.y, OVERVIEW_CAMERA_POS.z);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Subtle procedural IBL for realistic steel racks & glass X-ray shells
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnvTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = roomEnvTexture;
    scene.environmentIntensity = 0.45;
    pmremGenerator.dispose();

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.minDistance = 16;
    controls.maxDistance = 260;
    controls.target.set(OVERVIEW_CAMERA_TARGET.x, OVERVIEW_CAMERA_TARGET.y, OVERVIEW_CAMERA_TARGET.z);
    controlsRef.current = controls;

    // Stop scripted camera glide immediately when user drags/zooms
    const onControlStart = () => {
      isCameraTransitioningRef.current = false;
      if (isTourActiveRef.current) {
        setIsTourPaused(true);
      }
    };
    controls.addEventListener('start', onControlStart);

    // Bright Studio 3-Point Lighting (Matching A5 Canopy Tents Studio Atmosphere)
    const ambientLight = new THREE.AmbientLight('#ffffff', 1.55);
    const hemiLight = new THREE.HemisphereLight('#ffffff', '#cbd5e1', 0.55);
    hemiLight.position.set(0, 90, 0);

    const keyLight = new THREE.DirectionalLight('#ffffff', 1.85);
    keyLight.position.set(55, 110, 65);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 2048;
      keyLight.shadow.mapSize.height = 2048;
      keyLight.shadow.camera.near = 10;
      keyLight.shadow.camera.far = 360;
      const d = 150;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.bias = -0.0004;
    }

    const fillCoolLight = new THREE.DirectionalLight('#94a3b8', 0.75);
    fillCoolLight.position.set(-70, 50, -60);
    scene.add(ambientLight, hemiLight, keyLight, fillCoolLight);

    // Bright Studio Ground Plane + Crisp Technical Site Grid (Matching A5 Tent Studio Floor)
    const groundGroup = new THREE.Group();
    const groundMat = new THREE.MeshStandardMaterial({
      color: '#e2e8f0',
      roughness: 0.86,
      metalness: 0.08,
    });
    const groundMesh = new THREE.Mesh(new THREE.PlaneGeometry(540, 440), groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    groundGroup.add(groundMesh);

    const gridHelper = new THREE.GridHelper(480, 96, '#94a3b8', '#cbd5e1');
    gridHelper.position.y = 0.01;
    groundGroup.add(gridHelper);

    // Clean Industrial Aisle Spine Markings linking A2 <-> A4 <-> CY3/A5
    const spineMat = new THREE.LineBasicMaterial({ color: '#94a3b8', transparent: true, opacity: 0.75 });
    const spineAccentMat = new THREE.LineBasicMaterial({ color: '#eab308', transparent: true, opacity: 0.85 });
    const spineVerts = [
      -35, 0.02, -2, -25, 0.02, -2,
      25, 0.02, -2, 32, 0.02, -2,
      28.5, 0.02, -26, 28.5, 0.02, 24,
      28.5, 0.02, -26, 32, 0.02, -26,
      28.5, 0.02, 24, 32, 0.02, 24,
    ];
    const spineGeo = new THREE.BufferGeometry();
    spineGeo.setAttribute('position', new THREE.Float32BufferAttribute(spineVerts, 3));
    groundGroup.add(new THREE.LineSegments(spineGeo, spineMat));

    const spineCenterVerts = [
      -35, 0.022, -1.5, -25, 0.022, -1.5,
      25, 0.022, -1.5, 28.5, 0.022, -1.5,
    ];
    const spineCenterGeo = new THREE.BufferGeometry();
    spineCenterGeo.setAttribute('position', new THREE.Float32BufferAttribute(spineCenterVerts, 3));
    groundGroup.add(new THREE.LineSegments(spineCenterGeo, spineAccentMat));

    scene.add(groundGroup);

    // Initialize shared pallet materials cache
    const woodMat = new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.85, metalness: 0.05 });
    const tierMats: Record<AgingTier, THREE.MeshStandardMaterial> = {
      NORMAL: new THREE.MeshStandardMaterial({ color: AGING_TIER_META.NORMAL.hex, roughness: 0.42, metalness: 0.12 }),
      WARNING: new THREE.MeshStandardMaterial({ color: AGING_TIER_META.WARNING.hex, roughness: 0.42, metalness: 0.12 }),
      URGENT: new THREE.MeshStandardMaterial({ color: AGING_TIER_META.URGENT.hex, roughness: 0.38, metalness: 0.15 }),
      OVERDUE: new THREE.MeshStandardMaterial({
        color: AGING_TIER_META.OVERDUE.hex,
        emissive: '#7f1d1d',
        emissiveIntensity: 0.22,
        roughness: 0.38,
        metalness: 0.15,
      }),
    };
    const dimmedMat = new THREE.MeshStandardMaterial({
      color: '#94a3b8',
      roughness: 0.7,
      transparent: true,
      opacity: 0.32,
    });
    const edgeWireMat = new THREE.LineBasicMaterial({ color: '#0f172a', transparent: true, opacity: 0.25 });
    const urgentWireMat = new THREE.LineBasicMaterial({ color: '#991b1b', transparent: true, opacity: 0.75 });
    const cy3HitGeo = new THREE.BoxGeometry(0.95, 0.92, 1.1);
    const cy3HitMat = new THREE.MeshBasicMaterial({ visible: false });

    sharedPalletAssetsRef.current = {
      geos: new Set([cy3HitGeo]),
      mats: new Set([woodMat, ...Object.values(tierMats), dimmedMat, edgeWireMat, urgentWireMat, cy3HitMat]),
      woodMat,
      tierMats,
      dimmedMat,
      edgeWireMat,
      urgentWireMat,
      cy3HitGeo,
      cy3HitMat,
    };

    // Static Architectural Materials (Industrial Racks & Concrete Slabs)
    const buildingsGroup = new THREE.Group();
    const uprightBlueMat = new THREE.MeshStandardMaterial({ color: '#1d4ed8', metalness: 0.82, roughness: 0.28 });
    const beamOrangeMat = new THREE.MeshStandardMaterial({ color: '#ea580c', metalness: 0.65, roughness: 0.32 });
    const guardYellowMat = new THREE.MeshStandardMaterial({ color: '#eab308', roughness: 0.32 });

    (Object.keys(BUILDINGS) as BuildingKey[]).forEach(bKey => {
      const spec = BUILDINGS[bKey];
      const bGroup = new THREE.Group();
      bGroup.position.set(spec.position.x, spec.position.y, spec.position.z);

      // Foundation Slab: A5 renders flush outdoor studio yard matching A5CanopyTents3DView; A2/A4/CY3 use light studio warehouse deck
      if (bKey === 'A5') {
        const yardApron = new THREE.Mesh(
          new THREE.BoxGeometry(spec.size.w, 0.04, spec.size.d),
          new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.86, metalness: 0.05 })
        );
        yardApron.position.y = 0.02;
        yardApron.receiveShadow = true;
        bGroup.add(yardApron);
      } else {
        const slabGeo = new THREE.BoxGeometry(spec.size.w, 0.8, spec.size.d);
        const slabMat = new THREE.MeshStandardMaterial({ color: '#dce4ef', roughness: 0.78, metalness: 0.08 });
        const slab = new THREE.Mesh(slabGeo, slabMat);
        slab.position.y = 0.4;
        slab.receiveShadow = true;
        bGroup.add(slab);
      }

      // Raycasting Proxy Hitbox
      const proxyGeo = new THREE.BoxGeometry(spec.size.w, spec.size.h + 2, spec.size.d);
      const proxyMat = new THREE.MeshBasicMaterial({ visible: false });
      const proxyBox = new THREE.Mesh(proxyGeo, proxyMat);
      proxyBox.position.set(spec.position.x, (spec.size.h + 2) / 2, spec.position.z);
      proxyBox.userData = { buildingKey: bKey };
      boundingBoxesRef.current.set(bKey, proxyBox);
      scene.add(proxyBox);

      // Perimeter Outline on Floor Edge
      const edgeY = bKey === 'A5' ? 0.05 : 0.84;
      const frameGeo = new THREE.BoxGeometry(spec.size.w + 0.2, 0.06, spec.size.d + 0.2);
      const lineMatGlow = new THREE.LineBasicMaterial({ color: spec.accentHex, transparent: true, opacity: 0.85 });
      const frameOutline = new THREE.LineSegments(new THREE.EdgesGeometry(frameGeo), lineMatGlow);
      frameOutline.position.y = edgeY;
      frameOutline.name = `outline-${bKey}`;
      bGroup.add(frameOutline);

      // Corner Technical Brackets (Orange Accent)
      const cOffX = spec.size.w / 2 + 0.15;
      const cOffZ = spec.size.d / 2 + 0.15;
      const bracketLen = 2.6;
      const bY = bKey === 'A5' ? 0.06 : 0.86;
      const bracketVerts = [
        -cOffX, bY, -cOffZ, -cOffX + bracketLen, bY, -cOffZ,
        -cOffX, bY, -cOffZ, -cOffX, bY, -cOffZ + bracketLen,
        cOffX, bY, -cOffZ, cOffX - bracketLen, bY, -cOffZ,
        cOffX, bY, -cOffZ, cOffX, bY, -cOffZ + bracketLen,
        -cOffX, bY, cOffZ, -cOffX + bracketLen, bY, cOffZ,
        -cOffX, bY, cOffZ, -cOffX, bY, cOffZ - bracketLen,
        cOffX, bY, cOffZ, cOffX - bracketLen, bY, cOffZ,
        cOffX, bY, cOffZ, cOffX, bY, cOffZ - bracketLen,
      ];
      const bracketGeo = new THREE.BufferGeometry();
      bracketGeo.setAttribute('position', new THREE.Float32BufferAttribute(bracketVerts, 3));
      bGroup.add(new THREE.LineSegments(bracketGeo, new THREE.LineBasicMaterial({ color: '#ea580c' })));

      // --- STATIC INTERNAL RACKS & X-RAY SHELLS PER ZONE ---
      if (bKey === 'A2') {
        // A2 (50m x 84m matching A4): 13-Row Gravity Flow Rail positioned in rear (-Z) half aligned with A4 Racks + 104 sky-blue X-frames + front forklift aisles
        const railSteelBlue = new THREE.MeshStandardMaterial({ color: '#1d4ed8', metalness: 0.8, roughness: 0.3 });
        const railGuideOrange = new THREE.MeshStandardMaterial({ color: '#ea580c', metalness: 0.6, roughness: 0.4 });
        const rollerGalvanized = new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.9, roughness: 0.15 });
        const stopperHazardMat = new THREE.MeshStandardMaterial({ color: '#eab308', metalness: 0.7, roughness: 0.3 });
        const stopperBlackMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.6 });
        const infeedGreenMat = new THREE.MeshStandardMaterial({ color: '#10b981', metalness: 0.6, roughness: 0.4 });
        const floorLineYellowMat = new THREE.MeshBasicMaterial({ color: '#eab308' });
        const floorLineWhiteMat = new THREE.MeshBasicMaterial({ color: '#94a3b8' });
        const arrowMat = new THREE.MeshBasicMaterial({ map: createFlowArrowTexture(), transparent: true, opacity: 0.95 });

        const RAIL_CENTER_Z = -19.5;
        const RAIL_SPACING_Z = 3.0;
        const RAIL_BANK_DEPTH = 39.8; // spans R13 (-37.5) to R01 (-1.5) with outer aprons
        const TRACK_X_START = 13.6;
        const TRACK_X_END = -13.6;
        const TRACK_LENGTH = TRACK_X_START - TRACK_X_END; // 27.2m
        const POS_SPACING_X = TRACK_LENGTH / 8; // 3.4m per slot
        const SLOPE_DROP = 0.65;
        const Y_OUTFEED = 1.65;
        const Y_INFEED = Y_OUTFEED + SLOPE_DROP;
        const slopeAngle = Math.atan2(SLOPE_DROP, TRACK_LENGTH);
        const getRailYAtX = (x: number) => {
          const clampedX = Math.max(TRACK_X_END, Math.min(TRACK_X_START, x));
          return Y_OUTFEED + ((clampedX - TRACK_X_END) / TRACK_LENGTH) * SLOPE_DROP;
        };

        // Light studio flow-rail bay concrete pad in rear (-Z) half
        const railDeckPad = new THREE.Mesh(
          new THREE.PlaneGeometry(43.0, RAIL_BANK_DEPTH + 1.4),
          new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.78 })
        );
        railDeckPad.rotation.x = -Math.PI / 2;
        railDeckPad.position.set(0, 0.806, RAIL_CENTER_Z);
        railDeckPad.receiveShadow = true;
        bGroup.add(railDeckPad);

        // Outfeed Yellow Strip (-X) & Infeed Green Strip (+X) matching A2FlowRail3DView
        const outfeedZone = new THREE.Mesh(
          new THREE.BoxGeometry(3.4, 0.025, RAIL_BANK_DEPTH),
          new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.7 })
        );
        outfeedZone.position.set(-17.6, 0.815, RAIL_CENTER_Z);

        const infeedZone = new THREE.Mesh(
          new THREE.BoxGeometry(3.4, 0.025, RAIL_BANK_DEPTH),
          new THREE.MeshStandardMaterial({ color: '#10b981', roughness: 0.7 })
        );
        infeedZone.position.set(17.6, 0.815, RAIL_CENTER_Z);
        bGroup.add(outfeedZone, infeedZone);

        // Batched geometry vertices for all 104 sky-blue X-frame pallet docking markers (13 rows x 8 cols)
        const xBoxVerts: number[] = [];
        const cosA = Math.cos(slopeAngle);
        const sinA = Math.sin(slopeAngle);
        const halfSlotW = 1.18;
        const halfSlotD = 0.82;

        for (let r = 1; r <= 13; r++) {
          const zPos = RAIL_CENTER_Z + (7 - r) * RAIL_SPACING_Z; // R01 at -1.5 (+Z side), R13 at -37.5 (-Z rear wall)
          const rLabel = `R${String(r).padStart(2, '0')}`;

          // Floor engraved decals along Outfeed (-17.6) & Infeed (+17.6) strips
          const outfeedFloorDecal = new THREE.Mesh(
            new THREE.PlaneGeometry(2.7, 1.55),
            new THREE.MeshBasicMaterial({ map: createA2FloorDecalTexture(r, 'OUTFEED'), side: THREE.DoubleSide })
          );
          outfeedFloorDecal.position.set(-17.6, 0.834, zPos);
          outfeedFloorDecal.rotation.x = -Math.PI / 2;
          outfeedFloorDecal.rotation.z = -Math.PI / 2;

          const infeedFloorDecal = new THREE.Mesh(
            new THREE.PlaneGeometry(2.7, 1.55),
            new THREE.MeshBasicMaterial({ map: createA2FloorDecalTexture(r, 'INFEED'), side: THREE.DoubleSide })
          );
          infeedFloorDecal.position.set(17.6, 0.834, zPos);
          infeedFloorDecal.rotation.x = -Math.PI / 2;
          infeedFloorDecal.rotation.z = Math.PI / 2;
          bGroup.add(outfeedFloorDecal, infeedFloorDecal);

          // Upright gantry signs flanking Outfeed & Infeed ends
          const outSign = new THREE.Mesh(
            new THREE.PlaneGeometry(1.45, 0.62),
            new THREE.MeshBasicMaterial({ map: createA2SignTexture(rLabel, '#0f172a', '#f59e0b'), side: THREE.DoubleSide })
          );
          outSign.position.set(-14.25, Y_OUTFEED + 0.92, zPos);
          outSign.rotation.y = -Math.PI / 2;

          const inSign = new THREE.Mesh(
            new THREE.PlaneGeometry(1.45, 0.62),
            new THREE.MeshBasicMaterial({ map: createA2SignTexture(rLabel, '#0f172a', '#38bdf8'), side: THREE.DoubleSide })
          );
          inSign.position.set(14.25, Y_INFEED + 0.92, zPos);
          inSign.rotation.y = Math.PI / 2;
          bGroup.add(outSign, inSign);

          // Dual Yellow Floor Lane Guide Lines + Flow Arrows under each rail
          const laneGeo = new THREE.BoxGeometry(28.8, 0.012, 0.07);
          const laneTop = new THREE.Mesh(laneGeo, floorLineYellowMat);
          laneTop.position.set(0, 0.822, zPos + RAIL_SPACING_Z / 2 - 0.12);
          const laneBtm = new THREE.Mesh(laneGeo, floorLineYellowMat);
          laneBtm.position.set(0, 0.822, zPos - RAIL_SPACING_Z / 2 + 0.12);
          bGroup.add(laneTop, laneBtm);

          const flowArrow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.88), arrowMat);
          flowArrow.rotation.x = -Math.PI / 2;
          flowArrow.position.set(0, 0.826, zPos);
          bGroup.add(flowArrow);

          // Continuous Blue Side Channels + Orange Guide Flanges
          const bedLen = TRACK_LENGTH + 0.8;
          const yMid = getRailYAtX(0) - 0.08;
          const leftChan = new THREE.Mesh(new THREE.BoxGeometry(bedLen, 0.16, 0.08), railSteelBlue);
          leftChan.position.set(0, yMid, zPos - 0.95);
          leftChan.rotation.z = slopeAngle;
          const rightChan = new THREE.Mesh(new THREE.BoxGeometry(bedLen, 0.16, 0.08), railSteelBlue);
          rightChan.position.set(0, yMid, zPos + 0.95);
          rightChan.rotation.z = slopeAngle;

          const leftFlange = new THREE.Mesh(new THREE.BoxGeometry(bedLen, 0.05, 0.04), railGuideOrange);
          leftFlange.position.set(0, yMid + 0.1, zPos - 0.95);
          leftFlange.rotation.z = slopeAngle;
          const rightFlange = new THREE.Mesh(new THREE.BoxGeometry(bedLen, 0.05, 0.04), railGuideOrange);
          rightFlange.position.set(0, yMid + 0.1, zPos + 0.95);
          rightFlange.rotation.z = slopeAngle;
          bGroup.add(leftChan, rightChan, leftFlange, rightFlange);

          // 6 pairs of vertical support posts anchored onto A2 floor slab (y=0.8)
          [-13.2, -7.9, -2.6, 2.6, 7.9, 13.2].forEach(xLeg => {
            const legH = getRailYAtX(xLeg) - 0.8;
            const pL = new THREE.Mesh(new THREE.BoxGeometry(0.11, legH, 0.11), railSteelBlue);
            pL.position.set(xLeg, 0.8 + legH / 2, zPos - 0.95);
            const pR = new THREE.Mesh(new THREE.BoxGeometry(0.11, legH, 0.11), railSteelBlue);
            pR.position.set(xLeg, 0.8 + legH / 2, zPos + 0.95);
            bGroup.add(pL, pR);
          });

          // Galvanized Gravity Rollers across rail span
          const numRollers = 24;
          for (let ro = 0; ro < numRollers; ro++) {
            const xRol = TRACK_X_START - ro * (TRACK_LENGTH / (numRollers - 1));
            const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.82, 8), rollerGalvanized);
            roller.rotation.x = Math.PI / 2;
            roller.position.set(xRol, getRailYAtX(xRol) - 0.05, zPos);
            bGroup.add(roller);
          }

          // Green Entry Guides (Infeed) + Hazard Yellow/Black End Stopper (Outfeed)
          const infeedGuideL = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.26, 0.08), infeedGreenMat);
          infeedGuideL.position.set(TRACK_X_START + 0.38, Y_INFEED + 0.08, zPos - 1.12);
          infeedGuideL.rotation.y = -Math.PI / 6;
          const infeedGuideR = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.26, 0.08), infeedGreenMat);
          infeedGuideR.position.set(TRACK_X_START + 0.38, Y_INFEED + 0.08, zPos + 1.12);
          infeedGuideR.rotation.y = Math.PI / 6;
          const stopper = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.52, 1.95), stopperHazardMat);
          stopper.position.set(TRACK_X_END - 0.22, Y_OUTFEED + 0.22, zPos);
          const stopperPad = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 1.5), stopperBlackMat);
          stopperPad.position.set(TRACK_X_END - 0.12, Y_OUTFEED + 0.24, zPos);
          bGroup.add(infeedGuideL, infeedGuideR, stopper, stopperPad);

          // 8 Pallet Docking Slots per rail -> batched sky-blue X-frames + floor bay dividers
          for (let p = 1; p <= 8; p++) {
            const xPos = TRACK_X_END + (p - 0.5) * POS_SPACING_X;
            const slotY = getRailYAtX(xPos) + 0.025;

            const div = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.014, 1.85), floorLineWhiteMat);
            div.position.set(xPos - POS_SPACING_X / 2, 0.822, zPos);
            bGroup.add(div);

            // Transform local inclined slot corners (+-halfSlotW, 0, +-halfSlotD) rotated around Z by slopeAngle
            const xL = xPos - halfSlotW * cosA;
            const yL = slotY - halfSlotW * sinA;
            const xR = xPos + halfSlotW * cosA;
            const yR = slotY + halfSlotW * sinA;
            const zF = zPos + halfSlotD;
            const zB = zPos - halfSlotD;

            // Outer sky-blue rectangular frame
            xBoxVerts.push(
              xL, yL, zB, xR, yR, zB,
              xR, yR, zB, xR, yR, zF,
              xR, yR, zF, xL, yL, zF,
              xL, yL, zF, xL, yL, zB,
              // Internal X diagonal crossbars
              xL, yL, zB, xR, yR, zF,
              xL, yL, zF, xR, yR, zB
            );
          }
        }

        const xBoxGeo = new THREE.BufferGeometry();
        xBoxGeo.setAttribute('position', new THREE.Float32BufferAttribute(xBoxVerts, 3));
        bGroup.add(new THREE.LineSegments(xBoxGeo, new THREE.LineBasicMaterial({ color: '#0284c7' })));

        // --- Front (+Z) Open Concrete Area & Interior Forklift Aisles (z = +1.5 to +42) ---
        const aisleFloorMat = new THREE.MeshStandardMaterial({ color: '#f1f5f9', roughness: 0.85 });
        const crossApronZ = 5.2;

        // EW Transfer Apron connecting Outfeed (-17.6), Central Aisle, Infeed (+17.6) & East Loading Dock (+25)
        const ewApron = new THREE.Mesh(new THREE.PlaneGeometry(46.0, 5.4), aisleFloorMat);
        ewApron.rotation.x = -Math.PI / 2;
        ewApron.position.set(1.5, 0.808, crossApronZ);
        ewApron.receiveShadow = true;

        // Main NS Interior Forklift Corridor through center of front concrete bay
        const nsAisle = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 37.5), aisleFloorMat);
        nsAisle.rotation.x = -Math.PI / 2;
        nsAisle.position.set(0, 0.808, 22.8);
        nsAisle.receiveShadow = true;

        // Outfeed & Infeed feeder spurs linking strips straight into the front EW Apron
        const outfeedSpur = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 6.2), aisleFloorMat);
        outfeedSpur.rotation.x = -Math.PI / 2;
        outfeedSpur.position.set(-17.6, 0.808, 3.0);
        const infeedSpur = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 6.2), aisleFloorMat);
        infeedSpur.rotation.x = -Math.PI / 2;
        infeedSpur.position.set(17.6, 0.808, 3.0);

        // Safety Yellow Centerlines + Crisp White Edge Lines for Forklift Paths
        const yellowCenterEW = new THREE.Mesh(new THREE.PlaneGeometry(42.0, 0.18), floorLineYellowMat);
        yellowCenterEW.rotation.x = -Math.PI / 2;
        yellowCenterEW.position.set(1.5, 0.815, crossApronZ);

        const yellowCenterNS = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 36.0), floorLineYellowMat);
        yellowCenterNS.rotation.x = -Math.PI / 2;
        yellowCenterNS.position.set(0, 0.815, 23.0);

        const aisleBorderVerts = [
          // EW apron north & south stripes
          -21.5, 0.816, crossApronZ - 2.65, 24.5, 0.816, crossApronZ - 2.65,
          -21.5, 0.816, crossApronZ + 2.65, -3.2, 0.816, crossApronZ + 2.65,
          3.2, 0.816, crossApronZ + 2.65, 24.5, 0.816, crossApronZ + 2.65,
          // NS aisle left & right safety stripes
          -3.2, 0.816, crossApronZ + 2.65, -3.2, 0.816, 41.2,
          3.2, 0.816, crossApronZ + 2.65, 3.2, 0.816, 41.2,
          // Front open concrete bay subtle zone perimeter frames (Left & Right Staging Concrete Pads)
          -22.5, 0.816, 10.0, -5.2, 0.816, 10.0,
          -5.2, 0.816, 10.0, -5.2, 0.816, 39.0,
          -5.2, 0.816, 39.0, -22.5, 0.816, 39.0,
          -22.5, 0.816, 39.0, -22.5, 0.816, 10.0,
          5.2, 0.816, 10.0, 22.5, 0.816, 10.0,
          22.5, 0.816, 10.0, 22.5, 0.816, 39.0,
          22.5, 0.816, 39.0, 5.2, 0.816, 39.0,
          5.2, 0.816, 39.0, 5.2, 0.816, 10.0,
        ];
        const aisleBorderGeo = new THREE.BufferGeometry();
        aisleBorderGeo.setAttribute('position', new THREE.Float32BufferAttribute(aisleBorderVerts, 3));

        bGroup.add(
          ewApron,
          nsAisle,
          outfeedSpur,
          infeedSpur,
          yellowCenterEW,
          yellowCenterNS,
          new THREE.LineSegments(aisleBorderGeo, floorLineYellowMat)
        );

        // Pedestrian / Forklift Zebra Crossing near Front Entry
        for (let zx = -2.4; zx <= 2.4; zx += 0.72) {
          const zebra = new THREE.Mesh(
            new THREE.PlaneGeometry(0.4, 1.05),
            new THREE.MeshBasicMaterial({ color: '#ffffff' })
          );
          zebra.rotation.x = -Math.PI / 2;
          zebra.position.set(zx, 0.818, 37.5);
          bGroup.add(zebra);
        }

        // 2 Realistic Forklifts operating on the A2 interior forklift lanes
        const a2Forklift1 = createRealisticForklift(-13.5, 0.82, crossApronZ, Math.PI / 2, 0.88);
        const a2Forklift2 = createRealisticForklift(0, 0.82, 24.0, 0, 0.88);
        bGroup.add(a2Forklift1, a2Forklift2);

        // Translucent X-Ray Shell for A2 (100% matched dimensions & bay structure to A4: 50m x 84m)
        const a2Shell = buildFactoryXrayShell({
          width: spec.size.w,
          wallHeight: 10.5,
          roofPeakAdd: 4.5,
          depth: spec.size.d,
          baseY: 0.8,
          bayDivisionsX: 4,
          bayDivisionsZ: 10,
        });
        xrayShellsGroupRef.current.set('A2', a2Shell);
        bGroup.add(a2Shell);
      } else if (bKey === 'A4') {
        // A4 Unified Vertical Hall (50m x 84m = A2): 100% Layout Parity with A4UnifiedFactory3DView
        // Selective Racks B-F (12 bays) + G-K (5 bays) + Floor Staging X1-X8 (432 cells) + Open Staging Right & 2 Forklifts
        const A4_SHIFT_X = 2.8;
        const A4_SHIFT_Z = 2.5;
        const BAY_SPAN_Z = 2.4;
        const RACK_FRAME_DEPTH = 1.15;
        const RACK_TOTAL_HEIGHT = 5.6;

        const steelBracingMat = new THREE.MeshStandardMaterial({
          color: '#60a5fa',
          metalness: 0.8,
          roughness: 0.3,
        });
        const wireDeckMat = new THREE.MeshStandardMaterial({
          color: '#94a3b8',
          metalness: 0.9,
          roughness: 0.2,
        });

        // Left Perimeter Steel I-Beam Columns matching A4UnifiedFactory3DView
        for (let p = 0; p < 10; p++) {
          const pz = -36 + p * 8.0;
          const perimeterPost = new THREE.Mesh(new THREE.BoxGeometry(0.6, 7.6, 0.6), uprightBlueMat);
          perimeterPost.position.set(-24.2, 0.8 + 3.8, pz);
          perimeterPost.castShadow = true;
          bGroup.add(perimeterPost);
        }

        // Open Floor Space Frame on the Right (+X side, below G-K / beside X1-X8)
        const openAreaBorder = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.BoxGeometry(14.5, 0.02, 56.0)),
          new THREE.LineBasicMaterial({ color: '#94a3b8', transparent: true, opacity: 0.65 })
        );
        openAreaBorder.position.set(14.8, 0.82, 4.5);
        bGroup.add(openAreaBorder);

        // 2 Realistic Forklifts operating inside A4's right logistics floor
        const a4Forklift1 = createRealisticForklift(14.5, 0.82, 8.0, -Math.PI / 2, 0.95);
        const a4Forklift2 = createRealisticForklift(14.5, 0.82, -14.5, Math.PI * 0.85, 0.95);
        bGroup.add(a4Forklift1, a4Forklift2);

        const da4d2Rows = [
          { name: 'B', x: -23.5 + A4_SHIFT_X },
          { name: 'C', x: -18.2 + A4_SHIFT_X },
          { name: 'D', x: -16.4 + A4_SHIFT_X },
          { name: 'E', x: -11.0 + A4_SHIFT_X },
          { name: 'F', x: -9.2 + A4_SHIFT_X },
        ];
        const da4d3Rows = [
          { name: 'G', x: -1.5 + A4_SHIFT_X },
          { name: 'H', x: 4.0 + A4_SHIFT_X },
          { name: 'I', x: 5.8 + A4_SHIFT_X },
          { name: 'J', x: 11.2 + A4_SHIFT_X },
          { name: 'K', x: 13.0 + A4_SHIFT_X },
        ];

        const rackRowsAll = [
          ...da4d2Rows.map(r => ({ ...r, sec: '2', bays: 12, zStart: -12.0 + A4_SHIFT_Z, signZ: -10.6 + A4_SHIFT_Z })),
          ...da4d3Rows.map(r => ({ ...r, sec: '3', bays: 5, zStart: -28.8 + A4_SHIFT_Z, signZ: -27.45 + A4_SHIFT_Z })),
        ];

        // Collect batched transforms for uprights/bracing & wire decking so all 85 bays stay high-FPS
        const bracePanelH = RACK_TOTAL_HEIGHT / 4;
        const braceDiagLen = Math.sqrt(RACK_FRAME_DEPTH * RACK_FRAME_DEPTH + bracePanelH * bracePanelH);
        const braceDiagAngle = Math.atan2(bracePanelH, RACK_FRAME_DEPTH);
        const sideFrames: Array<{ x: number; z: number }> = [];
        const wireDeckCenters: Array<{ x: number; y: number; z: number }> = [];

        rackRowsAll.forEach(r => {
          const headSign = new THREE.Mesh(
            new THREE.PlaneGeometry(1.2, 0.6),
            new THREE.MeshBasicMaterial({
              map: createA4RackHeadDecalTexture(r.name, `DA4D-${r.sec}`, r.sec === '2' ? '#2563eb' : '#8b5cf6', r.bays),
              side: THREE.DoubleSide,
            })
          );
          headSign.position.set(r.x, 0.8 + 4.5, r.signZ);
          bGroup.add(headSign);

          for (let bay = 1; bay <= r.bays; bay++) {
            const zBayCenter = r.zStart - (bay - 1) * BAY_SPAN_Z;
            const zStart = zBayCenter + BAY_SPAN_Z / 2;
            const zEnd = zBayCenter - BAY_SPAN_Z / 2;
            const xFront = r.x + RACK_FRAME_DEPTH / 2;
            const xRear = r.x - RACK_FRAME_DEPTH / 2;

            [
              [xFront, zStart],
              [xRear, zStart],
              ...(bay === r.bays
                ? [
                    [xFront, zEnd],
                    [xRear, zEnd],
                  ]
                : []),
            ].forEach(([px, pz]) => {
              const col = new THREE.Mesh(new THREE.BoxGeometry(0.1, RACK_TOTAL_HEIGHT, 0.1), uprightBlueMat);
              col.position.set(px, 0.8 + RACK_TOTAL_HEIGHT / 2, pz);
              const foot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 0.18), uprightBlueMat);
              foot.position.set(px, 0.81, pz);
              const guard = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.55, 0.2), guardYellowMat);
              guard.position.set(px, 0.8 + 0.28, pz);
              bGroup.add(col, foot, guard);
            });

            sideFrames.push({ x: r.x, z: zStart });
            if (bay === r.bays) {
              sideFrames.push({ x: r.x, z: zEnd });
            }

            // Elevated orange beams + wire decking ties (L2-L4)
            for (let lvl = 2; lvl <= 4; lvl++) {
              const yLvl = (lvl === 2 ? 1.45 : lvl === 3 ? 2.85 : 4.25) + 0.8;
              [xFront, xRear].forEach(px => {
                const beam = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, BAY_SPAN_Z - 0.05), beamOrangeMat);
                beam.position.set(px, yLvl, zBayCenter);
                bGroup.add(beam);
              });
              for (let w = -2; w <= 2; w++) {
                wireDeckCenters.push({ x: r.x, y: yLvl + 0.02, z: zBayCenter + w * 0.45 });
              }
            }

            // Bay Number Floating Label above L4 (B-01..K-05)
            const baySpriteMat = new THREE.SpriteMaterial({
              map: createA4BayLabelTexture(`${r.name}-${String(bay).padStart(2, '0')}`),
              transparent: true,
            });
            const baySprite = new THREE.Sprite(baySpriteMat);
            baySprite.position.set(r.x, 0.8 + RACK_TOTAL_HEIGHT + 0.48, zBayCenter);
            baySprite.scale.set(1.32, 0.66, 1);
            bGroup.add(baySprite);
          }
        });

        // Batched InstancedMesh for Side Horizontal Ties (5 per frame) & Diagonal Braces (4 per frame)
        const hTieGeo = new THREE.BoxGeometry(RACK_FRAME_DEPTH, 0.04, 0.04);
        const hTieInst = new THREE.InstancedMesh(hTieGeo, steelBracingMat, sideFrames.length * 5);
        const diagGeo = new THREE.BoxGeometry(braceDiagLen, 0.04, 0.04);
        const diagInst = new THREE.InstancedMesh(diagGeo, steelBracingMat, sideFrames.length * 4);
        const dummy = new THREE.Object3D();
        let hIdx = 0;
        let dIdx = 0;
        sideFrames.forEach(sf => {
          for (let p = 0; p < 4; p++) {
            const yB = 0.8 + p * bracePanelH;
            const yT = 0.8 + (p + 1) * bracePanelH;
            dummy.position.set(sf.x, yB + 0.05, sf.z);
            dummy.rotation.set(0, 0, 0);
            dummy.updateMatrix();
            hTieInst.setMatrixAt(hIdx++, dummy.matrix);

            dummy.position.set(sf.x, (yB + yT) / 2, sf.z);
            dummy.rotation.set(0, 0, p % 2 === 0 ? braceDiagAngle : -braceDiagAngle);
            dummy.updateMatrix();
            diagInst.setMatrixAt(dIdx++, dummy.matrix);
          }
          dummy.position.set(sf.x, 0.8 + RACK_TOTAL_HEIGHT - 0.05, sf.z);
          dummy.rotation.set(0, 0, 0);
          dummy.updateMatrix();
          hTieInst.setMatrixAt(hIdx++, dummy.matrix);
        });
        hTieInst.instanceMatrix.needsUpdate = true;
        diagInst.instanceMatrix.needsUpdate = true;
        bGroup.add(hTieInst, diagInst);

        // Batched InstancedMesh for all 1,275 Steel Wire Deck Cross Ties
        const wireGeo = new THREE.BoxGeometry(RACK_FRAME_DEPTH - 0.05, 0.02, 0.03);
        const wireInst = new THREE.InstancedMesh(wireGeo, wireDeckMat, wireDeckCenters.length);
        wireDeckCenters.forEach((wc, idx) => {
          dummy.position.set(wc.x, wc.y, wc.z);
          dummy.rotation.set(0, 0, 0);
          dummy.updateMatrix();
          wireInst.setMatrixAt(idx, dummy.matrix);
        });
        wireInst.instanceMatrix.needsUpdate = true;
        bGroup.add(wireInst);

        // A4 Floor Staging (DA4D-1: X1-X8 = 432 cells) with Batched Cell Grids, Row Decals (R01-R46), Column Decals (C01-C12) & Zone Header Sprites
        const stagingPadMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.78 });
        const lineYellowMat = new THREE.LineBasicMaterial({ color: '#eab308' });
        const cellYellowMat = new THREE.LineBasicMaterial({ color: '#facc15' });
        const floorZonesConfig = [
          { id: 'X8', zCenter: -5.0 + A4_SHIFT_Z, rows: 4, cols: 12, startRow: 43 },
          { id: 'X7', zCenter: -0.5 + A4_SHIFT_Z, rows: 6, cols: 12, startRow: 37 },
          { id: 'X6', zCenter: 4.5 + A4_SHIFT_Z, rows: 6, cols: 12, startRow: 31 },
          { id: 'X5', zCenter: 9.5 + A4_SHIFT_Z, rows: 6, cols: 12, startRow: 25 },
          { id: 'X4', zCenter: 15.5 + A4_SHIFT_Z, rows: 6, cols: 7, startRow: 19 },
          { id: 'X3', zCenter: 20.5 + A4_SHIFT_Z, rows: 6, cols: 7, startRow: 13 },
          { id: 'X2', zCenter: 25.5 + A4_SHIFT_Z, rows: 6, cols: 7, startRow: 7 },
          { id: 'X1', zCenter: 30.5 + A4_SHIFT_Z, rows: 6, cols: 7, startRow: 1 },
        ];

        const slotPitchX = 1.4;
        const slotPitchZ = 0.7;
        const floorStartX = -24.0 + A4_SHIFT_X; // -21.2 -> leaves room for left R01-R46 decals inside -25m boundary

        // Cache C01..C12 and R01..R46 materials once so floor decals stay lightweight
        const colDecalMats: THREE.MeshBasicMaterial[] = Array.from({ length: 12 }, (_, idx) => {
          return new THREE.MeshBasicMaterial({ map: createA4FloorAxisDecalTexture('C', idx + 1), side: THREE.DoubleSide });
        });
        const rowDecalMats: THREE.MeshBasicMaterial[] = Array.from({ length: 46 }, (_, idx) => {
          return new THREE.MeshBasicMaterial({ map: createA4FloorAxisDecalTexture('R', idx + 1), side: THREE.DoubleSide });
        });

        const cellVerts: number[] = [];
        const halfCW = (slotPitchX - 0.1) / 2;
        const halfCD = (slotPitchZ - 0.08) / 2;
        const cellY = 0.844;

        floorZonesConfig.forEach(sz => {
          const padW = sz.cols * slotPitchX;
          const padD = sz.rows * slotPitchZ;
          const padX = floorStartX + padW / 2 - slotPitchX / 2;

          const pad = new THREE.Mesh(new THREE.BoxGeometry(padW, 0.03, padD), stagingPadMat);
          pad.position.set(padX, 0.818, sz.zCenter);
          pad.receiveShadow = true;

          const borderLine = new THREE.LineSegments(
            new THREE.EdgesGeometry(new THREE.BoxGeometry(padW + 0.15, 0.02, padD + 0.15)),
            lineYellowMat
          );
          borderLine.position.set(padX, 0.84, sz.zCenter);
          bGroup.add(pad, borderLine);

          // Floating Zone Header Sprite (โซน X1..X8 • DA4D-1.01) matching A4UnifiedFactory3DView
          const zoneBadgeSprite = new THREE.Sprite(
            new THREE.SpriteMaterial({
              map: createA4FloorZoneBadgeTexture(sz.id, sz.rows, sz.cols),
              transparent: true,
            })
          );
          zoneBadgeSprite.position.set(padX, 0.8 + 2.4, sz.zCenter);
          zoneBadgeSprite.scale.set(2.8, 1.4, 1);
          bGroup.add(zoneBadgeSprite);

          // Column Header Decals (C01-C12 / C01-C07) above each zone
          const zColHeader = sz.zCenter - padD / 2 - 0.42;
          for (let c = 1; c <= sz.cols; c++) {
            const xSlot = floorStartX + (c - 1) * slotPitchX;
            const colDecal = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.46), colDecalMats[c - 1]);
            colDecal.rotation.x = -Math.PI / 2;
            colDecal.position.set(xSlot, 0.836, zColHeader);
            bGroup.add(colDecal);
          }

          // Row Number Decals (R01-R46) left & right + 432 batched cell boxes
          for (let r = 1; r <= sz.rows; r++) {
            const zSlot = sz.zCenter - padD / 2 + (r - 0.5) * slotPitchZ;
            const localRow = sz.rows - r + 1;
            const globalRow = sz.startRow + (localRow - 1);
            const rMat = rowDecalMats[Math.max(0, Math.min(45, globalRow - 1))];

            const rDecalLeft = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.32), rMat);
            rDecalLeft.rotation.x = -Math.PI / 2;
            rDecalLeft.position.set(floorStartX - 1.15, 0.836, zSlot);

            const rDecalRight = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.32), rMat);
            rDecalRight.rotation.x = -Math.PI / 2;
            rDecalRight.position.set(floorStartX + padW - slotPitchX / 2 + 0.48, 0.836, zSlot);
            bGroup.add(rDecalLeft, rDecalRight);

            for (let c = 1; c <= sz.cols; c++) {
              const xSlot = floorStartX + (c - 1) * slotPitchX;
              const x1 = xSlot - halfCW;
              const x2 = xSlot + halfCW;
              const z1 = zSlot - halfCD;
              const z2 = zSlot + halfCD;
              cellVerts.push(
                x1, cellY, z1, x2, cellY, z1,
                x2, cellY, z1, x2, cellY, z2,
                x2, cellY, z2, x1, cellY, z2,
                x1, cellY, z2, x1, cellY, z1
              );
            }
          }
        });

        const cellGridGeo = new THREE.BufferGeometry();
        cellGridGeo.setAttribute('position', new THREE.Float32BufferAttribute(cellVerts, 3));
        bGroup.add(new THREE.LineSegments(cellGridGeo, cellYellowMat));

        // Translucent X-Ray Unified Factory Shell for A4 (50m x 84m Enclosing B-K Racks, X1-X8 Floor & Open Area)
        const a4Shell = buildFactoryXrayShell({
          width: spec.size.w,
          wallHeight: 10.5,
          roofPeakAdd: 4.5,
          depth: spec.size.d,
          baseY: 0.8,
          bayDivisionsX: 4,
          bayDivisionsZ: 10,
        });
        xrayShellsGroupRef.current.set('A4', a4Shell);
        bGroup.add(a4Shell);
      } else if (bKey === 'CY3') {
        // CY3 High-Bay Tent: 100% parity with CY3OutdoorRack3DView (Rows A/D 25 bays, B/C 23 bays, footplates, instanced side bracing, instanced cross wires, bay label sprites, 2 forklifts, X-Ray tent)
        const steelBracingMat = new THREE.MeshStandardMaterial({ color: '#60a5fa', roughness: 0.3, metalness: 0.8 });

        // Central Forklift Road between Row B & Row C (Bright studio corridor matching CY3OutdoorRack3DView)
        const roadPlane = new THREE.Mesh(
          new THREE.PlaneGeometry(68, 5.5),
          new THREE.MeshStandardMaterial({ color: '#f1f5f9', roughness: 0.9 })
        );
        roadPlane.rotation.x = -Math.PI / 2;
        roadPlane.position.set(0, 0.81, 0);
        bGroup.add(roadPlane);

        [-2.75, 2.75].forEach(zStripe => {
          const stripe = new THREE.Mesh(
            new THREE.PlaneGeometry(68, 0.15),
            new THREE.MeshBasicMaterial({ color: '#eab308' })
          );
          stripe.rotation.x = -Math.PI / 2;
          stripe.position.set(0, 0.82, zStripe);
          bGroup.add(stripe);
        });

        const bayWidth = 2.4;
        const rackFrameDepth = 1.2;
        const rackHeight = 5.6;

        const sideFrames: Array<{ x: number; z: number }> = [];
        const wireDeckCenters: Array<{ x: number; y: number; z: number }> = [];

        CY3_ROW_SPECS.forEach(r => {
          const rowDecalMat = new THREE.MeshBasicMaterial({
            map: createCY3RackHeadDecalTexture(r.code, r.sign, r.color, r.bays),
            side: THREE.DoubleSide,
          });

          const leftSign = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.0), rowDecalMat);
          leftSign.position.set(-30.1, 4.8, r.z);
          leftSign.rotation.y = -Math.PI / 2;
          const rightEndX = (r.bays - 13 + 0.5) * bayWidth + 0.1;
          const rightSign = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.0), rowDecalMat);
          rightSign.position.set(rightEndX, 4.8, r.z);
          rightSign.rotation.y = Math.PI / 2;
          bGroup.add(leftSign, rightSign);

          for (let bay = 1; bay <= r.bays; bay++) {
            const bayX = (bay - 13) * bayWidth;
            const xLeft = bayX - bayWidth / 2;
            const xRight = bayX + bayWidth / 2;
            const zFront = r.z + rackFrameDepth / 2;
            const zRear = r.z - rackFrameDepth / 2;

            [
              [xLeft, zFront],
              [xLeft, zRear],
              ...(bay === r.bays
                ? [
                    [xRight, zFront],
                    [xRight, zRear],
                  ]
                : []),
            ].forEach(([px, pz]) => {
              const col = new THREE.Mesh(new THREE.BoxGeometry(0.1, rackHeight, 0.1), uprightBlueMat);
              col.position.set(px, 0.8 + rackHeight / 2, pz);
              const foot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 0.18), uprightBlueMat);
              foot.position.set(px, 0.81, pz);
              const guard = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.55, 0.2), guardYellowMat);
              guard.position.set(px, 1.08, pz);
              bGroup.add(col, foot, guard);
            });

            sideFrames.push({ x: xLeft, z: r.z });
            if (bay === r.bays) {
              sideFrames.push({ x: xRight, z: r.z });
            }

            for (let lvl = 2; lvl <= 4; lvl++) {
              const yLvl = (lvl === 2 ? 1.45 : lvl === 3 ? 2.85 : 4.25) + 0.8;
              [zFront, zRear].forEach(bz => {
                const beam = new THREE.Mesh(new THREE.BoxGeometry(bayWidth - 0.05, 0.1, 0.08), beamOrangeMat);
                beam.position.set(bayX, yLvl, bz);
                bGroup.add(beam);
              });

              for (let w = -2; w <= 2; w++) {
                wireDeckCenters.push({ x: bayX + w * 0.45, y: yLvl + 0.02, z: r.z });
              }
            }

            // Always-visible floating Bay Label Sprite above L4 (A-01..D-25 / B-01..C-23)
            const baySpriteMat = new THREE.SpriteMaterial({
              map: createCY3BayLabelTexture(`${r.code}-${String(bay).padStart(2, '0')}`),
              transparent: true,
            });
            const baySprite = new THREE.Sprite(baySpriteMat);
            baySprite.position.set(bayX, 0.8 + rackHeight + 0.5, r.z);
            baySprite.scale.set(2.0, 1.0, 1);
            bGroup.add(baySprite);
          }
        });

        // Batched InstancedMesh for CY3 Side Horizontal Ties (5 per frame) & Diagonal Steel Bracing (4 per frame)
        const cy3PanelH = rackHeight / 4;
        const cy3DiagLen = Math.sqrt(rackFrameDepth * rackFrameDepth + cy3PanelH * cy3PanelH);
        const cy3DiagAngle = Math.atan2(cy3PanelH, rackFrameDepth);
        const cy3HTieGeo = new THREE.BoxGeometry(0.04, 0.04, rackFrameDepth);
        const cy3HTieInst = new THREE.InstancedMesh(cy3HTieGeo, steelBracingMat, sideFrames.length * 5);
        const cy3DiagGeo = new THREE.BoxGeometry(0.04, 0.04, cy3DiagLen);
        const cy3DiagInst = new THREE.InstancedMesh(cy3DiagGeo, steelBracingMat, sideFrames.length * 4);
        const cy3Dummy = new THREE.Object3D();
        let chIdx = 0;
        let cdIdx = 0;
        sideFrames.forEach(sf => {
          for (let p = 0; p < 4; p++) {
            const yB = 0.8 + p * cy3PanelH;
            const yT = 0.8 + (p + 1) * cy3PanelH;
            cy3Dummy.position.set(sf.x, yB + 0.05, sf.z);
            cy3Dummy.rotation.set(0, 0, 0);
            cy3Dummy.updateMatrix();
            cy3HTieInst.setMatrixAt(chIdx++, cy3Dummy.matrix);

            cy3Dummy.position.set(sf.x, (yB + yT) / 2, sf.z);
            cy3Dummy.rotation.set(p % 2 === 0 ? cy3DiagAngle : -cy3DiagAngle, 0, 0);
            cy3Dummy.updateMatrix();
            cy3DiagInst.setMatrixAt(cdIdx++, cy3Dummy.matrix);
          }
          cy3Dummy.position.set(sf.x, 0.8 + rackHeight - 0.05, sf.z);
          cy3Dummy.rotation.set(0, 0, 0);
          cy3Dummy.updateMatrix();
          cy3HTieInst.setMatrixAt(chIdx++, cy3Dummy.matrix);
        });
        cy3HTieInst.instanceMatrix.needsUpdate = true;
        cy3DiagInst.instanceMatrix.needsUpdate = true;
        bGroup.add(cy3HTieInst, cy3DiagInst);

        // Batched InstancedMesh for CY3 L2-L4 Cross Support Wires
        const cy3WireGeo = new THREE.BoxGeometry(0.03, 0.02, rackFrameDepth - 0.05);
        const cy3WireInst = new THREE.InstancedMesh(cy3WireGeo, steelBracingMat, wireDeckCenters.length);
        wireDeckCenters.forEach((wc, idx) => {
          cy3Dummy.position.set(wc.x, wc.y, wc.z);
          cy3Dummy.rotation.set(0, 0, 0);
          cy3Dummy.updateMatrix();
          cy3WireInst.setMatrixAt(idx, cy3Dummy.matrix);
        });
        cy3WireInst.instanceMatrix.needsUpdate = true;
        bGroup.add(cy3WireInst);

        // 2 Realistic Forklifts on left & right ends of central road (matching CY3OutdoorRack3DView)
        const cy3ForkliftLeft = createRealisticForklift(-32.2, 0.8, 0, Math.PI / 2, 1.0);
        const cy3ForkliftRight = createRealisticForklift(32.2, 0.8, 0, -Math.PI / 2, 1.0);
        bGroup.add(cy3ForkliftLeft, cy3ForkliftRight);

        // Tall Elongated X-Ray Tent Enclosure for CY3 (Toggleable via X-Ray checkbox)
        const cy3TentShell = buildCY3HighBayTentShell(spec.size.w, spec.size.d, 8.2, 5.2);
        xrayShellsGroupRef.current.set('CY3', cy3TentShell);
        bGroup.add(cy3TentShell);
      } else if (bKey === 'A5') {
        // A5: Exact 100% layout parity with A5CanopyTents3DView (4 Arched Tents, 2x2 cross-aisle, 784 cell grids, group & tent decals, steel arch trusses, forklifts)
        const roadMat = new THREE.MeshStandardMaterial({ color: '#f1f5f9', roughness: 0.9 });
        const yellowLineMat = new THREE.MeshBasicMaterial({ color: '#eab308' });
        const whiteLineMat = new THREE.MeshBasicMaterial({ color: '#f8fafc' });
        const tentSlabMat = new THREE.MeshStandardMaterial({ color: '#162032', roughness: 0.75 });
        const grpFloorMat = new THREE.MeshStandardMaterial({ color: '#1a2333', roughness: 0.9 });
        const redFrameMat = new THREE.LineBasicMaterial({ color: '#dc2626' });
        const yellowGrpBorderMat = new THREE.LineBasicMaterial({ color: '#eab308' });
        const slotGridMat = new THREE.LineBasicMaterial({ color: '#64748b' });
        const pillarMat = new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.7, roughness: 0.48 });
        const trussMat = new THREE.MeshStandardMaterial({ color: '#64748b', metalness: 0.85, roughness: 0.25 });
        const roofMat = new THREE.MeshStandardMaterial({
          color: '#e2e8f0',
          roughness: 0.3,
          metalness: 0.05,
          transparent: true,
          opacity: 0.24,
          side: THREE.DoubleSide,
          depthWrite: false,
        });

        // Central Crossroad Markings (matching A5CanopyTents3DView)
        const roadEW = new THREE.Mesh(new THREE.PlaneGeometry(spec.size.w - 1, 6.2), roadMat);
        roadEW.rotation.x = -Math.PI / 2;
        roadEW.position.set(0, 0.045, 0);
        roadEW.receiveShadow = true;

        const roadNS = new THREE.Mesh(new THREE.PlaneGeometry(6.2, spec.size.d - 1), roadMat);
        roadNS.rotation.x = -Math.PI / 2;
        roadNS.position.set(0, 0.045, 0);
        roadNS.receiveShadow = true;

        const centerLineEW = new THREE.Mesh(new THREE.PlaneGeometry(spec.size.w - 8, 0.2), yellowLineMat);
        centerLineEW.rotation.x = -Math.PI / 2;
        centerLineEW.position.set(0, 0.052, 0);

        const centerLineNS = new THREE.Mesh(new THREE.PlaneGeometry(0.2, spec.size.d - 8), yellowLineMat);
        centerLineNS.rotation.x = -Math.PI / 2;
        centerLineNS.position.set(0, 0.052, 0);
        bGroup.add(roadEW, roadNS, centerLineEW, centerLineNS);

        [-3.4, 3.4].forEach(z => {
          for (let x = -2.4; x <= 2.4; x += 0.72) {
            const zebra = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.96), whiteLineMat);
            zebra.rotation.x = -Math.PI / 2;
            zebra.position.set(x, 0.055, z);
            bGroup.add(zebra);
          }
        });

        // 3 Forklifts patrolling the cross-aisle (matching A5CanopyTents3DView)
        const fl1 = createRealisticForklift(0, 0.05, 14.8, 0, 0.82);
        const fl2 = createRealisticForklift(0, 0.05, -14.8, Math.PI, 0.82);
        const fl3 = createRealisticForklift(24.5, 0.05, 0, -Math.PI / 2, 0.82);
        bGroup.add(fl1, fl2, fl3);

        // Exact 0.80x scaled dimensions from A5CanopyTents3DView (36.4 : 12.2 ratio)
        const TENT_W = 29.2;
        const TENT_D = 9.8;
        const TENT_H = 5.0;
        const roofSagitta = 2.24;
        const archPeakY = TENT_H + roofSagitta; // 7.24m exact center apex

        const tentPositions = [
          { id: 1, signCode: 'DA5T-1.01', x: -18.0, z: 9.2 },
          { id: 2, signCode: 'DA5T-2.01', x: -18.0, z: -9.2 },
          { id: 3, signCode: 'DA5T-3.01', x: 18.0, z: 9.2 },
          { id: 4, signCode: 'DA5T-4.01', x: 18.0, z: -9.2 },
        ];

        const a5ShellGroup = new THREE.Group();
        xrayShellsGroupRef.current.set('A5', a5ShellGroup);
        bGroup.add(a5ShellGroup);

        const groupSpacingX = 4.0;
        const slotPitchX = 0.76;
        const slotPitchZ = 1.16;
        const slotWidth = 0.70;
        const slotDepth = 1.05;

        tentPositions.forEach(t => {
          const tGrp = new THREE.Group();
          tGrp.position.set(t.x, 0, t.z);

          // 1. Concrete Slab Foundation
          const slab = new THREE.Mesh(new THREE.BoxGeometry(TENT_W, 0.22, TENT_D), tentSlabMat);
          slab.position.y = 0.11;
          slab.receiveShadow = true;
          tGrp.add(slab);

          // 2. Red Perimeter Frame Border
          const border = new THREE.LineSegments(
            new THREE.EdgesGeometry(new THREE.BoxGeometry(TENT_W, 0.06, TENT_D)),
            redFrameMat
          );
          border.position.y = 0.24;
          tGrp.add(border);

          // 3. 8 Symmetric Structural Pillars + Safety Yellow Bases along Top & Bottom
          const pzTop = -TENT_D / 2 + 0.28;
          const pzBtm = TENT_D / 2 - 0.28;

          for (let i = 0; i <= 7; i++) {
            const px = (i - 3.5) * groupSpacingX; // -14.0 to +14.0 symmetrically flanking the 7 groups
            [pzTop, pzBtm].forEach(pz => {
              const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.4, TENT_H, 0.4), pillarMat);
              pillar.position.set(px, TENT_H / 2, pz);
              pillar.castShadow = true;
              const base = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.32, 0.52), guardYellowMat);
              base.position.set(px, 0.16, pz);
              tGrp.add(pillar, base);
            });
          }

          // 4. Tent Floor Engraved Decal (เต็นท์ผ้าใบ 1-4)
          const tentDecalZ = TENT_D / 2 + 2.25;
          const floorDecal = new THREE.Mesh(
            new THREE.PlaneGeometry(5.2, 1.22),
            new THREE.MeshBasicMaterial({ map: createA5TentFloorDecalTexture(t.id, t.signCode), side: THREE.DoubleSide })
          );
          floorDecal.rotation.x = -Math.PI / 2;
          floorDecal.position.set(0, 0.235, tentDecalZ);
          tGrp.add(floorDecal);

          // 5. 7 Groups x 4 Rows x 7 Columns = 196 Parking Slot Grids + Group Head Decals (กลุ่ม 1-7)
          const slotGridVerts: number[] = [];
          const halfSW = slotWidth / 2;
          const halfSD = slotDepth / 2;

          for (let g = 1; g <= 7; g++) {
            const grpCenterX = (g - 4) * groupSpacingX;

            const grpFloor = new THREE.Mesh(new THREE.PlaneGeometry(3.22, 8.5), grpFloorMat);
            grpFloor.rotation.x = -Math.PI / 2;
            grpFloor.position.set(grpCenterX, 0.225, 0);
            grpFloor.receiveShadow = true;
            tGrp.add(grpFloor);

            const grpBorder = new THREE.LineSegments(
              new THREE.EdgesGeometry(new THREE.BoxGeometry(3.3, 0.02, 8.6)),
              yellowGrpBorderMat
            );
            grpBorder.position.set(grpCenterX, 0.23, 0);
            tGrp.add(grpBorder);

            // Group Head Floor Decal (กลุ่ม 1 - 7)
            const grpFloorDecal = new THREE.Mesh(
              new THREE.PlaneGeometry(1.72, 0.78),
              new THREE.MeshBasicMaterial({ map: createA5GroupFloorTexture(g), side: THREE.DoubleSide })
            );
            const grpDecalZ = t.id === 1 || t.id === 3 ? TENT_D / 2 + 0.72 : TENT_D / 2 + 0.65;
            grpFloorDecal.position.set(grpCenterX, 0.24, grpDecalZ);
            grpFloorDecal.rotation.x = -Math.PI / 2;
            tGrp.add(grpFloorDecal);

            // 4 Sub-Rows x 7 Columns Parking Grid Lines
            for (let r = 1; r <= 4; r++) {
              const slotX = grpCenterX + (r - 2.5) * slotPitchX;
              for (let c = 1; c <= 7; c++) {
                const slotZ = t.z > 0 ? -TENT_D / 2 + 0.96 + (c - 1) * slotPitchZ : TENT_D / 2 - 0.96 - (c - 1) * slotPitchZ;
                const yG = 0.236;
                const x1 = slotX - halfSW;
                const x2 = slotX + halfSW;
                const z1 = slotZ - halfSD;
                const z2 = slotZ + halfSD;
                slotGridVerts.push(
                  x1, yG, z1, x2, yG, z1,
                  x2, yG, z1, x2, yG, z2,
                  x2, yG, z2, x1, yG, z2,
                  x1, yG, z2, x1, yG, z1
                );
              }
            }
          }

          const slotGridGeo = new THREE.BufferGeometry();
          slotGridGeo.setAttribute('position', new THREE.Float32BufferAttribute(slotGridVerts, 3));
          tGrp.add(new THREE.LineSegments(slotGridGeo, slotGridMat));

          // 6. Roof Shell Group (8 Curved Steel Arch Trusses + Purlins + Translucent Canopy + Gable End Caps)
          const tShell = new THREE.Group();
          tShell.position.set(t.x, 0, t.z);

          for (let i = 0; i <= 7; i++) {
            const px = (i - 3.5) * groupSpacingX;
            const curve = new THREE.QuadraticBezierCurve3(
              new THREE.Vector3(px, TENT_H, pzTop),
              new THREE.Vector3(px, TENT_H + roofSagitta * 2, 0),
              new THREE.Vector3(px, TENT_H, pzBtm)
            );
            const archTubeGeo = new THREE.TubeGeometry(curve, 24, 0.095, 8, false);
            const archTubeMesh = new THREE.Mesh(archTubeGeo, trussMat);
            archTubeMesh.castShadow = true;
            tShell.add(archTubeMesh);
          }

          [
            { z: 0, y: archPeakY },
            { z: pzTop, y: TENT_H },
            { z: pzBtm, y: TENT_H },
          ].forEach(p => {
            const purlin = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, TENT_W, 8), trussMat);
            purlin.rotation.z = Math.PI / 2;
            purlin.position.set(0, p.y, p.z);
            tShell.add(purlin);
          });

          // Exact overhead circular arc canopy matching trusses & gable caps
          const cylRadius = (pzBtm * pzBtm + roofSagitta * roofSagitta) / (2 * roofSagitta);
          const arcHalfAngle = Math.asin(Math.min(0.99, pzBtm / cylRadius));
          const cylGeo = new THREE.CylinderGeometry(
            cylRadius,
            cylRadius,
            TENT_W + 0.3,
            32,
            1,
            true,
            Math.PI / 2 - arcHalfAngle,
            arcHalfAngle * 2
          );
          const roofMesh = new THREE.Mesh(cylGeo, roofMat);
          roofMesh.rotation.z = Math.PI / 2;
          roofMesh.position.y = archPeakY - cylRadius;
          roofMesh.receiveShadow = true;
          tShell.add(roofMesh);

          // Curved Gable End Caps
          [-TENT_W / 2 - 0.08, TENT_W / 2 + 0.08].forEach(endX => {
            const gableShape = new THREE.Shape();
            gableShape.moveTo(-pzBtm, TENT_H);
            const steps = 20;
            for (let s = 0; s <= steps; s++) {
              const ratio = s / steps;
              const zVal = -pzBtm + ratio * (2 * pzBtm);
              const yVal = TENT_H + 2.24 * (1 - Math.pow(zVal / pzBtm, 2));
              gableShape.lineTo(zVal, yVal);
            }
            gableShape.lineTo(pzBtm, TENT_H);
            gableShape.closePath();

            const gableMesh = new THREE.Mesh(new THREE.ShapeGeometry(gableShape), roofMat);
            gableMesh.rotation.y = Math.PI / 2;
            gableMesh.position.set(endX, 0, 0);
            tShell.add(gableMesh);
          });

          a5ShellGroup.add(tShell);
          bGroup.add(tGrp);
        });
      }

      buildingMeshesRef.current.set(bKey, bGroup);
      buildingsGroup.add(bGroup);

      // Billboard 3D Sprite Label
      const initBuilding = telemetry.buildings[bKey];
      const spriteTex = createBillboardLabelTexture(
        spec.name,
        `${initBuilding.occupied}/${spec.capacity} P (${initBuilding.percent}%)`,
        spec.accentHex,
        initBuilding.status
      );
      const spriteMat = new THREE.SpriteMaterial({ map: spriteTex, depthTest: false });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.set(spec.position.x, spec.size.h + 5.5, spec.position.z);
      sprite.scale.set(24, 5.8, 1);
      labelSpritesRef.current.set(bKey, sprite);
      scene.add(sprite);

      // Heatmap Overlay Plane
      const heatGeo = new THREE.PlaneGeometry(spec.size.w + 1, spec.size.d + 1);
      const heatTex = createBuildingHeatmapTexture(initBuilding);
      const heatMat = new THREE.MeshBasicMaterial({
        map: heatTex,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const heatMesh = new THREE.Mesh(heatGeo, heatMat);
      heatMesh.rotation.x = -Math.PI / 2;
      heatMesh.position.set(spec.position.x, spec.size.h + 0.5, spec.position.z);
      heatMesh.visible = false;
      heatmapMeshesRef.current.set(bKey, heatMesh);
      scene.add(heatMesh);
    });

    scene.add(buildingsGroup);

    // Dynamic Pallets Container (rebuilt cleanly whenever inventory/aging changes)
    const dynamicPalletsGroup = new THREE.Group();
    dynamicPalletsGroupRef.current = dynamicPalletsGroup;
    scene.add(dynamicPalletsGroup);

    // CY3 Slot Hover Neon Highlight Wireframe (shown when zoomed into CY3)
    const cy3HoverHighlight = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.02, 0.98, 1.16)),
      new THREE.LineBasicMaterial({ color: '#38bdf8' })
    );
    cy3HoverHighlight.visible = false;
    cy3HoverHighlightRef.current = cy3HoverHighlight;
    scene.add(cy3HoverHighlight);

    // Raycaster & Interaction Events
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };

    const handlePointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // When focused inside CY3, prioritize exact P1/P2 rack slot hitboxes
      if (selectedBuildingRef.current === 'CY3' && cy3SlotHitMeshesRef.current.length > 0) {
        const slotHits = raycaster.intersectObjects(cy3SlotHitMeshesRef.current, false);
        if (slotHits.length > 0) {
          const slot = slotHits[0].object.userData.cy3Slot as {
            row: 'A' | 'B' | 'C' | 'D';
            bay: number;
            level: ShelfLevel;
            pos: 'P1' | 'P2';
            locator: string;
            item?: InventoryItem;
            wx: number;
            wy: number;
            wz: number;
          };
          if (cy3HoverHighlightRef.current) {
            cy3HoverHighlightRef.current.position.set(slot.wx, slot.wy, slot.wz);
            cy3HoverHighlightRef.current.visible = true;
          }
          setHoveredBuilding('CY3');
          setHoverTooltip(null);
          setHoveredCy3Slot({
            x: e.clientX,
            y: e.clientY,
            row: slot.row,
            bay: slot.bay,
            level: slot.level,
            pos: slot.pos,
            locator: slot.locator,
            item: slot.item,
          });
          container.style.cursor = 'pointer';
          return;
        }
      }

      if (cy3HoverHighlightRef.current) cy3HoverHighlightRef.current.visible = false;
      setHoveredCy3Slot(null);

      const boxes = Array.from(boundingBoxesRef.current.values()) as THREE.Object3D[];
      const intersects = raycaster.intersectObjects(boxes, false);

      if (intersects.length > 0) {
        const key = intersects[0].object.userData.buildingKey as BuildingKey;
        setHoveredBuilding(key);
        setHoverTooltip({ x: e.clientX, y: e.clientY, buildingKey: key });
        container.style.cursor = 'pointer';
      } else {
        setHoveredBuilding(null);
        setHoverTooltip(null);
        container.style.cursor = 'default';
      }
    };

    const handleClick = (e: MouseEvent) => {
      // Ignore orbit drag releases
      const dx = e.clientX - pointerDownPos.x;
      const dy = e.clientY - pointerDownPos.y;
      if (Math.hypot(dx, dy) > 6) return;

      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // When focused inside CY3, clicking any rack slot opens the scanner directly on that exact slot
      if (selectedBuildingRef.current === 'CY3' && cy3SlotHitMeshesRef.current.length > 0) {
        const slotHits = raycaster.intersectObjects(cy3SlotHitMeshesRef.current, false);
        if (slotHits.length > 0) {
          const slot = slotHits[0].object.userData.cy3Slot as {
            row: 'A' | 'B' | 'C' | 'D';
            bay: number;
            level: ShelfLevel;
            pos: 'P1' | 'P2';
            locator: string;
            item?: InventoryItem;
          };
          onOpenScannerRef.current?.(
            `CY3-${slot.row}` as StorageZone,
            slot.bay,
            slot.level,
            slot.item ? 'OUT' : 'IN',
            slot.locator,
            slot.pos,
            slot.item ?? null
          );
          return;
        }
      }

      const boxes = Array.from(boundingBoxesRef.current.values()) as THREE.Object3D[];
      const intersects = raycaster.intersectObjects(boxes, false);

      if (intersects.length > 0) {
        const key = intersects[0].object.userData.buildingKey as BuildingKey;
        handleSelectBuildingRef.current(key);
      }
    };

    const handleDoubleClick = () => {
      handleResetViewRef.current();
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('pointerdown', handlePointerDown);
    domElem.addEventListener('pointermove', handlePointerMove);
    domElem.addEventListener('click', handleClick);
    domElem.addEventListener('dblclick', handleDoubleClick);

    // ResizeObserver handles window resizes AND left/right HUD panel collapses smoothly
    const updateSize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth || 1000;
      const h = mountRef.current.clientHeight || 650;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(() => updateSize());
    resizeObserver.observe(container);
    window.addEventListener('resize', updateSize);

    // Animation Loop (Pre-allocated variables inside closure, no allocations per frame)
    let animFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animFrameId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.1);
      const time = clock.getElapsedTime();

      if (isCameraTransitioningRef.current) {
        const lambda = 4.5;
        camera.position.x = THREE.MathUtils.damp(camera.position.x, cameraTargetPos.current.x, lambda, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, cameraTargetPos.current.y, lambda, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, cameraTargetPos.current.z, lambda, dt);

        controls.target.x = THREE.MathUtils.damp(controls.target.x, controlsTargetPos.current.x, lambda, dt);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, controlsTargetPos.current.y, lambda, dt);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, controlsTargetPos.current.z, lambda, dt);

        if (
          camera.position.distanceTo(cameraTargetPos.current) < 0.25 &&
          controls.target.distanceTo(controlsTargetPos.current) < 0.25
        ) {
          isCameraTransitioningRef.current = false;
        }
      }
      controls.update();

      // Guided Tour Mode progression
      if (isTourActiveRef.current && !isTourPausedRef.current) {
        tourTimerRef.current += dt;
        const wp = TOUR_WAYPOINTS[tourStepRef.current];
        const stepDuration = wp.duration || 7;
        setTourProgress(Math.min(100, Math.round((tourTimerRef.current / stepDuration) * 100)));

        cameraTargetPos.current.set(wp.cameraPos.x, wp.cameraPos.y, wp.cameraPos.z);
        controlsTargetPos.current.set(wp.targetPos.x, wp.targetPos.y, wp.targetPos.z);
        isCameraTransitioningRef.current = true;

        if (tourTimerRef.current >= stepDuration) {
          tourTimerRef.current = 0;
          const nextStep = (tourStepRef.current + 1) % TOUR_WAYPOINTS.length;
          tourStepRef.current = nextStep;
          setTourStep(nextStep);
        }
      }

      // Heatmap visibility
      const activeHeatmap = showHeatmapRef.current;
      heatmapMeshesRef.current.forEach(mesh => {
        if (activeHeatmap) {
          mesh.visible = true;
          if (mesh.material instanceof THREE.MeshBasicMaterial) {
            mesh.material.opacity = 0.55 + Math.sin(time * 3.0) * 0.15;
          }
        } else {
          mesh.visible = false;
        }
      });

      // Highlight hovered/selected building perimeter
      (Object.keys(BUILDINGS) as BuildingKey[]).forEach(bKey => {
        const bGroup = buildingMeshesRef.current.get(bKey);
        if (bGroup) {
          const outline = bGroup.getObjectByName(`outline-${bKey}`) as THREE.LineSegments | undefined;
          if (outline) {
            const active = hoveredBuildingRef.current === bKey || selectedBuildingRef.current === bKey;
            outline.scale.setScalar(active ? 1.025 : 1.0);
          }
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animFrameId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateSize);
      controls.removeEventListener('start', onControlStart);
      domElem.removeEventListener('pointerdown', handlePointerDown);
      domElem.removeEventListener('pointermove', handlePointerMove);
      domElem.removeEventListener('click', handleClick);
      domElem.removeEventListener('dblclick', handleDoubleClick);
      controls.dispose();
      roomEnvTexture.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // =========================================================================
  // 2. REBUILD DYNAMIC PALLETS WHEN STOCK / AGING CONFIG / FILTER CHANGES
  // =========================================================================
  useEffect(() => {
    const grp = dynamicPalletsGroupRef.current;
    const assets = sharedPalletAssetsRef.current;
    if (!grp || !assets) return;

    disposeObject3DSubtree(grp, assets.geos, assets.mats);
    grp.clear();

    const getCargoMat = (item: InventoryItem) => {
      const tier = resolveItemAgingTier(item, effectiveAgingConfig);
      if (activeAgingFilter && tier !== activeAgingFilter) {
        return { mat: assets.dimmedMat, wire: null };
      }
      if (colorMode === 'URGENT' && tier !== 'OVERDUE' && tier !== 'URGENT') {
        return { mat: assets.dimmedMat, wire: null };
      }
      return {
        mat: assets.tierMats[tier],
        wire: tier === 'OVERDUE' ? assets.urgentWireMat : assets.edgeWireMat,
      };
    };

    const addPalletBox = (
      parent: THREE.Group,
      wx: number,
      wy: number,
      wz: number,
      bw: number,
      bh: number,
      bd: number,
      item: InventoryItem,
      rotZ = 0
    ) => {
      const pGrp = new THREE.Group();
      pGrp.position.set(wx, wy, wz);
      if (rotZ !== 0) pGrp.rotation.z = rotZ;

      const base = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.06, 0.06, bd + 0.06), assets.woodMat);
      base.position.y = 0.03;
      pGrp.add(base);

      const { mat, wire } = getCargoMat(item);
      const box = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), mat);
      box.position.y = 0.06 + bh / 2;
      box.castShadow = true;
      pGrp.add(box);

      if (wire) {
        const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(bw + 0.02, bh + 0.02, bd + 0.02)), wire);
        edge.position.y = 0.06 + bh / 2;
        pGrp.add(edge);
      }

      parent.add(pGrp);
    };

    // --- A2 Flow Rail Pallets (13 rails x 8 pos, rear -Z half aligned with A4 Selective Racks) ---
    {
      const spec = BUILDINGS.A2;
      const RAIL_CENTER_Z = -19.5;
      const RAIL_SPACING_Z = 3.0;
      const TRACK_X_START = 13.6;
      const TRACK_X_END = -13.6;
      const TRACK_LENGTH = TRACK_X_START - TRACK_X_END;
      const POS_SPACING_X = TRACK_LENGTH / 8;
      const SLOPE_DROP = 0.65;
      const Y_OUTFEED = 1.65;
      const slopeAngle = Math.atan2(SLOPE_DROP, TRACK_LENGTH);
      const getRailYAtX = (x: number) =>
        Y_OUTFEED + ((Math.max(TRACK_X_END, Math.min(TRACK_X_START, x)) - TRACK_X_END) / TRACK_LENGTH) * SLOPE_DROP;

      for (let r = 1; r <= 13; r++) {
        const zPos = spec.position.z + RAIL_CENTER_Z + (7 - r) * RAIL_SPACING_Z;
        for (let p = 1; p <= 8; p++) {
          const item = slotMaps.a2Map.get(`${r}-${p}`);
          if (!item) continue;
          const localX = TRACK_X_END + (p - 0.5) * POS_SPACING_X;
          addPalletBox(grp, spec.position.x + localX, getRailYAtX(localX), zPos, 1.9, 1.0, 1.38, item, slopeAngle);
        }
      }
    }

    // --- A4 Selective Racks (B-F 12 bays, G-K 5 bays) + Floor Staging (X1-X8) ---
    {
      const spec = BUILDINGS.A4;
      const A4_SHIFT_X = 2.8;
      const A4_SHIFT_Z = 2.5;
      const BAY_SPAN_Z = 2.4;
      const RACK_FRAME_DEPTH = 1.15;

      const rackRows = [
        { name: 'B', x: -23.5 + A4_SHIFT_X, bays: 12, zStart: -12.0 + A4_SHIFT_Z },
        { name: 'C', x: -18.2 + A4_SHIFT_X, bays: 12, zStart: -12.0 + A4_SHIFT_Z },
        { name: 'D', x: -16.4 + A4_SHIFT_X, bays: 12, zStart: -12.0 + A4_SHIFT_Z },
        { name: 'E', x: -11.0 + A4_SHIFT_X, bays: 12, zStart: -12.0 + A4_SHIFT_Z },
        { name: 'F', x: -9.2 + A4_SHIFT_X, bays: 12, zStart: -12.0 + A4_SHIFT_Z },
        { name: 'G', x: -1.5 + A4_SHIFT_X, bays: 5, zStart: -28.8 + A4_SHIFT_Z },
        { name: 'H', x: 4.0 + A4_SHIFT_X, bays: 5, zStart: -28.8 + A4_SHIFT_Z },
        { name: 'I', x: 5.8 + A4_SHIFT_X, bays: 5, zStart: -28.8 + A4_SHIFT_Z },
        { name: 'J', x: 11.2 + A4_SHIFT_X, bays: 5, zStart: -28.8 + A4_SHIFT_Z },
        { name: 'K', x: 13.0 + A4_SHIFT_X, bays: 5, zStart: -28.8 + A4_SHIFT_Z },
      ];

      rackRows.forEach(r => {
        for (let bay = 1; bay <= r.bays; bay++) {
          const zBayCenter = r.zStart - (bay - 1) * BAY_SPAN_Z;
          for (let lvl = 1; lvl <= 4; lvl++) {
            const yLvl = (lvl === 1 ? 0 : lvl === 2 ? 1.45 : lvl === 3 ? 2.85 : 4.25) + 0.8 + (lvl === 1 ? 0 : 0.05);
            (['P1', 'P2'] as const).forEach((pos, pIdx) => {
              const item = slotMaps.a4RackMap.get(`${r.name}-${bay}-${lvl}-${pos}`);
              if (!item) return;
              const zOff = pIdx === 0 ? -0.55 : 0.55;
              addPalletBox(
                grp,
                spec.position.x + r.x,
                yLvl,
                spec.position.z + zBayCenter + zOff,
                RACK_FRAME_DEPTH - 0.16,
                0.82,
                0.88,
                item
              );
            });
          }
        }
      });

      const floorZones = [
        { id: 'X8', zCenter: -5.0 + A4_SHIFT_Z, rows: 4, cols: 12 },
        { id: 'X7', zCenter: -0.5 + A4_SHIFT_Z, rows: 6, cols: 12 },
        { id: 'X6', zCenter: 4.5 + A4_SHIFT_Z, rows: 6, cols: 12 },
        { id: 'X5', zCenter: 9.5 + A4_SHIFT_Z, rows: 6, cols: 12 },
        { id: 'X4', zCenter: 15.5 + A4_SHIFT_Z, rows: 6, cols: 7 },
        { id: 'X3', zCenter: 20.5 + A4_SHIFT_Z, rows: 6, cols: 7 },
        { id: 'X2', zCenter: 25.5 + A4_SHIFT_Z, rows: 6, cols: 7 },
        { id: 'X1', zCenter: 30.5 + A4_SHIFT_Z, rows: 6, cols: 7 },
      ];
      const slotPitchX = 1.4;
      const slotPitchZ = 0.7;
      const floorStartX = -24.0 + A4_SHIFT_X;

      floorZones.forEach(sz => {
        const padD = sz.rows * slotPitchZ;
        for (let r = 1; r <= sz.rows; r++) {
          const localRow = sz.rows - r + 1;
          const pz = sz.zCenter - padD / 2 + (r - 0.5) * slotPitchZ;
          for (let c = 1; c <= sz.cols; c++) {
            const item = slotMaps.a4FloorMap.get(`${sz.id}-${localRow}-${c}`);
            if (!item) continue;
            const px = floorStartX + (c - 1) * slotPitchX;
            addPalletBox(grp, spec.position.x + px, 0.85, spec.position.z + pz, 1.08, 0.68, 0.52, item);
          }
        }
      });
    }

    cy3SlotHitMeshesRef.current = [];

    // --- CY3 High-Bay Tent Pallets (3-Runner Wood Pallet + Box + Interactive P1/P2 Hitboxes) ---
    {
      const spec = BUILDINGS.CY3;
      const bayWidth = 2.4;
      const rackFrameDepth = 1.2;

      CY3_ROW_SPECS.forEach(r => {
        for (let bay = 1; bay <= r.bays; bay++) {
          const bayX = (bay - 13) * bayWidth;
          for (let lvl = 1; lvl <= 4; lvl++) {
            const yLvl = (lvl === 1 ? 0 : lvl === 2 ? 1.45 : lvl === 3 ? 2.85 : 4.25) + 0.8 + (lvl === 1 ? 0 : 0.05);
            (['P1', 'P2'] as const).forEach((pos, pIdx) => {
              const xOff = pIdx === 0 ? -0.55 : 0.55;
              const wx = spec.position.x + bayX + xOff;
              const wz = spec.position.z + r.z;
              const locator = `${r.sign}-${r.code}${String(bay).padStart(2, '0')}-L${lvl}-${pos}`;
              const item = slotMaps.cy3Map.get(`${r.code}-${bay}-${lvl}-${pos}`);

              // Interactive P1/P2 Slot Hitbox (Active when zoomed into CY3)
              const hitMesh = new THREE.Mesh(assets.cy3HitGeo, assets.cy3HitMat);
              hitMesh.position.set(wx, yLvl + 0.48, wz);
              hitMesh.userData.cy3Slot = {
                row: r.code,
                bay,
                level: lvl as ShelfLevel,
                pos,
                locator,
                item,
                wx,
                wy: yLvl + 0.48,
                wz,
              };
              grp.add(hitMesh);
              cy3SlotHitMeshesRef.current.push(hitMesh);

              if (!item) return;

              // Pine Wood Pallet Base with 3 Runners + Cargo Box matching CY3OutdoorRack3DView
              const pGrp = new THREE.Group();
              pGrp.position.set(wx, yLvl, wz);
              const palletDepth = rackFrameDepth - 0.1;

              const deck = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.06, palletDepth), assets.woodMat);
              deck.position.y = 0.08;
              deck.castShadow = true;
              pGrp.add(deck);

              [-0.4, 0, 0.4].forEach(rx => {
                const runner = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, palletDepth), assets.woodMat);
                runner.position.set(rx, 0.03, 0);
                pGrp.add(runner);
              });

              const { mat, wire } = getCargoMat(item);
              const box = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, rackFrameDepth - 0.15), mat);
              box.position.y = 0.51;
              box.castShadow = true;
              pGrp.add(box);

              if (wire) {
                const edge = new THREE.LineSegments(
                  new THREE.EdgesGeometry(new THREE.BoxGeometry(0.92, 0.82, rackFrameDepth - 0.13)),
                  wire
                );
                edge.position.y = 0.51;
                pGrp.add(edge);
              }

              grp.add(pGrp);
            });
          }
        }
      });
    }

    // --- A5 4 Arched Tents Pallets (4 tents x 7 groups x 4 rows x 7 cols matching 784 cell grid) ---
    {
      const spec = BUILDINGS.A5;
      const TENT_D = 9.8;
      const groupSpacingX = 4.0;
      const slotPitchX = 0.76;
      const slotPitchZ = 1.16;
      const tentPositions = [
        { id: 1, x: -18.0, z: 9.2 },
        { id: 2, x: -18.0, z: -9.2 },
        { id: 3, x: 18.0, z: 9.2 },
        { id: 4, x: 18.0, z: -9.2 },
      ];

      tentPositions.forEach(t => {
        for (let g = 1; g <= 7; g++) {
          const grpCenterX = (g - 4) * groupSpacingX;
          for (let r = 1; r <= 4; r++) {
            const sx = grpCenterX + (r - 2.5) * slotPitchX;
            for (let c = 1; c <= 7; c++) {
              const item = slotMaps.a5TentMap.get(`${t.id}-${g}-${r}-${c}`);
              if (!item) continue;
              const sz = t.z > 0 ? -TENT_D / 2 + 0.96 + (c - 1) * slotPitchZ : TENT_D / 2 - 0.96 - (c - 1) * slotPitchZ;
              addPalletBox(
                grp,
                spec.position.x + t.x + sx,
                0.24,
                spec.position.z + t.z + sz,
                0.60,
                0.92,
                0.95,
                item
              );
            }
          }
        }
      });
    }
  }, [slotMaps, effectiveAgingConfig, colorMode, activeAgingFilter]);

  // Sync Billboard Label & Heatmap Textures on Metrics Change
  useEffect(() => {
    (Object.keys(BUILDINGS) as BuildingKey[]).forEach(bKey => {
      const spec = BUILDINGS[bKey];
      const m = telemetry.buildings[bKey];

      const sprite = labelSpritesRef.current.get(bKey);
      if (sprite) {
        sprite.material.map?.dispose();
        sprite.material.map = createBillboardLabelTexture(
          spec.name,
          `${m.occupied}/${spec.capacity} P (${m.percent}%)`,
          spec.accentHex,
          m.status
        );
        sprite.material.needsUpdate = true;
      }

      const heatMesh = heatmapMeshesRef.current.get(bKey);
      if (heatMesh && heatMesh.material instanceof THREE.MeshBasicMaterial) {
        heatMesh.material.map?.dispose();
        heatMesh.material.map = createBuildingHeatmapTexture(m);
        heatMesh.material.needsUpdate = true;
      }
    });
  }, [telemetry]);

  // Sync Labels & X-Ray Building Shells visibility
  useEffect(() => {
    labelSpritesRef.current.forEach(sprite => {
      sprite.visible = showLabels;
    });
  }, [showLabels]);

  useEffect(() => {
    xrayShellsGroupRef.current.forEach(shell => {
      shell.visible = showXrayShells;
    });
  }, [showXrayShells]);

  // Tour Controls
  const handleStartTour = () => {
    setIsTourActive(true);
    setIsTourPaused(false);
    setTourStep(0);
    tourTimerRef.current = 0;
    const wp = TOUR_WAYPOINTS[0];
    flyCameraTo(wp.cameraPos, wp.targetPos);
  };

  const handleNextTourStep = () => {
    const next = (tourStep + 1) % TOUR_WAYPOINTS.length;
    setTourStep(next);
    tourTimerRef.current = 0;
    const wp = TOUR_WAYPOINTS[next];
    flyCameraTo(wp.cameraPos, wp.targetPos);
  };

  const handlePrevTourStep = () => {
    const prev = (tourStep - 1 + TOUR_WAYPOINTS.length) % TOUR_WAYPOINTS.length;
    setTourStep(prev);
    tourTimerRef.current = 0;
    const wp = TOUR_WAYPOINTS[prev];
    flyCameraTo(wp.cameraPos, wp.targetPos);
  };

  const handleSelectTourStep = (index: number) => {
    setTourStep(index);
    tourTimerRef.current = 0;
    const wp = TOUR_WAYPOINTS[index];
    flyCameraTo(wp.cameraPos, wp.targetPos);
  };

  const handleExitTour = () => {
    setIsTourActive(false);
    setIsTourPaused(false);
    handleResetView();
  };

  const handleToggleZen3D = () => {
    setBottomHudOpen(prev => !prev);
  };

  const handleFocusAlert = (alert: FactoryAlertItem) => {
    handleSelectBuilding(alert.buildingKey);
  };

  const handleToggleAgingFilter = (tier: AgingTier) => {
    setActiveAgingFilter(prev => (prev === tier ? null : tier));
  };

  const isZenMode = !bottomHudOpen;

  return (
    <div className="w-full h-full flex flex-col min-h-0 bg-[#f1f5f9] text-slate-100 font-sans relative overflow-hidden">
      {/* Top Smart Factory Telemetry Control Bar */}
      <div className="bg-[#09111E] border-b border-slate-800 px-3 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0 z-30">
        {/* Left: Title / Breadcrumb & HUD Toggle */}
        <div className="flex items-center gap-2 text-xs font-bold flex-wrap">
          <button
            type="button"
            onClick={handleResetView}
            className={`px-2.5 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer ${
              !selectedBuilding
                ? 'bg-cyan-600 text-white border-cyan-400'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>ผังรวมโรงงาน 3D</span>
          </button>

          {selectedBuilding && (
            <>
              <div className="px-2.5 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                <span>{BUILDINGS[selectedBuilding].name}</span>
              </div>
              <button
                type="button"
                onClick={() => onNavigateToZone(BUILDINGS[selectedBuilding].targetNavigation)}
                className="px-2.5 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>เข้าสู่หน้าเต็มโซน</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {/* Live Telemetry Summary Pill (Compact Inline) */}
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#0D1729] border border-slate-800 font-mono tabular-nums text-[11px]">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-300">
              <strong className="text-cyan-300">{telemetry.occupiedPallets}</strong> / {telemetry.totalCapacity.toLocaleString()} P
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-orange-400">{telemetry.occupancyPct}%</span>
          </div>
        </div>

        {/* Right: 3D View Controls, X-Ray & Side HUD Toggles */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
          {/* Guided Tour */}
          <button
            type="button"
            onClick={isTourActive ? handleExitTour : handleStartTour}
            className={`px-2.5 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer ${
              isTourActive
                ? 'bg-orange-600 text-white border-orange-400'
                : 'bg-sky-700 hover:bg-sky-600 text-white border-sky-500'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            <span>{isTourActive ? 'จบนำชม' : 'นำชม 3D'}</span>
          </button>

          {/* Heatmap */}
          <button
            type="button"
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`px-2.5 py-1.5 rounded-lg border transition-colors flex items-center gap-1 cursor-pointer ${
              showHeatmap
                ? 'bg-orange-600/90 text-white border-orange-400'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span className="hidden sm:inline">Heatmap</span>
          </button>

          {/* Camera Angles */}
          <div className="flex items-center bg-[#060B14] p-0.5 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={handleResetView}
              className={`px-2 py-1 rounded-md transition-colors flex items-center gap-1 cursor-pointer ${
                cameraPreset === 'ISO_45' && !selectedBuilding ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>45°</span>
            </button>
            <button
              type="button"
              onClick={handleTopPlanView}
              className={`px-2 py-1 rounded-md transition-colors flex items-center gap-1 cursor-pointer ${
                cameraPreset === 'TOP_85' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>85°</span>
            </button>
          </div>

          {/* Color Mode */}
          <div className="flex items-center bg-[#060B14] p-0.5 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setColorMode('AGING')}
              className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                colorMode === 'AGING' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              สี Aging
            </button>
            <button
              type="button"
              onClick={() => setColorMode('URGENT')}
              className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                colorMode === 'URGENT' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              เฉพาะเคสด่วน
            </button>
          </div>

          {/* X-Ray / Canopy Roof & Label Toggles */}
          <label className="flex items-center gap-1 px-2 py-1 bg-[#060B14] rounded-lg border border-slate-800 text-slate-300 cursor-pointer hover:text-white">
            <input
              type="checkbox"
              checked={showXrayShells}
              onChange={e => setShowXrayShells(e.target.checked)}
              className="rounded accent-cyan-500"
            />
            <span>หลังคาใส / X-Ray</span>
          </label>
          <label className="flex items-center gap-1 px-2 py-1 bg-[#060B14] rounded-lg border border-slate-800 text-slate-300 cursor-pointer hover:text-white">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={e => setShowLabels(e.target.checked)}
              className="rounded accent-cyan-500"
            />
            <span>ป้ายชื่อ</span>
          </label>

          {/* Zen 3D Fullscreen Toggle */}
          <button
            type="button"
            onClick={handleToggleZen3D}
            className={`px-2.5 py-1.5 rounded-lg border transition-colors flex items-center gap-1 cursor-pointer ${
              isZenMode
                ? 'bg-cyan-600 text-white border-cyan-400'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:text-white'
            }`}
            title={isZenMode ? 'แสดงแถบ KPI HUD ด้านล่าง' : 'พับแถบ HUD ด้านล่างเพื่อดู 3D เต็มจอ'}
          >
            {isZenMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{isZenMode ? 'แสดง HUD' : '3D เต็มจอ'}</span>
          </button>

          <button
            type="button"
            onClick={handleResetView}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700 cursor-pointer"
            title="รีเซ็ตมุมกล้อง"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main 3D Smart Factory Viewport (Full Width, Unobstructed) */}
      <div className="flex-1 w-full relative min-h-0 overflow-hidden">
        {/* Isolated Three.js WebGL Mount */}
        <div ref={mountRef} className="absolute inset-0 w-full h-full" />

        {/* Guided Tour Floating Banner */}
        {isTourActive && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-xl bg-[#09111E] border border-orange-500/50 rounded-xl p-3 shadow-2xl space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/40 font-mono text-[10px] font-bold shrink-0">
                  STEP {tourStep + 1}/{TOUR_WAYPOINTS.length}
                </span>
                <span className="font-bold text-white text-xs sm:text-sm truncate">
                  {TOUR_WAYPOINTS[tourStep].title}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handlePrevTourStep}
                  className="p-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-700 cursor-pointer"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsTourPaused(!isTourPaused)}
                  className="p-1 bg-orange-600 hover:bg-orange-500 text-white rounded cursor-pointer"
                >
                  {isTourPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={handleNextTourStep}
                  className="p-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-700 cursor-pointer"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleExitTour}
                  className="p-1 bg-red-600/80 hover:bg-red-600 text-white rounded cursor-pointer ml-1"
                >
                  <Square className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span className="truncate">{TOUR_WAYPOINTS[tourStep].description}</span>
              <span className="font-mono text-orange-300 font-bold ml-2 shrink-0">
                {isTourPaused ? 'PAUSED' : `${tourProgress}%`}
              </span>
            </div>
            <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 transition-all duration-150" style={{ width: `${tourProgress}%` }} />
            </div>
            <div className="flex items-center justify-center gap-1.5">
              {TOUR_WAYPOINTS.map((wp, idx) => (
                <button
                  key={wp.id}
                  type="button"
                  onClick={() => handleSelectTourStep(idx)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    idx === tourStep ? 'w-6 bg-orange-400' : 'w-2 bg-slate-700 hover:bg-slate-500'
                  }`}
                  title={wp.title}
                />
              ))}
            </div>
          </div>
        )}

        {/* Hover Raycaster Tooltip (Solid Dark Surface, No Blur) */}
        {hoveredCy3Slot ? (
          <div
            className="fixed z-50 pointer-events-none -translate-x-1/2 -translate-y-full -mt-3 bg-[#08101E] border border-orange-500/70 rounded-xl p-3 shadow-2xl space-y-1.5 text-xs min-w-[245px]"
            style={{ left: hoveredCy3Slot.x, top: hoveredCy3Slot.y }}
          >
            <div className="flex items-center justify-between pb-1 border-b border-slate-800 gap-2">
              <span className="font-bold text-white font-mono">{hoveredCy3Slot.locator}</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  hoveredCy3Slot.item ? 'bg-cyan-500/20 text-cyan-300' : 'bg-emerald-500/20 text-emerald-300'
                }`}
              >
                {hoveredCy3Slot.item ? 'มีสินค้า' : 'ช่องว่าง'}
              </span>
            </div>
            <div className="text-[11px] text-slate-300 font-mono">
              แถว {hoveredCy3Slot.row} &bull; เสา {String(hoveredCy3Slot.bay).padStart(2, '0')} &bull; ชั้น L
              {hoveredCy3Slot.level} &bull; {hoveredCy3Slot.pos}
            </div>
            {hoveredCy3Slot.item ? (
              <div className="bg-[#0D1729] p-2 rounded border border-slate-800 space-y-0.5 text-[11px]">
                <div className="font-bold text-cyan-300 font-mono">{hoveredCy3Slot.item.modelHE}</div>
                <div className="text-slate-300 truncate">{hoveredCy3Slot.item.partName}</div>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-0.5">
                  <span>จำนวน: {hoveredCy3Slot.item.quantity} ชิ้น</span>
                  <span className="text-orange-300">Aging: {hoveredCy3Slot.item.agingDays} วัน</span>
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-slate-400">พร้อมจัดเก็บสินค้า (คลิกเพื่อรับเข้า IN)</div>
            )}
            <div className="text-[10px] text-orange-400 text-center">คลิกช่องเพื่อเปิดหน้าต่างสแกนตรงจุด</div>
          </div>
        ) : hoverTooltip ? (
          <div
            className="fixed z-50 pointer-events-none -translate-x-1/2 -translate-y-full -mt-3 bg-[#08101E] border border-cyan-500/60 rounded-xl p-3 shadow-2xl space-y-1.5 text-xs min-w-[235px]"
            style={{ left: hoverTooltip.x, top: hoverTooltip.y }}
          >
            <div className="flex items-center justify-between pb-1 border-b border-slate-800 gap-2">
              <span className="font-bold text-white">{BUILDINGS[hoverTooltip.buildingKey].name}</span>
              <span className="font-mono text-[10px] font-bold text-cyan-300">
                {telemetry.buildings[hoverTooltip.buildingKey].status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono tabular-nums text-[11px]">
              <div className="bg-[#0D1729] p-1.5 rounded border border-slate-800">
                <div className="text-[9px] text-slate-400 font-sans">พาเลทใช้งาน</div>
                <div className="text-cyan-300 font-bold">
                  {telemetry.buildings[hoverTooltip.buildingKey].occupied} / {BUILDINGS[hoverTooltip.buildingKey].capacity} P
                </div>
              </div>
              <div className="bg-[#0D1729] p-1.5 rounded border border-slate-800">
                <div className="text-[9px] text-slate-400 font-sans">Overdue / ด่วน</div>
                <div className="text-orange-400 font-bold">
                  {telemetry.buildings[hoverTooltip.buildingKey].overdueCount +
                    telemetry.buildings[hoverTooltip.buildingKey].agingCounts.URGENT}{' '}
                  P
                </div>
              </div>
            </div>
            <div className="text-[10px] text-cyan-400 text-center">คลิกเพื่อซูมเข้าโซน • ดับเบิ้ลคลิกเพื่อรีเซ็ต</div>
          </div>
        ) : null}

      </div>

      {/* Docked Horizontal Bottom KPI HUD Panel (Topped by Quick-Zone Switcher) */}
      <BottomFactoryHudPanel
        open={bottomHudOpen}
        onToggleOpen={() => setBottomHudOpen(prev => !prev)}
        telemetry={telemetry}
        agingConfig={effectiveAgingConfig}
        activeAgingFilter={activeAgingFilter}
        onToggleAgingFilter={handleToggleAgingFilter}
        selectedBuilding={selectedBuilding}
        hoveredBuilding={hoveredBuilding}
        buildingsMeta={BUILDINGS}
        onSelectBuilding={handleSelectBuilding}
        onFocusAlert={handleFocusAlert}
        onNavigateBuilding={bKey => onNavigateToZone(BUILDINGS[bKey].targetNavigation)}
        onResetView={handleResetView}
      />
    </div>
  );
};
