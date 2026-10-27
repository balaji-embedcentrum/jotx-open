import { BlockDefinition } from '@jotx-labs/registry';

export const ChartBlock: BlockDefinition = {
    type: 'chart',
    syntax: {
        primary: 'title',
        hasChildren: false,
        hasText: true // for JSON content in 'text' prop if simple, else explicit 'json' prop
    },
    schema: {
        properties: {
            title: { type: 'string', required: false, description: 'Chart title' },
            charttype: {  // V3 Strict: flatcase
                type: 'enum',
                required: false,
                default: 'bar',
                options: ['bar', 'line', 'pie', 'doughnut', 'radar', 'polar']
            },
            showsource: {  // V3 Strict: flatcase
                type: 'boolean',
                default: false
            },
            data: {
                type: 'string',
                required: false,
                description: 'Compact form: a header line "Label | Series" then one row per line, e.g. "W1 | 120"'
            },
            json: {
                type: 'string',
                required: false,
                description: 'Chart.js JSON data'
            }
        }
    },
    ui: {
        label: 'Chart',
        icon: 'bar-chart'
    }
}
