/**
 * v2.0 — Dataset recorder tests
 *
 * Tests for the EpisodeRecorder: episode lifecycle, cybertrace export,
 * dataset management, and hub upload utilities.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EpisodeRecorder } from './recorder'
import { uploadToHub, checkHubToken, uploadDatasetFiles } from './upload'
import { SimEngine } from '@/sim/engine'
import type { SimBody } from '@/sim/types'

// ─── EpisodeRecorder tests ─────────────────────────────────────

describe('EpisodeRecorder', () => {
  let engine: SimEngine
  let recorder: EpisodeRecorder

  beforeEach(() => {
    engine = new SimEngine()
    recorder = new EpisodeRecorder(engine)
  })

  it('starts recording and creates an episode', () => {
    const ep = recorder.startEpisode('test-char', 'test-dataset')
    expect(recorder.isRecording).toBe(true)
    expect(ep.characterId).toBe('test-char')
    expect(ep.datasetName).toBe('test-dataset')
    expect(ep.recordedAt).toBeGreaterThan(0)
    expect(ep.stepCount).toBe(0)
  })

  it('records steps and finalizes on stop', () => {
    const body: SimBody = {
      id: 'robot',
      pos: { x: 100, y: 100 },
      vel: { vx: 1, vy: 0 },
      orientation: 0,
      angVel: 0,
      radius: 20,
      mass: 1,
      linearDamping: 0.95,
      angularDamping: 0.9,
      color: '#6366f1',
      trail: [],
      trailMax: 50,
    }
    engine.addBody(body)

    const ep = recorder.startEpisode('test-char', 'test-dataset')
    const step = engine.step([])
    recorder.recordStep(step)

    expect(ep.stepCount).toBe(1)
    expect(recorder.getRun()?.stepCount).toBe(1)

    const finalized = recorder.stopEpisode()
    expect(recorder.isRecording).toBe(false)
    expect(finalized).not.toBeNull()
    expect(finalized!.endedAt).toBeGreaterThan(0)
    expect(finalized!.durationMs).toBeGreaterThanOrEqual(0)
  })

  it('pauses and resumes recording', () => {
    recorder.startEpisode('test-char', 'test-dataset')
    const body: SimBody = {
      id: 'robot',
      pos: { x: 0, y: 0 },
      vel: { vx: 0, vy: 0 },
      orientation: 0,
      angVel: 0,
      radius: 20,
      mass: 1,
      linearDamping: 0.95,
      angularDamping: 0.9,
      color: '#6366f1',
      trail: [],
      trailMax: 50,
    }
    engine.addBody(body)

    recorder.pause()
    const step = engine.step([])
    recorder.recordStep(step)
    // Paused — step should not increment
    expect(recorder.getRun()?.stepCount).toBe(0)

    recorder.resume()
    const step2 = engine.step([])
    recorder.recordStep(step2)
    expect(recorder.getRun()?.stepCount).toBe(1)

    recorder.stopEpisode()
  })

  it('exports cybertrace with correct schema header', () => {
    const body: SimBody = {
      id: 'robot',
      pos: { x: 0, y: 0 },
      vel: { vx: 0, vy: 0 },
      orientation: 0,
      angVel: 0,
      radius: 20,
      mass: 1,
      linearDamping: 0.95,
      angularDamping: 0.9,
      color: '#6366f1',
      trail: [],
      trailMax: 50,
    }
    engine.addBody(body)

    recorder.startEpisode('test-char', 'test-dataset', { label: 'test-episode', tags: ['test'] })
    recorder.recordStep(engine.step([]))
    recorder.stopEpisode()

    const content = recorder.exportCyberTrace()
    expect(content).not.toBe('')

    const lines = content.split('\n').filter((l) => l.trim().length > 0)
    const header = JSON.parse(lines[0]!)

    expect(header.$schema).toBe('cybertrace/v1')
    expect(header.$version).toBe(1)
    expect(header.meta.character).toBe('test-char')
    expect(header.meta.dataset).toBe('test-dataset')
    expect(header.meta.label).toBe('test-episode')
    expect(header.meta.tags).toEqual(['test'])
  })

  it('groups episodes into datasets', () => {
    recorder.startEpisode('char-a', 'dataset-1', { label: 'ep1' })
    recorder.stopEpisode()

    recorder.startEpisode('char-b', 'dataset-2', { label: 'ep2' })
    recorder.stopEpisode()

    recorder.startEpisode('char-a', 'dataset-1', { label: 'ep3' })
    recorder.stopEpisode()

    expect(recorder.episodes.length).toBe(3)
    expect(recorder.datasets.size).toBe(2)

    const ds1 = recorder.datasets.get('dataset-1')
    expect(ds1).not.toBeNull()
    expect(ds1!.episodes.length).toBe(2)

    const ds2 = recorder.datasets.get('dataset-2')
    expect(ds2).not.toBeNull()
    expect(ds2!.episodes.length).toBe(1)
  })

  it('deletes an episode', () => {
    recorder.startEpisode('char-a', 'dataset-1', { label: 'ep1' })
    const ep = recorder.stopEpisode()!

    recorder.deleteEpisode(ep.id)
    expect(recorder.episodes.length).toBe(0)

    const ds = recorder.datasets.get('dataset-1')
    expect(ds!.episodes.length).toBe(0)
  })

  it('deletes a dataset', () => {
    recorder.startEpisode('char-a', 'dataset-1', { label: 'ep1' })
    recorder.stopEpisode()

    recorder.deleteDataset('dataset-1')
    expect(recorder.datasets.size).toBe(0)
    expect(recorder.episodes.length).toBe(0)
  })

  it('clears all data', () => {
    recorder.startEpisode('char-a', 'dataset-1', { label: 'ep1' })
    recorder.stopEpisode()

    recorder.clear()
    expect(recorder.episodes.length).toBe(0)
    expect(recorder.datasets.size).toBe(0)
    expect(recorder.isRecording).toBe(false)
  })
})

// ─── Hub upload tests ──────────────────────────────────────────

describe('Hub upload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uploadToHub returns success for valid upload', async () => {
    // Mock fetch for repo check (returns 404 = doesn't exist)
    let callCount = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      callCount++
      if (url.toString().includes('/api/datasets')) {
        // First call is GET to check existence (404 = not found)
        // Second call is POST to create repo (200 = success)
        if (init?.method === 'POST' || callCount > 1) {
          return {
            ok: true,
            status: 201,
            json: async () => ({ id: '123' }),
          } as Response
        }
        return {
          ok: false,
          status: 404,
          text: async () => 'Not found',
        } as Response
      }
      if (url.toString().includes('/upload_file')) {
        return {
          ok: true,
          status: 200,
        } as Response
      }
      return { ok: false } as Response
    })

    const result = await uploadToHub('test content', {
      repoId: 'testuser/test-dataset',
      token: 'hf_test_token',
      filename: 'test.cybertrace',
      datasetName: 'test-dataset',
      characterId: 'test-char',
    })

    expect(result.success).toBe(true)
    expect(result.datasetUrl).toBe('https://huggingface.co/datasets/testuser/test-dataset')
  })

  it('uploadToHub returns error for invalid token', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (url.toString().includes('/api/datasets')) {
        return {
          ok: false,
          status: 403,
          text: async () => 'Forbidden',
        } as Response
      }
      if (url.toString().includes('/upload_file')) {
        return {
          ok: false,
          status: 403,
          text: async () => 'Forbidden',
        } as Response
      }
      return { ok: false } as Response
    })

    const result = await uploadToHub('test content', {
      repoId: 'testuser/test-dataset',
      token: 'hf_bad_token',
      filename: 'test.cybertrace',
      datasetName: 'test-dataset',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Forbidden')
  })

  it('checkHubToken returns true for valid token', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (url.toString().includes('/api/whoami')) {
        return {
          ok: true,
          json: async () => ({ id: '123', name: 'test', username: 'testuser' }),
        } as Response
      }
      return { ok: false } as Response
    })

    const valid = await checkHubToken('hf_valid_token')
    expect(valid).toBe(true)
  })

  it('checkHubToken returns false for invalid token', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (url.toString().includes('/api/whoami')) {
        return {
          ok: false,
          status: 401,
        } as Response
      }
      return { ok: false } as Response
    })

    const valid = await checkHubToken('hf_invalid_token')
    expect(valid).toBe(false)
  })

  it('uploadDatasetFiles uploads multiple files', async () => {
    let callCount = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      callCount++
      if (url.toString().includes('/api/datasets')) {
        if (init?.method === 'POST' || callCount > 1) {
          return {
            ok: true,
            status: 201,
            json: async () => ({ id: '123' }),
          } as Response
        }
        return {
          ok: false,
          status: 404,
          text: async () => 'Not found',
        } as Response
      }
      if (url.toString().includes('/upload_file')) {
        return {
          ok: true,
          status: 200,
        } as Response
      }
      return { ok: false } as Response
    })

    const result = await uploadDatasetFiles(
      [
        { filename: 'episode1.cybertrace', content: 'content1' },
        { filename: 'episode2.cybertrace', content: 'content2' },
      ],
      {
        repoId: 'testuser/test-dataset',
        token: 'hf_test_token',
        datasetName: 'test-dataset',
      },
    )

    expect(result.success).toBe(true)
    expect(result.datasetUrl).toBe('https://huggingface.co/datasets/testuser/test-dataset')
  })
})
