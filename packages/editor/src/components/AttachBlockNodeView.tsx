import { NodeViewContent, NodeViewWrapper } from '@tiptap/react'
import React from 'react'
import { Paperclip } from 'lucide-react'
import { openFile } from '../bridge/bridge-utils'
import '../styles/AttachBlock.css'

export const AttachBlockNodeView = (props: any) => {
    const { node } = props
    const path = node.attrs.path

    const handleClick = (e: React.MouseEvent) => {
        // Check if user is trying to edit (clicking text) vs clicking the block?
        // If it's a content editable area, maybe we want to allow editing?
        // But typically attachments are links.
        // Let's trigger open on click (maybe double click? or modifier?).
        // User requested "Clicking the file has to open the file".

        // Prevent opening if clicking strictly inside the content editor area? 
        // Actually, Tiptap handles selection.
        // If we want to support opening, we can use meta-click (Cmd+Click) or just Click.
        // Given the user expectation "clicking... is not opening", simple click is expected.

        if (path) {
            // openFile returns a promise, we can ignore it
            openFile(path)
        }
    }

    return (
        <NodeViewWrapper
            className="jotx-attach-block"
            onClick={handleClick}
            data-path={path}
            title={path ? `Open ${path}` : undefined}
        >
            <span className="jotx-attach-icon" contentEditable={false}><Paperclip size={15} /></span>
            <div className="jotx-attach-content">
                <NodeViewContent />
            </div>
        </NodeViewWrapper>
    )
}
