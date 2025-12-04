import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
const SuggestRecyclePostsSchema = z.object({
  days_threshold: z.number().int().min(1).max(365).optional().default(90),
  limit: z.number().int().min(1).max(50).optional().default(10)
});

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
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validationResult = SuggestRecyclePostsSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors.map(e => e.message).join(', ');
      return new Response(
        JSON.stringify({ error: `Invalid input: ${errorMessage}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { days_threshold, limit } = validationResult.data;

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

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

    console.log(`Finding recyclable posts for user ${user.id} (threshold: ${days_threshold} days, limit: ${limit})...`);

    // Calculate the cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days_threshold);
    const cutoffIso = cutoffDate.toISOString();

    // Query posts that are used and older than threshold
    const { data: posts, error: postsError } = await supabaseAuth
      .from('posts')
      .select(`
        id,
        title,
        content,
        primary_category,
        tags,
        used_at,
        usage_count,
        is_favorite
      `)
      .eq('user_id', user.id)
      .eq('status', 'used')
      .lt('used_at', cutoffIso)
      .order('used_at', { ascending: true })
      .limit(limit * 2); // Fetch extra to allow for filtering after join

    if (postsError) {
      console.error('Database query error:', postsError);
      throw new Error('Failed to query posts');
    }

    if (!posts || posts.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          suggestions: [],
          message: 'No posts found that are ready for recycling'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get performance data for these posts
    const postIds = posts.map(p => p.id);
    const { data: performanceLogs, error: perfError } = await supabaseAuth
      .from('performance_logs')
      .select('post_id, impressions, likes, comments, shares, clicks, engagement_rate, posted_at')
      .in('post_id', postIds)
      .order('posted_at', { ascending: false });

    // Aggregate performance data per post
    const performanceByPost = new Map<string, {
      totalImpressions: number;
      totalLikes: number;
      totalComments: number;
      totalShares: number;
      totalClicks: number;
      avgEngagement: number;
      logCount: number;
      lastPosted: string | null;
    }>();

    if (performanceLogs && !perfError) {
      for (const log of performanceLogs) {
        const existing = performanceByPost.get(log.post_id) || {
          totalImpressions: 0,
          totalLikes: 0,
          totalComments: 0,
          totalShares: 0,
          totalClicks: 0,
          avgEngagement: 0,
          logCount: 0,
          lastPosted: null
        };

        existing.totalImpressions += log.impressions || 0;
        existing.totalLikes += log.likes || 0;
        existing.totalComments += log.comments || 0;
        existing.totalShares += log.shares || 0;
        existing.totalClicks += log.clicks || 0;
        existing.avgEngagement += log.engagement_rate || 0;
        existing.logCount += 1;
        if (!existing.lastPosted && log.posted_at) {
          existing.lastPosted = log.posted_at;
        }

        performanceByPost.set(log.post_id, existing);
      }
    }

    // Build suggestions with performance summary
    const suggestions = posts.map(post => {
      const perf = performanceByPost.get(post.id);
      const daysSinceUsed = post.used_at
        ? Math.floor((Date.now() - new Date(post.used_at).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      // Calculate a simple recycle score
      let recycleScore = 0;
      if (perf) {
        // Higher engagement = higher score
        recycleScore += (perf.avgEngagement / perf.logCount) * 10 || 0;
        // More impressions = higher score
        recycleScore += Math.log10(perf.totalImpressions + 1) * 5;
        // Favorites get a boost
        if (post.is_favorite) recycleScore += 20;
      } else {
        // No performance data - give a base score if favorited
        if (post.is_favorite) recycleScore = 20;
        else recycleScore = 5; // Base score for posts without data
      }

      return {
        id: post.id,
        title: post.title,
        content_preview: post.content.substring(0, 200) + (post.content.length > 200 ? '...' : ''),
        primary_category: post.primary_category,
        tags: post.tags,
        used_at: post.used_at,
        days_since_used: daysSinceUsed,
        usage_count: post.usage_count,
        is_favorite: post.is_favorite,
        performance_summary: perf ? {
          total_impressions: perf.totalImpressions,
          total_likes: perf.totalLikes,
          total_comments: perf.totalComments,
          total_shares: perf.totalShares,
          total_clicks: perf.totalClicks,
          avg_engagement_rate: perf.logCount > 0 ? perf.avgEngagement / perf.logCount : null,
          times_tracked: perf.logCount,
          last_posted: perf.lastPosted
        } : null,
        recycle_score: Math.round(recycleScore * 10) / 10
      };
    });

    // Sort by recycle score (highest first) and limit
    suggestions.sort((a, b) => b.recycle_score - a.recycle_score);
    const topSuggestions = suggestions.slice(0, limit);

    console.log(`Found ${topSuggestions.length} posts ready for recycling`);

    return new Response(
      JSON.stringify({
        success: true,
        suggestions: topSuggestions,
        total_found: posts.length,
        days_threshold,
        limit
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in suggest-recycle-posts function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
