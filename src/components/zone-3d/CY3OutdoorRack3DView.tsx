import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { InventoryItem, MovementType, ShelfLevel, StorageZone } from '../../types';
import { createRealisticForklift } from './forkliftModel';
import { createHologramGhostTarget } from './hologramGhost';
import { createRackBayNeonHighlight, applyFaintEmissiveHighlight } from './neonEdgeHighlight';
import { CameraControlOverlay } from './CameraControlOverlay';

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

  const [activePreset, setActivePreset] = useState<'ALL' | 'TOP_DOWN' | 'ROW_A' | 'ROW_B' | 'ROW_C' | 'ROW_D'>('ALL');
  const rowGroupsRef = useRef<Record<'A' | 'B' | 'C' | 'D', THREE.Group>>({} as any);
  const [hoveredSlot, setHoveredSlot] = useState<{ row: 'A' | 'B' | 'C' | 'D'; bay: number; lvl: ShelfLevel; locator: string; item?: InventoryItem } | null>(null);

  // Map CY3 items: 4 rows x 25 bays x 4 levels x 2 positions (P1, P2)
  const cy3ItemMap = useMemo(() => {
    const map = new Map<string, InventoryItem>();
    items.forEach(it => {
      if (!it || typeof it.quantity !== 'number' || it.quantity <= 0) return;

      const locUpper = (it.locatorCode || '').toUpperCase();
      const zoneUpper = (String(it.zone || '')).toUpperCase();
      const facId = (it.facilityId || '').toUpperCase();

      if (!locUpper.includes('DY3T') && !zoneUpper.startsWith('CY3') && facId !== 'FAC-CY3-TENT') {
        return;
      }

      let r: 'A' | 'B' | 'C' | 'D' = 'A';
      if (locUpper.includes('DY3T-1.01')) r = 'A';
      else if (locUpper.includes('DY3T-1.02')) r = 'B';
      else if (locUpper.includes('DY3T-1.03')) r = 'C';
      else if (locUpper.includes('DY3T-1.04')) r = 'D';
      else if (zoneUpper === 'CY3-A' || zoneUpper === 'A') r = 'A';
      else if (zoneUpper === 'CY3-B' || zoneUpper === 'B') r = 'B';
      else if (zoneUpper === 'CY3-C' || zoneUpper === 'C') r = 'C';
      else if (zoneUpper === 'CY3-D' || zoneUpper === 'D') r = 'D';

      let b = it.bayNumber || 1;
      let l: ShelfLevel = it.level || 1;

      const m = locUpper.match(/DY3T-1\.0[1-4]-(?:[A-D])?0*(\d+)-L(\d)(?:-P([12]))?/i);
      let pos = it.palletPosition || 'P1';
      if (m) {
        b = parseInt(m[1], 10);
        l = parseInt(m[2], 10) as ShelfLevel;
        if (m[3]) pos = `P${m[3]}`;
      } else if (locUpper.includes('-P2')) {
        pos = 'P2';
      }

      map.set(`${r}-${b}-${l}-${pos}`, it);
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
      sprite.scale.set(2, 1, 1);
      return sprite;
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
      
      const rowDecalMat = new THREE.MeshBasicMaterial({
        map: createRackHeadDecalTexture(rConfig.code, rConfig.sign, rowColor),
        side: THREE.DoubleSide
      });

      // Overhead End-Frame 3D Sign Plate
      const leftSignPlate = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.0), rowDecalMat);
      leftSignPlate.position.set(-30.1, 4.0, rConfig.z);
      leftSignPlate.rotation.y = -Math.PI / 2;
      rowGroup.add(leftSignPlate);

      const rightSignPlate = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.0), rowDecalMat);
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

          // Yellow Base Guards on every upright post of every bay
          const guard = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.55, 0.2), guardMat);
          guard.position.set(px, 0.28, pz);
          rowGroup.add(guard);
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

          // Add floating bay label above L4 (only once per bay)
          if (l === 4) {
            const label = createBayLabelSprite(`${rConfig.code}-${String(b).padStart(2, '0')}`);
            label.position.set(xPos, RACK_HEIGHT + 0.5, rConfig.z);
            rowGroup.add(label);
          }

          const locator = `${rConfig.sign}-${rConfig.code}${String(b).padStart(2, '0')}-L${l}`;
          const item = cy3ItemMap.get(`${rConfig.code}-${b}-${l}`);
          const palletOffsetsX = [-0.55, 0.55];

          palletOffsetsX.forEach((xOff, pIdx) => {
            const pPos: 'P1' | 'P2' = pIdx === 0 ? 'P1' : 'P2';
            const palletLocator = `${locator}-${pPos}`;
            const palletItem = cy3ItemMap.get(`${rConfig.code}-${b}-${l}-${pPos}`);

            if (palletItem) {
              const isAging = palletItem.agingDays > 28;
              const isOverdue = palletItem.agingDays > 45 || palletItem.agingStatus === 'OVERDUE';
              const boxMat = isOverdue ? overdueBoxMat : isAging ? agingBoxMat : normalBoxMat;
              const statusMode: 'EMPTY' | 'OCCUPIED' | 'AGING' | 'OVERDUE' = isOverdue ? 'OVERDUE' : isAging ? 'AGING' : 'OCCUPIED';

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
                locator: palletLocator, 
                item: palletItem,
                x: xPos + xOff,
                y: yPos + (l === 1 ? 0.0 : 0.05),
                z: rConfig.z,
                w: 0.95,
                h: 0.95,
                d: RACK_DEPTH - 0.1,
                statusMode
              });
            } else {
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
                locator: palletLocator, 
                item: undefined,
                x: xPos + xOff,
                y: yPos + (l === 1 ? 0.0 : 0.05),
                z: rConfig.z,
                w: 0.95,
                h: 0.95,
                d: RACK_DEPTH - 0.1,
                statusMode: 'EMPTY'
              });
            }
          });
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
          if (e.detail === 2 && onOpenScanner) {
            const cy3Zone = `CY3-${hit.row}` as StorageZone;
            const pPos = hit.locator.includes('-P2') ? 'P2' : 'P1';
            onOpenScanner(cy3Zone, hit.bay, hit.lvl, hit.item ? 'OUT' : 'IN', hit.locator, pPos, hit.item || null);
          } else {
            onSelectSlot(hit.row, hit.bay, hit.locator, hit.lvl, hit.item);
          }
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
  }, [cy3ItemMap]);

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
      // Focus on Row A (z = -12) - perspective front view
      flyCameraTo(new THREE.Vector3(-5, 5, 35), new THREE.Vector3(0, 2.5, -12));
    } else if (preset === 'ROW_B') {
      // Focus on Row B (z = -4.5) - perspective front view
      flyCameraTo(new THREE.Vector3(-5, 5, 42.5), new THREE.Vector3(0, 2.5, -4.5));
    } else if (preset === 'ROW_C') {
      // Focus on Row C (z = +4.5) - perspective front view
      flyCameraTo(new THREE.Vector3(-5, 5, 51.5), new THREE.Vector3(0, 2.5, 4.5));
    } else if (preset === 'ROW_D') {
      // Focus on Row D (z = +12) - perspective front view
      flyCameraTo(new THREE.Vector3(-5, 5, 59), new THREE.Vector3(0, 2.5, 12));
    }
  };

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
    } else if (!zoomIn && dist < 160) {
      cam.position.addScaledVector(dir, -0.2);
    }
  };

  const handleReset = () => {
    setCameraPreset('ALL');
  };

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-0 rounded-2xl overflow-hidden border border-slate-300 bg-[#f8fafc] shadow-2xl flex flex-col">
      <div ref={mountRef} className="w-full flex-1 h-full min-h-[300px]" />

      {/* Unified Camera Navigation Control Overlay (D-Pad + Presets) */}
      <CameraControlOverlay
        onPan={handlePan}
        onZoom={handleZoom}
        onReset={handleReset}
        onPreset={(presetKey) => setCameraPreset(presetKey as any)}
        activePreset={activePreset}
        presets={[
          { key: 'ALL', label: 'ภาพรวม 45°' },
          { key: 'TOP_DOWN', label: 'แปลนบน 85°' },
          { key: 'ROW_A', label: 'แถว A' },
          { key: 'ROW_B', label: 'แถว B' },
          { key: 'ROW_C', label: 'แถว C' },
          { key: 'ROW_D', label: 'แถว D' }
        ]}
      />

      {/* Hover Info */}
      {hoveredSlot && (
        <div className="absolute bottom-4 left-4 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl p-3.5 shadow-2xl w-64 text-xs pointer-events-none animate-fadeIn">
          {/* Row 1: Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700">
            <span className="font-bold text-slate-300 truncate">โซน CY3 (แถว {hoveredSlot.row})</span>
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${hoveredSlot.item ? 'bg-cyan-500/20 text-cyan-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
              {hoveredSlot.item ? '✓ มีสินค้า (STORED)' : '○ ช่องว่าง (READY)'}
            </span>
          </div>
          
          {/* Row 2: Locator */}
          <div className="font-mono font-black text-amber-300 text-sm mb-1">{hoveredSlot.locator}</div>
          
          {/* Row 3: Part No & Name */}
          <div className="text-white font-bold mb-0.5 truncate">{hoveredSlot.item ? hoveredSlot.item.modelHE : '-'}</div>
          <div className="text-slate-400 mb-2 truncate">{hoveredSlot.item ? hoveredSlot.item.partName : '-'}</div>
          
          {/* Row 4: Metrics */}
          <div className="flex justify-between text-slate-300 font-mono text-[11px] mb-2.5">
            <span>จำนวน: <b className="text-white">{hoveredSlot.item ? hoveredSlot.item.quantity.toLocaleString() : 0}</b></span>
            <span className={hoveredSlot.item && hoveredSlot.item.agingDays > 30 ? 'text-rose-400' : 'text-slate-300'}>
              Aging: {hoveredSlot.item ? `${hoveredSlot.item.agingDays} วัน` : '-'}
            </span>
          </div>
          
          {/* Footer Hint */}
          <div className="pt-2 border-t border-slate-700 text-[10px] text-slate-500 text-center">
            คลิกเพื่อเปิดรายละเอียด & รับเข้า/เบิกออก
          </div>
        </div>
      )}
    </div>
  );
};
