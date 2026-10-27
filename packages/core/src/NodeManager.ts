/**
 * NodeManager - Platform-agnostic node registry and graph management
 * Shared implementation for VS Code and web applications
 /**
 * INDEXED BLOCK TYPES:
 * - jotx: The document node (parent of all blocks in a file)
 * 
 * Visualization & Data:
 * - table: Rich data tables with title
 * - mermaid: Mermaid diagrams with title
 * - chart: Chart.js visualizations with title
 * - math: LaTeX equations with title
 * - properties: Property tables with title
 * 
 * Navigational (for knowledge graph):
 * - jotxlink: Reference links (can link to blocks + documents)
 * - link: Hyperlinks (document-level)
 * - button: Navigation buttons (document-level)
 * - card: Dashboard cards (document-level)
 */

import type { NodeEntry, DefTreeNode } from './types/nodeManager'

/**
 * Block types that are indexed by NodeManager for graph visualization.
 */
export const INDEXED_BLOCK_TYPES = [
    // Visualization & Data
    'table',
    'mermaid',
    'chart',
    'math',

    // Navigational (for knowledge graph)
    'jotxlink',
    'link',
    'button',
    'card'
] as const

export type IndexedBlockType = typeof INDEXED_BLOCK_TYPES[number]

/**
 * Edge representing a link between two nodes
 */
export interface NodeEdge {
    sourceId: string
    targetId: string
    type: 'jotxlink' | 'link' | 'button' | 'card' | 'parent-child'
    metadata?: {
        label?: string      // Link/button/card label
        style?: string      // Button style (primary, outline, etc.)
        icon?: string       // Card icon
        color?: string      // Card color
    }
}

/**
 * Options for NodeManager initialization
 */
export interface NodeManagerOptions {
    /** Optional error handler */
    onError?: (message: string, error: any) => void
    /** Optional logger */
    log?: (message: string) => void
}

/**
 * Base NodeManager with shared logic across platforms
 */
export class NodeManager {
    // Fast O(1) lookups
    protected nodeRegistry = new Map<string, NodeEntry>()
    protected fileNodeIndex = new Map<string, Set<string>>()
    protected typeIndex = new Map<string, Set<string>>()
    protected defHierarchy = new Map<string, DefTreeNode>()
    protected linkGraph = new Map<string, Set<string>>()

    protected options: NodeManagerOptions

    constructor(options: NodeManagerOptions = {}) {
        this.options = {
            onError: options.onError || ((msg, err) => console.error(msg, err)),
            log: options.log || (() => { })
        }
    }

    /**
     * Extract nodes from AST - ONLY indexes document (jotx) and INDEXED_BLOCK_TYPES
     */
    protected extractNodes(ast: any, filePath: string, fileName: string): void {
        const fileNodes = new Set<string>()

        // 1. Add document node (jotx - the parent node)
        const docTitle = ast.document.metadata?.title || fileName
        const docId = ast.document.id || fileName
        const docType = ast.document.type || 'jotx'
        const docMetadataType = ast.document.metadata?.type || undefined

        const docNode: NodeEntry = {
            id: docId,
            type: 'jotx',
            filePath,
            label: docTitle,
            properties: {
                ...ast.document.metadata,
                documentType: docMetadataType
            },
            content: docTitle,
            parentId: undefined,
            children: []
        }

        this.addNode(docNode, fileNodes)

        // 2. Extract indexed block nodes
        this.extractBlockNodes(ast.document.blocks || [], filePath, fileNodes, docId)

        // Update file index
        this.fileNodeIndex.set(filePath, fileNodes)
    }

    /**
     * Extract ONLY the indexed block types
     */
    protected extractBlockNodes(
        blocks: any[],
        filePath: string,
        fileNodes: Set<string>,
        parentId: string
    ): void {
        if (!blocks) return

        for (const block of blocks) {
            const blockType = block.type

            // FILTER: Only index specified block types
            if (!this.isIndexedBlockType(blockType)) {
                // Check children of non-indexed blocks
                if (block.children) {
                    this.extractBlockNodes(block.children, filePath, fileNodes, parentId)
                }
                continue
            }

            const nodeId = `${parentId}#${block.id}`

            // Determine label based on block type
            let label = block.properties?.title || block.id
            if (blockType === 'jotxlink') {
                label = 'JotxLink'
            }

            // Create node entry with ALL properties and children preserved
            const node: NodeEntry = {
                id: nodeId,
                type: blockType,
                filePath,
                label,
                properties: { ...block.properties },
                content: this.extractBlockContent(block),
                parentId,
                children: [],
                // Preserve original AST children for content rendering (tables, callouts, etc.)
                astChildren: block.children || undefined
            }

            this.addNode(node, fileNodes)

            // Update parent children
            const parent = this.nodeRegistry.get(parentId)
            if (parent) {
                parent.children.push(nodeId)
            }

            // Process links: populate linkGraph based on block type
            if (blockType === 'jotxlink') {
                this.processJotxLink(nodeId, block.properties)
            } else if (blockType === 'link') {
                this.processLink(nodeId, block.properties)
            } else if (blockType === 'button') {
                this.processButton(nodeId, block.properties)
            } else if (blockType === 'card') {
                this.processCard(nodeId, block.properties)
            }
        }
    }

    /**
     * Check if block type should be indexed
     */
    protected isIndexedBlockType(type: string): boolean {
        return INDEXED_BLOCK_TYPES.includes(type as IndexedBlockType)
    }

    /**
     * Extract content preview from block
     */
    protected extractBlockContent(block: any): string | undefined {
        const props = block.properties || {}
        if (props.text) return props.text
        if (props.src) return props.src
        if (props.json) return typeof props.json === 'string' ? props.json : JSON.stringify(props.json)
        if (props.title) return props.title
        return undefined
    }

    /**
     * Process JotxLink block - can reference documents OR blocks
     */
    protected processJotxLink(sourceId: string, properties: any): void {
        const refId = properties?.refid || properties?.refId
        if (!refId) return

        this.addEdge({
            sourceId,
            targetId: refId,
            type: 'jotxlink',
            metadata: { label: properties?.title }
        })
    }

    /**
     * Process link block - document references only
     */
    protected processLink(sourceId: string, properties: any): void {
        const url = properties?.url || properties?.href
        if (!url) return

        // Only track internal .jot file links
        if (url.endsWith('.jot') || url.endsWith('.jotx')) {
            this.addEdge({
                sourceId,
                targetId: this.extractDocumentId(url),
                type: 'link',
                metadata: { label: properties?.text }
            })
        }
    }

    /**
     * Process button - navigation links
     */
    protected processButton(sourceId: string, properties: any): void {
        const link = properties?.link
        if (!link || !(link.endsWith('.jot') || link.endsWith('.jotx'))) return

        this.addEdge({
            sourceId,
            targetId: this.extractDocumentId(link),
            type: 'button',
            metadata: {
                label: properties?.label,
                style: properties?.style
            }
        })
    }

    /**
     * Process card - dashboard cards from gridcard
     */
    protected processCard(sourceId: string, properties: any): void {
        const link = properties?.link
        if (!link || !(link.endsWith('.jot') || link.endsWith('.jotx'))) return

        this.addEdge({
            sourceId,
            targetId: this.extractDocumentId(link),
            type: 'card',
            metadata: {
                label: properties?.title,
                icon: properties?.icon,
                color: properties?.color
            }
        })
    }

    /**
     * Helper: Extract document ID from file path
     */
    protected extractDocumentId(filePath: string): string {
        // "./docs/example.jot" → "example"
        // "../other.jot" → "other"
        // "folder/file.jot" → "file"
        const fileName = filePath.split('/').pop()
        return fileName?.replace(/\.(jot|jotx)$/, '') || filePath
    }

    /**
     * Add edge to linkGraph
     */
    protected addEdge(edge: NodeEdge): void {
        const key = `${edge.sourceId}:${edge.targetId}:${edge.type}`

        if (!this.linkGraph.has(edge.sourceId)) {
            this.linkGraph.set(edge.sourceId, new Set())
        }

        // Store target ID (we'll reconstruct edges with metadata when needed)
        this.linkGraph.get(edge.sourceId)!.add(edge.targetId)

        this.options.log?.(`[NodeManager] ${edge.type}: ${edge.sourceId} -> ${edge.targetId}`)
    }

    /**
     * Add node to registry and indices
     */
    protected addNode(node: NodeEntry, fileNodes: Set<string>): void {
        this.nodeRegistry.set(node.id, node)
        fileNodes.add(node.id)

        // Add to type index
        if (!this.typeIndex.has(node.type)) {
            this.typeIndex.set(node.type, new Set())
        }
        this.typeIndex.get(node.type)!.add(node.id)
    }

    /**
     * Build def tree for a document
     */
    protected buildDefTree(ast: any, filePath: string): void {
        const buildTree = (blocks: any[], parentId: string): DefTreeNode[] => {
            const children: DefTreeNode[] = []

            for (const block of blocks) {
                if (this.isIndexedBlockType(block.type)) {
                    const nodeId = `${filePath}#${block.id}`
                    const defNode: DefTreeNode = {
                        nodeId,
                        children: block.children ? buildTree(block.children, nodeId) : []
                    }
                    children.push(defNode)
                } else if (block.children) {
                    // Continue searching in nested blocks
                    children.push(...buildTree(block.children, parentId))
                }
            }

            return children
        }

        const tree: DefTreeNode = {
            nodeId: filePath,
            children: buildTree(ast.document.blocks, filePath)
        }

        this.defHierarchy.set(filePath, tree)
    }

    /**
     * Remove all nodes from a file
     */
    protected removeFileNodes(filePath: string): void {
        const nodeIds = this.fileNodeIndex.get(filePath)
        if (!nodeIds) return

        for (const nodeId of nodeIds) {
            const node = this.nodeRegistry.get(nodeId)
            if (node) {
                // Remove from type index
                this.typeIndex.get(node.type)?.delete(nodeId)
            }

            // Remove from registry
            this.nodeRegistry.delete(nodeId)

            // Remove from linkGraph (as source)
            this.linkGraph.delete(nodeId)
        }

        // Remove file index
        this.fileNodeIndex.delete(filePath)
        this.defHierarchy.delete(filePath)
    }

    // ========== Public API ==========

    getNode(id: string): NodeEntry | undefined {
        this.options.log?.(`[NodeManager] getNode called with: "${id}", registry size: ${this.nodeRegistry.size}`)

        // First try direct lookup
        let node = this.nodeRegistry.get(id)
        if (node) {
            this.options.log?.(`[NodeManager] getNode DIRECT HIT: ${id}`)
            return node
        }
        this.options.log?.(`[NodeManager] getNode direct lookup MISS for: "${id}"`)

        // If ID contains #, try parsing as documentId#blockId
        if (id.includes('#')) {
            const [docPart, blockPart] = id.split('#')
            this.options.log?.(`[NodeManager] getNode parsing: docPart="${docPart}", blockPart="${blockPart}"`)

            // Search for nodes where the ID ends with #blockPart
            for (const [nodeId, nodeEntry] of this.nodeRegistry) {
                if (nodeId.endsWith(`#${blockPart}`)) {
                    this.options.log?.(`[NodeManager] getNode found via blockPart match: ${nodeId}`)
                    return nodeEntry
                }
            }
            this.options.log?.(`[NodeManager] getNode no blockPart match found for #${blockPart}`)
        }

        this.options.log?.(`[NodeManager] getNode returning undefined for: "${id}"`)
        return undefined
    }

    getNodeByShortId(shortId: string): NodeEntry | undefined {
        this.options.log?.(`[NodeManager] getNodeByShortId called with: "${shortId}"`)

        // First try direct lookup
        const direct = this.nodeRegistry.get(shortId)
        if (direct) {
            this.options.log?.(`[NodeManager] Direct match found`)
            return direct
        }

        // Try looking up by filePath (for document nodes)
        if (shortId.endsWith('.jot') || shortId.endsWith('.jotx')) {
            for (const [nodeId, node] of this.nodeRegistry) {
                if (node.filePath === shortId && node.type === 'jotx') {
                    this.options.log?.(`[NodeManager] Found document by filePath: ${nodeId}`)
                    return node
                }
            }
        }

        // Search for blocks: their ID is "filePath#shortId"
        for (const [nodeId, node] of this.nodeRegistry) {
            if (nodeId.endsWith(`#${shortId}`)) {
                this.options.log?.(`[NodeManager] Found via #suffix match: ${nodeId}`)
                return node
            }
            const idPart = nodeId.split('#').pop()
            if (idPart === shortId) {
                this.options.log?.(`[NodeManager] Found via split match: ${nodeId}`)
                return node
            }
        }

        this.options.log?.(`[NodeManager] No node found for "${shortId}"`)
        return undefined
    }

    getNodesByFile(filePath: string): NodeEntry[] {
        const nodeIds = this.fileNodeIndex.get(filePath)
        if (!nodeIds) return []

        return Array.from(nodeIds)
            .map(id => this.nodeRegistry.get(id))
            .filter((node): node is NodeEntry => node !== undefined)
    }

    getNodesByType(type: string): NodeEntry[] {
        const nodeIds = this.typeIndex.get(type)
        if (!nodeIds) return []

        return Array.from(nodeIds)
            .map(id => this.nodeRegistry.get(id))
            .filter((node): node is NodeEntry => node !== undefined)
    }

    getAllNodes(): NodeEntry[] {
        return Array.from(this.nodeRegistry.values())
    }

    getAllDocuments(): NodeEntry[] {
        return Array.from(this.nodeRegistry.values()).filter(node => !node.parentId)
    }

    getAllBlocks(): NodeEntry[] {
        const blocks: NodeEntry[] = []
        for (const type of INDEXED_BLOCK_TYPES) {
            blocks.push(...this.getNodesByType(type))
        }
        return blocks
    }

    /**
     * Get all edges for graph visualization (all link types)
     */
    getAllEdges(): NodeEdge[] {
        const edges: NodeEdge[] = []

        for (const [sourceId, targets] of this.linkGraph) {
            const sourceNode = this.nodeRegistry.get(sourceId)
            if (!sourceNode) continue

            for (const targetId of targets) {
                // Determine edge type from source node type
                let edgeType: NodeEdge['type'] = 'jotxlink'
                let metadata: NodeEdge['metadata'] = {}

                if (sourceNode.type === 'jotxlink') {
                    edgeType = 'jotxlink'
                    metadata = { label: sourceNode.properties?.title }
                } else if (sourceNode.type === 'link') {
                    edgeType = 'link'
                    metadata = { label: sourceNode.properties?.text }
                } else if (sourceNode.type === 'button') {
                    edgeType = 'button'
                    metadata = {
                        label: sourceNode.properties?.label,
                        style: sourceNode.properties?.style
                    }
                } else if (sourceNode.type === 'card') {
                    edgeType = 'card'
                    metadata = {
                        label: sourceNode.properties?.title,
                        icon: sourceNode.properties?.icon,
                        color: sourceNode.properties?.color
                    }
                }

                edges.push({
                    sourceId,
                    targetId,
                    type: edgeType,
                    metadata
                })
            }
        }

        return edges
    }

    /**
     * Legacy method for backward compatibility
     * @deprecated Use getAllEdges() instead
     */
    getJotxLinkEdges(): NodeEdge[] {
        return this.getAllEdges().filter(edge => edge.type === 'jotxlink')
    }

    getLinkedNodes(nodeId: string): NodeEntry[] {
        const targetIds = this.linkGraph.get(nodeId)
        if (!targetIds) return []

        return Array.from(targetIds)
            .map(id => this.getNodeByShortId(id) || this.nodeRegistry.get(id))
            .filter((node): node is NodeEntry => node !== undefined)
    }

    getBacklinks(nodeId: string): NodeEntry[] {
        const backlinks: NodeEntry[] = []

        // Extract shortId from full nodeId for comparison
        const targetShortId = nodeId.includes('#') ? nodeId.split('#').pop() : nodeId

        for (const [sourceId, targets] of this.linkGraph) {
            for (const targetId of targets) {
                // Match by full ID or short ID
                if (targetId === nodeId || targetId === targetShortId) {
                    const node = this.nodeRegistry.get(sourceId)
                    if (node) backlinks.push(node)
                }
            }
        }

        return backlinks
    }

    getDefTree(filePath: string): DefTreeNode | undefined {
        return this.defHierarchy.get(filePath)
    }

    validateUniqueIds(): Map<string, string[]> {
        const duplicates = new Map<string, string[]>()
        const idToFiles = new Map<string, string[]>()

        for (const [nodeId, node] of this.nodeRegistry) {
            // Skip document nodes
            if (node.type === 'jotx') continue

            // Extract shortUUID from nodeId
            const parts = nodeId.split('#')
            if (parts.length !== 2) continue

            const shortId = parts[1]
            const filePath = node.filePath

            if (!idToFiles.has(shortId)) {
                idToFiles.set(shortId, [])
            }
            idToFiles.get(shortId)!.push(filePath)
        }

        // Find duplicates
        for (const [id, files] of idToFiles) {
            if (files.length > 1) {
                duplicates.set(id, files)
            }
        }

        return duplicates
    }

    clear(): void {
        this.nodeRegistry.clear()
        this.fileNodeIndex.clear()
        this.typeIndex.clear()
        this.defHierarchy.clear()
        this.linkGraph.clear()
    }

    getStats(): { documents: number; blocks: number; edges: number } {
        return {
            documents: this.getAllDocuments().length,
            blocks: this.getAllBlocks().length,
            edges: this.getAllEdges().length
        }
    }
}
