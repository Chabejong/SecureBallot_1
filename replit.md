# Overview

The Ballot Box is a secure community voting platform built as a full-stack web application. It enables users to create and participate in polls with features like anonymous voting, real-time results, and different poll types (public, members-only, invited). The application emphasizes security, transparency, and user experience through a modern React frontend and Express.js backend with PostgreSQL database integration.

# User Preferences

Preferred communication style: Simple, everyday language.

# Recent Changes

## October 2025 - Subscription Limit Alert Dialog
Replaced toast notification with AlertDialog when users hit subscription limits:

### Implementation
- When free tier users attempt to create a second poll, an AlertDialog now appears with "Please upgrade to create more polls." message
- Dialog includes "Upgrade Now" button that redirects to /pricing page
- Replaced previous toast + auto-redirect approach with explicit user-driven upgrade flow
- Error parsing updated to handle apiRequest's Error format ("403: {json}")

### User Experience
- More prominent and less dismissible than toast notifications
- User must click "Upgrade Now" to proceed to pricing page
- Dialog blocks interaction with form until user responds
- Clearer call-to-action for subscription upgrades

## October 2025 - Vote Synchronization with Optimistic Updates
Implemented proper React Query optimistic updates to prevent duplicate vote submissions:

### Issue
Race condition allowed duplicate votes when users rapidly double-clicked the submit button before the hasVoted status was updated from the server.

### Solution Applied
Implemented proper React Query `onMutate` pattern for optimistic updates in both Vote.tsx and PublicVote.tsx:

**Optimistic Update Pattern:**
1. **onMutate**: Captures previous `hasVoted` cache value before mutating, cancels in-flight queries, optimistically sets `hasVoted: true`, and returns snapshot as context
2. **onSuccess**: Uses context snapshot (not mutated cache) to determine first-time vs. update vote for correct toast messaging
3. **onError**: Rolls back optimistic update using snapshot, restoring exact previous cache state

**Key Improvements:**
- Immediate UI feedback: Submit button disabled instantly via optimistic cache update
- Proper rollback: Failed submissions restore previous cache state synchronously
- Correct messaging: First-time votes show "Vote Submitted!", updates show "Vote Updated"
- Race condition eliminated: Multiple rapid clicks prevented by instant local state update

### Verification
E2e test confirmed:
- Despite 6 rapid button clicks, only 1 vote recorded in database
- Toast message correctly shows "Vote Submitted!" for first-time votes
- Button becomes disabled immediately on first click
- Results display correctly after successful vote

## October 2025 - User Subscription Display
Added subscription tier display to user profiles:

### Implementation
- Subscription tier shown as colored badge in user dropdown menu
- Tier colors: Free (gray), Basic (blue), Standard (green), Premium (purple), Professional (indigo), Enterprise (orange), Ultimate (gold gradient)
- Display appears in both desktop dropdown and mobile navigation menu
- Backend payment handler updated to match new tier names (Premium €25, Professional €50, Enterprise €75, Ultimate €100)

## October 2025 - Admin User & Payment System Updates
Latest updates to admin privileges and payment configuration:

### Admin User Implementation
- Added `isAdmin` boolean field to users schema for admin privilege tracking
- Implemented admin user: **chabejong@yahoo.com** with unrestricted access
- Admin users bypass all subscription limits and can create unlimited polls for unlimited participants
- Created development-only endpoint (`/api/admin/set-admin`) for admin status management
- Admin check integrated into poll creation limits logic

### PayPal Configuration Updates
- Updated PayPal payment account to: **nkwettae@yahoo.com**
- Configured PayPal API credentials (PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET)
- Updated subscription pricing tiers:
  - Free: 1 poll/month, up to 15 participants
  - Basic (€5): Unlimited polls, up to 50 participants
  - Standard (€10): Unlimited polls, 51-100 participants
  - Pro (€20): Unlimited polls, 101-250 participants
  - Premium (€50): Unlimited polls, 251-500 participants
  - Advanced (€75): Unlimited polls, 501-750 participants
  - Enterprise (€100): Unlimited polls, unlimited participants
- Added donation page with PayPal integration

## October 2025 - Deployment Fixes & Subscription System Changes
Applied critical deployment fixes to ensure proper server initialization in production:

### Server Configuration
- Confirmed server listens on 0.0.0.0:5000 for external access in deployment
- Added `/api/health` endpoint for deployment health checks and monitoring
- Implemented startup error handling with catch block to prevent silent failures
- Secured admin cleanup endpoint (development-only access)

### Subscription System Updates
- Temporarily disabled subscription limit enforcement on poll creation
- Users can now create unlimited polls regardless of subscription tier
- Payment system infrastructure (PayPal integration, transaction auditing) remains intact
- Subscription verification endpoints and UI continue to function

## September 2025 - Authentication System Migration
Successfully replaced Replit OIDC authentication with traditional email/password authentication system:

### Backend Changes
- Implemented Passport.js local strategy with bcrypt password hashing  
- Created email/password registration and login API endpoints
- Updated all protected routes to use new authentication middleware
- Modified user schema to include required password field

### Frontend Changes  
- Built comprehensive Auth.tsx component with registration and login forms
- Updated routing to redirect unauthenticated users to /auth page
- Implemented React Hook Form with Zod validation for form handling
- Fixed form binding issues with component keys for proper React reconciliation
- Added explicit navigation after successful login using wouter routing

### Database Changes
- Added password field to users table (VARCHAR, required)
- Made email field required (NOT NULL) 
- Cleared existing user data for clean authentication system migration
- Sessions table continues to handle authentication state

# System Architecture

## Frontend Architecture
The client is built with React 18 using TypeScript and follows a component-based architecture:
- **Routing**: Uses Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **UI Framework**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Form Handling**: React Hook Form with Zod schema validation
- **Build Tool**: Vite for fast development and optimized production builds

## Backend Architecture
The server is an Express.js application with TypeScript:
- **API Structure**: RESTful API design with organized route handlers
- **Authentication**: Email/password authentication with Passport.js local strategy and bcrypt
- **Session Management**: Express sessions with PostgreSQL storage
- **Request Handling**: Middleware for logging, error handling, and authentication
- **Development**: Hot reloading with Vite integration in development mode

## Database Layer
PostgreSQL database with Drizzle ORM for type-safe database operations:
- **Schema Definition**: Centralized schema in `shared/schema.ts` with Zod validation
- **Connection**: Neon serverless PostgreSQL with connection pooling
- **Migrations**: Drizzle Kit for database schema management
- **Data Access**: Repository pattern implemented in storage layer with interface abstraction

## Key Data Models
- **Users**: User profiles with email, password (hashed), first name, last name, and profile image
- **Sessions**: Session storage for user authentication state management
- **Polls**: Poll metadata with configurable options (public/private, anonymous, end dates) 
- **Poll Options**: Individual voting choices for each poll
- **Votes**: Vote records with IP tracking for anonymous polls

## Authentication & Authorization  
- **Provider**: Email/password authentication with bcrypt password hashing
- **Session Storage**: PostgreSQL-backed sessions with configurable TTL
- **Route Protection**: Middleware-based authentication checks for protected routes
- **User Management**: User registration and login with secure password storage

## Frontend State Management
- **Server State**: TanStack React Query with optimistic updates and cache invalidation
- **Form State**: React Hook Form with real-time validation
- **Global State**: React Context for authentication state
- **URL State**: Wouter for navigation and route parameters

# External Dependencies

## Database & Storage
- **Neon Database**: Serverless PostgreSQL hosting with WebSocket support
- **Drizzle ORM**: Type-safe database toolkit with schema management
- **PostgreSQL**: Primary database for all application data

## Authentication
- **Email/Password**: Traditional authentication with secure password hashing
- **Passport.js**: Authentication middleware with local strategy
- **bcrypt**: Password hashing and verification for secure credential storage

## UI & Styling
- **Radix UI**: Headless component primitives for accessibility
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library for consistent iconography
- **shadcn/ui**: Pre-built component library built on Radix

## Development Tools
- **Vite**: Build tool and development server
- **TypeScript**: Type safety across frontend and backend
- **ESBuild**: Fast bundling for production builds
- **PostCSS**: CSS processing with Tailwind integration

## Runtime & Deployment
- **Node.js**: Server runtime environment
- **Express.js**: Web application framework
- **React**: Frontend framework for user interface
- **Date-fns**: Date manipulation and formatting utilities