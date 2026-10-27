import { BlockDefinition } from '@jotx-labs/registry';

export const ToggleBlock: BlockDefinition = {
    type: 'toggle',
    syntax: {
        primary: 'title',
        keyword: 'toggle',
        hasChildren: true
    },
    schema: {
        properties: {
            title: { type: 'string', required: true },
            collapsed: { type: 'boolean', default: true }
        }
    },
    ui: {
        label: 'Toggle',
        icon: 'chevron-down'
    }
};
