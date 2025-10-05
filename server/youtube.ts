const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

export function getYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

export function formatYouTubeDuration(duration: string): string {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "";

  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  const seconds = parseInt(match[3] || "0");

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  } else {
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }
}

export async function fetchYouTubeDuration(url: string): Promise<string | null> {
  if (!YOUTUBE_API_KEY) {
    console.warn("YouTube API key not configured - skipping duration fetch");
    return null;
  }

  const videoId = getYouTubeVideoId(url);
  if (!videoId) {
    return null;
  }

  try {
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=contentDetails&key=${YOUTUBE_API_KEY}`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      console.error(`YouTube API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      console.warn(`No video found for ID: ${videoId}`);
      return null;
    }

    const duration = data.items[0].contentDetails?.duration;
    if (!duration) return null;

    return formatYouTubeDuration(duration);
  } catch (error) {
    console.error("Error fetching YouTube duration:", error);
    return null;
  }
}
