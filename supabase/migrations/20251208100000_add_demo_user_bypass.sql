-- Migration: Add demo user bypass for RLS policies
-- This allows the demo user ID to perform operations without real authentication

-- Demo user ID used in the app
-- 34f25d5b-0fcc-4792-822b-e7b30af21dd4

-- Posts table: Allow demo user
CREATE POLICY "Demo user can read posts" ON public.posts
  FOR SELECT USING (user_id = '34f25d5b-0fcc-4792-822b-e7b30af21dd4'::uuid);

CREATE POLICY "Demo user can insert posts" ON public.posts
  FOR INSERT WITH CHECK (user_id = '34f25d5b-0fcc-4792-822b-e7b30af21dd4'::uuid);

CREATE POLICY "Demo user can update posts" ON public.posts
  FOR UPDATE USING (user_id = '34f25d5b-0fcc-4792-822b-e7b30af21dd4'::uuid)
  WITH CHECK (user_id = '34f25d5b-0fcc-4792-822b-e7b30af21dd4'::uuid);

CREATE POLICY "Demo user can delete posts" ON public.posts
  FOR DELETE USING (user_id = '34f25d5b-0fcc-4792-822b-e7b30af21dd4'::uuid);

-- Engagement posts table: Allow demo user
CREATE POLICY "Demo user can view engagement posts" ON public.engagement_posts
  FOR SELECT USING (user_id = '34f25d5b-0fcc-4792-822b-e7b30af21dd4'::uuid);

CREATE POLICY "Demo user can insert engagement posts" ON public.engagement_posts
  FOR INSERT WITH CHECK (user_id = '34f25d5b-0fcc-4792-822b-e7b30af21dd4'::uuid);

CREATE POLICY "Demo user can update engagement posts" ON public.engagement_posts
  FOR UPDATE USING (user_id = '34f25d5b-0fcc-4792-822b-e7b30af21dd4'::uuid)
  WITH CHECK (user_id = '34f25d5b-0fcc-4792-822b-e7b30af21dd4'::uuid);

CREATE POLICY "Demo user can delete engagement posts" ON public.engagement_posts
  FOR DELETE USING (user_id = '34f25d5b-0fcc-4792-822b-e7b30af21dd4'::uuid);

-- Followed profiles table: Allow demo user
CREATE POLICY "Demo user can view followed profiles" ON public.followed_profiles
  FOR SELECT USING (user_id = '34f25d5b-0fcc-4792-822b-e7b30af21dd4'::uuid);

CREATE POLICY "Demo user can insert followed profiles" ON public.followed_profiles
  FOR INSERT WITH CHECK (user_id = '34f25d5b-0fcc-4792-822b-e7b30af21dd4'::uuid);

CREATE POLICY "Demo user can update followed profiles" ON public.followed_profiles
  FOR UPDATE USING (user_id = '34f25d5b-0fcc-4792-822b-e7b30af21dd4'::uuid)
  WITH CHECK (user_id = '34f25d5b-0fcc-4792-822b-e7b30af21dd4'::uuid);

CREATE POLICY "Demo user can delete followed profiles" ON public.followed_profiles
  FOR DELETE USING (user_id = '34f25d5b-0fcc-4792-822b-e7b30af21dd4'::uuid);
