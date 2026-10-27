/**
 * Document Header - Always visible, even for empty files
 * Supports custom logo, title editing, export, share, print
 */

import React, { useState, useRef, useEffect } from 'react'
import {
  FileText, Users, CheckSquare, ChevronDown, ChevronUp,
  Book, FileCode, FileSpreadsheet, Lightbulb, ClipboardList,
  PenTool, LayoutDashboard, Flag, GitBranch, Network, HelpCircle,
  Lock, Unlock
} from 'lucide-react'
import { JotxLogo } from '../Brand/JotxLogo'
import { useEditorMode } from '../../contexts/EditorModeContext'
import { ViewOptions } from './ViewOptions'
import { ExportMenu } from './ExportMenu'
import '../../styles/DocumentHeader.css'

export interface DocumentHeaderProps {
  documentId: string
  documentUri?: string
  documentType: 'page' | 'meeting' | 'tasklist'
  contentType?: string // e.g. 'article', 'spec', 'report'
  title?: string
  icon?: string
  logoUrl?: string
  onTitleChange?: (title: string) => void
  onIconChange?: (icon: string) => void
  onContentTypeChange?: (type: string) => void
  onOpenGraph?: () => void  // Open graph view
  onCopyHelpFiles?: () => void  // Copy help files to workspace
  // Ribbon toolbar props
  ribbonExpanded?: boolean
  onToggleRibbon?: () => void
}

const CREATIVE_TYPES = [
  { value: 'root', label: 'Root (Index)', icon: LayoutDashboard, group: 'General' },
  { value: 'page', label: 'Page', icon: FileText, group: 'General' },
  { value: 'article', label: 'Article', icon: FileText, group: 'General' },
  { value: 'documentation', label: 'Documentation', icon: Book, group: 'General' },
  { value: 'report', label: 'Report', icon: FileSpreadsheet, group: 'General' },
  { value: 'spec', label: 'Specification', icon: FileCode, group: 'Planning' },
  { value: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Planning' },
  { value: 'roadmap', label: 'Roadmap', icon: Flag, group: 'Planning' },
  { value: 'brainstorm', label: 'Brainstorm', icon: Lightbulb, group: 'Creative' },
  { value: 'journal', label: 'Journal', icon: PenTool, group: 'Creative' },
  { value: 'meeting', label: 'Meeting', icon: Users, group: 'Functional' },
  { value: 'tasklist', label: 'Task List', icon: CheckSquare, group: 'Functional' },
  { value: 'process', label: 'Process', icon: GitBranch, group: 'Process' },
]

export function DocumentHeader({
  documentId,
  documentUri,
  documentType,
  contentType,
  title = 'Untitled',
  onTitleChange,
  onContentTypeChange,
  onOpenGraph,
  onCopyHelpFiles,
  ribbonExpanded = false,
  onToggleRibbon
}: DocumentHeaderProps) {

  const { isPreview, toggleMode } = useEditorMode()

  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState(title)
  const [isTypeMenuOpen, setIsTypeMenuOpen] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setEditedTitle(title)
  }, [title])

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [isEditingTitle])

  // Click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsTypeMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleTitleBlur = () => {
    setIsEditingTitle(false)
    if (editedTitle.trim() && editedTitle !== title) {
      onTitleChange?.(editedTitle.trim())
    } else {
      setEditedTitle(title)
    }
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleBlur()
    } else if (e.key === 'Escape') {
      setEditedTitle(title)
      setIsEditingTitle(false)
    }
  }

  // Resolve current active type information
  // If contentType (metadata) is set, use it. Otherwise fallback to documentType.
  const currentTypeValue = contentType || documentType
  const currentTypeDef = CREATIVE_TYPES.find(t => t.value === currentTypeValue) ||
    CREATIVE_TYPES.find(t => t.value === 'page')!

  const Icon = currentTypeDef.icon

  return (
    <header className="jotx-header">
      <div className="jotx-header-left">
        {/* jotx Brand Label */}
        <div className="jotx-header-logo">
          <span className="jotx-header-logo-text">jotx</span>
        </div>

        {/* Document Type Selector (Interactive) */}
        <div className="jotx-header-type-container" ref={menuRef}>
          <button
            className="jotx-header-type-button"
            onClick={() => setIsTypeMenuOpen(!isTypeMenuOpen)}
            title="Change Document Type"
          >
            <Icon size={16} className="jotx-header-type-icon" />
            <span className="jotx-header-type-label">{currentTypeDef.label}</span>
            <ChevronDown size={12} className="jotx-header-type-chevron" />
          </button>

          {isTypeMenuOpen && (
            <div className="jotx-header-type-menu">
              <div className="jotx-type-menu-header">Change Type</div>
              <div className="jotx-type-menu-list">
                {CREATIVE_TYPES.map((type) => (
                  <button
                    key={type.value}
                    className={`jotx-type-menu-item ${currentTypeValue === type.value ? 'active' : ''}`}
                    onClick={() => {
                      onContentTypeChange?.(type.value)
                      setIsTypeMenuOpen(false)
                    }}
                  >
                    <type.icon size={16} />
                    <span>{type.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Title */}
        <div className="jotx-header-title-container">
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              className="jotx-header-title-input"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              placeholder="Untitled"
            />
          ) : (
            <h1
              className="jotx-header-title"
              onClick={() => setIsEditingTitle(true)}
              title="Click to edit title"
            >
              {title}
            </h1>
          )}
        </div>
      </div>

      <div className="jotx-header-right">
        {/* Export Menu */}
        <ExportMenu documentId={documentId} documentTitle={title} />
        {/* Graph View Button */}
        {onOpenGraph && (
          <button
            className="jotx-header-graph-btn"
            onClick={onOpenGraph}
            title="Open Knowledge Graph"
          >
            <Network size={18} />
          </button>
        )}
        {/* Help Button */}
        {onCopyHelpFiles && (
          <button
            className="jotx-header-help-btn"
            onClick={onCopyHelpFiles}
            title="Copy Help Files to Workspace"
          >
            <HelpCircle size={18} />
          </button>
        )}
        {/* Preview / Edit Lock Toggle */}
        <button
          className={`jotx-header-button jotx-header-lock-btn${isPreview ? ' active' : ''}`}
          onClick={toggleMode}
          title={isPreview ? 'Unlock: switch to edit mode' : 'Lock: switch to preview mode'}
        >
          {isPreview ? <Lock size={16} /> : <Unlock size={16} />}
        </button>

        {/* View Options */}
        <ViewOptions />

        {/* Ribbon Toggle - last icon */}
        {onToggleRibbon && (
          <button
            className={`jotx-header-button ${ribbonExpanded ? 'active' : ''}`}
            title={ribbonExpanded ? 'Hide toolbar ribbon' : 'Show toolbar ribbon'}
            onClick={onToggleRibbon}
          >
            {ribbonExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>
    </header>
  )
}

