import React, { useEffect, useMemo, useRef, useState } from 'react'
import { NodeViewProps, NodeViewWrapper } from '@tiptap/react'
import { useMermaid } from '../utils/lazyLibs'
import { Copy, Check, Eye, EyeOff, GitGraph } from 'lucide-react'
import '../styles/MermaidNodeView.css'
import '../styles/RichBlocks.css'
import { themeColor } from '../utils/cssColor'
import { useIsDark } from '../utils/useIsDark'
import { useEditorMode } from '../contexts/EditorModeContext'

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // fallback
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      ta.style.top = '0'
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      return ok
    } catch {
      return false
    }
  }
}

export function MermaidNodeView({ node, updateAttributes }: NodeViewProps) {
  const [error, setError] = useState<string | null>(null)
  // Determine if source should be shown. Default to attribute, but if it's a new empty node, show it.
  const showSource = (node?.attrs as any).showSource
  useEffect(() => {
    const src = ((node?.attrs as any)?.src || '').toString()
    if (!src && !showSource) {
      updateAttributes({ showSource: true })
    }
  }, [])

  const setShowSource = (val: boolean) => updateAttributes({ showSource: val })
  const [copied, setCopied] = useState(false)
  const svgRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const { isPreview } = useEditorMode()

  // Zoom and pan state
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [panStartOffset, setPanStartOffset] = useState({ x: 0, y: 0 })
  // CRITICAL: Zoom/pan only works after clicking inside the mermaid preview
  const [isFocused, setIsFocused] = useState(false)

  const instanceId = useMemo(() => `mmd_${Math.random().toString(36).slice(2)}`, [])
  // svgRef exists in both edit and preview layouts; containerRef only while editing
  const isDark = useIsDark(svgRef)
  const mermaid = useMermaid()

  useEffect(() => {
    if (!mermaid) return
    // Configure Mermaid theme for dark/light using our CSS variables.
    // Tokens may be var()/color-mix() expressions; Mermaid needs concrete colors.
    // The diagram sits on a soft surface, so nodes use the page color to stand out.
    const bg = themeColor('--jx-surface', isDark ? '#252526' : '#f6f7f9', svgRef.current)
    const bg2 = themeColor('--jx-bg', isDark ? '#1e1e1e' : '#ffffff', svgRef.current)
    const text = themeColor('--jx-fg', isDark ? '#e5e7eb' : '#111827', svgRef.current)
    const text2 = themeColor('--jx-fg-muted', isDark ? '#cbd5e1' : '#334155', svgRef.current)
    const border = themeColor('--jx-line-strong', isDark ? '#3f3f46' : '#d4d4d8', svgRef.current)
    const primary = themeColor('--jx-accent', isDark ? '#2dd4bf' : '#0d9488', svgRef.current)

    try {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: 'base',
        // All diagram type configurations
        flowchart: {
          useMaxWidth: false,
          htmlLabels: true,
          curve: 'basis'
        },
        sequence: {
          useMaxWidth: false,
          diagramMarginX: 50,
          diagramMarginY: 10,
          actorMargin: 50,
          width: 150,
          height: 65,
          boxMargin: 10,
          boxTextMargin: 5,
          noteMargin: 10,
          messageMargin: 35
        },
        gantt: {
          useMaxWidth: false,
          titleTopMargin: 25,
          barHeight: 20,
          barGap: 4,
          topPadding: 50,
          leftPadding: 75,
          gridLineStartPadding: 35,
          fontSize: 11,
          sectionFontSize: 11,
          numberSectionStyles: 4
        },
        journey: {
          useMaxWidth: false,
          diagramMarginX: 50,
          diagramMarginY: 10
        },
        timeline: {
          useMaxWidth: false,
          disableMulticolor: false
        },
        class: {
          useMaxWidth: false
        },
        state: {
          useMaxWidth: false,
          dividerMargin: 10,
          sizeUnit: 5,
          padding: 8,
          textHeight: 10,
          titleShift: -15,
          noteMargin: 10,
          forkWidth: 70,
          forkHeight: 7,
          miniPadding: 2,
          fontSizeFactor: 5.02,
          fontSize: 24,
          labelHeight: 16,
          edgeLengthFactor: '20',
          compositTitleSize: 35,
          radius: 5
        },
        er: {
          useMaxWidth: false,
          titleTopMargin: 25,
          diagramPadding: 20,
          layoutDirection: 'TB',
          minEntityWidth: 100,
          minEntityHeight: 75,
          entityPadding: 15,
          stroke: 'gray',
          fill: 'honeydew',
          fontSize: 12
        },
        pie: {
          useMaxWidth: false,
          textPosition: 0.75
        },
        quadrantChart: {
          useMaxWidth: false,
          chartWidth: 500,
          chartHeight: 500
        },
        xyChart: {
          useMaxWidth: false,
          width: 700,
          height: 500
        },
        requirement: {
          useMaxWidth: false,
          rect_fill: '#E0E0E0',
          rect_border_size: '0.5px',
          rect_border_color: '#666',
          rect_min_width: 200,
          rect_min_height: 200,
          fontSize: 14,
          rect_padding: 10,
          line_height: 20
        },
        mindmap: {
          useMaxWidth: false,
          padding: 10,
          maxNodeWidth: 200
        },
        gitGraph: {
          useMaxWidth: false,
          titleTopMargin: 25,
          diagramPadding: 8,
          nodeLabel: {
            width: 75,
            height: 100,
            x: -25,
            y: 0
          },
          mainBranchName: 'main',
          mainBranchOrder: 0,
          showCommitLabel: true,
          showBranches: true,
          rotateCommitLabel: true
        },
        sankey: {
          useMaxWidth: false,
          width: 600,
          height: 400,
          linkColor: 'gradient',
          nodeAlignment: 'justify'
        },
        block: {
          useMaxWidth: false,
          padding: 8
        },
        packet: {
          useMaxWidth: false,
          rowHeight: 32,
          bitWidth: 32,
          bitsPerRow: 32
        },
        themeVariables: {
          background: bg,
          primaryColor: bg2,
          primaryTextColor: text,
          primaryBorderColor: border,
          secondaryColor: bg2,
          secondaryTextColor: text,
          secondaryBorderColor: border,
          tertiaryColor: bg2,
          tertiaryTextColor: text,
          tertiaryBorderColor: border,
          lineColor: text2,
          textColor: text,
          mainBkg: bg2,
          nodeBorder: border,
          clusterBkg: bg,
          clusterBorder: border,
          titleColor: text,
          // sequence diagram
          actorBkg: bg2,
          actorBorder: border,
          actorTextColor: text,
          noteBkgColor: isDark ? '#0f172a' : '#fff7ed',
          noteTextColor: text,
          noteBorderColor: isDark ? '#334155' : '#fed7aa',
          activationBkgColor: isDark ? '#0f172a' : '#eef2ff',
          activationBorderColor: border,
          // flowchart accent
          edgeLabelBackground: bg,
          // accent color used in some diagrams
          cScale0: primary
        } as any
      })
    } catch {
      // ignore
    }
  }, [isDark, mermaid])

  useEffect(() => {
    const el = svgRef.current
    if (!el) return

    // Render from node attrs (this is what roundtrips)
    const src = ((node?.attrs as any)?.src || '').toString().trim()

    if (!src) {
      el.innerHTML = ''
      setError(null)
      // Reset zoom and pan when diagram is cleared
      setZoom(1)
      setPan({ x: 0, y: 0 })
      return
    }

    if (!mermaid) return
    let cancelled = false
      ; (async () => {
        try {
          const { svg } = await mermaid.render(instanceId, src)
          if (cancelled) return
          el.innerHTML = svg
          setError(null)
          // Reset zoom and pan when new diagram is rendered
          setZoom(1)
          setPan({ x: 0, y: 0 })
        } catch (e: any) {
          if (cancelled) return
          el.innerHTML = ''
          setError(e?.message || 'Invalid Mermaid diagram')
        }
      })()

    return () => {
      cancelled = true
    }
  }, [node?.attrs, instanceId, isDark, mermaid])

  // Zoom handler (mouse wheel)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      // CRITICAL: Only allow zoom when the Mermaid block is focused (clicked)
      if (!isFocused) return

      // Only handle if we're over the preview area (not textarea)
      const target = e.target as HTMLElement
      if (!container.contains(target) || target.closest('.jotx-mermaid-editor')) return

      e.preventDefault()
      e.stopPropagation()

      // Slower, more controlled zoom speed
      const zoomSpeed = 0.05
      // deltaY > 0 means scrolling down (zoom out), deltaY < 0 means scrolling up (zoom in)
      const delta = e.deltaY > 0 ? -zoomSpeed : zoomSpeed
      const newZoom = Math.max(0.5, Math.min(5, zoom + delta))

      // If zoom didn't change, don't update pan
      if (Math.abs(newZoom - zoom) < 0.001) return

      // Get container bounds
      const rect = container.getBoundingClientRect()
      const containerCenterX = rect.width / 2
      const containerCenterY = rect.height / 2

      // Mouse position relative to container
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      // Mouse position relative to container center
      const mouseRelX = mouseX - containerCenterX
      const mouseRelY = mouseY - containerCenterY

      // Calculate new pan to zoom towards mouse position
      // The point under the mouse should stay fixed
      // Formula: newPan = mousePos - (mousePos - oldPan) * (newZoom / oldZoom)
      const zoomRatio = newZoom / zoom
      const newPanX = mouseRelX - (mouseRelX - pan.x) * zoomRatio
      const newPanY = mouseRelY - (mouseRelY - pan.y) * zoomRatio

      setZoom(newZoom)
      setPan({ x: newPanX, y: newPanY })
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [zoom, pan, isFocused])

  // Double-click to reset zoom and pan
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleDoubleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('.jotx-mermaid-editor')) return

      if (container.contains(target)) {
        setZoom(1)
        setPan({ x: 0, y: 0 })
      }
    }

    container.addEventListener('dblclick', handleDoubleClick)
    return () => container.removeEventListener('dblclick', handleDoubleClick)
  }, [])

  // Pan handler (mouse drag)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement

      // Don't start panning if clicking on textarea, buttons, or outside preview container
      if (target.tagName === 'TEXTAREA' ||
        target.closest('button') ||
        target.closest('.jotx-mermaid-editor') ||
        !container.contains(target)) {
        return
      }

      // Only pan if clicking within the preview container (on SVG or its wrapper)
      const svgElement = svgRef.current
      if (!svgElement) return

      // Allow panning if clicking on SVG content or the preview container itself
      const isOnSvg = svgElement.contains(target) || target === svgElement || target === container

      if (!isOnSvg) return

      e.preventDefault()
      e.stopPropagation()
      setIsPanning(true)
      setPanStart({ x: e.clientX, y: e.clientY })
      setPanStartOffset({ x: pan.x, y: pan.y })
      container.style.cursor = 'grabbing'
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isPanning) return
      e.preventDefault()
      e.stopPropagation()

      const deltaX = e.clientX - panStart.x
      const deltaY = e.clientY - panStart.y

      setPan({
        x: panStartOffset.x + deltaX,
        y: panStartOffset.y + deltaY
      })
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (isPanning) {
        e.preventDefault()
        e.stopPropagation()
        setIsPanning(false)
        if (container) container.style.cursor = ''
      }
    }

    container.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      container.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      if (container) container.style.cursor = ''
    }
  }, [isPanning, panStart, panStartOffset, pan])

  const onCopy = async () => {
    const text = ((node?.attrs as any)?.src || '').toString()
    const ok = await copyToClipboard(text)
    if (!ok) return
    setCopied(true)
    window.setTimeout(() => setCopied(false), 900)
  }

  // ── PREVIEW MODE: frameless, read-only diagram only ──────────────────
  if (isPreview) {
    const previewSrc = ((node?.attrs as any)?.src || '').toString()
    return (
      <NodeViewWrapper className="jotx-mermaid jotx-mermaid--preview" data-type="mermaid">
        <div
          ref={svgRef}
          className="jotx-mermaid-svg-preview"
        />
        {error && (
          <div className="jotx-mermaid-error">{error}</div>
        )}
      </NodeViewWrapper>
    )
  }

  return (
    <NodeViewWrapper className="jotx-mermaid" data-type="mermaid">
      <div className="jotx-mermaid-editor">
        <div className="jotx-mermaid-header">
          <div className="jotx-mermaid-label"><GitGraph size={14} /><span>Diagram</span></div>
          <input
            type="text"
            className="jotx-block-title-input"
            placeholder="Title (shown in graph)..."
            value={(node?.attrs as any).title || ''}
            onChange={(e) => updateAttributes({ title: e.target.value })}
          />
          <div className="jotx-mermaid-controls">
            <button
              className="jotx-mermaid-iconbtn"
              title={showSource ? 'Hide Source' : 'Show Source'}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setShowSource(!showSource)
              }}
            >
              {showSource ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>

            {showSource && (
              <button
                className="jotx-mermaid-copybtn"
                title={copied ? 'Copied!' : 'Copy Mermaid Code'}
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onCopy()
                }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            )}
          </div>
        </div>

        {showSource && (
          <pre className="jotx-mermaid-code">
            <textarea
              className="jotx-mermaid-textarea"
              spellCheck={false}
              value={((node?.attrs as any)?.src || '').toString()}
              onChange={(e) => updateAttributes({ src: e.target.value })}
            />
          </pre>
        )}
      </div>

      <div
        ref={containerRef}
        className={`jotx-mermaid-preview ${isFocused ? 'jotx-mermaid-focused' : ''}`}
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
        tabIndex={0}
        onClick={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        title={isFocused ? 'Scroll to zoom, drag to pan. Click outside to disable.' : 'Click to enable zoom/pan'}
      >
        {error ? <div className="jotx-mermaid-error">{error}</div> : null}
        <div
          ref={svgRef}
          className="jotx-mermaid-svg"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isPanning ? 'none' : 'transform 0.1s ease-out'
          }}
        />
      </div>
    </NodeViewWrapper>
  )
}


