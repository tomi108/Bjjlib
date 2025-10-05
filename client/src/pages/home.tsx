import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch, Link } from "wouter";
import { VideoWithTags, Tag } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, X, ChevronLeft, ChevronRight, Video as VideoIcon, AlertCircle, Play, LogIn, LogOut, Settings, Pencil } from "lucide-react";
import { TagAutosuggest } from "@/components/tag-autosuggest";
import { AdminTab } from "@/components/admin-tab";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function getEmbedUrl(url: string, autoplay: boolean = false): string | null {
  const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([^&\n?#]+)/);
  if (youtubeMatch) {
    const autoplayParam = autoplay ? '&autoplay=1' : '';
    return `https://www.youtube.com/embed/${youtubeMatch[1]}?modestbranding=1&rel=0&showinfo=0${autoplayParam}`;
  }

  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    const autoplayParam = autoplay ? '&autoplay=1' : '';
    return `https://player.vimeo.com/video/${vimeoMatch[1]}?title=0&byline=0&portrait=0${autoplayParam}`;
  }

  return null;
}

function getThumbnailUrl(url: string): string | null {
  const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([^&\n?#]+)/);
  if (youtubeMatch) {
    return `https://img.youtube.com/vi/${youtubeMatch[1]}/hqdefault.jpg`;
  }

  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://vumbnail.com/${vimeoMatch[1]}.jpg`;
  }

  return null;
}

function isICloudUrl(url: string): boolean {
  return url.includes('icloud.com');
}

export default function Home() {
  const searchParams = new URLSearchParams(useSearch());
  const [, setLocation] = useLocation();

  const [selectedTagIds, setSelectedTagIds] = useState<number[]>(() => {
    const tagIds = searchParams.get("tags");
    return tagIds ? tagIds.split(",").map(Number).filter(n => !isNaN(n)) : [];
  });
  const [currentPage, setCurrentPage] = useState(() => {
    const page = parseInt(searchParams.get("page") || "1");
    return isNaN(page) ? 1 : page;
  });

  const { data: adminStatus } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/session"],
  });

  const isAdmin = adminStatus?.isAdmin ?? false;
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogin = async () => {
    if (!loginPassword) {
      setLoginError("Password is required");
      return;
    }

    setIsLoggingIn(true);
    setLoginError("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: loginPassword }),
      });

      if (response.ok) {
        setShowLoginDialog(false);
        setLoginPassword("");
        window.location.reload();
      } else {
        setLoginError("Invalid password");
      }
    } catch (error) {
      setLoginError("Login failed. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await fetch("/api/admin/logout", {
        method: "POST",
      });
      window.location.reload();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const updateUrl = (tags: number[], page: number) => {
    const params = new URLSearchParams();
    if (tags.length > 0) params.set("tags", tags.join(","));
    if (page > 1) params.set("page", page.toString());
    const newSearch = params.toString();
    setLocation(`/?${newSearch}`, { replace: true });
  };

  useEffect(() => {
    updateUrl(selectedTagIds, currentPage);
  }, [selectedTagIds, currentPage]);

  const { data: videosData, isLoading: videosLoading } = useQuery<{ videos: VideoWithTags[]; total: number }>({
    queryKey: ["/api/videos", { page: currentPage, tagIds: selectedTagIds }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", currentPage.toString());
      params.set("limit", "20");
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

  const clearAll = () => {
    setSelectedTagIds([]);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div
              onClick={() => {
                setShowAdminPanel(false);
                setLocation('/');
              }}
              className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
              data-testid="link-home-logo"
            >
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
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button
                  onClick={() => setShowAdminPanel(!showAdminPanel)}
                  variant="outline"
                  className="border-gray-700 hover:bg-gray-800"
                  data-testid="button-admin-panel"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Admin Panel
                </Button>
              )}
              {isAdmin ? (
                <Button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  variant="outline"
                  className="border-gray-700 hover:bg-gray-800"
                  data-testid="button-logout"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {isLoggingOut ? "Logging out..." : "Logout"}
                </Button>
              ) : (
                <Button
                  onClick={() => setShowLoginDialog(true)}
                  className="hidden md:flex bg-blue-600 hover:bg-blue-700"
                  data-testid="button-login"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Login
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isAdmin && showAdminPanel && (
          <div className="mb-8">
            <AdminTab isAdmin={isAdmin} />
          </div>
        )}
        
        <div className="space-y-6 mb-8">
          <div className="max-w-md">
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
              {availableTags.filter(tag => !selectedTagIds.includes(tag.id)).map(tag => {
                return (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold cursor-pointer transition-colors border border-gray-700 hover:bg-gray-800 text-gray-300"
                    data-testid={`tag-filter-${tag.id}`}
                  >
                    {tag.name}
                  </button>
                );
              })}
              {availableTags.filter(tag => !selectedTagIds.includes(tag.id)).length === 0 && selectedTagIds.length > 0 && (
                <p className="text-sm text-gray-400">No co-occurring tags found</p>
              )}
            </div>
          </div>
        </div>

        <div>
          {videosLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {videos.map(video => {
                        const embedUrl = getEmbedUrl(video.url);
                        const embedUrlWithAutoplay = getEmbedUrl(video.url, true);
                        const thumbnailUrl = getThumbnailUrl(video.url);
                        const isICloud = isICloudUrl(video.url);
                        
                        const handlePlayClick = () => {
                          if (!embedUrlWithAutoplay) return;
                          
                          const fullscreenDiv = document.createElement('div');
                          fullscreenDiv.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:black;z-index:9999;';
                          
                          const closeBtn = document.createElement('button');
                          closeBtn.innerHTML = '✕';
                          closeBtn.style.cssText = 'position:absolute;top:20px;right:20px;z-index:10000;background:rgba(0,0,0,0.7);color:white;border:none;width:40px;height:40px;border-radius:50%;font-size:20px;cursor:pointer;';
                          closeBtn.onclick = () => document.body.removeChild(fullscreenDiv);
                          
                          const iframe = document.createElement('iframe');
                          iframe.src = embedUrlWithAutoplay;
                          iframe.style.cssText = 'width:100%;height:100%;border:none;';
                          iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
                          iframe.allowFullscreen = true;
                          iframe.setAttribute('playsinline', 'true');
                          
                          fullscreenDiv.appendChild(closeBtn);
                          fullscreenDiv.appendChild(iframe);
                          document.body.appendChild(fullscreenDiv);
                        };
                        
                        return (
                          <Card key={video.id} className="bg-gray-900 border-gray-800 overflow-hidden" data-testid={`video-card-${video.id}`}>
                            <div className="relative aspect-video w-full overflow-hidden group">
                              {embedUrl && thumbnailUrl ? (
                                <>
                                  <img
                                    src={thumbnailUrl}
                                    alt={video.title}
                                    className="absolute inset-0 w-full h-full object-cover scale-125"
                                    data-testid={`video-thumbnail-${video.id}`}
                                  />
                                  <button
                                    onClick={handlePlayClick}
                                    className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity cursor-pointer"
                                    data-testid={`play-button-${video.id}`}
                                  >
                                    <div className="w-7 h-7 rounded-full bg-blue-600 hover:bg-blue-700 hover:scale-110 flex items-center justify-center transition-all shadow-lg">
                                      <Play className="w-3.5 h-3.5 text-white ml-0.5" fill="white" />
                                    </div>
                                  </button>
                                </>
                              ) : (
                                <div className="absolute inset-0 w-full h-full bg-gray-800 flex items-center justify-center">
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
                              <div className="flex items-start justify-between mb-2">
                                <h3 className="font-semibold flex-1" data-testid={`video-title-${video.id}`}>{video.title}</h3>
                                {isAdmin && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setLocation(`/edit/${video.id}`)}
                                    className="ml-2 h-7 w-7 p-0 hover:bg-gray-800"
                                    data-testid={`button-edit-${video.id}`}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
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
                {selectedTagIds.length > 0
                  ? "Try adjusting your filters"
                  : "No videos have been added yet. Switch to Admin to add your first video."}
              </p>
              {selectedTagIds.length > 0 && (
                <Button onClick={clearAll} className="bg-blue-600 hover:bg-blue-700">
                  Clear filters
                </Button>
              )}
            </div>
          )}
        </div>
      </main>

      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent className="bg-gray-900 border-gray-800 text-gray-100">
          <DialogHeader>
            <DialogTitle>Admin Login</DialogTitle>
            <DialogDescription className="text-gray-400">
              Enter the admin password to access admin features
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Enter admin password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleLogin()}
                className="bg-gray-800 border-gray-700 focus:border-blue-600 focus:ring-blue-600"
                data-testid="input-password"
              />
            </div>
            {loginError && (
              <p className="text-sm text-red-500" data-testid="text-login-error">
                {loginError}
              </p>
            )}
            <Button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="w-full bg-blue-600 hover:bg-blue-700"
              data-testid="button-submit-login"
            >
              {isLoggingIn ? "Logging in..." : "Login"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
