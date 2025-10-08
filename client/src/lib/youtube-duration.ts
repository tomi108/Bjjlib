// YouTube IFrame Player API for extracting video durations without API keys
// Uses hidden offscreen players to read metadata without playing videos

interface YT {
  Player: {
    new (elementId: string, options: any): YTPlayer;
  };
  PlayerState: {
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
    BUFFERING: number;
    CUED: number;
  };
}

interface YTPlayer {
  cueVideoById(videoId: string): void;
  getDuration(): number;
  destroy(): void;
}

declare global {
  interface Window {
    YT?: YT;
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface DurationRequest {
  videoId: string;
  resolve: (duration: number | null) => void;
}

class YouTubeDurationReader {
  private apiReady = false;
  private apiLoading = false;
  private apiFailed = false;
  private queue: DurationRequest[] = [];
  private processing = false;
  private container: HTMLDivElement | null = null;

  constructor() {
    this.loadAPI();
  }

  private loadAPI(): void {
    // Check if API is already loaded
    if (window.YT && window.YT.Player) {
      this.apiReady = true;
      return;
    }

    // Check if script is already loading
    if (this.apiLoading) return;

    this.apiLoading = true;

    // Set up the callback for when API is ready
    window.onYouTubeIframeAPIReady = () => {
      this.apiReady = true;
      this.apiLoading = false;
      this.processQueue();
    };

    // Set a timeout in case the script never loads
    const loadTimeout = window.setTimeout(() => {
      if (!this.apiReady) {
        this.apiFailed = true;
        this.apiLoading = false;
        this.failAllQueued();
      }
    }, 10000); // 10 second timeout for script load

    // Load the IFrame API script
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    
    // Handle script load errors
    tag.onerror = () => {
      clearTimeout(loadTimeout);
      this.apiFailed = true;
      this.apiLoading = false;
      this.failAllQueued();
    };

    tag.onload = () => {
      clearTimeout(loadTimeout);
      // The actual ready callback is onYouTubeIframeAPIReady
    };

    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
  }

  private failAllQueued(): void {
    // Fail all queued requests with null
    while (this.queue.length > 0) {
      const request = this.queue.shift();
      if (request) {
        request.resolve(null);
      }
    }
  }

  private createHiddenContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.style.cssText = 'position:absolute;left:-9999px;top:auto;width:1px;height:1px;opacity:0;pointer-events:none;';
    container.id = `yt-duration-reader-${Date.now()}`;
    document.body.appendChild(container);
    return container;
  }

  private async readDuration(videoId: string): Promise<number | null> {
    return new Promise((resolve) => {
      if (!this.apiReady || !window.YT) {
        resolve(null);
        return;
      }

      const container = this.createHiddenContainer();
      let player: YTPlayer | null = null;
      let timeoutId: number;

      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        if (player) {
          try {
            player.destroy();
          } catch (e) {
            // Ignore cleanup errors
          }
        }
        if (container && container.parentNode) {
          container.parentNode.removeChild(container);
        }
      };

      // Set a timeout in case the player never calls onReady
      timeoutId = window.setTimeout(() => {
        cleanup();
        resolve(null);
      }, 10000); // 10 second timeout

      try {
        player = new window.YT!.Player(container.id, {
          height: '1',
          width: '1',
          videoId: videoId,
          playerVars: {
            controls: 0,
            modestBranding: 1,
            rel: 0,
            playsinline: 1,
            autoplay: 0,
            mute: 1,
          },
          events: {
            onReady: (event: any) => {
              try {
                const duration = event.target.getDuration();
                cleanup();
                
                if (duration && duration > 0) {
                  resolve(duration);
                } else {
                  resolve(null);
                }
              } catch (e) {
                cleanup();
                resolve(null);
              }
            },
            onError: () => {
              cleanup();
              resolve(null);
            },
          },
        });
      } catch (e) {
        cleanup();
        resolve(null);
      }
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0 || !this.apiReady) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const request = this.queue.shift();
      if (!request) break;

      const duration = await this.readDuration(request.videoId);
      request.resolve(duration);

      // Small delay between reads to avoid overwhelming the browser
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.processing = false;
  }

  public getDuration(videoId: string): Promise<number | null> {
    return new Promise((resolve) => {
      // If API failed to load, immediately return null
      if (this.apiFailed) {
        resolve(null);
        return;
      }

      this.queue.push({ videoId, resolve });

      // If API is ready, start processing
      if (this.apiReady) {
        this.processQueue();
      }
    });
  }
}

// Export singleton instance
export const youtubeDurationReader = new YouTubeDurationReader();

// Helper function to format duration in seconds to MM:SS or HH:MM:SS
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}
