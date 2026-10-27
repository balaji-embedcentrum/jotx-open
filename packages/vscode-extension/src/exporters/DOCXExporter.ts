/**
 * DOCX Exporter - Convert JOTX AST to Word Document
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  convertInchesToTwip
} from 'docx'
import { BlockNode } from '@jotx-labs/core'

export class DOCXExporter {
  /**
   * Convert JOTX blocks to DOCX Document
   */
  async export(blocks: BlockNode[], title: string = 'Untitled'): Promise<Buffer> {
    const children: any[] = []

    // Add title as heading 1
    if (title && title !== 'Untitled') {
      children.push(
        new Paragraph({
          text: title,
          heading: HeadingLevel.TITLE,
          spacing: { after: 240 }
        })
      )
    }

    // Convert each block
    for (const block of blocks) {
      const elements = this.blockToDocx(block)
      children.push(...elements)
    }

    // Create document
    const doc = new Document({
      sections: [
        {
          properties: {},
          children
        }
      ]
    })

    // Generate buffer
    return await Packer.toBuffer(doc)
  }

  /**
   * Convert a single block to DOCX elements
   */
  private blockToDocx(block: BlockNode): any[] {
    const text = (block.properties?.text as string) || ''
    const result: any[] = []

    switch (block.type) {
      // Headings (V3)
      case 'heading':
        const level = (block.properties?.level as number) || 1;
        let headingLevel;
        let spacingBefore;
        let spacingAfter;

        if (level === 1) {
          headingLevel = HeadingLevel.HEADING_1;
          spacingBefore = 240;
          spacingAfter = 120;
        } else if (level === 2) {
          headingLevel = HeadingLevel.HEADING_2;
          spacingBefore = 200;
          spacingAfter = 100;
        } else { // Default to H3 for any other level
          headingLevel = HeadingLevel.HEADING_3;
          spacingBefore = 160;
          spacingAfter = 80;
        }

        result.push(
          new Paragraph({
            text,
            heading: headingLevel,
            spacing: { before: spacingBefore, after: spacingAfter }
          })
        );
        break;

      // Paragraph
      case 'paragraph':
        if (text.trim()) {
          result.push(
            new Paragraph({
              children: [new TextRun(text)],
              spacing: { after: 120 }
            })
          )
        }
        break

      // Quote
      case 'quote':
        result.push(
          new Paragraph({
            children: [new TextRun({ text, italics: true })],
            indent: { left: convertInchesToTwip(0.5) },
            spacing: { after: 120 }
          })
        )
        break

      // Code
      case 'code':
        const language = block.properties?.language || 'plaintext'
        result.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `[${language}]`,
                bold: true,
                size: 18
              })
            ],
            spacing: { after: 60 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text,
                font: 'Courier New',
                size: 18
              })
            ],
            shading: { fill: 'F5F5F5' },
            spacing: { after: 120 }
          })
        )
        break

      // Callout
      case 'callout':
        const variant = block.properties?.variant || 'info'
        result.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${variant.toUpperCase()}: ${text}`,
                bold: true
              })
            ],
            shading: { fill: this.getCalloutColor(variant) },
            spacing: { after: 120 }
          })
        )
        break

      // List
      case 'list':
        const listType = block.properties?.listtype === 'numbered' ? 'numbered' : 'bullet'
        for (const child of block.children || []) {
          const itemText = (child.properties?.text as string) || ''
          result.push(
            new Paragraph({
              children: [new TextRun(itemText)],
              bullet: listType === 'bullet' ? { level: 0 } : undefined,
              numbering: listType === 'numbered' ? { reference: 'default', level: 0 } : undefined,
              spacing: { after: 60 }
            })
          )
        }
        break

      // Checklist
      case 'checklist':
        for (const child of block.children || []) {
          const itemText = (child.properties?.text as string) || ''
          const checked = child.properties?.checked === 'true'
          result.push(
            new Paragraph({
              children: [new TextRun(`${checked ? '☑' : '☐'} ${itemText}`)],
              spacing: { after: 60 }
            })
          )
        }
        break

      // Table
      case 'table':
        const columns = (block.properties?.columns as string || '').split(',').map(s => s.trim())
        const rows: TableRow[] = []

        // Header row
        if (columns.length > 0 && columns[0]) {
          rows.push(
            new TableRow({
              children: columns.map(
                col =>
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: col, bold: true })],
                        alignment: AlignmentType.CENTER
                      })
                    ],
                    shading: { fill: 'E0E0E0' }
                  })
              )
            })
          )
        }

        // Data rows
        for (const child of block.children || []) {
          if (child.type === 'row') {
            const cells: TableCell[] = []
            for (const cellChild of child.children || []) {
              if (cellChild.type === 'cell') {
                const cellText = (cellChild.properties?.text as string) || ''
                cells.push(
                  new TableCell({
                    children: [new Paragraph(cellText)]
                  })
                )
              }
            }
            rows.push(new TableRow({ children: cells }))
          }
        }

        if (rows.length > 0) {
          result.push(
            new Table({
              rows,
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 1 },
                bottom: { style: BorderStyle.SINGLE, size: 1 },
                left: { style: BorderStyle.SINGLE, size: 1 },
                right: { style: BorderStyle.SINGLE, size: 1 },
                insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
                insideVertical: { style: BorderStyle.SINGLE, size: 1 }
              }
            }),
            new Paragraph({ text: '', spacing: { after: 120 } })
          )
        }
        break

      // Divider
      case 'divider':
        result.push(
          new Paragraph({
            children: [new TextRun('─────────────────────────────────────')],
            alignment: AlignmentType.CENTER,
            spacing: { before: 120, after: 120 }
          })
        )
        break

      // Link
      case 'link':
        const href = block.properties?.href || ''
        result.push(
          new Paragraph({
            children: [
              new TextRun({
                text: text || href,
                style: 'Hyperlink'
              }),
              new TextRun({
                text: ` (${href})`,
                size: 18,
                color: '666666'
              })
            ],
            spacing: { after: 120 }
          })
        )
        break

      // Attach
      case 'attach':
        const path = block.properties?.path || ''
        result.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `📎 ${text || path}`,
                color: '0066CC'
              })
            ],
            spacing: { after: 120 }
          })
        )
        break

      // Toggle / Section (export content only)
      case 'toggle':
      case 'section':
        const title = block.properties?.title || 'Toggle'
        result.push(
          new Paragraph({
            children: [new TextRun({ text: `▸ ${title}`, bold: true })],
            spacing: { before: 120, after: 60 }
          })
        )
        // Export children
        for (const child of block.children || []) {
          const childElements = this.blockToDocx(child)
          result.push(...childElements)
        }
        break

      // Image
      case 'image':
        const src = block.properties?.src || ''
        result.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `[Image: ${src}]`,
                italics: true,
                color: '666666'
              })
            ],
            spacing: { after: 120 }
          })
        )
        break

      // Mermaid
      case 'mermaid':
        result.push(
          new Paragraph({
            children: [
              new TextRun({
                text: '[Mermaid Diagram]',
                bold: true
              })
            ],
            spacing: { after: 60 }
          }),
          new Paragraph({
            children: [
              new TextRun({
                text,
                font: 'Courier New',
                size: 18
              })
            ],
            shading: { fill: 'F0F0F0' },
            spacing: { after: 120 }
          })
        )
        break

      // Chart
      case 'chart':
        const chartType = block.properties?.charttype || 'bar'
        result.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `[${chartType.toUpperCase()} Chart]`,
                bold: true,
                italics: true,
                color: '666666'
              })
            ],
            spacing: { after: 120 }
          })
        )
        break

      // Math
      case 'math':
        result.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `[Math: ${text}]`,
                italics: true,
                color: '333333'
              })
            ],
            spacing: { after: 120 }
          })
        )
        break

      // DateTime
      case 'datetime':
        const value = block.properties?.value || ''
        result.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `📅 ${value || 'No date set'}`,
                color: '0066CC'
              })
            ],
            spacing: { after: 120 }
          })
        )
        break

      default:
        // Unknown block type - export as plain text
        if (text.trim()) {
          result.push(
            new Paragraph({
              children: [new TextRun(text)],
              spacing: { after: 120 }
            })
          )
        }
    }

    return result
  }

  /**
   * Get callout background color
   */
  private getCalloutColor(variant: string): string {
    switch (variant) {
      case 'info':
        return 'E3F2FD'
      case 'warning':
        return 'FFF3E0'
      case 'success':
        return 'E8F5E9'
      case 'danger':
        return 'FFEBEE'
      default:
        return 'F5F5F5'
    }
  }
}


