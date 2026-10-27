/**
 * Expands compact-syntax shorthands into the classic block tree, so everything
 * after the parser (adapters, editor, validator) sees one shape regardless of
 * which syntax a file was written in.
 *
 *   def list           items """a\nb"""            -> listitem children
 *   def checklist      items """[x] a\n[ ] b"""    -> taskitem children
 *   def table          rows """a | b\nc | d"""     -> row / cell / paragraph children
 *   def chart          data """Label | S\nW1 | 1""" -> json property
 *   def properties     (legacy block)              -> Key | Value table
 */

import { BlockNode } from '../../types/ast';
import { generateBlockId } from '../../utils/idGenerator';

/** Split a table row on unescaped pipes; "\|" is a literal pipe. */
export function splitRow(line: string): string[] {
    const cells: string[] = [];
    let cur = '';
    for (let i = 0; i < line.length; i++) {
        if (line[i] === '\\' && line[i + 1] === '|') { cur += '|'; i++; continue; }
        if (line[i] === '|') { cells.push(cur.trim()); cur = ''; continue; }
        cur += line[i];
    }
    cells.push(cur.trim());
    return cells;
}

const lines = (text: unknown) => String(text ?? '').split('\n').map(l => l.trim()).filter(Boolean);

const block = (type: string, properties: Record<string, any> = {}, children: BlockNode[] = []): BlockNode =>
    ({ id: generateBlockId(), type: type as any, properties, children });

function tableChildren(rows: string[][]): BlockNode[] {
    // An empty cell is written as nothing between the pipes and read back as an empty cell
    return rows.map(cells => block('row', {}, cells.map(text => block('cell', {}, text === '' ? [] : [block('paragraph', { text })]))));
}

function normalizeBlock(b: BlockNode): void {
    const p = b.properties;

    if ((b.type === 'list' || b.type === 'checklist') && p.items !== undefined && !(b.children || []).length) {
        b.children = lines(p.items).map(line => {
            if (b.type === 'checklist') {
                const m = line.match(/^\[( |x|X)\]\s*(.*)$/);
                return block('taskitem', { checked: !!m && m[1].toLowerCase() === 'x', text: m ? m[2] : line });
            }
            return block('listitem', { text: line });
        });
        delete p.items;
    }

    if (b.type === 'table' && p.rows !== undefined && !(b.children || []).length) {
        b.children = tableChildren(lines(p.rows).map(splitRow));
        delete p.rows;
    }

    if (b.type === 'chart' && p.data !== undefined && p.json === undefined) {
        const rows = lines(p.data).map(splitRow);
        const numeric = (s: string) => s !== '' && !isNaN(Number(s));
        const header = rows.length && !rows[0].slice(1).every(numeric) ? rows.shift()! : null;
        const width = Math.max(0, ...rows.map(r => r.length)) - 1;
        const series = Array.from({ length: width }, (_, i) => ({
            label: header?.[i + 1] || (width === 1 ? String(p.title || 'Series') : `Series ${i + 1}`),
            data: rows.map(r => Number(r[i + 1] ?? 0))
        }));
        p.json = JSON.stringify({ labels: rows.map(r => r[0]), datasets: series });
        delete p.data;
    }

    // properties was retired in 3.1: keep the data, as a plain Key | Value table
    if (b.type === ('properties' as any)) {
        const rows = (b.children || []).map(c => [String(c.properties.key ?? ''), String(c.properties.value ?? '')]);
        b.type = 'table' as any;
        b.properties = { ...(p.title ? { title: p.title } : {}), columns: 'Key, Value' };
        b.children = tableChildren(rows);
    }

    for (const c of b.children || []) normalizeBlock(c);
}

export function normalizeBlocks(blocks: BlockNode[]): BlockNode[] {
    for (const b of blocks) normalizeBlock(b);
    return blocks;
}
