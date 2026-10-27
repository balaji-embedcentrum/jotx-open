/**
 * ImageStorage service - handles image/video path resolution
 * Platform implementations should provide actual storage logic
 */

export interface ImageStorageService {
    resolveImagePath: (src: string) => string
    uploadImage: (file: File) => Promise<string>
    saveImage: (data: { base64: string; mime: string; fileName?: string }) => Promise<string>
    saveVideo: (data: { base64: string; mime: string; filePath?: string }) => Promise<string>
    getYouTubeId: (url: string) => string | null
}


class DefaultImageStorage implements ImageStorageService {
    resolveImagePath(src: string): string {
        return src // No transformation in default implementation
    }

    async uploadImage(_file: File): Promise<string> {
        // In default implementation, return object URL
        return URL.createObjectURL(_file)
    }

    async saveImage(data: { base64: string; mime: string; fileName?: string }): Promise<string> {
        return `data:${data.mime};base64,${data.base64}`
    }

    async saveVideo(data: { base64: string; mime: string; filePath?: string }): Promise<string> {
        return `data:${data.mime};base64,${data.base64}`
    }

    getYouTubeId(url: string): string | null {
        const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)
        return match ? match[1] : null
    }
}

export const ImageStorage = new DefaultImageStorage()

export function resolveImagePath(src: string): string {
    return ImageStorage.resolveImagePath(src)
}
