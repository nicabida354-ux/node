/* =========================================================================
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

  Serial.println("\n[RHINO ESP32] Iniciando sistema de vigilancia...");

  // Conexión WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print(".");
  }

  Serial.println("\n[RHINO ESP32] WiFi Conectado! IP: " + WiFi.localIP().toString());
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
  jsonPayload += "\"node\":\"ESP32-CAM-01\",";
  jsonPayload += "\"motion\":" + String(motion ? "true" : "false") + ",";
  jsonPayload += "\"persons\":" + String(persons) + ",";
  jsonPayload += "\"radar_dist_m\":" + String(dist) + ",";
  jsonPayload += "\"body_temp_c\":" + String(temp) + ",";
  jsonPayload += "\"rssi\":" + String(WiFi.RSSI()) + ",";
  jsonPayload += "\"battery_v\":4.18";
  jsonPayload += "}";

  int httpCode = http.POST(jsonPayload);
  if (httpCode > 0) {
    Serial.println("[TELEMETRIA ENVIADA] Codigo: " + String(httpCode));
  }
  http.end();
}
