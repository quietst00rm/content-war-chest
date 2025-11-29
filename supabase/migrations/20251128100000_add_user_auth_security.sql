-- Migration: Add user authentication and secure RLS policies
-- This migration secures the posts table by:
-- 1. Adding a user_id column linked to auth.users
-- 2. Dropping the insecure public access policies
-- 3. Creating owner-based access policies

-- Add user_id column to posts table
ALTER TABLE public.posts ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Create index for user_id lookups
CREATE INDEX idx_posts_user_id ON public.posts(user_id);

-- Drop existing insecure policies
DROP POLICY IF EXISTS "Allow public read access" ON public.posts;
DROP POLICY IF EXISTS "Allow public insert access" ON public.posts;
DROP POLICY IF EXISTS "Allow public update access" ON public.posts;
DROP POLICY IF EXISTS "Allow public delete access" ON public.posts;

-- Create secure owner-based policies
-- Users can only read their own posts
CREATE POLICY "Users can read own posts" ON public.posts
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert posts with their own user_id
CREATE POLICY "Users can insert own posts" ON public.posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own posts
CREATE POLICY "Users can update own posts" ON public.posts
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own posts
CREATE POLICY "Users can delete own posts" ON public.posts
  FOR DELETE USING (auth.uid() = user_id);

-- Note: After this migration runs, you'll need to:
-- 1. Update existing posts to assign them to a user, OR
-- 2. Delete existing posts if they're test data
--
-- To assign existing posts to a specific user, run:
-- UPDATE public.posts SET user_id = 'YOUR_USER_UUID_HERE' WHERE user_id IS NULL;
