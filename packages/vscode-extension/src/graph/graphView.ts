/**
 * Graph View - D3.js Force-Directed visualization
 * Replaced Sigma.js + ForceAtlas2 with D3 force simulation for smoother animation
 */

import Graph from 'graphology'
import * as d3 from 'd3'
import { logger } from '../utils/logger'

const vscode = (window as any).acquireVsCodeApi();
// Expose vscode on window so inline HTML scripts can access it
(window as any).vscode = vscode;

let simulation: d3.Simulation<any, any> | null = null
let svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any> | null = null
let g: d3.Selection<SVGGElement, unknown, HTMLElement, any> | null = null
let currentData: any = null
let selectedNodeId: string | null = null
let focusedNodeId: string | null = null  // ID of the focused node (found via path or ID)
let connectedNodeIds: Set<string> = new Set()  // Nodes connected to focused node
let zoomBehavior: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null  // Store zoom for centering
let centeringTimeout: ReturnType<typeof setTimeout> | null = null  // Track pending centering timeout

// Color palette - Brand color: Teal (#14b8a6)
const COLORS = {
    brand: '#14b8a6',     // Teal - primary brand accent
    brandLight: '#5eead4',// Light teal for hover/highlight
    root: '#FF0000',      // RED for root documents
    document: '#5B9BD5',  // Blue for documents  
    orphan: '#888888',    // Gray for orphans
    heading: '#9B59B6',   // Purple for headings
    section: '#27AE60',   // Green for sections
    code: '#E74C3C',      // Red for code
    mermaid: '#9C27B0',   // Purple for mermaid (DIFFERENT from document)
    chart: '#FF6B6B',     // Coral for charts
    math: '#FFD700',      // Gold for math
    table: '#32CD32',     // Lime green for tables
    properties: '#BA55D3',// Medium orchid for properties
    jotxlink: '#14b8a6',  // Teal brand color for jotxlink
    block: '#95A5A6',     // Gray for other blocks
    blockEdge: '#14b8a6', // Teal brand for block refs
    docEdge: '#5eead4'    // Light teal for doc links
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initGraph()
})

// Listen for messages from extension
window.addEventListener('message', (event) => {
    const message = event.data
    switch (message.type) {
        case 'graphData':
            currentData = message.data
            // If focusedDocumentId is provided (actually a path now), save it to find the node later
            const initialFocusPath = message.focusedDocumentId
            logger.log('[Graph] Received graphData, focusedDocumentId:', initialFocusPath)
            logger.log('[Graph] Total nodes received:', currentData.nodes.length)
            renderGraph(message.data, initialFocusPath)
            break
    }
})

function initGraph() {
    const container = document.getElementById('graph-container')
    if (!container) return

    // Get container dimensions
    const width = container.clientWidth
    const height = container.clientHeight

    // Create SVG
    svg = d3.select(container)
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .style('background', 'transparent')

    // Create zoom behavior and store globally for centering
    zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.01, 100])
        .on('zoom', (event) => {
            g?.attr('transform', event.transform.toString())
        })

    svg.call(zoomBehavior)

    // Create main group for zooming/panning
    g = svg.append('g')

    // Arrow markers
    const defs = svg.append('defs')

    // Smaller, sleeker arrowhead with brand teal color
    defs.append('marker')
        .attr('id', 'arrow')
        .attr('viewBox', '0 -3 6 6')
        .attr('refX', 12)
        .attr('refY', 0)
        .attr('markerWidth', 4)
        .attr('markerHeight', 4)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-3L6,0L0,3')
        .attr('fill', COLORS.brand)

    // Close panel button
    document.getElementById('close-panel')?.addEventListener('click', () => {
        document.getElementById('side-panel')?.classList.add('hidden')
        selectedNodeId = null
        updateNodeStyles()
    })

    // Setup search functionality
    setupSearch()

    // Notify extension we're ready
    vscode.postMessage({ type: 'ready' })
}

/**
 * Setup search input handler and results display
 */
function setupSearch() {
    const searchInput = document.getElementById('graph-search') as HTMLInputElement
    const searchResults = document.getElementById('search-results')

    if (!searchInput || !searchResults) return

    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    searchInput.addEventListener('input', () => {
        // Debounce search
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => {
            const query = searchInput.value.trim().toLowerCase()
            if (query.length < 2) {
                searchResults.innerHTML = ''
                return
            }
            performSearch(query, searchResults)
        }, 150)
    })

    // Close results when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target as Node) && !searchResults.contains(e.target as Node)) {
            searchResults.innerHTML = ''
        }
    })

    // Handle keyboard navigation
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchResults.innerHTML = ''
            searchInput.blur()
        }
    })
}

/**
 * Perform search on current graph data
 */
function performSearch(query: string, resultsContainer: HTMLElement) {
    if (!currentData || !currentData.nodes) {
        resultsContainer.innerHTML = '<div style="padding: 12px; color: var(--vscode-descriptionForeground);">No graph data loaded</div>'
        return
    }

    const matches = currentData.nodes.filter((node: any) => {
        const label = (node.label || '').toLowerCase()
        const id = (node.id || '').toLowerCase()
        return label.includes(query) || id.includes(query)
    }).slice(0, 10) // Max 10 results

    if (matches.length === 0) {
        resultsContainer.innerHTML = '<div style="padding: 12px; color: var(--vscode-descriptionForeground);">No matching nodes found</div>'
        return
    }

    resultsContainer.innerHTML = matches.map((node: any) => {
        const nodeType = node.nodeKind || node.type || 'unknown'
        // Truncate long labels/IDs for display
        const displayLabel = (node.label || 'Untitled').substring(0, 40) + (node.label?.length > 40 ? '...' : '')
        const displayId = (node.id || '').substring(0, 30) + (node.id?.length > 30 ? '...' : '')

        return `
            <div class="search-result-item" data-node-id="${node.id}">
                <div>
                    <span class="search-result-label">${escapeHtml(displayLabel)}</span>
                    <span class="search-result-type">${nodeType}</span>
                </div>
                <div class="search-result-id">${escapeHtml(displayId)}</div>
            </div>
        `
    }).join('')

    // Add click handlers to results
    resultsContainer.querySelectorAll('.search-result-item').forEach((item) => {
        item.addEventListener('click', () => {
            const nodeId = item.getAttribute('data-node-id')
            if (nodeId) {
                navigateToNode(nodeId)
                resultsContainer.innerHTML = ''
                    ; (document.getElementById('graph-search') as HTMLInputElement).value = ''
            }
        })
    })
}

/**
 * Navigate/focus to a specific node by ID
 */
function navigateToNode(nodeId: string) {
    if (!currentData || !g) return

    // Find the node in current data
    const nodes = currentData.nodes
    const targetNode = nodes.find((n: any) => n.id === nodeId)
    if (!targetNode) {
        logger.log('[Graph Search] Node not found:', nodeId)
        return
    }

    logger.log('[Graph Search] Navigating to node:', nodeId, targetNode.label)

    // Set as focused node
    focusedNodeId = nodeId
    findConnectedNodes(nodeId, currentData.edges, nodes)

    // Update opacities
    g.selectAll('circle').attr('opacity', (n: any) => getNodeOpacity(n))

    // Find the node's current position from the D3 simulation
    const visNodes = g.selectAll('circle').data()
    const visNode = visNodes.find((n: any) => n.id === nodeId)

    if (visNode && svg && zoomBehavior) {
        // Center on this specific node with zoom
        const container = document.getElementById('graph-container')
        const containerWidth = container?.clientWidth || 800
        const containerHeight = container?.clientHeight || 600

        const scale = 1.5  // Zoom in for focus
        const translateX = containerWidth / 2 - (visNode as any).x * scale
        const translateY = containerHeight / 2 - (visNode as any).y * scale

        svg.transition()
            .duration(750)
            .call(
                zoomBehavior.transform,
                d3.zoomIdentity.translate(translateX, translateY).scale(scale)
            )

        // Show side panel for this node
        showNodePanel(nodeId, visNode)
        selectedNodeId = nodeId
        updateNodeStyles()
    }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
}

function renderGraph(data: any, focusPath?: string) {
    if (!svg || !g) return

    logger.log(`[Graph] === NEW RENDER ===`)
    logger.log(`[Graph] focusPath: ${focusPath}`)
    logger.log(`[Graph] Rendering ${data.nodes.length} nodes, ${data.edges.length} edges`)

    // CRITICAL: Cancel any pending centering timeout from previous render
    if (centeringTimeout) {
        clearTimeout(centeringTimeout)
        centeringTimeout = null
        logger.log('[Graph] Cancelled pending centering timeout')
    }

    // CRITICAL: Reset global state from previous render
    focusedNodeId = null
    connectedNodeIds.clear()
    selectedNodeId = null

    // Clear previous content
    g.selectAll('*').remove()

    // Get container size
    const container = document.getElementById('graph-container')
    const width = container?.clientWidth || 800
    const height = container?.clientHeight || 600

    // Prepare nodes with size calculation
    const nodes = data.nodes.map((node: any) => {
        const isRoot = node.metadata?.type === 'root'
        const isJotx = node.nodeKind === 'jotx' || node.type === 'document'
        let radius = 6  // default for child blocks
        if (isRoot) radius = 14  // root nodes biggest
        else if (isJotx) radius = 10  // jotx documents bigger

        return {
            id: node.id,
            label: node.label,
            type: node.nodeKind,
            nodeType: node.type,
            path: node.path,
            metadata: node.metadata,
            color: isRoot ? '#FF0000' : getNodeColor(node),
            radius: radius,
            x: Math.random() * width,
            y: Math.random() * height
        }
    })

    // Prepare edges
    const edges = data.edges.map((edge: any) => ({
        source: edge.source,
        target: edge.target,
        type: edge.type
    }))

    // Create force simulation - EXACT settings from reference
    simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(edges).id((d: any) => d.id).distance(50))
        .force('charge', d3.forceManyBody().strength(-100))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(10))

    // Create edges
    const link = g.append('g')
        .selectAll('line')
        .data(edges)
        .enter().append('line')
        .attr('stroke', (d: any) => d.type === 'parent-child' ? '#666666' : COLORS.blockEdge)
        .attr('stroke-opacity', 0.6)
        .attr('stroke-width', (d: any) => d.type === 'reference' ? 3 : 2)
        .attr('marker-end', 'url(#arrow)')

    // Create nodes with dynamic sizing and focus-based opacity
    const node = g.append('g')
        .selectAll('circle')
        .data(nodes)
        .enter().append('circle')
        .attr('r', (d: any) => d.radius || 6)
        .attr('fill', (d: any) => d.color)
        .attr('opacity', (d: any) => getNodeOpacity(d))  // Focus mode opacity
        .style('cursor', 'pointer')
        .on('click', function (event, d: any) {
            event.stopPropagation()

            // Focus this node + all connected nodes (same document + direct edges)
            focusedNodeId = d.id
            findConnectedNodes(d.id, data.edges, nodes)

            // Update opacities
            g.selectAll('circle').attr('opacity', (n: any) => getNodeOpacity(n))

            // Center camera on focused cluster
            centerOnFocusedNodes(nodes)

            // Show side panel
            showNodePanel(d.id, d)
            selectedNodeId = d.id
            updateNodeStyles()
        })
        .on('mouseover', function (event, d: any) {
            if (selectedNodeId !== d.id) {
                d3.select(this).attr('r', (d.radius || 6) + 2)
            }
        })
        .on('mouseout', function (event, d: any) {
            if (selectedNodeId !== d.id) {
                d3.select(this).attr('r', d.radius || 6)
            }
        })
        .call(d3.drag<any, any>()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended) as any)

    // Create labels
    const label = g.append('g')
        .selectAll('text')
        .data(nodes)
        .enter().append('text')
        .text((d: any) => d.label)
        .attr('font-size', '10px')
        .attr('dx', 8)
        .attr('dy', 3)
        .attr('fill', '#ccc')
        .style('pointer-events', 'none')

    // Update positions on each tick
    simulation.on('tick', () => {
        link
            .attr('x1', (d: any) => d.source.x)
            .attr('y1', (d: any) => d.source.y)
            .attr('x2', (d: any) => d.target.x)
            .attr('y2', (d: any) => d.target.y)

        node
            .attr('cx', (d: any) => d.x)
            .attr('cy', (d: any) => d.y)

        label
            .attr('x', (d: any) => d.x)
            .attr('y', (d: any) => d.y)
    })

    // Click on background to close panel AND clear focus
    svg.on('click', () => {
        document.getElementById('side-panel')?.classList.add('hidden')
        selectedNodeId = null

        // Clear focus mode
        if (focusedNodeId) {
            focusedNodeId = null
            connectedNodeIds.clear()
            g.selectAll('circle').attr('opacity', 1.0)  // Reset all to bright
        }

        updateNodeStyles()
    })

    updateLegend()

    // Auto-focus if a path was provided - WAIT for simulation to stabilize first
    if (focusPath && nodes.length > 0) {
        // Find node matching the path (robust) or ID (legacy)
        const targetNode = nodes.find((n: any) => n.path === focusPath || n.id === focusPath)

        if (targetNode) {
            logger.log('[Graph] Found focus target node:', targetNode.id, 'path:', targetNode.path)
            focusedNodeId = targetNode.id
            findConnectedNodes(targetNode.id, data.edges, nodes)

            // Apply opacity immediately
            g.selectAll('circle').attr('opacity', (n: any) => getNodeOpacity(n))

            // Center after simulation settles - use both 'end' event and timeout fallback
            let hasCentered = false
            const doCenter = () => {
                if (!hasCentered) {
                    hasCentered = true
                    logger.log('[Graph] Centering on focused nodes')
                    centerOnFocusedNodes(nodes)
                }
            }

            simulation.on('end', doCenter)
            // Fallback timeout - reduced to 800ms for snappier response
            centeringTimeout = setTimeout(doCenter, 800)
        } else {
            logger.log('[Graph] Focus target NOT found for path:', focusPath)
            logger.log('[Graph] Available paths:', nodes.slice(0, 5).map((n: any) => n.path))
        }
    }
}

function getNodeColor(node: any): string {
    const nodeKind = node.nodeKind || 'unknown'
    const nodeType = node.type || 'unknown'

    if (nodeType === 'document') {
        return COLORS.document
    }

    return (COLORS as any)[nodeKind] || COLORS.block
}

function findConnectedNodes(nodeId: string, edges: any[], allNodes: any[]) {
    connectedNodeIds.clear()
    connectedNodeIds.add(nodeId)

    // Find the focused node to get its file path
    const focusedNode = allNodes.find(n => n.id === nodeId)
    if (!focusedNode) return

    // Add all nodes from the same document (same path)
    allNodes.forEach(node => {
        if (node.path === focusedNode.path) {
            connectedNodeIds.add(node.id)
        }
    })

    // Also add directly connected nodes via edges (cross-document references)
    edges.forEach(edge => {
        if (connectedNodeIds.has(edge.source)) connectedNodeIds.add(edge.target)
        if (connectedNodeIds.has(edge.target)) connectedNodeIds.add(edge.source)
    })

    logger.log(`[Graph] Found ${connectedNodeIds.size} connected nodes for focus:`, nodeId)
}

function getNodeOpacity(node: any): number {
    if (!focusedNodeId) return 1.0
    return connectedNodeIds.has(node.id) ? 1.0 : 0.3
}


function centerOnFocusedNodes(nodes: any[]) {
    if (!svg || !focusedNodeId) return

    const focusedNodes = nodes.filter(n => connectedNodeIds.has(n.id))

    if (focusedNodes.length === 0) return

    // Calculate bounding box of focused nodes
    const xs = focusedNodes.map(n => n.x)
    const ys = focusedNodes.map(n => n.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)

    // Calculate center and size
    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    const width = maxX - minX || 100
    const height = maxY - minY || 100

    // Get container size
    const container = document.getElementById('graph-container')
    const containerWidth = container?.clientWidth || 800
    const containerHeight = container?.clientHeight || 600

    // Calculate zoom scale (fit with padding)
    const padding = 100
    const scaleX = (containerWidth - padding) / width
    const scaleY = (containerHeight - padding) / height
    const scale = Math.min(scaleX, scaleY, 2)  // Max 2x zoom

    // Calculate transform
    const translateX = containerWidth / 2 - centerX * scale
    const translateY = containerHeight / 2 - centerY * scale

    // Apply transform with smooth transition using the GLOBAL zoom behavior
    if (!zoomBehavior) {
        logger.error('[Graph] zoomBehavior not initialized!')
        return
    }

    logger.log(`[Graph] Applying zoom transform: translate(${translateX.toFixed(0)}, ${translateY.toFixed(0)}) scale(${scale.toFixed(2)})`)

    svg.transition()
        .duration(750)
        .call(
            zoomBehavior.transform,
            d3.zoomIdentity.translate(translateX, translateY).scale(scale)
        )
}

function updateNodeStyles() {
    if (!g) return

    g.selectAll('circle')
        .attr('r', (d: any) => {
            if (d.id === selectedNodeId) return (d.radius || 6) + 3
            return d.radius || 6
        })
        .attr('stroke', (d: any) => d.id === selectedNodeId ? COLORS.brand : 'none')
        .attr('stroke-width', (d: any) => d.id === selectedNodeId ? 2 : 0)
}

function dragstarted(event: any, d: any) {
    if (!event.active && simulation) simulation.alphaTarget(0.3).restart()
    d.fx = d.x
    d.fy = d.y
}

function dragged(event: any, d: any) {
    d.fx = event.x
    d.fy = event.y
}

function dragended(event: any, d: any) {
    if (!event.active && simulation) simulation.alphaTarget(0)
    d.fx = null
    d.fy = null
}

function showNodePanel(nodeId: string, node: any) {
    const panel = document.getElementById('side-panel')
    const title = document.getElementById('panel-title')
    const content = document.getElementById('panel-content')

    if (!panel || !title || !content) return

    title.textContent = node.label || nodeId
    content.innerHTML = renderProperties(nodeId, node)
    panel.classList.remove('hidden')
}

function renderProperties(nodeId: string, node: any): string {
    let html = `
        <button class="open-file-btn" onclick="openNodeFile('${node.path}')">
            📂 Open File
        </button>
        <div class="property-row">
            <div class="property-label">Type</div>
            <div class="property-value">${node.type || node.nodeType || 'unknown'}</div>
        </div>
        <div class="property-row">
            <div class="property-label">ID</div>
            <div class="property-value">${nodeId}</div>
        </div>
        <div class="property-row">
            <div class="property-label">Path</div>
            <div class="property-value">${node.path || 'N/A'}</div>
        </div>
    `

    // Add metadata properties
    if (node.metadata && Object.keys(node.metadata).length > 0) {
        for (const [key, value] of Object.entries(node.metadata)) {
            if (value && String(value).trim()) {
                html += `
                    <div class="property-row">
                        <div class="property-label">${key}</div>
                        <div class="property-value">${String(value)}</div>
                    </div>
                `
            }
        }
    }

    return html
}

function updateLegend() {
    if (!currentData) return

    // Count nodes by type
    const counts: any = {
        root: 0,
        document: 0,
        mermaid: 0,
        chart: 0,
        math: 0,
        table: 0,
        properties: 0,
        jotxlink: 0
    }

    currentData.nodes.forEach((node: any) => {
        const isRoot = node.metadata?.type === 'root'
        if (isRoot) {
            counts.root++
        } else if (node.type === 'document' || node.nodeKind === 'jotx') {
            counts.document++
        } else {
            const kind = node.nodeKind || 'unknown'
            if (counts[kind] !== undefined) counts[kind]++
        }
    })

    // Update legend HTML
    const legend = document.getElementById('legend')
    if (legend) {
        legend.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 8px;">Legend</div>
            <div style="margin-bottom: 4px;"><span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: #FF0000; margin-right: 6px;"></span>Root (${counts.root})</div>
            <div style="margin-bottom: 4px;"><span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #5B9BD5; margin-right: 6px;"></span>Document (${counts.document})</div>
            <div style="margin-bottom: 4px;"><span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #9C27B0; margin-right: 6px;"></span>Mermaid (${counts.mermaid})</div>
            <div style="margin-bottom: 4px;"><span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #FF6B6B; margin-right: 6px;"></span>Chart (${counts.chart})</div>
            <div style="margin-bottom: 4px;"><span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #FFD700; margin-right: 6px;"></span>Math (${counts.math})</div>
            <div style="margin-bottom: 4px;"><span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #32CD32; margin-right: 6px;"></span>Table (${counts.table})</div>
            <div style="margin-bottom: 4px;"><span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #BA55D3; margin-right: 6px;"></span>Properties (${counts.properties})</div>
            <div style="margin-bottom: 4px;"><span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #FF69B4; margin-right: 6px;"></span>JotxLink (${counts.jotxlink})</div>
        `
    }
}

// Global function for Open File button in side panel
(window as any).openNodeFile = (path: string) => {
    if (path && path !== 'N/A') {
        vscode.postMessage({
            type: 'openNode',
            nodePath: path
        })
    }
}

// Helper to find nodes connected to clicked node
