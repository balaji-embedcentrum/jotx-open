
import React, { useEffect, useState } from 'react'
import { NodeViewProps, NodeViewWrapper } from '@tiptap/react'
import { FileCode, Settings, Check, RefreshCw } from 'lucide-react'
import { getVSCodeAPI } from '../bridge/vscode-api'
import '../styles/CodeBlockNodeView.css' // Reuse styles
import '../styles/RichBlocks.css'
import '../styles/CodeReferenceNodeView.css'

export function CodeReferenceNodeView({ node, updateAttributes, editor, getPos }: NodeViewProps) {
    const { path, lines, language } = node.attrs
    const [isConfiguring, setIsConfiguring] = useState(!path)
    const [content, setContent] = useState<string>('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchContent = () => {
        if (!path) return
        setLoading(true)
        setError(null)
        const vscode = getVSCodeAPI()
        const requestId = `ref_${Date.now()}`

        vscode.postMessage({
            type: 'getFileContent',
            path,
            lines,
            requestId
        })

        const handleMessage = (event: MessageEvent) => {
            const message = event.data
            if (message.type === 'fileContent' && message.requestId === requestId) {
                setLoading(false)
                if (message.error) {
                    setError(message.error)
                } else {
                    const newContent = message.content || ''
                    setContent(newContent)

                    // Sync to Tiptap Model so it saves
                    if (editor && typeof getPos === 'function') {
                        const pos = getPos()
                        const currentNodeContent = node.textContent

                        if (currentNodeContent !== newContent) {
                            editor.commands.command(({ tr, dispatch }) => {
                                if (dispatch) {
                                    const nodeSize = node.nodeSize
                                    // Replace content range [pos + 1, pos + nodeSize - 1] with new text
                                    tr.replaceWith(pos + 1, pos + nodeSize - 1, editor.schema.text(newContent))
                                    return true
                                }
                                return false
                            })
                        }
                    }
                }
                window.removeEventListener('message', handleMessage)
            }
        }
        window.addEventListener('message', handleMessage)
    }

    useEffect(() => {
        if (!isConfiguring) {
            fetchContent()
        }
    }, [path, lines, isConfiguring])

    const handleSave = () => {
        setIsConfiguring(false)
    }

    return (
        <NodeViewWrapper className="jotx-codeblock jotx-coderef" data-type="codeReference">
            <div className="jotx-codeblock-header" contentEditable={false}>
                <div className="jotx-codeblock-lang">
                    <span className="jotx-codeblock-langLabel" title="Code reference"><FileCode size={14} /></span>
                    {!isConfiguring ? (
                        <>
                            <span className="jotx-coderef-file" title={path}>
                                {path.split('/').pop()}{lines ? <span className="jotx-coderef-lines">:{lines}</span> : null}
                            </span>
                            {language && <span className="jotx-coderef-chip">{language}</span>}
                        </>
                    ) : (
                        <span className="jotx-coderef-file">Configure reference</span>
                    )}
                </div>
                <div className="jotx-codeblock-actions">
                    {!isConfiguring && (
                        <button className="jotx-codeblock-btn" title="Reload from file" onClick={fetchContent}>
                            <RefreshCw size={14} className={loading ? 'jotx-coderef-spin' : ''} />
                        </button>
                    )}
                    <button
                        className="jotx-codeblock-btn"
                        title={isConfiguring ? 'Done' : 'Configure'}
                        onClick={() => setIsConfiguring(!isConfiguring)}
                    >
                        {isConfiguring ? <Check size={14} /> : <Settings size={14} />}
                    </button>
                </div>
            </div>

            {isConfiguring ? (
                <div className="jotx-codeblock-config jotx-coderef-config" contentEditable={false}>
                    <div className="jotx-coderef-field jotx-coderef-field--wide">
                        <label className="jotx-coderef-label">File path (relative to root)</label>
                        <input
                            type="text"
                            className="jx-input jx-mono"
                            value={path}
                            onChange={(e) => updateAttributes({ path: e.target.value })}
                            placeholder="e.g. src/utils.ts"
                        />
                    </div>
                    <div className="jotx-coderef-field">
                        <label className="jotx-coderef-label">Lines</label>
                        <input
                            type="text"
                            className="jx-input jx-mono"
                            value={lines}
                            onChange={(e) => updateAttributes({ lines: e.target.value })}
                            placeholder="e.g. 10-20 or 5"
                        />
                    </div>
                    <div className="jotx-coderef-field">
                        <label className="jotx-coderef-label">Language</label>
                        <input
                            type="text"
                            className="jx-input"
                            value={language}
                            onChange={(e) => updateAttributes({ language: e.target.value })}
                            placeholder="typescript, python, etc."
                        />
                    </div>
                    <div className="jotx-coderef-actions">
                        <button className="jx-btn jx-btn--primary" onClick={handleSave}>
                            Apply changes
                        </button>
                    </div>
                </div>
            ) : (
                <div className="jotx-coderef-body">
                    {loading && <div className="jotx-coderef-loading">Loading…</div>}
                    {error ? (
                        <div className="jotx-coderef-error">Error: {error}</div>
                    ) : (
                        <pre className="jotx-codeblock-pre jotx-coderef-pre">
                            <code>
                                {content || '// No content or file empty'}
                            </code>
                        </pre>
                    )}
                </div>
            )}
        </NodeViewWrapper>
    )
}
