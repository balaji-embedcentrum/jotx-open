/**
 * EditorModeContext - Loosely coupled edit/preview mode toggle
 *
 * Provides:
 *   mode: 'edit' | 'preview'
 *   toggleMode: () => void
 *   isPreview: boolean  (convenience)
 *
 * Any component can read mode without knowing who controls it.
 * DocumentHeader owns the toggle UI; NodeViews only consume.
 */

import React, { createContext, useContext, useState, useCallback } from 'react'

export type EditorMode = 'edit' | 'preview'

interface EditorModeContextValue {
  mode: EditorMode
  isPreview: boolean
  toggleMode: () => void
}

const EditorModeContext = createContext<EditorModeContextValue | null>(null)

const DEFAULT_MODE: EditorModeContextValue = {
  mode: 'edit',
  isPreview: false,
  toggleMode: () => {},
}

export function EditorModeProvider({ children, initialMode = 'edit' }: { children: React.ReactNode; initialMode?: EditorMode }) {
  const [mode, setMode] = useState<EditorMode>(initialMode)

  const toggleMode = useCallback(() => {
    setMode(prev => prev === 'edit' ? 'preview' : 'edit')
  }, [])

  return (
    <EditorModeContext.Provider value={{ mode, isPreview: mode === 'preview', toggleMode }}>
      {children}
    </EditorModeContext.Provider>
  )
}

export function useEditorMode(): EditorModeContextValue {
  return useContext(EditorModeContext) ?? DEFAULT_MODE
}

/** True when rendered inside an EditorModeProvider (lets nested editors share the host's mode). */
export function useHasEditorModeProvider(): boolean {
  return useContext(EditorModeContext) !== null
}
