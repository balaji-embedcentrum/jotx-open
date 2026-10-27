import { BlockDefinition } from '@jotx-labs/registry';

export const ImageBlock: BlockDefinition = {
    type: 'image',
    syntax: {
        keyword: 'image',
        hasText: false
    },
    schema: {
        properties: {
            src: { type: 'string', required: true },
            alt: { type: 'string', default: '' },
            width: { type: 'number', default: 800 },
            height: { type: 'string', default: 'auto' },
            align: { type: 'enum', options: ['left', 'center', 'right'], default: 'center' },
            caption: { type: 'string', default: '' }
        }
    },
    ui: {
        label: 'Image',
        icon: 'image'
    }
};
