import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schemas
const RefineAudienceSchema = z.object({
  action: z.literal('refine_audience'),
  expertise: z.string().min(10),
  market: z.enum(['health', 'wealth', 'relationships']),
  outcome: z.string(),
  who_you_help: z.string().min(5),
  what_you_help_them_do: z.string().min(5),
});

const GenerateValueStatementsSchema = z.object({
  action: z.literal('generate_value_statements'),
  expertise: z.string().min(10),
  expertise_source: z.string(),
  market: z.enum(['health', 'wealth', 'relationships']),
  outcome: z.string(),
  who_you_help: z.string().min(5),
  what_you_help_them_do: z.string().min(5),
});

const GenerateContentIdeasSchema = z.object({
  action: z.literal('generate_content_ideas'),
  expertise: z.string().min(10),
  market: z.enum(['health', 'wealth', 'relationships']),
  outcome: z.string(),
  who_you_help: z.string().min(5),
  what_you_help_them_do: z.string().min(5),
  expansion_potential: z.string().optional(),
});

const RequestSchema = z.discriminatedUnion('action', [
  RefineAudienceSchema,
  GenerateValueStatementsSchema,
  GenerateContentIdeasSchema,
]);

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);

    if (response.status === 503 && attempt < maxRetries) {
      const delay = Math.pow(2, attempt - 1) * 1000;
      console.log(`AI gateway unavailable (503), retry ${attempt}/${maxRetries - 1} in ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
      continue;
    }

    return response;
  }

  throw new Error('Max retries exceeded');
}

async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY is not configured');
  }

  const response = await fetchWithRetry('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI gateway error:', response.status, errorText);

    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    if (response.status === 402) {
      throw new Error('Payment required. Please add credits to your workspace.');
    }
    if (response.status === 503) {
      throw new Error('AI service temporarily unavailable. Please try again in a moment.');
    }

    throw new Error(`AI gateway error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

function getOutcomeLabel(outcome: string): string {
  const labels: Record<string, string> = {
    make_money: "make more money",
    save_money: "save money",
    save_time: "save time and be more productive",
    health_fitness: "improve their health and fitness",
    attractiveness: "look and feel more attractive",
    peace_of_mind: "find peace of mind and reduce stress",
  };
  return labels[outcome] || outcome;
}

function getMarketLabel(market: string): string {
  const labels: Record<string, string> = {
    health: "Health & Wellness",
    wealth: "Wealth & Business",
    relationships: "Relationships & Connection",
  };
  return labels[market] || market;
}

async function refineAudience(data: z.infer<typeof RefineAudienceSchema>) {
  const systemPrompt = `You are an expert personal brand strategist who helps creators define their target audience with laser precision.

Your job is to take a rough audience description and refine it into more specific, compelling alternatives that will resonate better with potential customers.

Guidelines:
- Be SPECIFIC - avoid generic terms like "people", "everyone", "businesses"
- Include demographic details where relevant (age, career stage, situation)
- Focus on the pain point or aspiration that makes them ideal customers
- Keep suggestions concise but descriptive (10-20 words each)
- Make the audience feel attainable and reachable

Return your response as valid JSON with this exact structure:
{
  "refined_who": [
    "Suggestion 1 - most specific version",
    "Suggestion 2 - alternative angle",
    "Suggestion 3 - different niche within the audience"
  ],
  "refined_what": [
    "Transformation 1 - benefit-focused",
    "Transformation 2 - outcome-focused",
    "Transformation 3 - action-focused"
  ],
  "tip": "One sentence of advice on why specificity matters for their particular market"
}`;

  const userPrompt = `Help me refine my target audience description.

My expertise: ${data.expertise}
Market: ${getMarketLabel(data.market)}
Primary outcome I deliver: ${getOutcomeLabel(data.outcome)}

Current audience description:
- Who I help: "${data.who_you_help}"
- What I help them do: "${data.what_you_help_them_do}"

Please suggest 3 more specific versions of each.`;

  const response = await callAI(systemPrompt, userPrompt);

  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from AI response');
  }

  return JSON.parse(jsonMatch[0]);
}

async function generateValueStatements(data: z.infer<typeof GenerateValueStatementsSchema>) {
  const systemPrompt = `You are an expert copywriter specializing in personal brand positioning and value propositions.

Your job is to take raw inputs about someone's expertise and audience, then craft compelling value statements they can use in their bio, website, and marketing.

Create variations for different use cases:
1. Headline - punchy, attention-grabbing (under 10 words)
2. Bio - conversational, personal (1-2 sentences)
3. Elevator Pitch - complete but concise (2-3 sentences)
4. LinkedIn Headline - professional, keyword-rich (under 120 characters)

Guidelines:
- Lead with the transformation/benefit, not the method
- Use active, powerful language
- Avoid jargon and buzzwords
- Make it memorable and unique to them
- Include specificity from their expertise

Return your response as valid JSON with this exact structure:
{
  "headline": "Short punchy headline",
  "bio": "Conversational 1-2 sentence bio",
  "elevator_pitch": "Complete 2-3 sentence pitch",
  "linkedin_headline": "Professional headline under 120 chars",
  "positioning_statement": "For [audience], I am the [unique angle] who helps them [transformation] through [method/approach]"
}`;

  const userPrompt = `Create value statement variations for my personal brand.

Expertise source: ${data.expertise_source}
My expertise: ${data.expertise}
Market: ${getMarketLabel(data.market)}
Primary outcome: ${getOutcomeLabel(data.outcome)}
Who I help: ${data.who_you_help}
What I help them do: ${data.what_you_help_them_do}

Create compelling variations I can use across my brand.`;

  const response = await callAI(systemPrompt, userPrompt);

  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from AI response');
  }

  return JSON.parse(jsonMatch[0]);
}

async function generateContentIdeas(data: z.infer<typeof GenerateContentIdeasSchema>) {
  const systemPrompt = `You are an expert content strategist who helps creators plan their content calendar.

Your job is to generate specific, actionable content ideas based on someone's expertise and target audience. Focus on content that:
- Demonstrates their expertise
- Addresses their audience's pain points
- Builds trust and authority
- Is suitable for LinkedIn and social media

Return your response as valid JSON with this exact structure:
{
  "pillar_topics": [
    "Core topic 1 they should own",
    "Core topic 2 they should own",
    "Core topic 3 they should own"
  ],
  "content_ideas": [
    {
      "title": "Post title or hook",
      "type": "story|lesson|how-to|myth-busting|case-study",
      "angle": "Brief description of the unique angle"
    }
  ],
  "lead_magnet_ideas": [
    "Free resource idea 1",
    "Free resource idea 2"
  ],
  "content_series": {
    "name": "Name for a recurring content series",
    "description": "What the series covers"
  }
}

Generate exactly 10 content ideas.`;

  const userPrompt = `Generate content ideas for my personal brand.

My expertise: ${data.expertise}
Market: ${getMarketLabel(data.market)}
Primary outcome: ${getOutcomeLabel(data.outcome)}
Who I help: ${data.who_you_help}
What I help them do: ${data.what_you_help_them_do}
${data.expansion_potential ? `Expansion topics I'm interested in: ${data.expansion_potential}` : ''}

Give me content ideas that will resonate with my specific audience.`;

  const response = await callAI(systemPrompt, userPrompt);

  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from AI response');
  }

  return JSON.parse(jsonMatch[0]);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validationResult = RequestSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return new Response(
        JSON.stringify({ error: `Invalid input: ${errorMessage}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = validationResult.data;
    let result: unknown;

    console.log(`Processing discovery-ai action: ${data.action}`);

    switch (data.action) {
      case 'refine_audience':
        result = await refineAudience(data);
        break;
      case 'generate_value_statements':
        result = await generateValueStatements(data);
        break;
      case 'generate_content_ideas':
        result = await generateContentIdeas(data);
        break;
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in discovery-ai function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
