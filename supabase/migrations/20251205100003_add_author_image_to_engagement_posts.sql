-- Migration: Add author profile image URL to engagement_posts
-- Stores the author's profile image for display in engagement feed

ALTER TABLE public.engagement_posts
ADD COLUMN author_profile_image_url text;

COMMENT ON COLUMN public.engagement_posts.author_profile_image_url IS 'Author profile image URL from LinkedIn';
