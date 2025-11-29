import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const FormatPostSchema = z.object({
  content: z.string()
    .min(10, "Content must be at least 10 characters")
    .max(50000, "Content must be less than 50,000 characters")
    .refine(val => val.trim().length > 0, "Content cannot be empty or whitespace only")
});

const SYSTEM_PROMPT = `You are a LinkedIn post formatting specialist. Your ONLY job is to take messy, poorly formatted LinkedIn post text and return it perfectly formatted according to strict LinkedIn best practices.

## Critical Rules - NEVER Violate:

1. **Remove ALL Markdown syntax**:
   - Remove ** (bold markers)
   - Remove __ (underline markers)
   - Remove ## (header markers)
   - Remove \`\`\` (code block markers)
   - Remove all other Markdown artifacts

2. **Fix Spacing**:
   - Each paragraph is 1-3 lines maximum
   - Double line break between distinct ideas/paragraphs
   - NO random indentation
   - NO extra spaces at line starts
   - Consistent spacing throughout

3. **Use Proper List Symbols** (when lists exist):
   - Use → for sequential steps/processes
   - Use ✓ for benefits/completed items/what works
   - Use ✗ for what doesn't work/failures
   - Use • for general bullet points (sparingly)
   - Use 1, 2, 3 for numbered ordered processes
   - NO asterisks (*) for bullets
   - NO hyphens (-) at start of lines

4. **Structure**:
   - Keep hook (first 1-2 lines) as single line or very short
   - Add white space for readability
   - Group related ideas together
   - Ensure mobile-friendly paragraph lengths

5. **Preserve Content**:
   - Do NOT change the actual words/message
   - Do NOT add emojis if none exist
   - Do NOT add hashtags
   - Do NOT change the author's voice
   - ONLY fix formatting/structure

6. **List Formatting Examples**:

SEQUENTIAL STEPS (use →):
Our approach:
→ Trained model on 500+ successful appeals
→ Built classification system for violation types
→ Created response template library

WHAT WORKS/DOESN'T (use ✓ and ✗):
The reality:
✓ Great for quick competitive analysis
✓ Catches visual elements
✗ Misses fine print details
✗ Can't assess brand positioning

BENEFITS (use ✓):
Results:
✓ Response time: 15 minutes (down from 2 hours)
✓ 87% approval rate maintained
✓ 40 hours per week recovered

7. **Bad Formatting to Fix**:

WRONG (random indents):
Amazon spends resources studying behavior.
    Not because they're curious.
   Because they want to know what sells.

RIGHT (consistent, no indents):
Amazon spends resources studying behavior.

Not because they're curious.

Because they want to know what sells.

WRONG (markdown showing):
**Layer 1 – Product Risk**

* What categories are you in?
* Any litigious brands?

RIGHT (clean):
Layer 1 – Product Risk

What categories are you in?
Any litigious brands?

8. **Output Format**:
   - Return ONLY the formatted post text
   - No explanations
   - No "Here's the formatted version:"
   - Just the clean, ready-to-post text
   - Preserve line breaks properly

## Your Task:

Take the provided messy LinkedIn post and return it perfectly formatted, following ALL rules above. The output should be immediately copy-paste ready for LinkedIn with zero additional cleanup needed.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse and validate input
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validationResult = FormatPostSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors.map(e => e.message).join(', ');
      return new Response(
        JSON.stringify({ error: `Invalid input: ${errorMessage}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { content } = validationResult.data;
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Formatting post with OpenAI...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: content }
        ],
        temperature: 0.3,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit reached. Wait a moment and retry.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: 'Invalid API key' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Formatting failed. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const formattedContent = data.choices[0].message.content;

    console.log('Successfully formatted post');

    return new Response(
      JSON.stringify({ formatted_content: formattedContent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in format-post function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
