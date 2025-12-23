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

interface TargetProfile {
  id: string;
  linkedin_url: string;
  name: string | null;
  title: string | null;
  avatar_url: string | null;
}

// ============================================================================
// APIFY HELPERS
// ============================================================================

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

async function getRunResults(
  apifyToken: string,
  runId: string
): Promise<ApifyPost[]> {
  const url = `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apifyToken}`;

  try {
    const response = await fetch(url);
    const allItems: ApifyPost[] = await response.json();
    return allItems.filter(item => item.type === 'post');
  } catch (e) {
    console.error(`Error getting results: ${e}`);
    return [];
  }
}

// ============================================================================
// UTILITY HELPERS
// ============================================================================

function findProfileByUrl(
  profiles: TargetProfile[],
  authorUrl: string | undefined
): TargetProfile | undefined {
  if (!authorUrl) return undefined;

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

// ============================================================================
// COMMENT GENERATION - Call the generate-comments function
// ============================================================================

async function generateCommentsForPost(
  supabaseUrl: string,
  supabaseKey: string,
  engagementPostId: string
): Promise<boolean> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/generate-comments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ engagement_post_id: engagementPostId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`generate-comments error for ${engagementPostId}: ${response.status} - ${errorText}`);
      return false;
    }

    const result = await response.json();
    console.log(`Generated ${result.comments_generated} comments for post ${engagementPostId}`);
    return true;
  } catch (e) {
    console.error(`Exception calling generate-comments for ${engagementPostId}:`, e);
    return false;
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // Create Supabase client with service role for database operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch active profiles from target_profiles (NEW TABLE - no user_id, shared list)
    let profilesQuery = supabase
      .from('target_profiles')
      .select('id, linkedin_url, name, title, avatar_url')
      .eq('is_active', true);

    if (profile_ids && profile_ids.length > 0) {
      profilesQuery = profilesQuery.in('id', profile_ids);
    }

    const { data: profiles, error: profilesError } = await profilesQuery;

    if (profilesError) {
      console.error('Failed to fetch profiles:', profilesError);
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No active profiles to fetch',
          posts_fetched: 0,
          posts_saved: 0,
          comments_generated: 0
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
    let commentsGenerated = 0;

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

      // Delete existing posts for this profile before inserting the new one
      const { error: deleteError } = await supabase
        .from('engagement_posts_new')
        .delete()
        .eq('target_profile_id', profile.id);

      if (deleteError) {
        console.error(`Error deleting old posts for profile ${profile.id}: ${deleteError.message}`);
      } else {
        console.log(`Deleted old posts for profile ${profile.id}`);
      }

      // Insert into engagement_posts_new (NEW TABLE)
      const engagementPost = {
        target_profile_id: profile.id,
        linkedin_post_url: post.linkedinUrl,
        content: post.content,
        posted_at: post.postedAt?.date || null,
        fetched_at: new Date().toISOString(),
        is_expired: false,
      };

      const { data: insertedPost, error: insertError } = await supabase
        .from('engagement_posts_new')
        .insert(engagementPost)
        .select('id')
        .single();

      if (insertError) {
        console.error(`Error saving post: ${insertError.message}`);
        skippedCount++;
        continue;
      }

      savedCount++;
      console.log(`Saved post ${insertedPost.id} for profile ${profile.name || profile.linkedin_url}`);

      // Update profile info if we discovered new data
      const profileUpdates: Record<string, string> = {};

      if (post.author?.name && !profile.name) {
        profileUpdates.name = post.author.name;
      }

      const profileImageUrl = post.author?.picture || post.author?.profilePicture;
      if (profileImageUrl) {
        profileUpdates.avatar_url = profileImageUrl;
      }

      if (post.author?.info) {
        profileUpdates.title = post.author.info;
      }

      if (Object.keys(profileUpdates).length > 0) {
        await supabase
          .from('target_profiles')
          .update(profileUpdates)
          .eq('id', profile.id);
        console.log(`Updated profile ${profile.id}:`, Object.keys(profileUpdates));
      }

      // AUTO-GENERATE 3 COMMENTS for the new post
      const generated = await generateCommentsForPost(
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY,
        insertedPost.id
      );

      if (generated) {
        commentsGenerated += 3;
      }
    }

    // Update last_fetched_at for all fetched profiles
    const profileIds = profiles.map(p => p.id);
    await supabase
      .from('target_profiles')
      .update({ last_fetched_at: new Date().toISOString() })
      .in('id', profileIds);

    console.log(`Successfully saved ${savedCount} posts, skipped ${skippedCount}, comments generated: ${commentsGenerated}`);

    return new Response(
      JSON.stringify({
        success: true,
        posts_fetched: posts.length,
        posts_saved: savedCount,
        posts_skipped: skippedCount,
        profiles_processed: profiles.length,
        comments_generated: commentsGenerated,
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
