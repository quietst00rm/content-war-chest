import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CATEGORIES = [
  "Account Health",
  "Writing & Appeals",
  "Amazon Ecosystem",
  "Competition & Attacks",
  "Documentation & Compliance",
  "Product Strategy",
  "Operations & Logistics",
  "Reviews & Feedback",
  "Business Models",
  "Mindset & Strategy",
  "Personal Story",
  "Buyer Behavior",
];

// Input validation schema
const PostSchema = z.object({
  id: z.string().uuid("Invalid post ID format"),
  content: z.string().min(1, "Post content is required")
});

const RecategorizePostsSchema = z.object({
  posts: z.array(PostSchema)
    .min(1, "At least one post is required")
    .max(500, "Maximum 500 posts can be recategorized at once")
});

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

    const validationResult = RecategorizePostsSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors.map(e => e.message).join(', ');
      return new Response(
        JSON.stringify({ error: `Invalid input: ${errorMessage}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { posts } = validationResult.data;
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log(`Starting recategorization of ${posts.length} posts...`);

    const systemPrompt = `Categorize this LinkedIn post into exactly ONE of these categories. Return only the category name, nothing else.

Categories:
- Account Health (enforcement actions, suspensions, account health scores, monitoring, risk management frameworks)
- Writing & Appeals (POA writing, appeal strategy, appeal psychology, reinstatement tactics)
- Amazon Ecosystem (Amazon's business model, platform dynamics, badges, search, future predictions)
- Competition & Attacks (competitor sabotage, hijacking, fake reviews, attack response, defense)
- Documentation & Compliance (invoices, supply chain verification, record keeping, document quality)
- Product Strategy (product selection, high-risk categories, focus vs scale)
- Operations & Logistics (FBA, shipping, inventory disputes, warehouse issues)
- Reviews & Feedback (review system, review manipulation, ratings)
- Business Models (sourcing methods, retail arbitrage, new seller reality)
- Mindset & Strategy (business philosophy, seller psychology, archetypes, networking)
- Personal Story (origin stories, cautionary tales, success stories, human connection)
- Buyer Behavior (ethics, consumer impact, refund abuse)`;

    let updated = 0;

    for (const post of posts) {
      try {
        // Call OpenAI API
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Post content:\n${post.content}` }
            ],
            max_tokens: 50,
            temperature: 0.3,
          }),
        });

        if (!response.ok) {
          console.error(`OpenAI error for post ${post.id}:`, response.status);
          continue;
        }

        const data = await response.json();
        const category = data.choices[0].message.content.trim();

        // Validate category
        if (!CATEGORIES.includes(category)) {
          console.error(`Invalid category "${category}" for post ${post.id}`);
          continue;
        }

        // Update post in database
        const { error } = await supabase
          .from('posts')
          .update({ primary_category: category })
          .eq('id', post.id);

        if (error) {
          console.error(`Database error for post ${post.id}:`, error);
          continue;
        }

        updated++;
        console.log(`Updated post ${post.id} to category: ${category} (${updated}/${posts.length})`);

      } catch (error) {
        console.error(`Error processing post ${post.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        updated,
        total: posts.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in recategorize-posts function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
