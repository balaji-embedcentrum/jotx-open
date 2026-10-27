/**
 * Tests for ID Generator
 */

import { generateBlockId, generateBlockIds, isValidBlockId, isShortUUID, isLegacySequentialId } from '../utils/idGenerator';

describe('ID Generator', () => {
    describe('generateBlockId', () => {
        test('generates 8-character alphanumeric IDs', () => {
            const id = generateBlockId();
            expect(id).toMatch(/^[0-9a-z]{8}$/);
            expect(id.length).toBe(8);
        });

        test('generates unique IDs', () => {
            const ids = new Set<string>();
            for (let i = 0; i < 1000; i++) {
                ids.add(generateBlockId());
            }
            // All IDs should be unique
            expect(ids.size).toBe(1000);
        });

        test('generates IDs consistently', () => {
            const id1 = generateBlockId();
            const id2 = generateBlockId();
            expect(id1).not.toBe(id2);
            expect(typeof id1).toBe('string');
            expect(typeof id2).toBe('string');
        });
    });

    describe('generateBlockIds', () => {
        test('generates multiple unique IDs', () => {
            const ids = generateBlockIds(10);
            expect(ids.length).toBe(10);
            expect(new Set(ids).size).toBe(10); // All unique
        });

        test('all IDs match format', () => {
            const ids = generateBlockIds(20);
            ids.forEach(id => {
                expect(id).toMatch(/^[0-9a-z]{8}$/);
            });
        });
    });

    describe('isValidBlockId', () => {
        test('accepts new short UUID format', () => {
            expect(isValidBlockId('xk4h2p9d')).toBe(true);
            expect(isValidBlockId('m3n8q7wz')).toBe(true);
            expect(isValidBlockId('00000000')).toBe(true);
            expect(isValidBlockId('zzzzzzzz')).toBe(true);
        });

        test('accepts legacy sequential format', () => {
            expect(isValidBlockId('block_1')).toBe(true);
            expect(isValidBlockId('block_123')).toBe(true);
            expect(isValidBlockId('item_1')).toBe(true);
            expect(isValidBlockId('row_5')).toBe(true);
        });

        test('accepts legacy descriptive format', () => {
            expect(isValidBlockId('h1')).toBe(true);
            expect(isValidBlockId('intro')).toBe(true);
            expect(isValidBlockId('conclusion_section')).toBe(true);
        });

        test('rejects invalid IDs', () => {
            expect(isValidBlockId('')).toBe(false);
            expect(isValidBlockId('has-dash')).toBe(false); // Dash not allowed
            expect(isValidBlockId('has space')).toBe(false); // Space not allowed
            expect(isValidBlockId('special!')).toBe(false); // Special characters
            // @ts-expect-error
            expect(isValidBlockId(null)).toBe(false);
            // @ts-expect-error
            expect(isValidBlockId(undefined)).toBe(false);
        });
    });

    describe('isShortUUID', () => {
        test('identifies short UUID format', () => {
            expect(isShortUUID('xk4h2p9d')).toBe(true);
            expect(isShortUUID('00000000')).toBe(true);
        });

        test('rejects non-UUID formats', () => {
            expect(isShortUUID('block_1')).toBe(false);
            expect(isShortUUID('h1')).toBe(false);
            expect(isShortUUID('abc')).toBe(false);
            expect(isShortUUID('XK4H2P9D')).toBe(false);
        });
    });

    describe('isLegacySequentialId', () => {
        test('identifies legacy sequential format', () => {
            expect(isLegacySequentialId('block_1')).toBe(true);
            expect(isLegacySequentialId('item_123')).toBe(true);
            expect(isLegacySequentialId('row_5')).toBe(true);
        });

        test('rejects non-sequential formats', () => {
            expect(isLegacySequentialId('xk4h2p9d')).toBe(false);
            expect(isLegacySequentialId('h1')).toBe(false);
            expect(isLegacySequentialId('intro')).toBe(false);
            expect(isLegacySequentialId('block_abc')).toBe(false); // Letters after underscore
        });
    });
});
