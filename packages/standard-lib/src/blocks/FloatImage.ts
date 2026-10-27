import { BlockDefinition } from '@jotx-labs/registry';

export const FloatImageBlock: BlockDefinition = {
    type: 'floatimage',
    syntax: {
        keyword: 'floatimage',
        hasChildren: true
    },
    schema: {
        properties: {
            src: { type: 'string', required: true },
            alt: { type: 'string', default: '' },
            width: { type: 'number', default: 300 },
            height: { type: 'string', default: 'auto' },
            float: { type: 'enum', options: ['left', 'right'], default: 'left' },
            caption: { type: 'string', default: '' }
        }
    },
    ui: {
        label: 'Float Image',
        icon: 'image'
    }
};
