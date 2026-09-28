import * as THREE from 'three';
import { StorageZone } from '../../types';

export interface WalkwayPoint {
  x: number;
  z: number;
  label: string;
  bayNumber?: number;
  groupNumber?: number;
  railNumber?: number;
  headingYaw?: number; // radians
}

export interface WalkwayAisle {
  id: string;
  name: string;
  shortName: string;
  category: 'RACK_AISLE' | 'MAIN_ROAD' | 'STAGING_PATH' | 'OUTFEED' | 'INFEED';
  zone: StorageZone | 'A4_UNIFIED';
  color: string;
  points: WalkwayPoint[];
}

// ----------------------------------------------------
// 1. CY3 OUTDOOR TENT WALKWAYS (4 Racks x 25 Bays)
// ----------------------------------------------------
const createCY3RoadCenterPoints = (): WalkwayPoint[] => {
  const points: WalkwayPoint[] = [];
  // From Bay 1 (x ≈ -29) to Bay 25 (x ≈ +29) along z = 0 (Roadway between Row B & C)
  for (let b = 1; b <= 25; b++) {
    const x = (b - 13) * 2.4;
    points.push({
      x,
      z: 0,
      label: `ถนนกลาง (เสา ${String(b).padStart(2, '0')})`,
      bayNumber: b,
      headingYaw: Math.PI / 2 // facing +X (East)
    });
  }
  return points;
};

const createCY3AisleAPoints = (): WalkwayPoint[] => {
  const points: WalkwayPoint[] = [];
  // Along north outer lane z = -8.2
  for (let b = 1; b <= 25; b += 2) {
    const x = (b - 13) * 2.4;
    points.push({
      x,
      z: -8.2,
      label: `ทางเดินนอก แถว A (เสา A-${String(b).padStart(2, '0')})`,
      bayNumber: b,
      headingYaw: Math.PI / 2
    });
  }
  return points;
};

const createCY3AisleDPoints = (): WalkwayPoint[] => {
  const points: WalkwayPoint[] = [];
  // Along south outer lane z = +8.2
  for (let b = 1; b <= 25; b += 2) {
    const x = (b - 13) * 2.4;
    points.push({
      x,
      z: 8.2,
      label: `ทางเดินนอก แถว D (เสา D-${String(b).padStart(2, '0')})`,
      bayNumber: b,
      headingYaw: Math.PI / 2
    });
  }
  return points;
};

export const CY3_WALKWAYS: WalkwayAisle[] = [
  {
    id: 'CY3_ROAD_CENTER',
    name: 'ถนนกลางตรวจแร็ค B & C (Central Roadway)',
    shortName: 'ถนนกลาง (B & C)',
    category: 'MAIN_ROAD',
    zone: 'CY3-A',
    color: '#f59e0b',
    points: createCY3RoadCenterPoints()
  },
  {
    id: 'CY3_AISLE_A',
    name: 'ทางเดินตรวจแร็คแถว A (North Walkway)',
    shortName: 'ทางเดินแถว A',
    category: 'RACK_AISLE',
    zone: 'CY3-A',
    color: '#3b82f6',
    points: createCY3AisleAPoints()
  },
  {
    id: 'CY3_AISLE_D',
    name: 'ทางเดินตรวจแร็คแถว D (South Walkway)',
    shortName: 'ทางเดินแถว D',
    category: 'RACK_AISLE',
    zone: 'CY3-A',
    color: '#8b5cf6',
    points: createCY3AisleDPoints()
  }
];

// ----------------------------------------------------
// 2. A4 WAREHOUSE UNIFIED WALKWAYS (Selective B-K & Staging X1-X8)
// ----------------------------------------------------
const createA4MainAvenuePoints = (): WalkwayPoint[] => {
  const pts: WalkwayPoint[] = [];
  const xStops = [-15, -8, 0, 4.5, 12, 17.5, 23.5, 29.5, 34, 38, 44, 48];
  xStops.forEach((x, idx) => {
    pts.push({
      x,
      z: -9.5,
      label: `ถนนสายหลักอาคาร A4 (จุดเชื่อมต่อ ${idx + 1})`,
      headingYaw: Math.PI / 2
    });
  });
  return pts;
};

const createA4AislePoints = (xPos: number, aisleName: string, maxBays: number, startZ: number, spanZ: number): WalkwayPoint[] => {
  const pts: WalkwayPoint[] = [];
  for (let b = 1; b <= maxBays; b++) {
    const z = startZ - (b - 1) * spanZ;
    pts.push({
      x: xPos,
      z,
      label: `ซอย ${aisleName} (เสา ${String(b).padStart(2, '0')})`,
      bayNumber: b,
      headingYaw: Math.PI // facing deep into rack (-Z)
    });
  }
  return pts;
};

const createA4FloorPathPoints = (zPos: number, labelPrefix: string, cols: number[]): WalkwayPoint[] => {
  return cols.map((x, i) => ({
    x,
    z: zPos,
    label: `${labelPrefix} (จุดตรวจ ${i + 1})`,
    headingYaw: Math.PI / 2
  }));
};

export const A4_WALKWAYS: WalkwayAisle[] = [
  {
    id: 'A4_MAIN_AVENUE',
    name: 'ถนนสายหลักคั่นกลาง (Main Cross-Aisle Avenue)',
    shortName: 'ถนนหลักคั่นกลาง',
    category: 'MAIN_ROAD',
    zone: 'A4_UNIFIED',
    color: '#38bdf8',
    points: createA4MainAvenuePoints()
  },
  {
    id: 'A4_AISLE_BC',
    name: 'ซอยทางเดินแร็ค B-C (เสา 01-12)',
    shortName: 'ซอยแร็ค B-C',
    category: 'RACK_AISLE',
    zone: 'A4_UNIFIED',
    color: '#3b82f6',
    points: createA4AislePoints(4.5, 'แร็ค B-C', 12, -12.0, 2.3)
  },
  {
    id: 'A4_AISLE_DE',
    name: 'ซอยทางเดินแร็ค D-E (เสา 01-12)',
    shortName: 'ซอยแร็ค D-E',
    category: 'RACK_AISLE',
    zone: 'A4_UNIFIED',
    color: '#2563eb',
    points: createA4AislePoints(17.5, 'แร็ค D-E', 12, -12.0, 2.3)
  },
  {
    id: 'A4_AISLE_FG',
    name: 'ซอยทางเดินแร็ค F-G (เสา 01-12)',
    shortName: 'ซอยแร็ค F-G',
    category: 'RACK_AISLE',
    zone: 'A4_UNIFIED',
    color: '#6366f1',
    points: createA4AislePoints(29.5, 'แร็ค F-G', 12, -12.0, 2.3)
  },
  {
    id: 'A4_AISLE_HI',
    name: 'ซอยทางเดินแร็ค H-I (เสา 01-05)',
    shortName: 'ซอยแร็ค H-I',
    category: 'RACK_AISLE',
    zone: 'A4_UNIFIED',
    color: '#8b5cf6',
    points: createA4AislePoints(38.0, 'แร็ค H-I', 5, -23.5, 2.3)
  },
  {
    id: 'A4_AISLE_JK',
    name: 'ซอยทางเดินแร็ค J-K (เสา 01-05)',
    shortName: 'ซอยแร็ค J-K',
    category: 'RACK_AISLE',
    zone: 'A4_UNIFIED',
    color: '#a855f7',
    points: createA4AislePoints(46.0, 'แร็ค J-K', 5, -23.5, 2.3)
  },
  {
    id: 'A4_FLOOR_X5X8',
    name: 'ทางเดินหน้าลานวางพื้น X5-X8 (รูปตัว L)',
    shortName: 'ทางเดินลาน X5-X8',
    category: 'STAGING_PATH',
    zone: 'A4_UNIFIED',
    color: '#f59e0b',
    points: createA4FloorPathPoints(-1.0, 'ทางเดินหน้าลาน X5-X8', [-12, -4, 4, 12, 20, 28, 36])
  },
  {
    id: 'A4_FLOOR_X1X4',
    name: 'ทางเดินหน้าลานวางพื้น X1-X4',
    shortName: 'ทางเดินลาน X1-X4',
    category: 'STAGING_PATH',
    zone: 'A4_UNIFIED',
    color: '#10b981',
    points: createA4FloorPathPoints(10.5, 'ทางเดินหน้าลาน X1-X4', [-12, -5, 3, 11, 19])
  }
];

// ----------------------------------------------------
// 3. A5 CANOPY TENTS WALKWAYS (4 Tents x 7 Groups)
// ----------------------------------------------------
const createA5CrossroadPoints = (): WalkwayPoint[] => {
  const pts: WalkwayPoint[] = [];
  // Central North-South avenue (x = 0)
  for (let z = -24; z <= 24; z += 6) {
    pts.push({
      x: 0,
      z,
      label: `ถนนกากบาทกลางเต็นท์ (จุดแยก Z: ${z}m)`,
      headingYaw: 0
    });
  }
  return pts;
};

const createA5TentAislePoints = (tentId: number, zCenter: number, xStart: number, xEnd: number): WalkwayPoint[] => {
  const pts: WalkwayPoint[] = [];
  const count = 7;
  const step = (xEnd - xStart) / (count - 1);
  for (let g = 1; g <= count; g++) {
    const x = xStart + (g - 1) * step;
    pts.push({
      x,
      z: zCenter,
      label: `เต็นท์ผ้าใบ ${tentId} (ทางเดินหน้ากลุ่ม G0${g})`,
      groupNumber: g,
      headingYaw: Math.PI / 2
    });
  }
  return pts;
};

export const A5_WALKWAYS: WalkwayAisle[] = [
  {
    id: 'A5_CROSS_ROAD',
    name: 'ถนนสี่แยกกากบาทกลางเต็นท์ 1-4 (Central Crossway)',
    shortName: 'สี่แยกกลางเต็นท์',
    category: 'MAIN_ROAD',
    zone: 'A5-1',
    color: '#38bdf8',
    points: createA5CrossroadPoints()
  },
  {
    id: 'A5_TENT_1',
    name: 'ทางเดินในเต็นท์ 1 (กลุ่ม G01-G07)',
    shortName: 'ทางเดินเต็นท์ 1',
    category: 'RACK_AISLE',
    zone: 'A5-1',
    color: '#7c3aed',
    points: createA5TentAislePoints(1, -7.5, -28, -7)
  },
  {
    id: 'A5_TENT_2',
    name: 'ทางเดินในเต็นท์ 2 (กลุ่ม G01-G07)',
    shortName: 'ทางเดินเต็นท์ 2',
    category: 'RACK_AISLE',
    zone: 'A5-2',
    color: '#8b5cf6',
    points: createA5TentAislePoints(2, 7.5, -28, -7)
  },
  {
    id: 'A5_TENT_3',
    name: 'ทางเดินในเต็นท์ 3 (กลุ่ม G01-G07)',
    shortName: 'ทางเดินเต็นท์ 3',
    category: 'RACK_AISLE',
    zone: 'A5-3',
    color: '#a855f7',
    points: createA5TentAislePoints(3, -7.5, 7, 28)
  },
  {
    id: 'A5_TENT_4',
    name: 'ทางเดินในเต็นท์ 4 (กลุ่ม G01-G07)',
    shortName: 'ทางเดินเต็นท์ 4',
    category: 'RACK_AISLE',
    zone: 'A5-4',
    color: '#c084fc',
    points: createA5TentAislePoints(4, 7.5, 7, 28)
  }
];

// ----------------------------------------------------
// 4. A2 FLOW RAIL WALKWAYS (16 Rails x 8 Positions)
// ----------------------------------------------------
const createA2RailTrackPoints = (xPos: number, aisleName: string): WalkwayPoint[] => {
  const pts: WalkwayPoint[] = [];
  for (let r = 1; r <= 16; r++) {
    const z = (r - 8.5) * 1.85;
    pts.push({
      x: xPos,
      z,
      label: `${aisleName} (ราง R${String(r).padStart(2, '0')})`,
      railNumber: r,
      headingYaw: xPos < 0 ? Math.PI / 2 : -Math.PI / 2
    });
  }
  return pts;
};

export const A2_WALKWAYS: WalkwayAisle[] = [
  {
    id: 'A2_OUTFEED',
    name: 'ทางเดินหน้าไลน์ Outfeed (First-Out สู่ไลน์ประกอบ HE)',
    shortName: 'ทางเดินหน้าไลน์ Outfeed',
    category: 'OUTFEED',
    zone: 'A2',
    color: '#f59e0b',
    points: createA2RailTrackPoints(-12.5, 'ทางเดินหน้าไลน์ Outfeed')
  },
  {
    id: 'A2_INFEED',
    name: 'ทางเดินท้ายราง Infeed (First-In จุดป้อนรับเข้าพาเลท)',
    shortName: 'ทางเดินรับเข้า Infeed',
    category: 'INFEED',
    zone: 'A2',
    color: '#10b981',
    points: createA2RailTrackPoints(12.5, 'ทางเดินท้ายราง Infeed')
  },
  {
    id: 'A2_CENTER_CROSS',
    name: 'ทางเดินเชื่อมต่อหัวราง R01-R16',
    shortName: 'ทางเชื่อมหัวราง',
    category: 'MAIN_ROAD',
    zone: 'A2',
    color: '#38bdf8',
    points: [
      { x: -12.5, z: -14.5, label: 'มุม Outfeed เหนือ' },
      { x: -6.0, z: -14.5, label: 'ทางเดินหัวราง กลาง-ซ้าย' },
      { x: 0, z: -14.5, label: 'กึ่งกลางหัวราง R01' },
      { x: 6.0, z: -14.5, label: 'ทางเดินหัวราง กลาง-ขวา' },
      { x: 12.5, z: -14.5, label: 'มุม Infeed เหนือ' }
    ]
  }
];

// Helper: Create Glowing 3D Walkway Visuals Group
export const createWalkwayVisualMeshGroup = (
  walkways: WalkwayAisle[],
  activeAisleId: string,
  currentPointIndex: number,
  onPointClick?: (aisleId: string, pointIdx: number) => void
): THREE.Group => {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'WALKWAY_VISUAL_SYSTEM';

  walkways.forEach(aisle => {
    const isCurrentAisle = aisle.id === activeAisleId;
    const pts = aisle.points;
    if (pts.length < 2) return;

    // 1. Draw glowing dashed/solid walkway lines
    const lineMat = new THREE.LineBasicMaterial({
      color: isCurrentAisle ? '#38bdf8' : '#64748b',
      linewidth: isCurrentAisle ? 3 : 1,
      transparent: true,
      opacity: isCurrentAisle ? 0.85 : 0.4
    });

    const lineGeo = new THREE.BufferGeometry().setFromPoints(
      pts.map(p => new THREE.Vector3(p.x, 0.04, p.z))
    );
    const lineMesh = new THREE.Line(lineGeo, lineMat);
    rootGroup.add(lineMesh);

    // 2. Draw Walkway Waypoint Discs on the floor
    pts.forEach((p, idx) => {
      const isCurrentPoint = isCurrentAisle && idx === currentPointIndex;
      const discColor = isCurrentPoint ? '#22c55e' : isCurrentAisle ? aisle.color : '#94a3b8';
      const discRadius = isCurrentPoint ? 0.45 : isCurrentAisle ? 0.3 : 0.2;

      // Outer ring
      const ringGeo = new THREE.RingGeometry(discRadius * 0.7, discRadius, 16);
      const ringMat = new THREE.MeshBasicMaterial({
        color: discColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: isCurrentPoint ? 0.95 : 0.6
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.set(p.x, 0.045, p.z);
      ringMesh.userData = { aisleId: aisle.id, pointIdx: idx, clickableWaypoint: true };
      rootGroup.add(ringMesh);

      // Center dot
      const centerGeo = new THREE.CircleGeometry(discRadius * 0.4, 12);
      const centerMat = new THREE.MeshBasicMaterial({
        color: isCurrentPoint ? '#ffffff' : discColor,
        side: THREE.DoubleSide
      });
      const centerMesh = new THREE.Mesh(centerGeo, centerMat);
      centerMesh.rotation.x = -Math.PI / 2;
      centerMesh.position.set(p.x, 0.046, p.z);
      rootGroup.add(centerMesh);
    });
  });

  return rootGroup;
};

// Helper: Create 3D Safety Inspector "Pegman" Avatar
export const createInspectorAvatarMesh = (): THREE.Group => {
  const avatarGroup = new THREE.Group();
  avatarGroup.name = 'INSPECTOR_AVATAR';

  // Body / Torso (High-Vis Safety Orange Vest)
  const bodyGeo = new THREE.CylinderGeometry(0.22, 0.2, 0.7, 12);
  const vestMat = new THREE.MeshStandardMaterial({
    color: '#ea580c', // Bright Orange Vest
    roughness: 0.3,
    metalness: 0.1
  });
  const bodyMesh = new THREE.Mesh(bodyGeo, vestMat);
  bodyMesh.position.y = 0.85;
  avatarGroup.add(bodyMesh);

  // Reflective Safety Silver Strips on Vest
  const stripGeo = new THREE.CylinderGeometry(0.225, 0.225, 0.1, 12);
  const stripMat = new THREE.MeshBasicMaterial({ color: '#f8fafc' });
  const stripMesh1 = new THREE.Mesh(stripGeo, stripMat);
  stripMesh1.position.y = 0.95;
  avatarGroup.add(stripMesh1);

  // Head (Skin tone)
  const headGeo = new THREE.SphereGeometry(0.16, 12, 12);
  const headMat = new THREE.MeshStandardMaterial({ color: '#fed7aa', roughness: 0.5 });
  const headMesh = new THREE.Mesh(headGeo, headMat);
  headMesh.position.y = 1.35;
  avatarGroup.add(headMesh);

  // Safety Hardhat Helmet (Yellow)
  const helmetGeo = new THREE.SphereGeometry(0.18, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const helmetMat = new THREE.MeshStandardMaterial({
    color: '#eab308', // Safety Yellow Hardhat
    roughness: 0.2,
    metalness: 0.2
  });
  const helmetMesh = new THREE.Mesh(helmetGeo, helmetMat);
  helmetMesh.position.y = 1.4;
  avatarGroup.add(helmetMesh);

  // Helmet Brim
  const brimGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.03, 12);
  const brimMesh = new THREE.Mesh(brimGeo, helmetMat);
  brimMesh.position.y = 1.38;
  avatarGroup.add(brimMesh);

  // Legs (Dark Navy work pants)
  const legsGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.5, 12);
  const pantsMat = new THREE.MeshStandardMaterial({ color: '#1e293b' });
  const legsMesh = new THREE.Mesh(legsGeo, pantsMat);
  legsMesh.position.y = 0.3;
  avatarGroup.add(legsMesh);

  // Safety boots
  const bootGeo = new THREE.BoxGeometry(0.24, 0.15, 0.35);
  const bootMat = new THREE.MeshStandardMaterial({ color: '#0f172a' });
  const bootMesh = new THREE.Mesh(bootGeo, bootMat);
  bootMesh.position.set(0, 0.08, 0.05);
  avatarGroup.add(bootMesh);

  // Pulsing Directional Indicator Ring on Floor below avatar
  const pulseRingGeo = new THREE.RingGeometry(0.5, 0.65, 24);
  const pulseRingMat = new THREE.MeshBasicMaterial({
    color: '#22c55e',
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8
  });
  const pulseRing = new THREE.Mesh(pulseRingGeo, pulseRingMat);
  pulseRing.rotation.x = -Math.PI / 2;
  pulseRing.position.y = 0.03;
  avatarGroup.add(pulseRing);

  // Directional Pointer Arrow
  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(0, 0.5);
  arrowShape.lineTo(0.2, 0.1);
  arrowShape.lineTo(-0.2, 0.1);
  arrowShape.closePath();
  const arrowGeo = new THREE.ShapeGeometry(arrowShape);
  const arrowMat = new THREE.MeshBasicMaterial({ color: '#22c55e', side: THREE.DoubleSide });
  const arrowMesh = new THREE.Mesh(arrowGeo, arrowMat);
  arrowMesh.rotation.x = -Math.PI / 2;
  arrowMesh.position.set(0, 0.035, 0);
  avatarGroup.add(arrowMesh);

  return avatarGroup;
};

// Helper: Create Google Street View Style Interactive Floor Chevron & Target Ring
export const createStreetViewGroundCursor = (): THREE.Group => {
  const group = new THREE.Group();
  group.name = 'STREET_VIEW_GROUND_CURSOR';

  // Outer translucent radar ring
  const outerRingGeo = new THREE.RingGeometry(0.55, 0.75, 32);
  const outerRingMat = new THREE.MeshBasicMaterial({
    color: '#38bdf8', // Vibrant Cyan/Sky Blue
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8
  });
  const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
  outerRing.rotation.x = -Math.PI / 2;
  outerRing.position.y = 0.05;
  group.add(outerRing);

  // Inner pulsing glow disc
  const innerDiscGeo = new THREE.CircleGeometry(0.48, 24);
  const innerDiscMat = new THREE.MeshBasicMaterial({
    color: '#0284c7',
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.35
  });
  const innerDisc = new THREE.Mesh(innerDiscGeo, innerDiscMat);
  innerDisc.rotation.x = -Math.PI / 2;
  innerDisc.position.y = 0.052;
  group.add(innerDisc);

  // Forward Navigation Chevron Arrow (Google Street View Style)
  const chevronShape = new THREE.Shape();
  chevronShape.moveTo(0, 0.32);
  chevronShape.lineTo(0.22, 0.05);
  chevronShape.lineTo(0.12, 0.05);
  chevronShape.lineTo(0, 0.2);
  chevronShape.lineTo(-0.12, 0.05);
  chevronShape.lineTo(-0.22, 0.05);
  chevronShape.closePath();

  const chevronGeo = new THREE.ShapeGeometry(chevronShape);
  const chevronMat = new THREE.MeshBasicMaterial({
    color: '#ffffff',
    side: THREE.DoubleSide
  });
  const chevronMesh = new THREE.Mesh(chevronGeo, chevronMat);
  chevronMesh.rotation.x = -Math.PI / 2;
  chevronMesh.position.set(0, 0.055, 0);
  group.add(chevronMesh);

  group.visible = false;
  return group;
};
