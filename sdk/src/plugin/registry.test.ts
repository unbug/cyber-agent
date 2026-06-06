/**
 * CyberAgent SDK — Plugin Registry Tests
 *
 * Tests for manifest validation, plugin registration, and lifecycle management.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  validateManifest,
  getPluginRegistry,
  resetPluginRegistry,
} from './registry'
import type { PluginManifest } from './types'

// ─── Test fixtures ──────────────────────────────────────────────

const validManifest: PluginManifest = {
  name: 'test-plugin',
  version: '1.0.0',
  type: 'bt-node',
  description: 'A test plugin',
  author: 'Test Author',
  license: 'MIT',
  apiVersion: '3.0',
  entryPoint: 'testEntry',
}

const validAdapterManifest: PluginManifest = {
  name: 'test-adapter',
  version: '1.0.0',
  type: 'adapter',
  description: 'A test adapter',
  author: 'Test Author',
  license: 'MIT',
  apiVersion: '3.0',
  entryPoint: 'createAdapter',
  requiredCapabilities: ['movement', 'rotation'],
  dependencies: ['test-plugin'],
}

// ─── Manifest Validation ────────────────────────────────────────

describe('validateManifest', () => {
  it('returns null for a valid manifest', () => {
    expect(validateManifest(validManifest)).toBeNull()
  })

  it('rejects missing name', () => {
    const invalid = { ...validManifest } as PluginManifest
    delete (invalid as any).name
    expect(validateManifest(invalid)).toMatch(/name/)
  })

  it('rejects missing version', () => {
    const invalid = { ...validManifest } as PluginManifest
    delete (invalid as any).version
    expect(validateManifest(invalid)).toMatch(/version/)
  })

  it('rejects missing type', () => {
    const invalid = { ...validManifest } as PluginManifest
    delete (invalid as any).type
    expect(validateManifest(invalid)).toMatch(/type/)
  })

  it('rejects missing description', () => {
    const invalid = { ...validManifest } as PluginManifest
    delete (invalid as any).description
    expect(validateManifest(invalid)).toMatch(/description/)
  })

  it('rejects missing author', () => {
    const invalid = { ...validManifest } as PluginManifest
    delete (invalid as any).author
    expect(validateManifest(invalid)).toMatch(/author/)
  })

  it('rejects missing license', () => {
    const invalid = { ...validManifest } as PluginManifest
    delete (invalid as any).license
    expect(validateManifest(invalid)).toMatch(/license/)
  })

  it('rejects missing apiVersion', () => {
    const invalid = { ...validManifest } as PluginManifest
    delete (invalid as any).apiVersion
    expect(validateManifest(invalid)).toMatch(/apiVersion/)
  })

  it('rejects missing entryPoint', () => {
    const invalid = { ...validManifest } as PluginManifest
    delete (invalid as any).entryPoint
    expect(validateManifest(invalid)).toMatch(/entryPoint/)
  })

  it('rejects invalid type', () => {
    const invalid = { ...validManifest, type: 'invalid' as any }
    expect(validateManifest(invalid)).toMatch(/invalid type/)
  })

  it('rejects invalid version format', () => {
    const invalid = { ...validManifest, version: 'abc' }
    expect(validateManifest(invalid)).toMatch(/invalid version/)
  })

  it('rejects invalid apiVersion format', () => {
    const invalid = { ...validManifest, apiVersion: 'abc' }
    expect(validateManifest(invalid)).toMatch(/invalid apiVersion/)
  })

  it('rejects non-array dependencies', () => {
    const invalid = { ...validManifest, dependencies: 'not-an-array' as any }
    expect(validateManifest(invalid)).toMatch(/dependencies/)
  })

  it('rejects non-array requiredCapabilities', () => {
    const invalid = { ...validManifest, requiredCapabilities: 'not-an-array' as any }
    expect(validateManifest(invalid)).toMatch(/requiredCapabilities/)
  })

  it('accepts manifest with dependencies', () => {
    expect(validateManifest(validAdapterManifest)).toBeNull()
  })

  it('accepts manifest with requiredCapabilities', () => {
    expect(validateManifest(validAdapterManifest)).toBeNull()
  })
})

// ─── Plugin Registry ────────────────────────────────────────────

describe('PluginRegistry', () => {
  beforeEach(() => {
    resetPluginRegistry()
  })

  const registry = getPluginRegistry()

  it('registers a plugin', () => {
    const reg = registry.register(validManifest)
    expect(reg.manifest.name).toBe('test-plugin')
    expect(reg.loaded).toBe(false)
    expect(reg.lastError).toBeNull()
  })

  it('gets a plugin by name', () => {
    registry.register(validManifest)
    const found = registry.get('test-plugin')
    expect(found).toBeDefined()
    expect(found?.manifest.name).toBe('test-plugin')
  })

  it('returns undefined for unknown plugin', () => {
    expect(registry.get('nonexistent')).toBeUndefined()
  })

  it('lists all plugins', () => {
    registry.register(validManifest)
    registry.register(validAdapterManifest)
    expect(registry.list()).toHaveLength(2)
  })

  it('lists plugins by type', () => {
    registry.register(validManifest)
    registry.register(validAdapterManifest)
    expect(registry.listByType('bt-node')).toHaveLength(1)
    expect(registry.listByType('adapter')).toHaveLength(1)
    expect(registry.listByType('hook')).toHaveLength(0)
  })

  it('unloads a plugin', () => {
    registry.register(validManifest)
    expect(registry.get('test-plugin')).toBeDefined()
    expect(registry.unload('test-plugin')).toBe(true)
    expect(registry.get('test-plugin')).toBeUndefined()
  })

  it('returns false for unloading nonexistent plugin', () => {
    expect(registry.unload('nonexistent')).toBe(false)
  })

  it('clears all plugins', () => {
    registry.register(validManifest)
    registry.register(validAdapterManifest)
    registry.clear()
    expect(registry.list()).toHaveLength(0)
  })

  it('checks capabilities', () => {
    expect(registry.hasCapability('movement')).toBe(false)
    registry.register(validAdapterManifest)
    expect(registry.hasCapability('movement')).toBe(true)
    expect(registry.hasCapability('nonexistent')).toBe(false)
  })

  it('throws on invalid manifest registration', () => {
    const invalid = { ...validManifest } as PluginManifest
    delete (invalid as any).name
    expect(() => registry.register(invalid)).toThrow(/name/)
  })

  it('tracks reload count', () => {
    registry.register(validManifest)
    registry.register(validManifest)
    const found = registry.get('test-plugin')
    expect(found?.reloadCount).toBe(1)
  })

  it('provides debug info', () => {
    registry.register(validManifest)
    const info = registry.getDebugInfo('test-plugin')
    expect(info).toBeDefined()
    expect(info?.manifest.name).toBe('test-plugin')
    expect(info?.loaded).toBe(false)
    expect(info?.health).toBe('degraded')
    expect(info?.extensionCount).toEqual({
      actions: 0,
      conditions: 0,
      adapters: 0,
      sensors: 0,
      hooks: 0,
      characters: 0,
    })
  })

  it('provides all debug info', () => {
    registry.register(validManifest)
    registry.register(validAdapterManifest)
    const infos = registry.getAllDebugInfo()
    expect(infos).toHaveLength(2)
  })
})
