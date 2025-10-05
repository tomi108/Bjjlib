import { VideoWithTags } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface VideoCardProps {
  video: VideoWithTags;
}

export function VideoCard({ video }: VideoCardProps) {
  const getVideoThumbnail = (url: string) => {
    // Extract YouTube video ID if it's a YouTube URL
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    if (youtubeMatch) {
      return `https://img.youtube.com/vi/${youtubeMatch[1]}/maxresdefault.jpg`;
    }
    
    // Default placeholder for other video URLs
    return `https://images.unsplash.com/photo-1555597408-26bc8e548a46?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=450`;
  };

  const handlePlayVideo = () => {
    window.open(video.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card className="video-card overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1">
      <div className="relative h-48 overflow-hidden bg-black">
        <img 
          src={getVideoThumbnail(video.url)}
          alt={`Thumbnail for ${video.title}`}
          className="w-full h-full object-cover object-center scale-[2.2] hover:scale-[2.25] transition-transform duration-300"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1555597408-26bc8e548a46?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=450`;
          }}
        />
        <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <Button
            size="sm"
            onClick={handlePlayVideo}
            className="bg-white/90 text-black hover:bg-white"
            data-testid={`button-play-${video.id}`}
          >
            <Play className="w-4 h-4 mr-1" />
            Play
          </Button>
        </div>
      </div>
      
      <CardContent className="p-4">
        <h3 className="font-semibold text-foreground mb-2 line-clamp-2" data-testid={`text-title-${video.id}`}>
          {video.title}
        </h3>
        
        {video.tags && video.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {video.tags.map((tag) => (
              <Badge 
                key={tag.id} 
                variant="secondary" 
                className="text-xs"
                data-testid={`badge-tag-${tag.name}`}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        )}
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span data-testid={`text-date-${video.id}`}>
            Added {formatDistanceToNow(new Date(video.dateAdded), { addSuffix: true })}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePlayVideo}
            className="text-primary hover:text-primary/80 h-auto p-1"
            data-testid={`button-watch-${video.id}`}
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            Watch
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
