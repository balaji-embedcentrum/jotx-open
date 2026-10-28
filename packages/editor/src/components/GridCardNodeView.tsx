import React from 'react'
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react'
import '../styles/GridCardNodeView.css'

interface GridCardNodeViewProps {
    node: {
        attrs: {
            layout?: string
            blockId?: string
        }
    }
    updateAttributes: (attrs: Record<string, any>) => void
}

// Available layouts from 1x2 to 3x3
const LAYOUT_OPTIONS = [
    { value: '1x2', label: '1×2' },
    { value: '1x3', label: '1×3' },
    { value: '2x1', label: '2×1' },
    { value: '2x2', label: '2×2' },
    { value: '2x3', label: '2×3' },
    { value: '3x1', label: '3×1' },
    { value: '3x2', label: '3×2' },
    { value: '3x3', label: '3×3' },
]

export function GridCardNodeView({ node, updateAttributes }: GridCardNodeViewProps) {
    const layout = node.attrs.layout || '2x2'

    // Parse layout to get columns
    const [cols] = layout.split('x').map(Number)

    const handleLayoutChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        updateAttributes({ layout: e.target.value })
    }

    return (
        <NodeViewWrapper className="gridcard-wrapper">
            <div className="gridcard-controls">
                <select
                    value={layout}
                    onChange={handleLayoutChange}
                    className="gridcard-layout-select"
                    title="Grid Layout"
                >
                    {LAYOUT_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>
            <div
                className="gridcard"
                data-layout={layout}
                style={{ '--jx-grid-cols': cols } as React.CSSProperties}
            >
                <NodeViewContent className="gridcard-content" />
            </div>
        </NodeViewWrapper>
    )
}
