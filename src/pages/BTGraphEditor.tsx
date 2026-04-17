import { useEffect, useState } from 'react'
import type { BTEditionNode } from '../engine/types'

const NodePalette = () => {
  const categories = [
    { name: 'Composite', nodes: ['Sequence', 'Selector'] },
    { name: 'Decorator', nodes: ['Inverter', 'Repeater'] },
    { name: 'Leaf', nodes: ['Action', 'Condition'] }
  ]

  return (
    <div style={{ width: '220px', backgroundColor: '#1a1a2e', padding: '1rem', overflowY: 'auto' }}>
      {categories.map(({ name: category, nodes }) => (
        <div key={category} style={{ marginBottom: '0.75rem' }}>
          <div style={{ fontWeight: 600, fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {category}
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            {nodes.map(nodeType => (
              <button
                key={nodeType}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #444',
                  backgroundColor: '#2d2d44',
                  color: '#ccc',
                  cursor: 'grab',
                  width: '100%',
                  textAlign: 'left',
                  marginBottom: '0.25rem'
                }}
                draggable
              >
                {nodeType}
              </button>
            ))}
          </div>
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
        <span style={{ fontWeight: 600 }}>{label}:</span>
        <span style={{ opacity: 0.7 }}>{node.type}</span>
        {node.args && <span style={{ color: '#fbbf24' }}> (args)</span>}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {common('Condition')}
            <button
              style={{ padding: '0.5rem 0.75rem', backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}
              onClick={() => setEditMode(true)}
            >
              Edit
            </button>
          </div>
        )
      case 'action':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {common('Action')}
            <span style={{ color: '#93c5fd' }}>{node.name || ''}</span>
            <button
              style={{ padding: '0.5rem 0.75rem', backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem', padding: '0.75rem', backgroundColor: '#1a1a2e', borderRadius: '0.375rem' }}>
          <input
            style={{ padding: '0.5rem', border: '1px solid #444', borderRadius: '0.25rem', backgroundColor: '#0f0f1a', color: '#fff', width: '100%', fontSize: '0.875rem' }}
            placeholder={node.type === 'condition' ? 'conditionName(args)' : 'name'}
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            autoFocus
          />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              style={{ padding: '0.5rem 1rem', backgroundColor: '#22c55e', color: '#fff', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontWeight: 500 }}
              onClick={handleEditValueChange}
            >
              OK
            </button>
            <button
              style={{ padding: '0.5rem 1rem', backgroundColor: '#666', color: '#fff', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontWeight: 500 }}
              onClick={() => setEditMode(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem', padding: '0.75rem', backgroundColor: '#1a1a2e', borderRadius: '0.375rem' }}>
        <textarea
          style={{ width: '100%', height: '120px', padding: '0.75rem', border: '1px solid #444', borderRadius: '0.375rem', backgroundColor: '#0f0f1a', color: '#fff', fontSize: '0.75rem', fontFamily: 'monospace', resize: 'vertical' }}
          value={argsText}
          onChange={e => setArgsText(e.target.value)}
          placeholder='{"example": "args"}'
        />
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            style={{ padding: '0.5rem 1rem', backgroundColor: '#22c55e', color: '#fff', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontWeight: 500 }}
            onClick={handleEditValueChange}
          >
            Save
          </button>
          <button
            style={{ padding: '0.5rem 1rem', backgroundColor: '#666', color: '#fff', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontWeight: 500 }}
            onClick={() => setEditMode(false)}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: '#2d2d44', borderRadius: '0.375rem' }}>
      {renderNodeContent()}
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        {node.children !== undefined && node.children.length === 0 && (
          <button
            style={{ padding: '0.375rem 0.75rem', backgroundColor: '#22c55e', color: '#fff', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.875rem' }}
            onClick={onAddChild}
          >
            + Add child
          </button>
        )}
        <button
          style={{ padding: '0.375rem 0.75rem', backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.875rem' }}
          onClick={() => setEditMode(true)}
        >
          {node.args ? 'Edit Args' : 'Set Args'}
        </button>
        {node.type !== 'root' && (
          <button
            style={{ padding: '0.25rem 0.5rem', backgroundColor: 'rgba(239,68,68,0.8)', color: '#fff', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, lineHeight: 1 }}
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
}: {
  root: BTEditionNode | null
  onChange: (newRoot: BTEditionNode | null) => void
  onSave: (bt: BTEditionNode | null) => void
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
    <div style={{ minHeight: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '1.5rem', backgroundColor: '#0f0f1a', borderBottom: '1px solid #2a2a3a' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 1rem 0' }}>Behavior Tree Editor</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button
            style={{ padding: '0.75rem 1.5rem', backgroundColor: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '0.375rem', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
            onClick={saveToStorage}
          >
            Save
          </button>
          <button
            style={{ padding: '0.75rem 1.5rem', backgroundColor: '#666', color: '#fff', border: 'none', borderRadius: '0.375rem', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
            onClick={clearEditor}
          >
            Clear
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <NodePalette />

        <div style={{ flex: 1, padding: '1rem', overflow: 'auto', backgroundColor: '#0a0a0f' }}>
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
                    style={{ padding: '0.75rem 1.5rem', backgroundColor: '#22c55e', color: '#fff', border: 'none', borderRadius: '0.375rem', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}
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
            <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>
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

  return (
    <div style={{ marginBottom: '0.5rem', backgroundColor: isSelected ? '#3a3a5a' : '#2d2d44', border: isSelected ? '2px solid #3b82f6' : '1px solid #444', borderRadius: '0.375rem' }}>
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
        <div style={{ padding: '0.75rem', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '0.25rem', marginTop: '0.5rem' }}>
          <span style={{ color: '#888', fontSize: '0.875rem' }}>No children. Add:</span>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button style={{ padding: '0.375rem 0.75rem', backgroundColor: '#22c55e', color: '#fff', border: 'none', borderRadius: '0.25rem', fontSize: '0.8rem', cursor: 'pointer' }} onClick={() => handleAddChild('sequence')}>Sequence</button>
            <button style={{ padding: '0.375rem 0.75rem', backgroundColor: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '0.25rem', fontSize: '0.8rem', cursor: 'pointer' }} onClick={() => handleAddChild('selector')}>Selector</button>
            <button style={{ padding: '0.375rem 0.75rem', backgroundColor: '#f59e0b', color: '#fff', border: 'none', borderRadius: '0.25rem', fontSize: '0.8rem', cursor: 'pointer' }} onClick={() => handleAddChild('action')}>Action</button>
            <button style={{ padding: '0.375rem 0.75rem', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '0.25rem', fontSize: '0.8rem', cursor: 'pointer' }} onClick={() => handleAddChild('condition')}>Condition</button>
          </div>
        </div>
      )}
    </div>
  )
}
