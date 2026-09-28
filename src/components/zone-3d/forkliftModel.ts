import * as THREE from 'three';

/**
 * Creates a high-fidelity, realistic modern industrial counterbalance forklift 3D model
 */
export function createRealisticForklift(x: number, y: number, z: number, rotationY = 0, scale = 1.0): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = rotationY;
  group.scale.set(scale, scale, scale);

  // Materials
  const bodyYellowMat = new THREE.MeshStandardMaterial({
    color: '#f59e0b', // Industrial Safety Yellow/Amber
    roughness: 0.35,
    metalness: 0.4
  });

  const counterweightMat = new THREE.MeshStandardMaterial({
    color: '#0f172a', // Heavy dark cast iron
    roughness: 0.7,
    metalness: 0.8
  });

  const darkSteelMat = new THREE.MeshStandardMaterial({
    color: '#1e293b',
    roughness: 0.4,
    metalness: 0.85
  });

  const chromeSteelMat = new THREE.MeshStandardMaterial({
    color: '#e2e8f0',
    roughness: 0.15,
    metalness: 0.95
  });

  const rubberTireMat = new THREE.MeshStandardMaterial({
    color: '#090d16',
    roughness: 0.9,
    metalness: 0.05
  });

  const rimMat = new THREE.MeshStandardMaterial({
    color: '#475569',
    roughness: 0.3,
    metalness: 0.8
  });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#38bdf8',
    transparent: true,
    opacity: 0.4,
    roughness: 0.1,
    transmission: 0.8,
    ior: 1.5
  });

  const beaconMat = new THREE.MeshStandardMaterial({
    color: '#f97316',
    emissive: '#f97316',
    emissiveIntensity: 0.8,
    roughness: 0.2
  });

  const headlightMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    emissive: '#ffffff',
    emissiveIntensity: 0.9
  });

  const rearLightMat = new THREE.MeshStandardMaterial({
    color: '#ef4444',
    emissive: '#ef4444',
    emissiveIntensity: 0.7
  });

  // 1. Lower Chassis & Base Plate
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.45, 2.2), darkSteelMat);
  chassis.position.set(0, 0.45, 0);
  chassis.castShadow = true;
  group.add(chassis);

  // 2. Main Body Engine Hood & Cowl (Safety Yellow)
  const engineCover = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.65, 1.4), bodyYellowMat);
  engineCover.position.set(0, 0.85, -0.25);
  engineCover.castShadow = true;
  group.add(engineCover);

  // 3. Heavy Rear Counterweight (Curved Cast Iron Block)
  const counterweight = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.8, 16, 1, false, 0, Math.PI), counterweightMat);
  counterweight.rotation.y = Math.PI / 2;
  counterweight.position.set(0, 0.85, -0.95);
  counterweight.scale.set(1.0, 1.0, 0.7);
  counterweight.castShadow = true;
  group.add(counterweight);

  // Rear Hitch Pin Hole
  const hitch = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.2, 12), chromeSteelMat);
  hitch.rotation.x = Math.PI / 2;
  hitch.position.set(0, 0.65, -1.45);
  group.add(hitch);

  // Rear Hazard / Brake Lights
  [-0.55, 0.55].forEach(lx => {
    const rLight = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.04), rearLightMat);
    rLight.position.set(lx, 1.0, -1.38);
    group.add(rLight);
  });

  // 4. Operator Cabin ROPS Cage (Roll-Over Protection Structure)
  const cagePillars = [
    [-0.65, 0.35],  // Front Left
    [0.65, 0.35],   // Front Right
    [-0.65, -0.85], // Rear Left
    [0.65, -0.85]   // Rear Right
  ];

  cagePillars.forEach(([px, pz]) => {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.7, 8), darkSteelMat);
    pillar.position.set(px, 1.6, pz);
    pillar.castShadow = true;
    group.add(pillar);
  });

  // Roof Overhead Guard Frame & Grille
  const roofFrame = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.06, 1.28), darkSteelMat);
  roofFrame.position.set(0, 2.45, -0.25);
  group.add(roofFrame);

  // Roof Tinted Safety Shield
  const roofGlass = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.02, 1.15), glassMat);
  roofGlass.position.set(0, 2.47, -0.25);
  group.add(roofGlass);

  // Strobe Safety Beacon on top of cage
  const beaconBase = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.06, 12), darkSteelMat);
  beaconBase.position.set(0, 2.51, -0.25);
  const beaconDome = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 12), beaconMat);
  beaconDome.position.set(0, 2.6, -0.25);
  group.add(beaconBase, beaconDome);

  // 5. Operator Seat & Steering Console
  const seatBase = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.15, 0.6), darkSteelMat);
  seatBase.position.set(0, 1.25, -0.3);
  const seatCushion = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.12, 0.52), rubberTireMat);
  seatCushion.position.set(0, 1.35, -0.3);
  const seatBack = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.12), rubberTireMat);
  seatBack.position.set(0, 1.65, -0.55);
  group.add(seatBase, seatCushion, seatBack);

  // Steering Column & Dashboard
  const steeringCol = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.65, 8), darkSteelMat);
  steeringCol.position.set(0, 1.5, 0.15);
  steeringCol.rotation.x = -Math.PI / 6;
  const steeringWheel = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 8, 20), rubberTireMat);
  steeringWheel.position.set(0, 1.76, 0.02);
  steeringWheel.rotation.x = -Math.PI / 3;
  group.add(steeringCol, steeringWheel);

  // Hydraulic Control Levers
  [-0.2, -0.12, -0.04].forEach(lx => {
    const lever = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.25, 6), chromeSteelMat);
    lever.position.set(lx, 1.5, 0.12);
    lever.rotation.x = -Math.PI / 8;
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), darkSteelMat);
    knob.position.set(lx, 1.62, 0.07);
    group.add(lever, knob);
  });

  // 6. Dual Front LED Headlights
  [-0.6, 0.6].forEach(hx => {
    const lightHousing = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.08), darkSteelMat);
    lightHousing.position.set(hx, 1.9, 0.38);
    const lightLens = new THREE.Mesh(new THREE.CircleGeometry(0.045, 12), headlightMat);
    lightLens.position.set(hx, 1.9, 0.43);
    group.add(lightHousing, lightLens);
  });

  // 7. Dual-Stage Lift Mast (Vertical I-Beam Rails)
  const mastHeight = 3.2;
  [-0.45, 0.45].forEach(mx => {
    const mastBeam = new THREE.Mesh(new THREE.BoxGeometry(0.1, mastHeight, 0.12), darkSteelMat);
    mastBeam.position.set(mx, mastHeight / 2 + 0.3, 1.15);
    mastBeam.castShadow = true;
    group.add(mastBeam);
  });

  // Mast Cross Braces
  [1.0, 2.0, 3.2].forEach(my => {
    const brace = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.06), darkSteelMat);
    brace.position.set(0, my, 1.15);
    group.add(brace);
  });

  // Center Hydraulic Lift Ram Cylinder
  const hydCylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 12), darkSteelMat);
  hydCylinder.position.set(0, 1.5, 1.15);
  const hydPiston = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.0, 12), chromeSteelMat);
  hydPiston.position.set(0, 2.2, 1.15);
  group.add(hydCylinder, hydPiston);

  // 8. Fork Carriage & Backrest
  const carriageBackrest = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.85, 0.06), darkSteelMat);
  carriageBackrest.position.set(0, 0.85, 1.25);
  group.add(carriageBackrest);

  // 9. Realistic L-Shaped Steel Pallet Forks (ส้อมยกพาเลทเหล็ก)
  const forkLength = 1.35;
  const forkWidth = 0.14;
  const forkThickness = 0.045;

  [-0.32, 0.32].forEach(fx => {
    // Vertical shank
    const shank = new THREE.Mesh(new THREE.BoxGeometry(forkWidth, 0.8, forkThickness), chromeSteelMat);
    shank.position.set(fx, 0.75, 1.28);
    shank.castShadow = true;

    // Horizontal blade (tapered tip)
    const blade = new THREE.Mesh(new THREE.BoxGeometry(forkWidth, forkThickness, forkLength), chromeSteelMat);
    blade.position.set(fx, 0.38, 1.28 + forkLength / 2);
    blade.castShadow = true;

    group.add(shank, blade);
  });

  // 10. Heavy Duty Industrial Wheels & Tires
  const wheelConfig = [
    { x: -0.72, y: 0.38, z: 0.7, r: 0.38, w: 0.3 },   // Front Left
    { x: 0.72, y: 0.38, z: 0.7, r: 0.38, w: 0.3 },    // Front Right
    { x: -0.65, y: 0.32, z: -0.75, r: 0.32, w: 0.24 }, // Rear Left
    { x: 0.65, y: 0.32, z: -0.75, r: 0.32, w: 0.24 }  // Rear Right
  ];

  wheelConfig.forEach(wc => {
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(wc.r, wc.r, wc.w, 18), rubberTireMat);
    tire.rotation.z = Math.PI / 2;
    tire.position.set(wc.x, wc.y, wc.z);
    tire.castShadow = true;

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(wc.r * 0.58, wc.r * 0.58, wc.w + 0.02, 12), rimMat);
    rim.rotation.z = Math.PI / 2;
    rim.position.set(wc.x, wc.y, wc.z);

    group.add(tire, rim);
  });

  return group;
}
