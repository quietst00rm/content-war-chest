-- Migration: Update AI comment approach types
-- Changes approach types from (micro, reaction, opinion, question, support, disagree)
-- to (reaction, agreement_with_addition, personal_take, supportive)

-- Drop the old check constraint
ALTER TABLE public.engagement_posts
DROP CONSTRAINT IF EXISTS check_ai_comment_approach;

-- Add new check constraint for valid approach values
ALTER TABLE public.engagement_posts
ADD CONSTRAINT check_ai_comment_approach
CHECK (ai_comment_approach IS NULL OR ai_comment_approach IN ('reaction', 'agreement_with_addition', 'personal_take', 'supportive'));

-- Update any existing approach values to map to new types
UPDATE public.engagement_posts
SET ai_comment_approach = CASE
    WHEN ai_comment_approach = 'micro' THEN 'reaction'
    WHEN ai_comment_approach = 'opinion' THEN 'personal_take'
    WHEN ai_comment_approach = 'question' THEN 'reaction'
    WHEN ai_comment_approach = 'support' THEN 'supportive'
    WHEN ai_comment_approach = 'disagree' THEN 'personal_take'
    ELSE ai_comment_approach
END
WHERE ai_comment_approach IS NOT NULL;

-- Update the tone constraint to allow more flexible values
ALTER TABLE public.engagement_posts
DROP CONSTRAINT IF EXISTS check_ai_comment_tone;

-- Add new tone constraint (more flexible)
ALTER TABLE public.engagement_posts
ADD CONSTRAINT check_ai_comment_tone
CHECK (ai_comment_tone IS NULL OR ai_comment_tone IN ('casual', 'professional', 'playful', 'empathetic', 'punchy', 'formal'));

-- Add comment for new approach types
COMMENT ON COLUMN public.engagement_posts.ai_comment_approach IS 'Type of AI comment approach: reaction, agreement_with_addition, personal_take, or supportive';
