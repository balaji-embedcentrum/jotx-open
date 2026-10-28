/**
 * @jotx-labs/editor
 * 
 * Shared Tiptap editor for jotx - works in VS Code, web, and Electron
 */

// Bridge types and context
export { EditorPlatformBridge, FilePickerOptions, defaultBridge } from './bridge/types'
export { BridgeProvider, useBridge, BridgeContext } from './bridge/BridgeContext'

// Main editor component
export { JotxEditor, JotxEditorProps } from './components/JotxEditor'

// Sub-components (exported for customization)
export { BlockMenu } from './components/BlockMenu'
export { SlashMenu } from './components/SlashMenu'
export { SearchBar } from './components/SearchBar'
export { TableToolbar } from './components/TableToolbar'
export { ImageToolbar } from './components/ImageToolbar'
export { LinkDialog } from './components/LinkDialog'
export { NodePickerDialog } from './components/NodePickerDialog'

// Node Manager Context (for providing file/node management)
export { NodeManagerProvider, useNodeManager, type NodeManager, type JotxNode } from './contexts/NodeManagerContext'
export { EditorModeProvider, useEditorMode, useHasEditorModeProvider, type EditorMode } from './contexts/EditorModeContext'

// Node views (for custom rendering)
export { MermaidNodeView } from './components/MermaidNodeView'
export { ChartNodeView } from './components/ChartNodeView'
export { CodeBlockNodeView } from './components/CodeBlockNodeView'
export { ImageBlockNodeView } from './components/ImageBlockNodeView'
export { FloatImageBlockNodeView } from './components/FloatImageBlockNodeView'
export { VideoBlockNodeView } from './components/VideoBlockNodeView'
export { MathNodeView } from './components/MathNodeView'
export { DateTimeNodeView } from './components/DateTimeNodeView'
export { JotxLinkNodeView } from './components/JotxLinkNodeView'
export { ToggleNodeView } from './components/ToggleNodeView'
export { SectionNodeView } from './components/SectionNodeView'
export { CardNodeView } from './components/CardNodeView'
export { ButtonNodeView } from './components/ButtonNodeView'
export { GridCardNodeView } from './components/GridCardNodeView'
export { CodeReferenceNodeView } from './components/CodeReferenceNodeView'
export { ReadonlyBlockRenderer } from './components/ReadonlyBlockRenderer'
export { ReadonlyMermaid } from './components/ReadonlyMermaid'

// Tiptap extensions
export { MermaidNode } from './extensions/MermaidNode'
export { ChartNode } from './extensions/ChartNode'
export { CodeBlockNode } from './extensions/CodeBlockNode'
export { CodeReferenceNode } from './extensions/CodeReferenceNode'
export { ImageNode } from './extensions/ImageNode'
export { ImageBlockNode } from './extensions/ImageBlockNode'
export { FloatImageBlockNode } from './extensions/FloatImageBlockNode'
export { VideoBlockNode } from './extensions/VideoBlockNode'
export { MathNode } from './extensions/MathNode'
export { DateTimeNode } from './extensions/DateTimeNode'
export { JotxLinkNode } from './extensions/JotxLinkNode'
export { CalloutNode } from './extensions/CalloutNode'
export { AttachNode } from './extensions/AttachNode'
export { LinkNode } from './extensions/LinkNode'
export { ToggleNode } from './extensions/ToggleNode'
export { SectionNode } from './extensions/SectionNode'
export { CardNode } from './extensions/CardNode'
export { ButtonNode } from './extensions/ButtonNode'
export { GridCardNode } from './extensions/GridCardNode'
export { ColumnsNode, ColumnNode } from './extensions/ColumnsNode'
export { TabsNode, TabNode, tabSlug } from './extensions/TabsNode'
export { JotxTable } from './extensions/JotxTable'
export { TableFilterExtension } from './extensions/TableFilterExtension'
export { BlockOpsExtension } from './extensions/BlockOpsExtension'
export { CalloutActionsExtension } from './extensions/CalloutActionsExtension'
export { FormattingExtensions } from './extensions/formatting'

// Slash menu and search
export { SlashMenuExtension, slashMenuPluginKey } from './extensions/SlashMenuExtension'
export { SearchExtension, searchPluginKey } from './extensions/SearchExtension'
// Note: SpellCheckExtension excluded - requires nspell dictionaries (VS Code only)

// Note: SpellCheckService excluded - requires nspell dictionaries (VS Code only)

// Document-level UI components
export { DocumentHeader, type DocumentHeaderProps } from './components/DocumentHeader/DocumentHeader'
export { ExportMenu } from './components/DocumentHeader/ExportMenu'
export { ViewOptions } from './components/DocumentHeader/ViewOptions'
export { JotxLogo } from './components/Brand/JotxLogo'

//Graph visualization
export { GraphView, type GraphViewProps, type GraphData } from './components/GraphView/GraphView'

// Editor Ribbon (toolbar)
export { EditorRibbon, type EditorRibbonProps, type EditorContext } from './components/EditorRibbon'

// Widgets (kanban, timeline, terminal, ...)
export { WIDGETS, WidgetExtensions, getWidget, type WidgetSpec, type WidgetViewProps } from './widgets'
