import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { InventoryItem, ShelfLevel, StorageZone, ZoneCapacityMaster } from '../types';
import { 
  Layers, 
  RotateCcw, 
  Maximize2, 
  Minimize,
  Package, 
  QrCode, 
  AlertTriangle, 
  Calendar, 
  CheckCircle2, 
  ArrowDownRight, 
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Info
} from 'lucide-react';

interface Rack3DViewerProps {
  selectedZone: StorageZone;
  selectedBayNumber: number;
  items: InventoryItem[];
  zoneCapacities?: ZoneCapacityMaster[];
  onSelectBayAndZone: (zone: StorageZone, bayNumber: number) => void;
  onOpenScanForLevel: (zone: StorageZone, bayNumber: number, level: ShelfLevel, mode: 'IN' | 'OUT') => void;
  onBackToDashboard?: () => void;
}

export const Rack3DViewer: React.FC<Rack3DViewerProps> = ({
  selectedZone,
  selectedBayNumber,
  items,
  zoneCapacities,
  onSelectBayAndZone,
  onOpenScanForLevel,
  onBackToDashboard,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedLevel, setSelectedLevel] = useState<ShelfLevel>(1);
  const [isAutoRotate, setIsAutoRotate] = useState<boolean>(false);
  const [hoveredLevel, setHoveredLevel] = useState<ShelfLevel | null>(null);
  const [isSelfFullscreen, setIsSelfFullscreen] = useState<boolean>(false);

  const toggleFullscreen = () => {
    if (isSelfFullscreen) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      setIsSelfFullscreen(false);
    } else {
      if (containerRef.current && containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {});
      }
      setIsSelfFullscreen(true);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsSelfFullscreen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSelfFullscreen) {
        setIsSelfFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSelfFullscreen]);

  // Compute all available racks in sequential order for Prev/Next navigation
  const ALL_ZONES: StorageZone[] = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
  const getMaxBays = (z: StorageZone) => ['G', 'H', 'I', 'J', 'K'].includes(z) ? 5 : 12;

  const allRacks = React.useMemo(() => {
    const list: { zone: StorageZone; bayNumber: number }[] = [];
    ALL_ZONES.forEach((z) => {
      const maxB = getMaxBays(z);
      for (let b = 1; b <= maxB; b++) {
        list.push({ zone: z, bayNumber: b });
      }
    });
    return list;
  }, []);

  const currentRackIndex = allRacks.findIndex(
    (r) => r.zone === selectedZone && r.bayNumber === selectedBayNumber
  );

  const prevRack = currentRackIndex > 0 ? allRacks[currentRackIndex - 1] : null;
  const nextRack = currentRackIndex < allRacks.length - 1 ? allRacks[currentRackIndex + 1] : null;

  const handlePrevRack = () => {
    if (prevRack) {
      onSelectBayAndZone(prevRack.zone, prevRack.bayNumber);
    }
  };

  const handleNextRack = () => {
    if (nextRack) {
      onSelectBayAndZone(nextRack.zone, nextRack.bayNumber);
    }
  };

  // Get items in this bay
  const bayItems = items.filter((it) => it.zone === selectedZone && it.bayNumber === selectedBayNumber);

  // Helper to find item at specific level (ชั้น 1 - 4)
  const getItemAtLevel = (level: ShelfLevel): InventoryItem | undefined => {
    return bayItems.find((it) => it.level === level);
  };

  const selectedLevelItem = getItemAtLevel(selectedLevel);

  // Three.js scene setup and rendering
  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight || 500;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0f172a'); // Bright Clean Slate Navy Canvas

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(6.5, 4.5, 8.5);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Clear existing children
    while (mountRef.current.firstChild) {
      mountRef.current.removeChild(mountRef.current.firstChild);
    }
    mountRef.current.appendChild(renderer.domElement);

    // 4. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.1; // Don't go far below floor
    controls.minDistance = 3;
    controls.maxDistance = 18;
    controls.target.set(0, 2.2, 0);

    // 5. Lights (Bright & High Contrast)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.3);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
    dirLight.position.set(10, 15, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const fillDirLight = new THREE.DirectionalLight(0xdbeafe, 1.0);
    fillDirLight.position.set(-10, 12, -10);
    scene.add(fillDirLight);

    const blueSpotLight = new THREE.PointLight(0x06b6d4, 2.0, 18);
    blueSpotLight.position.set(-4, 6, 4);
    scene.add(blueSpotLight);

    // 6. Grid Floor
    const gridHelper = new THREE.GridHelper(16, 16, 0x38bdf8, 0x334155);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    // Concrete pad floor
    const floorGeo = new THREE.PlaneGeometry(12, 12);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.5,
      metalness: 0.3,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // 7. BUILD 3D RACK STRUCTURE (4 Shelf Tiers / 4 ชั้น)
    const rackGroup = new THREE.Group();
    scene.add(rackGroup);

    // Dimensions
    const rackWidth = 2.4;
    const rackDepth = 1.2;
    const levelHeights = [0.4, 1.6, 2.8, 4.0]; // Y coordinates for ชั้น 1, 2, 3, 4
    const totalHeight = 4.8;

    // Materials
    const uprightMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8, // Industrial Blue
      roughness: 0.3,
      metalness: 0.8,
    });

    const beamMat = new THREE.MeshStandardMaterial({
      color: 0xea580c, // Industrial Safety Orange
      roughness: 0.4,
      metalness: 0.6,
    });

    const shelfDeckMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // Dark Metallic Gray
      roughness: 0.5,
      metalness: 0.5,
    });

    const palletWoodMat = new THREE.MeshStandardMaterial({
      color: 0xb45309, // Pallet Wood Brown
      roughness: 0.9,
    });

    // 4 Corner Vertical Upright Columns
    const postGeo = new THREE.BoxGeometry(0.12, totalHeight, 0.12);
    const postPositions = [
      [-rackWidth / 2, totalHeight / 2, -rackDepth / 2],
      [rackWidth / 2, totalHeight / 2, -rackDepth / 2],
      [-rackWidth / 2, totalHeight / 2, rackDepth / 2],
      [rackWidth / 2, totalHeight / 2, rackDepth / 2],
    ];

    postPositions.forEach((pos) => {
      const post = new THREE.Mesh(postGeo, uprightMat);
      post.position.set(pos[0], pos[1], pos[2]);
      post.castShadow = true;
      post.receiveShadow = true;
      rackGroup.add(post);
    });

    // Cross-bracing on sides
    for (let side of [-rackWidth / 2, rackWidth / 2]) {
      for (let h = 0.8; h < totalHeight; h += 1.2) {
        const braceGeo = new THREE.BoxGeometry(0.04, 0.04, rackDepth);
        const brace = new THREE.Mesh(braceGeo, uprightMat);
        brace.position.set(side, h, 0);
        brace.rotation.x = 0.3;
        rackGroup.add(brace);
      }
    }

    // Stores references to level bounding meshes for raycasting/highlighting
    const levelMeshes: { mesh: THREE.Mesh; level: ShelfLevel }[] = [];

    // Build the 4 Levels (ชั้น 1, ชั้น 2, ชั้น 3, ชั้น 4)
    ([1, 2, 3, 4] as ShelfLevel[]).forEach((lvl, idx) => {
      const y = levelHeights[idx];

      // Front & Back Beams (Orange)
      const beamGeo = new THREE.BoxGeometry(rackWidth + 0.1, 0.12, 0.08);
      
      const frontBeam = new THREE.Mesh(beamGeo, beamMat);
      frontBeam.position.set(0, y, rackDepth / 2);
      frontBeam.castShadow = true;
      rackGroup.add(frontBeam);

      const backBeam = new THREE.Mesh(beamGeo, beamMat);
      backBeam.position.set(0, y, -rackDepth / 2);
      backBeam.castShadow = true;
      rackGroup.add(backBeam);

      // Steel Shelf Decking Platform
      const deckGeo = new THREE.BoxGeometry(rackWidth - 0.05, 0.04, rackDepth - 0.05);
      const deck = new THREE.Mesh(deckGeo, shelfDeckMat);
      deck.position.set(0, y + 0.02, 0);
      deck.receiveShadow = true;
      rackGroup.add(deck);

      // Clickable Bounding Box / Selection Cage for Level
      const cageGeo = new THREE.BoxGeometry(rackWidth - 0.1, 0.9, rackDepth - 0.1);
      
      const isSelected = selectedLevel === lvl;
      const cageMat = new THREE.MeshBasicMaterial({
        color: isSelected ? 0x06b6d4 : 0x38bdf8,
        wireframe: true,
        transparent: true,
        opacity: isSelected ? 0.8 : 0.08,
      });

      const cageMesh = new THREE.Mesh(cageGeo, cageMat);
      cageMesh.position.set(0, y + 0.45, 0);
      cageMesh.userData = { shelfLevel: lvl };
      rackGroup.add(cageMesh);
      levelMeshes.push({ mesh: cageMesh, level: lvl });

      // Check item stored at this level
      const itemOnLevel = getItemAtLevel(lvl);

      if (itemOnLevel) {
        // Render Wooden Pallet
        const palletGroup = new THREE.Group();
        palletGroup.position.set(0, y + 0.08, 0);

        const palletBaseGeo = new THREE.BoxGeometry(1.6, 0.12, 1.0);
        const palletMesh = new THREE.Mesh(palletBaseGeo, palletWoodMat);
        palletMesh.castShadow = true;
        palletGroup.add(palletMesh);

        // Render Cargo Boxes on Pallet
        let boxColor = 0x10b981; // Safe Green
        if (itemOnLevel.agingStatus === 'WARNING') boxColor = 0xf59e0b; // Amber
        if (itemOnLevel.agingStatus === 'OVERDUE') boxColor = 0xef4444; // Red Overdue

        const boxMat = new THREE.MeshStandardMaterial({
          color: boxColor,
          roughness: 0.6,
          metalness: 0.1,
        });

        // Stack 2x2 boxes on top of pallet
        for (let bx of [-0.4, 0.4]) {
          for (let bz of [-0.25, 0.25]) {
            const cargoGeo = new THREE.BoxGeometry(0.7, 0.55, 0.45);
            const cargo = new THREE.Mesh(cargoGeo, boxMat);
            cargo.position.set(bx, 0.32, bz);
            cargo.castShadow = true;
            cargo.receiveShadow = true;
            palletGroup.add(cargo);

            // Add barcode label graphic onto box front
            const labelGeo = new THREE.PlaneGeometry(0.25, 0.15);
            const labelMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const label = new THREE.Mesh(labelGeo, labelMat);
            label.position.set(bx, 0.32, bz + 0.23);
            palletGroup.add(label);
          }
        }

        rackGroup.add(palletGroup);

        // Glowing LED Status Indicator light on front beam
        const ledColor = itemOnLevel.agingStatus === 'SAFE' 
          ? 0x10b981 
          : itemOnLevel.agingStatus === 'WARNING' 
          ? 0xf59e0b 
          : 0xef4444;

        const ledGeo = new THREE.SphereGeometry(0.08, 16, 16);
        const ledMat = new THREE.MeshBasicMaterial({ color: ledColor });
        const led = new THREE.Mesh(ledGeo, ledMat);
        led.position.set(rackWidth / 2 - 0.2, y + 0.1, rackDepth / 2 + 0.05);
        rackGroup.add(led);

        // Point light for glowing effect
        const ledPointLight = new THREE.PointLight(ledColor, 0.8, 1.2);
        ledPointLight.position.set(rackWidth / 2 - 0.2, y + 0.1, rackDepth / 2 + 0.1);
        rackGroup.add(ledPointLight);
      }
    });

    // 8. Raycasting for Mouse Clicks on 3D Levels
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(levelMeshes.map((m) => m.mesh));

      if (intersects.length > 0) {
        const clickedLevel = intersects[0].object.userData.shelfLevel as ShelfLevel;
        if (clickedLevel) {
          setSelectedLevel(clickedLevel);
        }
      }
    };

    const canvasDom = renderer.domElement;
    canvasDom.addEventListener('pointerdown', handlePointerDown);

    // 9. Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (isAutoRotate) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 2.5;
      } else {
        controls.autoRotate = false;
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight || 500;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      canvasDom.removeEventListener('pointerdown', handlePointerDown);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
    };
  }, [selectedZone, selectedBayNumber, items, selectedLevel, isAutoRotate]);

  return (
    <div 
      ref={containerRef}
      className={`bg-white border border-slate-200 rounded-xl p-3.5 sm:p-5 lg:p-6 shadow-sm text-slate-900 space-y-4 sm:space-y-6 w-full min-w-0 max-w-full transition-all duration-300 ${
        isSelfFullscreen ? 'fixed inset-0 z-[99999] w-screen h-screen overflow-y-auto bg-slate-50 p-6' : ''
      }`}
    >
      {/* Top Header & Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-3 sm:pb-4 border-b border-slate-200 gap-3 sm:gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-blue-600 animate-pulse" />
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
              3D Rack Shelf Inspector (สำรวจ Rack 4 ชั้น)
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200">
              Locator: {selectedZone}{selectedBayNumber}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            หมุนกล้อง 360° ด้วยเมาส์ คลิกเลือกชั้น 1-4 หรือคลิกกล่อง Pallet ในฉาก 3 มิติเพื่อส่องวัตถุดิบ
          </p>
        </div>

        {/* Rack Locator Switcher */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm border border-cyan-400 active:scale-95"
            title={isSelfFullscreen ? "ออกจากโหมดเต็มจอ (Esc)" : "กดดูโมเดล 3D แบบเต็มจอ (Fullscreen)"}
          >
            {isSelfFullscreen ? (
              <>
                <Minimize className="w-3.5 h-3.5" />
                <span>ออกจากเต็มจอ</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span>ดูแบบเต็มจอ (Fullscreen)</span>
              </>
            )}
          </button>

          {onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className="px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
            >
              <span>← กลับหน้า แผนผัง Layout 2D & 3D</span>
            </button>
          )}
          <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <button
              onClick={handlePrevRack}
              disabled={!prevRack}
              title={prevRack ? `ไป Rack ก่อนหน้า (${prevRack.zone}${prevRack.bayNumber})` : 'ไม่มี Rack ก่อนหน้า'}
              className="p-1 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-slate-500 font-semibold">Zone:</span>
            <select
              value={selectedZone}
              onChange={(e) => onSelectBayAndZone(e.target.value as StorageZone, selectedBayNumber)}
              className="bg-white text-blue-700 font-bold px-2 py-1 rounded border border-slate-300 focus:outline-none focus:border-blue-500"
            >
              {(['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'] as StorageZone[]).map((z) => (
                <option key={z} value={z}>Zone {z}</option>
              ))}
            </select>

            <span className="text-slate-500 font-semibold ml-1">Bay:</span>
            <select
              value={selectedBayNumber}
              onChange={(e) => onSelectBayAndZone(selectedZone, Number(e.target.value))}
              className="bg-white text-blue-700 font-bold px-2 py-1 rounded border border-slate-300 focus:outline-none focus:border-blue-500"
            >
              {Array.from({ length: ['G','H','I','J','K'].includes(selectedZone) ? 5 : 12 }, (_, i) => i + 1).map((b) => (
                <option key={b} value={b}>Bay {b}</option>
              ))}
            </select>

            <button
              onClick={handleNextRack}
              disabled={!nextRack}
              title={nextRack ? `ไป Rack ถัดไป (${nextRack.zone}${nextRack.bayNumber})` : 'ไม่มี Rack ถัดไป'}
              className="p-1 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setIsAutoRotate(!isAutoRotate)}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 ${
              isAutoRotate ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isAutoRotate ? 'animate-spin' : ''}`} />
            <span>{isAutoRotate ? 'กำลังหมุน 3D' : 'หมุนอัตโนมัติ'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: 3D Viewport on Left, Level Detail Inspector on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 3D Viewport Container */}
        <div className="lg:col-span-8 bg-slate-950 rounded-xl border border-slate-800 relative overflow-hidden flex flex-col min-h-[480px]">
          {/* Viewport Overlay Controls */}
          <div className="absolute top-3 left-3 z-10 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 text-[11px] font-semibold text-slate-200 flex items-center space-x-2 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Rack {selectedZone}{selectedBayNumber} (4 ชั้นความสูง)</span>
          </div>

          {/* Left Arrow Button (Previous Rack) */}
          <button
            onClick={handlePrevRack}
            disabled={!prevRack}
            title={prevRack ? `ย้อนกลับไป Rack ${prevRack.zone}${prevRack.bayNumber}` : 'ไม่มี Rack ก่อนหน้า'}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 group flex items-center space-x-1.5 bg-slate-900/85 hover:bg-blue-600 text-slate-200 hover:text-white p-3 rounded-xl border border-slate-700/80 hover:border-blue-400 shadow-2xl backdrop-blur-md transition-all transform hover:scale-110 active:scale-95 disabled:opacity-20 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform text-sky-400 group-hover:text-white" />
            <span className="hidden md:inline-block max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 text-xs font-bold">
              {prevRack ? `Rack ${prevRack.zone}${prevRack.bayNumber}` : ''}
            </span>
          </button>

          {/* Right Arrow Button (Next Rack) */}
          <button
            onClick={handleNextRack}
            disabled={!nextRack}
            title={nextRack ? `ไปยัง Rack ${nextRack.zone}${nextRack.bayNumber}` : 'ไม่มี Rack ถัดไป'}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 group flex items-center space-x-1.5 bg-slate-900/85 hover:bg-blue-600 text-slate-200 hover:text-white p-3 rounded-xl border border-slate-700/80 hover:border-blue-400 shadow-2xl backdrop-blur-md transition-all transform hover:scale-110 active:scale-95 disabled:opacity-20 disabled:pointer-events-none"
          >
            <span className="hidden md:inline-block max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 text-xs font-bold">
              {nextRack ? `Rack ${nextRack.zone}${nextRack.bayNumber}` : ''}
            </span>
            <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform text-sky-400 group-hover:text-white" />
          </button>

          {/* Shelf Level Selector Quick Pills floating inside 3D */}
          <div className="absolute bottom-3 left-3 z-10 flex space-x-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-lg border border-slate-700 shadow-lg">
            {([4, 3, 2, 1] as ShelfLevel[]).map((lvl) => {
              const item = getItemAtLevel(lvl);
              const isSelected = selectedLevel === lvl;
              return (
                <button
                  key={lvl}
                  onClick={() => setSelectedLevel(lvl)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center space-x-1 ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm scale-105'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span>ชั้น {lvl}</span>
                  {item ? (
                    <span className={`w-2 h-2 rounded-full ${
                      item.agingStatus === 'SAFE' ? 'bg-emerald-400' :
                      item.agingStatus === 'WARNING' ? 'bg-amber-400' : 'bg-red-400'
                    }`} />
                  ) : (
                    <span className="text-[10px] text-slate-500">(ว่าง)</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Three.js Mount Node */}
          <div ref={mountRef} className="w-full h-full flex-1 cursor-grab active:cursor-grabbing" />
        </div>

        {/* Right: Selected Level Inspector Panel */}
        <div className="lg:col-span-4 bg-slate-50 rounded-xl border border-slate-200 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                  รายละเอียดตำแหน่งจัดเก็บ
                </span>
                <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2 mt-0.5">
                  <span>ชั้น {selectedLevel} (Level {selectedLevel})</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-white text-slate-700 font-mono font-bold border border-slate-200">
                    {selectedZone}{selectedBayNumber}-L{selectedLevel}
                  </span>
                </h3>
              </div>
            </div>

            {/* Rack Bay Overall Capacity Summary Card */}
            {(() => {
              const zoneMaster = zoneCapacities?.find(z => z.zone === selectedZone);
              const maxBayPallets = zoneMaster?.standardPalletsPerBay || 8;
              const currentStd = selectedLevelItem?.stdQtyPerPallet || zoneMaster?.defaultStdQtyPerPallet || 80;
              const maxUnitsCapacity = currentStd * maxBayPallets;
              
              let totalUnitsInBay = 0;
              let totalPalletsInBay = 0;
              let formulaBreakdown = '';

              bayItems.forEach((it) => {
                totalUnitsInBay += it.quantity;
                const std = it.stdQtyPerPallet || currentStd;
                const fp = it.fullPallets ?? Math.floor(it.quantity / std);
                const loose = it.looseQty ?? (it.quantity % std);
                totalPalletsInBay += fp + (loose > 0 ? 1 : 0);
                if (fp > 0 || loose > 0) {
                  formulaBreakdown = `${std} × ${fp} พาเลทเต็ม${loose > 0 ? ` + ${loose} ตัว` : ''}`;
                }
              });

              const availPallets = Math.max(0, maxBayPallets - totalPalletsInBay);
              const availUnits = availPallets * currentStd;

              return (
                <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span>ความจุ Rack {selectedZone} Bay {selectedBayNumber}</span>
                    <span className="text-blue-700 font-mono">สูงสุด {maxBayPallets} Pallets ({maxUnitsCapacity} ตัว)</span>
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        totalPalletsInBay >= maxBayPallets ? 'bg-red-500' : totalPalletsInBay > 5 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, (totalPalletsInBay / maxBayPallets) * 100)}%` }}
                    />
                  </div>

                  <div className="text-[11px] text-slate-600 flex justify-between items-center font-mono">
                    <span>จัดเก็บจริง: <strong className="text-slate-900">{totalPalletsInBay}/{maxBayPallets} พาเลท</strong> ({totalUnitsInBay.toLocaleString()} ตัว)</span>
                    <span className="text-emerald-700 font-bold">ว่าง {availPallets} พาเลท ({availUnits} ตัว)</span>
                  </div>

                  {formulaBreakdown && (
                    <div className="text-[10px] bg-slate-50 p-1.5 rounded border border-slate-100 text-slate-600 font-mono">
                      💡 คำนวณ P/No {selectedLevelItem?.modelHE || '1112'}: {formulaBreakdown} = {totalUnitsInBay} ตัว
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Content for Selected Shelf Level */}
            {selectedLevelItem ? (
              <div className="mt-4 space-y-4">
                {/* Aging Status Badge */}
                <div className={`p-3 rounded-lg border flex items-center justify-between ${
                  selectedLevelItem.agingStatus === 'SAFE'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : selectedLevelItem.agingStatus === 'WARNING'
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  <div className="flex items-center space-x-2 text-xs font-bold">
                    <AlertTriangle className="w-4 h-4" />
                    <span>
                      {selectedLevelItem.agingStatus === 'SAFE' && 'สถานะปกติ (Safe FIFO)'}
                      {selectedLevelItem.agingStatus === 'WARNING' && 'เริ่มจัดเก็บนาน (ควรจัดลำดับออก)'}
                      {selectedLevelItem.agingStatus === 'OVERDUE' && 'เตือน Aging Overdue! (เร่งด่วน)'}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-extrabold px-2 py-0.5 rounded bg-white border border-slate-200">
                    {selectedLevelItem.agingDays} วัน
                  </span>
                </div>

                {/* SKU Details with Pallet Breakdown */}
                {(() => {
                  const std = selectedLevelItem.stdQtyPerPallet || 80;
                  const fullP = selectedLevelItem.fullPallets ?? Math.floor(selectedLevelItem.quantity / std);
                  const loose = selectedLevelItem.looseQty ?? (selectedLevelItem.quantity % std);
                  const totalP = fullP + (loose > 0 ? 1 : 0);

                  return (
                    <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3 text-xs shadow-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">รหัสวัตถุดิบ (Model HE):</span>
                        <span className="font-mono font-bold text-blue-600 text-sm">
                          {selectedLevelItem.modelHE}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">ชื่อ Tool:</span>
                        <span className="font-semibold text-slate-800">
                          {selectedLevelItem.partName}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">มาตรฐาน/พาเลท:</span>
                        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border">
                          {std} ตัว / พาเลทเต็ม
                        </span>
                      </div>

                      {/* Detailed Pallet Breakdown formula display */}
                      <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg space-y-1">
                        <div className="flex justify-between items-center text-[11px] font-bold text-blue-900">
                          <span>แจกแจงตามพาเลท (Pallet Breakdown):</span>
                          <span className="font-mono text-blue-700">ใช้ {totalP} Pallets</span>
                        </div>
                        <div className="text-xs font-mono text-blue-800 font-semibold">
                          ({std} × {fullP} พาเลทเต็ม) + {loose} เศษ
                        </div>
                        <div className="text-[11px] text-slate-600">
                          = <strong className="text-emerald-600 text-sm font-mono">{selectedLevelItem.quantity.toLocaleString()}</strong> ตัวรวม
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">ไลน์ที่ใช้ (Line QR):</span>
                        <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                          Line {selectedLevelItem.useLine}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">วันที่รับเข้าจัดเก็บ:</span>
                        <span className="font-mono text-slate-700">
                          {new Date(selectedLevelItem.storageInDate).toLocaleDateString('th-TH')}
                        </span>
                      </div>

                      {selectedLevelItem.remark && (
                        <div className="pt-2 border-t border-slate-100 text-[11px] text-amber-700 italic font-medium">
                          หมายเหตุ: {selectedLevelItem.remark}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Actions for occupied level */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => onOpenScanForLevel(selectedZone, selectedBayNumber, selectedLevel, 'OUT')}
                    className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center justify-center space-x-1.5 shadow-sm active:scale-95 transition-all"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>เบิกออก (OUT)</span>
                  </button>

                  <button
                    onClick={() => onOpenScanForLevel(selectedZone, selectedBayNumber, selectedLevel, 'IN')}
                    className="py-2.5 px-3 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-lg text-xs flex items-center justify-center space-x-1.5 border border-slate-300 active:scale-95 transition-all"
                  >
                    <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                    <span>เติมสินค้าเพิ่ม</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Empty Level State */
              <div className="mt-8 text-center py-8 px-4 bg-white rounded-lg border border-dashed border-slate-300 space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">ชั้น {selectedLevel} ว่างอยู่ (Empty)</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    ยังไม่มี Pallet จัดเก็บในระดับชั้นนี้ คุณสามารถสแกนรับเข้าวัตถุดิบลงตำแหน่งนี้ได้ทันที
                  </p>
                </div>

                <button
                  onClick={() => onOpenScanForLevel(selectedZone, selectedBayNumber, selectedLevel, 'IN')}
                  className="mt-3 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs inline-flex items-center space-x-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <ArrowDownRight className="w-4 h-4" />
                  <span>สแกนรับเข้าวางชั้นนี้ (IN)</span>
                </button>
              </div>
            )}
          </div>

          {/* Quick Help Footer */}
          <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-slate-500 flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              ระบบจำลองการกระจายโหลดน้ำหนัก 4 ชั้น เพื่อลดความเสียหายของโครงสร้าง Rack
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
