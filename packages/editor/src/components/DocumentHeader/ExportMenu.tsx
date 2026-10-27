/**
 * Export Menu - Cross-Platform Version
 * Uses VS Code native file dialog when in extension, browser download otherwise
 */

import React, { useState, useRef, useEffect } from 'react'
import { Download, FileText, FileDown, FileOutput } from 'lucide-react'
import { getVSCodeAPI } from '../../bridge/vscode-api'
import '../../styles/ExportMenu.css'
import { logger } from '../../utils/logger'

// Check if running in VS Code webview
const isVSCode = typeof window !== 'undefined' &&
  ((window as any).acquireVsCodeApi !== undefined || (window as any).vscodeApi !== undefined)

export interface ExportMenuProps {
  documentId: string
  documentTitle?: string
}

export function ExportMenu({ documentId, documentTitle = 'Untitled' }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Listen for export completion/error messages from VS Code extension
  useEffect(() => {
    if (!isVSCode) return

    const handleMessage = (event: MessageEvent) => {
      const message = event.data
      if (message.type === 'exportComplete' || message.type === 'exportCancelled' || message.type === 'exportError') {
        logger.log(`📄 [ExportMenu] Export ${message.type}:`, message)
        setIsExporting(false)
      }
      // Handle jsPDF fallback signal from extension
      if (message.type === 'useFrontendPDF') {
        logger.log('📄 [ExportMenu] Extension signaled jsPDF fallback, triggering browser-side PDF')
        // Could trigger browser-side PDF here if needed
        setIsExporting(false)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  /**
   * Download a file via browser-native API
   */
  const downloadFile = (content: Blob | string, filename: string, mimeType: string) => {
    const blob = typeof content === 'string' ? new Blob([content], { type: mimeType }) : content
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  /**
   * Export to Markdown
   */
  const exportMarkdown = async () => {
    try {
      setIsExporting(true)
      setIsOpen(false)

      // In VS Code, send message to extension for native file dialog
      if (isVSCode) {
        logger.log('📄 [ExportMenu] Sending export request to VS Code extension (MD)')
        const vscode = getVSCodeAPI()
        vscode.postMessage({
          type: 'exportDocument',
          format: 'md',
          requestId: `export-md-${Date.now()}`
        })
        // Extension will handle the save dialog and close
        // Exporting state will be reset by message listener
        return
      }

      // Browser fallback: use downloadFile
      const prosemirror = document.querySelector('.ProseMirror')
      if (!prosemirror) {
        throw new Error('Editor not found')
      }

      // Simple HTML to Markdown conversion
      const html = prosemirror.innerHTML
      const markdown = htmlToMarkdown(html)

      const filename = `${documentTitle.replace(/[^a-z0-9]/gi, '_')}.md`
      downloadFile(markdown, filename, 'text/markdown')

      logger.log('✅ Markdown exported:', filename)
    } catch (error) {
      console.error('Markdown export failed:', error)
    } finally {
      if (!isVSCode) {
        setIsExporting(false)
      }
    }
  }

  /**
   * Export to PDF using jsPDF + html2canvas (browser) or Puppeteer (VS Code)
   */
  const exportPDF = async () => {
    try {
      setIsExporting(true)
      setIsOpen(false)

      // Find the ProseMirror element
      const element = document.querySelector('.ProseMirror') as HTMLElement
      if (!element) {
        throw new Error('Editor not found')
      }

      // In VS Code, send message to extension for native file dialog + Puppeteer
      if (isVSCode) {
        logger.log('📄 [ExportMenu] Sending export request to VS Code extension (PDF)')
        const vscode = getVSCodeAPI()

        // CRITICAL: Convert canvas elements (charts) to images before capturing HTML
        // Chart.js renders dynamically to <canvas>, which Puppeteer can't reproduce
        const canvases = element.querySelectorAll('canvas')
        const canvasReplacements: { canvas: HTMLCanvasElement, placeholder: HTMLImageElement }[] = []

        canvases.forEach((canvas) => {
          try {
            const dataUrl = (canvas as HTMLCanvasElement).toDataURL('image/png')
            // Create an image element with same dimensions
            const img = document.createElement('img')
            img.src = dataUrl
            img.style.cssText = canvas.getAttribute('style') || ''
            img.style.width = canvas.clientWidth + 'px'
            img.style.height = canvas.clientHeight + 'px'
            img.style.display = 'block'
            img.className = 'jotx-chart-exported'

            // Store for restoration later
            canvasReplacements.push({ canvas: canvas as HTMLCanvasElement, placeholder: img })

            // Replace canvas with image in the DOM temporarily
            canvas.parentNode?.insertBefore(img, canvas)
              ; (canvas as HTMLCanvasElement).style.display = 'none'
            logger.log('📊 [ExportMenu] Converted chart canvas to image')
          } catch (e) {
            console.warn('Could not convert canvas to image:', e)
          }
        })

        // Now capture HTML with rendered chart images
        const html = element.innerHTML

        // Restore canvas elements
        canvasReplacements.forEach(({ canvas, placeholder }) => {
          canvas.style.display = ''
          placeholder.remove()
        })

        // Capture CSS
        const styleSheets = Array.from(document.styleSheets)
        let css = ''
        try {
          styleSheets.forEach(sheet => {
            try {
              if (sheet.cssRules) {
                Array.from(sheet.cssRules).forEach(rule => {
                  css += rule.cssText + '\n'
                })
              }
            } catch (e) {
              // Skip cross-origin stylesheets
            }
          })
        } catch (e) {
          console.warn('Could not extract all CSS:', e)
        }

        vscode.postMessage({
          type: 'exportDocument',
          format: 'pdf',
          html: html,
          css: css,
          requestId: `export-pdf-${Date.now()}`
        })
        // Extension will handle the save dialog
        return
      }

      // Browser fallback: use jsPDF + html2canvas
      logger.log('🔄 Generating PDF using jsPDF...')

      // Dynamically import jsPDF and html2canvas
      const { default: jsPDF } = await import('jspdf')
      const html2canvas = (await import('html2canvas')).default

      // Clone content for PDF capture without affecting the real DOM
      const offscreenContainer = document.createElement('div')
      offscreenContainer.style.cssText = `
        position: absolute;
        left: -9999px;
        top: 0;
        width: 800px;
        height: auto;
        overflow: visible;
        background: white;
        padding: 40px;
      `

      const clone = element.cloneNode(true) as HTMLElement
      clone.style.cssText = `
        height: auto !important;
        max-height: none !important;
        overflow: visible !important;
        min-height: 0 !important;
      `

      offscreenContainer.appendChild(clone)
      document.body.appendChild(offscreenContainer)

      // Wait for reflow
      await new Promise(r => setTimeout(r, 200))

      const fullHeight = clone.scrollHeight || clone.offsetHeight

      // Create canvas from the clone
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        height: fullHeight,
        windowHeight: fullHeight + 100,
        scrollY: 0,
        scrollX: 0
      })

      // Remove offscreen container
      document.body.removeChild(offscreenContainer)

      // Create PDF
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = pdfWidth - 20 // 10mm margin on each side
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      const xOffset = 10 // 10mm left margin

      let heightLeft = imgHeight
      let position = 10 // Start with 10mm top margin

      // Add first page
      pdf.addImage(imgData, 'PNG', xOffset, position, imgWidth, imgHeight)
      heightLeft -= (pdfHeight - 20)

      // Add additional pages if needed
      while (heightLeft > 0) {
        pdf.addPage()
        position = -(imgHeight - heightLeft) + 10
        pdf.addImage(imgData, 'PNG', xOffset, position, imgWidth, imgHeight)
        heightLeft -= (pdfHeight - 20)
      }

      // Download PDF
      const pdfBlob = pdf.output('blob')
      const filename = `${documentTitle.replace(/[^a-z0-9]/gi, '_')}.pdf`
      downloadFile(pdfBlob, filename, 'application/pdf')

      logger.log('✅ PDF exported:', filename)
    } catch (error) {
      console.error('PDF export failed:', error)
    } finally {
      if (!isVSCode) {
        setIsExporting(false)
      }
    }
  }

  return (
    <div className="jotx-export-menu" ref={menuRef}>
      <button
        className="jotx-header-button"
        onClick={() => setIsOpen(!isOpen)}
        title="Download document"
        disabled={isExporting}
      >
        {isExporting ? (
          <span style={{ fontSize: '12px' }}>Exporting...</span>
        ) : (
          <Download size={16} />
        )}
      </button>

      {isOpen && !isExporting && (
        <div className="jotx-export-dropdown">
          <div className="jotx-export-header">Download as</div>

          <button
            className="jotx-export-item"
            onClick={exportPDF}
            title="Export to PDF"
          >
            <FileDown size={16} />
            <span>PDF Document</span>
            <span className="jotx-export-badge">.pdf</span>
          </button>

          <button
            className="jotx-export-item"
            onClick={exportMarkdown}
            title="Export to Markdown"
          >
            <FileText size={16} />
            <span>Markdown</span>
            <span className="jotx-export-badge">.md</span>
          </button>

          {/* DOCX export only available in VS Code context */}
          {isVSCode && (
            <button
              className="jotx-export-item"
              onClick={() => {
                setIsExporting(true)
                setIsOpen(false)
                logger.log('📄 [ExportMenu] Sending export request to VS Code extension (DOCX)')
                const vscode = getVSCodeAPI()
                vscode.postMessage({
                  type: 'exportDocument',
                  format: 'docx',
                  requestId: `export-docx-${Date.now()}`
                })
              }}
              title="Export to Word Document"
            >
              <FileOutput size={16} />
              <span>Word Document</span>
              <span className="jotx-export-badge">.docx</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Simple HTML to Markdown converter
 */
function htmlToMarkdown(html: string): string {
  let md = html

  // Headers
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
  md = md.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
  md = md.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')

  // Bold and italic
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
  md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
  md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')

  // Code
  md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
  md = md.replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, '```\n$1\n```\n\n')

  // Links
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')

  // Images
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)')
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '![]($1)')

  // Lists
  md = md.replace(/<ul[^>]*>/gi, '\n')
  md = md.replace(/<\/ul>/gi, '\n')
  md = md.replace(/<ol[^>]*>/gi, '\n')
  md = md.replace(/<\/ol>/gi, '\n')
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')

  // Paragraphs
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gis, '$1\n\n')

  // Line breaks
  md = md.replace(/<br\s*\/?>/gi, '\n')

  // Horizontal rules
  md = md.replace(/<hr[^>]*>/gi, '\n---\n\n')

  // Blockquotes
  md = md.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, '> $1\n\n')

  // Remove remaining HTML tags
  md = md.replace(/<[^>]+>/g, '')

  // Decode HTML entities
  md = md.replace(/&nbsp;/g, ' ')
  md = md.replace(/&amp;/g, '&')
  md = md.replace(/&lt;/g, '<')
  md = md.replace(/&gt;/g, '>')
  md = md.replace(/&quot;/g, '"')
  md = md.replace(/&#39;/g, "'")

  // Clean up extra whitespace
  md = md.replace(/\n{3,}/g, '\n\n')
  md = md.trim()

  return md
}
