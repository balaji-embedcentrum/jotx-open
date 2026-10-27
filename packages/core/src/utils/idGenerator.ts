/**
 * Block ID Generator - Short UUIDs for global uniqueness
 * 
 * Generates 8-character lowercase alphanumeric IDs for blocks.
 * Format: [0-9a-z]{8}
 * Examples: "xk4h2p9d", "m3n8q7wz", "p2b5k9tx"
 * 
 * Collision probability: ~1 in 2.8 trillion
 * Safe for millions of blocks across thousands of documents
 */

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';
const ID_LENGTH = 8;

/**
 * Generate a short, globally unique ID for blocks
 * Uses crypto.getRandomValues for secure random generation
 */
export function generateBlockId(): string {
    let id = '';

    // Use crypto API for better randomness (works in Node.js 15+ and all modern browsers)
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const bytes = crypto.getRandomValues(new Uint8Array(ID_LENGTH));
        for (let i = 0; i < ID_LENGTH; i++) {
            id += ALPHABET[bytes[i] % ALPHABET.length];
        }
    } else if (typeof require !== 'undefined') {
        // Fallback for older Node.js environments
        try {
            const cryptoNode = require('crypto');
            const bytes = cryptoNode.randomBytes(ID_LENGTH);
            for (let i = 0; i < ID_LENGTH; i++) {
                id += ALPHABET[bytes[i] % ALPHABET.length];
            }
        } catch {
            // Final fallback to Math.random (less secure but works everywhere)
            id = fallbackGenerateId();
        }
    } else {
        // Fallback for environments without crypto
        id = fallbackGenerateId();
    }

    return id;
}

/**
 * Fallback ID generator using Math.random
 * Less cryptographically secure but works in all environments
 */
function fallbackGenerateId(): string {
    let id = '';
    for (let i = 0; i < ID_LENGTH; i++) {
        id += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
    return id;
}

/**
 * Validate if a string is a valid block ID
 * Accepts both new format (8-char alphanumeric) and legacy formats
 */
export function isValidBlockId(id: string): boolean {
    if (!id || typeof id !== 'string') return false;

    // New format: 8 lowercase alphanumeric characters
    if (/^[0-9a-z]{8}$/.test(id)) return true;

    // Legacy formats (for backward compatibility):
    // - Sequential: block_1, block_123
    // - Descriptive: h1, h2, p1, intro, etc.
    // - Any alphanumeric with underscores
    if (/^[a-zA-Z0-9_]+$/.test(id)) return true;

    return false;
}

/**
 * Generate multiple unique IDs at once
 * Ensures no duplicates in the returned array
 */
export function generateBlockIds(count: number): string[] {
    const ids = new Set<string>();
    while (ids.size < count) {
        ids.add(generateBlockId());
    }
    return Array.from(ids);
}

/**
 * Check if an ID is in the new short UUID format
 */
export function isShortUUID(id: string): boolean {
    return /^[0-9a-z]{8}$/.test(id);
}

/**
 * Check if an ID is in legacy sequential format (block_N, item_N, etc.)
 */
export function isLegacySequentialId(id: string): boolean {
    return /^[a-z]+_\d+$/i.test(id);
}
