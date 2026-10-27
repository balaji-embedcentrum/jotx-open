import React, { useEffect, useMemo, useRef, useState } from 'react'
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react'
import type { Chart as ChartInstance } from 'chart.js'
import { useChart } from '../utils/lazyLibs'
import { BarChart3, PieChart, Radar, Settings2, X, Eye, EyeOff } from 'lucide-react'
import '../styles/ChartNodeView.css'
import '../styles/RichBlocks.css'
import { themeColor } from '../utils/cssColor'
import { useEditorMode } from '../contexts/EditorModeContext'


function hexToRgba(hex: string, alpha: number) {
  const h = (hex || '').trim().replace('#', '')
  if (h.length !== 6) return `rgba(99, 102, 241, ${alpha})`
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function computeSuggestedMax(data: any): number | undefined {
  try {
    const ds = Array.isArray(data?.datasets) ? data.datasets : []
    const vals: number[] = []
    for (const d of ds) {
      const arr = Array.isArray(d?.data) ? d.data : []
      for (const v of arr) {
        const n = typeof v === 'number' ? v : parseFloat(String(v))
        if (Number.isFinite(n)) vals.push(n)
      }
    }
    if (vals.length === 0) return undefined
    const max = Math.max(...vals)
    if (!Number.isFinite(max)) return undefined
    const step = max <= 10 ? 2 : 10
    return Math.ceil(max / step) * step
  } catch {
    return undefined
  }
}

function applyDefaultStyles(chartType: string, data: any, scope?: Element | null) {
  // Tokens may be var()/color-mix() expressions; Chart.js needs concrete colors.
  const primary = themeColor('--jx-accent', '#14b8a6', scope)
  const text = themeColor('--jx-fg', '#e5e7eb', scope)
  const text2 = themeColor('--jx-fg-muted', '#cbd5e1', scope)
  const border = themeColor('--jx-line', '#334155', scope)
  const bg = themeColor('--jx-bg', '#0b1220', scope)

  const datasets = Array.isArray(data?.datasets) ? data.datasets : []
  const labels: any[] = Array.isArray(data?.labels) ? data.labels : []

  const defaultPiePalette = (count: number) => {
    // Shared categorical palette (--jx-c-* tokens), readable in dark and light themes.
    const base = ['teal', 'blue', 'violet', 'pink', 'amber', 'green', 'red', 'slate']
      .map((name, i) => themeColor(`--jx-c-${name}`, ['#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#22c55e', '#ef4444', '#64748b'][i]))
    const out: string[] = []
    for (let i = 0; i < Math.max(1, count); i++) {
      out.push(base[i % base.length])
    }
    return out
  }

  // Gentle defaults for readability; only fill missing values.
  for (const ds of datasets) {
    if (chartType === 'radar') {
      ds.borderColor = ds.borderColor ?? primary
      ds.backgroundColor = ds.backgroundColor ?? hexToRgba(primary, 0.18)
      ds.pointBackgroundColor = ds.pointBackgroundColor ?? primary
      ds.pointBorderColor = ds.pointBorderColor ?? bg
      ds.pointHoverBackgroundColor = ds.pointHoverBackgroundColor ?? primary
      ds.pointHoverBorderColor = ds.pointHoverBorderColor ?? bg
      ds.borderWidth = ds.borderWidth ?? 2
      ds.pointRadius = ds.pointRadius ?? 3
      ds.pointHoverRadius = ds.pointHoverRadius ?? 5
    } else if (chartType === 'pie') {
      // Remove slice borders (and legend swatch borders) for a clean fill look.
      ds.borderWidth = 0
      ds.borderColor = 'transparent'

      // If caller didn't provide slice colors, apply a default palette.
      // (Without this, Chart.js defaults can look black in our themed webview.)
      const hasBg =
        Array.isArray(ds.backgroundColor) ? ds.backgroundColor.length > 0 : typeof ds.backgroundColor === 'string' ? !!ds.backgroundColor : false
      if (!hasBg) {
        const n = labels.length || (Array.isArray(ds.data) ? ds.data.length : 0) || 1
        ds.backgroundColor = defaultPiePalette(n)
        ds.hoverBackgroundColor = ds.hoverBackgroundColor ?? ds.backgroundColor
      }
    } else if (chartType === 'bar') {
      // One palette color per dataset (accent first), soft rounded bars
      const tone = datasets.length > 1 ? defaultPiePalette(datasets.length)[datasets.indexOf(ds)] : primary
      ds.backgroundColor = ds.backgroundColor ?? hexToRgba(tone, 0.8)
      ds.hoverBackgroundColor = ds.hoverBackgroundColor ?? tone
      ds.borderWidth = ds.borderWidth ?? 0
      ds.borderRadius = ds.borderRadius ?? 6
      ds.maxBarThickness = ds.maxBarThickness ?? 48
    }
  }

  return {
    colors: { primary, text, text2, border, bg },
    data: { ...data, datasets }
  }
}

function defaultChartJson(type: string) {
  if (type === 'pie') {
    return JSON.stringify(
      {
        labels: ['A', 'B', 'C'],
        datasets: [{ label: 'Share', data: [30, 45, 25] }]
      },
      null,
      2
    )
  }
  if (type === 'radar') {
    return JSON.stringify(
      {
        labels: ['Speed', 'Quality', 'Cost', 'DX', 'Reliability'],
        datasets: [{ label: 'Score', data: [70, 80, 60, 85, 75] }]
      },
      null,
      2
    )
  }
  // bar default
  return JSON.stringify(
    {
      labels: ['Jan', 'Feb', 'Mar', 'Apr'],
      datasets: [{ label: 'Events', data: [12, 19, 8, 15] }]
    },
    null,
    2
  )
}

export function ChartNodeView({ node, updateAttributes, selected }: NodeViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const { isPreview } = useEditorMode()
  const chartRef = useRef<ChartInstance | null>(null)
  const Chart = useChart()
  // Determine if source should be shown. Default to attribute, but if it's a new empty/default node, show it.
  // Read directly from node.attrs to make it reactive
  const showSource = node.attrs.showSource || false
  useEffect(() => {
    const currentJson = (node.attrs.json || '').toString()
    const isNew = !currentJson || currentJson === defaultChartJson((node.attrs.chartType || 'bar').toString())
    if (isNew && !showSource) {
      updateAttributes({ showSource: true })
    }
  }, [])

  const setShowSource = (val: any) => {
    const current = node.attrs.showSource || false
    const next = typeof val === 'function' ? val(current) : val
    updateAttributes({ showSource: next })
  }
  const [error, setError] = useState<string | null>(null)

  const chartType = (node.attrs.chartType || 'bar').toString()
  const json = (node.attrs.json || '').toString() || defaultChartJson(chartType)

  const id = useMemo(() => `chart_${Math.random().toString(36).slice(2)}`, [])

  useEffect(() => {
    // hydrate default json once if empty
    if (!node.attrs.json) {
      updateAttributes({ json })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const el = canvasRef.current
    if (!el || !Chart) return
    const ctx = el.getContext('2d')
    if (!ctx) return

    try {
      const parsedRaw = JSON.parse(json)
      const themed = applyDefaultStyles(chartType, parsedRaw, el)
      const parsed = themed.data
      const { text, text2, border } = themed.colors
      const suggestedMax = chartType === 'radar' ? computeSuggestedMax(parsed) : undefined
      setError(null)

      chartRef.current?.destroy()
      chartRef.current = new Chart(ctx, {
        type: chartType as any,
        data: parsed,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 180 },
          layout: { padding: chartType === 'radar' ? 16 : 10 },
          plugins: {
            legend: {
              display: true,
              labels: {
                color: text2,
                boxWidth: 14,
                boxHeight: 8,
                // Pie legend should be solid color swatches (no borders). Point-style looks odd here.
                usePointStyle: chartType === 'pie' ? false : true
              }
            }
          },
          ...(chartType === 'bar' || chartType === 'line'
            ? {
              scales: {
                x: { ticks: { color: text2 }, grid: { display: false }, border: { color: hexToRgba(border, 0.9) } },
                y: { beginAtZero: true, ticks: { color: text2 }, grid: { color: hexToRgba(border, 0.6) }, border: { display: false } }
              }
            }
            : {}),
          ...(chartType === 'radar'
            ? {
              scales: {
                r: {
                  beginAtZero: true,
                  suggestedMax,
                  grid: {
                    color: hexToRgba(border, 0.45),
                    circular: true
                  },
                  angleLines: {
                    color: hexToRgba(border, 0.55)
                  },
                  pointLabels: {
                    color: text,
                    font: { size: 12, weight: '600' as any },
                    padding: 6
                  },
                  ticks: {
                    display: false
                  }
                }
              },
              elements: {
                line: { tension: 0.25 }
              }
            }
            : {})
        }
      })
    } catch (e: any) {
      chartRef.current?.destroy()
      chartRef.current = null
      setError(e?.message || 'Invalid chart JSON')
    }

    return () => {
      // keep chart alive between renders; only destroy on unmount
    }
  }, [chartType, json, id, Chart])

  useEffect(() => {
    return () => {
      chartRef.current?.destroy()
      chartRef.current = null
    }
  }, [])

  // ── PREVIEW MODE: frameless, read-only chart only ───────────────────
  if (isPreview) {
    return (
      <NodeViewWrapper
        className="jotx-chart jotx-chart--preview"
        data-type="chart"
        data-chart-type={chartType}
      >
        <div className="jotx-chart-canvas-preview">
          <canvas ref={canvasRef} />
        </div>
      </NodeViewWrapper>
    )
  }

  return (
    <NodeViewWrapper
      className="jotx-chart"
      data-type="chart"
      data-chart-type={chartType}
      data-selected={selected ? 'true' : 'false'}
    >
      <div className="jotx-chart-header">
        <div className="jotx-chart-title"><BarChart3 size={14} /><span>Chart</span></div>
        <input
          type="text"
          className="jotx-block-title-input"
          placeholder="Title (shown in graph)..."
          value={(node.attrs.title || '').toString()}
          onChange={(e) => updateAttributes({ title: e.target.value })}
        />
        <div className="jotx-chart-type">
          <button
            className={`jotx-chart-type-btn ${chartType === 'bar' ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => updateAttributes({ chartType: 'bar', json: node.attrs.json || defaultChartJson('bar') })}
            title="Bar"
          >
            <BarChart3 size={16} />
          </button>
          <button
            className={`jotx-chart-type-btn ${chartType === 'pie' ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => updateAttributes({ chartType: 'pie', json: node.attrs.json || defaultChartJson('pie') })}
            title="Pie"
          >
            <PieChart size={16} />
          </button>
          <button
            className={`jotx-chart-type-btn ${chartType === 'radar' ? 'active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => updateAttributes({ chartType: 'radar', json: node.attrs.json || defaultChartJson('radar') })}
            title="Radar"
          >
            <Radar size={16} />
          </button>
        </div>

        <button
          className="jotx-chart-settings"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setShowSource((s) => !s)}
          title={(node.attrs.showSource || false) ? "Hide Source" : "Show Source"}
        >
          {(node.attrs.showSource || false) ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      {error ? <div className="jotx-chart-error">{error}</div> : null}

      <div className="jotx-chart-canvasWrap">
        <canvas ref={canvasRef} />
      </div>

      {(node.attrs.showSource || false) ? (
        <div className="jotx-chart-editor">
          <div className="jotx-chart-editorHint">Edit JSON (labels + datasets)</div>
          <textarea
            value={json}
            onChange={(e) => updateAttributes({ json: e.target.value })}
            spellCheck={false}
          />
        </div>
      ) : null}
    </NodeViewWrapper>
  )
}


