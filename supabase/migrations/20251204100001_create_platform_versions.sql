-- Migration: Create platform_versions table
-- Stores platform-specific adaptations of posts (Twitter, Newsletter versions)

CREATE TABLE public.platform_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    platform text NOT NULL CHECK (platform IN ('linkedin', 'twitter', 'newsletter')),
    content text NOT NULL,
    formatted_content text,
    character_count integer,
    is_primary boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.platform_versions ENABLE ROW LEVEL SECURITY;

-- Create user-scoped RLS policies
CREATE POLICY "Users can view own platform versions"
ON public.platform_versions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own platform versions"
ON public.platform_versions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own platform versions"
ON public.platform_versions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own platform versions"
ON public.platform_versions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_platform_versions_post_id ON public.platform_versions(post_id);
CREATE INDEX idx_platform_versions_user_id ON public.platform_versions(user_id);
CREATE INDEX idx_platform_versions_platform ON public.platform_versions(platform);
CREATE INDEX idx_platform_versions_post_platform ON public.platform_versions(post_id, platform);

-- Unique constraint: only one primary version per post per platform
CREATE UNIQUE INDEX idx_platform_versions_primary_unique
ON public.platform_versions(post_id, platform)
WHERE is_primary = true;

-- Add updated_at trigger
CREATE TRIGGER update_platform_versions_updated_at
    BEFORE UPDATE ON public.platform_versions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Add comments
COMMENT ON TABLE public.platform_versions IS 'Stores platform-specific adaptations of posts';
COMMENT ON COLUMN public.platform_versions.platform IS 'Target platform: linkedin, twitter, or newsletter';
COMMENT ON COLUMN public.platform_versions.is_primary IS 'Whether this is the primary version for this platform';
