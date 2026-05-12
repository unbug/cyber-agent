/**
 * v2.0 — DatasetPanel component
 *
 * Manages episodes and datasets in the simulator.
 * Shows episode list, allows naming, tagging, exporting to `.cybertrace`,
 * and one-click upload to HuggingFace Hub.
 */

import { useState, useCallback } from 'react'
import {
  FolderOpen,
  Download,
  Upload,
  Trash2,
  FileText,
  Eye,
  EyeOff,
  Check,
  X,
} from 'lucide-react'
import type { EpisodeMeta, Dataset } from './recorder'
import { uploadToHub, checkHubToken } from './upload'
import styles from './DatasetPanel.module.css'

// ─── Types ─────────────────────────────────────────────────────

interface DatasetPanelProps {
  /** Whether to show the panel */
  visible: boolean
  /** Datasets from the recorder */
  datasets: Map<string, Dataset>
  /** All episodes */
  episodes: EpisodeMeta[]
  /** Export current episode as cybertrace */
  onExportCyberTrace: () => string
  /** Export a specific episode */
  onExportEpisode: (episodeId: string) => string
  /** Export a dataset */
  onExportDataset: (datasetName: string) => string
  /** Delete an episode */
  onDeleteEpisode: (episodeId: string) => void
  /** Delete a dataset */
  onDeleteDataset: (datasetName: string) => void
  /** Close panel */
  onClose: () => void
}

// ─── Component ─────────────────────────────────────────────────

export function DatasetPanel({
  visible,
  datasets,
  episodes,
  onExportCyberTrace,
  onExportEpisode,
  onExportDataset,
  onDeleteEpisode,
  onDeleteDataset,
  onClose,
}: DatasetPanelProps) {
  const [activeTab, setActiveTab] = useState<'episodes' | 'datasets'>('episodes')
  const [selectedEpisode, setSelectedEpisode] = useState<string | null>(null)
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null)
  const [hfToken, setHfToken] = useState('')
  const [hfRepoId, setHfRepoId] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null)
  const [showToken, setShowToken] = useState(false)
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)
  const [_newDatasetName, _setNewDatasetName] = useState('')
  const [_showNewDataset, _setShowNewDataset] = useState(false)

  if (!visible) return null

  const handleExport = useCallback(() => {
    const content = selectedEpisode
      ? onExportEpisode(selectedEpisode)
      : onExportCyberTrace()
    if (!content) return

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const filename = selectedEpisode
      ? `episode-${selectedEpisode}.cybertrace`
      : `dataset.cybertrace`
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }, [selectedEpisode, onExportCyberTrace, onExportEpisode])

  const handleHubUpload = useCallback(async () => {
    if (!hfToken || !hfRepoId) return

    setUploading(true)
    setUploadResult(null)

    try {
      const content = selectedEpisode
        ? onExportEpisode(selectedEpisode)
        : onExportDataset(selectedDataset ?? '')

      if (!content) {
        setUploadResult({ success: false, message: 'No content to upload' })
        setUploading(false)
        return
      }

      const episode = selectedEpisode
        ? episodes.find((e) => e.id === selectedEpisode)
        : null

      const result = await uploadToHub(content, {
        repoId: hfRepoId,
        token: hfToken,
        filename: selectedEpisode
          ? `episode-${selectedEpisode}.cybertrace`
          : `dataset.cybertrace`,
        datasetName: selectedDataset ?? 'cyberagent-dataset',
        episodeId: episode?.id,
        characterId: episode?.characterId,
      })

      setUploadResult({
        success: result.success,
        message: result.success
          ? `Uploaded! ${result.url ? `View: ${result.url}` : ''}`
          : `Upload failed: ${result.error}`,
      })

      if (result.success) {
        setHfRepoId('')
      }
    } catch (err) {
      setUploadResult({
        success: false,
        message: `Upload error: ${(err as Error).message}`,
      })
    } finally {
      setUploading(false)
    }
  }, [hfToken, hfRepoId, selectedEpisode, selectedDataset, episodes, onExportEpisode, onExportDataset])

  const handleTokenCheck = useCallback(async () => {
    if (!hfToken) return
    const valid = await checkHubToken(hfToken)
    setTokenValid(valid)
  }, [hfToken])

  // handleCreateDataset and activeDataset are reserved for future use

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <h3 className={styles.title}>📁 Dataset Manager</h3>
        <button className={styles.closeBtn} onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'episodes' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('episodes')}
        >
          <FileText size={14} />
          Episodes ({episodes.length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'datasets' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('datasets')}
        >
          <FolderOpen size={14} />
          Datasets ({datasets.size})
        </button>
      </div>

      {/* Episodes tab */}
      {activeTab === 'episodes' && (
        <div className={styles.tabContent}>
          {episodes.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No episodes yet</p>
              <p className={styles.hint}>Start recording in the simulator to create episodes</p>
            </div>
          ) : (
            <div className={styles.episodeList}>
              {episodes.map((ep) => (
                <div
                  key={ep.id}
                  className={`${styles.episodeItem} ${selectedEpisode === ep.id ? styles.selected : ''}`}
                  onClick={() => setSelectedEpisode(ep.id)}
                >
                  <div className={styles.episodeInfo}>
                    <span className={styles.episodeName}>
                      {ep.label || `Episode ${ep.id.slice(0, 8)}`}
                    </span>
                    <span className={styles.episodeMeta}>
                      {ep.characterId} · {ep.stepCount} steps · {(ep.durationMs ?? 0 / 1000).toFixed(1)}s
                    </span>
                  </div>
                  <div className={styles.episodeActions}>
                    {ep.tags && ep.tags.length > 0 && (
                      <span className={styles.tagList}>
                        {ep.tags.map((tag) => (
                          <span key={tag} className={styles.tag}>
                            {tag}
                          </span>
                        ))}
                      </span>
                    )}
                    <button
                      className={styles.actionBtn}
                      title="Export as .cybertrace"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedEpisode(ep.id)
                      }}
                    >
                      <Download size={14} />
                    </button>
                    <button
                      className={`${styles.actionBtn} ${styles.deleteBtn}`}
                      title="Delete episode"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteEpisode(ep.id)
                        if (selectedEpisode === ep.id) setSelectedEpisode(null)
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Datasets tab */}
      {activeTab === 'datasets' && (
        <div className={styles.tabContent}>
          {datasets.size === 0 ? (
            <div className={styles.emptyState}>
              <p>No datasets yet</p>
              <p className={styles.hint}>Episodes are automatically grouped by dataset name</p>
            </div>
          ) : (
            <div className={styles.datasetList}>
              {Array.from(datasets.entries()).map(([name, dataset]) => (
                <div
                  key={name}
                  className={`${styles.datasetItem} ${selectedDataset === name ? styles.selected : ''}`}
                  onClick={() => setSelectedDataset(name)}
                >
                  <div className={styles.datasetInfo}>
                    <FolderOpen size={16} className={styles.datasetIcon} />
                    <span className={styles.datasetName}>{name}</span>
                    <span className={styles.datasetMeta}>
                      {dataset.episodes.length} episodes · {dataset.episodes.reduce((sum, ep) => sum + (ep.stepCount || 0), 0)} total steps
                    </span>
                  </div>
                  <div className={styles.datasetActions}>
                    <button
                      className={styles.actionBtn}
                      title="Export dataset"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedDataset(name)
                      }}
                    >
                      <Download size={14} />
                    </button>
                    <button
                      className={`${styles.actionBtn} ${styles.deleteBtn}`}
                      title="Delete dataset"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteDataset(name)
                        if (selectedDataset === name) setSelectedDataset(null)
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Export & Upload section */}
      {(selectedEpisode || selectedDataset) && (
        <div className={styles.exportSection}>
          <div className={styles.exportHeader}>
            <h4 className={styles.exportTitle}>
              {selectedEpisode ? '📄 Episode' : '📁 Dataset'}: {selectedEpisode?.slice(0, 8) ?? selectedDataset}
            </h4>
            <button className={styles.exportBtn} onClick={handleExport}>
              <Download size={14} />
              Export .cybertrace
            </button>
          </div>

          {/* HuggingFace Hub upload */}
          <div className={styles.hubSection}>
            <div className={styles.hubHeader}>
              <Upload size={16} className={styles.hubIcon} />
              <span className={styles.hubTitle}>Upload to HuggingFace Hub</span>
            </div>

            <div className={styles.hubInputs}>
              <div className={styles.tokenField}>
                <label className={styles.fieldLabel}>API Token</label>
                <div className={styles.tokenInput}>
                  <input
                    type={showToken ? 'text' : 'password'}
                    className={styles.tokenInputField}
                    placeholder="hf_..."
                    value={hfToken}
                    onChange={(e) => setHfToken(e.target.value)}
                  />
                  <button
                    className={styles.tokenToggle}
                    onClick={() => setShowToken(!showToken)}
                    title={showToken ? 'Hide token' : 'Show token'}
                  >
                    {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button
                    className={`${styles.checkBtn} ${tokenValid === true ? styles.valid : tokenValid === false ? styles.invalid : ''}`}
                    onClick={handleTokenCheck}
                    title="Check token"
                  >
                    {tokenValid === true ? <Check size={14} /> : <X size={14} />}
                  </button>
                </div>
              </div>

              <div className={styles.repoField}>
                <label className={styles.fieldLabel}>Repo ID</label>
                <input
                  className={styles.repoInput}
                  placeholder="username/my-dataset"
                  value={hfRepoId}
                  onChange={(e) => setHfRepoId(e.target.value)}
                />
              </div>
            </div>

            <button
              className={`${styles.uploadBtn} ${uploading ? styles.uploading : ''}`}
              onClick={handleHubUpload}
              disabled={uploading || !hfToken || !hfRepoId}
            >
              {uploading ? 'Uploading...' : 'Upload to Hub'}
            </button>

            {uploadResult && (
              <div className={`${styles.uploadResult} ${uploadResult.success ? styles.success : styles.error}`}>
                {uploadResult.message}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
