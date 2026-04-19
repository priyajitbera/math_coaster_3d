import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// DOM Elements
const container = document.getElementById('app');
const select = document.getElementById('equation-select');
const rideBtn = document.getElementById('ride-btn');
const uiContainer = document.getElementById('ui-container');
const controlsPanel = document.querySelector('.controls-panel');
const statusPanel = document.getElementById('status-panel');
const progressFill = document.getElementById('progress-fill');
const audio = document.getElementById('coaster-audio');
const speedRange = document.getElementById('speed-range');
const speedVal = document.getElementById('speed-val');
const colorPicker = document.getElementById('color-picker');

// Add floating stop button
const stopBtnFloat = document.createElement('button');
stopBtnFloat.id = 'stop-btn-float';
stopBtnFloat.innerText = 'Stop Ride';
container.parentNode.appendChild(stopBtnFloat);

// Add loading overlay
const loadingOverlay = document.createElement('div');
loadingOverlay.id = 'loading';
loadingOverlay.innerHTML = '<div class="spinner"></div><h2>Generating Universe...</h2>';
document.body.appendChild(loadingOverlay);

// Scene Setup
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x05050f, 0.003); // Reduced fog density to allow distant gallery views
scene.background = new THREE.Color(0x05050f);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(20, 20, 40);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxDistance = 200;

// POV Overlay Setup
scene.add(camera);

// Cart body (Now decoupled from camera and physically pinned to the track!)
const coasterCartGroup = new THREE.Group();
scene.add(coasterCartGroup);

const floorMat = new THREE.MeshStandardMaterial({ color: 0x222228, metalness: 0.5, roughness: 0.8 });
const bumperMat = new THREE.MeshStandardMaterial({ 
  color: 0x9d4edd, 
  emissive: 0x9d4edd, 
  emissiveIntensity: 0.8, // Add intense glow to cart nose so it's visible afar
  metalness: 0.8, 
  roughness: 0.4 
}); 
const dashMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9, roughness: 0.2 });

// Main chassis floor
const floor = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.4, 6), floorMat);
floor.position.set(0, 0.5, 0); // y=0.5 slightly above rails
coasterCartGroup.add(floor);

// Side panels
const sideGeo = new THREE.BoxGeometry(0.2, 0.8, 6);
const sideL = new THREE.Mesh(sideGeo, bumperMat);
sideL.position.set(-1.5, 1.1, 0);
coasterCartGroup.add(sideL);

const sideR = new THREE.Mesh(sideGeo, bumperMat);
sideR.position.set(1.5, 1.1, 0);
coasterCartGroup.add(sideR);

// Front Bumper / Nose
const nose = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.2, 1), bumperMat);
nose.position.set(0, 1.1, -2.5);
coasterCartGroup.add(nose);

// Dashboard
const dashGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.8);
const handleBar = new THREE.Mesh(dashGeo, dashMat);
handleBar.rotation.z = Math.PI / 2;
handleBar.position.set(0, 1.8, -1.0);
coasterCartGroup.add(handleBar);

// Second row handlebar
const handleBar2 = new THREE.Mesh(dashGeo, dashMat);
handleBar2.rotation.z = Math.PI / 2;
handleBar2.position.set(0, 1.8, 2.5);
coasterCartGroup.add(handleBar2);

// POV Camera Mount
const seatPOV = new THREE.Group();
seatPOV.position.set(0, 2.0, 1.0);
coasterCartGroup.add(seatPOV);

// Wheels attached to rails securely
const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16);
const wheelMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9, roughness: 0.5 });
const spokeMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc }); // Neon spoke to easily see wheels spinning!

[-2.0, 2.0].forEach(z => {
  [-1.5, 1.5].forEach(x => {
     const spinGroup = new THREE.Group();
     spinGroup.position.set(x, 0.55, z); // 0.25 rail + 0.3 wheel
     
     const wheel = new THREE.Mesh(wheelGeo, wheelMat);
     wheel.rotation.z = Math.PI / 2;
     spinGroup.add(wheel);
     
     const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.6, 0.05), spokeMat);
     spinGroup.add(spoke);
     
     coasterCartGroup.add(spinGroup);
  });
});

coasterCartGroup.visible = false;

// Custom Camera Button UI
const camBtn = document.createElement('button');
camBtn.innerText = '📷 Switch Camera View';
camBtn.style.position = 'absolute';
camBtn.style.bottom = '30px';
camBtn.style.right = '30px';
camBtn.style.zIndex = '100';
camBtn.style.display = 'none';
camBtn.style.padding = '12px 24px';
camBtn.style.background = '#1a1a2e';
camBtn.style.color = '#fff';
camBtn.style.border = '1px solid #9d4edd';
camBtn.style.borderRadius = '20px';
camBtn.style.fontFamily = 'Inter, sans-serif';
camBtn.style.fontWeight = '600';
camBtn.style.cursor = 'pointer';
camBtn.style.boxShadow = '0 4px 15px rgba(0,0,0,0.5)';
camBtn.style.transition = 'all 0.3s ease';
camBtn.onmouseover = () => { camBtn.style.transform = 'scale(1.05)'; camBtn.style.background = '#9d4edd'; };
camBtn.onmouseleave = () => { camBtn.style.transform = 'scale(1)'; camBtn.style.background = '#1a1a2e'; };
document.body.appendChild(camBtn);

let camMode = 0; // 0 = POV, 1 = Wheels, 2 = Spectator
const camModeNames = ['POV', 'Wheel View', 'Gallery Spectator'];
camBtn.innerText = `📷 Camera: ${camModeNames[camMode]}`;
camBtn.addEventListener('click', () => {
    camMode = (camMode + 1) % 3;
    camBtn.innerText = `📷 Camera: ${camModeNames[camMode]}`;
});

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xe0c3fc, 0.8);
dirLight.position.set(50, 100, 50);
scene.add(dirLight);

const pointLight1 = new THREE.PointLight(0x8ec5fc, 2, 200); // Increased intensity + range
const pointLight2 = new THREE.PointLight(0x9d4edd, 2, 200);
scene.add(pointLight1, pointLight2);

// Environment (Stars)
const starGeo = new THREE.BufferGeometry();
const starCount = 5000;
const starPos = new Float32Array(starCount * 3);
for(let i=0; i<starCount*3; i++) {
  starPos[i] = (Math.random() - 0.5) * 500;
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
const starMat = new THREE.PointsMaterial({color: 0xffffff, size: 0.5, transparent: true, opacity: 0.8});
const stars = new THREE.Points(starGeo, starMat);
scene.add(stars);


// Equations Setup
const equations = {
  lissajous: (t) => {
    // Lissajous knot
    const scale = 30;
    return new THREE.Vector3(
      scale * Math.sin(2 * t),
      scale * Math.sin(3 * t),
      scale * Math.cos(t)
    );
  },
  spiral: (t) => {
    // Tornado spiral, endless feel
    t = t * 5; // scale domain
    const scaleFactor = 1 + (t / 10);
    return new THREE.Vector3(
      scaleFactor * 10 * Math.cos(t),
      t * 5 - 50,
      scaleFactor * 10 * Math.sin(t)
    );
  },
  sine: (t) => {
    // Sine wave run
    t = t * 10;
    return new THREE.Vector3(
      t * 4 - 100,
      15 * Math.sin(t / 2) + 5 * Math.cos(t * 1.5),
      15 * Math.sin(t / 1.5)
    );
  },
  trefoil: (t) => {
    // Trefoil knot
    const scale = 15;
    return new THREE.Vector3(
      scale * (Math.sin(t) + 2 * Math.sin(2 * t)),
      scale * (Math.cos(t) - 2 * Math.cos(2 * t)),
      -scale * Math.sin(3 * t)
    );
  },
  helix: (t) => {
    // Double Helix like structure
    t = t * 5;
    return new THREE.Vector3(
      20 * Math.cos(t * 3),
      t * 8 - 80,
      20 * Math.sin(t * 3)
    );
  },
  figure8: (t) => {
    // 3D Figure 8
    const scale = 30;
    return new THREE.Vector3(
      scale * Math.sin(t),
      scale * Math.sin(t) * Math.cos(t),
      scale * Math.sin(2 * t) * 0.5
    );
  },
  chaotic: (t) => {
    // Chaotic 4 PI loop
    const scale = 20;
    return new THREE.Vector3(
      scale * (Math.cos(t) + Math.cos(2.5 * t) * 0.5),
      scale * (Math.sin(t) + Math.sin(3.5 * t) * 0.5),
      scale * Math.sin(4.5 * t)
    );
  }
};

let currentTrackMesh = null;
let currentCurve = null;
let currentFrames = null;
let pointsCount = 1000;

// Track building helper to prevent splines from drifting out of sync
function buildExactTube(points, tangents, normals, binormals, radius, segments, radialSegments = 8) {
  const rings = points.length;
  const positions = [];
  const indices = [];
  const uvs = [];
  const vertexNormals = [];

  for (let i = 0; i < rings; i++) {
    const p = points[i];
    const n = normals[i];
    const b = binormals[i];
    
    // Create a ring
    for(let j = 0; j <= radialSegments; j++) {
      const angle = (j / radialSegments) * Math.PI * 2;
      const sin = Math.sin(angle);
      const cos = Math.cos(angle);
      
      const normalX = n.x * cos + b.x * sin;
      const normalY = n.y * cos + b.y * sin;
      const normalZ = n.z * cos + b.z * sin;
      
      positions.push(
        p.x + radius * normalX,
        p.y + radius * normalY,
        p.z + radius * normalZ
      );
      
      vertexNormals.push(normalX, normalY, normalZ);
      uvs.push(j / radialSegments, i / (rings - 1));
    }
  }

  for (let i = 0; i < rings - 1; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * (radialSegments + 1) + j;
      const b = a + radialSegments + 1;
      const c = a + 1;
      const d = b + 1;

      // Swap winding order to fix inside-out face culling 
      indices.push(a, d, b);
      indices.push(a, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(vertexNormals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}

// Track Generation
function generateTrack(equationKey) {
  if (currentTrackMesh) {
    scene.remove(currentTrackMesh);
    currentTrackMesh.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else child.material.dispose();
      }
    });
  }

  const func = equations[equationKey];
  pointsCount = 1000;
  const points = [];

  // Map t from 0 to 2*PI for closed loops, or 0 to 12 for open
  const isLoop = ['lissajous', 'trefoil', 'figure8'].includes(equationKey);
  let maxT = isLoop ? Math.PI * 2 : 12;
  if(equationKey === 'chaotic') maxT = Math.PI * 4; // Need 4*PI for this to close naturally

  for (let i = 0; i <= pointsCount; i++) {
    const t = (i / pointsCount) * maxT;
    points.push(func(t));
  }

  currentCurve = new THREE.CatmullRomCurve3(points, isLoop);
  
  // Track geometry: Realistic Triangular Truss Coaster Track
  currentFrames = currentCurve.computeFrenetFrames(pointsCount, isLoop);
  const trackGroup = new THREE.Group();
  
  const railRadius = 0.25;
  const spineRadius = 0.6;
  const trackWidth = 3.0; // Distance between rails
  const trackHeight = 1.8; // Distance from spine to rails
  
  const leftPoints = [];
  const rightPoints = [];
  const spinePoints = [];
  const mappedNormals = [];
  const mappedBinormals = [];
  const mappedTangents = [];
  
  for(let i = 0; i <= pointsCount; i++) {
    const u = i / pointsCount;
    // VERY IMPORTANT: Use getPointAt(u) to sync perfectly with computeFrenetFrames arc-length interpolation!
    const p = currentCurve.getPointAt(u);
    const t_vec = currentCurve.getTangentAt(u);
    const n = currentFrames.normals[i];
    const b = currentFrames.binormals[i];
    
    // Spine is lowered
    const spinePos = p.clone().add(n.clone().multiplyScalar(-trackHeight));
    spinePoints.push(spinePos);
    
    // Rails are pushed to left and right
    leftPoints.push(p.clone().add(b.clone().multiplyScalar(trackWidth / 2)));
    rightPoints.push(p.clone().add(b.clone().multiplyScalar(-trackWidth / 2)));
    
    mappedNormals.push(n);
    mappedBinormals.push(b);
    mappedTangents.push(t_vec);
  }
  
  // Build exact tubes explicitly to strictly prevent ThreeJS curve resampling drifting misalignments!
  const leftRailGeo = buildExactTube(leftPoints, mappedTangents, mappedNormals, mappedBinormals, railRadius, pointsCount);
  const rightRailGeo = buildExactTube(rightPoints, mappedTangents, mappedNormals, mappedBinormals, railRadius, pointsCount);
  const spineGeo = buildExactTube(spinePoints, mappedTangents, mappedNormals, mappedBinormals, spineRadius, pointsCount);
  
  const currentHex = parseInt(colorPicker.value.replace('#', '0x'), 16);
  const railMat = new THREE.MeshPhysicalMaterial({
    color: currentHex,
    emissive: currentHex,
    emissiveIntensity: 0.4,
    metalness: 0.8,
    roughness: 0.2,
    clearcoat: 1.0,
    side: THREE.DoubleSide
  });
  
  const spineMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    metalness: 0.8,
    roughness: 0.5,
    side: THREE.DoubleSide
  });
  
  trackGroup.add(new THREE.Mesh(leftRailGeo, railMat));
  trackGroup.add(new THREE.Mesh(rightRailGeo, railMat));
  trackGroup.add(new THREE.Mesh(spineGeo, spineMat));

  // Build Cross Ties and Struts using Instancing
  // Tie: horizontal plank connecting left and right rail
  const tieGeo = new THREE.BoxGeometry(trackWidth + railRadius * 2, 0.2, 0.4);
  const tieMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.7, roughness: 0.5 });
  
  // Struts: diagonally connecting spine to ties
  const strutGeoL = new THREE.CylinderGeometry(0.12, 0.12, Math.hypot(trackWidth/2, trackHeight), 5);
  const strutGeoR = new THREE.CylinderGeometry(0.12, 0.12, Math.hypot(trackWidth/2, trackHeight), 5);
  
  const tieFreq = 4; // place a support chassis every N points
  const tieCount = Math.floor(pointsCount / tieFreq);
  const tieInstanced = new THREE.InstancedMesh(tieGeo, tieMat, tieCount);
  const strutLInstanced = new THREE.InstancedMesh(strutGeoL, tieMat, tieCount);
  const strutRInstanced = new THREE.InstancedMesh(strutGeoR, tieMat, tieCount);
  
  const dummy = new THREE.Object3D();
  const dummyS = new THREE.Object3D();
  for(let i = 0; i < tieCount; i++) {
    const t = i / tieCount;
    const frameIdx = Math.round(t * pointsCount) % pointsCount;
    
    const pt = currentCurve.getPointAt(t);
    const tangent = currentCurve.getTangentAt(t).normalize();
    const n = currentFrames.normals[frameIdx];
    const b = currentFrames.binormals[frameIdx];
    
    // Position horizontal tie
    dummy.position.copy(pt);
    const mat = new THREE.Matrix4().makeBasis(b, n, tangent);
    dummy.quaternion.setFromRotationMatrix(mat);
    dummy.position.sub(n.clone().multiplyScalar(railRadius));
    dummy.updateMatrix();
    tieInstanced.setMatrixAt(i, dummy.matrix);
    
    // Left diagonal strut
    dummyS.quaternion.copy(dummy.quaternion);
    dummyS.position.copy(pt).sub(n.clone().multiplyScalar(trackHeight/2));
    dummyS.position.add(b.clone().multiplyScalar(trackWidth/4));
    // Rotate to point from spine to left rail
    dummyS.rotateZ(Math.atan2(trackWidth/2, trackHeight));
    dummyS.updateMatrix();
    strutLInstanced.setMatrixAt(i, dummyS.matrix);

    // Right diagonal strut
    dummyS.quaternion.copy(dummy.quaternion);
    dummyS.position.copy(pt).sub(n.clone().multiplyScalar(trackHeight/2));
    dummyS.position.add(b.clone().multiplyScalar(-trackWidth/4));
    // Rotate to point from spine to right rail
    dummyS.rotateZ(-Math.atan2(trackWidth/2, trackHeight));
    dummyS.updateMatrix();
    strutRInstanced.setMatrixAt(i, dummyS.matrix);
  }
  
  tieInstanced.instanceMatrix.needsUpdate = true;
  strutLInstanced.instanceMatrix.needsUpdate = true;
  strutRInstanced.instanceMatrix.needsUpdate = true;
  trackGroup.add(tieInstanced);
  trackGroup.add(strutLInstanced);
  trackGroup.add(strutRInstanced);

  // Build Traffic Signs (Poles, Boards, and Neon Arrows)
  const signGroup = new THREE.Group();
  const arrowCount = 120; // Spread arrows generously along track length
  
  // 1. Poles
  const poleGeo = new THREE.CylinderGeometry(0.1, 0.1, 2.5, 8);
  poleGeo.translate(0, 1.25, 0); // Base at local y=0
  const poleMat = new THREE.MeshStandardMaterial({color: 0x444444, metalness: 0.8, roughness: 0.3});
  const poleInstanced = new THREE.InstancedMesh(poleGeo, poleMat, arrowCount);

  // 2. Boards
  const boardGeo = new THREE.BoxGeometry(1.6, 1.6, 0.1); 
  const boardMat = new THREE.MeshStandardMaterial({color: 0x111111, metalness: 0.5, roughness: 0.8});
  const boardInstanced = new THREE.InstancedMesh(boardGeo, boardMat, arrowCount);

  // 3. Arrow Shape to be placed on the Board (pointing UP indicating "Forward")
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.5);      // top tip
  shape.lineTo(0.4, 0.0);    // right wing
  shape.lineTo(0.15, 0.0);   // right inner
  shape.lineTo(0.15, -0.4);  // right stem base
  shape.lineTo(-0.15, -0.4); // left stem base
  shape.lineTo(-0.15, 0.0);  // left inner
  shape.lineTo(-0.4, 0.0);   // left wing
  shape.lineTo(0, 0.5);      // top tip
  
  const arGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false });
  arGeo.translate(0, 0, -0.025); // Center depth slightly
  
  const arMat = new THREE.MeshBasicMaterial({ color: 0x00ff33, side: THREE.DoubleSide });
  const arInstanced = new THREE.InstancedMesh(arGeo, arMat, arrowCount);

  for(let i = 0; i < arrowCount; i++) {
    const t = i / arrowCount;
    const frameIdx = Math.round(t * pointsCount) % pointsCount;
    
    const pt = currentCurve.getPointAt(t);
    const tangent = currentCurve.getTangentAt(t).normalize();
    const n = currentFrames.normals[frameIdx];
    const b = currentFrames.binormals[frameIdx];
    
    // Alternate signs left and right of the track
    const sideMult = (i % 2 === 0) ? 1 : -1;
    const sideOffset = b.clone().multiplyScalar(sideMult * 2.8);
    
    // Pole Base Position
    dummy.position.copy(pt).add(sideOffset);
    dummy.position.sub(n.clone().multiplyScalar(1.0)); // attach below rail line
    
    const poleMat4 = new THREE.Matrix4().makeBasis(b, n, tangent);
    dummy.quaternion.setFromRotationMatrix(poleMat4);
    dummy.updateMatrix();
    poleInstanced.setMatrixAt(i, dummy.matrix);
    
    // Board Placement
    // The top of the pole locally is 2.5 units up along `n`
    dummy.position.add(n.clone().multiplyScalar(2.5));
    
    // Make the board face the oncoming cart (cart travels +tangent, so face to -tangent)
    const boardMat4 = new THREE.Matrix4().makeBasis(b, n, tangent.clone().negate());
    dummy.quaternion.setFromRotationMatrix(boardMat4);
    dummy.updateMatrix();
    boardInstanced.setMatrixAt(i, dummy.matrix);
    
    // Arrow Placement (slightly in front of the board)
    dummy.position.add(tangent.clone().negate().multiplyScalar(0.06));
    dummy.updateMatrix();
    arInstanced.setMatrixAt(i, dummy.matrix);
  }

  poleInstanced.instanceMatrix.needsUpdate = true;
  boardInstanced.instanceMatrix.needsUpdate = true;
  arInstanced.instanceMatrix.needsUpdate = true;
  
  signGroup.add(poleInstanced);
  signGroup.add(boardInstanced);
  signGroup.add(arInstanced);

  trackGroup.add(signGroup);

  currentTrackMesh = trackGroup;
  scene.add(currentTrackMesh);

  // Focus camera
  if (!isRiding) {
    camera.position.set(60, 40, 80);
    controls.target.set(0, 0, 0);
  }
}

// Ride State
let isRiding = false;
let rideProgress = 0; // 0 to 1
const RIDE_SPEED = 0.0005; // Base speed, dynamic per frame
let clock = new THREE.Clock();
const upVector = new THREE.Vector3(0, 1, 0);
const axis = new THREE.Vector3();

// Telemetry & Physics State
let prevVelocity = new THREE.Vector3();
let prevPos = new THREE.Vector3();
let smoothedGForce = 1.0;
let boostMult = 1.0;
let boostActive = false;

const telemetryPanel = document.getElementById('telemetry-panel');
const speedValDisplay = document.getElementById('speed-val-display');
const gforceDisplay = document.getElementById('gforce-display');
const acceleratorBtn = document.getElementById('accelerator-btn');

acceleratorBtn.addEventListener('mousedown', () => boostActive = true);
acceleratorBtn.addEventListener('mouseup', () => boostActive = false);
acceleratorBtn.addEventListener('mouseleave', () => boostActive = false);
acceleratorBtn.addEventListener('touchstart', (e) => { e.preventDefault(); boostActive = true; });
acceleratorBtn.addEventListener('touchend', (e) => { e.preventDefault(); boostActive = false; });

function startRide() {
  if (!currentCurve) return;
  isRiding = true;
  rideProgress = 0;
  controls.enabled = false;
  
  // physics reset
  boostMult = 1.0;
  boostActive = false;
  smoothedGForce = 1.0;
  prevPos.copy(currentCurve.getPointAt(0));
  prevVelocity.set(0, 0, 0);
  
  controlsPanel.classList.add('riding');
  stopBtnFloat.classList.add('visible');
  statusPanel.classList.remove('hidden');
  telemetryPanel.classList.remove('hidden');
  acceleratorBtn.classList.remove('hidden');
  camBtn.style.display = 'block';
  camMode = 0;
  camBtn.innerText = `📷 Camera: POV`;
  coasterCartGroup.visible = true;
}

function stopRide() {
  isRiding = false;
  controls.enabled = true;
  
  controlsPanel.classList.remove('riding');
  stopBtnFloat.classList.remove('visible');
  statusPanel.classList.add('hidden');
  telemetryPanel.classList.add('hidden');
  acceleratorBtn.classList.add('hidden');
  boostActive = false;
  camBtn.style.display = 'none';
  coasterCartGroup.visible = false;
  
  // Reset camera view a bit
  camera.position.set(60, 40, 80);
  camera.up.set(0, 1, 0);
  controls.target.set(0, 0, 0);
}

// Event Listeners
select.addEventListener('change', (e) => {
  if (isRiding) stopRide();
  generateTrack(e.target.value);
});

rideBtn.addEventListener('click', startRide);
stopBtnFloat.addEventListener('click', stopRide);

speedRange.addEventListener('input', (e) => {
  speedVal.innerText = `${parseFloat(e.target.value).toFixed(1)}x`;
});

colorPicker.addEventListener('input', (e) => {
  if (currentTrackMesh) {
    const hex = parseInt(e.target.value.replace('#', '0x'), 16);
    currentTrackMesh.children.forEach(child => {
      if (child.material && child.material.emissive !== undefined) {
        child.material.emissive.setHex(hex);
      }
    });
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render Loop
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const time = clock.getElapsedTime();

  // Dynamic point lights
  pointLight1.position.x = Math.sin(time * 0.5) * 50;
  pointLight1.position.z = Math.cos(time * 0.5) * 50;
  pointLight2.position.y = Math.sin(time * 0.8) * 50;

  // Slowly rotate stars
  stars.rotation.y = time * 0.05;

  if (isRiding && currentCurve) {
    // Accelerator physics
    if (boostActive) {
      boostMult = Math.min(boostMult + delta * 2.0, 3.0);
    } else {
      boostMult = Math.max(boostMult - delta * 1.5, 1.0);
    }

    const baseSpeedMult = parseFloat(speedRange.value);
    const speedMult = baseSpeedMult * boostMult;
    
    const progressDelta = RIDE_SPEED * speedMult * delta * 60;
    rideProgress += progressDelta; 

    if (rideProgress >= 1) {
      if (currentCurve.closed) {
        rideProgress -= 1;
        prevPos.copy(currentCurve.getPointAt(rideProgress));
      } else {
        stopRide();
      }
    }

    if (isRiding) {
      // Calculate continuous smooth frames explicitly tracking the math curve
      const pos = currentCurve.getPointAt(rideProgress);

      // --- Telemetry Calculation ---
      if (delta > 0.001) { // avoid divide by zero on frame stutter
        const trackLength = currentCurve.getLength();
        // Scale: 1 Three.js unit = 2.0 meters for realistic human coaster speed & G-Forces
        const PHYSICAL_SCALE = 2.0;
        const realDistanceTravelled = progressDelta * trackLength * PHYSICAL_SCALE; 
        const speed_m_s = realDistanceTravelled / delta;
        const kmh = speed_m_s * 3.6;
        const mph = speed_m_s * 2.23694;
        
        speedValDisplay.innerHTML = `${Math.round(kmh)} <span class="telemetry-unit">km/h</span> | ${Math.round(mph)} <span class="telemetry-unit">mph</span>`;
        
        // G-Force Vector physics
        const velVec = pos.clone().sub(prevPos).divideScalar(delta);
        const accelVec = velVec.clone().sub(prevVelocity).divideScalar(delta);
        
        // Add Natural Resting Gravity (1G opposing normal ground)
        if (velVec.lengthSq() > 0.000001) {
          // Convert Unit/sec^2 to Meters/sec^2
          accelVec.multiplyScalar(PHYSICAL_SCALE); 
          accelVec.y += 9.81; // add gravity
          
          let rawG = accelVec.length() / 9.81;
          if (rawG > 20) rawG = smoothedGForce; // Filter instant teleport wraparounds
          
          // Exponential moving average for smooth UI
          smoothedGForce += (rawG - smoothedGForce) * Math.min(delta * 5.0, 1.0);
        }
        gforceDisplay.innerHTML = `${smoothedGForce.toFixed(2)} <span class="telemetry-unit">G</span>`;
        
        prevPos.copy(pos);
        prevVelocity.copy(velVec);
      }
      // Calculate continuous smooth frames explicitly tracking the math curve
      const tangent = currentCurve.getTangentAt(rideProgress).normalize();
      
      const exactU = rideProgress * pointsCount;
      const idx1 = Math.floor(exactU);
      const idx2 = (idx1 + 1) % (pointsCount + 1);
      const tLerp = exactU - idx1;
      
      const n1 = currentFrames.normals[idx1];
      const n2 = currentFrames.normals[idx2];
      const normal = new THREE.Vector3().lerpVectors(n1, n2, tLerp).normalize();
      
      const b1 = currentFrames.binormals[idx1];
      const b2 = currentFrames.binormals[idx2];
      const binormal = new THREE.Vector3().lerpVectors(b1, b2, tLerp).normalize();

      // Pin the cart completely strictly to the mathematical track structure
      coasterCartGroup.position.copy(pos);
      // Cart Basis: To maintain a valid Right-Handed Coordinate System for Quaternion conversion:
      // X x Y must equal Z. We know (binormal x normal = -tangent). 
      // Thus, setting local +X = binormal, local +Y = normal, local +Z = -tangent
      // means the front of the cart (local -Z) will point perfectly along +tangent (forward!)
      const zAxis = tangent.clone().negate();
      const xAxis = binormal.clone();
      
      const baseQuat = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, normal, zAxis));
      
      // Add intense movement bobbing visually without Euler gimbal lock destruction
      const bobAngle = Math.sin(time * 10 * speedMult) * 0.02;
      const bobQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), bobAngle);
      
      // Apply the final calculated rotation to the vehicle!
      coasterCartGroup.quaternion.multiplyQuaternions(baseQuat, bobQuat);
      
      // Update Matrix mathematically BEFORE any camera child uses it!
      coasterCartGroup.updateMatrixWorld(true);
      
      // Update camera based on toggle mode
      if (camMode === 0) {
        // POV
        const seatWorld = new THREE.Vector3(0, 2.0, 1.0).applyMatrix4(coasterCartGroup.matrixWorld);
        camera.position.copy(seatWorld);
        
        // Let camera passively stare slightly lower out the front windshield
        const lookTarget = new THREE.Vector3(0, 1.8, -10).applyMatrix4(coasterCartGroup.matrixWorld);
        camera.up.copy(normal);
        camera.lookAt(lookTarget);
      } else if (camMode === 1) {
        // Dramatic GoPro wheel view! Camera mounted midway down the exterior side panel, extremely low, staring forward at the front tire!
        const mountWorld = new THREE.Vector3(2.4, 0.4, 1.5).applyMatrix4(coasterCartGroup.matrixWorld);
        camera.position.copy(mountWorld);
        
        // Look strictly forward along the chassis right at the outer edge of the spinning front tire
        const targetWorld = new THREE.Vector3(1.3, 0.5, -2.5).applyMatrix4(coasterCartGroup.matrixWorld);
        camera.up.copy(normal);
        camera.lookAt(targetWorld);
      } else if (camMode === 2) {
        // Drone/Gallery Spectator view orbiting the whole structure and tracking vehicle seamlessly
        const orbitTime = time * 0.15;
        camera.position.set(120 * Math.sin(orbitTime), 70, 120 * Math.cos(orbitTime));
        camera.up.set(0, 1, 0);
        camera.lookAt(coasterCartGroup.position);
      }
      
      // Spin the wheels mechanically over distance
      const distance = rideProgress * currentCurve.getLength();
      const wheelCircum = Math.PI * 2 * 0.3;
      const wheelRot = (distance / wheelCircum) * Math.PI * 2;
      coasterCartGroup.children.forEach(c => {
        if(c.type === 'Group' && c.children[0] && c.children[0].geometry === wheelGeo) {
           c.rotation.x = -wheelRot;
        }
      });
      
      // Link the main illuminating light perfectly trailing the cart!
      pointLight1.position.copy(coasterCartGroup.position);
      pointLight1.position.y += 10; // Hover brightly over the entire moving car
    }
  }

  if (!isRiding) {
    controls.update();
  }
  renderer.render(scene, camera);
}

// Init
setTimeout(() => {
  loadingOverlay.classList.add('hidden');
  setTimeout(() => loadingOverlay.remove(), 800);
}, 1000);

generateTrack('lissajous');
animate();
