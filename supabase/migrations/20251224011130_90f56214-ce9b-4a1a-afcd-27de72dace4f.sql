-- Create comment_options table for storing AI-generated comment options
CREATE TABLE public.comment_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  engagement_post_id UUID NOT NULL REFERENCES public.engagement_posts(id) ON DELETE CASCADE,
  option_number INTEGER NOT NULL CHECK (option_number >= 1 AND option_number <= 3),
  comment_text TEXT NOT NULL,
  approach_type TEXT NOT NULL CHECK (approach_type IN ('specific_detail', 'hidden_dynamic', 'practical_implication')),
  claimed_by UUID,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on comment_options
ALTER TABLE public.comment_options ENABLE ROW LEVEL SECURITY;

-- RLS policies for comment_options
CREATE POLICY "Users can view comment options for their posts"
  ON public.comment_options FOR SELECT
  USING (
    engagement_post_id IN (
      SELECT id FROM public.engagement_posts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert comment options for their posts"
  ON public.comment_options FOR INSERT
  WITH CHECK (
    engagement_post_id IN (
      SELECT id FROM public.engagement_posts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update comment options for their posts"
  ON public.comment_options FOR UPDATE
  USING (
    engagement_post_id IN (
      SELECT id FROM public.engagement_posts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete comment options for their posts"
  ON public.comment_options FOR DELETE
  USING (
    engagement_post_id IN (
      SELECT id FROM public.engagement_posts WHERE user_id = auth.uid()
    )
  );

-- Public read access for demo user
CREATE POLICY "Public read access to demo user comment_options"
  ON public.comment_options FOR SELECT
  USING (
    engagement_post_id IN (
      SELECT id FROM public.engagement_posts WHERE user_id = '34f25d5b-0fcc-4792-822b-e7b30af21dd4'::uuid
    )
  );

-- Create engagement_posts_with_profile view
CREATE VIEW public.engagement_posts_with_profile AS
SELECT 
  ep.id,
  ep.user_id,
  ep.profile_id,
  ep.linkedin_post_url,
  ep.content,
  ep.posted_at,
  ep.fetched_at,
  ep.created_at,
  ep.likes,
  ep.comments,
  ep.shares,
  ep.is_commented,
  ep.is_hidden,
  ep.ai_comment,
  ep.ai_comment_generated_at,
  -- Computed field for expiry (posts older than 48 hours)
  CASE WHEN ep.posted_at < (now() - interval '48 hours') THEN true ELSE false END as is_expired,
  -- Profile/author info
  ep.author_name,
  ep.author_title,
  ep.author_profile_image_url as author_avatar,
  ep.author_profile_url as author_linkedin_url,
  -- Joined profile data
  fp.linkedin_url as profile_linkedin_url,
  fp.name as profile_name
FROM public.engagement_posts ep
LEFT JOIN public.followed_profiles fp ON ep.profile_id = fp.id;

-- Index for faster lookups
CREATE INDEX idx_comment_options_engagement_post_id ON public.comment_options(engagement_post_id);
CREATE INDEX idx_comment_options_claimed_by ON public.comment_options(claimed_by);