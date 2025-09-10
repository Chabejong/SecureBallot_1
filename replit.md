# Overview

The Ballot Box is a secure community voting platform built as a full-stack web application. It enables users to create and participate in polls with features like anonymous voting, real-time results, and different poll types (public, members-only, invited). The application emphasizes security, transparency, and user experience through a modern React frontend and Express.js backend with PostgreSQL database integration.

# User Preferences

Preferred communication style: Simple, everyday language.

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
- **Authentication**: Replit OIDC integration with Passport.js strategies
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
- **Users**: Authentication and profile information (required for Replit Auth)
- **Sessions**: Session storage for user authentication (required for Replit Auth)
- **Polls**: Poll metadata with configurable options (public/private, anonymous, end dates)
- **Poll Options**: Individual voting choices for each poll
- **Votes**: Vote records with IP tracking for anonymous polls

## Authentication & Authorization
- **Provider**: Replit OIDC for secure authentication
- **Session Storage**: PostgreSQL-backed sessions with configurable TTL
- **Route Protection**: Middleware-based authentication checks
- **User Management**: Automatic user creation/updates on login

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
- **Replit OIDC**: Primary authentication provider
- **Passport.js**: Authentication middleware and strategy management
- **OpenID Client**: OIDC protocol implementation

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