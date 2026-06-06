/**
 * CyberAgent SDK — Plugin Loader
 *
 * Discovers, validates, and initializes plugins. Provides the bridge
 * between plugin manifests and the engine's registration APIs.
 *
 * Loading process:
 *   1. Discover plugins (from registry, CDN, or local files)
 *   2. Validate manifests
 *   3. Check dependencies
 *   4. Create sandbox context
 *   5. Execute plugin entry point
 *   6. Register extensions with the engine
 *   7. Mark plugin as loaded
 *
 * Plugin sources:
 *   - Local: plugins registered directly via registerPlugin()
 *   - CDN: plugins fetched from a plugin registry server
 *   - Bundle: plugins bundled with the application
 */

import type {
  PluginManifest,
  PluginRegistration,
  PluginRegistry,
  PluginDebugInfo,
} from './types'
import { validateManifest, getPluginRegistry } from './registry'
import { createPluginContext, executePluginCode } from './sandbox'

// ─── Plugin Discovery ───────────────────────────────────────────

/**
 * Plugin source types for discovery.
 */
export type PluginSource = 'local' | 'cdn' | 'bundle' | 'indexeddb'

/**
 * A discovered plugin — may or may not be fully loaded yet.
 */
export interface DiscoveredPlugin {
  /** Plugin manifest */
  manifest: PluginManifest
  /** Source where the plugin was found */
  source: PluginSource
  /** Whether the plugin is ready to be loaded */
  ready: boolean
  /** Error message if not ready */
  error?: string
}

// ─── Plugin Loader ──────────────────────────────────────────────

/**
 * Configuration for the plugin loader.
 */
export interface PluginLoaderConfig {
  /** Max time to wait for a single plugin to load (ms) */
  loadTimeoutMs?: number
  /** Whether to validate plugin code before execution */
  validateCode?: boolean
  /** CDN base URL for fetching plugins */
  cdnBaseUrl?: string
  /** Max number of plugins to load in parallel */
  maxConcurrent?: number
}

const DEFAULT_CONFIG: PluginLoaderConfig = {
  loadTimeoutMs: 10000,
  validateCode: true,
  cdnBaseUrl: 'https://plugins.cyberagent.dev',
  maxConcurrent: 5,
}

export class PluginLoader {
  private config: PluginLoaderConfig
  private registry: PluginRegistry
  private loadTimes = new Map<string, number>()

  constructor(config?: PluginLoaderConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.registry = getPluginRegistry()
  }

  /**
   * Load a single plugin from a manifest.
   *
   * @param manifest - The plugin manifest
   * @param code - The plugin code (entry point function body)
   * @returns The plugin registration
   */
  async loadManifest(
    manifest: PluginManifest,
    code?: string,
  ): Promise<PluginRegistration> {
    const startTime = performance.now()

    // Validate manifest
    const error = validateManifest(manifest)
    if (error) {
      throw new Error(`Plugin validation failed: ${error}`)
    }

    // Check dependencies
    if (manifest.dependencies) {
      for (const dep of manifest.dependencies) {
        const depPlugin = this.registry.get(dep)
        if (!depPlugin || !depPlugin.loaded) {
          throw new Error(
            `Plugin "${manifest.name}" depends on "${dep}" which is not loaded`,
          )
        }
      }
    }

    // Register the plugin
    const registration = this.registry.register(manifest)

    try {
      // Create sandbox context
      const context = createPluginContext(manifest, {
        maxExecutionMs: this.config.loadTimeoutMs,
      })

      // Execute plugin code if provided
      if (code) {
        if (this.config.validateCode) {
          this.validatePluginCode(code, manifest)
        }
        executePluginCode(code, manifest, context)
      }

      // Mark as loaded
      registration.loaded = true
      registration.lastError = null
      registration.metadata = { loadedAt: Date.now() }

      const elapsed = performance.now() - startTime
      this.loadTimes.set(manifest.name, elapsed)

      return registration
    } catch (err) {
      registration.loaded = false
      registration.lastError = err instanceof Error ? err.message : String(err)
      throw err
    }
  }

  /**
   * Load multiple plugins in parallel (up to maxConcurrent).
   */
  async loadMany(
    plugins: Array<{ manifest: PluginManifest; code?: string }>,
  ): Promise<Map<string, PluginRegistration>> {
    const results = new Map<string, PluginRegistration>()
    const errors = new Map<string, string>()

    // Load in batches
    const batch = plugins.slice(0, this.config.maxConcurrent)
    const remaining = plugins.slice(this.config.maxConcurrent)

    // Load current batch
    const batchPromises = batch.map(async ({ manifest, code }) => {
      try {
        const registration = await this.loadManifest(manifest, code)
        results.set(manifest.name, registration)
      } catch (err) {
        errors.set(manifest.name, err instanceof Error ? err.message : String(err))
      }
    })

    await Promise.all(batchPromises)

    // Recursively load remaining
    if (remaining.length > 0) {
      const remainingResults = await this.loadMany(remaining)
      for (const [name, reg] of remainingResults) {
        results.set(name, reg)
      }
    }

    return results
  }

  /**
   * Discover plugins from a source.
   */
  async discover(source: PluginSource, options?: { url?: string }): Promise<DiscoveredPlugin[]> {
    switch (source) {
      case 'local':
        return this.discoverLocal()
      case 'cdn': {
        const url = options?.url || `${this.config.cdnBaseUrl}/registry.json`
        return this.discoverCdn(url)
      }
      case 'bundle':
        return this.discoverBundle()
      case 'indexeddb':
        return this.discoverIndexedDB()
      default:
        return []
    }
  }

  private async discoverLocal(): Promise<DiscoveredPlugin[]> {
    // Local plugins are registered directly via registerPlugin()
    // This method returns empty — use registry.list() instead
    return []
  }

  private async discoverCdn(url: string): Promise<DiscoveredPlugin[]> {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        return [{
          manifest: {
            name: 'cdn-registry',
            version: '0.0.0',
            type: 'hook',
            description: `CDN registry at ${url}`,
            author: 'CyberAgent',
            license: 'MIT',
            apiVersion: '3.0',
            entryPoint: 'registry',
          },
          source: 'cdn',
          ready: false,
          error: `HTTP ${response.status}`,
        }]
      }
      const registry = await response.json()
      return registry.plugins.map((p: PluginManifest) => ({
        manifest: p,
        source: 'cdn',
        ready: true,
      }))
    } catch {
      return [{
        manifest: {
          name: 'cdn-registry',
          version: '0.0.0',
          type: 'hook',
          description: `CDN registry at ${url}`,
          author: 'CyberAgent',
          license: 'MIT',
          apiVersion: '3.0',
          entryPoint: 'registry',
        },
        source: 'cdn',
        ready: false,
        error: 'Failed to fetch plugin registry',
      }]
    }
  }

  private discoverBundle(): DiscoveredPlugin[] {
    // Bundle plugins are pre-registered in the application
    return []
  }

  private async discoverIndexedDB(): Promise<DiscoveredPlugin[]> {
    // IndexedDB plugins are stored locally by the user
    return []
  }

  /**
   * Validate plugin code for dangerous patterns.
   */
  private validatePluginCode(code: string, manifest: PluginManifest): void {
    const dangerousPatterns = [
      /eval\s*\(/,
      /new\s+Function\s*\(/,
      /require\s*\(/,
      /import\s*\(/,
      /window\s*\./,
      /document\s*\./,
      /global\s*\./,
      /process\s*\./,
      /__dirname/,
      /__filename/,
      /child_process/,
      /fs\s*$/,
      /net\s*\./,
      /http\s*\./,
      /https\s*\./,
      /fetch\s*\(/,
      /XMLHttpRequest/,
    ]

    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        throw new Error(
          `Plugin "${manifest.name}" contains dangerous pattern: ${pattern}`,
        )
      }
    }
  }

  /**
   * Get debug info for all loaded plugins.
   */
  getPluginDebugInfo(): PluginDebugInfo[] {
    return this.registry.getAllDebugInfo()
  }

  /**
   * Get debug info for all loaded plugins (alias for getAllDebugInfo).
   */
  getAllDebugInfo(): PluginDebugInfo[] {
    return this.registry.getAllDebugInfo()
  }

  /**
   * Get load time for a plugin.
   */
  getLoadTime(name: string): number {
    return this.loadTimes.get(name) || 0
  }

  /**
   * Get all discovered plugins (for UI display).
   */
  getDiscoveredPlugins(): DiscoveredPlugin[] {
    // Combine local, CDN, and bundle discoveries
    const local = this.registry.list().map((p) => ({
      manifest: p.manifest,
      source: 'local' as PluginSource,
      ready: p.loaded,
    }))
    return local
  }
}

// ─── Convenience Functions ──────────────────────────────────────

/**
 * Create a plugin loader instance.
 */
export function createPluginLoader(config?: PluginLoaderConfig): PluginLoader {
  return new PluginLoader(config)
}

/**
 * Load a plugin from a manifest (convenience function).
 */
export async function loadPluginFromManifest(
  manifest: PluginManifest,
  code?: string,
): Promise<PluginRegistration> {
  const loader = createPluginLoader()
  return loader.loadManifest(manifest, code)
}
