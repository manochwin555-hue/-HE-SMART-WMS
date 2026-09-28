import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { InventoryItem, MovementType, ShelfLevel, StorageZone } from '../../types';
import { createRealisticForklift } from './forkliftModel';
import { createHologramGhostTarget } from './hologramGhost';
import { createRackBayNeonHighlight, applyFaintEmissiveHighlight } from './neonEdgeHighlight';
import { 
  RotateCcw, 
  Layers, 
  Info, 
  Warehouse, 
  Eye, 
  EyeOff, 
  Maximize2, 
  Minimize2, 
  CheckCircle2, 
  AlertTriangle,
  Compass,
  Sparkles,
  Camera,
  Sun
} from 'lucide-react';

interface A5CanopyTents3DViewProps {
  items: InventoryItem[];
  searchQuery?: string;
  onSelectSlot: (tentNum: number, groupNum: number, row: number, col: number, item?: InventoryItem) => void;
  onOpenScanner?: (zone: StorageZone, bay: number, level: ShelfLevel, mode: MovementType) => void;
}

export const A5CanopyTents3DView: React.FC<A5CanopyTents3DViewProps> = ({
  items,
  searchQuery = '',
  onSelectSlot,
  onOpenScanner
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [roofMode, setRoofMode] = useState<'TRANSLUCENT' | 'SOLID' | 'HIDDEN'>('TRANSLUCENT');
  const [cameraFocus, setCameraFocus] = useState<'ALL_A5' | 'TOP_DOWN' | 'TENT_1' | 'TENT_2' | 'TENT_3' | 'TENT_4'>('ALL_A5');

  const [hoveredSlot, setHoveredSlot] = useState<{
    tent: number;
    grp: number;
    r: number;
    c: number;
    locator: string;
    item?: InventoryItem;
    statusMode: 'EMPTY' | 'OCCUPIED' | 'AGING' | 'OVERDUE';
    posDetail?: string;
  } | null>(null);

  // Map items to A5 tents (4 tents x 196 slots = 784 PL)
  const a5ItemMap = useMemo(() => {
    const map = new Map<string, InventoryItem>();
    items.forEach(it => {
      let tent = 1;
      let grp = 1;
      let r = 1;
      let c = 1;

      // Match DA5T-1-01-R3-05 or DA5T-1.01-G1-R1-01 or DAST-1...
      const m = it.locatorCode?.match(/DA(?:ST|5T)-([1-4])(?:\.01)?-(?:0?([1-7])|G([1-7]))-(?:R([1-4]))-(?:0?([1-7])|C([1-7]))?/i);
      if (m) {
        tent = parseInt(m[1], 10);
        grp = parseInt(m[2] || m[3] || '1', 10);
        r = parseInt(m[4] || '1', 10);
        c = parseInt(m[5] || m[6] || '1', 10);
        map.set(`${tent}-${grp}-${r}-${c}`, it);
        map.set(`DA5T-${tent}-${String(grp).padStart(2, '0')}-R${r}-${String(c).padStart(2, '0')}`, it);
      } else if (it.facilityId === 'FAC-A5-TENT' || it.locatorCode?.includes('DA5T')) {
        const tentNum = typeof it.zone === 'string' && it.zone.includes('2') ? 2 :
                        typeof it.zone === 'string' && it.zone.includes('3') ? 3 :
                        typeof it.zone === 'string' && it.zone.includes('4') ? 4 : 1;
        const b = it.bayNumber || 1;
        map.set(`${tentNum}-${b}-1-1`, it);
      }
    });
    return map;
  }, [items]);

  // Smooth Camera Fly Transition
  const flyCameraTo = (targetPos: THREE.Vector3, targetLookAt: THREE.Vector3, duration = 900) => {
    if (!cameraRef.current || !controlsRef.current) return;
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;

    const startPos = cam.position.clone();
    const startLook = ctrl.target.clone();
    const startTime = performance.now();

    const animateTransition = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1.0);
      const ease = 1 - Math.pow(1 - progress, 3); // Cubic ease out

      cam.position.lerpVectors(startPos, targetPos, ease);
      ctrl.target.lerpVectors(startLook, targetLookAt, ease);
      ctrl.update();

      if (progress < 1.0) {
        requestAnimationFrame(animateTransition);
      }
    };
    requestAnimationFrame(animateTransition);
  };

  const handleCameraPreset = (preset: 'ALL_A5' | 'TOP_DOWN' | 'TENT_1' | 'TENT_2' | 'TENT_3' | 'TENT_4') => {
    setCameraFocus(preset);
    if (!cameraRef.current || !controlsRef.current) return;

    switch (preset) {
      case 'ALL_A5':
        // Expanded 45° isometric view - framed nicely inside viewport bounds without clipping
        flyCameraTo(new THREE.Vector3(0, 52, 60), new THREE.Vector3(0, 0, 0));
        break;
      case 'TOP_DOWN':
        // 85° Overhead Blueprint
        flyCameraTo(new THREE.Vector3(0, 68, 0.1), new THREE.Vector3(0, 0, 0));
        break;
      case 'TENT_1':
        // South-West Tent 1 (Bottom Left)
        flyCameraTo(new THREE.Vector3(-22, 24, 26), new THREE.Vector3(-22, 1.5, 12));
        break;
      case 'TENT_2':
        // North-West Tent 2 (Top Left)
        flyCameraTo(new THREE.Vector3(-22, 24, 2), new THREE.Vector3(-22, 1.5, -12));
        break;
      case 'TENT_3':
        // South-East Tent 3 (Bottom Right)
        flyCameraTo(new THREE.Vector3(22, 24, 26), new THREE.Vector3(22, 1.5, 12));
        break;
      case 'TENT_4':
        // North-East Tent 4 (Top Right)
        flyCameraTo(new THREE.Vector3(22, 24, 2), new THREE.Vector3(22, 1.5, -12));
        break;
    }
  };

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight || 600;

    // 1. Scene Setup (Bright Studio)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f8fafc');
    scene.fog = new THREE.FogExp2('#f8fafc', 0.007);
    sceneRef.current = scene;

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 900);
    camera.position.set(0, 52, 60);
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

    // 4. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.minDistance = 8;
    controls.maxDistance = 160;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // 5. Lighting (Crisp High Contrast Studio Bright Lighting)
    const ambientLight = new THREE.AmbientLight('#ffffff', 1.75);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight('#ffffff', 2.1);
    sunLight.position.set(40, 60, 40);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 250;
    sunLight.shadow.camera.left = -50;
    sunLight.shadow.camera.right = 50;
    sunLight.shadow.camera.top = 50;
    sunLight.shadow.camera.bottom = -50;
    sunLight.shadow.bias = -0.0003;
    scene.add(sunLight);

    // Soft sky light from opposite angle
    const fillLight = new THREE.DirectionalLight('#94a3b8', 0.8);
    fillLight.position.set(-35, 35, -35);
    scene.add(fillLight);

    // =========================================================================
    // 6. OUTDOOR CONCRETE YARD & LOGISTICS ROADWAYS
    // =========================================================================
    const campusWidth = 92;
    const campusDepth = 56;

    const groundGeo = new THREE.BoxGeometry(campusWidth, 0.4, campusDepth);
    const groundMat = new THREE.MeshStandardMaterial({ 
      color: '#e2e8f0', 
      roughness: 0.85, 
      metalness: 0.1 
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = -0.2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Safety Grid Overlay
    const grid = new THREE.GridHelper(campusWidth, 46, '#94a3b8', '#cbd5e1');
    grid.position.y = 0.01;
    scene.add(grid);

    // Central Crossroad Asphalt Markings
    const roadMat = new THREE.MeshStandardMaterial({ color: '#f1f5f9', roughness: 0.9 });
    const yellowLineMat = new THREE.MeshBasicMaterial({ color: '#eab308' }); // Industrial Safety Yellow
    const whiteLineMat = new THREE.MeshBasicMaterial({ color: '#f8fafc' });

    // Roadway Horizontal (Main Forklift Aisle between Top & Bottom Tents)
    const roadEW = new THREE.Mesh(new THREE.PlaneGeometry(campusWidth, 7.0), roadMat);
    roadEW.rotation.x = -Math.PI / 2;
    roadEW.position.set(0, 0.012, 0);
    roadEW.receiveShadow = true;

    // Roadway Vertical (Cross Aisle between Left & Right Tents)
    const roadNS = new THREE.Mesh(new THREE.PlaneGeometry(7.0, campusDepth), roadMat);
    roadNS.rotation.x = -Math.PI / 2;
    roadNS.position.set(0, 0.012, 0);
    roadNS.receiveShadow = true;
    scene.add(roadEW, roadNS);

    // Yellow Dashed Centerlines
    const centerLineEW = new THREE.Mesh(new THREE.PlaneGeometry(campusWidth - 10, 0.25), yellowLineMat);
    centerLineEW.rotation.x = -Math.PI / 2;
    centerLineEW.position.set(0, 0.015, 0);

    const centerLineNS = new THREE.Mesh(new THREE.PlaneGeometry(0.25, campusDepth - 10), yellowLineMat);
    centerLineNS.rotation.x = -Math.PI / 2;
    centerLineNS.position.set(0, 0.015, 0);
    scene.add(centerLineEW, centerLineNS);

    // Crosswalk Pedestrian Zebra Strips at central junction
    [-4.2, 4.2].forEach(z => {
      for (let x = -3; x <= 3; x += 0.9) {
        const zebra = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1.2), whiteLineMat);
        zebra.rotation.x = -Math.PI / 2;
        zebra.position.set(x, 0.016, z > 0 ? 4.2 : -4.2);
        scene.add(zebra);
      }
    });

    // =========================================================================
    // 7. 4 TENTS LAYOUT MATCHING EXACT BLUEPRINT (IMAGE 2)
    // =========================================================================
    // Each Tent is a wide horizontal rectangle:
    // Width X = 36m (7 groups side by side along X)
    // Depth Z = 12.2m (7 rows deep along Z)
    // Top-Left: Tent 2 (DA5T-2.01) | Top-Right: Tent 4 (DA5T-4.01)
    // Bottom-Left: Tent 1 (DA5T-1.01) | Bottom-Right: Tent 3 (DA5T-3.01)
    const TENT_WIDTH = 36.4;
    const TENT_DEPTH = 12.2;
    const TENT_HEIGHT = 6.2;

    const tentPositions = [
      { 
        id: 1, 
        name: 'A5 Tent No. 1', 
        signCode: 'DA5T-1.01', 
        x: -22.5, 
        z: 11.5, 
        signSide: 'RIGHT', // Near central cross aisle
        headerColor: '#8b5cf6' 
      },
      { 
        id: 2, 
        name: 'A5 Tent No. 2', 
        signCode: 'DA5T-2.01', 
        x: -22.5, 
        z: -11.5, 
        signSide: 'RIGHT', // Near central cross aisle
        headerColor: '#8b5cf6' 
      },
      { 
        id: 3, 
        name: 'A5 Tent No. 3', 
        signCode: 'DA5T-3.01', 
        x: 22.5, 
        z: 11.5, 
        signSide: 'LEFT', // Near central cross aisle
        headerColor: '#8b5cf6' 
      },
      { 
        id: 4, 
        name: 'A5 Tent No. 4', 
        signCode: 'DA5T-4.01', 
        x: 22.5, 
        z: -11.5, 
        signSide: 'LEFT', // Near central cross aisle
        headerColor: '#8b5cf6',
        hasRackA: true
      },
    ];

    const interactiveMeshes: {
      mesh: THREE.Object3D;
      tent: number;
      grp: number;
      r: number;
      c: number;
      locator: string;
      item?: InventoryItem;
      x: number;
      y: number;
      z: number;
      w: number;
      h: number;
      d: number;
      statusMode: 'EMPTY' | 'OCCUPIED' | 'AGING' | 'OVERDUE';
    }[] = [];

    // Materials
    const palletBaseMat = new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.85 }); // Real wood tone
    const normalBoxMat = new THREE.MeshStandardMaterial({ color: '#fef3c7', roughness: 0.35, metalness: 0.05 }); // Pale amber/yellow cargo matching blueprint
    const occupiedBoxMat = new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.45, metalness: 0.1 }); // Blue cargo
    const agingBoxMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.45, metalness: 0.1 }); // Amber
    const overdueBoxMat = new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.45, metalness: 0.1 }); // Red
    const trussMat = new THREE.MeshStandardMaterial({ color: '#64748b', metalness: 0.85, roughness: 0.25 }); // Steel Truss
    const pillarMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.5, metalness: 0.7 });

    // Helper: Create Tent Floor Engraved Decal Texture (สลักชื่อเต็นท์ตรงพื้นหน้าเต็นท์)
    const createA5TentFloorDecalTexture = (tentId: number, signCode: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0f172a'; // Industrial Navy
        ctx.fillRect(0, 0, 512, 128);

        ctx.lineWidth = 8;
        ctx.strokeStyle = '#38bdf8'; // Sky Blue border
        ctx.strokeRect(4, 4, 504, 120);

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 52px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`เส้นหน้าผ้าใบ ${tentId}`, 256, 45);

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 24px "Segoe UI", Arial, sans-serif';
        ctx.fillText(`${signCode} • 7 กลุ่ม (196 PL)`, 256, 95);
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.anisotropy = 8;
      tex.needsUpdate = true;
      return tex;
    };

    // Helper: Create Group Floor Decal (สลักพื้นหัวกลุ่มช่อง G01 - G07)
    const createA5GroupFloorTexture = (grpNum: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 256, 128);

        ctx.lineWidth = 8;
        ctx.strokeStyle = '#facc15';
        ctx.strokeRect(4, 4, 248, 120);

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 62px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`กลุ่ม ${grpNum}`, 128, 50);

        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
        ctx.fillText(`G0${grpNum} • 28 PL`, 128, 98);
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.anisotropy = 8;
      tex.needsUpdate = true;
      return tex;
    };

    const redFrameMat = new THREE.LineBasicMaterial({ color: 0xdc2626, linewidth: 3 }); // Red Frame Boundary

    const roofOpacity = roofMode === 'HIDDEN' ? 0 : roofMode === 'SOLID' ? 1.0 : 0.22;
    const roofMat = new THREE.MeshStandardMaterial({
      color: roofMode === 'SOLID' ? '#ffffff' : '#e2e8f0',
      roughness: 0.3,
      metalness: 0.05,
      transparent: roofMode !== 'SOLID',
      opacity: roofOpacity,
      side: THREE.DoubleSide,
      depthWrite: roofMode === 'SOLID'
    });

    tentPositions.forEach(tent => {
      const tentGroup = new THREE.Group();
      tentGroup.position.set(tent.x, 0, tent.z);

      // 1. Concrete Slab Foundation with Chamfer
      const slabGeo = new THREE.BoxGeometry(TENT_WIDTH, 0.22, TENT_DEPTH);
      const slabMat = new THREE.MeshStandardMaterial({ color: '#162032', roughness: 0.75 });
      const slab = new THREE.Mesh(slabGeo, slabMat);
      slab.position.y = 0.11;
      slab.receiveShadow = true;
      tentGroup.add(slab);

      // 2. RED FRAME BOUNDARY (Red Outer Perimeter Line matching Image 2 & 3)
      const redBorder = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(TENT_WIDTH, 0.06, TENT_DEPTH)),
        redFrameMat
      );
      redBorder.position.y = 0.24;
      tentGroup.add(redBorder);

      // 3. 8 STRUCTURAL PILLARS ALONG TOP & 8 ALONG BOTTOM (Matching blueprint Image 2)
      const groupWidth = (TENT_WIDTH - 1.4) / 7; // ~5.0m per group
      const startX = -TENT_WIDTH / 2 + 0.7;

      for (let i = 0; i <= 7; i++) {
        const px = startX + i * groupWidth - 0.7;
        const pzTop = -TENT_DEPTH / 2 + 0.35;
        const pzBottom = TENT_DEPTH / 2 - 0.35;

        [pzTop, pzBottom].forEach(pz => {
          // Steel square structural pillar
          const pillarGeo = new THREE.BoxGeometry(0.5, TENT_HEIGHT, 0.5);
          const pillar = new THREE.Mesh(pillarGeo, pillarMat);
          pillar.position.set(px, TENT_HEIGHT / 2, pz);
          pillar.castShadow = true;
          tentGroup.add(pillar);

          // Safety Yellow Base
          const baseGeo = new THREE.BoxGeometry(0.65, 0.4, 0.65);
          const baseMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.3 });
          const base = new THREE.Mesh(baseGeo, baseMat);
          base.position.set(px, 0.2, pz);
          tentGroup.add(base);
        });
      }

      // 4. STRUCTURAL CURVED ROOF TRUSSES & CANOPY (โครงเหล็กหลังคาโค้ง + ผืนผ้าใบเต็นท์โค้ง)
      const archPeakY = TENT_HEIGHT + 2.8; // ~9.0m high at center apex

      // 4.1 8 Main Structural Curved Steel Arch Trusses (ไม่มีชิ้นส่วนเล็กๆ บังสินค้า)
      if (roofMode === 'TRANSLUCENT') {
        for (let i = 0; i <= 7; i++) {
          const px = startX + i * groupWidth - 0.7;
          const pzTop = -TENT_DEPTH / 2 + 0.35; // -5.75m
          const pzBottom = TENT_DEPTH / 2 - 0.35; // +5.75m

          // Curved Quadratic Bezier Arch Tube Frame
          const curve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(px, TENT_HEIGHT, pzTop),
            new THREE.Vector3(px, archPeakY, 0),
            new THREE.Vector3(px, TENT_HEIGHT, pzBottom)
          );
          const archTubeGeo = new THREE.TubeGeometry(curve, 28, 0.12, 8, false);
          const archTubeMesh = new THREE.Mesh(archTubeGeo, trussMat);
          archTubeMesh.castShadow = true;
          tentGroup.add(archTubeMesh);
        }

        // 4.2 Longitudinal Steel Purlin Tubes
        const purlinConfigs = [
          { z: 0, y: archPeakY }, // Central Ridge Apex
          { z: -TENT_DEPTH / 2 + 0.35, y: TENT_HEIGHT }, // Eave Left
          { z: TENT_DEPTH / 2 - 0.35, y: TENT_HEIGHT },  // Eave Right
        ];

        purlinConfigs.forEach(p => {
          const purlinGeo = new THREE.CylinderGeometry(0.08, 0.08, TENT_WIDTH, 8);
          const purlinMesh = new THREE.Mesh(purlinGeo, trussMat);
          purlinMesh.rotation.z = Math.PI / 2; // Position along X axis
          purlinMesh.position.set(0, p.y, p.z);
          tentGroup.add(purlinMesh);
        });
      }

      // 4.3 CURVED CANOPY FABRIC COVER (ผืนหลังคาผ้าใบเต็นท์ทรงโค้ง)
      if (roofMode !== 'HIDDEN') {
        const cylRadius = 7.3;
        const arcAngle = (2 * Math.PI) / 3.2; // ~112.5 degree smooth arch span
        const cylGeo = new THREE.CylinderGeometry(
          cylRadius,
          cylRadius,
          TENT_WIDTH + 0.4,
          36,
          1,
          true,
          -arcAngle / 2,
          arcAngle
        );

        const roofMesh = new THREE.Mesh(cylGeo, roofMat);
        roofMesh.rotation.z = Math.PI / 2; // Lie along X axis
        roofMesh.position.set(0, archPeakY - cylRadius, 0); // Apex aligns with archPeakY
        roofMesh.castShadow = roofMode === 'SOLID';
        roofMesh.receiveShadow = true;
        tentGroup.add(roofMesh);

        // Curved Gable End Caps (ปิดจั่วหน้าหลังผ้าใบเต็นท์โค้ง)
        const pzBtm = TENT_DEPTH / 2 - 0.35;
        [-TENT_WIDTH / 2 - 0.1, TENT_WIDTH / 2 + 0.1].forEach((endX) => {
          const gableShape = new THREE.Shape();
          const startY = roofMode === 'SOLID' ? 0 : TENT_HEIGHT;
          gableShape.moveTo(-pzBtm, startY);

          const steps = 24;
          for (let s = 0; s <= steps; s++) {
            const ratio = s / steps;
            const zVal = -pzBtm + ratio * (2 * pzBtm);
            const yVal = TENT_HEIGHT + (2.8 * (1 - Math.pow(zVal / pzBtm, 2)));
            gableShape.lineTo(zVal, yVal);
          }
          gableShape.lineTo(pzBtm, startY);
          gableShape.closePath();

          const gableGeo = new THREE.ShapeGeometry(gableShape);
          const gableMesh = new THREE.Mesh(gableGeo, roofMat);
          gableMesh.rotation.y = Math.PI / 2;
          gableMesh.position.set(endX, 0, 0);
          tentGroup.add(gableMesh);
        });

        // Full Enclosed Side Walls in Solid Roof Mode (ปิดมิดชิดทุกด้าน)
        if (roofMode === 'SOLID') {
          [-pzBtm, pzBtm].forEach(zPos => {
            const sideWallGeo = new THREE.BoxGeometry(TENT_WIDTH + 0.4, TENT_HEIGHT, 0.08);
            const sideWallMesh = new THREE.Mesh(sideWallGeo, roofMat);
            sideWallMesh.position.set(0, TENT_HEIGHT / 2, zPos);
            tentGroup.add(sideWallMesh);
          });
        }
      }

      // 5. TENT NAME ENGRAVED FLOOR DECAL (สลักชื่อเต็นท์ตรงพื้นหน้าเต็นท์ - วางห่างออกมาตรงถนนไม่ทับกลุ่ม 4)
      const floorNameTex = createA5TentFloorDecalTexture(tent.id, tent.signCode);
      const tentNameFloorMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(6.4, 1.5),
        new THREE.MeshBasicMaterial({ map: floorNameTex, side: THREE.DoubleSide })
      );
      const nameDecalZ = tent.z > 0 ? -TENT_DEPTH / 2 - 2.8 : TENT_DEPTH / 2 + 2.8;
      tentNameFloorMesh.position.set(0, 0.235, nameDecalZ);
      tentNameFloorMesh.rotation.x = -Math.PI / 2;
      tentGroup.add(tentNameFloorMesh);

      // =========================================================================
      // 6. 7 GROUPS x 4 ROWS (X) x 7 COLUMNS (Z) = 196 PALLET SLOTS PER TENT
      // =========================================================================
      // Matching Blueprint: 7 groups spaced horizontally (01 to 07).
      // In each group: 4 columns across (X) x 7 depth rows along (Z) = 28 pallets!
      const groupSpacingX = 5.0; // Distance between group centers
      const slotPitchX = 0.95;   // 4 slots along X = 4 * 0.95 = 3.8m
      const slotPitchZ = 1.45;   // 7 slots along Z = 7 * 1.45 = 10.15m

      for (let g = 1; g <= 7; g++) {
        // Group Center X (from -3 * spacing to +3 * spacing)
        const grpCenterX = (g - 4) * groupSpacingX;

        // Group Background Floor Area (Pale Warm Amber/Sand Tint matching Blueprint)
        const grpFloorGeo = new THREE.PlaneGeometry(4.0, 10.6);
        const grpFloorMat = new THREE.MeshStandardMaterial({ 
          color: '#1a2333', 
          roughness: 0.9 
        });
        const grpFloor = new THREE.Mesh(grpFloorGeo, grpFloorMat);
        grpFloor.rotation.x = -Math.PI / 2;
        grpFloor.position.set(grpCenterX, 0.225, 0);
        grpFloor.receiveShadow = true;
        tentGroup.add(grpFloor);

        // Group Yellow Frame Border
        const grpBorder = new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.BoxGeometry(4.1, 0.02, 10.7)),
          new THREE.LineBasicMaterial({ color: 0xeab308, linewidth: 1.5 })
        );
        grpBorder.position.set(grpCenterX, 0.23, 0);
        tentGroup.add(grpBorder);

        // Group Head Floor Decal (สลักพื้นหัวกลุ่มช่อง G01 - G07 วางตรงลานด้านหน้ากลุ่ม ไม่โดนบล็อกสินค้าบัง)
        const grpDecalMat = new THREE.MeshBasicMaterial({
          map: createA5GroupFloorTexture(g),
          side: THREE.DoubleSide
        });
        const grpFloorDecal = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.95), grpDecalMat);
        const grpDecalZ = tent.z > 0 ? -TENT_DEPTH / 2 - 0.75 : TENT_DEPTH / 2 + 0.75;
        grpFloorDecal.position.set(grpCenterX, 0.24, grpDecalZ);
        grpFloorDecal.rotation.x = -Math.PI / 2;
        tentGroup.add(grpFloorDecal);

        // 4 Sub-Rows (R1, R2, R3, R4) along X
        for (let r = 1; r <= 4; r++) {
          const slotX = grpCenterX + (r - 2.5) * slotPitchX;

          // 7 Depth Columns (01 to 07) along Z
          for (let c = 1; c <= 7; c++) {
            // Note: In WMS, Col 01 is at the front (near central road), Col 07 is at the back wall
            const slotZ = tent.z > 0 
              ? -TENT_DEPTH / 2 + 1.2 + (c - 1) * slotPitchZ 
              : TENT_DEPTH / 2 - 1.2 - (c - 1) * slotPitchZ;

            const locator = `DA5T-${tent.id}-${String(g).padStart(2, '0')}-R${r}-${String(c).padStart(2, '0')}`;
            const item = a5ItemMap.get(`${tent.id}-${g}-${r}-${c}`) || a5ItemMap.get(locator);

            // World coordinates for raycasting and hologram snapping
            const worldX = tent.x + slotX;
            const worldY = 0.24;
            const worldZ = tent.z + slotZ;
            const slotWidth = 0.88;
            const slotDepth = 1.32;

            // Pallet Slot Outline Marker
            const slotOutline = new THREE.LineSegments(
              new THREE.EdgesGeometry(new THREE.BoxGeometry(slotWidth, 0.02, slotDepth)),
              new THREE.LineBasicMaterial({ color: 0x475569 })
            );
            slotOutline.position.set(slotX, 0.235, slotZ);
            tentGroup.add(slotOutline);

            if (item) {
              const isOverdue = item.agingDays > 45 || item.agingStatus === 'OVERDUE';
              const isAging = item.agingDays > 28;
              const boxMat = isOverdue ? overdueBoxMat : isAging ? agingBoxMat : occupiedBoxMat;
              const statusMode: 'EMPTY' | 'OCCUPIED' | 'AGING' | 'OVERDUE' = isOverdue ? 'OVERDUE' : isAging ? 'AGING' : 'OCCUPIED';

              const stackGroup = new THREE.Group();
              stackGroup.position.set(slotX, 0.24, slotZ);

              // Wood Pallet Base
              const base = new THREE.Mesh(new THREE.BoxGeometry(slotWidth - 0.08, 0.12, slotDepth - 0.08), palletBaseMat);
              base.position.y = 0.06;
              base.castShadow = true;
              stackGroup.add(base);

              // Cargo Box
              const boxHeight = 1.15;
              const box = new THREE.Mesh(new THREE.BoxGeometry(slotWidth - 0.12, boxHeight, slotDepth - 0.12), boxMat);
              box.position.y = 0.12 + boxHeight / 2;
              box.castShadow = true;
              box.receiveShadow = true;
              stackGroup.add(box);

              tentGroup.add(stackGroup);

              interactiveMeshes.push({
                mesh: stackGroup,
                tent: tent.id,
                grp: g,
                r,
                c,
                locator,
                item,
                x: worldX,
                y: worldY,
                z: worldZ,
                w: slotWidth,
                h: boxHeight + 0.15,
                d: slotDepth,
                statusMode
              });
            } else {
              // Empty Slot Invisible Hit Mesh for snappy raycasting
              const emptyHit = new THREE.Mesh(
                new THREE.BoxGeometry(slotWidth, 0.6, slotDepth),
                new THREE.MeshBasicMaterial({ visible: false })
              );
              emptyHit.position.set(slotX, 0.55, slotZ);
              tentGroup.add(emptyHit);

              interactiveMeshes.push({
                mesh: emptyHit,
                tent: tent.id,
                grp: g,
                r,
                c,
                locator,
                item: undefined,
                x: worldX,
                y: worldY,
                z: worldZ,
                w: slotWidth,
                h: 0.85,
                d: slotDepth,
                statusMode: 'EMPTY'
              });
            }
          }
        }
      }

      scene.add(tentGroup);
    });

    // =========================================================================
    // 8. REALISTIC INDUSTRIAL FORKLIFTS (Stationed in Central Logistics Way)
    // =========================================================================
    const forklift1 = createRealisticForklift(0, 0.0, 18, 0, 1.15);
    const forklift2 = createRealisticForklift(0, 0.0, -18, Math.PI, 1.15);
    const forklift3 = createRealisticForklift(34, 0.0, 0, -Math.PI / 2, 1.15);
    scene.add(forklift1, forklift2, forklift3);

    // =========================================================================
    // 9. 3D HOLOGRAPHIC GHOST BLOCK & LASER TARGET SYSTEM
    // =========================================================================
    const hologramGhost = createHologramGhostTarget(0.88, 1.15, 1.32);
    scene.add(hologramGhost.group);

    // Subtle Neon Edge Canopy Tent Bay Highlight
    const rackBayNeon = createRackBayNeonHighlight();
    scene.add(rackBayNeon.group);

    let currentEmissiveRestore: (() => void) | null = null;

    // =========================================================================
    // 10. RAYCASTER FOR HOVER & INTERACTION
    // =========================================================================
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObjects(interactiveMeshes.map(c => c.mesh), true);
      if (intersects.length > 0) {
        const hit = interactiveMeshes.find(c => 
          c.mesh === intersects[0].object || 
          intersects[0].object.parent === c.mesh || 
          intersects[0].object.parent?.parent === c.mesh
        );

        if (hit) {
          if (currentEmissiveRestore) {
            currentEmissiveRestore();
            currentEmissiveRestore = null;
          }
          currentEmissiveRestore = applyFaintEmissiveHighlight(hit.mesh, !!hit.item);

          // Snap Hologram Target
          hologramGhost.setPosition(hit.x, hit.y, hit.z);
          hologramGhost.setDimensions(hit.w, hit.h, hit.d);
          hologramGhost.setMode(hit.statusMode);
          hologramGhost.show();

          // Subtle Neon Edge on Tent Structure Components and slot bays
          const neonColor = hit.statusMode === 'OVERDUE' 
            ? 0xef4444 
            : hit.statusMode === 'AGING' 
            ? 0xf59e0b 
            : hit.statusMode === 'EMPTY' 
            ? 0x10b981 
            : 0x38bdf8;
          rackBayNeon.setBay(hit.x, hit.y, hit.z, hit.w, hit.h, hit.d, neonColor);
          rackBayNeon.show();

          setHoveredSlot({
            tent: hit.tent,
            grp: hit.grp,
            r: hit.r,
            c: hit.c,
            locator: hit.locator,
            item: hit.item,
            statusMode: hit.statusMode,
            posDetail: `A5 Tent ${hit.tent} &bull; กลุ่ม G0${hit.grp} &bull; แถว R${hit.r} &bull; ลึก C0${hit.c}`
          });
          renderer.domElement.style.cursor = 'pointer';
          return;
        }
      }

      hologramGhost.hide();
      rackBayNeon.hide();
      if (currentEmissiveRestore) {
        currentEmissiveRestore();
        currentEmissiveRestore = null;
      }
      setHoveredSlot(null);
      renderer.domElement.style.cursor = 'default';
    };

    const onClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObjects(interactiveMeshes.map(c => c.mesh), true);
      if (intersects.length > 0) {
        const hit = interactiveMeshes.find(c => 
          c.mesh === intersects[0].object || 
          intersects[0].object.parent === c.mesh || 
          intersects[0].object.parent?.parent === c.mesh
        );
        if (hit) {
          onSelectSlot(hit.tent, hit.grp, hit.r, hit.c, hit.item);
        }
      }
    };

    renderer.domElement.addEventListener('mousemove', onPointerMove);
    renderer.domElement.addEventListener('click', onClick);

    // Animation Loop
    const startTime = performance.now();
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const elapsedTime = (performance.now() - startTime) / 1000;

      controls.update();
      hologramGhost.updateAnimation(elapsedTime);
      rackBayNeon.update(elapsedTime);
      renderer.render(scene, camera);
    };
    animate();

    // Resize handler with ResizeObserver
    const onResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight || 600;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    const resizeObserver = new ResizeObserver(() => {
      onResize();
    });
    if (mountRef.current) {
      resizeObserver.observe(mountRef.current);
    }
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', onResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      renderer.domElement.removeEventListener('mousemove', onPointerMove);
      renderer.domElement.removeEventListener('click', onClick);
      if (currentEmissiveRestore) currentEmissiveRestore();
      rackBayNeon.dispose();
      renderer.dispose();
      container.innerHTML = '';
    };
  }, [a5ItemMap, roofMode]);

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-0 rounded-2xl overflow-hidden border border-slate-300 bg-[#f8fafc] shadow-2xl flex flex-col">
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className="w-full flex-1 min-h-[300px] cursor-grab active:cursor-grabbing" />

      {/* Top Floating Multi-Perspective Camera Focus Bar (Top Right) */}
      <div className="absolute top-3 right-3 pointer-events-auto z-20 flex items-center gap-1.5">
        {/* Roof Mode 3-Segment Selector Bar */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 p-1 rounded-xl shadow-lg flex items-center gap-1 shrink-0">
          <button
            onClick={() => setRoofMode('SOLID')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
              roofMode === 'SOLID' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="แสดงหลังคาแบบทึบเต็มหลังคา"
          >
            <Eye className="w-3 h-3 text-blue-200" />
            <span>หลังคา: ทึบ</span>
          </button>
          <button
            onClick={() => setRoofMode('TRANSLUCENT')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
              roofMode === 'TRANSLUCENT' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="แสดงหลังคาแบบใส มองทะลุเห็นสินค้า + โครงสร้างลดรายละเอียด"
          >
            <Eye className="w-3 h-3 text-cyan-200" />
            <span>หลังคา: ใส</span>
          </button>
          <button
            onClick={() => setRoofMode('HIDDEN')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
              roofMode === 'HIDDEN' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="ซ่อนหลังคาและโครงเหล็กหลังคาออกทั้งหมด เห็นผังสินค้าเต็มตา"
          >
            <EyeOff className="w-3 h-3 text-rose-200" />
            <span>หลังคา: ซ่อน</span>
          </button>
        </div>

        {/* View Preset Bar */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-1 shadow-lg flex items-center gap-1 max-w-full overflow-x-auto">
          <button
            onClick={() => handleCameraPreset('ALL_A5')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 shrink-0 ${
              cameraFocus === 'ALL_A5'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>ภาพรวม 45°</span>
          </button>

          <button
            onClick={() => handleCameraPreset('TOP_DOWN')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 shrink-0 ${
              cameraFocus === 'TOP_DOWN'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>แปลนบน 85°</span>
          </button>

          {[1, 2, 3, 4].map(t => (
            <button
              key={t}
              onClick={() => handleCameraPreset(`TENT_${t}` as any)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 shrink-0 ${
                cameraFocus === `TENT_${t}`
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>เต็นท์ {t}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3D Holographic Ghost HUD Target Tooltip */}
      {hoveredSlot && (
        <div className={`absolute bottom-4 left-4 backdrop-blur-md border rounded-2xl p-3.5 shadow-2xl z-30 max-w-sm pointer-events-none animate-fadeIn ${
          hoveredSlot.statusMode === 'EMPTY'
            ? 'bg-emerald-950/90 border-emerald-500/60 shadow-emerald-900/30'
            : hoveredSlot.statusMode === 'OVERDUE'
            ? 'bg-rose-950/90 border-rose-500/60 shadow-rose-900/30'
            : hoveredSlot.statusMode === 'AGING'
            ? 'bg-amber-950/90 border-amber-500/60 shadow-amber-900/30'
            : 'bg-slate-900/95 border-cyan-500/60 shadow-cyan-900/30'
        }`}>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full animate-ping ${
                hoveredSlot.statusMode === 'EMPTY' ? 'bg-emerald-400' :
                hoveredSlot.statusMode === 'OVERDUE' ? 'bg-rose-400' :
                hoveredSlot.statusMode === 'AGING' ? 'bg-amber-400' : 'bg-cyan-400'
              }`} />
              <span className="font-mono text-[11px] uppercase font-bold text-white tracking-wider">
                A5 CANOPY TENT #{hoveredSlot.tent}
              </span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
              hoveredSlot.statusMode === 'EMPTY'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : hoveredSlot.statusMode === 'OVERDUE'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : hoveredSlot.statusMode === 'AGING'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
            }`}>
              {hoveredSlot.statusMode === 'EMPTY' ? '● ช่องว่าง (READY)' : 
               hoveredSlot.statusMode === 'OVERDUE' ? '▲ OVERDUE > 45d' : 
               hoveredSlot.statusMode === 'AGING' ? '⚠ AGING > 28d' : '✓ มีสินค้า (STORED)'}
            </span>
          </div>

          <div className="text-sm font-mono font-black text-white mb-0.5 tracking-tight">
            {hoveredSlot.locator}
          </div>

          {hoveredSlot.posDetail && (
            <div className="text-[11px] font-mono text-slate-300 mb-1">
              {hoveredSlot.posDetail}
            </div>
          )}

          {hoveredSlot.item ? (
            <div className="space-y-0.5 text-slate-200">
              <p className="font-bold text-white truncate">{hoveredSlot.item.modelHE}</p>
              <p className="text-slate-400 text-xs truncate">{hoveredSlot.item.partName}</p>
              <div className="flex items-center gap-2 text-[10px] text-slate-300 pt-1 border-t border-slate-700/60 mt-1">
                <span>จำนวน: <strong className="text-white">{hoveredSlot.item.quantity}</strong> EA</span>
                <span>&bull;</span>
                <span className={hoveredSlot.item.agingDays > 28 ? 'text-amber-400 font-bold' : ''}>
                  Aging: {hoveredSlot.item.agingDays} วัน
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-300">
              ตำแหน่งว่างพร้อมรับเข้าสินค้า (เต็นท์ {hoveredSlot.tent} กลุ่ม G0{hoveredSlot.grp} แถว R{hoveredSlot.r} ช่อง {hoveredSlot.c})
            </div>
          )}

          <div className="mt-2 pt-2 border-t border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400">
            <span className="text-cyan-300 font-medium">🎯 Holographic Laser Target Lock</span>
            <span className="text-white font-bold">คลิกเพื่อเปิดจัดการ</span>
          </div>
        </div>
      )}
    </div>
  );
};
