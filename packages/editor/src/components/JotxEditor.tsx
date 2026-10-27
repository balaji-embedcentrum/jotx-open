/**
 * JotxEditor - Main Tiptap editor with block support
 * Modular, extensible, beautiful
 */

import React, { useEffect, useState, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { Extension } from '@tiptap/core'
import { NodeSelection, TextSelection } from '@tiptap/pm/state'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Link from '@tiptap/extension-link'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import Highlight from '@tiptap/extension-highlight'

// Define Global Attribute Extension for Block IDs
const BlockIdExtension = Extension.create({
  name: 'blockId',
  addGlobalAttributes() {
    return [
      {
        types: [
          'heading', 'paragraph', 'codeBlock', 'blockquote',
          'imageBlock', 'videoBlock', 'floatImageBlock',
          'math', 'mermaid', 'chart', 'datetime', 'linkCard',
          'callout', 'toggle', 'section', 'jotxlink',
          'bulletList', 'orderedList', 'listItem', 'taskItem', 'taskList',
          'horizontalRule', 'linkBlock', 'attach', 'table', 'tableRow', 'tableCell',
          'codeReference'
        ],
        attributes: {
          blockId: {
            default: null,
            keepOnSplit: false,
            renderHTML: attributes => {
              if (!attributes.blockId) return {}
              return { 'data-id': attributes.blockId }
            },
            parseHTML: element => element.getAttribute('data-id'),
          },
        },
      },
    ]
  },
})
import { GenericTiptapAdapter } from '@jotx-labs/react-renderer'
import { SlashMenuExtension, slashMenuPluginKey } from '../extensions/SlashMenuExtension'
import { FormattingExtensions } from '../extensions/formatting'
import { CalloutNode } from '../extensions/CalloutNode'
import { AttachNode } from '../extensions/AttachNode'
import { MermaidNode } from '../extensions/MermaidNode'
import { ChartNode } from '../extensions/ChartNode'
import { JotxLinkNode } from '../extensions/JotxLinkNode'
import { ImageNode } from '../extensions/ImageNode'
import { ImageBlockNode } from '../extensions/ImageBlockNode'
import { getVSCodeAPI } from '../bridge/vscode-api'
import { FloatImageBlockNode } from '../extensions/FloatImageBlockNode'
import { VideoBlockNode } from '../extensions/VideoBlockNode'
import { CodeBlockNode } from '../extensions/CodeBlockNode'
import { CodeReferenceNode } from '../extensions/CodeReferenceNode'
import { JotxTable } from '../extensions/JotxTable'
import { TableFilterExtension } from '../extensions/TableFilterExtension'
import { DateTimeNode } from '../extensions/DateTimeNode'
import { MathNode } from '../extensions/MathNode'
import { BlockOpsExtension } from '../extensions/BlockOpsExtension'
import { CalloutActionsExtension } from '../extensions/CalloutActionsExtension'
import { LinkNode } from '../extensions/LinkNode'
import { GridCardNode } from '../extensions/GridCardNode'
import { CardNode } from '../extensions/CardNode'
import { ButtonNode } from '../extensions/ButtonNode'
import { ButtonStripNode } from '../extensions/ButtonStripNode'
import { ToggleNode } from '../extensions/ToggleNode'
import { UrlInputDialog } from './UrlInputDialog'
import { SectionNode } from '../extensions/SectionNode'
import { ColumnsNode, ColumnNode, columnsInsertContent } from '../extensions/ColumnsNode'
import { WidgetExtensions, WIDGET_NAMES, widgetInsertContent } from '../widgets'
import { SlashMenu } from './SlashMenu'
import { OutlineRail } from './OutlineRail'
import '../styles/tokens.css'
import '../styles/JotxEditor.css'
import '../styles/Page.css'
import '../styles/ImageVideoBlocks.css'
import { openExternal, pickAttachmentFile, savePastedImage } from '../bridge/bridge-utils'
import { logger } from '../utils/logger'
import { editorDom, useEditorDom } from '../utils/editorDom'
import { EditorModeProvider, useEditorMode, useHasEditorModeProvider } from '../contexts/EditorModeContext'
import { LinkDialog } from './LinkDialog'
import { TableToolbar } from './TableToolbar'
import { ImageToolbar } from './ImageToolbar'
import { BlockMenu } from './BlockMenu'
import { SearchBar } from './SearchBar'
import { SearchExtension, searchPluginKey } from '../extensions/SearchExtension'
// SpellCheckExtension removed - requires nspell (VS Code only)
import { EditorRibbon, type EditorContext } from './EditorRibbon'
import '../styles/SearchHighlight.css'

export interface JotxEditorProps {
  documentId: string
  documentType: 'page' | 'meeting' | 'tasklist'
  tiptapDoc: any  // Tiptap JSON document (jotx 2.0)
  onChange?: (tiptapJson: string) => void  // Sends Tiptap JSON string
  ribbonExpanded?: boolean  // Ribbon toolbar visibility
  outline?: boolean  // "On this page" rail beside wide pages (off for embeds inside other sites)
}

function JotxEditorInner({
  documentId,
  documentType,
  tiptapDoc,
  onChange,
  ribbonExpanded = false,
  outline = true
}: JotxEditorProps) {
  logger.log('🎨 JotxEditor component rendering (jotx 2.0)', { documentId, documentType, tiptapDoc })

  const { isPreview } = useEditorMode()

  // Debug: Check for jotxlink nodes in the document
  const checkForJotxLink = (content: any[]): number => {
    let count = 0;
    for (const node of content || []) {
      if (node.type === 'jotxlink') count++;
      if (node.content) count += checkForJotxLink(node.content);
    }
    return count;
  };
  const jotxLinkCount = tiptapDoc?.content ? checkForJotxLink(tiptapDoc.content) : 0;
  logger.log(`🔗 JotxLink nodes in document: ${jotxLinkCount}`);

  const [showSlashMenu, setShowSlashMenu] = useState(false)
  const [slashMenuPosition, setSlashMenuPosition] = useState({ x: 0, y: 0 })
  const [slashMenuQuery, setSlashMenuQuery] = useState('')
  const [calloutToolbar, setCalloutToolbar] = useState<{
    visible: boolean
    x: number
    y: number
    variant: 'info' | 'warning' | 'success' | 'danger'
  }>({ visible: false, x: 0, y: 0, variant: 'info' })
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [showSearchBar, setShowSearchBar] = useState(false)
  const [searchState, setSearchState] = useState({ currentMatch: 0, totalMatches: 0 })
  const [showUrlInputDialog, setShowUrlInputDialog] = useState(false)
  const [urlInputType, setUrlInputType] = useState<'image'>('image')
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const [availableTemplates, setAvailableTemplates] = useState<Array<{ name: string; fileName: string }>>([])
  const [editorContext, setEditorContext] = useState<EditorContext>('paragraph')
  const isLoadingExternalChange = useRef(false)

  logger.log('⚙️ Creating Tiptap editor with initial content...')
  logger.log('🔍 Registering extensions:', {
    ImageBlockNode: ImageBlockNode.name,
    FloatImageBlockNode: FloatImageBlockNode.name,
    VideoBlockNode: VideoBlockNode.name
  })

  // Initialize Generic Adapter
  const genericAdapter = new GenericTiptapAdapter()
  // Hand-written nodes (columns, widgets) replace the registry's generic placeholders
  const genericExtensions = genericAdapter.getExtensions()
    .filter((ext: any) => !WIDGET_NAMES.has(ext.name) && ext.name !== 'columns' && ext.name !== 'column')

  const editor = useEditor({
    content: tiptapDoc || { type: 'doc', content: [] },
    extensions: [
      BlockIdExtension, // Add Custom Global Attribute Extension
      BlockOpsExtension,
      CalloutActionsExtension,
      SearchExtension,
      StarterKit.configure({
        codeBlock: false, // Registry (We use CodeBlockNode)
        heading: {},
        bulletList: {},
        orderedList: {},
        listItem: {},
        dropcursor: {
          color: 'var(--vscode-editorCursor-foreground)',
          width: 2,
        },
        gapcursor: false,
      }),
      // Dynamic blocks from Registry
      ...genericExtensions,

      // Keep these for now until migrated
      CodeReferenceNode,
      CodeBlockNode,
      // Note: Link extension removed - already in genericExtensions from registry
      ImageNode.configure({
        inline: false,
        allowBase64: true
      }),
      ImageBlockNode,
      FloatImageBlockNode,
      VideoBlockNode,
      TaskList.configure({}),
      TaskItem.configure({
        nested: true
      }),
      // Custom table nodes so we can persist filter/sort state as data attributes
      JotxTable.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TableFilterExtension,
      Highlight.configure({
        multicolor: false
      }),
      CalloutNode,
      AttachNode,
      LinkNode,
      MermaidNode,
      ChartNode,
      JotxLinkNode,
      DateTimeNode,
      MathNode,
      ToggleNode,
      SectionNode,
      GridCardNode,
      CardNode,
      ButtonNode,
      ButtonStripNode,
      ColumnsNode,
      ColumnNode,
      ...WidgetExtensions,
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') {
            return 'Heading'
          }
          return 'Type \'/\' for commands...'
        }
      }),
      ...FormattingExtensions,
      SlashMenuExtension.configure({
        onOpen: (position, query) => {
          logger.log('🎉 SlashMenu onOpen called!', { position, query })
          setShowSlashMenu(true)
          setSlashMenuPosition(position)
          setSlashMenuQuery(query)
        },
        onClose: () => {
          logger.log('🚪 SlashMenu onClose called!')
          setShowSlashMenu(false)
          setSlashMenuQuery('')
        },
        onQueryChange: (query) => {
          logger.log('📝 SlashMenu onQueryChange:', query)
          setSlashMenuQuery(query)
        }
      }),
      // SpellCheckExtension removed - requires nspell (VS Code only)
    ],
    editorProps: {
      attributes: {
        class: 'jotx-editor-content'
      },
      handlePaste: (_view, event) => {
        try {
          const dt = (event as ClipboardEvent).clipboardData
          if (!dt) return false

          // 2) Check for images first (raster or SVG)
          const items = Array.from(dt.items || [])
          const imgItem = items.find((it) => it.kind === 'file' && it.type.startsWith('image/'))

          if (imgItem) {
            // Image file from clipboard - AUTO CREATE IMAGE BLOCK
            const file = imgItem.getAsFile()
            if (!file) return false

              ; (async () => {
                logger.log('📋 PASTED IMAGE - Auto-creating image block', file)

                // Convert to PNG (preferred) via canvas
                let pngBase64: string | null = null
                try {
                  const bmp = await (window as any).createImageBitmap?.(file)
                  if (bmp) {
                    const canvas = document.createElement('canvas')
                    canvas.width = bmp.width
                    canvas.height = bmp.height
                    const ctx = canvas.getContext('2d')
                    ctx?.drawImage(bmp, 0, 0)
                    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
                    if (blob) {
                      pngBase64 = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader()
                        reader.onerror = () => reject(new Error('Failed to read PNG blob'))
                        reader.onload = () => {
                          const s = (reader.result || '').toString()
                          const idx = s.indexOf(',')
                          resolve(idx >= 0 ? s.slice(idx + 1) : s)
                        }
                        reader.readAsDataURL(blob)
                      })
                    }
                  }
                } catch {
                  // ignore, fallback below
                }

                const base64 =
                  pngBase64 ||
                  (await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader()
                    reader.onerror = () => reject(new Error('Failed to read image from clipboard'))
                    reader.onload = () => {
                      const s = (reader.result || '').toString()
                      const idx = s.indexOf(',')
                      resolve(idx >= 0 ? s.slice(idx + 1) : s)
                    }
                    reader.readAsDataURL(file)
                  }))

                const res = await savePastedImage({ mime: 'image/png', base64 })

                // AUTO INSERT IMAGE BLOCK (not inline image)
                editor
                  ?.chain()
                  .focus()
                  .insertContent([
                    {
                      type: 'imageBlock',
                      attrs: {
                        src: res.webviewUri,
                        alt: '',
                        width: 800,
                        height: 'auto',
                        align: 'center',
                        caption: ''
                      }
                    },
                    { type: 'paragraph' }
                  ])
                  .run()

                logger.log('✅ Image block auto-created!')
              })()

            event.preventDefault()
            return true
          }

          // 1) SVG paste as text (fallback)
          const text = dt.getData('text/plain') || ''
          if (text.trim().startsWith('<svg')) {
            ; (async () => {
              const res = await savePastedImage({ mime: 'image/svg+xml', text })
              editor
                ?.chain()
                .focus()
                .insertContent([
                  {
                    type: 'imageBlock',
                    attrs: {
                      src: res.webviewUri,
                      alt: '',
                      width: 800,
                      height: 'auto',
                      align: 'center',
                      caption: ''
                    }
                  },
                  { type: 'paragraph' }
                ])
                .run()
            })()
            event.preventDefault()
            return true
          }

          // No image found
          return false
        } catch (e) {
          logger.warn('paste handler failed', e)
          return false
        }
      }
    },
    onUpdate: ({ editor }) => {
      // Don't trigger onChange if we're loading an external change
      if (isLoadingExternalChange.current) {
        logger.log('⏭️ Skipping onChange - loading external change')
        return
      }

      // Send Tiptap JSON instead of HTML for proper conversion
      const json = editor.getJSON()
      onChange?.(JSON.stringify(json))
    }
  })
  const editorElement = useEditorDom(editor)

  // Update search state from plugin
  const updateSearchState = () => {
    if (!editor) {
      setSearchState({ currentMatch: 0, totalMatches: 0 })
      return
    }

    const state = editor.state
    const pluginState = searchPluginKey.getState(state)

    if (!pluginState) {
      setSearchState({ currentMatch: 0, totalMatches: 0 })
      return
    }

    setSearchState({
      currentMatch: pluginState.matches.length > 0 ? pluginState.currentIndex + 1 : 0,
      totalMatches: pluginState.matches.length
    })
  }

  // Search handlers
  const handleSearch = (query: string) => {
    if (!editor) return
    editor.commands.setSearchTerm(query)

    // Update state and scroll after plugin updates
    setTimeout(() => {
      updateSearchState()
      const state = editor.state
      const pluginState = searchPluginKey.getState(state)
      if (pluginState && pluginState.matches.length > 0) {
        scrollToCurrentMatch()
      }
    }, 10)
  }

  const handleNextMatch = () => {
    if (!editor) return
    editor.commands.nextSearchMatch()
    setTimeout(() => {
      updateSearchState()
      scrollToCurrentMatch()
    }, 10)
  }

  const handlePreviousMatch = () => {
    if (!editor) return
    editor.commands.previousSearchMatch()
    setTimeout(() => {
      updateSearchState()
      scrollToCurrentMatch()
    }, 10)
  }

  const handleCloseSearch = () => {
    if (!editor) return
    editor.commands.clearSearch()
    setShowSearchBar(false)
    setSearchState({ currentMatch: 0, totalMatches: 0 })
  }

  // Sync Tiptap editable state with preview mode
  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    editor.setEditable(!isPreview)
    // A selected block would keep its edit ring while reading
    const { state } = editor
    if (isPreview && editorDom(editor) && state.selection instanceof NodeSelection) {
      editor.view.dispatch(state.tr.setSelection(TextSelection.atStart(state.doc)))
    }
  }, [editor, isPreview])

  const scrollToCurrentMatch = () => {
    if (!editor) return

    const state = editor.state
    const pluginState = searchPluginKey.getState(state)

    if (!pluginState || pluginState.matches.length === 0) return

    const currentMatch = pluginState.matches[pluginState.currentIndex]
    if (!currentMatch) return

    try {
      // Find the DOM node at the current match position
      const view = editor.view
      const domAtPos = view.domAtPos(currentMatch.from)

      if (domAtPos.node) {
        // Get the element (either the node itself or its parent if it's a text node)
        const element = domAtPos.node.nodeType === Node.TEXT_NODE
          ? domAtPos.node.parentElement
          : domAtPos.node as HTMLElement

        if (element && element instanceof HTMLElement) {
          // Scroll the element into view with smooth behavior
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          })
        }
      }
    } catch (error) {
      logger.warn('Failed to scroll to match:', error)
    }
  }

  // Keyboard shortcuts for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl+F to open search
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault()
        setShowSearchBar(true)
        return
      }

      // Escape to close search (only if search is open)
      if (showSearchBar && e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        handleCloseSearch()
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown, true) // Use capture phase
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [showSearchBar, editor])

  useEffect(() => {
    logger.log('✅ Editor initialized:', !!editor)
    if (editor && !editor.isDestroyed) {
      logger.log('🔍 Registered node types in schema:', Object.keys(editor.schema.nodes))
      logger.log('🔍 imageBlock node:', editor.schema.nodes.imageBlock)
      logger.log('🔍 floatImageBlock node:', editor.schema.nodes.floatImageBlock)
      logger.log('🔍 videoBlock node:', editor.schema.nodes.videoBlock)

      const currentContent = JSON.stringify(editor.getJSON())
      const newContent = JSON.stringify(tiptapDoc)

      logger.log('📄 Editor content update check:')
      logger.log('   - New tiptapDoc:', newContent?.substring(0, 200))
      logger.log('   - Current content:', currentContent?.substring(0, 200))
      logger.log('   - Are different?', currentContent !== newContent)

      if (currentContent !== newContent) {
        logger.log('   ➡️ Setting content in Tiptap from external change')
        isLoadingExternalChange.current = true

        // Update content without triggering onUpdate callback
        editor.commands.setContent(tiptapDoc || { type: 'doc', content: [] })

        // Reset flag immediately after setContent completes
        setTimeout(() => {
          isLoadingExternalChange.current = false
          logger.log('   ✅ Content set, onChange re-enabled')
        }, 50)
      } else {
        logger.log('   ⏭️ Content unchanged, skipping')
      }
    }
  }, [tiptapDoc, editor])

  const handleSlashCommand = (command: string) => {
    logger.log('⚡ handleSlashCommand:', command)
    if (!editor) {
      logger.error('❌ Editor not available!')
      return
    }

    setShowSlashMenu(false)

    // Delete the "/query" trigger text before inserting the block (Notion-like UX)
    try {
      const pluginState = slashMenuPluginKey.getState(editor.state) as any
      if (pluginState?.range?.from != null && pluginState?.range?.to != null) {
        editor
          .chain()
          .focus()
          .deleteRange({ from: pluginState.range.from, to: pluginState.range.to })
          .run()
      }
    } catch {
      // non-fatal
    }

    const widgetContent = widgetInsertContent(command)
    if (widgetContent) {
      editor.chain().focus().insertContent(widgetContent).run()
      return
    }

    switch (command) {
      case 'columns2':
      case 'columns3':
        editor.chain().focus().insertContent(columnsInsertContent(command === 'columns2' ? 2 : 3)).run()
        break
      case 'heading1':
        logger.log('📝 Setting Heading 1')
        editor.chain().focus().setNode('heading', { level: 1 }).run()
        break
      case 'heading2':
        logger.log('📝 Setting Heading 2')
        editor.chain().focus().setNode('heading', { level: 2 }).run()
        break
      case 'heading3':
        logger.log('📝 Setting Heading 3')
        editor.chain().focus().setNode('heading', { level: 3 }).run()
        break
      case 'paragraph':
        logger.log('📝 Setting Paragraph')
        editor.chain().focus().setParagraph().run()
        break
      case 'bulletList':
        logger.log('📝 Setting Bullet List')
        editor.chain().focus().toggleBulletList().run()
        break
      case 'orderedList':
        logger.log('📝 Setting Ordered List')
        editor.chain().focus().toggleOrderedList().run()
        break
      case 'checklist':
        logger.log('📝 Setting Checklist')
        editor.chain().focus().toggleTaskList().run()
        break
      case 'blockquote':
        logger.log('📝 Setting Blockquote')
        editor.chain().focus().toggleBlockquote().run()
        break
      case 'codeBlock':
        logger.log('📝 Setting Code Block')
        editor.chain().focus().setNode('codeBlock', { language: 'plaintext' }).run()
        break
      case 'divider':
        logger.log('📝 Setting Divider')
        editor.chain().focus().setHorizontalRule().run()
        // Force update to ensure persistence
        setTimeout(() => editor.commands.focus(), 10)
        break
      case 'callout': {
        editor.chain().focus().wrapIn('callout', { variant: 'info' }).run()
        break
      }
      case 'image': {
        setUrlInputType('image')
        setShowUrlInputDialog(true)
        break
      }
      case 'link': {
        setShowLinkDialog(true)
        break
      }
      case 'attach': {
        ; (async () => {
          const picked = await pickAttachmentFile()
          if (!picked) return
          editor
            .chain()
            .focus()
            .insertContent([
              {
                type: 'attach',
                attrs: { path: picked.path },
                content: [{ type: 'paragraph', content: [{ type: 'text', text: picked.name }] }]
              },
              { type: 'paragraph' }
            ])
            .run()
        })()
        break
      }
      case 'table': {
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        break
      }
      case 'mermaid': {
        editor
          .chain()
          .focus()
          .insertContent([
            {
              type: 'mermaid',
              attrs: {
                src: 'flowchart TD\n  A[Start] --> B{Decision}\n  B -->|Yes| C[OK]\n  B -->|No| D[Fix]\n'
              }
            },
            { type: 'paragraph' }
          ])
          .run()
        break
      }
      case 'chart': {
        const json = JSON.stringify(
          { labels: ['Jan', 'Feb', 'Mar', 'Apr'], datasets: [{ label: 'Events', data: [12, 19, 8, 15] }] },
          null,
          2
        )
        editor.chain().focus().insertContent([{ type: 'chart', attrs: { chartType: 'bar', json } }, { type: 'paragraph' }]).run()
        break
      }
      case 'datetime': {
        editor
          .chain()
          .focus()
          .insertContent([{ type: 'datetime', attrs: { mode: 'datetime', value: '' } }, { type: 'paragraph' }])
          .run()
        break
      }
      case 'math': {
        editor.chain().focus().insertContent([{ type: 'math', attrs: { src: '', display: 'block' } }, { type: 'paragraph' }]).run()
        break
      }
      case 'jotxlink': {
        editor.chain().focus().insertContent([{ type: 'jotxlink', attrs: { refType: '', refId: '' } }, { type: 'paragraph' }]).run()
        break
      }
      case 'toggle': {
        editor
          .chain()
          .focus()
          .insertContent([
            {
              type: 'toggle',
              attrs: { title: 'Toggle', collapsed: false },
              content: [{ type: 'paragraph' }]
            },
            { type: 'paragraph' }
          ])
          .run()
        break
      }
      case 'section': {
        editor
          .chain()
          .focus()
          .insertContent([
            {
              type: 'section',
              attrs: { title: 'Section', collapsed: false },
              content: [{ type: 'paragraph' }]
            },
            { type: 'paragraph' }
          ])
          .run()
        break
      }
      case 'gridcard': {
        editor
          .chain()
          .focus()
          .insertContent([
            {
              type: 'gridcard',
              attrs: { layout: '2x2' },
              content: [
                { type: 'card', attrs: { title: 'Card 1', value: '', icon: '📝', color: 'teal', link: '' } },
                { type: 'card', attrs: { title: 'Card 2', value: '', icon: '📊', color: 'blue', link: '' } },
                { type: 'card', attrs: { title: 'Card 3', value: '', icon: '🚀', color: 'green', link: '' } },
                { type: 'card', attrs: { title: 'Card 4', value: '', icon: '⚙️', color: 'purple', link: '' } }
              ]
            },
            { type: 'paragraph' }
          ])
          .run()
        break
      }
      case 'button': {
        editor
          .chain()
          .focus()
          .insertContent([
            { type: 'button', attrs: { label: 'Click Me', link: '', style: 'primary', align: 'left' } },
            { type: 'paragraph' }
          ])
          .run()
        // Note: Sync is handled by ButtonNodeView setting _initialized on mount
        break
      }
      case 'buttonstrip': {
        // Insert buttonstrip with 3 default buttons
        editor
          .chain()
          .focus()
          .insertContent([
            {
              type: 'buttonstrip',
              content: [
                { type: 'button', attrs: { label: 'Button 1', link: '', style: 'primary', align: 'center' } },
                { type: 'button', attrs: { label: 'Button 2', link: '', style: 'secondary', align: 'center' } },
                { type: 'button', attrs: { label: 'Button 3', link: '', style: 'outline', align: 'center' } }
              ]
            },
            { type: 'paragraph' }
          ])
          .run()
        break
      }
      case 'imageBlock': {
        logger.log('📝 Inserting Image Block')
        logger.log('🔍 Editor state BEFORE insert:', editor.state.doc.toJSON())
        logger.log('🔍 Available node types:', Object.keys(editor.schema.nodes))
        logger.log('🔍 ImageBlock node exists?', !!editor.schema.nodes.imageBlock)

        const content = {
          type: 'imageBlock',
          attrs: {
            src: '',
            alt: '',
            width: 800,
            height: 'auto',
            align: 'center',
            caption: ''
          }
        }
        logger.log('🔍 Inserting content:', JSON.stringify(content, null, 2))

        try {
          const result = editor
            .chain()
            .focus()
            .insertContent([content, { type: 'paragraph' }])
            .run()
          logger.log('✅ insertContent result:', result)
          logger.log('🔍 Editor state AFTER insert:', editor.state.doc.toJSON())
        } catch (error) {
          logger.error('❌ insertContent ERROR:', error)
        }
        break
      }
      case 'floatImageBlock': {
        logger.log('📝 Inserting Float Image Block (CONTAINER)')
        logger.log('🔍 FloatImageBlock node exists?', !!editor.schema.nodes.floatImageBlock)

        // Float image is now a CONTAINER with content inside
        const content = {
          type: 'floatImageBlock',
          attrs: {
            src: '',
            alt: '',
            width: 400,
            height: 'auto',
            float: 'left',
            caption: ''
          },
          content: [
            {
              type: 'paragraph'
            }
          ]
        }
        logger.log('🔍 Inserting content:', JSON.stringify(content, null, 2))

        try {
          const result = editor
            .chain()
            .insertContent([content, { type: 'paragraph' }])
            .run()
          logger.log('✅ insertContent result:', result)
        } catch (error) {
          logger.error('❌ insertContent ERROR:', error)
        }
        break
      }
      case 'videoBlock': {
        logger.log('📝 Inserting Video Block')
        logger.log('🔍 VideoBlock node exists?', !!editor.schema.nodes.videoBlock)

        const content = {
          type: 'videoBlock',
          attrs: {
            type: 'youtube',
            url: '',
            src: '',
            title: '',
            width: 800,
            height: 450,
            controls: 'true',
            autoplay: 'false',
            muted: 'false',
            loop: 'false'
          }
        }
        logger.log('🔍 Inserting content:', JSON.stringify(content, null, 2))

        try {
          const result = editor
            .chain()
            .focus()
            .insertContent([content, { type: 'paragraph' }])
            .run()
          logger.log('✅ insertContent result:', result)
        } catch (error) {
          logger.error('❌ insertContent ERROR:', error)
        }
        break
      }
      case 'codeReference': {
        editor
          .chain()
          .focus()
          .insertContent([
            {
              type: 'codeReference',
              attrs: { path: '', lines: '', language: '' }
            },
            { type: 'paragraph' }
          ])
          .run()
        break
      }

      case 'useTemplate': {
        // Request template list from backend
        logger.log('🔵 useTemplate clicked - requesting template list from backend')
        const vscode = getVSCodeAPI()
        vscode.postMessage({
          type: 'requestTemplateList'
        })
        logger.log('📤 postMessage sent: requestTemplateList')
        break
      }
    }

    // CRITICAL: Force trigger save after any block insertion
    // Tiptap's onUpdate may not fire synchronously, causing data loss on close
    setTimeout(() => {
      if (editor) {
        const json = editor.getJSON()
        onChange?.(JSON.stringify(json))
        logger.log('🔄 Flushed save after block insertion')
      }
    }, 50)
  }

  const getTableContext = (): { inTableCell: boolean; inPropertiesTable: boolean } => {
    if (!editor) return { inTableCell: false, inPropertiesTable: false }
    const inTableCell = editor.isActive('table')
    if (!inTableCell) return { inTableCell: false, inPropertiesTable: false }
    try {
      const { from } = editor.state.selection
      const domAt = editor.view.domAtPos(from).node as any
      const el: HTMLElement | null =
        domAt?.nodeType === 1 ? (domAt as HTMLElement) : (domAt?.parentElement as HTMLElement | null)
      const table = el?.closest?.('table') as HTMLTableElement | null
      if (!table) return { inTableCell: true, inPropertiesTable: false }
      const ths = Array.from(table.querySelectorAll('th')).slice(0, 3)
      const header = ths.map((t) => (t.textContent || '').trim().toLowerCase())
      const inPropertiesTable = header[0] === 'key' && header[1] === 'value' && header[2] === 'type'
      return { inTableCell: true, inPropertiesTable }
    } catch {
      return { inTableCell: true, inPropertiesTable: false }
    }
  }

  const getActiveCalloutVariant = (): string | null => {
    if (!editor) return null
    const { $from } = editor.state.selection
    for (let d = $from.depth; d > 0; d--) {
      const node = $from.node(d)
      if (node.type?.name === 'callout') {
        return (node.attrs?.variant as string) || 'info'
      }
    }
    return null
  }

  const setCalloutVariant = (variant: 'info' | 'warning' | 'success' | 'danger') => {
    if (!editor) return
    const { $from } = editor.state.selection
    for (let d = $from.depth; d > 0; d--) {
      const node = $from.node(d)
      if (node.type?.name === 'callout') {
        const pos = $from.before(d)
        const tr = editor.state.tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          variant
        })
        editor.view.dispatch(tr)
        editor.commands.focus()
        setCalloutToolbar((s) => ({ ...s, variant }))
        return
      }
    }
  }

  // Floating callout toolbar (variant picker)
  useEffect(() => {
    if (!editor) return

    const update = () => {
      // Only offer the picker while the user is actually editing inside a callout
      const variant = editor.isFocused && editor.isEditable ? getActiveCalloutVariant() : null
      if (!variant) {
        setCalloutToolbar((s) => (s.visible ? { ...s, visible: false } : s))
        return
      }
      const v = (variant as any) as 'info' | 'warning' | 'success' | 'danger'
      const { from } = editor.state.selection
      const coords = editor.view.coordsAtPos(from)
      const inTable = editor.isActive('table')
      // Position above selection; if inside a table, offset further up so it doesn't overlap table toolbar
      const x = Math.max(12, Math.min(window.innerWidth - 220, coords.left))
      const y = Math.max(12, coords.top - (inTable ? 92 : 48))
      setCalloutToolbar({ visible: true, x, y, variant: v || 'info' })
    }

    // Blur is deferred so clicking a chip (which keeps focus via preventDefault) still works
    const hideSoon = () => window.setTimeout(update, 120)

    update()
    editor.on('selectionUpdate', update)
    editor.on('transaction', update)
    editor.on('focus', update)
    editor.on('blur', hideSoon)

    return () => {
      editor.off('selectionUpdate', update)
      editor.off('transaction', update)
      editor.off('focus', update)
      editor.off('blur', hideSoon)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor])

  // Context detection for ribbon toolbar
  useEffect(() => {
    if (!editor) return

    const detectContext = () => {
      if (editor.isActive('table')) {
        setEditorContext('table')
      } else if (editor.isActive('bulletList') || editor.isActive('orderedList') || editor.isActive('taskList')) {
        setEditorContext('list')
      } else if (editor.isActive('mermaid')) {
        setEditorContext('mermaid')
      } else if (editor.isActive('chart')) {
        setEditorContext('chart')
      } else if (editor.isActive('codeBlock')) {
        setEditorContext('code')
      } else if (editor.isActive('math')) {
        setEditorContext('math')
      } else if (editor.isActive('callout')) {
        setEditorContext('callout')
      } else if (editor.isActive('image') || editor.isActive('imageBlock')) {
        setEditorContext('image')
      } else if (editor.isActive('heading')) {
        setEditorContext('heading')
      } else {
        setEditorContext('paragraph')
      }
    }

    detectContext()
    editor.on('selectionUpdate', detectContext)
    editor.on('transaction', detectContext)

    return () => {
      editor.off('selectionUpdate', detectContext)
      editor.off('transaction', detectContext)
    }
  }, [editor])

  // Update search state when editor state changes
  useEffect(() => {
    if (!editor || !showSearchBar) return

    const updateHandler = () => {
      updateSearchState()
    }

    editor.on('transaction', updateHandler)
    return () => {
      editor.off('transaction', updateHandler)
    }
  }, [editor, showSearchBar])

  // Listen for template list from backend
  useEffect(() => {
    const handleTemplateList = (event: any) => {
      logger.log('📥 Received templateList event:', event.detail)
      const templates = event.detail as Array<{ name: string; fileName: string }>
      logger.log('📋 Templates:', templates)
      setAvailableTemplates(templates)
      setShowTemplatePicker(true)
      logger.log('✅ Modal should now be visible')
    }

    const handleTemplateContent = (event: any) => {
      logger.log('📥 handleTemplateContent called')
      logger.log('📥 event.detail:', event.detail)
      const tiptapBlocks = event.detail
      logger.log('📥 tiptapBlocks:', tiptapBlocks)
      logger.log('📥 tiptapBlocks?.content:', tiptapBlocks?.content)
      logger.log('📥 editor available:', !!editor)
      if (editor && tiptapBlocks && tiptapBlocks.content) {
        logger.log('📥 Inserting template content:', tiptapBlocks.content.length, 'blocks')
        // Insert the template blocks at the current cursor position
        editor
          .chain()
          .focus()
          .insertContent(tiptapBlocks.content)
          .run()
        logger.log('✅ Template inserted successfully')
      } else {
        logger.warn('⚠️ Cannot insert template - missing data:', {
          hasEditor: !!editor,
          hasTiptapBlocks: !!tiptapBlocks,
          hasContent: !!tiptapBlocks?.content
        })
      }
    }

    window.addEventListener('templateList', handleTemplateList)
    window.addEventListener('templateContent', handleTemplateContent)

    return () => {
      window.removeEventListener('templateList', handleTemplateList)
      window.removeEventListener('templateContent', handleTemplateContent)
    }
  }, [editor])

  // Open links externally (VS Code) instead of navigating inside the webview
  useEffect(() => {
    const el = editorElement
    if (!editor || !el) return
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      const a = target?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!a) return
      const href = a.getAttribute('href') || ''
      if (!href) return
      e.preventDefault()
      e.stopPropagation()
      openExternal(href).catch(() => { })
    }
    el.addEventListener('click', onClick)
    return () => el.removeEventListener('click', onClick)
  }, [editor, editorElement])

  // Close link dialog on Escape
  useEffect(() => {
    if (!showLinkDialog) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowLinkDialog(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showLinkDialog])

  if (!editor) {
    return <div className="jotx-editor-loading">Initializing editor...</div>
  }

  return (
    <div className="jotx-editor">
      {/* Ribbon Toolbar - sits above editor content */}
      <EditorRibbon
        editor={editor}
        expanded={ribbonExpanded && !isPreview}
        context={editorContext}
        onInsert={handleSlashCommand}
      />

      <div className="jotx-editor-wrapper">
        <LinkDialog
          isOpen={showLinkDialog}
          onCancel={() => setShowLinkDialog(false)}
          onSubmit={({ href, label }) => {
            setShowLinkDialog(false)
            const text = (label || href).trim()
            editor
              ?.chain()
              .focus()
              // insert as its own paragraph so it roundtrips cleanly as `def link`
              .insertContent([
                {
                  type: 'paragraph',
                  content: [
                    {
                      type: 'text',
                      text,
                      marks: [{ type: 'link', attrs: { href } }]
                    }
                  ]
                },
                { type: 'paragraph' }
              ])
              .run()
          }}
        />
        {calloutToolbar.visible && (
          <div
            className="jotx-callout-toolbar jotx-callout-toolbar-floating"
            style={{ left: `${calloutToolbar.x}px`, top: `${calloutToolbar.y}px` }}
          >
            {(['info', 'warning', 'success', 'danger'] as const).map((v) => (
              <button
                key={v}
                data-variant={v}
                className={`jotx-callout-chip ${calloutToolbar.variant === v ? 'active' : ''}`}
                onMouseDown={(e) => {
                  // prevent editor losing selection
                  e.preventDefault()
                }}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setCalloutVariant(v)
                }}
                title={`Callout: ${v}`}
              >
                {v}
              </button>
            ))}
          </div>
        )}
        <BlockMenu editor={editor} />
        <TableToolbar editor={editor} />
        <ImageToolbar editor={editor} />
        <SearchBar
          visible={showSearchBar}
          onSearch={handleSearch}
          onNext={handleNextMatch}
          onPrevious={handlePreviousMatch}
          onClose={handleCloseSearch}
          currentMatch={searchState.currentMatch}
          totalMatches={searchState.totalMatches}
        />
        <EditorContent editor={editor} />
      </div>

      {outline && <OutlineRail editor={editor} />}

      {showSlashMenu && (
        <SlashMenu
          documentType={documentType}
          query={slashMenuQuery}
          position={slashMenuPosition}
          context={getTableContext()}
          onSelect={handleSlashCommand}
          onClose={() => setShowSlashMenu(false)}
        />
      )}


      {
        showUrlInputDialog && (
          <UrlInputDialog
            isOpen={showUrlInputDialog}
            title={'Insert Image URL'}
            onCancel={() => setShowUrlInputDialog(false)}
            onSubmit={({ url }) => {
              setShowUrlInputDialog(false)
              if (urlInputType === 'image') {
                editor.chain().focus().setImage({ src: url, alt: '', dataSrc: null, width: 70, align: 'left' } as any).run()
              }
            }}
          />
        )
      }

      {
        showTemplatePicker && (
          <div
            className="jotx-modal-overlay"
            onClick={() => setShowTemplatePicker(false)}
          >
            <div
              className="jotx-modal-content jotx-template-picker"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="jotx-modal-header">
                <h3>📋 Choose a Template</h3>
                <button
                  className="jotx-modal-close"
                  onClick={() => setShowTemplatePicker(false)}
                >
                  ✕
                </button>
              </div>
              <div className="jotx-template-list">
                {availableTemplates.map((template) => (
                  <button
                    key={template.fileName}
                    className="jotx-template-item"
                    onClick={() => {
                      setShowTemplatePicker(false)
                      const vscode = getVSCodeAPI()
                      vscode.postMessage({
                        type: 'requestTemplateContent',
                        fileName: template.fileName
                      })
                    }}
                  >
                    <span className="jotx-template-icon">📄</span>
                    <span className="jotx-template-name">{template.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )
      }
    </div>
  )
}

export function JotxEditor(props: JotxEditorProps) {
  // Share the host's mode (e.g. the header lock toggle) when one is provided
  if (useHasEditorModeProvider()) {
    return <JotxEditorInner {...props} />
  }
  return (
    <EditorModeProvider>
      <JotxEditorInner {...props} />
    </EditorModeProvider>
  )
}

