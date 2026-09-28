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
  Maximize2, 
  Minimize2, 
  Truck, 
  Box, 
  CheckCircle2, 
  AlertTriangle,
  Sun,
  Sparkles
} from 'lucide-react';

interface CY3OutdoorRack3DViewProps {
  items: InventoryItem[];
  searchQuery?: string;
  onSelectSlot: (rowCode: 'A' | 'B' | 'C' | 'D', bay: number, locator: string, level: ShelfLevel, item?: InventoryItem) => void;
  onOpenScanner?: (zone: StorageZone, bay: number, level: ShelfLevel, mode: MovementType) => void;
}

export const CY3OutdoorRack3DView: React.FC<CY3OutdoorRack3DViewProps> = ({
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

  // Level filter & Hovered slot
  const [activeLevelFilter, setActiveLevelFilter] = useState<'ALL' | 1 | 2 | 3 | 4>('ALL');
  const [activePreset, setActivePreset] = useState<'ALL' | 'TOP_DOWN' | 'ROW_A' | 'ROW_B' | 'ROW_C' | 'ROW_D'>('ALL');
  const rowGroupsRef = useRef<Record<'A' | 'B' | 'C' | 'D', THREE.Group>>({} as any);
  const [hoveredSlot, setHoveredSlot] = useState<{ row: 'A' | 'B' | 'C' | 'D'; bay: number; lvl: ShelfLevel; locator: string; item?: InventoryItem } | null>(null);

  // Map CY3 items: 4 rows x 25 bays x 4 levels = 400 slots
  const cy3ItemMap = useMemo(() => {
    const map = new Map<string, InventoryItem>();
    items.forEach(it => {
      let r: 'A' | 'B' | 'C' | 'D' = 'A';
      let b = it.bayNumber || 1;
      let l: ShelfLevel = it.level || 1;

      if (it.zone === 'CY3-A' || it.zone === 'A') r = 'A';
      else if (it.zone === 'CY3-B' || it.zone === 'B') r = 'B';
      else if (it.zone === 'CY3-C' || it.zone === 'C') r = 'C';
      else if (it.zone === 'CY3-D' || it.zone === 'D') r = 'D';

      const m = it.locatorCode?.match(/DY3T-1\.0([1-4])-(?:[A-D])?0?(\d+)-L(\d)/i);
      if (m) {
        const num = parseInt(m[1], 10);
        r = num === 1 ? 'A' : num === 2 ? 'B' : num === 3 ? 'C' : 'D';
        b = parseInt(m[2], 10);
        l = parseInt(m[3], 10) as ShelfLevel;
      }

      map.set(`${r}-${b}-${l}`, it);
    });
    return map;
  }, [items]);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight || 540;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f8fafc');
    scene.fog = new THREE.FogExp2('#f8fafc', 0.007);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 500);
    camera.position.set(0, 30, 46);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    controls.minDistance = 8;
    controls.maxDistance = 160;
    controls.target.set(0, 2.5, 0);
    controlsRef.current = controls;

    // Lights (Bright Studio Daylighting)
    const ambientLight = new THREE.AmbientLight('#ffffff', 1.75);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight('#ffffff', 2.1);
    dirLight.position.set(30, 50, 40);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Asphalt Outdoor Ground (Clean Light Concrete Finish)
    const groundGeo = new THREE.BoxGeometry(70, 0.4, 48);
    const groundMat = new THREE.MeshStandardMaterial({ 
      color: '#e2e8f0', 
      roughness: 0.95, 
      metalness: 0.1 
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = -0.2;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(60, 20, '#94a3b8', '#cbd5e1');
    grid.position.y = 0.01;
    scene.add(grid);

    // Forklift Road between Row B and Row C (Z = 0)
    const roadGeo = new THREE.PlaneGeometry(68, 5.5);
    const roadMat = new THREE.MeshStandardMaterial({ 
      color: '#f1f5f9', 
      roughness: 0.9 
    });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.02, 0);
    scene.add(road);

    // Yellow road side stripes
    [-2.75, 2.75].forEach(z => {
      const line = new THREE.Mesh(
        new THREE.PlaneGeometry(68, 0.15),
        new THREE.MeshBasicMaterial({ color: '#eab308' })
      );
      line.rotation.x = -Math.PI / 2;
      line.position.set(0, 0.03, z);
      scene.add(line);
    });

    // Click Raycaster
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const clickableMeshes: { 
      mesh: THREE.Object3D; 
      row: 'A' | 'B' | 'C' | 'D'; 
      bay: number; 
      lvl: ShelfLevel; 
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
    const uprightMat = new THREE.MeshStandardMaterial({ color: '#1d4ed8', roughness: 0.25, metalness: 0.85 }); // Industrial Safety Blue
    const bracingMat = new THREE.MeshStandardMaterial({ color: '#60a5fa', roughness: 0.3, metalness: 0.8 }); // Steel Blue Bracing
    const beamMat = new THREE.MeshStandardMaterial({ color: '#ea580c', roughness: 0.3, metalness: 0.65 }); // Safety Orange Beams
    const guardMat = new THREE.MeshStandardMaterial({ color: '#eab308', roughness: 0.3 }); // Yellow Base Guards
    const palletBaseMat = new THREE.MeshStandardMaterial({ color: '#bfa079', roughness: 0.85 }); // Pine Wood
    const normalBoxMat = new THREE.MeshStandardMaterial({ color: '#2563eb', roughness: 0.6 });
    const agingBoxMat = new THREE.MeshStandardMaterial({ color: '#d97706', roughness: 0.5 });
    const overdueBoxMat = new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.5 });

    // Helper: Create Large Rack Head Decal Texture (สำหรับหัวแถว แร็ค A, B, C, D)
    const createRackHeadDecalTexture = (rowName: string, signCode: string, color: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (ctx) {
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

        // Main Title (e.g. แถว A / แถว B)
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 84px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`แร็ค ${rowName}`, 256, 85);

        // Subtitle (e.g. DY3T-1.01 • 100 PL)
        ctx.fillStyle = color;
        ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif';
        ctx.fillText(`${signCode} (25 ช่อง x 4 ชั้น)`, 256, 175);
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.anisotropy = 8;
      tex.needsUpdate = true;
      return tex;
    };

    // Helper: Create Bay Slot Number Floor Texture (ตัวเลขเสา/ช่อง 01-25 สลักบนพื้น)
    const createBayNumberDecalTexture = (rowCode: string, bayNum: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 256, 128);

        ctx.lineWidth = 6;
        ctx.strokeStyle = '#facc15'; // Safety Yellow
        ctx.strokeRect(4, 4, 248, 120);

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 56px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${rowCode}${String(bayNum).padStart(2, '0')}`, 128, 50);

        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
        ctx.fillText(`ช่อง ${String(bayNum).padStart(2, '0')}`, 128, 98);
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.anisotropy = 8;
      tex.needsUpdate = true;
      return tex;
    };

    // Helper: Add diagonal & horizontal steel bracing on a side frame
    const addSideBracingAtX = (group: THREE.Group, xPos: number, zCenter: number, depth = 1.2, height = 5.6) => {
      const numPanels = 4;
      const panelH = height / numPanels;
      for (let p = 0; p < numPanels; p++) {
        const yBottom = p * panelH;
        const yTop = (p + 1) * panelH;

        // Horizontal tie
        const hTie = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, depth), bracingMat);
        hTie.position.set(xPos, yBottom + 0.05, zCenter);
        group.add(hTie);

        // Diagonal brace
        const diagLen = Math.sqrt(depth * depth + panelH * panelH);
        const diagAngle = Math.atan2(panelH, depth);
        const diagMesh = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, diagLen), bracingMat);
        diagMesh.position.set(xPos, (yBottom + yTop) / 2, zCenter);
        diagMesh.rotation.x = p % 2 === 0 ? diagAngle : -diagAngle;
        group.add(diagMesh);
      }
      const topTie = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, depth), bracingMat);
      topTie.position.set(xPos, height - 0.05, zCenter);
      group.add(topTie);
    };

    // 4 Rows Configuration:
    // Row A: Z = -12
    // Row B: Z = -4.5
    // [Road Z = 0]
    // Row C: Z = 4.5
    // Row D: Z = 12
    const ROWS_CONFIG: { code: 'A' | 'B' | 'C' | 'D'; z: number; sign: string }[] = [
      { code: 'A', z: -12, sign: 'DY3T-1.01' },
      { code: 'B', z: -4.5, sign: 'DY3T-1.02' },
      { code: 'C', z: 4.5, sign: 'DY3T-1.03' },
      { code: 'D', z: 12, sign: 'DY3T-1.04' },
    ];

    const BAY_COUNT = 25;
    const BAY_WIDTH = 2.4; // 2.4m width along X (fits 2 pallets side-by-side)
    const RACK_DEPTH = 1.2; // 1.2m depth along Z
    const RACK_HEIGHT = 5.6;

    const racksGroup = new THREE.Group();

    ROWS_CONFIG.forEach(rConfig => {
      const rowGroup = new THREE.Group();
      rowGroupsRef.current[rConfig.code] = rowGroup;
      racksGroup.add(rowGroup);

      const rowColor = rConfig.code === 'A' ? '#3b82f6' : rConfig.code === 'B' ? '#10b981' : rConfig.code === 'C' ? '#f59e0b' : '#8b5cf6';
      
      // 1. Large Engraved Floor Decal at Left End of Row (x = -32.5)
      const leftDecalMat = new THREE.MeshBasicMaterial({
        map: createRackHeadDecalTexture(rConfig.code, rConfig.sign, rowColor),
        side: THREE.DoubleSide
      });
      const leftFloorDecal = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.8), leftDecalMat);
      leftFloorDecal.position.set(-32.5, 0.03, rConfig.z);
      leftFloorDecal.rotation.x = -Math.PI / 2;
      rowGroup.add(leftFloorDecal);

      // 2. Large Engraved Floor Decal at Right End of Row (x = 32.5)
      const rightDecalMat = new THREE.MeshBasicMaterial({
        map: createRackHeadDecalTexture(rConfig.code, rConfig.sign, rowColor),
        side: THREE.DoubleSide
      });
      const rightFloorDecal = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.8), rightDecalMat);
      rightFloorDecal.position.set(32.5, 0.03, rConfig.z);
      rightFloorDecal.rotation.x = -Math.PI / 2;
      rowGroup.add(rightFloorDecal);

      // 3. Overhead End-Frame 3D Sign Plate
      const leftSignPlate = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.0), leftDecalMat);
      leftSignPlate.position.set(-30.1, 4.0, rConfig.z);
      leftSignPlate.rotation.y = -Math.PI / 2;
      rowGroup.add(leftSignPlate);

      const rightSignPlate = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.0), rightDecalMat);
      rightSignPlate.position.set(30.1, 4.0, rConfig.z);
      rightSignPlate.rotation.y = Math.PI / 2;
      rowGroup.add(rightSignPlate);

      // 25 bays per row
      for (let b = 1; b <= BAY_COUNT; b++) {
        const xPos = (b - 13) * BAY_WIDTH;
        const xLeft = xPos - BAY_WIDTH / 2;
        const xRight = xPos + BAY_WIDTH / 2;
        const zFront = rConfig.z + RACK_DEPTH / 2;
        const zRear = rConfig.z - RACK_DEPTH / 2;

        // Floor Bay Slot Number Marking (สลักตัวเลขหัวช่องบนพื้นฝั่งด้านนอกแถว ไม่ทับใต้แร็ค)
        let zAisleFloor = 0;
        if (rConfig.code === 'A') {
          zAisleFloor = rConfig.z - 1.35; // Outside North Aisle (z = -7.35)
        } else if (rConfig.code === 'B') {
          zAisleFloor = rConfig.z + 1.15; // Central Roadway North Edge (z = -0.85)
        } else if (rConfig.code === 'C') {
          zAisleFloor = rConfig.z - 1.15; // Central Roadway South Edge (z = 0.85)
        } else {
          zAisleFloor = rConfig.z + 1.35; // Outside South Aisle (z = 7.35)
        }

        const bayFloorDecalMat = new THREE.MeshBasicMaterial({
          map: createBayNumberDecalTexture(rConfig.code, b),
          side: THREE.DoubleSide
        });
        const bayFloorDecal = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 0.65), bayFloorDecalMat);
        bayFloorDecal.position.set(xPos, 0.025, zAisleFloor);
        bayFloorDecal.rotation.x = -Math.PI / 2;
        rowGroup.add(bayFloorDecal);

        // 4 Upright Support Posts (Front-Left, Front-Right, Rear-Left, Rear-Right)
        const posts = [
          [xLeft, zFront],
          [xLeft, zRear],
          [xRight, zFront],
          [xRight, zRear]
        ];

        posts.forEach(([px, pz]) => {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, RACK_HEIGHT, 0.1), uprightMat);
          post.position.set(px, RACK_HEIGHT / 2, pz);
          rowGroup.add(post);

          // Footplate
          const foot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 0.18), uprightMat);
          foot.position.set(px, 0.01, pz);
          rowGroup.add(foot);

          // Yellow Base Guards at ends
          if (b === 1 || b === BAY_COUNT) {
            const guard = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.55, 0.2), guardMat);
            guard.position.set(px, 0.28, pz);
            rowGroup.add(guard);
          }
        });

        // Add Side Diagonal Steel Bracing on Left and Right end frames
        addSideBracingAtX(rowGroup, xLeft, rConfig.z, RACK_DEPTH, RACK_HEIGHT);
        if (b === BAY_COUNT) {
          addSideBracingAtX(rowGroup, xRight, rConfig.z, RACK_DEPTH, RACK_HEIGHT);
        }

        // 4 Levels (L1 Ground, L2-L4 Orange Beams)
        const levelYPositions: { [key: number]: number } = {
          1: 0.0,   // Ground Floor
          2: 1.45,  // Beam Level 2
          3: 2.85,  // Beam Level 3
          4: 4.25   // Beam Level 4
        };

        for (let l = 1; l <= 4; l++) {
          if (activeLevelFilter !== 'ALL' && activeLevelFilter !== l) continue;

          const yPos = levelYPositions[l];

          // For L2, L3, L4: Orange Load Beams (Front & Rear)
          if (l > 1) {
            const beamFront = new THREE.Mesh(new THREE.BoxGeometry(BAY_WIDTH - 0.05, 0.1, 0.08), beamMat);
            beamFront.position.set(xPos, yPos, zFront);
            const beamRear = new THREE.Mesh(new THREE.BoxGeometry(BAY_WIDTH - 0.05, 0.1, 0.08), beamMat);
            beamRear.position.set(xPos, yPos, zRear);
            rowGroup.add(beamFront, beamRear);

            // Cross support wires
            for (let w = -2; w <= 2; w++) {
              const wire = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, RACK_DEPTH - 0.05), bracingMat);
              wire.position.set(xPos + w * 0.45, yPos + 0.02, rConfig.z);
              rowGroup.add(wire);
            }
          }

          const locator = `${rConfig.sign}-${rConfig.code}${String(b).padStart(2, '0')}-L${l}`;
          const item = cy3ItemMap.get(`${rConfig.code}-${b}-${l}`);
          const palletOffsetsX = [-0.55, 0.55];

          if (item) {
            const isAging = item.agingDays > 28;
            const isOverdue = item.agingDays > 45 || item.agingStatus === 'OVERDUE';
            const boxMat = isOverdue ? overdueBoxMat : isAging ? agingBoxMat : normalBoxMat;
            const statusMode: 'EMPTY' | 'OCCUPIED' | 'AGING' | 'OVERDUE' = isOverdue ? 'OVERDUE' : isAging ? 'AGING' : 'OCCUPIED';

            // 2 Pallets side-by-side (Pallet 1 at xPos - 0.55, Pallet 2 at xPos + 0.55)
            palletOffsetsX.forEach((xOff, pIdx) => {
              const palletGrp = new THREE.Group();
              palletGrp.position.set(xPos + xOff, yPos + (l === 1 ? 0.0 : 0.05), rConfig.z);

              // Wood Pallet Base with 3 Runners
              const base = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.06, RACK_DEPTH - 0.1), palletBaseMat);
              base.position.y = 0.08;
              base.castShadow = true;
              palletGrp.add(base);

              const runner1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, RACK_DEPTH - 0.1), palletBaseMat);
              runner1.position.set(0.4, 0.03, 0);
              const runner2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, RACK_DEPTH - 0.1), palletBaseMat);
              runner2.position.set(0, 0.03, 0);
              const runner3 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, RACK_DEPTH - 0.1), palletBaseMat);
              runner3.position.set(-0.4, 0.03, 0);
              palletGrp.add(runner1, runner2, runner3);

              // Cargo Box (1,000 Kgs load)
              const box = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, RACK_DEPTH - 0.15), boxMat);
              box.position.y = 0.51;
              box.castShadow = true;
              palletGrp.add(box);

              rowGroup.add(palletGrp);
              clickableMeshes.push({ 
                mesh: palletGrp, 
                row: rConfig.code, 
                bay: b, 
                lvl: l as ShelfLevel, 
                locator: `${locator}-P${pIdx + 1}`, 
                item,
                x: xPos + xOff,
                y: yPos + (l === 1 ? 0.0 : 0.05),
                z: rConfig.z,
                w: 0.95,
                h: 0.95,
                d: RACK_DEPTH - 0.1,
                statusMode
              });
            });
          } else {
            palletOffsetsX.forEach((xOff, pIdx) => {
              const emptyHit = new THREE.Mesh(
                new THREE.BoxGeometry(0.95, 0.9, RACK_DEPTH - 0.1),
                new THREE.MeshBasicMaterial({ visible: false })
              );
              emptyHit.position.set(xPos + xOff, yPos + (l === 1 ? 0.45 : 0.5), rConfig.z);
              rowGroup.add(emptyHit);
              clickableMeshes.push({ 
                mesh: emptyHit, 
                row: rConfig.code, 
                bay: b, 
                lvl: l as ShelfLevel, 
                locator: `${locator}-P${pIdx + 1}`, 
                item: undefined,
                x: xPos + xOff,
                y: yPos + (l === 1 ? 0.0 : 0.05),
                z: rConfig.z,
                w: 0.95,
                h: 0.95,
                d: RACK_DEPTH - 0.1,
                statusMode: 'EMPTY'
              });
            });
          }
        }
      }
    });

    scene.add(racksGroup);

    // Realistic Forklifts in open roadway staging
    const forklift1 = createRealisticForklift(26, 0.0, 0, -Math.PI / 2, 1.05);
    const forklift2 = createRealisticForklift(-26, 0.0, 0, Math.PI / 2, 1.05);
    scene.add(forklift1, forklift2);

    // 3D Holographic Ghost Target
    const hologramGhost = createHologramGhostTarget(1.2, 0.9, 1.2);
    scene.add(hologramGhost.group);

    // Subtle Neon Edge Rack Bay Highlight for beams, posts, and shelf deck
    const rackBayNeon = createRackBayNeonHighlight();
    scene.add(rackBayNeon.group);

    let currentEmissiveRestore: (() => void) | null = null;

    const isObject3DVisible = (obj: THREE.Object3D | null): boolean => {
      let curr: THREE.Object3D | null = obj;
      while (curr) {
        if (curr.visible === false) return false;
        curr = curr.parent;
      }
      return true;
    };

    const onPointerMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      const visibleMeshes = clickableMeshes.filter(c => isObject3DVisible(c.mesh));
      const intersects = raycaster.intersectObjects(visibleMeshes.map(c => c.mesh), true);
      if (intersects.length > 0) {
        const hit = visibleMeshes.find(c => 
          c.mesh === intersects[0].object || 
          intersects[0].object.parent === c.mesh || 
          intersects[0].object.parent?.parent === c.mesh
        );
        if (hit) {
          hologramGhost.setPosition(hit.x, hit.y, hit.z);
          hologramGhost.setDimensions(hit.w, hit.h, hit.d);
          hologramGhost.setMode(hit.statusMode);
          hologramGhost.show();

          // Subtle Neon Edge on Rack Structure Components (beams, posts, deck)
          const neonColor = hit.statusMode === 'OVERDUE' 
            ? 0xef4444 
            : hit.statusMode === 'AGING' 
            ? 0xf59e0b 
            : hit.statusMode === 'EMPTY' 
            ? 0x10b981 
            : 0x38bdf8;
          rackBayNeon.setBay(hit.x, hit.y, hit.z, hit.w, hit.h, hit.d, neonColor);
          rackBayNeon.show();

          setHoveredSlot({ row: hit.row, bay: hit.bay, lvl: hit.lvl, locator: hit.locator, item: hit.item });
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

      const visibleMeshes = clickableMeshes.filter(c => isObject3DVisible(c.mesh));
      const intersects = raycaster.intersectObjects(visibleMeshes.map(c => c.mesh), true);
      if (intersects.length > 0) {
        const hit = visibleMeshes.find(c => 
          c.mesh === intersects[0].object || 
          intersects[0].object.parent === c.mesh || 
          intersects[0].object.parent?.parent === c.mesh
        );
        if (hit) {
          onSelectSlot(hit.row, hit.bay, hit.locator, hit.lvl, hit.item);
        }
      }
    };

    renderer.domElement.addEventListener('mousemove', onPointerMove);
    renderer.domElement.addEventListener('click', onClick);

    let reqId: number;
    const startTime = performance.now();
    const animate = () => {
      reqId = requestAnimationFrame(animate);
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
      const h = mountRef.current.clientHeight || 540;
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
      cancelAnimationFrame(reqId);
      renderer.domElement.removeEventListener('mousemove', onPointerMove);
      renderer.domElement.removeEventListener('click', onClick);
      if (currentEmissiveRestore) currentEmissiveRestore();
      rackBayNeon.dispose();
      renderer.dispose();
      container.innerHTML = '';
    };
  }, [cy3ItemMap, activeLevelFilter]);

  // Smooth lerp camera fly function
  const flyCameraTo = (targetPos: THREE.Vector3, targetLookAt: THREE.Vector3, duration = 850) => {
    if (!cameraRef.current || !controlsRef.current) return;
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;

    const startPos = cam.position.clone();
    const startLook = ctrl.target.clone();
    const startTime = performance.now();

    const animateTransition = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1.0);
      const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;

      cam.position.lerpVectors(startPos, targetPos, ease);
      ctrl.target.lerpVectors(startLook, targetLookAt, ease);
      ctrl.update();

      if (progress < 1.0) {
        requestAnimationFrame(animateTransition);
      }
    };
    requestAnimationFrame(animateTransition);
  };

  const setCameraPreset = (preset: 'ALL' | 'TOP_DOWN' | 'ROW_A' | 'ROW_B' | 'ROW_C' | 'ROW_D') => {
    setActivePreset(preset);

    // Toggle row visibility so non-selected rows are hidden
    if (rowGroupsRef.current) {
      const rows = rowGroupsRef.current;
      if (preset === 'ALL' || preset === 'TOP_DOWN') {
        if (rows['A']) rows['A'].visible = true;
        if (rows['B']) rows['B'].visible = true;
        if (rows['C']) rows['C'].visible = true;
        if (rows['D']) rows['D'].visible = true;
      } else if (preset === 'ROW_A') {
        if (rows['A']) rows['A'].visible = true;
        if (rows['B']) rows['B'].visible = false;
        if (rows['C']) rows['C'].visible = false;
        if (rows['D']) rows['D'].visible = false;
      } else if (preset === 'ROW_B') {
        if (rows['A']) rows['A'].visible = false;
        if (rows['B']) rows['B'].visible = true;
        if (rows['C']) rows['C'].visible = false;
        if (rows['D']) rows['D'].visible = false;
      } else if (preset === 'ROW_C') {
        if (rows['A']) rows['A'].visible = false;
        if (rows['B']) rows['B'].visible = false;
        if (rows['C']) rows['C'].visible = true;
        if (rows['D']) rows['D'].visible = false;
      } else if (preset === 'ROW_D') {
        if (rows['A']) rows['A'].visible = false;
        if (rows['B']) rows['B'].visible = false;
        if (rows['C']) rows['C'].visible = false;
        if (rows['D']) rows['D'].visible = true;
      }
    }

    if (preset === 'ALL') {
      // 45° Overview framing all 4 rows and all 25 bays fitting completely in frame without clipping
      flyCameraTo(new THREE.Vector3(0, 30, 46), new THREE.Vector3(0, 2.5, 0));
    } else if (preset === 'TOP_DOWN') {
      // 85° Top-down blueprint view scaled to fill frame nicely
      flyCameraTo(new THREE.Vector3(0, 52, 0.05), new THREE.Vector3(0, 0, 0));
    } else if (preset === 'ROW_A') {
      // Focus on Row A (z = -12) - distance adjusted so all 25 bays fit in frame
      flyCameraTo(new THREE.Vector3(0, 22, 22), new THREE.Vector3(0, 2.5, -12));
    } else if (preset === 'ROW_B') {
      // Focus on Row B (z = -4.5) - distance adjusted so all 25 bays fit in frame
      flyCameraTo(new THREE.Vector3(0, 22, 29.5), new THREE.Vector3(0, 2.5, -4.5));
    } else if (preset === 'ROW_C') {
      // Focus on Row C (z = +4.5) - distance adjusted so all 25 bays fit in frame
      flyCameraTo(new THREE.Vector3(0, 22, 38.5), new THREE.Vector3(0, 2.5, 4.5));
    } else if (preset === 'ROW_D') {
      // Focus on Row D (z = +12) - distance adjusted so all 25 bays fit in frame
      flyCameraTo(new THREE.Vector3(0, 22, 46), new THREE.Vector3(0, 2.5, 12));
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-0 rounded-2xl overflow-hidden border border-slate-300 bg-[#f8fafc] shadow-2xl flex flex-col">
      <div ref={mountRef} className="w-full flex-1 h-full min-h-[300px]" />

      {/* Floating Header (Top Left) */}
      <div className="absolute top-3 left-3 pointer-events-auto z-20 max-w-[45%] hidden md:block">
        <div className="bg-white/92 backdrop-blur-md border border-slate-200 px-3 py-1.5 rounded-xl shadow-md flex items-center gap-2.5 text-slate-800">
          <div className="w-7 h-7 rounded-lg bg-orange-600/20 border border-orange-500/40 flex items-center justify-center text-orange-600 shrink-0">
            <Box className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs font-black text-slate-900 truncate">CY3 Rack 3D</h2>
              <span className="px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-700 border border-orange-500/30 text-[10px] font-mono font-bold shrink-0">
                400 PL
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Row shortcuts & camera presets (Top Right) */}
      <div className="absolute top-3 right-3 pointer-events-auto z-20 flex items-center gap-1.5">
        {/* Level Filter */}
        <div className="flex items-center bg-slate-900/90 backdrop-blur-md p-1 rounded-xl text-[11px] font-bold border border-slate-800 shadow-lg">
          {(['ALL', 1, 2, 3, 4] as const).map(lvl => (
            <button
              key={lvl}
              onClick={() => setActiveLevelFilter(lvl)}
              className={`px-2 py-0.5 rounded-lg transition-all ${
                activeLevelFilter === lvl ? 'bg-orange-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              {lvl === 'ALL' ? 'ทุกชั้น' : `L${lvl}`}
            </button>
          ))}
        </div>

        {/* Camera View Presets Bar */}
        <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-1 rounded-xl shadow-lg max-w-full overflow-x-auto">
          <button
            onClick={() => setCameraPreset('ALL')}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all shrink-0 ${
              activePreset === 'ALL' ? 'bg-orange-600 text-white shadow-xs' : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            ภาพรวม 45°
          </button>
          <button
            onClick={() => setCameraPreset('TOP_DOWN')}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all shrink-0 ${
              activePreset === 'TOP_DOWN' ? 'bg-orange-600 text-white shadow-xs' : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            แปลนบน 85°
          </button>
          {(['ROW_A', 'ROW_B', 'ROW_C', 'ROW_D'] as const).map(rk => (
            <button
              key={rk}
              onClick={() => setCameraPreset(rk)}
              className={`px-2 py-1 text-[11px] font-bold rounded-lg transition-all shrink-0 ${
                activePreset === rk ? 'bg-orange-600 text-white shadow-xs' : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {rk.replace('ROW_', 'แถว ')}
            </button>
          ))}
        </div>
      </div>

      {/* Hover Info */}
      {hoveredSlot && (
        <div className="absolute bottom-4 left-4 bg-slate-900/95 backdrop-blur-md border border-cyan-500/60 px-3.5 py-2.5 rounded-2xl shadow-2xl text-xs max-w-sm pointer-events-none animate-fadeIn">
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full animate-ping ${hoveredSlot.item ? 'bg-cyan-400' : 'bg-emerald-400'}`} />
              <span className="font-mono font-bold text-cyan-300">{hoveredSlot.locator}</span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
              hoveredSlot.item ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            }`}>
              {hoveredSlot.item ? '✓ มีสินค้า (STORED)' : '● ช่องว่าง (READY)'}
            </span>
          </div>
          {hoveredSlot.item ? (
            <div className="space-y-0.5 text-slate-300">
              <p className="font-bold text-white truncate">{hoveredSlot.item.modelHE}</p>
              <p className="text-slate-400 truncate">{hoveredSlot.item.partName}</p>
              <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-1 border-t border-slate-800 mt-1">
                <span>จำนวน: <strong className="text-white">{hoveredSlot.item.quantity}</strong> EA</span>
                <span>&bull;</span>
                <span className={hoveredSlot.item.agingDays > 30 ? 'text-rose-400 font-bold' : ''}>
                  Aging: {hoveredSlot.item.agingDays} วัน
                </span>
              </div>
            </div>
          ) : (
            <p className="text-slate-400 text-[11px]">คลิกเพื่อรับเข้าสินค้า แถว {hoveredSlot.row} เสา {hoveredSlot.bay} ชั้น L{hoveredSlot.lvl}</p>
          )}
        </div>
      )}
    </div>
  );
};
