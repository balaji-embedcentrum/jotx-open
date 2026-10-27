import { BlockDefinition } from '@jotx-labs/registry';

/**
 * JotxLink Block - Reference to another block or document
 * Syntax: def jotxlink abc123
 *           ref TYPE ID
 * 
 * Examples:
 *   ref mermaid xyz789    - Reference to mermaid block
 *   ref def abc123        - Reference to def block
 *   ref jotx doc_id       - Reference to document (hdef)
 */
export const JotxLinkBlock: BlockDefinition = {
    type: 'jotxlink',
    syntax: {
        keyword: 'jotxlink',
        hasText: false
    },
    schema: {
        properties: {
            reftype: { type: 'identifier', required: true, description: 'Type of referenced block (def, mermaid, code, jotx, etc.)' },
            refid: { type: 'identifier', required: true, description: 'ShortUUID of referenced block or document' }
        }
    },
    ui: {
        label: 'Reference Link',
        icon: 'link-2', // Lucide icon
        description: 'Link to another block or document'
    }
};
