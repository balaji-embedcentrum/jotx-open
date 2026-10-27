import { NodeViewWrapper } from '@tiptap/react'
import { useState, useEffect } from 'react'
import '../styles/GridCardNodeView.css'
import { getVSCodeAPI } from '../bridge/vscode-api'

const vscode = getVSCodeAPI()

interface CardNodeViewProps {
    node: {
        attrs: {
            title?: string
            value?: string
            icon?: string
            color?: string
            link?: string
            blockId?: string
        }
    }
    updateAttributes: (attrs: Record<string, any>) => void
    selected: boolean
}

export function CardNodeView({ node, updateAttributes, selected }: CardNodeViewProps) {
    const { title, value, icon, color, link } = node.attrs
    const [isEditing, setIsEditing] = useState(false)
    const [jotFiles, setJotFiles] = useState<string[]>([])

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

    // Navigate only when clicking the link indicator
    const handleLinkClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (link) {
            vscode.postMessage({
                type: 'openFile',
                path: link
            })
        }
    }

    const handleDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        setIsEditing(true)
    }

    return (
        <NodeViewWrapper
            className={`card card-color-${color || 'teal'} ${selected ? 'card-selected' : ''}`}
            data-has-link={!!link}
            onDoubleClick={handleDoubleClick}
        >
            {isEditing ? (
                <div className="card-edit-form" onClick={(e) => e.stopPropagation()}>
                    <div className="card-edit-row">
                        <label>Icon:</label>
                        <input
                            type="text"
                            value={icon || ''}
                            onChange={(e) => updateAttributes({ icon: e.target.value })}
                            placeholder="📝"
                        />
                    </div>
                    <div className="card-edit-row">
                        <label>Title:</label>
                        <input
                            type="text"
                            value={title || ''}
                            onChange={(e) => updateAttributes({ title: e.target.value })}
                            placeholder="Card Title"
                            autoFocus
                        />
                    </div>
                    <div className="card-edit-row">
                        <label>Value:</label>
                        <input
                            type="text"
                            value={value || ''}
                            onChange={(e) => updateAttributes({ value: e.target.value })}
                            placeholder="123"
                        />
                    </div>
                    <div className="card-edit-row">
                        <label>Color:</label>
                        <select
                            value={color || 'teal'}
                            onChange={(e) => updateAttributes({ color: e.target.value })}
                        >
                            <option value="teal">Teal</option>
                            <option value="blue">Blue</option>
                            <option value="green">Green</option>
                            <option value="red">Red</option>
                            <option value="yellow">Yellow</option>
                            <option value="purple">Purple</option>
                            <option value="gray">Gray</option>
                        </select>
                    </div>
                    <div className="card-edit-row">
                        <label>Link:</label>
                        <select
                            value={link || ''}
                            onChange={(e) => updateAttributes({ link: e.target.value })}
                        >
                            <option value="">No link</option>
                            {jotFiles.map((file) => (
                                <option key={file} value={file}>{file}</option>
                            ))}
                        </select>
                    </div>
                    <button className="card-edit-done" onClick={() => setIsEditing(false)}>Done</button>
                </div>
            ) : (
                <>
                    {icon && <div className="card-icon">{icon}</div>}
                    <div className="card-title">{title || 'Double-click to edit'}</div>
                    {value && <div className="card-value">{value}</div>}
                    {link && (
                        <div
                            className="card-link-indicator card-link-clickable"
                            onClick={handleLinkClick}
                            title="Click to navigate"
                        >
                            → {link}
                        </div>
                    )}
                </>
            )}
        </NodeViewWrapper>
    )
}
