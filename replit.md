# DadVoice Coach

## Overview

DadVoice Coach is an AI-powered voice coaching web application that analyzes recorded singing voice samples and provides personalized feedback. Users can record audio directly in the browser, receive analysis of pitch accuracy, tone stability, breath support, and strain risk, along with actionable coaching exercises to improve their vocal technique.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side routing)
- **State Management**: TanStack React Query for server state, React hooks for local state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Build Tool**: Vite with custom plugins for Replit integration

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript compiled with tsx for development, esbuild for production
- **API Design**: RESTful JSON API endpoints under `/api` prefix
- **Audio Processing**: FFmpeg for WebM to WAV conversion (spawned as child process)
- **AI Integration**: OpenAI API via Replit AI Integrations for:
  - Speech-to-text transcription (gpt-4o-mini-transcribe model)
  - Voice analysis and coaching feedback generation

### Data Storage
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Current Implementation**: In-memory storage (`MemStorage` class) for recordings
- **Database Ready**: Schema includes users, recordings, conversations, and messages tables
- **Migration Tool**: drizzle-kit for database schema migrations

### Key Data Models
- **Recordings**: Store audio analysis results including pitch accuracy, tone stability, breath support, strain risk scores, and coaching feedback with exercises
- **Voice Analysis**: Structured scoring (0-100) for multiple vocal metrics
- **Coaching Feedback**: Contains summary, strengths, improvements, exercises with durations, and encouragement

### Audio Pipeline
1. Browser captures audio via MediaRecorder API (WebM/Opus format)
2. Audio sent to server as base64-encoded payload
3. Server converts WebM to WAV using FFmpeg
4. Transcription via OpenAI Whisper-compatible API
5. Analysis and feedback generated via AI completion
6. Results stored and returned to client

## External Dependencies

### AI Services
- **OpenAI API**: Accessed via Replit AI Integrations
  - Environment variables: `AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`
  - Used for audio transcription and text generation

### Database
- **PostgreSQL**: Required for production persistence
  - Environment variable: `DATABASE_URL`
  - Drizzle ORM handles connection and queries

### System Dependencies
- **FFmpeg**: Required for audio format conversion (available by default on Replit)

### Key NPM Packages
- `openai`: OpenAI SDK for AI integrations
- `drizzle-orm` / `drizzle-kit`: Database ORM and migrations
- `express`: HTTP server framework
- `@tanstack/react-query`: Server state management
- `wouter`: Client-side routing
- `zod`: Runtime schema validation
- `date-fns`: Date formatting utilities