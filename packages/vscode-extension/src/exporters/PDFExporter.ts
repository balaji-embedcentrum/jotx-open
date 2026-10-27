/**
 * PDF Exporter - Convert JOTX to PDF using Puppeteer-core
 * Uses system Chrome/Edge/Chromium for perfect HTML rendering
 */

import { AST, jotToMarkdown } from '@jotx-labs/core'
import { marked } from 'marked'
import { findChrome, ChromeInfo, getChromeBrowserName } from '../utils/findChrome'
import { logger } from '../utils/logger'

export class PDFExporter {
  /**
   * Export from frontend-captured HTML (PREFERRED METHOD)
   * This gives exact visual fidelity of what user sees
   * Automatically chooses best method: puppeteer-core (text-based) or jsPDF (screenshot)
   * 
   * Returns Buffer if successful, or null if frontend jsPDF should be used
   */
  async exportFromHTML(html: string, css: string, title: string = 'Untitled'): Promise<Buffer | null> {
    logger.log('🔍 PDFExporter: Looking for Chrome/Edge/Chromium...')
    const chromeInfo = await findChrome()

    if (chromeInfo) {
      // ✅ Chrome/Edge found - Use puppeteer-core for text-based PDF
      logger.log(`✅ Found browser: ${getChromeBrowserName(chromeInfo)} at ${chromeInfo.executablePath}`)
      logger.log('🚀 Launching puppeteer-core...')
      try {
        const result = await this.exportWithPuppeteer(chromeInfo, html, css, title)
        logger.log('✅ PDF generated successfully with puppeteer-core!')
        return result
      } catch (error: any) {
        // If puppeteer fails, return null to signal frontend jsPDF should be used
        logger.error(`❌ Puppeteer failed (${error.message}), falling back to frontend jsPDF`)
        return null
      }
    } else {
      // ⚠️ No Chrome/Edge - Return null to signal frontend jsPDF should be used
      logger.log('⚠️ No Chrome/Edge found, signaling frontend to use jsPDF')
      return null
    }
  }

  /**
   * Export using Puppeteer-core (text-based, searchable PDF)
   */
  private async exportWithPuppeteer(
    chromeInfo: ChromeInfo,
    html: string,
    css: string,
    title: string
  ): Promise<Buffer> {

    logger.log('📦 Importing puppeteer-core...')
    const puppeteer = await import('puppeteer-core')

    logger.log('🌐 Launching headless browser...')
    const browser = await puppeteer.launch({
      executablePath: chromeInfo.executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    logger.log('📄 Creating new page...')
    const page = await browser.newPage()

    // Initial viewport - width matters for A4, height will be adjusted after content loads
    await page.setViewport({
      width: 794,  // A4 width in pixels at 96 DPI (210mm)
      height: 1123, // Initial A4 height
      deviceScaleFactor: 2 // High DPI for better quality
    })

    logger.log('🎨 Setting HTML content...')
    // Build complete HTML with inline styles
    const fullHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(title)}</title>
  <style>
    ${css}
    
    /* PDF-specific styles - OVERRIDE EDITOR STYLES */
    * {
      box-sizing: border-box;
    }
    
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: white !important;
      color: #000 !important;
      height: auto !important;
      overflow: visible !important;
    }
    
    .ProseMirror {
      max-width: none !important;
      padding: 0 !important;
      margin: 0 !important;
      min-height: auto !important;
      height: auto !important;
      overflow: visible !important;
      font-size: 12pt;
      line-height: 1.6;
    }
    
    /* CRITICAL: Normalize block spacing to prevent excessive page breaks */
    .ProseMirror > * {
      padding: 0 !important;
      margin: 0.75em 0 !important;
      border-radius: 0 !important;
      background-color: transparent !important;
      transition: none !important;
      page-break-inside: auto; /* Allow natural breaks */
    }
    
    /* First element has no top margin */
    .ProseMirror > *:first-child {
      margin-top: 0 !important;
    }
    
    /* Paragraphs */
    .ProseMirror p {
      margin: 0.5em 0 !important;
      line-height: 1.6 !important;
      orphans: 3;
      widows: 3;
    }
    
    /* Headings */
    .ProseMirror h1 {
      margin: 1.5em 0 0.5em !important;
      font-size: 24pt !important;
      font-weight: 700 !important;
      page-break-after: avoid;
      page-break-inside: avoid;
      orphans: 3;
      widows: 3;
    }
    
    .ProseMirror h1:first-child {
      margin-top: 0 !important;
    }
    
    .ProseMirror h2 {
      margin: 1.2em 0 0.4em !important;
      font-size: 18pt !important;
      font-weight: 600 !important;
      page-break-after: avoid;
      page-break-inside: avoid;
      orphans: 3;
      widows: 3;
    }
    
    .ProseMirror h3 {
      margin: 1em 0 0.3em !important;
      font-size: 14pt !important;
      font-weight: 600 !important;
      page-break-after: avoid;
      page-break-inside: avoid;
      orphans: 3;
      widows: 3;
    }
    
    /* Lists */
    .ProseMirror ul,
    .ProseMirror ol {
      margin: 0.5em 0 !important;
      padding-left: 2em !important;
    }
    
    .ProseMirror li {
      margin: 0.25em 0 !important;
      orphans: 2;
      widows: 2;
    }
    
    /* Code blocks - keep together when possible */
    .ProseMirror pre {
      margin: 1em 0 !important;
      padding: 1em !important;
      background: #f5f5f5 !important;
      border: 1px solid #ddd !important;
      border-radius: 4px !important;
      overflow-x: auto;
      page-break-inside: avoid;
    }
    
    .ProseMirror pre code {
      font-size: 10pt !important;
      line-height: 1.4 !important;
    }
    
    /* Blockquotes */
    .ProseMirror blockquote {
      margin: 1em 0 !important;
      padding-left: 1em !important;
      border-left: 4px solid #3b82f6 !important;
      color: #666 !important;
      page-break-inside: avoid;
    }
    
    /* Tables - keep together */
    .ProseMirror table {
      margin: 1em 0 !important;
      border-collapse: collapse !important;
      width: 100% !important;
      page-break-inside: avoid;
    }
    
    .ProseMirror table td,
    .ProseMirror table th {
      border: 1px solid #ddd !important;
      padding: 8px !important;
    }
    
    /* Images */
    .ProseMirror img {
      max-width: 100% !important;
      height: auto !important;
      page-break-inside: avoid;
      display: block;
      margin: 1em 0;
    }
    
    /* Horizontal rules */
    .ProseMirror hr {
      margin: 2em 0 !important;
      border: none !important;
      border-top: 2px solid #ddd !important;
      page-break-after: avoid;
    }
    
    /* Remove hover effects */
    .ProseMirror > *:hover,
    .ProseMirror > *:focus-within {
      background-color: transparent !important;
      outline: none !important;
    }
    
    /* Hide interactive/editing UI elements */
    .jotx-block-handle,
    .jotx-block-menu,
    .jotx-slash-menu,
    .search-highlight,
    .jotx-mermaid-controls,
    .jotx-mermaid-header,
    .jotx-chart-header,
    .jotx-chart-editor,
    .jotx-chart-editorHint,
    .jotx-math-header,
    .jotx-math-input,
    .button-edit-form,
    .button-edit-icon,
    .jotx-block-title-input,
    textarea,
    input[type="text"],
    select {
      display: none !important;
    }
    
    /* ===== MERMAID: Fix SVG overflow clipping ===== */
    .jotx-mermaid {
      overflow: visible !important;
      padding: 20px !important;
      border: none !important;
    }
    .jotx-mermaid-editor {
      overflow: visible !important;
    }
    .jotx-mermaid-preview {
      overflow: visible !important;
      border: none !important;
      min-height: auto !important;
    }
    .jotx-mermaid-svg {
      overflow: visible !important;
    }
    .jotx-mermaid-svg svg {
      overflow: visible !important;
      max-width: 100% !important;
      font-size: 10px !important;
    }
    /* Reduce Mermaid text size */
    .jotx-mermaid-svg svg text,
    .jotx-mermaid-svg svg .nodeLabel,
    .jotx-mermaid-svg svg .edgeLabel {
      font-size: 10px !important;
    }
    /* Hide mermaid source code textarea */
    .jotx-mermaid-code {
      display: none !important;
    }
    
    /* ===== CHART: Show canvas only ===== */
    .jotx-chart {
      page-break-inside: avoid;
      border: 1px solid #ddd !important;
      border-radius: 8px !important;
      padding: 16px !important;
    }
    .jotx-chart-canvasWrap {
      display: block !important;
      min-height: 300px !important;
    }
    .jotx-chart-canvasWrap canvas {
      display: block !important;
      width: 100% !important;
      height: auto !important;
    }
    
    /* ===== BUTTON: Show styled button ===== */
    .button-wrapper {
      display: block !important;
      margin: 0.5em 0 !important;
    }
    .button-with-edit {
      display: inline-flex !important;
    }
    .jotx-button {
      display: inline-block !important;
      padding: 10px 20px !important;
      background: #14b8a6 !important;
      color: white !important;
      border: none !important;
      border-radius: 8px !important;
      font-weight: 600 !important;
      font-size: 13pt !important;
      cursor: default !important;
    }
    .jotx-button-secondary {
      background: #64748b !important;
    }
    .jotx-button-outline {
      background: transparent !important;
      border: 2px solid #14b8a6 !important;
      color: #14b8a6 !important;
    }
    .jotx-button-ghost {
      background: transparent !important;
      color: #14b8a6 !important;
    }
    
    /* ===== MATH: Show rendered output only ===== */
    .jotx-math {
      display: block !important;
      margin: 1em 0 !important;
    }
    .jotx-math-body {
      display: block !important;
    }
    .jotx-math-preview {
      display: block !important;
    }
    
    /* ===== CALLOUT: Style properly for print ===== */
    div[data-type="callout"] {
      page-break-inside: avoid;
      border-radius: 8px !important;
      padding: 16px !important;
      margin: 1em 0 !important;
      border-left: 4px solid #3b82f6 !important;
      background: #f0f9ff !important;
    }
    div[data-type="callout"][data-variant="warning"] {
      border-left-color: #f59e0b !important;
      background: #fffbeb !important;
    }
    div[data-type="callout"][data-variant="success"] {
      border-left-color: #10b981 !important;
      background: #ecfdf5 !important;
    }
    div[data-type="callout"][data-variant="danger"] {
      border-left-color: #ef4444 !important;
      background: #fef2f2 !important;
    }
    
    /* Page settings */
    @page {
      size: A4;
      margin: 20mm;
    }
  </style>
</head>
<body>
  <div class="ProseMirror">
    ${html}
  </div>
</body>
</html>`

    await page.setContent(fullHTML, { waitUntil: 'networkidle0' })

    // Wait for any fonts/resources to load
    await new Promise(resolve => setTimeout(resolve, 1000))

    // CRITICAL: Get the FULL document height and resize viewport to fit
    const contentHeight = await page.evaluate(() => {
      const body = document.body
      const html = document.documentElement
      return Math.max(
        body.scrollHeight, body.offsetHeight, body.clientHeight,
        html.scrollHeight, html.offsetHeight, html.clientHeight
      )
    })
    logger.log(`📏 Full content height: ${contentHeight}px`)

    // CRITICAL: Resize viewport to FULL content height before generating PDF
    // This ensures puppeteer renders the entire document, not just one viewport
    await page.setViewport({
      width: 794,
      height: contentHeight + 100, // Add buffer
      deviceScaleFactor: 2
    })

    // Wait for reflow after viewport change
    await new Promise(resolve => setTimeout(resolve, 500))

    logger.log('📄 Generating PDF...')
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      },
      preferCSSPageSize: false
    })

    logger.log('🔒 Closing browser...')
    await browser.close()

    logger.log(`✅ PDF buffer ready (${pdfBuffer.length} bytes)`)
    return Buffer.from(pdfBuffer)
  }


  /**
   * Convert JOTX AST to PDF Buffer (FALLBACK METHOD)
   * Uses Markdown conversion if direct HTML not available
   */
  async export(ast: AST, title: string = 'Untitled'): Promise<Buffer> {
    // Step 1: Convert to Markdown
    const markdown = jotToMarkdown(ast)

    // Step 2: Convert Markdown to HTML
    const html = await this.markdownToHTML(markdown, title)

    // Step 3: Extract CSS from markdown styles
    const css = this.getMarkdownCSS()

    // Step 4: Use the HTML export method
    return await this.exportFromHTML(html, css, title)
  }

  /**
   * Get CSS for markdown-based PDFs
   */
  private getMarkdownCSS(): string {
    return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 16px;
      line-height: 1.6;
      color: #24292f;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    
    h1, h2, h3, h4, h5, h6 {
      margin-top: 24px;
      margin-bottom: 16px;
      font-weight: 600;
      line-height: 1.25;
    }
    
    h1 { font-size: 2em; border-bottom: 1px solid #d0d7de; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #d0d7de; padding-bottom: 0.3em; }
    h3 { font-size: 1.25em; }
    h4 { font-size: 1em; }
    h5 { font-size: 0.875em; }
    h6 { font-size: 0.85em; color: #57606a; }
    
    p {
      margin-bottom: 16px;
    }
    
    a {
      color: #0969da;
      text-decoration: none;
    }
    
    a:hover {
      text-decoration: underline;
    }
    
    code {
      background-color: rgba(175, 184, 193, 0.2);
      padding: 0.2em 0.4em;
      border-radius: 6px;
      font-family: "SF Mono", Monaco, "Cascadia Code", monospace;
      font-size: 85%;
    }
    
    pre {
      background-color: #f6f8fa;
      padding: 16px;
      border-radius: 6px;
      overflow-x: auto;
      margin-bottom: 16px;
    }
    
    pre code {
      background-color: transparent;
      padding: 0;
      font-size: 85%;
    }
    
    blockquote {
      padding: 0 1em;
      color: #57606a;
      border-left: 0.25em solid #d0d7de;
      margin-bottom: 16px;
    }
    
    ul, ol {
      padding-left: 2em;
      margin-bottom: 16px;
    }
    
    li {
      margin-bottom: 0.25em;
    }
    
    table {
      border-collapse: collapse;
      width: 100%;
      margin-bottom: 16px;
    }
    
    th, td {
      padding: 6px 13px;
      border: 1px solid #d0d7de;
    }
    
    th {
      background-color: #f6f8fa;
      font-weight: 600;
    }
    
    tr:nth-child(even) {
      background-color: #f6f8fa;
    }
    
    hr {
      height: 0.25em;
      padding: 0;
      margin: 24px 0;
      background-color: #d0d7de;
      border: 0;
    }
    
    img {
      max-width: 100%;
      height: auto;
    }
    
    strong {
      font-weight: 600;
    }
    
    em {
      font-style: italic;
    }
    
    del {
      text-decoration: line-through;
    }
    
    mark {
      background-color: #fff8c5;
      padding: 0.1em 0.2em;
    }
    
    @media print {
      body {
        max-width: none;
        padding: 20px;
      }
      
      a {
        color: #000;
        text-decoration: underline;
      }
    }
    `
  }

  /**
   * Convert Markdown to styled HTML body content
   */
  private async markdownToHTML(markdown: string, title: string): Promise<string> {
    const bodyContent = await marked(markdown)
    return bodyContent
  }


  /**
   * Escape HTML entities
   */
  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }
    return text.replace(/[&<>"']/g, m => map[m])
  }
}



















