import React, { useEffect, useMemo, useRef, useState } from 'react'
import { NodeViewWrapper } from '@tiptap/react'
import { useKatex } from '../utils/lazyLibs'
import { Sigma, Copy, Eye, EyeOff } from 'lucide-react'
import '../styles/MathNodeView.css'
import '../styles/RichBlocks.css'

/**
 * Strip common LaTeX delimiters that users often paste with their math content.
 * KaTeX expects raw math content without \[...\], $$...$$ or $...$ wrappers
 * since displayMode already handles the display/inline distinction.
 * 
 * This handles multiple \[...\] blocks pasted together by removing ALL
 * occurrences of the delimiters throughout the content.
 */
function stripLatexDelimiters(src: string): string {
  let cleaned = src

  // Remove ALL occurrences of \[ and \] display math delimiters
  cleaned = cleaned.replace(/\\\[/g, '')
  cleaned = cleaned.replace(/\\\]/g, '')

  // Remove ALL occurrences of $$ display math delimiters
  cleaned = cleaned.replace(/\$\$/g, '')

  // Clean up any resulting double newlines from removed delimiters
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n')

  return cleaned.trim()
}

function safeRender(katex: any, src: string, displayMode: boolean): { html: string; error?: string } {
  if (!katex) return { html: '' }
  try {
    // Strip any LaTeX delimiters that users may have pasted
    const cleanedSrc = stripLatexDelimiters(src || '')

    const html = katex.renderToString(cleanedSrc, {
      throwOnError: false,
      displayMode,
      strict: 'ignore',
      trust: false,
      globalGroup: true,  // Enable multiline environments like aligned
      output: 'html',  // Prevent residual MathML text display
      fleqn: false  // Flush left equations (false = centered)
    })
    return { html }
  } catch (e: any) {
    return { html: '', error: (e && e.message) || 'KaTeX render error' }
  }
}

export function MathNodeView({ node, updateAttributes }: any) {
  const src = (node?.attrs?.src || '').toString()
  const display = ((node?.attrs?.display || 'block') as string).toString()
  const displayMode = display !== 'inline'

  // Determine if source should be shown. Default to attribute, but if it's a new empty node, show it.
  const showSource = node.attrs.showSource
  useEffect(() => {
    if (!src && !showSource) {
      updateAttributes({ showSource: true })
    }
  }, [])

  const setShowSource = (val: boolean) => updateAttributes({ showSource: val })
  const [draft, setDraft] = useState(src)
  const debounceRef = useRef<number | null>(null)

  useEffect(() => {
    setDraft(src)
  }, [src])

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      if (draft !== src) updateAttributes({ src: draft })
    }, 250)
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft])

  const katex = useKatex()
  const rendered = useMemo(() => safeRender(katex, draft, displayMode), [katex, draft, displayMode])

  return (
    <NodeViewWrapper className="jotx-math" data-type="math" data-display={display}>
      <div className="jotx-math-header">
        <div className="jotx-math-title">
          <Sigma size={14} />
          <span>Math</span>
        </div>
        <input
          type="text"
          className="jotx-block-title-input"
          placeholder="Title (shown in graph)..."
          value={(node?.attrs?.title || '').toString()}
          onChange={(e) => updateAttributes({ title: e.target.value })}
        />
        <div className="jotx-math-actions">
          <button
            className="jotx-math-iconbtn"
            title={showSource ? 'Hide Source' : 'Show Source'}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setShowSource(!showSource)}
          >
            {showSource ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>

          <button
            className="jotx-math-iconbtn"
            title="Copy LaTeX"
            onMouseDown={(e) => e.preventDefault()}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(draft || '')
              } catch {
                // ignore
              }
            }}
          >
            <Copy size={16} />
          </button>
        </div>
      </div>

      <div className="jotx-math-body">
        {showSource && (
          <textarea
            className="jotx-math-input"
            value={draft}
            rows={8}
            placeholder="Type LaTeX… e.g. \\begin{aligned} x^2 + y^2 &= 1 \\\\ z &= 0 \\end{aligned}"
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
          />
        )}
        <div className="jotx-math-preview" data-display={display}>
          {rendered.html ? (
            <div dangerouslySetInnerHTML={{ __html: rendered.html }} />
          ) : (
            <div className="jotx-math-empty">{rendered.error ? rendered.error : 'Preview'}</div>
          )}
        </div>
      </div>
    </NodeViewWrapper>
  )
}


