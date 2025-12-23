import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Input validation
const GenerateImagePromptsSchema = z.object({
  post_id: z.string().uuid(),
});

// Image Prompt Generation System Prompt
const SYSTEM_PROMPT = `# LinkedIn Post Image Prompt Generator

You generate 3 distinct AI image prompts for LinkedIn posts. Each prompt creates a professional, eye-catching image that complements the post content without using text, people, or illustrations.

## ANALYZE THE POST

First, extract:
1. Core message - the main point
2. Central tension - what problem or contrast exists
3. Emotional tone - inspiring, cautionary, informative, etc.
4. Post type - story, how-to, contrarian, framework, insight

## 5 IMAGE CATEGORIES

Generate concepts from 3 DIFFERENT categories:

### 1. Object Metaphor (object_metaphor)
A single physical object that embodies the message.
- Examples: A perfectly balanced scale, a key in a locked door, dominoes mid-fall
- Focus: Symbolic resonance, clean composition

### 2. Environmental Scene (environmental_scene)
A setting or environment that evokes the feeling.
- Examples: A fork in a path through fog, an empty boardroom at dawn, a lighthouse in storm
- Focus: Mood, atmosphere, sense of place

### 3. Contrast/Juxtaposition (contrast_juxtaposition)
Two elements in tension that create meaning.
- Examples: Order vs chaos, old vs new, simple vs complex
- Focus: Visual tension, before/after, comparison

### 4. Textured Background (textured_background)
Abstract textures and patterns that convey the emotion.
- Examples: Cracked earth healing, light breaking through clouds, ripples in still water
- Focus: Feeling over literal meaning

### 5. Unexpected/Creative (unexpected_creative)
Something surprising that makes viewers pause.
- Examples: A chess piece on a Go board, a compass pointing sideways, melting barriers
- Focus: Intrigue, memorability

## PROMPT STRUCTURE

Each prompt must include:
1. **Subject** - Specific physical elements (what we see)
2. **Photography style** - Documentary, editorial, minimalist, etc.
3. **Lighting** - Direction, quality, color temperature
4. **Background/environment** - Setting and context
5. **Composition** - Camera angle, depth of field
6. **Color mood** - Palette and feeling
7. **Aspect ratio** - Default 1:1 (square for LinkedIn)

## MANDATORY EXCLUSIONS

End every prompt with:
"no text, no people, no illustrations, no dark backgrounds, no neon, no floating objects, no corporate stock style"

## OUTPUT FORMAT

Return valid JSON:
{
  "concepts": [
    {
      "concept_number": 1,
      "concept_name": "Short descriptive name",
      "category": "object_metaphor",
      "description": "2-3 sentences describing what you'll see",
      "rationale": "1 sentence explaining why it works for this post",
      "prompt_text": "The full Gemini prompt with all required elements"
    },
    {
      "concept_number": 2,
      "concept_name": "Short descriptive name",
      "category": "environmental_scene",
      "description": "2-3 sentences describing what you'll see",
      "rationale": "1 sentence explaining why it works for this post",
      "prompt_text": "The full Gemini prompt with all required elements"
    },
    {
      "concept_number": 3,
      "concept_name": "Short descriptive name",
      "category": "contrast_juxtaposition",
      "description": "2-3 sentences describing what you'll see",
      "rationale": "1 sentence explaining why it works for this post",
      "prompt_text": "The full Gemini prompt with all required elements"
    }
  ]
}

IMPORTANT: Each concept MUST be from a DIFFERENT category. Do not repeat categories.`;

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
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  const response = await fetchWithRetry(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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
    console.error("AI gateway error:", response.status, errorText);

    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    if (response.status === 402) {
      throw new Error("Payment required. Please add credits to your workspace.");
    }
    if (response.status === 503) {
      throw new Error(
        "AI service temporarily unavailable. Please try again in a moment."
      );
    }

    throw new Error(`AI gateway error: ${response.status}`);
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

    const validationResult = GenerateImagePromptsSchema.safeParse(body);
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

    const { post_id } = validationResult.data;

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the post
    const { data: post, error: postError } = await supabase
      .from("posts_new")
      .select("*")
      .eq("id", post_id)
      .single();

    if (postError || !post) {
      return new Response(JSON.stringify({ error: "Post not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Generating 3 image prompts for post ${post_id}`);

    // Build user prompt
    const userPrompt = `Generate 3 image prompts for this LinkedIn post.

**Post Content:**
${post.content}

${post.pillar_category ? `**Content Pillar:** ${post.pillar_category}` : ""}

Generate exactly 3 concepts from 3 DIFFERENT categories. Each should create a professional, eye-catching image for LinkedIn.`;

    // Call AI
    const aiResponse = await callAI(SYSTEM_PROMPT, userPrompt);

    // Parse response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Failed to extract JSON from response:", aiResponse);
      throw new Error("Failed to parse AI response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.concepts || !Array.isArray(parsed.concepts)) {
      throw new Error("Invalid AI response format");
    }

    // Delete existing image prompts for this post
    await supabase.from("image_prompts").delete().eq("post_id", post_id);

    // Insert new image prompts
    const imagePrompts = parsed.concepts.map(
      (c: {
        concept_number: number;
        concept_name: string;
        category: string;
        description: string;
        rationale: string;
        prompt_text: string;
      }) => ({
        post_id,
        concept_number: c.concept_number,
        concept_name: c.concept_name,
        category: c.category,
        description: c.description,
        rationale: c.rationale,
        prompt_text: c.prompt_text,
      })
    );

    const { error: insertError } = await supabase
      .from("image_prompts")
      .insert(imagePrompts);

    if (insertError) {
      console.error("Failed to insert image prompts:", insertError);
      throw new Error("Failed to save image prompts");
    }

    console.log(`Generated and saved 3 image prompts for post ${post_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        prompts_generated: 3,
        post_id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-image-prompts function:", error);
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
