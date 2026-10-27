import React, { useEffect, useState } from 'react'
import { Editor } from '@tiptap/react'
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react'
import '../styles/ImageToolbar.css'

type Align = 'left' | 'center' | 'right'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export function ImageToolbar({ editor }: { editor: Editor }) {
  const [pos, setPos] = useState<{ visible: boolean; x: number; y: number }>({ visible: false, x: 0, y: 0 })
  const [align, setAlign] = useState<Align>('left')
  const [width, setWidth] = useState<number>(100)

  useEffect(() => {
    const update = () => {
      if (!editor.isActive('image')) {
        setPos((p) => (p.visible ? { ...p, visible: false } : p))
        return
      }

      // Read current image attrs
      const attrs = editor.getAttributes('image') as any
      const a: Align = (attrs?.align as Align) || 'left'
      const wRaw = typeof attrs?.width === 'number' ? attrs.width : parseInt(String(attrs?.width || ''), 10)
      const w = Number.isFinite(wRaw) ? clamp(wRaw, 10, 100) : 100
      setAlign(a)
      setWidth(w)

      try {
        const sel: any = editor.state.selection as any
        const from = typeof sel?.from === 'number' ? sel.from : 0
        const dom = (from ? (editor.view.nodeDOM(from) as any) : null) as HTMLElement | null
        if (dom && typeof dom.getBoundingClientRect === 'function') {
          const r = dom.getBoundingClientRect()
          const x = clamp(r.left + r.width / 2 - 160, 12, window.innerWidth - 360)
          const y = clamp(r.top - 54, 12, window.innerHeight - 54)
          setPos({ visible: true, x, y })
          return
        }

        // Fallback to selection coords
        const coords = editor.view.coordsAtPos(sel.to)
        const x = clamp(coords.left - 120, 12, window.innerWidth - 360)
        const y = clamp(coords.top - 54, 12, window.innerHeight - 54)
        setPos({ visible: true, x, y })
      } catch {
        setPos((p) => (p.visible ? { ...p, visible: false } : p))
      }
    }

    update()
    editor.on('selectionUpdate', update)
    editor.on('transaction', update)
    return () => {
      editor.off('selectionUpdate', update)
      editor.off('transaction', update)
    }
  }, [editor])

  if (!pos.visible) return null

  const setImageAlign = (a: Align) => {
    editor.chain().focus().updateAttributes('image', { align: a }).run()
  }

  const setImageWidth = (w: number) => {
    editor.chain().focus().updateAttributes('image', { width: clamp(w, 10, 100) }).run()
  }

  return (
    <div className="jotx-image-toolbar jotx-image-toolbar-floating" style={{ left: `${pos.x}px`, top: `${pos.y}px` }} role="toolbar">
      <button
        className={`jotx-image-toolbar-btn ${align === 'left' ? 'active' : ''}`}
        title="Align left"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setImageAlign('left')}
      >
        <AlignLeft size={16} />
      </button>
      <button
        className={`jotx-image-toolbar-btn ${align === 'center' ? 'active' : ''}`}
        title="Align center"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setImageAlign('center')}
      >
        <AlignCenter size={16} />
      </button>
      <button
        className={`jotx-image-toolbar-btn ${align === 'right' ? 'active' : ''}`}
        title="Align right"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setImageAlign('right')}
      >
        <AlignRight size={16} />
      </button>

      <div className="jotx-image-toolbar-sep" />

      <div className="jotx-image-toolbar-size" title="Image width">
        <input
          type="range"
          min={10}
          max={100}
          step={5}
          value={width}
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => setImageWidth(parseInt(e.target.value, 10))}
        />
        <span className="jotx-image-toolbar-size-label">{width}%</span>
      </div>
    </div>
  )
}


