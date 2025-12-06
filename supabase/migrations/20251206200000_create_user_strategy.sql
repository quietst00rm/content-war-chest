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

-- Add comments
COMMENT ON TABLE public.user_strategy IS 'User business idea validation and strategy from Discovery Wizard';
COMMENT ON COLUMN public.user_strategy.idea_source IS 'Source of expertise: practical_experience, learned_obsession, advice_sought, problem_solved';
COMMENT ON COLUMN public.user_strategy.idea_source_details IS 'Detailed description of the user expertise (min 50 chars)';
COMMENT ON COLUMN public.user_strategy.years_experience IS 'Years of experience in the field (0-50)';
COMMENT ON COLUMN public.user_strategy.target_market IS 'Primary market: health, wealth, relationships';
COMMENT ON COLUMN public.user_strategy.primary_outcome IS 'What outcome they deliver to customers';
COMMENT ON COLUMN public.user_strategy.who_you_help IS 'Specific description of target customer (max 100 chars)';
COMMENT ON COLUMN public.user_strategy.what_you_help_them_do IS 'What transformation or action they enable (max 150 chars)';
COMMENT ON COLUMN public.user_strategy.validation_enjoyment IS 'Do they enjoy doing this: yes, somewhat, no';
COMMENT ON COLUMN public.user_strategy.validation_learning IS 'Are they excited to keep learning: yes, somewhat, no';
COMMENT ON COLUMN public.user_strategy.validation_longevity IS 'Will they still enjoy this in 6-12 months: yes, probably, unsure, no';
COMMENT ON COLUMN public.user_strategy.expansion_potential IS 'Related topics they could expand into';
COMMENT ON COLUMN public.user_strategy.validation_score IS 'Calculated score 0-9 based on validation answers';
COMMENT ON COLUMN public.user_strategy.validation_status IS 'Status based on score: strong (7-9), moderate (4-6), weak (0-3)';
COMMENT ON COLUMN public.user_strategy.value_statement_seed IS 'Generated value statement: I help [who] [what]';
COMMENT ON COLUMN public.user_strategy.current_step IS 'Current step in the wizard (1-5)';
COMMENT ON COLUMN public.user_strategy.stage_1_completed IS 'Whether Stage 1 (Discovery Wizard) is completed';
COMMENT ON COLUMN public.user_strategy.stage_1_completed_at IS 'Timestamp when Stage 1 was completed';
