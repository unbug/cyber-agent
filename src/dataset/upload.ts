/**
 * v2.0 — HuggingFace Hub upload for datasets
 *
 * Provides one-click upload of `.cybertrace` episodes and datasets
 * to HuggingFace Hub via the Hub API.
 *
 * Usage:
 *   import { uploadToHub } from '@/dataset/upload'
 *   await uploadToHub(traceContent, {
 *     repoId: 'username/my-dataset',
 *     token: 'hf_...',
 *     filename: 'episode-001.cybertrace',
 *     datasetName: 'my-dataset',
 *   })
 */

// ─── Types ─────────────────────────────────────────────────────

export interface HubUploadConfig {
  /** HuggingFace repo ID (e.g., "username/my-dataset") */
  repoId: string
  /** HuggingFace API token (hf_...) */
  token: string
  /** Filename to use in the repo */
  filename: string
  /** Dataset name (for metadata) */
  datasetName: string
  /** Episode ID (for metadata) */
  episodeId?: string
  /** Character ID (for metadata) */
  characterId?: string
  /** Optional: commit message */
  commitMessage?: string
  /** Optional: tags for the dataset */
  tags?: string[]
}

export interface HubUploadResult {
  success: boolean
  /** URL to the uploaded file */
  url?: string
  /** URL to the dataset page */
  datasetUrl?: string
  /** Error message if failed */
  error?: string
}

// ─── Upload function ───────────────────────────────────────────

/**
 * Upload a `.cybertrace` file to HuggingFace Hub.
 * Creates the dataset repo if it doesn't exist.
 */
export async function uploadToHub(
  content: string,
  config: HubUploadConfig,
): Promise<HubUploadResult> {
  const { repoId, token, filename, datasetName, episodeId, characterId, commitMessage, tags } = config

  try {
    // Create the dataset repo if it doesn't exist
    const repoExists = await checkRepoExists(repoId, token)

    if (!repoExists) {
      await createRepo(repoId, token, datasetName, tags ?? [])
    }

    // Upload the trace file
    const blob = new Blob([content], { type: 'text/plain' })
    const uploadUrl = `https://huggingface.co/api/datasets/${repoId}/upload_file`

    const formData = new FormData()
    formData.append('file', blob, filename)
    formData.append('repo_type', 'dataset')
    formData.append('commit_message', commitMessage ?? `Add ${filename}`)

    if (episodeId) {
      formData.append('episode_id', episodeId)
    }
    if (characterId) {
      formData.append('character_id', characterId)
    }

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        success: false,
        error: `Upload failed (${response.status}): ${errorText}`,
      }
    }

    const datasetUrl = `https://huggingface.co/datasets/${repoId}`

    return {
      success: true,
      url: `${datasetUrl}/blob/main/${filename}`,
      datasetUrl,
    }
  } catch (err) {
    return {
      success: false,
      error: `Upload error: ${(err as Error).message}`,
    }
  }
}

/**
 * Upload multiple files to a dataset repo.
 * Creates the repo if needed.
 */
export async function uploadDatasetFiles(
  files: Array<{ filename: string; content: string }>,
  config: Omit<HubUploadConfig, 'filename'>,
): Promise<HubUploadResult> {
  const { repoId, token, datasetName, tags } = config

  try {
    const repoExists = await checkRepoExists(repoId, token)

    if (!repoExists) {
      await createRepo(repoId, token, datasetName, tags ?? [])
    }

    // Upload each file
    const results: Array<{ filename: string; success: boolean; error?: string }> = []

    for (const file of files) {
      const blob = new Blob([file.content], { type: 'text/plain' })
      const formData = new FormData()
      formData.append('file', blob, file.filename)
      formData.append('repo_type', 'dataset')
      formData.append('commit_message', `Add ${file.filename}`)

      const response = await fetch(
        `https://huggingface.co/api/datasets/${repoId}/upload_file`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      )

      if (!response.ok) {
        const errorText = await response.text()
        results.push({ filename: file.filename, success: false, error: errorText })
      } else {
        results.push({ filename: file.filename, success: true })
      }
    }

    const failed = results.filter((r) => !r.success)
    if (failed.length > 0) {
      return {
        success: false,
        error: `${failed.length}/${results.length} files failed to upload`,
      }
    }

    return {
      success: true,
      datasetUrl: `https://huggingface.co/datasets/${repoId}`,
    }
  } catch (err) {
    return {
      success: false,
      error: `Dataset upload error: ${(err as Error).message}`,
    }
  }
}

// ─── Helpers ───────────────────────────────────────────────────

async function checkRepoExists(repoId: string, token: string): Promise<boolean> {
  try {
    const response = await fetch(`https://huggingface.co/api/datasets/${repoId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.ok
  } catch {
    return false
  }
}

async function createRepo(
  repoId: string,
  token: string,
  datasetName: string,
  tags: string[],
): Promise<void> {
  const response = await fetch('https://huggingface.co/api/datasets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: datasetName,
      repoId,
      private: true,
      tags: ['cyberagent', 'sim2real', 'dataset', ...tags],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to create dataset repo: ${errorText}`)
  }
}

// ─── Convenience: check HF token ───────────────────────────────

/**
 * Check if a HuggingFace token is valid.
 * Returns true if the token is valid and has read access.
 */
export async function checkHubToken(token: string): Promise<boolean> {
  try {
    const response = await fetch('https://huggingface.co/api/whoami', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.ok
  } catch {
    return false
  }
}

/**
 * Get the current user info from HuggingFace Hub.
 */
export async function getHubUserInfo(token: string): Promise<{ id: string; name: string; username: string } | null> {
  try {
    const response = await fetch('https://huggingface.co/api/whoami', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    if (!response.ok) return null
    const data = await response.json()
    return {
      id: data.id,
      name: data.name,
      username: data.username,
    }
  } catch {
    return null
  }
}
