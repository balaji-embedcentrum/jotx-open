import { BlockDefinition } from '@jotx-labs/registry';

export const CalloutBlock: BlockDefinition = {
    type: 'callout',
    syntax: {
        primary: 'text',
        keyword: 'callout',
        hasChildren: true
    },
    schema: {
        properties: {
            variant: { type: 'enum', options: ['info', 'warning', 'success', 'danger'], default: 'info' },
            text: { type: 'string', required: false, description: 'Callout text' }
        }
    },
    ui: {
        label: 'Callout',
        icon: 'alert-circle'
    }
};
