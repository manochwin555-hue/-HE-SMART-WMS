import * as THREE from 'three';

export interface HologramGhostTarget {
  group: THREE.Group;
  boxMesh: THREE.Mesh;
  wireMesh: THREE.Mesh;
  floorRingMesh: THREE.Mesh;
  laserPins: THREE.Mesh[];
  laserDots: THREE.Mesh[];
  boxMat: THREE.MeshStandardMaterial;
  wireMat: THREE.MeshBasicMaterial;
  floorRingMat: THREE.MeshBasicMaterial;
  pinMat: THREE.MeshBasicMaterial;
  setDimensions: (width: number, height: number, depth: number) => void;
  setPosition: (x: number, y: number, z: number) => void;
  setMode: (mode: 'EMPTY' | 'OCCUPIED' | 'AGING' | 'OVERDUE') => void;
  show: () => void;
  hide: () => void;
  updateAnimation: (elapsedTime: number) => void;
}

/**
 * Creates the unified 3D Holographic Ghost Block & Laser Target
 */
export function createHologramGhostTarget(
  defaultWidth = 1.5,
  defaultHeight = 0.95,
  defaultDepth = 1.35
): HologramGhostTarget {
  const group = new THREE.Group();
  group.visible = false;

  // A. Ghost Box Body
  const boxMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    transparent: true,
    opacity: 0.45,
    roughness: 0.1,
    metalness: 0.8,
    emissive: 0x059669,
    emissiveIntensity: 0.75,
    depthWrite: false
  });
  const boxGeo = new THREE.BoxGeometry(defaultWidth, defaultHeight, defaultDepth);
  const boxMesh = new THREE.Mesh(boxGeo, boxMat);
  boxMesh.position.y = defaultHeight / 2;
  group.add(boxMesh);

  // B. Neon Glowing Wireframe Cage
  const wireMat = new THREE.MeshBasicMaterial({ color: 0x34d399, wireframe: true });
  const wireGeo = new THREE.BoxGeometry(defaultWidth * 1.04, defaultHeight * 1.04, defaultDepth * 1.04);
  const wireMesh = new THREE.Mesh(wireGeo, wireMat);
  wireMesh.position.y = defaultHeight / 2;
  group.add(wireMesh);

  // C. 4 Glowing Corner Laser Pins
  const pinMat = new THREE.MeshBasicMaterial({ color: 0x6ee7b7 });
  const laserPins: THREE.Mesh[] = [];
  const laserDots: THREE.Mesh[] = [];

  const cornerOffsets = [
    [-defaultWidth / 2, -defaultDepth / 2],
    [defaultWidth / 2, -defaultDepth / 2],
    [-defaultWidth / 2, defaultDepth / 2],
    [defaultWidth / 2, defaultDepth / 2]
  ];

  cornerOffsets.forEach(([cx, cz]) => {
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, defaultHeight * 1.5, 8), pinMat);
    pin.position.set(cx, defaultHeight / 2, cz);
    group.add(pin);
    laserPins.push(pin);

    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), pinMat);
    dot.position.set(cx, defaultHeight * 1.25, cz);
    group.add(dot);
    laserDots.push(dot);
  });

  // D. Floor Spotlight Target Ring
  const floorRingMat = new THREE.MeshBasicMaterial({ color: 0x34d399, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
  const radius = Math.min(defaultWidth, defaultDepth) * 0.55;
  const floorRingGeo = new THREE.RingGeometry(radius * 0.75, radius * 1.05, 32);
  const floorRingMesh = new THREE.Mesh(floorRingGeo, floorRingMat);
  floorRingMesh.rotation.x = -Math.PI / 2;
  floorRingMesh.position.y = 0.02;
  group.add(floorRingMesh);

  const setDimensions = (w: number, h: number, d: number) => {
    boxMesh.geometry.dispose();
    boxMesh.geometry = new THREE.BoxGeometry(w, h, d);
    boxMesh.position.y = h / 2;

    wireMesh.geometry.dispose();
    wireMesh.geometry = new THREE.BoxGeometry(w * 1.04, h * 1.04, d * 1.04);
    wireMesh.position.y = h / 2;

    const corners = [
      [-w / 2, -d / 2],
      [w / 2, -d / 2],
      [-w / 2, d / 2],
      [w / 2, d / 2]
    ];
    laserPins.forEach((pin, i) => {
      pin.geometry.dispose();
      pin.geometry = new THREE.CylinderGeometry(0.015, 0.015, h * 1.5, 8);
      pin.position.set(corners[i][0], h / 2, corners[i][1]);
    });
    laserDots.forEach((dot, i) => {
      dot.position.set(corners[i][0], h * 1.25, corners[i][1]);
    });

    const r = Math.min(w, d) * 0.55;
    floorRingMesh.geometry.dispose();
    floorRingMesh.geometry = new THREE.RingGeometry(r * 0.75, r * 1.05, 32);
  };

  const setPosition = (x: number, y: number, z: number) => {
    group.position.set(x, y, z);
  };

  const setMode = (mode: 'EMPTY' | 'OCCUPIED' | 'AGING' | 'OVERDUE') => {
    if (mode === 'OCCUPIED') {
      // Cyan Blue for standard stored stock
      boxMat.color.setHex(0x0284c7);
      boxMat.emissive.setHex(0x0369a1);
      wireMat.color.setHex(0x38bdf8);
      pinMat.color.setHex(0x7dd3fc);
      floorRingMat.color.setHex(0x38bdf8);
    } else if (mode === 'AGING') {
      // Amber/Gold for warning / aging stock
      boxMat.color.setHex(0xd97706);
      boxMat.emissive.setHex(0xb45309);
      wireMat.color.setHex(0xfbbf24);
      pinMat.color.setHex(0xfde68a);
      floorRingMat.color.setHex(0xfbbf24);
    } else if (mode === 'OVERDUE') {
      // Vibrant Crimson for urgent / overdue
      boxMat.color.setHex(0xdc2626);
      boxMat.emissive.setHex(0x991b1b);
      wireMat.color.setHex(0xf87171);
      pinMat.color.setHex(0xfca5a5);
      floorRingMat.color.setHex(0xf87171);
    } else {
      // Emerald Green for empty receiving slot
      boxMat.color.setHex(0x10b981);
      boxMat.emissive.setHex(0x059669);
      wireMat.color.setHex(0x34d399);
      pinMat.color.setHex(0x6ee7b7);
      floorRingMat.color.setHex(0x34d399);
    }
  };

  const show = () => {
    group.visible = true;
  };

  const hide = () => {
    group.visible = false;
  };

  const updateAnimation = (elapsedTime: number) => {
    if (!group.visible) return;
    const pulse = 1.0 + Math.sin(elapsedTime * 6) * 0.025;
    boxMesh.scale.set(pulse, pulse, pulse);
    wireMesh.scale.set(pulse, pulse, pulse);
    floorRingMesh.rotation.z += 0.025;
  };

  return {
    group,
    boxMesh,
    wireMesh,
    floorRingMesh,
    laserPins,
    laserDots,
    boxMat,
    wireMat,
    floorRingMat,
    pinMat,
    setDimensions,
    setPosition,
    setMode,
    show,
    hide,
    updateAnimation
  };
}
