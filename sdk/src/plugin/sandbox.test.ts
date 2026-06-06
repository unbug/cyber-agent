/**
 * CyberAgent SDK — Plugin Sandbox Tests
 *
 * Tests for plugin context creation, code execution sandboxing,
 * and security boundary enforcement.
 */

import { describe, it, expect } from 'vitest'
import { createPluginContext, executePluginCode, isSandboxValid } from './sandbox'
import type { PluginManifest } from './types'

// ─── Test fixtures ──────────────────────────────────────────────

const testManifest: PluginManifest = {
  name: 'sandbox-test-plugin',
  version: '1.0.0',
  type: 'bt-node',
  description: 'A test plugin for sandbox',
  author: 'Test Author',
  license: 'MIT',
  apiVersion: '3.0',
  entryPoint: 'testEntry',
}

// ─── Plugin Registration Context ────────────────────────────────

describe('createPluginContext', () => {
  it('creates a valid context', () => {
    const context = createPluginContext(testManifest)
    expect(context).toBeDefined()
    expect(typeof context.registerAction).toBe('function')
    expect(typeof context.registerCondition).toBe('function')
    expect(typeof context.registerAdapter).toBe('function')
    expect(typeof context.registerSensor).toBe('function')
    expect(typeof context.registerHook).toBe('function')
    expect(typeof context.registerCharacter).toBe('function')
    expect(typeof context.getManifest).toBe('function')
    expect(typeof context.warn).toBe('function')
    expect(typeof context.error).toBe('function')
  })

  it('getManifest returns the manifest', () => {
    const context = createPluginContext(testManifest)
    const manifest = context.getManifest()
    expect(manifest.name).toBe('sandbox-test-plugin')
    expect(manifest.version).toBe('1.0.0')
    expect(manifest.type).toBe('bt-node')
  })

  it('warn logs a warning', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const context = createPluginContext(testManifest)
    context.warn('test warning')
    expect(consoleSpy).toHaveBeenCalledWith('[Plugin:sandbox-test-plugin] test warning')
    consoleSpy.mockRestore()
  })

  it('error throws with message', () => {
    const context = createPluginContext(testManifest)
    expect(() => context.error('test error')).toThrow('[Plugin:sandbox-test-plugin] test error')
  })

  it('registerAction increments count', () => {
    const context = createPluginContext(testManifest)
    context.registerAction('testAction', () => 'success')
    // No direct way to verify count, but should not throw
  })

  it('registerCondition increments count', () => {
    const context = createPluginContext(testManifest)
    context.registerCondition('testCondition', () => true)
  })

  it('registerAdapter increments count', () => {
    const context = createPluginContext(testManifest)
    context.registerAdapter('testAdapter', () => ({ type: 'test', name: 'Test' }))
  })

  it('registerSensor increments count', () => {
    const context = createPluginContext(testManifest)
    context.registerSensor('testSensor', () => ({ start: () => {}, stop: () => {}, onEvent: () => () => {} }))
  })

  it('registerHook increments count', () => {
    const context = createPluginContext(testManifest)
    context.registerHook('beforeTick', () => {})
  })

  it('registerCharacter increments count', () => {
    const context = createPluginContext(testManifest)
    context.registerCharacter({
      id: 'test-char',
      name: 'Test Character',
      category: 'test',
      description: 'A test character',
      behavior: {},
    })
  })
})

// ─── Plugin Code Execution ──────────────────────────────────────

describe('executePluginCode', () => {
  it('executes safe code', () => {
    const context = createPluginContext(testManifest)
    const code = 'ctx.registerAction("safeAction", () => "success"); return "ok";'
    const result = executePluginCode(code, testManifest, context)
    expect(result).toBe('ok')
  })

  it('rejects eval', () => {
    const context = createPluginContext(testManifest)
    const code = 'eval("console.log(1)")'
    expect(() => executePluginCode(code, testManifest, context)).toThrow(/dangerous pattern/)
  })

  it('rejects new Function', () => {
    const context = createPluginContext(testManifest)
    const code = 'const f = new Function("return 1")'
    expect(() => executePluginCode(code, testManifest, context)).toThrow(/dangerous pattern/)
  })

  it('rejects require', () => {
    const context = createPluginContext(testManifest)
    const code = 'require("fs")'
    expect(() => executePluginCode(code, testManifest, context)).toThrow(/dangerous pattern/)
  })

  it('rejects import', () => {
    const context = createPluginContext(testManifest)
    const code = 'import("fs")'
    expect(() => executePluginCode(code, testManifest, context)).toThrow(/dangerous pattern/)
  })

  it('rejects window access', () => {
    const context = createPluginContext(testManifest)
    const code = 'window.location'
    expect(() => executePluginCode(code, testManifest, context)).toThrow(/dangerous pattern/)
  })

  it('rejects document access', () => {
    const context = createPluginContext(testManifest)
    const code = 'document.body'
    expect(() => executePluginCode(code, testManifest, context)).toThrow(/dangerous pattern/)
  })

  it('rejects process access', () => {
    const context = createPluginContext(testManifest)
    const code = 'process.env'
    expect(() => executePluginCode(code, testManifest, context)).toThrow(/dangerous pattern/)
  })

  it('rejects child_process', () => {
    const context = createPluginContext(testManifest)
    const code = 'require("child_process")'
    expect(() => executePluginCode(code, testManifest, context)).toThrow(/dangerous pattern/)
  })

  it('rejects fs access', () => {
    const context = createPluginContext(testManifest)
    const code = 'require("fs")'
    expect(() => executePluginCode(code, testManifest, context)).toThrow(/dangerous pattern/)
  })
})

// ─── Sandbox Health ─────────────────────────────────────────────

describe('isSandboxValid', () => {
  it('returns true for a valid context', () => {
    const context = createPluginContext(testManifest)
    expect(isSandboxValid(context)).toBe(true)
  })
})
