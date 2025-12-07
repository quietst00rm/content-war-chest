-- Migration: Update AI comment schema for single comment approach
-- Adds approach and tone fields, updates ai_comment to store new format

-- Add new columns for comment approach and tone
ALTER TABLE public.engagement_posts
ADD COLUMN IF NOT EXISTS ai_comment_approach text,
ADD COLUMN IF NOT EXISTS ai_comment_tone text;

-- Add check constraint for valid approach values
ALTER TABLE public.engagement_posts
ADD CONSTRAINT check_ai_comment_approach
CHECK (ai_comment_approach IS NULL OR ai_comment_approach IN ('micro', 'reaction', 'opinion', 'question', 'support', 'disagree'));

-- Add check constraint for valid tone values
ALTER TABLE public.engagement_posts
ADD CONSTRAINT check_ai_comment_tone
CHECK (ai_comment_tone IS NULL OR ai_comment_tone IN ('casual', 'professional', 'playful', 'empathetic'));

-- Create index for filtering by approach type
CREATE INDEX IF NOT EXISTS idx_engagement_posts_approach
ON public.engagement_posts(ai_comment_approach);

-- Add comments for new columns
COMMENT ON COLUMN public.engagement_posts.ai_comment_approach IS 'Type of AI comment approach: micro, reaction, opinion, question, support, or disagree';
COMMENT ON COLUMN public.engagement_posts.ai_comment_tone IS 'Tone matched to post energy: casual, professional, playful, or empathetic';

-- Note: ai_comment column now stores a simple text string (the comment itself)
-- instead of the previous JSON format with multiple comment options.
-- Old format: {"comments": [{"type": "experience", "text": "..."}, ...]}
-- New format: Plain text comment string
