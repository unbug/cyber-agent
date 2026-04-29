/**
 * CyberAgent SDK — ESP32 Adapter (v2)
 *
 * Controls a generic ESP32 robot running the CyberAgent reference firmware
 * via WebSocket Protocol v2.
 *
 * See src/adapters/esp32.ts for the full implementation.
 * This module re-exports for SDK consumers.
 */

export {
  ESP32Adapter,
  createESP32Adapter,
  PROTOCOL_VERSION,
  MAX_SPEED,
  MIN_BATTERY_VOLTAGE,
  MAX_BATTERY_VOLTAGE,
} from '../../src/adapters/esp32'
export type {
  ESP32AdapterConfig,
  ESP32CommandType,
  ESP32TelemetryType,
  ProtocolMessage,
} from '../../src/adapters/esp32'
