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

### Database Architecture

**Technology Stack:**
- PostgreSQL as the primary database (via Neon serverless driver)
- Drizzle ORM for type-safe queries
- Drizzle Kit for schema migrations
- SQLite for local development (multi-database support)

**Schema Design:**
- `videos` table: Stores video metadata (title, URL, duration, tags array, timestamps).
- `tags` table: Manages tag taxonomy with video counts.
- `admin_sessions` table: Stores admin session data.
- UUID primary keys.
- Array column type for video tags.
- Automatic timestamp generation.

**Design Rationale:**
- Array-based tags simplify queries.
- Tag count denormalization improves read performance.
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
  - Implementation: `client/src/lib/youtube-duration.ts`