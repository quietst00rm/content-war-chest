-- Migration: Create user_strategy table
-- Stores user's business idea validation and strategy data from the Discovery Wizard

CREATE TABLE public.user_strategy (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Step 1: Expertise Source
    idea_source text CHECK (idea_source IN ('practical_experience', 'learned_obsession', 'advice_sought', 'problem_solved')),
    idea_source_details text,
    years_experience integer CHECK (years_experience >= 0 AND years_experience <= 50),

    -- Step 2: Market Alignment
    target_market text CHECK (target_market IN ('health', 'wealth', 'relationships')),
    primary_outcome text CHECK (primary_outcome IN ('make_money', 'save_money', 'save_time', 'health_fitness', 'attractiveness', 'peace_of_mind')),

    -- Step 3: Target Audience
    who_you_help text,
    what_you_help_them_do text,

    -- Step 4: Validation Check
    validation_enjoyment text CHECK (validation_enjoyment IN ('yes', 'somewhat', 'no')),
    validation_learning text CHECK (validation_learning IN ('yes', 'somewhat', 'no')),
    validation_longevity text CHECK (validation_longevity IN ('yes', 'probably', 'unsure', 'no')),
    expansion_potential text,

    -- Step 5: Results (calculated)
    validation_score integer CHECK (validation_score >= 0 AND validation_score <= 9),
    validation_status text CHECK (validation_status IN ('strong', 'moderate', 'weak')),
    value_statement_seed text,

    -- Wizard progress tracking
    current_step integer DEFAULT 1 CHECK (current_step >= 1 AND current_step <= 5),
    stage_1_completed boolean DEFAULT false,
    stage_1_completed_at timestamptz,

    -- Metadata
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_strategy ENABLE ROW LEVEL SECURITY;

-- Create user-scoped RLS policies
CREATE POLICY "Users can view own strategy"
ON public.user_strategy FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own strategy"
ON public.user_strategy FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own strategy"
ON public.user_strategy FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own strategy"
ON public.user_strategy FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Unique constraint: one strategy per user
CREATE UNIQUE INDEX idx_user_strategy_user_id ON public.user_strategy(user_id);

-- Performance indexes
CREATE INDEX idx_user_strategy_stage_completed ON public.user_strategy(stage_1_completed);
CREATE INDEX idx_user_strategy_validation_status ON public.user_strategy(validation_status);

-- Add updated_at trigger
CREATE TRIGGER update_user_strategy_updated_at
    BEFORE UPDATE ON public.user_strategy
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();