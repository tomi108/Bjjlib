# Video Library Application

## Overview

This is a full-stack video library management application built with React, Express, and PostgreSQL. The application allows users to organize, browse, and manage video content with tagging capabilities. It features a modern UI built with shadcn/ui components and follows a clean monorepo architecture with shared schemas between client and server.

## Recent Changes (October 3, 2025)

**Authentication UI Redesign:**
- Removed tabbed navigation (Browse/Admin tabs) from the homepage
- Video library content is now always visible to all users
- Login functionality moved to a dialog modal accessed via header button
- Admin features accessible through an "Admin Panel" button for logged-in users
- Login/Logout buttons conditionally displayed in the header based on authentication status

**Quick Add Tag Feature:**
- Added inline tag input field on video cards for admin users
- Admins can add tags directly from the video listing without opening a separate form
- Input field with autosuggestion appears below existing tags on each video card (only when admin is logged in)
- As you type, tag suggestions appear filtered by your input
- Automatically filters out tags that are already assigned to the video
- Click a suggestion to instantly add the tag to the video
- Provides toast notifications for successful tag additions
- Updates video list and tag counts automatically after tag is added
- Play button overlay reduced to 28px (one-third original size) for better visual balance

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React 18 with TypeScript for type safety
- Vite as the build tool and development server
- Wouter for client-side routing (lightweight alternative to React Router)
- TanStack Query (React Query) for server state management and caching
- shadcn/ui component library based on Radix UI primitives
- Tailwind CSS for styling with custom design tokens

**Design Decisions:**
- Component-based architecture with reusable UI components in `client/src/components/ui/`
- Custom components for domain logic (`video-card`, `video-form`, `tag-manager`, `video-table`, `admin-tab`)
- Form validation using React Hook Form with Zod resolvers for type-safe form handling
- Query client configured with infinite stale time to minimize unnecessary refetches
- Path aliases configured for clean imports (`@/`, `@shared/`, `@assets/`)
- Authentication state managed through React Query with cookie-based sessions
- Admin features conditionally rendered based on session state

### Backend Architecture

**Technology Stack:**
- Express.js as the web framework
- Node.js with ES modules (type: "module")
- TypeScript for type safety across the stack
- Drizzle ORM for database interactions
- In-memory storage implementation with interface pattern for easy swapping

**Design Decisions:**
- RESTful API design with conventional endpoints (`/api/videos`, `/api/tags`, `/api/health`, `/api/admin/*`)
- Storage abstraction through `IStorage` interface allows switching between in-memory and database implementations
- Request/response logging middleware for API debugging
- Schema validation using Zod schemas derived from Drizzle tables
- Health check endpoint for monitoring application status
- Cookie-based session management for admin authentication using httpOnly cookies

### Database Architecture

**Technology Stack:**
- PostgreSQL as the primary database (configured via Neon serverless driver)
- Drizzle ORM for type-safe database queries
- Drizzle Kit for schema migrations

**Schema Design:**
- `videos` table: Stores video metadata (title, URL, description, tags array, timestamps)
- `tags` table: Manages tag taxonomy with video counts
- `admin_sessions` table: Stores admin session data for authentication
- UUID primary keys generated via PostgreSQL's `gen_random_uuid()`
- Array column type for video tags enabling many-to-many relationships without join tables
- Automatic timestamp generation for creation dates

**Design Rationale:**
- Array-based tags simplify queries while maintaining flexibility
- Tag count denormalization improves read performance for tag popularity features
- Shared schema definitions between client and server eliminate type mismatches

### Development Environment

**Build System:**
- Vite for frontend bundling with HMR (Hot Module Replacement)
- esbuild for backend compilation in production builds
- tsx for TypeScript execution in development
- Separate build outputs: `dist/public` for frontend, `dist` for backend

**Replit Integration:**
- Runtime error overlay plugin for better debugging
- Cartographer plugin for code navigation (development only)
- Dev banner plugin for environment awareness (development only)

**Configuration:**
- TypeScript strict mode enabled across the project
- Path resolution configured for monorepo structure
- ESM-first module resolution strategy

## External Dependencies

### Core Framework Dependencies
- **Express.js**: Backend web server framework
- **React**: Frontend UI library
- **Vite**: Build tool and development server
- **TypeScript**: Type system for JavaScript

### Database & ORM
- **@neondatabase/serverless**: Neon PostgreSQL serverless driver for database connections
- **drizzle-orm**: Type-safe ORM for database queries
- **drizzle-kit**: Schema migration tool
- **connect-pg-simple**: PostgreSQL session store (configured but not actively used in current implementation)

### State Management & Data Fetching
- **@tanstack/react-query**: Server state management with automatic caching and refetching

### Form Handling & Validation
- **react-hook-form**: Performant form state management
- **@hookform/resolvers**: Validation resolver integrations
- **zod**: Schema validation library
- **drizzle-zod**: Generates Zod schemas from Drizzle tables

### UI Component Libraries
- **@radix-ui/react-***: Comprehensive set of unstyled, accessible UI primitives (accordion, dialog, dropdown, select, toast, etc.)
- **lucide-react**: Icon library
- **cmdk**: Command menu component
- **embla-carousel-react**: Carousel functionality
- **date-fns**: Date formatting and manipulation

### Styling
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Type-safe variant management for components
- **clsx & tailwind-merge**: Conditional className utilities

### Routing
- **wouter**: Minimalist routing library (~1KB alternative to React Router)

### Development Tools
- **@replit/vite-plugin-***: Replit-specific development enhancements (runtime error overlay, cartographer, dev banner)

### Notes on Architecture
- The application currently uses an in-memory storage implementation (`MemStorage` class) but is structured to easily switch to database-backed storage through the `IStorage` interface
- Database configuration is present and ready for PostgreSQL integration via the Neon serverless driver
- Admin authentication uses cookie-based sessions with ADMIN_PASSWORD environment variable for security
- The monorepo structure with shared schemas ensures type consistency between frontend and backend

## Authentication System

**Backend:**
- Three endpoints: `/api/admin/login`, `/api/admin/logout`, `/api/admin/session`
- Cookie-based session management using httpOnly cookies for security
- Sessions stored in memory (via `IStorage` interface) with 24-hour expiration
- Password validated against `ADMIN_PASSWORD` environment variable

**Frontend:**
- React Query fetches admin status on page load
- Login dialog accessible via header button for non-authenticated users
- Admin Panel button appears for authenticated admins to access management features
- Logout button replaces login button after successful authentication
- Full page reload after login/logout to refresh session state

**Security Notes:**
- ADMIN_PASSWORD must be configured in environment variables for authentication to work
- Sessions use httpOnly cookies to prevent XSS attacks
- Secure flag enabled for cookies in production environments