-- Create folders table
CREATE TABLE public.folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text DEFAULT '#6b7280',
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

-- User-scoped RLS policies
CREATE POLICY "Users can view own folders" ON public.folders
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert own folders" ON public.folders
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update own folders" ON public.folders
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
  
CREATE POLICY "Users can delete own folders" ON public.folders
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_folders_updated_at
  BEFORE UPDATE ON public.folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Create index
CREATE INDEX idx_folders_user_id ON public.folders(user_id);

-- Add folder_id to posts table
ALTER TABLE public.posts 
ADD COLUMN folder_id uuid REFERENCES public.folders(id) ON DELETE SET NULL;

CREATE INDEX idx_posts_folder_id ON public.posts(folder_id);