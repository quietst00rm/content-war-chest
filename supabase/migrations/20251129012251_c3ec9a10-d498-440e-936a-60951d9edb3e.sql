-- Add user_id column to posts table
ALTER TABLE public.posts 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Assign all existing posts to joe@marketools.io
UPDATE public.posts 
SET user_id = '34f25d5b-0fcc-4792-822b-e7b30af21dd4';

-- Make user_id NOT NULL after populating existing data
ALTER TABLE public.posts 
ALTER COLUMN user_id SET NOT NULL;

-- Create index for faster queries
CREATE INDEX idx_posts_user_id ON public.posts(user_id);

-- Drop old permissive policies
DROP POLICY IF EXISTS "Allow public read access" ON public.posts;
DROP POLICY IF EXISTS "Allow public insert access" ON public.posts;
DROP POLICY IF EXISTS "Allow public update access" ON public.posts;
DROP POLICY IF EXISTS "Allow public delete access" ON public.posts;

-- Create user-scoped RLS policies
CREATE POLICY "Users can view own posts"
ON public.posts FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own posts"
ON public.posts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts"
ON public.posts FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
ON public.posts FOR DELETE
TO authenticated
USING (auth.uid() = user_id);