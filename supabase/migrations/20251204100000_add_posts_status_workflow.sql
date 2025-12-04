-- Migration: Add workflow status to posts table
-- Adds status column for workflow management, scheduled_for and scheduled_platform columns for calendar functionality

-- Add status column with check constraint
ALTER TABLE public.posts
ADD COLUMN status text DEFAULT 'draft'
CHECK (status IN ('idea', 'draft', 'ready', 'scheduled', 'used', 'archived'));

-- Add scheduled_for column for calendar functionality
ALTER TABLE public.posts
ADD COLUMN scheduled_for timestamptz;

-- Add scheduled_platform column
ALTER TABLE public.posts
ADD COLUMN scheduled_platform text;

-- Migrate existing data based on is_used column
UPDATE public.posts
SET status = CASE
    WHEN is_used = true THEN 'used'
    ELSE 'ready'
END;

-- Create index on status column for faster filtering
CREATE INDEX idx_posts_status ON public.posts(status);

-- Create index on scheduled_for for calendar queries
CREATE INDEX idx_posts_scheduled_for ON public.posts(scheduled_for);

-- Add comment explaining the status workflow
COMMENT ON COLUMN public.posts.status IS 'Workflow status: idea -> draft -> ready -> scheduled -> used -> archived';
COMMENT ON COLUMN public.posts.scheduled_for IS 'Timestamp when post is scheduled to be published';
COMMENT ON COLUMN public.posts.scheduled_platform IS 'Platform where post is scheduled to be published';
