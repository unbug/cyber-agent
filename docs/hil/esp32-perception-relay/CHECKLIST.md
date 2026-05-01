# HIL Checklist — ESP32 Perception Relay

> Hardware-in-Loop verification for the ESP32 Perception Relay adapter.
> Target hardware: ESP32-WROOM-32 or ESP32-S3 (any dev board with WiFi).

## Prerequisites

- [ ] ESP32 dev board with WiFi (ESP32-WROOM-32, ESP32-S3, etc.)
- [ ] USB-C cable for power + serial
- [ ] Arduino IDE or PlatformIO installed
- [ ] Same WiFi network as the browser client

## Step 1: Flash Reference Firmware

1. Open `firmware/esp32-perception-relay/CyberAgentPerceptionRelay.ino`
2. Select your ESP32 board in Arduino IDE (Tools → Board)
3. Set WiFi SSID and password in the config section
4. Upload to the ESP32
5. Check Serial Monitor (115200 baud) for "Perception server started on ws://<IP>:8181/perception"

## Step 2: Verify WiFi Connection

- [ ] Serial monitor shows IP address (e.g., `192.168.1.100`)
- [ ] `ping <IP>` succeeds from your computer
- [ ] `curl http://<IP>:8181/health` returns `{"status":"ok"}`

## Step 3: Test Sensor Events (Browser → ESP32)

1. Open `https://unbug.github.io/cyber-agent/debug` in a browser
2. Connect a character with `canvas` adapter
3. Open browser dev tools → Network tab → WebSocket
4. Verify WS connection to `ws://<ESP32_IP>:8181/perception`
5. Check that `heartbeat` messages are sent every 5 seconds

- [ ] WS connection established
- [ ] Heartbeat messages received every ~5s
- [ ] No connection errors in console

## Step 4: Test Perception Relay (ESP32 → Browser)

1. Connect sensors to ESP32:
   - Ultrasonic sensor (trig=GPIO4, echo=GPIO5) on D1 mini
   - Bump switch on GPIO15
   - MPU6050 IMU on GPIO21/22 (SDA/SCL)
2. Modify firmware to enable sensors (set `ENABLE_SENSORS` to `true`)
3. Move objects near the ultrasonic sensor
4. Check browser `/debug` → Perception panel

- [ ] `near` events appear in Perception panel
- [ ] Distance values are reasonable (1-400 cm)
- [ ] Bump events fire when switch is pressed
- [ ] Tilt events fire when IMU is moved

## Step 5: Test Bidirectional Relay

1. Use webcam to detect a face on the browser
2. Check that ESP32 receives the perception event
3. ESP32 should flash LED in response (red for face detection)
4. Check ESP32 serial log for relayed events

- [ ] Face detection from webcam relayed to ESP32
- [ ] LED flashes red on ESP32
- [ ] Serial log shows relayed event

## Step 6: Performance

- [ ] Perception → BT → motor chain completes in <200ms end-to-end
- [ ] Trace in `/debug` shows full perception → BT → motor chain
- [ ] No dropped events over 5-minute test

## Pass Criteria

All of the following must be true:

1. WiFi connection stable (no disconnects in 5 minutes)
2. Sensor events received in browser with <50ms latency
3. Perception events relayed to ESP32 correctly
4. Full perception → BT → motor chain visible in `/debug` trace
5. Zero dropped events over 5-minute test

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Cannot connect to ESP32 | Check WiFi credentials in firmware |
| No sensor events | Check sensor wiring and `ENABLE_SENSORS` flag |
| Events not relayed to browser | Check WebSocket URL in relay options |
| High latency (>200ms) | Check WiFi signal strength; try wired Ethernet adapter |
| ESP32 reboots | Check power supply; use 5V/2A adapter |
