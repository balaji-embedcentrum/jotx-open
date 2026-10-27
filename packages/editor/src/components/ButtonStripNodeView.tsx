import React, { useState, useEffect, useRef } from 'react'
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react'
import { Editor } from '@tiptap/core'
import { Node } from '@tiptap/pm/model'
import '../styles/ButtonStripNodeView.css'
import { getVSCodeAPI } from '../bridge/vscode-api'

const vscode = getVSCodeAPI()

interface ButtonStripNodeViewProps {
    editor: Editor
    node: Node
    getPos: () => number
    updateAttributes: (attrs: Record<string, any>) => void
    selected: boolean
}

// Reusing button styles and align options
const STYLES = ['primary', 'secondary', 'outline', 'ghost', 'danger']
const ALIGNS = ['left', 'center', 'right']

export function ButtonStripNodeView({ editor, node, getPos, updateAttributes, selected }: ButtonStripNodeViewProps) {
    const [isEditing, setIsEditing] = useState(false)

    // Internal state for the form
    const [buttonsState, setButtonsState] = useState<any[]>([])
    const [jotFiles, setJotFiles] = useState<string[]>([])

    // REF to track current node for event listener (stale closure fix)
    const nodeRef = useRef(node)
    nodeRef.current = node

    // Initialize on mount
    useEffect(() => {
        if (!node.attrs._initialized) {
            setTimeout(() => {
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

    // Listen for edit event
    useEffect(() => {
        const handleEditEvent = (event: CustomEvent) => {
            // Use ref to get current node props to avoid stale closure
            const currentNode = nodeRef.current
            const { blockId, blockType } = event.detail

            if (blockType === 'buttonstrip' && blockId === currentNode.attrs.blockId) {
                openEditMode(currentNode)
            }
        }
        window.addEventListener('jotx-edit-block', handleEditEvent as EventListener)
        return () => window.removeEventListener('jotx-edit-block', handleEditEvent as EventListener)
    }, []) // Empty dependency array relying on ref

    const openEditMode = (currentNode: Node) => {
        // Read current state from child nodes of the FRESH node
        const states: any[] = []
        currentNode.content.forEach((child) => {
            states.push({ ...child.attrs })
        })

        // Ensure we have 3 (should be enforced by schema, but be safe)
        while (states.length < 3) {
            states.push({ label: '', link: '', style: 'primary', align: 'center' })
        }

        setButtonsState(states)
        setIsEditing(true)
    }

    const updateButtonState = (index: number, field: string, value: string) => {
        const newStates = [...buttonsState]
        newStates[index] = { ...newStates[index], [field]: value }
        setButtonsState(newStates)

        // IMMEDIATE UPDATE: Apply to the editor document
        if (typeof getPos === 'function') {
            const stripPos = getPos()

            if (stripPos === undefined || stripPos === null) return

            // Content starts at stripPos + 1
            const buttonPos = stripPos + 1 + index

            editor.commands.command(({ tr }) => {
                const oldAttrs = newStates[index]
                tr.setNodeMarkup(buttonPos, undefined, { ...oldAttrs, [field]: value })
                return true
            })
        }
    }

    const handleClose = () => {
        setIsEditing(false)
    }

    return (
        <NodeViewWrapper
            className={`buttonstrip-wrapper ${selected ? 'buttonstrip-selected' : ''}`}
        >
            {isEditing && (
                <div className="buttonstrip-edit-ui" onClick={(e) => e.stopPropagation()}>
                    <div className="buttonstrip-edit-grid">
                        {[0, 1, 2].map((index) => (
                            <div key={index} className="buttonstrip-edit-column">
                                <h4>Button {index + 1}</h4>

                                <div className="buttonstrip-form-group">
                                    <label>Label</label>
                                    <input
                                        type="text"
                                        value={buttonsState[index]?.label || ''}
                                        onChange={(e) => updateButtonState(index, 'label', e.target.value)}
                                        placeholder="Button Text"
                                    />
                                </div>

                                <div className="buttonstrip-form-group">
                                    <label>Link / Path</label>
                                    <select
                                        value={buttonsState[index]?.link || ''}
                                        onChange={(e) => updateButtonState(index, 'link', e.target.value)}
                                    >
                                        <option value="">No link</option>
                                        <option value=":previous">← Previous (Go Back)</option>
                                        {jotFiles
                                            .filter(f => !f.includes('jotx-help'))
                                            .map(file => (
                                                <option key={file} value={file}>{file}</option>
                                            ))
                                        }
                                    </select>
                                </div>

                                <div className="buttonstrip-form-group">
                                    <label>Style</label>
                                    <select
                                        value={buttonsState[index]?.style || 'primary'}
                                        onChange={(e) => updateButtonState(index, 'style', e.target.value)}
                                    >
                                        {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="buttonstrip-actions">
                        <button className="buttonstrip-done-btn" onClick={handleClose}>Done</button>
                    </div>
                </div>
            )}

            <div className="buttonstrip-container">
                <NodeViewContent className="buttonstrip-content" />
            </div>
        </NodeViewWrapper>
    )
}
