-- Add missing columns to followed_profiles table
ALTER TABLE public.followed_profiles 
ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
ADD COLUMN IF NOT EXISTS title TEXT;