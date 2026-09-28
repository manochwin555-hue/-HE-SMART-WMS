import * as THREE from 'three';

export interface RackBayNeonHighlight {
  group: THREE.Group;
  setBay: (
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    depth: number,
    colorHex?: number
  ) => void;
  show: () => void;
  hide: () => void;
  update: (elapsedTime: number) => void;
  dispose: () => void;
}

/**
 * Creates a subtle 'Neon Edge' wireframe contour around the rack structure components
 * (load beams, upright posts, shelf decking) of a bay upon hover or selection.
 */
export function createRackBayNeonHighlight(): RackBayNeonHighlight {
  const group = new THREE.Group();
  group.visible = false;

  const defaultColor = 0x38bdf8; // Electric Cyan
  const neonMat = new THREE.LineBasicMaterial({
    color: defaultColor,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });

  const faintBeamGlowMat = new THREE.MeshBasicMaterial({
    color: defaultColor,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
  });

  const floorGlowMat = new THREE.MeshBasicMaterial({
    color: defaultColor,
    transparent: true,
    opacity: 0.14,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  // 1. Front Beam Neon Box Outline
  const frontBeamGeo = new THREE.BoxGeometry(1, 0.1, 0.08);
  const frontBeamEdges = new THREE.LineSegments(new THREE.EdgesGeometry(frontBeamGeo), neonMat);
  const frontBeamGlow = new THREE.Mesh(frontBeamGeo, faintBeamGlowMat);
  group.add(frontBeamEdges, frontBeamGlow);

  // 2. Rear Beam Neon Box Outline
  const rearBeamGeo = new THREE.BoxGeometry(1, 0.1, 0.08);
  const rearBeamEdges = new THREE.LineSegments(new THREE.EdgesGeometry(rearBeamGeo), neonMat);
  const rearBeamGlow = new THREE.Mesh(rearBeamGeo, faintBeamGlowMat);
  group.add(rearBeamEdges, rearBeamGlow);

  // 3. 4 Corner Upright Post Neon Edge Accents
  const postGeos: THREE.BoxGeometry[] = [];
  const postMeshes: THREE.LineSegments[] = [];
  for (let i = 0; i < 4; i++) {
    const pGeo = new THREE.BoxGeometry(0.1, 1, 0.1);
    postGeos.push(pGeo);
    const pMesh = new THREE.LineSegments(new THREE.EdgesGeometry(pGeo), neonMat);
    postMeshes.push(pMesh);
    group.add(pMesh);
  }

  // 4. Shelf Decking Perimeter Neon Edge
  const deckGeo = new THREE.PlaneGeometry(1, 1);
  const deckEdges = new THREE.LineSegments(new THREE.EdgesGeometry(deckGeo), neonMat);
  deckEdges.rotation.x = -Math.PI / 2;
  group.add(deckEdges);

  // 5. Subtle Faint Emissive Shelf Floor Glow Plate
  const floorGlow = new THREE.Mesh(deckGeo, floorGlowMat);
  floorGlow.rotation.x = -Math.PI / 2;
  group.add(floorGlow);

  let currentBaseOpacity = 0.85;

  const setBay = (
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    depth: number,
    colorHex: number = defaultColor
  ) => {
    neonMat.color.setHex(colorHex);
    faintBeamGlowMat.color.setHex(colorHex);
    floorGlowMat.color.setHex(colorHex);

    group.position.set(x, y, z);

    // Front & Rear load beams
    const beamW = Math.max(0.2, width);
    const zOffset = depth / 2;

    frontBeamGeo.dispose();
    frontBeamEdges.geometry.dispose();
    const newFrontGeo = new THREE.BoxGeometry(beamW, 0.1, 0.08);
    frontBeamEdges.geometry = new THREE.EdgesGeometry(newFrontGeo);
    frontBeamGlow.geometry.dispose();
    frontBeamGlow.geometry = newFrontGeo;
    frontBeamEdges.position.set(0, 0, zOffset);
    frontBeamGlow.position.set(0, 0, zOffset);

    rearBeamGeo.dispose();
    rearBeamEdges.geometry.dispose();
    const newRearGeo = new THREE.BoxGeometry(beamW, 0.1, 0.08);
    rearBeamEdges.geometry = new THREE.EdgesGeometry(newRearGeo);
    rearBeamGlow.geometry.dispose();
    rearBeamGlow.geometry = newRearGeo;
    rearBeamEdges.position.set(0, 0, -zOffset);
    rearBeamGlow.position.set(0, 0, -zOffset);

    // 4 Upright columns
    const xHalf = width / 2;
    const yCenter = height / 2;
    const cornerCoords = [
      [-xHalf, zOffset],
      [xHalf, zOffset],
      [-xHalf, -zOffset],
      [xHalf, -zOffset],
    ];

    cornerCoords.forEach(([cx, cz], idx) => {
      postMeshes[idx].geometry.dispose();
      const newPGeo = new THREE.BoxGeometry(0.1, height, 0.1);
      postMeshes[idx].geometry = new THREE.EdgesGeometry(newPGeo);
      postMeshes[idx].position.set(cx, yCenter, cz);
    });

    // Shelf deck edges & floor glow
    deckEdges.geometry.dispose();
    floorGlow.geometry.dispose();
    const newDeckGeo = new THREE.PlaneGeometry(width - 0.04, depth - 0.04);
    deckEdges.geometry = new THREE.EdgesGeometry(newDeckGeo);
    floorGlow.geometry = newDeckGeo;
    deckEdges.position.set(0, 0.015, 0);
    floorGlow.position.set(0, 0.012, 0);
  };

  const show = () => {
    group.visible = true;
  };

  const hide = () => {
    group.visible = false;
  };

  const update = (elapsedTime: number) => {
    if (!group.visible) return;
    // Gentle subtle breathing pulse (between 0.72 and 0.95 opacity)
    const pulse = 0.82 + Math.sin(elapsedTime * 4.5) * 0.12;
    neonMat.opacity = pulse;
    faintBeamGlowMat.opacity = pulse * 0.22;
    floorGlowMat.opacity = pulse * 0.16;
  };

  const dispose = () => {
    neonMat.dispose();
    faintBeamGlowMat.dispose();
    floorGlowMat.dispose();
    frontBeamGeo.dispose();
    rearBeamGeo.dispose();
    deckGeo.dispose();
    postGeos.forEach((g) => g.dispose());
  };

  return {
    group,
    setBay,
    show,
    hide,
    update,
    dispose,
  };
}

/**
 * Recursively applies a faint emissive highlight on the item meshes (pallets, boxes)
 * when in dark mode upon interaction/hover.
 * Returns a restoration callback to revert smoothly when the interaction ends.
 */
export function applyFaintEmissiveHighlight(
  root: THREE.Object3D,
  isDarkMode: boolean = true,
  status: 'NORMAL' | 'AGING' | 'OVERDUE' | 'EMPTY' | 'SAFE' | 'WARNING' | 'OCCUPIED' | 'EXPIRED' | string = 'NORMAL'
): () => void {
  if (!root || !isDarkMode) {
    return () => {};
  }

  const modifiedMaterials: {
    material: THREE.MeshStandardMaterial;
    origEmissive: THREE.Color;
    origIntensity: number;
  }[] = [];

  // Determine emissive color based on stock aging status
  let boxEmissiveHex = 0x0ea5e9; // Subtle Electric Cyan for normal stored item
  let boxEmissiveIntensity = 0.42;

  if (status === 'OVERDUE' || status === 'EXPIRED') {
    boxEmissiveHex = 0xef4444; // Faint Crimson
    boxEmissiveIntensity = 0.48;
  } else if (status === 'AGING' || status === 'WARNING') {
    boxEmissiveHex = 0xf59e0b; // Faint Amber
    boxEmissiveIntensity = 0.45;
  } else if (status === 'EMPTY') {
    boxEmissiveHex = 0x10b981; // Faint Emerald
    boxEmissiveIntensity = 0.38;
  }

  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((mat) => {
          if (mat instanceof THREE.MeshStandardMaterial) {
            highlightMaterial(mat);
          }
        });
      } else if (mesh.material instanceof THREE.MeshStandardMaterial) {
        highlightMaterial(mesh.material);
      }
    }
  });

  function highlightMaterial(mat: THREE.MeshStandardMaterial) {
    // Record original state if not already recorded
    modifiedMaterials.push({
      material: mat,
      origEmissive: mat.emissive.clone(),
      origIntensity: mat.emissiveIntensity,
    });

    // Check if pallet wood (brownish) or cargo box
    const colorHex = mat.color.getHex();
    const isWood = colorHex === 0xbfa079 || colorHex === 0xb45309 || colorHex === 0x854d0e;

    if (isWood) {
      mat.emissive.setHex(0x78350f); // Warm faint amber glow on wood
      mat.emissiveIntensity = 0.32;
    } else {
      mat.emissive.setHex(boxEmissiveHex);
      mat.emissiveIntensity = boxEmissiveIntensity;
    }
    mat.needsUpdate = true;
  }

  // Cleanup/Restore callback
  return () => {
    modifiedMaterials.forEach(({ material, origEmissive, origIntensity }) => {
      material.emissive.copy(origEmissive);
      material.emissiveIntensity = origIntensity;
      material.needsUpdate = true;
    });
  };
}
