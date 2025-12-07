import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// Post analysis types
type PostType = 'observation' | 'vulnerable-story' | 'educational' | 'promotional' | 'thank-you' | 'question' | 'celebration';
type PostTone = 'casual' | 'professional' | 'vulnerable' | 'punchy' | 'playful' | 'formal';
type ResponseLength = 'short' | 'medium' | 'detailed';

// NEW comment approach types (task requirement)
type CommentApproach = 'reaction' | 'agreement_with_addition' | 'personal_take' | 'supportive';

interface PostAnalysis {
  postType: PostType;
  postTone: PostTone;
  responseLength: ResponseLength;
}

interface GeneratedComment {
  comment: string;
  comment_approach: CommentApproach;
  tone: string;
  char_count: number;
  analysis: PostAnalysis;
  reasoning: string;
}

// ============================================================================
// BANNED PHRASES LIST (HARD BLOCK)
// ============================================================================

const BANNED_PHRASES = [
  // Explicitly banned in task
  "this really resonates",
  "this resonates",
  "game-changer",
  "game changer",
  "i've definitely",
  "couldn't agree more",
  "great breakdown",
  "that's fantastic",
  "building on your point",
  "i'd also highlight",
  "what you're touching on is often called",
  "what you're touching on is",
  "it's wild how far",
  "i'm curious if",
  "as a ",  // catches "As a [role]..."

  // Additional corporate/robotic phrases
  "to add to this",
  "in my experience",
  "powerful insights",
  "this is gold",
  "spot on as always",
  "great post",
  "love this post",
  "what a great point",
  "so true",
  "this hit home",
  "so important",
  "key takeaway",
  "absolutely agree",
  "definitely agree",
  "certainly agree",
  "well articulated",
  "brilliantly put",
  "beautifully written",
  "this is so insightful",
  "what a wonderful",
  "we tested this",
  "we tried this",
  "in my role as",
  "speaking as a",
  "i can say that",
  "incredibly insightful",
  "super helpful",
  "really appreciate you sharing",
  "thanks for sharing this",
  "valuable perspective",
];

// ============================================================================
// INPUT VALIDATION
// ============================================================================

const GenerateCommentsSchema = z.object({
  post_content: z.string().min(20, "Post content too short to analyze"),
  author_name: z.string().min(1),
  author_title: z.string().optional().default(""),
  regenerate: z.boolean().optional().default(false),
  previous_approach: z.string().optional(),
});

// ============================================================================
// NEW SYSTEM PROMPT - COMPLETE OVERHAUL PER TASK REQUIREMENTS
// ============================================================================

const SYSTEM_PROMPT = `You are generating a single LinkedIn comment that sounds like a real human wrote it. Your goal is to be indistinguishable from authentic, casual human comments.

## STEP 1: POST ANALYSIS (do this first)

Before generating, analyze:

1. POST TYPE (pick one):
   - observation: General industry insight or opinion
   - vulnerable-story: Personal failure, struggle, or emotional share
   - educational: Teaching content, tips, how-tos
   - promotional: Selling something, announcing a product/service
   - thank-you: Gratitude post, shoutout to someone
   - question: Asking the audience something
   - celebration: Milestone, achievement, good news

2. POST TONE (pick one):
   - casual: Relaxed, conversational
   - professional: Business-focused but not corporate
   - vulnerable: Emotional, raw, personal
   - punchy: Short, bold statements
   - playful: Light-hearted, humorous
   - formal: Serious, weighty topic

3. APPROPRIATE RESPONSE LENGTH:
   - short: 1-3 sentences (DEFAULT - use this 80% of the time)
   - medium: 3-5 sentences (only if post genuinely warrants it)
   - detailed: 5+ sentences (very rare, only for deep educational responses)

## STEP 2: SELECT COMMENT APPROACH

Pick ONE approach based on your analysis:

- "reaction" - Simple response to the content. Just acknowledging what they said.
- "agreement_with_addition" - Building on their point with a specific, brief addition.
- "personal_take" - Sharing an opinion or perspective (WITHOUT fabricating experience).
- "supportive" - For thank-you posts, shoutouts, celebrations. Brief encouragement.

## STEP 3: MATCH THE TONE

Your comment MUST match the post's energy:
- CASUAL POST → Use contractions, fragments, informal language. "yeah", "haha", lowercase ok
- PROFESSIONAL POST → Clean but not corporate, avoid slang
- VULNERABLE POST → Empathetic, no advice unless asked, acknowledge feelings briefly
- PUNCHY POST → Match the energy, be brief and punchy back
- PLAYFUL POST → Humor OK, jokes OK, be light
- PROMOTIONAL POST → Either brief support OR engage genuinely with ONE specific claim

## HARD RULES - VIOLATE ANY AND THE COMMENT IS REJECTED:

### BANNED PUNCTUATION:
- NEVER use exclamation points (!) under any circumstances
- Replace any excited tone with calm, understated phrasing
- Use periods only. Commas where needed.

### NO QUESTIONS RULE:
- NEVER generate any questions in comments
- No question marks (?) allowed
- Comments should be statements, observations, or reactions only
- No rhetorical questions either

### BANNED PHRASES (never use these):
- "This really resonates"
- "Game-changer"
- "I've definitely..."
- "Couldn't agree more"
- "Great breakdown"
- "That's fantastic"
- "Building on your point"
- "I'd also highlight"
- "What you're touching on is often called..."
- "It's wild how far X has come"
- "I'm curious if..."
- Any phrase starting with "As a [role]..."
- "In my experience" (when fabricating)
- "To add to this"
- "Super helpful"
- "Really appreciate you sharing"
- "Thanks for sharing this"
- "Valuable perspective"

### AUTHENTICITY RULES (NO FABRICATION):
- NEVER claim to have done something, experienced something, or achieved results
- NEVER say "we" when referring to business activities (implies false team/company)
- NEVER invent timelines ("six months ago", "last quarter", "recently we...")
- NEVER claim metrics or results ("this helped me increase X by Y%")
- If you want to relate, use: "I've heard similar things" or "that tracks with what I've seen others say"
- Or just agree without relating at all

### LENGTH RULES:
- DEFAULT to SHORT (1-3 sentences)
- Simple posts (thank yous, observations, quick thoughts) get simple replies
- Only go longer if the post genuinely warrants detailed response
- Sometimes the best comment is just "Ha, same" or "This is good" or "Solid take"

### CONTEXT AWARENESS:
- If post is a simple thank-you or shoutout → respond with simple acknowledgment
- If post is promotional/sales → either engage with ONE specific claim or offer brief support
- If post is personal/vulnerable → respond with empathy, not analysis
- If post is educational → you can add a specific point but don't lecture

## VARIETY MECHANISMS:

Randomize these elements:
- Whether to use author's first name (30% chance): "Sarah - yep." vs just "Yep."
- Name placement: beginning vs end of comment
- Sentence structure variety
- Allow occasional incomplete thoughts or fragments
- Sometimes just agreement without adding anything

## EXAMPLE OUTPUTS:

REACTION (simple response):
- "Solid take."
- "This is good."
- "Ha, same."
- "Yeah, this tracks."
- "The bit about [specific thing] is underrated."

AGREEMENT_WITH_ADDITION (building on point):
- "Yep. The part about X is what most people miss."
- "Sarah - that second point is something I keep coming back to."
- "Agreed. Though I'd add that [brief specific point]."

PERSONAL_TAKE (sharing perspective):
- "I see this a bit differently. [brief take]."
- "Not sure I agree with all of it, but the core idea holds."
- "The way I think about this: [perspective]."

SUPPORTIVE (for thank-yous, celebrations):
- "Congrats. Well earned."
- "This is great to see."
- "Good stuff."
- "Sarah - nice work."

## OUTPUT FORMAT (JSON only):

{
  "analysis": {
    "postType": "observation|vulnerable-story|educational|promotional|thank-you|question|celebration",
    "postTone": "casual|professional|vulnerable|punchy|playful|formal",
    "responseLength": "short|medium|detailed"
  },
  "comment": "The actual comment text - NO exclamation points, NO questions",
  "comment_approach": "reaction|agreement_with_addition|personal_take|supportive",
  "tone": "The tone you matched (casual, professional, empathetic, etc.)",
  "char_count": 45,
  "reasoning": "Brief note on why this approach was chosen"
}`;

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

function containsBannedPhrase(comment: string): { banned: boolean; phrase?: string } {
  const lowerComment = comment.toLowerCase();

  for (const phrase of BANNED_PHRASES) {
    if (lowerComment.includes(phrase.toLowerCase())) {
      return { banned: true, phrase };
    }
  }

  return { banned: false };
}

function hasFabricatedExperience(comment: string): boolean {
  const lowerComment = comment.toLowerCase();
  const fabricationPatterns = [
    /we (did|tried|tested|saw|experienced|implemented|launched|built)/i,
    /i (did|tried|tested|saw|experienced|implemented|launched|built) this/i,
    /(last|this) (week|month|quarter|year)/i,
    /\d+ (months?|weeks?|years?) ago/i,
    /increased .* by \d+%/i,
    /grew .* by \d+%/i,
    /boosted .* by \d+%/i,
    /in my role as/i,
    /speaking as a/i,
    /as a \w+,? i/i,
  ];

  return fabricationPatterns.some(pattern => pattern.test(lowerComment));
}

function hasQuestionMark(comment: string): boolean {
  return comment.includes('?');
}

function hasExclamationPoint(comment: string): boolean {
  return comment.includes('!');
}

function validateComment(result: GeneratedComment): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for question marks (hard block)
  if (hasQuestionMark(result.comment)) {
    errors.push("Contains question mark - questions are not allowed");
  }

  // Check for exclamation points (hard block)
  if (hasExclamationPoint(result.comment)) {
    errors.push("Contains exclamation point - exclamation points are banned");
  }

  // Check banned phrases
  const bannedCheck = containsBannedPhrase(result.comment);
  if (bannedCheck.banned) {
    errors.push(`Contains banned phrase: "${bannedCheck.phrase}"`);
  }

  // Check fabricated experiences
  if (hasFabricatedExperience(result.comment)) {
    errors.push("Contains fabricated experience claim");
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// AI CALL FUNCTION
// ============================================================================

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);

    if (response.status === 503 && attempt < maxRetries) {
      const delay = Math.pow(2, attempt - 1) * 1000;
      console.log(`AI gateway unavailable (503), retry ${attempt}/${maxRetries - 1} in ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
      continue;
    }

    return response;
  }

  throw new Error('Max retries exceeded');
}

async function callAI(systemPrompt: string, userPrompt: string, temperature: number = 0.9): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY is not configured');
  }

  const response = await fetchWithRetry('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI gateway error:', response.status, errorText);

    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    if (response.status === 402) {
      throw new Error('Payment required. Please add credits to your workspace.');
    }
    if (response.status === 503) {
      throw new Error('AI service temporarily unavailable. Please try again in a moment.');
    }

    throw new Error(`AI gateway error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// ============================================================================
// COMMENT CLEANING FUNCTION
// ============================================================================

function cleanComment(comment: string): string {
  // Remove exclamation points and replace with periods where appropriate
  let cleaned = comment.replace(/!/g, '.');

  // Remove question marks (convert rhetorical questions to statements)
  cleaned = cleaned.replace(/\?/g, '.');

  // Clean up double periods
  cleaned = cleaned.replace(/\.+/g, '.').trim();

  return cleaned;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validationResult = GenerateCommentsSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { post_content, author_name, author_title, regenerate, previous_approach } = validationResult.data;

    console.log(`Generating comment for post by ${author_name}${regenerate ? ' (regenerating)' : ''}`);

    // Build user prompt
    let userPrompt = `Generate a single LinkedIn comment for this post.

POST AUTHOR: ${author_name}`;

    if (author_title) {
      userPrompt += `\nAUTHOR HEADLINE: ${author_title}`;
    }

    userPrompt += `\n\nPOST CONTENT:
${post_content}`;

    // Add regeneration context if applicable
    if (regenerate && previous_approach) {
      userPrompt += `\n\nNOTE: The previous comment used the "${previous_approach}" approach. Please try a DIFFERENT approach this time.`;
    }

    // Add critical reminders
    userPrompt += `\n\nCRITICAL REMINDERS:
1. NO exclamation points (!) - use periods only
2. NO questions (?) - statements and observations only
3. Keep it SHORT (1-3 sentences) unless the post genuinely warrants more
4. Match the tone of the original post
5. Do not fabricate experiences or claim to have done things`;

    // Try up to 3 times to get a valid comment
    let attempts = 0;
    const maxAttempts = 3;
    let lastResult: GeneratedComment | null = null;
    let lastErrors: string[] = [];

    while (attempts < maxAttempts) {
      attempts++;
      console.log(`Generation attempt ${attempts}/${maxAttempts}`);

      // Lower temperature on retries for more consistent output
      const temperature = attempts === 1 ? 0.9 : 0.7;
      const response = await callAI(SYSTEM_PROMPT, userPrompt, temperature);

      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('Failed to extract JSON from response:', response);
        continue;
      }

      try {
        const parsed = JSON.parse(jsonMatch[0]);

        // Clean the comment to remove any lingering ! or ?
        const cleanedComment = cleanComment(parsed.comment || '');

        // Construct result object
        const result: GeneratedComment = {
          comment: cleanedComment,
          comment_approach: parsed.comment_approach || 'reaction',
          tone: parsed.tone || 'casual',
          char_count: cleanedComment.length,
          analysis: parsed.analysis || { postType: 'observation', postTone: 'casual', responseLength: 'short' },
          reasoning: parsed.reasoning || '',
        };

        lastResult = result;

        // Validate the comment
        const validation = validateComment(result);

        if (validation.valid) {
          console.log(`Valid comment generated on attempt ${attempts}: "${result.comment.substring(0, 50)}..."`);

          return new Response(
            JSON.stringify({
              comment: result.comment,
              approach: result.comment_approach,
              tone_matched: result.tone,
              char_count: result.char_count,
              analysis: result.analysis,
              reasoning: result.reasoning,
              generated_at: new Date().toISOString(),
              attempts,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          console.log(`Validation failed on attempt ${attempts}:`, validation.errors);
          lastErrors = validation.errors;

          // Add validation feedback to next attempt
          userPrompt += `\n\nPREVIOUS ATTEMPT FAILED VALIDATION: ${validation.errors.join(', ')}.
IMPORTANT: Use NO exclamation points and NO question marks. Just simple statements.`;
        }
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        continue;
      }
    }

    // If we exhausted attempts, return the last result with a warning (after cleaning)
    if (lastResult) {
      // Force clean the comment one more time
      lastResult.comment = cleanComment(lastResult.comment);
      lastResult.char_count = lastResult.comment.length;

      console.warn(`Returning comment after ${maxAttempts} attempts with validation issues:`, lastErrors);

      return new Response(
        JSON.stringify({
          comment: lastResult.comment,
          approach: lastResult.comment_approach,
          tone_matched: lastResult.tone,
          char_count: lastResult.char_count,
          analysis: lastResult.analysis,
          reasoning: lastResult.reasoning,
          generated_at: new Date().toISOString(),
          attempts,
          validation_warnings: lastErrors,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Failed to generate valid comment after multiple attempts');

  } catch (error) {
    console.error('Error in generate-engagement-comments function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
