import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { InventoryItem, StorageZone } from '../types';
import { 
  Maximize2, 
  MousePointerClick, 
  Info, 
  Map, 
  Minimize, 
  Sparkles, 
  Bot, 
  Layers, 
  Eye, 
  Compass, 
  RotateCw, 
  Boxes,
  Zap,
  Activity,
  Sliders,
  ChevronUp,
  ChevronDown,
  EyeOff
} from 'lucide-react';

interface Warehouse3DMapProps {
  items: InventoryItem[];
  searchQuery?: string;
  onSelectBay: (zone: StorageZone, bayNumber: number) => void;
  isDashboardFullscreen?: boolean;
}

export const Warehouse3DMap: React.FC<Warehouse3DMapProps> = ({ 
  items, 
  searchQuery = '', 
  onSelectBay, 
  isDashboardFullscreen 
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  
  const [hoveredInfo, setHoveredInfo] = useState<{ zone: string; bay: number; qty: number; itemsCount: number; mainModel: string } | null>(null);
  const [isAutoRotate, setIsAutoRotate] = useState<boolean>(false);
  const [viewPreset, setViewPreset] = useState<'3D' | 'ISO' | 'TOP' | 'AISLE1' | 'AISLE2'>('3D');
  const [isControlsOpen, setIsControlsOpen] = useState<boolean>(true);
  const [isSelfFullscreen, setIsSelfFullscreen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (isSelfFullscreen) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      setIsSelfFullscreen(false);
    } else {
      if (containerRef.current && containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {
          // Fallback to overlay fullscreen
        });
      }
      setIsSelfFullscreen(true);
    }
  };

  // Listen for escape key or fullscreen change
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

  useEffect(() => {
    if (!mountRef.current) return;
    let width = mountRef.current.clientWidth;
    let height = mountRef.current.clientHeight || (isDashboardFullscreen ? window.innerHeight - 150 : 520);

    // 1. Scene & Bright High-Visibility Studio Theme Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0f172a'); // Bright Clean Slate Navy Background (Easier to see)
    scene.fog = new THREE.FogExp2('#0f172a', 0.005);

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(19, 28, 22);
    cameraRef.current = camera;

    // 3. WebGL Renderer with High Precision & Shadows
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length > 0) {
        const { width: newWidth, height: newHeight } = entries[0].contentRect;
        if (newWidth > 0 && newHeight > 0) {
          camera.aspect = newWidth / newHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(newWidth, newHeight);
        }
      }
    });
    resizeObserver.observe(mountRef.current);

    while (mountRef.current.firstChild) {
      mountRef.current.removeChild(mountRef.current.firstChild);
    }
    mountRef.current.appendChild(renderer.domElement);

    // 4. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Prevents camera going below floor
    controls.target.set(19, 0, -2);
    controlsRef.current = controls;

    // 5. Bright Lighting Setup for Full Visibility
    const ambientLight = new THREE.AmbientLight(0xf8fafc, 1.2); // Bright ambient light
    scene.add(ambientLight);

    const mainSpotLight = new THREE.DirectionalLight(0xffffff, 1.8);
    mainSpotLight.position.set(20, 35, 20);
    mainSpotLight.castShadow = true;
    mainSpotLight.shadow.mapSize.width = 2048;
    mainSpotLight.shadow.mapSize.height = 2048;
    scene.add(mainSpotLight);

    // Secondary fill light from opposite angle to remove pitch dark shadows
    const fillLight = new THREE.DirectionalLight(0xdbeafe, 1.2);
    fillLight.position.set(-25, 30, -20);
    scene.add(fillLight);

    const frontLight = new THREE.DirectionalLight(0xe0f2fe, 0.8);
    frontLight.position.set(20, 15, 35);
    scene.add(frontLight);

    // Cyan & Purple Accent Spotlights
    const cyanLight = new THREE.PointLight(0x06b6d4, 3.0, 50);
    cyanLight.position.set(-5, 18, 10);
    scene.add(cyanLight);

    const purpleLight = new THREE.PointLight(0x8b5cf6, 3.0, 50);
    purpleLight.position.set(40, 18, -15);
    scene.add(purpleLight);

    // 6. Bright High-Tech Floor with Grid Wireframe
    const floorGeo = new THREE.PlaneGeometry(80, 50);
    const floorMat = new THREE.MeshStandardMaterial({ 
      color: 0x1e293b, 
      roughness: 0.4, 
      metalness: 0.4 
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.position.set(19, -0.02, 0);
    scene.add(floor);

    // Cyber Grid lines on floor (Bright blue grid)
    const gridHelper = new THREE.GridHelper(80, 80, 0x38bdf8, 0x475569);
    gridHelper.position.set(19, -0.01, 0);
    scene.add(gridHelper);

    // 7. Warehouse Rack Dimensions
    const bayWidth = 1.2;
    const bayDepth = 1.2;
    const bayHeight = 4.2;
    const baySpacingZ = 1.35; 
    const rackSpacingX = 4.0;

    const racksData = [
      { id: 'B', bays: 12, startX: 0, startZ: -7 },
      { id: 'C', bays: 12, startX: rackSpacingX * 1, startZ: -7 },
      { id: 'D', bays: 12, startX: rackSpacingX * 2, startZ: -7 },
      { id: 'E', bays: 12, startX: rackSpacingX * 3, startZ: -7 },
      { id: 'F', bays: 12, startX: rackSpacingX * 4, startZ: -7 },
      
      { id: 'G', bays: 5, startX: rackSpacingX * 5.5, startZ: -7 },
      { id: 'H', bays: 5, startX: rackSpacingX * 6.5, startZ: -7 },
      { id: 'I', bays: 5, startX: rackSpacingX * 7.5, startZ: -7 },
      { id: 'J', bays: 5, startX: rackSpacingX * 8.5, startZ: -7 },
      { id: 'K', bays: 5, startX: rackSpacingX * 9.5, startZ: -7 },
    ];

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const interactableObjects: THREE.Mesh[] = [];

    // Realistic Materials
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.2 }); // Metallic Steel Uprights
    const beamMat = new THREE.MeshStandardMaterial({ color: 0xf97316, metalness: 0.6, roughness: 0.3 }); // Vibrant Orange beams
    const beaconMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 1.0 }); // Top LED Beacons
    
    // Wooden Pallet Material
    const palletWoodMat = new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.8, metalness: 0.1 }); // Realistic Wood

    const bayGeo = new THREE.BoxGeometry(bayWidth, bayHeight, bayDepth);
    const invisibleMat = new THREE.MeshBasicMaterial({ visible: false });

    // Render Each Rack Row & Bay
    racksData.forEach(rack => {
      // Create Aisle Floor Tag for each rack
      const tagCanvas = document.createElement('canvas');
      tagCanvas.width = 128;
      tagCanvas.height = 64;
      const ctx = tagCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, 128, 64);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, 124, 60);
        ctx.font = 'bold 28px monospace';
        ctx.fillStyle = '#38bdf8';
        ctx.textAlign = 'center';
        ctx.fillText(`RACK ${rack.id}`, 64, 42);
      }
      const tagTexture = new THREE.CanvasTexture(tagCanvas);
      const tagGeo = new THREE.PlaneGeometry(1.6, 0.8);
      const tagMat = new THREE.MeshBasicMaterial({ map: tagTexture, transparent: true });
      const tagMesh = new THREE.Mesh(tagGeo, tagMat);
      tagMesh.rotation.x = -Math.PI / 2;
      tagMesh.position.set(rack.startX, 0.01, rack.startZ + (rack.bays * baySpacingZ) + 0.8);
      scene.add(tagMesh);

      for (let i = 0; i < rack.bays; i++) {
        const bayNum = i + 1;
        const bayGroup = new THREE.Group();
        const posX = rack.startX;
        const posZ = rack.startZ + ((rack.bays - bayNum) * baySpacingZ);
        bayGroup.position.set(posX, 0, posZ);

        // 1. Steel Frame Posts (4 Uprights)
        const postGeo = new THREE.BoxGeometry(0.08, bayHeight, 0.08);
        const posts = [
          [-bayWidth/2, bayDepth/2], [bayWidth/2, bayDepth/2],
          [-bayWidth/2, -bayDepth/2], [bayWidth/2, -bayDepth/2]
        ];
        posts.forEach(pos => {
          const post = new THREE.Mesh(postGeo, frameMat);
          post.position.set(pos[0], bayHeight/2, pos[1]);
          post.castShadow = true;
          post.receiveShadow = true;
          bayGroup.add(post);

          // Glowing LED status beacon on top of post
          const beaconGeo = new THREE.SphereGeometry(0.05, 8, 8);
          const beacon = new THREE.Mesh(beaconGeo, beaconMat);
          beacon.position.set(pos[0], bayHeight + 0.05, pos[1]);
          bayGroup.add(beacon);
        });

        // Horizontal beams & cross support (4 levels)
        const beamGeo = new THREE.BoxGeometry(bayWidth, 0.07, 0.04);
        const sideBeamGeo = new THREE.BoxGeometry(0.04, 0.07, bayDepth);
        for(let l=1; l<=4; l++) {
          const levelY = (l * (bayHeight / 4)) - 0.2;
          
          const beamFront = new THREE.Mesh(beamGeo, beamMat);
          beamFront.position.set(0, levelY, bayDepth/2);
          const beamBack = new THREE.Mesh(beamGeo, beamMat);
          beamBack.position.set(0, levelY, -bayDepth/2);
          
          const sideLeft = new THREE.Mesh(sideBeamGeo, frameMat);
          sideLeft.position.set(-bayWidth/2, levelY, 0);
          const sideRight = new THREE.Mesh(sideBeamGeo, frameMat);
          sideRight.position.set(bayWidth/2, levelY, 0);

          bayGroup.add(beamFront, beamBack, sideLeft, sideRight);
        }

        // 2. Add Realistic Wooden Pallets + Stacked Boxes with Neon Glowing Base
        const bayItems = items.filter(it => it.zone === rack.id && it.bayNumber === bayNum);
        
        bayItems.forEach(item => {
           const levelY = (item.level * (bayHeight / 4)) - 0.2 + 0.08;
           const palletBoxGroup = new THREE.Group();
           palletBoxGroup.position.set(0, levelY, 0);

           let isSearchMatch = false;
           if (searchQuery && searchQuery.trim() !== '') {
             const q = searchQuery.trim().toLowerCase();
             isSearchMatch =
               item.modelHE.toLowerCase().includes(q) ||
               item.partName.toLowerCase().includes(q) ||
               item.locatorCode.toLowerCase().includes(q) ||
               item.qrCode.toLowerCase().includes(q);
           }

           // Determine Status Colors & Neon Light Colors
           let boxColor = 0x2563eb; // Royal Blue
           let neonColor = 0x00f0ff; // Neon Cyan
           let neonIntensity = 1.0;

           if (item.agingDays > 30) {
             boxColor = 0xf59e0b; // Amber Aging
             neonColor = 0xffaa00; // Neon Amber
             neonIntensity = 1.2;
           }
           if (item.quantity <= (item.safetyStock ?? 300)) {
             boxColor = 0xef4444; // Low Stock Red
             neonColor = 0xff0055; // Neon Red/Pink
             neonIntensity = 1.5;
           }

           if (searchQuery && searchQuery.trim() !== '') {
             if (isSearchMatch) {
               boxColor = 0x06b6d4;
               neonColor = 0x00ffff;
               neonIntensity = 2.0;
             } else {
               boxColor = 0x475569;
               neonColor = 0x334155;
               neonIntensity = 0.2;
             }
           }

           // A. REALISTIC WOODEN PALLET STRUCTURE
           // 1. Top Slatted Wooden Planks
           const plankGeo = new THREE.BoxGeometry(0.92, 0.03, 0.18);
           [-0.32, -0.11, 0.11, 0.32].forEach(pz => {
             const plank = new THREE.Mesh(plankGeo, palletWoodMat);
             plank.position.set(0, 0.08, pz);
             plank.castShadow = true;
             palletBoxGroup.add(plank);
           });

           // 2. Bottom Wooden Runners/Skids
           const runnerGeo = new THREE.BoxGeometry(0.08, 0.08, 0.90);
           [-0.40, 0, 0.40].forEach(rx => {
             const runner = new THREE.Mesh(runnerGeo, palletWoodMat);
             runner.position.set(rx, 0.04, 0);
             runner.castShadow = true;
             palletBoxGroup.add(runner);
           });

           // B. CARGO RECTANGULAR BOX STACKED ON PALLET
           const boxMat = new THREE.MeshStandardMaterial({ 
             color: boxColor, 
             roughness: 0.4,
             metalness: 0.2,
             transparent: searchQuery && searchQuery.trim() !== '' && !isSearchMatch ? true : false,
             opacity: searchQuery && searchQuery.trim() !== '' && !isSearchMatch ? 0.3 : 1.0
           });

           const boxGeo = new THREE.BoxGeometry(0.82, 0.46, 0.82);
           const cargoBox = new THREE.Mesh(boxGeo, boxMat);
           cargoBox.position.set(0, 0.32, 0);
           cargoBox.castShadow = true;
           cargoBox.receiveShadow = true;
           palletBoxGroup.add(cargoBox);

           // Shipping Barcode Label on front of cargo box
           const labelGeo = new THREE.PlaneGeometry(0.32, 0.20);
           const labelMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
           const label = new THREE.Mesh(labelGeo, labelMat);
           label.position.set(0, 0.32, 0.415);
           palletBoxGroup.add(label);

           // C. NEON GLOWING LED LIGHT STRIP ON PALLET BASE (ดูง่าย เข้าใจง่าย)
           const neonRimGeo = new THREE.BoxGeometry(0.96, 0.04, 0.96);
           const neonRimMat = new THREE.MeshStandardMaterial({
             color: neonColor,
             emissive: neonColor,
             emissiveIntensity: neonIntensity,
             roughness: 0.1
           });
           const neonRim = new THREE.Mesh(neonRimGeo, neonRimMat);
           neonRim.position.set(0, 0.01, 0);
           palletBoxGroup.add(neonRim);

           const palletPointLight = new THREE.PointLight(neonColor, neonIntensity, 1.8);
           palletPointLight.position.set(0, 0.15, 0);
           palletBoxGroup.add(palletPointLight);

           bayGroup.add(palletBoxGroup);

           // Laser Target Beam for matching search query
           if (searchQuery && searchQuery.trim() !== '' && isSearchMatch) {
             const laserGeo = new THREE.CylinderGeometry(0.02, 0.02, 10, 8);
             const laserMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.8 });
             const laser = new THREE.Mesh(laserGeo, laserMat);
             laser.position.set(0, levelY + 5, 0);
             bayGroup.add(laser);

             const targetRingGeo = new THREE.RingGeometry(0.5, 0.65, 32);
             const targetRingMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide });
             const targetRing = new THREE.Mesh(targetRingGeo, targetRingMat);
             targetRing.rotation.x = -Math.PI / 2;
             targetRing.position.set(0, 0.02, 0);
             bayGroup.add(targetRing);
           }
        });

        // 3. Invisible Interaction Mesh
        const interactMesh = new THREE.Mesh(bayGeo, invisibleMat);
        interactMesh.position.set(0, bayHeight / 2, 0);
        interactMesh.userData = { 
          zone: rack.id, 
          bay: bayNum,
          itemsCount: bayItems.length,
          qty: bayItems.reduce((acc, curr) => acc + curr.quantity, 0),
          mainModel: bayItems.length > 0 ? bayItems[0].modelHE : 'ไม่มีสินค้า (Empty)'
        };
        bayGroup.add(interactMesh);
        
        scene.add(bayGroup);
        interactableObjects.push(interactMesh);
      }
    });

    // Hover Highlight Wireframe Box
    let hoveredMesh: THREE.Mesh | null = null;
    const highlightBoxGeo = new THREE.BoxGeometry(bayWidth + 0.15, bayHeight + 0.15, bayDepth + 0.15);
    const highlightBox = new THREE.Mesh(
      highlightBoxGeo, 
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true, transparent: true, opacity: 0.9 })
    );
    highlightBox.visible = false;
    scene.add(highlightBox);

    const onPointerMove = (e: MouseEvent) => {
      if (!mountRef.current) return;
      const rect = mountRef.current.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactableObjects);

      if (intersects.length > 0) {
        const object = intersects[0].object as THREE.Mesh;
        if (hoveredMesh !== object) {
          hoveredMesh = object;
          highlightBox.visible = true;
          const worldPos = new THREE.Vector3();
          object.getWorldPosition(worldPos);
          highlightBox.position.copy(worldPos);
          
          setHoveredInfo({ 
            zone: object.userData.zone, 
            bay: object.userData.bay,
            qty: object.userData.qty,
            itemsCount: object.userData.itemsCount,
            mainModel: object.userData.mainModel
          });
          document.body.style.cursor = 'pointer';
        }
      } else {
        if (hoveredMesh) {
          hoveredMesh = null;
          highlightBox.visible = false;
          setHoveredInfo(null);
          document.body.style.cursor = 'default';
        }
      }
    };

    const onClick = (e: MouseEvent) => {
      if (!mountRef.current) return;
      const rect = mountRef.current.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactableObjects);

      if (intersects.length > 0) {
        const object = intersects[0].object;
        const { zone, bay } = object.userData;
        onSelectBay(zone, bay);
      }
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('pointermove', onPointerMove);
    domElement.addEventListener('click', onClick);

    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (isAutoRotate) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 2.0;
      } else {
        controls.autoRotate = false;
      }
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      domElement.removeEventListener('pointermove', onPointerMove);
      domElement.removeEventListener('click', onClick);
      resizeObserver.disconnect();
      document.body.style.cursor = 'default';
      renderer.dispose();
      scene.clear();
    };
  }, [items, isDashboardFullscreen, searchQuery, isAutoRotate]);

  // Camera Presets Helper
  const setCameraView = (type: '3D' | 'ISO' | 'TOP' | 'AISLE1' | 'AISLE2') => {
    setViewPreset(type);
    if (!controlsRef.current || !cameraRef.current) return;

    if (type === '3D') {
      cameraRef.current.position.set(19, 28, 22);
      controlsRef.current.target.set(19, 0, -2);
    } else if (type === 'ISO') {
      // Isometric View Angle (45 degrees high isometric look)
      cameraRef.current.position.set(40, 32, 40);
      controlsRef.current.target.set(19, 0, -2);
    } else if (type === 'TOP') {
      cameraRef.current.position.set(19, 45, 0.01);
      controlsRef.current.target.set(19, 0, 0);
    } else if (type === 'AISLE1') {
      cameraRef.current.position.set(8, 6, 8);
      controlsRef.current.target.set(8, 2, -2);
    } else if (type === 'AISLE2') {
      cameraRef.current.position.set(30, 6, 8);
      controlsRef.current.target.set(30, 2, -2);
    }
    controlsRef.current.update();
  };

  return (
    <div 
      ref={containerRef}
      className={`relative w-full bg-slate-950 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden transition-all duration-300 ${
        isSelfFullscreen 
          ? 'fixed inset-0 z-[99999] w-screen h-screen rounded-none border-0' 
          : 'h-full'
      }`}
    >
      {/* AI HUD Header Banner (Top Left) with Collapsible Toggle & Fullscreen Button */}
      <div className="absolute top-3 sm:top-4 left-3 sm:left-4 z-20 pointer-events-none">
        {isControlsOpen ? (
          <div className="bg-slate-900/95 backdrop-blur-md border border-cyan-500/30 p-3 sm:p-3.5 rounded-2xl shadow-2xl flex flex-col pointer-events-auto space-y-2 max-w-xs sm:max-w-sm animate-fadeIn">
            <div className="flex items-center justify-between gap-2 text-white">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-cyan-500/20 border border-cyan-400/40">
                  <Bot className="w-4 h-4 text-cyan-400 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-black text-xs tracking-tight text-white flex items-center space-x-1.5">
                    <span>เครื่องมือมุมมอง 3D</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  </h3>
                  <p className="text-[10px] text-cyan-300/80 font-mono">Real-time Spatial 3D Controls</p>
                </div>
              </div>

              <div className="flex items-center space-x-1.5">
                {/* Fullscreen Button */}
                <button
                  onClick={toggleFullscreen}
                  className="flex items-center space-x-1 px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-slate-950 rounded-lg text-[10px] font-black shadow-md border border-cyan-300 transition-all active:scale-95"
                  title={isSelfFullscreen ? "ออกจากโหมดเต็มจอ (Esc)" : "กดดูแบบเต็มจอ (Fullscreen)"}
                >
                  {isSelfFullscreen ? (
                    <>
                      <Minimize className="w-3 h-3" />
                      <span>ปิดเต็มจอ</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-3 h-3" />
                      <span>เต็มจอ</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setIsControlsOpen(false)}
                  className="flex items-center space-x-1 px-1.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[10px] font-bold border border-slate-700 transition-all"
                  title="ซ่อนแถบเครื่องมือปรับมุม"
                >
                  <EyeOff className="w-3 h-3 text-cyan-400" />
                  <span>ซ่อน</span>
                </button>
              </div>
            </div>

            {/* Quick Camera Presets */}
            <div className="flex items-center gap-1.5 pt-1 overflow-x-auto text-[10px] font-bold pb-0.5">
              <button
                onClick={() => setCameraView('3D')}
                className={`px-2 py-1 rounded-md transition-all flex items-center space-x-1 whitespace-nowrap ${
                  viewPreset === '3D' ? 'bg-cyan-500 text-slate-950 font-black shadow-md' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Compass className="w-3 h-3" />
                <span>3D Overview</span>
              </button>
              <button
                onClick={() => setCameraView('ISO')}
                className={`px-2 py-1 rounded-md transition-all flex items-center space-x-1 whitespace-nowrap ${
                  viewPreset === 'ISO' ? 'bg-cyan-500 text-slate-950 font-black shadow-md' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Boxes className="w-3 h-3" />
                <span>ISO 45°</span>
              </button>
              <button
                onClick={() => setCameraView('TOP')}
                className={`px-2 py-1 rounded-md transition-all flex items-center space-x-1 whitespace-nowrap ${
                  viewPreset === 'TOP' ? 'bg-cyan-500 text-slate-950 font-black shadow-md' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>Top-Down</span>
              </button>
              <button
                onClick={() => setCameraView('AISLE1')}
                className={`px-2 py-1 rounded-md transition-all flex items-center space-x-1 ${
                  viewPreset === 'AISLE1' ? 'bg-cyan-500 text-slate-950 font-black shadow-md' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>Aisle B-F</span>
              </button>
              <button
                onClick={() => setCameraView('AISLE2')}
                className={`px-2 py-1 rounded-md transition-all flex items-center space-x-1 ${
                  viewPreset === 'AISLE2' ? 'bg-cyan-500 text-slate-950 font-black shadow-md' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>Aisle G-K</span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-800">
              <button
                onClick={() => setIsAutoRotate(!isAutoRotate)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 w-full justify-center ${
                  isAutoRotate ? 'bg-cyan-500 text-slate-950 shadow-md font-black' : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                <RotateCw className={`w-3.5 h-3.5 ${isAutoRotate ? 'animate-spin' : ''}`} />
                <span>{isAutoRotate ? 'กำลังหมุนรอบ 360°' : 'หมุนอัตโนมัติ 360° (Orbit)'}</span>
              </button>
            </div>

            {searchQuery && searchQuery.trim() !== '' && (
              <div className="px-2.5 py-1 bg-cyan-950/80 border border-cyan-400 rounded-lg text-cyan-200 font-mono text-[11px] flex items-center space-x-1.5 animate-pulse">
                <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Laser Highlight: "{searchQuery}"</span>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setIsControlsOpen(true)}
            className="pointer-events-auto flex items-center space-x-2 px-3 py-2 bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md border border-cyan-500/40 text-cyan-300 hover:text-white rounded-xl shadow-2xl font-bold text-xs transition-all active:scale-95 group animate-fadeIn"
            title="คลิกเพื่อเปิดเครื่องมือปรับมุมมอง 3D"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-90 transition-transform" />
            <span>ปรับมุมมอง 3D</span>
            <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-white" />
          </button>
        )}
      </div>

      {/* Top Right Cyber Legend */}
      <div className="absolute top-4 right-4 z-10 pointer-events-none">
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 p-3 rounded-2xl shadow-2xl space-y-2 text-xs">
          {searchQuery && searchQuery.trim() !== '' ? (
            <>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_10px_#00f0ff]" />
                <span className="text-cyan-200 font-bold">ตรงคำค้นหา "{searchQuery}"</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded bg-slate-700 opacity-30" />
                <span className="text-slate-400 font-medium">รายการอื่น (Translucent)</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-sm bg-blue-600 border border-blue-400 shadow-[0_0_8px_#2563eb]" />
                <span className="text-slate-200 font-semibold">มีสินค้า (In Stock)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-sm bg-amber-500 border border-amber-300 shadow-[0_0_8px_#f59e0b]" />
                <span className="text-amber-300 font-semibold">สินค้า Aging (&gt;30 วัน)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-sm bg-red-500 border border-red-300 shadow-[0_0_8px_#ef4444]" />
                <span className="text-red-300 font-semibold">Safety Stock ต่ำ</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Floating Hologram Card on Hover */}
      {hoveredInfo && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <div className="bg-slate-900/95 text-white border border-cyan-500/50 px-5 py-2.5 rounded-2xl shadow-2xl flex items-center space-x-3 font-sans animate-fadeIn backdrop-blur-md">
            <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-xl">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-sm text-cyan-300 font-mono">
                  Rack {hoveredInfo.zone}{hoveredInfo.bay}
                </span>
                <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">
                  {hoveredInfo.itemsCount}/4 ชั้น
                </span>
              </div>
              <div className="text-xs text-slate-300 font-medium">
                {hoveredInfo.mainModel} • <span className="font-bold text-white">{hoveredInfo.qty.toLocaleString()} Units</span>
              </div>
            </div>
            <div className="pl-2 border-l border-slate-800 text-[11px] text-cyan-400 font-bold flex items-center space-x-1">
              <MousePointerClick className="w-4 h-4 text-cyan-400 animate-bounce" />
              <span>คลิกเพื่อดู 3D Rack Inspector</span>
            </div>
          </div>
        </div>
      )}

      {/* Three.js Canvas mount */}
      <div 
        ref={mountRef} 
        className="w-full h-full transition-all duration-300"
      />
    </div>
  );
};
