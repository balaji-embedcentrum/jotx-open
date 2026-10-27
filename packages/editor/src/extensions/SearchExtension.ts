/**
 * Search Extension for Tiptap
 * Handles search logic, highlighting, and navigation
 */

import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

// Extend Tiptap commands interface
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    search: {
      setSearchTerm: (searchTerm: string) => ReturnType
      nextSearchMatch: () => ReturnType
      previousSearchMatch: () => ReturnType
      clearSearch: () => ReturnType
    }
  }
}

export interface SearchOptions {
  searchTerm: string
  caseSensitive: boolean
  currentIndex: number
}

export interface SearchResult {
  from: number
  to: number
}

/**
 * Find all matches in the document
 */
function findMatches(doc: any, searchTerm: string, caseSensitive: boolean): SearchResult[] {
  if (!searchTerm) return []
  
  const results: SearchResult[] = []
  const search = caseSensitive ? searchTerm : searchTerm.toLowerCase()
  
  doc.descendants((node: any, pos: number) => {
    if (node.isText) {
      const text = caseSensitive ? node.text : node.text.toLowerCase()
      let index = 0
      
      while (index < text.length) {
        const found = text.indexOf(search, index)
        if (found === -1) break
        
        results.push({
          from: pos + found,
          to: pos + found + search.length
        })
        
        index = found + 1
      }
    }
  })
  
  return results
}

/**
 * Create decorations for search matches
 */
function getDecorations(
  doc: any,
  matches: SearchResult[],
  currentIndex: number
): DecorationSet {
  const decorations = matches.map((match, index) => {
    const isCurrentMatch = index === currentIndex
    
    return Decoration.inline(match.from, match.to, {
      class: isCurrentMatch ? 'jotx-search-current' : 'jotx-search-match',
      'data-search-index': index.toString()
    })
  })
  
  return DecorationSet.create(doc, decorations)
}

/**
 * Search Plugin State
 */
interface SearchPluginState {
  searchTerm: string
  caseSensitive: boolean
  matches: SearchResult[]
  currentIndex: number
  decorations: DecorationSet
}

export const searchPluginKey = new PluginKey<SearchPluginState>('search')

export const SearchExtension = Extension.create({
  name: 'search',

  addOptions() {
    return {
      searchTerm: '',
      caseSensitive: false,
      currentIndex: 0
    }
  },

  addProseMirrorPlugins() {
    const extension = this

    return [
      new Plugin({
        key: searchPluginKey,
        
        state: {
          init(): SearchPluginState {
            return {
              searchTerm: '',
              caseSensitive: false,
              matches: [],
              currentIndex: 0,
              decorations: DecorationSet.empty
            }
          },
          
          apply(tr, state, oldState, newState): SearchPluginState {
            // Check if search options changed
            const meta = tr.getMeta(searchPluginKey)
            
            if (meta) {
              const searchTerm = meta.searchTerm ?? state.searchTerm
              const caseSensitive = meta.caseSensitive ?? state.caseSensitive
              let currentIndex = meta.currentIndex ?? state.currentIndex
              
              // Find new matches
              const matches = findMatches(newState.doc, searchTerm, caseSensitive)
              
              // Clamp current index
              if (matches.length === 0) {
                currentIndex = 0
              } else {
                currentIndex = Math.max(0, Math.min(currentIndex, matches.length - 1))
              }
              
              // Create decorations
              const decorations = getDecorations(newState.doc, matches, currentIndex)
              
              return {
                searchTerm,
                caseSensitive,
                matches,
                currentIndex,
                decorations
              }
            }
            
            // Document changed - update matches
            if (tr.docChanged && state.searchTerm) {
              const matches = findMatches(newState.doc, state.searchTerm, state.caseSensitive)
              let currentIndex = state.currentIndex
              
              // Clamp current index
              if (matches.length === 0) {
                currentIndex = 0
              } else {
                currentIndex = Math.max(0, Math.min(currentIndex, matches.length - 1))
              }
              
              const decorations = getDecorations(newState.doc, matches, currentIndex)
              
              return {
                ...state,
                matches,
                currentIndex,
                decorations
              }
            }
            
            // Map decorations through transaction
            return {
              ...state,
              decorations: state.decorations.map(tr.mapping, tr.doc)
            }
          }
        },
        
        props: {
          decorations(state) {
            return searchPluginKey.getState(state)?.decorations
          }
        }
      })
    ]
  },

  addCommands() {
    return {
      /**
       * Set search term and find matches
       */
      setSearchTerm: (searchTerm: string) => ({ tr, dispatch }) => {
        if (dispatch) {
          tr.setMeta(searchPluginKey, { searchTerm, currentIndex: 0 })
        }
        return true
      },

      /**
       * Navigate to next match
       */
      nextSearchMatch: () => ({ tr, dispatch, state }) => {
        const pluginState = searchPluginKey.getState(state)
        if (!pluginState || pluginState.matches.length === 0) return false

        const nextIndex = (pluginState.currentIndex + 1) % pluginState.matches.length
        
        if (dispatch) {
          tr.setMeta(searchPluginKey, { currentIndex: nextIndex })
        }
        
        return true
      },

      /**
       * Navigate to previous match
       */
      previousSearchMatch: () => ({ tr, dispatch, state }) => {
        const pluginState = searchPluginKey.getState(state)
        if (!pluginState || pluginState.matches.length === 0) return false

        const prevIndex = pluginState.currentIndex === 0 
          ? pluginState.matches.length - 1 
          : pluginState.currentIndex - 1
        
        if (dispatch) {
          tr.setMeta(searchPluginKey, { currentIndex: prevIndex })
        }
        
        return true
      },

      /**
       * Clear search
       */
      clearSearch: () => ({ tr, dispatch }) => {
        if (dispatch) {
          tr.setMeta(searchPluginKey, { searchTerm: '', currentIndex: 0 })
        }
        return true
      }
    }
  }
})

