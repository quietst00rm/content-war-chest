# Content War Chest - Complete Project Context

## Executive Summary

**Content War Chest** is a LinkedIn content management and engagement platform designed specifically for Amazon sellers and e-commerce professionals. It helps users organize, manage, and repurpose their LinkedIn posts while also tracking and engaging with posts from LinkedIn profiles they follow.

**Primary Use Case:** Building a personal "war chest" of pre-written LinkedIn content that can be easily searched, categorized, copied, and tracked for usage - all while providing AI-powered analysis and formatting capabilities.

**Target Audience:** Amazon FBA sellers, e-commerce entrepreneurs, and business professionals who actively use LinkedIn for content marketing and networking.

---

## Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.3.1 | UI framework |
| **TypeScript** | 5.8.3 | Type-safe development |
| **Vite** | 5.4.19 | Build tool & dev server |
| **Tailwind CSS** | 3.4.17 | Styling framework |
| **shadcn/ui** | Latest | Component library (Radix UI based) |
| **React Router DOM** | 6.30.1 | Client-side routing |
| **TanStack React Query** | 5.83.0 | Server state management & caching |
| **React Hook Form** | 7.61.1 | Form handling |
| **Zod** | 3.25.76 | Schema validation |

### Backend & Infrastructure
| Technology | Purpose |
|------------|---------|
| **Supabase** | Backend-as-a-Service (PostgreSQL database, authentication, edge functions) |
| **Supabase Auth** | User authentication (email/password + Google OAuth) |
| **Supabase Edge Functions** | Serverless functions for AI operations |

### UI/UX Libraries
- **Lucide React** - Icon library
- **Sonner** - Toast notifications
- **Recharts** - Charts/data visualization
- **next-themes** - Dark/light mode theming
- **cmdk** - Command palette
- **vaul** - Drawer component
- **date-fns** - Date formatting

---

## Database Schema

### Tables Overview

The application uses 4 main PostgreSQL tables in Supabase:

#### 1. `posts` - Content Library
Stores the user's LinkedIn posts/content.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Owner (references auth.users) |
| `title` | string | AI-generated headline/title |
| `content` | string | Raw post content |
| `formatted_content` | string | AI-formatted version |
| `primary_category` | string | Main category classification |
| `subcategory` | string | Secondary classification |
| `tags` | string[] | Array of topic tags |
| `target_audience` | string | Who the post is for |
| `summary` | string | AI-generated summary |
| `character_count` | number | Length of content |
| `source_section` | string | Where the post came from |
| `folder_id` | UUID | Optional folder organization |
| `is_used` | boolean | Whether post has been published |
| `used_at` | timestamp | When it was marked as used |
| `usage_count` | number | Times used |
| `is_favorite` | boolean | Starred/favorited |
| `notes` | string | User's private notes |
| `created_at` | timestamp | Record creation |
| `updated_at` | timestamp | Last modification |

#### 2. `folders` - Organization
User-created folders for organizing posts.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Owner |
| `name` | string | Folder name |
| `color` | string | Folder color (hex) |
| `created_at` | timestamp | When created |
| `updated_at` | timestamp | Last modified |

#### 3. `followed_profiles` - Engagement Tracking
LinkedIn profiles the user wants to monitor and engage with.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Owner |
| `linkedin_url` | string | Profile URL |
| `name` | string | Display name |
| `notes` | string | User notes about profile |
| `is_active` | boolean | Whether to fetch posts |
| `last_fetched_at` | timestamp | Last scrape time |
| `created_at` | timestamp | When added |
| `updated_at` | timestamp | Last modified |

#### 4. `engagement_posts` - Posts to Engage With
Posts fetched from followed LinkedIn profiles.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Owner |
| `profile_id` | UUID | References followed_profiles |
| `linkedin_post_url` | string | Direct link to post |
| `linkedin_post_id` | string | LinkedIn's internal ID |
| `author_name` | string | Post author's name |
| `author_profile_url` | string | Author's profile link |
| `author_title` | string | Author's headline |
| `content` | string | Post content |
| `posted_at` | timestamp | When originally posted |
| `posted_ago_text` | string | "2 days ago" etc |
| `days_ago` | number | Numeric days since posted |
| `likes` | number | Reaction count |
| `comments` | number | Comment count |
| `shares` | number | Share count |
| `ai_comment` | string | AI-suggested comment |
| `ai_comment_generated_at` | timestamp | When AI comment was made |
| `is_commented` | boolean | User marked as engaged |
| `commented_at` | timestamp | When marked done |
| `user_comment` | string | User's actual comment |
| `is_hidden` | boolean | Hidden from feed |
| `fetched_at` | timestamp | When scraped |
| `created_at` | timestamp | Record creation |
| `updated_at` | timestamp | Last modification |

### Database Relationships

```
users (Supabase Auth)
  |
  |-- posts (1:many)
  |     |-- folders (many:1, optional)
  |
  |-- folders (1:many)
  |
  |-- followed_profiles (1:many)
        |-- engagement_posts (1:many)
```

---

## AI-Powered Features

The application uses **Supabase Edge Functions** to invoke AI capabilities. These are serverless functions that call external AI APIs (likely OpenAI or Anthropic).

### 1. Post Analysis (`analyze-post`)
**Triggered by:** Adding a new post, bulk importing posts

**Input:** Raw post content

**Output:**
- `title` - Generated headline
- `primary_category` - Classification (from 12 predefined categories)
- `subcategory` - More specific classification
- `tags` - Relevant topic tags
- `formatted_content` - Cleaned/optimized version
- `character_count` - Content length
- `target_audience` - Who it's for
- `summary` - Brief summary

### 2. Post Formatting (`format-post`)
**Triggered by:** "Refine with AI" button in post editor, bulk auto-format

**Input:** Post content (and optionally post ID)

**Output:**
- `formatted_content` - Improved, optimized version for LinkedIn

### 3. Bulk Recategorization (`recategorize-posts`)
**Triggered by:** "Recategorize All Posts" button

**Input:** Array of all posts with their content

**Output:**
- Updated categories for all posts

### 4. Engagement Post Fetching (`fetch-engagement-posts`)
**Triggered by:** "Fetch Posts" button in Engagement feed

**Input:**
- `max_posts_per_profile` - Number of posts to fetch per profile

**Output:**
- Posts scraped from followed LinkedIn profiles
- Profile information (names, titles)
- Engagement metrics (likes, comments, shares)

**Note:** This likely uses a LinkedIn scraping service or API (the implementation details are in the edge function, not visible in the frontend code).

### 5. AI Comment Suggestions (Planned/Partial)
The database schema and UI include placeholders for AI-generated comment suggestions on engagement posts, but this feature appears to be "coming soon" based on the UI text.

---

## Content Categories

The application uses 12 predefined categories for Amazon/e-commerce focused LinkedIn content:

| Category | Color | Emoji | Description |
|----------|-------|-------|-------------|
| Account Health | #dc2626 (red) | Shield | Seller account issues |
| Writing & Appeals | #ea580c (orange) | Writing | Suspension appeals |
| Amazon Ecosystem | #0284c7 (blue) | Building | Platform knowledge |
| Competition & Attacks | #7c3aed (purple) | Swords | Competitive tactics |
| Documentation & Compliance | #059669 (green) | Clipboard | Policy/legal |
| Product Strategy | #0891b2 (cyan) | Box | Product decisions |
| Operations & Logistics | #4f46e5 (indigo) | Truck | Supply chain |
| Reviews & Feedback | #be185d (pink) | Star | Customer reviews |
| Business Models | #65a30d (lime) | Briefcase | Business strategy |
| Mindset & Strategy | #a855f7 (violet) | Brain | Mental approach |
| Personal Story | #f59e0b (amber) | Book | Storytelling |
| Buyer Behavior | #6366f1 (indigo) | Cart | Consumer insights |

---

## Application Features

### Content Library (Main Page - `/`)

#### Core Functions
1. **Add Single Post** - Paste content, AI analyzes and categorizes
2. **Bulk Import** - Paste multiple posts separated by "Post 1", "Post 2" markers
3. **Search** - Full-text search across title, content, summary
4. **Copy to Clipboard** - One-click copy for pasting to LinkedIn
5. **Mark as Used/Unused** - Track what's been published
6. **View/Edit Post** - Full editing modal with all fields

#### Organization
- **Folders** - Create colored folders to organize posts
- **Categories** - Filter by AI-assigned category
- **Tags** - Filter by topic tags
- **Status Filter** - All / Used / Unused

#### Bulk Operations
- **Selection Mode** - Multi-select posts
- **Bulk Delete** - Delete multiple posts
- **Bulk Mark as Used** - Mark multiple posts used
- **Bulk Auto-Format** - AI format multiple posts
- **Bulk Move to Folder** - Organize multiple posts

#### AI Features
- **Auto-Analyze** - On import, AI generates title, category, tags
- **Refine with AI** - Button to improve/reformat content
- **Recategorize All** - Re-run AI categorization on all posts

#### Views
- **Grid View** - Card grid layout
- **List View** - Compact list layout
- **Sort by Category** or **A-Z**

### Engagement Feed (`/engagement`)

#### Purpose
Track posts from LinkedIn profiles you follow to engage with them (comment, like) - helping build relationships and visibility.

#### Core Functions
1. **Add Profiles** - Add LinkedIn profile URLs to follow
2. **Bulk Import Profiles** - Add multiple URLs at once
3. **Fetch Posts** - Scrape recent posts from followed profiles
4. **View Posts** - See content, engagement stats, author info
5. **Open in LinkedIn** - Link directly to post
6. **Copy Content** - Copy post content (for reference when commenting)
7. **Mark as Done** - Track which posts you've engaged with
8. **Hide Post** - Remove from your feed

#### Filtering
- **Pending** - Posts you haven't engaged with
- **Done** - Posts you've marked as commented
- **All** - Everything
- **By Profile** - Filter to specific person's posts

#### Profile Management
- Toggle profiles active/inactive
- Delete profiles
- View profile URLs

### Authentication (`/auth`)

- Email/password sign up and sign in
- Google OAuth sign in
- Email confirmation required for new accounts
- Session persistence
- Protected routes (redirects to /auth if not logged in)

---

## Application Architecture

### File Structure
```
src/
├── App.tsx                 # Root component, routing, providers
├── main.tsx               # Entry point
├── contexts/
│   └── AuthContext.tsx    # Authentication state management
├── pages/
│   ├── Index.tsx          # Content Library (main page)
│   ├── Engagement.tsx     # Engagement Feed
│   ├── Auth.tsx           # Login/Signup
│   └── NotFound.tsx       # 404 page
├── components/
│   ├── content-library/   # Content library components
│   │   ├── AddPostDialog.tsx
│   │   ├── BulkImportDialog.tsx
│   │   ├── PostCard.tsx
│   │   ├── PostGrid.tsx
│   │   ├── PostModal.tsx
│   │   ├── FilterSidebar.tsx
│   │   ├── FolderList.tsx
│   │   ├── AddFolderDialog.tsx
│   │   ├── MoveToFolderDialog.tsx
│   │   ├── BulkActionsBar.tsx
│   │   ├── RecategorizeButton.tsx
│   │   ├── SearchBar.tsx
│   │   └── MobileFilterSheet.tsx
│   ├── engagement/        # Engagement components
│   │   ├── EngagementPostCard.tsx
│   │   └── ManageProfilesDialog.tsx
│   ├── ui/                # shadcn/ui components
│   ├── ProtectedRoute.tsx
│   ├── ThemeToggle.tsx
│   └── NavLink.tsx
├── integrations/
│   └── supabase/
│       ├── client.ts      # Supabase client config
│       └── types.ts       # Generated database types
├── lib/
│   ├── utils.ts           # Utility functions
│   └── categories.ts      # Category definitions
└── hooks/
    ├── use-toast.ts
    └── use-mobile.tsx
```

### State Management
- **TanStack Query** - Server state (posts, folders, profiles)
- **React Context** - Auth state
- **Local State** - UI state (modals, selection, filters)

### Data Flow
1. User actions trigger Supabase queries via React Query
2. Mutations invalidate relevant query caches
3. Components re-render with fresh data
4. AI operations call Supabase Edge Functions
5. Edge Functions return processed data

---

## External Services & APIs

### Supabase
- **Database** - PostgreSQL for all data storage
- **Authentication** - Email/password + Google OAuth
- **Edge Functions** - Serverless functions for AI processing
- **Row Level Security** - Data isolation by user_id

### AI Provider (via Edge Functions)
The edge functions likely call an AI API such as:
- OpenAI GPT-4/GPT-3.5
- Anthropic Claude
- Or another LLM provider

Used for:
- Content analysis and categorization
- Post formatting and optimization
- (Future) Comment suggestions

### LinkedIn (via Edge Functions)
The engagement feature scrapes or accesses LinkedIn data to:
- Fetch posts from followed profiles
- Get author information
- Get engagement metrics

This could use:
- LinkedIn API (if authorized)
- Third-party scraping service
- Browser automation

---

## UI/UX Patterns

### Design System
- **Dark mode default** with light mode toggle
- **Orange/amber accent colors** (brand gradient)
- **Card-based layouts** for content
- **Responsive design** - Mobile-first approach
- **Sticky headers** on mobile for navigation
- **Sheet/drawer patterns** for mobile filters

### Component Patterns
- **ResponsiveDialog** - Dialog on desktop, drawer on mobile
- **Skeleton loading** states
- **Toast notifications** for feedback
- **Confirmation dialogs** for destructive actions
- **Progress indicators** for long operations

### Accessibility
- Proper ARIA labels
- Keyboard navigation support
- Focus management
- Screen reader friendly

---

## Current Limitations & Gaps

### Features Marked "Coming Soon"
1. AI comment suggestions on engagement posts

### Potential Improvements
1. No analytics/dashboard for content performance
2. No scheduling functionality
3. No direct LinkedIn integration (publish from app)
4. No team/collaboration features
5. No content templates
6. No A/B testing for post variations
7. No hashtag recommendations
8. No best time to post analysis

### Technical Debt
1. Some components are large and could be split
2. No unit/integration tests visible
3. Edge function implementations not in repo
4. No error boundary implementation visible

---

## Deployment & Environment

### Development
```bash
npm install
npm run dev      # Start dev server
npm run build    # Production build
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

### Environment Variables Required
```
VITE_SUPABASE_URL=<supabase-project-url>
VITE_SUPABASE_PUBLISHABLE_KEY=<supabase-anon-key>
```

### Deployment
The app is built with Lovable.dev and can be deployed via their platform, or any static hosting that supports SPAs (Vercel, Netlify, etc.).

---

## Branding

### Current Brand Elements
- **Name:** Content War Chest
- **Tagline:** (none visible)
- **Colors:** Orange/amber gradient for primary branding
- **Logo:** Text-based gradient logo

### Brand Voice
- Professional but approachable
- Focused on Amazon selling community
- Action-oriented ("War Chest" implies prepared resources)

---

## Summary for AI Brainstorming

This is a **LinkedIn content management tool** specifically built for **Amazon sellers** that:

1. **Stores and organizes** pre-written LinkedIn posts
2. **Uses AI** to analyze, categorize, and improve content
3. **Tracks usage** of content to avoid reposting
4. **Monitors LinkedIn profiles** for engagement opportunities
5. **Supports bulk operations** for efficiency

The core value proposition is helping busy e-commerce entrepreneurs maintain a consistent LinkedIn presence by having a organized library of ready-to-post content, enhanced by AI-powered organization and formatting.

**Key Opportunities for Enhancement:**
- Deeper AI integration (comment generation, hashtag suggestions)
- LinkedIn API integration for direct posting
- Analytics and performance tracking
- Content templates and generation
- Team collaboration features
- Mobile app version
- Chrome extension for quick capture
