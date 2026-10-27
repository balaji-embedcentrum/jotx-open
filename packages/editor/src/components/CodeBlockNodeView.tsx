import React, { useMemo, useState } from 'react'
import { NodeViewContent, NodeViewProps, NodeViewWrapper } from '@tiptap/react'
import { Check, Code2, Copy, Play } from 'lucide-react'
import { getVSCodeAPI } from '../bridge/vscode-api'
import '../styles/CodeBlockNodeView.css'
import '../styles/RichBlocks.css'

const LANGUAGES = [
  'typescript',
  'javascript',
  'json',
  'yaml',
  'markdown',
  'bash',
  'shell',
  'python',
  'go',
  'java',
  'c',
  'cpp',
  'rust',
  'sql',
  'html',
  'css',
  'text'
]

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // fallback
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      ta.style.top = '0'
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      return ok
    } catch {
      return false
    }
  }
}

export function CodeBlockNodeView({ node, updateAttributes, editor }: NodeViewProps) {
  const lang = ((node?.attrs as any)?.language || 'typescript').toString()
  const [copied, setCopied] = useState(false)
  const [running, setRunning] = useState(false)

  const languageOptions = useMemo(() => {
    // Keep current lang even if not in list (future-proof)
    const set = new Set(LANGUAGES)
    if (lang && !set.has(lang)) return [lang, ...LANGUAGES]
    return LANGUAGES
  }, [lang])

  const onCopy = async () => {
    const text = node.textContent || ''
    const ok = await copyToClipboard(text)
    if (!ok) return
    setCopied(true)
    window.setTimeout(() => setCopied(false), 900)
  }

  const onRun = () => {
    const text = node.textContent || ''
    if (!text.trim()) return

    setRunning(true)
    const vscode = getVSCodeAPI()
    vscode.postMessage({
      type: 'runCode',
      language: lang,
      code: text
    })

    // Reset icon after a short delay
    setTimeout(() => setRunning(false), 1000)
  }

  return (
    <NodeViewWrapper className="jotx-codeblock" data-type="codeblock" data-language={lang}>
      <div className="jotx-codeblock-header" contentEditable={false}>
        <div className="jotx-codeblock-lang">
          <span className="jotx-codeblock-langLabel" title="Code"><Code2 size={14} /></span>
          <select
            className="jotx-codeblock-select"
            value={lang}
            // Don't preventDefault here — it breaks opening the native dropdown.
            // Just stop propagation so ProseMirror doesn't treat it as an editor click.
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => {
              const next = e.target.value
              updateAttributes({ language: next })
              // Don't force focus immediately; it can cancel the dropdown selection on some platforms.
              window.setTimeout(() => editor?.commands?.focus(), 0)
            }}
            aria-label="Code language"
          >
            {languageOptions.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>

        <div className="jotx-codeblock-actions">
          <button
            className="jotx-codeblock-btn"
            title="Run Code"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onRun()
            }}
          >
            {running ? <Check size={16} /> : <Play size={16} />}
          </button>

          <button
            className="jotx-codeblock-btn"
            title={copied ? 'Copied' : 'Copy'}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onCopy()
            }}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
      </div>

      <pre className="jotx-codeblock-pre">
        <code>
          {/* Tiptap's NodeViewContent typing is overly strict in our version (as: 'div' only).
              This is safe: the runtime supports rendering as <code>. */}
          <NodeViewContent {...({ as: 'code' } as any)} />
        </code>
      </pre>
    </NodeViewWrapper>
  )
}


