/**
 * Platform abstraction interface
 * Allows jotx core to work on any platform
 */

export interface PickFileOptions {
  filters?: Record<string, string[]>
  multiple?: boolean
  directory?: boolean
}

export interface PlatformAdapter {
  // File system
  readFile(path: string): Promise<string>
  writeFile(path: string, content: string): Promise<void>
  exists(path: string): Promise<boolean>
  listFiles(directory: string): Promise<string[]>
  
  // External actions
  openExternal(url: string): Promise<void>
  
  // UI interactions
  showMessage(message: string, type: 'info' | 'warning' | 'error'): void
  
  // File picker
  pickFile(options?: PickFileOptions): Promise<string | null>
  pickDirectory(options?: PickFileOptions): Promise<string | null>
  
  // Workspace
  getWorkspaceRoot(): string | null
  getRelativePath(absolutePath: string): string
}






