import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { VideoWithTags, Tag } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Search, X, ChevronLeft, ChevronRight, Video as VideoIcon, AlertCircle } from "lucide-react";
import { AdminTab } from "@/components/admin-tab";
import { TagAutosuggest } from "@/components/tag-autosuggest";

function getEmbedUrl(url: string): string | null {
  const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([^&\n?#]+)/);
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}?modestbranding=1&rel=0&showinfo=0`;
  }

  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}?title=0&byline=0&portrait=0`;
  }

  return null;
}

function isICloudUrl(url: string): boolean {
  return url.includes('icloud.com');
}

export default function Home() {
  const searchParams = new URLSearchParams(useSearch());
  const [, setLocation] = useLocation();

  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>(() => {
    const tagIds = searchParams.get("tags");
    return tagIds ? tagIds.split(",").map(Number).filter(n => !isNaN(n)) : [];
  });
  const [currentPage, setCurrentPage] = useState(() => {
    const page = parseInt(searchParams.get("page") || "1");
    return isNaN(page) ? 1 : page;
  });
  const [activeTab, setActiveTab] = useState("browse");
  const [inputValue, setInputValue] = useState(searchQuery);

  const updateUrl = (query: string, tags: number[], page: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (tags.length > 0) params.set("tags", tags.join(","));
    if (page > 1) params.set("page", page.toString());
    const newSearch = params.toString();
    setLocation(`/?${newSearch}`, { replace: true });
  };

  useEffect(() => {
    updateUrl(searchQuery, selectedTagIds, currentPage);
  }, [searchQuery, selectedTagIds, currentPage]);

  const { data: videosData, isLoading: videosLoading } = useQuery<{ videos: VideoWithTags[]; total: number }>({
    queryKey: ["/api/videos", { page: currentPage, search: searchQuery, tagIds: selectedTagIds }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", currentPage.toString());
      params.set("limit", "20");
      if (searchQuery) params.set("search", searchQuery);
      if (selectedTagIds.length > 0) params.set("tagIds", selectedTagIds.join(","));

      const response = await fetch(`/api/videos?${params}`);
      if (!response.ok) throw new Error("Failed to fetch videos");
      return response.json();
    },
  });

  const { data: availableTags = [] } = useQuery<Tag[]>({
    queryKey: ["/api/tags/co-occurring", selectedTagIds],
    queryFn: async () => {
      if (selectedTagIds.length === 0) {
        const response = await fetch("/api/tags");
        if (!response.ok) throw new Error("Failed to fetch tags");
        return response.json();
      }

      const params = new URLSearchParams();
      params.set("tagIds", selectedTagIds.join(","));
      const response = await fetch(`/api/tags/co-occurring?${params}`);
      if (!response.ok) throw new Error("Failed to fetch co-occurring tags");
      return response.json();
    },
  });

  const { data: allTags = [] } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
  });

  const videos = videosData?.videos || [];
  const totalVideos = videosData?.total || 0;
  const totalPages = Math.ceil(totalVideos / 20);

  const selectedTags = allTags.filter(tag => selectedTagIds.includes(tag.id));

  const toggleTag = (tagId: number) => {
    setSelectedTagIds(prev => {
      if (prev.includes(tagId)) {
        return prev.filter(id => id !== tagId);
      }
      return [...prev, tagId];
    });
    setCurrentPage(1);
  };

  const removeTag = (tagId: number) => {
    setSelectedTagIds(prev => prev.filter(id => id !== tagId));
    setCurrentPage(1);
  };

  const addTagByName = (tagName: string) => {
    const tag = allTags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
    if (tag && !selectedTagIds.includes(tag.id)) {
      setSelectedTagIds(prev => [...prev, tag.id]);
      setCurrentPage(1);
    }
  };

  const handleSearch = () => {
    setSearchQuery(inputValue);
    setCurrentPage(1);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const clearAll = () => {
    setInputValue("");
    setSearchQuery("");
    setSelectedTagIds([]);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <VideoIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Bjjlib</h1>
                <p className="text-xs text-gray-400">BJJ Video Library</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md bg-gray-900 border border-gray-800">
            <TabsTrigger value="browse" className="data-[state=active]:bg-blue-600" data-testid="tab-browse">
              Browse
            </TabsTrigger>
            <TabsTrigger value="admin" className="data-[state=active]:bg-blue-600" data-testid="tab-admin">
              Admin
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="mt-8">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              <aside className="lg:col-span-1 space-y-6">
                <div>
                  <label htmlFor="search" className="block text-sm font-medium mb-2">
                    Search by title
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="search"
                      type="text"
                      placeholder="Search..."
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="bg-gray-900 border-gray-800 focus:border-blue-600 focus:ring-blue-600"
                      data-testid="input-search"
                    />
                    <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-700" data-testid="button-search">
                      <Search className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Quick tag search
                  </label>
                  <TagAutosuggest
                    allTags={allTags}
                    selectedTags={selectedTags.map(t => t.name)}
                    onAddTag={addTagByName}
                    placeholder="Search tags..."
                    className="bg-gray-900 border-gray-800 focus:border-blue-600 focus:ring-blue-600"
                    testId="input-browse-tag-search"
                  />
                </div>

                {selectedTags.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Selected tags</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAll}
                        className="text-xs text-gray-400 hover:text-gray-100"
                        data-testid="button-clear-all"
                      >
                        Clear all
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedTags.map(tag => (
                        <button
                          key={tag.id}
                          onClick={() => removeTag(tag.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer transition-colors"
                          data-testid={`selected-tag-${tag.id}`}
                        >
                          {tag.name}
                          <X className="w-3 h-3" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-medium mb-2">Available tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map(tag => {
                      const isSelected = selectedTagIds.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          onClick={() => toggleTag(tag.id)}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-blue-600 hover:bg-blue-700 text-white"
                              : "border border-gray-700 hover:bg-gray-800 text-gray-300"
                          }`}
                          data-testid={`tag-filter-${tag.id}`}
                        >
                          {tag.name}
                        </button>
                      );
                    })}
                    {availableTags.length === 0 && selectedTagIds.length > 0 && (
                      <p className="text-sm text-gray-400">No co-occurring tags found</p>
                    )}
                  </div>
                </div>
              </aside>

              <div className="lg:col-span-3">
                {videosLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[...Array(4)].map((_, i) => (
                      <Card key={i} className="bg-gray-900 border-gray-800">
                        <div className="w-full h-48 bg-gray-800 animate-pulse" />
                        <CardContent className="p-4 space-y-2">
                          <div className="h-4 bg-gray-800 animate-pulse rounded" />
                          <div className="h-3 bg-gray-800 animate-pulse rounded w-3/4" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : videos.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {videos.map(video => {
                        const embedUrl = getEmbedUrl(video.url);
                        const isICloud = isICloudUrl(video.url);
                        return (
                          <Card key={video.id} className="bg-gray-900 border-gray-800 overflow-hidden" data-testid={`video-card-${video.id}`}>
                            <div className="relative w-full overflow-hidden" style={{ paddingBottom: "56.25%" }}>
                              {embedUrl ? (
                                <iframe
                                  src={embedUrl}
                                  className="absolute left-0 w-full h-[calc(100%+80px)]"
                                  style={{ top: "-60px" }}
                                  frameBorder="0"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                  title={video.title}
                                />
                              ) : (
                                <div className="absolute top-0 left-0 w-full h-full bg-gray-800 flex items-center justify-center">
                                  <div className="text-center p-4">
                                    <AlertCircle className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                                    {isICloud ? (
                                      <>
                                        <p className="text-sm font-medium text-gray-300 mb-1">iCloud videos cannot be embedded</p>
                                        <p className="text-xs text-gray-500 mb-3">Apple blocks embedding for security reasons</p>
                                        <a
                                          href={video.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-block px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                                        >
                                          View on iCloud
                                        </a>
                                      </>
                                    ) : (
                                      <>
                                        <p className="text-sm text-gray-400 mb-2">Cannot embed this URL</p>
                                        <p className="text-xs text-gray-500 mb-3">Supported: YouTube, Vimeo</p>
                                        <a
                                          href={video.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs text-blue-500 hover:underline"
                                        >
                                          Open in new tab
                                        </a>
                                      </>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            <CardContent className="p-4">
                              <h3 className="font-semibold mb-2" data-testid={`video-title-${video.id}`}>{video.title}</h3>
                              <div className="flex flex-wrap gap-1">
                                {video.tags.map(tag => (
                                  <span key={tag.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-300">
                                    {tag.name}
                                  </span>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>

                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-4 mt-8">
                        <Button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          variant="outline"
                          className="border-gray-700 hover:bg-gray-800"
                          data-testid="button-prev-page"
                        >
                          <ChevronLeft className="w-4 h-4 mr-1" />
                          Previous
                        </Button>
                        <span className="text-sm text-gray-400" data-testid="page-info">
                          Page {currentPage} of {totalPages}
                        </span>
                        <Button
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          variant="outline"
                          className="border-gray-700 hover:bg-gray-800"
                          data-testid="button-next-page"
                        >
                          Next
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-16">
                    <VideoIcon className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No videos found</h3>
                    <p className="text-sm text-gray-400 mb-6">
                      {searchQuery || selectedTagIds.length > 0
                        ? "Try adjusting your search or filters"
                        : "No videos have been added yet. Switch to Admin to add your first video."}
                    </p>
                    {(searchQuery || selectedTagIds.length > 0) && (
                      <Button onClick={clearAll} className="bg-blue-600 hover:bg-blue-700">
                        Clear filters
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="admin" className="mt-8">
            <AdminTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
