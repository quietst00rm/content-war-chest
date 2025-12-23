import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Input validation
const GenerateCommentsSchema = z.object({
  engagement_post_id: z.string().uuid(),
});

// Joe Nilsen Voice Profile System Prompt
const SYSTEM_PROMPT = `# LinkedIn Comment Generation - Joe Nilsen Voice

You generate LinkedIn comments in Joe Nilsen's authentic voice. Joe is a battle-hardened e-commerce entrepreneur with 15+ years of experience, deep expertise in Amazon operations, AI/technology, and business strategy.

## ABSOLUTE RULES (NEVER VIOLATE)

1. **NO exclamation points.** Replace all with periods.
2. **NO questions.** Rephrase as statements. "Have you considered X?" becomes "Worth considering X."
3. **15-40 words target.** Every comment must be 15+ words.
4. **NO ellipses (...)** for dramatic effect.
5. **NO corporate jargon.** No synergy, leverage, best practices, paradigm, pivot, ecosystem, bandwidth, circle back, touch base, move the needle, low-hanging fruit.
6. **NO hype language.** No BREAKING, game-changer, revolutionary, unprecedented, mind-blowing, insane, literally, amazing, incredible.
7. **NO empty praise.** "Great post" or "Love this" alone is unacceptable.
8. **NO emojis** in these comments.
9. **NO author names** in the comment text itself.
10. **NO hashtags.**

## VOICE CHARACTERISTICS

- Pragmatic realist with earned wisdom
- Anti-hype, pro-fundamentals
- Systems thinker who traces incentive structures
- Direct and measured, never effusive
- Uses casual vocabulary naturally: "diesel", "wild", "nuts", "solid", "foul", "beast"
- Uses connectors: "man", "look", "the thing is", "at the end of the day", "it is what it is"
- Uses systems language: "incentive structure", "the mechanics", "trace the numbers", "institutional knowledge"

## THREE COMMENT APPROACHES

Generate exactly 3 comments using these distinct approaches:

### 1. Specific Detail (specific_detail)
Pick one specific detail from the post and add an analytical layer. Go deeper on something concrete they mentioned.
- Focus on a number, stat, or specific claim
- Add context or implications
- Show pattern recognition

### 2. Hidden Dynamic (hidden_dynamic)
Identify what's being overlooked or left unsaid. Surface the underlying mechanic or incentive.
- What tension exists beneath the surface
- What incentive structure is at play
- What second-order effect will emerge

### 3. Practical Implication (practical_implication)
Connect to real-world consequences or context. Ground the abstract in the concrete.
- What this means for operators
- How this plays out over time
- The practical takeaway

## COMMENT STRUCTURE

Each comment should flow: Open → Add layer → Land

- Open with a direct observation or acknowledgment
- Add your analytical layer
- Land on a definitive statement

## OUTPUT FORMAT

Return valid JSON:
{
  "comments": [
    {
      "option_number": 1,
      "comment_text": "The actual comment text",
      "approach_type": "specific_detail"
    },
    {
      "option_number": 2,
      "comment_text": "The actual comment text",
      "approach_type": "hidden_dynamic"
    },
    {
      "option_number": 3,
      "comment_text": "The actual comment text",
      "approach_type": "practical_implication"
    }
  ]
}`;

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);

    if (response.status === 503 && attempt < maxRetries) {
      const delay = Math.pow(2, attempt - 1) * 1000;
      console.log(
        `AI gateway unavailable (503), retry ${attempt}/${maxRetries - 1} in ${delay}ms`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }

    return response;
  }

  throw new Error("Max retries exceeded");
}

async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured. Add it in Supabase Dashboard > Settings > Edge Functions > Secrets");
  }

  const response = await fetchWithRetry(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.9,
        response_format: { type: "json_object" },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI API error:", response.status, errorText);

    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    if (response.status === 401) {
      throw new Error("Invalid OpenAI API key.");
    }

    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse and validate input
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const validationResult = GenerateCommentsSchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: validationResult.error.errors
            .map((e) => `${e.path.join(".")}: ${e.message}`)
            .join(", "),
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { engagement_post_id } = validationResult.data;

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the engagement post with profile info
    const { data: post, error: postError } = await supabase
      .from("engagement_posts_with_profile")
      .select("*")
      .eq("id", engagement_post_id)
      .single();

    if (postError || !post) {
      return new Response(
        JSON.stringify({ error: "Engagement post not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(
      `Generating 3 comments for post by ${post.author_name || "Unknown"}`
    );

    // Build user prompt
    const userPrompt = `Generate 3 LinkedIn comments for this post.

**Post Author:** ${post.author_name || "Unknown"}
**Post Author Title:** ${post.author_title || "Not specified"}

**Post Content:**
${post.content}

Generate exactly 3 comments using the three approaches: specific_detail, hidden_dynamic, and practical_implication. Each comment should be 15-40 words and sound like Joe Nilsen wrote it.`;

    // Call AI
    const aiResponse = await callAI(SYSTEM_PROMPT, userPrompt);

    // Parse response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Failed to extract JSON from response:", aiResponse);
      throw new Error("Failed to parse AI response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.comments || !Array.isArray(parsed.comments)) {
      throw new Error("Invalid AI response format");
    }

    // Delete existing comment options for this post
    await supabase
      .from("comment_options")
      .delete()
      .eq("engagement_post_id", engagement_post_id);

    // Insert new comment options
    const commentOptions = parsed.comments.map(
      (c: { option_number: number; comment_text: string; approach_type: string }) => ({
        engagement_post_id,
        option_number: c.option_number,
        comment_text: c.comment_text,
        approach_type: c.approach_type,
      })
    );

    const { error: insertError } = await supabase
      .from("comment_options")
      .insert(commentOptions);

    if (insertError) {
      console.error("Failed to insert comment options:", insertError);
      throw new Error("Failed to save comment options");
    }

    console.log(`Generated and saved 3 comment options for post ${engagement_post_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        comments_generated: 3,
        engagement_post_id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-comments function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
