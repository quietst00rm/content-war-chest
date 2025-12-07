-- =============================================================================
-- CONSOLIDATED MIGRATION FOR LINKEDIN CONTENT HUB
-- Run this in your Supabase SQL Editor to set up the complete database schema
-- =============================================================================

-- =====================
-- HELPER FUNCTION
-- =====================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- =====================
-- 1. POSTS TABLE
-- =====================
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
  folder_id UUID,
  status TEXT DEFAULT 'draft' CHECK (status IN ('idea', 'draft', 'ready', 'scheduled', 'used', 'archived')),
  scheduled_for TIMESTAMPTZ,
  scheduled_platform TEXT,
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0,
  notes TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Create user-scoped policies
CREATE POLICY "Users can read own posts" ON public.posts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own posts" ON public.posts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON public.posts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON public.posts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_posts_user_id ON public.posts(user_id);
CREATE INDEX idx_posts_category ON public.posts(primary_category);
CREATE INDEX idx_posts_tags ON public.posts USING GIN(tags);
CREATE INDEX idx_posts_is_used ON public.posts(is_used);
CREATE INDEX idx_posts_is_favorite ON public.posts(is_favorite);
CREATE INDEX idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX idx_posts_status ON public.posts(status);
CREATE INDEX idx_posts_scheduled_for ON public.posts(scheduled_for);
CREATE INDEX idx_posts_search ON public.posts USING GIN(
  to_tsvector('english', title || ' ' || content || ' ' || COALESCE(summary, ''))
);

-- Trigger
CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Comments
COMMENT ON COLUMN public.posts.status IS 'Workflow status: idea -> draft -> ready -> scheduled -> used -> archived';

-- =====================
-- 2. FOLDERS TABLE
-- =====================
CREATE TABLE public.folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6b7280',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own folders" ON public.folders
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own folders" ON public.folders
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own folders" ON public.folders
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own folders" ON public.folders
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_folders_user_id ON public.folders(user_id);

-- Trigger
CREATE TRIGGER update_folders_updated_at
  BEFORE UPDATE ON public.folders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Add foreign key from posts to folders (after folders table exists)
ALTER TABLE public.posts
ADD CONSTRAINT posts_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.folders(id) ON DELETE SET NULL;
CREATE INDEX idx_posts_folder_id ON public.posts(folder_id);

-- =====================
-- 3. FOLLOWED_PROFILES TABLE
-- =====================
CREATE TABLE public.followed_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  linkedin_url TEXT NOT NULL,
  name TEXT,
  title TEXT,
  profile_image_url TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_fetched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.followed_profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own followed profiles" ON public.followed_profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own followed profiles" ON public.followed_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own followed profiles" ON public.followed_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own followed profiles" ON public.followed_profiles
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_followed_profiles_user_id ON public.followed_profiles(user_id);
CREATE INDEX idx_followed_profiles_is_active ON public.followed_profiles(is_active);
CREATE UNIQUE INDEX idx_followed_profiles_user_url ON public.followed_profiles(user_id, linkedin_url);

-- Trigger
CREATE TRIGGER update_followed_profiles_updated_at
  BEFORE UPDATE ON public.followed_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =====================
-- 4. ENGAGEMENT_POSTS TABLE
-- =====================
CREATE TABLE public.engagement_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.followed_profiles(id) ON DELETE CASCADE,
  linkedin_post_url TEXT NOT NULL,
  linkedin_post_id TEXT,
  author_name TEXT,
  author_profile_url TEXT,
  author_title TEXT,
  author_profile_image_url TEXT,
  content TEXT NOT NULL,
  posted_at TIMESTAMPTZ,
  posted_ago_text TEXT,
  days_ago INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  ai_comment TEXT,
  ai_comment_generated_at TIMESTAMPTZ,
  user_comment TEXT,
  is_commented BOOLEAN DEFAULT FALSE,
  commented_at TIMESTAMPTZ,
  is_hidden BOOLEAN DEFAULT FALSE,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.engagement_posts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own engagement posts" ON public.engagement_posts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own engagement posts" ON public.engagement_posts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own engagement posts" ON public.engagement_posts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own engagement posts" ON public.engagement_posts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_engagement_posts_user_id ON public.engagement_posts(user_id);
CREATE INDEX idx_engagement_posts_profile_id ON public.engagement_posts(profile_id);
CREATE INDEX idx_engagement_posts_fetched_at ON public.engagement_posts(fetched_at DESC);
CREATE INDEX idx_engagement_posts_days_ago ON public.engagement_posts(days_ago);
CREATE INDEX idx_engagement_posts_is_commented ON public.engagement_posts(is_commented);
CREATE INDEX idx_engagement_posts_is_hidden ON public.engagement_posts(is_hidden);
CREATE UNIQUE INDEX idx_engagement_posts_unique_post ON public.engagement_posts(user_id, linkedin_post_url);

-- Trigger
CREATE TRIGGER update_engagement_posts_updated_at
  BEFORE UPDATE ON public.engagement_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =====================
-- 5. USER_STRATEGY TABLE
-- =====================
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
  stage_1_completed BOOLEAN DEFAULT FALSE,
  stage_1_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_strategy ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own strategy" ON public.user_strategy
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own strategy" ON public.user_strategy
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own strategy" ON public.user_strategy
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own strategy" ON public.user_strategy
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Indexes
CREATE UNIQUE INDEX idx_user_strategy_user_id ON public.user_strategy(user_id);
CREATE INDEX idx_user_strategy_stage_completed ON public.user_strategy(stage_1_completed);
CREATE INDEX idx_user_strategy_validation_status ON public.user_strategy(validation_status);

-- Trigger
CREATE TRIGGER update_user_strategy_updated_at
  BEFORE UPDATE ON public.user_strategy
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =====================
-- 6. PLATFORM_VERSIONS TABLE
-- =====================
CREATE TABLE public.platform_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'twitter', 'newsletter')),
  content TEXT NOT NULL,
  formatted_content TEXT,
  character_count INTEGER,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.platform_versions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own platform versions" ON public.platform_versions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own platform versions" ON public.platform_versions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own platform versions" ON public.platform_versions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own platform versions" ON public.platform_versions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_platform_versions_post_id ON public.platform_versions(post_id);
CREATE INDEX idx_platform_versions_user_id ON public.platform_versions(user_id);
CREATE INDEX idx_platform_versions_platform ON public.platform_versions(platform);
CREATE UNIQUE INDEX idx_platform_versions_primary_unique ON public.platform_versions(post_id, platform) WHERE is_primary = true;

-- Trigger
CREATE TRIGGER update_platform_versions_updated_at
  BEFORE UPDATE ON public.platform_versions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =====================
-- 7. PERFORMANCE_LOGS TABLE
-- =====================
CREATE TABLE public.performance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'twitter', 'newsletter')),
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  posted_at TIMESTAMPTZ,
  impressions INTEGER,
  likes INTEGER,
  comments INTEGER,
  shares INTEGER,
  clicks INTEGER,
  engagement_rate NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.performance_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own performance logs" ON public.performance_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own performance logs" ON public.performance_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own performance logs" ON public.performance_logs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own performance logs" ON public.performance_logs
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_performance_logs_post_id ON public.performance_logs(post_id);
CREATE INDEX idx_performance_logs_user_id ON public.performance_logs(user_id);
CREATE INDEX idx_performance_logs_platform ON public.performance_logs(platform);
CREATE INDEX idx_performance_logs_logged_at ON public.performance_logs(logged_at);

-- Trigger
CREATE TRIGGER update_performance_logs_updated_at
  BEFORE UPDATE ON public.performance_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =====================
-- 8. HOOK_VARIANTS TABLE
-- =====================
CREATE TABLE public.hook_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hook_text TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  source TEXT NOT NULL CHECK (source IN ('original', 'ai_generated', 'manual')),
  times_used INTEGER DEFAULT 0,
  avg_performance_score NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.hook_variants ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own hook variants" ON public.hook_variants
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own hook variants" ON public.hook_variants
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own hook variants" ON public.hook_variants
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own hook variants" ON public.hook_variants
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_hook_variants_post_id ON public.hook_variants(post_id);
CREATE INDEX idx_hook_variants_user_id ON public.hook_variants(user_id);
CREATE INDEX idx_hook_variants_is_primary ON public.hook_variants(is_primary);
CREATE UNIQUE INDEX idx_hook_variants_primary_unique ON public.hook_variants(post_id) WHERE is_primary = true;

-- Trigger
CREATE TRIGGER update_hook_variants_updated_at
  BEFORE UPDATE ON public.hook_variants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================================================
-- MIGRATION COMPLETE
-- Your database is now fully set up with 8 tables, RLS policies, and indexes
-- =============================================================================
