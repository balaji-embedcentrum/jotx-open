/**
 * Graph Indexer - Builds graph data using NodeManager
 * Supports: document hierarchy, def blocks, jotxlink references
 */

import * as vscode from 'vscode'
import { waitForNodeManager } from '../extension'
import * as path from 'path'
import { logger } from '../utils/logger'

export interface GraphNode {
    id: string              // Unique ID (shortUUID)
    label: string           // Display label
    type: 'document' | 'block'
    nodeKind?: string       // jotx, def, heading, paragraph, etc.
    path: string            // Full file path
    parentId?: string       // Parent node ID
    metadata?: any
    isRoot?: boolean        // True if this is the root document
    // Visual properties
    size?: number
    color?: string
}

export interface GraphEdge {
    id: string
    source: string          // Source node ID
    target: string          // Target node ID
    type: 'parent-child' | 'reference'
    label?: string
}

export interface GraphData {
    nodes: GraphNode[]
    edges: GraphEdge[]
    rootId?: string         // ID of root document (if exists)
    rootConflicts?: string[] // Paths of multiple root documents (if conflict)
}

/**
 * Block types that are visualized in the Graph View.
 * NodeManager indexes ALL blocks, but Graph only shows these types.
 * JotxLink IS included - it appears as a node with an edge to the referenced target.
 * Button/Link/Card/LinkCard are navigational blocks that create edges to their targets.
 */
const GRAPH_INDEXED_BLOCK_TYPES = [
    'jotx',       // Documents
    'table',
    'mermaid',
    'chart',
    'math',
    'properties',
    'jotxlink',   // Reference blocks - appear as nodes linking to their targets
    'button',     // Navigational blocks with link property
    'link',       // Link blocks with url property  
    'card',       // Card blocks with link property
    'linkcard'    // LinkCard blocks with url property
] as const

export class GraphIndexer {
    private workspaceFolder: vscode.WorkspaceFolder

    constructor(workspaceFolder: vscode.WorkspaceFolder) {
        this.workspaceFolder = workspaceFolder
    }

    /**
     * Build complete workspace graph
     */
    async buildGraph(): Promise<GraphData> {
        return this.generateGraphData()
    }

    /**
     * Build local graph for a specific file
     */
    async buildLocalGraph(filePath: string): Promise<GraphData> {
        return this.generateGraphData(filePath)
    }

    private async generateGraphData(targetFilePath?: string): Promise<GraphData> {
        const nodes: GraphNode[] = []
        const edges: GraphEdge[] = []
        const rootDocs: string[] = []
        const processedNodes = new Set<string>()

        // Wait for NodeManager to be fully initialized
        const nodeManager = await waitForNodeManager(10000) // 10s timeout
        if (!nodeManager) {
            logger.error('[GraphIndexer] NodeManager not available after waiting')
            return { nodes: [], edges: [] }
        }

        // Helper to add node if not exists
        const addNode = (n: any) => {
            if (!processedNodes.has(n.id)) {
                // Type-aware label extraction per architecture spec
                // Different block types have different primary label properties
                let label: string
                const props = n.properties || {}

                switch (n.type) {
                    case 'jotx':
                        // Documents: title > name > id
                        label = props.title || props.name || n.label || n.id
                        break
                    case 'button':
                        // Button: label > text > id
                        label = props.label || props.text || n.label || n.id
                        break
                    case 'link':
                    case 'linkcard':
                        // Link/LinkCard: text > title > id
                        label = props.text || props.title || n.label || n.id
                        break
                    case 'card':
                        // Card: title > text > id
                        label = props.title || props.text || n.label || n.id
                        break
                    default:
                        // Generic: title > text > label > name > id
                        label = props.title || props.text || props.label || props.name || n.label || n.id
                }

                // Ensure label is string
                label = typeof label === 'string' ? label : String(label || n.id)

                // Detect root document: check documentType or type property in metadata
                const isRoot = n.properties?.documentType === 'root' ||
                    n.properties?.type === 'root';

                nodes.push({
                    id: n.id,
                    label: label.substring(0, 50),
                    type: n.type === 'jotx' ? 'document' : 'block',
                    nodeKind: n.type,
                    path: n.filePath,
                    parentId: n.parentId,
                    metadata: n.properties || {}, // All properties preserved
                    isRoot
                })
                processedNodes.add(n.id)
                if (isRoot) rootDocs.push(n.id)
            }
        }

        // 1. Determine scope
        let nodesProcess: any[] = []

        if (targetFilePath) {
            // Local graph: Get nodes in file + linked nodes
            logger.log(`[GraphIndexer] Building local graph for ${targetFilePath}`)
            const localNodes = nodeManager.getNodesByFile(targetFilePath) || []
            nodesProcess = [...localNodes]

            // For jotxlinks, also add their referenced targets to the graph
            localNodes.forEach(node => {
                if (node.type === 'jotxlink') {
                    // Check both lowercase and camelCase versions
                    const refId = node.properties?.refId || node.properties?.refid ||
                        node.metadata?.refId || node.metadata?.refid;
                    if (refId) {
                        const target = nodeManager.getNode(refId) || nodeManager.getNodeByShortId?.(refId)
                        if (target && !nodesProcess.some(n => n.id === target.id)) {
                            nodesProcess.push(target)
                        }
                    }
                }
            })
        } else {
            // Global graph: Get all nodes, then FILTER to graph-indexed types only
            const allNodes = nodeManager.getAllNodes()
            logger.log(`[GraphIndexer] getAllNodes() returned ${allNodes.length} total nodes`)

            // Filter to only graph-visualized block types (includes jotxlink)
            nodesProcess = allNodes.filter((n: any) =>
                GRAPH_INDEXED_BLOCK_TYPES.includes(n.type)
            )
            logger.log(`[GraphIndexer] After filtering to graph types: ${nodesProcess.length} nodes`)
        }

        logger.log(`[GraphIndexer] Processing ${nodesProcess.length} nodes`)

        // 2. Process Nodes (including jotxlinks as visible nodes)
        for (const node of nodesProcess) {
            addNode(node)
        }

        // 3. Process Edges
        for (const node of nodes) {

            // A. Hierarchy Edges (Parent-Child)
            if (node.parentId && processedNodes.has(node.parentId)) {
                logger.log(`[GraphIndexer] Creating parent-child edge: ${node.parentId} -> ${node.id}`)
                edges.push({
                    id: `${node.parentId}-child-${node.id}`,
                    source: node.parentId,
                    target: node.id,
                    type: 'parent-child'
                })
            } else if (node.parentId) {
                logger.log(`[GraphIndexer] SKIPPED parent-child edge (parent not in graph): ${node.parentId} -> ${node.id}`)
            }

            // B. Reference Edges (JotxLink → Referenced Block or Document)
            // If refId contains #, link to the specific block; otherwise link to document
            if (node.nodeKind === 'jotxlink') {
                // Check both lowercase and camelCase versions of refId
                const refId = node.metadata?.refId || node.metadata?.refid ||
                    node.metadata?.reftype || // Some versions store differently
                    (node as any).attrs?.refId

                if (refId) {
                    // Parse refId: if it contains #, extract the blockId part
                    // Format: "documentId#blockId" or just "documentId"
                    const hasBlockRef = refId.includes('#')
                    const [documentPart, blockPart] = hasBlockRef ? refId.split('#') : [refId, null]

                    // Step 1: Find the target node (could be a block or document)
                    const targetFromManager = nodeManager.getNode(refId) || nodeManager.getNodeByShortId?.(refId)

                    if (targetFromManager) {
                        // Step 2: Determine what to link to
                        // If target block is in the graph, link to it directly
                        // Otherwise, link to the document
                        let targetId: string | null = null
                        let targetLabel = ''

                        // First, check if the target itself is in the graph
                        if (processedNodes.has(targetFromManager.id)) {
                            // Target is directly in the graph - link to it
                            targetId = targetFromManager.id
                            targetLabel = targetFromManager.label || targetFromManager.id
                            logger.log(`[GraphIndexer] Target block is in graph: ${targetLabel}`)
                        } else if (targetFromManager.type === 'jotx') {
                            // Target is a document - use it directly
                            targetId = targetFromManager.id
                            targetLabel = targetFromManager.label || targetFromManager.id
                        } else {
                            // Target is a block not in graph - find its parent document
                            const targetFilePath = targetFromManager.filePath
                            const docNode = nodes.find(n =>
                                n.path === targetFilePath && n.type === 'document'
                            )
                            if (docNode) {
                                targetId = docNode.id
                                targetLabel = docNode.label || docNode.id
                            } else {
                                // Document might not be in the graph yet, try to add it
                                const allFileNodes = nodeManager.getNodesByFile(targetFilePath) || []
                                const docFromManager = allFileNodes.find((n: any) => n.type === 'jotx')
                                if (docFromManager) {
                                    if (!processedNodes.has(docFromManager.id)) {
                                        addNode(docFromManager)
                                    }
                                    targetId = docFromManager.id
                                    targetLabel = docFromManager.label || docFromManager.id
                                }
                            }
                        }

                        if (targetId && processedNodes.has(targetId)) {
                            const edgeId = `${node.id}-ref-${targetId}`
                            // Avoid duplicate edges
                            if (!edges.some(e => e.id === edgeId)) {
                                const edgeLabel = hasBlockRef ? 'block-ref' : 'doc-ref'
                                logger.log(`[GraphIndexer] Creating ${edgeLabel} edge: ${node.label} -> ${targetLabel}`)
                                edges.push({
                                    id: edgeId,
                                    source: node.id,
                                    target: targetId,
                                    type: 'reference',
                                    label: edgeLabel
                                })
                            }
                        } else {
                            logger.log(`[GraphIndexer] SKIPPED reference edge (target not in graph): ${node.id} -> ${refId}`)
                        }
                    } else {
                        logger.log(`[GraphIndexer] SKIPPED reference edge (target not in NodeManager): ${node.id} -> ${refId}`)
                    }
                }
            }

            // C. Protocol B: Path-Based References (Button/Link/Card)
            // These blocks use url/link properties pointing to document paths
            const navBlockTypes = ['button', 'card', 'link', 'linkcard']
            if (navBlockTypes.includes(node.nodeKind || '')) {
                // button/card use 'link', link/linkcard use 'url'
                const linkProp = node.metadata?.link || node.metadata?.url ||
                    (node as any).attrs?.link || (node as any).attrs?.url

                if (linkProp && typeof linkProp === 'string') {
                    // Guard: Skip external URLs
                    if (linkProp.startsWith('http://') || linkProp.startsWith('https://') ||
                        linkProp.startsWith('mailto:') || linkProp.startsWith('tel:')) {
                        logger.log(`[GraphIndexer] SKIPPED external URL: ${linkProp}`)
                    } else {
                        // Resolve path to find target document
                        let resolvedPath = linkProp

                        // Handle relative paths
                        if (!path.isAbsolute(linkProp)) {
                            const sourceDir = path.dirname(node.path)
                            resolvedPath = path.resolve(sourceDir, linkProp)
                        }

                        // Normalize: add .jot extension if missing
                        if (!resolvedPath.endsWith('.jot')) {
                            resolvedPath += '.jot'
                        }

                        // Find target document in nodes
                        const targetDoc = nodes.find(n =>
                            n.type === 'document' && n.path === resolvedPath
                        )

                        if (targetDoc) {
                            const edgeId = `${node.id}-navref-${targetDoc.id}`
                            if (!edges.some(e => e.id === edgeId)) {
                                const edgeLabel = `${node.nodeKind}-ref`
                                logger.log(`[GraphIndexer] Creating ${edgeLabel} edge: ${node.label} -> ${targetDoc.label}`)
                                edges.push({
                                    id: edgeId,
                                    source: node.id,
                                    target: targetDoc.id,
                                    type: 'reference',
                                    label: edgeLabel
                                })
                            }
                        } else {
                            // Try to find and add the target document dynamically
                            const allNodes = nodeManager.getAllNodes()
                            const docFromManager = allNodes.find((n: any) =>
                                n.type === 'jotx' && n.filePath === resolvedPath
                            )
                            if (docFromManager) {
                                if (!processedNodes.has(docFromManager.id)) {
                                    addNode(docFromManager)
                                }
                                const edgeId = `${node.id}-navref-${docFromManager.id}`
                                if (!edges.some(e => e.id === edgeId)) {
                                    const edgeLabel = `${node.nodeKind}-ref`
                                    logger.log(`[GraphIndexer] Creating ${edgeLabel} edge (dynamic): ${node.label} -> ${docFromManager.label || docFromManager.id}`)
                                    edges.push({
                                        id: edgeId,
                                        source: node.id,
                                        target: docFromManager.id,
                                        type: 'reference',
                                        label: edgeLabel
                                    })
                                }
                            } else {
                                logger.log(`[GraphIndexer] SKIPPED nav reference (target not found): ${node.id} -> ${resolvedPath}`)
                            }
                        }
                    }
                }
            }
        }

        const graphData: GraphData = { nodes, edges }

        if (rootDocs.length === 1) graphData.rootId = rootDocs[0]
        else if (rootDocs.length > 1) graphData.rootConflicts = rootDocs

        logger.log(`[GraphIndexer] Built graph: ${nodes.length} nodes, ${edges.length} edges`)
        return graphData
    }
}
