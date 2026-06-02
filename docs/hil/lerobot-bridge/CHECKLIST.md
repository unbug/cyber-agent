# LeRobot Bridge HIL Checklist

> Hardware-in-Loop verification for `@cyber-agent/sdk-lerobot` bridge.

## Prerequisites

- [ ] LeRobot policy server running: `python -m lerobot.scripts.server.policy_server --host 0.0.0.0 --port 8080`
- [ ] Policy checkpoint loaded (Pi0 / SmolVLA / GR00T)
- [ ] Robot connected and calibrated
- [ ] Camera(s) accessible (OpenCV or RTSP)

## Verification Steps

1. **Connect handshake**
   - [ ] WebSocket connects to policy server
   - [ ] Handshake response: `{type: "status", status: "ready"}`
   - [ ] Latency < 50 ms for handshake round-trip

2. **Observation send**
   - [ ] Send observation with sensor data
   - [ ] Server responds with `{type: "action"}` within timeout
   - [ ] Action vector length matches expected output dim

3. **Camera frames**
   - [ ] Send camera frames (base64 encoded)
   - [ ] Server processes frames without error
   - [ ] Action reflects camera input (compare with sensor-only)

4. **Task switching**
   - [ ] Send `{type: "task", task: "new_task"}`
   - [ ] Server acknowledges task change
   - [ ] New task produces different actions for same observation

5. **Error handling**
   - [ ] Disconnect server → client auto-reconnects
   - [ ] Invalid frame → server returns `{type: "error"}`
   - [ ] Timeout → client returns zero-action fallback

6. **Performance**
   - [ ] End-to-end latency < 200 ms (sensor → action)
   - [ ] No memory leaks after 1000 inference cycles
   - [ ] No cross-talk in multi-robot setup

## Known Limitations

- Requires Python LeRobot server (not pure browser inference)
- Camera frames must be pre-encoded (no native browser camera access in bridge)
- Policy model must be loaded on server before first inference

## Notes

- This bridge is **experimental** — sim-only until real-hardware transfer validation
- For production use, consider direct HuggingFace Inference API (RestPolicyClient)
