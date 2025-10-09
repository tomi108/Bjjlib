import { useEffect } from 'react';

interface SchemaMarkupProps {
  schema: Record<string, any>;
}

export function SchemaMarkup({ schema }: SchemaMarkupProps) {
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schema);
    script.id = `schema-${Date.now()}`;
    document.head.appendChild(script);

    return () => {
      const existingScript = document.getElementById(script.id);
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, [schema]);

  return null;
}

export function generateVideoObjectSchema(video: {
  id: number;
  title: string;
  url: string;
  duration?: string | null;
  dateAdded: string;
  tags: Array<{ id: number; name: string }>;
}) {
  const youtubeMatch = video.url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([^&\n?#]+)/);
  const vimeoMatch = video.url.match(/vimeo\.com\/(\d+)/);
  
  const youtubeVideoId = youtubeMatch ? youtubeMatch[1] : null;
  const vimeoVideoId = vimeoMatch ? vimeoMatch[1] : null;
  
  let thumbnailUrl: string | undefined;
  if (youtubeVideoId) {
    thumbnailUrl = `https://img.youtube.com/vi/${youtubeVideoId}/maxresdefault.jpg`;
  } else if (vimeoVideoId) {
    thumbnailUrl = `https://vumbnail.com/${vimeoVideoId}.jpg`;
  }

  let embedUrl: string | undefined;
  if (youtubeVideoId) {
    embedUrl = `https://www.youtube.com/embed/${youtubeVideoId}`;
  } else if (vimeoVideoId) {
    embedUrl = `https://player.vimeo.com/video/${vimeoVideoId}`;
  }

  const durationISO = video.duration
    ? convertDurationToISO8601(video.duration)
    : undefined;

  let uploadDate: string;
  try {
    uploadDate = new Date(video.dateAdded).toISOString();
  } catch {
    uploadDate = new Date().toISOString();
  }

  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "name": video.title,
    "description": `BJJ technique video: ${video.title}${video.tags.length > 0 ? ` - Tags: ${video.tags.map(t => t.name).join(', ')}` : ''}`,
    "thumbnailUrl": thumbnailUrl,
    "uploadDate": uploadDate,
    "duration": durationISO,
    "embedUrl": embedUrl,
    "contentUrl": video.url,
    "author": {
      "@type": "Organization",
      "name": "Bjjlib",
      "url": "https://bjjlib.com"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Bjjlib",
      "url": "https://bjjlib.com"
    },
    "keywords": video.tags.map(t => t.name).join(', ') || 'bjj, brazilian jiu jitsu, training',
  };
}

export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Bjjlib",
    "url": "https://bjjlib.com",
    "logo": "https://bjjlib.com/favicon.svg",
    "description": "BJJ training video library platform for clubs and gyms. Organize techniques, submissions, and sweeps for your Brazilian Jiu-Jitsu training.",
    "sameAs": [],
  };
}

export function generateSoftwareApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Bjjlib",
    "applicationCategory": "EducationalApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": "BJJ training video library platform for clubs and gyms. Organize and share Brazilian Jiu-Jitsu techniques, submissions, and sweeps with your team.",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "5",
      "ratingCount": "1"
    }
  };
}

export function generateItemListSchema(videos: Array<{
  id: number;
  title: string;
  url: string;
  dateAdded: Date | string;
}>) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": videos.slice(0, 10).map((video, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "VideoObject",
        "name": video.title,
        "url": `https://bjjlib.com/?video=${video.id}`,
        "uploadDate": video.dateAdded instanceof Date 
          ? video.dateAdded.toISOString()
          : new Date(video.dateAdded).toISOString(),
      }
    }))
  };
}

function convertDurationToISO8601(duration: string): string | undefined {
  if (!duration || duration === '--:--') return undefined;
  
  const parts = duration.split(':').map(Number);
  
  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    if (isNaN(minutes) || isNaN(seconds)) return undefined;
    return `PT${minutes}M${seconds}S`;
  } else if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return undefined;
    return `PT${hours}H${minutes}M${seconds}S`;
  }
  
  return undefined;
}
