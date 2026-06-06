/**
 * PluginManagerPage — Debug panel for managing and inspecting loaded plugins.
 *
 * Shows:
 *   - All loaded plugins with their manifest info
 *   - Extension counts by type (actions, conditions, adapters, etc.)
 *   - Plugin health status
 *   - Load times
 *   - Error messages
 *   - Actions: reload, unload, export manifest
 *
 * This is the debug surface required by the Plugin SDK feature:
 *   - Every plugin has a visible debug entry
 *   - Plugin state is inspectable in real-time
 *   - Plugins can be managed (loaded/unloaded) from the debug page
 */

import { useState, useEffect, useCallback } from 'react'
import { createPluginLoader, getPluginRegistry } from '@cyber-agent/sdk/plugin'
import type { PluginManifest, PluginType, PluginDebugInfo } from '@cyber-agent/sdk/plugin'
import styles from './PluginManagerPage.module.css'



// ─── Plugin type display helpers ────────────────────────────────

const TYPE_ICONS: Record<PluginType, string> = {
  'bt-node': '🌳',
  'adapter': '🤖',
  'sensor': '📡',
  'hook': '🪝',
  'character': '🎭',
}

const TYPE_COLORS: Record<PluginType, string> = {
  'bt-node': '#8b5cf6',
  'adapter': '#3b82f6',
  'sensor': '#10b981',
  'hook': '#f59e0b',
  'character': '#ec4899',
}

const TYPE_LABELS: Record<PluginType, string> = {
  'bt-node': 'BT Node',
  'adapter': 'Adapter',
  'sensor': 'Sensor',
  'hook': 'Hook',
  'character': 'Character',
}

// ─── Component ──────────────────────────────────────────────────

export function PluginManagerPage() {
  const [selectedPlugin, setSelectedPlugin] = useState<PluginDebugInfo | null>(null)
  const [filterType, setFilterType] = useState<PluginType | 'all'>('all')
  const [manifestInput, setManifestInput] = useState('')
  const [manifestError, setManifestError] = useState<string | null>(null)
  const [manifestSuccess, setManifestSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [plugins, setPlugins] = useState<PluginDebugInfo[]>([])

  const loader = createPluginLoader()
  const registry = getPluginRegistry()

  // Load plugins on mount
  useEffect(() => {
    refreshPlugins()
  }, [])

  const refreshPlugins = useCallback(() => {
    setPlugins(loader.getPluginDebugInfo())
  }, [loader])

  const filteredPlugins = filterType === 'all'
    ? plugins
    : plugins.filter((p) => p.manifest.type === filterType)

  const handleLoadManifest = useCallback(async () => {
    setManifestError(null)
    setManifestSuccess(null)
    setIsLoading(true)

    try {
      const manifest: PluginManifest = JSON.parse(manifestInput)
      await loader.loadManifest(manifest)
      setManifestSuccess(`Plugin "${manifest.name}" loaded successfully`)
      refreshPlugins()
      setManifestInput('')
    } catch (err) {
      setManifestError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoading(false)
    }
  }, [manifestInput, loader, refreshPlugins])

  const handleUnload = useCallback(
    (name: string) => {
      registry.unload(name)
      refreshPlugins()
    },
    [registry, refreshPlugins],
  )

  const handleExportManifest = useCallback((manifest: PluginManifest) => {
    const json = JSON.stringify(manifest, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${manifest.name}-manifest.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const handleShowDetails = useCallback((plugin: PluginDebugInfo) => {
    setSelectedPlugin(selectedPlugin?.manifest.name === plugin.manifest.name ? null : plugin)
  }, [selectedPlugin])

  // Count plugins by type
  const typeCounts = { all: plugins.length } as Record<string, number>
  for (const p of plugins) {
    typeCounts[p.manifest.type] = (typeCounts[p.manifest.type] || 0) + 1
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>
          <span className={styles.icon}>🧩</span>
          Plugin Manager
        </h2>
        <p className={styles.subtitle}>
          Manage and inspect loaded plugins. Load custom BT nodes, adapters, sensors, and characters.
        </p>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{plugins.length}</span>
          <span className={styles.statLabel}>Total</span>
        </div>
        {Object.entries(typeCounts)
          .filter(([, count]) => count > 0)
          .map(([type, count]) => (
            <div
              key={type}
              className={styles.stat}
              style={{ borderColor: type === 'all' ? '#6b7280' : TYPE_COLORS[type as PluginType] }}
            >
              <span className={styles.statValue}>{count}</span>
              <span className={styles.statLabel}>{type === 'all' ? 'Total' : TYPE_LABELS[type as PluginType]}</span>
            </div>
          ))}
      </div>

      {/* Filter */}
      <div className={styles.filterBar}>
        <button
          className={`${styles.filterBtn} ${filterType === 'all' ? styles.filterBtnActive : ''}`}
          onClick={() => setFilterType('all')}
        >
          All ({typeCounts.all})
        </button>
        {(['bt-node', 'adapter', 'sensor', 'hook', 'character'] as PluginType[]).map((type) => (
          <button
            key={type}
            className={`${styles.filterBtn} ${filterType === type ? styles.filterBtnActive : ''}`}
            onClick={() => setFilterType(type)}
            style={{
              borderColor: filterType === type ? TYPE_COLORS[type] : undefined,
              color: filterType === type ? TYPE_COLORS[type] : undefined,
            }}
          >
            {TYPE_ICONS[type]} {TYPE_LABELS[type]} ({typeCounts[type] || 0})
          </button>
        ))}
      </div>

      {/* Plugin List */}
      <div className={styles.pluginList}>
        {filteredPlugins.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>📦</span>
            <p>No plugins loaded.</p>
            <p className={styles.emptyHint}>
              Load a plugin manifest below to get started.
            </p>
          </div>
        ) : (
          filteredPlugins.map((plugin) => (
            <div
              key={plugin.manifest.name}
              className={`${styles.pluginCard} ${selectedPlugin?.manifest.name === plugin.manifest.name ? styles.pluginCardSelected : ''}`}
              onClick={() => handleShowDetails(plugin)}
            >
              <div className={styles.pluginCardHeader}>
                <span
                  className={styles.pluginTypeBadge}
                  style={{ backgroundColor: TYPE_COLORS[plugin.manifest.type] }}
                >
                  {TYPE_ICONS[plugin.manifest.type]} {TYPE_LABELS[plugin.manifest.type]}
                </span>
                <span className={styles.pluginName}>{plugin.manifest.name}</span>
                <span className={styles.pluginVersion}>{plugin.manifest.version}</span>
                <span className={styles.pluginHealth}>
                  {plugin.health === 'healthy' ? '✅' : plugin.health === 'degraded' ? '⚠️' : '❌'}
                </span>
              </div>
              <div className={styles.pluginCardBody}>
                <p className={styles.pluginDescription}>{plugin.manifest.description}</p>
                <div className={styles.pluginExtensions}>
                  {Object.entries(plugin.extensionCount).map(([type, count]) => (
                    <span key={type} className={styles.extensionBadge}>
                      {type}: {count}
                    </span>
                  ))}
                </div>
                {plugin.lastError && (
                  <div className={styles.pluginError}>
                    ⚠️ {plugin.lastError}
                  </div>
                )}
              </div>
              <div className={styles.pluginCardActions}>
                <button
                  className={styles.actionBtn}
                  onClick={(e) => { e.stopPropagation(); handleUnload(plugin.manifest.name) }}
                >
                  Unload
                </button>
                <button
                  className={styles.actionBtn}
                  onClick={(e) => { e.stopPropagation(); handleExportManifest(plugin.manifest) }}
                >
                  Export
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Load Plugin Form */}
      <div className={styles.loadForm}>
        <h3 className={styles.formTitle}>Load Plugin</h3>
        <textarea
          className={styles.manifestInput}
          placeholder='{"name": "my-plugin", "version": "1.0.0", "type": "bt-node", "description": "My custom plugin", "author": "Your Name", "license": "MIT", "apiVersion": "3.0", "entryPoint": "myPlugin"}'
          value={manifestInput}
          onChange={(e) => setManifestInput(e.target.value)}
          rows={8}
        />
        <div className={styles.formActions}>
          <button
            className={`${styles.loadBtn} ${isLoading ? styles.loadBtnLoading : ''}`}
            onClick={handleLoadManifest}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Load Plugin'}
          </button>
          {manifestError && <span className={styles.formError}>{manifestError}</span>}
          {manifestSuccess && <span className={styles.formSuccess}>{manifestSuccess}</span>}
        </div>
      </div>

      {/* Selected Plugin Details */}
      {selectedPlugin && (
        <div className={styles.detailsPanel}>
          <h3 className={styles.detailsTitle}>
            Plugin Details: {selectedPlugin.manifest.name}
          </h3>
          <div className={styles.detailsGrid}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Version</span>
              <span className={styles.detailValue}>{selectedPlugin.manifest.version}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Type</span>
              <span className={styles.detailValue}>
                {TYPE_ICONS[selectedPlugin.manifest.type]} {TYPE_LABELS[selectedPlugin.manifest.type]}
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Author</span>
              <span className={styles.detailValue}>{selectedPlugin.manifest.author}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>License</span>
              <span className={styles.detailValue}>{selectedPlugin.manifest.license}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>API Version</span>
              <span className={styles.detailValue}>{selectedPlugin.manifest.apiVersion}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Loaded</span>
              <span className={styles.detailValue}>
                {selectedPlugin.loaded ? '✅ Yes' : '❌ No'}
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Load Time</span>
              <span className={styles.detailValue}>{loader.getLoadTime(selectedPlugin.manifest.name)}ms</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Health</span>
              <span className={styles.detailValue}>
                {selectedPlugin.health === 'healthy' ? '✅ Healthy' : selectedPlugin.health === 'degraded' ? '⚠️ Degraded' : '❌ Unhealthy'}
              </span>
            </div>
          </div>
          {selectedPlugin.manifest.dependencies && selectedPlugin.manifest.dependencies.length > 0 && (
            <div className={styles.detailSection}>
              <span className={styles.detailLabel}>Dependencies</span>
              <div className={styles.detailValues}>
                {selectedPlugin.manifest.dependencies.map((dep) => (
                  <span key={dep} className={styles.dependencyBadge}>{dep}</span>
                ))}
              </div>
            </div>
          )}
          {selectedPlugin.manifest.requiredCapabilities && selectedPlugin.manifest.requiredCapabilities.length > 0 && (
            <div className={styles.detailSection}>
              <span className={styles.detailLabel}>Required Capabilities</span>
              <div className={styles.detailValues}>
                {selectedPlugin.manifest.requiredCapabilities.map((cap) => (
                  <span key={cap} className={styles.capabilityBadge}>{cap}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
