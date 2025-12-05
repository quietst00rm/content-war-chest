-- Migration: Create followed_profiles table
-- Stores LinkedIn profiles that the user wants to engage with

CREATE TABLE public.followed_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    linkedin_url text NOT NULL,
    name text,
    notes text,
    is_active boolean DEFAULT true,
    last_fetched_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.followed_profiles ENABLE ROW LEVEL SECURITY;

-- Create user-scoped RLS policies
CREATE POLICY "Users can view own followed profiles"
ON public.followed_profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own followed profiles"
ON public.followed_profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own followed profiles"
ON public.followed_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own followed profiles"
ON public.followed_profiles FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_followed_profiles_user_id ON public.followed_profiles(user_id);
CREATE INDEX idx_followed_profiles_is_active ON public.followed_profiles(is_active);
CREATE INDEX idx_followed_profiles_user_active ON public.followed_profiles(user_id, is_active);

-- Unique constraint: one profile URL per user
CREATE UNIQUE INDEX idx_followed_profiles_user_url
ON public.followed_profiles(user_id, linkedin_url);

-- Add updated_at trigger
CREATE TRIGGER update_followed_profiles_updated_at
    BEFORE UPDATE ON public.followed_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Add comments
COMMENT ON TABLE public.followed_profiles IS 'LinkedIn profiles that the user wants to engage with daily';
COMMENT ON COLUMN public.followed_profiles.linkedin_url IS 'LinkedIn profile URL (e.g., https://linkedin.com/in/username)';
COMMENT ON COLUMN public.followed_profiles.name IS 'Display name for the profile (can be fetched or manually entered)';
COMMENT ON COLUMN public.followed_profiles.notes IS 'User notes about why they follow this profile';
COMMENT ON COLUMN public.followed_profiles.is_active IS 'Whether to include this profile in daily fetches';
COMMENT ON COLUMN public.followed_profiles.last_fetched_at IS 'When posts were last fetched for this profile';
