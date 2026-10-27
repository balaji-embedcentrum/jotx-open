/**
 * Floating Search Bar Component
 * Browser-style search with highlighting and navigation
 */

import React, { useState, useEffect, useRef } from 'react'
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react'
import '../styles/SearchBar.css'

export interface SearchBarProps {
  visible: boolean
  onSearch: (query: string) => void
  onNext: () => void
  onPrevious: () => void
  onClose: () => void
  currentMatch: number
  totalMatches: number
}

export function SearchBar({
  visible,
  onSearch,
  onNext,
  onPrevious,
  onClose,
  currentMatch,
  totalMatches
}: SearchBarProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus when visible
  useEffect(() => {
    if (visible && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [visible])

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    onSearch(value)
  }

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (e.shiftKey) {
        onPrevious()
      } else {
        onNext()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  if (!visible) return null

  const hasResults = totalMatches > 0
  const matchText = hasResults 
    ? `${currentMatch} of ${totalMatches}` 
    : query ? 'No results' : ''

  return (
    <div className="jotx-search-bar" role="search">
      <div className="jotx-search-icon">
        <Search size={16} />
      </div>
      
      <input
        ref={inputRef}
        type="text"
        className="jotx-search-input"
        placeholder="Find in document..."
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        aria-label="Search document"
      />

      {matchText && (
        <div className="jotx-search-counter" aria-live="polite">
          {matchText}
        </div>
      )}

      <button
        className="jotx-search-btn"
        onClick={onPrevious}
        disabled={!hasResults}
        title="Previous match (Shift+Enter)"
        aria-label="Previous match"
      >
        <ChevronUp size={16} />
      </button>

      <button
        className="jotx-search-btn"
        onClick={onNext}
        disabled={!hasResults}
        title="Next match (Enter)"
        aria-label="Next match"
      >
        <ChevronDown size={16} />
      </button>

      <button
        className="jotx-search-close"
        onClick={onClose}
        title="Close (Escape)"
        aria-label="Close search"
      >
        <X size={16} />
      </button>
    </div>
  )
}



