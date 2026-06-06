/**
 * CyberAgent SDK — Plugin Manifest Types
 *
 * Defines the schema for third-party plugins that extend CyberAgent with
 * custom BT nodes, adapters, sensors, and hooks.
 *
 * Plugin contract:
 *   1. Every plugin declares a manifest (name, version, type, capabilities)
 *   2. Plugins register via `registerPlugin()` which validates the manifest
 *   3. Plugins are loaded by `loadPlugin()` which initializes them safely
 *   4. Plugins can be inspected via the /debug PluginManager page
 *
 * Plugin types:
 *   - 'bt-node'     : Custom BT action or condition node
 *   - 'adapter'     : New robot adapter implementation
 *   - 'sensor'      : New sensor/PerceptionBus source
 *   - 'hook'        : Lifecycle hook (e.g., beforeTick, afterTick)
 *   - 'character'   : Pre-packaged character definition (behavior + config)
 *
 * Security model:
 *   - Plugin manifests are validated before loading
 *   - Untrusted plugins run in a sandbox (isolated registration scope)
 *   - Plugins cannot access the global window/document directly
 *   - Plugins declare required capabilities; engine enforces them
 */

// ─── Plugin Type Enum ───────────────────────────────────────────

export type PluginType =
  | 'bt-node'
  | 'adapter'
  | 'sensor'
  | 'hook'
  | 'character'

// ─── Plugin Manifest ────────────────────────────────────────────

/**
 * Schema-validated manifest for a CyberAgent plugin.
 *
 * This is the contract between plugin authors and the engine.
 * Breaking changes to this schema require a major plugin version bump.
 */
export interface PluginManifest {
  /** Unique plugin identifier (e.g., 'my-custom-bt-node') */
  name: string

  /** Plugin version (semver) */
  version: string

  /** Plugin type — determines what APIs the plugin can use */
  type: PluginType

  /** Human-readable description */
  description: string

  /** Plugin author / publisher */
  author: string

  /** License (SPDX identifier) */
  license: string

  /** Plugin API version this manifest is compatible with */
  apiVersion: string

  /**
   * Required capabilities — the engine checks these before loading.
   * Empty array = no special capabilities needed.
   */
  requiredCapabilities?: string[]

  /**
   * Dependencies on other plugins (by name).
   * All dependencies must be loaded before this plugin.
   */
  dependencies?: string[]

  /**
   * Plugin entry point — the function that registers the plugin's extensions.
   * For 'bt-node' plugins: returns { actions?: Record<string, ActionFn>, conditions?: Record<string, ConditionFn> }
   * For 'adapter' plugins: returns { createAdapter: () => RobotAdapterV2 }
   * For 'sensor' plugins: returns { createSensor: () => SensorSource }
   * For 'hook' plugins: returns { hooks: HookRegistry }
   * For 'character' plugins: returns { character: CharacterDefinition }
   */
  entryPoint: string
}

// ─── Plugin Registration State ──────────────────────────────────

/**
 * Runtime registration state for a loaded plugin.
 * Created by `loadPlugin()` after successful manifest validation.
 */
export interface PluginRegistration {
  /** Plugin manifest (immutable after registration) */
  manifest: PluginManifest

  /** Whether the plugin is fully initialized */
  loaded: boolean

  /** Registration timestamp (ms since epoch) */
  registeredAt: number

  /** Number of times this plugin has been reloaded */
  reloadCount: number

  /** Last error encountered during load (null if none) */
  lastError: string | null

  /** Plugin-specific metadata (set by plugin during registration) */
  metadata: Record<string, unknown>

  /** Cleanup function — call to unload the plugin */
  cleanup?: () => void
}

// ─── Plugin Registry ────────────────────────────────────────────

/**
 * Registry of all loaded plugins.
 * Provides lookup, listing, and lifecycle management.
 */
export interface PluginRegistry {
  /** Register a plugin manifest (validates and stores) */
  register(manifest: PluginManifest): PluginRegistration

  /** Get a loaded plugin by name */
  get(name: string): PluginRegistration | undefined

  /** List all loaded plugins */
  list(): PluginRegistration[]

  /** List plugins by type */
  listByType(type: PluginType): PluginRegistration[]

  /** Unload a plugin by name */
  unload(name: string): boolean

  /** Clear all plugins */
  clear(): void

  /** Check if a capability is required by any loaded plugin */
  hasCapability(capability: string): boolean

  /** Get debug info for a plugin */
  getDebugInfo(name: string): PluginDebugInfo | null

  /** Get debug info for all plugins */
  getAllDebugInfo(): PluginDebugInfo[]
}

// ─── Plugin Sandbox ─────────────────────────────────────────────

/**
 * Sandbox context for executing untrusted plugin code.
 * Provides a restricted scope that prevents access to dangerous globals.
 */
export interface PluginSandbox {
  /** Execute plugin code in a sandboxed context */
  execute(code: string, manifest: PluginManifest): unknown

  /** Create a safe registration context for the plugin */
  createContext(manifest: PluginManifest): PluginRegistrationContext

  /** Check if the sandbox is still valid */
  isValid(): boolean
}

// ─── Plugin Registration Context ────────────────────────────────

/**
 * Context passed to a plugin's entry point during registration.
 * Plugins use this to register their extensions with the engine.
 */
export interface PluginRegistrationContext {
  /** Register a custom BT action node */
  registerAction(name: string, fn: PluginActionFn): void

  /** Register a custom BT condition node */
  registerCondition(name: string, fn: PluginConditionFn): void

  /** Register a custom adapter factory */
  registerAdapter(name: string, factory: PluginAdapterFactory): void

  /** Register a custom sensor source */
  registerSensor(name: string, factory: PluginSensorFactory): void

  /** Register a lifecycle hook */
  registerHook(hookName: string, fn: PluginHookFn): void

  /** Register a character definition */
  registerCharacter(character: PluginCharacterDefinition): void

  /** Get the plugin manifest (for reference) */
  getManifest(): PluginManifest

  /** Report a non-fatal warning */
  warn(message: string): void

  /** Report a fatal error (stops plugin loading) */
  error(message: string): void
}

// ─── Plugin Function Types ──────────────────────────────────────

/** Plugin action function (same signature as engine ActionFn) */
export type PluginActionFn = (
  bb: Record<string, unknown>,
  adapter: unknown,
  args?: Record<string, unknown>,
) => 'success' | 'failure' | 'running'

/** Plugin condition function (same signature as engine ConditionFn) */
export type PluginConditionFn = (
  bb: Record<string, unknown>,
  args?: Record<string, unknown>,
) => boolean

/** Plugin adapter factory */
export type PluginAdapterFactory = (
  config?: Record<string, unknown>,
) => { type: string; name: string; [key: string]: unknown }

/** Plugin sensor factory */
export type PluginSensorFactory = (
  config?: Record<string, unknown>,
) => {
  start(): void
  stop(): void
  onEvent(callback: (event: Record<string, unknown>) => void): () => void
}

/** Plugin lifecycle hook */
export type PluginHookFn = (
  context: {
    type: 'beforeTick' | 'afterTick' | 'beforeNode' | 'afterNode' | 'onError'
    data: Record<string, unknown>
  },
) => void

/** Plugin character definition */
export interface PluginCharacterDefinition {
  id: string
  name: string
  category: string
  description: string
  behavior: Record<string, unknown>
  defaults?: Record<string, unknown>
  compatibleAdapters?: string[]
}

// ─── Plugin Debug Info ──────────────────────────────────────────

/**
 * Debug information for a loaded plugin — exposed via /debug PluginManager.
 */
export interface PluginDebugInfo {
  /** Plugin manifest */
  manifest: PluginManifest

  /** Whether the plugin is loaded */
  loaded: boolean

  /** Number of registered extensions by type */
  extensionCount: {
    actions: number
    conditions: number
    adapters: number
    sensors: number
    hooks: number
    characters: number
  }

  /** Plugin load time (ms) */
  loadTimeMs: number

  /** Last error message */
  lastError: string | null

  /** Plugin health status */
  health: 'healthy' | 'degraded' | 'unhealthy'
}
