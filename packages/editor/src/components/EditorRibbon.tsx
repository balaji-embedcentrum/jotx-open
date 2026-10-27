/**
 * EditorRibbon - Context-aware toolbar ribbon
 * Shows ALL tools always, enables/disables based on block type
 */

import React from 'react'
import { Editor } from '@tiptap/react'
import {
    Bold,
    Italic,
    Underline,
    Strikethrough,
    Code,
    Highlighter,
    Link2,
    Type,
    IndentIncrease,
    IndentDecrease,
    List,
    ListOrdered,
    CheckSquare,
    ArrowUpToLine,
    ArrowDownToLine,
    ArrowLeftToLine,
    ArrowRightToLine,
    Columns2,
    Rows2,
    Combine,
    Split
} from 'lucide-react'
import { InsertGallery } from './InsertGallery'
import '../styles/EditorRibbon.css'

export type EditorContext =
    | 'paragraph'
    | 'heading'
    | 'list'
    | 'table'
    | 'callout'
    | 'code'
    | 'mermaid'
    | 'chart'
    | 'math'
    | 'image'

export interface EditorRibbonProps {
    editor: Editor | null
    expanded: boolean
    context: EditorContext
    /** Insert a block/widget by slash-command id (shows the Insert gallery when provided) */
    onInsert?: (command: string) => void
}

export function EditorRibbon({ editor, expanded, context, onInsert }: EditorRibbonProps) {
    // Track list level with state to trigger re-renders on selection change
    const [listLevel, setListLevel] = React.useState(0)

    React.useEffect(() => {
        if (!editor) return

        const updateListLevel = () => {
            if (context !== 'list') {
                setListLevel(0)
                return
            }
            try {
                const { $from } = editor.state.selection
                let level = 0
                for (let d = $from.depth; d > 0; d--) {
                    const node = $from.node(d)
                    const name = node.type?.name
                    // Count list containers, not list items
                    if (name === 'bulletList' || name === 'orderedList' || name === 'taskList') {
                        level++
                    }
                }
                setListLevel(Math.max(1, level))
            } catch {
                setListLevel(1)
            }
        }

        updateListLevel()
        editor.on('selectionUpdate', updateListLevel)
        editor.on('transaction', updateListLevel)

        return () => {
            editor.off('selectionUpdate', updateListLevel)
            editor.off('transaction', updateListLevel)
        }
    }, [editor, context])

    // Allow rendering even without editor (buttons will be disabled)
    // if (!editor) return null

    // Determine what's enabled based on context
    const formattingEnabled = !['code', 'mermaid', 'chart', 'math'].includes(context)

    // List TYPE buttons work for paragraphs too (to convert text to list)
    const listTypeEnabled = formattingEnabled && !['table', 'image'].includes(context)
    // Indent/outdent only work when inside a list
    const listIndentEnabled = context === 'list'

    // Table operations - enabled when in table context
    const tableEnabled = context === 'table'

    const btn = (active: boolean, enabled: boolean = true) =>
        `editor-ribbon-btn ${active ? 'active' : ''}`

    const isTask = editor.isActive('taskList')
    const itemType = isTask ? 'taskItem' : 'listItem'

    return (
        <div className={`editor-ribbon ${expanded ? 'expanded' : ''}`}>
            <div className="editor-ribbon-content">

                {/* INSERT gallery */}
                {onInsert && (
                    <>
                        <div className="editor-ribbon-section">
                            <InsertGallery onInsert={onInsert} disabled={!editor?.isEditable} />
                        </div>
                        <div className="editor-ribbon-separator" />
                    </>
                )}

                {/* FORMAT Section */}
                <div className="editor-ribbon-section">
                    <span className="editor-ribbon-section-label">Format</span>

                    <div className="editor-ribbon-btn-group">
                        <button
                            className={btn(editor.isActive('bold'))}
                            title="Bold (Ctrl/Cmd+B)"
                            disabled={!formattingEnabled}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => editor.chain().focus().toggleBold().run()}
                        >
                            <Bold size={16} />
                        </button>

                        <button
                            className={btn(editor.isActive('italic'))}
                            title="Italic (Ctrl/Cmd+I)"
                            disabled={!formattingEnabled}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => editor.chain().focus().toggleItalic().run()}
                        >
                            <Italic size={16} />
                        </button>

                        <button
                            className={btn(editor.isActive('underline'))}
                            title="Underline (Ctrl/Cmd+U)"
                            disabled={!formattingEnabled}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => editor.chain().focus().toggleUnderline().run()}
                        >
                            <Underline size={16} />
                        </button>

                        <button
                            className={btn(editor.isActive('strike'))}
                            title="Strikethrough"
                            disabled={!formattingEnabled}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => editor.chain().focus().toggleStrike().run()}
                        >
                            <Strikethrough size={16} />
                        </button>
                    </div>

                    <div className="editor-ribbon-btn-group">
                        <button
                            className={btn(editor.isActive('code'))}
                            title="Inline Code"
                            disabled={!formattingEnabled}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => editor.chain().focus().toggleCode().run()}
                        >
                            <Code size={16} />
                        </button>

                        <button
                            className={btn(editor.isActive('highlight'))}
                            title="Highlight"
                            disabled={!formattingEnabled}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => editor.chain().focus().toggleHighlight().run()}
                        >
                            <Highlighter size={16} />
                        </button>
                    </div>

                    {/* Text Color */}
                    <div className="editor-ribbon-color-picker" title="Text Color">
                        <button className="editor-ribbon-btn" disabled={!formattingEnabled}>
                            <Type size={16} />
                            <div
                                className="editor-ribbon-color-preview"
                                style={{
                                    backgroundColor: formattingEnabled
                                        ? (editor.getAttributes('textStyle').color || 'var(--vscode-foreground)')
                                        : 'var(--vscode-foreground)'
                                }}
                            />
                        </button>
                        <input
                            type="color"
                            disabled={!formattingEnabled}
                            onInput={(e) => editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()}
                            value={editor.getAttributes('textStyle').color || '#ffffff'}
                        />
                    </div>

                    {/* Link */}
                    <button
                        className={btn(editor.isActive('link'))}
                        title="Insert Link"
                        disabled={!formattingEnabled}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                            const url = window.prompt('Enter URL:')
                            if (url) {
                                editor.chain().focus().setLink({ href: url }).run()
                            }
                        }}
                    >
                        <Link2 size={16} />
                    </button>
                </div>

                <div className="editor-ribbon-separator" />

                {/* LIST Section */}
                <div className="editor-ribbon-section">
                    <span className="editor-ribbon-section-label">List</span>

                    {listIndentEnabled && listLevel > 0 && (
                        <span className="editor-ribbon-level-chip" title="Nesting level">
                            L{listLevel}
                        </span>
                    )}

                    <div className="editor-ribbon-btn-group">
                        <button
                            className="editor-ribbon-btn"
                            title="Outdent (Shift+Tab)"
                            disabled={!listIndentEnabled}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => editor.chain().focus().liftListItem(itemType).run()}
                        >
                            <IndentDecrease size={16} />
                        </button>

                        <button
                            className="editor-ribbon-btn"
                            title="Indent (Tab)"
                            disabled={!listIndentEnabled}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => editor.chain().focus().sinkListItem(itemType).run()}
                        >
                            <IndentIncrease size={16} />
                        </button>
                    </div>

                    <div className="editor-ribbon-btn-group">
                        <button
                            className={btn(editor.isActive('bulletList'))}
                            title="Bullet List"
                            disabled={!listTypeEnabled}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => editor.chain().focus().toggleBulletList().run()}
                        >
                            <List size={16} />
                        </button>

                        <button
                            className={btn(editor.isActive('orderedList'))}
                            title="Numbered List"
                            disabled={!listTypeEnabled}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        >
                            <ListOrdered size={16} />
                        </button>

                        <button
                            className={btn(editor.isActive('taskList'))}
                            title="Task List"
                            disabled={!listTypeEnabled}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => editor.chain().focus().toggleTaskList().run()}
                        >
                            <CheckSquare size={16} />
                        </button>
                    </div>
                </div>

                <div className="editor-ribbon-separator" />

                {/* TABLE Section */}
                <div className="editor-ribbon-section">
                    <span className="editor-ribbon-section-label">Table</span>

                    <div className="editor-ribbon-btn-group">
                        <button
                            className="editor-ribbon-btn"
                            title="Add Row Above"
                            disabled={!tableEnabled}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => editor.chain().focus().addRowBefore().run()}
                        >
                            <ArrowUpToLine size={16} />
                        </button>

                        <button
                            className="editor-ribbon-btn"
                            title="Add Row Below"
                            disabled={!tableEnabled}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => editor.chain().focus().addRowAfter().run()}
                        >
                            <ArrowDownToLine size={16} />
                        </button>

                        <button
                            className="editor-ribbon-btn"
                            title="Delete Row"
                            disabled={!tableEnabled}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => editor.chain().focus().deleteRow().run()}
                        >
                            <Rows2 size={16} />
                        </button>
                    </div>

                    <div className="editor-ribbon-btn-group">
                        <button
                            className="editor-ribbon-btn"
                            title="Add Column Before"
                            disabled={!tableEnabled}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => editor.chain().focus().addColumnBefore().run()}
                        >
                            <ArrowLeftToLine size={16} />
                        </button>

                        <button
                            className="editor-ribbon-btn"
                            title="Add Column After"
                            disabled={!tableEnabled}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => editor.chain().focus().addColumnAfter().run()}
                        >
                            <ArrowRightToLine size={16} />
                        </button>

                        <button
                            className="editor-ribbon-btn"
                            title="Delete Column"
                            disabled={!tableEnabled}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => editor.chain().focus().deleteColumn().run()}
                        >
                            <Columns2 size={16} />
                        </button>
                    </div>

                    <div className="editor-ribbon-btn-group">
                        <button
                            className="editor-ribbon-btn"
                            title="Merge Cells (select multiple cells first)"
                            disabled={!tableEnabled}
                            onMouseDown={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                editor.commands.mergeCells()
                            }}
                        >
                            <Combine size={16} />
                        </button>

                        <button
                            className="editor-ribbon-btn"
                            title="Split Cell (only works on merged cells)"
                            disabled={!tableEnabled}
                            onMouseDown={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                editor.commands.splitCell()
                            }}
                        >
                            <Split size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
