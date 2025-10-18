# Video Library Application

## Overview

This is a full-stack video library management application designed to organize, browse, and manage video content with tagging capabilities. It features a modern UI built with shadcn/ui components and follows a clean monorepo architecture with shared schemas between client and server. The application aims to provide a robust solution for video content curation, including advanced thumbnail processing for optimal display and administrative tools for content management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React 18 with TypeScript
- Vite for build and development
- Wouter for client-side routing
- TanStack Query for server state management and caching
- shadcn/ui component library based on Radix UI
- Tailwind CSS for styling

**Design Decisions:**
- Component-based architecture with reusable UI components.
- Form validation using React Hook Form with Zod resolvers.
- Query client configured for efficient data fetching.
- Path aliases for clean imports.
- Authentication state managed via React Query with cookie-based sessions.
- Conditional rendering for admin features.
- Dynamic thumbnail processing for optimal display:
    - **Dynamic Over-Zoom:** Adjusts zoom based on detected black bar severity (severe >50% bars use 1.18x zoom, moderate 5-50% bars use 1.12x zoom, no bars ≤5% total have no over-zoom).
    - **Object-Position Offset:** Dynamically shifts `object-position` to eliminate residual borders on asymmetrically detected thumbnails.
    - **High-Resolution Thumbnails:** Prioritizes `maxresdefault.jpg` with a universal fallback chain.
    - Displays video duration overlay on thumbnails.

### Backend Architecture

**Technology Stack:**
- Express.js with Node.js and ES modules
- TypeScript for type safety
- Drizzle ORM for database interactions
- Sharp.js for image processing
- In-memory storage implementation with interface pattern for easy swapping

**Design Decisions:**
- RESTful API design.
- Storage abstraction using `IStorage` interface.
- Request/response logging middleware.
- Schema validation using Zod schemas derived from Drizzle tables.
- Health check endpoint.
- Cookie-based session management for admin authentication using httpOnly cookies.
- Thumbnail analysis endpoint (`/api/analyze-thumbnail`) for variance-based black bar detection (any color bars).
- **API 404 handling**: Catch-all middleware for non-existent `/api/*` routes returns proper JSON 404 responses (not HTML) to prevent SPA fallback interference.

### Database Architecture

**Technology Stack:**
- PostgreSQL as the primary database (via Neon serverless driver)
- Drizzle ORM for type-safe queries
- Drizzle Kit for schema migrations
- SQLite for local development (multi-database support)

**Schema Design:**
- `videos` table: Stores video metadata (title, URL, duration, tags array, timestamps).
- `tags` table: Manages tag taxonomy with video counts and category assignments.
- `categories` table: **NEW** - Stores category definitions with custom ordering (id, name, displayOrder).
- `admin_sessions` table: Stores admin session data.
- UUID primary keys.
- Array column type for video tags.
- Automatic timestamp generation.

**Design Rationale:**
- Array-based tags simplify queries.
- Tag count denormalization improves read performance.
- **Dynamic category system**: Categories moved from hardcoded constants to database table for full customization through admin panel.
- Category ordering controlled by `displayOrder` field for custom sorting.
- Shared schema definitions ensure type consistency.
- Production uses PostgreSQL for persistence, development uses SQLite.

### Development Environment

**Build System:**
- Vite for frontend bundling with HMR.
- esbuild for backend compilation.
- tsx for TypeScript execution in development.

**Configuration:**
- TypeScript strict mode enabled.
- Path resolution for monorepo structure.
- ESM-first module resolution.

## External Dependencies

### Core Framework Dependencies
- **Express.js**: Backend web server.
- **React**: Frontend UI library.
- **Vite**: Build tool.
- **TypeScript**: Type system.

### Database & ORM
- **@neondatabase/serverless**: Neon PostgreSQL driver.
- **drizzle-orm**: ORM for database queries.
- **drizzle-kit**: Schema migration tool.

### State Management & Data Fetching
- **@tanstack/react-query**: Server state management.

### Form Handling & Validation
- **react-hook-form**: Form state management.
- **zod**: Schema validation library.
- **drizzle-zod**: Generates Zod schemas from Drizzle tables.

### UI Component Libraries
- **@radix-ui/react-***: Unstyled, accessible UI primitives.
- **lucide-react**: Icon library.
- **cmdk**: Command menu component.
- **embla-carousel-react**: Carousel functionality.
- **date-fns**: Date formatting.

### Styling
- **tailwindcss**: Utility-first CSS framework.
- **class-variance-authority**: Type-safe variant management.
- **clsx & tailwind-merge**: Conditional className utilities.

### Routing
- **wouter**: Minimalist routing library.

### Image Processing
- **sharp**: High-performance Node.js image processing.

### Video Duration Extraction
- **YouTube IFrame Player API**: Browser-based duration extraction without API keys
  - Hidden offscreen players load video metadata via `cueVideoById()`
  - Sequential queue prevents multiple simultaneous iframes
  - Automatic fallback to "--:--" on fetch failures
  - No quota limits or authentication required
  - Durations persist to database after first fetch for instant subsequent loads
  - Implementation: `client/src/lib/youtube-duration.ts`

### Smart Tag Filtering
- **Intelligent Available Tags**: Shows only tags that would actually narrow down search results
  - Counts tag frequency across filtered videos
  - Excludes tags appearing on ALL filtered videos (universal tags)
  - Excludes already selected tags
  - Example: When "armbar" is selected (2 videos), shows "kimura" (1/2 videos) but hides "armbar" (already selected)
  - Implementation: `server/storage.ts` - `getCoOccurringTags()` method

### SEO Implementation
- **Meta Tags Optimization** (`client/index.html`):
  - Brand-first title: "Bjjlib - BJJ Training Video Library for Clubs & Gyms" (under 60 chars)
  - 156-char description targeting "bjjlib", "BJJ training video library", "club", "gym"
  - Keywords meta tag with dual positioning: current (personal library) + future (club platform)
  - Open Graph and Twitter Card tags for social sharing

- **Schema.org Structured Data** (`client/src/components/schema-markup.tsx`):
  - **Organization schema**: Defines bjjlib as a brand entity
  - **SoftwareApplication schema**: Positions as educational BJJ app (free pricing, aggregate rating)
  - **ItemList schema**: Lists up to 10 videos for search engine discovery
  - **VideoObject schema**: Conditionally rendered for YouTube/Vimeo videos only
    - Includes thumbnailUrl, duration (ISO 8601), embedUrl, keywords from tags
    - Skips unsupported platforms (iCloud) to ensure valid markup
    - Duration validation prevents invalid ISO 8601 values ("--:--" → undefined)
    - Upload date has try/catch protection for invalid dates

- **Dynamic XML Sitemap** (`server/index.ts`):
  - Endpoint: `/sitemap.xml`
  - Auto-updates as videos are added
  - Proper lastmod dates, changefreq, priority values
  - Registered before Vite middleware to avoid routing conflicts

- **Semantic HTML Structure** (`client/src/pages/home.tsx`):
  - H1: "Bjjlib" (brand)
  - H2: "Quick tag search"
  - H3: "Selected tags", "Available tags"
  - ARIA labels for accessibility
  - Proper heading hierarchy for crawlers

- **Image SEO**:
  - Alt text format: "BJJ technique video: [title] - [tags]"
  - Includes keywords naturally for image search
  - Example: "BJJ technique video: Armbar from Mount - armbar, fundamentals, submissions"

**Target Keywords**: bjjlib, bjjlibrary, bjj training videos, bjj app, bjj club management, bjj gym app, bjj training platform