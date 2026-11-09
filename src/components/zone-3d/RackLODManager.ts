import * as THREE from 'three';

export type LODLevel = 'HIGH' | 'PROXY' | 'HYBRID';

export interface RegisteredLODItem {
  id: string;
  highPolyGroup: THREE.Object3D;
  proxyBoxGroup: THREE.Object3D;
  centerPosition: THREE.Vector3;
  distanceThreshold: number;
  hysteresis?: number;
  currentLevel: 'HIGH' | 'PROXY';
}

export interface ProxyBoxOptions {
  width: number;
  height: number;
  depth: number;
  color?: number | string;
  edgeColor?: number | string;
  levels?: number; // default 4 levels
  opacity?: number;
  label?: string;
}

/**
 * Creates a stylized, modern translucent bounding box representing a rack bay or rack row.
 * Features translucent volumetric body, crisp glowing edge highlights, and level partition indicators.
 */
export function createStylizedProxyBoundingBox(options: ProxyBoxOptions): THREE.Group {
  const {
    width,
    height,
    depth,
    color = 0x2563eb,
    edgeColor = 0x38bdf8,
    levels = 4,
    opacity = 0.22,
  } = options;

  const group = new THREE.Group();
  group.name = 'Rack_Proxy_LOD';

  // 1. Translucent Volumetric Body
  const boxGeo = new THREE.BoxGeometry(width, height, depth);
  const boxMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity,
    roughness: 0.3,
    metalness: 0.2,
    depthWrite: false, // Prevents z-fighting and sorting glitches
  });
  const bodyMesh = new THREE.Mesh(boxGeo, boxMat);
  bodyMesh.position.y = height / 2;
  bodyMesh.castShadow = false;
  bodyMesh.receiveShadow = false;
  group.add(bodyMesh);

  // 2. Crisp Glowing Outer Edge Lines
  const edgesGeo = new THREE.EdgesGeometry(boxGeo);
  const edgesMat = new THREE.LineBasicMaterial({
    color: new THREE.Color(edgeColor),
    transparent: true,
    opacity: 0.85,
    linewidth: 1,
  });
  const edgesLines = new THREE.LineSegments(edgesGeo, edgesMat);
  edgesLines.position.y = height / 2;
  group.add(edgesLines);

  // 3. Interior Shelf Tier Divider Lines (Subtle level partitions)
  if (levels > 1) {
    const tierMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(edgeColor),
      transparent: true,
      opacity: 0.45,
    });
    const levelHeight = height / levels;
    for (let i = 1; i < levels; i++) {
      const yLvl = i * levelHeight;
      // Front beam line
      const pointsFront = [
        new THREE.Vector3(-width / 2, yLvl, depth / 2),
        new THREE.Vector3(width / 2, yLvl, depth / 2),
      ];
      const lineFront = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pointsFront), tierMat);
      // Rear beam line
      const pointsRear = [
        new THREE.Vector3(-width / 2, yLvl, -depth / 2),
        new THREE.Vector3(width / 2, yLvl, -depth / 2),
      ];
      const lineRear = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pointsRear), tierMat);
      group.add(lineFront, lineRear);
    }
  }

  return group;
}

/**
 * Controller class that tracks registered racks and manages LOD transitions based on camera distance.
 */
export class RackLODManager {
  private items: Map<string, RegisteredLODItem> = new Map();
  private defaultThreshold: number;
  private hysteresis: number;

  constructor(defaultThreshold = 18, hysteresis = 2.0) {
    this.defaultThreshold = defaultThreshold;
    this.hysteresis = hysteresis;
  }

  public register(item: Omit<RegisteredLODItem, 'currentLevel' | 'hysteresis'> & { hysteresis?: number }): void {
    const fullItem: RegisteredLODItem = {
      ...item,
      hysteresis: item.hysteresis ?? this.hysteresis,
      currentLevel: 'HIGH',
    };
    // Initially ensure high poly is visible and proxy is hidden
    fullItem.highPolyGroup.visible = true;
    fullItem.proxyBoxGroup.visible = false;
    this.items.set(item.id, fullItem);
  }

  public unregister(id: string): void {
    this.items.delete(id);
  }

  public clear(): void {
    this.items.clear();
  }

  /**
   * Updates visibility of all registered rack items according to camera position.
   * Uses hysteresis to prevent rapid flickering on boundary distances.
   */
  public update(cameraPosition: THREE.Vector3): {
    highCount: number;
    proxyCount: number;
    activeLOD: LODLevel;
    closestDistance: number;
  } {
    let highCount = 0;
    let proxyCount = 0;
    let closestDistance = Infinity;

    this.items.forEach((item) => {
      const dist = cameraPosition.distanceTo(item.centerPosition);
      if (dist < closestDistance) closestDistance = dist;

      const threshold = item.distanceThreshold || this.defaultThreshold;
      const hyst = item.hysteresis ?? this.hysteresis;

      if (item.currentLevel === 'HIGH') {
        // Only swap to PROXY if distance exceeds threshold + hysteresis
        if (dist > threshold + hyst) {
          item.currentLevel = 'PROXY';
          item.highPolyGroup.visible = false;
          item.proxyBoxGroup.visible = true;
        }
      } else {
        // In PROXY mode: only swap back to HIGH if distance is less than threshold - hysteresis
        if (dist < threshold - hyst) {
          item.currentLevel = 'HIGH';
          item.highPolyGroup.visible = true;
          item.proxyBoxGroup.visible = false;
        }
      }

      if (item.currentLevel === 'HIGH') {
        highCount++;
      } else {
        proxyCount++;
      }
    });

    let activeLOD: LODLevel = 'HIGH';
    if (proxyCount > 0 && highCount === 0) {
      activeLOD = 'PROXY';
    } else if (proxyCount > 0 && highCount > 0) {
      activeLOD = 'HYBRID';
    }

    return {
      highCount,
      proxyCount,
      activeLOD,
      closestDistance: closestDistance === Infinity ? 0 : Math.round(closestDistance * 10) / 10,
    };
  }
}

/**
 * High-precision rolling-window FPS counter for Three.js render loops.
 */
export class RenderFPSCounter {
  private frameTimes: number[] = [];
  private lastTimestamp = performance.now();
  private maxSamples = 30;
  private currentFPS = 60;
  private lastUpdate = performance.now();

  public tick(): number {
    const now = performance.now();
    const delta = now - this.lastTimestamp;
    this.lastTimestamp = now;

    if (delta > 0) {
      this.frameTimes.push(1000 / delta);
      if (this.frameTimes.length > this.maxSamples) {
        this.frameTimes.shift();
      }
    }

    // Refresh smoothed readout every 150ms
    if (now - this.lastUpdate > 150) {
      if (this.frameTimes.length > 0) {
        const sum = this.frameTimes.reduce((acc, val) => acc + val, 0);
        this.currentFPS = Math.round(sum / this.frameTimes.length);
      }
      this.lastUpdate = now;
    }

    return this.currentFPS;
  }

  public getFPS(): number {
    return this.currentFPS;
  }
}
