/**
 * VS Code API singleton
 * Can only call acquireVsCodeApi() ONCE per webview!
 */

declare const acquireVsCodeApi: any;
import { logger } from '../utils/logger';

let vscodeApi: any = null;

export function getVSCodeAPI() {
  if (!vscodeApi) {
    try {
      vscodeApi = acquireVsCodeApi();
      // Store on window so other components can access it
      (window as any).vscodeApi = vscodeApi;
      logger.log('✅ VS Code API acquired');
    } catch (error) {
      logger.error('❌ Failed to acquire VS Code API:', error);
      // Fallback for development
      vscodeApi = {
        postMessage: (msg: any) => logger.log('Mock VS Code message:', msg),
        getState: () => ({}),
        setState: (state: any) => logger.log('Mock setState:', state)
      };
      (window as any).vscodeApi = vscodeApi;
    }
  }
  return vscodeApi;
}
