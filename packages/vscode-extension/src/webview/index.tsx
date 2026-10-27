import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';
import 'katex/dist/katex.min.css';
import { logger } from '../utils/logger';

// Extend window type
declare global {
  interface Window {
    __jotxLoaded?: () => void;
  }
}

logger.log('🚀 jotx webview script loaded!');
logger.log('🌍 Window:', window);
logger.log('🌍 Document:', document);

// Notify that script loaded
if (typeof window.__jotxLoaded === 'function') {
  window.__jotxLoaded();
}

try {
  const container = document.getElementById('root');
  logger.log('📦 Root container:', container);

  if (!container) {
    throw new Error('Root element not found!');
  }

  logger.log('🎨 Creating React root...');
  const root = createRoot(container);

  logger.log('🎨 Rendering App...');
  root.render(<App />);

  logger.log('✅ React app rendered!');
} catch (error) {
  logger.error('❌ Fatal error in webview:', error);
  const container = document.getElementById('root');
  if (container) {
    container.innerHTML = `<div style="padding: 20px; color: var(--vscode-errorForeground);">
      <h2>❌ jotx Failed to Load</h2>
      <p>Error: ${error}</p>
      <p>Check the console for details.</p>
    </div>`;
  }
}

