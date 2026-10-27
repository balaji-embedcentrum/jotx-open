import { BlockDefinition } from '@jotx-labs/registry';

export const ParagraphBlock: BlockDefinition = {
    type: 'paragraph',
    syntax: {
        primary: 'text',
        hasText: true,
        hasChildren: false,
        // Paragraph is the default "fallback" block, so usually no keyword is strictly required if handled by parser fallback
        // But we define it for completeness
    },
    schema: {
        properties: {
            // Not required: an empty paragraph is a blank line, and compact syntax omits empty values
            text: { type: 'string' }
        }
    },
    ui: {
        label: 'Paragraph',
        icon: 'pilcrow',
        // Paragraphs are usually handled natively by the editor, 
        // but we can provide a component if we want special rendering.
        // component: () => import('./components/Paragraph').then(m => m.Paragraph) 
    }
};
