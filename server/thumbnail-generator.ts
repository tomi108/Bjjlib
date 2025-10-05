import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface VideoMetadata {
  width: number;
  height: number;
  orientation: 'horizontal' | 'vertical';
  duration: number;
}

export interface ThumbnailResult {
  thumbnailPath: string;
  orientation: 'horizontal' | 'vertical';
}

async function getVideoMetadata(videoUrl: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoUrl, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }

      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      if (!videoStream || !videoStream.width || !videoStream.height) {
        reject(new Error('Could not find video stream or dimensions'));
        return;
      }

      const width = videoStream.width;
      const height = videoStream.height;
      const duration = metadata.format.duration || 0;
      const orientation = height > width ? 'vertical' : 'horizontal';

      resolve({
        width,
        height,
        orientation,
        duration,
      });
    });
  });
}

export async function generateThumbnail(
  videoUrl: string,
  videoId: number
): Promise<ThumbnailResult> {
  try {
    const metadata = await getVideoMetadata(videoUrl);
    
    const thumbnailsDir = path.join(__dirname, '..', 'client', 'public', 'thumbnails');
    await fs.mkdir(thumbnailsDir, { recursive: true });

    const thumbnailFilename = `video-${videoId}-thumb.jpg`;
    const thumbnailPath = path.join(thumbnailsDir, thumbnailFilename);
    const publicThumbnailPath = `/thumbnails/${thumbnailFilename}`;

    if (metadata.orientation === 'vertical') {
      await new Promise<void>((resolve, reject) => {
        ffmpeg(videoUrl)
          .seekInput(1)
          .frames(1)
          .videoFilter([
            `crop=in_w:in_w*9/16:0:(in_h-in_w*9/16)/2`
          ])
          .size('800x450')
          .output(thumbnailPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });
    } else {
      await new Promise<void>((resolve, reject) => {
        ffmpeg(videoUrl)
          .seekInput(1)
          .frames(1)
          .size('800x450')
          .output(thumbnailPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });
    }

    return {
      thumbnailPath: publicThumbnailPath,
      orientation: metadata.orientation,
    };
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    throw error;
  }
}

export async function regenerateThumbnails(
  videos: Array<{ id: number; url: string; orientation?: string | null }>
): Promise<Array<{ id: number; success: boolean; error?: string }>> {
  const results = [];

  for (const video of videos) {
    try {
      const result = await generateThumbnail(video.url, video.id);
      results.push({
        id: video.id,
        success: true,
        thumbnailPath: result.thumbnailPath,
        orientation: result.orientation,
      });
    } catch (error) {
      results.push({
        id: video.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}
