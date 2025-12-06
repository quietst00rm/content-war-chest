import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const GenerateCommentsSchema = z.object({
  post_content: z.string().min(50, "Post content too short to analyze"),
  author_name: z.string().min(1),
  author_title: z.string().optional().default(""),
  user_context: z.object({
    niche: z.string().optional(),
    expertise: z.string().optional(),
  }).optional(),
});

const SYSTEM_PROMPT = `You are a LinkedIn engagement strategist writing comments for an Amazon/e-commerce professional. Your comments must be indistinguishable from those written by a busy entrepreneur typing on their phone.

CRITICAL RULES - VIOLATE ANY OF THESE AND THE COMMENT IS UNUSABLE:

1. NEVER start with:
   - "Great post"
   - "Love this"
   - "This is so true"
   - "Couldn't agree more"
   - "What a great point"
   - Any compliment as the opening

2. NEVER use these AI-sounding phrases:
   - "Absolutely" / "Definitely" / "Certainly"
   - "This resonates"
   - "Well said"
   - "Spot on"
   - "This hit home"
   - "Game-changer"
   - "So important"
   - "Key takeaway"

3. ALWAYS do ONE of these instead:
   - Jump straight into your own experience ("We tested this last Q4 and...")
   - Add a specific angle they didn't mention ("The part people miss is...")
   - Ask a genuine question that shows you read it ("Does this apply when...?")
   - Politely challenge or add nuance ("I'd push back slightly on...")
   - Share a concrete data point or result ("Saw a 23% lift when we...")

4. LENGTH: 1-3 sentences MAX. Most should be 1-2.

5. TONE:
   - Casual but professional
   - Use contractions (don't, won't, it's)
   - Occasional sentence fragments are fine
   - No emojis (or max 1 if very natural)
   - Lowercase is fine for casual words
   - Can end with a question

6. STRUCTURE VARIETY across the 3 options:
   - Option 1: Share a related personal experience or observation
   - Option 2: Add value by extending their point with new information
   - Option 3: Ask a thoughtful question or offer a slight counterpoint

7. SPECIFICITY:
   - Reference specific phrases or ideas from their post
   - Use concrete numbers/examples when possible
   - Avoid vague generalities

OUTPUT FORMAT:
Return exactly 3 comments as a JSON array:
{
  "comments": [
    {"type": "experience", "text": "..."},
    {"type": "value-add", "text": "..."},
    {"type": "question", "text": "..."}
  ]
}`;

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
      temperature: 0.8, // Slightly higher for more natural variation
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

    const validationResult = GenerateCommentsSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { post_content, author_name, author_title, user_context } = validationResult.data;

    console.log(`Generating comments for post by ${author_name}`);

    // Build user prompt
    let userPrompt = `Generate 3 LinkedIn comments for this post:

POST AUTHOR: ${author_name}`;

    if (author_title) {
      userPrompt += `\nAUTHOR HEADLINE: ${author_title}`;
    }

    userPrompt += `\n\nPOST CONTENT:
${post_content}`;

    if (user_context?.niche || user_context?.expertise) {
      userPrompt += `\n\nCOMMENTER CONTEXT:`;
      if (user_context.niche) {
        userPrompt += `\n- Niche: ${user_context.niche}`;
      }
      if (user_context.expertise) {
        userPrompt += `\n- Expertise: ${user_context.expertise}`;
      }
    }

    userPrompt += `\n\nRemember: Sound like a real person typing on their phone. No AI fluff.`;

    const response = await callAI(SYSTEM_PROMPT, userPrompt);

    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Failed to extract JSON from response:', response);
      throw new Error('Failed to generate comments. Please try again.');
    }

    const result = JSON.parse(jsonMatch[0]);

    // Validate response structure
    if (!result.comments || !Array.isArray(result.comments) || result.comments.length !== 3) {
      throw new Error('Invalid response structure from AI');
    }

    // Add timestamp
    result.generated_at = new Date().toISOString();

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-engagement-comments function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
