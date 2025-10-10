import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Video } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit2, Trash2, Download, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface VideoTableProps {
  videos: Video[];
  onVideoDeleted: () => void;
  onVideoUpdated: () => void;
}

export function VideoTable({ videos, onVideoDeleted, onVideoUpdated }: VideoTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteVideoMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/videos/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Video deleted",
        description: "The video has been removed from the library",
      });
      onVideoDeleted();
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting video",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDeleteVideo = (id: string) => {
    deleteVideoMutation.mutate(id);
  };

  const handleEditVideo = (video: Video) => {
    // This would open an edit modal in a real implementation
    toast({
      title: "Edit functionality",
      description: "Edit video functionality would be implemented here",
    });
  };

  const handleExportVideos = () => {
    const dataStr = JSON.stringify(videos, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bjjlib-videos-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Videos exported",
      description: "Your video library has been exported as JSON",
    });
  };

  const getVideoThumbnail = (url: string, thumbnailUrl?: string | null) => {
    // Prioritize Cloudinary thumbnail if available
    if (thumbnailUrl) {
      return thumbnailUrl;
    }
    
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    if (youtubeMatch) {
      return `https://img.youtube.com/vi/${youtubeMatch[1]}/default.jpg`;
    }
    return null;
  };

  return (
    <Card className="shadow-sm overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-bold">All Videos</CardTitle>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {videos.length} total videos
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportVideos}
            data-testid="button-export-videos"
          >
            <Download className="w-4 h-4 mr-1.5" />
            Export
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/5">
                <TableHead className="w-[40%]">Title</TableHead>
                <TableHead className="w-[25%]">Tags</TableHead>
                <TableHead className="w-[20%]">Date Added</TableHead>
                <TableHead className="w-[15%] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {videos.map(video => (
                <TableRow key={video.id} className="hover:bg-muted/5">
                  <TableCell className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-10 bg-muted/20 rounded overflow-hidden flex-shrink-0">
                        {getVideoThumbnail(video.url, video.thumbnailUrl) ? (
                          <img
                            src={getVideoThumbnail(video.url, video.thumbnailUrl)!}
                            alt={`Thumbnail for ${video.title}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20"></div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div 
                          className="font-medium text-foreground text-sm truncate"
                          data-testid={`text-video-title-${video.id}`}
                        >
                          {video.title}
                        </div>
                        <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                          <span className="truncate">{video.url}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => window.open(video.url, '_blank', 'noopener,noreferrer')}
                            data-testid={`button-open-video-${video.id}`}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {video.tags?.map((tag, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="text-xs"
                          data-testid={`badge-video-tag-${tag}`}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    <span data-testid={`text-video-date-${video.id}`}>
                      {formatDistanceToNow(new Date(video.dateAdded), { addSuffix: true })}
                    </span>
                  </TableCell>
                  
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditVideo(video)}
                        className="text-muted-foreground hover:text-foreground"
                        data-testid={`button-edit-video-${video.id}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-destructive"
                            data-testid={`button-delete-video-${video.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Video</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{video.title}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteVideo(video.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              data-testid={`button-confirm-delete-video-${video.id}`}
                            >
                              Delete Video
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
