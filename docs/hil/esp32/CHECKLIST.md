# HIL Checklist — ESP32 Adapter

> **Adapter**: ESP32 (generic, any ESP32-WROOM/S3 dev board)
> **Protocol**: WebSocket Protocol v2
> **Firmware**: `firmware/esp32/CyberAgentESP32.ino`
> **Last updated**: 2026-04-29

## Prerequisites

- [ ] ESP32 dev board (WROOM or S3)
- [ ] Motor driver (L298N or TB6612)
- [ ] WS2812B LED strip (8–25 pixels)
- [ ] HC-SR04 ultrasonic sensor
- [ ] MPU6050 IMU module
- [ ] 2S LiPo battery (7.4V)
- [ ] Buzzer (passive)
- [ ] Jumper wires + breadboard
- [ ] Arduino IDE 2.x or PlatformIO
- [ ] Adafruit_NeoPixel library installed

## Wiring Reference

| Component | Pin | ESP32 GPIO |
|-----------|-----|------------|
| Motor IN1 | — | GPIO 12 |
| Motor IN2 | — | GPIO 13 |
| Motor IN3 | — | GPIO 14 |
| Motor IN4 | — | GPIO 15 |
| Motor PWM L | — | GPIO 27 |
| Motor PWM R | — | GPIO 26 |
| LED Data | — | GPIO 32 |
| Ultrasonic Trig | — | GPIO 4 |
| Ultrasonic Echo | — | GPIO 5 |
| IMU SDA | — | GPIO 21 |
| IMU SCL | — | GPIO 22 |
| Buzzer | — | GPIO 25 |
| Battery ADC | — | GPIO 34 |

## Upload Firmware

1. Connect ESP32 via USB-C
2. Open `firmware/esp32/CyberAgentESP32.ino` in Arduino IDE
3. Select board: `ESP32 Dev Module`
4. Select port (e.g., `/dev/ttyUSB0`)
5. Click **Upload**
6. Verify serial output shows `WebSocket server on ws://<IP>:8080`

## Test Suite

### 1. Connection

- [ ] Connect to ESP32 WiFi (AP mode: `CyberAgent-ESP32`) or station network
- [ ] Open browser → `ws://<ESP32_IP>:8080` (use [wscat](https://github.com/websockets/wscat) or browser DevTools)
- [ ] Send heartbeat: `{"type":"heartbeat","payload":{"t":0},"t":0}`
- [ ] Receive ack: `{"type":"ack","payload":{"status":"pong"}}`

### 2. Motor Commands

- [ ] Send move forward: `{"type":"move","payload":{"direction":"forward","speed":75},"t":0}`
  - Verify: both motors spin forward
- [ ] Send move backward: `{"type":"move","payload":{"direction":"backward","speed":50},"t":0}`
  - Verify: both motors spin backward
- [ ] Send stop: `{"type":"move","payload":{"direction":"stop","speed":0},"t":0}`
  - Verify: motors stop
- [ ] Send motors differential: `{"type":"motors","payload":{"left":60,"right":-40},"t":0}`
  - Verify: left forward, right backward (spin in place)

### 3. LED

- [ ] Send LED: `{"type":"led","payload":{"r":255,"g":128,"b":0,"brightness":200},"t":0}`
  - Verify: all LEDs show orange
- [ ] Send gesture: `{"type":"gesture","payload":{"pattern":"rainbow","duration_ms":3000},"t":0}`
  - Verify: rainbow pattern plays on LED strip

### 4. Sound

- [ ] Send sound: `{"type":"sound","payload":{"frequency":440,"duration_ms":1000,"volume":80},"t":0}`
  - Verify: buzzer plays 440Hz tone for 1 second

### 5. Emergency Stop

- [ ] Send emergency_stop while motors running
  - Verify: motors stop immediately
  - Verify: LEDs flash red briefly

### 6. Telemetry

- [ ] Observe telemetry stream in browser DevTools console
  - [ ] `battery` events every ~200ms with voltage and percentage
  - [ ] `imu` events with ax/ay/az/gx/gy/gz
  - [ ] `distance` events every ~500ms
  - [ ] `motor_state` events with RPM and load
  - [ ] `heartbeat` events with uptime and free_heap

### 7. Self-Test

- [ ] Run adapter.selfTest() in browser console
  - Verify: `ok: true`, `status: "healthy"`
  - Verify: all 5 checks pass

### 8. Disconnect / Reconnect

- [ ] Disconnect WiFi or close browser tab
- [ ] Wait 10+ seconds
- [ ] Reconnect
- [ ] Verify: auto-reconnect works, command queue flushes

### 9. Battery Safety

- [ ] Simulate low battery (disconnect battery sensor or modify voltage reading)
- [ ] Verify: adapter detects low voltage
- [ ] Verify: selfTest reports `status: "degraded"`

## Expected Results

All checks above should pass with a properly wired ESP32 running the reference firmware.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| WiFi won't connect | Check SSID/password, ensure 2.4GHz band |
| Motors don't spin | Verify motor driver power supply (5V/7V) |
| LEDs don't light | Check GPIO 32 wiring, NeoPixel polarity |
| IMU returns zeros | Check I2C wiring, verify sensor address 0x68 |
| Distance always 999 | Check Trig/Echo wiring, ensure no obstruction |
| Battery reads 0 | Check ADC pin (GPIO 34) and voltage divider |
| WebSocket drops frequently | Check signal strength, try AP mode |

## Notes

- This firmware is a **reference implementation** — customize for your specific hardware
- The WebSocket protocol v2 spec is documented in `src/adapters/esp32.ts`
- For production, add authentication, OTA updates, and config persistence
- Battery monitoring uses a voltage divider — calibrate for your specific circuit
