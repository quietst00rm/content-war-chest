-- Migration: Create performance_logs table
-- Stores manual performance tracking data for posts

CREATE TABLE public.performance_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    platform text NOT NULL CHECK (platform IN ('linkedin', 'twitter', 'newsletter')),
    logged_at timestamptz DEFAULT now(),
    posted_at timestamptz,
    impressions integer,
    likes integer,
    comments integer,
    shares integer,
    clicks integer,
    engagement_rate numeric,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.performance_logs ENABLE ROW LEVEL SECURITY;

-- Create user-scoped RLS policies
CREATE POLICY "Users can view own performance logs"
ON public.performance_logs FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own performance logs"
ON public.performance_logs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own performance logs"
ON public.performance_logs FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own performance logs"
ON public.performance_logs FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_performance_logs_post_id ON public.performance_logs(post_id);
CREATE INDEX idx_performance_logs_user_id ON public.performance_logs(user_id);
CREATE INDEX idx_performance_logs_platform ON public.performance_logs(platform);
CREATE INDEX idx_performance_logs_logged_at ON public.performance_logs(logged_at);
CREATE INDEX idx_performance_logs_posted_at ON public.performance_logs(posted_at);

-- Add updated_at trigger
CREATE TRIGGER update_performance_logs_updated_at
    BEFORE UPDATE ON public.performance_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Add comments
COMMENT ON TABLE public.performance_logs IS 'Manual performance tracking for posts across platforms';
COMMENT ON COLUMN public.performance_logs.logged_at IS 'When this performance data was logged';
COMMENT ON COLUMN public.performance_logs.posted_at IS 'When the post was actually published';
COMMENT ON COLUMN public.performance_logs.engagement_rate IS 'Calculated or manually entered engagement rate';
