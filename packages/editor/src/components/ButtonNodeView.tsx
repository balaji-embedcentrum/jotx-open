 import { NodeViewWrapper } from '@tiptap/react'
import { useState, useEffect } from 'react'
import '../styles/ButtonNodeView.css'
import { getVSCodeAPI } from '../bridge/vscode-api'
import { logger } from '../utils/logger'

const vscode = getVSCodeAPI()

interface ButtonNodeViewProps {
    node: {
        attrs: {
            label?: string
            link?: string
            style?: string
            align?: string
            blockId?: string
            _initialized?: boolean
        }
    }
    updateAttributes: (attrs: Record<string, any>) => void
    selected: boolean
}

export function ButtonNodeView({ node, updateAttributes, selected }: ButtonNodeViewProps) {
    const { label, link, style, align } = node.attrs
    const [isEditing, setIsEditing] = useState(false)
    const [jotFiles, setJotFiles] = useState<string[]>([])

    // CRITICAL: Force immediate sync on mount
    // The setTimeout is essential - updateAttributes called during mount 
    // happens within the same transaction and doesn't trigger onUpdate.
    // We delay it to ensure a NEW transaction is created.
    useEffect(() => {
        logger.log('🔵 ButtonNodeView MOUNT - _initialized:', node.attrs._initialized)
        if (!node.attrs._initialized) {
            logger.log('🔵 ButtonNodeView - scheduling updateAttributes with setTimeout')
            setTimeout(() => {
                logger.log('🔵 ButtonNodeView - calling updateAttributes NOW')
                updateAttributes({ _initialized: true })
            }, 50)
        }
    }, [])

    // Request jot file list when editing starts
    useEffect(() => {
        if (isEditing) {
            vscode.postMessage({ type: 'getJotFiles' })
        }
    }, [isEditing])

    // Listen for jot file list response
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data.type === 'jotFileList') {
                setJotFiles(event.data.files || [])
            }
        }
        window.addEventListener('message', handleMessage)
        return () => window.removeEventListener('message', handleMessage)
    }, [])

    // Listen for edit event from BlockMenu (6-dot handle)
    useEffect(() => {
        const handleEditEvent = (event: CustomEvent) => {
            const { blockId, blockType } = event.detail
            // Only respond if this is our block
            if (blockType === 'button' && blockId === node.attrs.blockId) {
                setIsEditing(true)
            }
        }
        window.addEventListener('jotx-edit-block', handleEditEvent as EventListener)
        return () => window.removeEventListener('jotx-edit-block', handleEditEvent as EventListener)
    }, [node.attrs.blockId])

    // Navigate only when clicking the button directly (not in edit mode)
    const handleButtonClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (link) {
            // Send to extension - it handles :previous specially
            vscode.postMessage({
                type: 'openFile',
                path: link
            })
        }
    }

    // Hide button if label is empty (per user request for buttonstrip behavior)
    // Note: In buttonstrip mode, the parent Edit UI is separate, so this doesn't block editing.
    if (!label && !isEditing) {
        return <NodeViewWrapper className="button-hidden" style={{ display: 'none' }} />
    }

    return (
        <NodeViewWrapper
            className={`button-wrapper button-align-${align || 'left'} ${selected ? 'button-selected' : ''}`}
        >
            {isEditing ? (
                <div className="button-edit-form" onClick={(e) => e.stopPropagation()}>
                    <div className="button-edit-row">
                        <label>Label:</label>
                        <input
                            type="text"
                            value={label || ''}
                            onChange={(e) => updateAttributes({ label: e.target.value })}
                            placeholder="Button Text"
                            autoFocus
                        />
                    </div>
                    <div className="button-edit-row">
                        <label>Link:</label>
                        <select
                            value={link || ''}
                            onChange={(e) => updateAttributes({ link: e.target.value })}
                        >
                            <option value="">No link</option>
                            <option value=":previous">← Previous (Go Back)</option>
                            {jotFiles
                                .filter(file => !file.includes('jotx-help'))
                                .map((file) => (
                                    <option key={file} value={file}>{file}</option>
                                ))}
                        </select>
                    </div>
                    <div className="button-edit-row">
                        <label>Style:</label>
                        <select
                            value={style || 'primary'}
                            onChange={(e) => updateAttributes({ style: e.target.value })}
                        >
                            <option value="primary">Primary (Teal)</option>
                            <option value="secondary">Secondary</option>
                            <option value="outline">Outline</option>
                            <option value="ghost">Ghost</option>
                        </select>
                    </div>
                    <div className="button-edit-row">
                        <label>Align:</label>
                        <select
                            value={align || 'left'}
                            onChange={(e) => updateAttributes({ align: e.target.value })}
                        >
                            <option value="left">Left</option>
                            <option value="center">Center</option>
                            <option value="right">Right</option>
                        </select>
                    </div>
                    <button className="button-edit-done" onClick={() => setIsEditing(false)}>Done</button>
                </div>
            ) : (
                <button
                    className={`jotx-button jotx-button-${style || 'primary'}`}
                    onClick={handleButtonClick}
                    title={link ? (link === ':previous' ? 'Go Back' : `Navigate to: ${link}`) : 'Use 6-dot menu to edit'}
                >
                    {label || 'Button'}
                </button>
            )}
        </NodeViewWrapper>
    )
}
