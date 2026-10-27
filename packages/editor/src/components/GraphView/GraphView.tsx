/**
 * GraphView - D3.js Force-Directed Knowledge Graph Visualization
 * Browser-based component for web application
 */

import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import { X, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import '../../styles/tokens.css'
import '../../styles/GraphView.css'

// Platform-agnostic types
export interface GraphData {
    nodes: Array<{
        id: string
        label: string
        type: string
        nodeKind: string
        path: string
        metadata?: Record<string, any>
    }>
    edges: Array<{
        source: string
        target: string
        type: string
    }>
}

export interface GraphViewProps {
    isOpen: boolean
    onClose: () => void
    focusedDocumentPath?: string
    graphData: GraphData  // Pass data from platform
    stats?: { documents: number; blocks: number; edges: number }
}

// Color palette matching VS Code extension
const COLORS: Record<string, string> = {
    root: '#FF0000',
    document: '#5B9BD5',
    jotx: '#5B9BD5',
    orphan: '#888888',
    heading: '#9B59B6',
    section: '#27AE60',
    code: '#E74C3C',
    mermaid: '#9C27B0',
    chart: '#FF6B6B',
    math: '#FFD700',
    table: '#32CD32',
    properties: '#BA55D3',
    jotxlink: '#FF69B4',
    block: '#95A5A6'
}

interface D3Node {
    id: string
    label: string
    type: string
    nodeKind: string
    path: string
    color: string
    radius: number
    x?: number
    y?: number
    fx?: number | null
    fy?: number | null
    metadata?: Record<string, any>
}

interface D3Link {
    source: string | D3Node
    target: string | D3Node
    type: string
}

export function GraphView({ isOpen, onClose, focusedDocumentPath, graphData, stats: propStats }: GraphViewProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const svgRef = useRef<SVGSVGElement>(null)
    const [selectedNode, setSelectedNode] = useState<D3Node | null>(null)
    const stats = propStats || { documents: 0, blocks: 0, edges: 0 }
    const simulationRef = useRef<d3.Simulation<D3Node, D3Link> | null>(null)
    const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)

    const getNodeColor = useCallback((node: { nodeKind: string; type: string; metadata?: Record<string, any> }) => {
        const isRoot = node.metadata?.type === 'root'
        if (isRoot) return COLORS.root
        if (node.type === 'document' || node.nodeKind === 'jotx') return COLORS.document
        return COLORS[node.nodeKind] || COLORS.block
    }, [])

    const renderGraph = useCallback((data: GraphData, width: number, height: number) => {
        if (!svgRef.current) return

        const svg = d3.select(svgRef.current)
        svg.selectAll('*').remove()

        // Prepare nodes
        const nodes: D3Node[] = data.nodes.map(node => {
            const isRoot = node.metadata?.type === 'root'
            const isJotx = node.nodeKind === 'jotx' || node.type === 'document'
            let radius = 6
            if (isRoot) radius = 14
            else if (isJotx) radius = 10

            return {
                ...node,
                color: getNodeColor(node),
                radius,
                x: Math.random() * width,
                y: Math.random() * height
            }
        })

        // Prepare links
        const links: D3Link[] = data.edges.map(edge => ({
            source: edge.source,
            target: edge.target,
            type: edge.type
        }))

        // Create zoom behavior
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 10])
            .on('zoom', (event) => {
                g.attr('transform', event.transform.toString())
            })

        zoomRef.current = zoom
        svg.call(zoom)

        // Create main group
        const g = svg.append('g')

        // Arrow marker
        const defs = svg.append('defs')
        defs.append('marker')
            .attr('id', 'arrow')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 15)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', '#999')

        // Create simulation
        const simulation = d3.forceSimulation<D3Node>(nodes)
            .force('link', d3.forceLink<D3Node, D3Link>(links).id(d => d.id).distance(50))
            .force('charge', d3.forceManyBody().strength(-100))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(10))

        simulationRef.current = simulation

        // Create links
        const link = g.append('g')
            .selectAll('line')
            .data(links)
            .enter().append('line')
            .attr('stroke', d => d.type === 'parent-child' ? '#666666' : '#FF6B6B')
            .attr('stroke-opacity', 0.6)
            .attr('stroke-width', d => d.type === 'reference' ? 3 : 2)
            .attr('marker-end', 'url(#arrow)')

        // Create nodes
        const node = g.append('g')
            .selectAll('circle')
            .data(nodes)
            .enter().append('circle')
            .attr('r', d => d.radius)
            .attr('fill', d => d.color)
            .style('cursor', 'pointer')
            .on('click', (event, d) => {
                event.stopPropagation()
                setSelectedNode(d)
            })
            .call(d3.drag<SVGCircleElement, D3Node>()
                .on('start', (event, d) => {
                    if (!event.active) simulation.alphaTarget(0.3).restart()
                    d.fx = d.x
                    d.fy = d.y
                })
                .on('drag', (event, d) => {
                    d.fx = event.x
                    d.fy = event.y
                })
                .on('end', (event, d) => {
                    if (!event.active) simulation.alphaTarget(0)
                    d.fx = null
                    d.fy = null
                }))

        // Create labels
        const label = g.append('g')
            .selectAll('text')
            .data(nodes)
            .enter().append('text')
            .text(d => d.label)
            .attr('font-size', '10px')
            .attr('dx', 8)
            .attr('dy', 3)
            .attr('fill', '#ccc')
            // Theme-aware label color (CSS vars only work through style, not the fill attribute)
            .style('fill', 'var(--jx-fg-muted, #ccc)')
            .style('pointer-events', 'none')

        // Update positions
        simulation.on('tick', () => {
            link
                .attr('x1', d => (d.source as D3Node).x || 0)
                .attr('y1', d => (d.source as D3Node).y || 0)
                .attr('x2', d => (d.target as D3Node).x || 0)
                .attr('y2', d => (d.target as D3Node).y || 0)

            node
                .attr('cx', d => d.x || 0)
                .attr('cy', d => d.y || 0)

            label
                .attr('x', d => d.x || 0)
                .attr('y', d => d.y || 0)
        })

        // Click background to deselect
        svg.on('click', () => setSelectedNode(null))

    }, [getNodeColor])

    // Removed indexing logic - platform provides pre-indexed data via graphData prop

    useEffect(() => {
        if (!isOpen || !containerRef.current || !svgRef.current || !graphData) return

        const width = containerRef.current.clientWidth
        const height = containerRef.current.clientHeight

        renderGraph(graphData, width, height)

        return () => {
            if (simulationRef.current) {
                simulationRef.current.stop()
            }
        }
    }, [isOpen, graphData, renderGraph])

    const handleZoomIn = () => {
        if (svgRef.current && zoomRef.current) {
            d3.select(svgRef.current).transition().call(zoomRef.current.scaleBy, 1.5)
        }
    }

    const handleZoomOut = () => {
        if (svgRef.current && zoomRef.current) {
            d3.select(svgRef.current).transition().call(zoomRef.current.scaleBy, 0.67)
        }
    }

    const handleFitView = () => {
        if (svgRef.current && zoomRef.current) {
            d3.select(svgRef.current).transition().call(zoomRef.current.transform, d3.zoomIdentity)
        }
    }

    if (!isOpen) return null

    return (
        <div className="graph-view-overlay">
            <div className="graph-view-container">
                {/* Header */}
                <div className="graph-view-header">
                    <div className="graph-view-title">
                        <span className="graph-icon">🔗</span>
                        <h2>Knowledge Graph</h2>
                        <span className="graph-stats">
                            {stats.documents} docs · {stats.blocks} blocks · {stats.edges} links
                        </span>
                    </div>
                    <div className="graph-view-controls">
                        <button onClick={handleZoomIn} title="Zoom In"><ZoomIn size={18} /></button>
                        <button onClick={handleZoomOut} title="Zoom Out"><ZoomOut size={18} /></button>
                        <button onClick={handleFitView} title="Fit View"><Maximize2 size={18} /></button>
                        <button onClick={onClose} title="Close"><X size={18} /></button>
                    </div>
                </div>

                {/* Graph Container */}
                <div ref={containerRef} className="graph-view-content">
                    <svg ref={svgRef} width="100%" height="100%" />

                    {/* Legend */}
                    <div className="graph-legend">
                        <div className="legend-title">Legend</div>
                        <div className="legend-item">
                            <span className="legend-dot" style={{ background: COLORS.root, width: 14, height: 14 }}></span>
                            Root
                        </div>
                        <div className="legend-item">
                            <span className="legend-dot" style={{ background: COLORS.document, width: 10, height: 10 }}></span>
                            Document
                        </div>
                        <div className="legend-item">
                            <span className="legend-dot" style={{ background: COLORS.mermaid }}></span>
                            Mermaid
                        </div>
                        <div className="legend-item">
                            <span className="legend-dot" style={{ background: COLORS.chart }}></span>
                            Chart
                        </div>
                        <div className="legend-item">
                            <span className="legend-dot" style={{ background: COLORS.math }}></span>
                            Math
                        </div>
                        <div className="legend-item">
                            <span className="legend-dot" style={{ background: COLORS.table }}></span>
                            Table
                        </div>
                        <div className="legend-item">
                            <span className="legend-dot" style={{ background: COLORS.jotxlink }}></span>
                            JotxLink
                        </div>
                    </div>

                    {/* Selected Node Panel */}
                    {selectedNode && (
                        <div className="graph-node-panel">
                            <div className="panel-header">
                                <h3>{selectedNode.label}</h3>
                                <button onClick={() => setSelectedNode(null)}><X size={16} /></button>
                            </div>
                            <div className="panel-content">
                                <div className="panel-row">
                                    <span className="panel-label">Type</span>
                                    <span className="panel-value">{selectedNode.nodeKind}</span>
                                </div>
                                <div className="panel-row">
                                    <span className="panel-label">ID</span>
                                    <span className="panel-value">{selectedNode.id}</span>
                                </div>
                                <div className="panel-row">
                                    <span className="panel-label">Path</span>
                                    <span className="panel-value">{selectedNode.path}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
