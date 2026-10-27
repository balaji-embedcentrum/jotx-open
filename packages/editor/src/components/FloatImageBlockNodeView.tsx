/**
 * Float Image Block NodeView - CONTAINER with floating image + editable content
 */

import React, { useState, useRef } from 'react'
import { NodeViewWrapper, NodeViewContent, NodeViewProps } from '@tiptap/react'
import { ImageStorage } from '../services/ImageStorage'
import { logger } from '../utils/logger'

export function FloatImageBlockNodeView({ node, updateAttributes, selected }: NodeViewProps) {
  logger.log('🎨 FloatImageBlockNodeView RENDERING', { node: node.attrs, selected })

  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { src, alt, width, height, float: floatPos, caption } = node.attrs
  logger.log('🔍 FloatImageBlockNodeView attrs:', { src, alt, width, height, float: floatPos, caption })

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')

    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string).split(',')[1]

        try {
          const relativePath = await ImageStorage.saveImage({
            base64,
            mime: file.type,
            fileName: file.name
          })

          updateAttributes({ src: relativePath })
        } catch (err: any) {
          setError(err.message || 'Failed to upload image')
        } finally {
          setUploading(false)
        }
      }
      reader.readAsDataURL(file)
    } catch (err: any) {
      setError(err.message || 'Failed to read file')
      setUploading(false)
    }
  }

  const handleUrlSubmit = () => {
    const trimmedUrl = urlInput.trim()
    if (!trimmedUrl) {
      setError('Please enter a valid URL')
      return
    }

    // Basic URL validation
    try {
      new URL(trimmedUrl)
      updateAttributes({ src: trimmedUrl })
      setUrlInput('')
      setShowUrlInput(false)
      setError('')
    } catch {
      setError('Invalid URL format')
    }
  }

  if (!src) {
    return (
      <NodeViewWrapper>
        <div className={`jotx-float-image-empty ${selected ? 'selected' : ''}`}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          {!showUrlInput ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? 'Uploading...' : '📷 Upload Image'}
              </button>
              <button onClick={() => setShowUrlInput(true)} disabled={uploading}>
                🔗 Image URL
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px', width: '100%', maxWidth: '500px' }}>
              <input
                type="text"
                placeholder="Paste image URL (https://...)"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleUrlSubmit()
                  } else if (e.key === 'Escape') {
                    setShowUrlInput(false)
                    setUrlInput('')
                    setError('')
                  }
                }}
                className="jotx-image-url-input"
                autoFocus
              />
              <button onClick={handleUrlSubmit} className="jotx-image-secondary-button">Add</button>
              <button onClick={() => {
                setShowUrlInput(false)
                setUrlInput('')
                setError('')
              }} className="jotx-image-secondary-button">Cancel</button>
            </div>
          )}

          {error && <div className="jotx-image-error">{error}</div>}
        </div>
      </NodeViewWrapper>
    )
  }

  return (
    <NodeViewWrapper>
      <div
        className={`jotx-float-image-container ${selected ? 'selected' : ''}`}
      >
        {/* Floating Image */}
        <div
          className={`jotx-float-image-wrapper jotx-float-${floatPos}`}
          contentEditable={false}
        >
          <img
            src={src}
            alt={alt}
            style={{ width: width ? `${width}px` : 'auto', height: height !== 'auto' ? `${height}px` : 'auto' }}
            draggable={false}
          />
          {selected && (
            <div className="jotx-image-controls">
              <button onClick={() => fileInputRef.current?.click()}>Change</button>
              <select
                value={floatPos}
                onChange={(e) => updateAttributes({ float: e.target.value })}
              >
                <option value="left">Float Left</option>
                <option value="right">Float Right</option>
              </select>
              <input
                type="number"
                value={width}
                onChange={(e) => updateAttributes({ width: parseInt(e.target.value) || 400 })}
                placeholder="Width"
                style={{ width: '80px' }}
              />
            </div>
          )}
          {(caption || selected) && (
            <input
              type="text"
              className="jotx-image-caption"
              value={caption}
              onChange={(e) => updateAttributes({ caption: e.target.value })}
              placeholder="Add a caption..."
            />
          )}
        </div>

        {/* Editable Content Area - Text wraps around the floating image */}
        <NodeViewContent className="jotx-float-image-content" />

        {/* Clearfix to ensure container wraps floated content */}
        <div style={{ clear: 'both' }}></div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>
    </NodeViewWrapper>
  )
}





