/**
 * NodeManager - Core types and interfaces
 * Platform-agnostic definitions for node management
 */

/**
 * Represents a single node (block) in the knowledge graph
 */
export interface NodeEntry {
    /** Unique identifier (shortUUID) - MUST be unique across entire workspace */
    id: string

    /** Block type (def, mermaid, heading, paragraph, etc.) */
    type: string

    /** Absolute path to the .jot file containing this node */
    filePath: string

    /** Display label (def name, heading text, etc.) */
    label: string

    /** Block properties from AST */
    properties: Record<string, any>

    /** Content for preview (text/src/json) */
    content?: string

    /** Parent node ID (for def hierarchy) */
    parentId?: string

    /** Child node IDs (for def hierarchy) */
    children: string[]

    /** Original AST children (for tables, callouts, etc.) - used for rendering */
    astChildren?: any[]
}

/**
 * Represents a def block in the hierarchy tree
 */
export interface DefTreeNode {
    /** ID of the NodeEntry */
    nodeId: string

    /** Child def nodes */
    children: DefTreeNode[]
}

/**
 * Platform-agnostic NodeManager interface
 * Implemented by VSCodeNodeManager, BrowserNodeManager, etc.
 */
export interface INodeManager {
    /**
     * Get node by ID - O(1)
     */
    getNode(id: string): NodeEntry | undefined

    /**
     * Get all nodes in a file - O(1)
     */
    getNodesByFile(filePath: string): NodeEntry[]

    /**
     * Get all nodes of a type - O(1)
     */
    getNodesByType(type: string): NodeEntry[]

    /**
     * Get def tree for a document
     */
    getDefTree(filePath: string): DefTreeNode | undefined

    /**
     * Get nodes this node links to
     */
    getLinkedNodes(nodeId: string): NodeEntry[]

    /**
     * Get nodes that link to this node (backlinks)
     */
    getBacklinks(nodeId: string): NodeEntry[]

    /**
     * Validate unique IDs across workspace
     * @returns Map of duplicate IDs to file paths
     */
    validateUniqueIds(): Map<string, string[]>

    /**
     * Re-index a specific file
     */
    reindexFile(filePath: string): Promise<void>

    /**
     * Full workspace reindex
     */
    fullReindex(): Promise<void>
}

/**
 * Event emitted when graph changes
 */
export interface NodeManagerChangeEvent {
    type: 'add' | 'update' | 'delete'
    nodeIds: string[]
    filePath: string
}
