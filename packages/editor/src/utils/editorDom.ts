import { useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'

/**
 * The editor's DOM node, or null while its view is not attached.
 * Tiptap 3 throws when editor.view.dom is read before mounting or after destroy,
 * and the order in which React runs effects is not guaranteed to be after the mount.
 */
export function editorDom(editor: Editor | null | undefined): HTMLElement | null {
  if (!editor || editor.isDestroyed) return null
  try {
    return editor.view.dom as HTMLElement
  } catch {
    return null
  }
}

/** editorDom as state, updated when the view mounts or unmounts, for use as an effect dependency. */
export function useEditorDom(editor: Editor | null | undefined): HTMLElement | null {
  const [dom, setDom] = useState<HTMLElement | null>(() => editorDom(editor))

  useEffect(() => {
    const update = () => setDom(editorDom(editor))
    update()
    if (!editor) return
    editor.on('mount', update)
    editor.on('create', update)
    editor.on('unmount', update)
    editor.on('destroy', update)
    return () => {
      editor.off('mount', update)
      editor.off('create', update)
      editor.off('unmount', update)
      editor.off('destroy', update)
    }
  }, [editor])

  return dom
}
