import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Video, Tag } from "@shared/schema";
import { VideoCard } from "@/components/video-card";
import { VideoForm } from "@/components/video-form";
import { TagManager } from "@/components/tag-manager";
import { VideoTable } from "@/components/video-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Video as VideoIcon, Settings, Search, Heart, Keyboard } from "lucide-react";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("browse");

  const { data: videos = [], isLoading: videosLoading, refetch: refetchVideos } = useQuery<Video[]>({
    queryKey: ["/api/videos"],
  });

  const { data: tags = [], isLoading: tagsLoading, refetch: refetchTags } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
  });

  const { data: healthData } = useQuery<{ status: string; timestamp: string }>({
    queryKey: ["/api/health"],
    refetchInterval: 30000,
  });

  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         video.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTags = selectedTags.length === 0 || 
                       selectedTags.some(tag => video.tags?.includes(tag));
    return matchesSearch && matchesTags;
  });

  const toggleTag = (tagName: string) => {
    setSelectedTags(prev => 
      prev.includes(tagName) 
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedTags([]);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      switch (e.key.toLowerCase()) {
        case 'b':
          setActiveTab("browse");
          break;
        case 'a':
          setActiveTab("admin");
          break;
        case '/':
          e.preventDefault();
          document.getElementById('search-input')?.focus();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isHealthy = healthData?.status === "healthy";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold text-lg">
                <VideoIcon className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Bjjlib</h1>
                <p className="text-xs text-muted-foreground">BJJ Video Library</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/10 border border-border">
                <span className="relative flex h-2 w-2">
                  {isHealthy ? (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </>
                  ) : (
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  API {isHealthy ? 'Healthy' : 'Unhealthy'}
                </span>
              </div>
              
              <Button variant="outline" size="sm" className="hidden md:flex items-center gap-2" data-testid="button-shortcuts">
                <Keyboard className="w-4 h-4" />
                <span className="text-xs">Shortcuts</span>
                <kbd className="kbd-shortcut">?</kbd>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="browse" className="flex items-center gap-2" data-testid="tab-browse">
              <VideoIcon className="w-4 h-4" />
              Browse
              <kbd className="kbd-shortcut ml-1">B</kbd>
            </TabsTrigger>
            <TabsTrigger value="admin" className="flex items-center gap-2" data-testid="tab-admin">
              <Settings className="w-4 h-4" />
              Admin
              <kbd className="kbd-shortcut ml-1">A</kbd>
            </TabsTrigger>
          </TabsList>

          {/* Browse Tab */}
          <TabsContent value="browse" className="mt-8">
            <div className="mb-8 space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Video Library</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {videos.length} videos available
                  </p>
                </div>
                
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="search-input"
                    type="search"
                    placeholder="Search videos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search"
                  />
                </div>
              </div>
              
              {/* Tag Filter */}
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm font-medium text-muted-foreground">Filter by tag:</span>
                {tags.map(tag => (
                  <Badge
                    key={tag.id}
                    variant={selectedTags.includes(tag.name) ? "default" : "outline"}
                    className="cursor-pointer transition-colors hover:bg-primary hover:text-primary-foreground"
                    onClick={() => toggleTag(tag.name)}
                    data-testid={`tag-filter-${tag.name}`}
                  >
                    {tag.name}
                  </Badge>
                ))}
                {(searchQuery || selectedTags.length > 0) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-muted-foreground hover:text-foreground"
                    data-testid="button-clear-filters"
                  >
                    Clear all
                  </Button>
                )}
              </div>
            </div>

            {/* Video Grid */}
            {videosLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-card rounded-lg border border-border overflow-hidden">
                    <div className="w-full h-48 bg-muted animate-pulse" />
                    <div className="p-4 space-y-2">
                      <div className="h-4 bg-muted animate-pulse rounded" />
                      <div className="h-3 bg-muted animate-pulse rounded w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredVideos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVideos.map(video => (
                  <VideoCard key={video.id} video={video} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/20 mb-4">
                  <Search className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No videos found</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  {videos.length === 0 
                    ? "No videos have been added yet. Switch to the Admin tab to add your first video."
                    : "Try adjusting your filters or search terms"
                  }
                </p>
                {(searchQuery || selectedTags.length > 0) && (
                  <Button onClick={clearFilters} data-testid="button-clear-filters-empty">
                    Clear all filters
                  </Button>
                )}
              </div>
            )}
          </TabsContent>

          {/* Admin Tab */}
          <TabsContent value="admin" className="mt-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <VideoForm onVideoAdded={() => { refetchVideos(); refetchTags(); }} tags={tags} />
              <TagManager onTagsChanged={() => { refetchTags(); refetchVideos(); }} tags={tags} />
            </div>
            
            {videos.length > 0 ? (
              <VideoTable 
                videos={videos} 
                onVideoDeleted={() => { refetchVideos(); refetchTags(); }}
                onVideoUpdated={() => { refetchVideos(); refetchTags(); }}
              />
            ) : (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted/20 mb-4">
                  <VideoIcon className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">No videos yet</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                  Get started by adding your first BJJ technique video using the form above
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              <strong className="font-medium text-foreground">Bjjlib</strong> - BJJ Video Library Management
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a 
                href="/api/health" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring rounded px-2 py-1 flex items-center gap-1"
                data-testid="link-health-check"
              >
                <Heart className="w-3 h-3" />
                Health Check
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
