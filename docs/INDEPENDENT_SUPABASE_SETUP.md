# Independent Supabase Setup Guide

This guide walks you through setting up a new Supabase project completely independent of Lovable.

## Step 1: Create New Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Choose your organization (or create one)
4. Name: `content-war-chest` (or your preference)
5. Database Password: Generate and **save this securely**
6. Region: Choose closest to you
7. Click "Create new project"
8. Wait ~2 minutes for setup

## Step 2: Get Your Credentials

After project is created, go to **Settings > API** and copy:
- **Project URL**: `https://[your-project-ref].supabase.co`
- **Anon/Public Key**: `eyJ...` (the long one under "anon public")
- **Service Role Key**: `eyJ...` (click "Reveal" - keep this secret!)

## Step 3: Run Database Schema

Go to **SQL Editor** in your Supabase dashboard and run each of these in order:

### 3.1 Base Functions
```sql
-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;
```

### 3.2 Posts Table
```sql
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  formatted_content TEXT NOT NULL,
  primary_category TEXT NOT NULL,
  subcategory TEXT,
  tags TEXT[] DEFAULT '{}',
  target_audience TEXT,
  summary TEXT,
  character_count INTEGER,
  source_section TEXT,
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP WITH TIME ZONE,
  usage_count INTEGER DEFAULT 0,
  notes TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  folder_id UUID,
  status TEXT DEFAULT 'draft' CHECK (status IN ('idea', 'draft', 'ready', 'scheduled', 'used', 'archived')),
  scheduled_for TIMESTAMPTZ,
  scheduled_platform TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own posts" ON public.posts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own posts" ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON public.posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON public.posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_posts_user_id ON public.posts(user_id);
CREATE INDEX idx_posts_category ON public.posts(primary_category);
CREATE INDEX idx_posts_tags ON public.posts USING GIN(tags);
CREATE INDEX idx_posts_status ON public.posts(status);
CREATE INDEX idx_posts_created_at ON public.posts(created_at DESC);

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

### 3.3 Folders Table
```sql
CREATE TABLE public.folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6b7280',
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own folders" ON public.folders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own folders" ON public.folders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own folders" ON public.folders FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own folders" ON public.folders FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_folders_user_id ON public.folders(user_id);

CREATE TRIGGER update_folders_updated_at BEFORE UPDATE ON public.folders FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Add foreign key to posts
ALTER TABLE public.posts ADD CONSTRAINT posts_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.folders(id) ON DELETE SET NULL;
```

### 3.4 Followed Profiles Table
```sql
CREATE TABLE public.followed_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  linkedin_url TEXT NOT NULL,
  name TEXT,
  title TEXT,
  profile_image_url TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  last_fetched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, linkedin_url)
);

ALTER TABLE public.followed_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own followed profiles" ON public.followed_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own followed profiles" ON public.followed_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own followed profiles" ON public.followed_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own followed profiles" ON public.followed_profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_followed_profiles_user_id ON public.followed_profiles(user_id);
CREATE INDEX idx_followed_profiles_is_active ON public.followed_profiles(is_active);

CREATE TRIGGER update_followed_profiles_updated_at BEFORE UPDATE ON public.followed_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

### 3.5 Engagement Posts Table
```sql
CREATE TABLE public.engagement_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.followed_profiles(id) ON DELETE CASCADE,
  linkedin_post_url TEXT NOT NULL,
  linkedin_post_id TEXT,
  author_name TEXT,
  author_profile_url TEXT,
  author_profile_image_url TEXT,
  author_title TEXT,
  content TEXT NOT NULL,
  posted_at TIMESTAMPTZ,
  posted_ago_text TEXT,
  days_ago INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  ai_comment TEXT,
  ai_comment_approach TEXT CHECK (ai_comment_approach IS NULL OR ai_comment_approach IN ('micro', 'reaction', 'opinion', 'question', 'support', 'disagree')),
  ai_comment_tone TEXT CHECK (ai_comment_tone IS NULL OR ai_comment_tone IN ('casual', 'professional', 'playful', 'empathetic')),
  ai_comment_generated_at TIMESTAMPTZ,
  user_comment TEXT,
  is_commented BOOLEAN DEFAULT false,
  commented_at TIMESTAMPTZ,
  is_hidden BOOLEAN DEFAULT false,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, linkedin_post_url)
);

ALTER TABLE public.engagement_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own engagement posts" ON public.engagement_posts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own engagement posts" ON public.engagement_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own engagement posts" ON public.engagement_posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own engagement posts" ON public.engagement_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_engagement_posts_user_id ON public.engagement_posts(user_id);
CREATE INDEX idx_engagement_posts_profile_id ON public.engagement_posts(profile_id);
CREATE INDEX idx_engagement_posts_fetched_at ON public.engagement_posts(fetched_at DESC);
CREATE INDEX idx_engagement_posts_approach ON public.engagement_posts(ai_comment_approach);

CREATE TRIGGER update_engagement_posts_updated_at BEFORE UPDATE ON public.engagement_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

### 3.6 Platform Versions Table
```sql
CREATE TABLE public.platform_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'twitter', 'newsletter')),
  content TEXT NOT NULL,
  formatted_content TEXT,
  character_count INTEGER,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.platform_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own platform versions" ON public.platform_versions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own platform versions" ON public.platform_versions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own platform versions" ON public.platform_versions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own platform versions" ON public.platform_versions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_platform_versions_post_id ON public.platform_versions(post_id);
CREATE INDEX idx_platform_versions_user_id ON public.platform_versions(user_id);

CREATE TRIGGER update_platform_versions_updated_at BEFORE UPDATE ON public.platform_versions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 3.7 User Strategy Table
```sql
CREATE TABLE public.user_strategy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  idea_source TEXT CHECK (idea_source IN ('practical_experience', 'learned_obsession', 'advice_sought', 'problem_solved')),
  idea_source_details TEXT,
  years_experience INTEGER CHECK (years_experience >= 0 AND years_experience <= 50),
  target_market TEXT CHECK (target_market IN ('health', 'wealth', 'relationships')),
  primary_outcome TEXT CHECK (primary_outcome IN ('make_money', 'save_money', 'save_time', 'health_fitness', 'attractiveness', 'peace_of_mind')),
  who_you_help TEXT,
  what_you_help_them_do TEXT,
  validation_enjoyment TEXT CHECK (validation_enjoyment IN ('yes', 'somewhat', 'no')),
  validation_learning TEXT CHECK (validation_learning IN ('yes', 'somewhat', 'no')),
  validation_longevity TEXT CHECK (validation_longevity IN ('yes', 'probably', 'unsure', 'no')),
  expansion_potential TEXT,
  validation_score INTEGER CHECK (validation_score >= 0 AND validation_score <= 9),
  validation_status TEXT CHECK (validation_status IN ('strong', 'moderate', 'weak')),
  value_statement_seed TEXT,
  current_step INTEGER DEFAULT 1 CHECK (current_step >= 1 AND current_step <= 5),
  stage_1_completed BOOLEAN DEFAULT false,
  stage_1_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_strategy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own strategy" ON public.user_strategy FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own strategy" ON public.user_strategy FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own strategy" ON public.user_strategy FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own strategy" ON public.user_strategy FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_user_strategy_updated_at BEFORE UPDATE ON public.user_strategy FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

## Step 4: Deploy Edge Functions

### 4.1 Install Supabase CLI (on your computer)

**Mac:**
```bash
brew install supabase/tap/supabase
```

**Windows:**
```bash
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**Linux:**
```bash
curl -fsSL https://raw.githubusercontent.com/supabase/cli/main/scripts/install.sh | sh
```

### 4.2 Link to Your Project

```bash
cd /path/to/content-war-chest
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

(Get `YOUR_PROJECT_REF` from your Supabase URL: `https://YOUR_PROJECT_REF.supabase.co`)

### 4.3 Set Edge Function Secrets

```bash
# Get a Gemini API key from Google AI Studio: https://aistudio.google.com/apikey
# Or use an existing AI gateway

supabase secrets set LOVABLE_API_KEY=your_ai_api_key
supabase secrets set APIFY_API_KEY=your_apify_key
```

### 4.4 Deploy Functions

```bash
supabase functions deploy generate-engagement-comments
supabase functions deploy fetch-engagement-posts
supabase functions deploy analyze-post
supabase functions deploy format-post
supabase functions deploy generate-hooks
supabase functions deploy discovery-ai
```

## Step 5: Update Your App

### 5.1 Create `.env` file (or update existing)

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here
```

The app already uses environment variables in `src/integrations/supabase/client.ts` - just create the `.env` file with the correct values.

## Step 6: Configure Authentication

1. Go to **Authentication > Providers** in Supabase dashboard
2. Enable **Email** provider (already enabled by default)
3. Optional: Configure OAuth providers (Google, etc.)
4. Go to **Authentication > URL Configuration**
5. Set your **Site URL**: `http://localhost:5173` (for dev) or your production URL

## Step 7: Test

1. Run your app: `npm run dev`
2. Sign up for a new account
3. Try creating a post
4. Try adding a LinkedIn profile and fetching posts

## Troubleshooting

**"Invalid API key"**: Check that VITE_SUPABASE_ANON_KEY is correct

**"Row level security"**: Make sure you ran all the RLS policies in the SQL

**"Function not found"**: Make sure you deployed all edge functions

**Edge function errors**: Check logs with `supabase functions logs function-name`

## Data Migration (Optional)

If you need to migrate data from the old Lovable project, you'll need to:
1. Export data from old project (Settings > Database > Backups)
2. Import into new project
3. Or manually recreate the data

---

Once set up, you have FULL CONTROL over your Supabase project - no Lovable dependency!
