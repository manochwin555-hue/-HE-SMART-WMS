import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { InventoryItem, MovementLog, WmsStats, AgingThresholdConfig, StorageZone, MovementType, WarehouseFacility, ShelfLevel } from '../types';
import { ZoneKpiFormalDashboard } from './ZoneKpiFormalDashboard';
import { ZoneKey } from '../utils/zoneKpiHelper';
import { 
  Building2, 
  ExternalLink, 
  Grid, 
  Eye, 
  Maximize2, 
  RotateCcw, 
  Sliders, 
  Layers, 
  Truck, 
  Navigation, 
  Sparkles, 
  ChevronRight, 
  Info,
  Calendar,
  Box,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Flame,
  Activity,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Square
} from 'lucide-react';

interface CampusMasterOverviewProps {
  items: InventoryItem[];
  facilities?: WarehouseFacility[];
  stats?: WmsStats;
  lowStockCount?: number;
  logs?: MovementLog[];
  agingConfig?: AgingThresholdConfig;
  onNavigateToZone: (target: 'A4_MACRO' | 'A4_RACK' | 'A4_FLOOR' | 'A4_3D' | 'A2_RAIL' | 'A2_MACRO' | 'A2_SPLIT' | 'A5_TENT' | 'A5_MACRO' | 'CY3_TENT', tentNum?: number) => void;
  onOpenScanner?: (zone: StorageZone, bay: number, level: ShelfLevel, mode: MovementType) => void;
  onOpen3D?: (zone: StorageZone, bay: number) => void;
}

type BuildingKey = 'A2' | 'A4' | 'CY3' | 'A5';

interface BuildingSpec {
  key: BuildingKey;
  name: string;
  fullName: string;
  zoneKey: ZoneKey;
  targetNavigation: 'A2_RAIL' | 'A4_FLOOR' | 'CY3_TENT' | 'A5_TENT';
  capacity: number;
  colorHex: string;
  badgeClass: string;
  position: { x: number; y: number; z: number };
  size: { w: number; h: number; d: number };
  description: string;
}

const BUILDINGS: Record<BuildingKey, BuildingSpec> = {
  A2: {
    key: 'A2',
    name: 'อาคาร A2 - Flow Rail',
    fullName: 'อาคาร A2 • Flow Rail 3D Twin (DA2D-1)',
    zoneKey: 'A2',
    targetNavigation: 'A2_RAIL',
    capacity: 104,
    colorHex: '#06b6d4',
    badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    position: { x: -68, y: 0, z: 0 },
    size: { w: 32, h: 12, d: 52 },
    description: 'รางเลื่อนลูกกลิ้ง 13 แถว R01-R13 (104 ช่องจัดเก็บ)'
  },
  A4: {
    key: 'A4',
    name: 'อาคาร A4 - Rack & Floor Staging',
    fullName: 'อาคาร A4 • Selective Rack B-K & Floor Staging (DA4D-1/2/3)',
    zoneKey: 'A4',
    targetNavigation: 'A4_FLOOR',
    capacity: 1112,
    colorHex: '#3b82f6',
    badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    position: { x: 0, y: 0, z: -4 },
    size: { w: 64, h: 18, d: 84 },
    description: 'Selective Rack B-K (680P) + ลานวางพื้นรูปตัว L X1-X8 (432P)'
  },
  CY3: {
    key: 'CY3',
    name: 'CY3 - Outdoor Heavy Rack',
    fullName: 'โซน CY3 • Outdoor Heavy Rack (DY3T)',
    zoneKey: 'CY3',
    targetNavigation: 'CY3_TENT',
    capacity: 400,
    colorHex: '#f59e0b',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    position: { x: 68, y: 0, z: -32 },
    size: { w: 40, h: 14, d: 40 },
    description: 'โครงเหล็ก Heavy Rack กลางแจ้ง 4 แถว A-D ชั้น L1-L4 เสาสูง 1.5 เท่า'
  },
  A5: {
    key: 'A5',
    name: 'อาคาร A5 - Tent Yard',
    fullName: 'โซน A5 • Tent Yard (4 Tents: Tent 1 ถึง Tent 4)',
    zoneKey: 'A5',
    targetNavigation: 'A5_TENT',
    capacity: 784,
    colorHex: '#ef4444',
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    position: { x: 68, y: 0, z: 32 },
    size: { w: 44, h: 12, d: 44 },
    description: 'เต็นท์ผ้าใบโค้ง 4 หลัง จัดรูปแบบ 2x2 (784 ช่องวางพื้น)'
  }
};

/**
 * Creates 2D texture for 3D billboard sprites floating above buildings
 */
function createBillboardLabelTexture(title: string, subtitle: string, colorHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // Background rounded pill
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)'; // Refined transparency
  ctx.strokeStyle = colorHex;
  ctx.lineWidth = 6;

  const r = 24;
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

  // Color dot indicator
  ctx.fillStyle = colorHex;
  ctx.beginPath();
  ctx.arc(36, 44, 12, 0, Math.PI * 2);
  ctx.fill();

  // Title text
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(title, 64, 52);

  // Subtitle / utilization text
  ctx.font = '22px system-ui, sans-serif';
  ctx.fillStyle = colorHex;
  ctx.fillText(subtitle, 64, 94);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/**
 * Creates Large Rack Head Decal Texture for A4 (แร็ค B-F และ G-K)
 */
function createA4RackHeadDecalTexture(rowName: string, subCode: string, color: string, totalBays: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 512, 256);

  ctx.lineWidth = 14;
  ctx.strokeStyle = '#facc15'; // Vibrant yellow safety border
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
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Creates 2D floating aisle tag texture (RUA B, RUA C, etc.)
 */
function createAisleTagTexture(label: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 80;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 4;

  const r = 16;
  ctx.beginPath();
  ctx.moveTo(r, 4);
  ctx.lineTo(canvas.width - r, 4);
  ctx.quadraticCurveTo(canvas.width - 4, 4, canvas.width - 4, r);
  ctx.lineTo(canvas.width - 4, canvas.height - r);
  ctx.quadraticCurveTo(canvas.width - 4, canvas.height - 4, canvas.width - r, canvas.height - 4);
  ctx.lineTo(r, canvas.height - 4);
  ctx.quadraticCurveTo(4, canvas.height - 4, 4, canvas.height - r);
  ctx.lineTo(4, r);
  ctx.quadraticCurveTo(4, 4, r, 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.font = 'bold 36px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#facc15';
  ctx.fillText(label, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates sign texture for A2 Flow Rail signs (R01..R13)
 */
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
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();

  ctx.fillStyle = textColor;
  ctx.font = '900 64px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates floor arrow texture for A2 Flow Rail direction
 */
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

/**
 * Creates locator tag sprite texture for A4 Racks (e.g. B-01, C-05, etc.)
 */
function createRackTagTexture(text: string, bgColor = 'rgba(15, 23, 42, 0.95)', textColor = '#facc15'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 56;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bgColor;
  ctx.strokeStyle = textColor;
  ctx.lineWidth = 4;

  ctx.beginPath();
  ctx.roundRect(4, 4, canvas.width - 8, canvas.height - 8, 10);
  ctx.fill();
  ctx.stroke();

  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = textColor;
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates zone tag sprite texture for A4 Floor Staging (e.g. โซน X1, โซน X2, etc.)
 */
function createFloorZoneTagTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 220;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgba(2, 132, 199, 0.9)';
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 4;

  ctx.beginPath();
  ctx.roundRect(6, 6, canvas.width - 12, canvas.height - 12, 12);
  ctx.fill();
  ctx.stroke();

  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates floor column decal texture (C01-C12)
 */
function createA4FloorColumnDecalTexture(colNum: number): THREE.CanvasTexture {
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
  ctx.fillText(`C${colNum < 10 ? '0' + colNum : colNum}`, 64, 32);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates floor row decal texture (R01-R46)
 */
function createA4FloorRowDecalTexture(rowNum: number): THREE.CanvasTexture {
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
  ctx.fillText(`R${rowNum < 10 ? '0' + rowNum : rowNum}`, 64, 32);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates Tent Floor Engraved Decal Texture for A5
 */
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
  ctx.font = '900 52px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`เต็นท์ผ้าใบ ${tentId}`, 256, 45);
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillText(`${signCode} • 7 กลุ่ม (196 PL)`, 256, 95);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates Group Floor Decal for A5
 */
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
  ctx.font = '900 62px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`กลุ่ม ${grpNum}`, 128, 50);
  ctx.fillStyle = '#facc15';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText(`G0${grpNum} • 28 PL`, 128, 98);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates Large Rack Head Decal Texture for CY3 (แร็ค A, B, C, D)
 */
function createCY3RackHeadDecalTexture(rowName: string, signCode: string, color: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  
  // Outer colored border
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 512, 256);

  // White border
  ctx.lineWidth = 12;
  ctx.strokeStyle = '#ffffff';
  ctx.strokeRect(6, 6, 500, 244);

  // Dark background
  ctx.fillStyle = '#090d16';
  ctx.fillRect(16, 16, 480, 224);

  // Main Title
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 84px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`แร็ค ${rowName}`, 256, 85);

  // Subtitle
  ctx.fillStyle = color;
  ctx.font = 'bold 36px system-ui, sans-serif';
  ctx.fillText(`${signCode} (25 ช่อง x 4 ชั้น)`, 256, 175);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

interface TourWaypoint {
  id: string;
  buildingKey: BuildingKey | 'OVERVIEW';
  title: string;
  subtitle: string;
  description: string;
  cameraPos: { x: number; y: number; z: number };
  targetPos: { x: number; y: number; z: number };
  duration: number; // in seconds
}

const TOUR_WAYPOINTS: TourWaypoint[] = [
  {
    id: 'overview',
    buildingKey: 'OVERVIEW',
    title: 'มุมมองรวมแคมปัส HEX WMS LGETH',
    subtitle: 'Campus 3D Digital Twin Overview',
    description: 'พื้นที่รวมคลังสินค้า 4 โซนหลัก: A2 Flow Rail, A4 Selective Rack & Floor, CY3 Heavy Rack, A5 Tent Yard ความจุรวม 2,408 พาเลท',
    cameraPos: { x: -44, y: 55, z: 70 },
    targetPos: { x: 0, y: 0, z: 0 },
    duration: 7
  },
  {
    id: 'a2',
    buildingKey: 'A2',
    title: '1. อาคาร A2 - Flow Rail 3D Twin',
    subtitle: 'Roller Flow Rail Lanes (DA2D-1)',
    description: 'ระบบรางเลื่อนลูกกลิ้ง gravity flow 13 แถว (R01-R13) ความจุ 104 ช่อง ควบคุมระบบ FIFO แบบอัตโนมัติ',
    cameraPos: { x: -84, y: 26, z: 28 },
    targetPos: { x: -62, y: 5, z: 0 },
    duration: 8
  },
  {
    id: 'a4',
    buildingKey: 'A4',
    title: '2. อาคาร A4 - Selective Rack & Floor Staging',
    subtitle: 'Main Indoor Warehouse (DA4D-1/2/3)',
    description: 'Selective Rack แถว B-K (680P) ร่วมกับลานวางพื้นรูปตัว L (X1-X8, 432P) รวมความจุใหญ่ที่สุดในไซต์ 1,112 พาเลท',
    cameraPos: { x: -22, y: 38, z: 48 },
    targetPos: { x: 0, y: 8, z: -4 },
    duration: 8
  },
  {
    id: 'cy3',
    buildingKey: 'CY3',
    title: '3. โซน CY3 - Outdoor Heavy Rack',
    subtitle: 'Heavy Structural Steel Canopy (DY3T)',
    description: 'แร็คกลางแจ้งโครงสร้างเหล็กหนาพิเศษ 4 แถว A-D ชั้น L1-L4 เสาสูง 1.5 เท่า รับน้ำหนักชิ้นส่วนเครื่องจักรหนัก ความจุ 400P',
    cameraPos: { x: 42, y: 36, z: -6 },
    targetPos: { x: 62, y: 10, z: -32 },
    duration: 8
  },
  {
    id: 'a5',
    buildingKey: 'A5',
    title: '4. โซน A5 - Tent Yard (4 Canvas Tents)',
    subtitle: 'Arched Canvas Staging Tents (Tent 1-4)',
    description: 'เต็นท์ผ้าใบโค้ง 4 หลังจัดผังแบบ 2x2 สำหรับพักรอวัตถุดิบและกล่องคาร์บอนด์ ความจุ 784 ช่องวางพื้น',
    cameraPos: { x: 42, y: 28, z: 62 },
    targetPos: { x: 62, y: 5, z: 32 },
    duration: 8
  }
];

/**
 * Generates dynamic heat map texture based on item aging density for 3D overlay
 */
function createBuildingHeatmapTexture(
  buildingKey: BuildingKey,
  metrics: { occupied: number; total: number; safeCount: number; warningCount: number; overdueCount: number }
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 256, 256);

  // Background subtle tint
  ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
  ctx.fillRect(0, 0, 256, 256);

  const total = metrics.occupied || 1;
  let baseColor = '#10b981';
  if (metrics.overdueCount > 0) {
    baseColor = '#ef4444';
  } else if (metrics.warningCount > 0) {
    baseColor = '#f59e0b';
  }

  // Draw radial heatmap spots
  const hotspotsCount = Math.max(8, Math.min(28, metrics.occupied + 6));
  for (let i = 0; i < hotspotsCount; i++) {
    const x = 32 + ((i * 37 + 13) % 192);
    const y = 32 + ((i * 53 + 29) % 192);
    const r = 24 + ((i * 13) % 32);

    let spotColor = 'rgba(16, 185, 129, 0.75)'; // safe green
    if (metrics.overdueCount > 0 && i % 3 === 0) {
      spotColor = 'rgba(239, 68, 68, 0.9)'; // overdue red
    } else if (metrics.warningCount > 0 && i % 2 === 0) {
      spotColor = 'rgba(245, 158, 11, 0.85)'; // warning amber
    }

    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, spotColor);
    grad.addColorStop(0.7, spotColor.replace('0.75', '0.3').replace('0.9', '0.35').replace('0.85', '0.3'));
    grad.addColorStop(1, 'rgba(15, 23, 42, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw luminous grid border
  ctx.strokeStyle = baseColor;
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, 246, 246);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export const CampusMasterOverview: React.FC<CampusMasterOverviewProps> = ({
  items = [],
  logs = [],
  stats,
  agingConfig,
  onNavigateToZone
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  
  // Interactive UI state
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingKey | null>(null);
  const [hoveredBuilding, setHoveredBuilding] = useState<BuildingKey | null>(null);
  const [hoverTooltip, setHoverTooltip] = useState<{ x: number; y: number; buildingKey: BuildingKey } | null>(null);
  const [colorMode, setColorMode] = useState<'UTILIZATION' | 'AGING' | 'URGENT'>('UTILIZATION');
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);
  const [cameraPreset, setCameraPreset] = useState<'ISO_45' | 'TOP_85'>('ISO_45');

  // Guided Tour Mode state
  const [isTourActive, setIsTourActive] = useState<boolean>(false);
  const [isTourPaused, setIsTourPaused] = useState<boolean>(false);
  const [tourStep, setTourStep] = useState<number>(0);
  const [tourProgress, setTourProgress] = useState<number>(0);

  // Compute building specific occupancy & aging status metrics
  const buildingMetrics = useMemo(() => {
    const metrics: Record<BuildingKey, { occupied: number; total: number; percent: number; inCount: number; outCount: number; safeCount: number; warningCount: number; overdueCount: number }> = {
      A2: { occupied: 0, total: 104, percent: 0, inCount: 0, outCount: 0, safeCount: 0, warningCount: 0, overdueCount: 0 },
      A4: { occupied: 0, total: 1112, percent: 0, inCount: 0, outCount: 0, safeCount: 0, warningCount: 0, overdueCount: 0 },
      CY3: { occupied: 0, total: 400, percent: 0, inCount: 0, outCount: 0, safeCount: 0, warningCount: 0, overdueCount: 0 },
      A5: { occupied: 0, total: 784, percent: 0, inCount: 0, outCount: 0, safeCount: 0, warningCount: 0, overdueCount: 0 },
    };

    items.forEach(item => {
      const z = String(item.zone || '');
      const loc = String(item.locatorCode || '');
      const fac = String(item.facilityId || '');

      let bKey: BuildingKey = 'A4';
      if (z.startsWith('R') || z.startsWith('FR') || fac === 'FAC-A2-RAIL' || loc.includes('DA2D')) {
        bKey = 'A2';
      } else if (z.startsWith('CY3') || z.startsWith('DY3T') || fac === 'FAC-CY3-TENT' || loc.includes('DY3T')) {
        bKey = 'CY3';
      } else if (z.startsWith('A5') || fac === 'FAC-A5-TENT') {
        bKey = 'A5';
      } else {
        bKey = 'A4';
      }

      metrics[bKey].occupied += 1;

      // Calculate aging category
      const days = item.agingDays ?? 0;
      const status = item.agingStatus || (days > 30 ? 'OVERDUE' : (days > 14 ? 'WARNING' : 'SAFE'));
      if (status === 'OVERDUE' || status === 'CRITICAL' || days > 30) {
        metrics[bKey].overdueCount += 1;
      } else if (status === 'WARNING' || days > 14) {
        metrics[bKey].warningCount += 1;
      } else {
        metrics[bKey].safeCount += 1;
      }
    });

    logs.forEach(log => {
      const loc = String(log.locatorCode || '');
      let bKey: BuildingKey = 'A4';
      if (loc.includes('DA2D') || loc.includes('FR')) bKey = 'A2';
      else if (loc.includes('DY3T') || loc.includes('CY3')) bKey = 'CY3';
      else if (loc.includes('A5')) bKey = 'A5';

      if (log.type === 'IN') metrics[bKey].inCount += 1;
      else if (log.type === 'OUT') metrics[bKey].outCount += 1;
    });

    (Object.keys(metrics) as BuildingKey[]).forEach(k => {
      metrics[k].percent = Math.min(100, Math.round((metrics[k].occupied / metrics[k].total) * 100));
    });

    return metrics;
  }, [items, logs]);

  // Ref holders for Three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const labelSpritesRef = useRef<Map<BuildingKey, THREE.Sprite>>(new Map());
  const buildingMeshesRef = useRef<Map<BuildingKey, THREE.Group>>(new Map());
  const boundingBoxesRef = useRef<Map<BuildingKey, THREE.Mesh>>(new Map());
  const heatmapMeshesRef = useRef<Map<BuildingKey, THREE.Mesh>>(new Map());
  const routePulseMeshRef = useRef<THREE.Mesh | null>(null);
  const routeCurveRef = useRef<THREE.CatmullRomCurve3 | null>(null);

  // Target camera state for smooth damping transition
  const cameraTargetPos = useRef<THREE.Vector3>(new THREE.Vector3(-44, 55, 70));
  const controlsTargetPos = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));

  // Sync refs for animation loop
  const isTourActiveRef = useRef<boolean>(isTourActive);
  const isTourPausedRef = useRef<boolean>(isTourPaused);
  const tourStepRef = useRef<number>(tourStep);
  const tourTimerRef = useRef<number>(0);
  const showHeatmapRef = useRef<boolean>(showHeatmap);
  const colorModeRef = useRef(colorMode);

  const locatorMap = useMemo(() => {
    const map = new Map<string, InventoryItem>();
    items.forEach(it => {
      if (it.locatorCode) {
        map.set(it.locatorCode.toUpperCase(), it);
      }
    });
    return map;
  }, [items]);

  useEffect(() => { isTourActiveRef.current = isTourActive; }, [isTourActive]);
  useEffect(() => { isTourPausedRef.current = isTourPaused; }, [isTourPaused]);
  useEffect(() => { tourStepRef.current = tourStep; }, [tourStep]);
  useEffect(() => { showHeatmapRef.current = showHeatmap; }, [showHeatmap]);
  useEffect(() => { colorModeRef.current = colorMode; }, [colorMode]);

  // Initialize Three.js Site Scene
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 1000;
    const height = container.clientHeight || 650;

    // 1. Scene & Renderer (Bright Pure White High-Contrast)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#ffffff'); 
    scene.fog = new THREE.FogExp2('#ffffff', 0.005);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.5, 900);
    camera.position.set(-44, 55, 70);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Prevent camera flipping below ground
    controls.minDistance = 15;
    controls.maxDistance = 250;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // 2. Lighting Setup (Crisp Studio Daylight)
    const ambientLight = new THREE.AmbientLight('#ffffff', 2.0);
    const hemiLight = new THREE.HemisphereLight('#ffffff', '#cbd5e1', 1.6);
    hemiLight.position.set(0, 80, 0);

    const dirLight = new THREE.DirectionalLight('#ffffff', 2.2);
    dirLight.position.set(80, 120, 60);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 400;
    const d = 150;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0005;

    scene.add(ambientLight, hemiLight, dirLight);

    // 3. Ground Base & Site Plate (Pure White Layout)
    const groundGroup = new THREE.Group();
    const groundGeo = new THREE.PlaneGeometry(500, 400);
    const groundMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.95,
      metalness: 0.05
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    groundGroup.add(groundMesh);

    // Site Grid Overlay
    const gridHelper = new THREE.GridHelper(500, 100, '#e2e8f0', '#f1f5f9');
    gridHelper.position.y = 0.05;
    groundGroup.add(gridHelper);
    scene.add(groundGroup);

    // 4. Transport Lines (Removed as per request)

    // 5. Build 4 Master Campus Buildings
    const buildingsGroup = new THREE.Group();
    const uprightBlueMat = new THREE.MeshStandardMaterial({ color: '#1d4ed8', metalness: 0.85, roughness: 0.25 });
    const beamOrangeMat = new THREE.MeshStandardMaterial({ color: '#ea580c', metalness: 0.65, roughness: 0.3 });
    const guardYellowMat = new THREE.MeshStandardMaterial({ color: '#eab308', roughness: 0.3 });
    const woodPineMat = new THREE.MeshStandardMaterial({ color: '#bfa079', roughness: 0.85, metalness: 0.05 });

    (Object.keys(BUILDINGS) as BuildingKey[]).forEach(bKey => {
      const spec = BUILDINGS[bKey];
      const bGroup = new THREE.Group();
      bGroup.position.set(spec.position.x, spec.position.y, spec.position.z);

      // Building Base Concrete Slab
      const slabGeo = new THREE.BoxGeometry(spec.size.w, 0.8, spec.size.d);
      const slabMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.6 });
      const slab = new THREE.Mesh(slabGeo, slabMat);
      slab.position.y = 0.4;
      slab.receiveShadow = true;
      bGroup.add(slab);

      // Raycasting collision proxy box
      const proxyGeo = new THREE.BoxGeometry(spec.size.w, spec.size.h, spec.size.d);
      const proxyMat = new THREE.MeshBasicMaterial({ visible: false });
      const proxyBox = new THREE.Mesh(proxyGeo, proxyMat);
      proxyBox.position.set(spec.position.x, spec.size.h / 2, spec.position.z);
      proxyBox.userData = { buildingKey: bKey };
      boundingBoxesRef.current.set(bKey, proxyBox);
      scene.add(proxyBox);

      // Outer Structural Frame Wireframe Outline (Perimeter Frame matching zone view)
      const frameGeo = new THREE.BoxGeometry(spec.size.w, 0.05, spec.size.d);
      const edgesGeo = new THREE.EdgesGeometry(frameGeo);
      const lineMatGlow = new THREE.LineBasicMaterial({ color: spec.colorHex, linewidth: 4 });
      const frameOutline = new THREE.LineSegments(edgesGeo, lineMatGlow);
      frameOutline.position.y = 0.81; // Correctly on top of slab
      frameOutline.name = `outline-${bKey}`;
      bGroup.add(frameOutline);

      // --- Custom Internal 3D Architecture for Each Building ---
      if (bKey === 'A2') {
        // A2: Flow Rail High-Fidelity 3D Roller Lanes matching A2FlowRail3DView (No glass shell)

        // Materials matching A2FlowRail3DView
        const railSteelBlue = new THREE.MeshStandardMaterial({ color: '#1d4ed8', metalness: 0.8, roughness: 0.3 });
        const railGuideOrange = new THREE.MeshStandardMaterial({ color: '#ea580c', metalness: 0.6, roughness: 0.4 });
        const rollerGalvanized = new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.9, roughness: 0.15 });
        const stopperHazardMat = new THREE.MeshStandardMaterial({ color: '#eab308', metalness: 0.7, roughness: 0.3 });
        const infeedGreenMat = new THREE.MeshStandardMaterial({ color: '#10b981', metalness: 0.6, roughness: 0.4 });
        const arrowTexture = createFlowArrowTexture();
        const arrowMat = new THREE.MeshBasicMaterial({ map: arrowTexture, transparent: true, opacity: 0.95 });

        // Floor Zones (Infeed Green on Right X > 0, Outfeed Yellow on Left X < 0)
        const outfeedZoneMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.7 });
        const outfeedZone = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.02, spec.size.d - 4), outfeedZoneMat);
        outfeedZone.position.set(-spec.size.w / 2 + 2.5, 0.41, 0);

        const infeedZoneMat = new THREE.MeshStandardMaterial({ color: '#10b981', roughness: 0.7 });
        const infeedZone = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.02, spec.size.d - 4), infeedZoneMat);
        infeedZone.position.set(spec.size.w / 2 - 2.5, 0.41, 0);

        bGroup.add(outfeedZone, infeedZone);

        // 13 Flow Lanes (R01 to R13)
        const trackXStart = spec.size.w / 2 - 5; // Infeed +11
        const trackXEnd = -spec.size.w / 2 + 5;  // Outfeed -11
        const trackLength = trackXStart - trackXEnd;
        const slopeDrop = 0.6;
        const yOutfeed = 0.85;
        const slopeAngle = Math.atan2(slopeDrop, trackLength);

        const getRailYAtX = (x: number) => {
          const clampedX = Math.max(trackXEnd, Math.min(trackXStart, x));
          const ratio = (clampedX - trackXEnd) / trackLength;
          return yOutfeed + ratio * slopeDrop;
        };

        for (let r = 0; r < 13; r++) {
          const zPos = -spec.size.d / 2 + 4.5 + r * (spec.size.d - 9) / 12;
          const rLabel = `R${String(r + 1).padStart(2, '0')}`;

          // Outfeed Sign (Left)
          const outfeedSignTex = createA2SignTexture(rLabel, '#0f172a', '#f59e0b');
          const outfeedSignMat = new THREE.MeshBasicMaterial({ map: outfeedSignTex, side: THREE.DoubleSide });
          const outfeedSign = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.6), outfeedSignMat);
          outfeedSign.position.set(-spec.size.w / 2 + 2.5, 1.8, zPos);
          outfeedSign.rotation.y = -Math.PI / 2;
          bGroup.add(outfeedSign);

          // Infeed Sign (Right)
          const infeedSignTex = createA2SignTexture(rLabel, '#0f172a', '#38bdf8');
          const infeedSignMat = new THREE.MeshBasicMaterial({ map: infeedSignTex, side: THREE.DoubleSide });
          const infeedSign = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.6), infeedSignMat);
          infeedSign.position.set(spec.size.w / 2 - 2.5, 1.8, zPos);
          infeedSign.rotation.y = Math.PI / 2;
          bGroup.add(infeedSign);

          // Directional Flow Arrow Mesh
          const flowArrowMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 0.9), arrowMat);
          flowArrowMesh.rotation.x = -Math.PI / 2;
          flowArrowMesh.position.set(0, 0.42, zPos);
          bGroup.add(flowArrowMesh);

          // Steel Side Channels & Guide Flanges
          const bedLen = trackLength + 0.8;
          const yMid = getRailYAtX(0) - 0.08;
          const leftChan = new THREE.Mesh(new THREE.BoxGeometry(bedLen, 0.16, 0.08), railSteelBlue);
          leftChan.position.set(0, yMid, zPos - 0.7);
          leftChan.rotation.z = slopeAngle;
          const rightChan = new THREE.Mesh(new THREE.BoxGeometry(bedLen, 0.16, 0.08), railSteelBlue);
          rightChan.position.set(0, yMid, zPos + 0.7);
          rightChan.rotation.z = slopeAngle;

          const leftFlange = new THREE.Mesh(new THREE.BoxGeometry(bedLen, 0.05, 0.04), railGuideOrange);
          leftFlange.position.set(0, yMid + 0.1, zPos - 0.7);
          leftFlange.rotation.z = slopeAngle;
          const rightFlange = new THREE.Mesh(new THREE.BoxGeometry(bedLen, 0.05, 0.04), railGuideOrange);
          rightFlange.position.set(0, yMid + 0.1, zPos + 0.7);
          rightFlange.rotation.z = slopeAngle;

          bGroup.add(leftChan, rightChan, leftFlange, rightFlange);

          // Support Leg Posts
          [-8, -4, 0, 4, 8].forEach(xLeg => {
            const legH = getRailYAtX(xLeg);
            const pL = new THREE.Mesh(new THREE.BoxGeometry(0.1, legH, 0.1), railSteelBlue);
            pL.position.set(xLeg, legH / 2 + 0.4, zPos - 0.7);
            const pR = new THREE.Mesh(new THREE.BoxGeometry(0.1, legH, 0.1), railSteelBlue);
            pR.position.set(xLeg, legH / 2 + 0.4, zPos + 0.7);
            bGroup.add(pL, pR);
          });

          // Rollers across the lane
          for (let ro = 0; ro < 18; ro++) {
            const xRol = trackXStart - (ro * (trackLength / 17));
            const ySurface = getRailYAtX(xRol);
            const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.3, 10), rollerGalvanized);
            roller.rotation.x = Math.PI / 2;
            roller.position.set(xRol, ySurface - 0.05, zPos);
            bGroup.add(roller);
          }

          // Entry Guides (Right) & Hazard Stoppers (Left)
          const infeedGuide = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.08), infeedGreenMat);
          infeedGuide.position.set(trackXStart + 0.4, yOutfeed + slopeDrop + 0.1, zPos);
          bGroup.add(infeedGuide);

          const stopper = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 1.4), stopperHazardMat);
          stopper.position.set(trackXEnd - 0.2, yOutfeed + 0.25, zPos);
          bGroup.add(stopper);

          // 8 Pallet Positions per Rail (DA2D-1-RXX-PXX)
          for (let p = 1; p <= 8; p++) {
            const pLabel = `P${String(p).padStart(2, '0')}`;
            const locator = `DA2D-1-${rLabel}-${pLabel}`;
            const item = locatorMap.get(locator);

            if (item) {
              const xPos = trackXEnd + 1.4 + (p - 1) * (trackLength - 2.8) / 7;
              const ySurface = getRailYAtX(xPos);

              // Pallet wooden base + cargo box
              const palletGrp = new THREE.Group();
              palletGrp.position.set(xPos, ySurface, zPos);
              palletGrp.rotation.z = slopeAngle;

              const runner1 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.1), woodPineMat);
              runner1.position.set(0, 0.04, 0.5);
              const runner2 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.1), woodPineMat);
              runner2.position.set(0, 0.04, -0.5);
              palletGrp.add(runner1, runner2);

              const topDeck = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.04, 1.2), woodPineMat);
              topDeck.position.set(0, 0.1, 0);
              palletGrp.add(topDeck);

              // Cargo Box with status color
              const isOverdue = item.agingDays > 30 || item.agingStatus === 'OVERDUE';
              const isWarning = item.agingDays > 14 || item.agingStatus === 'WARNING';
              const boxColor = isOverdue ? '#dc2626' : (isWarning ? '#f59e0b' : '#0284c7');
              
              const cargoMat = new THREE.MeshStandardMaterial({ color: boxColor, roughness: 0.35, metalness: 0.2 });
              const cargoBox = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 1.1), cargoMat);
              cargoBox.position.set(0, 0.58, 0);
              cargoBox.castShadow = true;
              palletGrp.add(cargoBox);

              // Wireframe cross-brace lines on cargo box
              const wireGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.42, 0.92, 1.12));
              const wireMat = new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5 });
              const wireframe = new THREE.LineSegments(wireGeo, wireMat);
              wireframe.position.set(0, 0.58, 0);
              palletGrp.add(wireframe);

              bGroup.add(palletGrp);
            }
          }
        }
      } else if (bKey === 'A4') {
        // A4: Selective Racks (B-K) + Floor Staging (X1-X8) matching 100% DA4D 3D Zone View Architecture
        const stagingPadMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.6 });
        const lineYellowMat = new THREE.MeshBasicMaterial({ color: '#facc15' });

        const BAY_SPAN_Z = 2.4;
        const RACK_FRAME_DEPTH = 1.2;
        const RACK_TOTAL_HEIGHT = 5.6;

        // 1. SELECTIVE RACKS
        // Section DA4D-2: B, C, D, E, F (10 Bays)
        const da4d2Rows = [
          { name: 'B', x: -21.0 }, { name: 'C', x: -16.0 }, { name: 'D', x: -14.2 }, { name: 'E', x: -9.2 }, { name: 'F', x: -7.4 }
        ];
        // Section DA4D-3: G, H, I, J, K (5 Bays)
        const da4d3Rows = [
          { name: 'G', x: -1.5 }, { name: 'H', x: 4.0 }, { name: 'I', x: 5.8 }, { name: 'J', x: 11.2 }, { name: 'K', x: 13.0 }
        ];

        [...da4d2Rows.map(r => ({ ...r, sec: '2', bays: 10, zStart: -14.4 })), 
         ...da4d3Rows.map(r => ({ ...r, sec: '3', bays: 5, zStart: -26.4 }))].forEach(r => {
          
          // Head Sign
          const headMat = new THREE.MeshBasicMaterial({ 
            map: createA4RackHeadDecalTexture(r.name, `DA4D-${r.sec}`, r.sec === '2' ? '#3b82f6' : '#8b5cf6', r.bays),
            side: THREE.DoubleSide 
          });
          const headSign = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.6), headMat);
          headSign.position.set(r.x, 4.5, r.zStart + 1.2);
          bGroup.add(headSign);

          for (let bay = 1; bay <= r.bays; bay++) {
            const zBayCenter = r.zStart - (bay - 1) * BAY_SPAN_Z;
            const xFront = r.x + RACK_FRAME_DEPTH / 2;
            const xRear = r.x - RACK_FRAME_DEPTH / 2;

            [xFront, xRear].forEach(px => {
              const col = new THREE.Mesh(new THREE.BoxGeometry(0.1, RACK_TOTAL_HEIGHT, 0.1), uprightBlueMat);
              col.position.set(px, RACK_TOTAL_HEIGHT / 2 + 0.4, zBayCenter);
              bGroup.add(col);
              const guard = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, 0.18), guardYellowMat);
              guard.position.set(px, 0.65, zBayCenter);
              bGroup.add(guard);
            });

            for (let lvl = 1; lvl <= 4; lvl++) {
              const yLvl = (lvl === 1 ? 0 : (lvl - 1) * 1.4) + 0.4;
              if (lvl > 1) {
                [xFront, xRear].forEach(px => {
                  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, BAY_SPAN_Z - 0.05), beamOrangeMat);
                  beam.position.set(px, yLvl, zBayCenter);
                  bGroup.add(beam);
                });
              }

              ['P1', 'P2'].forEach((pos, pIdx) => {
                const zOff = (pIdx === 0 ? -0.55 : 0.55);
                const locator = `DA4D-${r.sec}-${r.name}${String(bay).padStart(2, '0')}-L${lvl}-${pos}`;
                const item = locatorMap.get(locator);
                if (item) {
                  const palletGrp = new THREE.Group();
                  palletGrp.position.set(r.x, yLvl + (lvl === 1 ? 0 : 0.05), zBayCenter + zOff);
                  const base = new THREE.Mesh(new THREE.BoxGeometry(RACK_FRAME_DEPTH - 0.1, 0.06, 0.95), woodPineMat);
                  base.position.y = 0.08;
                  palletGrp.add(base);
                  const isOverdue = item.agingDays > 30 || item.agingStatus === 'OVERDUE';
                  const isWarning = item.agingDays > 14 || item.agingStatus === 'WARNING';
                  const boxColor = isOverdue ? '#dc2626' : (isWarning ? '#f59e0b' : '#0284c7');
                  const box = new THREE.Mesh(new THREE.BoxGeometry(RACK_FRAME_DEPTH - 0.15, 0.8, 0.9), new THREE.MeshStandardMaterial({ color: boxColor }));
                  box.position.y = 0.51;
                  palletGrp.add(box);
                  bGroup.add(palletGrp);
                }
              });
            }
          }
        });

        // 2. FLOOR STAGING (DA4D-1: X1-X8)
        const floorZonesConfig = [
          { id: 'X8', zCenter: -5.0, rows: 4, cols: 12, startRow: 43 },
          { id: 'X7', zCenter: -0.5, rows: 6, cols: 12, startRow: 37 },
          { id: 'X6', zCenter: 4.5, rows: 6, cols: 12, startRow: 31 },
          { id: 'X5', zCenter: 9.5, rows: 6, cols: 12, startRow: 25 },
          { id: 'X4', zCenter: 15.5, rows: 6, cols: 7, startRow: 19 },
          { id: 'X3', zCenter: 20.5, rows: 6, cols: 7, startRow: 13 },
          { id: 'X2', zCenter: 25.5, rows: 6, cols: 7, startRow: 7 },
          { id: 'X1', zCenter: 30.5, rows: 6, cols: 7, startRow: 1 }
        ];

        floorZonesConfig.forEach(sz => {
          const slotX = 1.4;
          const slotZ = 0.7;
          const padW = sz.cols * slotX;
          const padD = sz.rows * slotZ;
          const padX = -24.0 + padW / 2 - slotX / 2;

          const pad = new THREE.Mesh(new THREE.BoxGeometry(padW, 0.05, padD), stagingPadMat);
          pad.position.set(padX, 0.43, sz.zCenter);
          bGroup.add(pad);

          const borderLine = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(padW + 0.1, 0.02, padD + 0.1)), lineYellowMat);
          borderLine.position.set(padX, 0.44, sz.zCenter);
          bGroup.add(borderLine);

          for (let c = 1; c <= sz.cols; c++) {
            for (let r = 1; r <= sz.rows; r++) {
              const globalR = sz.startRow + (sz.rows - r);
              const locator = `${sz.id}-R${String(globalR).padStart(2, '0')}-C${String(c).padStart(2, '0')}`;
              const item = locatorMap.get(locator);
              if (item) {
                const px = -24.0 + (c - 1) * slotX;
                const pz = sz.zCenter - padD / 2 + (r - 0.5) * slotZ;
                const palletGrp = new THREE.Group();
                palletGrp.position.set(px, 0.45, pz);
                const base = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.6), woodPineMat);
                base.position.y = 0.025;
                palletGrp.add(base);
                const isOverdue = item.agingDays > 30 || item.agingStatus === 'OVERDUE';
                const isWarning = item.agingDays > 14 || item.agingStatus === 'WARNING';
                const boxColor = isOverdue ? '#dc2626' : (isWarning ? '#f59e0b' : '#0284c7');
                const box = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 0.55), new THREE.MeshStandardMaterial({ color: boxColor }));
                box.position.y = 0.38;
                palletGrp.add(box);
                bGroup.add(palletGrp);
              }
            }
          }
        });
      } else if (bKey === 'CY3') {
        // CY3 Outdoor Heavy Rack (4 rows: Row A, Row B, Row C, Row D - 100% 3D Twin of CY3 zone view)

        const rowsConfig = [
          { code: 'A', z: -12.0, signCode: 'DY3T-1.01' },
          { code: 'B', z: -4.5, signCode: 'DY3T-1.02' },
          { code: 'C', z: 4.5, signCode: 'DY3T-1.03' },
          { code: 'D', z: 12.0, signCode: 'DY3T-1.04' },
        ];

        const numBays = 25;
        const bayWidth = 2.4;
        const rackFrameDepth = 1.2;
        const rackHeight = 5.6;

        rowsConfig.forEach(r => {
          const rowColor = r.code === 'A' ? '#3b82f6' : r.code === 'B' ? '#10b981' : r.code === 'C' ? '#f59e0b' : '#8b5cf6';
          const rowDecalMat = new THREE.MeshBasicMaterial({
            map: createCY3RackHeadDecalTexture(r.code, r.signCode, rowColor),
            side: THREE.DoubleSide
          });

          // Head and Tail signs
          const headSign = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.0), rowDecalMat);
          headSign.position.set(-(numBays * bayWidth) / 2 - 0.1, 4.0, r.z);
          headSign.rotation.y = -Math.PI / 2;
          bGroup.add(headSign);

          for (let bay = 1; bay <= numBays; bay++) {
            const bayX = (bay - 13) * bayWidth;
            const xLeft = bayX - bayWidth / 2;
            const xRight = bayX + bayWidth / 2;
            const zFront = r.z + rackFrameDepth / 2;
            const zRear = r.z - rackFrameDepth / 2;

            [[xLeft, zFront], [xLeft, zRear], [xRight, zFront], [xRight, zRear]].forEach(([px, pz]) => {
              const col = new THREE.Mesh(new THREE.BoxGeometry(0.1, rackHeight, 0.1), uprightBlueMat);
              col.position.set(px, rackHeight / 2 + 0.4, pz);
              bGroup.add(col);
              const guard = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.2), guardYellowMat);
              guard.position.set(px, 0.65, pz);
              bGroup.add(guard);
            });

            for (let lvl = 1; lvl <= 4; lvl++) {
              const yLvl = (lvl === 1 ? 0 : (lvl - 1) * 1.4) + 0.4;
              if (lvl > 1) {
                [zFront, zRear].forEach(bz => {
                  const beam = new THREE.Mesh(new THREE.BoxGeometry(bayWidth - 0.05, 0.1, 0.08), beamOrangeMat);
                  beam.position.set(bayX, yLvl, bz);
                  bGroup.add(beam);
                });
              }

              ['P1', 'P2'].forEach((pos, pIdx) => {
                const xOff = (pIdx === 0 ? -0.55 : 0.55);
                const locator = `DY3T-1-${r.code}${String(bay).padStart(2, '0')}-L${lvl}-${pos}`;
                const item = locatorMap.get(locator);
                if (item) {
                  const palletGrp = new THREE.Group();
                  palletGrp.position.set(bayX + xOff, yLvl + (lvl === 1 ? 0 : 0.05), r.z);
                  const base = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.06, rackFrameDepth - 0.1), woodPineMat);
                  base.position.y = 0.08;
                  palletGrp.add(base);
                  const isOverdue = item.agingDays > 30 || item.agingStatus === 'OVERDUE';
                  const isWarning = item.agingDays > 14 || item.agingStatus === 'WARNING';
                  const boxColor = isOverdue ? '#dc2626' : (isWarning ? '#f59e0b' : '#0284c7');
                  const box = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, rackFrameDepth - 0.15), new THREE.MeshStandardMaterial({ color: boxColor }));
                  box.position.y = 0.51;
                  palletGrp.add(box);
                  bGroup.add(palletGrp);
                }
              });
            }
          }
        });
      } else if (bKey === 'A5') {
        // A5: 4 Arched Canvas Tents (2x2 Grid - 100% 3D Twin of A5 zone view)
        const tentPadMat = new THREE.MeshStandardMaterial({ color: '#162032', roughness: 0.75 });
        const redLineMat = new THREE.LineBasicMaterial({ color: '#dc2626', linewidth: 3 });
        const trussSteelMat = new THREE.MeshStandardMaterial({ color: '#64748b', metalness: 0.85, roughness: 0.25 });

        const roofMat = new THREE.MeshStandardMaterial({
          color: '#e2e8f0', roughness: 0.3, metalness: 0.05, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false
        });

        const TENT_W = 18.0;
        const TENT_D = 12.0;
        const TENT_H = 4.5;

        const tentPositions = [
          { id: 1, name: 'เต็นท์ผ้าใบ 1', signCode: 'DA5T-1.01', x: -10.5, z: 10.5 },
          { id: 2, name: 'เต็นท์ผ้าใบ 2', signCode: 'DA5T-2.01', x: -10.5, z: -10.5 },
          { id: 3, name: 'เต็นท์ผ้าใบ 3', signCode: 'DA5T-3.01', x: 10.5, z: 10.5 },
          { id: 4, name: 'เต็นท์ผ้าใบ 4', signCode: 'DA5T-4.01', x: 10.5, z: -10.5 },
        ];

        tentPositions.forEach(t => {
          const tGrp = new THREE.Group();
          tGrp.position.set(t.x, 0, t.z);
          const slab = new THREE.Mesh(new THREE.BoxGeometry(TENT_W, 0.1, TENT_D), tentPadMat);
          slab.position.y = 0.45;
          tGrp.add(slab);

          const border = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(TENT_W, 0.02, TENT_D)), redLineMat);
          border.position.y = 0.51;
          tGrp.add(border);

          // Roof
          const arcAngle = Math.PI / 1.5;
          const cylGeo = new THREE.CylinderGeometry(6.8, 6.8, TENT_W, 24, 1, true, -arcAngle / 2, arcAngle);
          const roofMesh = new THREE.Mesh(cylGeo, roofMat);
          roofMesh.rotation.z = Math.PI / 2;
          roofMesh.position.y = TENT_H - 2.5;
          tGrp.add(roofMesh);

          // Real Data Tents
          const groupSpacingX = (TENT_W - 0.8) / 7;
          const slotPitchZ = 0.95;
          for (let g = 1; g <= 7; g++) {
            const grpX = (g - 4) * groupSpacingX;
            for (let r = 1; r <= 4; r++) {
              const sx = grpX + (r - 2.5) * 0.6;
              for (let c = 1; c <= 7; c++) {
                const sz = (t.z > 0 ? -1 : 1) * (TENT_D / 2 - 1.2 - (c - 1) * slotPitchZ);
                const locator = `DA5T-${t.id}-${String(g).padStart(2, '0')}-R${r}-${String(c).padStart(2, '0')}`;
                const item = locatorMap.get(locator);
                if (item) {
                  const palletGrp = new THREE.Group();
                  palletGrp.position.set(sx, 0.47, sz);
                  const base = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.05, 0.85), woodPineMat);
                  base.position.y = 0.025;
                  palletGrp.add(base);
                  const isOverdue = item.agingDays > 30 || item.agingStatus === 'OVERDUE';
                  const isWarning = item.agingDays > 14 || item.agingStatus === 'WARNING';
                  const boxColor = isOverdue ? '#dc2626' : (isWarning ? '#f59e0b' : '#0284c7');
                  const box = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.7, 0.75), new THREE.MeshStandardMaterial({ color: boxColor }));
                  box.position.y = 0.4;
                  palletGrp.add(box);
                  tGrp.add(palletGrp);
                }
              }
            }
          }
          bGroup.add(tGrp);
        });
      }

      buildingMeshesRef.current.set(bKey, bGroup);
      buildingsGroup.add(bGroup);

      // Create Billboard 3D Sprite Label
      const spriteTex = createBillboardLabelTexture(
        spec.name,
        `ใช้งาน ${buildingMetrics[bKey].occupied} / ${spec.capacity} P (${buildingMetrics[bKey].percent}%)`,
        spec.colorHex
      );
      const spriteMat = new THREE.SpriteMaterial({ map: spriteTex, depthTest: false });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.set(spec.position.x, spec.size.h + 8, spec.position.z);
      sprite.scale.set(24, 6, 1);
      labelSpritesRef.current.set(bKey, sprite);
      scene.add(sprite);

      // Create 3D Analytics Heatmap Plane Mesh directly above building roof
      const heatGeo = new THREE.PlaneGeometry(spec.size.w + 2, spec.size.d + 2);
      const heatTex = createBuildingHeatmapTexture(bKey, buildingMetrics[bKey]);
      const heatMat = new THREE.MeshBasicMaterial({
        map: heatTex,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      const heatMesh = new THREE.Mesh(heatGeo, heatMat);
      heatMesh.rotation.x = -Math.PI / 2;
      heatMesh.position.set(spec.position.x, spec.size.h + 0.8, spec.position.z);
      heatMesh.visible = false;
      heatmapMeshesRef.current.set(bKey, heatMesh);
      scene.add(heatMesh);
    });

    scene.add(buildingsGroup);

    // 6. Forklift Vehicles & Navigation Route (Removed as per request)

    // 7. Raycaster & Interaction Events
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
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
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const boxes = Array.from(boundingBoxesRef.current.values()) as THREE.Object3D[];
      const intersects = raycaster.intersectObjects(boxes, false);

      if (intersects.length > 0) {
        const key = intersects[0].object.userData.buildingKey as BuildingKey;
        handleSelectBuilding(key);
      }
    };

    const handleDoubleClick = () => {
      handleResetView();
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('pointermove', handlePointerMove);
    domElem.addEventListener('click', handleClick);
    domElem.addEventListener('dblclick', handleDoubleClick);

    // Handle Resize
    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 8. Animation Loop
    let animFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animFrameId = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      const time = clock.getElapsedTime();

      // Smooth Camera Damping Transition towards target
      camera.position.lerp(cameraTargetPos.current, 0.05);
      controls.target.lerp(controlsTargetPos.current, 0.05);
      controls.update();

      // Guided Tour Mode Animation Progression
      if (isTourActiveRef.current && !isTourPausedRef.current) {
        tourTimerRef.current += dt;
        const wp = TOUR_WAYPOINTS[tourStepRef.current];
        const stepDuration = wp.duration || 7;

        const progressPercent = Math.min(100, Math.round((tourTimerRef.current / stepDuration) * 100));
        setTourProgress(progressPercent);

        cameraTargetPos.current.set(wp.cameraPos.x, wp.cameraPos.y, wp.cameraPos.z);
        controlsTargetPos.current.set(wp.targetPos.x, wp.targetPos.y, wp.targetPos.z);

        if (tourTimerRef.current >= stepDuration) {
          tourTimerRef.current = 0;
          const nextStep = (tourStepRef.current + 1) % TOUR_WAYPOINTS.length;
          tourStepRef.current = nextStep;
          setTourStep(nextStep);
        }
      }

      // Heatmap Meshes Visibility & Pulsating Glow
      const activeHeatmap = showHeatmapRef.current || colorModeRef.current === 'AGING';
      heatmapMeshesRef.current.forEach(mesh => {
        if (activeHeatmap) {
          mesh.visible = true;
          if (mesh.material instanceof THREE.MeshBasicMaterial) {
            mesh.material.opacity = 0.65 + Math.sin(time * 3.5) * 0.2;
          }
        } else {
          mesh.visible = false;
        }
      });

      // Vehicles & Navigation Animation (Removed as per request)

      // Pulse outline glow for hovered building
      (Object.keys(BUILDINGS) as BuildingKey[]).forEach(bKey => {
        const bGroup = buildingMeshesRef.current.get(bKey);
        if (bGroup) {
          const outline = bGroup.getObjectByName(`outline-${bKey}`) as THREE.LineSegments;
          if (outline) {
            if (hoveredBuilding === bKey || selectedBuilding === bKey) {
              outline.scale.set(1.04, 1.04, 1.04);
            } else {
              outline.scale.set(1.0, 1.0, 1.0);
            }
          }
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', handleResize);
      domElem.removeEventListener('pointermove', handlePointerMove);
      domElem.removeEventListener('click', handleClick);
      domElem.removeEventListener('dblclick', handleDoubleClick);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Sync Label Visibility
  useEffect(() => {
    labelSpritesRef.current.forEach(sprite => {
      sprite.visible = showLabels;
    });
  }, [showLabels]);

  // Sync UI Visibility (Cleaned up)

  // Update Billboard Labels when metrics change
  useEffect(() => {
    (Object.keys(BUILDINGS) as BuildingKey[]).forEach(bKey => {
      const sprite = labelSpritesRef.current.get(bKey);
      const spec = BUILDINGS[bKey];
      const m = buildingMetrics[bKey];

      if (sprite) {
        sprite.material.map?.dispose();
        sprite.material.map = createBillboardLabelTexture(
          spec.name,
          `ใช้งาน ${m.occupied} / ${m.total} P (${m.percent}%)`,
          spec.colorHex
        );
        sprite.material.needsUpdate = true;
      }
    });
  }, [buildingMetrics]);

  // Handle Select Building (Camera Zoom & Filter)
  const handleSelectBuilding = (bKey: BuildingKey) => {
    setSelectedBuilding(bKey);
    const spec = BUILDINGS[bKey];

    // Smooth camera zoom target to that building
    cameraTargetPos.current.set(spec.position.x - 22, spec.size.h + 24, spec.position.z + 32);
    controlsTargetPos.current.set(spec.position.x, spec.size.h / 3, spec.position.z);
  };

  // Reset Camera View to Campus Overview 45°
  const handleResetView = () => {
    setSelectedBuilding(null);
    setCameraPreset('ISO_45');
    cameraTargetPos.current.set(-44, 55, 70);
    controlsTargetPos.current.set(0, 0, 0);
  };

  // Switch to Top Plan 85° View
  const handleTopPlanView = () => {
    setCameraPreset('TOP_85');
    cameraTargetPos.current.set(0, 140, 5);
    controlsTargetPos.current.set(0, 0, 0);
  };

  // Guided Tour Control Handlers
  const handleStartTour = () => {
    setIsTourActive(true);
    setIsTourPaused(false);
    setTourStep(0);
    tourTimerRef.current = 0;
    const wp = TOUR_WAYPOINTS[0];
    cameraTargetPos.current.set(wp.cameraPos.x, wp.cameraPos.y, wp.cameraPos.z);
    controlsTargetPos.current.set(wp.targetPos.x, wp.targetPos.y, wp.targetPos.z);
  };

  const handleNextTourStep = () => {
    const next = (tourStep + 1) % TOUR_WAYPOINTS.length;
    setTourStep(next);
    tourTimerRef.current = 0;
    const wp = TOUR_WAYPOINTS[next];
    cameraTargetPos.current.set(wp.cameraPos.x, wp.cameraPos.y, wp.cameraPos.z);
    controlsTargetPos.current.set(wp.targetPos.x, wp.targetPos.y, wp.targetPos.z);
  };

  const handlePrevTourStep = () => {
    const prev = (tourStep - 1 + TOUR_WAYPOINTS.length) % TOUR_WAYPOINTS.length;
    setTourStep(prev);
    tourTimerRef.current = 0;
    const wp = TOUR_WAYPOINTS[prev];
    cameraTargetPos.current.set(wp.cameraPos.x, wp.cameraPos.y, wp.cameraPos.z);
    controlsTargetPos.current.set(wp.targetPos.x, wp.targetPos.y, wp.targetPos.z);
  };

  const handleSelectTourStep = (index: number) => {
    setTourStep(index);
    tourTimerRef.current = 0;
    const wp = TOUR_WAYPOINTS[index];
    cameraTargetPos.current.set(wp.cameraPos.x, wp.cameraPos.y, wp.cameraPos.z);
    controlsTargetPos.current.set(wp.targetPos.x, wp.targetPos.y, wp.targetPos.z);
  };

  const handleExitTour = () => {
    setIsTourActive(false);
    setIsTourPaused(false);
    handleResetView();
  };

  // Compute Active Zone Key for bottom KPI formal dashboard
  const activeKpiZoneKey: ZoneKey = selectedBuilding ? BUILDINGS[selectedBuilding].zoneKey : (hoveredBuilding ? BUILDINGS[hoveredBuilding].zoneKey : 'ALL');

  return (
    <div className="w-full h-full flex flex-col min-h-0 bg-[#07090D] text-slate-100 font-sans relative overflow-hidden animate-fadeIn">
      
      {/* Top Header & Breadcrumb & Mode Control Overlay Bar */}
      <div className="bg-slate-900/90 border-b border-slate-800 p-2.5 sm:p-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0 z-20 backdrop-blur-md">
        
        {/* Breadcrumb Navigation */}
        <div className="flex items-center space-x-2 text-xs sm:text-sm font-bold">
          <button
            onClick={handleResetView}
            className={`px-3 py-1.5 rounded-xl border transition-all flex items-center space-x-1.5 cursor-pointer ${
              !selectedBuilding 
                ? 'bg-blue-600 text-white border-blue-400 shadow-md font-black' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            <Grid className="w-4 h-4" />
            <span>ผังรวม 3D (Site Overview)</span>
          </button>

          {selectedBuilding && (
            <>
              <ChevronRight className="w-4 h-4 text-slate-500" />
              <div className={`px-3 py-1.5 rounded-xl border flex items-center space-x-2 font-black ${BUILDINGS[selectedBuilding].badgeClass}`}>
                <Building2 className="w-4 h-4" />
                <span>{BUILDINGS[selectedBuilding].fullName}</span>
              </div>
              <button
                onClick={() => onNavigateToZone(BUILDINGS[selectedBuilding].targetNavigation as any)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-md flex items-center space-x-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <span>เข้าสู่หน้าเต็มโซนย่อย</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>

        {/* Camera View Controls & Overlays Switchers */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
          
          {/* Guided Tour Mode Button */}
          <button
            onClick={isTourActive ? handleExitTour : handleStartTour}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer font-black border ${
              isTourActive 
                ? 'bg-amber-600 text-white border-amber-400 shadow-lg ring-2 ring-amber-500/50' 
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border-blue-400 shadow-md'
            }`}
          >
            <Sparkles className="w-4 h-4 text-yellow-300 animate-spin" style={{ animationDuration: '3s' }} />
            <span>{isTourActive ? 'จบการนำชม (Exit Tour)' : 'นำชมแคมปัส (Tour Mode)'}</span>
          </button>

          {/* Analytics Heatmap Overlay Toggle */}
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer font-bold border ${
              showHeatmap 
                ? 'bg-red-600 text-white border-red-400 shadow-md ring-2 ring-red-500/40 animate-pulse' 
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:text-white hover:border-slate-700'
            }`}
            title="Toggle Dynamic 3D Analytics Heatmap"
          >
            <Flame className="w-4 h-4 text-amber-400" />
            <span>Heatmap Aging</span>
          </button>

          {/* Camera Angle Presets */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1">
            <button
              onClick={handleResetView}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center space-x-1 cursor-pointer ${
                cameraPreset === 'ISO_45' && !selectedBuilding ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>ภาพรวม 45°</span>
            </button>
            <button
              onClick={handleTopPlanView}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center space-x-1 cursor-pointer ${
                cameraPreset === 'TOP_85' ? 'bg-cyan-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>แปลนบน 85°</span>
            </button>
          </div>

          {/* Color Overlay Modes */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1">
            <button
              onClick={() => setColorMode('UTILIZATION')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${colorMode === 'UTILIZATION' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              อัตราใช้งาน
            </button>
            <button
              onClick={() => setColorMode('AGING')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${colorMode === 'AGING' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              อายุสินค้า Aging
            </button>
            <button
              onClick={() => setColorMode('URGENT')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${colorMode === 'URGENT' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              เคสเร่งด่วน
            </button>
          </div>

          {/* Feature Toggles */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 gap-2 px-2 text-slate-300">
            <label className="flex items-center space-x-1 cursor-pointer hover:text-white">
              <input type="checkbox" checked={showLabels} onChange={e => setShowLabels(e.target.checked)} className="rounded text-blue-600" />
              <span>ป้ายชื่อ</span>
            </label>
          </div>

          <button
            onClick={handleResetView}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-all cursor-pointer"
            title="Reset Camera"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

        </div>
      </div>

      {/* Main 3D Canvas Container */}
      <div className="flex-1 w-full h-full relative min-h-0">
        <div ref={mountRef} className="w-full h-full" />

        {/* Video-Style Top 3D WMS Twin HUD Bar Overlay */}
        <div className="absolute top-3 left-4 z-20 hidden md:flex items-center space-x-3 bg-slate-950/85 border border-cyan-500/40 rounded-2xl p-2 px-3.5 shadow-2xl backdrop-blur-md text-xs font-mono">
          <div className="flex items-center space-x-2 border-r border-slate-800 pr-3">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-cyan-300 font-bold">3D TWIN WMS LIVE</span>
          </div>
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-amber-400" />
            <span className="text-slate-300 font-sans">อัตราจัดเก็บ:</span>
            <span className="text-amber-400 font-bold">
              {Math.round(((Object.values(buildingMetrics) as any[]).reduce((a, b) => a + b.occupied, 0) / 2408) * 100)}%
            </span>
          </div>
        </div>

        {/* Floating Card Overlay when Building / Zone is Selected (PRODUTO LOCALIZADO) */}
        {selectedBuilding && (
          <div className="absolute top-4 right-4 z-30 w-80 bg-slate-950/95 border border-cyan-500/50 rounded-2xl p-4 shadow-2xl backdrop-blur-xl animate-fadeIn space-y-3">
            <div className="flex items-start justify-between border-b border-slate-800 pb-2">
              <div>
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold">
                  PRODUTO LOCALIZADO / โซนที่เลือก
                </span>
                <h3 className="font-black text-white text-base mt-1">
                  {BUILDINGS[selectedBuilding].name}
                </h3>
              </div>
              <button
                onClick={handleResetView}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
                title="ปิดหน้านี้"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {BUILDINGS[selectedBuilding].description}
            </p>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-300">
                <span>จำนวนจัดเก็บ:</span>
                <span className="font-mono font-bold text-cyan-400">
                  {buildingMetrics[selectedBuilding].occupied} / {BUILDINGS[selectedBuilding].capacity} P
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                <div
                  className="bg-cyan-500 h-full rounded-full transition-all"
                  style={{ width: `${buildingMetrics[selectedBuilding].percent}%` }}
                />
              </div>

              <div className="grid grid-cols-3 gap-1 pt-1 text-[11px] text-center font-mono">
                <div className="bg-emerald-950/40 border border-emerald-500/30 rounded p-1">
                  <div className="text-[9px] text-slate-400 font-sans">Safe</div>
                  <div className="font-bold text-emerald-400">{buildingMetrics[selectedBuilding].safeCount}</div>
                </div>
                <div className="bg-amber-950/40 border border-amber-500/30 rounded p-1">
                  <div className="text-[9px] text-slate-400 font-sans">Warning</div>
                  <div className="font-bold text-amber-400">{buildingMetrics[selectedBuilding].warningCount}</div>
                </div>
                <div className="bg-red-950/40 border border-red-500/30 rounded p-1">
                  <div className="text-[9px] text-slate-400 font-sans">Overdue</div>
                  <div className="font-bold text-red-400">{buildingMetrics[selectedBuilding].overdueCount}</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigateToZone(BUILDINGS[selectedBuilding].targetNavigation as any)}
              className="w-full py-2.5 px-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl text-xs font-black shadow-lg flex items-center justify-center space-x-2 transition-all active:scale-95 cursor-pointer"
            >
              <span>เปิดผัง 3D/2D รายละเอียดโซน</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Floating Guided Tour Mode Banner & Controls HUD */}
        {isTourActive && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30 w-[94%] max-w-2xl bg-slate-950/95 border border-amber-500/50 rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl animate-fadeIn flex flex-col space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono text-xs font-black">
                  TOUR STEP {tourStep + 1} / {TOUR_WAYPOINTS.length}
                </span>
                <span className="font-black text-white text-sm sm:text-base">
                  {TOUR_WAYPOINTS[tourStep].title}
                </span>
              </div>
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={handlePrevTourStep}
                  className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-700 cursor-pointer transition-all"
                  title="Step Previous"
                >
                  <SkipBack className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsTourPaused(!isTourPaused)}
                  className="p-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl cursor-pointer font-bold transition-all flex items-center space-x-1"
                  title={isTourPaused ? 'Play' : 'Pause'}
                >
                  {isTourPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleNextTourStep}
                  className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-700 cursor-pointer transition-all"
                  title="Step Next"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
                <button
                  onClick={handleExitTour}
                  className="p-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-xl cursor-pointer ml-1 transition-all"
                  title="Exit Tour"
                >
                  <Square className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="text-xs text-slate-300 flex justify-between items-center">
              <span>{TOUR_WAYPOINTS[tourStep].description}</span>
              <span className="font-mono text-[11px] text-amber-400 font-bold shrink-0 ml-2">
                {isTourPaused ? 'PAUSED' : `${tourProgress}%`}
              </span>
            </div>

            {/* Tour Step Progress Bar */}
            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
              <div
                className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 h-full transition-all duration-200 ease-linear"
                style={{ width: `${tourProgress}%` }}
              />
            </div>

            {/* Clickable Step Waypoint Indicator Dots */}
            <div className="flex items-center justify-center space-x-2 pt-0.5">
              {TOUR_WAYPOINTS.map((wp, idx) => (
                <button
                  key={wp.id}
                  onClick={() => handleSelectTourStep(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    idx === tourStep
                      ? 'w-7 bg-amber-400 shadow-md'
                      : 'w-2 bg-slate-700 hover:bg-slate-500'
                  }`}
                  title={wp.title}
                />
              ))}
            </div>
          </div>
        )}

        {/* Analytics Heatmap Legend Panel */}
        {(showHeatmap || colorMode === 'AGING') && (
          <div className="absolute top-4 left-4 z-20 bg-slate-950/90 border border-slate-800 rounded-2xl p-3 shadow-2xl backdrop-blur-md text-xs space-y-2 max-w-xs animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="font-black text-white flex items-center space-x-1.5">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Analytics Heatmap Legend</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/40">
                REALTIME AGING
              </span>
            </div>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-sm" />
                  <span>ปกติ Safe (&le; 14 วัน)</span>
                </span>
                <span className="font-mono text-emerald-400 font-bold">
                  {(Object.values(buildingMetrics) as any[]).reduce((a, b) => a + (b.safeCount || 0), 0)} P
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shadow-sm" />
                  <span>เตือน Warning (15-30 วัน)</span>
                </span>
                <span className="font-mono text-amber-400 font-bold">
                  {(Object.values(buildingMetrics) as any[]).reduce((a, b) => a + (b.warningCount || 0), 0)} P
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center space-x-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block shadow-sm" />
                  <span>เกินกำหนด Overdue (&gt; 30 วัน)</span>
                </span>
                <span className="font-mono text-red-400 font-bold">
                  {(Object.values(buildingMetrics) as any[]).reduce((a, b) => a + (b.overdueCount || 0), 0)} P
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Hover Raycaster Interactive Tooltip */}
        {hoverTooltip && (
          <div
            className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full -mt-3 bg-slate-950/95 border border-slate-700 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md space-y-2 text-xs min-w-[240px] animate-fadeIn"
            style={{ left: hoverTooltip.x, top: hoverTooltip.y }}
          >
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
              <span className="font-black text-white text-sm">
                {BUILDINGS[hoverTooltip.buildingKey].fullName}
              </span>
              <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border ${BUILDINGS[hoverTooltip.buildingKey].badgeClass}`}>
                {hoverTooltip.buildingKey}
              </span>
            </div>

            <p className="text-[11px] text-slate-400">
              {BUILDINGS[hoverTooltip.buildingKey].description}
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
              <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 font-sans">พื้นที่ใช้งาน:</div>
                <div className="font-black text-cyan-400 text-sm">
                  {buildingMetrics[hoverTooltip.buildingKey].occupied} / {BUILDINGS[hoverTooltip.buildingKey].capacity} P
                </div>
                <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                  ({buildingMetrics[hoverTooltip.buildingKey].percent}% Occupied)
                </div>
              </div>

              <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 font-sans">เคลื่อนย้ายวันนี้:</div>
                <div className="font-bold text-emerald-400 text-xs">
                  +{buildingMetrics[hoverTooltip.buildingKey].inCount} IN / -{buildingMetrics[hoverTooltip.buildingKey].outCount} OUT
                </div>
              </div>
            </div>

            <div className="text-[10px] text-blue-400 font-bold text-center pt-1 animate-pulse">
              💡 คลิกเพื่อซูมเข้า หรือ ดับเบิ้ลคลิกเพื่อรีเซ็ตกล้อง
            </div>
          </div>
        )}

        {/* Quick Building Selector Pills (Bottom Floating overlay over 3D scene) */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 flex flex-wrap items-center bg-slate-950/80 border border-slate-800 p-1.5 rounded-2xl shadow-2xl backdrop-blur-md gap-1.5 max-w-[94vw]">
          <button
            onClick={handleResetView}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
              !selectedBuilding ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>ไซต์ทั้งหมด (2,408 ช่อง)</span>
          </button>

          {(Object.keys(BUILDINGS) as BuildingKey[]).map(bKey => {
            const spec = BUILDINGS[bKey];
            const m = buildingMetrics[bKey];
            const isSel = selectedBuilding === bKey;

            return (
              <button
                key={bKey}
                onClick={() => handleSelectBuilding(bKey)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 cursor-pointer border ${
                  isSel ? 'bg-slate-800 text-white border-blue-500 shadow-md ring-2 ring-blue-500/50' : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: spec.colorHex }} />
                <span>{spec.name}</span>
                <span className="text-[10px] font-mono text-slate-400">({m.percent}%)</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Universal Bottom KPI Formal Dashboard (Passes active selected/hovered building zoneKey) */}
      <ZoneKpiFormalDashboard 
        zoneKey={activeKpiZoneKey} 
        items={items} 
        logs={logs} 
        stats={stats} 
        agingConfig={agingConfig} 
      />

    </div>
  );
};
