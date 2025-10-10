import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { insertVideoSchema, InsertVideo, Tag } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Plus, PlusCircle, X, Upload, Link as LinkIcon } from "lucide-react";

interface VideoFormProps {
  onVideoAdded: () => void;
  tags: Tag[];
}

export function VideoForm({ onVideoAdded, tags }: VideoFormProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedTagName, setSelectedTagName] = useState<string>("");
  const [uploadMode, setUploadMode] = useState<'url' | 'file'>('url');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InsertVideo>({
    resolver: zodResolver(insertVideoSchema),
    defaultValues: {
      title: "",
      url: "",
      tags: [],
    },
  });

  const createVideoMutation = useMutation({
    mutationFn: async (data: InsertVideo) => {
      const response = await apiRequest("POST", "/api/videos", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Video added successfully",
        description: "Your video has been added to the library",
      });
      form.reset();
      setSelectedTags([]);
      setSelectedTagName("");
      onVideoAdded();
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error adding video",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addTag = () => {
    if (selectedTagName && !selectedTags.includes(selectedTagName)) {
      setSelectedTags([...selectedTags, selectedTagName]);
      setSelectedTagName("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setSelectedTags(selectedTags.filter(tag => tag !== tagToRemove));
  };

  const uploadVideoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('video', file);
      formData.append('clubId', 'default'); // Can be made dynamic later
      
      setUploadProgress(10);
      
      const response = await fetch('/api/videos/upload', {
        method: 'POST',
        body: formData,
      });
      
      setUploadProgress(90);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }
      
      setUploadProgress(100);
      return response.json();
    },
    onError: (error: Error) => {
      setUploadProgress(0);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: InsertVideo) => {
    try {
      let videoUrl = data.url;
      let thumbnailUrl: string | undefined;
      
      // If file upload mode, upload to Cloudinary first
      if (uploadMode === 'file' && selectedFile) {
        const uploadResult = await uploadVideoMutation.mutateAsync(selectedFile);
        videoUrl = uploadResult.videoUrl;
        thumbnailUrl = uploadResult.thumbnailUrl;
        
        // Set the URL in form state for validation
        form.setValue('url', videoUrl, { shouldValidate: true });
      }
      
      // Validate we have a URL (from either mode)
      if (!videoUrl) {
        toast({
          title: "Missing video URL",
          description: "Please provide a video URL or upload a file",
          variant: "destructive",
        });
        return;
      }
      
      // Create video entry with URL and optional thumbnail
      createVideoMutation.mutate({
        title: data.title,
        url: videoUrl,
        thumbnailUrl: thumbnailUrl,
        tags: selectedTags,
      });
    } catch (error) {
      // Error already handled by uploadVideoMutation
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          Add New Video
          <PlusCircle className="w-5 h-5 text-primary" />
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Video Title <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Kimura from Side Control"
                      {...field}
                      data-testid="input-video-title"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <FormLabel>Video Source</FormLabel>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={uploadMode === 'url' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setUploadMode('url')}
                  data-testid="button-url-mode"
                >
                  <LinkIcon className="w-4 h-4 mr-2" />
                  URL
                </Button>
                <Button
                  type="button"
                  variant={uploadMode === 'file' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setUploadMode('file')}
                  data-testid="button-file-mode"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload File
                </Button>
              </div>
            </div>

            {uploadMode === 'url' ? (
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Video URL <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://youtube.com/watch?v=..."
                        {...field}
                        data-testid="input-video-url"
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      YouTube, Vimeo, or direct video link
                    </p>
                  </FormItem>
                )}
              />
            ) : (
              <div className="space-y-3">
                <FormLabel>
                  Upload Video File <span className="text-destructive">*</span>
                </FormLabel>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                  <Input
                    type="file"
                    accept="video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setSelectedFile(file);
                        form.setValue('url', ''); // Clear URL when file is selected
                      }
                    }}
                    className="hidden"
                    id="video-file-input"
                    data-testid="input-video-file"
                  />
                  <label
                    htmlFor="video-file-input"
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <div className="text-sm">
                      {selectedFile ? (
                        <span className="font-medium text-foreground">{selectedFile.name}</span>
                      ) : (
                        <>
                          <span className="text-primary font-medium">Choose a video file</span>
                          <span className="text-muted-foreground"> or drag and drop</span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      MP4, MOV, or AVI (max 100MB)
                    </p>
                  </label>
                </div>
                
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} />
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <FormLabel>Tags</FormLabel>
              <div className="flex gap-2">
                <Select value={selectedTagName} onValueChange={setSelectedTagName}>
                  <SelectTrigger className="flex-1" data-testid="select-tag">
                    <SelectValue placeholder="Select a tag..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tags
                      .filter(tag => !selectedTags.includes(tag.name))
                      .map(tag => (
                        <SelectItem key={tag.id} value={tag.name}>
                          {tag.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  onClick={addTag}
                  disabled={!selectedTagName || selectedTags.includes(selectedTagName)}
                  data-testid="button-add-tag"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {selectedTags.map((tag) => (
                    <Badge 
                      key={tag} 
                      variant="secondary" 
                      className="flex items-center gap-1.5"
                      data-testid={`badge-selected-tag-${tag}`}
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:text-destructive"
                        aria-label={`Remove ${tag} tag`}
                        data-testid={`button-remove-tag-${tag}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 flex gap-3">
              <Button
                type="submit"
                className="flex-1"
                disabled={createVideoMutation.isPending}
                data-testid="button-submit-video"
              >
                {createVideoMutation.isPending ? (
                  "Adding..."
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Video
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  setSelectedTags([]);
                  setSelectedTagName("");
                }}
                data-testid="button-reset-form"
              >
                Reset
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
