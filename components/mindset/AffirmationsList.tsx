'use client'
import { useState, useEffect } from 'react'
import { Affirmation } from '@/types'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Skeleton from '@/components/shared/Skeleton'

function SortableItem({
  a,
  index,
  editingId,
  editText,
  setEditText,
  setEditingId,
  saveEdit,
  removeAffirmation,
}: {
  a: Affirmation
  index: number
  editingId: string | null
  editText: string
  setEditText: (v: string) => void
  setEditingId: (v: string | null) => void
  saveEdit: (id: string) => void
  removeAffirmation: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: a.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-3 p-3 rounded-xl bg-surface-2/50 border border-edge-muted group"
    >
      <button
        {...attributes}
        {...listeners}
        className="text-fg-4 hover:text-fg-3 cursor-grab active:cursor-grabbing mt-0.5 touch-none"
        aria-label="Drag to reorder"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="5" cy="3" r="1.5" />
          <circle cx="11" cy="3" r="1.5" />
          <circle cx="5" cy="8" r="1.5" />
          <circle cx="11" cy="8" r="1.5" />
          <circle cx="5" cy="13" r="1.5" />
          <circle cx="11" cy="13" r="1.5" />
        </svg>
      </button>
      <span className="text-cta font-bold text-sm mt-0.5">{index + 1}.</span>
      {editingId === a.id ? (
        <div className="flex-1 flex gap-2">
          <input
            value={editText}
            onChange={e => setEditText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveEdit(a.id)}
            className="flex-1 bg-surface-2 border border-edge rounded-lg px-3 py-1.5 text-sm text-fg-1 focus:outline-none focus:ring-2 focus:ring-cta/50"
            autoFocus
          />
          <button onClick={() => saveEdit(a.id)} className="text-xs text-cta font-medium">Save</button>
          <button onClick={() => setEditingId(null)} className="text-xs text-fg-4">Cancel</button>
        </div>
      ) : (
        <>
          <p className="flex-1 text-sm text-fg-2 italic">&ldquo;{a.text}&rdquo;</p>
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => { setEditingId(a.id); setEditText(a.text) }}
              className="text-xs text-fg-4 hover:text-fg-2"
            >
              Edit
            </button>
            <button
              onClick={() => removeAffirmation(a.id)}
              className="text-xs text-red-400 hover:text-red-300"
            >
              Remove
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default function AffirmationsList() {
  const [affirmations, setAffirmations] = useState<Affirmation[]>([])
  const [newText, setNewText] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => {
    fetch('/api/mindset/affirmations')
      .then(r => r.json())
      .then(data => { setAffirmations(data); setLoading(false) })
  }, [])

  const addAffirmation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newText.trim()) return
    setAdding(true)
    const res = await fetch('/api/mindset/affirmations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: newText }),
    })
    if (res.ok) {
      const data = await res.json()
      setAffirmations(prev => [...prev, data])
      setNewText('')
    }
    setAdding(false)
  }

  const saveEdit = async (id: string) => {
    if (!editText.trim()) return
    await fetch('/api/mindset/affirmations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, text: editText }),
    })
    setAffirmations(prev => prev.map(a => a.id === id ? { ...a, text: editText } : a))
    setEditingId(null)
  }

  const removeAffirmation = async (id: string) => {
    await fetch('/api/mindset/affirmations', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setAffirmations(prev => prev.filter(a => a.id !== id))
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = affirmations.findIndex(a => a.id === active.id)
    const newIndex = affirmations.findIndex(a => a.id === over.id)
    const reordered = arrayMove(affirmations, oldIndex, newIndex)
    setAffirmations(reordered)

    await fetch('/api/mindset/affirmations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: reordered.map((a, i) => ({ id: a.id, sort_order: i })),
      }),
    })
  }

  if (loading) return <Skeleton />

  return (
    <div className="space-y-5">
      <div className="card p-6">
        <h3 className="font-semibold text-fg-1 mb-1">Self-Affirmations</h3>
        <p className="text-sm text-fg-4 mb-5">What you tell yourself shapes who you become. Write it. Believe it. Become it.</p>

        {affirmations.length > 0 && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={affirmations.map(a => a.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2 mb-5">
                {affirmations.map((a, i) => (
                  <SortableItem
                    key={a.id}
                    a={a}
                    index={i}
                    editingId={editingId}
                    editText={editText}
                    setEditText={setEditText}
                    setEditingId={setEditingId}
                    saveEdit={saveEdit}
                    removeAffirmation={removeAffirmation}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        <form onSubmit={addAffirmation} className="flex gap-2">
          <input
            value={newText}
            onChange={e => setNewText(e.target.value)}
            placeholder="I am confident under pressure…"
            className="input-field flex-1"
          />
          <button
            type="submit"
            disabled={adding || !newText.trim()}
            className="btn-primary whitespace-nowrap"
          >
            {adding ? 'Adding…' : 'Add'}
          </button>
        </form>
      </div>
    </div>
  )
}
