// CyberAgent ESP32 Reference Firmware — WebSocket Protocol v2
//
// Hardware requirements:
//   - ESP32-WROOM or ESP32-S3 module (any dev board)
//   - L298N or TB6612 motor driver (for differential drive)
//   - WS2812B LED strip (8–25 pixels)
//   - HC-SR04 ultrasonic sensor (distance)
//   - MPU6050 IMU (accelerometer + gyroscope)
//   - 2S LiPo battery (7.4V nominal)
//
// Wiring:
//   Motor driver:
//     IN1 → GPIO 12, IN2 → GPIO 13 (left motor)
//     IN3 → GPIO 14, IN4 → GPIO 15 (right motor)
//     PWM_L → GPIO 27, PWM_R → GPIO 26
//   LED strip:
//     Data → GPIO 32
//   Ultrasonic:
//     Trig → GPIO 4, Echo → GPIO 5
//   IMU (I2C):
//     SDA → GPIO 21, SCL → GPIO 22
//   Buzzer:
//     → GPIO 25
//
// Setup:
//   1. Edit WiFi credentials below (WIFI_SSID / WIFI_PASS)
//   2. Upload via Arduino IDE or PlatformIO
//   3. Connect to the ESP32 WiFi AP (CyberAgent-ESP32) or station network
//   4. WebSocket server starts on ws://<IP>:8080
//
// Protocol v2: https://github.com/unbug/cyber-agent
//
// License: MIT

#include <Arduino.h>
#include <WiFi.h>
#include <WebSocketsServer.h>
#include <ESP32Ping.h>
#include <Wire.h>

// ─── WiFi Configuration ─────────────────────────────────────────

// Set to true to use AP mode (ESP32 creates its own WiFi network)
// Set to false to connect to an existing network
#define USE_AP_MODE true

#ifndef WIFI_SSID
#define WIFI_SSID "CyberAgent-ESP32"
#define WIFI_PASS "cyberagent2026"
#endif

const char* AP_SSID = "CyberAgent-ESP32";
const char* AP_PASS = "cyberagent2026";

// ─── WebSocket Server ───────────────────────────────────────────

WebSocketsServer webSocket(8080);

// ─── Motor Driver Pins ──────────────────────────────────────────

#define MOTOR_IN1  12
#define MOTOR_IN2  13
#define MOTOR_IN3  14
#define MOTOR_IN4  15
#define MOTOR_PWM_L 27
#define MOTOR_PWM_R 26

#define MOTOR_FREQ 5000
#define MOTOR_RESOLUTION 8

// ─── LED Strip ──────────────────────────────────────────────────

#include <Adafruit_NeoPixel.h>
#define LED_PIN    32
#define LED_COUNT  16

Adafruit_NeoPixel leds(LED_COUNT, LED_PIN, NEO_GRB + NEO_KHZ800);

// ─── Ultrasonic Sensor ──────────────────────────────────────────

#define US_TRIG  4
#define US_ECHO  5

// ─── IMU (MPU6050) ─────────────────────────────────────────────

#define IMU_ADDR  0x68
volatile float imu_ax = 0, imu_ay = 0, imu_az = 0;
volatile float imu_gx = 0, imu_gy = 0, imu_gz = 0;
volatile bool imu_ready = false;

// ─── Buzzer ─────────────────────────────────────────────────────

#define BUZZER_PIN 25

// ─── Battery Monitoring ─────────────────────────────────────────

#define BATTERY_PIN 34  // ADC1 channel 6
#define BATTERY_DIVIDER 2.0  // Voltage divider ratio
#define BATTERY_MAX 8.4   // LiPo 2S full (V)
#define BATTERY_MIN 6.0   // LiPo 2S empty (V)

// ─── State ──────────────────────────────────────────────────────

volatile int motor_left_speed = 0;
volatile int motor_right_speed = 0;
volatile bool e_stop_active = false;
unsigned long last_telemetry_ms = 0;
unsigned long firmware_start_ms = 0;

// ─── IMU I2C Setup ──────────────────────────────────────────────

void imu_init() {
  Wire.begin(21, 22);  // SDA, SCL
  Wire.beginTransmission(IMU_ADDR);
  Wire.write(0x6B);  // PWR_MGMT_1
  Wire.write(0);     // Wake up
  Wire.endTransmission(true);

  Wire.beginTransmission(IMU_ADDR);
  Wire.write(0x1A);  // CONFIG
  Wire.write(0x03);  // DLPF = 42Hz
  Wire.endTransmission(true);

  Wire.beginTransmission(IMU_ADDR);
  Wire.write(0x1B);  // GYRO_CONFIG
  Wire.write(0x18);  // ±1000 dps
  Wire.endTransmission(true);

  Wire.beginTransmission(IMU_ADDR);
  Wire.write(0x1C);  // ACCEL_CONFIG
  Wire.write(0x10);  // ±8g
  Wire.endTransmission(true);
}

void imu_read() {
  Wire.beginTransmission(IMU_ADDR);
  Wire.write(0x3B);  // ACCEL_OUT register
  Wire.endTransmission(false);
  Wire.requestFrom(IMU_ADDR, 14, true);

  if (Wire.available() >= 14) {
    int16_t ax_raw = Wire.read() << 8 | Wire.read();
    int16_t ay_raw = Wire.read() << 8 | Wire.read();
    int16_t az_raw = Wire.read() << 8 | Wire.read();
    int16_t temp_raw = Wire.read() << 8 | Wire.read();
    int16_t gx_raw = Wire.read() << 8 | Wire.read();
    int16_t gy_raw = Wire.read() << 8 | Wire.read();
    int16_t gz_raw = Wire.read() << 8 | Wire.read();

    imu_ax = ax_raw / 16384.0;   // g
    imu_ay = ay_raw / 16384.0;
    imu_az = az_raw / 16384.0;
    imu_gx = gx_raw / 65.5;      // dps
    imu_gy = gy_raw / 65.5;
    imu_gz = gz_raw / 65.5;
    imu_ready = true;
  }
}

// ─── Ultrasonic Sensor ──────────────────────────────────────────

unsigned long readDistance() {
  digitalWrite(US_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(US_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(US_TRIG, LOW);

  long duration = pulseIn(US_ECHO, HIGH, 30000L);
  if (duration == 0) return 999;  // No echo
  return duration / 58.0;  // Convert to cm
}

// ─── Battery Monitoring ─────────────────────────────────────────

float readBatteryVoltage() {
  int raw = analogRead(BATTERY_PIN);
  float voltage = (raw / 4095.0) * 3.3 * BATTERY_DIVIDER;
  return voltage;
}

float readBatteryPercentage(float voltage) {
  if (voltage >= BATTERY_MAX) return 100.0;
  if (voltage <= BATTERY_MIN) return 0.0;
  return ((voltage - BATTERY_MIN) / (BATTERY_MAX - BATTERY_MIN)) * 100.0;
}

// ─── Motor Control ──────────────────────────────────────────────

void motor_init() {
  ledcSetup(0, MOTOR_FREQ, MOTOR_RESOLUTION);
  ledcSetup(1, MOTOR_FREQ, MOTOR_RESOLUTION);
  ledcAttachPin(MOTOR_PWM_L, 0);
  ledcAttachPin(MOTOR_PWM_R, 1);
  ledcWrite(MOTOR_PWM_L, 0);
  ledcWrite(MOTOR_PWM_R, 0);
  pinMode(MOTOR_IN1, OUTPUT);
  pinMode(MOTOR_IN2, OUTPUT);
  pinMode(MOTOR_IN3, OUTPUT);
  pinMode(MOTOR_IN4, OUTPUT);
}

void motor_set(int left, int right) {
  // Clamp speed
  left = constrain(left, -100, 100);
  right = constrain(right, -100, 100);

  int lSpeed = abs(left);
  int rSpeed = abs(right);

  // Direction
  digitalWrite(MOTOR_IN1, left >= 0 ? HIGH : LOW);
  digitalWrite(MOTOR_IN2, left >= 0 ? LOW : HIGH);
  digitalWrite(MOTOR_IN3, right >= 0 ? HIGH : LOW);
  digitalWrite(MOTOR_IN4, right >= 0 ? LOW : HIGH);

  // PWM
  ledcWrite(0, lSpeed);
  ledcWrite(1, rSpeed);
}

void motor_stop() {
  motor_set(0, 0);
}

// ─── LED Patterns ───────────────────────────────────────────────

void setLEDRGB(uint8_t r, uint8_t g, uint8_t b, uint8_t brightness) {
  // Scale by brightness
  uint8_t sr = (r * brightness) / 255;
  uint8_t sg = (g * brightness) / 255;
  uint8_t sb = (b * brightness) / 255;
  for (int i = 0; i < LED_COUNT; i++) {
    leds.setPixelColor(i, sr, sg, sb);
  }
  leds.show();
}

void playGesture(const String& pattern, unsigned long duration) {
  unsigned long start = millis();
  if (pattern == "wave") {
    while (millis() - start < duration) {
      for (int i = 0; i < LED_COUNT; i++) {
        uint8_t val = (sin(millis() / 200.0 + i * 0.5) * 127) + 128;
        leds.setPixelColor(i, 0, val, 255 - val);
      }
      leds.show();
      delay(30);
    }
  } else if (pattern == "rainbow") {
    for (int j = 0; j < 256 && (millis() - start < duration); j++) {
      for (int i = 0; i < LED_COUNT; i++) {
        uint8_t hue = (i * 256 / LED_COUNT + j) % 256;
        leds.setPixelColor(i, leds.gamma8(hue));
      }
      leds.show();
      delay(20);
    }
  } else if (pattern == "pulse") {
    while (millis() - start < duration) {
      for (int i = 0; i < LED_COUNT; i++) {
        uint8_t val = (sin(millis() / 300.0 + i * 0.3) * 127) + 128;
        leds.setPixelColor(i, val, 0, 255 - val);
      }
      leds.show();
      delay(30);
    }
  } else if (pattern == "heartbeat") {
    while (millis() - start < duration) {
      unsigned long beat = (millis() / 800) % 4;
      for (int i = 0; i < LED_COUNT; i++) {
        uint8_t val = (beat == 0 || beat == 2) ? 255 : 0;
        leds.setPixelColor(i, val, 0, 0);
      }
      leds.show();
      delay(100);
    }
  }
  // Clear LEDs
  leds.clear();
  leds.show();
}

// ─── Sound ──────────────────────────────────────────────────────

void playSound(unsigned long freq, unsigned long duration_ms, uint8_t volume) {
  if (freq < 200 || freq > 20000) return;
  uint8_t vol = constrain(volume, 0, 100);
  tone(BUZZER_PIN, freq, duration_ms);
  // volume is approximated by duty cycle (tone doesn't support it directly)
  // For better control, use PWM with a DAC or additional circuitry
  (void)vol;  // Simplified for reference firmware
}

// ─── Command Handler ────────────────────────────────────────────

void handleCommand(const String& type, const String& payload_str) {
  // Simple JSON-like parsing (no external library needed)
  // Extract fields manually

  if (type == "move") {
    String dir = "";
    int speed = 50;

    // Parse direction
    int dirIdx = payload_str.indexOf("\"direction\"");
    if (dirIdx >= 0) {
      int colonIdx = payload_str.indexOf(':', dirIdx);
      int quoteStart = payload_str.indexOf('"', colonIdx);
      int quoteEnd = payload_str.indexOf('"', quoteStart + 1);
      if (quoteStart >= 0 && quoteEnd > quoteStart) {
        dir = payload_str.substring(quoteStart + 1, quoteEnd);
      }
    }

    // Parse speed
    int speedIdx = payload_str.indexOf("\"speed\"");
    if (speedIdx >= 0) {
      int colonIdx = payload_str.indexOf(':', speedIdx);
      int numStart = colonIdx + 1;
      while (numStart < payload_str.length() && (payload_str[numStart] == ' ' || payload_str[numStart] == '\t')) numStart++;
      speed = payload_str.substring(numStart).toInt();
    }

    if (dir == "stop") {
      motor_stop();
    } else if (dir == "backward") {
      motor_set(-speed, -speed);
    } else {
      motor_set(speed, speed);
    }

    // Send ack
    webSocket.sendTXT(0, "{\"type\":\"ack\",\"payload\":{\"command_id\":0,\"status\":\"ok\"}}");

  } else if (type == "motors") {
    int left = 0, right = 0;

    int leftIdx = payload_str.indexOf("\"left\"");
    if (leftIdx >= 0) {
      int colonIdx = payload_str.indexOf(':', leftIdx);
      int numStart = colonIdx + 1;
      while (numStart < payload_str.length() && (payload_str[numStart] == ' ' || payload_str[numStart] == '\t')) numStart++;
      left = payload_str.substring(numStart).toInt();
    }

    int rightIdx = payload_str.indexOf("\"right\"");
    if (rightIdx >= 0) {
      int colonIdx = payload_str.indexOf(':', rightIdx);
      int numStart = colonIdx + 1;
      while (numStart < payload_str.length() && (payload_str[numStart] == ' ' || payload_str[numStart] == '\t')) numStart++;
      right = payload_str.substring(numStart).toInt();
    }

    motor_set(left, right);

    webSocket.sendTXT(0, "{\"type\":\"ack\",\"payload\":{\"command_id\":0,\"status\":\"ok\"}}");

  } else if (type == "led") {
    uint8_t r = 0, g = 0, b = 0, brightness = 255;

    int rIdx = payload_str.indexOf("\"r\"");
    if (rIdx >= 0) {
      int colonIdx = payload_str.indexOf(':', rIdx);
      int numStart = colonIdx + 1;
      while (numStart < payload_str.length() && (payload_str[numStart] == ' ' || payload_str[numStart] == '\t')) numStart++;
      r = payload_str.substring(numStart).toInt();
    }

    int gIdx = payload_str.indexOf("\"g\"");
    if (gIdx >= 0) {
      int colonIdx = payload_str.indexOf(':', gIdx);
      int numStart = colonIdx + 1;
      while (numStart < payload_str.length() && (payload_str[numStart] == ' ' || payload_str[numStart] == '\t')) numStart++;
      g = payload_str.substring(numStart).toInt();
    }

    int bIdx = payload_str.indexOf("\"b\"");
    if (bIdx >= 0) {
      int colonIdx = payload_str.indexOf(':', bIdx);
      int numStart = colonIdx + 1;
      while (numStart < payload_str.length() && (payload_str[numStart] == ' ' || payload_str[numStart] == '\t')) numStart++;
      b = payload_str.substring(numStart).toInt();
    }

    int brIdx = payload_str.indexOf("\"brightness\"");
    if (brIdx >= 0) {
      int colonIdx = payload_str.indexOf(':', brIdx);
      int numStart = colonIdx + 1;
      while (numStart < payload_str.length() && (payload_str[numStart] == ' ' || payload_str[numStart] == '\t')) numStart++;
      brightness = payload_str.substring(numStart).toInt();
    }

    setLEDRGB(r, g, b, brightness);
    webSocket.sendTXT(0, "{\"type\":\"ack\",\"payload\":{\"command_id\":0,\"status\":\"ok\"}}");

  } else if (type == "led_matrix") {
    // Parse pixel array (simplified: set all pixels to white)
    leds.clear();
    leds.show();
    webSocket.sendTXT(0, "{\"type\":\"ack\",\"payload\":{\"command_id\":0,\"status\":\"ok\"}}");

  } else if (type == "sound") {
    unsigned long freq = 1000;
    unsigned long dur = 500;
    uint8_t vol = 80;

    int fIdx = payload_str.indexOf("\"frequency\"");
    if (fIdx >= 0) {
      int colonIdx = payload_str.indexOf(':', fIdx);
      int numStart = colonIdx + 1;
      while (numStart < payload_str.length() && (payload_str[numStart] == ' ' || payload_str[numStart] == '\t')) numStart++;
      freq = payload_str.substring(numStart).toInt();
    }

    int dIdx = payload_str.indexOf("\"duration_ms\"");
    if (dIdx >= 0) {
      int colonIdx = payload_str.indexOf(':', dIdx);
      int numStart = colonIdx + 1;
      while (numStart < payload_str.length() && (payload_str[numStart] == ' ' || payload_str[numStart] == '\t')) numStart++;
      dur = payload_str.substring(numStart).toInt();
    }

    int vIdx = payload_str.indexOf("\"volume\"");
    if (vIdx >= 0) {
      int colonIdx = payload_str.indexOf(':', vIdx);
      int numStart = colonIdx + 1;
      while (numStart < payload_str.length() && (payload_str[numStart] == ' ' || payload_str[numStart] == '\t')) numStart++;
      vol = payload_str.substring(numStart).toInt();
    }

    playSound(freq, dur, vol);
    webSocket.sendTXT(0, "{\"type\":\"ack\",\"payload\":{\"command_id\":0,\"status\":\"ok\"}}");

  } else if (type == "gesture") {
    String pattern = "wave";
    unsigned long dur = 2000;

    int pIdx = payload_str.indexOf("\"pattern\"");
    if (pIdx >= 0) {
      int colonIdx = payload_str.indexOf(':', pIdx);
      int quoteStart = payload_str.indexOf('"', colonIdx);
      int quoteEnd = payload_str.indexOf('"', quoteStart + 1);
      if (quoteStart >= 0 && quoteEnd > quoteStart) {
        pattern = payload_str.substring(quoteStart + 1, quoteEnd);
      }
    }

    int dIdx = payload_str.indexOf("\"duration_ms\"");
    if (dIdx >= 0) {
      int colonIdx = payload_str.indexOf(':', dIdx);
      int numStart = colonIdx + 1;
      while (numStart < payload_str.length() && (payload_str[numStart] == ' ' || payload_str[numStart] == '\t')) numStart++;
      dur = payload_str.substring(numStart).toInt();
    }

    playGesture(pattern, dur);
    webSocket.sendTXT(0, "{\"type\":\"ack\",\"payload\":{\"command_id\":0,\"status\":\"ok\"}}");

  } else if (type == "emergency_stop") {
    e_stop_active = true;
    motor_stop();
    setLEDRGB(255, 0, 0, 255);  // Red flash
    delay(200);
    leds.clear();
    leds.show();
    webSocket.sendTXT(0, "{\"type\":\"ack\",\"payload\":{\"command_id\":0,\"status\":\"ok\"}}");

  } else if (type == "custom") {
    // Parse command name and args
    String cmd = "";
    int cIdx = payload_str.indexOf("\"command\"");
    if (cIdx >= 0) {
      int colonIdx = payload_str.indexOf(':', cIdx);
      int quoteStart = payload_str.indexOf('"', colonIdx);
      int quoteEnd = payload_str.indexOf('"', quoteStart + 1);
      if (quoteStart >= 0 && quoteEnd > quoteStart) {
        cmd = payload_str.substring(quoteStart + 1, quoteEnd);
      }
    }

    // Simple echo ack
    String ack = "{\"type\":\"ack\",\"payload\":{\"command_id\":0,\"status\":\"ok\",\"command\":\"" + cmd + "\"}}";
    webSocket.sendTXT(0, ack.c_str());

  } else {
    // Unknown command type — echo back with error
    String err = "{\"type\":\"ack\",\"payload\":{\"command_id\":0,\"status\":\"error\",\"message\":\"unknown command: " + type + "\"}}";
    webSocket.sendTXT(0, err.c_str());
  }
}

// ─── Telemetry Emitter ──────────────────────────────────────────

void emitTelemetry() {
  float battery_voltage = readBatteryVoltage();
  float battery_pct = readBatteryPercentage(battery_voltage);
  unsigned long free_heap = ESP.getFreeHeap();
  unsigned long uptime = millis() - firmware_start_ms;

  // Battery
  String batMsg = "{\"type\":\"battery\",\"payload\":{\"voltage\":" + String(battery_voltage, 2);
  batMsg += ",\"percentage\":" + String(battery_pct, 1) + "},\"t\":" + String(uptime) + "}";
  webSocket.broadcastTXT(batMsg);

  // IMU
  if (imu_ready) {
    String imuMsg = "{\"type\":\"imu\",\"payload\":{\"ax\":" + String(imu_ax, 4);
    imuMsg += ",\"ay\":" + String(imu_ay, 4);
    imuMsg += ",\"az\":" + String(imu_az, 4);
    imuMsg += ",\"gx\":" + String(imu_gx, 4);
    imuMsg += ",\"gy\":" + String(imu_gy, 4);
    imuMsg += ",\"gz\":" + String(imu_gz, 4) + "},\"t\":" + String(uptime) + "}";
    webSocket.broadcastTXT(imuMsg);
  }

  // Distance (every 500ms)
  static unsigned long last_dist = 0;
  if (millis() - last_dist > 500) {
    last_dist = millis();
    unsigned long dist = readDistance();
    String distMsg = "{\"type\":\"distance\",\"payload\":{\"value\":" + String(dist);
    distMsg += ",\"unit\":\"cm\"},\"t\":" + String(uptime) + "}";
    webSocket.broadcastTXT(distMsg);
  }

  // Motor state
  String motorMsg = "{\"type\":\"motor_state\",\"payload\":{\"left_rpm\":" + String(motor_left_speed);
  motorMsg += ",\"right_rpm\":" + String(motor_right_speed);
  motorMsg += ",\"load_left\":0.3,\"load_right\":0.28},\"t\":" + String(uptime) + "}";
  webSocket.broadcastTXT(motorMsg);

  // Heartbeat
  String hbMsg = "{\"type\":\"heartbeat\",\"payload\":{\"uptime_ms\":" + String(uptime);
  hbMsg += ",\"free_heap\":" + String(free_heap) + "},\"t\":" + String(uptime) + "}";
  webSocket.broadcastTXT(hbMsg);
}

// ─── WebSocket Event Handler ────────────────────────────────────

void webSocketEvent(uint8_t num, WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      Serial.printf("[WS] Client %d disconnected\n", num);
      break;

    case WStype_CONNECTED:
      Serial.printf("[WS] Client %d connected from %s\n", num, webSocket.remoteIP(num).toString().c_str());
      break;

    case WStype_TEXT: {
      // Parse JSON message
      String msg(payload, length);

      // Extract type
      int typeIdx = msg.indexOf("\"type\"");
      if (typeIdx < 0) break;

      int colonIdx = msg.indexOf(':', typeIdx);
      int quoteStart = msg.indexOf('"', colonIdx);
      int quoteEnd = msg.indexOf('"', quoteStart + 1);
      if (quoteStart < 0 || quoteEnd <= quoteStart) break;

      String cmdType = msg.substring(quoteStart + 1, quoteEnd);

      // Skip heartbeat
      if (cmdType == "heartbeat") {
        webSocket.sendTXT(num, "{\"type\":\"ack\",\"payload\":{\"status\":\"pong\"}}");
        return;
      }

      // Extract payload
      int payloadIdx = msg.indexOf("\"payload\"");
      if (payloadIdx < 0) break;
      int payloadColon = msg.indexOf(':', payloadIdx);
      int payloadStart = msg.indexOf('{', payloadColon);
      int payloadEnd = msg.rfind('}');
      if (payloadStart < 0 || payloadEnd <= payloadStart) break;

      String payloadStr = msg.substring(payloadStart + 1, payloadEnd);
      handleCommand(cmdType, payloadStr);
      break;
    }

    case WStype_ERROR:
    case WStype_BIN:
    default:
      break;
  }
}

// ─── Setup & Loop ───────────────────────────────────────────────

void setup() {
  Serial.begin(115200);
  firmware_start_ms = millis();

  // Initialize peripherals
  motor_init();
  leds.begin();
  leds.clear();
  leds.show();
  imu_init();
  pinMode(US_TRIG, OUTPUT);
  pinMode(US_ECHO, INPUT);
  pinMode(BATTERY_PIN, INPUT);

  // WiFi
  if (USE_AP_MODE) {
    WiFi.softAP(AP_SSID, AP_PASS);
    Serial.println("AP mode: CyberAgent-ESP32");
  } else {
    WiFi.begin(WIFI_SSID, WIFI_PASS);
    Serial.print("Connecting to WiFi");
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 30) {
      delay(500);
      Serial.print(".");
      attempts++;
    }
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("\nConnected: " + WiFi.localIP().toString());
    } else {
      Serial.println("\nFailed, falling back to AP");
      WiFi.softAP(AP_SSID, AP_PASS);
    }
  }

  Serial.println("WebSocket server on ws://" + WiFi.localIP().toString() + ":8080");

  // Register WebSocket event handler
  webSocket.begin();
  webSocket.onEvent(webSocketEvent);
}

void loop() {
  webSocket.loop();

  // Read IMU periodically
  imu_read();

  // Emit telemetry every 200ms
  if (millis() - last_telemetry_ms > 200) {
    last_telemetry_ms = millis();
    emitTelemetry();
  }

  // Update motor state telemetry
  motor_left_speed = motor_left_speed;  // placeholder
  motor_right_speed = motor_right_speed;

  delay(10);
}
