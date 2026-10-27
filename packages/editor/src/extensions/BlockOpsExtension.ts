import { Extension } from '@tiptap/core'
import { TextSelection, NodeSelection } from 'prosemirror-state'
import type { Node as PMNode } from 'prosemirror-model'
import type { EditorState, Transaction } from 'prosemirror-state'
import { logger } from '../utils/logger'

type Dir = 'up' | 'down'

// Store for block-aware clipboard
let blockClipboard: PMNode | null = null

function findTopLevelBlockFromState(state: EditorState): { depth: number; index: number; from: number; to: number; node: any; parent: any } | null {
  const { selection, doc } = state

  // Handle NodeSelection (used for atom nodes like images, videos)
  if (selection instanceof NodeSelection) {
    const node = selection.node
    const from = selection.from
    const to = selection.to

    // Check if this is a top-level node (direct child of doc)
    const $pos = doc.resolve(from)
    if ($pos.depth === 1 || ($pos.parent && $pos.parent.type.name === 'doc')) {
      // It's a top-level node
      const index = $pos.index(0)
      return { depth: 1, index, from, to, node, parent: doc }
    }

    // Walk up to find top-level parent
    for (let d = $pos.depth; d > 0; d--) {
      const parentNode = $pos.node(d - 1)
      if (parentNode && parentNode.type?.name === 'doc') {
        const actualNode = $pos.node(d)
        const index = $pos.index(d - 1)
        const actualFrom = $pos.before(d)
        const actualTo = $pos.after(d)
        return { depth: d, index, from: actualFrom, to: actualTo, node: actualNode, parent: parentNode }
      }
    }
  }

  // Handle TextSelection (normal cursor selection)
  const { $from } = selection

  // Find a node whose parent is the doc (top-level block)
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d)
    const parent = $from.node(d - 1)
    if (parent && parent.type?.name === 'doc') {
      // CRITICAL FIX: Use $from.index(d - 1) to get the correct index
      // This gives us the index of node at depth d within its parent
      const index = $from.index(d - 1)
      const from = $from.before(d)
      const to = $from.after(d)
      return { depth: d, index, from, to, node, parent }
    }
  }
  return null
}

function moveBlockTr(state: EditorState, dir: Dir): Transaction | null {
  const info = findTopLevelBlockFromState(state)
  if (!info) return null

  const tr = state.tr
  const parent = info.parent
  const index = info.index

  // Validate bounds
  if (dir === 'up' && index <= 0) return null
  if (dir === 'down' && index >= parent.childCount - 1) return null

  const node = info.node
  const from = info.from
  const to = info.to

  if (dir === 'up') {
    // Moving up: swap with previous block
    const prevNode = parent.child(index - 1)
    const prevFrom = from - prevNode.nodeSize

    // Delete current block first
    tr.delete(from, to)
    // Insert at the position where prev block started
    tr.insert(prevFrom, node)
    // Set cursor to the moved block
    const newPos = prevFrom + 1
    tr.setSelection(TextSelection.near(tr.doc.resolve(newPos), 1))
  } else {
    // Moving down: swap with next block
    const nextNode = parent.child(index + 1)

    // Delete current block first
    tr.delete(from, to)
    // After deletion, next block shifts to 'from' position
    // Insert after the next block (which is now at 'from')
    const insertPos = from + nextNode.nodeSize
    tr.insert(insertPos, node)
    // Set cursor to the moved block
    const newPos = insertPos + 1
    tr.setSelection(TextSelection.near(tr.doc.resolve(newPos), 1))
  }

  return tr.scrollIntoView()
}

function duplicateBlockTr(state: EditorState): Transaction | null {
  const info = findTopLevelBlockFromState(state)
  if (!info) return null

  const tr = state.tr
  const node = info.node
  const insertPos = info.to

  tr.insert(insertPos, node.copy(node.content))
  tr.setSelection(TextSelection.near(tr.doc.resolve(insertPos + 1), 1))
  return tr.scrollIntoView()
}

function deleteBlockTr(state: EditorState): Transaction | null {
  const info = findTopLevelBlockFromState(state)
  if (!info) return null

  const tr = state.tr
  tr.delete(info.from, info.to)

  // Ensure doc is never empty
  if (tr.doc.childCount === 0) {
    tr.insert(0, state.schema.nodes.paragraph.createAndFill() as any)
  }

  tr.setSelection(TextSelection.near(tr.doc.resolve(Math.min(info.from, tr.doc.content.size)), 1))
  return tr.scrollIntoView()
}

function copyBlock(state: EditorState): boolean {
  const info = findTopLevelBlockFromState(state)
  if (!info) return false

  // Store the actual ProseMirror node for block-aware paste
  blockClipboard = info.node.copy(info.node.content)

  // Also copy as plain text to system clipboard as fallback
  let text = ''
  info.node.descendants((child: any) => {
    if (child.isText) {
      text += child.text
    } else if (child.isBlock && text.length > 0) {
      text += '\n'
    }
  })

  navigator.clipboard.writeText(text.trim()).catch(err => {
    logger.error('Failed to copy to clipboard:', err)
  })

  logger.log('✅ Block copied (type:', info.node.type.name, ')')
  return true
}

function pasteBlockTr(state: EditorState): Transaction | null {
  if (!blockClipboard) return null

  const info = findTopLevelBlockFromState(state)
  if (!info) return null

  const tr = state.tr

  // Insert the copied block after the current block
  const insertPos = info.to
  tr.insert(insertPos, blockClipboard.copy(blockClipboard.content))
  tr.setSelection(TextSelection.near(tr.doc.resolve(insertPos + 1), 1))

  logger.log('✅ Block pasted (type:', blockClipboard.type.name, ')')
  return tr.scrollIntoView()
}

function hasBlockInClipboard(): boolean {
  return blockClipboard !== null
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    jotxBlockOps: {
      jotxMoveBlockUp: () => ReturnType
      jotxMoveBlockDown: () => ReturnType
      jotxDuplicateBlock: () => ReturnType
      jotxDeleteBlock: () => ReturnType
      jotxCopyBlock: () => ReturnType
      jotxPasteBlock: () => ReturnType
    }
  }
}

// Export the helper to check clipboard state
export { hasBlockInClipboard }

export const BlockOpsExtension = Extension.create({
  name: 'jotxBlockOps',

  addCommands() {
    return {
      jotxMoveBlockUp: () => ({ state, dispatch }) => {
        const tr = moveBlockTr(state, 'up')
        if (!tr) return false
        dispatch?.(tr)
        return true
      },
      jotxMoveBlockDown: () => ({ state, dispatch }) => {
        const tr = moveBlockTr(state, 'down')
        if (!tr) return false
        dispatch?.(tr)
        return true
      },
      jotxDuplicateBlock: () => ({ state, dispatch }) => {
        const tr = duplicateBlockTr(state)
        if (!tr) return false
        dispatch?.(tr)
        return true
      },
      jotxDeleteBlock: () => ({ state, dispatch }) => {
        const tr = deleteBlockTr(state)
        if (!tr) return false
        dispatch?.(tr)
        return true
      },
      jotxCopyBlock: () => ({ state }) => {
        return copyBlock(state)
      },
      jotxPasteBlock: () => ({ state, dispatch }) => {
        const tr = pasteBlockTr(state)
        if (!tr) return false
        dispatch?.(tr)
        return true
      }
    }
  },

  addKeyboardShortcuts() {
    return {
      // Move the current top-level block
      'Mod-Shift-ArrowUp': () => {
        const tr = moveBlockTr(this.editor.state, 'up')
        if (!tr) return false
        this.editor.view.dispatch(tr)
        return true
      },
      'Mod-Shift-ArrowDown': () => {
        const tr = moveBlockTr(this.editor.state, 'down')
        if (!tr) return false
        this.editor.view.dispatch(tr)
        return true
      },

      // Duplicate current top-level block
      'Mod-Shift-D': () => {
        const tr = duplicateBlockTr(this.editor.state)
        if (!tr) return false
        this.editor.view.dispatch(tr)
        return true
      },

      // Delete current top-level block
      'Mod-Shift-X': () => {
        const tr = deleteBlockTr(this.editor.state)
        if (!tr) return false
        this.editor.view.dispatch(tr)
        return true
      },

      // Copy block (preserves block type)
      'Mod-Shift-C': () => copyBlock(this.editor.state),

      // Paste block (preserves block type)
      'Mod-Shift-V': () => {
        const tr = pasteBlockTr(this.editor.state)
        if (!tr) return false
        this.editor.view.dispatch(tr)
        return true
      }
    }
  }
})


