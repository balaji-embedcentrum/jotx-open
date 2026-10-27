/**
 * Null platform adapter (default no-op implementation)
 * Used when no platform is injected
 */

import { PlatformAdapter, PickFileOptions } from './PlatformAdapter'

export class NullPlatformAdapter implements PlatformAdapter {
  async readFile(path: string): Promise<string> {
    throw new Error('Platform not configured: readFile')
  }
  
  async writeFile(path: string, content: string): Promise<void> {
    throw new Error('Platform not configured: writeFile')
  }
  
  async exists(path: string): Promise<boolean> {
    return false
  }
  
  async listFiles(directory: string): Promise<string[]> {
    return []
  }
  
  async openExternal(url: string): Promise<void> {
    console.warn('Platform not configured: openExternal', url)
  }
  
  showMessage(message: string, type: 'info' | 'warning' | 'error'): void {
    console.log(`[${type}] ${message}`)
  }
  
  async pickFile(options?: PickFileOptions): Promise<string | null> {
    throw new Error('Platform not configured: pickFile')
  }
  
  async pickDirectory(options?: PickFileOptions): Promise<string | null> {
    throw new Error('Platform not configured: pickDirectory')
  }
  
  getWorkspaceRoot(): string | null {
    return null
  }
  
  getRelativePath(absolutePath: string): string {
    return absolutePath
  }
}






