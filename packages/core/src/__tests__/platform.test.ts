import { NullPlatformAdapter } from '../platform'

describe('NullPlatformAdapter', () => {
  let platform: NullPlatformAdapter

  beforeEach(() => {
    platform = new NullPlatformAdapter()
  })

  it('should throw error for readFile', async () => {
    await expect(platform.readFile('test.txt')).rejects.toThrow('Platform not configured')
  })

  it('should throw error for writeFile', async () => {
    await expect(platform.writeFile('test.txt', 'content')).rejects.toThrow('Platform not configured')
  })

  it('should return false for exists', async () => {
    const result = await platform.exists('test.txt')
    expect(result).toBe(false)
  })

  it('should return empty array for listFiles', async () => {
    const result = await platform.listFiles('/path')
    expect(result).toEqual([])
  })

  it('should log message for showMessage', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    platform.showMessage('Test', 'info')
    expect(consoleSpy).toHaveBeenCalledWith('[info] Test')
    consoleSpy.mockRestore()
  })

  it('should return null for getWorkspaceRoot', () => {
    expect(platform.getWorkspaceRoot()).toBeNull()
  })

  it('should return absolutePath for getRelativePath', () => {
    const path = '/absolute/path/file.txt'
    expect(platform.getRelativePath(path)).toBe(path)
  })
})






