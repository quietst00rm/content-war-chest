-- Create posts table with full-text search
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  formatted_content TEXT NOT NULL,
  primary_category TEXT NOT NULL,
  subcategory TEXT,
  tags TEXT[] DEFAULT '{}',
  target_audience TEXT,
  summary TEXT,
  character_count INTEGER,
  source_section TEXT,
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP WITH TIME ZONE,
  usage_count INTEGER DEFAULT 0,
  notes TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Create policies (public access for now - no auth required)
CREATE POLICY "Allow public read access" ON public.posts
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access" ON public.posts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access" ON public.posts
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access" ON public.posts
  FOR DELETE USING (true);

-- Create indexes for performance
CREATE INDEX idx_posts_category ON public.posts(primary_category);
CREATE INDEX idx_posts_tags ON public.posts USING GIN(tags);
CREATE INDEX idx_posts_is_used ON public.posts(is_used);
CREATE INDEX idx_posts_is_favorite ON public.posts(is_favorite);
CREATE INDEX idx_posts_created_at ON public.posts(created_at DESC);

-- Create full-text search index
CREATE INDEX idx_posts_search ON public.posts USING GIN(
  to_tsvector('english', title || ' ' || content || ' ' || COALESCE(summary, ''))
);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();