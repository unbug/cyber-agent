# HIL Checklist — DJI Tello / Tello EDU Adapter

> **Adapter**: DJI Tello / Tello EDU drone
> **Protocol**: WebSocket Protocol v2
> **Relay**: `tello-relay` — bridges WebSocket → UDP (Tello SDK protocol)
> **⚠️ INDOOR ONLY**: Tello has no GPS, no obstacle avoidance, and
> limited battery (13 min flight). Always use a propeller guard.
> **Last updated**: 2026-04-30

## Prerequisites

- [ ] DJI Tello or Tello EDU drone
- [ ] Propeller guard (mandatory for indoor flight)
- [ ] Relay server running on same network (`tello-relay`)
- [ ] Computer with WebSocket client (wscat, browser DevTools, or cyber-agent CLI)
- [ ] Open space: minimum 3m × 3m × 2m (L×W×H)
- [ ] No people or fragile objects in flight zone
- [ ] Fully charged battery (LED on drone shows green)

## Relay Setup

1. Install the relay server (see `firmware/tello-relay/`)
2. Connect relay to same WiFi network as Tello
3. Start relay: `node relay.js --tello-ip <TELLO_IP> --ws-port 8080`
4. Verify WebSocket: `wscat -c ws://127.0.0.1:8080`

## Safety Checklist (Before Every Flight)

- [ ] Propeller guard installed
- [ ] Flight zone clear of people and obstacles
- [ ] Battery level > 30%
- [ ] Relay server running and WebSocket connected
- [ ] Emergency stop procedure understood
- [ ] Indoor-only environment (no wind, no rain)

## Test Suite

### 1. Connection

- [ ] Start relay server
- [ ] Open browser → `ws://<relay_IP>:8080`
- [ ] Send heartbeat: `{"type":"heartbeat","payload":{},"t":0}`
- [ ] Receive ack: `{"type":"ack","payload":{"status":"ok"}}`

### 2. Takeoff / Land

- [ ] Send takeoff: `{"type":"takeoff","payload":{},"t":0}`
  - Verify: Tello takes off (~0.3m altitude)
  - Verify: flight_status telemetry shows FLYING
- [ ] Send land: `{"type":"land","payload":{},"t":0}`
  - Verify: Tello lands automatically
  - Verify: flight_status telemetry shows LANDED

### 3. Movement Commands

- [ ] Send takeoff first
- [ ] Send move forward 50cm: `{"type":"move","payload":{"direction":"forward","distance_cm":50},"t":0}`
  - Verify: Tello moves forward ~50cm
- [ ] Send move backward: `{"type":"move","payload":{"direction":"backward","distance_cm":50},"t":0}`
  - Verify: Tello moves backward
- [ ] Send move left: `{"type":"move","payload":{"direction":"left","distance_cm":50},"t":0}`
  - Verify: Tello moves left
- [ ] Send move right: `{"type":"move","payload":{"direction":"right","distance_cm":50},"t":0}`
  - Verify: Tello moves right
- [ ] Send move up: `{"type":"move","payload":{"direction":"up","distance_cm":30},"t":0}`
  - Verify: Tello ascends ~30cm
- [ ] Send move down: `{"type":"move","payload":{"direction":"down","distance_cm":30},"t":0}`
  - Verify: Tello descends ~30cm
- [ ] Send rotate CW 90°: `{"type":"rotate","payload":{"direction":"cw","angle_deg":90},"t":0}`
  - Verify: Tello rotates clockwise 90°
- [ ] Send rotate CCW 90°: `{"type":"rotate","payload":{"direction":"ccw","angle_deg":90},"t":0}`
  - Verify: Tello rotates counter-clockwise 90°

### 4. Speed Control

- [ ] Send speed 50cm/s: `{"type":"speed","payload":{"speed_cm_s":50},"t":0}`
  - Verify: subsequent movements at 50cm/s
- [ ] Verify: speed clamped to MIN_SPEED(10)–MAX_SPEED(100)

### 5. Flip

- [ ] Send takeoff first
- [ ] Send flip left: `{"type":"flip","payload":{"direction":"left"},"t":0}`
  - Verify: Tello flips to the left
- [ ] Send flip forward: `{"type":"flip","payload":{"direction":"forward"},"t":0}`
  - Verify: Tello flips forward
- [ ] Send flip right: `{"type":"flip","payload":{"direction":"right"},"t":0}`
  - Verify: Tello flips to the right
- [ ] Send flip backward: `{"type":"flip","payload":{"direction":"backward"},"t":0}`
  - Verify: Tello flips backward

### 6. Waypoint Mode

- [ ] Send takeoff first
- [ ] Send waypoint 1: `{"type":"waypoint","payload":{"sid":1,"x_cm":50,"y_cm":50,"speed_cm_s":50},"t":0}`
  - Verify: waypoint registered
- [ ] Send waypoint 2: `{"type":"waypoint","payload":{"sid":2,"x_cm":100,"y_cm":0,"speed_cm_s":50},"t":0}`
  - Verify: waypoint registered
- [ ] Send waypoint_end: `{"type":"waypoint_end","payload":{},"t":0}`
  - Verify: Tello flies through waypoints in sequence

### 7. Go Command (XYZ)

- [ ] Send takeoff first
- [ ] Send go: `{"type":"go","payload":{"x_cm":50,"y_cm":50,"z_cm":30,"speed_cm_s":50},"t":0}`
  - Verify: Tello moves to specified XYZ position

### 8. Video

- [ ] Send enable video: `{"type":"video","payload":{"enable":true},"t":0}`
  - Verify: Tello starts video stream
- [ ] Send disable video: `{"type":"video","payload":{"enable":false},"t":0}`
  - Verify: Tello stops video stream

### 9. Telemetry

- [ ] Observe telemetry stream in browser DevTools console
  - [ ] `battery` events with percentage
  - [ ] `temperature` events with fov/body
  - [ ] `barometer` events with height_cm
  - [ ] `tof` events with front/bottom
  - [ ] `attitude` events with roll/pitch/yaw
  - [ ] `flight_data` events with time/x/y/z/temperature
  - [ ] `wifi` events with dbm
  - [ ] `flight_status` events with state
  - [ ] `heartbeat` events with uptime_ms
  - [ ] `ack` events for each command

### 10. Emergency Stop

- [ ] Send takeoff first
- [ ] While flying, send emergency_stop: `{"type":"emergency_stop","payload":{},"t":0}`
  - Verify: Tello lands immediately
  - Verify: flight_status shows EMERGENCY

### 11. Self-Test

- [ ] Run adapter.selfTest() in browser console
  - Verify: `ok: true`, `status: "healthy"`
  - Verify: all 3 checks pass (battery, flight, sensors)

### 12. Battery Safety

- [ ] Simulate low battery (check battery telemetry)
- [ ] Verify: adapter detects low battery (< 10%)
- [ ] Verify: selfTest reports `status: "degraded"`
- [ ] Verify: adapter warns before sending takeoff command

### 13. Disconnect / Reconnect

- [ ] Disconnect relay or close browser tab while flying
- [ ] Wait 10+ seconds
- [ ] Reconnect
- [ ] Verify: auto-reconnect works, command queue flushes

## Expected Results

All checks above should pass with a properly connected Tello in a safe indoor environment.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Tello won't take off | Check battery > 30%, clear flight zone, relay connected |
| WiFi drops during flight | Move relay closer to Tello, use 2.4GHz band |
| No telemetry events | Check relay is forwarding, verify Tello IP |
| Movement doesn't match | Check speed setting, verify distance clamping |
| Video doesn't start | Verify video command sent, check relay IP |
| Emergency stop doesn't work | Verify command reaches relay, check battery |
| Waypoint mode fails | Verify waypoints sent before waypoint_end |
| Battery drains fast | Reduce flight time, check for wind drafts |

## Safety Notes

- **Always** use a propeller guard
- **Never** fly near people, pets, or fragile objects
- **Always** keep emergency stop procedure ready
- **Never** fly outside (wind will damage the drone)
- **Never** fly above 3m (Tello has no altitude limit enforcement)
- **Always** land and check propellers after each flight
- **Always** check battery before each flight (minimum 30%)
- Tello EDU adds SDK access for custom commands

## Notes

- The Tello SDK uses UDP port 8889 for commands
- The relay server handles UDP command encoding/decoding
- Video stream uses UDP port 11111 (H.264)
- For production, add geofencing and altitude limits
- Flight status states: LANDED=0, TAKEOFF=1, LANDED_AFTER_TAKEOFF=2, FLYING=3, EMERGENCY=4, RETURN_TO_HOME=5, LANDING=6, TAKEOFF_FAILED=7
