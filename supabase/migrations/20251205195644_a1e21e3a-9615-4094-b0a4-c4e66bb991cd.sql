
-- Create followed_profiles table
CREATE TABLE public.followed_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  linkedin_url TEXT NOT NULL,
  name TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_fetched_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint on user_id + linkedin_url
ALTER TABLE public.followed_profiles ADD CONSTRAINT followed_profiles_user_linkedin_unique UNIQUE (user_id, linkedin_url);

-- Enable RLS
ALTER TABLE public.followed_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for followed_profiles
CREATE POLICY "Users can view own followed profiles"
ON public.followed_profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own followed profiles"
ON public.followed_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own followed profiles"
ON public.followed_profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own followed profiles"
ON public.followed_profiles FOR DELETE
USING (auth.uid() = user_id);

-- Create engagement_posts table
CREATE TABLE public.engagement_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  profile_id UUID NOT NULL REFERENCES public.followed_profiles(id) ON DELETE CASCADE,
  linkedin_post_url TEXT NOT NULL,
  linkedin_post_id TEXT,
  author_name TEXT,
  author_profile_url TEXT,
  author_title TEXT,
  content TEXT NOT NULL,
  posted_at TIMESTAMP WITH TIME ZONE,
  posted_ago_text TEXT,
  days_ago INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  ai_comment TEXT,
  ai_comment_generated_at TIMESTAMP WITH TIME ZONE,
  user_comment TEXT,
  is_commented BOOLEAN NOT NULL DEFAULT false,
  commented_at TIMESTAMP WITH TIME ZONE,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint on linkedin_post_url per user
ALTER TABLE public.engagement_posts ADD CONSTRAINT engagement_posts_user_url_unique UNIQUE (user_id, linkedin_post_url);

-- Enable RLS
ALTER TABLE public.engagement_posts ENABLE ROW LEVEL SECURITY;

-- RLS policies for engagement_posts
CREATE POLICY "Users can view own engagement posts"
ON public.engagement_posts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own engagement posts"
ON public.engagement_posts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own engagement posts"
ON public.engagement_posts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own engagement posts"
ON public.engagement_posts FOR DELETE
USING (auth.uid() = user_id);

-- Add updated_at triggers
CREATE TRIGGER update_followed_profiles_updated_at
BEFORE UPDATE ON public.followed_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_engagement_posts_updated_at
BEFORE UPDATE ON public.engagement_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
