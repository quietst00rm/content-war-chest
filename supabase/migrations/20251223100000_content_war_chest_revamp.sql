-- Migration: Content War Chest Revamp
-- Simplifies to two core functions: Engagement Hub + Content Library
-- Removes authentication, adds Joe/Kristen user toggle

-- ============================================================================
-- PHASE 1: Create users_internal table (replaces auth.users for this app)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.users_internal (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    context_document text,
    created_at timestamptz DEFAULT now()
);

-- Seed Joe and Kristen
INSERT INTO public.users_internal (id, name, slug, context_document)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'Joe', 'joe', NULL),
    ('22222222-2222-2222-2222-222222222222', 'Kristen', 'kristen', NULL)
ON CONFLICT (slug) DO NOTHING;

COMMENT ON TABLE public.users_internal IS 'Internal users for this tool - Joe and Kristen';

-- ============================================================================
-- PHASE 2: Create/modify target_profiles (formerly followed_profiles)
-- ============================================================================

-- Create new target_profiles table (shared list, no user_id)
CREATE TABLE IF NOT EXISTS public.target_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    linkedin_url text NOT NULL UNIQUE,
    name text,
    title text,
    avatar_url text,
    is_active boolean DEFAULT true,
    last_fetched_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- Migrate data from followed_profiles if it exists
INSERT INTO public.target_profiles (id, linkedin_url, name, title, avatar_url, is_active, last_fetched_at, created_at)
SELECT id, linkedin_url, name, title, profile_image_url, is_active, last_fetched_at, created_at
FROM public.followed_profiles
ON CONFLICT (linkedin_url) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_target_profiles_is_active ON public.target_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_target_profiles_linkedin_url ON public.target_profiles(linkedin_url);

COMMENT ON TABLE public.target_profiles IS 'LinkedIn profiles to monitor for engagement - shared list';

-- ============================================================================
-- PHASE 3: Create new engagement_posts table structure
-- ============================================================================

-- Create new engagement_posts_new table with updated schema
CREATE TABLE IF NOT EXISTS public.engagement_posts_new (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    target_profile_id uuid REFERENCES public.target_profiles(id) ON DELETE CASCADE,
    linkedin_post_url text NOT NULL,
    content text NOT NULL,
    posted_at timestamptz,
    fetched_at timestamptz DEFAULT now(),
    is_expired boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- Migrate existing data
INSERT INTO public.engagement_posts_new (id, target_profile_id, linkedin_post_url, content, posted_at, fetched_at, created_at)
SELECT
    e.id,
    e.profile_id,
    e.linkedin_post_url,
    e.content,
    e.posted_at,
    e.fetched_at,
    e.created_at
FROM public.engagement_posts e
WHERE e.profile_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_engagement_posts_new_target_profile ON public.engagement_posts_new(target_profile_id);
CREATE INDEX IF NOT EXISTS idx_engagement_posts_new_is_expired ON public.engagement_posts_new(is_expired);
CREATE INDEX IF NOT EXISTS idx_engagement_posts_new_posted_at ON public.engagement_posts_new(posted_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_engagement_posts_new_url ON public.engagement_posts_new(linkedin_post_url);

COMMENT ON TABLE public.engagement_posts_new IS 'LinkedIn posts from target profiles for engagement';

-- ============================================================================
-- PHASE 4: Create comment_options table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.comment_options (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    engagement_post_id uuid NOT NULL REFERENCES public.engagement_posts_new(id) ON DELETE CASCADE,
    option_number integer NOT NULL CHECK (option_number >= 1 AND option_number <= 3),
    comment_text text NOT NULL,
    approach_type text NOT NULL CHECK (approach_type IN ('specific_detail', 'hidden_dynamic', 'practical_implication')),
    claimed_by uuid REFERENCES public.users_internal(id) ON DELETE SET NULL,
    claimed_at timestamptz,
    created_at timestamptz DEFAULT now(),
    UNIQUE(engagement_post_id, option_number)
);

CREATE INDEX IF NOT EXISTS idx_comment_options_post ON public.comment_options(engagement_post_id);
CREATE INDEX IF NOT EXISTS idx_comment_options_claimed_by ON public.comment_options(claimed_by);

COMMENT ON TABLE public.comment_options IS 'Three comment options per engagement post with claiming';

-- ============================================================================
-- PHASE 5: Create posts_new table for content library
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.posts_new (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users_internal(id) ON DELETE CASCADE,
    content text NOT NULL,
    status text DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'posted')),
    folder_id uuid,
    pillar_category text,
    tags text[],
    notes text,
    posted_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Migrate existing posts (default to Joe)
INSERT INTO public.posts_new (id, user_id, content, status, folder_id, tags, notes, created_at, updated_at)
SELECT
    id,
    '11111111-1111-1111-1111-111111111111'::uuid,
    content,
    'draft',
    folder_id,
    tags,
    notes,
    created_at,
    updated_at
FROM public.posts
ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_posts_new_user_id ON public.posts_new(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_new_status ON public.posts_new(status);
CREATE INDEX IF NOT EXISTS idx_posts_new_folder_id ON public.posts_new(folder_id);
CREATE INDEX IF NOT EXISTS idx_posts_new_pillar_category ON public.posts_new(pillar_category);

COMMENT ON TABLE public.posts_new IS 'Content library posts per user';

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_posts_new_updated_at ON public.posts_new;
CREATE TRIGGER update_posts_new_updated_at
    BEFORE UPDATE ON public.posts_new
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PHASE 6: Create image_prompts table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.image_prompts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id uuid NOT NULL REFERENCES public.posts_new(id) ON DELETE CASCADE,
    concept_number integer NOT NULL CHECK (concept_number >= 1 AND concept_number <= 3),
    concept_name text NOT NULL,
    category text NOT NULL CHECK (category IN ('object_metaphor', 'environmental_scene', 'contrast_juxtaposition', 'textured_background', 'unexpected_creative')),
    description text NOT NULL,
    rationale text NOT NULL,
    prompt_text text NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(post_id, concept_number)
);

CREATE INDEX IF NOT EXISTS idx_image_prompts_post_id ON public.image_prompts(post_id);

COMMENT ON TABLE public.image_prompts IS 'AI-generated image prompts for content posts';

-- ============================================================================
-- PHASE 7: Create folders_new table per user
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.folders_new (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users_internal(id) ON DELETE CASCADE,
    name text NOT NULL,
    color text,
    created_at timestamptz DEFAULT now()
);

-- Migrate existing folders (default to Joe)
INSERT INTO public.folders_new (id, user_id, name, color, created_at)
SELECT
    id,
    '11111111-1111-1111-1111-111111111111'::uuid,
    name,
    color,
    created_at
FROM public.folders
ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_folders_new_user_id ON public.folders_new(user_id);

COMMENT ON TABLE public.folders_new IS 'Content folders per user';

-- Update posts_new to reference folders_new
ALTER TABLE public.posts_new
    DROP CONSTRAINT IF EXISTS posts_new_folder_id_fkey;
ALTER TABLE public.posts_new
    ADD CONSTRAINT posts_new_folder_id_fkey
    FOREIGN KEY (folder_id) REFERENCES public.folders_new(id) ON DELETE SET NULL;

-- ============================================================================
-- PHASE 8: Create pillar_categories table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pillar_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users_internal(id) ON DELETE CASCADE,
    name text NOT NULL,
    color text,
    sort_order integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pillar_categories_user_id ON public.pillar_categories(user_id);

COMMENT ON TABLE public.pillar_categories IS 'Content pillar categories per user';

-- ============================================================================
-- PHASE 9: Disable RLS on new tables (internal tool, no auth)
-- ============================================================================

ALTER TABLE public.users_internal DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.target_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_posts_new DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_options DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts_new DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_prompts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders_new DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pillar_categories DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PHASE 10: Create views for backward compatibility (optional)
-- ============================================================================

-- Create a view that combines engagement_posts with target profile info
CREATE OR REPLACE VIEW public.engagement_posts_with_profile AS
SELECT
    e.id,
    e.target_profile_id,
    e.linkedin_post_url,
    e.content,
    e.posted_at,
    e.fetched_at,
    e.is_expired,
    e.created_at,
    tp.name as author_name,
    tp.title as author_title,
    tp.avatar_url as author_avatar,
    tp.linkedin_url as author_linkedin_url
FROM public.engagement_posts_new e
LEFT JOIN public.target_profiles tp ON e.target_profile_id = tp.id;

-- ============================================================================
-- NOTES: Original tables are preserved for data safety
-- After verification, you can drop them with:
-- DROP TABLE IF EXISTS public.followed_profiles CASCADE;
-- DROP TABLE IF EXISTS public.engagement_posts CASCADE;
-- DROP TABLE IF EXISTS public.posts CASCADE;
-- DROP TABLE IF EXISTS public.folders CASCADE;
-- DROP TABLE IF EXISTS public.user_strategy CASCADE;
-- ============================================================================
