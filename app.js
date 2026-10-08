/* =====================================================================
   RHINO SENTINEL - APP LOGIC & TELEMETRY SIMULATOR
   ===================================================================== */

// --- Global Audio Alert Synthesizer (Web Audio API) ---
let audioCtx = null;
let soundEnabled = true;

function playAlertSiren() {
  if (!soundEnabled) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sawtooth';
    const now = audioCtx.currentTime;
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.35);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  } catch (err) {
    console.warn("Audio warning:", err);
  }
}

function playSonarPing() {
  if (!soundEnabled) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2400, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.4);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  } catch (err) {
    console.warn("Sonar warning:", err);
  }
}

function playLockTargetSound() {
  if (!soundEnabled) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    [0, 0.08].forEach((offset) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400, now + offset);
      gain.gain.setValueAtTime(0.18, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.06);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.06);
    });
  } catch (err) {}
}

function playTacticalClick() {
  if (!soundEnabled) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.03);
  } catch (err) {}
}

// --- Data Models & State ---
const state = {
  activeTab: 'vehicles',
  selectedVehicleId: 'VEH-01',
  camMode: 'normal',
  isSimulating: true,
  simSpeedMultiplier: 1,
  alertCount: 0,
  alertsList: [],
  toleranceMeters: 60,
  showCorridor: true,
  showCheckpoints: true,
  isDrawingRoute: false,
  tempDrawnPoints: [],
  tempDrawnLayers: [],
  customRouteCounter: 1,
  currentViewMode: 'globe-3d', // 'globe-3d' (spherical orbit) | 'surface-2d' (planar street)
  show3DBuildings: true,
  inmersiveNav3D: false,
  navVoiceEnabled: true,
  lastSpokenManeuver: '',

  // ESP32 Cyber IoT Node State
  esp32: {
    cam01: { pirDetected: false, personsCount: 0, battery: '4.18V (98%)', rssi: '-54 dBm' },
    radar02: { presence: false, distance: 0.0, microMovement: 0 },
    therm03: { temp: 22.4, humanDetected: false }
  },
  crtScanlines: false,

  // Hardware Devices
  devices: {
    gps: [
      { id: 'RHINO-GPS-01', name: 'Rhino OBD-II #8942', battery: '98%', status: 'online', assignedTo: 'VEH-01' },
      { id: 'RHINO-GPS-02', name: 'Rhino Hardwire #3310', battery: '100%', status: 'online', assignedTo: 'VEH-02' },
      { id: 'RHINO-GPS-03', name: 'Rhino Magnético #7721', battery: '84%', status: 'standby', assignedTo: null }
    ],
    cameras: [
      { id: 'CAM-ESP-01', name: 'Cámara Oculta Dash #01', fps: '30 FPS', status: 'online', assignedTo: 'VEH-01' },
      { id: 'CAM-ESP-02', name: 'Micro-Cam Interior #02', fps: '25 FPS', status: 'online', assignedTo: null }
    ]
  },

  // Routes with coordinate paths & checkpoints
  routes: {
    'corredor-norte': {
      id: 'corredor-norte',
      name: 'Corredor Norte (Base Logística -> Aeropuerto)',
      toleranceMeters: 65,
      // Path around Buenos Aires / Av. del Libertador corridor for realistic mapping
      path: [
        [-34.5885, -58.3840],
        [-34.5770, -58.4005],
        [-34.5620, -58.4210],
        [-34.5460, -58.4420],
        [-34.5350, -58.4590],
        [-34.5200, -58.4800]
      ],
      checkpoints: [
        { name: 'Punto 1: Base Logística', lat: -34.5885, lng: -58.3840, passed: true },
        { name: 'Punto 2: Control Peaje Autopista', lat: -34.5620, lng: -58.4210, passed: false },
        { name: 'Punto 3: Destino Hangar Aeroparque', lat: -34.5350, lng: -58.4590, passed: false }
      ]
    },
    'ruta-custodia': {
      id: 'ruta-custodia',
      name: 'Ruta Custodia Centro (Banco Central -> Bóveda 2)',
      toleranceMeters: 45,
      path: [
        [-34.6037, -58.3816],
        [-34.6050, -58.3900],
        [-34.6070, -58.4020],
        [-34.6110, -58.4150],
        [-34.6150, -58.4280]
      ],
      checkpoints: [
        { name: 'Punto A: Banco Central', lat: -34.6037, lng: -58.3816, passed: true },
        { name: 'Punto B: Checkpoint Av. 9 de Julio', lat: -34.6050, lng: -58.3900, passed: false },
        { name: 'Punto C: Depósito Bóveda 2', lat: -34.6150, lng: -58.4280, passed: false }
      ]
    }
  },

  // Vehicles in custody
  vehicles: [
    {
      id: 'VEH-01',
      name: 'Rhino 01 (Custodia Blindada)',
      plate: 'AF-892-XZ',
      gpsId: 'RHINO-GPS-01',
      camId: 'CAM-ESP-01',
      routeId: 'corredor-norte',
      status: 'normal', // 'normal' | 'deviated'
      lat: -34.5770,
      lng: -58.4005,
      speed: 52,
      heading: 320,
      simIndex: 0.15, // progress along path
      isDeviatedManually: false,
      deviationDistance: 0
    },
    {
      id: 'VEH-02',
      name: 'Móvil Escolta 02 (Solo GPS)',
      plate: 'AD-441-PL',
      gpsId: 'RHINO-GPS-02',
      camId: null, // Standalone GPS without spy cam
      routeId: 'ruta-custodia',
      status: 'normal',
      lat: -34.6050,
      lng: -58.3900,
      speed: 38,
      heading: 260,
      simIndex: 0.25,
      isDeviatedManually: false,
      deviationDistance: 0
    }
  ]
};

// --- Leaflet Map Elements ---
let map = null;
let vehicleMarkers = {};
let routePolyline = null;
let routeCorridorPolygon = null;
let checkpointMarkers = [];
let currentTileLayer = null;
let currentTileRefLayer = null;
let currentTileMode = 'dark'; // 'dark' (default cyber dark tactical) | 'sat' | 'googleStreet' | 'street'

// Verified High-Tech Tile Sources (100% Free, Zero API Keys, Zero Watermarks, Worldwide)
const TILE_CONFIG = {
  // 1. Tactical Cyber Dark (Esri World Dark Gray Canvas: 100% Free, No Watermark, No API Key, Clean Slate Base & Reference Labels)
  dark: {
    name: '3D Oscuro Gris Táctico (Esri Canvas)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    refUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
    subdomains: 'abc'
  },
  // 2. Google / Esri Street Navigation: Full color streets, avenues, borders, cities worldwide
  googleStreet: {
    name: 'Callejero Claro Global',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
    subdomains: 'abc'
  },
  // 3. High-Res Satellite HD (Esri World Imagery + Boundaries/Places Reference)
  sat: {
    name: '3D Vista Satelital HD (Esri World Imagery)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    refUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
    subdomains: 'abc'
  },
  // 4. OpenStreetMap: Open Global Street Grid
  street: {
    name: 'OpenStreetMap Mundial',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 19,
    subdomains: 'abc'
  }
};

// Global Country Coordinates & Hubs for instant worldwide navigation
const GLOBAL_COUNTRIES = {
  ARG: { code: 'ARG', name: 'Argentina', flag: '🇦🇷', capital: 'Buenos Aires', lat: -34.6037, lng: -58.3816, zoom: 13, continent: 'Sudamérica' },
  ESP: { code: 'ESP', name: 'España', flag: '🇪🇸', capital: 'Madrid', lat: 40.4168, lng: -3.7038, zoom: 13, continent: 'Europa' },
  MEX: { code: 'MEX', name: 'México', flag: '🇲🇽', capital: 'Ciudad de México', lat: 19.4326, lng: -99.1332, zoom: 13, continent: 'Norteamérica' },
  USA: { code: 'USA', name: 'Estados Unidos', flag: '🇺🇸', capital: 'Miami / Washington', lat: 25.7617, lng: -80.1918, zoom: 13, continent: 'Norteamérica' },
  COL: { code: 'COL', name: 'Colombia', flag: '🇨🇴', capital: 'Bogotá', lat: 4.7110, lng: -74.0721, zoom: 13, continent: 'Sudamérica' },
  CHL: { code: 'CHL', name: 'Chile', flag: '🇨🇱', capital: 'Santiago', lat: -33.4489, lng: -70.6693, zoom: 13, continent: 'Sudamérica' },
  BRA: { code: 'BRA', name: 'Brasil', flag: '🇧🇷', capital: 'São Paulo', lat: -23.5505, lng: -46.6333, zoom: 13, continent: 'Sudamérica' },
  PER: { code: 'PER', name: 'Perú', flag: '🇵🇪', capital: 'Lima', lat: -12.0464, lng: -77.0428, zoom: 13, continent: 'Sudamérica' },
  URY: { code: 'URY', name: 'Uruguay', flag: '🇺🇾', capital: 'Montevideo', lat: -34.9011, lng: -56.1645, zoom: 13, continent: 'Sudamérica' },
  FRA: { code: 'FRA', name: 'Francia', flag: '🇫🇷', capital: 'París', lat: 48.8566, lng: 2.3522, zoom: 13, continent: 'Europa' },
  DEU: { code: 'DEU', name: 'Alemania', flag: '🇩🇪', capital: 'Berlín', lat: 52.5200, lng: 13.4050, zoom: 13, continent: 'Europa' },
  ITA: { code: 'ITA', name: 'Italia', flag: '🇮🇹', capital: 'Roma', lat: 41.9028, lng: 12.4964, zoom: 13, continent: 'Europa' },
  GBR: { code: 'GBR', name: 'Reino Unido', flag: '🇬🇧', capital: 'Londres', lat: 51.5074, lng: -0.1278, zoom: 13, continent: 'Europa' },
  JPN: { code: 'JPN', name: 'Japón', flag: '🇯🇵', capital: 'Tokio', lat: 35.6762, lng: 139.6503, zoom: 13, continent: 'Asia' },
  CAN: { code: 'CAN', name: 'Canadá', flag: '🇨🇦', capital: 'Toronto', lat: 43.6532, lng: -79.3832, zoom: 13, continent: 'Norteamérica' },
  AUS: { code: 'AUS', name: 'Australia', flag: '🇦🇺', capital: 'Sídney', lat: -33.8688, lng: 151.2093, zoom: 13, continent: 'Oceanía' }
};

let userGpsMarker = null;

// --- 3D Globe & Orbital Navigation Engine (Three.js) ---
const ARGENTINA_COORDS = { lat: -34.6037, lng: -58.3816 };

function latLngToVector3(lat, lng, radius = 5.0) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

function vector3ToLatLng(vec, radius = 5.0) {
  const phi = Math.acos(Math.max(-1, Math.min(1, vec.y / radius)));
  const lat = 90 - phi * (180 / Math.PI);
  let theta = Math.atan2(vec.z, -vec.x);
  let lng = theta * (180 / Math.PI) - 180;
  while (lng < -180) lng += 360;
  while (lng > 180) lng -= 360;
  return { lat, lng };
}

function getClosestCountry(lat, lng) {
  let closest = null;
  let minD = Infinity;
  for (const k in GLOBAL_COUNTRIES) {
    const c = GLOBAL_COUNTRIES[k];
    const d = Math.hypot(c.lat - lat, c.lng - lng);
    if (d < minD) {
      minD = d;
      closest = c;
    }
  }
  if (minD < 32 && closest) return closest;
  return {
    code: 'GEO',
    name: 'Sector Terrestre',
    flag: '🌐',
    capital: `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(2)}°${lng >= 0 ? 'E' : 'O'}`,
    lat,
    lng,
    zoom: 12,
    continent: lat >= 0 ? 'Hemisferio Norte' : 'Hemisferio Sur'
  };
}

function createProceduralEarthTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Deep space ocean gradient
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, 1024);
  oceanGrad.addColorStop(0, '#040d21');
  oceanGrad.addColorStop(0.5, '#020612');
  oceanGrad.addColorStop(1, '#040d21');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, 2048, 1024);

  // Subtle Lat/Lon tactical grid lines
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
  ctx.lineWidth = 1;
  for (let lat = -80; lat <= 80; lat += 20) {
    const y = ((90 - lat) / 180) * 1024;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(2048, y);
    ctx.stroke();
  }
  for (let lon = -180; lon <= 180; lon += 30) {
    const x = ((lon + 180) / 360) * 2048;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 1024);
    ctx.stroke();
  }

  // Equator & Prime Meridian in cyan
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.22)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 512);
  ctx.lineTo(2048, 512);
  ctx.stroke();

  // Helper to project lat/lon to canvas
  function toCanvas(lat, lon) {
    return [((lon + 180) / 360) * 2048, ((90 - lat) / 180) * 1024];
  }

  function drawContinent(pts, fillColor = '#09152b', strokeColor = '#00f0ff') {
    if (pts.length < 3) return;
    ctx.beginPath();
    const [startX, startY] = toCanvas(pts[0][0], pts[0][1]);
    ctx.moveTo(startX, startY);
    for (let i = 1; i < pts.length; i++) {
      const [px, py] = toCanvas(pts[i][0], pts[i][1]);
      ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.8;
    ctx.stroke();
  }

  // Major continental outlines
  // South America
  drawContinent([
    [12, -72], [10, -60], [5, -52], [-5, -35], [-12, -37], [-23, -42],
    [-34, -58], [-42, -63], [-54, -68], [-55, -73], [-45, -75],
    [-20, -70], [-5, -81], [5, -77], [12, -72]
  ], '#0d223f', '#00ffa3');

  // North America
  drawContinent([
    [15, -92], [24, -80], [30, -81], [35, -75], [44, -64], [52, -55],
    [64, -64], [72, -75], [72, -125], [65, -165], [58, -160], [52, -128],
    [34, -120], [22, -105], [15, -92]
  ]);

  // Europe
  drawContinent([
    [36, -9], [43, -9], [44, 0], [50, 1], [58, 5], [63, 10], [71, 28],
    [60, 30], [45, 35], [40, 26], [38, 23], [36, -5], [36, -9]
  ]);

  // Africa
  drawContinent([
    [36, -5], [37, 10], [32, 32], [12, 44], [12, 51], [-12, 40], [-26, 33],
    [-34, 18], [-33, 27], [-15, 12], [5, 2], [5, -4], [15, -17], [28, -13], [36, -5]
  ]);

  // Asia
  drawContinent([
    [42, 28], [60, 30], [70, 40], [75, 100], [72, 175], [60, 162],
    [40, 130], [30, 122], [22, 114], [10, 105], [1, 104], [15, 80],
    [25, 65], [25, 55], [30, 48], [35, 36], [42, 28]
  ]);

  // Australia
  drawContinent([
    [-12, 132], [-11, 142], [-22, 150], [-33, 152], [-38, 145],
    [-35, 117], [-22, 114], [-15, 124], [-12, 132]
  ]);

  // City Lights Glow Points
  const cities = [
    { lat: -34.6037, lng: -58.3816, name: 'Buenos Aires', highlight: true },
    { lat: -23.5505, lng: -46.6333, name: 'São Paulo' },
    { lat: -33.4489, lng: -70.6693, name: 'Santiago' },
    { lat: 40.7128, lng: -74.0060, name: 'New York' },
    { lat: 34.0522, lng: -118.2437, name: 'Los Angeles' },
    { lat: 51.5074, lng: -0.1278, name: 'London' },
    { lat: 48.8566, lng: 2.3522, name: 'Paris' },
    { lat: 35.6762, lng: 139.6503, name: 'Tokyo' },
    { lat: 1.3521, lng: 103.8198, name: 'Singapore' }
  ];

  cities.forEach(city => {
    const [cx, cy] = toCanvas(city.lat, city.lng);
    const rad = city.highlight ? 16 : 8;
    const radial = ctx.createRadialGradient(cx, cy, 1, cx, cy, rad);
    if (city.highlight) {
      radial.addColorStop(0, '#00ffa3');
      radial.addColorStop(0.3, 'rgba(0, 240, 255, 0.9)');
      radial.addColorStop(1, 'rgba(0, 240, 255, 0)');
    } else {
      radial.addColorStop(0, '#fef08a');
      radial.addColorStop(0.4, 'rgba(245, 158, 11, 0.6)');
      radial.addColorStop(1, 'rgba(245, 158, 11, 0)');
    }
    ctx.fillStyle = radial;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.fill();
  });

  return new THREE.CanvasTexture(canvas);
}

const Globe3D = {
  scene: null,
  camera: null,
  renderer: null,
  controls: null,
  earthMesh: null,
  atmosphereMesh: null,
  satelliteGroup: null,
  beaconGroup: null,
  beaconRing: null,
  laserLine: null,
  animId: null,
  isDescending: false,
  isInitialized: false,
  globeTextureMode: 'dark',
  cachedTextures: {},

  init() {
    const container = document.getElementById('globe-3d-container');
    if (!container || this.isInitialized) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || (window.innerHeight - 96);

    // 1. Scene & Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    // Position camera facing South America / Argentina
    this.camera.position.set(2.8, 1.4, 11.2);

    // 2. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x02040a, 1);
    container.innerHTML = '';
    container.appendChild(this.renderer.domElement);

    // 3. OrbitControls (Rotational 3D Movement)
    if (typeof THREE.OrbitControls !== 'undefined') {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.06;
      this.controls.minDistance = 5.3;
      this.controls.maxDistance = 24.0;
      this.controls.autoRotate = true;
      this.controls.autoRotateSpeed = 0.5;

      // Stop auto-rotate when user drags
      this.controls.addEventListener('start', () => {
        this.controls.autoRotate = false;
      });

      // Check distance for descent trigger
      this.controls.addEventListener('change', () => {
        const dist = this.camera.position.distanceTo(this.controls.target);
        if (dist <= 6.0 && !this.isDescending && state.currentViewMode === 'globe-3d') {
          this.descendToSurface(() => transitionToSurface2D());
        }
      });
    }

    // 4. Starfield Space Background
    const starsGeo = new THREE.BufferGeometry();
    const starCount = 1400;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const radius = 120 + Math.random() * 80;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = radius * Math.cos(phi);

      const isCyan = Math.random() > 0.7;
      starColors[i * 3] = isCyan ? 0.0 : 0.9;
      starColors[i * 3 + 1] = isCyan ? 0.95 : 0.9;
      starColors[i * 3 + 2] = 1.0;
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starsGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starsMat = new THREE.PointsMaterial({ size: 1.6, vertexColors: true, transparent: true, opacity: 0.85 });
    this.scene.add(new THREE.Points(starsGeo, starsMat));

    // 5. Earth Sphere
    const earthGeo = new THREE.SphereGeometry(5.0, 64, 64);
    const proceduralTexture = createProceduralEarthTexture();
    const earthMat = new THREE.MeshPhongMaterial({
      map: proceduralTexture,
      shininess: 15,
      specular: new THREE.Color(0x00f0ff)
    });
    this.earthMesh = new THREE.Mesh(earthGeo, earthMat);
    this.scene.add(this.earthMesh);

    // Initial high-tech 3D globe texture load (3D Oscuro Gris Táctico por defecto)
    this.applyGlobeTexture('dark');

    // 6. Glowing Atmosphere Layer
    const atmosGeo = new THREE.SphereGeometry(5.09, 64, 64);
    const atmosMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.16,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending
    });
    this.atmosphereMesh = new THREE.Mesh(atmosGeo, atmosMat);
    this.scene.add(this.atmosphereMesh);

    // 7. Multi-Country Global Tactical Beacons
    this.beaconGroup = new THREE.Group();
    this.beaconRings = [];

    const HUB_BEACONS = [
      { code: 'ARG', name: 'ARGENTINA', lat: -34.6037, lng: -58.3816, flag: '🇦🇷' },
      { code: 'ESP', name: 'ESPAÑA', lat: 40.4168, lng: -3.7038, flag: '🇪🇸' },
      { code: 'MEX', name: 'MÉXICO', lat: 19.4326, lng: -99.1332, flag: '🇲🇽' },
      { code: 'USA', name: 'EE.UU.', lat: 25.7617, lng: -80.1918, flag: '🇺🇸' },
      { code: 'COL', name: 'COLOMBIA', lat: 4.7110, lng: -74.0721, flag: '🇨🇴' },
      { code: 'BRA', name: 'BRASIL', lat: -23.5505, lng: -46.6333, flag: '🇧🇷' },
      { code: 'FRA', name: 'FRANCIA', lat: 48.8566, lng: 2.3522, flag: '🇫🇷' },
      { code: 'JPN', name: 'JAPÓN', lat: 35.6762, lng: 139.6503, flag: '🇯🇵' }
    ];

    HUB_BEACONS.forEach(hub => {
      const pos = latLngToVector3(hub.lat, hub.lng, 5.0);
      const normal = pos.clone().normalize();

      // Pin Cylinder
      const pinGeo = new THREE.CylinderGeometry(0.025, 0.05, 0.45, 12);
      const pinMat = new THREE.MeshBasicMaterial({ color: 0x00ffa3 });
      const pin = new THREE.Mesh(pinGeo, pinMat);
      pin.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
      pin.position.copy(pos.clone().add(normal.clone().multiplyScalar(0.22)));
      this.beaconGroup.add(pin);

      // Pulsing Ring on Surface
      const ringGeo = new THREE.RingGeometry(0.10, 0.28, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      ring.position.copy(pos.clone().add(normal.clone().multiplyScalar(0.03)));
      this.beaconGroup.add(ring);
      this.beaconRings.push(ring);

      // Top glowing point
      const headGeo = new THREE.SphereGeometry(0.08, 12, 12);
      const headMat = new THREE.MeshBasicMaterial({ color: 0x00ffa3 });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.copy(pos.clone().add(normal.clone().multiplyScalar(0.46)));
      this.beaconGroup.add(head);

      // Tag Sprite
      const sCanvas = document.createElement('canvas');
      sCanvas.width = 384;
      sCanvas.height = 80;
      const sCtx = sCanvas.getContext('2d');
      sCtx.fillStyle = 'rgba(6, 12, 28, 0.88)';
      sCtx.strokeStyle = '#00f0ff';
      sCtx.lineWidth = 3;
      sCtx.roundRect ? sCtx.roundRect(6, 6, 372, 68, 14) : sCtx.rect(6, 6, 372, 68);
      sCtx.fill();
      sCtx.stroke();
      sCtx.fillStyle = '#00ffa3';
      sCtx.font = 'bold 28px "Space Grotesk", sans-serif';
      sCtx.fillText(`${hub.flag} ${hub.name}`, 18, 42);
      sCtx.fillStyle = '#94a3b8';
      sCtx.font = '16px "JetBrains Mono", monospace';
      sCtx.fillText('CLIC PARA ENTRAR', 18, 64);

      const sTex = new THREE.CanvasTexture(sCanvas);
      const spriteMat = new THREE.SpriteMaterial({ map: sTex, transparent: true });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(1.4, 0.32, 1);
      sprite.position.copy(pos.clone().add(normal.clone().multiplyScalar(0.85)));
      this.beaconGroup.add(sprite);
    });

    this.scene.add(this.beaconGroup);

    // 8. Orbiting Satellite & Trajectory Ring
    this.satelliteGroup = new THREE.Group();
    const satOrbitRadius = 7.4;
    const orbitGeo = new THREE.BufferGeometry();
    const orbitPts = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      orbitPts.push(new THREE.Vector3(Math.cos(a) * satOrbitRadius, Math.sin(a) * 2.8, Math.sin(a) * satOrbitRadius * 0.9));
    }
    orbitGeo.setFromPoints(orbitPts);
    const orbitMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.25 });
    this.scene.add(new THREE.LineLoop(orbitGeo, orbitMat));

    // Satellite Body
    const satBodyGeo = new THREE.BoxGeometry(0.12, 0.12, 0.18);
    const satBodyMat = new THREE.MeshPhongMaterial({ color: 0xe2e8f0 });
    const satBody = new THREE.Mesh(satBodyGeo, satBodyMat);
    this.satelliteGroup.add(satBody);

    // Solar Panels
    const wingGeo = new THREE.BoxGeometry(0.48, 0.02, 0.14);
    const wingMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const wingMesh = new THREE.Mesh(wingGeo, wingMat);
    this.satelliteGroup.add(wingMesh);
    this.scene.add(this.satelliteGroup);

    // Telemetry Laser Beam connecting Satellite to Earth
    const initialPos = latLngToVector3(ARGENTINA_COORDS.lat, ARGENTINA_COORDS.lng, 5.0);
    const laserGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), initialPos]);
    const laserMat = new THREE.LineBasicMaterial({ color: 0x00ffa3, transparent: true, opacity: 0.6 });
    this.laserLine = new THREE.Line(laserGeo, laserMat);
    this.scene.add(this.laserLine);

    // 9. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    this.scene.add(ambientLight);
    const sunLight = new THREE.DirectionalLight(0x00f0ff, 1.4);
    sunLight.position.set(12, 8, 10);
    this.scene.add(sunLight);

    // 10. Click Raycaster to descend directly into ANY clicked country on the 3D globe!
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let downX = 0, downY = 0;

    container.addEventListener('pointerdown', (e) => {
      downX = e.clientX;
      downY = e.clientY;
    });

    container.addEventListener('pointerup', (e) => {
      const dx = Math.abs(e.clientX - downX);
      const dy = Math.abs(e.clientY - downY);
      if (dx < 7 && dy < 7 && state.currentViewMode === 'globe-3d' && !this.isDescending) {
        const rect = container.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, this.camera);
        const hits = raycaster.intersectObject(this.earthMesh);
        if (hits.length > 0) {
          const pt = hits[0].point;
          const coords = vector3ToLatLng(pt, 5.0);
          this.descendToCoords(coords.lat, coords.lng);
        }
      }
    });

    // 11. Window Resize Listener
    window.addEventListener('resize', () => this.onResize());

    this.isInitialized = true;
    this.startAnimation();
  },

  onResize() {
    const container = document.getElementById('globe-3d-container');
    if (!container || !this.renderer || !this.camera) return;
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || (window.innerHeight - 96);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  },

  animate() {
    this.animId = requestAnimationFrame(() => this.animate());

    const time = performance.now() * 0.001;

    if (this.controls) {
      this.controls.update();
    }

    // Pulse beacon rings
    if (this.beaconRings && this.beaconRings.length > 0) {
      const scale = 1.0 + 0.38 * Math.sin(time * 3.5);
      const opacity = 0.5 + 0.45 * Math.cos(time * 3.5);
      this.beaconRings.forEach(r => {
        r.scale.set(scale, scale, 1);
        r.material.opacity = opacity;
      });
    }

    // Orbit satellite
    if (this.satelliteGroup) {
      const satRadius = 7.4;
      const angle = time * 0.35;
      const satX = Math.cos(angle) * satRadius;
      const satY = Math.sin(angle) * 2.8;
      const satZ = Math.sin(angle) * satRadius * 0.9;
      this.satelliteGroup.position.set(satX, satY, satZ);
      this.satelliteGroup.lookAt(0, 0, 0);

      // Update laser beam targeting active country
      if (this.laserLine) {
        const curCountry = GLOBAL_COUNTRIES[state.selectedCountryCode] || GLOBAL_COUNTRIES.ARG;
        const targetPos = latLngToVector3(curCountry.lat, curCountry.lng, 5.0);
        this.laserLine.geometry.setFromPoints([new THREE.Vector3(satX, satY, satZ), targetPos]);
      }
    }

    this.renderer.render(this.scene, this.camera);
  },

  startAnimation() {
    if (!this.animId) {
      this.animate();
    }
  },

  stopAnimation() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  },

  descendToCoords(lat, lng, customCountry = null) {
    if (this.isDescending) return;
    this.isDescending = true;

    if (this.controls) {
      this.controls.autoRotate = false;
      this.controls.enabled = false;
    }

    const c = customCountry || getClosestCountry(lat, lng);
    state.selectedCountryCode = c.code || 'GEO';

    // Target position: Skimming atmosphere directly above target coordinates
    const targetPos = latLngToVector3(lat, lng, 5.0);
    const normal = targetPos.clone().normalize();
    const targetCamPos = normal.clone().multiplyScalar(5.35);

    const startPos = this.camera.position.clone();
    const startTime = performance.now();
    const duration = 850; // ms

    const stepDescent = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(1.0, elapsed / duration);
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      this.camera.position.lerpVectors(startPos, targetCamPos, ease);
      this.camera.lookAt(targetPos);

      if (t < 1.0) {
        requestAnimationFrame(stepDescent);
      } else {
        this.isDescending = false;
        if (this.controls) this.controls.enabled = true;
        transitionToSurface2D([lat, lng], c.zoom || 13, c);
      }
    };

    requestAnimationFrame(stepDescent);
  },

  descendToCountry(countryCode) {
    const c = GLOBAL_COUNTRIES[countryCode] || GLOBAL_COUNTRIES.ARG;
    this.descendToCoords(c.lat, c.lng, c);
  },

  descendToSurface(callback) {
    const c = GLOBAL_COUNTRIES[state.selectedCountryCode] || GLOBAL_COUNTRIES.ARG;
    this.descendToCoords(c.lat, c.lng, c);
    if (typeof callback === 'function') callback();
  },

  toggleGlobeTexture() {
    const nextMode = this.globeTextureMode === 'dark' ? 'sat' : 'dark';
    this.applyGlobeTexture(nextMode);
  },

  applyGlobeTexture(mode) {
    this.globeTextureMode = mode;
    const btnText = document.getElementById('globe-style-btn-text');
    if (btnText) {
      btnText.innerText = mode === 'dark' ? '3D OSCURO GRIS' : '3D SATELITAL HD';
    }

    const texUrl = mode === 'dark'
      ? 'https://unpkg.com/three-globe/example/img/earth-night.jpg'
      : 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg';

    if (this.cachedTextures[mode] && this.earthMesh) {
      this.earthMesh.material.map = this.cachedTextures[mode];
      this.earthMesh.material.needsUpdate = true;
      return;
    }

    const texLoader = new THREE.TextureLoader();
    texLoader.load(
      texUrl,
      (tex) => {
        this.cachedTextures[mode] = tex;
        if (this.earthMesh) {
          this.earthMesh.material.map = tex;
          this.earthMesh.material.needsUpdate = true;
        }
      },
      undefined,
      (err) => console.log('Utilizando mapa base procedural 3D')
    );
  },

  resetOrbit() {
    if (this.controls) {
      this.controls.enabled = true;
      this.controls.autoRotate = true;
      this.controls.target.set(0, 0, 0);
    }
    this.camera.position.set(2.8, 1.4, 11.2);
    this.camera.lookAt(0, 0, 0);
  }
};

// --- Hybrid 3D Orbit <-> 2D Surface Transitions ---
function transitionToSurface2D(targetCoords = [-34.5770, -58.4005], zoomLevel = 13, countryObj = null) {
  state.currentViewMode = 'surface-2d';

  const c = countryObj || getClosestCountry(targetCoords[0], targetCoords[1]);
  state.selectedCountryCode = c.code || 'ARG';

  // Sync dropdown selectors
  const globeSelect = document.getElementById('globe-country-select');
  const surfaceSelect = document.getElementById('surface-country-select');
  if (globeSelect && c.code && GLOBAL_COUNTRIES[c.code]) globeSelect.value = c.code;
  if (surfaceSelect && c.code && GLOBAL_COUNTRIES[c.code]) surfaceSelect.value = c.code;

  // Immediately deploy fleet, localized route & telemetry to target country
  if (c.code && GLOBAL_COUNTRIES[c.code]) {
    deployFleetToCountry(c.code);
  }

  // Update scope navigation buttons
  document.querySelectorAll('.scope-btn').forEach(btn => btn.classList.remove('active'));
  const vehBtn = document.getElementById('scope-btn-veh');
  if (vehBtn) vehBtn.classList.add('active');

  // Fade out 3D Globe & floating HUD
  const globeContainer = document.getElementById('globe-3d-container');
  const globeHUD = document.getElementById('globe-hud-overlay');
  const tacticalMap = document.getElementById('tactical-map');

  if (globeHUD) {
    globeHUD.style.opacity = '0';
    globeHUD.style.pointerEvents = 'none';
  }
  if (globeContainer) {
    globeContainer.style.opacity = '0';
    globeContainer.style.pointerEvents = 'none';
    setTimeout(() => {
      globeContainer.style.visibility = 'hidden';
      Globe3D.stopAnimation();
    }, 400);
  }

  // Fade in 2D Planar Surface Map
  if (tacticalMap) {
    tacticalMap.style.visibility = 'visible';
    tacticalMap.style.opacity = '1';
    tacticalMap.style.pointerEvents = 'auto';
  }

  // Force Leaflet recalculation & center on target
  setTimeout(() => {
    if (map) {
      map.invalidateSize();
      map.setView(targetCoords, zoomLevel, { animate: true });
      updateMapTiles();
      drawActiveRoute();
      renderVehicleMarkers();
      updateGeoOrientationHUD(`${c.name} • ${c.capital}`);
    }
  }, 100);

  addAlertLog({
    severity: 'INFO',
    title: `TRANSICIÓN: ${c.name.toUpperCase()}`,
    msg: `Ingreso a nivel callejero en ${c.capital} (${c.name}). Controles planos 2D activos sin rotación esférica.`,
    time: new Date().toLocaleTimeString()
  });
}

function transitionToOrbit3D() {
  state.currentViewMode = 'globe-3d';

  // Mark globe button active
  document.querySelectorAll('.scope-btn').forEach(btn => btn.classList.remove('active'));
  const globeBtn = document.getElementById('scope-btn-globe');
  if (globeBtn) globeBtn.classList.add('active');

  const globeContainer = document.getElementById('globe-3d-container');
  const globeHUD = document.getElementById('globe-hud-overlay');
  const tacticalMap = document.getElementById('tactical-map');

  if (globeContainer) {
    globeContainer.style.visibility = 'visible';
    globeContainer.style.opacity = '1';
    globeContainer.style.pointerEvents = 'auto';
  }
  if (globeHUD) {
    globeHUD.style.opacity = '1';
    globeHUD.style.pointerEvents = 'auto';
  }
  if (tacticalMap) {
    tacticalMap.style.opacity = '0';
    tacticalMap.style.pointerEvents = 'none';
    setTimeout(() => {
      tacticalMap.style.visibility = 'hidden';
    }, 400);
  }

  Globe3D.startAnimation();
  Globe3D.resetOrbit();

  const scaleEl = document.getElementById('geo-scale-label');
  const placeEl = document.getElementById('geo-place-name');
  const latlngEl = document.getElementById('geo-latlng');
  const breadcrumbEl = document.getElementById('map-location-breadcrumb');
  if (scaleEl) scaleEl.innerText = 'ÓRBITA SATELITAL 3D';
  if (placeEl) placeEl.innerHTML = 'Planeta Tierra &bull; Espacio Orbital';
  if (latlngEl) latlngEl.innerText = 'Vista 360° &bull; Rotación Esférica';
  if (breadcrumbEl) breadcrumbEl.innerHTML = '🪐 Planeta Tierra &bull; Escala Orbital 3D';

  addAlertLog({
    severity: 'INFO',
    title: 'SALIDA A ÓRBITA GLOBAL (PLANETA 3D)',
    msg: 'Visualización orbital 3D del Planeta Tierra activa con rotación esférica 360° (OrbitControls).',
    time: new Date().toLocaleTimeString()
  });
}

// --- Initializing Map (2D Planar Surface) ---
function initMap() {
  map = L.map('tactical-map', {
    zoomControl: false,
    attributionControl: false,
    minZoom: 2,
    maxZoom: 19,
    worldCopyJump: true
  }).setView([-34.5770, -58.4005], 13);

  L.control.zoom({ position: 'topright' }).addTo(map);

  const isLightTheme = document.getElementById('app-body')?.classList.contains('light-theme');
  updateMapTiles(isLightTheme ? 'googleStreet' : 'dark');
  map.on('click', onMapClick);

  // When zooming out completely in 2D mode (zoom <= 2), exit planet back to 3D Orbit!
  map.on('zoomend', () => {
    if (state.currentViewMode === 'surface-2d' && map.getZoom() <= 2) {
      transitionToOrbit3D();
    } else {
      updateGeoOrientationHUD();
    }
  });
  map.on('moveend', updateGeoOrientationHUD);

  drawActiveRoute();
  renderVehicleMarkers();
  updateGeoOrientationHUD();
  init3DBuildings();
}

function updateGeoOrientationHUD(customPlace = null) {
  if (!map) return;
  const zoom = map.getZoom();
  const center = map.getCenter();

  const latStr = `${Math.abs(center.lat).toFixed(4)}° ${center.lat >= 0 ? 'N' : 'S'}`;
  const lngStr = `${Math.abs(center.lng).toFixed(4)}° ${center.lng >= 0 ? 'E' : 'O'}`;

  const breadcrumbEl = document.getElementById('map-location-breadcrumb');
  const scaleEl = document.getElementById('geo-scale-label');
  const placeEl = document.getElementById('geo-place-name');
  const latlngEl = document.getElementById('geo-latlng');

  const curCountry = GLOBAL_COUNTRIES[state.selectedCountryCode] || GLOBAL_COUNTRIES.ARG;

  let scaleText = 'NIVEL TÁCTICO LOCAL';
  let placeText = customPlace || `${curCountry.capital} &bull; ${curCountry.name}`;
  let breadcrumbText = `📍 ${curCountry.name} (${curCountry.capital}) &bull; ${curCountry.continent}`;

  if (zoom <= 3) {
    scaleText = 'VISTA CONTINENTAL / PAÍS';
    placeText = `${curCountry.name} &bull; ${curCountry.continent}`;
    breadcrumbText = `${curCountry.flag} ${curCountry.name} &bull; Escala País`;
  } else if (zoom <= 7) {
    scaleText = 'VISTA REGIONAL';
    placeText = `Región Metropolitana &bull; ${curCountry.name}`;
    breadcrumbText = `🗺️ Región de ${curCountry.capital}`;
  } else if (zoom <= 12) {
    scaleText = 'ZONA METROPOLITANA';
    placeText = `${curCountry.capital} &bull; ${curCountry.name}`;
    breadcrumbText = `🏙️ Área Urbana ${curCountry.capital}`;
  } else {
    scaleText = 'CORREDOR TÁCTICO DE CUSTODIA';
    placeText = `${curCountry.capital} &bull; Corredor Seguro`;
    breadcrumbText = `🎯 Monitoreo en ${curCountry.name}`;
  }

  if (scaleEl) scaleEl.innerText = scaleText;
  if (placeEl) placeEl.innerHTML = placeText;
  if (latlngEl) latlngEl.innerText = `${latStr}, ${lngStr}`;
  if (breadcrumbEl) breadcrumbEl.innerHTML = breadcrumbText;
}

function setGeoScope(scope) {
  document.querySelectorAll('.scope-btn').forEach(btn => btn.classList.remove('active'));
  const targetBtn = document.getElementById(`scope-btn-${scope}`);
  if (targetBtn) targetBtn.classList.add('active');

  const curCountry = GLOBAL_COUNTRIES[state.selectedCountryCode] || GLOBAL_COUNTRIES.ARG;
  const curVeh = getSelectedVehicle();

  if (scope === 'globe') {
    transitionToOrbit3D();
    return;
  }

  // If currently in 3D Orbit mode and user selects a surface scope, descend to 2D
  if (state.currentViewMode === 'globe-3d') {
    let target = [curCountry.lat, curCountry.lng];
    let zoom = 13;
    if (scope === 'region') { target = [curCountry.lat, curCountry.lng]; zoom = 5; }
    else if (scope === 'city') { target = [curCountry.lat, curCountry.lng]; zoom = 12; }
    else if (scope === 'veh' && curVeh) { target = [curVeh.lat, curVeh.lng]; zoom = 15; }

    Globe3D.descendToCoords(target[0], target[1], curCountry);
    return;
  }

  // If already in 2D Planar Surface Mode:
  if (!map) return;
  if (scope === 'region') {
    map.flyTo([curCountry.lat, curCountry.lng], 5, { duration: 1.5 });
  } else if (scope === 'city') {
    map.flyTo([curCountry.lat, curCountry.lng], 12, { duration: 1.2 });
  } else if (scope === 'veh') {
    if (curVeh) {
      map.flyTo([curVeh.lat, curVeh.lng], 15, { duration: 1 });
    }
  } else if (scope === 'my-gps') {
    locateUserGps();
  }
}

function locateUserGps() {
  if (!navigator.geolocation) {
    alert('Tu navegador no soporta geolocalización.');
    return;
  }

  addAlertItem({
    title: 'SOLICITANDO TU POSICIÓN GPS...',
    desc: 'Buscando satélites del dispositivo local...',
    severity: 'info'
  });

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setUserGpsMarker(lat, lng);
      map.flyTo([lat, lng], 14, { duration: 1.6 });

      addAlertItem({
        title: '📍 TU DISPOSITIVO FUE LOCALIZADO',
        desc: `Ubicación detectada con precisión: [${lat.toFixed(4)}, ${lng.toFixed(4)}]. Marcador en mapa activo.`,
        severity: 'info'
      });
    },
    (err) => {
      console.warn('Geolocation error:', err);
      const c = GLOBAL_COUNTRIES[state.selectedCountryCode] || GLOBAL_COUNTRIES.ARG;
      alert('Aviso: Permite el acceso a la ubicación en tu navegador para ver tu punto exacto. Centrando en Capital.');
      map.flyTo([c.lat, c.lng], 13);
    },
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

function setUserGpsMarker(lat, lng) {
  if (userGpsMarker) {
    userGpsMarker.setLatLng([lat, lng]);
  } else {
    const userIcon = L.divIcon({
      className: 'user-gps-container',
      html: `
        <div class="user-gps-pulse-marker"></div>
        <div class="tactical-marker-label" style="border-color:#00ffa3; color:#00ffa3; margin-left:-25px;">
          📍 TÚ ESTÁS AQUÍ
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    userGpsMarker = L.marker([lat, lng], { icon: userIcon })
      .bindPopup(`<b>📍 TU UBICACIÓN ACTUAL</b><br>Coordenadas: ${lat.toFixed(5)}, ${lng.toFixed(5)}<br><small style="color:#00ffa3">Dispositivo Local Conectado</small>`)
      .addTo(map);
  }
  userGpsMarker.openPopup();
}

// Clean, 100% Free World Tile Switcher without API keys or watermarks
function updateMapTiles(requestedMode = null) {
  if (!map) return;
  if (requestedMode && TILE_CONFIG[requestedMode]) {
    currentTileMode = requestedMode;
  }
  localStorage.setItem('rhino_map_tile_mode', currentTileMode);

  // Cleanly remove any previous tile layers
  if (currentTileLayer) {
    map.removeLayer(currentTileLayer);
    currentTileLayer = null;
  }
  if (currentTileRefLayer) {
    map.removeLayer(currentTileRefLayer);
    currentTileRefLayer = null;
  }

  const config = TILE_CONFIG[currentTileMode] || TILE_CONFIG.dark;

  // 1. Add Base Tile Layer
  currentTileLayer = L.tileLayer(config.url, {
    maxZoom: config.maxZoom || 19,
    subdomains: config.subdomains || 'abc',
    attribution: ''
  }).addTo(map);
  currentTileLayer.bringToBack();

  // 2. Add Reference Labels Layer if defined (e.g. for Dark Tactical Mode or Sat mode)
  if (config.refUrl) {
    currentTileRefLayer = L.tileLayer(config.refUrl, {
      maxZoom: config.maxZoom || 19,
      subdomains: config.subdomains || 'abc',
      attribution: ''
    }).addTo(map);
  }

  // Sync Dropdown Select
  const selectEl = document.getElementById('map-tile-style-select');
  if (selectEl && selectEl.value !== currentTileMode) {
    selectEl.value = currentTileMode;
  }

  // Sync Map Theme Toggle Button UI
  updateMapDarkButtonUI();
}

function updateMapDarkButtonUI() {
  const btn = document.getElementById('btn-toggle-map-dark');
  if (!btn) return;

  btn.classList.remove('active', 'light-mode', 'sat-mode');

  if (currentTileMode === 'dark') {
    btn.classList.add('active');
    btn.innerHTML = `<i class="fa-solid fa-moon text-cyan"></i> <span id="map-dark-btn-text">MAPA OSCURO</span>`;
    btn.title = "Modo Oscuro Cyber Activo. Clic para cambiar a Mapa Claro";
  } else if (currentTileMode === 'sat') {
    btn.classList.add('sat-mode');
    btn.innerHTML = `<i class="fa-solid fa-satellite text-purple"></i> <span id="map-dark-btn-text">SATELITAL HD</span>`;
    btn.title = "Modo Satelital Activo. Clic para volver a Modo Oscuro";
  } else {
    btn.classList.add('light-mode');
    btn.innerHTML = `<i class="fa-solid fa-sun text-amber"></i> <span id="map-dark-btn-text">MAPA CLARO</span>`;
    btn.title = "Modo Claro Activo. Clic para cambiar a Modo Oscuro";
  }
}

function toggleMapTheme() {
  if (currentTileMode === 'dark') {
    updateMapTiles('googleStreet');
    showNotification('🗺️ Mapa cambiado a Modo Claro Callejero', 'info');
  } else {
    updateMapTiles('dark');
    showNotification('🌑 Mapa cambiado a Modo Oscuro Cyber Táctico', 'success');
  }
}

function toggle3DTilt() {
  const mapWrapper = document.querySelector('.map-wrapper');
  const btn = document.getElementById('btn-toggle-3d-tilt');
  if (!mapWrapper) return;

  const is3D = mapWrapper.classList.toggle('mode-3d-tilt');
  if (btn) {
    btn.classList.toggle('active', is3D);
    btn.innerHTML = is3D
      ? `<i class="fa-solid fa-cube text-cyan"></i> <span>3D ON</span>`
      : `<i class="fa-solid fa-cube text-cyan"></i> <span>3D</span>`;
  }

  if (map) {
    setTimeout(() => {
      map.invalidateSize();
    }, 150);
  }

  showNotification(is3D ? '🧊 Perspectiva 3D Táctica Activada' : '📐 Vista Cenital 2D Restaurada', 'info');
}

// --- 3D Volumetric Buildings & Google Maps Style Inmersive Navigation ---
let buildings3DLayerGroup = null;

function init3DBuildings() {
  if (!map) return;
  if (!buildings3DLayerGroup) {
    buildings3DLayerGroup = L.layerGroup().addTo(map);
  } else {
    buildings3DLayerGroup.clearLayers();
  }

  if (!state.show3DBuildings) return;

  const c = GLOBAL_COUNTRIES[state.selectedCountryCode] || GLOBAL_COUNTRIES.ARG;
  const lat = c.lat;
  const lng = c.lng;

  // Varied urban architectural blocks around city hub
  const BUILDING_OFFSETS = [
    { dLat: -0.012, dLng: -0.018, w: 32, d: 28, h: 85, type: 'skysc' },
    { dLat: -0.014, dLng: -0.011, w: 28, d: 24, h: 65, type: 'skysc' },
    { dLat: -0.009, dLng: -0.021, w: 36, d: 30, h: 50, type: 'office' },
    { dLat: -0.008, dLng: -0.008, w: 24, d: 24, h: 42, type: 'office' },
    { dLat: -0.003, dLng: +0.005, w: 30, d: 28, h: 90, type: 'skysc' },
    { dLat: -0.006, dLng: +0.012, w: 26, d: 26, h: 55, type: 'office' },
    { dLat: +0.002, dLng: +0.015, w: 34, d: 32, h: 75, type: 'skysc' },
    { dLat: +0.008, dLng: +0.022, w: 28, d: 24, h: 48, type: 'office' },
    { dLat: +0.012, dLng: +0.012, w: 38, d: 35, h: 95, type: 'skysc' },
    { dLat: +0.015, dLng: +0.004, w: 30, d: 30, h: 60, type: 'office' },
    { dLat: +0.017, dLng: -0.008, w: 25, d: 25, h: 45, type: 'office' },
    { dLat: +0.012, dLng: -0.015, w: 32, d: 28, h: 70, type: 'skysc' },
    { dLat: +0.006, dLng: -0.024, w: 28, d: 26, h: 52, type: 'office' },
    { dLat: +0.001, dLng: -0.012, w: 26, d: 24, h: 38, type: 'office' },
    { dLat: -0.018, dLng: -0.005, w: 35, d: 30, h: 72, type: 'skysc' },
    { dLat: -0.016, dLng: +0.016, w: 30, d: 28, h: 58, type: 'office' },
    { dLat: +0.005, dLng: +0.026, w: 26, d: 26, h: 40, type: 'office' },
    { dLat: +0.021, dLng: +0.018, w: 40, d: 32, h: 105, type: 'skysc' },
    { dLat: +0.022, dLng: -0.012, w: 32, d: 30, h: 68, type: 'office' },
    { dLat: -0.002, dLng: -0.028, w: 34, d: 28, h: 62, type: 'skysc' }
  ];

  BUILDING_OFFSETS.forEach(b => {
    const bLat = lat + b.dLat;
    const bLng = lng + b.dLng;

    const bIcon = L.divIcon({
      className: 'building-3d-prism-wrap',
      html: `
        <div class="building-3d-prism" style="width:${b.w}px; height:${b.d}px;">
          <div class="prism-wall" style="width:${b.w}px; height:${b.h}px; bottom:0; left:0; transform: translateZ(${b.d/2}px);"></div>
          <div class="prism-wall" style="width:${b.w}px; height:${b.h}px; bottom:0; left:0; transform: rotateY(180deg) translateZ(${b.d/2}px);"></div>
          <div class="prism-wall" style="width:${b.d}px; height:${b.h}px; bottom:0; left:${(b.w-b.d)/2}px; transform: rotateY(-90deg) translateZ(${b.w/2}px);"></div>
          <div class="prism-wall" style="width:${b.d}px; height:${b.h}px; bottom:0; left:${(b.w-b.d)/2}px; transform: rotateY(90deg) translateZ(${b.w/2}px);"></div>
          <div class="prism-roof" style="width:${b.w}px; height:${b.d}px; top:0; left:0; transform: translateZ(${b.h}px);">
            ${b.type === 'skysc' ? '<div class="building-roof-antenna"></div>' : ''}
          </div>
        </div>
      `,
      iconSize: [b.w, b.d],
      iconAnchor: [b.w / 2, b.d / 2]
    });

    L.marker([bLat, bLng], { icon: bIcon, interactive: false }).addTo(buildings3DLayerGroup);
  });

  // Landmark: Destino / Hangar Seguro 3D con helipuerto
  const destLat = lat + 0.010;
  const destLng = lng + 0.018;
  const destIcon = L.divIcon({
    className: 'building-landmark-dest-wrap',
    html: `
      <div class="building-landmark-dest" style="width:52px; height:46px;">
        <div class="prism-wall" style="width:52px; height:35px; bottom:0; left:0; border-color:#00ffa3; transform: translateZ(23px);"></div>
        <div class="prism-wall" style="width:52px; height:35px; bottom:0; left:0; border-color:#00ffa3; transform: rotateY(180deg) translateZ(23px);"></div>
        <div class="prism-wall" style="width:46px; height:35px; bottom:0; left:3px; border-color:#00ffa3; transform: rotateY(-90deg) translateZ(26px);"></div>
        <div class="prism-wall" style="width:46px; height:35px; bottom:0; left:3px; border-color:#00ffa3; transform: rotateY(90deg) translateZ(26px);"></div>
        <div class="prism-roof" style="width:52px; height:46px; top:0; left:0; border-color:#00ffa3; transform: translateZ(35px);">
          <div class="landmark-roof-pad">H</div>
        </div>
      </div>
    `,
    iconSize: [52, 46],
    iconAnchor: [26, 23]
  });

  L.marker([destLat, destLng], { icon: destIcon })
    .bindPopup(`<b>🎯 DESTINO PRINCIPAL: HANGAR CENTRAL</b><br>Acceso Seguro &bull; Puesto de Guardia 01<br><small style="color:#00ffa3">Edificio de Llegada 3D</small>`)
    .addTo(buildings3DLayerGroup);
}

function toggle3DBuildings() {
  state.show3DBuildings = !state.show3DBuildings;
  const btn = document.getElementById('btn-toggle-3d-buildings');
  if (btn) {
    btn.classList.toggle('active', state.show3DBuildings);
  }
  init3DBuildings();
  showNotification(state.show3DBuildings ? '🏢 Edificios 3D Volumétricos Activados' : 'Edificios 3D Ocultos', 'info');
}

function toggleInmersiveNav() {
  state.inmersiveNav3D = !state.inmersiveNav3D;
  const mapWrapper = document.querySelector('.map-wrapper');
  const scopeBtn = document.getElementById('scope-btn-nav3d');

  if (scopeBtn) {
    document.querySelectorAll('.scope-btn').forEach(b => b.classList.remove('active'));
    if (state.inmersiveNav3D) scopeBtn.classList.add('active');
  }

  if (mapWrapper) {
    mapWrapper.classList.toggle('mode-inmersive-3d', state.inmersiveNav3D);
  }

  const curVeh = getSelectedVehicle();
  if (curVeh && map) {
    map.flyTo([curVeh.lat, curVeh.lng], 16, { duration: 1.2 });
  }

  showNotification(
    state.inmersiveNav3D
      ? '🚀 Modo Navegación 3D Inmersiva Activado (Estilo Google Maps 3D)'
      : 'Vista Cenital Restaurada',
    'success'
  );
}

function updateNavigationHUD(veh) {
  if (!veh) return;
  const route = state.routes[veh.routeId];
  if (!route || route.path.length < 2) return;

  const segIdx = Math.floor(veh.simIndex || 0);
  const nextIdx = Math.min(segIdx + 1, route.path.length - 1);
  const nextPoint = route.path[nextIdx];

  const distMeters = Math.max(15, Math.round(getDistanceMeters(veh.lat, veh.lng, nextPoint[0], nextPoint[1])));
  let maneuverIcon = 'fa-arrow-up';
  let maneuverText = 'Continúe recto';
  let isNearTurn = distMeters < 90;

  if (nextIdx < route.path.length - 1) {
    const afterNext = route.path[nextIdx + 1];
    const curDy = nextPoint[0] - veh.lat;
    const curDx = nextPoint[1] - veh.lng;
    const nextDy = afterNext[0] - nextPoint[0];
    const nextDx = afterNext[1] - nextPoint[1];

    let heading1 = Math.atan2(curDx, curDy) * (180 / Math.PI);
    let heading2 = Math.atan2(nextDx, nextDy) * (180 / Math.PI);
    let delta = heading2 - heading1;
    while (delta > 180) delta -= 360;
    while (delta < -180) delta += 360;

    if (delta > 25) {
      maneuverIcon = 'fa-arrow-turn-right';
      maneuverText = 'Girar a la derecha';
    } else if (delta < -25) {
      maneuverIcon = 'fa-arrow-turn-left';
      maneuverText = 'Girar a la izquierda';
    } else {
      maneuverIcon = 'fa-arrow-up';
      maneuverText = 'Continuar por carril central';
    }
  } else {
    maneuverIcon = 'fa-flag-checkered';
    maneuverText = 'Aproximándose al Destino';
  }

  const c = GLOBAL_COUNTRIES[state.selectedCountryCode] || GLOBAL_COUNTRIES.ARG;
  const STREET_NAMES = {
    ARG: ['Av. del Libertador', 'Av. Figueroa Alcorta', 'Av. 9 de Julio', 'Autopista Illia', 'Av. Costanera'],
    ESP: ['Paseo de la Castellana', 'Calle de Alcalá', 'Gran Vía', 'Paseo del Prado', 'M-30 Lateral'],
    MEX: ['Paseo de la Reforma', 'Av. Insurgentes Sur', 'Periférico Norte', 'Av. Chapultepec', 'Circuito Interior'],
    USA: ['Biscayne Boulevard', 'Brickell Avenue', 'Ocean Drive', 'Collins Avenue', 'I-95 Expressway'],
    COL: ['Carrera 7ma', 'Av. El Dorado (Calle 26)', 'Av. Boyacá', 'Autopista Norte', 'Carrera 30 (NQS)'],
    CHL: ['Av. Providencia', 'Av. Libertador O\'Higgins', 'Av. Las Condes', 'Costanera Norte', 'Av. Vitacura'],
    BRA: ['Avenida Paulista', 'Av. Faria Lima', 'Marginal Pinheiros', 'Av. 23 de Maio', 'Rua da Consolação'],
    PER: ['Av. Javier Prado', 'Av. Arequipa', 'Vía Expresa Paseo de la República', 'Av. Salaverry', 'Av. Brasil']
  };

  const streetList = STREET_NAMES[c.code] || ['Avenida Principal', 'Vía Rápida Conectora', 'Corredor Seguro', 'Bulevar Central'];
  const currentStreet = streetList[segIdx % streetList.length];

  const nextCp = (route.checkpoints && route.checkpoints[Math.min(segIdx, (route.checkpoints.length - 1))])
    ? route.checkpoints[Math.min(segIdx, (route.checkpoints.length - 1))].name
    : `Destino Base ${c.capital}`;

  const distEl = document.getElementById('nav-maneuver-dist');
  const actionEl = document.getElementById('nav-maneuver-text');
  const iconEl = document.getElementById('nav-maneuver-icon');
  const iconBox = document.getElementById('nav-maneuver-icon-box');
  const streetEl = document.getElementById('nav-current-street');
  const targetEl = document.getElementById('nav-next-target');
  const etaTimeEl = document.getElementById('nav-eta-time');
  const etaDistEl = document.getElementById('nav-eta-dist');

  if (distEl) distEl.innerText = `${distMeters} m`;
  if (actionEl) actionEl.innerText = maneuverText;
  if (iconEl) iconEl.className = `fa-solid ${maneuverIcon}`;
  if (iconBox) iconBox.classList.toggle('pulse', isNearTurn);
  if (streetEl) streetEl.innerText = currentStreet;
  if (targetEl) targetEl.innerText = `Hacia: ${nextCp}`;

  const speedKmh = Math.max(20, veh.speed);
  const remainingDistKm = (distMeters * 3.5 / 1000).toFixed(1);
  const etaMinutes = Math.max(1, Math.round((remainingDistKm / speedKmh) * 60));

  if (etaTimeEl) etaTimeEl.innerText = `${etaMinutes} min`;
  if (etaDistEl) etaDistEl.innerText = `${remainingDistKm} km`;

  if (state.navVoiceEnabled && isNearTurn && state.lastSpokenManeuver !== `${segIdx}-${maneuverText}`) {
    state.lastSpokenManeuver = `${segIdx}-${maneuverText}`;
    speakNavInstruction(`En ${distMeters} metros, ${maneuverText.toLowerCase()} hacia ${currentStreet}`);
  }
}

function speakNavInstruction(text) {
  if (!state.navVoiceEnabled) return;
  try {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.volume = 0.85;
      window.speechSynthesis.speak(utterance);
    } else {
      playTacticalClick();
    }
  } catch (err) {}
}

function openDestinationPreview() {
  const modal = document.getElementById('dest-preview-modal');
  const c = GLOBAL_COUNTRIES[state.selectedCountryCode] || GLOBAL_COUNTRIES.ARG;

  const destNameEl = document.getElementById('dest-place-name');
  const destCoordsEl = document.getElementById('dest-coords');
  const destGateEl = document.getElementById('dest-access-gate');

  if (destNameEl) destNameEl.innerText = `Base Hangar Logístico // ${c.capital} (${c.name})`;
  if (destCoordsEl) {
    const lat = (c.lat + 0.010).toFixed(4);
    const lng = (c.lng + 0.018).toFixed(4);
    destCoordsEl.innerText = `${lat}° ${lat >= 0 ? 'N' : 'S'}, ${lng}° ${lng >= 0 ? 'E' : 'O'}`;
  }
  if (destGateEl) destGateEl.innerText = `Portón Principal ${c.capital} #02 (Acceso Autorizado)`;

  if (modal) modal.classList.add('active');
  playLockTargetSound();
}

function closeDestinationPreview() {
  const modal = document.getElementById('dest-preview-modal');
  if (modal) modal.classList.remove('active');
}

function deployFleetToCountry(countryCode) {
  const c = GLOBAL_COUNTRIES[countryCode];
  if (!c) return;

  state.selectedCountryCode = countryCode;
  const lat = c.lat;
  const lng = c.lng;

  // Sync both country dropdown selectors
  const globeSelect = document.getElementById('globe-country-select');
  const surfaceSelect = document.getElementById('surface-country-select');
  if (globeSelect && globeSelect.value !== countryCode) globeSelect.value = countryCode;
  if (surfaceSelect && surfaceSelect.value !== countryCode) surfaceSelect.value = countryCode;

  const newRouteId = `patrulla-${c.code.toLowerCase()}`;
  const routeName = `Corredor Seguro ${c.name} (${c.capital})`;

  // Realistic 5-point patrol route around the city center
  const path = [
    [lat - 0.015, lng - 0.015],
    [lat - 0.005, lng + 0.010],
    [lat + 0.010, lng + 0.018],
    [lat + 0.018, lng - 0.005],
    [lat + 0.005, lng - 0.020]
  ];

  const checkpoints = [
    { name: `Punto 1: Base ${c.capital}`, lat: path[0][0], lng: path[0][1], passed: true },
    { name: `Punto 2: Control Central ${c.name}`, lat: path[1][0], lng: path[1][1], passed: false },
    { name: `Punto 3: Destino Hangar`, lat: path[2][0], lng: path[2][1], passed: false }
  ];

  state.routes[newRouteId] = {
    id: newRouteId,
    name: routeName,
    toleranceMeters: 65,
    path: path,
    checkpoints: checkpoints
  };

  // Re-deploy vehicles
  state.vehicles[0].routeId = newRouteId;
  state.vehicles[0].lat = path[0][0];
  state.vehicles[0].lng = path[0][1];
  state.vehicles[0].simIndex = 0;
  state.vehicles[0].status = 'normal';
  state.vehicles[0].isDeviatedManually = false;

  if (state.vehicles[1]) {
    state.vehicles[1].routeId = newRouteId;
    state.vehicles[1].lat = path[1][0];
    state.vehicles[1].lng = path[1][1];
    state.vehicles[1].simIndex = 0.3;
    state.vehicles[1].status = 'normal';
  }

  // Update Route Selector in sidebar
  const routeSelect = document.getElementById('active-route-select');
  if (routeSelect) {
    let opt = Array.from(routeSelect.options).find(o => o.value === newRouteId);
    if (!opt) {
      opt = document.createElement('option');
      opt.value = newRouteId;
      opt.innerText = routeName;
      routeSelect.appendChild(opt);
    }
    routeSelect.value = newRouteId;
  }

  if (map) {
    map.flyTo([lat, lng], 13, { duration: 1.2 });
  }

  drawActiveRoute();
  renderVehicleMarkers();
  updateGeoOrientationHUD(`${c.name} • ${c.capital}`);
  updateTelemetryDisplay(getSelectedVehicle());
  init3DBuildings();

  addAlertItem({
    title: `FLOTA TRASLADADA A ${c.name.toUpperCase()}`,
    desc: `Móviles ${state.vehicles[0].plate} y ${state.vehicles[1] ? state.vehicles[1].plate : ''} patrullando en ${c.capital}. Corredor autorizado activo.`,
    severity: 'info'
  });
}

// --- Theme System (Dark Flúor / Light Minimalist) ---
function initTheme() {
  const savedTheme = localStorage.getItem('rhino_theme') || 'dark';
  // If the dashboard is dark (or on startup), guarantee dark map mode!
  if (savedTheme !== 'light') {
    currentTileMode = 'dark';
    localStorage.setItem('rhino_map_tile_mode', 'dark');
  } else {
    currentTileMode = 'googleStreet';
  }
  applyTheme(savedTheme, false);
}

function applyTheme(theme, syncMap = true) {
  const body = document.getElementById('app-body');
  const icon = document.getElementById('theme-icon');
  const label = document.getElementById('theme-label');

  if (theme === 'light') {
    body.classList.remove('dark-tactical-theme');
    body.classList.add('light-theme');
    if (icon) icon.className = 'fa-solid fa-moon text-cyan';
    if (label) label.innerText = 'TEMA OSCURO';
    if (syncMap) {
      currentTileMode = 'googleStreet';
    }
  } else {
    body.classList.add('dark-tactical-theme');
    body.classList.remove('light-theme');
    if (icon) icon.className = 'fa-solid fa-sun text-amber';
    if (label) label.innerText = 'TEMA CLARO';
    if (syncMap) {
      currentTileMode = 'dark';
    }
  }

  localStorage.setItem('rhino_theme', theme);
  updateMapTiles(currentTileMode);
}

function toggleTheme() {
  const body = document.getElementById('app-body');
  const isLight = body.classList.contains('light-theme');
  applyTheme(isLight ? 'dark' : 'light', true);
}

// --- View Modes System (Cabina Completa / Solo Mapa / Solo Cámara) ---
let currentDashboardViewMode = 'full'; // 'full' | 'map' | 'cam'

function initDashboardViewMode() {
  const savedMode = localStorage.getItem('rhino_view_mode') || 'full';
  setDashboardViewMode(savedMode, false);
}

function setDashboardViewMode(mode, showToast = true) {
  const grid = document.getElementById('dashboard-grid');
  if (!grid) return;

  currentDashboardViewMode = mode;
  grid.classList.remove('view-mode-map', 'view-mode-cam');

  // Update Buttons active states
  const btnFull = document.getElementById('btn-view-full');
  const btnMap = document.getElementById('btn-view-map-only');
  const btnCam = document.getElementById('btn-view-cam-only');
  const btnExpandMap = document.getElementById('btn-map-expand-solo');
  const btnExpandCam = document.getElementById('btn-cam-expand-solo');

  if (btnFull) btnFull.classList.toggle('active', mode === 'full');
  if (btnMap) btnMap.classList.toggle('active', mode === 'map');
  if (btnCam) btnCam.classList.toggle('active', mode === 'cam');

  if (btnExpandMap) {
    btnExpandMap.innerHTML = mode === 'map' ? '<i class="fa-solid fa-compress"></i>' : '<i class="fa-solid fa-expand"></i>';
    btnExpandMap.title = mode === 'map' ? 'Restaurar cabina completa' : 'Despejar y ver solo el mapa';
  }
  if (btnExpandCam) {
    btnExpandCam.innerHTML = mode === 'cam' ? '<i class="fa-solid fa-compress"></i> <span>RESTAURAR</span>' : '<i class="fa-solid fa-expand"></i> <span>SOLO CÁMARA</span>';
    btnExpandCam.title = mode === 'cam' ? 'Restaurar cabina completa' : 'Despejar y ver solo la cámara';
  }

  if (mode === 'map') {
    grid.classList.add('view-mode-map');
    if (showToast) showNotification('🗺️ Interfaz despejada: Vista de SOLO MAPA', 'info');
  } else if (mode === 'cam') {
    grid.classList.add('view-mode-cam');
    if (showToast) showNotification('👁️ Interfaz despejada: Vista de SOLO CÁMARA ESPÍA', 'info');
  } else {
    if (showToast) showNotification('🔲 Cabina completa restaurada', 'info');
  }

  localStorage.setItem('rhino_view_mode', mode);

  // Resize Leaflet Map to fill new width
  setTimeout(() => {
    if (map) {
      map.invalidateSize();
    }
    // Resize spycam canvas if in cam mode
    const canvas = document.getElementById('camera-canvas');
    if (canvas && canvas.parentElement) {
      canvas.width = canvas.parentElement.clientWidth || 380;
      canvas.height = canvas.parentElement.clientHeight || 215;
    }
  }, 100);
}

// Draw polyline and buffer corridor
function drawActiveRoute() {
  const currentVeh = getSelectedVehicle();
  const route = state.routes[currentVeh ? currentVeh.routeId : 'corredor-norte'];
  if (!route) return;

  // Clear previous
  if (routePolyline) map.removeLayer(routePolyline);
  if (routeCorridorPolygon) map.removeLayer(routeCorridorPolygon);
  checkpointMarkers.forEach(m => map.removeLayer(m));
  checkpointMarkers = [];

  // Corridor (tolerance buffer)
  const tol = (route && route.toleranceMeters) || state.toleranceMeters || 60;
  const corridorWeight = Math.max(16, Math.min(80, Math.round(tol * 0.55)));

  if (state.showCorridor) {
    routeCorridorPolygon = L.polyline(route.path, {
      color: '#06b6d4',
      weight: corridorWeight,
      opacity: 0.22,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);
  }

  // Core authorized path line
  routePolyline = L.polyline(route.path, {
    color: '#06b6d4',
    weight: 4,
    opacity: 0.85,
    dashArray: '8, 6'
  }).addTo(map);

  // Checkpoints
  if (state.showCheckpoints) {
    route.checkpoints.forEach((cp, idx) => {
      const cpIcon = L.divIcon({
        className: 'checkpoint-marker-icon',
        html: `
          <div style="background:#0f172a; border:2px solid ${cp.passed ? '#10b981' : '#f59e0b'}; color:#fff; border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:bold; box-shadow:0 0 10px rgba(0,0,0,0.8);">
            ${idx + 1}
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([cp.lat, cp.lng], { icon: cpIcon })
        .bindPopup(`<b>${cp.name}</b><br>Estado: ${cp.passed ? '<span style="color:#10b981">Completado</span>' : '<span style="color:#f59e0b">Pendiente de paso</span>'}`)
        .addTo(map);
      checkpointMarkers.push(marker);
    });
  }
}

// Render Leaflet markers for vehicles
function renderVehicleMarkers() {
  state.vehicles.forEach(veh => {
    const isSelected = veh.id === state.selectedVehicleId;
    const isDeviated = veh.status === 'deviated';

    const customIcon = L.divIcon({
      className: 'tactical-marker-container',
      html: `
        <div class="vehicle-headlight-beam" style="transform: rotate(${veh.heading}deg);"></div>
        <div class="tactical-vehicle-icon ${isDeviated ? 'deviated' : ''}" style="border-color:${isSelected ? '#22d3ee' : '#38bdf8'}; transform: rotate(${veh.heading}deg);">
          <i class="fa-solid fa-location-arrow"></i>
        </div>
        <div class="tactical-marker-label" style="${isDeviated ? 'border-color:#ef4444; color:#ef4444;' : ''}">
          ${veh.plate} &bull; ${veh.speed} km/h
        </div>
      `,
      iconSize: [42, 60],
      iconAnchor: [21, 21]
    });

    if (vehicleMarkers[veh.id]) {
      vehicleMarkers[veh.id].setLatLng([veh.lat, veh.lng]);
      vehicleMarkers[veh.id].setIcon(customIcon);
    } else {
      const marker = L.marker([veh.lat, veh.lng], { icon: customIcon })
        .addTo(map)
        .on('click', () => {
          selectVehicle(veh.id);
        });
      vehicleMarkers[veh.id] = marker;
    }
  });
}

// --- Distance Calculation (Haversine & Line Projection) ---
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radio tierra metros
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Perpendicular distance from point P to line segment AB in meters
function distToSegmentMeters(pLat, pLng, aLat, aLng, bLat, bLng) {
  const l2 = getDistanceMeters(aLat, aLng, bLat, bLng);
  if (l2 === 0) return getDistanceMeters(pLat, pLng, aLat, aLng);

  // Approximate projection in degrees for short distances
  const t = Math.max(0, Math.min(1,
    ((pLat - aLat) * (bLat - aLat) + (pLng - aLng) * (bLng - aLng)) /
    (Math.pow(bLat - aLat, 2) + Math.pow(bLng - aLng, 2))
  ));

  const projLat = aLat + t * (bLat - aLat);
  const projLng = aLng + t * (bLng - aLng);
  return getDistanceMeters(pLat, pLng, projLat, projLng);
}

// Checks minimum distance of vehicle to entire route polyline
function calculateDeviationDistance(veh, route) {
  let minDistance = Infinity;
  for (let i = 0; i < route.path.length - 1; i++) {
    const a = route.path[i];
    const b = route.path[i + 1];
    const d = distToSegmentMeters(veh.lat, veh.lng, a[0], a[1], b[0], b[1]);
    if (d < minDistance) {
      minDistance = d;
    }
  }
  return minDistance;
}

// --- Check and Trigger Alerts ---
function verifyRouteCompliance(veh) {
  const route = state.routes[veh.routeId];
  if (!route) return;

  const distMeters = calculateDeviationDistance(veh, route);
  veh.deviationDistance = Math.round(distMeters);

  if (distMeters > route.toleranceMeters) {
    if (veh.status !== 'deviated') {
      veh.status = 'deviated';
      triggerRouteAlert(veh, distMeters, route.toleranceMeters);
    }
  } else {
    if (veh.status === 'deviated') {
      veh.status = 'normal';
      addAlertLog({
        severity: 'INFO',
        title: `Retorno a Corredor Seguro`,
        msg: `${veh.name} volvió a la ruta autorizada (${Math.round(distMeters)}m del eje).`,
        time: new Date().toLocaleTimeString()
      });
    }
  }
}

function triggerRouteAlert(veh, currentDist, maxTolerance) {
  state.alertCount++;
  playAlertSiren();

  const alertData = {
    severity: 'CRÍTICA',
    title: `¡DESVÍO DE RUTA DETECTADO!`,
    msg: `${veh.name} (${veh.plate}) se ha apartado ${Math.round(currentDist)}m del corredor autorizado (Máx: ${maxTolerance}m).`,
    time: new Date().toLocaleTimeString(),
    vehicleId: veh.id
  };

  addAlertLog(alertData);
  updateAlertsUI();

  // If this is currently selected vehicle, flash camera warning banner
  if (veh.id === state.selectedVehicleId) {
    const camAlertBanner = document.getElementById('cam-alert-banner');
    if (camAlertBanner) camAlertBanner.classList.add('active');
  }
}

function addAlertLog(item) {
  state.alertsList.unshift(item);
  if (state.alertsList.length > 50) state.alertsList.pop();
  renderAlertsList();
}

function renderAlertsList() {
  const stream = document.getElementById('alerts-stream');
  if (!stream) return;

  if (state.alertsList.length === 0) {
    stream.innerHTML = `
      <div class="alert-empty-hint">
        <i class="fa-solid fa-shield-check"></i>
        <span>Sin infracciones detectadas. El vehículo se encuentra en corredor seguro.</span>
      </div>
    `;
    return;
  }

  stream.innerHTML = state.alertsList.map(a => `
    <div class="alert-item-card" style="${a.severity === 'INFO' ? 'border-left-color:#10b981; background:rgba(16,185,129,0.1);' : ''}">
      <div class="alert-item-header">
        <span class="alert-severity" style="${a.severity === 'INFO' ? 'color:#10b981;' : ''}">[${a.severity}] ${a.title}</span>
        <span class="alert-time">${a.time}</span>
      </div>
      <div class="alert-item-msg">${a.msg}</div>
      <div class="alert-item-details">GPS Rhino &bull; Protocolo de Seguridad Activo</div>
    </div>
  `).join('');
}

function updateAlertsUI() {
  const alertCountEl = document.getElementById('stat-alert-count');
  const alertIndicator = document.getElementById('header-alert-indicator');
  if (alertCountEl) alertCountEl.innerText = state.alertCount;
  if (alertIndicator) {
    if (state.alertCount > 0) alertIndicator.classList.add('has-alerts');
    else alertIndicator.classList.remove('has-alerts');
  }
}

// --- Simulation Engine ---
function updateSimulationStep() {
  if (!state.isSimulating) return;

  const currentVeh = getSelectedVehicle();
  if (!currentVeh) return;

  const route = state.routes[currentVeh.routeId];
  if (!route || route.path.length < 2) return;

  // Advance index along polyline
  if (!currentVeh.isDeviatedManually) {
    currentVeh.simIndex += 0.003 * state.simSpeedMultiplier;
    if (currentVeh.simIndex >= route.path.length - 1) {
      currentVeh.simIndex = 0; // Loop route
    }

    const segIdx = Math.floor(currentVeh.simIndex);
    const segT = currentVeh.simIndex - segIdx;
    const p1 = route.path[segIdx];
    const p2 = route.path[Math.min(segIdx + 1, route.path.length - 1)];

    currentVeh.lat = p1[0] + segT * (p2[0] - p1[0]);
    currentVeh.lng = p1[1] + segT * (p2[1] - p1[1]);

    // Calculate heading angle
    const dy = p2[0] - p1[0];
    const dx = p2[1] - p1[1];
    let angleDeg = Math.atan2(dx, dy) * (180 / Math.PI);
    if (angleDeg < 0) angleDeg += 360;
    currentVeh.heading = Math.round(angleDeg);
    currentVeh.speed = Math.round(48 + Math.sin(currentVeh.simIndex * 10) * 8);
  } else {
    // Vehicle is deviated: speed up slightly, moving sideways out of corridor
    currentVeh.lat += 0.00008;
    currentVeh.lng += 0.00015;
    currentVeh.speed = 64;
    currentVeh.heading = 75;
  }

  // Check deviation
  verifyRouteCompliance(currentVeh);

  // Update UI components
  renderVehicleMarkers();
  updateTelemetryDisplay(currentVeh);
  updateNavigationHUD(currentVeh);

  if (state.inmersiveNav3D && map) {
    map.panTo([currentVeh.lat, currentVeh.lng], { animate: false });
  }
}

// --- Telemetry Display Updates ---
function updateTelemetryDisplay(veh) {
  const speedEl = document.getElementById('t-speed');
  const simSpeedDisp = document.getElementById('sim-speed-display');
  const headingEl = document.getElementById('t-heading');
  const routeStatusEl = document.getElementById('t-route-status');
  const hudCoords = document.getElementById('hud-gps-coords');
  const hudTime = document.getElementById('hud-cam-time');
  const camAlertBanner = document.getElementById('cam-alert-banner');

  if (speedEl) speedEl.innerHTML = `${veh.speed} <small>km/h</small>`;
  if (simSpeedDisp) simSpeedDisp.innerText = `${veh.speed} km/h`;
  if (headingEl) headingEl.innerText = `${veh.heading}°`;

  // Cockpit HUD Speedometer Vectorial Gauge
  const hudCockpitSpeed = document.getElementById('hud-cockpit-speed');
  const hudGaugeProgress = document.getElementById('hud-gauge-progress');
  if (hudCockpitSpeed) hudCockpitSpeed.innerText = veh.speed;
  if (hudGaugeProgress) {
    const progressOffset = Math.max(0, 314 - (veh.speed / 140) * 230);
    hudGaugeProgress.style.strokeDashoffset = progressOffset;
    if (veh.speed > 85) hudGaugeProgress.style.stroke = '#ef4444';
    else if (veh.speed > 55) hudGaugeProgress.style.stroke = '#f59e0b';
    else hudGaugeProgress.style.stroke = '#00f0ff';
  }

  // G-Force Vector Calculation
  const hudGforce = document.getElementById('hud-gforce');
  if (hudGforce) {
    const gVal = (0.04 + (veh.speed / 140) * 0.38).toFixed(2);
    hudGforce.innerText = `G-FORCE: ${gVal}G LAT`;
  }

  // Artificial Horizon Attitude Indicator (Pitch & Roll)
  const attitudeSphere = document.getElementById('hud-attitude-sphere');
  if (attitudeSphere) {
    const horizonGround = attitudeSphere.querySelector('.horizon-ground');
    const rollAngle = Math.sin((veh.heading || 0) * Math.PI / 180) * 16;
    const pitchY = Math.min(15, Math.max(-15, (veh.speed - 45) * 0.25));
    if (horizonGround) {
      horizonGround.style.transform = `rotate(${rollAngle}deg) translateY(${pitchY}px)`;
    }
  }

  // Compass Heading Ribbon Tape
  const compassStrip = document.getElementById('hud-compass-strip');
  if (compassStrip) {
    const normalizedH = (veh.heading || 0) % 360;
    const pxOffset = -(normalizedH / 360) * 260;
    compassStrip.style.transform = `translateX(${pxOffset}px)`;
  }

  if (routeStatusEl) {
    if (veh.status === 'deviated') {
      routeStatusEl.className = 't-value text-red';
      routeStatusEl.innerHTML = `DESVIADO (+${veh.deviationDistance}m)`;
      if (camAlertBanner) camAlertBanner.classList.add('active');
    } else {
      routeStatusEl.className = 't-value text-green';
      routeStatusEl.innerHTML = `EN RUTA (${veh.deviationDistance}m)`;
      if (camAlertBanner) camAlertBanner.classList.remove('active');
    }
  }

  if (hudCoords) hudCoords.innerText = `${veh.lat.toFixed(5)}, ${veh.lng.toFixed(5)}`;
  if (hudTime) hudTime.innerText = new Date().toISOString().replace('T', ' ').substring(0, 19);

  // Update Left Sidebar vehicle card status
  const card = document.getElementById(`v-card-${veh.id}`);
  if (card) {
    if (veh.status === 'deviated') card.classList.add('deviated');
    else card.classList.remove('deviated');
  }
}

// --- UI Rendering Helpers ---
function getSelectedVehicle() {
  return state.vehicles.find(v => v.id === state.selectedVehicleId) || state.vehicles[0];
}

function selectVehicle(vehId) {
  state.selectedVehicleId = vehId;
  const veh = getSelectedVehicle();
  if (!veh) return;

  // Update center
  if (map) {
    map.panTo([veh.lat, veh.lng]);
    drawActiveRoute();
  }

  // Update Sim Bar name
  const simNameEl = document.getElementById('sim-vehicle-name');
  if (simNameEl) simNameEl.innerText = `Vehículo: ${veh.name}`;

  // Update HUD Cam ID
  const hudCamId = document.getElementById('hud-cam-id');
  if (hudCamId) {
    hudCamId.innerText = veh.camId ? `${veh.camId} // ENLACE VEHICULAR` : 'SIN CÁMARA VINCULADA (SOLO GPS)';
  }

  renderVehicleList();
  renderDeviceChips();
}

function renderVehicleList() {
  const container = document.getElementById('vehicle-list-container');
  if (!container) return;

  container.innerHTML = state.vehicles.map(v => {
    const isSelected = v.id === state.selectedVehicleId;
    const isDeviated = v.status === 'deviated';

    return `
      <div class="vehicle-card ${isSelected ? 'selected' : ''} ${isDeviated ? 'deviated' : ''}" 
           id="v-card-${v.id}" onclick="selectVehicle('${v.id}')">
        <div class="v-card-top">
          <div class="v-card-title">
            <i class="fa-solid fa-car-side ${isDeviated ? 'text-red' : 'text-cyan'}"></i>
            <span>${v.name}</span>
          </div>
          <span class="v-plate">${v.plate}</span>
        </div>

        <div class="v-devices-attached">
          ${v.gpsId ? `<span class="tag-device gps"><i class="fa-solid fa-satellite"></i> ${v.gpsId}</span>` : '<span class="tag-device standalone">Sin GPS</span>'}
          ${v.camId ? `<span class="tag-device cam"><i class="fa-solid fa-video"></i> ${v.camId}</span>` : '<span class="tag-device standalone"><i class="fa-solid fa-video-slash"></i> Sin Cámara</span>'}
        </div>

        <div class="v-card-footer">
          <span>Vel: <b>${v.speed} km/h</b></span>
          <span class="v-status-badge ${isDeviated ? 'alert' : 'ok'}">
            ${isDeviated ? '¡DESVIADO!' : 'RUTA SEGURA'}
          </span>
        </div>
      </div>
    `;
  }).join('');

  const countBadge = document.getElementById('vehicle-count-badge');
  if (countBadge) countBadge.innerText = `${state.vehicles.length} Unidades`;
}

function renderDeviceChips() {
  const gpsContainer = document.getElementById('gps-device-chips');
  const camContainer = document.getElementById('cam-device-chips');

  if (gpsContainer) {
    gpsContainer.innerHTML = state.devices.gps.map(g => `
      <div class="device-item-card">
        <div class="device-item-info">
          <div class="device-name"><i class="fa-solid fa-location-crosshairs text-cyan"></i> ${g.name}</div>
          <div class="device-sub">ID: ${g.id} &bull; Bat: ${g.battery}</div>
        </div>
        <span class="tag-device ${g.assignedTo ? 'gps' : 'standalone'}">
          ${g.assignedTo ? `Vinculado a ${g.assignedTo}` : 'Libre / Standalone'}
        </span>
      </div>
    `).join('');
  }

  if (camContainer) {
    camContainer.innerHTML = state.devices.cameras.map(c => `
      <div class="device-item-card">
        <div class="device-item-info">
          <div class="device-name"><i class="fa-solid fa-video text-amber"></i> ${c.name}</div>
          <div class="device-sub">ID: ${c.id} &bull; ${c.fps}</div>
        </div>
        <span class="tag-device ${c.assignedTo ? 'cam' : 'standalone'}">
          ${c.assignedTo ? `Vinculada a ${c.assignedTo}` : 'Modo Espía Independiente'}
        </span>
      </div>
    `).join('');
  }

  // Update header counts
  const statGps = document.getElementById('stat-active-gps');
  const statCams = document.getElementById('stat-active-cams');
  if (statGps) statGps.innerText = `${state.devices.gps.filter(g => g.status === 'online').length}/${state.devices.gps.length}`;
  if (statCams) statCams.innerText = `${state.devices.cameras.filter(c => c.status === 'online').length}/${state.devices.cameras.length}`;
}

// --- Spy Camera Road Simulator with Human / ESP32 Detection ---
let roadOffset = 0;
let personWalkPhase = 0;

function initCameraCanvas() {
  const canvas = document.getElementById('camera-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function renderFrame() {
    const w = canvas.width;
    const h = canvas.height;
    const curVeh = getSelectedVehicle();

    // Road animation offset depending on speed
    if (curVeh) {
      roadOffset = (roadOffset + (curVeh.speed / 15)) % 40;
    }
    personWalkPhase = (personWalkPhase + 0.05) % (Math.PI * 2);

    // Sky / Night Horizon
    ctx.fillStyle = state.camMode === 'thermal' ? '#000000' : '#080c14';
    ctx.fillRect(0, 0, w, h);

    // City lights on horizon
    ctx.fillStyle = state.camMode === 'thermal' ? '#111827' : '#1e293b';
    ctx.fillRect(0, h * 0.42, w, h * 0.1);

    // Road Asphalt Perspective Polygon
    ctx.fillStyle = state.camMode === 'thermal' ? '#0f172a' : '#111827';
    ctx.beginPath();
    ctx.moveTo(w * 0.42, h * 0.45);
    ctx.lineTo(w * 0.58, h * 0.45);
    ctx.lineTo(w * 0.95, h);
    ctx.lineTo(w * 0.05, h);
    ctx.closePath();
    ctx.fill();

    // Sidewalk on the right
    ctx.fillStyle = state.camMode === 'thermal' ? '#1e293b' : 'rgba(30, 41, 59, 0.6)';
    ctx.beginPath();
    ctx.moveTo(w * 0.58, h * 0.45);
    ctx.lineTo(w * 0.68, h * 0.45);
    ctx.lineTo(w, h * 0.85);
    ctx.lineTo(w * 0.95, h);
    ctx.closePath();
    ctx.fill();

    // Road Shoulder lines
    ctx.strokeStyle = state.camMode === 'thermal' ? '#475569' : '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.42, h * 0.45);
    ctx.lineTo(w * 0.05, h);
    ctx.moveTo(w * 0.58, h * 0.45);
    ctx.lineTo(w * 0.95, h);
    ctx.stroke();

    // Center Dashed Line in Perspective
    ctx.strokeStyle = state.camMode === 'thermal' ? '#f59e0b' : '#facc15';
    ctx.lineWidth = 3;
    for (let y = h * 0.46; y < h; y += 35) {
      const prog = (y - h * 0.45) / (h * 0.55);
      const dashY = (y + roadOffset * prog);
      if (dashY < h) {
        const segLen = 14 * prog;
        ctx.beginPath();
        ctx.moveTo(w * 0.5, dashY);
        ctx.lineTo(w * 0.5, Math.min(dashY + segLen, h));
        ctx.stroke();
      }
    }

    // --- Render Simulated Pedestrians / Humans on Sidewalk ---
    const p1X = w * 0.74;
    const p1Y = h * 0.68;
    const p1H = 50;
    const p1W = 18;

    drawSimulatedHuman(ctx, p1X, p1Y, p1W, p1H, personWalkPhase, state.camMode);

    // AI & ESP32 Tactical Bounding Box
    const isPirTriggered = state.esp32.cam01.pirDetected;
    drawTacticalBoundingBox(ctx, p1X - p1W/2 - 5, p1Y - p1H - 4, p1W + 10, p1H + 8, {
      label: isPirTriggered ? 'HUMANO (PIR ALERTA)' : 'HUMANO #01',
      confidence: '98.4%',
      distance: '3.8m',
      temp: state.camMode === 'thermal' ? '36.8°C' : null,
      isAlert: isPirTriggered
    });

    // 2nd Human if PIR triggered or 2 persons
    if (isPirTriggered || state.esp32.cam01.personsCount > 1) {
      const p2X = w * 0.28;
      const p2Y = h * 0.70;
      const p2H = 46;
      const p2W = 16;
      drawSimulatedHuman(ctx, p2X, p2Y, p2W, p2H, personWalkPhase + 1.2, state.camMode);
      drawTacticalBoundingBox(ctx, p2X - p2W/2 - 5, p2Y - p2H - 4, p2W + 10, p2H + 8, {
        label: 'HUMANO #02',
        confidence: '96.2%',
        distance: '5.1m',
        temp: state.camMode === 'thermal' ? '37.0°C' : null,
        isAlert: true
      });
    }

    // Car Hood in Foreground (Spy Dashcam POV)
    ctx.fillStyle = state.camMode === 'thermal' ? '#1e293b' : '#0f172a';
    ctx.beginPath();
    ctx.moveTo(w * 0.2, h);
    ctx.quadraticCurveTo(w * 0.5, h - 35, w * 0.8, h);
    ctx.closePath();
    ctx.fill();

    // Noise / Scanline grain for covert look
    if (state.camMode === 'night') {
      ctx.fillStyle = 'rgba(0, 255, 163, 0.08)';
      for (let i = 0; i < 400; i++) {
        ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
      }
    } else if (state.camMode === 'lidar') {
      ctx.fillStyle = 'rgba(0, 240, 255, 0.35)';
      for (let x = 15; x < w; x += 18) {
        for (let y = h * 0.45; y < h; y += 14) {
          if (Math.random() > 0.45) ctx.fillRect(x + Math.sin(y)*2, y, 1.5, 1.5);
        }
      }
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      for (let i = 0; i < 250; i++) {
        ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
      }
    }

    requestAnimationFrame(renderFrame);
  }

  renderFrame();
}

function drawSimulatedHuman(ctx, x, y, width, height, phase, mode) {
  ctx.save();
  if (mode === 'thermal') {
    ctx.fillStyle = '#ff3b30';
    ctx.shadowColor = '#ff9500';
    ctx.shadowBlur = 10;
  } else if (mode === 'night') {
    ctx.fillStyle = '#00ffa3';
    ctx.shadowColor = '#00ffa3';
    ctx.shadowBlur = 6;
  } else if (mode === 'lidar') {
    ctx.fillStyle = '#00f0ff';
  } else {
    ctx.fillStyle = '#94a3b8';
  }

  // Head
  const headR = width * 0.35;
  ctx.beginPath();
  ctx.arc(x, y - height + headR, headR, 0, Math.PI * 2);
  ctx.fill();

  // Torso
  const torsoTop = y - height + headR * 2 + 2;
  const torsoBottom = y - height * 0.35;
  ctx.lineWidth = width * 0.55;
  ctx.strokeStyle = ctx.fillStyle;
  ctx.beginPath();
  ctx.moveTo(x, torsoTop);
  ctx.lineTo(x, torsoBottom);
  ctx.stroke();

  // Walking legs
  const legSwing = Math.sin(phase) * 6;
  ctx.lineWidth = width * 0.25;
  ctx.beginPath();
  ctx.moveTo(x, torsoBottom);
  ctx.lineTo(x - legSwing, y);
  ctx.moveTo(x, torsoBottom);
  ctx.lineTo(x + legSwing, y);
  ctx.stroke();

  ctx.restore();
}

function drawTacticalBoundingBox(ctx, bx, by, bw, bh, opts) {
  ctx.save();
  const color = opts.isAlert ? '#ff0055' : (opts.temp ? '#f59e0b' : '#00ffa3');
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.5;

  const corner = 6;
  ctx.beginPath();
  // Top-left
  ctx.moveTo(bx, by + corner); ctx.lineTo(bx, by); ctx.lineTo(bx + corner, by);
  // Top-right
  ctx.moveTo(bx + bw - corner, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + corner);
  // Bottom-left
  ctx.moveTo(bx, by + bh - corner); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + corner, by + bh);
  // Bottom-right
  ctx.moveTo(bx + bw - corner, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw, by + bh - corner);
  ctx.stroke();

  // Header tag
  ctx.font = 'bold 8px "JetBrains Mono", monospace';
  const tagText = opts.temp ? `${opts.label} [${opts.temp}]` : `${opts.label} [${opts.confidence}]`;
  ctx.fillText(tagText, bx, by - 4);

  // Sub distance
  if (opts.distance) {
    ctx.font = '7px "JetBrains Mono", monospace';
    ctx.fillText(`DIST: ${opts.distance}`, bx, by + bh + 9);
  }

  ctx.restore();
}

// Camera Modes (Color, Night Vision IR, Thermal, LiDAR)
function setCamMode(mode) {
  state.camMode = mode;
  const viewport = document.getElementById('spycam-viewport');
  const hudStatus = document.getElementById('hud-feed-status');

  ['btn-cam-normal', 'btn-cam-night', 'btn-cam-thermal', 'btn-cam-lidar'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.remove('active');
  });

  if (viewport) {
    viewport.classList.remove('mode-night', 'mode-thermal', 'mode-lidar');
    if (mode === 'night') {
      viewport.classList.add('mode-night');
      if (hudStatus) hudStatus.innerText = 'IR VISIÓN NOCTURNA: ACTIVA';
      document.getElementById('btn-cam-night')?.classList.add('active');
    } else if (mode === 'thermal') {
      viewport.classList.add('mode-thermal');
      if (hudStatus) hudStatus.innerText = 'SENSOR TÉRMICO FLIR: ACTIVO';
      document.getElementById('btn-cam-thermal')?.classList.add('active');
    } else if (mode === 'lidar') {
      viewport.classList.add('mode-lidar');
      if (hudStatus) hudStatus.innerText = 'LiDAR 3D ESCANEO CUÁNTICO: ACTIVO';
      document.getElementById('btn-cam-lidar')?.classList.add('active');
    } else {
      if (hudStatus) hudStatus.innerText = 'COLOR ÓPTICO: ACTIVO';
      document.getElementById('btn-cam-normal')?.classList.add('active');
    }
  }
}

// Snapshot Capture
function takeSnapshot() {
  const canvas = document.getElementById('camera-canvas');
  if (!canvas) return;

  const dataUrl = canvas.toDataURL('image/png');
  const imgPreview = document.getElementById('snapshot-img-preview');
  const snapDetails = document.getElementById('snapshot-details');
  const modal = document.getElementById('snapshot-modal');

  const curVeh = getSelectedVehicle();
  if (imgPreview) imgPreview.src = dataUrl;
  if (snapDetails && curVeh) {
    snapDetails.innerHTML = `
      <b>Evidencia Guardada:</b> ${curVeh.name} (${curVeh.plate})<br>
      <b>GPS Rhino:</b> Lat ${curVeh.lat.toFixed(5)}, Lng ${curVeh.lng.toFixed(5)}<br>
      <b>Velocidad:</b> ${curVeh.speed} km/h &bull; <b>Timestamp:</b> ${new Date().toLocaleString()}
    `;
  }
  if (modal) modal.classList.add('active');

  addAlertLog({
    severity: 'INFO',
    title: 'Captura de Evidencia Manual',
    msg: `Fotograma grabado desde cámara espía asignada a ${curVeh.name}.`,
    time: new Date().toLocaleTimeString()
  });
}

// Sidebar Tab switching
function switchSidebarTab(tabName) {
  state.activeTab = tabName;
  ['vehicles', 'devices', 'routes', 'esp32'].forEach(t => {
    const btn = document.getElementById(`tab-${t}-btn`);
    const view = document.getElementById(`tab-${t}-view`);
    if (btn) btn.classList.remove('active');
    if (view) view.classList.remove('active');
  });

  const activeBtn = document.getElementById(`tab-${tabName}-btn`);
  const activeView = document.getElementById(`tab-${tabName}-view`);
  if (activeBtn) activeBtn.classList.add('active');
  if (activeView) activeView.classList.add('active');
}

// --- ESP32 IoT Nodes & Motion / Human Detection System ---
function triggerEsp32HumanDetection() {
  state.esp32.cam01.pirDetected = true;
  state.esp32.cam01.personsCount = 2;
  state.esp32.radar02.presence = true;
  state.esp32.radar02.distance = 2.4;
  state.esp32.radar02.microMovement = 78;
  state.esp32.therm03.temp = 36.9;
  state.esp32.therm03.humanDetected = true;

  // Audio sonar ping and lock-on sound
  playSonarPing();
  setTimeout(playLockTargetSound, 320);

  // Update UI Elements
  updateEsp32UI();

  // Add Log line to ESP32 Terminal
  const now = new Date().toTimeString().split(' ')[0];
  appendEsp32Terminal(`[${now}] ALERT {"node":"ESP32-CAM-01","pir":true,"persons":2,"dist_m":2.4,"temp_c":36.9}`, 'alert');

  // Add Alert to Security Stream
  state.alertsList.unshift({
    id: `ALT-ESP32-${Date.now().toString().slice(-4)}`,
    severity: 'ALERTA',
    title: 'Detección Humana ESP32 (PIR + mmWave)',
    msg: 'Presencia humana detectada en perímetro/cabina. Distancia: 2.4m, Firma térmica: 36.9°C.',
    time: new Date().toLocaleTimeString()
  });
  updateAlertsUI();
  renderAlertsList();

  // Flash camera tag
  const tag = document.getElementById('esp32-cam-detect-tag');
  const tagDot = document.getElementById('esp32-detect-dot');
  const tagText = document.getElementById('esp32-detect-text');
  if (tag) tag.classList.add('alert-flash');
  if (tagDot) tagDot.style.background = '#ff0055';
  if (tagText) tagText.innerText = '¡HUMANO DETECTADO // ESP32 DISPARADO!';

  // Reset after 8 seconds
  setTimeout(() => {
    state.esp32.cam01.pirDetected = false;
    state.esp32.cam01.personsCount = 1;
    state.esp32.radar02.presence = false;
    state.esp32.radar02.distance = 0.0;
    state.esp32.radar02.microMovement = 0;
    state.esp32.therm03.temp = 22.4;
    state.esp32.therm03.humanDetected = false;
    updateEsp32UI();
    if (tag) tag.classList.remove('alert-flash');
    if (tagDot) tagDot.style.background = '#00ffa3';
    if (tagText) tagText.innerText = 'SCANNER ESP32: VIGILANCIA ACTIVA';
    appendEsp32Terminal(`[${new Date().toTimeString().split(' ')[0]}] STANDBY {"node":"ESP32-CAM-01","pir":false,"status":"DESPEJADO"}`, 'info');
  }, 8000);
}

function triggerEsp32ParkedAlarm() {
  playAlertSiren();
  triggerSosPanic();
  const now = new Date().toTimeString().split(' ')[0];
  appendEsp32Terminal(`[${now}] CRITICAL {"event":"INTRUSION_PARKED_VEHICLE","pir":true,"accel_g":0.84}`, 'alert');
  state.alertsList.unshift({
    id: `ALT-ESP32-${Date.now().toString().slice(-4)}`,
    severity: 'PELIGRO',
    title: 'Intrusión en Vehículo Estacionado',
    msg: 'Sensor ESP32 detectó movimiento forzado en cabina con vehículo detenido. Protocolo sirena y pánico activado.',
    time: new Date().toLocaleTimeString()
  });
  updateAlertsUI();
  renderAlertsList();
}

function updateEsp32UI() {
  const pirStatus = document.getElementById('esp32-pir-status');
  const personsCount = document.getElementById('esp32-persons-count');
  const radarStatus = document.getElementById('esp32-radar-status');
  const radarDist = document.getElementById('esp32-radar-dist');
  const radarMicro = document.getElementById('esp32-radar-micro');
  const thermalTemp = document.getElementById('esp32-thermal-temp');
  const thermalHuman = document.getElementById('esp32-thermal-human');

  const cardCam = document.getElementById('card-esp32-cam');
  const cardRadar = document.getElementById('card-esp32-radar');

  if (state.esp32.cam01.pirDetected) {
    if (pirStatus) { pirStatus.innerText = '¡MOVIMIENTO DETECTADO!'; pirStatus.className = 'em-val text-red'; }
    if (personsCount) { personsCount.innerText = `${state.esp32.cam01.personsCount} personas`; personsCount.className = 'em-val text-red'; }
    if (cardCam) cardCam.classList.add('alert-motion');
  } else {
    if (pirStatus) { pirStatus.innerText = 'DESPEJADO'; pirStatus.className = 'em-val text-green'; }
    if (personsCount) { personsCount.innerText = '0 en foco'; personsCount.className = 'em-val'; }
    if (cardCam) cardCam.classList.remove('alert-motion');
  }

  if (state.esp32.radar02.presence) {
    if (radarStatus) { radarStatus.innerText = 'PRESENCIA ACTIVA'; radarStatus.className = 'em-val text-red'; }
    if (radarDist) { radarDist.innerText = `${state.esp32.radar02.distance} m`; radarDist.className = 'em-val text-red'; }
    if (radarMicro) { radarMicro.innerText = `${state.esp32.radar02.microMovement}% Respiración`; radarMicro.className = 'em-val text-red'; }
    if (cardRadar) cardRadar.classList.add('alert-motion');
  } else {
    if (radarStatus) { radarStatus.innerText = 'SIN MOVIMIENTO'; radarStatus.className = 'em-val text-cyan'; }
    if (radarDist) { radarDist.innerText = '0.0 m'; radarDist.className = 'em-val'; }
    if (radarMicro) { radarMicro.innerText = '0% Reposo'; radarMicro.className = 'em-val text-green'; }
    if (cardRadar) cardRadar.classList.remove('alert-motion');
  }

  if (state.esp32.therm03.humanDetected) {
    if (thermalTemp) { thermalTemp.innerText = `${state.esp32.therm03.temp}°C (Cuerpo Humano)`; thermalTemp.className = 'em-val text-red'; }
    if (thermalHuman) { thermalHuman.innerText = 'DETECTADO'; thermalHuman.className = 'em-val text-red'; }
  } else {
    if (thermalTemp) { thermalTemp.innerText = `${state.esp32.therm03.temp}°C (Ambiente)`; thermalTemp.className = 'em-val'; }
    if (thermalHuman) { thermalHuman.innerText = 'No detectado'; thermalHuman.className = 'em-val text-green'; }
  }
}

function appendEsp32Terminal(text, type = 'info') {
  const term = document.getElementById('esp32-log-terminal');
  if (!term) return;
  const div = document.createElement('div');
  div.className = `term-line ${type === 'alert' ? 'text-red' : (type === 'warn' ? 'text-amber' : 'text-cyan')}`;
  div.innerText = text;
  term.appendChild(div);
  term.scrollTop = term.scrollHeight;
}

function openEsp32CodeModal() {
  const modal = document.getElementById('esp32-code-modal');
  const codeEl = document.getElementById('esp32-code-text');
  if (codeEl) codeEl.innerText = getEsp32ArduinoFirmwareCode();
  if (modal) modal.classList.add('active');
}

function closeEsp32CodeModal() {
  const modal = document.getElementById('esp32-code-modal');
  if (modal) modal.classList.remove('active');
}

function copyEsp32Code() {
  const code = getEsp32ArduinoFirmwareCode();
  navigator.clipboard.writeText(code).then(() => {
    const btn = document.getElementById('btn-copy-esp32-code');
    if (btn) {
      btn.innerHTML = '<i class="fa-solid fa-check"></i> ¡Copiado!';
      setTimeout(() => { btn.innerHTML = '<i class="fa-solid fa-copy"></i> Copiar Código'; }, 2000);
    }
  });
}

function getEsp32ArduinoFirmwareCode() {
  return `/* =========================================================================
 * RHINO SENTINEL // FIRMWARE ARDUINO ESP32
 * Sensor de Presencia Humana (PIR HC-SR501 / Radar mmWave LD2410 24GHz)
 * Envío de Telemetría JSON vía WiFi a Rhino Sentinel
 * ========================================================================= */

#include <WiFi.h>
#include <HTTPClient.h>

// --- Credenciales WiFi ---
const char* WIFI_SSID = "TU_RED_WIFI";
const char* WIFI_PASS = "TU_PASSWORD";

// --- Endpoint de Servidor Rhino Sentinel ---
const char* SERVER_URL = "http://192.168.1.100:8080/api/esp32/telemetry";

// --- Pines de Sensores de Presencia y Personas ---
const int PIN_PIR_SENSOR = 13;      // Sensor Infrarrojo Pasivo HC-SR501 / RCWL
const int PIN_RADAR_RX   = 16;      // LD2410 mmWave Radar UART RX
const int PIN_RADAR_TX   = 17;      // LD2410 mmWave Radar UART TX
const int PIN_LED_STATUS = 2;       // LED Integrado

unsigned long lastTelemetryMillis = 0;
const unsigned long TELEMETRY_INTERVAL = 2000; // Cada 2 segundos

void setup() {
  Serial.begin(115200);
  pinMode(PIN_PIR_SENSOR, INPUT);
  pinMode(PIN_LED_STATUS, OUTPUT);
  digitalWrite(PIN_LED_STATUS, LOW);

  Serial.println("\\n[RHINO ESP32] Iniciando sistema de vigilancia...");

  // Conexión WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print(".");
  }

  Serial.println("\\n[RHINO ESP32] WiFi Conectado! IP: " + WiFi.localIP().toString());
  digitalWrite(PIN_LED_STATUS, HIGH);
}

void loop() {
  // Lectura en tiempo real del sensor de movimiento de personas
  int pirState = digitalRead(PIN_PIR_SENSOR);
  bool motionDetected = (pirState == HIGH);

  if (motionDetected) {
    digitalWrite(PIN_LED_STATUS, HIGH);
    Serial.println("[ALERTA] ¡Presencia / Movimiento humano detectado!");
    sendTelemetryPayload(true, 1, 3.2, 36.8);
    delay(1000); // Debounce
  } else {
    digitalWrite(PIN_LED_STATUS, LOW);
  }

  // Heartbeat periódico
  if (millis() - lastTelemetryMillis > TELEMETRY_INTERVAL) {
    lastTelemetryMillis = millis();
    sendTelemetryPayload(motionDetected, motionDetected ? 1 : 0, 0.0, 22.4);
  }

  delay(50);
}

void sendTelemetryPayload(bool motion, int persons, float dist, float temp) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  // Armado del paquete JSON
  String jsonPayload = "{";
  jsonPayload += "\\"node\\":\\"ESP32-CAM-01\\",";
  jsonPayload += "\\"motion\\":" + String(motion ? "true" : "false") + ",";
  jsonPayload += "\\"persons\\":" + String(persons) + ",";
  jsonPayload += "\\"radar_dist_m\\":" + String(dist) + ",";
  jsonPayload += "\\"body_temp_c\\":" + String(temp) + ",";
  jsonPayload += "\\"rssi\\":" + String(WiFi.RSSI()) + ",";
  jsonPayload += "\\"battery_v\\":4.18";
  jsonPayload += "}";

  int httpCode = http.POST(jsonPayload);
  if (httpCode > 0) {
    Serial.println("[TELEMETRIA ENVIADA] Codigo: " + String(httpCode));
  }
  http.end();
}`;
}

// --- Pairing Modal Logic ---
function openPairingModal() {
  const modal = document.getElementById('pairing-modal');
  if (modal) modal.classList.add('active');
}

function closePairingModal() {
  const modal = document.getElementById('pairing-modal');
  if (modal) modal.classList.remove('active');
}

function handlePairingSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('form-vehicle-name').value;
  const plate = document.getElementById('form-plate').value || 'S/PATENTE';
  const gpsId = document.getElementById('form-gps-select').value;
  const camId = document.getElementById('form-cam-select').value;
  const routeId = document.getElementById('form-route-assign').value;

  const newId = `VEH-0${state.vehicles.length + 1}`;
  const route = state.routes[routeId];
  const startPos = route ? route.path[0] : [-34.5885, -58.3840];

  const newVeh = {
    id: newId,
    name: name,
    plate: plate,
    gpsId: gpsId !== 'none' ? gpsId : null,
    camId: camId !== 'none' ? camId : null,
    routeId: routeId,
    status: 'normal',
    lat: startPos[0],
    lng: startPos[1],
    speed: 40,
    heading: 90,
    simIndex: 0,
    isDeviatedManually: false,
    deviationDistance: 0
  };

  // Update device assignment
  if (newVeh.gpsId) {
    const dev = state.devices.gps.find(g => g.id === newVeh.gpsId);
    if (dev) dev.assignedTo = newId;
  }
  if (newVeh.camId) {
    const cam = state.devices.cameras.find(c => c.id === newVeh.camId);
    if (cam) cam.assignedTo = newId;
  }

  state.vehicles.push(newVeh);
  closePairingModal();
  selectVehicle(newId);

  addAlertLog({
    severity: 'INFO',
    title: 'Nuevo Vehículo Vinculado',
    msg: `Registrado ${name} (${plate}) con GPS ${newVeh.gpsId || 'Ninguno'} y Cámara ${newVeh.camId || 'Ninguna'}.`,
    time: new Date().toLocaleTimeString()
  });
}

// --- Setup Event Listeners ---
function setupEventListeners() {
  // View Mode Selectors (Cabina Completa / Solo Mapa / Solo Cámara)
  const btnViewFull = document.getElementById('btn-view-full');
  if (btnViewFull) btnViewFull.addEventListener('click', () => setDashboardViewMode('full'));

  const btnViewMap = document.getElementById('btn-view-map-only');
  if (btnViewMap) btnViewMap.addEventListener('click', () => setDashboardViewMode('map'));

  const btnViewCam = document.getElementById('btn-view-cam-only');
  if (btnViewCam) btnViewCam.addEventListener('click', () => setDashboardViewMode('cam'));

  const btnMapExpandSolo = document.getElementById('btn-map-expand-solo');
  if (btnMapExpandSolo) {
    btnMapExpandSolo.addEventListener('click', () => {
      setDashboardViewMode(currentDashboardViewMode === 'map' ? 'full' : 'map');
    });
  }

  const btnCamExpandSolo = document.getElementById('btn-cam-expand-solo');
  if (btnCamExpandSolo) {
    btnCamExpandSolo.addEventListener('click', () => {
      setDashboardViewMode(currentDashboardViewMode === 'cam' ? 'full' : 'cam');
    });
  }

  const btnRestoreFloating = document.getElementById('btn-restore-view-floating');
  if (btnRestoreFloating) {
    btnRestoreFloating.addEventListener('click', () => setDashboardViewMode('full'));
  }

  // Sound toggle
  const soundBtn = document.getElementById('btn-toggle-sound');
  const soundIcon = document.getElementById('sound-icon');
  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      if (soundEnabled) {
        soundBtn.classList.remove('muted');
        soundIcon.className = 'fa-solid fa-volume-high';
      } else {
        soundBtn.classList.add('muted');
        soundIcon.className = 'fa-solid fa-volume-xmark';
      }
    });
  }

  // Modals
  const openPairingBtn = document.getElementById('btn-open-pairing-modal');
  const createVehicleBtn = document.getElementById('btn-create-vehicle');
  const closePairingBtn = document.getElementById('modal-close-btn');
  const cancelPairingBtn = document.getElementById('btn-cancel-modal');
  const pairingForm = document.getElementById('pairing-form');

  if (openPairingBtn) openPairingBtn.addEventListener('click', openPairingModal);
  if (createVehicleBtn) createVehicleBtn.addEventListener('click', openPairingModal);
  if (closePairingBtn) closePairingBtn.addEventListener('click', closePairingModal);
  if (cancelPairingBtn) cancelPairingBtn.addEventListener('click', closePairingModal);
  if (pairingForm) pairingForm.addEventListener('submit', handlePairingSubmit);

  // Snapshot modal close
  const snapClose = document.getElementById('snapshot-close-btn');
  if (snapClose) snapClose.addEventListener('click', () => {
    document.getElementById('snapshot-modal').classList.remove('active');
  });

  const snapBtn = document.getElementById('btn-cam-snapshot');
  if (snapBtn) snapBtn.addEventListener('click', takeSnapshot);

  // Simulation buttons
  const playBtn = document.getElementById('sim-play-btn');
  const playIcon = document.getElementById('sim-play-icon');
  if (playBtn) {
    playBtn.addEventListener('click', () => {
      state.isSimulating = !state.isSimulating;
      playIcon.className = state.isSimulating ? 'fa-solid fa-pause' : 'fa-solid fa-play';
    });
  }

  const resetBtn = document.getElementById('sim-reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const curVeh = getSelectedVehicle();
      if (curVeh) {
        curVeh.simIndex = 0;
        curVeh.isDeviatedManually = false;
        curVeh.status = 'normal';
        const route = state.routes[curVeh.routeId];
        if (route) {
          curVeh.lat = route.path[0][0];
          curVeh.lng = route.path[0][1];
        }
        if (map) map.panTo([curVeh.lat, curVeh.lng]);
        updateTelemetryDisplay(curVeh);
      }
    });
  }

  // FORCE DEVIATION (TEST ALERT TRIGGER)
  function triggerDeviationAction() {
    const curVeh = getSelectedVehicle();
    if (!curVeh) return;

    curVeh.isDeviatedManually = !curVeh.isDeviatedManually;

    if (curVeh.isDeviatedManually) {
      // Jump vehicle coordinates out of corridor
      curVeh.lat += 0.004; // offset ~450 meters away
      curVeh.lng += 0.003;
      verifyRouteCompliance(curVeh);
    } else {
      // Put back on route
      const route = state.routes[curVeh.routeId];
      if (route) {
        curVeh.lat = route.path[1][0];
        curVeh.lng = route.path[1][1];
        verifyRouteCompliance(curVeh);
      }
    }
  }

  const forceDevBtn = document.getElementById('sim-force-deviation-btn');
  const testDevRouteBtn = document.getElementById('btn-test-deviate-route');
  const testNormRouteBtn = document.getElementById('btn-test-normal-route');

  if (forceDevBtn) forceDevBtn.addEventListener('click', triggerDeviationAction);
  if (testDevRouteBtn) testDevRouteBtn.addEventListener('click', () => {
    const curVeh = getSelectedVehicle();
    if (curVeh) {
      curVeh.isDeviatedManually = true;
      curVeh.lat += 0.0045;
      curVeh.lng += 0.0035;
      verifyRouteCompliance(curVeh);
    }
  });
  if (testNormRouteBtn) testNormRouteBtn.addEventListener('click', () => {
    const curVeh = getSelectedVehicle();
    if (curVeh) {
      curVeh.isDeviatedManually = false;
      const route = state.routes[curVeh.routeId];
      if (route) {
        curVeh.lat = route.path[0][0];
        curVeh.lng = route.path[0][1];
        curVeh.status = 'normal';
        verifyRouteCompliance(curVeh);
      }
    }
  });

  // Map Dock Buttons
  const recenterBtn = document.getElementById('btn-recenter');
  if (recenterBtn) {
    recenterBtn.addEventListener('click', () => {
      const curVeh = getSelectedVehicle();
      if (curVeh && map) map.setView([curVeh.lat, curVeh.lng], 14);
    });
  }

  const toggleCorridorBtn = document.getElementById('btn-toggle-route-corridor');
  if (toggleCorridorBtn) {
    toggleCorridorBtn.addEventListener('click', () => {
      state.showCorridor = !state.showCorridor;
      drawActiveRoute();
    });
  }

  const toggleCheckpointsBtn = document.getElementById('btn-toggle-checkpoints');
  if (toggleCheckpointsBtn) {
    toggleCheckpointsBtn.addEventListener('click', () => {
      state.showCheckpoints = !state.showCheckpoints;
      drawActiveRoute();
    });
  }

  // Clear Alerts
  const clearAlertsBtn = document.getElementById('btn-clear-alerts');
  if (clearAlertsBtn) {
    clearAlertsBtn.addEventListener('click', () => {
      state.alertsList = [];
      state.alertCount = 0;
      updateAlertsUI();
      renderAlertsList();
    });
  }

  // Route selector in tab
  const routeSelect = document.getElementById('active-route-select');
  if (routeSelect) {
    routeSelect.addEventListener('change', (e) => {
      const curVeh = getSelectedVehicle();
      if (curVeh) {
        curVeh.routeId = e.target.value;
        curVeh.simIndex = 0;
        curVeh.isDeviatedManually = false;
        const r = state.routes[e.target.value];
        if (r) {
          curVeh.lat = r.path[0][0];
          curVeh.lng = r.path[0][1];
          const tolEl = document.getElementById('tolerance-val');
          if (tolEl) tolEl.innerText = `${r.toleranceMeters} metros`;
          const cpEl = document.getElementById('checkpoint-count');
          if (cpEl) cpEl.innerText = `${r.checkpoints.length} Puntos`;
          const tolSlider = document.getElementById('tolerance-slider');
          if (tolSlider) tolSlider.value = r.toleranceMeters;
          const tolDisplay = document.getElementById('slider-tol-display');
          if (tolDisplay) tolDisplay.innerText = `${r.toleranceMeters}m`;
        }
        drawActiveRoute();
        renderVehicleMarkers();
      }
    });
  }

  // Interactive Route Drawing Button Listeners
  const startDrawBtn = document.getElementById('btn-start-draw-route');
  if (startDrawBtn) startDrawBtn.addEventListener('click', startRouteDrawing);

  const saveDrawBtn = document.getElementById('btn-save-drawn-route');
  if (saveDrawBtn) saveDrawBtn.addEventListener('click', saveDrawnRoute);

  const cancelDrawBtn = document.getElementById('btn-cancel-drawing');
  if (cancelDrawBtn) cancelDrawBtn.addEventListener('click', cancelRouteDrawing);

  // Tolerance Range Slider Listener
  const tolSlider = document.getElementById('tolerance-slider');
  if (tolSlider) {
    tolSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      state.toleranceMeters = val;
      const curVeh = getSelectedVehicle();
      if (curVeh && state.routes[curVeh.routeId]) {
        state.routes[curVeh.routeId].toleranceMeters = val;
      }
      const tolEl = document.getElementById('tolerance-val');
      if (tolEl) tolEl.innerText = `${val} metros`;
      const tolDisplay = document.getElementById('slider-tol-display');
      if (tolDisplay) tolDisplay.innerText = `${val}m`;
      drawActiveRoute();
      if (curVeh) verifyRouteCompliance(curVeh);
    });
  }

  // SOS Panic Button
  const sosBtn = document.getElementById('btn-panic-sos');
  if (sosBtn) sosBtn.addEventListener('click', triggerSosPanic);

  // WhatsApp Simulation Dispatch Button
  const simDispatchBtn = document.getElementById('btn-sim-dispatch');
  if (simDispatchBtn) {
    simDispatchBtn.addEventListener('click', () => {
      const curVeh = getSelectedVehicle();
      if (curVeh) openDispatchModal(curVeh, 'PRUEBA DE DESPACHO PREVENTIVO');
    });
  }

  // Theme Toggle Button (Light / Dark)
  const themeBtn = document.getElementById('btn-toggle-theme');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

  // Map Layer Toggle Button (Satellite HD / Vector)
  const mapLayerBtn = document.getElementById('btn-toggle-map-layer');
  if (mapLayerBtn) mapLayerBtn.addEventListener('click', toggleMapLayer);

  // 3D Globe Country Selector Dropdown
  const globeCountrySelect = document.getElementById('globe-country-select');
  if (globeCountrySelect) {
    globeCountrySelect.addEventListener('change', (e) => {
      const code = e.target.value;
      state.selectedCountryCode = code;
      const surfaceSelect = document.getElementById('surface-country-select');
      if (surfaceSelect) surfaceSelect.value = code;

      const c = GLOBAL_COUNTRIES[code];
      if (c && Globe3D.camera) {
        const targetPos = latLngToVector3(c.lat, c.lng, 12.0);
        Globe3D.camera.position.set(targetPos.x, targetPos.y, targetPos.z);
        Globe3D.camera.lookAt(0, 0, 0);
        if (Globe3D.controls) {
          Globe3D.controls.target.set(0, 0, 0);
          Globe3D.controls.update();
        }
      }
    });
  }

  // Descend to Surface button from 3D Globe HUD
  const descendBtn = document.getElementById('btn-descend-to-surface');
  if (descendBtn) {
    descendBtn.addEventListener('click', () => {
      const code = document.getElementById('globe-country-select')?.value || state.selectedCountryCode || 'ARG';
      Globe3D.descendToCountry(code);
    });
  }

  // 3D Globe Texture Toggle Button (3D Oscuro Gris Táctico / 3D Satelital HD)
  const globeStyleBtn = document.getElementById('btn-toggle-globe-style');
  if (globeStyleBtn) {
    globeStyleBtn.addEventListener('click', () => {
      Globe3D.toggleGlobeTexture();
    });
  }

  // 2D Surface Country Selector Dropdown (Immediately deploys fleet to selected country)
  const surfaceCountrySelect = document.getElementById('surface-country-select');
  if (surfaceCountrySelect) {
    surfaceCountrySelect.addEventListener('change', (e) => {
      const code = e.target.value;
      deployFleetToCountry(code);
    });
  }

  // Deploy Fleet to Country Button
  const deployCountryBtn = document.getElementById('btn-deploy-country');
  if (deployCountryBtn) {
    deployCountryBtn.addEventListener('click', () => {
      const code = document.getElementById('surface-country-select')?.value || state.selectedCountryCode || 'ARG';
      deployFleetToCountry(code);
    });
  }

  // Map Tile Style Selector (3D Oscuro Gris / 3D Satelital HD / OSM / Claro)
  const mapTileSelect = document.getElementById('map-tile-style-select');
  if (mapTileSelect) {
    mapTileSelect.addEventListener('change', (e) => {
      updateMapTiles(e.target.value);
    });
  }

  // Dedicated 3D Map Perspective Tilt Button (rotateX 46° pitch & depth horizon)
  const tilt3DBtn = document.getElementById('btn-toggle-3d-tilt');
  if (tilt3DBtn) {
    tilt3DBtn.addEventListener('click', toggle3DTilt);
  }

  // 3D Volumetric Buildings Toggle Button (Estilo Google Maps 3D)
  const buildings3DBtn = document.getElementById('btn-toggle-3d-buildings');
  if (buildings3DBtn) {
    buildings3DBtn.classList.toggle('active', state.show3DBuildings);
    buildings3DBtn.addEventListener('click', toggle3DBuildings);
  }

  // Dedicated Map Dark / Light Mode Toggle Button
  const mapDarkToggleBtn = document.getElementById('btn-toggle-map-dark');
  if (mapDarkToggleBtn) {
    mapDarkToggleBtn.addEventListener('click', toggleMapTheme);
  }

  // Geo Scope Navigation Buttons
  const scopeGlobe = document.getElementById('scope-btn-globe');
  if (scopeGlobe) scopeGlobe.addEventListener('click', () => setGeoScope('globe'));

  const scopeWorldLegacy = document.getElementById('scope-btn-world');
  if (scopeWorldLegacy) scopeWorldLegacy.addEventListener('click', () => setGeoScope('globe'));

  const scopeRegion = document.getElementById('scope-btn-region');
  if (scopeRegion) scopeRegion.addEventListener('click', () => setGeoScope('region'));

  const scopeCity = document.getElementById('scope-btn-city');
  if (scopeCity) scopeCity.addEventListener('click', () => setGeoScope('city'));

  const scopeVeh = document.getElementById('scope-btn-veh');
  if (scopeVeh) scopeVeh.addEventListener('click', () => setGeoScope('veh'));

  // Google Maps 3D Inmersive Navigation Scope Button
  const nav3DBtn = document.getElementById('scope-btn-nav3d');
  if (nav3DBtn) {
    nav3DBtn.addEventListener('click', toggleInmersiveNav);
  }

  const scopeMyGps = document.getElementById('scope-btn-my-gps');
  if (scopeMyGps) scopeMyGps.addEventListener('click', () => setGeoScope('my-gps'));

  // Turn-by-Turn GPS Navigation Voice Toggle Button
  const navVoiceBtn = document.getElementById('btn-toggle-nav-voice');
  if (navVoiceBtn) {
    navVoiceBtn.addEventListener('click', () => {
      state.navVoiceEnabled = !state.navVoiceEnabled;
      const icon = document.getElementById('nav-voice-icon');
      if (icon) {
        icon.className = state.navVoiceEnabled ? 'fa-solid fa-volume-high text-cyan' : 'fa-solid fa-volume-xmark text-muted';
      }
      showNotification(state.navVoiceEnabled ? '🔊 Guía por voz activada' : '🔇 Guía por voz silenciada', 'info');
    });
  }

  // Destination 3D Street Preview Modal Controls
  const openDestBtn = document.getElementById('btn-open-dest-preview');
  if (openDestBtn) openDestBtn.addEventListener('click', openDestinationPreview);

  const closeDestBtn = document.getElementById('btn-close-dest-preview');
  if (closeDestBtn) closeDestBtn.addEventListener('click', closeDestinationPreview);

  const ackDestBtn = document.getElementById('btn-dest-ack');
  if (ackDestBtn) ackDestBtn.addEventListener('click', closeDestinationPreview);

  // Close Dispatch Modal
  const closeDispatchBtn = document.getElementById('dispatch-close-btn');
  if (closeDispatchBtn) {
    closeDispatchBtn.addEventListener('click', () => {
      const modal = document.getElementById('dispatch-modal');
      if (modal) modal.classList.remove('active');
    });
  }

  // CRT Holographic Scanlines Toggle
  const crtBtn = document.getElementById('btn-toggle-crt');
  if (crtBtn) {
    crtBtn.addEventListener('click', () => {
      state.crtScanlines = !state.crtScanlines;
      const overlay = document.getElementById('crt-overlay');
      if (overlay) {
        if (state.crtScanlines) overlay.classList.add('active');
        else overlay.classList.remove('active');
      }
      crtBtn.classList.toggle('active', state.crtScanlines);
      playTacticalClick();
    });
  }

  // ESP32 Simulation and Modal Buttons
  const simEsp32MotionBtn = document.getElementById('btn-sim-esp32-motion');
  if (simEsp32MotionBtn) simEsp32MotionBtn.addEventListener('click', triggerEsp32HumanDetection);

  const simEsp32IntrusionBtn = document.getElementById('btn-sim-esp32-intrusion');
  if (simEsp32IntrusionBtn) simEsp32IntrusionBtn.addEventListener('click', triggerEsp32ParkedAlarm);

  const openEsp32CodeBtn = document.getElementById('btn-open-esp32-code');
  if (openEsp32CodeBtn) openEsp32CodeBtn.addEventListener('click', openEsp32CodeModal);

  const clearEsp32LogBtn = document.getElementById('btn-clear-esp32-log');
  if (clearEsp32LogBtn) {
    clearEsp32LogBtn.addEventListener('click', () => {
      const term = document.getElementById('esp32-log-terminal');
      if (term) term.innerHTML = '<div class="term-line text-cyan">[LOG CLEARED] Gateway en escucha...</div>';
    });
  }

  const closeEsp32CodeX = document.getElementById('esp32-code-modal-close');
  if (closeEsp32CodeX) closeEsp32CodeX.addEventListener('click', closeEsp32CodeModal);

  const closeEsp32CodeBtn = document.getElementById('btn-close-esp32-code-footer');
  if (closeEsp32CodeBtn) closeEsp32CodeBtn.addEventListener('click', closeEsp32CodeModal);

  const copyEsp32Btn = document.getElementById('btn-copy-esp32-code');
  if (copyEsp32Btn) copyEsp32Btn.addEventListener('click', copyEsp32Code);
}

// --- Interactive Route Drawing System ---
function startRouteDrawing() {
  state.isDrawingRoute = true;
  state.tempDrawnPoints = [];
  clearTempDrawnLayers();

  const hud = document.getElementById('drawing-hud-bar');
  if (hud) hud.style.display = 'flex';

  const countEl = document.getElementById('drawing-point-count');
  if (countEl) countEl.innerText = '0 puntos fijados';

  if (map) {
    map.getContainer().style.cursor = 'crosshair';
  }
}

function cancelRouteDrawing() {
  state.isDrawingRoute = false;
  state.tempDrawnPoints = [];
  clearTempDrawnLayers();

  const hud = document.getElementById('drawing-hud-bar');
  if (hud) hud.style.display = 'none';

  if (map) {
    map.getContainer().style.cursor = '';
  }
}

function clearTempDrawnLayers() {
  if (state.tempDrawnLayers) {
    state.tempDrawnLayers.forEach(l => map.removeLayer(l));
  }
  state.tempDrawnLayers = [];
}

function onMapClick(e) {
  if (!state.isDrawingRoute) return;

  const pt = [e.latlng.lat, e.latlng.lng];
  state.tempDrawnPoints.push(pt);

  const idx = state.tempDrawnPoints.length;
  const countEl = document.getElementById('drawing-point-count');
  if (countEl) countEl.innerText = `${idx} punto(s) fijado(s)`;

  // Add marker with sequence number
  const markerIcon = L.divIcon({
    className: 'checkpoint-marker-icon',
    html: `
      <div style="background:#06b6d4; border:2px solid #fff; color:#000; border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; box-shadow:0 0 10px rgba(6,182,212,0.8);">
        ${idx}
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
  const m = L.marker(pt, { icon: markerIcon }).addTo(map);
  state.tempDrawnLayers.push(m);

  // Redraw preview polyline + corridor
  if (state.tempDrawnPoints.length > 1) {
    state.tempDrawnLayers = state.tempDrawnLayers.filter(layer => {
      if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
        map.removeLayer(layer);
        return false;
      }
      return true;
    });

    const corridor = L.polyline(state.tempDrawnPoints, {
      color: '#06b6d4',
      weight: 32,
      opacity: 0.25,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);
    state.tempDrawnLayers.push(corridor);

    const line = L.polyline(state.tempDrawnPoints, {
      color: '#22d3ee',
      weight: 4,
      dashArray: '6, 6'
    }).addTo(map);
    state.tempDrawnLayers.push(line);
  }
}

function saveDrawnRoute() {
  if (state.tempDrawnPoints.length < 2) {
    alert('Debes marcar al menos 2 puntos en el mapa para crear un corredor de ruta válido.');
    return;
  }

  const routeId = `ruta-personalizada-${state.customRouteCounter}`;
  const routeName = `Ruta Personalizada #${state.customRouteCounter} (${state.tempDrawnPoints.length} pts)`;
  state.customRouteCounter++;

  const checkpoints = state.tempDrawnPoints.map((pt, i) => ({
    name: `Punto de Control ${i + 1}`,
    lat: pt[0],
    lng: pt[1],
    passed: i === 0
  }));

  state.routes[routeId] = {
    id: routeId,
    name: routeName,
    toleranceMeters: state.toleranceMeters || 60,
    path: [...state.tempDrawnPoints],
    checkpoints: checkpoints
  };

  // Add to select
  const select = document.getElementById('active-route-select');
  if (select) {
    const opt = document.createElement('option');
    opt.value = routeId;
    opt.innerText = routeName;
    select.appendChild(opt);
    select.value = routeId;
  }

  // Assign to current vehicle and reposition vehicle
  const curVeh = getSelectedVehicle();
  if (curVeh) {
    curVeh.routeId = routeId;
    curVeh.simIndex = 0;
    curVeh.isDeviatedManually = false;
    curVeh.lat = state.tempDrawnPoints[0][0];
    curVeh.lng = state.tempDrawnPoints[0][1];
    curVeh.status = 'normal';
    curVeh.deviationDistance = 0;
  }

  cancelRouteDrawing();
  drawActiveRoute();
  renderVehicleMarkers();
  if (map && curVeh) map.panTo([curVeh.lat, curVeh.lng]);

  // Add confirmation log
  addAlertItem({
    title: 'NUEVA RUTA Y CORREDOR ACTIVADOS',
    desc: `Trazado guardado con ${checkpoints.length} puntos. Tolerancia: ${state.toleranceMeters}m. Móvil ${curVeh ? curVeh.plate : ''} posicionado en inicio.`,
    severity: 'info'
  });
}

// --- SOS Panic & Dispatch System ---
function triggerSosPanic() {
  const curVeh = getSelectedVehicle();
  if (!curVeh) return;

  const flashEl = document.getElementById('tactical-sos-flash');
  if (flashEl) {
    flashEl.classList.add('active');
    setTimeout(() => {
      flashEl.classList.remove('active');
    }, 6000);
  }

  playAlertSiren();
  setTimeout(playAlertSiren, 450);
  setTimeout(playAlertSiren, 900);

  curVeh.status = 'deviated';
  curVeh.isDeviatedManually = true;

  addAlertItem({
    title: '🚨 CÓDIGO ROJO - PÁNICO SOS MANUAL',
    desc: `Móvil ${curVeh.plate} (${curVeh.name}) activó auxilio en coords [${curVeh.lat.toFixed(4)}, ${curVeh.lng.toFixed(4)}]. Despacho iniciado.`,
    severity: 'critical'
  });

  openDispatchModal(curVeh, 'SOS PANIC - AUXILIO INMEDIATO');
}

function openDispatchModal(veh, reason = 'DESVÍO DE CORREDOR AUTORIZADO') {
  const modal = document.getElementById('dispatch-modal');
  const body = document.getElementById('dispatch-message-content');
  if (!modal || !body) return;

  const now = new Date().toLocaleString('es-AR');
  const coords = `${veh.lat.toFixed(5)}, ${veh.lng.toFixed(5)}`;
  const mapsUrl = `https://www.google.com/maps?q=${coords}`;

  const message = 
`🚨 *RHINO SENTINEL - TRANSMISIÓN DE EMERGENCIA A CENTRAL* 🚨
=========================================
⚠️ *MOTIVO:* ${reason.toUpperCase()}
🚗 *UNIDAD EN RIESGO:* ${veh.name} [Patente: ${veh.plate}]
⏱️ *FECHA / HORA:* ${now}
📍 *COORDENADAS:* ${coords}
🌐 *GOOGLE MAPS:* ${mapsUrl}
⚡ *VELOCIDAD:* ${veh.speed} km/h | RUMBO: ${veh.heading}°
📡 *HARDWARE RHINO:* ${veh.gpsId || 'N/A'} | CÁMARA ESPÍA: ${veh.camId || 'N/A'}
=========================================
🛡️ *PROTOCOLO AUTOMÁTICO:*
- Captura de fotograma de cámara archivada en servidor.
- Notificación transmitida a móviles de apoyo y centro de control.`;

  body.innerText = message;
  modal.classList.add('active');

  const copyBtn = document.getElementById('btn-copy-dispatch');
  if (copyBtn) {
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(message);
      copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> ¡Copiado!';
      setTimeout(() => {
        copyBtn.innerHTML = '<i class="fa-solid fa-copy"></i> Copiar Mensaje';
      }, 2000);
    };
  }

  const waBtn = document.getElementById('btn-open-wa-direct');
  if (waBtn) {
    const encoded = encodeURIComponent(message);
    waBtn.onclick = () => {
      window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
    };
  }
}

// --- Main Init ---
window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initDashboardViewMode();
  initMap();
  Globe3D.init();
  initCameraCanvas();
  setupEventListeners();
  renderVehicleList();
  renderDeviceChips();
  renderAlertsList();

  // Run simulation tick at 25 FPS (40ms)
  setInterval(updateSimulationStep, 40);
});
