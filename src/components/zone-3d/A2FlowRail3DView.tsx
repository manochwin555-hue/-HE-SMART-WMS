import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { InventoryItem, MovementType, ShelfLevel, StorageZone } from '../../types';
import { createRackBayNeonHighlight } from './neonEdgeHighlight';
import { isA2InventoryItem } from '../../utils/zoneKpiHelper';

interface A2FlowRail3DViewProps {
  items: InventoryItem[];
  searchQuery?: string;
  onSelectSlot: (railNum: number, posNum: number, item?: InventoryItem) => void;
  onOpenScanner?: (zone: StorageZone, bay: number, level: ShelfLevel, mode: MovementType) => void;
}

interface PalletNode {
  rail: number;
  pos: number;
  x: number;
  y: number;
  z: number;
  palletGrp: THREE.Group;
  cargoBox: THREE.Mesh;
  emptyMesh: THREE.Mesh;
  hitBox: THREE.Mesh;
  item?: InventoryItem;
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
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  const palletNodesRef = useRef<Map<string, PalletNode>>(new Map());
  const onSelectSlotRef = useRef(onSelectSlot);
  onSelectSlotRef.current = onSelectSlot;

  const [selectedSlot, setSelectedSlot] = useState<{ rail: number; pos: number; item?: InventoryItem } | null>(null);
  const [cameraFocus, setCameraFocus] = useState<'OVERVIEW' | 'TOP' | 'OUTFEED'>('OUTFEED');
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

  // Camera Presets
  const setCameraView = (view: 'OVERVIEW' | 'TOP' | 'OUTFEED') => {
    setCameraFocus(view);
    if (!cameraRef.current || !controlsRef.current) return;

    if (view === 'OVERVIEW') {
      flyCameraTo(new THREE.Vector3(0, 39, 47), new THREE.Vector3(0, 0, 0));
    } else if (view === 'TOP') {
      flyCameraTo(new THREE.Vector3(0, 49, 0.05), new THREE.Vector3(0, 0, 0));
    } else if (view === 'OUTFEED') {
      flyCameraTo(new THREE.Vector3(-38, 19, 0), new THREE.Vector3(1.5, 0, 0));
    }
  };

  // Filter items matching DA2D-1 (13 rails x 8 positions = 104 pallets)
  const slotItemMap = useMemo(() => {
    const map = new Map<string, InventoryItem>();
    items.forEach(it => {
      if (!isA2InventoryItem(it)) return;

      let rail = 0;
      let pos = 0;

      const match = it.locatorCode?.match(/DA2D-1-R(?:0)?(\d+)-(?:0)?(\d+)/i);
      if (match) {
        rail = parseInt(match[1], 10);
        pos = parseInt(match[2], 10);
      } else if (it.zone && (it.zone.startsWith('R') || it.zone.startsWith('FR'))) {
        const num = parseInt(it.zone.replace(/\D/g, ''), 10);
        if (num >= 1 && num <= 13) {
          rail = num;
          pos = it.bayNumber || 1;
        }
      }

      if (rail >= 1 && rail <= 13 && pos >= 1 && pos <= 8) {
        map.set(`${rail}-${pos}`, it);
      }
    });
    return map;
  }, [items]);

  // =========================================================================
  // 1. INITIALIZE THREE.JS SCENE ONCE ON MOUNT (Decoupled from searchQuery)
  // =========================================================================
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight || 520;

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
    rendererRef.current = renderer;

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

    // Lights
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

    // Floor Slab
    const floorGeo = new THREE.BoxGeometry(42, 0.4, 38);
    const floorMat = new THREE.MeshStandardMaterial({ 
      color: '#e2e8f0', 
      roughness: 0.6, 
      metalness: 0.1 
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Grid
    const grid = new THREE.GridHelper(44, 22, '#94a3b8', '#cbd5e1');
    grid.position.y = 0.01;
    scene.add(grid);

    // Neon Edge Rail Bay Highlight
    const rackBayNeon = createRackBayNeonHighlight();
    scene.add(rackBayNeon.group);

    // Hover Hologram Ghost
    const hoverGhostGroup = new THREE.Group();
    hoverGhostGroup.visible = false;
    scene.add(hoverGhostGroup);

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
    ghostBox.position.y = 0.65;
    hoverGhostGroup.add(ghostBox);

    const ghostWireGeo = new THREE.BoxGeometry(1.64, 1.04, 1.44);
    const ghostWireMat = new THREE.MeshBasicMaterial({ color: 0x34d399, wireframe: true });
    const ghostWire = new THREE.Mesh(ghostWireGeo, ghostWireMat);
    ghostWire.position.y = 0.65;
    hoverGhostGroup.add(ghostWire);

    const pinMat = new THREE.MeshBasicMaterial({ color: 0x6ee7b7 });
    [
      [-0.8, -0.7],
      [0.8, -0.7],
      [-0.8, 0.7],
      [0.8, 0.7]
    ].forEach(([cx, cz]) => {
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.4, 8), pinMat);
      pin.position.set(cx, 0.65, cz);
      hoverGhostGroup.add(pin);

      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), pinMat);
      dot.position.set(cx, 1.35, cz);
      hoverGhostGroup.add(dot);
    });

    const floorRingMat = new THREE.MeshBasicMaterial({ color: 0x34d399, side: THREE.DoubleSide });
    const floorRing = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.95, 32), floorRingMat);
    floorRing.rotation.x = -Math.PI / 2;
    floorRing.position.y = 0.02;
    hoverGhostGroup.add(floorRing);

    // Helpers for canvas textures
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

    const createFloorDecalTexture = (railNum: number, side: 'OUTFEED' | 'INFEED') => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (ctx) {
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
        ctx.font = '900 124px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(textLabel, 256, 100);

        ctx.fillStyle = mainColor;
        ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif';
        ctx.fillText(subLabel, 256, 185);
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.anisotropy = 8;
      tex.needsUpdate = true;
      return tex;
    };

    const createArrowTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'transparent';
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
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.needsUpdate = true;
      return tex;
    };

    const arrowTexture = createArrowTexture();

    // Shared Structural Materials
    const railSteelBlue = new THREE.MeshStandardMaterial({ color: '#1d4ed8', metalness: 0.8, roughness: 0.3 });
    const railGuideOrange = new THREE.MeshStandardMaterial({ color: '#ea580c', metalness: 0.6, roughness: 0.4 });
    const rollerGalvanized = new THREE.MeshStandardMaterial({ color: '#94a3b8', metalness: 0.9, roughness: 0.15 });
    const stopperHazardMat = new THREE.MeshStandardMaterial({ color: '#eab308', metalness: 0.7, roughness: 0.3 });
    const stopperBlackMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.6 });
    const infeedGreenMat = new THREE.MeshStandardMaterial({ color: '#10b981', metalness: 0.6, roughness: 0.4 });
    const floorLineYellow = new THREE.MeshBasicMaterial({ color: '#eab308' });
    const floorLineWhite = new THREE.MeshBasicMaterial({ color: '#94a3b8' });
    const blockMarkMat = new THREE.MeshBasicMaterial({ color: '#0284c7', wireframe: true });
    const arrowMat = new THREE.MeshBasicMaterial({ map: arrowTexture, transparent: true, opacity: 0.95 });
    const woodPine = new THREE.MeshStandardMaterial({ color: '#bfa079', roughness: 0.85, metalness: 0.05 });

    const hitboxGeo = new THREE.BoxGeometry(2.3, 1.4, 2.0);
    const hitboxMat = new THREE.MeshBasicMaterial({ visible: false });

    // Rail dimensions
    const railsGroup = new THREE.Group();
    const RAIL_SPACING_Z = 2.6;
    const POS_SPACING_X = 2.45;
    const SLOPE_Y_PER_POS = 0.07;
    const TOTAL_SLOPE_DROP = 7 * SLOPE_Y_PER_POS;
    const Y_RAIL_OUTFEED = 0.85;
    const Y_RAIL_INFEED = Y_RAIL_OUTFEED + TOTAL_SLOPE_DROP;
    const TRACK_X_START = 9.8;
    const TRACK_X_END = -9.8;
    const TRACK_LENGTH = TRACK_X_START - TRACK_X_END;
    const railSlopeAngle = Math.atan2(TOTAL_SLOPE_DROP, TRACK_LENGTH);

    const getRailYAtX = (x: number) => {
      const clampedX = Math.max(TRACK_X_END, Math.min(TRACK_X_START, x));
      const ratio = (clampedX - TRACK_X_END) / TRACK_LENGTH;
      return Y_RAIL_OUTFEED + ratio * TOTAL_SLOPE_DROP;
    };

    const floorDecoGroup = new THREE.Group();
    scene.add(floorDecoGroup);

    // Infeed / Outfeed Floor Zones
    const infeedZoneMat = new THREE.MeshStandardMaterial({ color: '#10b981', roughness: 0.7 });
    const infeedZone = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.02, 36.0), infeedZoneMat);
    infeedZone.position.set(12.4, 0.01, 0);
    floorDecoGroup.add(infeedZone);

    const outfeedZoneMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.7 });
    const outfeedZone = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.02, 36.0), outfeedZoneMat);
    outfeedZone.position.set(-12.4, 0.01, 0);
    floorDecoGroup.add(outfeedZone);

    // Clear palletNodesRef for fresh setup
    palletNodesRef.current.clear();

    for (let r = 1; r <= 13; r++) {
      const zPos = (7 - r) * RAIL_SPACING_Z;
      const rLabel = `R${String(r).padStart(2, '0')}`;

      // Outfeed / Infeed floor decals
      const outfeedDecalMat = new THREE.MeshBasicMaterial({ map: createFloorDecalTexture(r, 'OUTFEED'), side: THREE.DoubleSide });
      const outfeedFloorDecal = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.4), outfeedDecalMat);
      outfeedFloorDecal.position.set(-12.4, 0.028, zPos);
      outfeedFloorDecal.rotation.x = -Math.PI / 2;
      outfeedFloorDecal.rotation.z = -Math.PI / 2;
      floorDecoGroup.add(outfeedFloorDecal);

      const infeedDecalMat = new THREE.MeshBasicMaterial({ map: createFloorDecalTexture(r, 'INFEED'), side: THREE.DoubleSide });
      const infeedFloorDecal = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.4), infeedDecalMat);
      infeedFloorDecal.position.set(12.4, 0.028, zPos);
      infeedFloorDecal.rotation.x = -Math.PI / 2;
      infeedFloorDecal.rotation.z = Math.PI / 2;
      floorDecoGroup.add(infeedFloorDecal);

      // Sign mounts
      const outfeedMountPostL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.95, 0.06), railSteelBlue);
      outfeedMountPostL.position.set(-10.15, Y_RAIL_OUTFEED + 0.475, zPos - 0.75);
      const outfeedMountPostR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.95, 0.06), railSteelBlue);
      outfeedMountPostR.position.set(-10.15, Y_RAIL_OUTFEED + 0.475, zPos + 0.75);
      const outfeedMountHeader = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.56), railSteelBlue);
      outfeedMountHeader.position.set(-10.15, Y_RAIL_OUTFEED + 0.95, zPos);
      const outfeedSignBacking = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.56, 1.28), stopperBlackMat);
      outfeedSignBacking.position.set(-10.17, Y_RAIL_OUTFEED + 0.95, zPos);
      const outfeedSignMat = new THREE.MeshBasicMaterial({ map: createSignTexture(rLabel, '#0f172a', '#f59e0b'), side: THREE.DoubleSide });
      const outfeedSign = new THREE.Mesh(new THREE.PlaneGeometry(1.24, 0.52), outfeedSignMat);
      outfeedSign.position.set(-10.19, Y_RAIL_OUTFEED + 0.95, zPos);
      outfeedSign.rotation.y = -Math.PI / 2;
      railsGroup.add(outfeedMountPostL, outfeedMountPostR, outfeedMountHeader, outfeedSignBacking, outfeedSign);

      const infeedMountPostL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.95, 0.06), railSteelBlue);
      infeedMountPostL.position.set(10.15, Y_RAIL_INFEED + 0.475, zPos - 0.75);
      const infeedMountPostR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.95, 0.06), railSteelBlue);
      infeedMountPostR.position.set(10.15, Y_RAIL_INFEED + 0.475, zPos + 0.75);
      const infeedMountHeader = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.56), railSteelBlue);
      infeedMountHeader.position.set(10.15, Y_RAIL_INFEED + 0.95, zPos);
      const infeedSignBacking = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.56, 1.28), stopperBlackMat);
      infeedSignBacking.position.set(10.17, Y_RAIL_INFEED + 0.95, zPos);
      const infeedSignMat = new THREE.MeshBasicMaterial({ map: createSignTexture(rLabel, '#0f172a', '#38bdf8'), side: THREE.DoubleSide });
      const infeedSign = new THREE.Mesh(new THREE.PlaneGeometry(1.24, 0.52), infeedSignMat);
      infeedSign.position.set(10.19, Y_RAIL_INFEED + 0.95, zPos);
      infeedSign.rotation.y = Math.PI / 2;
      railsGroup.add(infeedMountPostL, infeedMountPostR, infeedMountHeader, infeedSignBacking, infeedSign);

      // Floor lines
      const laneLineGeo = new THREE.BoxGeometry(21.5, 0.01, 0.06);
      const laneLineTop = new THREE.Mesh(laneLineGeo, floorLineYellow);
      laneLineTop.position.set(0, 0.02, zPos + (RAIL_SPACING_Z / 2) - 0.1);
      const laneLineBtm = new THREE.Mesh(laneLineGeo, floorLineYellow);
      laneLineBtm.position.set(0, 0.02, zPos - (RAIL_SPACING_Z / 2) + 0.1);
      floorDecoGroup.add(laneLineTop, laneLineBtm);

      const flowArrowMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 0.8), arrowMat);
      flowArrowMesh.rotation.x = -Math.PI / 2;
      flowArrowMesh.position.set(0, 0.025, zPos);
      floorDecoGroup.add(flowArrowMesh);

      // Side channels
      const continuousBedLength = 20.4;
      const channelGeo = new THREE.BoxGeometry(continuousBedLength, 0.16, 0.08);
      const yMidBed = getRailYAtX(0) - 0.08;
      const leftChannel = new THREE.Mesh(channelGeo, railSteelBlue);
      leftChannel.position.set(0, yMidBed, zPos - 0.95);
      leftChannel.rotation.z = railSlopeAngle;
      leftChannel.castShadow = true;
      const rightChannel = new THREE.Mesh(channelGeo, railSteelBlue);
      rightChannel.position.set(0, yMidBed, zPos + 0.95);
      rightChannel.rotation.z = railSlopeAngle;
      rightChannel.castShadow = true;

      const flangeGeo = new THREE.BoxGeometry(continuousBedLength, 0.05, 0.04);
      const leftFlange = new THREE.Mesh(flangeGeo, railGuideOrange);
      leftFlange.position.set(0, yMidBed + 0.10, zPos - 0.95);
      leftFlange.rotation.z = railSlopeAngle;
      const rightFlange = new THREE.Mesh(flangeGeo, railGuideOrange);
      rightFlange.position.set(0, yMidBed + 0.10, zPos + 0.95);
      rightFlange.rotation.z = railSlopeAngle;

      railsGroup.add(leftChannel, rightChannel, leftFlange, rightFlange);

      // Support legs
      [-9.8, -4.9, 0, 4.9, 9.8].forEach((xLeg) => {
        const legBaseH = getRailYAtX(xLeg);
        const postL = new THREE.Mesh(new THREE.BoxGeometry(0.1, legBaseH, 0.1), railSteelBlue);
        postL.position.set(xLeg, legBaseH / 2, zPos - 0.95);
        const postR = new THREE.Mesh(new THREE.BoxGeometry(0.1, legBaseH, 0.1), railSteelBlue);
        postR.position.set(xLeg, legBaseH / 2, zPos + 0.95);
        const footL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 0.2), railSteelBlue);
        footL.position.set(xLeg, 0.01, zPos - 0.95);
        const footR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 0.2), railSteelBlue);
        footR.position.set(xLeg, 0.01, zPos + 0.95);
        const crossTie = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.9), railSteelBlue);
        crossTie.position.set(xLeg, legBaseH * 0.7, zPos);
        railsGroup.add(postL, postR, footL, footR, crossTie);
      });

      // Rollers
      const numRollers = 32;
      for (let ro = 0; ro < numRollers; ro++) {
        const xRol = TRACK_X_START - (ro * (TRACK_LENGTH / (numRollers - 1)));
        const ySurface = getRailYAtX(xRol);
        const yRolCenter = ySurface - 0.05;
        const rollerL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.35, 12), rollerGalvanized);
        rollerL.rotation.x = Math.PI / 2;
        rollerL.position.set(xRol, yRolCenter, zPos - 0.55);
        const rollerR = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.35, 12), rollerGalvanized);
        rollerR.rotation.x = Math.PI / 2;
        rollerR.position.set(xRol, yRolCenter, zPos + 0.55);
        const axleCenter = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.8, 8), rollerGalvanized);
        axleCenter.rotation.x = Math.PI / 2;
        axleCenter.position.set(xRol, yRolCenter, zPos);
        railsGroup.add(rollerL, rollerR, axleCenter);
      }

      // Entry guides & stoppers
      const infeedGuideL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.08), infeedGreenMat);
      infeedGuideL.position.set(10.2, Y_RAIL_INFEED + 0.06, zPos - 1.1);
      infeedGuideL.rotation.y = -Math.PI / 6;
      const infeedGuideR = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.08), infeedGreenMat);
      infeedGuideR.position.set(10.2, Y_RAIL_INFEED + 0.06, zPos + 1.1);
      infeedGuideR.rotation.y = Math.PI / 6;
      railsGroup.add(infeedGuideL, infeedGuideR);

      const stopperBase = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.55, 1.95), stopperHazardMat);
      stopperBase.position.set(-10.15, Y_RAIL_OUTFEED + 0.22, zPos);
      const rubberBufferL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.4), stopperBlackMat);
      rubberBufferL.position.set(-10.05, Y_RAIL_OUTFEED + 0.25, zPos - 0.55);
      const rubberBufferR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.4), stopperBlackMat);
      rubberBufferR.position.set(-10.05, Y_RAIL_OUTFEED + 0.25, zPos + 0.55);
      railsGroup.add(stopperBase, rubberBufferL, rubberBufferR);

      // Create 8 Pallet Block Node Structures
      for (let p = 1; p <= 8; p++) {
        const xPos = 8.575 - ((p - 1) * POS_SPACING_X);
        const railSurfaceY = getRailYAtX(xPos);

        const blockDivider = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.015, 1.8), floorLineWhite);
        blockDivider.position.set(xPos + (POS_SPACING_X / 2), 0.02, zPos);
        floorDecoGroup.add(blockDivider);

        // Pallet Group Container
        const palletGrp = new THREE.Group();
        palletGrp.position.set(xPos, railSurfaceY, zPos);
        palletGrp.rotation.z = railSlopeAngle;

        const runner1 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.10, 0.12), woodPine);
        runner1.position.set(0, 0.05, 0.6);
        const runner2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.10, 0.12), woodPine);
        runner2.position.set(0, 0.05, 0);
        const runner3 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.10, 0.12), woodPine);
        runner3.position.set(0, 0.05, -0.6);
        palletGrp.add(runner1, runner2, runner3);

        const topDeck = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 1.4), woodPine);
        topDeck.position.set(0, 0.125, 0);
        topDeck.castShadow = true;
        palletGrp.add(topDeck);

        const cargoBox = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.95, 1.35));
        cargoBox.position.set(0, 0.65, 0);
        cargoBox.castShadow = true;
        palletGrp.add(cargoBox);

        const label = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.2), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
        label.position.set(0, 0.65, 0.68);
        palletGrp.add(label);

        railsGroup.add(palletGrp);

        // Empty Slot Wireframe
        const emptyMesh = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, 1.5), blockMarkMat);
        emptyMesh.position.set(xPos, railSurfaceY + 0.02, zPos);
        emptyMesh.rotation.z = railSlopeAngle;
        railsGroup.add(emptyMesh);

        // Hit Box
        const hitBox = new THREE.Mesh(hitboxGeo, hitboxMat);
        hitBox.position.set(xPos, railSurfaceY + 0.65, zPos);
        hitBox.rotation.z = railSlopeAngle;
        railsGroup.add(hitBox);

        palletNodesRef.current.set(`${r}-${p}`, {
          rail: r,
          pos: p,
          x: xPos,
          y: railSurfaceY,
          z: zPos,
          palletGrp,
          cargoBox,
          emptyMesh,
          hitBox
        });
      }
    }

    scene.add(railsGroup);

    // Raycaster & Event Handlers
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const getClickableNodes = (): PalletNode[] => {
      return Array.from(palletNodesRef.current.values());
    };

    const handleCanvasClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const nodes = getClickableNodes();
      const intersects = raycaster.intersectObjects(nodes.map(n => n.hitBox));

      if (intersects.length > 0) {
        const hitNode = nodes.find(n => n.hitBox === intersects[0].object);
        if (hitNode) {
          setSelectedSlot({ rail: hitNode.rail, pos: hitNode.pos, item: hitNode.item });
          onSelectSlotRef.current(hitNode.rail, hitNode.pos, hitNode.item);
        }
      }
    };

    const handleCanvasMouseMove = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const nodes = getClickableNodes();
      const intersects = raycaster.intersectObjects(nodes.map(n => n.hitBox));

      if (intersects.length > 0) {
        const hitNode = nodes.find(n => n.hitBox === intersects[0].object);
        if (hitNode) {
          setHoveredInfo({ rail: hitNode.rail, pos: hitNode.pos, item: hitNode.item });
          renderer.domElement.style.cursor = 'pointer';

          hoverGhostGroup.position.set(hitNode.x, hitNode.y, hitNode.z);
          hoverGhostGroup.rotation.z = railSlopeAngle;
          hoverGhostGroup.visible = true;

          const statusMode = hitNode.item
            ? (hitNode.item.agingDays > 45 || hitNode.item.agingStatus === 'OVERDUE' ? 'OVERDUE' : hitNode.item.agingDays > 28 || hitNode.item.agingStatus === 'WARNING' ? 'AGING' : 'OCCUPIED')
            : 'EMPTY';

          if (hitNode.item) {
            ghostBoxMat.color.setHex(statusMode === 'OVERDUE' ? 0xef4444 : statusMode === 'AGING' ? 0xf59e0b : 0x0284c7);
            ghostBoxMat.emissive.setHex(statusMode === 'OVERDUE' ? 0x991b1b : statusMode === 'AGING' ? 0xb45309 : 0x0369a1);
            ghostWireMat.color.setHex(statusMode === 'OVERDUE' ? 0xf87171 : statusMode === 'AGING' ? 0xfbbf24 : 0x38bdf8);
            pinMat.color.setHex(statusMode === 'OVERDUE' ? 0xfca5a5 : statusMode === 'AGING' ? 0xfde68a : 0x7dd3fc);
            floorRingMat.color.setHex(statusMode === 'OVERDUE' ? 0xef4444 : statusMode === 'AGING' ? 0xf59e0b : 0x38bdf8);
          } else {
            ghostBoxMat.color.setHex(0x10b981);
            ghostBoxMat.emissive.setHex(0x059669);
            ghostWireMat.color.setHex(0x34d399);
            pinMat.color.setHex(0x6ee7b7);
            floorRingMat.color.setHex(0x34d399);
          }

          const neonColor = statusMode === 'OVERDUE'
            ? 0xef4444
            : statusMode === 'AGING'
            ? 0xf59e0b
            : statusMode === 'EMPTY'
            ? 0x10b981
            : 0x38bdf8;
          rackBayNeon.setBay(hitNode.x, hitNode.y, hitNode.z, 2.0, 1.1, 1.8, neonColor);
          rackBayNeon.show();
          return;
        }
      }
      setHoveredInfo(null);
      hoverGhostGroup.visible = false;
      rackBayNeon.hide();
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

      if (hoverGhostGroup.visible) {
        const pulse = 1.0 + Math.sin(elapsedTime * 6) * 0.025;
        ghostBox.scale.set(pulse, pulse, pulse);
        ghostWire.scale.set(pulse, pulse, pulse);
        floorRing.rotation.z += 0.02;
      }

      rackBayNeon.update(elapsedTime);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize Handler
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

    const resizeObserver = new ResizeObserver(() => handleResize());
    if (mountRef.current) resizeObserver.observe(mountRef.current);
    if (containerRef.current) resizeObserver.observe(containerRef.current);

    // Cleanup Function
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (renderer.domElement) {
        renderer.domElement.removeEventListener('click', handleCanvasClick);
        renderer.domElement.removeEventListener('mousemove', handleCanvasMouseMove);
      }
      rackBayNeon.dispose();
      renderer.dispose();
      palletNodesRef.current.clear();
      container.innerHTML = '';
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
    };
  }, []); // Run ONCE on mount

  // =========================================================================
  // 2. FAST MATERIAL & HIGHLIGHT UPDATES WHEN items OR searchQuery CHANGES
  // (Zero scene re-initialization, camera position preserved 100%)
  // =========================================================================
  useEffect(() => {
    if (!palletNodesRef.current.size) return;

    // Shared Pallet Materials for updating
    const boxNormalBlue = new THREE.MeshStandardMaterial({ color: '#2563eb', roughness: 0.45, metalness: 0.2 });
    const boxAgingAmber = new THREE.MeshStandardMaterial({ color: '#d97706', roughness: 0.4, metalness: 0.25 });
    const boxOverdueRed = new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.4, metalness: 0.3 });
    const boxSearchMatch = new THREE.MeshStandardMaterial({ color: '#06b6d4', roughness: 0.3, metalness: 0.5, emissive: '#0891b2', emissiveIntensity: 0.4 });

    palletNodesRef.current.forEach((node, key) => {
      const item = slotItemMap.get(key);
      node.item = item;

      if (item) {
        node.palletGrp.visible = true;
        node.emptyMesh.visible = false;

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

        node.cargoBox.material = currentBoxMat;
      } else {
        node.palletGrp.visible = false;
        node.emptyMesh.visible = true;
      }
    });
  }, [slotItemMap, searchQuery]);

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-0 rounded-2xl overflow-hidden border shadow-2xl transition-colors duration-300 border-slate-300 bg-[#f8fafc] flex flex-col">
      {/* 3D Canvas Mount */}
      <div ref={mountRef} className="w-full flex-1 h-full min-h-[300px]" />

      {/* Multi-Perspective Camera Toolbar (Top Right) */}
      <div className="absolute top-3 right-3 pointer-events-auto z-20">
        <div className="flex items-center gap-1 backdrop-blur-md p-1 rounded-xl shadow-lg border bg-slate-900/90 border-slate-800">
          <button
            onClick={() => setCameraView('OVERVIEW')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
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
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
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
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
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
