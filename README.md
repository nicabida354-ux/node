# 🛰️ RHINO SENTINEL ULTRA+
### Centro Táctico de Telemetría GPS, Cámaras Espía y Red de Presencia Humana ESP32

Plataforma de comando y monitoreo de flotas vehiculares, vigilancia encubierta, geocercas activas y detección de presencia humana mediante microcontroladores IoT ESP32.

---

## ⚡ Características Principales

1. **Órbita 3D Global & Descenso Planar 2D**:
   * Visualización esférica en WebGL con Three.js del planeta Tierra y constelaciones satelitales en órbita (LEO).
   * Descenso cinemático sin rotaciones a nivel de calle con Raycasting esférico (haz clic en cualquier parte del mundo o usa el selector con más de 16 países).
   * 4 capas cartográficas mundiales sin marcas de agua ni APIs pagas:
     * 🗺️ **Callejero Global (Estilo Google Maps)**
     * 🛰️ **Satelital HD Órbita (Estilo Google Earth)**
     * 🌐 **OpenStreetMap Mundial**
     * 🌑 **Táctico Cyber Nocturno**

2. **Red de Sensores IoT ESP32 (Presencia y Movimiento Humano)**:
   * **ESP32-CAM-01**: Sensor PIR (HC-SR501 / RCWL) para monitoreo de cabina y parabrisas.
   * **ESP32-RADAR-02**: Radar microondas mmWave de 24GHz (LD2410) capaz de detectar personas inmóviles o dormidas por micromovimientos respiratorios (hasta 6m).
   * **ESP32-THERM-03**: Sensor térmico infrarrojo (AMG8833) con mapeo de calor corporal (36.5°C a 37.5°C).
   * Terminal en tiempo real procesando flujos JSON vía WiFi/WebSockets.
   * Incluye firmware listo para compilar en `firmware/esp32_motion_detector.ino`.

3. **Cámara Espía Multiespectral con Detección IA / Bounding Boxes**:
   * Cajas delimitadoras tácticas automáticas sobre personas con distancia estimada, porcentaje de confianza y temperatura corporal.
   * 4 Modos de visualización:
     * Color Óptico
     * Visión Nocturna Fósforo Verde
     * FLIR Térmica (Termografía)
     * LiDAR 3D Cuántico

4. **Cabina HUD Militar (Cockpit Gauges)**:
   * Velocímetro vectorial circular en SVG con arco reactivo.
   * Horizonte artificial militar (Attitude Indicator) con inclinación de alabeo y cabeceo según curvas y aceleración.
   * Cinta de rumbo militar (Compass Tape) de 360° con puntos cardinales.
   * Cálculo dinámico de aceleración y fuerza G.

5. **Anti-Desvío y Despacho Automatizado**:
   * Corredores de seguridad con tolerancia calibrable (20m a 180m).
   * Checkpoints de paso obligatorio.
   * Disparo de protocolo de pánico SOS y simulación de despacho vía WhatsApp para fuerzas de custodia.

---

## 🚀 Puesta en Marcha Local

No requiere compilación compleja, solo un servidor HTTP estático:

```bash
# Con Python
python -m http.server 8080

# Con Node (http-server / serve / npx)
npx serve -l 8080
```

Abre en tu navegador:
`http://localhost:8080/index.html`

---

## 📡 Integración con Hardware ESP32

Abre el archivo `firmware/esp32_motion_detector.ino` en **Arduino IDE** o **PlatformIO**, configura tu red WiFi y compila para tu placa ESP32 o ESP32-CAM.
