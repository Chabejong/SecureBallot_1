# Overview

The Ballot Box is a secure community voting platform designed as a full-stack web application. It enables users to create and participate in polls with features such as anonymous voting, real-time results, and various poll types (public, members-only, invited). Members-Only polls support unique authentication number validation where each number (within a specified range) can only be used once per poll. The application prioritizes security, transparency, and a positive user experience, utilizing a modern React frontend and an Express.js backend with PostgreSQL database integration. Its purpose is to provide a reliable and versatile voting solution for communities.

# User Preferences

Preferred communication style: Simple, everyday language.

# Recent Changes

## October 12, 2025 - Fixed Authentication Number Validation Issues

### Issue 1: Authentication Number Input Not Working on Shared Links
- **Problem**: Authentication number input field on shared poll links was not accepting user input
- **Root Cause**: PublicVote.tsx was missing authNumber state and props
- **Fix**:
  - Added authNumber state to PublicVote.tsx
  - Passed authNumber/onAuthNumberChange props to VotingInterface
  - Included authNumber in vote submission payload
  - Improved input handling with .replace(/\D/g, '') for digit-only validation

### Issue 2: "Poll Not Found" Error for Logged-in Users
- **Problem**: Logged-in users saw "Poll Not Found" when trying to vote
- **Root Cause**: Vote.tsx was incorrectly using `/api/public/polls/:id` with a UUID instead of slug
- **Fix**:
  - Reverted Vote.tsx to use `/api/polls/:id` (authenticated endpoint with UUID)
  - PublicVote.tsx correctly uses `/api/public/polls/:slug` (public endpoint with slug)

### Issue 3: No Backend Validation on Public Vote Endpoint (CRITICAL SECURITY FIX)
- **Problem**: Public vote endpoint completely bypassed authentication number validation - users could vote with ANY number (1, 999, -5, etc.)
- **Root Cause**: `/api/public/polls/:slug/vote` endpoint was missing all authentication number validation logic
- **Fix Applied**:
  1. Extract authNumber from request body
  2. Check if poll requires auth number (Members-Only with range)
  3. Validate auth number is provided
  4. Validate it's a valid integer
  5. Validate it's within range via storage.validateAuthNumber()
  6. Validate it hasn't been used already
  7. Mark auth number as used after successful vote
  8. Prevent vote changes for Members-Only polls
- **Validation Enforced**:
  - ❌ Missing auth number → Error: "Authentication number is required for this poll"
  - ❌ Invalid format → Error: "Invalid authentication number"
  - ❌ Number outside range → Error: "Invalid authentication number. Please enter a number within the valid range."
  - ❌ Already used number → Error: "This authentication number has already been used. Each number can only be used once."
  - ✅ Valid unused number → Vote succeeds, number marked as used

### Routing Structure
- `/vote/:slug` → PublicVote.tsx (shared links, uses slug)
- `/poll/:id/vote` → Vote.tsx (logged-in users, uses UUID)

**Impact**: Full Members-Only authentication number security now enforced on all voting endpoints, preventing unauthorized votes and ensuring each number can only be used once per poll

### Documentation Update: How It Works Page
- **Updated**: Members-Only section in "Poll Visibility" to document authentication numbers
- **Added**: Complete guide covering:
  - Setting up authentication numbers (range specification, distribution)
  - How voters use authentication numbers (validation, one-time use)
  - Tracking participation (reports, CSV export)
- **Purpose**: Help users understand and utilize the Members-Only authentication feature

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