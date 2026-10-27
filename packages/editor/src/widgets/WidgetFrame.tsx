/**
 * Shared chrome for every widget: header (icon, title, settings toggle),
 * optional settings panel, and the widget's own view.
 */

import React, { useState } from 'react'
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { Settings2, GripVertical } from 'lucide-react'
import { useEditorMode } from '../contexts/EditorModeContext'
import { WidgetSettings } from './WidgetSettings'
import type { WidgetAttrs, WidgetSpec } from './types'
import '../styles/widgets/widgets.css'

export function makeWidgetNodeView(spec: WidgetSpec) {
  const { View, icon: Icon, fields, frameless } = spec
  const titleKey = spec.titleKey || 'title'

  function WidgetNodeView({ node, updateAttributes, selected, editor }: NodeViewProps) {
    const { isPreview } = useEditorMode()
    const [editing, setEditingState] = useState(false)
    const editable = !isPreview && editor.isEditable

    const attrs: WidgetAttrs = {}
    for (const key of Object.keys(spec.defaults)) {
      const v = node.attrs[key]
      attrs[key] = v === null || v === undefined ? '' : String(v)
    }

    const update = (patch: WidgetAttrs) => updateAttributes(patch)
    const setEditing = (v: boolean) => setEditingState(v && editable)
    const showSettings = editing && editable && !!fields?.length
    const title = attrs[titleKey]

    return (
      <NodeViewWrapper
        className={[
          'jx-widget',
          `jx-widget--${spec.name}`,
          frameless ? 'jx-widget--frameless' : '',
          selected && editable ? 'is-selected' : '',
          isPreview ? 'is-preview' : ''
        ].filter(Boolean).join(' ')}
        data-widget={spec.name}
        contentEditable={false}
      >
        {!frameless && (
          <div className="jx-widget__head">
            <span className="jx-widget__icon"><Icon size={15} /></span>
            <span className="jx-widget__title">{title || spec.label}</span>
            <span className="jx-widget__spacer" />
            {editable && (
              <span className="jx-widget__grip" data-drag-handle title="Drag to move">
                <GripVertical size={14} />
              </span>
            )}
            {editable && !!fields?.length && (
              <button
                type="button"
                className={`jx-icon-btn${showSettings ? ' is-active' : ''}`}
                title={showSettings ? 'Close settings' : 'Edit settings'}
                onClick={() => setEditing(!showSettings)}
              >
                <Settings2 size={14} />
              </button>
            )}
          </div>
        )}
        {frameless && editable && !!fields?.length && (
          <button
            type="button"
            className={`jx-icon-btn jx-widget__float-settings${showSettings ? ' is-active' : ''}`}
            title={showSettings ? 'Close settings' : 'Edit settings'}
            onClick={() => setEditing(!showSettings)}
          >
            <Settings2 size={14} />
          </button>
        )}
        {showSettings && (
          <WidgetSettings fields={fields!} attrs={attrs} update={update} onDone={() => setEditing(false)} />
        )}
        <div className="jx-widget__body">
          <View
            attrs={attrs}
            update={update}
            editable={editable}
            editing={showSettings}
            setEditing={setEditing}
            selected={selected}
            editor={editor}
          />
        </div>
      </NodeViewWrapper>
    )
  }

  WidgetNodeView.displayName = `${spec.label.replace(/\W/g, '')}Widget`
  return WidgetNodeView
}
