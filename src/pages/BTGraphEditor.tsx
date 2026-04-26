import { useEffect, useState, useMemo } from 'react'
import type { BTEditionNode } from '../engine/types'
import { getActionRegistry, getConditionRegistry } from '../engine/executor'
import type { RobotCapabilities } from '../engine/types'
import { isNodeCompatible } from '../engine/types'
import styles from './BTGraphEditor.module.css'

interface PaletteItem {
  label: string
  type: string
  description: string
}

const typeLabel: Record<string, string> = {
  sequence: 'Sequence', selector: 'Selector', parallel: 'Parallel',
  inverter: 'Inverter', repeater: 'Repeater', cooldown: 'Cooldown',
  action: 'Action', condition: 'Condition'
}

const NodePalette = ({
  capabilities = null,
}: {
  capabilities?: RobotCapabilities | null
}) => {
  const [items, setItems] = useState<PaletteItem[]>([])

  useEffect(() => {
    const actionMap = getActionRegistry()
    const conditionMap = getConditionRegistry()
    const results: PaletteItem[] = []

    // Composite
    for (const t of ['sequence', 'selector', 'parallel'] as const) {
      results.push({ label: typeLabel[t]!, type: t, description: t })
    }
    // Decorator
    for (const t of ['inverter', 'repeater', 'cooldown'] as const) {
      results.push({ label: typeLabel[t]!, type: t, description: t })
    }
    // Actions — filter by adapter capabilities
    for (const [name] of actionMap) {
      const compatible = capabilities == null || isNodeCompatible('action', capabilities)
      results.push({ label: name, type: 'action', description: compatible ? 'Built-in action' : 'Not supported by this adapter' })
    }
    // Conditions — always compatible
    for (const [name] of conditionMap) {
      results.push({ label: name, type: 'condition', description: 'Built-in condition' })
    }
    setItems(results)
  }, [capabilities])

  const grouped = useMemo(() => {
    const groups: { name: string; items: PaletteItem[] }[] = [
      { name: 'Composite', items: items.filter(i => ['sequence', 'selector', 'parallel'].includes(i.type)) },
      { name: 'Decorator', items: items.filter(i => ['inverter', 'repeater', 'cooldown'].includes(i.type)) },
      { name: 'Actions', items: items.filter(i => i.type === 'action') },
      { name: 'Conditions', items: items.filter(i => i.type === 'condition') }
    ]
    return groups.filter(g => g.items.length > 0)
  }, [items])

  return (
    <div className={styles.palette}>
      {grouped.map(({ name: category, items: groupItems }) => (
        <div key={category} className={styles.paletteCategory}>
          <div className={styles.paletteCategoryTitle}>{category}</div>
          {groupItems.map(item => (
            <button
              key={item.label}
              className={styles.paletteNode}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/json', JSON.stringify(item))
                e.dataTransfer.effectAllowed = 'copy'
              }}
            >
              <div>{item.label}</div>
              <div style={{ fontSize: '0.6875rem', opacity: 0.6, marginTop: '2px' }}>{item.description}</div>
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}

const BTEditionNodeEditor = ({
  node,
  onUpdate,
  onDelete,
  onAddChild,
}: {
  node: BTEditionNode
  onUpdate: (updated: BTEditionNode) => void
  onDelete: () => void
  onAddChild: () => void
}) => {
  const [editMode, setEditMode] = useState(false)
  const [argsText, setArgsText] = useState('')
  const [editValue, setEditValue] = useState('')

  useEffect(() => {
    if (node.type === 'condition') {
      setEditValue(node.condition || '')
    } else if (node.type === 'action') {
      setEditValue(node.name || '')
    } else {
      setArgsText(typeof node.args === 'object' && node.args !== null ? JSON.stringify(node.args, null, 2) : '')
    }
  }, [node])

  const handleEditValueChange = () => {
    try {
      const newArgs = editValue.trim() ? JSON.parse(editValue) : {}
      if (node.type === 'condition') {
        onUpdate({ ...node, condition: editValue })
      } else if (node.type === 'action') {
        onUpdate({ ...node, name: editValue })
      } else {
        onUpdate({ ...node, args: newArgs })
      }
      setEditMode(false)
    } catch {
      // Invalid JSON, keep old value
    }
  }

  const renderNodeContent = () => {
    const common = (label: string) => (
      <>
        <span className={`${styles.nodeLabel} ${styles['nodeLabel--strong']}`}>{label}:</span>
        <span className={`${styles.nodeLabel} ${styles['nodeLabel--dim']}`}>{node.type}</span>
        {node.args && <span className={`${styles.nodeLabel} ${styles['nodeLabel--args']}`}> (args)</span>}
      </>
    )

    switch (node.type) {
      case 'root':
        return common('Root')
      case 'sequence':
        return common('Sequence')
      case 'selector':
        return common('Selector')
      case 'parallel':
        return common('Parallel')
      case 'inverter':
        return common('Inverter')
      case 'repeater':
        return common('Repeater')
      case 'cooldown':
        return common('Cooldown')
      case 'condition':
        return (
          <div className={styles.nodeLabel}>
            {common('Condition')}
            <button
              className={`${styles.nodeActionBtn} ${styles['nodeActionBtn--edit']}`}
              onClick={() => setEditMode(true)}
            >
              Edit
            </button>
          </div>
        )
      case 'action':
        return (
          <div className={styles.nodeLabel}>
            {common('Action')}
            <span className={styles['nodeLabel--action']}>{node.name || ''}</span>
            <button
              className={`${styles.nodeActionBtn} ${styles['nodeActionBtn--edit']}`}
              onClick={() => setEditMode(true)}
            >
              Edit
            </button>
          </div>
        )
      case 'wait':
        return common('Wait')
      default:
        return <span>Unknown node type</span>
    }
  }

  if (editMode) {
    if (node.type === 'condition' || node.type === 'action') {
      return (
        <div className={styles.editMode}>
          <input
            className={styles.editInput}
            placeholder={node.type === 'condition' ? 'conditionName(args)' : 'name'}
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            autoFocus
          />
          <div className={styles.editActions}>
            <button
              className={`${styles.editBtn} ${styles['editBtn--save']}`}
              onClick={handleEditValueChange}
            >
              OK
            </button>
            <button
              className={`${styles.editBtn} ${styles['editBtn--cancel']}`}
              onClick={() => setEditMode(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className={styles.editMode}>
        <textarea
          className={styles.editTextarea}
          value={argsText}
          onChange={e => setArgsText(e.target.value)}
          placeholder='{"example": "args"}'
        />
        <div className={styles.editActions}>
          <button
            className={`${styles.editBtn} ${styles['editBtn--save']}`}
            onClick={handleEditValueChange}
          >
            OK
          </button>
          <button
            className={`${styles.editBtn} ${styles['editBtn--cancel']}`}
            onClick={() => setEditMode(false)}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`${styles.nodeEditor} ${node.children !== undefined && node.children.length === 0 ? '' : ''}`}>
      {renderNodeContent()}
      <div className={styles.nodeActions}>
        {node.children !== undefined && node.children.length === 0 && (
          <button className={`${styles.nodeActionBtn} ${styles['nodeActionBtn--add']}`}
            onClick={onAddChild}
          >
            + Add child
          </button>
        )}
        <button
          className={`${styles.nodeActionBtn} ${styles['nodeActionBtn--edit']}`}
          onClick={() => setEditMode(true)}
        >
          {node.args ? 'Edit Args' : 'Set Args'}
        </button>
        {node.type !== 'root' && (
          <button
            className={`${styles.nodeActionBtn} ${styles['nodeActionBtn--delete']}`}
            onClick={onDelete}
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}

export default function BTGraphEditor({
  root,
  onChange,
  onSave,
  capabilities = null,
}: {
  root: BTEditionNode | null
  onChange: (newRoot: BTEditionNode | null) => void
  onSave: (bt: BTEditionNode | null) => void
  /** Adapter capabilities for palette filtering. null = default (all nodes enabled). */
  capabilities?: RobotCapabilities | null
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const deleteNode = (nodeId: string) => {
    if (root === null) return

    const deleteRecursive = (node: BTEditionNode): BTEditionNode | null => {
      if (node.id === nodeId) return null
      if (node.children !== undefined) {
        const newChildren = node.children
          .map(deleteRecursive)
          .filter((c): c is BTEditionNode => c !== null)
        if (newChildren.length !== node.children.length) {
          return { ...node, children: newChildren }
        }
        return node
      }
      return node
    }

    const filtered = deleteRecursive(root)
    onChange(filtered)
    if (selectedId === nodeId) setSelectedId(null)
  }

  const addChildToNode = (parentId: string, childType: string) => {
    const addRecursive = (node: BTEditionNode): BTEditionNode => {
      if (node.id === parentId) {
        const newNode: BTEditionNode = {
          type: childType,
          id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          children: [],
          args: {}
        }
        if (childType === 'action') newNode.name = 'moveToPointer'
        if (childType === 'condition') newNode.condition = 'isHovering'
        return { ...node, children: [...(node.children || []), newNode] }
      }
      if (node.children !== undefined) {
        return { ...node, children: node.children.map(addRecursive) }
      }
      return node
    }

    const newRoot = addRecursive(root || { type: 'root', id: 'root', children: [], args: {} })
    onChange(newRoot)
  }

  const updateNodeArgs = (nodeId: string, updated: BTEditionNode) => {
    const updateRecursive = (node: BTEditionNode): BTEditionNode => {
      if (node.id === nodeId) return updated
      if (node.children !== undefined) {
        return { ...node, children: node.children.map(updateRecursive) }
      }
      return node
    }
    const newRoot = updateRecursive(root || { type: 'root', id: 'root', children: [], args: {} })
    onChange(newRoot)
  }

  const countChildren = (node: BTEditionNode): number => {
    return (node.children?.length || 0) + (node.children?.reduce(
      (sum, child) => sum + countChildren(child),
      0
    ) || 0)
  }

  useEffect(() => {
    const saved = localStorage.getItem('cyber-agent-bt-editor')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        onChange(parsed)
      } catch (e) {
        console.error('Failed to load saved BT:', e)
      }
    }
  }, [])

  const saveToStorage = () => {
    if (root) {
      localStorage.setItem('cyber-agent-bt-editor', JSON.stringify(root))
      onSave(root)
    }
  }

  const clearEditor = () => {
    onChange(null)
    localStorage.removeItem('cyber-agent-bt-editor')
    setSelectedId(null)
  }

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <h2 className={styles.toolbarTitle}>Behavior Tree Editor</h2>
        <div className={styles.toolbarActions}>
          <button
            className={`${styles.toolbarBtn} ${styles['toolbarBtn--save']}`}
            onClick={saveToStorage}
          >
            Save
          </button>
          <button
            className={`${styles.toolbarBtn} ${styles['toolbarBtn--clear']}`}
            onClick={clearEditor}
          >
            Clear
          </button>
        </div>
      </div>

      <div className={styles.editorBody}>
        <NodePalette capabilities={capabilities} />

        <div className={styles.editorArea}>
          {root ? (
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              <BTEditionNodeEditor
                node={root}
                onUpdate={updated => {
                  onChange(updated)
                  if (root.id === selectedId) setSelectedId(null)
                }}
                onDelete={() => {
                  onChange(null)
                  setSelectedId(null)
                }}
                onAddChild={() => {
                  window.alert('Cannot add children to root directly. Add a Sequence/Selector node first.')
                }}
              />
              {root && countChildren(root) === 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <button
                    className={styles.addRootBtn}
                    onClick={() => {
                      const newNode: BTEditionNode = { type: 'sequence', id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, children: [] }
                      onChange({ ...root, id: 'root', children: [newNode] })
                      setSelectedId(newNode.id)
                    }}
                  >
                    + Add Sequence Root
                  </button>
                </div>
              )}

              <BTTreeRecursive
                node={root}
                selectedId={selectedId}
                setSelectedId={setSelectedId}
                onSelect={(id: string) => setSelectedId(id)}
                onAddChild={(parent: string, type: string) => addChildToNode(parent, type)}
                onDelete={(nodeId: string) => deleteNode(nodeId)}
                onUpdateArgs={(nodeId: string, updated: BTEditionNode) => updateNodeArgs(nodeId, updated)}
              />
            </div>
          ) : (
            <div className={styles.emptyState}>
              <p>🎯 Start by dragging nodes from the palette on the left.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const BTTreeRecursive = ({
  node,
  selectedId,
  setSelectedId,
  onSelect,
  onAddChild,
  onDelete,
  onUpdateArgs,
}: {
  node: BTEditionNode
  selectedId: string | null
  setSelectedId: (id: string) => void
  onSelect: (id: string) => void
  onAddChild: (parentId: string, type: string) => void
  onDelete: (nodeId: string) => void
  onUpdateArgs: (nodeId: string, updated: BTEditionNode) => void
}) => {
  const isSelected = node.id === selectedId
  const handleAddChild = (type: string) => onAddChild(node.id, type)
  const handleDelete = () => { if (node.type !== 'root') onDelete(node.id) }
  const handleUpdateArgs = (updated: BTEditionNode) => onUpdateArgs(node.id, updated)

  const bgStyle = isSelected ? { background: 'var(--bg-elevated)' } : {}
  const borderStyle = isSelected ? { border: '2px solid var(--accent)' } : {}

  return (
    <div className={styles.treeNode} style={{ ...bgStyle, ...borderStyle, borderRadius: '0.375rem', marginBottom: '0.5rem', padding: '0.5rem', background: bgStyle.background || 'var(--bg-surface)', border: borderStyle.border || '1px solid var(--border)' }}>
      <BTEditionNodeEditor node={node} onUpdate={handleUpdateArgs} onDelete={handleDelete} onAddChild={() => handleAddChild('sequence')} />

      {node.children !== undefined && node.children.length > 0 && (
        <div style={{ marginLeft: '1.5rem', padding: '0.5rem' }}>
          {node.children.map(child => (
            <BTTreeRecursive
              key={child.id}
              node={child}
              selectedId={selectedId}
              setSelectedId={setSelectedId}
              onSelect={onSelect}
              onAddChild={onAddChild}
              onDelete={onDelete}
              onUpdateArgs={onUpdateArgs}
            />
          ))}
        </div>
      )}

      {node.children !== undefined && node.children.length === 0 && node.type !== 'root' && (
        <div className={styles.emptyChildren}>
          <span className={styles.emptyChildrenText}>No children. Add:</span>
          <div className={styles.emptyChildrenActions}>
            <button className={`${styles.emptyChildBtn} ${styles['emptyChildBtn--sequence']}`} onClick={() => handleAddChild('sequence')}>Sequence</button>
            <button className={`${styles.emptyChildBtn} ${styles['emptyChildBtn--selector']}`} onClick={() => handleAddChild('selector')}>Selector</button>
            <button className={`${styles.emptyChildBtn} ${styles['emptyChildBtn--action']}`} onClick={() => handleAddChild('action')}>Action</button>
            <button className={`${styles.emptyChildBtn} ${styles['emptyChildBtn--condition']}`} onClick={() => handleAddChild('condition')}>Condition</button>
          </div>
        </div>
      )}
    </div>
  )
}
