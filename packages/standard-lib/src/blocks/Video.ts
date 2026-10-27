import { BlockDefinition } from '@jotx-labs/registry';

export const VideoBlock: BlockDefinition = {
    type: 'video',
    syntax: {
        keyword: 'video',
        hasText: false
    },
    schema: {
        properties: {
            type: { type: 'enum', options: ['youtube', 'local'], default: 'youtube' },
            src: { type: 'string', required: true },
            title: { type: 'string', default: '' },
            width: { type: 'number', default: 800 },
            height: { type: 'number', default: 450 },
            controls: { type: 'boolean', default: true },
            autoplay: { type: 'boolean', default: false },
            muted: { type: 'boolean', default: false },
            loop: { type: 'boolean', default: false }
        }
    },
    ui: {
        label: 'Video',
        icon: 'video'
    }
};
