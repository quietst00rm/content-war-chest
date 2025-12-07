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

// AI comment generation config
const MIN_CONTENT_LENGTH_FOR_AI = 50;

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

// New AI comment response structure (single comment)
interface AICommentResponse {
  comment: string;
  approach: 'micro' | 'reaction' | 'opinion' | 'question' | 'support' | 'disagree';
  tone_matched: 'casual' | 'professional' | 'playful' | 'empathetic';
  char_count: number;
  reasoning: string;
  generated_at: string;
  attempts?: number;
  validation_warnings?: string[];
}

// ============================================================================
// BANNED PHRASES LIST (for inline generation)
// ============================================================================

const BANNED_PHRASES = [
  "this resonates", "this really resonates", "game-changer", "game changer",
  "couldn't agree more", "i'd also highlight", "building on your point",
  "that's fantastic", "what you're touching on is", "to add to this",
  "i've definitely experienced", "in my experience", "as a ",
  "i'm curious if", "it's wild how far", "great breakdown", "powerful insights",
  "this is gold", "spot on as always", "great post", "love this post",
  "what a great point", "so true", "this hit home", "so important",
  "key takeaway", "absolutely agree", "definitely agree", "certainly agree",
  "well articulated", "brilliantly put", "beautifully written",
  "this is so insightful", "what a wonderful", "we tested this", "we tried this",
  "in my role as", "speaking as a", "i can say that",
];

// ============================================================================
// SYSTEM PROMPT FOR INLINE GENERATION
// ============================================================================

const SYSTEM_PROMPT = `You are generating a single LinkedIn comment that sounds authentically human.

## ANALYZE THE POST FIRST
Classify the post type (observation, vulnerable-story, educational, promotional, thank-you, question, celebration) and energy (casual, professional, vulnerable, punchy, playful, serious).

## LENGTH DISTRIBUTION (CRITICAL)
- 50% MICRO (under 50 chars): "Exactly.", "This is it.", "Ha, same.", "Nailed it."
- 30% SHORT (50-100 chars): One sentence reactions
- 15% MEDIUM (100-200 chars): 1-2 sentences
- 5% LONG (200+ chars): Only for educational deep-dives

## APPROACH (pick ONE)
- "micro": 1-10 words
- "reaction": 1-2 sentences acknowledging content
- "opinion": Brief personal take WITHOUT fabricating experience
- "question": Short question under 10 words
- "support": Brief congratulations
- "disagree": Polite pushback

## HARD RULES
NEVER USE: "This resonates", "Game-changer", "Couldn't agree more", "Great post", "I'd also highlight", "As a [role]", "I'm curious if", "In my experience" (when fabricating)

NEVER: Claim experiences you didn't have, use "we" for business activities, invent timelines, claim metrics/results

USE THESE: "Exactly.", "Spot on.", "This is it.", "Ha, same.", "Nailed it.", "100%", "Love it.", "Truth.", "[Name] - yep."

## OUTPUT (JSON only)
{
  "comment": "The comment text",
  "approach": "micro|reaction|opinion|question|support|disagree",
  "tone_matched": "casual|professional|playful|empathetic",
  "char_count": 45,
  "reasoning": "Brief note"
}`;

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

function containsBannedPhrase(comment: string): boolean {
  const lowerComment = comment.toLowerCase();
  return BANNED_PHRASES.some(phrase => lowerComment.includes(phrase.toLowerCase()));
}

function hasFabricatedExperience(comment: string): boolean {
  const patterns = [
    /we (did|tried|tested|saw|experienced|implemented|launched|built)/i,
    /i (did|tried|tested|saw|experienced|implemented|launched|built) this/i,
    /(last|this) (week|month|quarter|year)/i,
    /\d+ (months?|weeks?|years?) ago/i,
    /increased .* by \d+%/i,
    /as a \w+,? i/i,
  ];
  return patterns.some(p => p.test(comment));
}

function validateComment(comment: string): boolean {
  return !containsBannedPhrase(comment) && !hasFabricatedExperience(comment);
}

// ============================================================================
// AI COMMENT GENERATION (NEW SINGLE COMMENT APPROACH)
// ============================================================================

async function generateAIComment(
  postContent: string,
  authorName: string,
  authorTitle: string | undefined,
  lovableApiKey: string
): Promise<{ comment: string; approach: string; tone: string } | null> {
  try {
    const userPrompt = `Generate a single LinkedIn comment for this post.

POST AUTHOR: ${authorName}${authorTitle ? `\nAUTHOR HEADLINE: ${authorTitle}` : ''}

POST CONTENT:
${postContent}

REMEMBER: 50% should be micro (under 50 chars like "Exactly." or "This is it."), 30% short, 15% medium, 5% long. Be brief.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.9,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      console.error(`AI gateway error: ${response.status} ${await response.text()}`);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('No content in AI response');
      return null;
    }

    // Parse the JSON response
    const parsed: AICommentResponse = JSON.parse(content);

    if (!parsed.comment) {
      console.error('Invalid AI response structure - missing comment');
      return null;
    }

    // Validate the comment
    if (!validateComment(parsed.comment)) {
      console.warn('Comment failed validation, attempting regeneration...');

      // Try once more with stricter prompt
      const retryResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt + '\n\nIMPORTANT: Previous attempt failed. Generate a VERY SHORT comment (under 50 chars). Use phrases like "Exactly.", "This is it.", "Nailed it.", "Love this.", or "Spot on."' }
          ],
          temperature: 0.7,
          response_format: { type: 'json_object' },
        }),
      });

      if (retryResponse.ok) {
        const retryData = await retryResponse.json();
        const retryContent = retryData.choices?.[0]?.message?.content;
        if (retryContent) {
          const retryParsed = JSON.parse(retryContent);
          if (retryParsed.comment && validateComment(retryParsed.comment)) {
            return {
              comment: retryParsed.comment,
              approach: retryParsed.approach || 'micro',
              tone: retryParsed.tone_matched || 'casual',
            };
          }
        }
      }

      // If retry also fails, return null
      return null;
    }

    return {
      comment: parsed.comment,
      approach: parsed.approach || 'reaction',
      tone: parsed.tone_matched || 'casual',
    };
  } catch (error) {
    console.error('Error generating AI comment:', error);
    return null;
  }
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

function cleanPostedAgoText(text: string | undefined): string {
  if (!text) return '';
  return text.split('•')[0].trim();
}

function findProfileByUrl(
  profiles: FollowedProfile[],
  authorUrl: string | undefined
): FollowedProfile | undefined {
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
// MAIN HANDLER
// ============================================================================

// Demo user ID for public access mode
const DEMO_USER_ID = '34f25d5b-0fcc-4792-822b-e7b30af21dd4';

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
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!APIFY_API_KEY) {
      throw new Error('APIFY_API_KEY is not configured');
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration missing');
    }

    if (!LOVABLE_API_KEY) {
      console.warn('LOVABLE_API_KEY not configured - AI comment generation will be skipped');
    }

    // Create Supabase client with service role for database operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Try to get user from JWT, fall back to demo user if in demo mode
    let userId: string;
    const authHeader = req.headers.get('Authorization');
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (user && !userError) {
        userId = user.id;
        console.log(`Authenticated as user: ${userId}`);
      } else {
        // Fall back to demo user for demo mode
        userId = DEMO_USER_ID;
        console.log(`Using demo user: ${userId}`);
      }
    } else {
      // No auth header, use demo user
      userId = DEMO_USER_ID;
      console.log(`No auth header, using demo user: ${userId}`);
    }

    // Fetch active profiles
    let profilesQuery = supabase
      .from('followed_profiles')
      .select('id, linkedin_url, name')
      .eq('user_id', userId)
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
          posts_saved: 0,
          ai_comments_generated: 0
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
    let aiCommentsGenerated = 0;

    // Track statistics for reporting
    const stats = {
      totalCharCount: 0,
      commentCount: 0,
      approachCounts: { micro: 0, reaction: 0, opinion: 0, question: 0, support: 0, disagree: 0 },
    };

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

      // Get profile image URL
      const authorImageUrl = post.author?.picture || post.author?.profilePicture || null;

      // Generate AI comment if content is long enough and API key is available
      let aiComment: string | null = null;

      if (LOVABLE_API_KEY && post.content.length >= MIN_CONTENT_LENGTH_FOR_AI) {
        console.log(`Generating AI comment for post from ${profile.name || profile.linkedin_url}...`);

        const result = await generateAIComment(
          post.content,
          post.author?.name || profile.name || 'Unknown',
          post.author?.info,
          LOVABLE_API_KEY
        );

        if (result) {
          aiComment = result.comment;
          aiCommentsGenerated++;

          // Update statistics
          stats.totalCharCount += result.comment.length;
          stats.commentCount++;
          if (result.approach in stats.approachCounts) {
            stats.approachCounts[result.approach as keyof typeof stats.approachCounts]++;
          }

          console.log(`AI comment generated (${result.approach}, ${result.comment.length} chars): "${result.comment.substring(0, 50)}..."`);
        } else {
          console.log(`AI comment generation failed, saving post without comment`);
        }
      } else if (post.content.length < MIN_CONTENT_LENGTH_FOR_AI) {
        console.log(`Skipping AI generation - content too short (${post.content.length} chars)`);
      }

      // Delete existing posts for this profile before inserting the new one
      const { error: deleteError } = await supabase
        .from('engagement_posts')
        .delete()
        .eq('user_id', userId)
        .eq('profile_id', profile.id);

      if (deleteError) {
        console.error(`Error deleting old posts for profile ${profile.id}: ${deleteError.message}`);
      } else {
        console.log(`Deleted old posts for profile ${profile.id}`);
      }

      const engagementPost = {
        user_id: userId,
        profile_id: profile.id,
        linkedin_post_url: post.linkedinUrl,
        linkedin_post_id: post.id || null,
        author_name: post.author?.name || profile.name || null,
        author_profile_url: post.author?.linkedinUrl || null,
        author_title: post.author?.info || null,
        author_profile_image_url: authorImageUrl,
        content: post.content,
        posted_at: post.postedAt?.date || null,
        posted_ago_text: cleanPostedAgoText(post.postedAt?.postedAgoText),
        days_ago: calculateDaysAgo(post.postedAt?.date),
        likes: post.engagement?.likes || 0,
        comments: post.engagement?.comments || 0,
        shares: post.engagement?.shares || 0,
        fetched_at: new Date().toISOString(),
        ai_comment: aiComment,
        ai_comment_generated_at: aiComment ? new Date().toISOString() : null,
      };

      // Insert the new post
      const { error: insertError } = await supabase
        .from('engagement_posts')
        .insert(engagementPost);

      if (insertError) {
        console.error(`Error saving post: ${insertError.message}`);
        skippedCount++;
      } else {
        savedCount++;

        // Update profile info if we discovered new data
        const profileUpdates: Record<string, string> = {};

        if (post.author?.name && !profile.name) {
          profileUpdates.name = post.author.name;
        }

        const profileImageUrl = post.author?.picture || post.author?.profilePicture;
        if (profileImageUrl) {
          profileUpdates.profile_image_url = profileImageUrl;
        }

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

    // Calculate final statistics
    const avgCharCount = stats.commentCount > 0 ? Math.round(stats.totalCharCount / stats.commentCount) : 0;

    console.log(`Successfully saved ${savedCount} posts, skipped ${skippedCount}, AI comments generated: ${aiCommentsGenerated}`);
    console.log(`AI Comment Stats: avg ${avgCharCount} chars, distribution:`, stats.approachCounts);

    return new Response(
      JSON.stringify({
        success: true,
        posts_fetched: posts.length,
        posts_saved: savedCount,
        posts_skipped: skippedCount,
        profiles_processed: profiles.length,
        ai_comments_generated: aiCommentsGenerated,
        ai_comment_stats: {
          average_char_count: avgCharCount,
          approach_distribution: stats.approachCounts,
        },
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
