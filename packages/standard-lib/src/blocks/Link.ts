import { BlockDefinition } from '@jotx-labs/registry';

export const LinkBlock: BlockDefinition = {
    type: 'link',
    syntax: {
        keyword: 'link',
        hasText: true
    },
    schema: {
        properties: {
            url: { type: 'string', required: true },
            text: { type: 'string', required: true }
        }
    },
    ui: {
        label: 'Link',
        icon: 'link'
    }
};
