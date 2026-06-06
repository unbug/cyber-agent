/**
 * CyberAgent SDK — Plugin Registry
 *
 * Manages the lifecycle of plugins: registration, loading, unloading,
 * and inspection. Provides the central registry that the engine uses
 * to discover and initialize plugins.
 *
 * Thread safety: The registry is single-threaded (browser-only).
 * All operations are synchronous except `loadPlugin()` which is async.
 */

import type {
  PluginManifest,
  PluginRegistration,
  PluginRegistry,
  PluginType,
  PluginDebugInfo,
} from './types'

// ─── Manifest Validation ────────────────────────────────────────

/**
 * Validate a plugin manifest against the schema.
 * Returns null if valid, or an error message if invalid.
 */
export function validateManifest(manifest: PluginManifest): string | null {
  if (!manifest.name || typeof manifest.name !== 'string') {
    return 'Plugin manifest missing required field: name (string)'
  }
  if (!manifest.version || typeof manifest.version !== 'string') {
    return 'Plugin manifest missing required field: version (string)'
  }
  if (!manifest.type) {
    return 'Plugin manifest missing required field: type'
  }
  if (!manifest.description || typeof manifest.description !== 'string') {
    return 'Plugin manifest missing required field: description (string)'
  }
  if (!manifest.author || typeof manifest.author !== 'string') {
    return 'Plugin manifest missing required field: author (string)'
  }
  if (!manifest.license || typeof manifest.license !== 'string') {
    return 'Plugin manifest missing required field: license (string)'
  }
  if (!manifest.apiVersion || typeof manifest.apiVersion !== 'string') {
    return 'Plugin manifest missing required field: apiVersion (string)'
  }
  if (!manifest.entryPoint || typeof manifest.entryPoint !== 'string') {
    return 'Plugin manifest missing required field: entryPoint (string)'
  }

  const validTypes = ['bt-node', 'adapter', 'sensor', 'hook', 'character']
  if (!validTypes.includes(manifest.type)) {
    return `Plugin manifest has invalid type: "${manifest.type}". Must be one of: ${validTypes.join(', ')}`
  }

  // Validate version format (semver-ish)
  if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) {
    return `Plugin manifest has invalid version format: "${manifest.version}". Expected semver (e.g., "1.0.0")`
  }

  // Validate apiVersion format
  if (!/^\d+\.\d+$/.test(manifest.apiVersion)) {
    return `Plugin manifest has invalid apiVersion format: "${manifest.apiVersion}". Expected "major.minor"`
  }

  // Validate dependencies if present
  if (manifest.dependencies && !Array.isArray(manifest.dependencies)) {
    return 'Plugin manifest field "dependencies" must be an array of strings'
  }

  // Validate requiredCapabilities if present
  if (manifest.requiredCapabilities && !Array.isArray(manifest.requiredCapabilities)) {
    return 'Plugin manifest field "requiredCapabilities" must be an array of strings'
  }

  return null
}

// ─── Plugin Registry Implementation ─────────────────────────────

class PluginRegistryImpl implements PluginRegistry {
  private plugins = new Map<string, PluginRegistration>()
  private extensionCounts = new Map<string, {
    actions: number
    conditions: number
    adapters: number
    sensors: number
    hooks: number
    characters: number
  }>()

  register(manifest: PluginManifest): PluginRegistration {
    const error = validateManifest(manifest)
    if (error) {
      throw new Error(`Plugin registration failed: ${error}`)
    }

    const existing = this.plugins.get(manifest.name)
    const reloadCount = existing ? existing.reloadCount + 1 : 0

    const registration: PluginRegistration = {
      manifest,
      loaded: false,
      registeredAt: Date.now(),
      reloadCount,
      lastError: null,
      metadata: {},
    }

    this.plugins.set(manifest.name, registration)

    // Initialize extension counts
    this.extensionCounts.set(manifest.name, {
      actions: 0,
      conditions: 0,
      adapters: 0,
      sensors: 0,
      hooks: 0,
      characters: 0,
    })

    return registration
  }

  get(name: string): PluginRegistration | undefined {
    return this.plugins.get(name)
  }

  list(): PluginRegistration[] {
    return Array.from(this.plugins.values())
  }

  listByType(type: PluginType): PluginRegistration[] {
    return this.list().filter((p) => p.manifest.type === type)
  }

  unload(name: string): boolean {
    const plugin = this.plugins.get(name)
    if (!plugin) return false

    // Call cleanup if available
    if (plugin.cleanup) {
      try {
        plugin.cleanup()
      } catch {
        // Ignore cleanup errors
      }
    }

    this.plugins.delete(name)
    this.extensionCounts.delete(name)
    return true
  }

  clear(): void {
    // Cleanup all plugins
    for (const plugin of this.plugins.values()) {
      if (plugin.cleanup) {
        try {
          plugin.cleanup()
        } catch {
          // Ignore cleanup errors
        }
      }
    }
    this.plugins.clear()
    this.extensionCounts.clear()
  }

  hasCapability(capability: string): boolean {
    for (const plugin of this.plugins.values()) {
      if (plugin.manifest.requiredCapabilities?.includes(capability)) {
        return true
      }
    }
    return false
  }

  /**
   * Increment the extension count for a plugin.
   * Called by the loader when a plugin registers extensions.
   */
  incrementExtension(name: string, extensionType: 'actions' | 'conditions' | 'adapters' | 'sensors' | 'hooks' | 'characters'): void {
    const counts = this.extensionCounts.get(name)
    if (counts) {
      counts[extensionType]++
    }
  }

  /**
   * Get debug info for a plugin.
   */
  getDebugInfo(name: string): PluginDebugInfo | null {
    const plugin = this.plugins.get(name)
    if (!plugin) return null

    const counts = this.extensionCounts.get(name) || {
      actions: 0,
      conditions: 0,
      adapters: 0,
      sensors: 0,
      hooks: 0,
      characters: 0,
    }

    return {
      manifest: plugin.manifest,
      loaded: plugin.loaded,
      extensionCount: counts,
      loadTimeMs: 0, // Set by loader
      lastError: plugin.lastError,
      health: plugin.lastError ? 'unhealthy' : plugin.loaded ? 'healthy' : 'degraded',
    }
  }

  /**
   * Get debug info for all plugins.
   */
  getAllDebugInfo(): PluginDebugInfo[] {
    return this.list()
      .map((p) => this.getDebugInfo(p.manifest.name))
      .filter((d): d is PluginDebugInfo => d !== null)
  }
}

// ─── Singleton Instance ─────────────────────────────────────────

let _registry: PluginRegistry | null = null

/**
 * Get the global plugin registry instance.
 * Creates a new instance if one doesn't exist.
 */
export function getPluginRegistry(): PluginRegistry {
  if (!_registry) {
    _registry = new PluginRegistryImpl()
  }
  return _registry
}

/**
 * Reset the global plugin registry (for testing).
 */
export function resetPluginRegistry(): void {
  if (_registry) {
    _registry.clear()
    _registry = null
  }
}

// ─── Plugin Loading ─────────────────────────────────────────────

/**
 * Load a plugin from a manifest.
 * Validates the manifest, checks dependencies, and initializes the plugin.
 *
 * @param manifest - The plugin manifest to load
 * @param deps - External dependencies (registries, adapters, etc.)
 * @returns The plugin registration
 * @throws If manifest validation fails or a dependency is missing
 */
export async function loadPlugin(
  manifest: PluginManifest,
  _deps?: {
    /** External action registry (if provided, extensions are registered here) */
    actionRegistry?: Map<string, unknown>
    /** External condition registry (if provided, extensions are registered here) */
    conditionRegistry?: Map<string, unknown>
    /** External adapter registry */
    adapterRegistry?: Map<string, unknown>
  },
): Promise<PluginRegistration> {
  const registry = getPluginRegistry()

  // Validate manifest
  const error = validateManifest(manifest)
  if (error) {
    throw new Error(`Plugin validation failed: ${error}`)
  }

  // Check dependencies
  if (manifest.dependencies) {
    for (const dep of manifest.dependencies) {
      const depPlugin = registry.get(dep)
      if (!depPlugin || !depPlugin.loaded) {
        throw new Error(
          `Plugin "${manifest.name}" depends on "${dep}" which is not loaded`,
        )
      }
    }
  }

  // Register the plugin
  const registration = registry.register(manifest)

  try {
    // Simulate async loading (in production, this would fetch and eval plugin code)
    await new Promise((resolve) => setTimeout(resolve, 0))

    registration.loaded = true
    registration.lastError = null

    return registration
  } catch (err) {
    registration.loaded = false
    registration.lastError = err instanceof Error ? err.message : String(err)
    throw err
  }
}

/**
 * Unload a plugin by name.
 * @returns true if the plugin was found and unloaded
 */
export function unloadPlugin(name: string): boolean {
  const registry = getPluginRegistry()
  return registry.unload(name)
}
