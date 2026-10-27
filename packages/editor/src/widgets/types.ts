/**
 * Widget framework types
 *
 * A widget is an atom block whose entire state lives in flat string attributes.
 * Each attribute round-trips 1:1 to a property in the .jot file (see
 * WIDGET_BLOCK_TYPES in @jotx-labs/core), so a widget is just a spec + a view.
 */

import type { ComponentType } from 'react'
import type { Editor } from '@tiptap/core'
import type { LucideIcon } from 'lucide-react'

export type WidgetAttrs = Record<string, string>

export type WidgetCategory = 'productivity' | 'planning' | 'developer'

export interface WidgetViewProps {
  attrs: WidgetAttrs
  /** Merge a partial update into the node attributes (persisted to the file). */
  update: (patch: WidgetAttrs) => void
  /** False in preview mode or when the editor is read-only. */
  editable: boolean
  /** True while the settings panel is open. */
  editing: boolean
  setEditing: (editing: boolean) => void
  selected: boolean
  editor: Editor
}

export interface WidgetField {
  key: string
  label: string
  kind: 'text' | 'textarea' | 'number' | 'select' | 'date' | 'datetime' | 'color'
  options?: string[]
  placeholder?: string
  /** One-line hint rendered under the field (e.g. the line format). */
  help?: string
  rows?: number
  mono?: boolean
}

export interface WidgetSpec {
  /** Tiptap node name and .jot keyword (flatcase). Must be listed in WIDGET_BLOCK_TYPES. */
  name: string
  label: string
  description: string
  icon: LucideIcon
  keywords: string[]
  category: WidgetCategory
  /**
   * Every attribute the widget uses, with sample values inserted by the slash menu.
   * Nodes loaded from a file get '' for missing properties, so views must apply
   * their own fallbacks (e.g. num(attrs.max, 5)).
   */
  defaults: WidgetAttrs
  /** Fields rendered by the generic settings panel. */
  fields?: WidgetField[]
  View: ComponentType<WidgetViewProps>
  /** Attribute shown as the frame title (default: 'title'). */
  titleKey?: string
  /** Render without the frame header (the view draws its own chrome). */
  frameless?: boolean
}
