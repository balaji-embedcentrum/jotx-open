/**
 * Video Block NodeView - YouTube preview with click-to-open + local video player
 * 
 * WHY NOT IFRAME FOR YOUTUBE?
 * VS Code webviews have origin "vscode-webview://" which YouTube blocks with Error 153.
 * This is a YouTube security restriction, not something we can bypass.
 * 
 * SOLUTION: Beautiful thumbnail preview that opens YouTube in the default browser.
 */

import React, { useState, useRef } from 'react'
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react'
import { ImageStorage } from '../services/ImageStorage'
import { getVSCodeAPI } from '../bridge/vscode-api'

export function VideoBlockNodeView({ node, updateAttributes, selected }: NodeViewProps) {
  const [error, setError] = useState('')
  const [inputValue, setInputValue] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { type: videoType, url, src, title, width, height, controls, autoplay, muted, loop } = node.attrs

  const handleYouTubeUrl = (inputUrl: string) => {
    if (!inputUrl || inputUrl.trim() === '') {
      setError('')
      return
    }

    const videoId = ImageStorage.getYouTubeId(inputUrl)
    if (videoId) {
      updateAttributes({ url: inputUrl, type: 'youtube' })
      setError('')
      setInputValue('')
    } else {
      setError('Invalid YouTube URL')
    }
  }

  const openInBrowser = (youtubeUrl: string) => {
    // Use VS Code API to open in external browser
    const vscode = getVSCodeAPI()
    vscode.postMessage({
      type: 'openExternal',
      url: youtubeUrl
    })
  }

  const handleLocalVideoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const relativePath = await ImageStorage.saveVideo({
        base64: '',  // Stub - actual implementation would read file
        mime: file.type,
        filePath: file.name
      })

      updateAttributes({ src: relativePath, type: 'local' })
      setError('')
    } catch (err: any) {
      setError(err.message || 'Failed to save video')
    }
  }

  // Empty state - YouTube
  if (videoType === 'youtube' && !url) {
    return (
      <NodeViewWrapper>
        <div className={`jotx-video-empty ${selected ? 'selected' : ''}`}>
          <div className="jotx-video-input-group">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Paste YouTube URL and press Enter..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleYouTubeUrl(inputValue)
                }
              }}
            />
            <button type="button" onClick={() => handleYouTubeUrl(inputValue)}>Add Video</button>
            <button type="button" onClick={() => updateAttributes({ type: 'local' })}>Upload Local</button>
          </div>
          {error && <div className="jotx-video-error">{error}</div>}
        </div>
      </NodeViewWrapper>
    )
  }

  // Empty state - Local
  if (videoType === 'local' && !src) {
    return (
      <NodeViewWrapper>
        <div className={`jotx-video-empty ${selected ? 'selected' : ''}`}>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleLocalVideoSelect}
            style={{ display: 'none' }}
          />
          <button type="button" onClick={() => fileInputRef.current?.click()}>
            🎥 Upload Local Video
          </button>
          <button type="button" onClick={() => updateAttributes({ type: 'youtube' })}>Use YouTube</button>
          {error && <div className="jotx-video-error">{error}</div>}
        </div>
      </NodeViewWrapper>
    )
  }

  // YouTube video - THUMBNAIL PREVIEW (not iframe)
  if (videoType === 'youtube' && url) {
    const videoId = ImageStorage.getYouTubeId(url)

    if (!videoId) {
      return (
        <NodeViewWrapper>
          <div className="jotx-video-error">Invalid YouTube URL</div>
        </NodeViewWrapper>
      )
    }

    // YouTube thumbnail URLs
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    const fallbackThumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`

    return (
      <NodeViewWrapper>
        <div className={`jotx-video-block youtube-preview ${selected ? 'selected' : ''}`} contentEditable={false}>
          {title && <div className="jotx-video-title">{title}</div>}
          <div
            className="jotx-youtube-thumbnail"
            style={{ width: `${width}px`, maxWidth: '100%' }}
            onClick={() => openInBrowser(watchUrl)}
          >
            <img
              src={thumbnailUrl}
              alt="YouTube Video Thumbnail"
              onError={(e) => {
                // Fallback to lower quality thumbnail
                (e.target as HTMLImageElement).src = fallbackThumbnail
              }}
            />
            <div className="jotx-youtube-play-overlay">
              <svg viewBox="0 0 68 48" width="68" height="48">
                <path className="jotx-youtube-play-bg" d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55 C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z" fill="#FF0000" />
                <path className="jotx-youtube-play-icon" d="M 45,24 27,14 27,34" fill="#FFFFFF" />
              </svg>
            </div>
            <div className="jotx-youtube-click-hint">
              Click to watch on YouTube ↗
            </div>
          </div>
          <div className="jotx-youtube-info">
            <span className="jotx-youtube-badge">YouTube</span>
            <a href={watchUrl} className="jotx-youtube-link" onClick={(e) => { e.preventDefault(); openInBrowser(watchUrl); }}>
              {watchUrl}
            </a>
          </div>
          {selected && (
            <div className="jotx-video-controls">
              <input
                type="text"
                value={title || ''}
                onChange={(e) => updateAttributes({ title: e.target.value })}
                placeholder="Video title..."
              />
              <input
                type="number"
                value={width}
                onChange={(e) => updateAttributes({ width: parseInt(e.target.value) || 800 })}
                placeholder="Width"
                style={{ width: '80px' }}
              />
              <button type="button" onClick={() => updateAttributes({ url: '', type: 'youtube' })}>
                Change Video
              </button>
            </div>
          )}
        </div>
      </NodeViewWrapper>
    )
  }

  // Local video
  if (videoType === 'local' && src) {
    return (
      <NodeViewWrapper>
        <div className={`jotx-video-block ${selected ? 'selected' : ''}`} contentEditable={false}>
          {title && <div className="jotx-video-title">{title}</div>}
          <div className="jotx-video-wrapper" style={{ width: `${width}px`, maxWidth: '100%' }}>
            <video
              src={src}
              width={width}
              height={height}
              controls={controls === 'true'}
              autoPlay={autoplay === 'true'}
              muted={muted === 'true'}
              loop={loop === 'true'}
              preload="metadata"
            >
              Your browser doesn't support video playback.
            </video>
          </div>
          {selected && (
            <div className="jotx-video-controls">
              <input
                type="text"
                value={title}
                onChange={(e) => updateAttributes({ title: e.target.value })}
                placeholder="Video title..."
              />
              <input
                type="number"
                value={width}
                onChange={(e) => updateAttributes({ width: parseInt(e.target.value) || 800 })}
                placeholder="Width"
                style={{ width: '80px' }}
              />
              <button onClick={() => fileInputRef.current?.click()}>Change Video</button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleLocalVideoSelect}
            style={{ display: 'none' }}
          />
        </div>
      </NodeViewWrapper>
    )
  }

  return (
    <NodeViewWrapper>
      <div>No video content</div>
    </NodeViewWrapper>
  )
}

