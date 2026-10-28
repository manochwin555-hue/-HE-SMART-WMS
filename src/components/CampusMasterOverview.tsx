import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { InventoryItem, MovementLog, WmsStats, AgingThresholdConfig, StorageZone, MovementType, WarehouseFacility, ShelfLevel } from '../types';
import { ZoneKpiFormalDashboard } from './ZoneKpiFormalDashboard';
import { createRealisticForklift } from './zone-3d/forkliftModel';
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
  ArrowRight
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
    position: { x: -62, y: 0, z: 0 },
    size: { w: 32, h: 14, d: 50 },
    description: 'รางเลื่อนลูกกลิ้ง 13 แถว R01-R13 (104 ช่องจัดเก็บ)'
  },
  A4: {
    key: 'A4',
    name: 'อาคาร A4 - Rack & Floor Staging',
    fullName: 'อาคาร A4 • Selective Rack B-K & Floor Staging (DA4D-1/2/3)',
    zoneKey: 'A4',
    targetNavigation: 'A4_FLOOR',
    capacity: 1112,
    colorHex: '#f59e0b',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    position: { x: 0, y: 0, z: -4 },
    size: { w: 58, h: 18, d: 64 },
    description: 'Selective Rack B-K (680P) + ลานวางพื้นรูปตัว L X1-X8 (432P)'
  },
  CY3: {
    key: 'CY3',
    name: 'CY3 - Outdoor Heavy Rack',
    fullName: 'โซน CY3 • Outdoor Heavy Rack (DY3T)',
    zoneKey: 'CY3',
    targetNavigation: 'CY3_TENT',
    capacity: 400,
    colorHex: '#f97316',
    badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    position: { x: 62, y: 0, z: -32 },
    size: { w: 36, h: 22, d: 36 },
    description: 'โครงเหล็ก Heavy Rack กลางแจ้ง 4 แถว A-D ชั้น L1-L4 เสาสูง 1.5 เท่า'
  },
  A5: {
    key: 'A5',
    name: 'อาคาร A5 - Tent Yard',
    fullName: 'โซน A5 • Tent Yard (4 Tents: Tent 1 ถึง Tent 4)',
    zoneKey: 'A5',
    targetNavigation: 'A5_TENT',
    capacity: 784,
    colorHex: '#10b981',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    position: { x: 62, y: 0, z: 32 },
    size: { w: 42, h: 12, d: 42 },
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
  ctx.fillStyle = 'rgba(11, 17, 28, 0.88)';
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
  const [showVehicles, setShowVehicles] = useState<boolean>(true);
  const [showRoads, setShowRoads] = useState<boolean>(true);
  const [cameraPreset, setCameraPreset] = useState<'ISO_45' | 'TOP_85'>('ISO_45');

  // Compute building specific occupancy metrics
  const buildingMetrics = useMemo(() => {
    const metrics: Record<BuildingKey, { occupied: number; total: number; percent: number; inCount: number; outCount: number }> = {
      A2: { occupied: 0, total: 104, percent: 0, inCount: 0, outCount: 0 },
      A4: { occupied: 0, total: 1112, percent: 0, inCount: 0, outCount: 0 },
      CY3: { occupied: 0, total: 400, percent: 0, inCount: 0, outCount: 0 },
      A5: { occupied: 0, total: 784, percent: 0, inCount: 0, outCount: 0 },
    };

    items.forEach(item => {
      const z = String(item.zone || '');
      const loc = String(item.locatorCode || '');
      const fac = String(item.facilityId || '');

      if (z.startsWith('R') || z.startsWith('FR') || fac === 'FAC-A2-RAIL' || loc.includes('DA2D')) {
        metrics.A2.occupied += 1;
      } else if (z.startsWith('CY3') || z.startsWith('DY3T') || fac === 'FAC-CY3-TENT' || loc.includes('DY3T')) {
        metrics.CY3.occupied += 1;
      } else if (z.startsWith('A5') || fac === 'FAC-A5-TENT') {
        metrics.A5.occupied += 1;
      } else {
        metrics.A4.occupied += 1;
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
  const vehiclesGroupRef = useRef<THREE.Group | null>(null);
  const roadsGroupRef = useRef<THREE.Group | null>(null);

  // Target camera state for smooth damping transition
  const cameraTargetPos = useRef<THREE.Vector3>(new THREE.Vector3(-60, 75, 95));
  const controlsTargetPos = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));

  // Initialize Three.js Site Scene
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 1000;
    const height = container.clientHeight || 650;

    // 1. Scene & Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#080d1a');
    scene.fog = new THREE.FogExp2('#080d1a', 0.0035);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.5, 600);
    camera.position.set(-60, 75, 95);
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

    // 2. Lighting Setup
    const ambientLight = new THREE.AmbientLight('#1e293b', 1.2);
    const hemiLight = new THREE.HemisphereLight('#38bdf8', '#0f172a', 1.4);
    hemiLight.position.set(0, 80, 0);

    const dirLight = new THREE.DirectionalLight('#ffffff', 1.8);
    dirLight.position.set(80, 120, 60);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 300;
    const d = 110;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0005;

    scene.add(ambientLight, hemiLight, dirLight);

    // 3. Ground Base & Tarmac Site Plate
    const groundGroup = new THREE.Group();
    const groundGeo = new THREE.PlaneGeometry(240, 170);
    const groundMat = new THREE.MeshStandardMaterial({
      color: '#0f172a',
      roughness: 0.85,
      metalness: 0.25
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    groundGroup.add(groundMesh);

    // Site Grid Overlay
    const gridHelper = new THREE.GridHelper(240, 48, '#334155', '#1e293b');
    gridHelper.position.y = 0.05;
    groundGroup.add(gridHelper);
    scene.add(groundGroup);

    // 4. Road Network & Transport Lines
    const roadsGroup = new THREE.Group();
    roadsGroupRef.current = roadsGroup;
    
    // Main vertical highway road
    const mainRoadGeo = new THREE.PlaneGeometry(16, 150);
    const roadMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.7, metalness: 0.3 });
    const mainRoad = new THREE.Mesh(mainRoadGeo, roadMat);
    mainRoad.rotation.x = -Math.PI / 2;
    mainRoad.position.set(28, 0.08, 0);
    roadsGroup.add(mainRoad);

    // Cross connecting road (A2 to A4)
    const crossRoadGeo = new THREE.PlaneGeometry(80, 12);
    const crossRoad = new THREE.Mesh(crossRoadGeo, roadMat);
    crossRoad.rotation.x = -Math.PI / 2;
    crossRoad.position.set(-25, 0.08, 0);
    roadsGroup.add(crossRoad);

    // CY3 & A5 Branch Roads
    const cy3Road = new THREE.Mesh(new THREE.PlaneGeometry(40, 12), roadMat);
    cy3Road.rotation.x = -Math.PI / 2;
    cy3Road.position.set(45, 0.08, -32);

    const a5Road = new THREE.Mesh(new THREE.PlaneGeometry(40, 12), roadMat);
    a5Road.rotation.x = -Math.PI / 2;
    a5Road.position.set(45, 0.08, 32);

    roadsGroup.add(cy3Road, a5Road);

    // Yellow Dashed Lane Lines
    const lineMat = new THREE.MeshStandardMaterial({ color: '#eab308', emissive: '#eab308', emissiveIntensity: 0.3 });
    for (let z = -65; z <= 65; z += 12) {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 5), lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(28, 0.12, z);
      roadsGroup.add(line);
    }
    scene.add(roadsGroup);

    // 5. Build 4 Master Campus Buildings
    const buildingsGroup = new THREE.Group();
    const instancedPalletMat = new THREE.MeshStandardMaterial({ color: '#38bdf8', roughness: 0.4, metalness: 0.3 });

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

      // Outer Structural Frame Glowing Wireframe Outline
      const frameGeo = new THREE.BoxGeometry(spec.size.w + 0.5, spec.size.h + 0.5, spec.size.d + 0.5);
      const edgesGeo = new THREE.EdgesGeometry(frameGeo);
      const lineMatGlow = new THREE.LineBasicMaterial({ color: spec.colorHex, linewidth: 2 });
      const frameOutline = new THREE.LineSegments(edgesGeo, lineMatGlow);
      frameOutline.position.y = spec.size.h / 2;
      frameOutline.name = `outline-${bKey}`;
      bGroup.add(frameOutline);

      // --- Custom Internal 3D Architecture for Each Building ---
      if (bKey === 'A2') {
        // A2: Flow Rail Glassy Semi-Transparent Shell
        const shellGeo = new THREE.BoxGeometry(spec.size.w, spec.size.h, spec.size.d);
        const glassMat = new THREE.MeshPhysicalMaterial({
          color: spec.colorHex,
          transparent: true,
          opacity: 0.3,
          roughness: 0.1,
          transmission: 0.6
        });
        const shell = new THREE.Mesh(shellGeo, glassMat);
        shell.position.y = spec.size.h / 2;
        bGroup.add(shell);

        // Internal 13 Flow Roller Lanes (R01 to R13)
        for (let r = 0; r < 13; r++) {
          const rx = -spec.size.w / 2 + 2.5 + r * (spec.size.w - 5) / 12;
          const laneFrame = new THREE.Mesh(
            new THREE.BoxGeometry(1.6, 1.2, spec.size.d - 6),
            new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.5, metalness: 0.8 })
          );
          laneFrame.position.set(rx, 1.4, 0);
          bGroup.add(laneFrame);

          // Roller tracks & pallet boxes inside
          for (let p = 0; p < 7; p++) {
            const pz = -spec.size.d / 2 + 5 + p * 5.8;
            const pallet = new THREE.Mesh(
              new THREE.BoxGeometry(1.4, 1.0, 1.4),
              new THREE.MeshStandardMaterial({ color: p % 2 === 0 ? '#06b6d4' : '#38bdf8', roughness: 0.3 })
            );
            pallet.position.set(rx, 2.3, pz);
            pallet.castShadow = true;
            bGroup.add(pallet);
          }
        }
      } else if (bKey === 'A4') {
        // A4: Main Selective Rack & Floor Staging Warehouse (Cutaway roof)
        // Building Truss Roof Pillars
        [-spec.size.w/2 + 2, spec.size.w/2 - 2].forEach(px => {
          [-spec.size.d/2 + 2, spec.size.d/2 - 2].forEach(pz => {
            const pillar = new THREE.Mesh(
              new THREE.CylinderGeometry(0.5, 0.5, spec.size.h, 8),
              new THREE.MeshStandardMaterial({ color: '#64748b', metalness: 0.8 })
            );
            pillar.position.set(px, spec.size.h/2, pz);
            bGroup.add(pillar);
          });
        });

        // Selective Racks B-K (Rear Wing)
        for (let r = 0; r < 8; r++) {
          const rz = -spec.size.d / 2 + 8 + r * 5.2;
          const rackBar = new THREE.Mesh(
            new THREE.BoxGeometry(spec.size.w - 12, 12, 1.8),
            new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.6, metalness: 0.8 })
          );
          rackBar.position.set(-2, 6.5, rz);
          bGroup.add(rackBar);

          // Pallet Boxes on Racks
          for (let bx = -spec.size.w / 2 + 8; bx <= spec.size.w / 2 - 12; bx += 3.8) {
            for (let lvl = 1; lvl <= 3; lvl++) {
              if (Math.random() > 0.25) {
                const box = new THREE.Mesh(
                  new THREE.BoxGeometry(1.6, 1.2, 1.4),
                  new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.4 })
                );
                box.position.set(bx, lvl * 3.2, rz);
                box.castShadow = true;
                bGroup.add(box);
              }
            }
          }
        }

        // L-shaped Floor Staging Area (Front Right Wing)
        for (let fx = 10; fx < spec.size.w/2 - 4; fx += 4.5) {
          for (let fz = 8; fz < spec.size.d/2 - 4; fz += 4.5) {
            const stagingPad = new THREE.Mesh(
              new THREE.BoxGeometry(3.6, 0.1, 3.6),
              new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.8 })
            );
            stagingPad.position.set(fx, 0.85, fz);
            bGroup.add(stagingPad);

            const floorPallet = new THREE.Mesh(
              new THREE.BoxGeometry(3.2, 1.8, 3.2),
              new THREE.MeshStandardMaterial({ color: '#eab308', roughness: 0.3 })
            );
            floorPallet.position.set(fx, 1.8, fz);
            floorPallet.castShadow = true;
            bGroup.add(floorPallet);
          }
        }
      } else if (bKey === 'CY3') {
        // CY3: Outdoor Heavy Rack (No walls, open-air canopy, 1.5x taller steel columns)
        const pillarHeight = spec.size.h; // 22 units high!
        for (let row = 0; row < 4; row++) {
          const rx = -spec.size.w / 2 + 5 + row * 8.5;
          
          // Heavy steel columns
          [-spec.size.d / 2 + 4, spec.size.d / 2 - 4].forEach(cz => {
            const col = new THREE.Mesh(
              new THREE.BoxGeometry(1.2, pillarHeight, 1.2),
              new THREE.MeshStandardMaterial({ color: '#f97316', metalness: 0.9, roughness: 0.2 })
            );
            col.position.set(rx, pillarHeight / 2, cz);
            col.castShadow = true;
            bGroup.add(col);
          });

          // Canopy Roof Trusses Overhead
          const canopyRoof = new THREE.Mesh(
            new THREE.BoxGeometry(4, 0.8, spec.size.d - 4),
            new THREE.MeshStandardMaterial({ color: '#ea580c', roughness: 0.4 })
          );
          canopyRoof.position.set(rx, pillarHeight + 0.4, 0);
          bGroup.add(canopyRoof);

          // Heavy Racks L1-L4
          for (let lvl = 1; lvl <= 4; lvl++) {
            const rackShelf = new THREE.Mesh(
              new THREE.BoxGeometry(2.4, 0.4, spec.size.d - 8),
              new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.8 })
            );
            rackShelf.position.set(rx, lvl * 4.5, 0);
            bGroup.add(rackShelf);

            // Heavy Pallets
            for (let pz = -spec.size.d / 2 + 6; pz <= spec.size.d / 2 - 6; pz += 4.5) {
              const hPallet = new THREE.Mesh(
                new THREE.BoxGeometry(2.0, 1.8, 2.0),
                new THREE.MeshStandardMaterial({ color: '#f97316', roughness: 0.4 })
              );
              hPallet.position.set(rx, lvl * 4.5 + 1.1, pz);
              hPallet.castShadow = true;
              bGroup.add(hPallet);
            }
          }
        }
      } else if (bKey === 'A5') {
        // A5: 4 Arched Canvas Tents (2x2 Grid)
        const tentOffsets = [
          { x: -spec.size.w/4, z: -spec.size.d/4, name: 'Tent 1' },
          { x: spec.size.w/4, z: -spec.size.d/4, name: 'Tent 2' },
          { x: -spec.size.w/4, z: spec.size.d/4, name: 'Tent 3' },
          { x: spec.size.w/4, z: spec.size.d/4, name: 'Tent 4' },
        ];

        tentOffsets.forEach(t => {
          // Arched dome roof mesh
          const domeGeo = new THREE.CylinderGeometry(8.5, 8.5, 16, 16, 1, false, 0, Math.PI);
          const tentMat = new THREE.MeshStandardMaterial({
            color: '#10b981',
            transparent: true,
            opacity: 0.45,
            roughness: 0.3,
            side: THREE.DoubleSide
          });
          const dome = new THREE.Mesh(domeGeo, tentMat);
          dome.rotation.z = Math.PI / 2;
          dome.position.set(t.x, 8.5, t.z);
          bGroup.add(dome);

          // Pallet staging grids inside tent
          for (let px = -5; px <= 5; px += 3.2) {
            for (let pz = -5; pz <= 5; pz += 3.2) {
              const tPallet = new THREE.Mesh(
                new THREE.BoxGeometry(2.4, 1.4, 2.4),
                new THREE.MeshStandardMaterial({ color: '#10b981', roughness: 0.4 })
              );
              tPallet.position.set(t.x + px, 1.5, t.z + pz);
              tPallet.castShadow = true;
              bGroup.add(tPallet);
            }
          }
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
    });

    scene.add(buildingsGroup);

    // 6. Forklift Vehicles Animated on Roads
    const vehiclesGroup = new THREE.Group();
    vehiclesGroupRef.current = vehiclesGroup;

    const fk1 = createRealisticForklift(28, 0.1, -20, 0, 1.2);
    const fk2 = createRealisticForklift(28, 0.1, 20, Math.PI, 1.2);
    const fk3 = createRealisticForklift(-20, 0.1, 0, Math.PI / 2, 1.2);

    vehiclesGroup.add(fk1, fk2, fk3);
    scene.add(vehiclesGroup);

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

      // Animate Vehicles on roads
      if (vehiclesGroupRef.current && showVehicles) {
        fk1.position.z = -35 + Math.sin(time * 0.8) * 35;
        fk2.position.z = 35 - Math.sin(time * 0.8) * 35;
        fk3.position.x = -20 + Math.cos(time * 0.6) * 30;
      }

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

  // Sync Vehicles Visibility
  useEffect(() => {
    if (vehiclesGroupRef.current) {
      vehiclesGroupRef.current.visible = showVehicles;
    }
  }, [showVehicles]);

  // Sync Roads Visibility
  useEffect(() => {
    if (roadsGroupRef.current) {
      roadsGroupRef.current.visible = showRoads;
    }
  }, [showRoads]);

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
    cameraTargetPos.current.set(-60, 75, 95);
    controlsTargetPos.current.set(0, 0, 0);
  };

  // Switch to Top Plan 85° View
  const handleTopPlanView = () => {
    setCameraPreset('TOP_85');
    cameraTargetPos.current.set(0, 140, 5);
    controlsTargetPos.current.set(0, 0, 0);
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
            <label className="flex items-center space-x-1 cursor-pointer hover:text-white">
              <input type="checkbox" checked={showVehicles} onChange={e => setShowVehicles(e.target.checked)} className="rounded text-blue-600" />
              <span>รถยก</span>
            </label>
            <label className="flex items-center space-x-1 cursor-pointer hover:text-white">
              <input type="checkbox" checked={showRoads} onChange={e => setShowRoads(e.target.checked)} className="rounded text-blue-600" />
              <span>เส้นทาง</span>
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
