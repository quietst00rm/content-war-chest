import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Apify configuration
const APIFY_ACTOR_ID = 'harvestapi~linkedin-profile-posts';
const MAX_POLL_ATTEMPTS = 60; // 5 minutes (5 seconds * 60)
const POLL_INTERVAL_MS = 5000; // 5 seconds

// Input validation schema
const FetchEngagementPostsSchema = z.object({
  profile_ids: z.array(z.string().uuid()).optional(),
  max_posts_per_profile: z.number().int().min(1).max(10).optional().default(1),
});

interface ApifyPost {
  id?: string;
  linkedinUrl?: string;
  content?: string;
  author?: {
    name?: string;
    linkedinUrl?: string;
    info?: string;
    picture?: string;
    profilePicture?: string;
  };
  postedAt?: {
    date?: string;
    postedAgoText?: string;
  };
  engagement?: {
    likes?: number;
    comments?: number;
    shares?: number;
  };
  type?: string;
}

interface FollowedProfile {
  id: string;
  linkedin_url: string;
  name: string | null;
}

// AI Comment Generation System Prompt
const AI_SYSTEM_PROMPT = `You are a LinkedIn engagement strategist writing comments for an Amazon/e-commerce professional. Your comments must be indistinguishable from those written by a busy entrepreneur typing on their phone.

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

// Helper: Generate AI comments for a post
async function generateAIComments(
  postContent: string,
  authorName: string,
  authorTitle: string
): Promise<string | null> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

  if (!LOVABLE_API_KEY) {
    console.log('LOVABLE_API_KEY not configured, skipping AI comment generation');
    return null;
  }

  if (postContent.length < 50) {
    console.log('Post too short for AI comments');
    return null;
  }

  const userPrompt = `Generate 3 LinkedIn comments for this post:

POST AUTHOR: ${authorName}
${authorTitle ? `AUTHOR HEADLINE: ${authorTitle}` : ''}

POST CONTENT:
${postContent}

Remember: Sound like a real person typing on their phone. No AI fluff.`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: AI_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      console.error('AI gateway error:', response.status);
      return null;
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Failed to extract JSON from AI response');
      return null;
    }

    const result = JSON.parse(jsonMatch[0]);
    result.generated_at = new Date().toISOString();

    return JSON.stringify(result);
  } catch (error) {
    console.error('Error generating AI comments:', error);
    return null;
  }
}

// Helper: Start Apify actor run
async function startActorRun(
  apifyToken: string,
  targetUrls: string[],
  maxPosts: number
): Promise<string | null> {
  const url = `https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/runs?token=${apifyToken}`;

  const input = {
    targetUrls,
    maxPosts,
    scrapeReactions: false,
    maxReactions: 0,
    scrapeComments: false,
    maxComments: 0,
    includeQuotePosts: true,
    includeReposts: true,
  };

  console.log(`Starting Apify run with ${targetUrls.length} URLs, maxPosts=${maxPosts}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (response.status === 201) {
      const data = await response.json();
      return data.data.id;
    } else {
      const errorText = await response.text();
      console.error(`Error starting Apify run: ${response.status} - ${errorText}`);
      return null;
    }
  } catch (e) {
    console.error(`Exception starting Apify run: ${e}`);
    return null;
  }
}

// Helper: Poll for Apify run status
async function pollRunStatus(
  apifyToken: string,
  runId: string
): Promise<boolean> {
  const url = `https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`;

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url);
      const data = await response.json();
      const status = data.data.status;

      console.log(`Poll attempt ${attempt + 1}: status=${status}`);

      if (status === 'SUCCEEDED') {
        return true;
      } else if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
        return false;
      }

      // Wait before next poll
      if (attempt < MAX_POLL_ATTEMPTS - 1) {
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
      }
    } catch (e) {
      console.error(`Error polling status: ${e}`);
      return false;
    }
  }

  return false;
}

// Helper: Get Apify run results
async function getRunResults(
  apifyToken: string,
  runId: string
): Promise<ApifyPost[]> {
  const url = `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apifyToken}`;

  try {
    const response = await fetch(url);
    const allItems: ApifyPost[] = await response.json();

    // Filter for posts only
    return allItems.filter(item => item.type === 'post');
  } catch (e) {
    console.error(`Error getting results: ${e}`);
    return [];
  }
}

// Helper: Calculate days ago from a date
function calculateDaysAgo(dateString: string | undefined): number {
  if (!dateString) return 0;

  try {
    const postDate = new Date(dateString);
    const today = new Date();
    postDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diffTime = Math.abs(today.getTime() - postDate.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

// Helper: Clean posted ago text
function cleanPostedAgoText(text: string | undefined): string {
  if (!text) return '';
  return text.split('•')[0].trim();
}

// Helper: Find profile by LinkedIn URL
function findProfileByUrl(
  profiles: FollowedProfile[],
  authorUrl: string | undefined
): FollowedProfile | undefined {
  if (!authorUrl) return undefined;

  // Normalize URLs for comparison
  const normalizeUrl = (url: string) => {
    return url.toLowerCase()
      .replace(/\/$/, '')
      .replace(/^https?:\/\/(www\.)?linkedin\.com/, '');
  };

  const normalizedAuthorUrl = normalizeUrl(authorUrl);

  return profiles.find(p => {
    const normalizedProfileUrl = normalizeUrl(p.linkedin_url);
    return normalizedAuthorUrl.includes(normalizedProfileUrl) ||
           normalizedProfileUrl.includes(normalizedAuthorUrl);
  });
}

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
    let body: unknown = {};
    try {
      const text = await req.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch {
      // Empty body is OK, we'll use defaults
    }

    const validationResult = FetchEngagementPostsSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors.map(e => e.message).join(', ');
      return new Response(
        JSON.stringify({ error: `Invalid input: ${errorMessage}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { profile_ids, max_posts_per_profile } = validationResult.data;

    // Get environment variables
    const APIFY_API_KEY = Deno.env.get('APIFY_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!APIFY_API_KEY) {
      throw new Error('APIFY_API_KEY is not configured');
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration missing');
    }

    // Create authenticated Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch active profiles
    let profilesQuery = supabase
      .from('followed_profiles')
      .select('id, linkedin_url, name')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (profile_ids && profile_ids.length > 0) {
      profilesQuery = profilesQuery.in('id', profile_ids);
    }

    const { data: profiles, error: profilesError } = await profilesQuery;

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No active profiles to fetch',
          posts_fetched: 0,
          posts_saved: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching posts for ${profiles.length} profiles...`);

    // Extract URLs for Apify
    const targetUrls = profiles.map(p => p.linkedin_url);

    // Start Apify actor run
    const runId = await startActorRun(APIFY_API_KEY, targetUrls, max_posts_per_profile);
    if (!runId) {
      throw new Error('Failed to start Apify actor run');
    }

    console.log(`Apify run started: ${runId}`);

    // Poll for completion
    const completed = await pollRunStatus(APIFY_API_KEY, runId);
    if (!completed) {
      throw new Error('Apify run timed out or failed');
    }

    // Get results
    const posts = await getRunResults(APIFY_API_KEY, runId);
    console.log(`Received ${posts.length} posts from Apify`);

    // Process and save posts
    let savedCount = 0;
    let skippedCount = 0;
    let aiGeneratedCount = 0;

    for (const post of posts) {
      // Find matching profile
      const profile = findProfileByUrl(profiles, post.author?.linkedinUrl);

      if (!profile) {
        console.log(`Could not match profile for author: ${post.author?.linkedinUrl}`);
        skippedCount++;
        continue;
      }

      if (!post.linkedinUrl || !post.content) {
        console.log(`Skipping post with missing URL or content`);
        skippedCount++;
        continue;
      }

      // Generate AI comments for this post
      const authorName = post.author?.name || profile.name || 'Unknown';
      const authorTitle = post.author?.info || '';
      console.log(`Generating AI comments for post by ${authorName}...`);
      const aiComment = await generateAIComments(post.content, authorName, authorTitle);

      if (aiComment) {
        aiGeneratedCount++;
      }

      // Get profile image URL (Apify may return it as picture or profilePicture)
      const authorImageUrl = post.author?.picture || post.author?.profilePicture || null;

      const engagementPost = {
        user_id: user.id,
        profile_id: profile.id,
        linkedin_post_url: post.linkedinUrl,
        linkedin_post_id: post.id || null,
        author_name: authorName,
        author_profile_url: post.author?.linkedinUrl || null,
        author_title: authorTitle || null,
        author_profile_image_url: authorImageUrl,
        content: post.content,
        posted_at: post.postedAt?.date || null,
        posted_ago_text: cleanPostedAgoText(post.postedAt?.postedAgoText),
        days_ago: calculateDaysAgo(post.postedAt?.date),
        likes: post.engagement?.likes || 0,
        comments: post.engagement?.comments || 0,
        shares: post.engagement?.shares || 0,
        ai_comment: aiComment,
        fetched_at: new Date().toISOString(),
      };

      // Upsert the post (update if exists, insert if new)
      const { error: upsertError } = await supabase
        .from('engagement_posts')
        .upsert(engagementPost, {
          onConflict: 'user_id,linkedin_post_url',
          ignoreDuplicates: false,
        });

      if (upsertError) {
        console.error(`Error saving post: ${upsertError.message}`);
        skippedCount++;
      } else {
        savedCount++;

        // Update profile info if we discovered new data
        const profileUpdates: Record<string, string> = {};

        if (post.author?.name && !profile.name) {
          profileUpdates.name = post.author.name;
        }

        // Get profile image URL (Apify may return it as picture or profilePicture)
        const profileImageUrl = post.author?.picture || post.author?.profilePicture;
        if (profileImageUrl) {
          profileUpdates.profile_image_url = profileImageUrl;
        }

        // Get title/headline from author info
        if (post.author?.info) {
          profileUpdates.title = post.author.info;
        }

        if (Object.keys(profileUpdates).length > 0) {
          await supabase
            .from('followed_profiles')
            .update(profileUpdates)
            .eq('id', profile.id);
          console.log(`Updated profile ${profile.id}:`, Object.keys(profileUpdates));
        }
      }
    }

    // Update last_fetched_at for all fetched profiles
    const profileIds = profiles.map(p => p.id);
    await supabase
      .from('followed_profiles')
      .update({ last_fetched_at: new Date().toISOString() })
      .in('id', profileIds);

    console.log(`Successfully saved ${savedCount} posts (${aiGeneratedCount} with AI comments), skipped ${skippedCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        posts_fetched: posts.length,
        posts_saved: savedCount,
        posts_skipped: skippedCount,
        ai_comments_generated: aiGeneratedCount,
        profiles_processed: profiles.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-engagement-posts function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
