import { BlockDefinition } from '@jotx-labs/registry';

export const SectionBlock: BlockDefinition = {
    type: 'section',
    syntax: {
        primary: 'title',
        keyword: 'section',
        hasChildren: true
    },
    schema: {
        properties: {
            title: { type: 'string', required: true },
            collapsed: { type: 'boolean', default: false }
        }
    },
    ui: {
        label: 'Section',
        icon: 'folder'
    }
};
