/** List of all registered actions and conditions from the BT engine */
export const ACTIONS = [
  // Movement
  { key: 'moveToPointer', label: 'moveToPointer', desc: 'Move toward cursor', category: 'movement' },
  { key: 'wander', label: 'wander', desc: 'Random wandering', category: 'movement' },
  { key: 'patrol', label: 'patrol', desc: 'Patrol waypoints', category: 'movement' },
  { key: 'moveToCenter', label: 'moveToCenter', desc: 'Move to center', category: 'movement' },
  { key: 'bounceFromEdge', label: 'bounceFromEdge', desc: 'Bounce at edges', category: 'movement' },
  { key: 'spiralInward', label: 'spiralInward', desc: 'Spiral toward center', category: 'movement' },
  { key: 'orbit', label: 'orbit', desc: 'Circle around point', category: 'movement' },
  { key: 'followWithBalanceCheck', label: 'followWithBalanceCheck', desc: 'Follow (balance-aware)', category: 'movement' },
  { key: 'adaptToTerrain', label: 'adaptToTerrain', desc: 'Adapt to terrain', category: 'movement' },
  { key: 'walkOnTerrain', label: 'walkOnTerrain', desc: 'Walk on terrain', category: 'movement' },
  // Emotion & State
  { key: 'setEmotion', label: 'setEmotion', desc: 'Set emotion', category: 'emotion' },
  { key: 'drainEnergy', label: 'drainEnergy', desc: 'Drain energy', category: 'emotion' },
  { key: 'restoreEnergy', label: 'restoreEnergy', desc: 'Restore energy', category: 'emotion' },
  { key: 'increaseExcitement', label: 'increaseExcitement', desc: 'Increase excitement', category: 'emotion' },
  { key: 'decayExcitement', label: 'decayExcitement', desc: 'Decay excitement', category: 'emotion' },
  { key: 'randomEmotion', label: 'randomEmotion', desc: 'Random emotion', category: 'emotion' },
  { key: 'setExcitement', label: 'setExcitement', desc: 'Set excitement level', category: 'emotion' },
  { key: 'idle', label: 'idle', desc: 'Do nothing', category: 'emotion' },
  // Sound & Output
  { key: 'heartbeat', label: 'heartbeat', desc: 'Heartbeat/sensor update', category: 'sound' },
  { key: 'sendCommand', label: 'sendCommand', desc: 'Send command to adapter', category: 'sound' },
  { key: 'speakPhrase', label: 'speakPhrase', desc: 'Speak a phrase', category: 'sound' },
  { key: 'playSound', label: 'playSound', desc: 'Play sound', category: 'sound' },
  { key: 'flashLED', label: 'flashLED', desc: 'Flash LED', category: 'sound' },
] as const

export const CONDITIONS = [
  // General
  { key: 'pointerNearby', label: 'pointerNearby', desc: 'Pointer nearby', category: 'general' },
  { key: 'pointerActive', label: 'pointerActive', desc: 'Pointer active', category: 'general' },
  { key: 'pointerFarAway', label: 'pointerFarAway', desc: 'Pointer far away', category: 'general' },
  { key: 'energyAbove', label: 'energyAbove', desc: 'Energy above threshold', category: 'general' },
  { key: 'energyBelow', label: 'energyBelow', desc: 'Energy below threshold', category: 'general' },
  { key: 'energyEqual', label: 'energyEqual', desc: 'Energy equal to value', category: 'general' },
  { key: 'excitementAbove', label: 'excitementAbove', desc: 'Excitement above threshold', category: 'general' },
  { key: 'excitementBelow', label: 'excitementBelow', desc: 'Excitement below threshold', category: 'general' },
  { key: 'nearEdge', label: 'nearEdge', desc: 'Near canvas edge', category: 'general' },
  { key: 'atEdge', label: 'atEdge', desc: 'At canvas edge', category: 'general' },
  { key: 'atCenter', label: 'atCenter', desc: 'At canvas center', category: 'general' },
  { key: 'notNearEdge', label: 'notNearEdge', desc: 'Not near edge', category: 'general' },
  { key: 'random', label: 'random', desc: 'Random truthy', category: 'general' },
  { key: 'emotionIs', label: 'emotionIs', desc: 'Current emotion matches', category: 'general' },
  { key: 'emotionNot', label: 'emotionNot', desc: 'Emotion not match', category: 'general' },
  { key: 'tickModulo', label: 'tickModulo', desc: 'Tick modulo check', category: 'general' },
  // Robotics
  { key: 'energyLow', label: 'energyLow', desc: 'Energy critically low', category: 'robotics' },
  { key: 'energyHigh', label: 'energyHigh', desc: 'Energy high', category: 'robotics' },
  { key: 'onRoughTerrain', label: 'onRoughTerrain', desc: 'On rough terrain', category: 'robotics' },
  { key: 'balanceStable', label: 'balanceStable', desc: 'Balance stable', category: 'robotics' },
  { key: 'balanceCritical', label: 'balanceCritical', desc: 'Balance critical', category: 'robotics' },
  { key: 'isAlerted', label: 'isAlerted', desc: 'Agent is alerted', category: 'robotics' },
  { key: 'notAlerted', label: 'notAlerted', desc: 'Agent not alerted', category: 'robotics' },
  { key: 'shouldMap', label: 'shouldMap', desc: 'Should map area', category: 'robotics' },
  { key: 'anomalyDetected', label: 'anomalyDetected', desc: 'Anomaly detected', category: 'robotics' },
  { key: 'positioningComplete', label: 'positioningComplete', desc: 'Positioning complete', category: 'robotics' },
] as const

export const BT_COMPOSITE_NODES = ['Sequence', 'Selector', 'Parallel'] as const
export const BT_DECORATOR_NODES = ['Inverter', 'Repeater', 'Cooldown'] as const
export const BT_LEAF_NODES = ['Action', 'Condition', 'Wait'] as const

export const BT_ALL_NODES = [
  ...BT_COMPOSITE_NODES,
  ...BT_DECORATOR_NODES,
  ...BT_LEAF_NODES,
] as const

/** Category config for rendering */
export const CATEGORY_CONFIG = {
  composite: { label: 'Composite', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
  decorator: { label: 'Decorator', color: '#67e8f9', bg: 'rgba(103,232,249,0.1)' },
  leaf: { label: 'Leaf', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
  movement: { label: 'Movement', color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
  emotion: { label: 'Emotion', color: '#f472b6', bg: 'rgba(244,114,182,0.1)' },
  sound: { label: 'Sound', color: '#fb923c', bg: 'rgba(251,146,60,0.1)' },
  general: { label: 'General', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
  robotics: { label: 'Robotics', color: '#38bdf8', bg: 'rgba(56,189,248,0.1)' },
} as const

export type ActionType = typeof ACTIONS[number]['key']
export type ConditionType = typeof CONDITIONS[number]['key']
export type BtNodeType = typeof BT_ALL_NODES[number]
export type NodeType = BtNodeType
