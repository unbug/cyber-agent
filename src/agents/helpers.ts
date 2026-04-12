/**
 * Behavior Tree DSL helpers — shorthand constructors for node definitions.
 * Shared by all agent behavior definitions.
 */

import type { BehaviorNodeDef } from '../engine/types'

export const cond = (check: string, args?: Record<string, unknown>): BehaviorNodeDef =>
  ({ type: 'condition', check, args })

export const act = (action: string, args?: Record<string, unknown>): BehaviorNodeDef =>
  ({ type: 'action', action, args })

export const seq = (name: string, ...children: BehaviorNodeDef[]): BehaviorNodeDef =>
  ({ type: 'sequence', name, children })

export const sel = (name: string, ...children: BehaviorNodeDef[]): BehaviorNodeDef =>
  ({ type: 'selector', name, children })

export const wait = (ms: number): BehaviorNodeDef =>
  ({ type: 'wait', durationMs: ms })

export const cooldown = (ms: number, child: BehaviorNodeDef): BehaviorNodeDef =>
  ({ type: 'cooldown', durationMs: ms, child })

export const repeat = (count: number, child: BehaviorNodeDef): BehaviorNodeDef =>
  ({ type: 'repeater', count, child })
