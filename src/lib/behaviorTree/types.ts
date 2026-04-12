/**
 * Behavior Tree Types
 * 行为树类型定义
 */

export type NodeType = 
  | 'root'
  | 'sequence'
  | 'selector'
  | 'tickOnce'
  | 'repeat'
  | 'random'
  | 'action'
  | 'condition';

export interface BehaviorTreeNode {
  id: string;
  type: NodeType;
  name?: string;
  description?: string;
  children: BehaviorTreeNode[];
  status?: 'idle' | 'running' | 'success' | 'failure';
  metadata?: Record<string, unknown>;
}

export interface BehaviorTree {
  id: string;
  name: string;
  description?: string;
  root: BehaviorTreeNode;
  version?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type BehaviorTreeCallback = (
  nodeId: string,
  status: BehaviorTreeNode['status'],
  context: Record<string, unknown>
) => void;

export interface BehaviorTreeContext {
  [key: string]: unknown;
  robotState?: RobotState;
  sensors?: SensorData;
  [key: number]: unknown;
}

export interface RobotState {
  batteryLevel: number;
  position: { x: number; y: number };
  orientation: number;
  isMoving: boolean;
  [key: string]: unknown;
}

export interface SensorData {
  camera?: {
    imageData: string;
    detectedObjects: Array<{ type: string; confidence: number; bbox: number[] }>;
  };
  lidar?: { angles: number[]; distances: number[] };
  proximity: {
    front: number;
    back: number;
    left: number;
    right: number;
  };
  [key: string]: unknown;
}
