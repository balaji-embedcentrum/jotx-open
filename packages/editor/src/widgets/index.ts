/**
 * Widget registry - every widget available in the editor.
 *
 * Adding a widget:
 *   1. add its name to WIDGET_BLOCK_TYPES (@jotx-labs/core) and its properties to
 *      standard-lib/src/blocks/Widgets.ts (registry + validation)
 *   2. create kinds/<Name>.tsx exporting a WidgetSpec, and list it below
 */

import type { WidgetSpec, WidgetCategory } from './types'
import { createWidgetNode } from './createWidgetNode'
import { kanbanWidget } from './kinds/Kanban'
import { habitWidget } from './kinds/Habit'
import { progressWidget } from './kinds/Progress'
import { countdownWidget } from './kinds/Countdown'
import { timerWidget } from './kinds/Timer'
import { matrixWidget } from './kinds/Matrix'
import { prosconsWidget } from './kinds/ProsCons'
import { decisionWidget } from './kinds/Decision'
import { ratingWidget } from './kinds/Rating'
import { tocWidget } from './kinds/Toc'
import { stepsWidget } from './kinds/Steps'
import { timelineWidget } from './kinds/Timeline'
import { terminalWidget } from './kinds/Terminal'
import { apiWidget } from './kinds/Api'
import { filetreeWidget } from './kinds/FileTree'
import { diffWidget } from './kinds/Diff'
import { paletteWidget } from './kinds/Palette'
import { badgesWidget } from './kinds/Badges'
import { shortcutsWidget } from './kinds/Shortcuts'
import { animationWidget } from './kinds/Animation'
import { menuWidget } from './kinds/Menu'

export const WIDGETS: WidgetSpec[] = [
  kanbanWidget,
  habitWidget,
  progressWidget,
  countdownWidget,
  timerWidget,
  matrixWidget,
  prosconsWidget,
  decisionWidget,
  ratingWidget,
  tocWidget,
  stepsWidget,
  timelineWidget,
  terminalWidget,
  apiWidget,
  filetreeWidget,
  diffWidget,
  paletteWidget,
  badgesWidget,
  shortcutsWidget,
  animationWidget,
  menuWidget
]

export const WIDGET_CATEGORY_LABELS: Record<WidgetCategory, string> = {
  productivity: 'Productivity',
  planning: 'Planning & Docs',
  developer: 'Developer'
}

export const WIDGET_NAMES = new Set(WIDGETS.map(w => w.name))

export function getWidget(name: string): WidgetSpec | undefined {
  return WIDGETS.find(w => w.name === name)
}

/** Tiptap extensions for all widgets. */
export const WidgetExtensions = WIDGETS.map(createWidgetNode)

/** Tiptap content to insert a fresh widget (followed by an empty paragraph). */
export function widgetInsertContent(name: string) {
  const spec = getWidget(name)
  if (!spec) return null
  return [{ type: spec.name, attrs: { ...spec.defaults } }, { type: 'paragraph' }]
}

export type { WidgetSpec, WidgetViewProps, WidgetField, WidgetAttrs, WidgetCategory } from './types'
