import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  InventoryItem, 
  StorageZone, 
  ShelfLevel, 
  MovementType, 
  WarehouseFacility, 
  MovementLog, 
  WmsStats, 
  AgingThresholdConfig 
} from '../types';
import { useTranslation } from '../i18n/i18nContext';
import { createRealisticForklift } from './zone-3d/forkliftModel';
import { createHologramGhostTarget } from './zone-3d/hologramGhost';
import { createRackBayNeonHighlight, applyFaintEmissiveHighlight } from './zone-3d/neonEdgeHighlight';
import { ZoneKpiFormalDashboard } from './ZoneKpiFormalDashboard';
import { 
  Maximize2, 
  Minimize2, 
  RotateCcw, 
  Boxes, 
  Compass, 
  Building2, 
  Box, 
  Play, 
  Pause, 
  Sun, 
  CheckCircle2, 
  Clock, 
  SlidersHorizontal,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Grid,
  Eye,
  TableProperties,
  ArrowDownRight,
  TrendingUp,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface Campus3DCockpitViewProps {
  items: InventoryItem[];
  facilities?: WarehouseFacility[];
  stats?: WmsStats;
  lowStockCount?: number;
  logs?: MovementLog[];
  agingConfig?: AgingThresholdConfig;
  onNavigateToZone: (target: 'A4_FLOOR' | 'A4_RACK' | 'A2_RAIL' | 'A5_TENT' | 'CY3_TENT', tentNum?: number) => void;
  onOpenScanner?: (zone: StorageZone, bay: number, level: ShelfLevel, mode: MovementType) => void;
  onBackToOverview?: () => void;
}

export const Campus3DCockpitView: React.FC<Campus3DCockpitViewProps> = ({
  items,
  facilities = [],
  stats,
  lowStockCount = 0,
  logs = [],
  agingConfig,
  onNavigateToZone,
  onOpenScanner,
  onBackToOverview
}) => {
  const { t } = useTranslation();
  const mountRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isAutoRotate, setIsAutoRotate] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'3D_ISOMETRIC' | 'TOP_VIEW' | 'TABLE_DETAIL'>('TOP_VIEW');
  const [activeZoneFocus, setActiveZoneFocus] = useState<'CAMPUS' | 'TOP_DOWN' | 'A4_ALL' | 'A4_RACK' | 'A4_FLOOR' | 'A2' | 'A5' | 'CY3'>('TOP_DOWN');
  const [showTableModal, setShowTableModal] = useState<boolean>(false);
  const [hoveredObject, setHoveredObject] = useState<{ 
    name: string; 
    zone: string; 
    desc: string; 
    count?: number; 
    cap?: number;
    pct?: number;
    targetTab?: 'A4_FLOOR' | 'A4_RACK' | 'A2_RAIL' | 'A5_TENT' | 'CY3_TENT';
  } | null>(null);

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

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Calculate detailed metrics for all 4 zones & Aging breakdowns
  const metrics = useMemo(() => {
    const a2Items = items.filter(it => 
      it.zone?.startsWith('R') || it.zone?.startsWith('FR') || (it.locatorCode && it.locatorCode.includes('DA2D-1'))
    );
    const a4RackItems = items.filter(it => 
      ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'].includes(it.zone) ||
      (it.locatorCode && (it.locatorCode.includes('DA4D-2') || it.locatorCode.includes('DA4D-3')))
    );
    const a4FloorItems = items.filter(it => 
      ['X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'X8'].includes(it.zone) ||
      (it.locatorCode && it.locatorCode.includes('DA4D-1-R'))
    );
    const a5Items = items.filter(it => 
      it.zone === 'A' || it.zone?.startsWith('TENT') || (it.locatorCode && (it.locatorCode.includes('DAST') || it.locatorCode.includes('DA5T')))
    );
    const cy3Items = items.filter(it => 
      it.zone?.startsWith('CY3') || (it.locatorCode && it.locatorCode.includes('DY3T'))
    );

    // Filter Logs for Today IN / OUT
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayLogs = logs.filter(l => l.issueDate === todayStr || l.createdOn?.startsWith(todayStr));

    const getZoneLogs = (prefix: string) => todayLogs.filter(l => l.locatorCode?.includes(prefix) || l.locatorGroup?.includes(prefix));
    
    const a2Logs = getZoneLogs('DA2D-1');
    const a4RackLogs = todayLogs.filter(l => l.locatorCode?.includes('DA4D-2') || l.locatorCode?.includes('DA4D-3'));
    const a4FloorLogs = todayLogs.filter(l => l.locatorCode?.includes('DA4D-1') || l.locatorCode?.includes('X'));
    const a5Logs = todayLogs.filter(l => l.locatorCode?.includes('DAST') || l.locatorCode?.includes('DA5T'));
    const cy3Logs = todayLogs.filter(l => l.locatorCode?.includes('DY3T') || l.locatorCode?.includes('CY3'));

    const getAgingBreakdown = (itemList: InventoryItem[]) => {
      const safe = itemList.filter(i => (i.agingDays ?? 0) <= 21 && i.agingStatus !== 'OVERDUE' && i.agingStatus !== 'URGENT').length;
      const warning = itemList.filter(i => (i.agingDays ?? 0) >= 22 && (i.agingDays ?? 0) <= 24).length;
      const urgent = itemList.filter(i => (i.agingDays ?? 0) >= 25 && (i.agingDays ?? 0) <= 27).length;
      const critical = itemList.filter(i => (i.agingDays ?? 0) >= 28 || ['OVERDUE', 'DUE_TODAY', 'EXPIRED', 'HOLD'].includes(i.agingStatus)).length;
      return { safe, warning, urgent, critical, totalAging: warning + urgent + critical };
    };

    const a2Aging = getAgingBreakdown(a2Items);
    const a4RackAging = getAgingBreakdown(a4RackItems);
    const a4FloorAging = getAgingBreakdown(a4FloorItems);
    const a5Aging = getAgingBreakdown(a5Items);
    const cy3Aging = getAgingBreakdown(cy3Items);
    const totalAgingAll = getAgingBreakdown(items);

    const a2Occupied = a2Items.length;
    const a4RackOccupied = a4RackItems.length;
    const a4FloorOccupied = a4FloorItems.length;
    const a5Occupied = a5Items.length;
    const cy3Occupied = cy3Items.length;

    const totalOccupied = a2Occupied + a4RackOccupied + a4FloorOccupied + a5Occupied + cy3Occupied;
    const totalCapacity = 128 + 680 + 432 + 784 + 400; // 2,424 PL

    const todayInTotal = todayLogs.filter(l => l.type === 'IN').length;
    const todayOutTotal = todayLogs.filter(l => l.type === 'OUT').length;

    const zoneBreakdown = [
      {
        id: 'A4_RACK',
        name: 'อาคาร A4 • Selective Rack (แร็ค 4 ชั้น)',
        code: 'DA4D-2 & 3',
        type: 'Selective Rack แถว B–K (10 แถว)',
        cap: 680,
        occupied: a4RackOccupied,
        free: 680 - a4RackOccupied,
        pct: Math.round((a4RackOccupied / 680) * 100),
        inScans: a4RackLogs.filter(l => l.type === 'IN').length,
        outScans: a4RackLogs.filter(l => l.type === 'OUT').length,
        aging: a4RackAging,
        badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        targetTab: 'A4_RACK' as const
      },
      {
        id: 'A4_FLOOR',
        name: 'อาคาร A4 • ลานวางพื้น Floor Staging',
        code: 'DA4D-1',
        type: 'ลานวางพื้นบล็อก X1–X8 รูปตัว L',
        cap: 432,
        occupied: a4FloorOccupied,
        free: 432 - a4FloorOccupied,
        pct: Math.round((a4FloorOccupied / 432) * 100),
        inScans: a4FloorLogs.filter(l => l.type === 'IN').length,
        outScans: a4FloorLogs.filter(l => l.type === 'OUT').length,
        aging: a4FloorAging,
        badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        targetTab: 'A4_FLOOR' as const
      },
      {
        id: 'A2_RAIL',
        name: 'อาคาร A2 • Continuous Flow Rail',
        code: 'DA2D-1',
        type: 'รางเลื่อนแรงโน้มถ่วง 16 ราง (R1–R16)',
        cap: 128,
        occupied: a2Occupied,
        free: 128 - a2Occupied,
        pct: Math.round((a2Occupied / 128) * 100),
        inScans: a2Logs.filter(l => l.type === 'IN').length,
        outScans: a2Logs.filter(l => l.type === 'OUT').length,
        aging: a2Aging,
        badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        targetTab: 'A2_RAIL' as const
      },
      {
        id: 'A5_TENT',
        name: 'ลาน A5 • เต็นท์ผ้าใบ Canopy Tents (4 หลัง)',
        code: 'DAST 1–4',
        type: 'เต็นท์โมดูลาร์ผ้าใบ DAST 1-4 (G1-G7)',
        cap: 784,
        occupied: a5Occupied,
        free: 784 - a5Occupied,
        pct: Math.round((a5Occupied / 784) * 100),
        inScans: a5Logs.filter(l => l.type === 'IN').length,
        outScans: a5Logs.filter(l => l.type === 'OUT').length,
        aging: a5Aging,
        badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        targetTab: 'A5_TENT' as const
      },
      {
        id: 'CY3_TENT',
        name: 'ลาน CY3 • Outdoor Heavy-Duty Rack',
        code: 'DY3T',
        type: 'แร็ค 4 ชั้นกลางแจ้ง แถว A–D (25 Bays)',
        cap: 400,
        occupied: cy3Occupied,
        free: 400 - cy3Occupied,
        pct: Math.round((cy3Occupied / 400) * 100),
        inScans: cy3Logs.filter(l => l.type === 'IN').length,
        outScans: cy3Logs.filter(l => l.type === 'OUT').length,
        aging: cy3Aging,
        badgeColor: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        targetTab: 'CY3_TENT' as const
      }
    ];

    return {
      a2: { occupied: a2Occupied, cap: 128, pct: Math.round((a2Occupied / 128) * 100), items: a2Items, aging: a2Aging },
      a4Rack: { occupied: a4RackOccupied, cap: 680, pct: Math.round((a4RackOccupied / 680) * 100), items: a4RackItems, aging: a4RackAging },
      a4Floor: { occupied: a4FloorOccupied, cap: 432, pct: Math.round((a4FloorOccupied / 432) * 100), items: a4FloorItems, aging: a4FloorAging },
      a5: { occupied: a5Occupied, cap: 784, pct: Math.round((a5Occupied / 784) * 100), items: a5Items, aging: a5Aging },
      cy3: { occupied: cy3Occupied, cap: 400, pct: Math.round((cy3Occupied / 400) * 100), items: cy3Items, aging: cy3Aging },
      totalOccupied,
      totalCapacity,
      totalFree: totalCapacity - totalOccupied,
      occupancyRate: Math.round((totalOccupied / totalCapacity) * 100),
      todayInTotal,
      todayOutTotal,
      totalAgingAll,
      zoneBreakdown
    };
  }, [items, logs]);

  // Smooth Camera Fly-To
  const flyCameraTo = (targetPos: THREE.Vector3, lookAtTarget: THREE.Vector3, duration = 850) => {
    if (!cameraRef.current || !controlsRef.current) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    const startTime = performance.now();

    const animateTransition = (time: number) => {
      const elapsed = time - startTime;
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

  const handleSetCameraPreset = (preset: 'CAMPUS' | 'TOP_DOWN' | 'A4_ALL' | 'A4_RACK' | 'A4_FLOOR' | 'A2' | 'A5' | 'CY3') => {
    setActiveZoneFocus(preset);
    if (preset === 'TOP_DOWN') {
      setViewMode('TOP_VIEW');
    } else if (preset === 'CAMPUS') {
      setViewMode('3D_ISOMETRIC');
    }

    if (!cameraRef.current || !controlsRef.current) return;

    switch (preset) {
      case 'CAMPUS':
        // Overview 45 degree angle calibrated to fit the entire campus without clipping
        flyCameraTo(new THREE.Vector3(58, 68, 76), new THREE.Vector3(0, 0, 0));
        break;
      case 'TOP_DOWN':
        // 85° Overhead Blueprint - Perfect for Executives to see full master campus layout
        flyCameraTo(new THREE.Vector3(0, 115, 0.05), new THREE.Vector3(0, 0, 0));
        break;
      case 'A4_ALL':
        flyCameraTo(new THREE.Vector3(22, 34, 18), new THREE.Vector3(-2, 2, -4));
        break;
      case 'A4_RACK':
        flyCameraTo(new THREE.Vector3(12, 26, -14), new THREE.Vector3(8, 2, -18));
        break;
      case 'A4_FLOOR':
        flyCameraTo(new THREE.Vector3(6, 24, 22), new THREE.Vector3(-12, 1, 10));
        break;
      case 'A2':
        flyCameraTo(new THREE.Vector3(-32, 28, 26), new THREE.Vector3(-40, 1.5, -4));
        break;
      case 'A5':
        flyCameraTo(new THREE.Vector3(38, 30, 2), new THREE.Vector3(36, 2, -18));
        break;
      case 'CY3':
        flyCameraTo(new THREE.Vector3(38, 28, 38), new THREE.Vector3(36, 2, 18));
        break;
    }
  };

  // Helper texture generators for 3D signage in the campus
  const createSignTexture = (text: string, subText: string, bgColor: string, textColor = '#ffffff') => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);

    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(8, 8, 496, 144, 24);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(8, 8, 496, 144, 24);
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.font = 'bold 46px monospace, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 58);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(subText, 256, 114);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  };

  // Helper for Top-Down Ground Billboard Label
  const createGroundLabel = (text: string, subText: string, color: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 140;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.beginPath();
    ctx.roundRect(6, 6, 500, 128, 20);
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(6, 6, 500, 128, 20);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px monospace, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 52);

    ctx.fillStyle = color;
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(subText, 256, 102);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  };

  // =========================================================================
  // MAIN THREE.JS BUILD: BRIGHT STUDIO CAMPUS DIGITAL TWIN
  // =========================================================================
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight || 580;

    // 1. Scene Setup (Crisp Bright Studio matching other zones)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f8fafc');
    scene.fog = new THREE.FogExp2('#f8fafc', 0.005);
    sceneRef.current = scene;

    // 2. Camera Setup (Default: 85° Overhead Blueprint Top View)
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 1000);
    camera.position.set(0, 115, 0.05);
    cameraRef.current = camera;

    // 3. Renderer with PCF Shadows
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.minDistance = 15;
    controls.maxDistance = 200;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // 5. High-Fidelity Studio Daylighting Setup
    const ambientLight = new THREE.AmbientLight('#ffffff', 1.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight('#ffffff', 2.2);
    dirLight.position.set(60, 95, 60);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 280;
    const shadowBound = 80;
    dirLight.shadow.camera.left = -shadowBound;
    dirLight.shadow.camera.right = shadowBound;
    dirLight.shadow.camera.top = shadowBound;
    dirLight.shadow.camera.bottom = -shadowBound;
    dirLight.shadow.bias = -0.0003;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight('#e0f2fe', 0.85);
    fillLight.position.set(-50, 40, -40);
    scene.add(fillLight);

    // 6. Master Campus Concrete Slab (Bright Industrial Epoxy Slab #e2e8f0)
    const groundGeo = new THREE.BoxGeometry(152, 0.6, 130);
    const groundMat = new THREE.MeshStandardMaterial({ 
      color: '#e2e8f0', 
      roughness: 0.6, 
      metalness: 0.1 
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = -0.3;
    ground.receiveShadow = true;
    scene.add(ground);

    // Campus Floor Grid
    const grid = new THREE.GridHelper(150, 60, '#94a3b8', '#cbd5e1');
    grid.position.y = 0.01;
    scene.add(grid);

    // 7. Campus Logistics Arterial Roads (Connecting A2, A4, A5, CY3)
    const roadMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.85, metalness: 0.05 });
    const lineYellowMat = new THREE.MeshBasicMaterial({ color: '#eab308' });
    const lineWhiteMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });

    // East-West Central Avenue
    const mainAvenue = new THREE.Mesh(new THREE.PlaneGeometry(140, 6.0), roadMat);
    mainAvenue.rotation.x = -Math.PI / 2;
    mainAvenue.position.set(0, 0.02, 34);
    mainAvenue.receiveShadow = true;
    scene.add(mainAvenue);

    // North-South Avenue between A4 and A5/CY3 (X = 18)
    const crossAvenue = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 96), roadMat);
    crossAvenue.rotation.x = -Math.PI / 2;
    crossAvenue.position.set(18, 0.02, 0);
    crossAvenue.receiveShadow = true;
    scene.add(crossAvenue);

    // North-South Avenue between A2 and A4 (X = -22)
    const westAvenue = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 96), roadMat);
    westAvenue.rotation.x = -Math.PI / 2;
    westAvenue.position.set(-22, 0.02, 0);
    westAvenue.receiveShadow = true;
    scene.add(westAvenue);

    // Yellow Dashed Stripes on Avenues
    [-22, 18].forEach(rx => {
      for (let z = -44; z <= 44; z += 6) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 3.5), lineYellowMat);
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(rx, 0.03, z);
        scene.add(dash);
      }
    });

    // Zebra Crosswalks
    const createCrosswalk = (cx: number, cz: number, isVertical = false) => {
      const cwGroup = new THREE.Group();
      cwGroup.position.set(cx, 0.035, cz);
      for (let i = -3; i <= 3; i++) {
        const stripe = new THREE.Mesh(
          new THREE.PlaneGeometry(isVertical ? 4.5 : 0.6, isVertical ? 0.6 : 4.5),
          lineWhiteMat
        );
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(isVertical ? 0 : i * 0.9, 0, isVertical ? i * 0.9 : 0);
        cwGroup.add(stripe);
      }
      scene.add(cwGroup);
    };

    createCrosswalk(18, 26, false);
    createCrosswalk(-22, 26, false);
    createCrosswalk(0, 34, true);

    // Interactive Meshes Array
    const interactiveObjects: { 
      mesh: THREE.Object3D; 
      name: string; 
      zone: string; 
      desc: string; 
      count?: number; 
      cap?: number;
      pct?: number;
      targetTab?: 'A4_FLOOR' | 'A4_RACK' | 'A2_RAIL' | 'A5_TENT' | 'CY3_TENT';
      item?: InventoryItem 
    }[] = [];

    // Shared Palette Materials (Vibrant Industrial Colors)
    const rackBlue = new THREE.MeshStandardMaterial({ color: '#1d4ed8', roughness: 0.3, metalness: 0.7 });
    const beamOrange = new THREE.MeshStandardMaterial({ color: '#ea580c', roughness: 0.35, metalness: 0.5 });
    const palletWood = new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.8 });
    const boxOccupied = new THREE.MeshStandardMaterial({ color: '#2563eb', roughness: 0.4 });
    const boxAging = new THREE.MeshStandardMaterial({ color: '#d97706', roughness: 0.4 });
    const boxOverdue = new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.4 });
    const steelDark = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.5, metalness: 0.8 });
    const lineYellow = new THREE.MeshBasicMaterial({ color: '#eab308' });

    // Helper: Pallet with Box Stack
    const createPalletWithBox = (status: 'OCCUPIED' | 'AGING' | 'OVERDUE' = 'OCCUPIED', scale = 1.0) => {
      const grp = new THREE.Group();
      // Wooden base
      const p = new THREE.Mesh(new THREE.BoxGeometry(1.2 * scale, 0.12 * scale, 1.0 * scale), palletWood);
      p.position.y = (0.06 * scale);
      p.castShadow = true;
      grp.add(p);
      // Box
      const mat = status === 'OVERDUE' ? boxOverdue : status === 'AGING' ? boxAging : boxOccupied;
      const b = new THREE.Mesh(new THREE.BoxGeometry(1.15 * scale, 0.85 * scale, 0.95 * scale), mat);
      b.position.y = (0.55 * scale);
      b.castShadow = true;
      grp.add(b);
      return grp;
    };

    // =========================================================================
    // 🏢 FACILITY 1: A4 WAREHOUSE (DA4D-1 Floor Staging + DA4D-2/3 Selective Racks)
    // Exactly matches Image 1 (Floor staging X1-X8 left, Racks B-K right)
    // =========================================================================
    const a4Group = new THREE.Group();
    a4Group.position.set(-2, 0, -4);

    // Floor Slab with Safety Blue Perimeter
    const a4Floor = new THREE.Mesh(
      new THREE.BoxGeometry(36, 0.3, 56),
      new THREE.MeshStandardMaterial({ color: '#f1f5f9', roughness: 0.5, metalness: 0.1 })
    );
    a4Floor.position.y = 0.15;
    a4Floor.receiveShadow = true;
    a4Group.add(a4Floor);

    // Building Boundary Outline
    const a4Border = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(36, 0.32, 56)),
      new THREE.LineBasicMaterial({ color: '#2563eb', linewidth: 2 })
    );
    a4Border.position.y = 0.16;
    a4Group.add(a4Border);

    // Structural Pillars
    [-17.5, 17.5].forEach(px => {
      [-26, -13, 0, 13, 26].forEach(pz => {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 8.5, 0.5), steelDark);
        pillar.position.set(px, 4.25, pz);
        pillar.castShadow = true;
        a4Group.add(pillar);
      });
    });

    // 1A. A4 Floor Staging (Left side: X = -11, Z from -22 to +22)
    // 8 Groups (X1 to X8) matching real Image 1
    for (let g = 1; g <= 8; g++) {
      const gz = -21 + (g - 1) * 6.0;
      const isTopGroup = g >= 5; // X5 to X8 (12 cols) vs X1 to X4 (7 cols)
      const groupWidth = isTopGroup ? 11.5 : 8.5;
      const posX = isTopGroup ? -10.2 : -11.5;

      const zoneBox = new THREE.Mesh(
        new THREE.PlaneGeometry(groupWidth, 4.8),
        new THREE.MeshBasicMaterial({ color: '#fef3c7', transparent: true, opacity: 0.28 })
      );
      zoneBox.rotation.x = -Math.PI / 2;
      zoneBox.position.set(posX, 0.32, gz);
      a4Group.add(zoneBox);

      // Yellow outline
      const zoneLine = new THREE.Mesh(new THREE.PlaneGeometry(groupWidth + 0.2, 0.12), lineYellow);
      zoneLine.rotation.x = -Math.PI / 2;
      zoneLine.position.set(posX, 0.33, gz - 2.4);
      a4Group.add(zoneLine);

      // Pallets inside floor staging
      const numCols = isTopGroup ? 5 : 3;
      for (let c = 0; c < numCols; c++) {
        const px = posX - (groupWidth / 2) + 1.2 + c * 2.2;
        const pal = createPalletWithBox(g === 3 ? 'AGING' : g === 7 ? 'OVERDUE' : 'OCCUPIED', 0.82);
        pal.position.set(px, 0.32, gz);
        a4Group.add(pal);
      }
    }

    // 1B. A4 Selective Racks (Right side: Rows B to K, X = 2 to 16)
    // Rows B-F (12 bays long) + Rows G-K (5 bays long) matching real Selective Racks layout in Image 1
    const rackRows = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
    rackRows.forEach((rowName, rIdx) => {
      const rx = 1.8 + rIdx * 1.45;
      const isShortRow = ['G', 'H', 'I', 'J', 'K'].includes(rowName);
      const numBays = isShortRow ? 5 : 12;

      for (let b = 0; b < numBays; b++) {
        const rz = -23 + b * 3.8;
        // Upright post along Z
        const upright = new THREE.Mesh(new THREE.BoxGeometry(0.12, 5.8, 1.1), rackBlue);
        upright.position.set(rx, 3.05, rz);
        upright.castShadow = true;
        a4Group.add(upright);

        // Orange shelf beams (4 tiers) along Z
        for (let lvl = 1; lvl <= 4; lvl++) {
          const ly = lvl * 1.35;
          const beam = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 3.6), beamOrange);
          beam.position.set(rx + 0.45, ly, rz + 1.8);
          a4Group.add(beam);

          // Pallets on shelves (realistic distribution)
          if ((rIdx + b + lvl) % 3 === 0) {
            const pal = createPalletWithBox(lvl === 4 ? 'AGING' : 'OCCUPIED', 0.65);
            pal.position.set(rx, ly + 0.05, rz + 1.2);
            a4Group.add(pal);
          }
        }
      }
    });

    // 1C. 3D Signboard for A4
    const a4SignTex = createSignTexture('อาคาร A4 • WAREHOUSE', 'Selective Rack (680P) + วางพื้น X1-X8 (432P)', '#1d4ed8');
    const a4Sign = new THREE.Mesh(new THREE.PlaneGeometry(13, 3.8), new THREE.MeshBasicMaterial({ map: a4SignTex, transparent: true }));
    a4Sign.position.set(-2, 10.5, -31);
    scene.add(a4Sign);

    // Top-down ground label
    const a4TopTex = createGroundLabel('A4 WAREHOUSE (1,112 PL)', 'Rack B-K (680P) + Staging X1-X8 (432P)', '#38bdf8');
    const a4TopLabel = new THREE.Mesh(new THREE.PlaneGeometry(18, 5.0), new THREE.MeshBasicMaterial({ map: a4TopTex, transparent: true }));
    a4TopLabel.rotation.x = -Math.PI / 2;
    a4TopLabel.position.set(-2, 0.38, 27);
    scene.add(a4TopLabel);

    // Interactive Hitbox for A4
    const a4Hitbox = new THREE.Mesh(new THREE.BoxGeometry(36, 12, 56), new THREE.MeshBasicMaterial({ visible: false }));
    a4Hitbox.position.set(-2, 6, -4);
    scene.add(a4Hitbox);
    interactiveObjects.push({
      mesh: a4Hitbox,
      name: 'อาคาร A4 WAREHOUSE TWIN',
      zone: 'DA4D-1, 2, 3',
      desc: 'แร็ค 4 ชั้น แถว B–K (680P) + ลานวางพื้น X1–X8 รูปตัว L (432P)',
      count: metrics.a4Rack.occupied + metrics.a4Floor.occupied,
      cap: 1112,
      pct: Math.round(((metrics.a4Rack.occupied + metrics.a4Floor.occupied) / 1112) * 100),
      targetTab: 'A4_RACK'
    });

    scene.add(a4Group);

    // =========================================================================
    // 🚚 FACILITY 2: A2 FLOW RAIL (DA2D-1 Continuous Gravity Flow Rail)
    // 16 horizontal rails R16 top to R01 bottom (128 PL)
    // =========================================================================
    const a2Group = new THREE.Group();
    a2Group.position.set(-40, 0, -4);

    // A2 Floor Slab
    const a2Floor = new THREE.Mesh(
      new THREE.BoxGeometry(24, 0.3, 48),
      new THREE.MeshStandardMaterial({ color: '#f1f5f9', roughness: 0.5, metalness: 0.1 })
    );
    a2Floor.position.y = 0.15;
    a2Floor.receiveShadow = true;
    a2Group.add(a2Floor);

    const a2Border = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(24, 0.32, 48)),
      new THREE.LineBasicMaterial({ color: '#059669', linewidth: 2 })
    );
    a2Border.position.y = 0.16;
    a2Group.add(a2Border);

    // Left Outfeed Yellow Apron Stripe
    const outfeedApron = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 46), new THREE.MeshBasicMaterial({ color: '#fef08a' }));
    outfeedApron.rotation.x = -Math.PI / 2;
    outfeedApron.position.set(-9.8, 0.32, 0);
    a2Group.add(outfeedApron);

    // Right Infeed Green Apron Stripe
    const infeedApron = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 46), new THREE.MeshBasicMaterial({ color: '#a7f3d0' }));
    infeedApron.rotation.x = -Math.PI / 2;
    infeedApron.position.set(9.8, 0.32, 0);
    a2Group.add(infeedApron);

    // 16 Rails (R16 at top Z = -20 down to R01 at bottom Z = +20)
    for (let r = 1; r <= 16; r++) {
      const rz = -20 + (r - 1) * 2.65;
      // Rail frame
      const railSteel = new THREE.Mesh(new THREE.BoxGeometry(17.5, 0.25, 1.8), steelDark);
      railSteel.position.set(0, 0.8, rz);
      railSteel.rotation.z = 0.04; // Slope down to Outfeed on left (-X)
      a2Group.add(railSteel);

      // Skate Rollers line
      for (let ro = 0; ro < 12; ro++) {
        const roller = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.04, 1.6, 8),
          new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.8 })
        );
        roller.rotation.x = Math.PI / 2;
        roller.position.set(-7.5 + ro * 1.35, 0.95 - ro * 0.03, rz);
        a2Group.add(roller);
      }

      // Outfeed Yellow Hazard Stopper (Left -X)
      const stopper = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.6, 1.9), lineYellow);
      stopper.position.set(-8.9, 0.9, rz);
      a2Group.add(stopper);

      // Pallets on Rails
      if (r % 2 === 0 || r === 5 || r === 11 || r === 15) {
        const pal = createPalletWithBox(r === 6 ? 'AGING' : 'OCCUPIED', 0.8);
        pal.position.set(-6.5 + (r % 4) * 2.8, 0.95, rz);
        a2Group.add(pal);
      }
    }

    // A2 Signboard
    const a2SignTex = createSignTexture('อาคาร A2 • FLOW RAIL', '16 Continuous Gravity Rails (128 PL)', '#059669');
    const a2Sign = new THREE.Mesh(new THREE.PlaneGeometry(11, 3.4), new THREE.MeshBasicMaterial({ map: a2SignTex, transparent: true }));
    a2Sign.position.set(-40, 9.5, -27);
    scene.add(a2Sign);

    // Top-down ground label
    const a2TopTex = createGroundLabel('A2 FLOW RAIL (128 PL)', '16 Gravity Rails (R01-R16)', '#34d399');
    const a2TopLabel = new THREE.Mesh(new THREE.PlaneGeometry(14, 4.2), new THREE.MeshBasicMaterial({ map: a2TopTex, transparent: true }));
    a2TopLabel.rotation.x = -Math.PI / 2;
    a2TopLabel.position.set(-40, 0.38, 23);
    scene.add(a2TopLabel);

    const a2Hitbox = new THREE.Mesh(new THREE.BoxGeometry(24, 10, 48), new THREE.MeshBasicMaterial({ visible: false }));
    a2Hitbox.position.set(-40, 5, -4);
    scene.add(a2Hitbox);
    interactiveObjects.push({
      mesh: a2Hitbox,
      name: 'อาคาร A2 FLOW RAIL 3D',
      zone: 'DA2D-1 (R1–R16)',
      desc: 'รางเลื่อนแรงโน้มถ่วง 16 ราง ส่งตรงไลน์ผลิต HE (128 พาเลท)',
      count: metrics.a2.occupied,
      cap: 128,
      pct: metrics.a2.pct,
      targetTab: 'A2_RAIL'
    });

    scene.add(a2Group);

    // =========================================================================
    // 🎪 FACILITY 3: A5 CANOPY TENTS (DAST 1–4 Canopy Tents)
    // Exactly matches Image 4 (Tent 2 top-left, Tent 4 top-right, Tent 1 bot-left, Tent 3 bot-right)
    // =========================================================================
    const a5Group = new THREE.Group();
    a5Group.position.set(36, 0, -18);

    // 4 Canopy Tents Layout: Tent 2 (top-left), Tent 4 (top-right), Tent 1 (bot-left), Tent 3 (bot-right)
    const tentPositions = [
      { id: 2, x: -9, z: -7, label: 'เต็นท์ผ้าใบ 2' },
      { id: 4, x: 9, z: -7, label: 'เต็นท์ผ้าใบ 4' },
      { id: 1, x: -9, z: 7, label: 'เต็นท์ผ้าใบ 1' },
      { id: 3, x: 9, z: 7, label: 'เต็นท์ผ้าใบ 3' },
    ];

    // Center Cross Yellow Forklift Aisle Lines (Matching Image 4)
    const crossLineH = new THREE.Mesh(new THREE.PlaneGeometry(36, 0.18), lineYellow);
    crossLineH.rotation.x = -Math.PI / 2;
    crossLineH.position.set(0, 0.22, 0);
    a5Group.add(crossLineH);

    const crossLineV = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 28), lineYellow);
    crossLineV.rotation.x = -Math.PI / 2;
    crossLineV.position.set(0, 0.22, 0);
    a5Group.add(crossLineV);

    tentPositions.forEach(tPos => {
      // Tent Foundation Slab with Red Outline
      const tSlab = new THREE.Mesh(
        new THREE.BoxGeometry(16, 0.2, 11),
        new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.6 })
      );
      tSlab.position.set(tPos.x, 0.1, tPos.z);
      tSlab.receiveShadow = true;
      a5Group.add(tSlab);

      const redBorder = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(16.1, 0.22, 11.1)),
        new THREE.LineBasicMaterial({ color: '#dc2626', linewidth: 2 })
      );
      redBorder.position.set(tPos.x, 0.12, tPos.z);
      a5Group.add(redBorder);

      // Yellow Internal Staging Slots (7 Groups G1-G7 matching Image 4)
      for (let g = 0; g < 7; g++) {
        const gx = tPos.x - 6.0 + g * 2.0;
        const slotGrid = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.PlaneGeometry(1.7, 9.2)),
          new THREE.LineBasicMaterial({ color: '#eab308' })
        );
        slotGrid.rotation.x = -Math.PI / 2;
        slotGrid.position.set(gx, 0.22, tPos.z);
        a5Group.add(slotGrid);
      }

      // Translucent White Canopy Fabric Roof (Crisp visual representation in both 3D & Top View)
      const roofGeom = new THREE.CylinderGeometry(5.2, 5.2, 15.6, 16, 1, false, 0, Math.PI);
      const roofMat = new THREE.MeshStandardMaterial({
        color: '#f8fafc',
        roughness: 0.3,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide
      });
      const roof = new THREE.Mesh(roofGeom, roofMat);
      roof.rotation.z = Math.PI / 2;
      roof.position.set(tPos.x, 0.2, tPos.z);
      a5Group.add(roof);

      // Steel Arch Truss Ribs
      for (let arc = 0; arc < 5; arc++) {
        const ax = tPos.x - 6.5 + arc * 3.25;
        const arch = new THREE.Mesh(
          new THREE.TorusGeometry(5.2, 0.08, 8, 16, Math.PI),
          steelDark
        );
        arch.position.set(ax, 0.2, tPos.z);
        a5Group.add(arch);
      }

      // Pallets inside tents
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 4; col++) {
          if ((tPos.id + row + col) % 2 === 0) {
            const pal = createPalletWithBox(col === 3 ? 'AGING' : 'OCCUPIED', 0.75);
            pal.position.set(tPos.x - 4.5 + col * 3.0, 0.22, tPos.z - 2.5 + row * 5.0);
            a5Group.add(pal);
          }
        }
      }
    });

    // A5 Signboard
    const a5SignTex = createSignTexture('ลาน A5 • CANOPY TENTS', 'เต็นท์ผ้าใบโมดูลาร์ 4 หลัง (784 PL)', '#7c3aed');
    const a5Sign = new THREE.Mesh(new THREE.PlaneGeometry(11, 3.4), new THREE.MeshBasicMaterial({ map: a5SignTex, transparent: true }));
    a5Sign.position.set(36, 8.5, -28);
    scene.add(a5Sign);

    // Top-down ground label
    const a5TopTex = createGroundLabel('A5 CANOPY TENTS (784 PL)', 'DAST 1–4 (Modular Canopy Tents)', '#a855f7');
    const a5TopLabel = new THREE.Mesh(new THREE.PlaneGeometry(14, 4.2), new THREE.MeshBasicMaterial({ map: a5TopTex, transparent: true }));
    a5TopLabel.rotation.x = -Math.PI / 2;
    a5TopLabel.position.set(36, 0.38, -4);
    scene.add(a5TopLabel);

    const a5Hitbox = new THREE.Mesh(new THREE.BoxGeometry(36, 9, 28), new THREE.MeshBasicMaterial({ visible: false }));
    a5Hitbox.position.set(36, 4.5, -18);
    scene.add(a5Hitbox);
    interactiveObjects.push({
      mesh: a5Hitbox,
      name: 'ลาน A5 CANOPY TENTS 3D',
      zone: 'DAST 1–4',
      desc: 'เต็นท์โมดูลาร์ผ้าใบ 4 หลัง สเตจจิ้งภายนอกอาคาร (784 พาเลท)',
      count: metrics.a5.occupied,
      cap: 784,
      pct: metrics.a5.pct,
      targetTab: 'A5_TENT'
    });

    scene.add(a5Group);

    // =========================================================================
    // 🏗️ FACILITY 4: CY3 OUTDOOR HEAVY-DUTY RACKS (DY3T 1.01–1.04)
    // Exactly matches Image 5 (4 horizontal rows: Row A, Row B, Center Forklift Road, Row C, Row D)
    // =========================================================================
    const cy3Group = new THREE.Group();
    cy3Group.position.set(36, 0, 18);

    // CY3 Ground Slab
    const cy3Floor = new THREE.Mesh(
      new THREE.BoxGeometry(36, 0.3, 28),
      new THREE.MeshStandardMaterial({ color: '#f1f5f9', roughness: 0.7, metalness: 0.1 })
    );
    cy3Floor.position.y = 0.15;
    cy3Floor.receiveShadow = true;
    cy3Group.add(cy3Floor);

    // Central Forklift Road between Row B and Row C (Z = 0) with Yellow Stripes (Matching Image 5)
    const cy3Road = new THREE.Mesh(new THREE.PlaneGeometry(35, 4.2), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }));
    cy3Road.rotation.x = -Math.PI / 2;
    cy3Road.position.set(0, 0.31, 0);
    cy3Group.add(cy3Road);

    [-2.1, 2.1].forEach(rz => {
      const roadLine = new THREE.Mesh(new THREE.PlaneGeometry(35, 0.15), lineYellow);
      roadLine.rotation.x = -Math.PI / 2;
      roadLine.position.set(0, 0.32, rz);
      cy3Group.add(roadLine);
    });

    // 4 Heavy-Duty Rack Rows (Row A, Row B, Row C, Row D) along X axis matching CY3OutdoorRack3DView & Image 5
    const cy3Rows = [
      { code: 'A', z: -8.8, name: 'แถว A' },
      { code: 'B', z: -3.8, name: 'แถว B' },
      { code: 'C', z: 3.8, name: 'แถว C' },
      { code: 'D', z: 8.8, name: 'แถว D' }
    ];

    cy3Rows.forEach(row => {
      for (let b = 0; b < 12; b++) {
        const bx = -15 + b * 2.75;
        // Upright post along X
        const upright = new THREE.Mesh(new THREE.BoxGeometry(0.14, 5.2, 1.1), rackBlue);
        upright.position.set(bx, 2.75, row.z);
        upright.castShadow = true;
        cy3Group.add(upright);

        // 4 Levels of Orange Load Beams along X
        for (let lvl = 1; lvl <= 4; lvl++) {
          const ly = lvl * 1.25;
          const beam = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.08, 0.08), beamOrange);
          beam.position.set(bx + 1.35, ly, row.z);
          cy3Group.add(beam);

          if ((b + lvl) % 3 === 0) {
            const pal = createPalletWithBox(lvl === 3 ? 'AGING' : 'OCCUPIED', 0.65);
            pal.position.set(bx + 1.35, ly + 0.05, row.z);
            cy3Group.add(pal);
          }
        }
      }
    });

    // CY3 Signboard
    const cy3SignTex = createSignTexture('ลาน CY3 • OUTDOOR RACK', 'แร็ค 4 ชั้นกลางแจ้ง แถว A-D (400 PL)', '#c2410c');
    const cy3Sign = new THREE.Mesh(new THREE.PlaneGeometry(11, 3.4), new THREE.MeshBasicMaterial({ map: cy3SignTex, transparent: true }));
    cy3Sign.position.set(36, 8.5, 34);
    scene.add(cy3Sign);

    // Top-down ground label
    const cy3TopTex = createGroundLabel('CY3 OUTDOOR RACKS (400 PL)', 'DY3T 1.01–1.04 (4-Floor Heavy Duty)', '#fb923c');
    const cy3TopLabel = new THREE.Mesh(new THREE.PlaneGeometry(14, 4.2), new THREE.MeshBasicMaterial({ map: cy3TopTex, transparent: true }));
    cy3TopLabel.rotation.x = -Math.PI / 2;
    cy3TopLabel.position.set(36, 0.38, 4);
    scene.add(cy3TopLabel);

    const cy3Hitbox = new THREE.Mesh(new THREE.BoxGeometry(36, 9, 28), new THREE.MeshBasicMaterial({ visible: false }));
    cy3Hitbox.position.set(36, 4.5, 18);
    scene.add(cy3Hitbox);
    interactiveObjects.push({
      mesh: cy3Hitbox,
      name: 'ลาน CY3 OUTDOOR RACK 3D',
      zone: 'DY3T (Row A–D)',
      desc: 'แร็คกลางแจ้ง Heavy-Duty 4 ชั้น 4 แถว (400 พาเลท)',
      count: metrics.cy3.occupied,
      cap: 400,
      pct: metrics.cy3.pct,
      targetTab: 'CY3_TENT'
    });

    scene.add(cy3Group);

    // =========================================================================
    // 🚜 REALISTIC FORKLIFTS ACROSS CAMPUS
    // =========================================================================
    const fk1 = createRealisticForklift(-2, 0.3, 16, Math.PI / 2, 0.95);
    const fk2 = createRealisticForklift(18, 0.0, 8, -Math.PI / 2, 0.95);
    const fk3 = createRealisticForklift(-22, 0.0, -10, Math.PI, 0.95);
    const fk4 = createRealisticForklift(36, 0.0, 0, 0, 0.95);
    scene.add(fk1, fk2, fk3, fk4);

    // =========================================================================
    // 3D HOLOGRAPHIC GHOST & NEON HIGHLIGHT SYSTEM
    // =========================================================================
    const hologramGhost = createHologramGhostTarget(16, 8, 16);
    scene.add(hologramGhost.group);

    const rackBayNeon = createRackBayNeonHighlight();
    scene.add(rackBayNeon.group);

    let currentEmissiveRestore: (() => void) | null = null;

    // Raycaster for Hover & Click Interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerMove = (e: MouseEvent) => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshes = interactiveObjects.map(o => o.mesh);
      const intersects = raycaster.intersectObjects(meshes, false);

      if (intersects.length > 0) {
        const hit = interactiveObjects.find(o => o.mesh === intersects[0].object);
        if (hit) {
          if (currentEmissiveRestore) {
            currentEmissiveRestore();
            currentEmissiveRestore = null;
          }
          currentEmissiveRestore = applyFaintEmissiveHighlight(hit.mesh, true);

          setHoveredObject({
            name: hit.name,
            zone: hit.zone,
            desc: hit.desc,
            count: hit.count,
            cap: hit.cap,
            pct: hit.pct,
            targetTab: hit.targetTab
          });
          container.style.cursor = 'pointer';
          return;
        }
      }

      if (currentEmissiveRestore) {
        currentEmissiveRestore();
        currentEmissiveRestore = null;
      }
      setHoveredObject(null);
      container.style.cursor = 'default';
    };

    const onPointerClick = (e: MouseEvent) => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshes = interactiveObjects.map(o => o.mesh);
      const intersects = raycaster.intersectObjects(meshes, false);

      if (intersects.length > 0) {
        const hit = interactiveObjects.find(o => o.mesh === intersects[0].object);
        if (hit && hit.targetTab) {
          onNavigateToZone(hit.targetTab);
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

      if (isAutoRotate) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 1.6;
      } else {
        controls.autoRotate = false;
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize Handler with ResizeObserver
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight || 580;
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
      renderer.dispose();
      container.innerHTML = '';
    };
  }, [items, isAutoRotate]);

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col min-h-0 space-y-1.5 font-sans text-slate-100">
      
      {/* 1. TOP TOOLBAR: UNIFIED CAMPUS 3D CONTROLS */}
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl p-2 sm:p-2.5 shadow-lg flex flex-wrap items-center justify-between gap-2">
        
        {/* Left Branding & Capacity */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                <span>ผังรวม 3D CAMPUS TWIN</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/40 font-mono font-bold">
                  2,408 PL
                </span>
              </h2>
            </div>
            <p className="text-[10.5px] text-slate-400 hidden sm:block">
              ผังแม่บท 4 โซนเสมือนจริงตามสัดส่วน Blueprint (A2 Flow Rail • A4 Warehouse • A5 Tent • CY3 Rack)
            </p>
          </div>
        </div>

        {/* Center Live Metrics */}
        <div className="hidden xl:flex items-center gap-2 text-xs">
          <div className="bg-slate-950/80 border border-blue-500/30 px-2.5 py-1 rounded-xl flex items-center gap-1.5">
            <Boxes className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-400">จัดเก็บรวม:</span>
            <span className="font-mono font-bold text-blue-400">{metrics.totalOccupied}/{metrics.totalCapacity} P ({metrics.occupancyRate}%)</span>
          </div>

          <div className="bg-slate-950/80 border border-emerald-500/30 px-2.5 py-1 rounded-xl flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">พื้นที่ว่าง:</span>
            <span className="font-mono font-bold text-emerald-400">{metrics.totalFree} ช่อง</span>
          </div>

          <div className="bg-slate-950/80 border border-amber-500/30 px-2.5 py-1 rounded-xl flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">Aging:</span>
            <span className="font-mono font-bold text-amber-400">{metrics.totalAgingAll.totalAging} พาเลท</span>
          </div>
        </div>

        {/* Right Actions & Main Mode Selector */}
        <div className="flex items-center gap-1.5">
          {/* Main Mode Segment: Top View (Default) vs 3D Isometric vs Table Detail */}
          <div className="inline-flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-700 h-8">
            <button
              onClick={() => handleSetCameraPreset('TOP_DOWN')}
              className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'TOP_VIEW' ? 'bg-indigo-600 text-white font-black shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
              title="มุมมองแปลนบน Top View (85°) สำหรับผู้บริหาร"
            >
              <Grid className="w-3.5 h-3.5 text-cyan-300" />
              <span>แปลนบน (Top View)</span>
            </button>

            <button
              onClick={() => handleSetCameraPreset('CAMPUS')}
              className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === '3D_ISOMETRIC' ? 'bg-blue-600 text-white font-black shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
              title="มุมมองสามมิติ 3D Isometric (45°)"
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D ผัง 3 มิติ</span>
            </button>

            <button
              onClick={() => setShowTableModal(!showTableModal)}
              className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                showTableModal ? 'bg-amber-600 text-white font-black shadow-xs' : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title="เปิดตารางสรุปความจุ & Aging ทุกโซน"
            >
              <TableProperties className="w-3.5 h-3.5 text-amber-300" />
              <span>ตารางสรุปบริหาร</span>
            </button>
          </div>

          <button
            onClick={() => setIsAutoRotate(!isAutoRotate)}
            className={`h-8 px-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 shadow-sm ${
              isAutoRotate ? 'bg-blue-600 text-white border-blue-400' : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
            title="หมุนมุมมอง 360° อัตโนมัติ"
          >
            {isAutoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">360°</span>
          </button>

          <button
            onClick={() => handleSetCameraPreset('CAMPUS')}
            className="h-8 w-8 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all shadow-sm shrink-0"
            title="รีเซ็ตมุมมองผังรวม"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="h-8 w-8 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all shadow-sm shrink-0"
            title="ขยายเต็มจอ"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. 3D VIEWPORT CONTAINER */}
      <div className="relative w-full flex-1 min-h-[360px] bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        
        {/* Top Left: Zone Quick Navigation Bar */}
        <div className="absolute top-3 left-3 z-20 flex flex-wrap gap-1.5 max-w-[55%] pointer-events-auto">
          <button
            onClick={() => handleSetCameraPreset('CAMPUS')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shadow-md ${
              activeZoneFocus === 'CAMPUS' ? 'bg-blue-600 text-white border-blue-400 font-black' : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-blue-400" />
            <span>รวมแคมปัส</span>
          </button>

          <button
            onClick={() => onNavigateToZone('A4_RACK')}
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900/90 hover:bg-blue-900/80 border border-blue-500/50 text-white shadow-md flex items-center gap-1.5 transition-all group"
            title="คลิกเข้าสู่ 3D A4 Selective Racks"
          >
            <span className="w-2 h-2 rounded-full bg-blue-400 group-hover:scale-125 transition-transform" />
            <span>A4 แร็ค:</span>
            <span className="font-mono text-blue-300 font-black">{metrics.a4Rack.occupied}/{metrics.a4Rack.cap}P</span>
          </button>

          <button
            onClick={() => onNavigateToZone('A4_FLOOR')}
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900/90 hover:bg-amber-900/80 border border-amber-500/50 text-white shadow-md flex items-center gap-1.5 transition-all group"
            title="คลิกเข้าสู่ 3D A4 Floor Staging"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 group-hover:scale-125 transition-transform" />
            <span>A4 วางพื้น:</span>
            <span className="font-mono text-amber-300 font-black">{metrics.a4Floor.occupied}/{metrics.a4Floor.cap}P</span>
          </button>

          <button
            onClick={() => onNavigateToZone('A2_RAIL')}
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900/90 hover:bg-emerald-900/80 border border-emerald-500/50 text-white shadow-md flex items-center gap-1.5 transition-all group"
            title="คลิกเข้าสู่ 3D A2 Flow Rail"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 group-hover:scale-125 transition-transform" />
            <span>A2 รางเลื่อน:</span>
            <span className="font-mono text-emerald-300 font-black">{metrics.a2.occupied}/{metrics.a2.cap}P</span>
          </button>

          <button
            onClick={() => onNavigateToZone('A5_TENT')}
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900/90 hover:bg-purple-900/80 border border-purple-500/50 text-white shadow-md flex items-center gap-1.5 transition-all group"
            title="คลิกเข้าสู่ 3D A5 Canopy Tents"
          >
            <span className="w-2 h-2 rounded-full bg-purple-400 group-hover:scale-125 transition-transform" />
            <span>A5 เต็นท์:</span>
            <span className="font-mono text-purple-300 font-black">{metrics.a5.occupied}/{metrics.a5.cap}P</span>
          </button>

          <button
            onClick={() => onNavigateToZone('CY3_TENT')}
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900/90 hover:bg-orange-900/80 border border-orange-500/50 text-white shadow-md flex items-center gap-1.5 transition-all group"
            title="คลิกเข้าสู่ 3D CY3 Outdoor Heavy Racks"
          >
            <span className="w-2 h-2 rounded-full bg-orange-400 group-hover:scale-125 transition-transform" />
            <span>CY3 แร็คกลางแจ้ง:</span>
            <span className="font-mono text-orange-300 font-black">{metrics.cy3.occupied}/{metrics.cy3.cap}P</span>
          </button>
        </div>

        {/* Top Right: Quick Zone Focus Presets */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-1 shadow-lg overflow-x-auto max-w-full">
          <span className="text-[10px] font-bold text-slate-400 px-1.5 hidden sm:inline">โฟกัส:</span>
          <button
            onClick={() => handleSetCameraPreset('A4_ALL')}
            className={`px-2 py-1 rounded text-xs font-bold transition-all ${
              activeZoneFocus === 'A4_ALL' ? 'bg-blue-600 text-white font-black' : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            A4
          </button>

          <button
            onClick={() => handleSetCameraPreset('A2')}
            className={`px-2 py-1 rounded text-xs font-bold transition-all ${
              activeZoneFocus === 'A2' ? 'bg-emerald-600 text-white font-black' : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            A2
          </button>

          <button
            onClick={() => handleSetCameraPreset('A5')}
            className={`px-2 py-1 rounded text-xs font-bold transition-all ${
              activeZoneFocus === 'A5' ? 'bg-purple-600 text-white font-black' : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            A5
          </button>

          <button
            onClick={() => handleSetCameraPreset('CY3')}
            className={`px-2 py-1 rounded text-xs font-bold transition-all ${
              activeZoneFocus === 'CY3' ? 'bg-orange-600 text-white font-black' : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            CY3
          </button>
        </div>

        {/* 3D WebGL Canvas Mount */}
        <div ref={mountRef} className="w-full flex-1 h-full min-h-[300px] cursor-grab active:cursor-grabbing" />

        {/* Hovered Zone Interactive HUD Card */}
        {hoveredObject && (
          <div className="absolute bottom-4 left-4 bg-slate-900/95 backdrop-blur-md border border-cyan-500/60 rounded-2xl p-3.5 shadow-2xl z-30 max-w-sm pointer-events-auto animate-fadeIn">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                <h4 className="text-xs font-black text-white truncate">{hoveredObject.name}</h4>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">
                {hoveredObject.zone}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mb-2">{hoveredObject.desc}</p>
            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
              <span className="text-slate-400">จัดเก็บ: <b className="text-white">{hoveredObject.count}/{hoveredObject.cap} P ({hoveredObject.pct}%)</b></span>
              {hoveredObject.targetTab && (
                <button
                  onClick={() => onNavigateToZone(hoveredObject.targetTab!)}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-all"
                >
                  <span>เปิด 3D โซนนี้</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* EXECUTIVE SUMMARY TABLE OVERLAY (Full Details Modal / Popover) */}
        {showTableModal && (
          <div className="absolute inset-x-2 inset-y-2 sm:inset-x-4 sm:inset-y-4 bg-slate-950/95 backdrop-blur-lg border border-slate-700/90 rounded-2xl shadow-2xl z-40 flex flex-col overflow-hidden animate-fadeIn text-slate-100">
            {/* Modal Header */}
            <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <TableProperties className="w-4 h-4 text-amber-400" />
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <span>ตารางสรุปขีดความสามารถ ความจุรวม &amp; สถานะ Aging ทุกโซน (Executive Master Dashboard)</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40">
                      2,424 PL
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    สรุปจำนวนพาเลทจัดเก็บจริง พื้นที่ว่างพร้อมรับ ยอดสแกนรับ-เบิกวันนี้ และรายละเอียดอายุสินค้าตามเกณฑ์ FIFO
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTableModal(false)}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-colors border border-slate-700"
              >
                ปิดตาราง ✕
              </button>
            </div>

            {/* Modal Body: Scrollable Comprehensive Tables */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-4">
              
              {/* 1. Zone Breakdown Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/80 shadow-md">
                <div className="px-3.5 py-2 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-400" />
                    <span>สรุปความจุ อัตราจัดเก็บ และยอดสแกน IN / OUT แยกรายโซน</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    จัดเก็บรวมทั้งแคมปัส: <b className="text-blue-400">{metrics.totalOccupied}</b> / {metrics.totalCapacity} PL ({metrics.occupancyRate}%)
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-950/70 border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider font-bold">
                        <th className="py-2.5 px-3">โซน / อาคารคลัง</th>
                        <th className="py-2.5 px-3">ลักษณะพื้นที่จัดเก็บ</th>
                        <th className="py-2.5 px-3 text-right">ความจุสูงสุด (CAP)</th>
                        <th className="py-2.5 px-3 text-right">จัดเก็บแล้ว (USED)</th>
                        <th className="py-2.5 px-3 text-right">พื้นที่ว่าง (FREE)</th>
                        <th className="py-2.5 px-3 text-center">อัตราใช้งาน (%)</th>
                        <th className="py-2.5 px-3 text-center">รับเข้า (+IN)</th>
                        <th className="py-2.5 px-3 text-center">เบิกจ่าย (-OUT)</th>
                        <th className="py-2.5 px-3 text-center">Aging รวม (&gt;21 วัน)</th>
                        <th className="py-2.5 px-3 text-center">การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 font-mono">
                      {metrics.zoneBreakdown.map((zone) => (
                        <tr key={zone.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-3 font-sans">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-100">{zone.name}</span>
                              <span className={`text-[10px] px-1.5 py-0.2 rounded border font-mono ${zone.badgeColor}`}>
                                {zone.code}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-300 font-sans text-[11px]">
                            {zone.type}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-200">
                            {zone.cap} <span className="text-[10px] text-slate-400 font-normal">PL</span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-blue-400">
                            {zone.occupied} <span className="text-[10px] text-slate-400 font-normal">PL</span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                            {zone.free} <span className="text-[10px] text-slate-400 font-normal">ช่อง</span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${zone.pct > 80 ? 'bg-rose-500' : zone.pct > 50 ? 'bg-amber-500' : 'bg-blue-500'}`}
                                  style={{ width: `${Math.min(zone.pct, 100)}%` }}
                                />
                              </div>
                              <span className="text-[11px] font-bold text-slate-200">{zone.pct}%</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">
                            +{zone.inScans}
                          </td>
                          <td className="py-2.5 px-3 text-center text-amber-400 font-bold">
                            -{zone.outScans}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {zone.aging.totalAging > 0 ? (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold">
                                {zone.aging.totalAging} PL
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[11px]">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-sans">
                            <button
                              onClick={() => {
                                setShowTableModal(false);
                                onNavigateToZone(zone.targetTab);
                              }}
                              className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] flex items-center gap-1 mx-auto transition-all shadow-xs"
                            >
                              <span>เปิด 3D</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-950 font-bold border-t-2 border-slate-700 text-xs font-mono">
                      <tr>
                        <td className="py-3 px-3 font-sans text-white" colSpan={2}>
                          รวมทั้งแคมปัส (TOTAL CAMPUS 4 ZONES)
                        </td>
                        <td className="py-3 px-3 text-right text-white">
                          {metrics.totalCapacity} PL
                        </td>
                        <td className="py-3 px-3 text-right text-blue-400">
                          {metrics.totalOccupied} PL
                        </td>
                        <td className="py-3 px-3 text-right text-emerald-400">
                          {metrics.totalFree} ช่อง
                        </td>
                        <td className="py-3 px-3 text-center text-blue-300">
                          {metrics.occupancyRate}%
                        </td>
                        <td className="py-3 px-3 text-center text-emerald-400">
                          +{metrics.todayInTotal}
                        </td>
                        <td className="py-3 px-3 text-center text-amber-400">
                          -{metrics.todayOutTotal}
                        </td>
                        <td className="py-3 px-3 text-center text-amber-300">
                          {metrics.totalAgingAll.totalAging} PL
                        </td>
                        <td className="py-3 px-3 text-center font-sans">
                          <span className="text-[10px] text-emerald-400 font-bold">พร้อมใช้งาน</span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* 2. Detailed Aging Matrix by Status & Days Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/80 shadow-md">
                <div className="px-3.5 py-2 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>ตารางรายละเอียด Aging &amp; FIFO แยกสถานะและจำนวนวันจัดเก็บ</span>
                  </span>
                  <span className="text-[11px] text-slate-400">
                    มาตรฐานการจัดเก็บ: <b>รอบ 28 วัน (Vinyl Wrapping Standard)</b>
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse font-mono">
                    <thead>
                      <tr className="bg-slate-950/70 border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider font-bold">
                        <th className="py-2.5 px-3 font-sans">โซนจัดเก็บ</th>
                        <th className="py-2.5 px-3 text-center text-emerald-400">🟢 ปลอดภัย (0–21 วัน)</th>
                        <th className="py-2.5 px-3 text-center text-amber-400">🟡 เฝ้าระวัง (22–24 วัน)</th>
                        <th className="py-2.5 px-3 text-center text-orange-400">🟠 ใกล้กำหนด (25–27 วัน)</th>
                        <th className="py-2.5 px-3 text-center text-rose-400">🔴 วิกฤต/Hold (≥28 วัน)</th>
                        <th className="py-2.5 px-3 text-center font-sans text-slate-200">สถานะความเสี่ยง</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {metrics.zoneBreakdown.map((zone) => (
                        <tr key={`aging-${zone.id}`} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-3 font-sans font-bold text-slate-100">
                            {zone.name}
                          </td>
                          <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">
                            {zone.aging.safe} <span className="text-[10px] text-slate-400 font-normal">PL</span>
                          </td>
                          <td className="py-2.5 px-3 text-center text-amber-400 font-bold">
                            {zone.aging.warning > 0 ? (
                              <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30">
                                {zone.aging.warning} PL
                              </span>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center text-orange-400 font-bold">
                            {zone.aging.urgent > 0 ? (
                              <span className="px-2 py-0.5 rounded bg-orange-500/20 border border-orange-500/30">
                                {zone.aging.urgent} PL
                              </span>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center text-rose-400 font-bold">
                            {zone.aging.critical > 0 ? (
                              <span className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/30 text-rose-300">
                                {zone.aging.critical} PL
                              </span>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-sans">
                            {zone.aging.critical > 0 ? (
                              <span className="text-rose-400 text-[11px] font-bold">ต้องเร่งเบิกจ่าย / ตรวจสอบ</span>
                            ) : zone.aging.urgent > 0 ? (
                              <span className="text-orange-400 text-[11px] font-bold">เฝ้าระวังลำดับ FIFO</span>
                            ) : (
                              <span className="text-emerald-400 text-[11px] font-bold">ปกติ</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-950 font-bold border-t-2 border-slate-700 text-xs">
                      <tr>
                        <td className="py-3 px-3 font-sans text-white">
                          รวมทั้งแคมปัส
                        </td>
                        <td className="py-3 px-3 text-center text-emerald-400">
                          {metrics.totalAgingAll.safe} PL
                        </td>
                        <td className="py-3 px-3 text-center text-amber-400">
                          {metrics.totalAgingAll.warning} PL
                        </td>
                        <td className="py-3 px-3 text-center text-orange-400">
                          {metrics.totalAgingAll.urgent} PL
                        </td>
                        <td className="py-3 px-3 text-center text-rose-400">
                          {metrics.totalAgingAll.critical} PL
                        </td>
                        <td className="py-3 px-3 text-center font-sans text-amber-300">
                          Aging รวม {metrics.totalAgingAll.totalAging} พาเลท
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* 3. Aging Standards & Policy Legend */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-slate-900 p-2.5 rounded-xl border border-emerald-500/30">
                  <div className="font-bold text-emerald-400 mb-1 flex items-center gap-1">
                    <span>🟢 ปลอดภัย (0–21 วัน)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans">
                    สินค้าอยู่ในเกณฑ์อายุจัดเก็บปกติ สามารถเบิกจ่ายตามรอบการผลิตปกติได้
                  </p>
                </div>

                <div className="bg-slate-900 p-2.5 rounded-xl border border-amber-500/30">
                  <div className="font-bold text-amber-400 mb-1 flex items-center gap-1">
                    <span>🟡 เฝ้าระวัง (22–24 วัน)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans">
                    เริ่มเข้าสู่ช่วงเฝ้าระวัง ควรวางแผนจัดสรรเข้าสายการผลิตตามหลัก FIFO
                  </p>
                </div>

                <div className="bg-slate-900 p-2.5 rounded-xl border border-orange-500/30">
                  <div className="font-bold text-orange-400 mb-1 flex items-center gap-1">
                    <span>🟠 ใกล้กำหนด (25–27 วัน)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans">
                    ใกล้ครบกำหนด 28 วัน ระบบแจ้งเตือนให้เร่งรัดเบิกจ่ายเป็นลำดับแรก
                  </p>
                </div>

                <div className="bg-slate-900 p-2.5 rounded-xl border border-rose-500/30">
                  <div className="font-bold text-rose-400 mb-1 flex items-center gap-1">
                    <span>🔴 วิกฤต / Hold (≥28 วัน)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans">
                    เกินมาตรฐาน 28 วัน ต้องตรวจสอบสภาพการห่อหุ้ม Vinyl Wrapping ทันที
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. BOTTOM COMPACT 3-KPI SUMMARY BAR (Matching all other zones) */}
      <ZoneKpiFormalDashboard
        zoneKey="ALL"
        items={items}
        logs={logs}
        stats={stats}
        agingConfig={agingConfig}
      />
    </div>
  );
};
