import {
  BehaviorTree,
  BehaviorTreeNode,
  BehaviorTreeContext,
  BehaviorTreeCallback,
  NodeType,
} from './types';
import type { RobotState } from '@/lib/robot/types';

/**
 * Behavior Tree Executor
 * 行为树执行引擎
 */
export class BehaviorTreeExecutor {
  private context: BehaviorTreeContext;
  private callbacks: BehaviorTreeCallback[];
  private active: boolean;

  constructor(
    private tree: BehaviorTree,
    initialState?: BehaviorTreeContext
  ) {
    this.tree = tree;
    this.context = { ...initialState };
    this.callbacks = [];
    this.active = false;
  }

  onStatusChange(callback: BehaviorTreeCallback): void {
    this.callbacks.push(callback);
  }

  removeCallback(callback: BehaviorTreeCallback): void {
    this.callbacks = this.callbacks.filter((cb) => cb !== callback);
  }

  private notify(nodeId: string, status: BehaviorTreeNode['status']) {
    const contextCopy = { ...this.context };
    this.callbacks.forEach((cb) => cb(nodeId, status, contextCopy));
  }

  setContext(context: BehaviorTreeContext): void {
    this.context = { ...this.context, ...context };
  }

  getContext(): BehaviorTreeContext {
    return { ...this.context };
  }

  setActive(active: boolean): void {
    this.active = active;
  }

  isActive(): boolean {
    return this.active;
  }

  async execute(): Promise<void> {
    if (this.active) {
      console.warn('Tree already running');
      return;
    }

    this.active = true;
    console.log(`[BT] Starting tree: ${this.tree.name}`);

    await this.executeNode(this.tree.root, this.context);

    this.active = false;
    console.log('[BT] Tree completed');
  }

  private async executeNode(
    node: BehaviorTreeNode,
    context: BehaviorTreeContext
  ): Promise<BehaviorTreeNode['status']> {
    // Status handling
    switch (node.type) {
      case 'root':
        return await this.executeNode(node.children[0], context);

      case 'sequence':
        return await this.executeSequence(node, context);

      case 'selector':
        return await this.executeSelector(node, context);

      case 'tickOnce':
        node.status = 'running';
        this.notify(node.id, 'running');
        const result = await this.executeNode(node.children[0], context);
        if (result === 'success') {
          node.status = 'success';
          this.notify(node.id, 'success');
        } else {
          node.status = 'failure';
          this.notify(node.id, 'failure');
        }
        return node.status;

      case 'repeat':
        const times = node.metadata?.maxRepeats as number || 3;
        for (let i = 0; i < times; i++) {
          node.status = 'running';
          this.notify(node.id, 'running');
          const result = await this.executeNode(node.children[0], context);
          if (result === 'failure') {
            node.status = 'failure';
            this.notify(node.id, 'failure');
            return 'failure';
          }
        }
        node.status = 'success';
        this.notify(node.id, 'success');
        return 'success';

      case 'random':
        const probability = node.metadata?.probability as number || 0.5;
        if (Math.random() < probability) {
          return await this.executeNode(node.children[0], context);
        } else {
          return 'success'; // Skip execution
        }

      case 'action':
        return await this.executeAction(node, context);

      case 'condition':
        return await this.executeCondition(node, context);

      default:
        console.warn(`[BT] Unknown node type: ${node.type}`);
        node.status = 'failure';
        return 'failure';
    }
  }

  private async executeSequence(
    node: BehaviorTreeNode,
    context: BehaviorTreeContext
  ): Promise<BehaviorTreeNode['status']> {
    node.status = 'running';
    this.notify(node.id, 'running');

    for (const child of node.children) {
      const result = await this.executeNode(child, context);
      if (result === 'failure') {
        node.status = 'failure';
        this.notify(node.id, 'failure');
        return 'failure';
      }
    }

    node.status = 'success';
    this.notify(node.id, 'success');
    return 'success';
  }

  private async executeSelector(
    node: BehaviorTreeNode,
    context: BehaviorTreeContext
  ): Promise<BehaviorTreeNode['status']> {
    node.status = 'running';
    this.notify(node.id, 'running');

    for (const child of node.children) {
      const result = await this.executeNode(child, context);
      if (result === 'success') {
        node.status = 'success';
        this.notify(node.id, 'success');
        return 'success';
      }
    }

    node.status = 'failure';
    this.notify(node.id, 'failure');
    return 'failure';
  }

  private async executeAction(
    node: BehaviorTreeNode,
    context: BehaviorTreeContext
  ): Promise<BehaviorTreeNode['status']> {
    node.status = 'running';
    this.notify(node.id, 'running');

    // Parse action from name or description
    const actionName = node.name || node.type;

    try {
      const result = await this.performAction(actionName, node.metadata, context);

      if (result) {
        node.status = 'success';
        this.notify(node.id, 'success');
      } else {
        node.status = 'failure';
        this.notify(node.id, 'failure');
      }
      return node.status;
    } catch (error) {
      console.error(`[BT] Action execution failed: ${actionName}`, error);
      node.status = 'failure';
      this.notify(node.id, 'failure');
      return 'failure';
    }
  }

  private async executeCondition(
    node: BehaviorTreeNode,
    context: BehaviorTreeContext
  ): Promise<BehaviorTreeNode['status']> {
    node.status = 'running';
    this.notify(node.id, 'running');

    try {
      const result = await this.evaluateCondition(node.name || node.type, node.metadata, context);
      
      if (result) {
        node.status = 'success';
        this.notify(node.id, 'success');
        return 'success';
      } else {
        node.status = 'failure';
        this.notify(node.id, 'failure');
        return 'failure';
      }
    } catch (error) {
      console.error(`[BT] Condition evaluation failed: ${node.name}`, error);
      node.status = 'failure';
      this.notify(node.id, 'failure');
      return 'failure';
    }
  }

  private async performAction(
    actionName: string,
    metadata: Record<string, unknown> | undefined,
    context: BehaviorTreeContext
  ): Promise<boolean> {
    const { robotState } = context;

    // Built-in actions
    switch (actionName) {
      case 'moveForward':
        console.log('[BT] Action: Moving forward');
        // In real implementation, this would call robot SDK
        await this.simulateDelay(1000);
        if (robotState) {
          robotState.position.x += (metadata?.distance as number) || 1;
          robotState.isMoving = true;
        }
        await this.simulateDelay(1000);
        if (robotState) robotState.isMoving = false;
        return true;

      case 'moveBackward':
        console.log('[BT] Action: Moving backward');
        if (robotState) {
          robotState.position.x -= (metadata?.distance as number) || 1;
          robotState.isMoving = true;
        }
        await this.simulateDelay(1000);
        if (robotState) robotState.isMoving = false;
        return true;

      case 'turnLeft':
        console.log('[BT] Action: Turning left');
        if (robotState) {
          robotState.orientation -= 90;
          robotState.isMoving = true;
        }
        await this.simulateDelay(800);
        if (robotState) robotState.isMoving = false;
        return true;

      case 'turnRight':
        console.log('[BT] Action: Turning right');
        if (robotState) {
          robotState.orientation += 90;
          robotState.isMoving = true;
        }
        await this.simulateDelay(800);
        if (robotState) robotState.isMoving = false;
        return true;

      case 'waveTail':
        console.log('[BT] Action: Waving tail');
        await this.simulateDelay(2000);
        return true;

      case 'bark':
        console.log('[BT] Action: Barking! Woof woof!');
        await this.simulateDelay(1000);
        return true;

      case 'meow':
        console.log('[BT] Action: Meowing! Meow meow!');
        await this.simulateDelay(1000);
        return true;

      case 'sit':
        console.log('[BT] Action: Sitting down');
        await this.simulateDelay(3000);
        return true;

      case 'rest':
        console.log('[BT] Action: Resting');
        await this.simulateDelay(5000);
        return true;

      case 'play':
        console.log('[BT] Action: Playing!');
        await this.simulateDelay(2000);
        return true;

      case 'explore':
        console.log('[BT] Action: Exploring...');
        await this.simulateDelay(1500);
        return true;

      default:
        // Custom actions can be registered
        console.log(`[BT] Unknown action: ${actionName}`);
        return false;
    }
  }

  private async evaluateCondition(
    conditionName: string,
    metadata: Record<string, unknown> | undefined,
    context: BehaviorTreeContext
  ): Promise<boolean> {
    const { robotState, sensors } = context;

    // Built-in conditions
    switch (conditionName) {
      case 'checkBatteryLow':
        const batteryLevel = (robotState?.batteryLevel as number) || 100;
        return batteryLevel < 20;

      case 'checkObstacleFront':
        return ((sensors?.proximity?.front as number) || 100) < 30;

      case 'checkObstacleSide':
        const leftObs = (sensors?.proximity?.left as number) || 100;
        const rightObs = (sensors?.proximity?.right as number) || 100;
        return leftObs < 30 || rightObs < 30;

      case 'checkDistanceTarget':
        const distance = robotState?.position?.x || 0;
        const target = metadata?.targetDistance as number || 10;
        return Math.abs(distance) < target;

      case 'checkIsMoving':
        return (robotState?.isMoving as boolean) || false;

      case 'alwaysTrue':
        return true;

      default:
        console.log(`[BT] Unknown condition: ${conditionName}`);
        return true;
    }
  }

  private async simulateDelay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Re-export types for convenience
export type { BehaviorTree, BehaviorTreeNode, NodeType, BehaviorTreeContext, RobotState };
