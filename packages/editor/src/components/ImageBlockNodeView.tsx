/**
 * Image Block NodeView - Regular image with text below
 * Features: Upload, resize, caption, alignment
 */

import React, { useState, useRef } from 'react'
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react'
import { ImageStorage } from '../services/ImageStorage'
import { logger } from '../utils/logger'

export function ImageBlockNodeView({ node, updateAttributes, selected, editor }: NodeViewProps) {
  logger.log('🎨 ImageBlockNodeView RENDERING', { node: node.attrs, selected })

  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [captionFocused, setCaptionFocused] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { src, alt, width, height, align, caption } = node.attrs
  logger.log('🔍 ImageBlockNodeView attrs:', { src, alt, width, height, align, caption })

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')

    try {
      // Read file as base64
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

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (!file) continue

        setUploading(true)
        const reader = new FileReader()
        reader.onload = async (event) => {
          const base64 = (event.target?.result as string).split(',')[1]

          try {
            const relativePath = await ImageStorage.saveImage({
              base64,
              mime: file.type
            })

            updateAttributes({ src: relativePath })
          } catch (err: any) {
            setError(err.message || 'Failed to save pasted image')
          } finally {
            setUploading(false)
          }
        }
        reader.readAsDataURL(file)
        break
      }
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
        <div
          className={`jotx-image-block-empty ${selected ? 'selected' : ''}`}
          onPaste={handlePaste}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          {!showUrlInput ? (
            <div style={{ display: 'flex', gap: '8px', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="jotx-image-upload-button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? 'Uploading...' : '📷 Upload Image'}
                </button>
                <button
                  className="jotx-image-upload-button"
                  onClick={() => setShowUrlInput(true)}
                  disabled={uploading}
                >
                  🔗 Image URL
                </button>
              </div>
              <span className="jotx-image-hint">or paste image</span>
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
        className={`jotx-image-block jotx-image-align-${align} ${selected ? 'selected' : ''}`}
        contentEditable={false}
      >
        <div className="jotx-image-wrapper">
          <img
            src={src}
            alt={alt}
            style={{ width: width ? `${width}px` : 'auto', height: height !== 'auto' ? `${height}px` : 'auto' }}
            draggable={false}
          />
          {selected && !captionFocused && (
            <div className="jotx-image-controls">
              <button onClick={() => fileInputRef.current?.click()}>Change</button>
              <select
                value={align}
                onChange={(e) => updateAttributes({ align: e.target.value })}
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
                <option value="full">Full Width</option>
              </select>
              <input
                type="number"
                value={width}
                onChange={(e) => updateAttributes({ width: parseInt(e.target.value) || 800 })}
                placeholder="Width"
                style={{ width: '80px' }}
              />
            </div>
          )}
        </div>
        {(caption || selected) && (
          <input
            type="text"
            className="jotx-image-caption"
            value={caption}
            onChange={(e) => updateAttributes({ caption: e.target.value })}
            onFocus={() => setCaptionFocused(true)}
            onBlur={() => setCaptionFocused(false)}
            placeholder="Add a caption..."
          />
        )}
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
