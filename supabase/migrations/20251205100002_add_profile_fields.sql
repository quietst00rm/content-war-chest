-- Migration: Add additional profile fields for richer display
-- Adds profile_image_url and title fields to followed_profiles

ALTER TABLE public.followed_profiles
ADD COLUMN profile_image_url text,
ADD COLUMN title text;

COMMENT ON COLUMN public.followed_profiles.profile_image_url IS 'LinkedIn profile image URL';
COMMENT ON COLUMN public.followed_profiles.title IS 'Professional title/headline from LinkedIn';
