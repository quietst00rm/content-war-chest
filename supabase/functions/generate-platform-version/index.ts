import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const GeneratePlatformVersionSchema = z.object({
  post_id: z.string().uuid("Invalid post ID format"),
  target_platform: z.enum(['twitter', 'newsletter'], {
    errorMap: () => ({ message: "target_platform must be 'twitter' or 'newsletter'" })
  })
});

const PLATFORM_PROMPTS = {
  twitter: `You are an expert at adapting LinkedIn content for Twitter/X.

Your task: Convert the provided LinkedIn post into Twitter-optimized content.

Rules:
1. If the content is SHORT (can fit in 280 characters), create a single impactful tweet
2. If the content is LONG, create a thread with numbered tweets (1/, 2/, etc.)
3. Each tweet must be 280 characters or less
4. Preserve the core message and value
5. Use punchy, direct language
6. Remove any LinkedIn-specific formatting
7. Add line breaks for readability within tweets
8. End threads with a call-to-action or key takeaway

Output format:
- For single tweet: Just the tweet text
- For thread: Each tweet on a new line, prefixed with number (1/, 2/, etc.)

Do NOT add hashtags unless they were in the original.
Do NOT add emojis unless they were in the original.`,

  newsletter: `You are an expert at adapting LinkedIn posts for email newsletters.

Your task: Expand the provided LinkedIn post into newsletter-ready content.

Rules:
1. Expand on the ideas with more context and depth
2. Add smooth transitions between sections
3. Use a more conversational, email-friendly tone
4. Break up content with clear sections if needed
5. Add an engaging opening hook
6. Include a clear takeaway or call-to-action at the end
7. Target length: 2-3x the original LinkedIn post
8. Keep paragraphs short (2-3 sentences) for email readability

Preserve:
- The author's voice and perspective
- Key examples and data points
- The core message

Do NOT add:
- Subject lines (just the body content)
- Unsubscribe links or email footer content
- Greetings like "Hey friend" or "Hi there"`
};

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

    const validationResult = GeneratePlatformVersionSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors.map(e => e.message).join(', ');
      return new Response(
        JSON.stringify({ error: `Invalid input: ${errorMessage}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { post_id, target_platform } = validationResult.data;

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration missing');
    }

    // Create authenticated Supabase client to get user ID
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

    console.log(`Generating ${target_platform} version for post ${post_id}...`);

    // Call OpenAI to generate platform version
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: PLATFORM_PROMPTS[target_platform] },
          { role: 'user', content: `Original LinkedIn post:\n\n${post.content}` }
        ],
        temperature: 0.7,
        max_tokens: 2000
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
    const generatedContent = data.choices[0].message.content;
    const characterCount = generatedContent.length;

    // Save to platform_versions table
    const { data: platformVersion, error: insertError } = await supabaseAuth
      .from('platform_versions')
      .insert({
        post_id: post_id,
        user_id: user.id,
        platform: target_platform,
        content: generatedContent,
        formatted_content: generatedContent,
        character_count: characterCount,
        is_primary: false
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw new Error('Failed to save platform version');
    }

    console.log(`Successfully created ${target_platform} version for post ${post_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        platform_version: platformVersion,
        character_count: characterCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-platform-version function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
