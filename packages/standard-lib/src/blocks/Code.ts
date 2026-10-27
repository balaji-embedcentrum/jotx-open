import { BlockDefinition } from '@jotx-labs/registry';

export const CodeBlock: BlockDefinition = {
    type: 'code',
    syntax: {
        keyword: 'code',
        markdownPrefix: '```',
        hasText: true
    },
    schema: {
        properties: {
            language: { type: 'string', default: 'plaintext' },
            text: { type: 'string', required: true }
        }
    },
    ui: {
        label: 'Code Block',
        icon: 'code'
    }
};
