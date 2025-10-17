import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { insertVideoSchema, InsertVideo, VideoWithTags, Tag, TAG_CATEGORIES } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TagAutosuggest } from "@/components/tag-autosuggest";
import { Trash2, X, VideoIcon, Loader2, Pencil, Tags } from "lucide-react";
import { Link } from "wouter";

async function fetchYouTubeTitle(url: string): Promise<string | null> {
  try {
    const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.title || null;
  } catch {
    return null;
  }
}

interface AdminTabProps {
  isAdmin: boolean;
}

export function AdminTab({ isAdmin }: AdminTabProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isFetchingTitle, setIsFetchingTitle] = useState(false);
  const [password, setPassword] = useState("");
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

  const urlValue = form.watch("url");
  const titleValue = form.watch("title");

  useEffect(() => {
    const fetchTitle = async () => {
      if (!urlValue || titleValue) return;
      
      const isYouTube = urlValue.includes("youtube.com") || urlValue.includes("youtu.be");
      if (!isYouTube) return;

      setIsFetchingTitle(true);
      const title = await fetchYouTubeTitle(urlValue);
      
      const currentTitle = form.getValues("title");
      if (title && !currentTitle) {
        form.setValue("title", title);
      }
      setIsFetchingTitle(false);
    };

    const timeoutId = setTimeout(fetchTitle, 500);
    return () => clearTimeout(timeoutId);
  }, [urlValue, titleValue, form]);

  const { data: videosData } = useQuery<{ videos: VideoWithTags[]; total: number }>({
    queryKey: ["/api/videos", { page: 1, limit: 1000 }],
    queryFn: async () => {
      const response = await fetch("/api/videos?page=1&limit=1000");
      if (!response.ok) throw new Error("Failed to fetch videos");
      return response.json();
    },
  });

  const { data: allTags = [] } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
  });

  const videos = videosData?.videos || [];

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

  const deleteVideoMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/videos/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Video deleted",
        description: "The video has been removed from the library",
      });
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

  const loginMutation = useMutation({
    mutationFn: async (password: string) => {
      const response = await apiRequest("POST", "/api/admin/login", { password });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Login successful",
        description: "You are now logged in as admin",
      });
      setPassword("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/session"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/logout", {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Logged out",
        description: "You have been logged out",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/session"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addTag = (tagName: string) => {
    const normalizedTag = tagName.toLowerCase().trim();
    if (normalizedTag && !selectedTags.includes(normalizedTag)) {
      setSelectedTags([...selectedTags, normalizedTag]);
    }
  };

  const removeTag = (tag: string) => {
    setSelectedTags(selectedTags.filter(t => t !== tag));
  };

  const onSubmit = (data: InsertVideo) => {
    createVideoMutation.mutate({
      ...data,
      tags: selectedTags,
    });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password) {
      loginMutation.mutate(password);
    }
  };

  if (!isAdmin) {
    return (
      <Card className="bg-gray-900 border-gray-800 max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Admin Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="admin-password" className="block text-sm font-medium mb-2">
                Password
              </label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="bg-gray-800 border-gray-700 focus:border-blue-600 focus:ring-blue-600"
                data-testid="input-admin-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loginMutation.isPending || !password}
              data-testid="button-login"
            >
              {loginMutation.isPending ? "Logging in..." : "Login"}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <Button
          onClick={() => logoutMutation.mutate()}
          variant="outline"
          className="border-gray-700 hover:bg-gray-800"
          disabled={logoutMutation.isPending}
          data-testid="button-logout"
        >
          {logoutMutation.isPending ? "Logging out..." : "Logout"}
        </Button>
      </div>
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle>Add New Video</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="e.g., Kimura from Side Control"
                          {...field}
                          className="bg-gray-800 border-gray-700 focus:border-blue-600 focus:ring-blue-600"
                          data-testid="input-video-title"
                        />
                        {isFetchingTitle && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                    {isFetchingTitle && (
                      <p className="text-xs text-blue-400">Fetching title from YouTube...</p>
                    )}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Video URL *</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://youtube.com/watch?v=..."
                        {...field}
                        className="bg-gray-800 border-gray-700 focus:border-blue-600 focus:ring-blue-600"
                        data-testid="input-video-url"
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-gray-400">YouTube or Vimeo URL - Title auto-fills from YouTube if empty</p>
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>Tags</FormLabel>
                <TagAutosuggest
                  allTags={allTags}
                  selectedTags={selectedTags}
                  onAddTag={addTag}
                  placeholder="Type to search or create new tag..."
                  className="bg-gray-800 border-gray-700 focus:border-blue-600 focus:ring-blue-600"
                  testId="input-tag"
                  allowNewTags={true}
                />
                <p className="text-xs text-gray-400">
                  Multi-word tags supported (e.g., "side control", "closed guard"). Press Enter to add.
                </p>
                
                {selectedTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedTags.map((tag) => (
                      <Badge
                        key={tag}
                        className="bg-blue-600 hover:bg-blue-700 cursor-pointer"
                        onClick={() => removeTag(tag)}
                        data-testid={`selected-tag-${tag}`}
                      >
                        {tag}
                        <X className="w-3 h-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={createVideoMutation.isPending}
                  data-testid="button-submit-video"
                >
                  {createVideoMutation.isPending ? "Adding..." : "Add Video"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    form.reset();
                    setSelectedTags([]);
                  }}
                  className="border-gray-700 hover:bg-gray-800"
                  data-testid="button-reset-form"
                >
                  Reset
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle>All Videos ({videos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {videos.length === 0 ? (
            <div className="text-center py-16">
              <VideoIcon className="w-16 h-16 text-gray-700 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No videos yet</h3>
              <p className="text-sm text-gray-400">Add your first video using the form above</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800">
                    <TableHead className="text-gray-400">Title</TableHead>
                    <TableHead className="text-gray-400">Tags</TableHead>
                    <TableHead className="text-gray-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {videos.map(video => (
                    <TableRow key={video.id} className="border-gray-800" data-testid={`video-row-${video.id}`}>
                      <TableCell>
                        <div className="font-medium" data-testid={`video-title-${video.id}`}>{video.title}</div>
                        <a
                          href={video.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline"
                        >
                          {video.url}
                        </a>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {video.tags.map(tag => (
                            <Badge key={tag.id} variant="secondary" className="text-xs bg-gray-800">
                              {tag.name}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Link href={`/edit/${video.id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-400 hover:text-blue-500"
                              data-testid={`button-edit-video-${video.id}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </Link>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-gray-400 hover:text-red-500"
                                data-testid={`button-delete-video-${video.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-gray-900 border-gray-800">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Video</AlertDialogTitle>
                                <AlertDialogDescription className="text-gray-400">
                                  Are you sure you want to delete "{video.title}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="border-gray-700 hover:bg-gray-800">Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteVideoMutation.mutate(video.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                  data-testid={`button-confirm-delete-video-${video.id}`}
                                >
                                  Delete
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
          )}
        </CardContent>
      </Card>

      <TagManagerCard allTags={allTags} />
    </div>
  );
}

function TagManagerCard({ allTags }: { allTags: Tag[] }) {
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateTagMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: { name?: string; category?: string | null } }) => {
      const response = await apiRequest("PUT", `/api/admin/tags/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Tag updated",
        description: "The tag has been updated successfully",
      });
      setEditingTag(null);
      setNewName("");
      setNewCategory(null);
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating tag",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/tags/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Tag deleted",
        description: "The tag has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting tag",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const groupedTags = allTags.reduce((acc, tag) => {
    const category = tag.category || "uncategorized";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(tag);
    return acc;
  }, {} as Record<string, Tag[]>);

  const categoryOrder = [...TAG_CATEGORIES, "uncategorized"];
  const sortedCategories = categoryOrder.filter(cat => groupedTags[cat]?.length > 0);

  const handleEditTag = (tag: Tag) => {
    setEditingTag(tag);
    setNewName(tag.name);
    setNewCategory(tag.category || null);
  };

  const handleSaveTag = () => {
    if (!editingTag) return;
    
    const updates: { name?: string; category?: string | null } = {};
    if (newName && newName !== editingTag.name) {
      updates.name = newName;
    }
    if (newCategory !== editingTag.category) {
      updates.category = newCategory;
    }

    if (Object.keys(updates).length > 0) {
      updateTagMutation.mutate({ id: editingTag.id, updates });
    } else {
      setEditingTag(null);
    }
  };

  const handleQuickCategoryChange = (tag: Tag, category: string | null) => {
    updateTagMutation.mutate({ 
      id: tag.id, 
      updates: { category } 
    });
  };

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tags className="w-5 h-5" />
          Tag Manager ({allTags.length} tags)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {allTags.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No tags yet. Tags are created when you add videos.
          </div>
        ) : (
          <div className="space-y-6">
            {sortedCategories.map(category => (
              <div key={category} className="space-y-2">
                <h3 className="text-sm font-semibold text-blue-400 uppercase">
                  {category}
                </h3>
                <div className="grid gap-2">
                  {groupedTags[category].map(tag => (
                    <div
                      key={tag.id}
                      className="flex items-center gap-2 p-3 bg-gray-800 rounded-lg border border-gray-700"
                      data-testid={`tag-item-${tag.id}`}
                    >
                      <Badge className="bg-blue-600">{tag.name}</Badge>
                      
                      <div className="flex-1 flex items-center gap-2">
                        <Select
                          value={tag.category || "uncategorized"}
                          onValueChange={(value) => handleQuickCategoryChange(tag, value === "uncategorized" ? null : value)}
                          disabled={updateTagMutation.isPending}
                        >
                          <SelectTrigger className="w-[140px] h-8 bg-gray-900 border-gray-600 text-xs" data-testid={`select-category-${tag.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-900 border-gray-700">
                            {TAG_CATEGORIES.map(cat => (
                              <SelectItem key={cat} value={cat} className="text-xs">
                                {cat}
                              </SelectItem>
                            ))}
                            <SelectItem value="uncategorized" className="text-xs">
                              uncategorized
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex gap-1">
                        <Dialog open={editingTag?.id === tag.id} onOpenChange={(open) => !open && setEditingTag(null)}>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-400 hover:text-blue-500"
                              onClick={() => handleEditTag(tag)}
                              data-testid={`button-edit-tag-${tag.id}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-gray-900 border-gray-800">
                            <DialogHeader>
                              <DialogTitle>Edit Tag</DialogTitle>
                              <DialogDescription className="text-gray-400">
                                Rename this tag or change its category. Changes will apply to all videos.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Tag Name</label>
                                <Input
                                  value={newName}
                                  onChange={(e) => setNewName(e.target.value)}
                                  className="bg-gray-800 border-gray-700"
                                  placeholder="Tag name"
                                  data-testid="input-edit-tag-name"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Category</label>
                                <Select
                                  value={newCategory || "uncategorized"}
                                  onValueChange={(value) => setNewCategory(value === "uncategorized" ? null : value)}
                                >
                                  <SelectTrigger className="bg-gray-800 border-gray-700" data-testid="select-edit-tag-category">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-gray-900 border-gray-700">
                                    {TAG_CATEGORIES.map(cat => (
                                      <SelectItem key={cat} value={cat}>
                                        {cat}
                                      </SelectItem>
                                    ))}
                                    <SelectItem value="uncategorized">
                                      uncategorized
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => setEditingTag(null)}
                                className="border-gray-700 hover:bg-gray-800"
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={handleSaveTag}
                                className="bg-blue-600 hover:bg-blue-700"
                                disabled={updateTagMutation.isPending || !newName}
                                data-testid="button-save-tag"
                              >
                                {updateTagMutation.isPending ? "Saving..." : "Save"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-400 hover:text-red-500"
                              data-testid={`button-delete-tag-${tag.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-gray-900 border-gray-800">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Tag</AlertDialogTitle>
                              <AlertDialogDescription className="text-gray-400">
                                Are you sure you want to delete "{tag.name}"? This will remove it from all videos.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-gray-700 hover:bg-gray-800">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteTagMutation.mutate(tag.id)}
                                className="bg-red-600 hover:bg-red-700"
                                data-testid={`button-confirm-delete-tag-${tag.id}`}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
