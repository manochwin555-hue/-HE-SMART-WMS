import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { InventoryItem, MovementType, ShelfLevel, StorageZone } from '../../types';
import { createRackBayNeonHighlight, applyFaintEmissiveHighlight } from './neonEdgeHighlight';
import { 
  RotateCcw, 
  Maximize2, 
  Minimize2, 
  Layers, 
  Info, 
  Search, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Box,
  Sun,
  Sparkles
} from 'lucide-react';

interface A2FlowRail3DViewProps {
  items: InventoryItem[];
  searchQuery?: string;
  onSelectSlot: (railNum: number, posNum: number, item?: InventoryItem) => void;
  onOpenScanner?: (zone: StorageZone, bay: number, level: ShelfLevel, mode: MovementType) => void;
}

export const A2FlowRail3DView: React.FC<A2FlowRail3DViewProps> = ({
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

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [selectedSlot, setSelectedSlot] = useState<{ rail: number; pos: number; item?: InventoryItem } | null>(null);
  const [cameraFocus, setCameraFocus] = useState<'OVERVIEW' | 'TOP' | 'OUTFEED'>('OUTFEED');
  const [railFilter, setRailFilter] = useState<'ALL' | 'TOP' | 'BOTTOM'>('ALL');
  const [hoveredInfo, setHoveredInfo] = useState<{ rail: number; pos: number; item?: InventoryItem } | null>(null);

  // Smooth camera fly-to function
  const flyCameraTo = (targetPos: THREE.Vector3, lookAtTarget: THREE.Vector3, duration = 850) => {
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

  // Camera Presets calibrated to fill viewport perfectly
  const setCameraView = (view: 'OVERVIEW' | 'TOP' | 'OUTFEED') => {
    setCameraFocus(view);
    if (!cameraRef.current || !controlsRef.current) return;

    if (view === 'OVERVIEW') {
      // 45° Elevated isometric overview of all 16 rails - calibrated to fill the canvas
      flyCameraTo(new THREE.Vector3(0, 39, 47), new THREE.Vector3(0, 0, 0));
    } else if (view === 'TOP') {
      // Top 85° Blueprint view looking straight down at the 16 rails layout - spans full layout
      flyCameraTo(new THREE.Vector3(0, 49, 0.05), new THREE.Vector3(0, 0, 0));
    } else if (view === 'OUTFEED') {
      // Stand at outfeed (First-Out) - elevated and widened so all 16 rails R01-R16 fit full-width across frame without clipping
      flyCameraTo(new THREE.Vector3(-38, 19, 0), new THREE.Vector3(1.5, 0, 0));
    }
  };

  // Filter items matching DA2D-1 (16 rails x 8 positions = 128 pallets)
  const slotItemMap = useMemo(() => {
    const map = new Map<string, InventoryItem>();
    items.forEach(it => {
      // Check if it belongs to A2
      let rail = 0;
      let pos = 0;

      const match = it.locatorCode?.match(/DA2D-1-R(?:0)?(\d+)-(?:0)?(\d+)/i);
      if (match) {
        rail = parseInt(match[1], 10);
        pos = parseInt(match[2], 10);
      } else if (it.zone && (it.zone.startsWith('R') || it.zone.startsWith('FR'))) {
        const num = parseInt(it.zone.replace(/\D/g, ''), 10);
        if (num >= 1 && num <= 16) {
          rail = num;
          pos = it.bayNumber || 1;
        }
      }

      if (rail >= 1 && rail <= 16 && pos >= 1 && pos <= 8) {
        map.set(`${rail}-${pos}`, it);
      }
    });
    return map;
  }, [items]);

  // Three.js Scene Setup
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight || 520;

    // Bright Studio Theme Scene Setup (User mandated bright theme across all 3D layouts)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f8fafc');
    scene.fog = new THREE.FogExp2('#f8fafc', 0.007);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 500);
    camera.position.set(-34, 18, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.minDistance = 8;
    controls.maxDistance = 140;
    controls.target.set(1.5, 0, 0);
    controlsRef.current = controls;

    // Lights (Crisp, High Contrast Studio Bright Lighting)
    const ambientLight = new THREE.AmbientLight('#ffffff', 1.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight('#ffffff', 2.2);
    dirLight.position.set(25, 40, 25);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 100;
    dirLight.shadow.camera.left = -30;
    dirLight.shadow.camera.right = 30;
    dirLight.shadow.camera.top = 30;
    dirLight.shadow.camera.bottom = -30;
    scene.add(dirLight);

    const cyanLight = new THREE.DirectionalLight('#94a3b8', 0.75);
    cyanLight.position.set(-25, 20, -20);
    scene.add(cyanLight);

    // Floor Concrete Slab with Industrial Epoxy Finish
    const floorGeo = new THREE.BoxGeometry(42, 0.4, 46);
    const floorMat = new THREE.MeshStandardMaterial({ 
      color: '#e2e8f0', 
      roughness: 0.6, 
      metalness: 0.1 
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Grid on floor
    const grid = new THREE.GridHelper(44, 22, '#94a3b8', '#cbd5e1');
    grid.position.y = 0.01;
    scene.add(grid);

    // Click Raycaster
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const clickableMeshes: { 
      mesh: THREE.Mesh; 
      rail: number; 
      pos: number; 
      x: number; 
      y: number; 
      z: number; 
      item?: InventoryItem;
      palletMesh?: THREE.Object3D;
    }[] = [];

    // Subtle Neon Edge Rail Bay Highlight
    const rackBayNeon = createRackBayNeonHighlight();
    scene.add(rackBayNeon.group);

    let currentEmissiveRestore: (() => void) | null = null;

    // =========================================================================
    // 3D HOLOGRAPHIC GHOST BLOCK PREVIEW (ร่างบล็อกจำลองเรืองแสงเมื่อชี้เมาส์)
    // =========================================================================
    const hoverGhostGroup = new THREE.Group();
    hoverGhostGroup.visible = false;
    scene.add(hoverGhostGroup);

    // A. Ghost Box Body (Translucent Glowing Mesh)
    const ghostBoxMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.45,
      roughness: 0.1,
      metalness: 0.8,
      emissive: 0x059669,
      emissiveIntensity: 0.7
    });
    const ghostBox = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.96, 1.38), ghostBoxMat);
    ghostBox.position.y = 0.52;
    hoverGhostGroup.add(ghostBox);

    // B. Neon Glowing Wireframe Cage
    const ghostWireGeo = new THREE.BoxGeometry(1.64, 1.04, 1.44);
    const ghostWireMat = new THREE.MeshBasicMaterial({ color: 0x34d399, wireframe: true });
    const ghostWire = new THREE.Mesh(ghostWireGeo, ghostWireMat);
    ghostWire.position.y = 0.52;
    hoverGhostGroup.add(ghostWire);

    // C. 4 Glowing Corner Laser Pins
    const pinMat = new THREE.MeshBasicMaterial({ color: 0x6ee7b7 });
    [
      [-0.8, -0.7],
      [0.8, -0.7],
      [-0.8, 0.7],
      [0.8, 0.7]
    ].forEach(([cx, cz]) => {
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.4, 8), pinMat);
      pin.position.set(cx, 0.52, cz);
      hoverGhostGroup.add(pin);

      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), pinMat);
      dot.position.set(cx, 1.24, cz);
      hoverGhostGroup.add(dot);
    });

    // D. Floor Spotlight Target Ring
    const floorRingMat = new THREE.MeshBasicMaterial({ color: 0x34d399, side: THREE.DoubleSide });
    const floorRing = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.95, 32), floorRingMat);
    floorRing.rotation.x = -Math.PI / 2;
    floorRing.position.y = -0.45;
    hoverGhostGroup.add(floorRing);

    // Helper: Create a canvas text texture for Rail / Station Signs
    const createSignTexture = (text: string, bgColor: string, textColor: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = bgColor;
        ctx.roundRect(8, 8, 496, 240, 28);
        ctx.fill();
        ctx.lineWidth = 10;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        ctx.fillStyle = textColor;
        ctx.font = '900 110px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 256, 128);
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.anisotropy = 8;
      tex.needsUpdate = true;
      return tex;
    };

    // Helper: Create Large Engraved Floor Decal Texture (คมชัด ตัวใหญ่พิเศษ ทั้งด้าน In และ Out)
    const createFloorDecalTexture = (railNum: number, side: 'OUTFEED' | 'INFEED') => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const isOutfeed = side === 'OUTFEED';
        const mainColor = isOutfeed ? '#f59e0b' : '#10b981'; // Amber for Outfeed (หน้าไลน์), Emerald for Infeed (รับเข้า)
        const textLabel = `R${String(railNum).padStart(2, '0')}`;
        const subLabel = isOutfeed ? 'OUT (หน้าไลน์ HE)' : 'IN (จุดรับเข้า)';

        // Outer Industrial Warning Border
        ctx.fillStyle = mainColor;
        ctx.fillRect(0, 0, 512, 256);

        // High-contrast white border
        ctx.lineWidth = 14;
        ctx.strokeStyle = '#ffffff';
        ctx.strokeRect(8, 8, 496, 240);

        // Dark industrial background
        ctx.fillStyle = '#090d16';
        ctx.fillRect(20, 20, 472, 216);

        // Big, Ultra-Bold Rail Name (e.g. R01 - R14)
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 124px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(textLabel, 256, 100);

        // Clear Subtitle Badge
        ctx.fillStyle = mainColor;
        ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif';
        ctx.fillText(subLabel, 256, 185);
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.anisotropy = 8;
      tex.needsUpdate = true;
      return tex;
    };

    // Helper: Create FIFO Directional Arrow Texture
    const createArrowTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'transparent';
        ctx.clearRect(0, 0, 256, 64);
        
        // Draw 3 yellow/cyan chevrons pointing LEFT (FIFO Outfeed)
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
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.needsUpdate = true;
      return tex;
    };
    const arrowTexture = createArrowTexture();

    // Materials
    const railSteelBlue = new THREE.MeshStandardMaterial({ color: '#1d4ed8', metalness: 0.8, roughness: 0.3 }); // Structural Safety Blue
    const railGuideOrange = new THREE.MeshStandardMaterial({ color: '#ea580c', metalness: 0.6, roughness: 0.4 }); // Safety Orange Guide
    const rollerGalvanized = new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.9, roughness: 0.15 }); // Galvanized Steel Roller
    const stopperHazardMat = new THREE.MeshStandardMaterial({ color: '#eab308', metalness: 0.7, roughness: 0.3 }); // Yellow Stopper
    const stopperBlackMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.6 }); // Black Buffer Pad
    const infeedGreenMat = new THREE.MeshStandardMaterial({ color: '#10b981', metalness: 0.6, roughness: 0.4 }); // Infeed Guide
    const floorLineYellow = new THREE.MeshBasicMaterial({ color: '#eab308' }); // Yellow Demarcation Line
    const floorLineWhite = new THREE.MeshBasicMaterial({ color: '#94a3b8' }); // Block Divider Line
    const blockMarkMat = new THREE.MeshBasicMaterial({ color: '#0284c7', wireframe: true }); // Slot Marker Wireframe
    const arrowMat = new THREE.MeshBasicMaterial({ map: arrowTexture, transparent: true, opacity: 0.95 });
    
    // Pallet & Cargo Materials
    const woodPine = new THREE.MeshStandardMaterial({ color: '#bfa079', roughness: 0.85, metalness: 0.05 });
    const boxNormalBlue = new THREE.MeshStandardMaterial({ color: '#2563eb', roughness: 0.45, metalness: 0.2 });
    const boxAgingAmber = new THREE.MeshStandardMaterial({ color: '#d97706', roughness: 0.4, metalness: 0.25 });
    const boxOverdueRed = new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.4, metalness: 0.3 });
    const boxSearchMatch = new THREE.MeshStandardMaterial({ color: '#06b6d4', roughness: 0.3, metalness: 0.5, emissive: '#0891b2', emissiveIntensity: 0.4 });

    // Invisible Hit Box Geometry
    const hitboxGeo = new THREE.BoxGeometry(2.3, 1.4, 2.0);
    const hitboxMat = new THREE.MeshBasicMaterial({ visible: false });

    // =========================================================================
    // BUILD 14 CONTINUOUS FLOW RAILS (DA2D-1 R01 to R14)
    // 8 Pallet Blocks along each rail (Pos 1: Infeed at Right +X -> Pos 8: Outfeed at Left -X)
    // =========================================================================
    const railsGroup = new THREE.Group();
    const RAIL_SPACING_Z = 2.6; // Spacing between each rail track
    const POS_SPACING_X = 2.45; // Spacing between each of the 8 pallet blocks
    const SLOPE_Y_PER_POS = 0.07; // 7cm gravity slope drop per position toward outfeed

    // Floor demarcation lanes & flow indicators
    const floorDecoGroup = new THREE.Group();
    scene.add(floorDecoGroup);

    // Infeed Zone (+X = +12.5)
    const infeedZoneGeo = new THREE.BoxGeometry(2.8, 0.02, 44.0);
    const infeedZoneMat = new THREE.MeshStandardMaterial({ 
      color: '#10b981', 
      roughness: 0.7 
    });
    const infeedZone = new THREE.Mesh(infeedZoneGeo, infeedZoneMat);
    infeedZone.position.set(12.4, 0.01, 0);
    floorDecoGroup.add(infeedZone);

    // Outfeed Zone (-X = -12.5)
    const outfeedZoneGeo = new THREE.BoxGeometry(2.8, 0.02, 44.0);
    const outfeedZoneMat = new THREE.MeshStandardMaterial({ 
      color: '#f59e0b', 
      roughness: 0.7 
    });
    const outfeedZone = new THREE.Mesh(outfeedZoneGeo, outfeedZoneMat);
    outfeedZone.position.set(-12.4, 0.01, 0);
    floorDecoGroup.add(outfeedZone);

    for (let r = 1; r <= 16; r++) {
      // ORDERING: R1 is in FRONT (+Z = +19.5) -> R16 is in BACK (-Z = -19.5)
      const zPos = (8.5 - r) * RAIL_SPACING_Z;
      const rLabel = `R${String(r).padStart(2, '0')}`;

      // 1. Large Engraved Floor Decal at Outfeed (Left side - Front of Line / First-Out)
      const outfeedDecalMat = new THREE.MeshBasicMaterial({
        map: createFloorDecalTexture(r, 'OUTFEED'),
        side: THREE.DoubleSide
      });
      const outfeedFloorDecal = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.4), outfeedDecalMat);
      outfeedFloorDecal.position.set(-12.4, 0.028, zPos);
      outfeedFloorDecal.rotation.x = -Math.PI / 2;
      outfeedFloorDecal.rotation.z = -Math.PI / 2;
      floorDecoGroup.add(outfeedFloorDecal);

      // 2. Large Engraved Floor Decal at Infeed (Right side - Infeed / First-In)
      const infeedDecalMat = new THREE.MeshBasicMaterial({
        map: createFloorDecalTexture(r, 'INFEED'),
        side: THREE.DoubleSide
      });
      const infeedFloorDecal = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.4), infeedDecalMat);
      infeedFloorDecal.position.set(12.4, 0.028, zPos);
      infeedFloorDecal.rotation.x = -Math.PI / 2;
      infeedFloorDecal.rotation.z = Math.PI / 2;
      floorDecoGroup.add(infeedFloorDecal);

      // Rail Sign Plate at Infeed (Right side)
      const infeedSignMat = new THREE.MeshBasicMaterial({ 
        map: createSignTexture(rLabel, '#0f172a', '#38bdf8'), 
        side: THREE.DoubleSide 
      });
      const infeedSign = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.55), infeedSignMat);
      infeedSign.position.set(11.2, 1.25 + (7 * SLOPE_Y_PER_POS), zPos);
      infeedSign.rotation.y = Math.PI / 2;
      railsGroup.add(infeedSign);

      // Rail Sign Plate at Outfeed (Left side)
      const outfeedSignMat = new THREE.MeshBasicMaterial({ 
        map: createSignTexture(rLabel, '#0f172a', '#f59e0b'), 
        side: THREE.DoubleSide 
      });
      const outfeedSign = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.55), outfeedSignMat);
      outfeedSign.position.set(-11.2, 1.25, zPos);
      outfeedSign.rotation.y = -Math.PI / 2;
      railsGroup.add(outfeedSign);

      // 1. Floor Marking Lines for Rail Lane (Yellow border)
      const laneLineGeo = new THREE.BoxGeometry(21.5, 0.01, 0.06);
      const laneLineTop = new THREE.Mesh(laneLineGeo, floorLineYellow);
      laneLineTop.position.set(0, 0.02, zPos + (RAIL_SPACING_Z / 2) - 0.1);
      const laneLineBtm = new THREE.Mesh(laneLineGeo, floorLineYellow);
      laneLineBtm.position.set(0, 0.02, zPos - (RAIL_SPACING_Z / 2) + 0.1);
      floorDecoGroup.add(laneLineTop, laneLineBtm);

      // Flow Direction Arrow Plane on floor between rails
      const flowArrowMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 0.8), arrowMat);
      flowArrowMesh.rotation.x = -Math.PI / 2;
      flowArrowMesh.position.set(0, 0.025, zPos);
      floorDecoGroup.add(flowArrowMesh);

      // 2. Heavy-Duty Side Channel Guide Rails (Double Rails: Left & Right)
      const trackLength = 8 * POS_SPACING_X + 0.6; // ~20.2m long continuous bed
      const channelGeo = new THREE.BoxGeometry(trackLength, 0.18, 0.08);

      const leftChannel = new THREE.Mesh(channelGeo, railSteelBlue);
      leftChannel.position.set(0, 0.85 + (3.5 * SLOPE_Y_PER_POS), zPos - 0.95);
      leftChannel.rotation.z = Math.atan2(-7 * SLOPE_Y_PER_POS, trackLength);
      leftChannel.castShadow = true;

      const rightChannel = new THREE.Mesh(channelGeo, railSteelBlue);
      rightChannel.position.set(0, 0.85 + (3.5 * SLOPE_Y_PER_POS), zPos + 0.95);
      rightChannel.rotation.z = Math.atan2(-7 * SLOPE_Y_PER_POS, trackLength);
      rightChannel.castShadow = true;

      // Safety Orange Top Guide Flanges (ขอบกั้นประคองพาเลท)
      const flangeGeo = new THREE.BoxGeometry(trackLength, 0.05, 0.04);
      const leftFlange = new THREE.Mesh(flangeGeo, railGuideOrange);
      leftFlange.position.set(0, 0.96 + (3.5 * SLOPE_Y_PER_POS), zPos - 0.95);
      leftFlange.rotation.z = leftChannel.rotation.z;

      const rightFlange = new THREE.Mesh(flangeGeo, railGuideOrange);
      rightFlange.position.set(0, 0.96 + (3.5 * SLOPE_Y_PER_POS), zPos + 0.95);
      rightFlange.rotation.z = rightChannel.rotation.z;

      railsGroup.add(leftChannel, rightChannel, leftFlange, rightFlange);

      // 3. Structural Support Legs & Cross Beams (Every 2 Pallet Blocks)
      [-9.8, -4.9, 0, 4.9, 9.8].forEach((xLeg) => {
        const legBaseH = 0.65 + ((9.8 - xLeg) * (SLOPE_Y_PER_POS / POS_SPACING_X));
        
        // Post Left & Post Right
        const postL = new THREE.Mesh(new THREE.BoxGeometry(0.1, legBaseH, 0.1), railSteelBlue);
        postL.position.set(xLeg, legBaseH / 2, zPos - 0.95);
        const postR = new THREE.Mesh(new THREE.BoxGeometry(0.1, legBaseH, 0.1), railSteelBlue);
        postR.position.set(xLeg, legBaseH / 2, zPos + 0.95);

        // Footplates
        const footL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 0.2), railSteelBlue);
        footL.position.set(xLeg, 0.01, zPos - 0.95);
        const footR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 0.2), railSteelBlue);
        footR.position.set(xLeg, 0.01, zPos + 0.95);

        // Horizontal cross tie
        const crossTie = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.9), railSteelBlue);
        crossTie.position.set(xLeg, legBaseH * 0.7, zPos);

        railsGroup.add(postL, postR, footL, footR, crossTie);
      });

      // 4. Gravity Skate Wheels & Rollers (High Density across 8 Blocks)
      const numRollers = 32;
      for (let ro = 0; ro < numRollers; ro++) {
        const xRol = 9.8 - (ro * (19.6 / (numRollers - 1)));
        const yRol = 0.85 + ((9.8 - xRol) * (SLOPE_Y_PER_POS / POS_SPACING_X));
        
        // Dual Skate Wheel lines (Left Track and Right Track)
        const rollerL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.35, 12), rollerGalvanized);
        rollerL.rotation.x = Math.PI / 2;
        rollerL.position.set(xRol, yRol, zPos - 0.55);
        
        const rollerR = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.35, 12), rollerGalvanized);
        rollerR.rotation.x = Math.PI / 2;
        rollerR.position.set(xRol, yRol, zPos + 0.55);

        const axleCenter = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.8, 8), rollerGalvanized);
        axleCenter.rotation.x = Math.PI / 2;
        axleCenter.position.set(xRol, yRol, zPos);

        railsGroup.add(rollerL, rollerR, axleCenter);
      }

      // 5. Infeed Entry Guides (ฝั่งขวา +X = +10.2, Pos 1)
      const infeedGuideL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.08), infeedGreenMat);
      infeedGuideL.position.set(10.2, 0.92 + (7 * SLOPE_Y_PER_POS), zPos - 1.1);
      infeedGuideL.rotation.y = -Math.PI / 6;

      const infeedGuideR = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.08), infeedGreenMat);
      infeedGuideR.position.set(10.2, 0.92 + (7 * SLOPE_Y_PER_POS), zPos + 1.1);
      infeedGuideR.rotation.y = Math.PI / 6;

      railsGroup.add(infeedGuideL, infeedGuideR);

      // 6. Outfeed Heavy-Duty End Stopper (ฝั่งซ้าย -X = -10.2, Pos 8)
      const stopperBase = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.55, 1.95), stopperHazardMat);
      stopperBase.position.set(-10.15, 0.9, zPos);
      
      const rubberBufferL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.4), stopperBlackMat);
      rubberBufferL.position.set(-10.05, 0.95, zPos - 0.55);
      const rubberBufferR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.4), stopperBlackMat);
      rubberBufferR.position.set(-10.05, 0.95, zPos + 0.55);

      railsGroup.add(stopperBase, rubberBufferL, rubberBufferR);

      // =======================================================================
      // 8 DISTINCT PALLET BLOCKS / POSITIONS (BLOCK 1 TO BLOCK 8)
      // Pos 1 = Infeed (+8.6m) -> Pos 8 = Outfeed (-8.6m)
      // =======================================================================
      for (let p = 1; p <= 8; p++) {
        const xPos = 8.6 - ((p - 1) * POS_SPACING_X);
        const yPos = 0.88 + ((8 - p) * SLOPE_Y_PER_POS);

        // Floor block divider mark (เส้นคั่น 8 บล็อก)
        const blockDivider = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.015, 1.8), floorLineWhite);
        blockDivider.position.set(xPos + (POS_SPACING_X / 2), 0.02, zPos);
        floorDecoGroup.add(blockDivider);

        const item = slotItemMap.get(`${r}-${p}`);

        if (item) {
          // Check search match
          const isSearchMatch = Boolean(
            searchQuery && (
              item.modelHE?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              item.partName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              item.palletId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              item.partNumber?.toLowerCase().includes(searchQuery.toLowerCase())
            )
          );

          let currentBoxMat = boxNormalBlue;
          if (isSearchMatch) currentBoxMat = boxSearchMatch;
          else if (item.agingDays > 45 || item.agingStatus === 'OVERDUE') currentBoxMat = boxOverdueRed;
          else if (item.agingDays > 28 || item.agingStatus === 'WARNING') currentBoxMat = boxAgingAmber;

          // Pallet + Box Group
          const palletGrp = new THREE.Group();
          palletGrp.position.set(xPos, yPos, zPos);

          // Realistic Pine Wood Pallet (Top boards + 3 runners)
          const topDeck = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 1.4), woodPine);
          topDeck.position.y = 0.08;
          topDeck.castShadow = true;
          palletGrp.add(topDeck);

          const runner1 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.12), woodPine);
          runner1.position.set(0, 0.03, 0.6);
          const runner2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.12), woodPine);
          runner2.position.set(0, 0.03, 0);
          const runner3 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.12), woodPine);
          runner3.position.set(0, 0.03, -0.6);
          palletGrp.add(runner1, runner2, runner3);

          // Loaded Cargo Unit Box (1,000 Kgs / 1 Pallet)
          const cargoBox = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.95, 1.35), currentBoxMat);
          cargoBox.position.y = 0.58;
          cargoBox.castShadow = true;
          palletGrp.add(cargoBox);

          // White Barcode Shipping Label on side
          const labelGeo = new THREE.PlaneGeometry(0.35, 0.2);
          const labelMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
          const label = new THREE.Mesh(labelGeo, labelMat);
          label.position.set(0, 0.58, 0.68);
          palletGrp.add(label);

          railsGroup.add(palletGrp);
        } else {
          // Empty designated block slot wireframe & interaction zone
          const emptySlotGeo = new THREE.BoxGeometry(1.8, 0.05, 1.5);
          const emptyMesh = new THREE.Mesh(emptySlotGeo, blockMarkMat);
          emptyMesh.position.set(xPos, yPos + 0.03, zPos);
          railsGroup.add(emptyMesh);
        }

        // Invisible Hit Box for 100% reliable raycasting
        const hitBox = new THREE.Mesh(hitboxGeo, hitboxMat);
        hitBox.position.set(xPos, yPos + 0.5, zPos);
        railsGroup.add(hitBox);
        clickableMeshes.push({ 
          mesh: hitBox, 
          rail: r, 
          pos: p, 
          x: xPos, 
          y: yPos, 
          z: zPos, 
          item,
          palletMesh: railsGroup.children[railsGroup.children.length - 2] // The palletGrp or emptyMesh just added
        });
      }
    }

    scene.add(railsGroup);

    // Click handler on canvas
    const handleCanvasClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObjects(clickableMeshes.map(c => c.mesh));

      if (intersects.length > 0) {
        const hit = clickableMeshes.find(c => c.mesh === intersects[0].object);
        if (hit) {
          setSelectedSlot({ rail: hit.rail, pos: hit.pos, item: hit.item });
          onSelectSlot(hit.rail, hit.pos, hit.item);
        }
      }
    };

    const handleCanvasMouseMove = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObjects(clickableMeshes.map(c => c.mesh));

      if (intersects.length > 0) {
        const hit = clickableMeshes.find(c => c.mesh === intersects[0].object);
        if (hit) {
          setHoveredInfo({ rail: hit.rail, pos: hit.pos, item: hit.item });
          renderer.domElement.style.cursor = 'pointer';

          // Position 3D Hologram Ghost Box directly on target slot
          hoverGhostGroup.position.set(hit.x, hit.y, hit.z);
          hoverGhostGroup.visible = true;

          const statusMode = hit.item
            ? (hit.item.agingDays > 45 || hit.item.agingStatus === 'OVERDUE' ? 'OVERDUE' : hit.item.agingDays > 28 || hit.item.agingStatus === 'WARNING' ? 'AGING' : 'OCCUPIED')
            : 'EMPTY';

          // Adapt ghost colors based on slot occupancy
          if (hit.item) {
            ghostBoxMat.color.setHex(statusMode === 'OVERDUE' ? 0xef4444 : statusMode === 'AGING' ? 0xf59e0b : 0x0284c7);
            ghostBoxMat.emissive.setHex(statusMode === 'OVERDUE' ? 0x991b1b : statusMode === 'AGING' ? 0xb45309 : 0x0369a1);
            ghostWireMat.color.setHex(statusMode === 'OVERDUE' ? 0xf87171 : statusMode === 'AGING' ? 0xfbbf24 : 0x38bdf8);
            pinMat.color.setHex(statusMode === 'OVERDUE' ? 0xfca5a5 : statusMode === 'AGING' ? 0xfde68a : 0x7dd3fc);
            floorRingMat.color.setHex(statusMode === 'OVERDUE' ? 0xef4444 : statusMode === 'AGING' ? 0xf59e0b : 0x38bdf8);
          } else {
            // Empty slot: Vibrant Emerald Infeed target mode
            ghostBoxMat.color.setHex(0x10b981);
            ghostBoxMat.emissive.setHex(0x059669);
            ghostWireMat.color.setHex(0x34d399);
            pinMat.color.setHex(0x6ee7b7);
            floorRingMat.color.setHex(0x34d399);
          }

          // Subtle Neon Edge Rail Bay Highlight
          const neonColor = statusMode === 'OVERDUE'
            ? 0xef4444
            : statusMode === 'AGING'
            ? 0xf59e0b
            : statusMode === 'EMPTY'
            ? 0x10b981
            : 0x38bdf8;
          rackBayNeon.setBay(hit.x, hit.y, hit.z, 2.0, 1.1, 1.8, neonColor);
          rackBayNeon.show();

          return;
        }
      }
      setHoveredInfo(null);
      hoverGhostGroup.visible = false;
      rackBayNeon.hide();
      if (currentEmissiveRestore) {
        currentEmissiveRestore();
        currentEmissiveRestore = null;
      }
      renderer.domElement.style.cursor = 'default';
    };

    renderer.domElement.addEventListener('click', handleCanvasClick);
    renderer.domElement.addEventListener('mousemove', handleCanvasMouseMove);

    // Animation Loop
    let animationFrameId: number;
    const startTime = performance.now();
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = (performance.now() - startTime) / 1000;

      // Pulse ghost block & rotate floor target ring for intuitive visual guidance
      if (hoverGhostGroup.visible) {
        const pulse = 1.0 + Math.sin(elapsedTime * 6) * 0.025;
        ghostBox.scale.set(pulse, pulse, pulse);
        ghostWire.scale.set(pulse, pulse, pulse);
        floorRing.rotation.z += 0.02;
      }

      // Update neon highlight pulse
      rackBayNeon.update(elapsedTime);

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize handler with ResizeObserver
    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight || 520;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    if (mountRef.current) {
      resizeObserver.observe(mountRef.current);
    }
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.domElement.removeEventListener('click', handleCanvasClick);
      renderer.domElement.removeEventListener('mousemove', handleCanvasMouseMove);
      if (currentEmissiveRestore) {
        currentEmissiveRestore();
      }
      rackBayNeon.dispose();
      renderer.dispose();
      container.innerHTML = '';
    };
  }, [slotItemMap, searchQuery]);

  const stats = useMemo(() => {
    const total = 16 * 8; // 128
    const occupied = slotItemMap.size;
    const rate = Math.round((occupied / total) * 100);
    return { total, occupied, rate };
  }, [slotItemMap]);

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-0 rounded-2xl overflow-hidden border shadow-2xl transition-colors duration-300 border-slate-300 bg-[#f8fafc] flex flex-col">
      {/* 3D Canvas Mount */}
      <div ref={mountRef} className="w-full flex-1 h-full min-h-[300px]" />

      {/* Top Floating Telemetry Header (Top Left) & Camera Focus Bar (Top Right) */}
      <div className="absolute top-3 left-3 pointer-events-auto z-20 max-w-[55%] hidden md:block">
        <div className="backdrop-blur-md px-3.5 py-2 rounded-xl shadow-md flex items-center gap-2.5 border bg-white/95 border-slate-300 text-slate-900">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs shrink-0">
            <Box className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-xs font-black text-slate-900 truncate">
                DA2D-1 Flow Rail 3D Digital Twin
              </h2>
              <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300 text-[10px] font-mono font-bold shrink-0">
                128 PL
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-600 truncate mt-0.5">
              จัดเก็บ: <span className="font-bold text-blue-900">{stats.occupied}/{stats.total} PL ({stats.rate}%)</span>
            </p>
          </div>
        </div>
      </div>

      {/* Multi-Perspective Camera Toolbar (Top Right) */}
      <div className="absolute top-3 right-3 pointer-events-auto z-20">
        <div className="flex items-center gap-1 backdrop-blur-md p-1 rounded-xl shadow-lg border bg-slate-900/90 border-slate-800">
          <button
            onClick={() => setCameraView('OVERVIEW')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 shrink-0 ${
              cameraFocus === 'OVERVIEW'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="มุมมองเฉียงรวม 45°"
          >
            <span>ภาพรวม 45°</span>
          </button>

          <button
            onClick={() => setCameraView('TOP')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 shrink-0 ${
              cameraFocus === 'TOP'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="มุมมองแบบแปลนด้านบน 85°"
          >
            <span>แปลนบน 85°</span>
          </button>

          <button
            onClick={() => setCameraView('OUTFEED')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 shrink-0 ${
              cameraFocus === 'OUTFEED'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="มุมมองหน้าไลน์จ่ายออก"
          >
            <span>หน้าไลน์</span>
          </button>
        </div>
      </div>

      {/* Bottom Floating Info Pill */}
      {hoveredInfo && (
        <div className="absolute bottom-4 left-4 bg-slate-900/95 backdrop-blur-md border border-cyan-500/50 px-4 py-3 rounded-xl shadow-2xl text-xs max-w-md pointer-events-none animate-fadeIn ring-1 ring-cyan-500/30">
          <div className="flex items-center justify-between gap-3 mb-1.5 pb-1 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-cyan-300 text-sm">
                DA2D-1 &bull; R{hoveredInfo.rail}-0{hoveredInfo.pos}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                (รางที่ {hoveredInfo.rail} &bull; บล็อกที่ {hoveredInfo.pos})
              </span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
              hoveredInfo.item
                ? 'bg-blue-950 text-cyan-300 border border-cyan-700/60'
                : 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${hoveredInfo.item ? 'bg-cyan-400 animate-pulse' : 'bg-emerald-400'}`} />
              {hoveredInfo.item ? 'มีสินค้าในบล็อก' : 'ช่องว่าง (พร้อมรับเข้า)'}
            </span>
          </div>

          {hoveredInfo.item ? (
            <div className="space-y-1 text-slate-300">
              <div className="flex items-center justify-between">
                <p className="font-bold text-white text-sm truncate">{hoveredInfo.item.modelHE}</p>
                <span className="text-[10px] font-mono text-slate-400">PL: {hoveredInfo.item.palletId}</span>
              </div>
              <p className="text-slate-400 truncate text-[11px]">{hoveredInfo.item.partName}</p>
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                <span>จำนวน: <strong className="text-white">{hoveredInfo.item.quantity}</strong> EA</span>
                <span>Lot: <strong className="text-slate-200">{hoveredInfo.item.lotNo || '-'}</strong></span>
                <span className={hoveredInfo.item.agingDays > 30 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                  Aging: {hoveredInfo.item.agingDays} วัน
                </span>
              </div>
              <div className="mt-1.5 pt-1.5 bg-blue-950/50 border border-blue-800/50 rounded-lg px-2.5 py-1 text-[11px] text-cyan-300 flex items-center justify-between">
                <span>🎯 คลิกช่องนี้เพื่อ <strong className="text-white underline">เบิกจ่าย / ตรวจสอบข้อมูล</strong></span>
                <span className="text-[10px] text-amber-300 font-bold font-mono">
                  {hoveredInfo.pos === 8 ? '⚡ หน้าไลน์ Outfeed' : `FIFO ขั้น ${hoveredInfo.pos}`}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <p className="text-slate-300 text-[11px]">
                บล็อกรางไหลว่าง สามารถรับเข้าสินค้าพาเลทใหม่เข้าสู่ระบบได้
              </p>
              <div className="bg-emerald-950/50 border border-emerald-700/50 rounded-lg px-2.5 py-1 text-[11px] text-emerald-300 flex items-center justify-between">
                <span>✨ คลิกช่องนี้เพื่อ <strong className="text-white underline">บันทึกรับเข้าสินค้า (Infeed)</strong></span>
                <span className="text-[10px] text-emerald-300 font-bold font-mono">
                  {hoveredInfo.pos === 1 ? '📥 จุดรับเข้าหลัก Pos 1' : `ช่อง Pos ${hoveredInfo.pos}`}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
