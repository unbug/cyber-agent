// CyberAgent ESP32 Perception Relay Reference Firmware
//
// Hardware requirements:
//   - ESP32-WROOM or ESP32-S3 module (any dev board)
//   - HC-SR04 ultrasonic sensor (distance)
//   - MPU6050 IMU (accelerometer + gyroscope)
//   - Bump switch (GPIO15)
//   - WS2812B LED strip (feedback)
//
// This firmware runs a WebSocket perception server that:
//   1. Reads sensors (distance, IMU, bump) at 10Hz
//   2. Emits sensor events to connected browser clients
//   3. Receives perception events from browser and acts on them
//
// Setup:
//   1. Edit WiFi credentials below (WIFI_SSID / WIFI_PASS)
//   2. Upload via Arduino IDE or PlatformIO
//   3. WebSocket server starts on ws://<IP>:8181/perception
//
// Protocol: https://github.com/unbug/cyber-agent
//
// License: MIT

#include <Arduino.h>
#include <WiFi.h>
#include <WebSocketsServer.h>
#include <Wire.h>

// ─── WiFi Configuration ─────────────────────────────────────────

#define USE_AP_MODE true

#ifndef WIFI_SSID
#define WIFI_SSID "CyberAgent-Perception"
#define WIFI_PASS "perception2026"
#endif

// ─── Sensor Configuration ───────────────────────────────────────

#define ENABLE_SENSORS true
#define ENABLE_IMU true
#define ENABLE_BUMP true
#define ENABLE_ULTRASONIC true

// Pin assignments
#define ULTRASONIC_TRIG 4
#define ULTRASONIC_ECHO 5
#define BUMP_PIN 15
#define LED_PIN 32
#define IMU_SDA 21
#define IMU_SCL 22

// ─── WebSocket Server ───────────────────────────────────────────

WebSocketsServer webSocket(8181);

// ─── IMU (MPU6050) ─────────────────────────────────────────────

#ifdef ENABLE_IMU
#define MPU6050_ADDR 0x68
float imuPitch = 0, imuRoll = 0, imuYaw = 0;

void initIMU() {
  Wire.begin(IMU_SDA, IMU_SCL);
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(0x6B);
  Wire.write(0); // Power on
  Wire.endTransmission(true);
  delay(100);
}

void readIMU() {
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(0x3B);
  Wire.endTransmission(false);
  Wire.requestFrom(MPU6050_ADDR, 14);

  if (Wire.available() >= 14) {
    int16_t accelX = Wire.read() << 8 | Wire.read();
    int16_t accelY = Wire.read() << 8 | Wire.read();
    int16_t accelZ = Wire.read() << 8 | Wire.read();
    int16_t temp = Wire.read() << 8 | Wire.read();
    int16_t gyroX = Wire.read() << 8 | Wire.read();
    int16_t gyroY = Wire.read() << 8 | Wire.read();
    int16_t gyroZ = Wire.read() << 8 | Wire.read();

    imuRoll = atan2(accelY, accelZ) * 180 / PI;
    imuPitch = atan2(-accelX, sqrt(accelY * accelY + accelZ * accelZ)) * 180 / PI;
    imuYaw += gyroZ * 0.01; // Simple integration
  }
}
#endif

// ─── Ultrasonic Sensor ──────────────────────────────────────────

#ifdef ENABLE_ULTRASONIC
unsigned long ultrasonicDistance = 0;

void initUltrasonic() {
  pinMode(ULTRASONIC_TRIG, OUTPUT);
  pinMode(ULTRASONIC_ECHO, INPUT);
}

unsigned long readUltrasonic() {
  digitalWrite(ULTRASONIC_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(ULTRASONIC_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(ULTRASONIC_TRIG, LOW);

  return pulseIn(ULTRASONIC_ECHO, HIGH, 30000) / 58.0; // cm
}
#endif

// ─── Bump Switch ────────────────────────────────────────────────

#ifdef ENABLE_BUMP
bool lastBumpState = false;
bool currentBumpState = false;

void initBump() {
  pinMode(BUMP_PIN, INPUT_PULLUP);
}

void readBump() {
  lastBumpState = currentBumpState;
  currentBumpState = !digitalRead(BUMP_PIN); // Active low
}
#endif

// ─── LED Feedback ───────────────────────────────────────────────

uint32_t ledColor = 0x000000;
bool ledActive = false;

void setLED(uint8_t r, uint8_t g, uint8_t b) {
  ledColor = ((uint32_t)r << 16) | ((uint32_t)g << 8) | b;
  ledActive = true;
}

void updateLED() {
  if (!ledActive) return;
  // Simple PWM-style LED control (use FastLED library for production)
  ledActive = false; // Reset after one update
}

// ─── WebSocket Handlers ─────────────────────────────────────────

void webSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
  switch (type) {
    case WStype_CONNECTED:
      Serial.printf("[PerceptionRelay] Client %d connected\n", num);
      break;

    case WStype_DISCONNECTED:
      Serial.printf("[PerceptionRelay] Client %d disconnected\n", num);
      break;

    case WStype_TEXT: {
      // Parse incoming perception event
      char* json = (char*)payload;
      // Simple JSON parsing for type field
      if (strstr(json, "\"type\":\"perception\"")) {
        if (strstr(json, "\"category\":\"see.face\"")) {
          setLED(255, 0, 0); // Red for face
          Serial.println("[PerceptionRelay] Relayed: see.face");
        } else if (strstr(json, "\"category\":\"hear.sound\"")) {
          setLED(0, 255, 0); // Green for sound
          Serial.println("[PerceptionRelay] Relayed: hear.sound");
        }
      }
      break;
    }

    default:
      break;
  }
}

// ─── Main ───────────────────────────────────────────────────────

unsigned long lastSensorRead = 0;
const unsigned long SENSOR_INTERVAL = 100; // 10Hz

void setup() {
  Serial.begin(115200);
  Serial.println("\n[PerceptionRelay] Starting...");

#ifdef ENABLE_ULTRASONIC
  initUltrasonic();
#endif

#ifdef ENABLE_BUMP
  initBump();
#endif

#ifdef ENABLE_IMU
  initIMU();
#endif

  // WiFi setup
  if (USE_AP_MODE) {
    WiFi.softAP(WIFI_SSID, WIFI_PASS);
    Serial.printf("[PerceptionRelay] AP mode: %s\n", WiFi.softAPIP().toString().c_str());
  } else {
    WiFi.begin(WIFI_SSID, WIFI_PASS);
    Serial.print("[PerceptionRelay] Connecting to WiFi...");
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 50) {
      delay(500);
      Serial.print(".");
      attempts++;
    }
    if (WiFi.status() == WL_CONNECTED) {
      Serial.printf("\n[PerceptionRelay] Connected: %s\n", WiFi.localIP().toString().c_str());
    } else {
      Serial.println("\n[PerceptionRelay] WiFi connect failed, switching to AP mode");
      USE_AP_MODE = true;
      WiFi.softAP(WIFI_SSID, WIFI_PASS);
      Serial.printf("[PerceptionRelay] AP mode: %s\n", WiFi.softAPIP().toString().c_str());
    }
  }

  webSocket.begin();
  webSocket.onEvent(webSocketEvent);
  Serial.println("[PerceptionRelay] Perception server started on ws://<IP>:8181/perception");
}

void loop() {
  webSocket.loop();

  unsigned long now = millis();
  if (now - lastSensorRead < SENSOR_INTERVAL) return;
  lastSensorRead = now;

  // Read sensors
  String sensorEvents = "[";

#ifdef ENABLE_ULTRASONIC
  ultrasonicDistance = readUltrasonic();
  if (ultrasonicDistance > 0 && ultrasonicDistance < 400) {
    if (sensorEvents != "[") sensorEvents += ",";
    sensorEvents += "{\"category\":\"near\",\"payload\":{\"distance\":" + String(ultrasonicDistance) + ",\"unit\":\"cm\"},\"source\":\"ultrasonic\",\"timestamp\":" + String(now) + "}";
  }
#endif

#ifdef ENABLE_BUMP
  readBump();
  if (currentBumpState && !lastBumpState) {
    if (sensorEvents != "[") sensorEvents += ",";
    sensorEvents += "{\"category\":\"bump\",\"payload\":{\"direction\":\"front\",\"force\":0.7},\"source\":\"bump-sensor\",\"timestamp\":" + String(now) + "}";
  }
#endif

#ifdef ENABLE_IMU
  readIMU();
  if (sensorEvents != "[") sensorEvents += ",";
  sensorEvents += "{\"category\":\"tilt\",\"payload\":{\"pitch\":" + String(imuPitch, 2) + ",\"roll\":" + String(imuRoll, 2) + ",\"yaw\":" + String(imuYaw, 2) + "},\"source\":\"imu\",\"timestamp\":" + String(now) + "}";
#endif

  sensorEvents += "]";

  // Broadcast sensor events to all connected clients
  if (sensorEvents != "[]") {
    webSocket.broadcastTXT(sensorEvents);
  }

  updateLED();
}
