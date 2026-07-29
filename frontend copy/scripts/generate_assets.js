import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup node polyfill for FileReader required by GLTFExporter
if (typeof global.FileReader === 'undefined') {
  global.FileReader = class FileReader {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then(buf => {
        this.result = buf;
        if (this.onloadend) this.onloadend();
        if (this.onload) this.onload({ target: { result: buf } });
      });
    }
  };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = path.resolve(__dirname, '../public/models');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// ----------------------------------------------------
// DESIGN SYSTEM MATERIALS
// ----------------------------------------------------
// Primary: Matte White
const matPrimary = new THREE.MeshStandardMaterial({
  color: 0xF5F5F8,
  roughness: 0.85,
  metalness: 0.05,
  name: 'MatteWhite'
});

// Secondary: Very Light Gray / Silver
const matSecondary = new THREE.MeshStandardMaterial({
  color: 0xE2E2E8,
  roughness: 0.80,
  metalness: 0.05,
  name: 'VeryLightGray'
});

// Accent: Soft Cyan Emissive
const matAccent = new THREE.MeshStandardMaterial({
  color: 0x00E5FF,
  emissive: 0x00E5FF,
  emissiveIntensity: 1.2,
  roughness: 0.20,
  metalness: 0.10,
  name: 'SoftCyanEmissive'
});

// Glass / Frame (Semi-translucent white)
const matGlass = new THREE.MeshStandardMaterial({
  color: 0xFFFFFF,
  roughness: 0.25,
  metalness: 0.15,
  opacity: 0.85,
  transparent: true,
  name: 'GlassFrame'
});

// ----------------------------------------------------
// GEOMETRY UTILITIES
// ----------------------------------------------------

/**
 * Creates a rounded box shape extruded with soft bevels
 */
function createRoundedBoxGeometry(width, height, depth, radius = 0.05, smoothness = 4) {
  const shape = new THREE.Shape();
  const w = width / 2;
  const h = height / 2;
  const r = Math.min(radius, w, h);

  shape.moveTo(-w + r, -h);
  shape.lineTo(w - r, -h);
  shape.quadraticCurveTo(w, -h, w, -h + r);
  shape.lineTo(w, h - r);
  shape.quadraticCurveTo(w, h, w - r, h);
  shape.lineTo(-w + r, h);
  shape.quadraticCurveTo(-w, h, -w, h - r);
  shape.lineTo(-w, -h + r);
  shape.quadraticCurveTo(-w, -h, -w + r, -h);

  const extrudeSettings = {
    depth: depth,
    bevelEnabled: true,
    bevelSegments: smoothness,
    steps: 1,
    bevelSize: r * 0.5,
    bevelThickness: r * 0.5,
    curveSegments: smoothness
  };

  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geo.center();
  return geo;
}

/**
 * Counts triangles in an Object3D hierarchy
 */
function countTriangles(obj) {
  let count = 0;
  obj.traverse((child) => {
    if (child.isMesh && child.geometry) {
      const geo = child.geometry;
      if (geo.index) {
        count += geo.index.count / 3;
      } else if (geo.attributes.position) {
        count += geo.attributes.position.count / 3;
      }
    }
  });
  return count;
}

/**
 * Export object to GLB file
 */
async function exportGLB(object3D, filename) {
  const exporter = new GLTFExporter();
  const options = { binary: true };

  const gltf = await exporter.parseAsync(object3D, options);
  const buffer = Buffer.from(gltf);
  const filePath = path.join(outputDir, filename);
  fs.writeFileSync(filePath, buffer);

  const polyCount = countTriangles(object3D);
  console.log(`[EXPORTED] ${filename} | Size: ${(buffer.length / 1024).toFixed(1)} KB | Triangles: ${polyCount}`);
  return { filename, sizeKB: (buffer.length / 1024).toFixed(1), polyCount };
}

// ----------------------------------------------------
// MODEL 01: GIG WORKER
// ----------------------------------------------------
function buildGigWorker() {
  const group = new THREE.Group();
  group.name = "GigWorker";

  // Head (Bevelled cube, friendly low-poly)
  const headGeo = createRoundedBoxGeometry(0.32, 0.32, 0.32, 0.06, 3);
  const head = new THREE.Mesh(headGeo, matPrimary);
  head.position.set(0, 1.55, 0);
  group.add(head);

  // Neck
  const neckGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.1, 8);
  const neck = new THREE.Mesh(neckGeo, matSecondary);
  neck.position.set(0, 1.32, 0);
  group.add(neck);

  // Torso / Body (Capsule shape)
  const bodyGeo = new THREE.CapsuleGeometry(0.24, 0.45, 4, 12);
  const body = new THREE.Mesh(bodyGeo, matPrimary);
  body.position.set(0, 0.98, 0);
  group.add(body);

  // Jacket / Vest accents (Secondary light gray)
  const vestGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.35, 12);
  const vest = new THREE.Mesh(vestGeo, matSecondary);
  vest.position.set(0, 0.98, 0);
  vest.scale.set(1.02, 1, 1.02);
  group.add(vest);

  // Left Arm (Relaxed)
  const armLGeo = new THREE.CapsuleGeometry(0.06, 0.4, 3, 8);
  const armL = new THREE.Mesh(armLGeo, matPrimary);
  armL.position.set(-0.32, 0.95, 0);
  armL.rotation.z = Math.PI * 0.08;
  group.add(armL);

  // Right Arm (Holding Smartphone forward)
  const armRGeo = new THREE.CapsuleGeometry(0.06, 0.38, 3, 8);
  const armR = new THREE.Mesh(armRGeo, matPrimary);
  armR.position.set(0.3, 1.0, 0.12);
  armR.rotation.x = -Math.PI * 0.4;
  armR.rotation.y = -Math.PI * 0.1;
  group.add(armR);

  // Smartphone
  const phoneGeo = createRoundedBoxGeometry(0.1, 0.18, 0.015, 0.02, 2);
  const phoneBody = new THREE.Mesh(phoneGeo, matSecondary);
  const phoneScreenGeo = new THREE.PlaneGeometry(0.08, 0.15);
  const phoneScreen = new THREE.Mesh(phoneScreenGeo, matAccent);
  phoneScreen.position.set(0, 0, 0.01);
  const phoneGroup = new THREE.Group();
  phoneGroup.add(phoneBody, phoneScreen);
  phoneGroup.position.set(0.28, 1.02, 0.34);
  phoneGroup.rotation.x = -Math.PI * 0.15;
  group.add(phoneGroup);

  // Delivery Backpack (Cube with bevels)
  const packGeo = createRoundedBoxGeometry(0.36, 0.42, 0.22, 0.04, 3);
  const pack = new THREE.Mesh(packGeo, matSecondary);
  pack.position.set(0, 0.98, -0.22);
  // Backpack accent line
  const packStripeGeo = new THREE.BoxGeometry(0.38, 0.04, 0.23);
  const packStripe = new THREE.Mesh(packStripeGeo, matAccent);
  packStripe.position.set(0, 0.98, -0.22);
  group.add(pack, packStripe);

  // Legs (Standing relaxed pose)
  const legLGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.6, 8);
  const legL = new THREE.Mesh(legLGeo, matSecondary);
  legL.position.set(-0.13, 0.4, 0);
  group.add(legL);

  const legRGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.6, 8);
  const legR = new THREE.Mesh(legRGeo, matSecondary);
  legR.position.set(0.13, 0.4, 0);
  group.add(legR);

  // Boots
  const bootGeo = createRoundedBoxGeometry(0.12, 0.1, 0.2, 0.03, 2);
  const bootL = new THREE.Mesh(bootGeo, matPrimary);
  bootL.position.set(-0.13, 0.06, 0.03);
  const bootR = new THREE.Mesh(bootGeo, matPrimary);
  bootR.position.set(0.13, 0.06, 0.03);
  group.add(bootL, bootR);

  // Pivot at ground y = 0
  return group;
}

// ----------------------------------------------------
// MODEL 02: FARMER
// ----------------------------------------------------
function buildFarmer() {
  const group = new THREE.Group();
  group.name = "Farmer";

  // Head (Bevelled cube)
  const headGeo = createRoundedBoxGeometry(0.3, 0.3, 0.3, 0.06, 3);
  const head = new THREE.Mesh(headGeo, matPrimary);
  head.position.set(0, 1.5, 0);
  group.add(head);

  // Wide Straw Hat (Cone + disc brim)
  const brimGeo = new THREE.CylinderGeometry(0.48, 0.5, 0.03, 16);
  const brim = new THREE.Mesh(brimGeo, matSecondary);
  brim.position.set(0, 1.68, 0);
  brim.rotation.z = -0.05;

  const crownGeo = new THREE.ConeGeometry(0.28, 0.22, 12);
  const crown = new THREE.Mesh(crownGeo, matPrimary);
  crown.position.set(0, 1.8, 0);
  crown.rotation.z = -0.05;

  // Hat Band (Cyan accent)
  const bandGeo = new THREE.CylinderGeometry(0.285, 0.29, 0.03, 16);
  const band = new THREE.Mesh(bandGeo, matAccent);
  band.position.set(0, 1.7, 0);

  group.add(brim, crown, band);

  // Overalls Torso
  const bodyGeo = new THREE.CapsuleGeometry(0.25, 0.45, 4, 12);
  const body = new THREE.Mesh(bodyGeo, matPrimary);
  body.position.set(0, 0.95, 0);

  const overallsGeo = new THREE.CylinderGeometry(0.27, 0.28, 0.4, 10);
  const overalls = new THREE.Mesh(overallsGeo, matSecondary);
  overalls.position.set(0, 0.88, 0);
  group.add(body, overalls);

  // Arms
  const armLGeo = new THREE.CapsuleGeometry(0.065, 0.4, 3, 8);
  const armL = new THREE.Mesh(armLGeo, matPrimary);
  armL.position.set(-0.33, 0.95, 0);
  armL.rotation.z = Math.PI * 0.06;

  // Right arm holding shovel
  const armRGeo = new THREE.CapsuleGeometry(0.065, 0.4, 3, 8);
  const armR = new THREE.Mesh(armRGeo, matPrimary);
  armR.position.set(0.3, 0.95, 0.15);
  armR.rotation.x = -Math.PI * 0.25;
  armR.rotation.y = -Math.PI * 0.2;
  group.add(armL, armR);

  // Shovel
  const shovelHandleGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.9, 8);
  const shovelHandle = new THREE.Mesh(shovelHandleGeo, matSecondary);

  const shovelBladeShape = new THREE.Shape();
  shovelBladeShape.moveTo(-0.08, 0);
  shovelBladeShape.lineTo(0.08, 0);
  shovelBladeShape.lineTo(0.07, -0.15);
  shovelBladeShape.quadraticCurveTo(0, -0.22, -0.07, -0.15);
  shovelBladeShape.closePath();
  const shovelBladeGeo = new THREE.ExtrudeGeometry(shovelBladeShape, { depth: 0.01, bevelEnabled: true, bevelSize: 0.005, bevelThickness: 0.005 });
  const shovelBlade = new THREE.Mesh(shovelBladeGeo, matPrimary);
  shovelBlade.position.set(0, -0.45, -0.005);

  const shovelGroup = new THREE.Group();
  shovelGroup.add(shovelHandle, shovelBlade);
  shovelGroup.position.set(0.35, 0.6, 0.3);
  shovelGroup.rotation.x = 0.1;
  group.add(shovelGroup);

  // Legs & Boots
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.075, 0.55, 8), matSecondary);
  legL.position.set(-0.14, 0.38, 0);
  const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.075, 0.55, 8), matSecondary);
  legR.position.set(0.14, 0.38, 0);

  const bootGeo = createRoundedBoxGeometry(0.13, 0.12, 0.22, 0.03, 2);
  const bootL = new THREE.Mesh(bootGeo, matPrimary);
  bootL.position.set(-0.14, 0.07, 0.03);
  const bootR = new THREE.Mesh(bootGeo, matPrimary);
  bootR.position.set(0.14, 0.07, 0.03);

  group.add(legL, legR, bootL, bootR);
  return group;
}

// ----------------------------------------------------
// MODEL 03: BANK STATEMENT
// ----------------------------------------------------
function buildBankStatement() {
  const group = new THREE.Group();
  group.name = "BankStatement";

  // Base thin document paper shape
  const width = 1.0;
  const height = 1.35;
  const foldSize = 0.22;

  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, -height / 2);
  shape.lineTo(width / 2, -height / 2);
  shape.lineTo(width / 2, height / 2 - foldSize);
  shape.lineTo(width / 2 - foldSize, height / 2);
  shape.lineTo(-width / 2, height / 2);
  shape.closePath();

  const paperGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.03,
    bevelEnabled: true,
    bevelSize: 0.015,
    bevelThickness: 0.015,
    curveSegments: 4
  });
  paperGeo.center();
  const paper = new THREE.Mesh(paperGeo, matPrimary);
  group.add(paper);

  // Folded Corner (Triangle)
  const foldShape = new THREE.Shape();
  foldShape.moveTo(0, 0);
  foldShape.lineTo(foldSize, 0);
  foldShape.lineTo(0, -foldSize);
  foldShape.closePath();
  const foldGeo = new THREE.ExtrudeGeometry(foldShape, {
    depth: 0.025,
    bevelEnabled: true,
    bevelSize: 0.005,
    bevelThickness: 0.005
  });
  const fold = new THREE.Mesh(foldGeo, matSecondary);
  fold.position.set(width / 2 - foldSize, height / 2 - foldSize, 0.02);
  group.add(fold);

  // Minimal embossed document rows
  const rowCount = 5;
  for (let i = 0; i < rowCount; i++) {
    const yPos = 0.35 - i * 0.16;
    const isAccent = (i === 1 || i === 3);
    const rowWidth = isAccent ? 0.72 : 0.65;
    const rowGeo = createRoundedBoxGeometry(rowWidth, 0.045, 0.01, 0.01, 2);
    const rowMesh = new THREE.Mesh(rowGeo, isAccent ? matAccent : matSecondary);
    rowMesh.position.set(0, yPos, 0.022);
    group.add(rowMesh);
  }

  // Header chip badge
  const headerChipGeo = createRoundedBoxGeometry(0.25, 0.08, 0.01, 0.015, 2);
  const headerChip = new THREE.Mesh(headerChipGeo, matAccent);
  headerChip.position.set(-0.25, 0.52, 0.022);
  group.add(headerChip);

  return group;
}

// ----------------------------------------------------
// MODEL 04: AI SCORE CORE
// ----------------------------------------------------
function buildAIScoreCore() {
  const group = new THREE.Group();
  group.name = "AIScoreCore";

  // Large circular futuristic pedestal base (tiered concentric rings)
  const tier1Geo = new THREE.CylinderGeometry(1.4, 1.5, 0.12, 20);
  const tier1 = new THREE.Mesh(tier1Geo, matSecondary);
  tier1.position.set(0, 0.06, 0);

  const tier2Geo = new THREE.CylinderGeometry(1.15, 1.25, 0.14, 20);
  const tier2 = new THREE.Mesh(tier2Geo, matPrimary);
  tier2.position.set(0, 0.19, 0);

  const tier3Geo = new THREE.CylinderGeometry(0.9, 0.95, 0.08, 20);
  const tier3 = new THREE.Mesh(tier3Geo, matSecondary);
  tier3.position.set(0, 0.3, 0);

  // Outer emissive glowing ring on base
  const ringBaseGeo = new THREE.TorusGeometry(1.2, 0.025, 8, 24);
  const ringBase = new THREE.Mesh(ringBaseGeo, matAccent);
  ringBase.rotation.x = Math.PI / 2;
  ringBase.position.set(0, 0.14, 0);

  group.add(tier1, tier2, tier3, ringBase);

  // Floating Holographic Rings around axis
  const ring1Geo = new THREE.TorusGeometry(0.75, 0.03, 8, 24);
  const ring1 = new THREE.Mesh(ring1Geo, matPrimary);
  ring1.position.set(0, 0.85, 0);
  ring1.rotation.x = Math.PI * 0.15;
  ring1.rotation.y = Math.PI * 0.1;

  const ring2Geo = new THREE.TorusGeometry(0.6, 0.025, 8, 24);
  const ring2 = new THREE.Mesh(ring2Geo, matAccent);
  ring2.position.set(0, 0.85, 0);
  ring2.rotation.x = -Math.PI * 0.25;
  ring2.rotation.z = Math.PI * 0.2;

  const ring3Geo = new THREE.TorusGeometry(0.48, 0.02, 8, 24);
  const ring3 = new THREE.Mesh(ring3Geo, matSecondary);
  ring3.position.set(0, 0.85, 0);
  ring3.rotation.y = Math.PI * 0.35;

  group.add(ring1, ring2, ring3);

  // Center Floating Energy Sphere (Heart of the Experience)
  const sphereGeo = new THREE.SphereGeometry(0.28, 16, 16);
  const sphereCore = new THREE.Mesh(sphereGeo, matAccent);
  sphereCore.position.set(0, 0.85, 0);

  // Outer translucent orbital shell
  const outerShellGeo = new THREE.IcosahedronGeometry(0.36, 1);
  const outerShell = new THREE.Mesh(outerShellGeo, matGlass);
  outerShell.position.set(0, 0.85, 0);

  group.add(sphereCore, outerShell);

  // Floating energy particles / nodes
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const pGeo = new THREE.SphereGeometry(0.04, 6, 6);
    const pMesh = new THREE.Mesh(pGeo, matAccent);
    pMesh.position.set(Math.cos(angle) * 0.9, 0.85 + (i % 2 === 0 ? 0.12 : -0.12), Math.sin(angle) * 0.9);
    group.add(pMesh);
  }

  return group;
}

// ----------------------------------------------------
// MODEL 05: PAYMENT HISTORY NODE
// ----------------------------------------------------
function buildPaymentHistoryNode() {
  const group = new THREE.Group();
  group.name = "PaymentHistoryNode";

  // Floating square pedestal
  const pedGeo = createRoundedBoxGeometry(0.9, 0.12, 0.9, 0.05, 3);
  const pedestal = new THREE.Mesh(pedGeo, matPrimary);
  pedestal.position.set(0, 0.06, 0);

  const pedAccentGeo = createRoundedBoxGeometry(0.94, 0.02, 0.94, 0.02, 2);
  const pedAccent = new THREE.Mesh(pedAccentGeo, matAccent);
  pedAccent.position.set(0, 0.06, 0);

  group.add(pedestal, pedAccent);

  // Floating Wallet Icon
  const walletGroup = new THREE.Group();
  const walletBodyGeo = createRoundedBoxGeometry(0.55, 0.38, 0.12, 0.04, 3);
  const walletBody = new THREE.Mesh(walletBodyGeo, matPrimary);

  // Wallet Flap
  const flapGeo = createRoundedBoxGeometry(0.56, 0.18, 0.06, 0.02, 2);
  const flap = new THREE.Mesh(flapGeo, matSecondary);
  flap.position.set(0, 0.08, 0.04);

  // Wallet Clasp (Cyan emissive)
  const claspGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.08, 12);
  const clasp = new THREE.Mesh(claspGeo, matAccent);
  clasp.rotation.x = Math.PI / 2;
  clasp.position.set(0.18, 0, 0.05);

  // Emerging Credit Card
  const cardGeo = createRoundedBoxGeometry(0.42, 0.25, 0.02, 0.02, 2);
  const card = new THREE.Mesh(cardGeo, matAccent);
  card.position.set(0, 0.16, -0.02);
  card.rotation.z = -0.1;

  walletGroup.add(card, walletBody, flap, clasp);
  walletGroup.position.set(0, 0.52, 0);
  walletGroup.rotation.y = Math.PI * 0.15;
  group.add(walletGroup);

  return group;
}

// ----------------------------------------------------
// MODEL 06: INCOME STABILITY NODE
// ----------------------------------------------------
function buildIncomeStabilityNode() {
  const group = new THREE.Group();
  group.name = "IncomeStabilityNode";

  // Pedestal
  const pedGeo = createRoundedBoxGeometry(0.9, 0.12, 0.9, 0.05, 3);
  const pedestal = new THREE.Mesh(pedGeo, matPrimary);
  pedestal.position.set(0, 0.06, 0);

  const pedAccentGeo = createRoundedBoxGeometry(0.94, 0.02, 0.94, 0.02, 2);
  const pedAccent = new THREE.Mesh(pedAccentGeo, matAccent);
  pedAccent.position.set(0, 0.06, 0);

  group.add(pedestal, pedAccent);

  // Floating Bar Chart Icon
  const chartGroup = new THREE.Group();
  const barHeights = [0.28, 0.44, 0.62];
  const barPositions = [-0.2, 0, 0.2];

  for (let i = 0; i < 3; i++) {
    const isHighest = (i === 2);
    const barGeo = createRoundedBoxGeometry(0.14, barHeights[i], 0.14, 0.025, 2);
    const barMesh = new THREE.Mesh(barGeo, isHighest ? matAccent : matSecondary);
    barMesh.position.set(barPositions[i], barHeights[i] / 2, 0);
    chartGroup.add(barMesh);
  }

  // Trend Line (Rising line over bars)
  const lineGeo = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.25, 0.32, 0.1),
      new THREE.Vector3(0.0, 0.48, 0.1),
      new THREE.Vector3(0.25, 0.72, 0.1)
    ]),
    12,
    0.02,
    8,
    false
  );
  const trendLine = new THREE.Mesh(lineGeo, matPrimary);
  chartGroup.add(trendLine);

  chartGroup.position.set(0, 0.2, 0);
  chartGroup.rotation.y = Math.PI * 0.15;
  group.add(chartGroup);

  return group;
}

// ----------------------------------------------------
// MODEL 07: SAVINGS NODE
// ----------------------------------------------------
function buildSavingsNode() {
  const group = new THREE.Group();
  group.name = "SavingsNode";

  // Pedestal
  const pedGeo = createRoundedBoxGeometry(0.9, 0.12, 0.9, 0.05, 3);
  const pedestal = new THREE.Mesh(pedGeo, matPrimary);
  pedestal.position.set(0, 0.06, 0);

  const pedAccent = new THREE.Mesh(
    createRoundedBoxGeometry(0.94, 0.02, 0.94, 0.02, 2),
    matAccent
  );
  pedAccent.position.set(0, 0.06, 0);

  group.add(pedestal, pedAccent);

  // Floating Piggy Bank Icon
  const piggyGroup = new THREE.Group();

  // Piggy Body (Rounded capsule)
  const bodyGeo = new THREE.CapsuleGeometry(0.22, 0.22, 4, 12);
  const body = new THREE.Mesh(bodyGeo, matPrimary);
  body.rotation.z = Math.PI / 2;
  piggyGroup.add(body);

  // Snout
  const snoutGeo = new THREE.CylinderGeometry(0.09, 0.1, 0.08, 12);
  const snout = new THREE.Mesh(snoutGeo, matSecondary);
  snout.rotation.z = Math.PI / 2;
  snout.position.set(-0.24, 0, 0);
  piggyGroup.add(snout);

  // Ears
  const earGeo = new THREE.ConeGeometry(0.06, 0.1, 4);
  const earL = new THREE.Mesh(earGeo, matSecondary);
  earL.position.set(-0.08, 0.22, 0.12);
  earL.rotation.z = -0.3;
  const earR = new THREE.Mesh(earGeo, matSecondary);
  earR.position.set(-0.08, 0.22, -0.12);
  earR.rotation.z = -0.3;
  piggyGroup.add(earL, earR);

  // Legs
  const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.1, 8);
  const legPositions = [
    [-0.12, -0.22, 0.12],
    [-0.12, -0.22, -0.12],
    [0.12, -0.22, 0.12],
    [0.12, -0.22, -0.12]
  ];
  legPositions.forEach(pos => {
    const leg = new THREE.Mesh(legGeo, matSecondary);
    leg.position.set(...pos);
    piggyGroup.add(leg);
  });

  // Cyan Coin Slot & Coin
  const slotGeo = createRoundedBoxGeometry(0.14, 0.02, 0.04, 0.008, 2);
  const slot = new THREE.Mesh(slotGeo, matAccent);
  slot.position.set(0, 0.23, 0);

  const coinGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.02, 16);
  const coin = new THREE.Mesh(coinGeo, matAccent);
  coin.rotation.x = Math.PI / 2;
  coin.position.set(0, 0.34, 0);

  piggyGroup.add(slot, coin);
  piggyGroup.position.set(0, 0.45, 0);
  piggyGroup.rotation.y = Math.PI * 0.35;
  group.add(piggyGroup);

  return group;
}

// ----------------------------------------------------
// MODEL 08: CASH FLOW NODE
// ----------------------------------------------------
function buildCashFlowNode() {
  const group = new THREE.Group();
  group.name = "CashFlowNode";

  // Pedestal
  const pedGeo = createRoundedBoxGeometry(0.9, 0.12, 0.9, 0.05, 3);
  const pedestal = new THREE.Mesh(pedGeo, matPrimary);
  pedestal.position.set(0, 0.06, 0);

  const pedAccent = new THREE.Mesh(
    createRoundedBoxGeometry(0.94, 0.02, 0.94, 0.02, 2),
    matAccent
  );
  pedAccent.position.set(0, 0.06, 0);

  group.add(pedestal, pedAccent);

  // Floating Cash Flow Arrows Icon (Double curved arrows forming a loop)
  const flowGroup = new THREE.Group();

  // Torus Arc 1
  const arc1Geo = new THREE.TorusGeometry(0.28, 0.045, 8, 20, Math.PI * 0.85);
  const arc1 = new THREE.Mesh(arc1Geo, matPrimary);
  arc1.rotation.x = Math.PI * 0.45;

  // Arrow Head 1 (Cyan)
  const cone1Geo = new THREE.ConeGeometry(0.09, 0.16, 8);
  const cone1 = new THREE.Mesh(cone1Geo, matAccent);
  cone1.position.set(0.28, 0, 0.05);
  cone1.rotation.z = -Math.PI * 0.6;

  // Torus Arc 2 (Flipped)
  const arc2Geo = new THREE.TorusGeometry(0.28, 0.045, 8, 20, Math.PI * 0.85);
  const arc2 = new THREE.Mesh(arc2Geo, matSecondary);
  arc2.rotation.x = -Math.PI * 0.45;
  arc2.rotation.z = Math.PI;

  // Arrow Head 2 (Cyan)
  const cone2Geo = new THREE.ConeGeometry(0.09, 0.16, 8);
  const cone2 = new THREE.Mesh(cone2Geo, matAccent);
  cone2.position.set(-0.28, 0, -0.05);
  cone2.rotation.z = Math.PI * 0.4;

  flowGroup.add(arc1, cone1, arc2, cone2);
  flowGroup.position.set(0, 0.45, 0);
  flowGroup.rotation.y = Math.PI * 0.15;
  group.add(flowGroup);

  return group;
}

// ----------------------------------------------------
// MODEL 09: FINANCIAL HEALTH CARD
// ----------------------------------------------------
function buildFinancialHealthCard() {
  const group = new THREE.Group();
  group.name = "FinancialHealthCard";

  // Large Floating Card Body
  const width = 1.6;
  const height = 1.05;
  const cardGeo = createRoundedBoxGeometry(width, height, 0.06, 0.06, 2);
  const cardBody = new THREE.Mesh(cardGeo, matPrimary);

  // Glass-inspired Bevelled Frame Border
  const frameGeo = createRoundedBoxGeometry(width + 0.04, height + 0.04, 0.04, 0.06, 2);
  const frame = new THREE.Mesh(frameGeo, matGlass);
  frame.position.set(0, 0, -0.01);

  group.add(cardBody, frame);

  // Large Circular Score Arc (Gauge Meter on Left)
  const scoreGroup = new THREE.Group();
  const outerGaugeGeo = new THREE.TorusGeometry(0.32, 0.04, 8, 24, Math.PI * 1.5);
  const outerGauge = new THREE.Mesh(outerGaugeGeo, matSecondary);
  outerGauge.rotation.z = -Math.PI * 0.75;

  const scoreArcGeo = new THREE.TorusGeometry(0.32, 0.045, 8, 24, Math.PI * 1.15);
  const scoreArc = new THREE.Mesh(scoreArcGeo, matAccent);
  scoreArc.rotation.z = -Math.PI * 0.75;

  const centerSphereGeo = new THREE.SphereGeometry(0.12, 12, 12);
  const centerSphere = new THREE.Mesh(centerSphereGeo, matPrimary);

  const centerAccentGeo = new THREE.SphereGeometry(0.06, 10, 10);
  const centerAccent = new THREE.Mesh(centerAccentGeo, matAccent);
  centerAccent.position.set(0, 0, 0.04);

  scoreGroup.add(outerGauge, scoreArc, centerSphere, centerAccent);
  scoreGroup.position.set(-0.45, 0, 0.04);
  group.add(scoreGroup);

  // Stacked Icon / Metric Placeholders on Right
  const rightGroup = new THREE.Group();
  const rowCount = 3;
  for (let i = 0; i < rowCount; i++) {
    const yPos = 0.22 - i * 0.22;

    // Small icon circle
    const iconGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.02, 12);
    const iconMesh = new THREE.Mesh(iconGeo, i === 0 ? matAccent : matSecondary);
    iconMesh.rotation.x = Math.PI / 2;
    iconMesh.position.set(0.0, yPos, 0.04);

    // Rounded bar placeholder
    const barGeo = createRoundedBoxGeometry(0.48, 0.05, 0.015, 0.015, 2);
    const barMesh = new THREE.Mesh(barGeo, i === 0 ? matPrimary : matSecondary);
    barMesh.position.set(0.32, yPos, 0.04);

    rightGroup.add(iconMesh, barMesh);
  }

  rightGroup.position.set(0.1, 0, 0);
  group.add(rightGroup);

  return group;
}

// ----------------------------------------------------
// MODEL 10: APPROVAL CHECKMARK
// ----------------------------------------------------
function buildApprovalCheckmark() {
  const group = new THREE.Group();
  group.name = "ApprovalCheckmark";

  // Floating Circular Shield Badge
  const badgeGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.08, 24);
  const badge = new THREE.Mesh(badgeGeo, matPrimary);
  badge.rotation.x = Math.PI / 2;

  // Outer Bevelled Ring Frame
  const rimGeo = new THREE.TorusGeometry(0.72, 0.04, 8, 24);
  const rim = new THREE.Mesh(rimGeo, matSecondary);

  // Inner Accent Ring
  const innerRingGeo = new THREE.TorusGeometry(0.58, 0.02, 6, 24);
  const innerRing = new THREE.Mesh(innerRingGeo, matAccent);

  group.add(badge, rim, innerRing);

  // 3D Thick Rounded Checkmark Icon
  const checkShape = new THREE.Shape();
  checkShape.moveTo(-0.24, -0.02);
  checkShape.lineTo(-0.08, -0.22);
  checkShape.lineTo(0.28, 0.22);
  checkShape.lineTo(0.2, 0.28);
  checkShape.lineTo(-0.08, -0.12);
  checkShape.lineTo(-0.18, 0.04);
  checkShape.closePath();

  const checkGeo = new THREE.ExtrudeGeometry(checkShape, {
    depth: 0.08,
    bevelEnabled: true,
    bevelSize: 0.025,
    bevelThickness: 0.025,
    curveSegments: 3
  });
  checkGeo.center();

  const checkmark = new THREE.Mesh(checkGeo, matAccent);
  checkmark.position.set(0, 0, 0.05);
  group.add(checkmark);

  return group;
}

// ----------------------------------------------------
// MODEL 11: GRID TILE
// ----------------------------------------------------
function buildGridTile() {
  const group = new THREE.Group();
  group.name = "GridTile";

  // Base Tile (1.0 x 0.1 x 1.0) with slightly higher segment detail
  const tileGeo = createRoundedBoxGeometry(1.0, 0.1, 1.0, 0.04, 4);
  const tile = new THREE.Mesh(tileGeo, matPrimary);
  tile.position.set(0, 0.05, 0);

  // Inset Grooves along border
  const grooveShape = new THREE.Shape();
  const s = 0.44;
  grooveShape.moveTo(-s, -s);
  grooveShape.lineTo(s, -s);
  grooveShape.lineTo(s, s);
  grooveShape.lineTo(-s, s);
  grooveShape.closePath();

  const holePath = new THREE.Path();
  const sInner = 0.41;
  holePath.moveTo(-sInner, -sInner);
  holePath.lineTo(-sInner, sInner);
  holePath.lineTo(sInner, sInner);
  holePath.lineTo(sInner, -sInner);
  holePath.closePath();
  grooveShape.holes.push(holePath);

  const grooveGeo = new THREE.ExtrudeGeometry(grooveShape, {
    depth: 0.02,
    bevelEnabled: true,
    bevelSize: 0.005,
    bevelThickness: 0.005,
    curveSegments: 4
  });
  grooveGeo.center();

  const groove = new THREE.Mesh(grooveGeo, matSecondary);
  groove.rotation.x = Math.PI / 2;
  groove.position.set(0, 0.095, 0);

  // Center Accent Dot / Micro Inset
  const dotGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.02, 16);
  const dot = new THREE.Mesh(dotGeo, matAccent);
  dot.position.set(0, 0.096, 0);

  group.add(tile, groove, dot);
  return group;
}


// ----------------------------------------------------
// MODEL 12: ENVIRONMENT PROPS PACK & INDIVIDUAL PROPS
// ----------------------------------------------------
function buildPropTree() {
  const group = new THREE.Group();
  group.name = "PropTree";

  const trunkGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.5, 8);
  const trunk = new THREE.Mesh(trunkGeo, matSecondary);
  trunk.position.set(0, 0.25, 0);

  const canopy1Geo = new THREE.ConeGeometry(0.45, 0.5, 8);
  const canopy1 = new THREE.Mesh(canopy1Geo, matPrimary);
  canopy1.position.set(0, 0.65, 0);

  const canopy2Geo = new THREE.ConeGeometry(0.35, 0.45, 8);
  const canopy2 = new THREE.Mesh(canopy2Geo, matPrimary);
  canopy2.position.set(0, 0.9, 0);

  const canopy3Geo = new THREE.ConeGeometry(0.24, 0.35, 8);
  const canopy3 = new THREE.Mesh(canopy3Geo, matAccent);
  canopy3.position.set(0, 1.12, 0);

  group.add(trunk, canopy1, canopy2, canopy3);
  return group;
}

function buildPropStreetLamp() {
  const group = new THREE.Group();
  group.name = "PropStreetLamp";

  // Base
  const baseGeo = new THREE.CylinderGeometry(0.12, 0.15, 0.1, 12);
  const base = new THREE.Mesh(baseGeo, matSecondary);
  base.position.set(0, 0.05, 0);

  // Pole
  const poleGeo = new THREE.CylinderGeometry(0.03, 0.04, 1.3, 10);
  const pole = new THREE.Mesh(poleGeo, matPrimary);
  pole.position.set(0, 0.7, 0);

  // Curved Head
  const headArcGeo = new THREE.TorusGeometry(0.14, 0.025, 8, 16, Math.PI * 0.6);
  const headArc = new THREE.Mesh(headArcGeo, matPrimary);
  headArc.position.set(0.07, 1.32, 0);
  headArc.rotation.z = Math.PI * 0.2;

  // Emissive Light Fixture Cap
  const lightGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.06, 12);
  const lightCap = new THREE.Mesh(lightGeo, matAccent);
  lightCap.position.set(0.16, 1.25, 0);

  group.add(base, pole, headArc, lightCap);
  return group;
}

function buildPropBench() {
  const group = new THREE.Group();
  group.name = "PropBench";

  // Legs / Legs frame
  const leg1Geo = createRoundedBoxGeometry(0.06, 0.35, 0.3, 0.015, 2);
  const leg1 = new THREE.Mesh(leg1Geo, matSecondary);
  leg1.position.set(-0.32, 0.175, 0);

  const leg2Geo = createRoundedBoxGeometry(0.06, 0.35, 0.3, 0.015, 2);
  const leg2 = new THREE.Mesh(leg2Geo, matSecondary);
  leg2.position.set(0.32, 0.175, 0);

  // Seat Slat
  const seatGeo = createRoundedBoxGeometry(0.78, 0.04, 0.28, 0.015, 2);
  const seat = new THREE.Mesh(seatGeo, matPrimary);
  seat.position.set(0, 0.32, 0);

  // Backrest Slat
  const backGeo = createRoundedBoxGeometry(0.78, 0.22, 0.03, 0.015, 2);
  const back = new THREE.Mesh(backGeo, matPrimary);
  back.position.set(0, 0.48, -0.12);

  // Accent detail
  const accentGeo = createRoundedBoxGeometry(0.8, 0.02, 0.03, 0.008, 2);
  const accent = new THREE.Mesh(accentGeo, matAccent);
  accent.position.set(0, 0.32, 0.12);

  group.add(leg1, leg2, seat, back, accent);
  return group;
}

function buildPropScooter() {
  const group = new THREE.Group();
  group.name = "PropScooter";

  // Deck
  const deckGeo = createRoundedBoxGeometry(0.18, 0.04, 0.6, 0.02, 2);
  const deck = new THREE.Mesh(deckGeo, matPrimary);
  deck.position.set(0, 0.1, 0);

  // Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.04, 16);
  const wheelFront = new THREE.Mesh(wheelGeo, matSecondary);
  wheelFront.rotation.z = Math.PI / 2;
  wheelFront.position.set(0, 0.07, 0.24);

  const wheelBack = new THREE.Mesh(wheelGeo, matSecondary);
  wheelBack.rotation.z = Math.PI / 2;
  wheelBack.position.set(0, 0.07, -0.24);

  // Steering Pole
  const stemGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.65, 8);
  const stem = new THREE.Mesh(stemGeo, matSecondary);
  stem.position.set(0, 0.42, 0.24);
  stem.rotation.x = -0.1;

  // Handlebars
  const barGeo = createRoundedBoxGeometry(0.38, 0.03, 0.03, 0.01, 2);
  const bar = new THREE.Mesh(barGeo, matPrimary);
  bar.position.set(0, 0.72, 0.21);

  // Headlight (Accent Cyan)
  const lightGeo = new THREE.BoxGeometry(0.06, 0.04, 0.04);
  const light = new THREE.Mesh(lightGeo, matAccent);
  light.position.set(0, 0.72, 0.23);

  group.add(deck, wheelFront, wheelBack, stem, bar, light);
  return group;
}

function buildPropMailbox() {
  const group = new THREE.Group();
  group.name = "PropMailbox";

  // Stand
  const postGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.5, 10);
  const post = new THREE.Mesh(postGeo, matSecondary);
  post.position.set(0, 0.25, 0);

  // Mail Box Body (Capsule / Rounded Box)
  const boxGeo = createRoundedBoxGeometry(0.24, 0.32, 0.24, 0.04, 3);
  const boxMesh = new THREE.Mesh(boxGeo, matPrimary);
  boxMesh.position.set(0, 0.62, 0);

  // Slot (Accent Cyan)
  const slotGeo = createRoundedBoxGeometry(0.16, 0.03, 0.02, 0.005, 2);
  const slot = new THREE.Mesh(slotGeo, matAccent);
  slot.position.set(0, 0.68, 0.12);

  group.add(post, boxMesh, slot);
  return group;
}

function buildPropPlanter() {
  const group = new THREE.Group();
  group.name = "PropPlanter";

  // Box
  const boxGeo = createRoundedBoxGeometry(0.4, 0.32, 0.4, 0.03, 2);
  const boxMesh = new THREE.Mesh(boxGeo, matSecondary);
  boxMesh.position.set(0, 0.16, 0);

  // Top Shrub / Foliage (Icosahedron low poly)
  const shrubGeo = new THREE.IcosahedronGeometry(0.24, 1);
  const shrub = new THREE.Mesh(shrubGeo, matPrimary);
  shrub.position.set(0, 0.42, 0);

  // Accent Sprout
  const sproutGeo = new THREE.IcosahedronGeometry(0.12, 0);
  const sprout = new THREE.Mesh(sproutGeo, matAccent);
  sprout.position.set(0, 0.56, 0);

  group.add(boxMesh, shrub, sprout);
  return group;
}

function buildPropDecorativeCube() {
  const group = new THREE.Group();
  group.name = "PropDecorativeCube";

  // Bevelled Outer Wireframe/Cube
  const cubeGeo = createRoundedBoxGeometry(0.4, 0.4, 0.4, 0.04, 3);
  const cubeMesh = new THREE.Mesh(cubeGeo, matPrimary);
  cubeMesh.rotation.set(Math.PI * 0.15, Math.PI * 0.25, 0);
  cubeMesh.position.set(0, 0.35, 0);

  // Floating Inner Accent Core
  const innerGeo = new THREE.OctahedronGeometry(0.14, 0);
  const innerMesh = new THREE.Mesh(innerGeo, matAccent);
  innerMesh.position.set(0, 0.35, 0);

  group.add(cubeMesh, innerMesh);
  return group;
}

function buildPropOfficeBuilding() {
  const group = new THREE.Group();
  group.name = "PropOfficeBuilding";

  // Building Main Tower
  const towerGeo = createRoundedBoxGeometry(0.7, 1.2, 0.7, 0.04, 3);
  const tower = new THREE.Mesh(towerGeo, matPrimary);
  tower.position.set(0, 0.6, 0);

  // Inset Horizontal Window Strips (Secondary gray + Cyan accent)
  for (let i = 0; i < 4; i++) {
    const yPos = 0.3 + i * 0.22;
    const isCyan = (i === 2);
    const winGeo = createRoundedBoxGeometry(0.72, 0.08, 0.72, 0.01, 2);
    const windowStrip = new THREE.Mesh(winGeo, isCyan ? matAccent : matSecondary);
    windowStrip.position.set(0, yPos, 0);
    group.add(windowStrip);
  }

  // Roof Antenna / Spire
  const spireGeo = new THREE.CylinderGeometry(0.015, 0.025, 0.25, 8);
  const spire = new THREE.Mesh(spireGeo, matAccent);
  spire.position.set(0, 1.32, 0);

  group.add(tower, spire);
  return group;
}

function buildEnvPropsPack() {
  const group = new THREE.Group();
  group.name = "EnvPropsPack";

  const props = [
    { builder: buildPropTree, pos: [-1.2, 0, -1.0] },
    { builder: buildPropStreetLamp, pos: [1.2, 0, -1.0] },
    { builder: buildPropBench, pos: [-1.0, 0, 0] },
    { builder: buildPropScooter, pos: [1.0, 0, 0] },
    { builder: buildPropMailbox, pos: [-0.6, 0, 1.0] },
    { builder: buildPropPlanter, pos: [0.6, 0, 1.0] },
    { builder: buildPropDecorativeCube, pos: [0, 0, 0] },
    { builder: buildPropOfficeBuilding, pos: [0, 0, -1.4] }
  ];

  props.forEach(({ builder, pos }) => {
    const prop = builder();
    prop.position.set(...pos);
    group.add(prop);
  });

  return group;
}

// ----------------------------------------------------
// MAIN GENERATION & EXPORT WORKFLOW
// ----------------------------------------------------
async function main() {
  console.log("=== GENERATING PREMIUM LOW-POLY 3D ASSETS ===");

  const assetList = [
    { name: "MODEL 01: Gig Worker", file: "gigworker.glb", builder: buildGigWorker },
    { name: "MODEL 02: Farmer", file: "farmer.glb", builder: buildFarmer },
    { name: "MODEL 03: Bank Statement", file: "bank_statement.glb", builder: buildBankStatement },
    { name: "MODEL 04: AI Score Core", file: "ai_score_core.glb", builder: buildAIScoreCore },
    { name: "MODEL 05: Payment History Node", file: "node_payment_history.glb", builder: buildPaymentHistoryNode },
    { name: "MODEL 06: Income Stability Node", file: "node_income_stability.glb", builder: buildIncomeStabilityNode },
    { name: "MODEL 07: Savings Node", file: "node_savings.glb", builder: buildSavingsNode },
    { name: "MODEL 08: Cash Flow Node", file: "node_cash_flow.glb", builder: buildCashFlowNode },
    { name: "MODEL 09: Financial Health Card", file: "financial_health_card.glb", builder: buildFinancialHealthCard },
    { name: "MODEL 10: Approval Checkmark", file: "approval_checkmark.glb", builder: buildApprovalCheckmark },
    { name: "MODEL 11: Grid Tile", file: "grid_tile.glb", builder: buildGridTile },

    // Environment props (Individual exports)
    { name: "MODEL 12-A: Prop Tree", file: "prop_tree.glb", builder: buildPropTree },
    { name: "MODEL 12-B: Prop Street Lamp", file: "prop_street_lamp.glb", builder: buildPropStreetLamp },
    { name: "MODEL 12-C: Prop Bench", file: "prop_bench.glb", builder: buildPropBench },
    { name: "MODEL 12-D: Prop Scooter", file: "prop_scooter.glb", builder: buildPropScooter },
    { name: "MODEL 12-E: Prop Mailbox", file: "prop_mailbox.glb", builder: buildPropMailbox },
    { name: "MODEL 12-F: Prop Planter", file: "prop_planter.glb", builder: buildPropPlanter },
    { name: "MODEL 12-G: Prop Decorative Cube", file: "prop_decorative_cube.glb", builder: buildPropDecorativeCube },
    { name: "MODEL 12-H: Prop Office Building", file: "prop_office_building.glb", builder: buildPropOfficeBuilding },

    // Combined Environment Pack
    { name: "MODEL 12-ALL: Environment Props Pack", file: "env_props_pack.glb", builder: buildEnvPropsPack }
  ];

  const results = [];
  for (const asset of assetList) {
    const scene = new THREE.Scene();
    const obj = asset.builder();
    scene.add(obj);

    const info = await exportGLB(scene, asset.file);
    results.push({ name: asset.name, ...info });
  }

  // Save metadata manifest
  const manifestPath = path.join(outputDir, 'models_manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(results, null, 2));

  console.log("\n=== ALL ASSETS GENERATED SUCCESSFULLY ===");
  console.log(`Manifest saved to ${manifestPath}`);
}

main().catch(err => {
  console.error("Error generating assets:", err);
  process.exit(1);
});
