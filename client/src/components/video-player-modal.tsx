import { useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface VideoPlayerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoId: string | null;
  videoUrl: string;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export function VideoPlayerModal({ open, onOpenChange, videoId, videoUrl }: VideoPlayerModalProps) {
  const playerRef = useRef<any>(null);
  const playerDivRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !videoId) return;

    const initPlayer = () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }

      if (!window.YT || !window.YT.Player) {
        setTimeout(initPlayer, 100);
        return;
      }

      playerRef.current = new window.YT.Player(`yt-player-${videoId}`, {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: (event: any) => {
            const qualities = event.target.getAvailableQualityLevels();
            if (qualities.length > 0) {
              event.target.setPlaybackQuality(qualities[0]);
            }
          },
        },
      });
    };

    initPlayer();

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [open, videoId]);

  if (!videoId) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl p-0 bg-black">
          <div className="aspect-video">
            <iframe
              src={videoUrl}
              className="w-full h-full border-none"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 bg-black">
        <div className="aspect-video">
          <div 
            ref={playerDivRef}
            id={`yt-player-${videoId}`} 
            className="w-full h-full"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
