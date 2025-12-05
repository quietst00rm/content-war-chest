-- Migration: Create engagement_posts table
-- Stores scraped posts from followed LinkedIn profiles for daily engagement

CREATE TABLE public.engagement_posts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_id uuid NOT NULL REFERENCES public.followed_profiles(id) ON DELETE CASCADE,

    -- Post identification
    linkedin_post_url text NOT NULL,
    linkedin_post_id text,

    -- Author info (denormalized for quick display)
    author_name text,
    author_profile_url text,
    author_title text,

    -- Post content
    content text NOT NULL,

    -- Timing
    posted_at timestamptz,
    posted_ago_text text,
    days_ago integer DEFAULT 0,

    -- Engagement metrics
    likes integer DEFAULT 0,
    comments integer DEFAULT 0,
    shares integer DEFAULT 0,

    -- AI-generated comment (future feature)
    ai_comment text,
    ai_comment_generated_at timestamptz,

    -- User engagement tracking
    user_comment text,
    is_commented boolean DEFAULT false,
    commented_at timestamptz,
    is_hidden boolean DEFAULT false,

    -- Metadata
    fetched_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.engagement_posts ENABLE ROW LEVEL SECURITY;

-- Create user-scoped RLS policies
CREATE POLICY "Users can view own engagement posts"
ON public.engagement_posts FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own engagement posts"
ON public.engagement_posts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own engagement posts"
ON public.engagement_posts FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own engagement posts"
ON public.engagement_posts FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_engagement_posts_user_id ON public.engagement_posts(user_id);
CREATE INDEX idx_engagement_posts_profile_id ON public.engagement_posts(profile_id);
CREATE INDEX idx_engagement_posts_fetched_at ON public.engagement_posts(fetched_at DESC);
CREATE INDEX idx_engagement_posts_days_ago ON public.engagement_posts(days_ago);
CREATE INDEX idx_engagement_posts_is_commented ON public.engagement_posts(is_commented);
CREATE INDEX idx_engagement_posts_is_hidden ON public.engagement_posts(is_hidden);

-- Composite index for common queries (recent uncommented posts)
CREATE INDEX idx_engagement_posts_user_recent
ON public.engagement_posts(user_id, fetched_at DESC, is_commented, is_hidden);

-- Unique constraint: prevent duplicate posts per user
CREATE UNIQUE INDEX idx_engagement_posts_unique_post
ON public.engagement_posts(user_id, linkedin_post_url);

-- Add updated_at trigger
CREATE TRIGGER update_engagement_posts_updated_at
    BEFORE UPDATE ON public.engagement_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Add comments
COMMENT ON TABLE public.engagement_posts IS 'Scraped posts from followed LinkedIn profiles for daily engagement';
COMMENT ON COLUMN public.engagement_posts.linkedin_post_url IS 'Direct URL to the LinkedIn post';
COMMENT ON COLUMN public.engagement_posts.linkedin_post_id IS 'LinkedIn internal post ID (for deduplication)';
COMMENT ON COLUMN public.engagement_posts.posted_ago_text IS 'Human-readable time since posted (e.g., "2h ago")';
COMMENT ON COLUMN public.engagement_posts.days_ago IS 'Integer days since post was published (for sorting)';
COMMENT ON COLUMN public.engagement_posts.ai_comment IS 'AI-generated comment suggestion (future feature)';
COMMENT ON COLUMN public.engagement_posts.user_comment IS 'Actual comment the user left (optional tracking)';
COMMENT ON COLUMN public.engagement_posts.is_commented IS 'Whether the user has engaged with this post';
COMMENT ON COLUMN public.engagement_posts.is_hidden IS 'Whether the user has hidden this post from their feed';
COMMENT ON COLUMN public.engagement_posts.fetched_at IS 'When this post was scraped from LinkedIn';
