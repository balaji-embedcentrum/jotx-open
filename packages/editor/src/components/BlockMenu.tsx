/**
 * BlockMenu - Shows block-level operations on hover
 */

import React, { useState, useEffect, useRef } from 'react'
import { Editor } from '@tiptap/react'
import { TextSelection, NodeSelection } from 'prosemirror-state'
import { hasBlockInClipboard } from '../extensions/BlockOpsExtension'
import '../styles/BlockMenu.css'
import { logger } from '../utils/logger'
import { useEditorMode } from '../contexts/EditorModeContext'
import { useEditorDom } from '../utils/editorDom'

interface BlockMenuProps {
  editor: Editor | null
}

export function BlockMenu({ editor }: BlockMenuProps) {
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [showMenu, setShowMenu] = useState(false)
  const [hasClipboard, setHasClipboard] = useState(false)
  const [currentBlockType, setCurrentBlockType] = useState<string | null>(null)
  const { isPreview } = useEditorMode()
  const menuRef = useRef<HTMLDivElement>(null)

  // Editable block types that show "Edit" in menu
  const EDITABLE_BLOCKS = ['button', 'buttonstrip', 'chart', 'mermaid', 'math', 'image', 'imageBlock', 'video', 'videoBlock', 'datetime', 'card', 'jotxlink', 'codeReference']

  // Store the block position for when we need to select it
  const blockPosRef = useRef<{ from: number; to: number } | null>(null)
  const showMenuRef = useRef(false)
  const editorElement = useEditorDom(editor)

  useEffect(() => {
    showMenuRef.current = showMenu
  }, [showMenu])

  useEffect(() => {
    if (!editor || !editorElement) return

    let currentHoverElement: HTMLElement | null = null
    let hideTimeout: NodeJS.Timeout | null = null
    let isHandleHovered = false
    let isMenuHovered = false

    const clearHideTimeout = () => {
      if (hideTimeout) {
        clearTimeout(hideTimeout)
        hideTimeout = null
      }
    }

    const scheduleHide = () => {
      clearHideTimeout()
      // Much longer delay - 800ms gives plenty of time to reach the handle
      hideTimeout = setTimeout(() => {
        // Only hide if not hovering over handle or menu
        if (!isHandleHovered && !isMenuHovered) {
          // If menu is open, DO NOT hide/clear state (user is interacting).
          if (!showMenuRef.current) {
            setVisible(false)
            currentHoverElement = null
            // Keep last known blockPosRef to avoid races between hover/click.
          }
        }
      }, 800)
    }

    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement

      // Check if hovering over the handle or menu
      if (target.closest('.block-menu-handle') || target.closest('.block-menu-popup')) {
        clearHideTimeout()
        return
      }

      // Find the closest block-level element
      // For NodeView blocks (images, videos), we need to find the ProseMirror node wrapper
      let blockElement = target.closest('[data-node-view-wrapper]') as HTMLElement
      if (!blockElement) {
        blockElement = target.closest('.ProseMirror > *') as HTMLElement
      }

      if (blockElement && blockElement !== currentHoverElement) {
        clearHideTimeout()

        currentHoverElement = blockElement
        const rect = blockElement.getBoundingClientRect()
        const wrapperElement = editorElement.closest('.jotx-editor-wrapper')
        const wrapperRect = wrapperElement?.getBoundingClientRect()

        if (wrapperRect) {
          setPosition({
            x: rect.left - wrapperRect.left - 50, // 50px to the left of block (more space)
            y: rect.top - wrapperRect.top - 4 // Slight vertical adjustment
          })
          setVisible(true)

          // CRITICAL: Get the ProseMirror position of this DOM element
          try {
            const pos = editor.view.posAtDOM(blockElement, 0)
            logger.log('🔍 posAtDOM result:', pos, 'for element:', blockElement.className)

            if (pos !== null && pos !== undefined && pos >= 0) {
              const { doc } = editor.state
              const $pos = doc.resolve(pos)

              logger.log('🔍 Position depth:', $pos.depth, 'parent:', $pos.parent?.type.name)

              // Strategy: Find the top-level block node
              let blockFrom: number | null = null
              let blockTo: number | null = null
              let blockNode: any = null

              if ($pos.depth === 0) {
                // We're at document level - find the node at or after this position
                const nodeAfter = doc.nodeAt(pos)
                if (nodeAfter) {
                  blockFrom = pos
                  blockTo = pos + nodeAfter.nodeSize
                  blockNode = nodeAfter
                  logger.log('📍 Found node at pos (depth 0):', blockNode.type.name)
                } else {
                  // Try position before
                  const nodeBefore = doc.nodeAt(pos - 1)
                  if (nodeBefore) {
                    blockFrom = pos - 1
                    blockTo = blockFrom + nodeBefore.nodeSize
                    blockNode = nodeBefore
                    logger.log('📍 Found node before pos (depth 0):', blockNode.type.name)
                  }
                }
              } else {
                // Walk up to find the top-level block (direct child of doc)
                let depth = $pos.depth
                while (depth > 0 && $pos.node(depth - 1).type.name !== 'doc') {
                  depth--
                }
                if (depth > 0) {
                  blockFrom = $pos.before(depth)
                  blockTo = $pos.after(depth)
                  blockNode = $pos.node(depth)
                  logger.log('📍 Found node at depth', depth, ':', blockNode.type.name)
                }
              }

              if (blockFrom !== null && blockTo !== null && blockNode) {
                blockPosRef.current = { from: blockFrom, to: blockTo }
                setCurrentBlockType(blockNode.type.name)
                logger.log('✅ Block position stored:', { from: blockFrom, to: blockTo, nodeType: blockNode.type.name })
              } else {
                logger.error('❌ Could not determine block boundaries, depth:', $pos.depth)
              }
            } else {
              logger.error('❌ posAtDOM returned invalid position:', pos)
            }
          } catch (err) {
            logger.error('❌ Error getting position:', err)
          }
        }
      } else if (!blockElement) {
        // Delay hiding to allow mouse to move to handle
        scheduleHide()
      }
    }

    const handleMouseLeave = () => {
      scheduleHide()
    }

    // Handle hover tracking
    const handleHandleMouseEnter = () => {
      isHandleHovered = true
      clearHideTimeout()
    }

    const handleHandleMouseLeave = () => {
      isHandleHovered = false
      scheduleHide()
    }

    editorElement.addEventListener('mousemove', handleMouseMove)
    editorElement.addEventListener('mouseleave', handleMouseLeave)

    // Track handle hover with delegation
    const wrapperElement = editorElement.closest('.jotx-editor-wrapper')
    if (wrapperElement) {
      wrapperElement.addEventListener('mouseenter', (e) => {
        const target = e.target as HTMLElement
        if (target.closest('.block-menu-handle')) {
          handleHandleMouseEnter()
        }
        if (target.closest('.block-menu-popup')) {
          isMenuHovered = true
          clearHideTimeout()
        }
      }, true)

      wrapperElement.addEventListener('mouseleave', (e) => {
        const target = e.target as HTMLElement
        if (target.closest('.block-menu-handle')) {
          handleHandleMouseLeave()
        }
        if (target.closest('.block-menu-popup')) {
          isMenuHovered = false
          scheduleHide()
        }
      }, true)
    }

    return () => {
      clearHideTimeout()
      editorElement.removeEventListener('mousemove', handleMouseMove)
      editorElement.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [editor, editorElement])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  // No block operations while the note is locked in preview mode
  if (!editor || isPreview) return null
  const isActive = visible || showMenu

  // Select the block that the handle is positioned next to
  const selectHoveredBlock = (): boolean => {
    const blockPos = blockPosRef.current
    if (!blockPos) {
      logger.error('❌ No block position stored!')
      return false
    }

    try {
      const { from } = blockPos
      const { state, view } = editor
      const { doc } = state
      const tr = state.tr

      // Get the node at this position
      const $pos = doc.resolve(from)
      const node = doc.nodeAt(from)

      if (node) {
        logger.log('🎯 Selecting block:', node.type.name, 'at pos:', from)

        // For atom nodes (image, video, etc.), use NodeSelection
        // For other nodes, use TextSelection inside the node
        if (node.isAtom || node.type.spec.atom) {
          const sel = NodeSelection.create(doc, from)
          view.dispatch(tr.setSelection(sel))
        } else {
          // Try to put cursor inside the block
          const sel = TextSelection.near(doc.resolve(from + 1), 1)
          view.dispatch(tr.setSelection(sel))
        }
        return true
      }

      logger.error('❌ No node found at position:', from)
      return false
    } catch (err) {
      logger.error('❌ Error selecting block:', err)
      return false
    }
  }

  const handleAction = (action: string) => {
    logger.log('🎯 BlockMenu action:', action, 'blockPos:', blockPosRef.current)
    if (!editor) {
      logger.error('❌ No editor instance!')
      return
    }

    // Selection already happened on handle click - don't select again!
    // Just execute the command on the current selection

    let result = false
    let needsRefresh = false  // Whether to hide handle after action

    switch (action) {
      case 'edit': {
        // Dispatch custom event to notify NodeView to enter edit mode
        const blockPos = blockPosRef.current
        if (blockPos) {
          const node = editor.state.doc.nodeAt(blockPos.from)
          if (node) {
            logger.log('✏️ Edit action for block type:', node.type.name)
            // Dispatch event with block info - NodeViews will listen for this
            window.dispatchEvent(new CustomEvent('jotx-edit-block', {
              detail: {
                blockId: node.attrs?.blockId,
                blockType: node.type.name,
                pos: blockPos.from
              }
            }))
            result = true
          }
        }
        break
      }
      case 'insertBelow': {
        const blockPos = blockPosRef.current
        if (blockPos) {
          const { to } = blockPos
          // Insert paragraph after current block and focus it
          editor.chain()
            .focus()
            .insertContentAt(to, { type: 'paragraph' })
            .setTextSelection(to + 1)
            .run()
          result = true
          logger.log('➕ Insert below result:', result)
          needsRefresh = true
        }
        break
      }
      case 'copy':
        result = editor.chain().jotxCopyBlock().run()
        logger.log('📋 Copy result:', result)
        // Update clipboard state
        setHasClipboard(true)
        break
      case 'paste':
        result = editor.chain().jotxPasteBlock().run()
        logger.log('📄 Paste result:', result)
        needsRefresh = true  // Position changes after paste
        break
      case 'duplicate':
        result = editor.chain().jotxDuplicateBlock().run()
        logger.log('📑 Duplicate result:', result)
        needsRefresh = true  // Position changes after duplicate
        break
      case 'delete':
        result = editor.chain().jotxDeleteBlock().run()
        logger.log('🗑️ Delete result:', result)
        needsRefresh = true  // Block is gone
        break
      case 'moveUp':
        result = editor.chain().jotxMoveBlockUp().run()
        logger.log('↑ Move up result:', result)
        needsRefresh = true  // Position changes after move
        break
      case 'moveDown':
        result = editor.chain().jotxMoveBlockDown().run()
        logger.log('↓ Move down result:', result)
        needsRefresh = true  // Position changes after move
        break
    }

    if (!result) {
      logger.error('❌ Action failed:', action)
    }

    // Close menu
    setShowMenu(false)

    // For operations that change block positions, hide the handle and clear ref
    // This forces user to re-hover to get the updated position
    if (needsRefresh) {
      logger.log('🔄 Hiding handle after position-changing operation')
      setVisible(false)
      blockPosRef.current = null
    }
  }

  // Check clipboard status when menu opens
  const handleMenuOpen = () => {
    logger.log('🎯 BlockMenu OPENED, hasClipboard:', hasBlockInClipboard())
    setHasClipboard(hasBlockInClipboard())
    setShowMenu(v => !v)
  }

  return (
    <>
      {/* Block handle (6 dots) */}
      <div
        className="block-menu-handle"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          display: isActive ? 'flex' : 'none'
        }}
        onClick={(e) => {
          logger.log('🎯 6-DOT HANDLE CLICKED!', 'blockPos before select:', blockPosRef.current)
          e.stopPropagation()
          e.preventDefault()
          // Selecting on handle click makes the popup actions reliable even if hover state changes.
          const selected = selectHoveredBlock()
          logger.log('🎯 Selection result:', selected, 'editor selection:', editor?.state.selection.toJSON())
          handleMenuOpen()
        }}
        onMouseEnter={() => {
          // Keep visible when hovering handle
          setVisible(true)
        }}
        title="Click for block actions"
      >
        <svg width="20" height="20" viewBox="0 0 20 20">
          <circle cx="5" cy="5" r="2" fill="currentColor" />
          <circle cx="5" cy="10" r="2" fill="currentColor" />
          <circle cx="5" cy="15" r="2" fill="currentColor" />
          <circle cx="11" cy="5" r="2" fill="currentColor" />
          <circle cx="11" cy="10" r="2" fill="currentColor" />
          <circle cx="11" cy="15" r="2" fill="currentColor" />
        </svg>
      </div>

      {/* Block menu popup */}
      {showMenu && (
        <div
          ref={menuRef}
          className="block-menu-popup"
          style={{
            left: `${position.x + 45}px`, // Position next to larger handle
            top: `${position.y}px`
          }}
          onMouseEnter={() => {
            // Keep visible when hovering menu
            setVisible(true)
          }}
        >
          {/* Edit button - only for editable blocks */}
          {currentBlockType && EDITABLE_BLOCKS.includes(currentBlockType) && (
            <>
              <button type="button" onClick={() => handleAction('edit')} className="block-menu-item">
                <span className="block-menu-icon">✏️</span>
                <span>Edit</span>
                <span className="block-menu-shortcut"></span>
              </button>
              <div className="block-menu-divider" />
            </>
          )}
          <button type="button" onClick={() => handleAction('insertBelow')} className="block-menu-item">
            <span className="block-menu-icon">➕</span>
            <span>Insert below</span>
            <span className="block-menu-shortcut"></span>
          </button>
          <div className="block-menu-divider" />
          <button type="button" onClick={() => handleAction('copy')} className="block-menu-item">
            <span className="block-menu-icon">📋</span>
            <span>Copy</span>
            <span className="block-menu-shortcut">⌘⇧C</span>
          </button>
          <button
            type="button"
            onClick={() => handleAction('paste')}
            className="block-menu-item"
            disabled={!hasClipboard}
            style={{ opacity: hasClipboard ? 1 : 0.5, cursor: hasClipboard ? 'pointer' : 'not-allowed' }}
          >
            <span className="block-menu-icon">📄</span>
            <span>Paste</span>
            <span className="block-menu-shortcut">⌘⇧V</span>
          </button>
          <button type="button" onClick={() => handleAction('duplicate')} className="block-menu-item">
            <span className="block-menu-icon">📑</span>
            <span>Duplicate</span>
            <span className="block-menu-shortcut">⌘⇧D</span>
          </button>
          <div className="block-menu-divider" />
          <button type="button" onClick={() => handleAction('moveUp')} className="block-menu-item">
            <span className="block-menu-icon">↑</span>
            <span>Move up</span>
            <span className="block-menu-shortcut">⌘⇧↑</span>
          </button>
          <button type="button" onClick={() => handleAction('moveDown')} className="block-menu-item">
            <span className="block-menu-icon">↓</span>
            <span>Move down</span>
            <span className="block-menu-shortcut">⌘⇧↓</span>
          </button>
          <div className="block-menu-divider" />
          <button type="button" onClick={() => handleAction('delete')} className="block-menu-item danger">
            <span className="block-menu-icon">🗑️</span>
            <span>Delete</span>
            <span className="block-menu-shortcut">⌘⇧X</span>
          </button>
        </div>
      )}
    </>
  )
}

