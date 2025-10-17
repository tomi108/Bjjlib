import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { insertVideoSchema, InsertVideo, VideoWithTags, Tag, CategoryWithTags } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { TagAutosuggest } from "@/components/tag-autosuggest";
import { Trash2, X, VideoIcon, Loader2, Pencil, Plus, ChevronUp, ChevronDown, FolderOpen } from "lucide-react";
import { Link } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

  const { data: tagCategories = [] } = useQuery<CategoryWithTags[]>({
    queryKey: ["/api/tag-categories"],
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

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Tag Categories</CardTitle>
            <TagCategoryManager 
              tagCategories={tagCategories} 
              allTags={allTags}
              queryClient={queryClient}
              toast={toast}
            />
          </div>
        </CardHeader>
        <CardContent>
          {tagCategories.length === 0 ? (
            <div className="text-center py-16">
              <FolderOpen className="w-16 h-16 text-gray-700 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No categories yet</h3>
              <p className="text-sm text-gray-400">Create categories to organize your tags</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tagCategories.map((category, index) => (
                <CategoryRow
                  key={category.id}
                  category={category}
                  allTags={allTags}
                  isFirst={index === 0}
                  isLast={index === tagCategories.length - 1}
                  queryClient={queryClient}
                  toast={toast}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface TagCategoryManagerProps {
  tagCategories: CategoryWithTags[];
  allTags: Tag[];
  queryClient: any;
  toast: any;
}

function TagCategoryManager({ queryClient, toast }: TagCategoryManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const createCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("POST", "/api/tag-categories", {
        name,
        displayOrder: 0,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Category created",
        description: "The tag category has been created successfully",
      });
      setNewCategoryName("");
      setIsCreating(false);
      queryClient.invalidateQueries({ queryKey: ["/api/tag-categories"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating category",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    if (newCategoryName.trim()) {
      createCategoryMutation.mutate(newCategoryName.trim());
    }
  };

  if (isCreating) {
    return (
      <div className="flex gap-2">
        <Input
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder="Category name..."
          className="bg-gray-800 border-gray-700 w-48"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
            if (e.key === "Escape") setIsCreating(false);
          }}
          autoFocus
          data-testid="input-new-category"
        />
        <Button
          onClick={handleCreate}
          disabled={!newCategoryName.trim() || createCategoryMutation.isPending}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700"
          data-testid="button-confirm-category"
        >
          {createCategoryMutation.isPending ? "Creating..." : "Create"}
        </Button>
        <Button
          onClick={() => {
            setIsCreating(false);
            setNewCategoryName("");
          }}
          variant="outline"
          size="sm"
          className="border-gray-700"
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={() => setIsCreating(true)}
      size="sm"
      className="bg-blue-600 hover:bg-blue-700"
      data-testid="button-add-category"
    >
      <Plus className="w-4 h-4 mr-1" />
      Add Category
    </Button>
  );
}

interface CategoryRowProps {
  category: CategoryWithTags;
  allTags: Tag[];
  isFirst: boolean;
  isLast: boolean;
  queryClient: any;
  toast: any;
}

function CategoryRow({ category, allTags, isFirst, isLast, queryClient, toast }: CategoryRowProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(category.name);

  const updateCategoryMutation = useMutation({
    mutationFn: async (updates: { name?: string; displayOrder?: number }) => {
      const response = await apiRequest("PATCH", `/api/tag-categories/${category.id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tag-categories"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating category",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/tag-categories/${category.id}`);
    },
    onSuccess: () => {
      toast({
        title: "Category deleted",
        description: "The category has been removed. Tags moved to uncategorized.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tag-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting category",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const moveTagMutation = useMutation({
    mutationFn: async ({ tagId, categoryId }: { tagId: number; categoryId: number | null }) => {
      const response = await apiRequest("PATCH", `/api/tags/${tagId}/category`, { categoryId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tag-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error moving tag",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const renameTagMutation = useMutation({
    mutationFn: async ({ tagId, newName }: { tagId: number; newName: string }) => {
      const response = await apiRequest("PATCH", `/api/tags/${tagId}/rename`, { newName });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Tag renamed",
        description: "The tag has been renamed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tag-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error renaming tag",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRename = () => {
    if (newName.trim() && newName !== category.name) {
      updateCategoryMutation.mutate({ name: newName.trim() });
    }
    setIsRenaming(false);
  };

  const handleMoveUp = () => {
    updateCategoryMutation.mutate({ displayOrder: category.displayOrder - 1 });
  };

  const handleMoveDown = () => {
    updateCategoryMutation.mutate({ displayOrder: category.displayOrder + 1 });
  };

  const uncategorizedTags = allTags.filter(tag => 
    !category.tags.some(ct => ct.id === tag.id) &&
    !tag.categoryId
  );

  return (
    <div className="border border-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isRenaming ? (
            <div className="flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="bg-gray-800 border-gray-700 w-48"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename();
                  if (e.key === "Escape") {
                    setIsRenaming(false);
                    setNewName(category.name);
                  }
                }}
                autoFocus
                data-testid={`input-rename-category-${category.id}`}
              />
              <Button
                onClick={handleRename}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
                data-testid={`button-confirm-rename-${category.id}`}
              >
                Save
              </Button>
              <Button
                onClick={() => {
                  setIsRenaming(false);
                  setNewName(category.name);
                }}
                variant="outline"
                size="sm"
                className="border-gray-700"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <>
              <h4 className="font-semibold">{category.name}</h4>
              <Button
                onClick={() => setIsRenaming(true)}
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                data-testid={`button-rename-category-${category.id}`}
              >
                <Pencil className="w-3 h-3" />
              </Button>
            </>
          )}
        </div>
        <div className="flex gap-1">
          <Button
            onClick={handleMoveUp}
            disabled={isFirst}
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            data-testid={`button-move-up-${category.id}`}
          >
            <ChevronUp className="w-4 h-4" />
          </Button>
          <Button
            onClick={handleMoveDown}
            disabled={isLast}
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            data-testid={`button-move-down-${category.id}`}
          >
            <ChevronDown className="w-4 h-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-red-500 hover:text-red-400"
                data-testid={`button-delete-category-${category.id}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-gray-900 border-gray-800">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Category</AlertDialogTitle>
                <AlertDialogDescription className="text-gray-400">
                  Are you sure you want to delete "{category.name}"? Tags in this category will be moved to uncategorized.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-gray-700 hover:bg-gray-800">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteCategoryMutation.mutate()}
                  className="bg-red-600 hover:bg-red-700"
                  data-testid={`button-confirm-delete-category-${category.id}`}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm text-gray-400 mb-2">Tags in this category ({category.tags.length})</p>
          <div className="flex flex-wrap gap-2">
            {category.tags.map(tag => (
              <TagPill
                key={tag.id}
                tag={tag}
                onRename={(newName) => renameTagMutation.mutate({ tagId: tag.id, newName })}
                onRemove={() => moveTagMutation.mutate({ tagId: tag.id, categoryId: null })}
                testIdPrefix={`category-${category.id}-tag`}
              />
            ))}
            {category.tags.length === 0 && (
              <p className="text-sm text-gray-500 italic">No tags yet</p>
            )}
          </div>
        </div>

        {uncategorizedTags.length > 0 && (
          <div>
            <p className="text-sm text-gray-400 mb-2">Add tags from uncategorized</p>
            <Select onValueChange={(value) => moveTagMutation.mutate({ tagId: parseInt(value), categoryId: category.id })}>
              <SelectTrigger className="bg-gray-800 border-gray-700 w-64" data-testid={`select-add-tag-${category.id}`}>
                <SelectValue placeholder="Select a tag..." />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {uncategorizedTags.map(tag => (
                  <SelectItem key={tag.id} value={tag.id.toString()}>
                    {tag.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}

interface TagPillProps {
  tag: Tag;
  onRename: (newName: string) => void;
  onRemove: () => void;
  testIdPrefix: string;
}

function TagPill({ tag, onRename, onRemove, testIdPrefix }: TagPillProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(tag.name);

  const handleRename = () => {
    if (newName.trim() && newName !== tag.name) {
      onRename(newName.trim());
    }
    setIsRenaming(false);
  };

  if (isRenaming) {
    return (
      <div className="flex gap-1 items-center">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="bg-gray-800 border-gray-700 text-sm h-7 w-32"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRename();
            if (e.key === "Escape") {
              setIsRenaming(false);
              setNewName(tag.name);
            }
          }}
          autoFocus
          data-testid={`${testIdPrefix}-rename-input-${tag.id}`}
        />
        <Button
          onClick={handleRename}
          size="sm"
          className="h-7 px-2 bg-blue-600 hover:bg-blue-700"
          data-testid={`${testIdPrefix}-rename-confirm-${tag.id}`}
        >
          ✓
        </Button>
        <Button
          onClick={() => {
            setIsRenaming(false);
            setNewName(tag.name);
          }}
          variant="ghost"
          size="sm"
          className="h-7 px-2"
        >
          ✕
        </Button>
      </div>
    );
  }

  return (
    <Badge
      className="bg-gray-800 text-gray-300 cursor-pointer hover:bg-gray-700 flex items-center gap-1"
      data-testid={`${testIdPrefix}-${tag.id}`}
    >
      <span>{tag.name}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsRenaming(true);
        }}
        className="hover:text-blue-400"
        data-testid={`${testIdPrefix}-rename-${tag.id}`}
      >
        <Pencil className="w-3 h-3" />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="hover:text-red-400"
        data-testid={`${testIdPrefix}-remove-${tag.id}`}
      >
        <X className="w-3 h-3" />
      </button>
    </Badge>
  );
}
