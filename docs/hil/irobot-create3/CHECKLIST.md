# HIL Checklist — iRobot Create 3 Adapter

> **Adapter**: iRobot Create 3 (Roomba 900/1000/600 series)
> **Protocol**: WebSocket Protocol v2
> **Relay**: `create3-relay` — bridges WebSocket → serial (OI protocol v3)
> **Last updated**: 2026-04-30

## Prerequisites

- [ ] iRobot Create 3 robot (or Roomba 900/1000/600 series with OI v3 support)
- [ ] Relay server running on same network (`create3-relay`)
- [ ] USB-C cable for initial firmware/serial access
- [ ] Computer with WebSocket client (wscat, browser DevTools, or cyber-agent CLI)
- [ ] iRobot Create 3 app (for initial setup and charging dock)

## Relay Setup

1. Install the relay server (see `firmware/create3-relay/`)
2. Connect relay to Create 3 via USB-C or Bluetooth
3. Verify serial connection: `screen /dev/ttyUSB0 115200`
4. Start relay: `node relay.js --serial /dev/ttyUSB0 --ws-port 8080`
5. Verify WebSocket: `wscat -c ws://127.0.0.1:8080`

## Test Suite

### 1. Connection

- [ ] Start relay server
- [ ] Open browser → `ws://<relay_IP>:8080`
- [ ] Send heartbeat: `{"type":"heartbeat","payload":{},"t":0}`
- [ ] Receive ack: `{"type":"ack","payload":{"status":"ok"}}`

### 2. Movement Commands

- [ ] Send velocity: `{"type":"velocity","payload":{"velocity_mm_s":100},"t":0}`
  - Verify: Create 3 wheels spin at ~100 mm/s
- [ ] Send move forward: `{"type":"move","payload":{"velocity":200},"t":0}`
  - Verify: robot moves forward
- [ ] Send move backward: `{"type":"move","payload":{"velocity":-200},"t":0}`
  - Verify: robot moves backward
- [ ] Send turn: `{"type":"velocity","payload":{"velocity_mm_s":100,"radius_mm":200},"t":0}`
  - Verify: robot turns in arc
- [ ] Send stop: `{"type":"stop","payload":{},"t":0}`
  - Verify: robot stops immediately

### 3. Drive Command (distance-based)

- [ ] Send drive: `{"type":"drive","payload":{"distance_mm":300,"velocity_mm_s":150},"t":0}`
  - Verify: robot drives ~300mm forward
- [ ] Verify: distance telemetry received after movement

### 4. LED

- [ ] Send LED red: `{"type":"led","payload":{"red":255,"green":0,"blue":0},"t":0}`
  - Verify: Create 3 LED ring shows red
- [ ] Send LED green: `{"type":"led","payload":{"red":0,"green":255,"blue":0},"t":0}`
  - Verify: LED ring shows green
- [ ] Send LED blue: `{"type":"led","payload":{"red":0,"green":0,"blue":255},"t":0}`
  - Verify: LED ring shows blue

### 5. Sound

- [ ] Send sound: `{"type":"sound","payload":{"note":128,"duration_ms":1000},"t":0}`
  - Verify: Create 3 plays tone for 1 second
- [ ] Send play_song: `{"type":"play_song","payload":{"name":"hello"},"t":0}`
  - Verify: Create 3 plays "hello" song

### 6. Sensors

- [ ] Send sensors query: `{"type":"sensors","payload":{"select":["battery","cliff_front","wall"]},"t":0}`
  - Verify: telemetry events received for each sensor type
- [ ] Verify: battery telemetry shows voltage_mv, capacity_mah, charge_pct
- [ ] Verify: cliff telemetry shows front_left, front_right, rear_left, rear_right
- [ ] Verify: wall telemetry shows value

### 7. Emergency Stop

- [ ] Start robot moving
- [ ] Send emergency_stop: `{"type":"emergency_stop","payload":{},"t":0}`
  - Verify: robot stops immediately
  - Verify: all motors disengage

### 8. Telemetry

- [ ] Observe telemetry stream in browser DevTools console
  - [ ] `battery` events with voltage_mv, capacity_mah, charge_pct
  - [ ] `cliff` events with front/rear sensor readings
  - [ ] `wall` events with distance value
  - [ ] `bump` events with left/right/center boolean flags
  - [ ] `wheel_drop` events with main_drop/caster_drop
  - [ ] `distance` events with accumulated mm
  - [ ] `angle` events with degrees
  - [ ] `velocity` events with mm_s
  - [ ] `charge_state` events with state (0-7)
  - [ ] `heartbeat` events with uptime_ms
  - [ ] `ack` events for each command

### 9. Self-Test

- [ ] Run adapter.selfTest() in browser console
  - Verify: `ok: true`, `status: "healthy"`
  - Verify: all 3 checks pass (battery, movement, sensors)

### 10. Disconnect / Reconnect

- [ ] Disconnect relay or close browser tab
- [ ] Wait 10+ seconds
- [ ] Reconnect
- [ ] Verify: auto-reconnect works, command queue flushes

### 11. Battery Safety

- [ ] Simulate low battery (run robot until battery < 15%)
- [ ] Verify: adapter detects low battery
- [ ] Verify: selfTest reports `status: "degraded"`
- [ ] Verify: adapter warns before sending high-power commands

## Expected Results

All checks above should pass with a properly connected Create 3 running OI protocol v3.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Relay can't connect to serial | Check USB-C cable, verify /dev/ttyUSB0 permissions |
| WebSocket drops frequently | Check network, try wired connection |
| Robot doesn't respond | Verify robot is powered on, check OI mode |
| LED doesn't change | Verify relay sends correct LED command |
| No telemetry events | Check relay is forwarding, verify sensor selection |
| Battery reads 0 | Robot may need calibration; check charge dock connection |
| Emergency stop doesn't work | Verify command reaches relay; check robot firmware |

## Notes

- The Create 3 uses **OI (Operating Interface) protocol v3** over serial
- The relay server handles OI command encoding/decoding
- For production, add authentication and rate limiting to the relay
- Battery thresholds: MIN_BATTERY_VOLTAGE=11500mV, FULL_BATTERY_VOLTAGE=16800mV
- Max velocity: 500 mm/s (hardware limit)
- This adapter supports Roomba 900/1000/600 series with OI v3 capability
