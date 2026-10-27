import { BlockDefinition } from '@jotx-labs/registry';

export const QuoteBlock: BlockDefinition = {
    type: 'quote',
    syntax: {
        primary: 'text',
        keyword: 'quote',
        markdownPrefix: '>',
        hasText: true
    },
    schema: {
        properties: {
            text: { type: 'string', required: true }
        }
    },
    ui: {
        label: 'Quote',
        icon: 'quote'
    }
};
