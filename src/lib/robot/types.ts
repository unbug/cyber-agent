/**
 * Robot Types - 机器人类型定义
 */

export type RobotStatus = 'off' | 'standby' | 'running' | 'error' | 'charging';

export type RobotType = 'robomaster-ep' | 'robomaster-edr' | 'custom';

export interface RobotState {
  id: string;
  name: string;
  type: RobotType;
  status: RobotStatus;
  batteryLevel: number;
  position: {
    x: number;
    y: number;
    z?: number;
  };
  orientation: number; // degrees
  isMoving: boolean;
  connectionStatus: 'disconnected' | 'connected' | 'connecting' | 'error';
  firmwareVersion?: string;
  serialNumber?: string;
  temperature?: number;
  timestamp: number;
}

export interface RobotConfig {
  id: string;
  name: string;
  type: RobotType;
  ipAddress: string;
  port: number;
  credentials?: {
    username: string;
    passwordHash: string;
  };
  customCommands?: Record<string, unknown>;
}

export interface RobotPairingState {
  isPairing: boolean;
  availableNetworks: Array<{
    ssid: string;
    signal: number;
  }>;
  selectedNetwork?: string;
  selectedPassword?: string;
}

export interface RobotTelemetry {
  status: RobotState;
  sensors: {
    front: number;
    back: number;
    left: number;
    right: number;
    battery: number;
  };
  timestamp: number;
}

export interface RobotAction {
  id: string;
  type: 'moveForward' | 'moveBackward' | 'turnLeft' | 'turnRight' | 'move';
  parameters: Record<string, unknown>;
  timestamp: number;
}

/**
 * 机器人控制命令
 */
export interface RobotControlCommand {
  type: 'move' | 'turn' | 'action' | 'command';
  action: string;
  parameters?: Record<string, unknown>;
  duration?: number;
}
