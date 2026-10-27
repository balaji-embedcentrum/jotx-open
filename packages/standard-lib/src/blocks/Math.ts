import { BlockDefinition } from '@jotx-labs/registry';

export const MathBlock: BlockDefinition = {
    type: 'math',
    syntax: {
        primary: 'title',
        keyword: 'math',
        hasText: true
    },
    schema: {
        properties: {
            title: { type: 'string', required: false, description: 'Equation title' },
            src: { type: 'string', required: true },
            display: { type: 'enum', options: ['block', 'inline'], default: 'block' },
            showsource: { type: 'boolean', default: false }
        }
    },
    ui: {
        label: 'Math',
        icon: 'function'
    }
};
