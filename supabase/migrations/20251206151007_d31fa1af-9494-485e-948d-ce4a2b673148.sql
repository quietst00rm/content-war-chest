-- Allow public read access to Joe's posts
CREATE POLICY "Public read access to demo user posts"
ON public.posts FOR SELECT
TO anon
USING (user_id = '34f25d5b-0fcc-4792-822b-e7b30af21dd4'::uuid);

-- Allow public read access to Joe's folders
CREATE POLICY "Public read access to demo user folders"
ON public.folders FOR SELECT
TO anon
USING (user_id = '34f25d5b-0fcc-4792-822b-e7b30af21dd4'::uuid);

-- Allow public read access to Joe's followed profiles
CREATE POLICY "Public read access to demo user followed_profiles"
ON public.followed_profiles FOR SELECT
TO anon
USING (user_id = '34f25d5b-0fcc-4792-822b-e7b30af21dd4'::uuid);

-- Allow public read access to Joe's engagement posts
CREATE POLICY "Public read access to demo user engagement_posts"
ON public.engagement_posts FOR SELECT
TO anon
USING (user_id = '34f25d5b-0fcc-4792-822b-e7b30af21dd4'::uuid);