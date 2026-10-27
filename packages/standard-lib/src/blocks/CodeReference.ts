import { BlockDefinition } from '@jotx-labs/registry';

export const CodeReferenceBlock: BlockDefinition = {
    type: 'codereference',
    syntax: {
        keyword: 'codereference',
        hasText: false
    },
    schema: {
        properties: {
            path: { type: 'string', required: true },
            lines: { type: 'string', default: '' },
            language: { type: 'string', default: 'typescript' }
        }
    },
    ui: {
        label: 'Code Reference',
        icon: 'code'
    }
};
