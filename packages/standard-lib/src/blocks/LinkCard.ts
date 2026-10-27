import { BlockDefinition } from '@jotx-labs/registry';

export const LinkCardBlock: BlockDefinition = {
    type: 'linkcard',
    syntax: {
        keyword: 'linkcard',
        hasText: false
    },
    schema: {
        properties: {
            url: { type: 'string', required: true },
            title: { type: 'string', default: '' },
            description: { type: 'string', default: '' },
            image: { type: 'string', default: '' },
            sitename: { type: 'string', default: '' }
        }
    },
    ui: {
        label: 'Link Card',
        icon: 'link'
    }
};
