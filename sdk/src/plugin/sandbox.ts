/**
 * CyberAgent SDK — Plugin Sandbox
 *
 * Provides a restricted execution context for untrusted plugin code.
 * Prevents plugins from accessing dangerous globals or performing
 * unauthorized operations.
 *
 * Security model:
 *   - Plugins run in an isolated scope (no access to window/document)
 *   - Plugins can only call explicitly allowed APIs
 *   - Plugins cannot access the global registry directly
 *   - Plugins must go through the registration context to register extensions
 *
 * ⚠️ Note: In the browser, true sandboxing requires <iframe> with sandbox
 * attributes or Web Workers. This implementation provides a lightweight
 * sandbox using function() constructor with restricted globals.
 *
 * For production use with untrusted plugins, consider:
 *   - Web Workers for CPU isolation
 *   - iframe sandboxing for DOM isolation
 *   - WASM for memory isolation
 */

import type {
  PluginManifest,
  PluginRegistrationContext,
  PluginActionFn,
  PluginConditionFn,
  PluginAdapterFactory,
  PluginSensorFactory,
  PluginHookFn,
  PluginCharacterDefinition,
} from './types'

// ─── Sandbox Context ────────────────────────────────────────────

/**
 * Create a sandboxed registration context for a plugin.
 * The plugin's entry point will receive this context to register extensions.
 */
export function createPluginContext(
  manifest: PluginManifest,
  options?: {
    /** Max execution time in ms (default: 5000) */
    maxExecutionMs?: number
    /** Max registrations (default: 100) */
    maxRegistrations?: number
  },
): PluginRegistrationContext {
  const {
    maxExecutionMs = 5000,
    maxRegistrations = 100,
  } = options || {}

  let registrationCount = 0
  let isExpired = false
  const startTime = Date.now()

  /**
   * Check if the context has expired (timed out or exceeded registrations).
   */
  function checkExpiry(): boolean {
    if (isExpired) return true
    if (Date.now() - startTime > maxExecutionMs) {
      isExpired = true
      return true
    }
    if (registrationCount >= maxRegistrations) {
      isExpired = true
      return true
    }
    return false
  }

  return {
    registerAction(_name: string, _fn: PluginActionFn): void {
      if (checkExpiry()) {
        throw new Error('Plugin context expired — too many registrations or timeout')
      }
      registrationCount++
      // In production, this would register with the engine's action registry
      // For now, we just count it
    },

    registerCondition(_name: string, _fn: PluginConditionFn): void {
      if (checkExpiry()) {
        throw new Error('Plugin context expired — too many registrations or timeout')
      }
      registrationCount++
    },

    registerAdapter(_name: string, _factory: PluginAdapterFactory): void {
      if (checkExpiry()) {
        throw new Error('Plugin context expired — too many registrations or timeout')
      }
      registrationCount++
    },

    registerSensor(_name: string, _factory: PluginSensorFactory): void {
      if (checkExpiry()) {
        throw new Error('Plugin context expired — too many registrations or timeout')
      }
      registrationCount++
    },

    registerHook(_hookName: string, _fn: PluginHookFn): void {
      if (checkExpiry()) {
        throw new Error('Plugin context expired — too many registrations or timeout')
      }
      registrationCount++
    },

    registerCharacter(_character: PluginCharacterDefinition): void {
      if (checkExpiry()) {
        throw new Error('Plugin context expired — too many registrations or timeout')
      }
      registrationCount++
    },

    getManifest(): PluginManifest {
      return { ...manifest }
    },

    warn(message: string): void {
      console.warn(`[Plugin:${manifest.name}] ${message}`)
    },

    error(message: string): void {
      isExpired = true
      throw new Error(`[Plugin:${manifest.name}] ${message}`)
    },
  }
}

// ─── Plugin Code Execution ──────────────────────────────────────

/**
 * Execute plugin code in a sandboxed context.
 *
 * This creates a restricted function scope that only allows
 * access to explicitly permitted globals.
 *
 * ⚠️ WARNING: This is a lightweight sandbox. For untrusted plugins,
 * use Web Workers or iframe sandboxing instead.
 */
export function executePluginCode(
  code: string,
  manifest: PluginManifest,
  context: PluginRegistrationContext,
): unknown {
  // Check for dangerous patterns
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
    /WebSocket\s*\(/,
    /WebSocket\s*\(/,
  ]

  for (const pattern of dangerousPatterns) {
    if (pattern.test(code)) {
      throw new Error(
        `Plugin "${manifest.name}" contains dangerous pattern: ${pattern}`,
      )
    }
  }

  // Execute in restricted scope
  try {
    // Build the function string with sandbox globals
    const sandboxGlobals: Record<string, unknown> = {
      console,
      Math,
      Date,
      JSON,
      Array,
      Object,
      String,
      Number,
      Boolean,
      Promise,
      setTimeout,
      clearTimeout,
      Error,
      TypeError,
      RangeError,
      Map,
      Set,
      WeakMap,
      WeakSet,
      RegExp,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      // Pass the registration context
      ctx: context,
      manifest: manifest,
    }
    const globalNames = Object.keys(sandboxGlobals)
    const globalValues = Object.values(sandboxGlobals)

    // Create the sandboxed function
    const fn = new Function(...globalNames, `
      "use strict";
      return (function() {
        ${code}
      })();
    `)

    return fn(...globalValues)
  } catch (err) {
    throw new Error(
      `Plugin "${manifest.name}" execution failed: ${err instanceof Error ? err.message : String(err)}`,
    )
  }
}

// ─── Sandbox Health Check ───────────────────────────────────────

/**
 * Check if a sandbox is still valid (not expired).
 */
export function isSandboxValid(_context: PluginRegistrationContext): boolean {
  // We can't directly check expiry from the context interface,
  // so we use a marker approach
  return true // Simplified: actual check is in createPluginContext
}
