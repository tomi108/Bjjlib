import { useState, useEffect } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { VideoWithTags, Tag, insertVideoSchema, InsertVideo } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TagAutosuggest } from "@/components/tag-autosuggest";
import { ArrowLeft, Save, Loader2, X, Video as VideoIcon } from "lucide-react";

export default function EditVideo() {
  const [, params] = useRoute("/edit/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const videoId = params?.id ? parseInt(params.id) : null;

  const { data: adminStatus } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/session"],
  });

  const isAdmin = adminStatus?.isAdmin ?? false;

  const { data: video, isLoading: videoLoading } = useQuery<VideoWithTags>({
    queryKey: ["/api/videos", videoId],
    queryFn: async () => {
      const response = await fetch(`/api/videos/${videoId}`);
      if (!response.ok) throw new Error("Failed to fetch video");
      return response.json();
    },
    enabled: !!videoId,
  });

  const { data: allTags = [] } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
  });

  const form = useForm<InsertVideo>({
    resolver: zodResolver(insertVideoSchema.partial()),
    defaultValues: {
      title: "",
      url: "",
      tags: [],
    },
  });

  useEffect(() => {
    if (video) {
      form.reset({
        title: video.title,
        url: video.url,
        tags: video.tags.map(tag => tag.name),
      });
      setSelectedTags(video.tags.map(tag => tag.name));
    }
  }, [video, form]);

  useEffect(() => {
    if (!isAdmin && adminStatus) {
      toast({
        title: "Access denied",
        description: "You must be logged in as an admin to edit videos",
        variant: "destructive",
      });
      setLocation("/");
    }
  }, [isAdmin, adminStatus, setLocation, toast]);

  const updateVideoMutation = useMutation({
    mutationFn: async (data: Partial<InsertVideo>) => {
      const response = await apiRequest("PUT", `/api/videos/${videoId}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Video updated successfully",
        description: "Your changes have been saved",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating video",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertVideo) => {
    updateVideoMutation.mutate({
      title: data.title,
      tags: selectedTags,
    });
  };

  const addTag = (tagName: string) => {
    const normalized = tagName.toLowerCase().trim();
    if (normalized && !selectedTags.includes(normalized)) {
      const newTags = [...selectedTags, normalized];
      setSelectedTags(newTags);
      form.setValue("tags", newTags);
    }
  };

  const removeTag = (tagName: string) => {
    const newTags = selectedTags.filter(t => t !== tagName);
    setSelectedTags(newTags);
    form.setValue("tags", newTags);
  };

  if (videoLoading) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Video not found</h1>
          <Button onClick={() => setLocation("/")} className="bg-blue-600 hover:bg-blue-700">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" data-testid="link-home-logo">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <VideoIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Bjjlib</h1>
                <p className="text-xs text-gray-400">
                  Video Library of{" "}
                  <span
                    className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.open('http://www.bjj.sk/sk/Uvod', '_blank', 'noopener,noreferrer');
                    }}
                  >
                    Bjj.sk
                  </span>
                </p>
              </div>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="mb-4 hover:bg-gray-800"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Library
          </Button>
          <h1 className="text-3xl font-bold">Edit Video</h1>
        </div>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle>Video Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter video title"
                          className="bg-gray-800 border-gray-700"
                          data-testid="input-title"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <FormLabel>Video URL</FormLabel>
                  <Input
                    value={video.url}
                    disabled
                    className="bg-gray-800 border-gray-700 opacity-50 cursor-not-allowed"
                    data-testid="input-url-disabled"
                  />
                  <p className="text-xs text-gray-500">URL cannot be changed</p>
                </div>

                <div className="space-y-2">
                  <FormLabel>Tags</FormLabel>
                  {selectedTags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {selectedTags.map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer transition-colors"
                          data-testid={`tag-selected-${tag}`}
                        >
                          {tag}
                          <X className="w-3 h-3 ml-1" />
                        </button>
                      ))}
                    </div>
                  )}
                  <TagAutosuggest
                    allTags={allTags}
                    selectedTags={selectedTags}
                    onAddTag={addTag}
                    allowNewTags={true}
                    placeholder="Add tags..."
                    className="bg-gray-800 border-gray-700 focus:border-blue-600 focus:ring-blue-600"
                    testId="input-edit-tag-search"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    type="submit"
                    disabled={updateVideoMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                    data-testid="button-save"
                  >
                    {updateVideoMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation("/")}
                    className="border-gray-700 hover:bg-gray-800"
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
