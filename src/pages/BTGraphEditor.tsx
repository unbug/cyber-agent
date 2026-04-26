import { useEffect, useState, useMemo, useCallback } from 'react'
import type { BTEditionNode } from '../engine/types'
import { getActionRegistry, getConditionRegistry } from '../engine/executor'
import type { RobotCapabilities } from '../engine/types'
import styles from './BTGraphEditor.module.css'

// ─── Type helpers ─────────────────────────────────────────────

const TYPE_BADGE: Record<string, string> = {
  sequence: 'SEQ', selector: 'SEL', parallel: 'PAR',
  inverter: 'INV', repeater: 'RPT', cooldown: 'CDN',
  action: 'ACT', condition: 'CND', root: 'ROOT',
}

const TYPE_VARIANT: Record<string, string> = {
  sequence: 'success', selector: 'accent', parallel: 'warning',
  inverter: 'muted',   repeater: 'muted',  cooldown: 'muted',
  action: 'accent', condition: 'success', root: 'muted',
}

const COMPOSITE_TYPES = ['sequence', 'selector', 'parallel']
const DECORATOR_TYPES = ['inverter', 'repeater', 'cooldown']

function acceptsChildren(type: string) {
  return COMPOSITE_TYPES.includes(type) || DECORATOR_TYPES.includes(type) || type === 'root'
}

function makeNode(type: string, name?: string, condition?: string): BTEditionNode {
  const id = `node_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
  const node: BTEditionNode = { type, id, children: [] }
  if (type === 'action') node.name = name || 'idle'
  if (type === 'condition') node.condition = condition || 'isNear'
  return node
}

function findNode(node: BTEditionNode, id: string): BTEditionNode | null {
  if (node.id === id) return node
  for (const child of (node.children || [])) {
    const found = findNode(child, id)
    if (found) return found
  }
  if (node.child) return findNode(node.child, id)
  return null
}

// ─── Palette ──────────────────────────────────────────────────

type PaletteEntry = { label: string; type: string; value?: string }

function NodePalette({
  capabilities: _capabilities,
  onAdd,
}: {
  capabilities?: RobotCapabilities | null
  onAdd: (entry: PaletteEntry) => void
}) {
  const [actions, setActions] = useState<string[]>([])
  const [conditions, setConditions] = useState<string[]>([])

  useEffect(() => {
    setActions([...getActionRegistry().keys()])
    setConditions([...getConditionRegistry().keys()])
  }, [])

  const sections = useMemo(() => [
    {
      name: 'Composite',
      items: COMPOSITE_TYPES.map(t => ({ label: t, type: t })),
    },
    {
      name: 'Decorator',
      items: DECORATOR_TYPES.map(t => ({ label: t, type: t })),
    },
    {
      name: 'Actions',
      items: actions.map(a => ({ label: a, type: 'action', value: a })),
    },
    {
      name: 'Conditions',
      items: conditions.map(c => ({ label: c, type: 'condition', value: c })),
    },
  ].filter(s => s.items.length > 0), [actions, conditions])

  return (
    <aside className={styles.palette}>
      <div className={styles.paletteHint}>Click to add to selected node</div>
      {sections.map(({ name: sectionName, items }) => (
        <div key={sectionName} className={styles.paletteSection}>
          <div className={styles.paletteSectionTitle}>{sectionName}</div>
          {items.map(item => (
            <button
              key={item.label}
              className={styles.paletteItem}
              onClick={() => onAdd(item)}
            >
              <span className={`${styles.badge} ${styles[`badge--${TYPE_VARIANT[item.type] || 'muted'}`]}`}>
                {TYPE_BADGE[item.type] || item.type.slice(0, 3).toUpperCase()}
              </span>
              <span className={styles.paletteItemLabel}>{item.label}</span>
            </button>
          ))}
        </div>
      ))}
    </aside>
  )
}

// ─── Tree Node ────────────────────────────────────────────────

function TreeNode({
  node,
  depth = 0,
  selectedId,
  onSelect,
  onUpdate,
  onDelete,
  onAddChild,
}: {
  node: BTEditionNode
  depth?: number
  selectedId: string | null
  onSelect: (id: string) => void
  onUpdate: (id: string, updated: BTEditionNode) => void
  onDelete: (id: string) => void
  onAddChild: (parentId: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editVal, setEditVal] = useState('')

  const isSelected = node.id === selectedId
  const canDelete = node.type !== 'root' && node.id !== 'root'
  const hasChildren = (node.children?.length ?? 0) > 0

  const displayValue =
    node.type === 'action' ? (node.name || '—')
    : node.type === 'condition' ? (node.condition || '—')
    : null

  const startEdit = () => {
    setEditVal(displayValue || '')
    setEditing(true)
  }

  const commitEdit = () => {
    if (node.type === 'action') {
      onUpdate(node.id, { ...node, name: editVal.trim() || 'idle' })
    } else if (node.type === 'condition') {
      onUpdate(node.id, { ...node, condition: editVal.trim() || 'isNear' })
    }
    setEditing(false)
  }

  const variant = TYPE_VARIANT[node.type] || 'muted'

  return (
    <div className={styles.treeNodeWrap}>
      <div
        className={`${styles.treeNode} ${isSelected ? styles['treeNode--selected'] : ''}`}
        onClick={() => onSelect(node.id)}
      >
        <div className={styles.nodeLeft}>
          <span className={`${styles.badge} ${styles[`badge--${variant}`]}`}>
            {TYPE_BADGE[node.type] || node.type.slice(0, 3).toUpperCase()}
          </span>
          {editing ? (
            <input
              className={styles.inlineInput}
              value={editVal}
              onChange={e => setEditVal(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={e => {
                if (e.key === 'Enter') commitEdit()
                if (e.key === 'Escape') setEditing(false)
              }}
              autoFocus
              onClick={e => e.stopPropagation()}
            />
          ) : displayValue != null ? (
            <button
              className={styles.nodeValue}
              onClick={e => { e.stopPropagation(); startEdit() }}
            >
              {displayValue}
            </button>
          ) : (
            <span className={styles.nodeType}>{node.type}</span>
          )}
        </div>
        <div className={styles.nodeRight}>
          {acceptsChildren(node.type) && (
            <button
              className={styles.nodeBtn}
              onClick={e => { e.stopPropagation(); onAddChild(node.id) }}
              title="Add sequence child"
            >+</button>
          )}
          {canDelete && (
            <button
              className={`${styles.nodeBtn} ${styles['nodeBtn--delete']}`}
              onClick={e => { e.stopPropagation(); onDelete(node.id) }}
              title="Delete node"
            >×</button>
          )}
        </div>
      </div>

      {hasChildren && (
        <div className={`${styles.children} ${depth > 0 ? styles.childrenIndent : ''}`}>
          {node.children!.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}

      {node.child && (
        <div className={`${styles.children} ${depth > 0 ? styles.childrenIndent : ''}`}>
          <TreeNode
            node={node.child}
            depth={depth + 1}
            selectedId={selectedId}
            onSelect={onSelect}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onAddChild={onAddChild}
          />
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────

export default function BTGraphEditor({
  root,
  onChange,
  onSave: _onSave,
  capabilities = null,
}: {
  root: BTEditionNode | null
  onChange: (newRoot: BTEditionNode | null) => void
  onSave: (bt: BTEditionNode | null) => void
  capabilities?: RobotCapabilities | null
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // ─── Tree mutation helpers ───────────────────────────────

  const mapNode = useCallback((
    node: BTEditionNode,
    fn: (n: BTEditionNode) => BTEditionNode | null,
  ): BTEditionNode | null => {
    const result = fn(node)
    if (!result) return null
    const children = result.children
      ? result.children.map(c => mapNode(c, fn)).filter((c): c is BTEditionNode => c !== null)
      : undefined
    const child = result.child ? (mapNode(result.child, fn) ?? undefined) : result.child
    return { ...result, children, child }
  }, [])

  const updateNode = useCallback((id: string, updated: BTEditionNode) => {
    if (!root) return
    onChange(mapNode(root, n => n.id === id ? updated : n))
  }, [root, onChange, mapNode])

  const deleteNode = useCallback((id: string) => {
    if (!root) return
    onChange(mapNode(root, n => n.id === id ? null : n))
    if (selectedId === id) setSelectedId(null)
  }, [root, onChange, mapNode, selectedId])

  const addChildToNode = useCallback((parentId: string, entry: PaletteEntry) => {
    if (!root) return
    const newNode = makeNode(
      entry.type,
      entry.type === 'action' ? entry.value : undefined,
      entry.type === 'condition' ? entry.value : undefined,
    )
    const newRoot = mapNode(root, n => {
      if (n.id !== parentId) return n
      return { ...n, children: [...(n.children || []), newNode] }
    })
    onChange(newRoot)
    setSelectedId(newNode.id)
  }, [root, onChange, mapNode])

  // ─── Palette: add to selected (or root) ─────────────────

  const handlePaletteAdd = useCallback((entry: PaletteEntry) => {
    if (!root) {
      // Bootstrap a new tree
      const node = makeNode(entry.type, entry.value, entry.value)
      node.id = 'root'
      onChange(node)
      return
    }
    const target = selectedId && findNode(root, selectedId)
    const targetId = (target && acceptsChildren(target.type)) ? selectedId! : root.id
    addChildToNode(targetId, entry)
  }, [root, selectedId, onChange, addChildToNode])

  // ─── "+" button: add sequence child ─────────────────────

  const handleAddChild = useCallback((parentId: string) => {
    addChildToNode(parentId, { label: 'sequence', type: 'sequence' })
  }, [addChildToNode])

  // ─── Render ──────────────────────────────────────────────

  return (
    <div className={styles.container}>
      <NodePalette capabilities={capabilities} onAdd={handlePaletteAdd} />

      <div className={styles.treeArea}>
        {root ? (
          <TreeNode
            node={root}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onUpdate={updateNode}
            onDelete={deleteNode}
            onAddChild={handleAddChild}
          />
        ) : (
          <div className={styles.empty}>
            <p>No behavior tree yet.<br />Click a node type in the palette to start.</p>
          </div>
        )}
      </div>
    </div>
  )
}
