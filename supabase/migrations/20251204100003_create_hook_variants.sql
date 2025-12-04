-- Migration: Create hook_variants table
-- Stores multiple hook options per post for A/B testing and variation

CREATE TABLE public.hook_variants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    hook_text text NOT NULL,
    is_primary boolean DEFAULT false,
    source text NOT NULL CHECK (source IN ('original', 'ai_generated', 'manual')),
    times_used integer DEFAULT 0,
    avg_performance_score numeric,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.hook_variants ENABLE ROW LEVEL SECURITY;

-- Create user-scoped RLS policies
CREATE POLICY "Users can view own hook variants"
ON public.hook_variants FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own hook variants"
ON public.hook_variants FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own hook variants"
ON public.hook_variants FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own hook variants"
ON public.hook_variants FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_hook_variants_post_id ON public.hook_variants(post_id);
CREATE INDEX idx_hook_variants_user_id ON public.hook_variants(user_id);
CREATE INDEX idx_hook_variants_is_primary ON public.hook_variants(is_primary);

-- Unique constraint: only one primary hook per post
CREATE UNIQUE INDEX idx_hook_variants_primary_unique
ON public.hook_variants(post_id)
WHERE is_primary = true;

-- Add updated_at trigger
CREATE TRIGGER update_hook_variants_updated_at
    BEFORE UPDATE ON public.hook_variants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Add comments
COMMENT ON TABLE public.hook_variants IS 'Stores multiple hook options per post for testing and variation';
COMMENT ON COLUMN public.hook_variants.source IS 'Where the hook came from: original (from post), ai_generated, or manual';
COMMENT ON COLUMN public.hook_variants.times_used IS 'Number of times this hook has been used';
COMMENT ON COLUMN public.hook_variants.avg_performance_score IS 'Average performance score when using this hook';
