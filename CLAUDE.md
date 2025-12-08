# CLAUDE.md - Content War Chest

## Project Overview

**Content War Chest** is a LinkedIn content management and engagement platform for Amazon sellers and e-commerce professionals. It helps users organize, manage, and repurpose their LinkedIn posts while tracking engagement opportunities from followed profiles.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui (Radix UI based)
- **State Management**: TanStack React Query + React Context (auth)
- **Routing**: React Router DOM v6
- **Forms**: React Hook Form + Zod validation
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **AI**: Supabase Edge Functions calling external AI APIs

## Quick Commands

```bash
npm run dev      # Start dev server (port 8080)
npm run build    # Production build
npm run lint     # ESLint check
npm run preview  # Preview production build
```

## Project Structure

```
src/
├── App.tsx                 # Root component, routing, providers
├── main.tsx               # Entry point
├── contexts/
│   └── AuthContext.tsx    # Authentication state
├── pages/
│   ├── Index.tsx          # Content Library (main page)
│   ├── Engagement.tsx     # Engagement Feed
│   ├── Auth.tsx           # Login/Signup
│   └── NotFound.tsx       # 404 page
├── components/
│   ├── content-library/   # Post management components
│   ├── engagement/        # Engagement feed components
│   ├── discovery/         # Discovery feature components
│   └── ui/                # shadcn/ui components
├── integrations/
│   └── supabase/
│       ├── client.ts      # Supabase client config
│       └── types.ts       # Generated database types
├── lib/
│   ├── utils.ts           # Utility functions (cn helper)
│   └── categories.ts      # 12 content categories with colors
└── hooks/                 # Custom React hooks

supabase/
├── functions/             # Edge Functions (AI operations)
│   ├── analyze-post/      # AI post analysis
│   ├── format-post/       # AI content formatting
│   ├── recategorize-posts/# Bulk recategorization
│   ├── fetch-engagement-posts/  # LinkedIn scraping
│   └── generate-engagement-comments/  # AI comment generation
└── migrations/            # Database migrations
```

## Database Schema

### Core Tables
- **posts** - User's content library (title, content, category, tags, usage tracking)
- **folders** - Organization folders for posts
- **followed_profiles** - LinkedIn profiles to monitor
- **engagement_posts** - Posts from followed profiles for engagement

### Key Relationships
- All tables have `user_id` referencing Supabase Auth
- `posts` optionally belong to `folders`
- `engagement_posts` belong to `followed_profiles`

## Content Categories

12 predefined categories for Amazon/e-commerce content (defined in `src/lib/categories.ts`):
- Account Health, Writing & Appeals, Amazon Ecosystem
- Competition & Attacks, Documentation & Compliance, Product Strategy
- Operations & Logistics, Reviews & Feedback, Business Models
- Mindset & Strategy, Personal Story, Buyer Behavior

## Coding Conventions

### Path Aliases
Use `@/` for imports from src directory:
```typescript
import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/lib/categories";
```

### Component Patterns
- Use shadcn/ui components from `@/components/ui/`
- Toast notifications via `sonner` (use `toast()`)
- Responsive dialogs: Dialog on desktop, Drawer on mobile

### State Management
- Server state: TanStack React Query with Supabase
- Auth state: `useAuth()` from `@/contexts/AuthContext`
- Use `useQuery`/`useMutation` for data operations

### Styling
- Tailwind CSS with dark mode support
- Use `cn()` utility for conditional classes
- Orange/amber gradient for brand elements

## Environment Variables

```
VITE_SUPABASE_URL=<supabase-project-url>
VITE_SUPABASE_PUBLISHABLE_KEY=<supabase-anon-key>
```

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/integrations/supabase/types.ts` | Database types |
| `src/lib/categories.ts` | Category definitions |
| `src/contexts/AuthContext.tsx` | Auth provider |
| `src/components/ui/*` | shadcn/ui components |

## AI Features (Edge Functions)

- **analyze-post**: Generates title, category, tags, summary
- **format-post**: Optimizes content for LinkedIn
- **recategorize-posts**: Bulk category updates
- **fetch-engagement-posts**: Scrapes followed profiles
- **generate-engagement-comments**: AI comment suggestions

## TypeScript Configuration

- Strict mode disabled (relaxed typing)
- Path alias: `@/*` maps to `./src/*`
- Target: ES2020
