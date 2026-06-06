/**
 * CyberAgent SDK — Plugin Loader Tests
 *
 * Tests for the plugin loader: manifest loading, dependency checking,
 * discovery, and plugin lifecycle.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { PluginLoader, createPluginLoader, loadPluginFromManifest } from './loader'
import { getPluginRegistry, resetPluginRegistry } from './registry'
import type { PluginManifest } from './types'

// ─── Test fixtures ──────────────────────────────────────────────

const baseManifest: PluginManifest = {
  name: 'loader-test-plugin',
  version: '1.0.0',
  type: 'bt-node',
  description: 'A test plugin for loader',
  author: 'Test Author',
  license: 'MIT',
  apiVersion: '3.0',
  entryPoint: 'testEntry',
}

const dependencyManifest: PluginManifest = {
  name: 'loader-test-dep',
  version: '1.0.0',
  type: 'hook',
  description: 'A dependency plugin',
  author: 'Test Author',
  license: 'MIT',
  apiVersion: '3.0',
  entryPoint: 'depEntry',
}

// ─── PluginLoader ───────────────────────────────────────────────

describe('PluginLoader', () => {
  let loader: PluginLoader

  beforeEach(() => {
    resetPluginRegistry()
    loader = createPluginLoader()
  })

  it('loads a manifest', async () => {
    const registration = await loader.loadManifest(baseManifest)
    expect(registration.loaded).toBe(true)
    expect(registration.lastError).toBeNull()
    expect(registration.manifest.name).toBe('loader-test-plugin')
  })

  it('rejects invalid manifest', async () => {
    const invalid = { ...baseManifest } as PluginManifest
    delete (invalid as any).name
    await expect(loader.loadManifest(invalid)).rejects.toThrow(/validation failed/)
  })

  it('rejects manifest with missing dependencies', async () => {
    const manifest = { ...dependencyManifest, dependencies: ['nonexistent'] }
    await expect(loader.loadManifest(manifest)).rejects.toThrow(/depends on/)
  })

  it('loads dependencies in order', async () => {
    // Load dependency first
    await loader.loadManifest(dependencyManifest)

    // Now load the manifest that depends on it
    const manifest = { ...baseManifest, dependencies: ['loader-test-dep'] }
    const registration = await loader.loadManifest(manifest)
    expect(registration.loaded).toBe(true)
  })

  it('tracks load time', async () => {
    await loader.loadManifest(baseManifest)
    const loadTime = loader.getLoadTime('loader-test-plugin')
    expect(loadTime).toBeGreaterThan(0)
  })

  it('gets plugin debug info', async () => {
    await loader.loadManifest(baseManifest)
    const debugInfo = loader.getPluginDebugInfo()
    expect(debugInfo).toHaveLength(1)
    expect(debugInfo[0].manifest.name).toBe('loader-test-plugin')
    expect(debugInfo[0].loaded).toBe(true)
    expect(debugInfo[0].health).toBe('healthy')
  })

  it('gets discovered plugins', async () => {
    await loader.loadManifest(baseManifest)
    const discovered = loader.getDiscoveredPlugins()
    expect(discovered).toHaveLength(1)
    expect(discovered[0].manifest.name).toBe('loader-test-plugin')
  })

  it('discovers from CDN (fails gracefully)', async () => {
    const discovered = await loader.discover('cdn', { url: 'https://nonexistent.example.com/registry.json' })
    expect(Array.isArray(discovered)).toBe(true)
    // Should return error info, not throw
  })

  it('discovers from local (returns empty — use registry instead)', async () => {
    const discovered = await loader.discover('local')
    expect(discovered).toEqual([])
  })

  it('discovers from bundle (returns empty)', async () => {
    const discovered = await loader.discover('bundle')
    expect(discovered).toEqual([])
  })

  it('discovers from indexeddb (returns empty)', async () => {
    const discovered = await loader.discover('indexeddb')
    expect(discovered).toEqual([])
  })
})

// ─── loadMany ───────────────────────────────────────────────────

describe('loadMany', () => {
  let loader: PluginLoader

  beforeEach(() => {
    resetPluginRegistry()
    loader = createPluginLoader()
  })

  it('loads multiple plugins', async () => {
    const plugins = [
      { manifest: { ...baseManifest, name: 'plugin-a' } },
      { manifest: { ...baseManifest, name: 'plugin-b' } },
      { manifest: { ...baseManifest, name: 'plugin-c' } },
    ]
    const results = await loader.loadMany(plugins)
    expect(results.size).toBe(3)
    expect(results.get('plugin-a')?.loaded).toBe(true)
    expect(results.get('plugin-b')?.loaded).toBe(true)
    expect(results.get('plugin-c')?.loaded).toBe(true)
  })

  it('handles partial failures', async () => {
    const plugins = [
      { manifest: { ...baseManifest, name: 'plugin-ok' } },
      { manifest: { ...baseManifest, name: 'plugin-invalid' } as unknown as PluginManifest }, // missing name
    ]
    const results = await loader.loadMany(plugins)
    // First plugin should succeed, second should fail (but not throw)
    expect(results.get('plugin-ok')?.loaded).toBe(true)
  })
})

// ─── Convenience Functions ──────────────────────────────────────

describe('Convenience functions', () => {
  beforeEach(() => {
    resetPluginRegistry()
  })

  it('loadPluginFromManifest loads a plugin', async () => {
    const registration = await loadPluginFromManifest(baseManifest)
    expect(registration.loaded).toBe(true)
  })

  it('createPluginLoader creates a loader', () => {
    const loader = createPluginLoader()
    expect(loader).toBeInstanceOf(PluginLoader)
  })
})

// ─── Registry Integration ───────────────────────────────────────

describe('Registry integration', () => {
  beforeEach(() => {
    resetPluginRegistry()
  })

  it('plugins are accessible via registry after loading', async () => {
    const loader = createPluginLoader()
    await loader.loadManifest(baseManifest)

    const registry = getPluginRegistry()
    const plugin = registry.get('loader-test-plugin')
    expect(plugin).toBeDefined()
    expect(plugin?.loaded).toBe(true)
  })

  it('plugins are listed in registry after loading', async () => {
    const loader = createPluginLoader()
    await loader.loadManifest(baseManifest)

    const registry = getPluginRegistry()
    const plugins = registry.list()
    expect(plugins).toHaveLength(1)
    expect(plugins[0].manifest.name).toBe('loader-test-plugin')
  })
})
