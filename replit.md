# Overview

The Ballot Box is a secure community voting platform designed as a full-stack web application. It enables users to create and participate in polls with features such as anonymous voting, real-time results, and various poll types (public, members-only, invited). Members-Only polls support unique authentication number validation where each number (within a specified range) can only be used once per poll. The application prioritizes security, transparency, and a positive user experience, utilizing a modern React frontend and an Express.js backend with PostgreSQL database integration. Its purpose is to provide a reliable and versatile voting solution for communities.

# User Preferences

Preferred communication style: Simple, everyday language.

# Recent Changes

## October 12, 2025 - Fixed Authentication Number Input Issue
- **Issue**: Authentication number input field on shared poll links (PublicVote page) was not accepting user input
- **Root Cause**: PublicVote.tsx component was missing authNumber state and not passing authNumber/onAuthNumberChange props to VotingInterface component
- **Fix Applied**:
  - Added authNumber state to PublicVote.tsx
  - Updated PublicVote to pass authNumber and onAuthNumberChange props to VotingInterface
  - Updated vote submission in PublicVote to include authNumber in request body
  - Improved input handling to use .replace(/\D/g, '') for digit-only validation across all voting pages
  - Changed API endpoint in Vote.tsx from /api/polls/:id to /api/public/polls/:slug for public poll access
- **Impact**: Users can now successfully enter authentication numbers on shared poll links and QR codes, enabling full Members-Only poll functionality via public access

# System Architecture

## Frontend Architecture
The client is built with React 18, TypeScript, and follows a component-based architecture. It uses Wouter for routing, TanStack React Query for server state and caching, Radix UI components with shadcn/ui design system for the UI, and Tailwind CSS for styling. Form handling is managed by React Hook Form with Zod validation, and Vite is used for building.

## Backend Architecture
The server is an Express.js application written in TypeScript. It features a RESTful API, email/password authentication using Passport.js local strategy and bcrypt, and Express sessions with PostgreSQL storage. Middleware is used for logging, error handling, and authentication.

## Database Layer
A PostgreSQL database is used with Drizzle ORM for type-safe operations. The schema is defined centrally, Neon provides serverless hosting with connection pooling, and Drizzle Kit is used for migrations. A repository pattern is implemented in the storage layer for data access.

## Key Data Models
The application includes data models for Users (profiles with credentials), Sessions (authentication state), Polls (metadata and configuration), Poll Options (individual choices), and Votes (records including IP tracking for anonymous polls).

## Authentication & Authorization
The system uses email/password authentication with bcrypt hashing. Sessions are stored in PostgreSQL. Route protection is enforced via middleware, and user management includes secure registration and login.

## Frontend State Management
Server state is handled by TanStack React Query with optimistic updates. Form state is managed by React Hook Form with real-time validation. Global application state, particularly for authentication, is managed via React Context. Wouter handles URL and navigation state.

# External Dependencies

## Database & Storage
- **Neon Database**: Serverless PostgreSQL hosting.
- **Drizzle ORM**: Type-safe database toolkit.
- **PostgreSQL**: Primary database.

## Authentication
- **Passport.js**: Authentication middleware.
- **bcrypt**: Password hashing.

## UI & Styling
- **Radix UI**: Headless component primitives.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.
- **shadcn/ui**: Pre-built component library.

## Development Tools
- **Vite**: Build tool and development server.
- **TypeScript**: Type safety.
- **ESBuild**: Fast bundling.
- **PostCSS**: CSS processing.

## Runtime & Deployment
- **Node.js**: Server runtime.
- **Express.js**: Web application framework.
- **React**: Frontend framework.
- **Date-fns**: Date manipulation utilities.