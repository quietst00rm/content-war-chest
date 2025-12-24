-- Fix the view security issue by recreating without SECURITY DEFINER
DROP VIEW IF EXISTS public.engagement_posts_with_profile;

CREATE VIEW public.engagement_posts_with_profile 
WITH (security_invoker = true) AS
SELECT 
  ep.id,
  ep.user_id,
  ep.profile_id,
  ep.linkedin_post_url,
  ep.content,
  ep.posted_at,
  ep.fetched_at,
  ep.created_at,
  ep.likes,
  ep.comments,
  ep.shares,
  ep.is_commented,
  ep.is_hidden,
  ep.ai_comment,
  ep.ai_comment_generated_at,
  CASE WHEN ep.posted_at < (now() - interval '48 hours') THEN true ELSE false END as is_expired,
  ep.author_name,
  ep.author_title,
  ep.author_profile_image_url as author_avatar,
  ep.author_profile_url as author_linkedin_url,
  fp.linkedin_url as profile_linkedin_url,
  fp.name as profile_name
FROM public.engagement_posts ep
LEFT JOIN public.followed_profiles fp ON ep.profile_id = fp.id;