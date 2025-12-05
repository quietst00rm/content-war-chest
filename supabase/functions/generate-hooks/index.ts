import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const GenerateHooksSchema = z.object({
  post_id: z.string().uuid("Invalid post ID format"),
  count: z.number().int().min(1).max(10).optional().default(5)
});

const SYSTEM_PROMPT = `You are an expert at writing LinkedIn post hooks - the opening lines that grab attention and stop the scroll.

Your task: Generate multiple hook variants for the given post content.

Each hook should:
1. Be 1-2 lines maximum
2. Create curiosity or intrigue
3. Promise value to the reader
4. Match the tone and style of the original content

Generate hooks in these specific styles:
1. QUESTION - Start with a thought-provoking question
2. BOLD STATEMENT - Make a confident, attention-grabbing claim
3. STORY OPENER - Begin with a narrative hook ("Last week...", "In 2019...")
4. STATISTIC - Lead with a compelling number or data point (can be from the content or realistic)
5. CONTRARIAN TAKE - Challenge conventional wisdom

Output format:
Return a JSON array of objects with this structure:
[
  {"style": "question", "hook": "Your hook text here"},
  {"style": "bold_statement", "hook": "Your hook text here"},
  {"style": "story_opener", "hook": "Your hook text here"},
  {"style": "statistic", "hook": "Your hook text here"},
  {"style": "contrarian", "hook": "Your hook text here"}
]

Important:
- Each hook should be able to replace the current opening of the post
- Maintain the author's voice
- Do not use emojis unless they're in the original content
- Keep hooks punchy and scannable`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    const validationResult = GenerateHooksSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors.map(e => e.message).join(', ');
      return new Response(
        JSON.stringify({ error: `Invalid input: ${errorMessage}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { post_id, count } = validationResult.data;

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration missing');
    }

    // Create authenticated Supabase client
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the original post
    const { data: post, error: postError } = await supabaseAuth
      .from('posts')
      .select('id, content, title, user_id')
      .eq('id', post_id)
      .eq('user_id', user.id)
      .single();

    if (postError || !post) {
      return new Response(
        JSON.stringify({ error: 'Post not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating ${count} hooks for post ${post_id}...`);

    // Check if post already has a primary hook
    const { data: existingPrimary } = await supabaseAuth
      .from('hook_variants')
      .select('id')
      .eq('post_id', post_id)
      .eq('is_primary', true)
      .single();

    // If no primary hook exists, extract the first line as the original hook
    let originalHookCreated = false;
    if (!existingPrimary) {
      const firstLine = post.content.split('\n').filter((line: string) => line.trim())[0] || post.content.substring(0, 100);

      const { error: originalError } = await supabaseAuth
        .from('hook_variants')
        .insert({
          post_id: post_id,
          user_id: user.id,
          hook_text: firstLine.trim(),
          is_primary: true,
          source: 'original'
        });

      if (!originalError) {
        originalHookCreated = true;
        console.log('Created original hook as primary');
      }
    }

    // Call OpenAI to generate hook variants
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
          { role: 'user', content: `Generate ${count} hook variants for this LinkedIn post:\n\n${post.content}` }
        ],
        temperature: 0.8,
        max_tokens: 1500
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Parse JSON from AI response
    const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from AI response');
    }

    const hooks = JSON.parse(jsonMatch[0]);

    // Save each hook to the database
    const hookVariants = [];
    for (const hook of hooks) {
      const { data: variant, error: insertError } = await supabaseAuth
        .from('hook_variants')
        .insert({
          post_id: post_id,
          user_id: user.id,
          hook_text: hook.hook,
          is_primary: false,
          source: 'ai_generated'
        })
        .select()
        .single();

      if (!insertError && variant) {
        hookVariants.push({
          ...variant,
          style: hook.style
        });
      }
    }

    console.log(`Successfully created ${hookVariants.length} hook variants for post ${post_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        original_hook_created: originalHookCreated,
        hook_variants: hookVariants,
        count: hookVariants.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-hooks function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
