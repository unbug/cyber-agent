/**
 * CyberAgent SDK — Plugin Module
 *
 * Third-party plugin system for extending CyberAgent with custom
 * BT nodes, adapters, sensors, and hooks.
 *
 * Usage:
 *   // Register a plugin
 *   const manifest = {
 *     name: 'my-custom-node',
 *     version: '1.0.0',
 *     type: 'bt-node',
 *     description: 'My custom BT node',
 *     author: 'My Name',
 *     license: 'MIT',
 *     apiVersion: '3.0',
 *     entryPoint: 'myNode',
 *   }
 *
 *   const registration = await loadPluginFromManifest(manifest, code)
 *
 *   // Load multiple plugins
 *   const loader = createPluginLoader()
 *   const results = await loader.loadMany([{ manifest, code }])
 *
 *   // Get plugin info
 *   const debugInfo = loader.getPluginDebugInfo()
 *
 * @module @cyber-agent/sdk/plugin
 */

export type {
  PluginManifest,
  PluginRegistration,
  PluginRegistry,
  PluginType,
  PluginSandbox,
  PluginRegistrationContext,
  PluginActionFn,
  PluginConditionFn,
  PluginAdapterFactory,
  PluginSensorFactory,
  PluginHookFn,
  PluginCharacterDefinition,
  PluginDebugInfo,
} from './types'

export {
  validateManifest,
  getPluginRegistry,
  resetPluginRegistry,
} from './registry'

export {
  createPluginContext,
  executePluginCode,
  isSandboxValid,
} from './sandbox'

export {
  PluginLoader,
  createPluginLoader,
  loadPluginFromManifest,
} from './loader'

export type {
  PluginSource,
  DiscoveredPlugin,
  PluginLoaderConfig,
} from './loader'
