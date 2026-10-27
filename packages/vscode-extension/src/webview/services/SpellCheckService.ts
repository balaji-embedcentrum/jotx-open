/**
 * SpellCheckService - Local spell checking using nspell (Hunspell JS port)
 * Uses bundled English dictionary files
 */

import nspell from 'nspell'
// Import dictionary files as raw text (bundled by webpack)
// @ts-ignore
import enAff from '../dictionaries/en_US.aff'
// @ts-ignore
import enDic from '../dictionaries/en_US.dic'

export interface SpellCheckResult {
    word: string
    correct: boolean
    suggestions?: string[]
}

class SpellCheckServiceImpl {
    private checker: ReturnType<typeof nspell> | null = null
    private loading = false
    private loadPromise: Promise<void> | null = null
    private _enabled = false  // Default: spell check OFF
    private ignoredWords = new Set<string>()

    get enabled(): boolean {
        return this._enabled
    }

    set enabled(value: boolean) {
        this._enabled = value
    }

    get isLoaded(): boolean {
        return this.checker !== null
    }

    /**
     * Initialize the spell checker using bundled dictionary files
     */
    async initialize(): Promise<void> {
        if (this.checker) return
        if (this.loadPromise) return this.loadPromise

        this.loading = true
        this.loadPromise = (async () => {
            try {
                // Use bundled dictionary files
                this.checker = nspell(enAff, enDic)
                console.log('[SpellCheck] Dictionary loaded successfully')
                this.loading = false
            } catch (error) {
                console.error('[SpellCheck] Failed to load dictionary:', error)
                this.loading = false
                throw error
            }
        })()

        return this.loadPromise
    }

    /**
     * Add a word to the ignore list (not marked as misspelled)
     */
    ignoreWord(word: string): void {
        this.ignoredWords.add(word.toLowerCase())
        console.log(`[SpellCheck] Ignoring word: ${word}`)
    }

    /**
     * Check if a word is in the ignore list
     */
    isIgnored(word: string): boolean {
        return this.ignoredWords.has(word.toLowerCase())
    }

    /**
     * Clear all ignored words
     */
    clearIgnored(): void {
        this.ignoredWords.clear()
    }

    /**
     * Check if a word is spelled correctly
     */
    check(word: string): boolean {
        if (!this._enabled || !this.checker) return true

        // Skip short words, numbers, and special characters
        if (word.length < 2) return true
        if (/^\d+$/.test(word)) return true
        if (/^[^a-zA-Z]+$/.test(word)) return true

        // Skip ignored words
        if (this.ignoredWords.has(word.toLowerCase())) return true

        return this.checker.correct(word)
    }

    /**
     * Get spelling suggestions for a word
     */
    suggest(word: string): string[] {
        if (!this.checker) return []
        return this.checker.suggest(word).slice(0, 5) // Return top 5 suggestions
    }

    /**
     * Check multiple words and return results
     */
    checkText(text: string): SpellCheckResult[] {
        if (!this._enabled || !this.checker) return []

        // Simple word tokenization
        const words = text.match(/\b[a-zA-Z']+\b/g) || []
        const results: SpellCheckResult[] = []
        const checked = new Set<string>()

        for (const word of words) {
            if (checked.has(word.toLowerCase())) continue
            checked.add(word.toLowerCase())

            const correct = this.check(word)
            if (!correct) {
                results.push({
                    word,
                    correct: false,
                    suggestions: this.suggest(word)
                })
            }
        }

        return results
    }
}

// Singleton instance
export const SpellCheckService = new SpellCheckServiceImpl()
