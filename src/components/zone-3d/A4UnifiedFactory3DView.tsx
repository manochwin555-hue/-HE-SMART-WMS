import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { InventoryItem, MovementType, ShelfLevel, StorageZone } from '../../types';
import { useTranslation } from '../../i18n/i18nContext';
import { createRealisticForklift } from './forkliftModel';
import { createHologramGhostTarget } from './hologramGhost';
import { createRackBayNeonHighlight, applyFaintEmissiveHighlight } from './neonEdgeHighlight';
import { 
  RotateCcw, 
  Layers, 
  Info, 
  Box, 
  Truck, 
  Maximize2, 
  Minimize2, 
  CheckCircle2, 
  AlertTriangle,
  Sun,
  Eye,
  Compass,
  Building2,
  Boxes,
  Clock,
  ShieldAlert,
  Search,
  QrCode,
  ArrowRight,
  Sparkles,
  Grid
} from 'lucide-react';
import { CameraControlOverlay } from './CameraControlOverlay';

type CameraPresetKey = 
  | 'ALL_A4' | 'TOP_DOWN' | 'RACKS' | 'RACKS_B_F' | 'RACKS_G_K' | 'FLOOR' | 'FRONT_35'
  | 'ROW_B' | 'ROW_C' | 'ROW_D' | 'ROW_E' | 'ROW_F' | 'ROW_G' | 'ROW_H' | 'ROW_I' | 'ROW_J' | 'ROW_K'
  | 'ZONE_X1' | 'ZONE_X2' | 'ZONE_X3' | 'ZONE_X4' | 'ZONE_X5' | 'ZONE_X6' | 'ZONE_X7' | 'ZONE_X8';

// Preset camera positions & targets calibrated to fill the layout viewport
const PRESET_CONFIGS: Record<CameraPresetKey, { pos: [number, number, number]; target: [number, number, number] }> = {
  // 45-degree isometric perspective: Floor staging X1-X8 on left, Racks B-K on right, perfectly framed inside viewport
  ALL_A4: { pos: [38, 38, 48], target: [-2, 1, 0] },
  TOP_DOWN: { pos: [-2, 82, 0.1], target: [-2, 0, 0] },
  // Perspective: Front eye-level bird's-eye view into aisles B to K
  RACKS: { pos: [-4.8, 30, 24], target: [-4.8, 2, -18] },
  RACKS_B_F: { pos: [-16, 24, 18], target: [-16, 2, -22] },
  RACKS_G_K: { pos: [6, 24, 18], target: [6, 2, -22] },
  // Horizontal perspective: Looking across all X1-X8 zones
  FLOOR: { pos: [22, 28, 14], target: [-14, 1, 14] },
  FRONT_35: { pos: [-8, 36, 68], target: [-3, 2, -4] },
  // Row B to K focus positions - straight-on side elevation view (Bays 01-12 left-to-right)
  ROW_B: { pos: [0.5, 4.2, -25.2], target: [-23.5, 3.2, -25.2] },
  ROW_C: { pos: [5.8, 4.2, -25.2], target: [-18.2, 3.2, -25.2] },
  ROW_D: { pos: [7.6, 4.2, -25.2], target: [-16.4, 3.2, -25.2] },
  ROW_E: { pos: [13.0, 4.2, -25.2], target: [-11.0, 3.2, -25.2] },
  ROW_F: { pos: [14.8, 4.2, -25.2], target: [-9.2, 3.2, -25.2] },
  ROW_G: { pos: [13.5, 4.2, -33.6], target: [-1.5, 3.2, -33.6] },
  ROW_H: { pos: [19.0, 4.2, -33.6], target: [4.0, 3.2, -33.6] },
  ROW_I: { pos: [20.8, 4.2, -33.6], target: [5.8, 3.2, -33.6] },
  ROW_J: { pos: [26.2, 4.2, -33.6], target: [11.2, 3.2, -33.6] },
  ROW_K: { pos: [28.0, 4.2, -33.6], target: [13.0, 3.2, -33.6] },
  // Floor Staging X1 to X8 focus positions - front overhead aligned view (Cols left-to-right, R1 at bottom)
  ZONE_X8: { pos: [-16.3, 16.0, 7.0], target: [-16.3, 0.5, -5.0] },
  ZONE_X7: { pos: [-16.3, 16.0, 11.5], target: [-16.3, 0.5, -0.5] },
  ZONE_X6: { pos: [-16.3, 16.0, 16.5], target: [-16.3, 0.5, 4.5] },
  ZONE_X5: { pos: [-16.3, 16.0, 21.5], target: [-16.3, 0.5, 9.5] },
  ZONE_X4: { pos: [-19.8, 14.0, 27.5], target: [-19.8, 0.5, 15.5] },
  ZONE_X3: { pos: [-19.8, 14.0, 32.5], target: [-19.8, 0.5, 20.5] },
  ZONE_X2: { pos: [-19.8, 14.0, 37.5], target: [-19.8, 0.5, 25.5] },
  ZONE_X1: { pos: [-19.8, 14.0, 42.5], target: [-19.8, 0.5, 30.5] },
};

interface A4UnifiedFactory3DViewProps {
  items: InventoryItem[];
  searchQuery?: string;
  initialFocus?: CameraPresetKey;
  onSelectSlot?: (type: 'RACK' | 'FLOOR', locator: string, item?: InventoryItem) => void;
  onOpenScanner?: (zone: StorageZone, bay: number, level: ShelfLevel, mode: MovementType, locatorCode?: string, palletPosition?: string, item?: InventoryItem) => void;
  onNavigateToCampus?: () => void;
}

export const A4UnifiedFactory3DView: React.FC<A4UnifiedFactory3DViewProps> = ({
  items,
  searchQuery = '',
  initialFocus = 'ALL_A4',
  onSelectSlot,
  onOpenScanner,
  onNavigateToCampus
}) => {
  const { t } = useTranslation();
  const mountRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const rackRowGroupsRef = useRef<Record<string, THREE.Group>>({});
  const floorZoneGroupsRef = useRef<Record<string, THREE.Group>>({});
  const forkliftsRef = useRef<THREE.Group[]>([]);
  const floatingZoneSpritesRef = useRef<THREE.Sprite[]>([]);

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [cameraFocus, setCameraFocus] = useState<CameraPresetKey>(
    initialFocus && PRESET_CONFIGS[initialFocus] ? initialFocus : 'ALL_A4'
  );
  
  const [selectedSlot, setSelectedSlot] = useState<{
    type: 'RACK' | 'FLOOR';
    locator: string;
    zoneName: string;
    item?: InventoryItem;
    palletPosition?: string;
    rowName?: string;
    bay?: number;
    level?: number;
    group?: string;
    row?: number;
    col?: number;
  } | null>(null);

  const [hoveredInfo, setHoveredInfo] = useState<{
    name: string;
    locator: string;
    desc: string;
    item?: InventoryItem;
    palletPosition?: string;
    statusMode: 'EMPTY' | 'OCCUPIED' | 'AGING' | 'OVERDUE';
    posDetail?: string;
  } | null>(null);

  // Parse inventory items mapped into A4
  const a4Data = useMemo(() => {
    // 1. A4 Selective Racks items: Rows B-F (DA4D-2) & G-K (DA4D-3)
    const rackItemsMap = new Map<string, InventoryItem>();
    const rackRows = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
    
    // 2. A4 Floor Staging items: X1 - X8
    const floorItemsMap = new Map<string, InventoryItem>();

    let totalRackOccupied = 0;
    let totalFloorOccupied = 0;

    items.forEach(it => {
      if (!it || typeof it.quantity !== 'number' || it.quantity <= 0) return;

      // Check for rack
      const isRackZone = rackRows.includes(it.zone);
      const rackMatch = it.locatorCode ? it.locatorCode.match(/DA4D-[23]-([B-K])(?:0)?(\d+)-L(\d)(?:-P([12]))?/i) : null;

      if (isRackZone || rackMatch) {
        const row = isRackZone ? it.zone : rackMatch![1].toUpperCase();
        const bay = isRackZone ? (it.bayNumber || 1) : parseInt(rackMatch![2], 10);
        const lvl = isRackZone ? ((it.level as number) || 1) : parseInt(rackMatch![3], 10);
        const pos = it.palletPosition || (rackMatch?.[4] ? `P${rackMatch[4]}` : (it.locatorCode?.includes('-P2') ? 'P2' : 'P1'));

        rackItemsMap.set(`${row}-${bay}-${lvl}-${pos}`, it);
        totalRackOccupied++;
      }

      // Check for floor staging (X1 - X8)
      const isFloorZone = ['X1','X2','X3','X4','X5','X6','X7','X8'].includes(it.zone);
      const floorMatch = it.locatorCode ? it.locatorCode.match(/X([1-8])-(?:R)?(\d+)-(?:C)?(\d+)/i) : null;

      if (isFloorZone || floorMatch) {
        const grp = isFloorZone ? it.zone : `X${floorMatch![1]}`;
        const r = isFloorZone ? (it.bayNumber || 1) : parseInt(floorMatch![2], 10);
        const c = isFloorZone ? ((it.level as number) || 1) : parseInt(floorMatch![3], 10);
        floorItemsMap.set(`${grp}-${r}-${c}`, it);
        totalFloorOccupied++;
      }
    });

    const totalOccupied = totalRackOccupied + totalFloorOccupied;
    const totalCap = 680 + 432; // 1,112 PL

    return {
      rackItemsMap,
      floorItemsMap,
      totalRackOccupied,
      totalFloorOccupied,
      totalOccupied,
      totalCap,
      pct: Math.round((totalOccupied / totalCap) * 100)
    };
  }, [items]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Smooth camera fly-to function
  const flyCameraTo = (targetPos: THREE.Vector3, lookAtTarget: THREE.Vector3, duration = 900) => {
    if (!cameraRef.current || !controlsRef.current) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    const startTime = performance.now();

    const animateTransition = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;

      camera.position.lerpVectors(startPos, targetPos, ease);
      controls.target.lerpVectors(startTarget, lookAtTarget, ease);
      controls.update();

      if (progress < 1) {
        requestAnimationFrame(animateTransition);
      }
    };

    requestAnimationFrame(animateTransition);
  };

  const applyA4Isolation = (preset: CameraPresetKey) => {
    const rackRows = rackRowGroupsRef.current;
    const floorZones = floorZoneGroupsRef.current;

    const allRackKeys = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
    const bfRackKeys = ['B', 'C', 'D', 'E', 'F'];
    const gkRackKeys = ['G', 'H', 'I', 'J', 'K'];
    const allFloorKeys = ['X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'X8'];

    const showForklifts = (preset === 'ALL_A4' || preset === 'TOP_DOWN' || preset === 'FRONT_35' || preset === 'RACKS');
    forkliftsRef.current.forEach(f => { if (f) f.visible = showForklifts; });

    if (preset === 'ALL_A4' || preset === 'TOP_DOWN' || preset === 'FRONT_35') {
      allRackKeys.forEach(k => { if (rackRows[k]) rackRows[k].visible = true; });
      allFloorKeys.forEach(k => { if (floorZones[k]) floorZones[k].visible = true; });
    } else if (preset === 'RACKS') {
      allRackKeys.forEach(k => { if (rackRows[k]) rackRows[k].visible = true; });
      allFloorKeys.forEach(k => { if (floorZones[k]) floorZones[k].visible = false; });
    } else if (preset === 'RACKS_B_F') {
      bfRackKeys.forEach(k => { if (rackRows[k]) rackRows[k].visible = true; });
      gkRackKeys.forEach(k => { if (rackRows[k]) rackRows[k].visible = false; });
      allFloorKeys.forEach(k => { if (floorZones[k]) floorZones[k].visible = false; });
    } else if (preset === 'RACKS_G_K') {
      bfRackKeys.forEach(k => { if (rackRows[k]) rackRows[k].visible = false; });
      gkRackKeys.forEach(k => { if (rackRows[k]) rackRows[k].visible = true; });
      allFloorKeys.forEach(k => { if (floorZones[k]) floorZones[k].visible = false; });
    } else if (preset === 'FLOOR') {
      allRackKeys.forEach(k => { if (rackRows[k]) rackRows[k].visible = false; });
      allFloorKeys.forEach(k => { if (floorZones[k]) floorZones[k].visible = true; });
    } else if (preset.startsWith('ROW_')) {
      const selectedRow = preset.replace('ROW_', '');
      allRackKeys.forEach(k => { if (rackRows[k]) rackRows[k].visible = (k === selectedRow); });
      allFloorKeys.forEach(k => { if (floorZones[k]) floorZones[k].visible = false; });
    } else if (preset.startsWith('ZONE_')) {
      const selectedZone = preset.replace('ZONE_', '');
      allRackKeys.forEach(k => { if (rackRows[k]) rackRows[k].visible = false; });
      allFloorKeys.forEach(k => { if (floorZones[k]) floorZones[k].visible = (k === selectedZone); });
    }
  };

  const handleCameraPreset = (preset: CameraPresetKey) => {
    setCameraFocus(preset);
    applyA4Isolation(preset);
    if (!cameraRef.current || !controlsRef.current) return;
    const cfg = PRESET_CONFIGS[preset];
    if (cfg) {
      flyCameraTo(new THREE.Vector3(cfg.pos[0], cfg.pos[1], cfg.pos[2]), new THREE.Vector3(cfg.target[0], cfg.target[1], cfg.target[2]));
    }
  };

  // Sync camera when initialFocus changes dynamically
  useEffect(() => {
    if (initialFocus && PRESET_CONFIGS[initialFocus]) {
      setCameraFocus(initialFocus);
      applyA4Isolation(initialFocus as CameraPresetKey);
      const cfg = PRESET_CONFIGS[initialFocus];
      if (cfg && cameraRef.current && controlsRef.current) {
        flyCameraTo(new THREE.Vector3(cfg.pos[0], cfg.pos[1], cfg.pos[2]), new THREE.Vector3(cfg.target[0], cfg.target[1], cfg.target[2]), 600);
      }
    }
  }, [initialFocus]);

  // 3D Scene Initialization
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight || 620;

    const activePreset = initialFocus && PRESET_CONFIGS[initialFocus] ? initialFocus : 'ALL_A4';
    const initCfg = PRESET_CONFIGS[activePreset];

    // 1. Scene & Environment (Bright Studio Theme)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f1f5f9');
    scene.fog = new THREE.FogExp2('#f1f5f9', 0.007);
    sceneRef.current = scene;

    // 2. Camera - High isometric perspective for zero occlusion
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 1000);
    camera.position.set(initCfg.pos[0], initCfg.pos[1], initCfg.pos[2]);
    cameraRef.current = camera;

    // 3. Renderer with PCF Shadows
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.03;
    controls.minDistance = 8;
    controls.maxDistance = 160;
    controls.target.set(initCfg.target[0], initCfg.target[1], initCfg.target[2]);
    controls.update();
    controlsRef.current = controls;

    // 5. High Fidelity Industrial Lighting Setup (Crisp Bright Studio)
    const ambientLight = new THREE.AmbientLight('#ffffff', 1.85);
    scene.add(ambientLight);

    const mainSun = new THREE.DirectionalLight('#ffffff', 2.1);
    mainSun.position.set(40, 75, 45);
    mainSun.castShadow = true;
    mainSun.shadow.mapSize.width = 2048;
    mainSun.shadow.mapSize.height = 2048;
    mainSun.shadow.camera.near = 0.5;
    mainSun.shadow.camera.far = 250;
    const d = 60;
    mainSun.shadow.camera.left = -d;
    mainSun.shadow.camera.right = d;
    mainSun.shadow.camera.top = d;
    mainSun.shadow.camera.bottom = -d;
    scene.add(mainSun);

    const fillBlue = new THREE.DirectionalLight('#e0f2fe', 1.0);
    fillBlue.position.set(-45, 30, -35);
    scene.add(fillBlue);

    // 6. Factory Floor & Architecture Shell
    // Dimension expanded to fully cover the entire A4 facility (Racks B-K, Floor Staging X1-X8, and open areas)
    const buildingWidth = 72;
    const buildingDepth = 104;
    const floorCenterZ = -4.0;

    // High Quality Gray Epoxy Floor
    const floorGeo = new THREE.BoxGeometry(buildingWidth, 0.6, buildingDepth);
    const floorMat = new THREE.MeshStandardMaterial({
      color: '#e2e8f0',
      roughness: 0.3,
      metalness: 0.12
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(0, -0.3, floorCenterZ);
    floor.receiveShadow = true;
    scene.add(floor);

    // Grid Floor
    const grid = new THREE.GridHelper(buildingDepth, 52, '#cbd5e1', '#e2e8f0');
    grid.position.set(0, 0.01, floorCenterZ);
    scene.add(grid);

    // Outer Blueprint Boundary Dashed Line / Wall Frames
    const wallColor = '#94a3b8';
    const wallMat = new THREE.MeshStandardMaterial({
      color: wallColor,
      roughness: 0.5,
      transparent: true,
      opacity: 0.25
    });

    // Back Wall removed per user request to prevent rack protrusion

    // Left Wall (Along Floor Staging & Racks)
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 8, buildingDepth), wallMat);
    leftWall.position.set(-buildingWidth / 2, 4, floorCenterZ);
    scene.add(leftWall);

    // Open Floor Space on the Right (Where HE was - user requested to leave completely clear and open)
    // Add realistic floor line marking denoting the open factory area
    const openAreaBorder = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(20, 0.02, 60)),
      new THREE.MeshBasicMaterial({ color: '#94a3b8', opacity: 0.5, transparent: true })
    );
    openAreaBorder.position.set(15, 0.02, 0);
    scene.add(openAreaBorder);

    // Structural I-Beam Pillars along the perimeter (Pillars 1205 to 1212)
    const pillarMat = new THREE.MeshStandardMaterial({
      color: '#1d4ed8',
      roughness: 0.35,
      metalness: 0.8
    });
    const pillarGeo = new THREE.BoxGeometry(0.8, 8, 0.8);

    for (let p = 0; p < 12; p++) {
      const zPos = floorCenterZ - buildingDepth / 2 + 5 + p * 8.5;
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(-buildingWidth / 2 + 0.5, 4, zPos);
      pillar.castShadow = true;
      scene.add(pillar);
    }

    // Interactive Meshes collection for raycasting
    const interactiveMeshes: {
      mesh: THREE.Object3D;
      type: 'RACK' | 'FLOOR';
      locator: string;
      zoneName: string;
      desc: string;
      item?: InventoryItem;
      palletPosition?: string;
      rowName?: string;
      bay?: number;
      level?: number;
      group?: string;
      row?: number;
      col?: number;
      x: number;
      y: number;
      z: number;
      w: number;
      h: number;
      d: number;
      statusMode: 'EMPTY' | 'OCCUPIED' | 'AGING' | 'OVERDUE';
    }[] = [];

    // =========================================================================
    // REALISTIC MATERIALS (Based on Image 2 Reference)
    // =========================================================================
    // 1. Uprights & Columns: Industrial Safety Royal/Navy Blue Steel
    const uprightBlue = new THREE.MeshStandardMaterial({ 
      color: '#1d4ed8', // Vivid Industrial Safety Blue
      metalness: 0.85, 
      roughness: 0.25 
    });

    // 2. Diagonal & Horizontal Steel Bracing (โครงถักเหล็กค้ำยัน X-Brace)
    const steelBracingMat = new THREE.MeshStandardMaterial({
      color: '#60a5fa', // Steel Blue Bracing
      metalness: 0.8,
      roughness: 0.3
    });

    // 3. Load Beams & Post Base Guards: Safety Orange / Yellow
    const beamOrange = new THREE.MeshStandardMaterial({ 
      color: '#ea580c', 
      metalness: 0.65, 
      roughness: 0.3 
    });
    const guardYellow = new THREE.MeshStandardMaterial({ 
      color: '#eab308', 
      roughness: 0.3 
    });

    // 4. Steel Shelf Support Wire Decking & Cross Ties (เหล็กกั้นวาง)
    const wireDeckMat = new THREE.MeshStandardMaterial({
      color: '#94a3b8',
      metalness: 0.9,
      roughness: 0.2
    });

    // 5. Pallets & Boxes
    const woodPine = new THREE.MeshStandardMaterial({ color: '#bfa079', roughness: 0.85 }); // Pine Wood
    const boxKraft = new THREE.MeshStandardMaterial({ color: '#966f48', roughness: 0.8 }); // Kraft Corrugated
    const boxActiveBlue = new THREE.MeshStandardMaterial({ color: '#2563eb', roughness: 0.5 }); // Active Stock
    const boxAgingAmber = new THREE.MeshStandardMaterial({ color: '#d97706', roughness: 0.5 }); // Aging Stock
    const boxLowStockRed = new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.5 }); // Low Stock

    // Floor Marking Lines (Yellow Safety Demarcation)
    const lineYellowMat = new THREE.MeshBasicMaterial({ color: '#facc15' });

    // Helper: Create Large Rack Head Decal Texture for A4 (สำหรับหัวแร็ค B-F และ G-K)
    const createA4RackHeadDecalTexture = (rowName: string, subCode: string, color: string, totalBays: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 512, 256);

        ctx.lineWidth = 14;
        ctx.strokeStyle = '#facc15'; // Vibrant yellow safety border
        ctx.strokeRect(7, 7, 498, 242);

        ctx.fillStyle = '#090d16';
        ctx.fillRect(18, 18, 476, 220);

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 90px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`แร็ค ${rowName}`, 256, 82);

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif';
        ctx.fillText(`${subCode} (${totalBays} ช่อง x 4 ชั้น)`, 256, 172);
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.anisotropy = 8;
      tex.needsUpdate = true;
      return tex;
    };

    // Helper: Create Floating 3D Zone Header Sprite (สำหรับโซนวางพื้น X1 - X8 ลอยเหนือพื้นที่)
    const createFloatingZoneHeaderSprite = (zoneId: string, rows: number, cols: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 512, 256);

        ctx.lineWidth = 10;
        ctx.strokeStyle = '#38bdf8';
        ctx.strokeRect(5, 5, 502, 246);

        ctx.fillStyle = '#0284c7';
        ctx.fillRect(15, 15, 482, 110);

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 68px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`โซน ${zoneId}`, 256, 70);

        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 24px "Segoe UI", Arial, sans-serif';
        ctx.fillText(`DA4D-1.01 • ${cols} ช่อง x ${rows} แถว (${cols * rows} PL)`, 256, 180);
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.anisotropy = 8;
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 1.0 });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(2.8, 1.4, 1.0);
      return sprite;
    };

    // Helper: Create Floor Staging Column Number Decal (C01 - C12)
    const createA4FloorColumnDecalTexture = (colNum: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 128, 64);

        ctx.lineWidth = 4;
        ctx.strokeStyle = '#facc15';
        ctx.strokeRect(2, 2, 124, 60);

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 34px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`C${colNum < 10 ? '0' + colNum : colNum}`, 64, 32);
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.anisotropy = 8;
      tex.needsUpdate = true;
      return tex;
    };

    // Helper: Create Floor Staging Row Number Decal (R01 - R46)
    const createA4FloorRowDecalTexture = (rowNum: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 128, 64);

        ctx.lineWidth = 4;
        ctx.strokeStyle = '#facc15';
        ctx.strokeRect(2, 2, 124, 60);

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 34px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`R${rowNum < 10 ? '0' + rowNum : rowNum}`, 64, 32);
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.anisotropy = 8;
      tex.needsUpdate = true;
      return tex;
    };

    // Helper: Create Floating Bay Label TextSprite
    const createBayLabelSprite = (text: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0f172a'; // Dark blue background
        ctx.fillRect(0, 0, 128, 64);
        ctx.strokeStyle = '#facc15'; // Yellow border
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, 124, 60);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 64, 32);
      }
      const texture = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(1.5, 0.75, 1);
      return sprite;
    };

    // Helper: Add diagonal & horizontal steel bracing between front and rear upright posts (at a specific Z line)
    const addSideBracingAtZ = (group: THREE.Group, xCenter: number, zPos: number, depth = 1.2, height = 5.8) => {
      const numPanels = 4;
      const panelH = height / numPanels;
      
      for (let p = 0; p < numPanels; p++) {
        const yBottom = p * panelH;
        const yTop = (p + 1) * panelH;

        // Horizontal tie strut (connecting front and rear post)
        const hTie = new THREE.Mesh(new THREE.BoxGeometry(depth, 0.04, 0.04), steelBracingMat);
        hTie.position.set(xCenter, yBottom + 0.05, zPos);
        group.add(hTie);

        // Diagonal brace (alternating direction like real pallet rack side frames)
        const diagLen = Math.sqrt(depth * depth + panelH * panelH);
        const diagAngle = Math.atan2(panelH, depth);
        const diagGeo = new THREE.BoxGeometry(diagLen, 0.04, 0.04);
        const diagMesh = new THREE.Mesh(diagGeo, steelBracingMat);
        
        diagMesh.position.set(xCenter, (yBottom + yTop) / 2, zPos);
        if (p % 2 === 0) {
          diagMesh.rotation.z = diagAngle;
        } else {
          diagMesh.rotation.z = -diagAngle;
        }
        group.add(diagMesh);
      }
      
      // Top horizontal tie
      const topTie = new THREE.Mesh(new THREE.BoxGeometry(depth, 0.04, 0.04), steelBracingMat);
      topTie.position.set(xCenter, height - 0.05, zPos);
      group.add(topTie);
    };

    // =========================================================================
    // 1. SELECTIVE RACKS (TOP AREA OF A4) - Exact Blueprint Direction
    // Rows run Vertically along Z Axis (from Z = -32 to -12)
    // 4 Upright Posts per Bay, 4 Levels (L1 Ground Level, L2-L4 Orange Beams), 2 Pallets per Bay
    // =========================================================================
    const racksContainer = new THREE.Group();
    scene.add(racksContainer);

    const BAY_SPAN_Z = 2.4; // 2.4m width along Z (fits 2 pallets side-by-side)
    const RACK_FRAME_DEPTH = 1.15; // 1.15m depth along X
    const RACK_TOTAL_HEIGHT = 5.6; // 5.6m upright column height

    // Section 1: DA4D-2 (Rows B, C, D, E, F - 12 Bays running vertically along Z)
    const da4d2RackRows = [
      { name: 'B', x: -23.5, isDouble: false },
      { name: 'C', x: -18.2, isDouble: true },
      { name: 'D', x: -16.4, isDouble: true },
      { name: 'E', x: -11.0, isDouble: true },
      { name: 'F', x: -9.2, isDouble: true }
    ];

    da4d2RackRows.forEach(r => {
      const rowGroup = new THREE.Group();
      rackRowGroupsRef.current[r.name] = rowGroup;
      racksContainer.add(rowGroup);

      const rackColor = '#2563eb';
      const rackHeadMat = new THREE.MeshBasicMaterial({
        map: createA4RackHeadDecalTexture(r.name, 'DA4D-2', rackColor, 12),
        side: THREE.DoubleSide
      });

      // Overhead End Sign Plate (Facing front aisle +Z)
      const overheadSign = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.6), rackHeadMat);
      overheadSign.position.set(r.x, 4.5, -10.6);
      overheadSign.rotation.y = 0; // Fixed: 0 faces +Z so it is not mirrored when viewed from front aisle
      rowGroup.add(overheadSign);

      // 12 Bays running along Z
      for (let bay = 1; bay <= 12; bay++) {
        const zBayCenter = -12.0 - (bay - 1) * BAY_SPAN_Z;
        const zStart = zBayCenter + BAY_SPAN_Z / 2;
        const zEnd = zBayCenter - BAY_SPAN_Z / 2;

        const xFront = r.x + RACK_FRAME_DEPTH / 2;
        const xRear = r.x - RACK_FRAME_DEPTH / 2;

        // 4 Upright Support Columns (Blue steel with footplate & yellow base guard)
        // 1. Front-Start, 2. Rear-Start, 3. Front-End, 4. Rear-End
        const postPositions = [
          [xFront, zStart],
          [xRear, zStart],
          [xFront, zEnd],
          [xRear, zEnd]
        ];

        postPositions.forEach(([px, pz]) => {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, RACK_TOTAL_HEIGHT, 0.1), uprightBlue);
          post.position.set(px, RACK_TOTAL_HEIGHT / 2, pz);
          rowGroup.add(post);

          // Footplate
          const foot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 0.18), uprightBlue);
          foot.position.set(px, 0.01, pz);
          rowGroup.add(foot);

          // Yellow Corner Base Protector on every upright post of every bay
          const guard = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.55, 0.2), guardYellow);
          guard.position.set(px, 0.28, pz);
          rowGroup.add(guard);
        });

        // Add Side Diagonal Steel Bracing on left & right upright frames of the bay
        addSideBracingAtZ(rowGroup, r.x, zStart, RACK_FRAME_DEPTH, RACK_TOTAL_HEIGHT);
        if (bay === 12) {
          addSideBracingAtZ(rowGroup, r.x, zEnd, RACK_FRAME_DEPTH, RACK_TOTAL_HEIGHT);
        }

        // 4 Levels (L1 to L4)
        // L1: Ground Floor Level (Y = 0, NO lower beam)
        // L2, L3, L4: Elevated shelves on Safety Orange Load Beams
        const levelYPositions: { [key: number]: number } = {
          1: 0.0,   // Ground Floor
          2: 1.45,  // Beam Level 2
          3: 2.85,  // Beam Level 3
          4: 4.25   // Beam Level 4
        };

        for (let lvl = 1; lvl <= 4; lvl++) {
          const yLvl = levelYPositions[lvl];

          // For L2, L3, L4: Add Front & Rear Safety Orange Load Beams + Wire Decking
          if (lvl > 1) {
            const beamFront = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, BAY_SPAN_Z - 0.05), beamOrange);
            beamFront.position.set(xFront, yLvl, zBayCenter);
            const beamRear = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, BAY_SPAN_Z - 0.05), beamOrange);
            beamRear.position.set(xRear, yLvl, zBayCenter);
            rowGroup.add(beamFront, beamRear);

            // Steel Wire Mesh Shelf Decking & Cross Support Ties (เหล็กกั้นวาง)
            for (let w = -2; w <= 2; w++) {
              const wire = new THREE.Mesh(new THREE.BoxGeometry(RACK_FRAME_DEPTH - 0.05, 0.02, 0.03), wireDeckMat);
              wire.position.set(r.x, yLvl + 0.02, zBayCenter + w * 0.45);
              rowGroup.add(wire);
            }
          }

          // Add floating bay label above L4 (only once per bay)
          if (lvl === 4) {
            const label = createBayLabelSprite(`${r.name}-${String(bay).padStart(2, '0')}`);
            label.position.set(r.x, RACK_TOTAL_HEIGHT + 0.5, zBayCenter);
            rowGroup.add(label);
          }

          // 2 Pallets per Bay Side-by-Side (Pallet 1 at zBay - 0.55, Pallet 2 at zBay + 0.55)
          const palletOffsetsZ = [-0.55, 0.55]; // Pallet 1 (Left/Back) and Pallet 2 (Right/Front)

          palletOffsetsZ.forEach((zOff, pIdx) => {
            const pPos: 'P1' | 'P2' = pIdx === 0 ? 'P1' : 'P2';
            const item = a4Data.rackItemsMap.get(`${r.name}-${bay}-${lvl}-${pPos}`) ||
                         (pIdx === 0 ? a4Data.rackItemsMap.get(`${r.name}-${bay}-${lvl}`) : undefined);
            const locatorStr = `DA4D-2-${r.name}${bay < 10 ? '0' + bay : bay}-L${lvl}-${pPos}`;

            if (item) {
              let bMat = boxActiveBlue;
              let statusMode: 'EMPTY' | 'OCCUPIED' | 'AGING' | 'OVERDUE' = 'OCCUPIED';
              if (item.agingDays > 45 || item.agingStatus === 'OVERDUE') {
                bMat = boxLowStockRed;
                statusMode = 'OVERDUE';
              } else if (item.agingDays > 28) {
                bMat = boxAgingAmber;
                statusMode = 'AGING';
              } else if (item.quantity <= (item.minStock || 10)) {
                bMat = boxLowStockRed;
                statusMode = 'OCCUPIED';
              }

              const palletGrp = new THREE.Group();
              palletGrp.position.set(r.x, yLvl + (lvl === 1 ? 0.0 : 0.05), zBayCenter + zOff);

              // Realistic Wood Pallet with 3 Runners
              const topBoard = new THREE.Mesh(new THREE.BoxGeometry(RACK_FRAME_DEPTH - 0.1, 0.06, 0.95), woodPine);
              topBoard.position.y = 0.08;
              topBoard.castShadow = true;
              palletGrp.add(topBoard);

              const runner1 = new THREE.Mesh(new THREE.BoxGeometry(RACK_FRAME_DEPTH - 0.1, 0.06, 0.1), woodPine);
              runner1.position.set(0, 0.03, 0.4);
              const runner2 = new THREE.Mesh(new THREE.BoxGeometry(RACK_FRAME_DEPTH - 0.1, 0.06, 0.1), woodPine);
              runner2.position.set(0, 0.03, 0);
              const runner3 = new THREE.Mesh(new THREE.BoxGeometry(RACK_FRAME_DEPTH - 0.1, 0.06, 0.1), woodPine);
              runner3.position.set(0, 0.03, -0.4);
              palletGrp.add(runner1, runner2, runner3);

              // Loaded Storage Box / Cargo Goods (1,000 Kgs / 1 Pallet Unit)
              const pBox = new THREE.Mesh(new THREE.BoxGeometry(RACK_FRAME_DEPTH - 0.15, 0.8, 0.9), bMat);
              pBox.position.y = 0.51;
              pBox.castShadow = true;
              palletGrp.add(pBox);

              rowGroup.add(palletGrp);

              const pPart = item.partNumber || item.modelHE || 'Item';
              const pName = item.partName || item.modelHE || '';
              interactiveMeshes.push({
                mesh: palletGrp,
                type: 'RACK',
                locator: locatorStr,
                zoneName: `แร็ค A4 (Row ${r.name})`,
                desc: `${pPart}${pName && pName !== pPart ? ' - ' + pName : ''} (${item.quantity} ชิ้น) [${pPos}]`,
                item,
                palletPosition: pPos,
                rowName: r.name,
                bay,
                level: lvl,
                x: r.x,
                y: yLvl + (lvl === 1 ? 0.0 : 0.05),
                z: zBayCenter + zOff,
                w: RACK_FRAME_DEPTH - 0.1,
                h: 0.95,
                d: 0.95,
                statusMode
              });
            } else {
              // Empty slot hit box for scanning / inspection
              const emptyHit = new THREE.Mesh(
                new THREE.BoxGeometry(RACK_FRAME_DEPTH - 0.1, 0.9, 0.95),
                new THREE.MeshBasicMaterial({ visible: false })
              );
              emptyHit.position.set(r.x, yLvl + (lvl === 1 ? 0.45 : 0.5), zBayCenter + zOff);
              rowGroup.add(emptyHit);

              interactiveMeshes.push({
                mesh: emptyHit,
                type: 'RACK',
                locator: locatorStr,
                zoneName: `แร็ค A4 (Row ${r.name})`,
                desc: `[ช่องว่าง] ช่องแร็ค Row ${r.name} เสา ${bay} ชั้น L${lvl} [${pPos}]`,
                item: undefined,
                palletPosition: pPos,
                rowName: r.name,
                bay,
                level: lvl,
                x: r.x,
                y: yLvl + (lvl === 1 ? 0.0 : 0.05),
                z: zBayCenter + zOff,
                w: RACK_FRAME_DEPTH - 0.1,
                h: 0.95,
                d: 0.95,
                statusMode: 'EMPTY'
              });
            }
          });
        }
      }
    });

    // Section 2: DA4D-3 (Rows G, H, I, J, K - 5 Bays each running vertically along Z)
    const da4d3RackRows = [
      { name: 'G', x: -1.5, isDouble: false },
      { name: 'H', x: 4.0, isDouble: true },
      { name: 'I', x: 5.8, isDouble: true },
      { name: 'J', x: 11.2, isDouble: true },
      { name: 'K', x: 13.0, isDouble: true }
    ];

    da4d3RackRows.forEach(r => {
      const rowGroup = new THREE.Group();
      rackRowGroupsRef.current[r.name] = rowGroup;
      racksContainer.add(rowGroup);

      const rackColor = '#8b5cf6';
      const rackHeadMat = new THREE.MeshBasicMaterial({
        map: createA4RackHeadDecalTexture(r.name, 'DA4D-3', rackColor, 5),
        side: THREE.DoubleSide
      });

      // Overhead End Sign Plate mounted directly on front rack head frame (bay 1 starts at z = -27.6)
      const overheadSign = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.6), rackHeadMat);
      overheadSign.position.set(r.x, 4.5, -27.45);
      overheadSign.rotation.y = 0; // Fixed: 0 faces +Z so it is not mirrored
      rowGroup.add(overheadSign);

      // 5 Bays running along Z
      for (let bay = 1; bay <= 5; bay++) {
        // Shift to align G-K tail with B-F tail (-38.4 end position for B-F)
        // G-K has 5 bays, span 2.4. Target Z_start: -38.4 + 4 * 2.4 = -28.8
        const zBayCenter = -28.8 - (bay - 1) * BAY_SPAN_Z;
        const zStart = zBayCenter + BAY_SPAN_Z / 2;
        const zEnd = zBayCenter - BAY_SPAN_Z / 2;

        const xFront = r.x + RACK_FRAME_DEPTH / 2;
        const xRear = r.x - RACK_FRAME_DEPTH / 2;

        // 4 Uprights per bay
        const postPositions = [
          [xFront, zStart],
          [xRear, zStart],
          [xFront, zEnd],
          [xRear, zEnd]
        ];

        postPositions.forEach(([px, pz]) => {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, RACK_TOTAL_HEIGHT, 0.1), uprightBlue);
          post.position.set(px, RACK_TOTAL_HEIGHT / 2, pz);
          rowGroup.add(post);

          const foot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 0.18), uprightBlue);
          foot.position.set(px, 0.01, pz);
          rowGroup.add(foot);

          const guard = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.55, 0.2), guardYellow);
          guard.position.set(px, 0.28, pz);
          rowGroup.add(guard);
        });

        // Add Side Diagonal Steel Bracing
        addSideBracingAtZ(rowGroup, r.x, zStart, RACK_FRAME_DEPTH, RACK_TOTAL_HEIGHT);
        if (bay === 5) {
          addSideBracingAtZ(rowGroup, r.x, zEnd, RACK_FRAME_DEPTH, RACK_TOTAL_HEIGHT);
        }

        // 4 Levels (L1 Ground, L2-L4 Orange Beams)
        const levelYPositions: { [key: number]: number } = {
          1: 0.0,
          2: 1.45,
          3: 2.85,
          4: 4.25
        };

        for (let lvl = 1; lvl <= 4; lvl++) {
          const yLvl = levelYPositions[lvl];

          if (lvl > 1) {
            const beamFront = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, BAY_SPAN_Z - 0.05), beamOrange);
            beamFront.position.set(xFront, yLvl, zBayCenter);
            const beamRear = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, BAY_SPAN_Z - 0.05), beamOrange);
            beamRear.position.set(xRear, yLvl, zBayCenter);
            rowGroup.add(beamFront, beamRear);

            // Wire mesh
            for (let w = -2; w <= 2; w++) {
              const wire = new THREE.Mesh(new THREE.BoxGeometry(RACK_FRAME_DEPTH - 0.05, 0.02, 0.03), wireDeckMat);
              wire.position.set(r.x, yLvl + 0.02, zBayCenter + w * 0.45);
              rowGroup.add(wire);
            }
          }

          // Add floating bay label above L4 (only once per bay)
          if (lvl === 4) {
            const label = createBayLabelSprite(`${r.name}-${String(bay).padStart(2, '0')}`);
            label.position.set(r.x, RACK_TOTAL_HEIGHT + 0.5, zBayCenter);
            rowGroup.add(label);
          }

          // 2 Pallets per Bay Side-by-Side (Pallet 1 at zBay - 0.55, Pallet 2 at zBay + 0.55)
          const palletOffsetsZ = [-0.55, 0.55];

          palletOffsetsZ.forEach((zOff, pIdx) => {
            const pPos: 'P1' | 'P2' = pIdx === 0 ? 'P1' : 'P2';
            const item = a4Data.rackItemsMap.get(`${r.name}-${bay}-${lvl}-${pPos}`) ||
                         (pIdx === 0 ? a4Data.rackItemsMap.get(`${r.name}-${bay}-${lvl}`) : undefined);
            const locatorStr = `DA4D-3-${r.name}0${bay}-L${lvl}-${pPos}`;

            if (item) {
              let bMat = boxActiveBlue;
              let statusMode: 'EMPTY' | 'OCCUPIED' | 'AGING' | 'OVERDUE' = 'OCCUPIED';
              if (item.agingDays > 45 || item.agingStatus === 'OVERDUE') {
                bMat = boxLowStockRed;
                statusMode = 'OVERDUE';
              } else if (item.agingDays > 28) {
                bMat = boxAgingAmber;
                statusMode = 'AGING';
              } else if (item.quantity <= (item.minStock || 10)) {
                bMat = boxLowStockRed;
                statusMode = 'OCCUPIED';
              }

              const palletGrp = new THREE.Group();
              palletGrp.position.set(r.x, yLvl + (lvl === 1 ? 0.0 : 0.05), zBayCenter + zOff);

              const topBoard = new THREE.Mesh(new THREE.BoxGeometry(RACK_FRAME_DEPTH - 0.1, 0.06, 0.95), woodPine);
              topBoard.position.y = 0.08;
              topBoard.castShadow = true;
              palletGrp.add(topBoard);

              const runner1 = new THREE.Mesh(new THREE.BoxGeometry(RACK_FRAME_DEPTH - 0.1, 0.06, 0.1), woodPine);
              runner1.position.set(0, 0.03, 0.4);
              const runner2 = new THREE.Mesh(new THREE.BoxGeometry(RACK_FRAME_DEPTH - 0.1, 0.06, 0.1), woodPine);
              runner2.position.set(0, 0.03, 0);
              const runner3 = new THREE.Mesh(new THREE.BoxGeometry(RACK_FRAME_DEPTH - 0.1, 0.06, 0.1), woodPine);
              runner3.position.set(0, 0.03, -0.4);
              palletGrp.add(runner1, runner2, runner3);

              const pBox = new THREE.Mesh(new THREE.BoxGeometry(RACK_FRAME_DEPTH - 0.15, 0.8, 0.9), bMat);
              pBox.position.y = 0.51;
              pBox.castShadow = true;
              palletGrp.add(pBox);

              rowGroup.add(palletGrp);

              const pPart = item.partNumber || item.modelHE || 'Item';
              const pName = item.partName || item.modelHE || '';
              interactiveMeshes.push({
                mesh: palletGrp,
                type: 'RACK',
                locator: locatorStr,
                zoneName: `แร็ค A4 (Row ${r.name})`,
                desc: `${pPart}${pName && pName !== pPart ? ' - ' + pName : ''} (${item.quantity} ชิ้น) [${pPos}]`,
                item,
                palletPosition: pPos,
                rowName: r.name,
                bay,
                level: lvl,
                x: r.x,
                y: yLvl + (lvl === 1 ? 0.0 : 0.05),
                z: zBayCenter + zOff,
                w: RACK_FRAME_DEPTH - 0.1,
                h: 0.95,
                d: 0.95,
                statusMode
              });
            } else {
              const emptyHit = new THREE.Mesh(
                new THREE.BoxGeometry(RACK_FRAME_DEPTH - 0.1, 0.9, 0.95),
                new THREE.MeshBasicMaterial({ visible: false })
              );
              emptyHit.position.set(r.x, yLvl + (lvl === 1 ? 0.45 : 0.5), zBayCenter + zOff);
              rowGroup.add(emptyHit);

              interactiveMeshes.push({
                mesh: emptyHit,
                type: 'RACK',
                locator: locatorStr,
                zoneName: `แร็ค A4 (Row ${r.name})`,
                desc: `[ช่องว่าง] ช่องแร็ค Row ${r.name} เสา ${bay} ชั้น L${lvl} [${pPos}]`,
                item: undefined,
                palletPosition: pPos,
                rowName: r.name,
                bay,
                level: lvl,
                x: r.x,
                y: yLvl + (lvl === 1 ? 0.0 : 0.05),
                z: zBayCenter + zOff,
                w: RACK_FRAME_DEPTH - 0.1,
                h: 0.95,
                d: 0.95,
                statusMode: 'EMPTY'
              });
            }
          });
        }
      }
    });

    // =========================================================================
    // 2. FLOOR STAGING DA4D-1 (BOTTOM AREA OF A4) - Exact Blueprint Grid
    // Order from Top to Bottom:
    // X8: 12 Cols (01-12) x 4 Rows (48P)
    // X7: 12 Cols (01-12) x 6 Rows (72P)
    // X6: 12 Cols (01-12) x 6 Rows (72P)
    // X5: 12 Cols (01-12) x 6 Rows (72P)
    // X4: 7 Cols (01-07) x 6 Rows (42P)
    // X3: 7 Cols (01-07) x 6 Rows (42P)
    // X2: 7 Cols (01-07) x 6 Rows (42P)
    // X1: 7 Cols (01-07) x 6 Rows (42P)
    // Total = 432 Pallets!
    // =========================================================================
    const floorStagingContainer = new THREE.Group();
    scene.add(floorStagingContainer);

    // Floor Base Yellow Outline Group (DA4D-1 Boundary)
    const floorZonesConfig = [
      // Top blocks: 12 Columns (Col 01 to 12)
      { id: 'X8', zCenter: -5.0, rows: 4, cols: 12, startRow: 43 },
      { id: 'X7', zCenter: -0.5, rows: 6, cols: 12, startRow: 37 },
      { id: 'X6', zCenter: 4.5, rows: 6, cols: 12, startRow: 31 },
      { id: 'X5', zCenter: 9.5, rows: 6, cols: 12, startRow: 25 },

      // Bottom blocks: 7 Columns only (Col 01 to 07)
      { id: 'X4', zCenter: 15.5, rows: 6, cols: 7, startRow: 19 },
      { id: 'X3', zCenter: 20.5, rows: 6, cols: 7, startRow: 13 },
      { id: 'X2', zCenter: 25.5, rows: 6, cols: 7, startRow: 7 },
      { id: 'X1', zCenter: 30.5, rows: 6, cols: 7, startRow: 1 }
    ];

    const slotPitchX = 1.4; // Spacing between columns 01 to 12
    const slotPitchZ = 0.7; // Spacing between rows 1 to 6

    floorZonesConfig.forEach(zone => {
      const zoneGroup = new THREE.Group();
      floorZoneGroupsRef.current[zone.id] = zoneGroup;
      floorStagingContainer.add(zoneGroup);

      // Starting X position aligned so Col 01 is on the left
      const startX = -24.0;

      // Group Perimeter Marking Line
      const groupWidth = zone.cols * slotPitchX;
      const groupDepth = zone.rows * slotPitchZ;
      const groupCenterX = startX + groupWidth / 2 - slotPitchX / 2;

      const groupBorder = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(groupWidth + 0.15, 0.02, groupDepth + 0.15)),
        lineYellowMat
      );
      groupBorder.position.set(groupCenterX, 0.015, zone.zCenter);
      zoneGroup.add(groupBorder);

      // Floating 3D Zone Header Badge (โซน X1, X2... floating overhead above zone center)
      const floatingSprite = createFloatingZoneHeaderSprite(zone.id, zone.rows, zone.cols);
      floatingSprite.position.set(groupCenterX, 3.2, zone.zCenter);
      scene.add(floatingSprite);
      floatingZoneSpritesRef.current.push(floatingSprite);

      // Column Number Decals (สลักตัวเลขหัวคอลัมน์ C01 - C12 บนพื้นหน้าแถว)
      for (let c = 1; c <= zone.cols; c++) {
        const xSlot = startX + (c - 1) * slotPitchX;
        const zColHeader = zone.zCenter - groupDepth / 2 - 0.5;
        const colDecalMat = new THREE.MeshBasicMaterial({
          map: createA4FloorColumnDecalTexture(c),
          side: THREE.DoubleSide
        });
        const colDecal = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.85), colDecalMat);
        colDecal.position.set(xSlot, 0.022, zColHeader);
        colDecal.rotation.x = -Math.PI / 2;
        zoneGroup.add(colDecal);
      }

      // Render individual slots & ground Row Labels (R1 - R46)
      // Note: r=1 is top (-Z), r=zone.rows is bottom (+Z). In 2D, R1 is at bottom (+Z).
      for (let r = 1; r <= zone.rows; r++) {
        const zSlot = zone.zCenter - (groupDepth / 2) + (r - 0.5) * slotPitchZ;
        const localRow = zone.rows - r + 1;
        const globalRow = zone.startRow + (localRow - 1);

        // Painted ground Row Label Decal flat on epoxy floor at LEFT of row (shifted clear of grid)
        const rowDecalMat = new THREE.MeshBasicMaterial({
          map: createA4FloorRowDecalTexture(globalRow),
          side: THREE.DoubleSide
        });
        const rowDecalLeft = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.32), rowDecalMat);
        rowDecalLeft.position.set(startX - 1.25, 0.022, zSlot);
        rowDecalLeft.rotation.x = -Math.PI / 2;
        zoneGroup.add(rowDecalLeft);

        // Painted ground Row Label Decal flat on epoxy floor at RIGHT of row (shifted clear of grid)
        const rowDecalRight = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.32), rowDecalMat);
        rowDecalRight.position.set(startX + groupWidth + 0.15, 0.022, zSlot);
        rowDecalRight.rotation.x = -Math.PI / 2;
        zoneGroup.add(rowDecalRight);

        for (let c = 1; c <= zone.cols; c++) {
          const xSlot = startX + (c - 1) * slotPitchX;

          // Slot Boundary line
          const slotFrame = new THREE.LineSegments(
            new THREE.EdgesGeometry(new THREE.BoxGeometry(slotPitchX - 0.1, 0.01, slotPitchZ - 0.08)),
            lineYellowMat
          );
          slotFrame.position.set(xSlot, 0.02, zSlot);
          zoneGroup.add(slotFrame);

          // Check if item exists in this floor slot (mapped by localRow)
          const item = a4Data.floorItemsMap.get(`${zone.id}-${localRow}-${c}`);
          const hasBox = !!item;
          const rStr = String(localRow).padStart(2, '0');
          const cStr = String(c).padStart(2, '0');
          const locatorStr = `DA4D-1.01-${zone.id}-R${rStr}-C${cStr}`;

          if (hasBox) {
            const palGrp = new THREE.Group();
            palGrp.position.set(xSlot, 0.45, zSlot);

            // Wood pallet
            const wood = new THREE.Mesh(new THREE.BoxGeometry(slotPitchX - 0.2, 0.08, slotPitchZ - 0.12), woodPine);
            wood.position.y = -0.38;
            palGrp.add(wood);

            // Kraft Cardboard Staging Box
            const isAging = item && item.agingDays > 28;
            const isOverdue = item && (item.agingDays > 45 || item.agingStatus === 'OVERDUE');
            const cBox = new THREE.Mesh(
              new THREE.BoxGeometry(slotPitchX - 0.25, 0.65, slotPitchZ - 0.16),
              isOverdue ? boxLowStockRed : isAging ? boxAgingAmber : boxKraft
            );
            cBox.castShadow = true;
            palGrp.add(cBox);

            zoneGroup.add(palGrp);

            const flPart = item ? (item.partNumber || item.modelHE || 'Item') : '';
            const flName = item ? (item.partName || item.modelHE || '') : '';
            interactiveMeshes.push({
              mesh: palGrp,
              type: 'FLOOR',
              locator: locatorStr,
              zoneName: `ลานวางพื้น A4 (${zone.id})`,
              desc: item ? `${flPart}${flName && flName !== flPart ? ' - ' + flName : ''} (${item.quantity} ชิ้น)` : `บล็อกวางพื้น ${zone.id} แถว R${localRow} คอลัมน์ Col ${c}`,
              item,
              group: zone.id,
              row: localRow,
              col: c,
              x: xSlot,
              y: 0.02,
              z: zSlot,
              w: slotPitchX - 0.15,
              h: 0.75,
              d: slotPitchZ - 0.1,
              statusMode: isOverdue ? 'OVERDUE' : isAging ? 'AGING' : 'OCCUPIED'
            });
          } else {
            const emptyFloorHit = new THREE.Mesh(
              new THREE.BoxGeometry(slotPitchX - 0.15, 0.7, slotPitchZ - 0.1),
              new THREE.MeshBasicMaterial({ visible: false })
            );
            emptyFloorHit.position.set(xSlot, 0.35, zSlot);
            zoneGroup.add(emptyFloorHit);

            interactiveMeshes.push({
              mesh: emptyFloorHit,
              type: 'FLOOR',
              locator: locatorStr,
              zoneName: `ลานวางพื้น A4 (${zone.id})`,
              desc: `[ตำแหน่งว่าง] บล็อกวางพื้น ${zone.id} แถว R${localRow} คอลัมน์ Col ${c}`,
              item: undefined,
              group: zone.id,
              row: localRow,
              col: c,
              x: xSlot,
              y: 0.02,
              z: zSlot,
              w: slotPitchX - 0.15,
              h: 0.75,
              d: slotPitchZ - 0.1,
              statusMode: 'EMPTY'
            });
          }
        }
      }
    });

    // =========================================================================
    // REALISTIC INDUSTRIAL FORKLIFTS (Moved out of racks to open logistics floor)
    // =========================================================================
    const forkliftGroup1 = createRealisticForklift(17, 0.0, 6, -Math.PI / 2, 1.05);
    const forkliftGroup2 = createRealisticForklift(17, 0.0, -18, Math.PI * 0.85, 1.05);
    scene.add(forkliftGroup1, forkliftGroup2);
    forkliftsRef.current = [forkliftGroup1, forkliftGroup2];

    // Apply active isolation state immediately after scene construction
    applyA4Isolation(cameraFocus);

    // =========================================================================
    // 3D HOLOGRAPHIC GHOST BLOCK & LASER TARGET SYSTEM
    // =========================================================================
    const hologramGhost = createHologramGhostTarget(1.4, 0.9, 1.35);
    scene.add(hologramGhost.group);

    // Subtle Neon Edge Rack Bay & Floor Slot Highlight
    const rackBayNeon = createRackBayNeonHighlight();
    scene.add(rackBayNeon.group);

    let currentEmissiveRestore: (() => void) | null = null;

    // =========================================================================
    // RAYCASTER FOR HOVER & SELECTION
    // =========================================================================
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const isObject3DVisible = (obj: THREE.Object3D | null): boolean => {
      let curr: THREE.Object3D | null = obj;
      while (curr) {
        if (curr.visible === false) return false;
        curr = curr.parent;
      }
      return true;
    };

    const onPointerMove = (e: MouseEvent) => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const visibleInteractive = interactiveMeshes.filter(m => isObject3DVisible(m.mesh));
      const meshes = visibleInteractive.map(m => m.mesh);
      const intersects = raycaster.intersectObjects(meshes, true);

      if (intersects.length > 0) {
        const hit = visibleInteractive.find(m => 
          m.mesh === intersects[0].object || 
          intersects[0].object.parent === m.mesh || 
          intersects[0].object.parent?.parent === m.mesh
        );
        if (hit) {
          if (currentEmissiveRestore) {
            currentEmissiveRestore();
            currentEmissiveRestore = null;
          }
          currentEmissiveRestore = applyFaintEmissiveHighlight(hit.mesh, !!hit.item);

          hologramGhost.setPosition(hit.x, hit.y, hit.z);
          hologramGhost.setDimensions(hit.w, hit.h, hit.d);
          hologramGhost.setMode(hit.statusMode);
          hologramGhost.show();

          // Subtle Neon Edge on Rack Structure Components & floor bays
          const neonColor = hit.statusMode === 'OVERDUE' 
            ? 0xef4444 
            : hit.statusMode === 'AGING' 
            ? 0xf59e0b 
            : hit.statusMode === 'EMPTY' 
            ? 0x10b981 
            : 0x38bdf8;
          rackBayNeon.setBay(hit.x, hit.y, hit.z, hit.w, hit.h, hit.d, neonColor);
          rackBayNeon.show();

          setHoveredInfo({
            name: hit.zoneName,
            locator: hit.locator,
            desc: hit.desc,
            item: hit.item,
            palletPosition: hit.palletPosition,
            statusMode: hit.statusMode,
            posDetail: hit.type === 'RACK' ? `เสา ${hit.bay} &bull; ชั้น L${hit.level}` : `${hit.group} R${hit.row}-C${hit.col}`
          });
          container.style.cursor = 'pointer';
          return;
        }
      }

      hologramGhost.hide();
      rackBayNeon.hide();
      if (currentEmissiveRestore) {
        currentEmissiveRestore();
        currentEmissiveRestore = null;
      }
      setHoveredInfo(null);
      container.style.cursor = 'default';
    };

    const onPointerClick = (e: MouseEvent) => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const visibleInteractive = interactiveMeshes.filter(m => isObject3DVisible(m.mesh));
      const meshes = visibleInteractive.map(m => m.mesh);
      const intersects = raycaster.intersectObjects(meshes, true);

      if (intersects.length > 0) {
        const hit = visibleInteractive.find(m => 
          m.mesh === intersects[0].object || 
          intersects[0].object.parent === m.mesh || 
          intersects[0].object.parent?.parent === m.mesh
        );
        if (hit) {
          if (e.detail === 2 && onOpenScanner) {
            const targetZone = (hit.rowName || hit.group || 'B') as StorageZone;
            const targetBay = hit.bay || hit.row || 1;
            const targetLevel = (hit.level || hit.col || 1) as ShelfLevel;
            onOpenScanner(targetZone, targetBay, targetLevel, hit.item ? 'OUT' : 'IN', hit.locator, hit.palletPosition, hit.item);
          } else {
            setSelectedSlot({
              type: hit.type,
              locator: hit.locator,
              zoneName: hit.zoneName,
              item: hit.item,
              palletPosition: hit.palletPosition,
              rowName: hit.rowName,
              bay: hit.bay,
              level: hit.level,
              group: hit.group,
              row: hit.row,
              col: hit.col
            });

            if (onSelectSlot) {
              onSelectSlot(hit.type, hit.locator, hit.item);
            }
          }
        }
      }
    };

    container.addEventListener('mousemove', onPointerMove);
    container.addEventListener('click', onPointerClick);

    // Animation Loop
    const startTime = performance.now();
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const elapsedTime = (performance.now() - startTime) / 1000;

      controls.update();
      hologramGhost.updateAnimation(elapsedTime);
      rackBayNeon.update(elapsedTime);

      // Smooth LOD fade for floating 3D zone header badges (< 22m or isolated focus)
      const dist = camera.position.distanceTo(controls.target);
      const isClose = dist < 22;
      const targetOpacity = isClose ? 0.0 : 1.0;
      floatingZoneSpritesRef.current.forEach(sprite => {
        const mat = sprite.material as THREE.SpriteMaterial;
        mat.opacity += (targetOpacity - mat.opacity) * 0.12;
        sprite.visible = mat.opacity > 0.02;
      });

      renderer.render(scene, camera);
    };
    animate();

    // Resize handler with ResizeObserver
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight || 620;
      if (newWidth === 0 || newHeight === 0) return;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    if (container) {
      resizeObserver.observe(container);
    }
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', onPointerMove);
      container.removeEventListener('click', onPointerClick);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (currentEmissiveRestore) currentEmissiveRestore();
      rackBayNeon.dispose();
      renderer.dispose();
    };
  }, [items]);

  const handlePan = (dx: number, dz: number) => {
    if (!controlsRef.current || !cameraRef.current) return;
    const cam = cameraRef.current;
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
    right.y = 0;
    right.normalize();

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    forward.y = 0;
    forward.normalize();

    const panVector = new THREE.Vector3();
    panVector.addScaledVector(right, dx);
    panVector.addScaledVector(forward, -dz);

    controlsRef.current.target.add(panVector);
    cam.position.add(panVector);
    controlsRef.current.update();
  };

  const handleZoom = (zoomIn: boolean) => {
    if (!cameraRef.current || !controlsRef.current) return;
    const cam = cameraRef.current;
    const dir = new THREE.Vector3().subVectors(controlsRef.current.target, cam.position);
    const dist = dir.length();
    if (zoomIn && dist > 10) {
      cam.position.addScaledVector(dir, 0.2);
    } else if (!zoomIn && dist < 180) {
      cam.position.addScaledVector(dir, -0.2);
    }
  };

  const handleReset = () => {
    handleCameraPreset('ALL_A4');
  };

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col min-h-0 space-y-1.5 font-sans text-slate-100">
      
      {/* 2. 3D VIEWPORT CONTAINER */}
      <div className="relative w-full flex-1 min-h-[350px] bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        
        {/* Unified Camera Navigation Control Overlay (D-Pad + Presets) */}
        <CameraControlOverlay
          onPan={handlePan}
          onZoom={handleZoom}
          onReset={handleReset}
          onPreset={(presetKey) => handleCameraPreset(presetKey as CameraPresetKey)}
          activePreset={cameraFocus}
          presets={[
            { key: 'ALL_A4', label: 'ภาพรวม 45°' },
            { key: 'TOP_DOWN', label: 'แปลนบน 85°' },
            { key: 'RACKS', label: 'มุมมองแร็ค B-K' },
            { key: 'FLOOR', label: 'ลานกองพื้น X1-X8' }
          ]}
        />


        {/* Individual Row & Floor Zone Isolator Pills Bar (Moved to Top Left) */}
        <div className="absolute top-3 left-3 z-20 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-2 shadow-lg flex flex-row items-center gap-1.5 text-[11px] font-bold flex-wrap max-w-[60vw]">
          <span className="text-slate-400 px-1 shrink-0">แถวแร็ค:</span>
          {(['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'] as const).map(rowKey => {
            const presetKey = `ROW_${rowKey}` as CameraPresetKey;
            return (
              <button
                key={rowKey}
                onClick={() => handleCameraPreset(presetKey)}
                className={`px-2 py-1 rounded transition-all shrink-0 ${
                  cameraFocus === presetKey
                    ? 'bg-blue-600 text-white font-black'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {rowKey}
              </button>
            );
          })}

          <div className="w-[1px] h-4 bg-slate-700 mx-1 shrink-0" />

          <span className="text-slate-400 px-1 shrink-0">ลานพื้น:</span>
          {(['X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'X8'] as const).map(zoneKey => {
            const presetKey = `ZONE_${zoneKey}` as CameraPresetKey;
            return (
              <button
                key={zoneKey}
                onClick={() => handleCameraPreset(presetKey)}
                className={`px-2 py-1 rounded transition-all shrink-0 ${
                  cameraFocus === presetKey
                    ? 'bg-amber-600 text-white font-black'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                {zoneKey}
              </button>
            );
          })}
        </div>


        {/* Three.js Canvas Mount */}
        <div ref={mountRef} className="w-full flex-1 h-full min-h-[300px] cursor-grab active:cursor-grabbing" />

        {/* 3D Holographic Ghost HUD Target Tooltip */}
        {hoveredInfo && (
          <div className={`absolute bottom-4 left-4 backdrop-blur-md border rounded-2xl p-3.5 shadow-2xl z-30 max-w-sm pointer-events-none animate-fadeIn ${
            hoveredInfo.statusMode === 'EMPTY'
              ? 'bg-emerald-950/90 border-emerald-500/60 shadow-emerald-900/30'
              : hoveredInfo.statusMode === 'OVERDUE'
              ? 'bg-rose-950/90 border-rose-500/60 shadow-rose-900/30'
              : hoveredInfo.statusMode === 'AGING'
              ? 'bg-amber-950/90 border-amber-500/60 shadow-amber-900/30'
              : 'bg-slate-900/95 border-cyan-500/60 shadow-cyan-900/30'
          }`}>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full animate-ping ${
                  hoveredInfo.statusMode === 'EMPTY' ? 'bg-emerald-400' :
                  hoveredInfo.statusMode === 'OVERDUE' ? 'bg-rose-400' :
                  hoveredInfo.statusMode === 'AGING' ? 'bg-amber-400' : 'bg-cyan-400'
                }`} />
                <span className="font-mono text-[11px] uppercase font-bold text-white tracking-wider">
                  {hoveredInfo.name}
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                hoveredInfo.statusMode === 'EMPTY'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : hoveredInfo.statusMode === 'OVERDUE'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : hoveredInfo.statusMode === 'AGING'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
              }`}>
                {hoveredInfo.statusMode === 'EMPTY' ? '● ช่องว่าง (Infeed พร้อม)' : 
                 hoveredInfo.statusMode === 'OVERDUE' ? '▲ OVERDUE > 45d' : 
                 hoveredInfo.statusMode === 'AGING' ? '⚠ AGING > 28d' : '✓ มีสินค้า (STORED)'}
              </span>
            </div>

            <div className="text-sm font-mono font-black text-white mb-0.5 tracking-tight">
              {hoveredInfo.locator}
            </div>

            {hoveredInfo.posDetail && (
              <div className="text-[11px] font-mono text-slate-400 mb-1">
                {hoveredInfo.posDetail}
              </div>
            )}

            <div className="text-xs text-slate-200 line-clamp-2">
              {hoveredInfo.desc}
            </div>

            <div className="mt-2 pt-2 border-t border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400">
              <span className="text-cyan-300 font-medium">🎯 Holographic Laser Target Lock</span>
              <span className="text-white font-bold">คลิกเพื่อรับเข้า/เบิกออก</span>
            </div>
          </div>
        )}

        {/* Slot Detail Drawer / Popup */}
        {selectedSlot && (
          <div className="absolute top-14 right-4 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-4 shadow-2xl z-30 w-80 animate-fadeIn">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Box className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold text-white">{selectedSlot.zoneName}</span>
              </div>
              <button
                onClick={() => setSelectedSlot(null)}
                className="text-slate-400 hover:text-white text-xs p-1"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div>
                <span className="text-slate-400">พิกัด Locator: </span>
                <span className="font-mono font-black text-amber-300">{selectedSlot.locator}</span>
              </div>

              {selectedSlot.item ? (
                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="font-bold text-white">{selectedSlot.item.partNumber}</div>
                  <div className="text-slate-300">{selectedSlot.item.modelHE} ({selectedSlot.item.partName})</div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[11px] font-mono">
                    <div>
                      <span className="text-slate-500">จำนวน: </span>
                      <span className="text-blue-400 font-bold">{selectedSlot.item.quantity} ชิ้น</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Aging: </span>
                      <span className={selectedSlot.item.agingDays > 28 ? 'text-amber-400 font-bold' : 'text-slate-300'}>
                        {selectedSlot.item.agingDays} วัน
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl text-emerald-400 text-center font-bold">
                  ✓ ตำแหน่งนี้ว่าง พร้อมจัดเก็บสินค้า
                </div>
              )}

              {onOpenScanner && (
                <div className="pt-2 flex gap-2">
                  <button
                    onClick={() => {
                      if (selectedSlot.type === 'RACK') {
                        onOpenScanner(selectedSlot.rowName as any, selectedSlot.bay || 1, selectedSlot.level as any, 'IN', selectedSlot.locator, selectedSlot.palletPosition, selectedSlot.item);
                      } else {
                        onOpenScanner(selectedSlot.group as any, selectedSlot.row || 1, (selectedSlot.col || 1) as any, 'IN', selectedSlot.locator, selectedSlot.palletPosition, selectedSlot.item);
                      }
                    }}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>สแกนรับเข้า</span>
                  </button>

                  {selectedSlot.item && (
                    <button
                      onClick={() => {
                        if (selectedSlot.type === 'RACK') {
                          onOpenScanner(selectedSlot.rowName as any, selectedSlot.bay || 1, selectedSlot.level as any, 'OUT', selectedSlot.locator, selectedSlot.palletPosition, selectedSlot.item);
                        } else {
                          onOpenScanner(selectedSlot.group as any, selectedSlot.row || 1, (selectedSlot.col || 1) as any, 'OUT', selectedSlot.locator, selectedSlot.palletPosition, selectedSlot.item);
                        }
                      }}
                      className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>สแกนเบิกจ่าย</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
