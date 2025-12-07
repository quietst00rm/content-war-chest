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
type PostEnergy = 'casual' | 'professional' | 'vulnerable' | 'punchy' | 'playful' | 'serious';
type PostLength = 'short' | 'medium' | 'long';
type CommenterRelationship = 'stranger' | 'acquaintance' | 'peer' | 'fan';

// Comment approach types
type CommentApproach = 'micro' | 'reaction' | 'opinion' | 'question' | 'support' | 'disagree';
type CommentTone = 'casual' | 'professional' | 'playful' | 'empathetic';

interface PostAnalysis {
  postType: PostType;
  postEnergy: PostEnergy;
  postLength: PostLength;
  commenterRelationship: CommenterRelationship;
}

interface GeneratedComment {
  comment: string;
  approach: CommentApproach;
  tone_matched: CommentTone;
  char_count: number;
  reasoning: string;
}

// ============================================================================
// BANNED PHRASES LIST (HARD BLOCK)
// These phrases appear ZERO times in 1,200 real influencer comments
// ============================================================================

const BANNED_PHRASES = [
  "this resonates",
  "this really resonates",
  "game-changer",
  "game changer",
  "couldn't agree more",
  "i'd also highlight",
  "building on your point",
  "that's fantastic",
  "what you're touching on is",
  "to add to this",
  "i've definitely experienced",
  "in my experience",
  "as a ",  // catches "As a [role], I..."
  "i'm curious if",
  "it's wild how far",
  "great breakdown",
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
  "we tested this",  // fabricated experience
  "we tried this",   // fabricated experience
  "saw a .* lift",   // fabricated metrics
  "saw a .* increase", // fabricated metrics
  "in my role as",
  "speaking as a",
  "i can say that",
];

// ============================================================================
// APPROVED PHRASES LIST (USE FREQUENTLY)
// These phrases appear regularly in real influencer comments
// ============================================================================

const APPROVED_MICRO_PHRASES = [
  "Exactly.",
  "Absolutely.",
  "Right on.",
  "Well said.",
  "Bingo.",
  "Spot on.",
  "This is it.",
  "Ha, same.",
  "Truth.",
  "100%",
  "Yep.",
  "Love it.",
  "Love this.",
  "Nailed it.",
  "Thank you!",
  "Thanks!",
  "haha",
  "This.",
  "Yes.",
  "Agreed.",
  "Fair point.",
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
// SYSTEM PROMPT - COMPLETE OVERHAUL
// ============================================================================

const SYSTEM_PROMPT = `You are generating a single LinkedIn comment that sounds authentically human. Your comments must be indistinguishable from those written by real people.

## STEP 1: ANALYZE THE POST

Before generating, you must classify:

1. POST TYPE (pick one):
   - observation: General industry insight or opinion
   - vulnerable-story: Personal failure, struggle, or emotional share
   - educational: Teaching content, tips, how-tos, listicles
   - promotional: Selling something, announcing a product/service
   - thank-you: Gratitude post, shoutout to someone
   - question: Asking the audience something
   - celebration: Milestone, achievement, good news

2. POST ENERGY (pick one):
   - casual: Relaxed, conversational tone
   - professional: Business-focused but not corporate
   - vulnerable: Emotional, raw, personal
   - punchy: Short, bold statements
   - playful: Light-hearted, humorous
   - serious: Weighty topic, requires gravitas

3. POST LENGTH:
   - short: Under 500 characters
   - medium: 500-1500 characters
   - long: Over 1500 characters

## STEP 2: SELECT COMMENT LENGTH (USE THIS PROBABILITY DISTRIBUTION)

Based on real analysis of 1,200 influencer comments:
- 50% should be MICRO (under 50 characters): "Exactly." "This is it." "Ha, same."
- 30% should be SHORT (50-100 characters): One sentence reactions
- 15% should be MEDIUM (100-200 characters): 1-2 sentences with substance
- 5% should be LONG (200+ characters): Only for educational deep-dives or direct questions

LEAN HEAVILY toward micro and short. Most posts do NOT warrant long comments.

## STEP 3: SELECT COMMENT APPROACH

Based on your analysis, pick ONE:
- "micro": 1-10 words. Perfect for most posts. ("Exactly." "This is it." "Ha, same." "Nailed it.")
- "reaction": 1-2 sentences acknowledging specific content from the post
- "opinion": Sharing a brief personal take WITHOUT fabricating experience
- "question": Short, direct clarification question (under 10 words)
- "support": Brief congratulations or encouragement
- "disagree": Polite pushback with brief reasoning

## STEP 4: MATCH THE TONE

Your comment MUST match the post's energy:
- CASUAL POST → Use contractions, fragments, "haha", lowercase acceptable
- PROFESSIONAL POST → Clean but not corporate, avoid slang
- VULNERABLE POST → Empathetic, no advice unless asked, acknowledge feelings briefly
- PUNCHY POST → Match the energy, be brief/punchy back
- PLAYFUL POST → Humor OK, jokes OK, pop culture references OK
- PROMOTIONAL POST → Either brief support OR genuine specific question about one claim

## STEP 5: APPLY VARIETY MECHANISMS

Randomize these elements:
- Whether to use author's name (50% chance): "Sarah - yep." vs just "Yep."
- Name placement: beginning vs end
- Whether to use an emoji (30% chance, max 1)
- Sentence structure variety

## HARD RULES - VIOLATE ANY AND THE COMMENT IS REJECTED:

### BANNED PHRASES (never use):
- "This resonates" / "This really resonates"
- "Game-changer" / "Game changer"
- "Couldn't agree more"
- "I'd also highlight" / "Building on your point"
- "That's fantastic" / "What you're touching on is"
- "To add to this"
- "I've definitely experienced" / "In my experience" (when making things up)
- "As a [role], I..." / "Speaking as a..."
- "I'm curious if..." (as question starter)
- "It's wild how far X has come"
- "Great breakdown" / "Powerful insights" / "This is gold"
- "Spot on as always"
- "Great post" / "Love this post" / "What a great point"
- "Absolutely" / "Definitely" / "Certainly" as standalone agreement
- "So true" / "So important" / "Key takeaway"
- Any compound question with multiple parts

### AUTHENTICITY RULES (NO FABRICATION):
- NEVER claim to have done/experienced something
- NEVER use "we" when referring to business activities
- NEVER invent timelines ("six months ago", "last quarter", "recently")
- NEVER claim results ("this helped me increase X by Y%")
- If relating to content, use: "I've heard similar things", "That tracks", "Makes sense"
- Or just agree without relating at all

### QUESTION RULES:
- Questions are OPTIONAL, not required
- Maximum 10 words for the question itself
- Must reference something SPECIFIC in the post
- No compound questions (one question only)
- No leading questions
- Format: Direct question, no preamble
- GOOD: "Where'd you see that stat?"
- GOOD: "What made you change your approach?"
- BAD: "I'm curious if anyone else has noticed this trend as well?"
- BAD: "Have you found that this approach leads to better outcomes?"

## APPROVED PHRASES (use these):
- "Exactly." / "Absolutely." / "Right on." / "Well said."
- "Bingo." / "Spot on." / "This is it." / "Ha, same."
- "Truth." / "100%" / "Yep." / "Love it." / "Nailed it."
- "Thank you!" / "Thanks!" / "haha" (lowercase)
- "[Name] - [brief reaction]" format

## EXAMPLES BY SCENARIO:

MICRO (50% of outputs):
- "Exactly."
- "This is it."
- "Ha, same."
- "Nailed it."
- "100%"
- "Truth."
- "Sarah - yep."

REACTION (30%):
- "Love this. The part about X really stands out."
- "Sarah - that second point is huge."
- "The [specific element] is what most people miss."

OPINION (10%):
- "I see this differently - [brief take]."
- "The way I think about it: [perspective]."

QUESTION (5%):
- "What made you shift to this approach?"
- "Where'd you see that data?"
- "Sarah - is this working for high-ticket too?"

SUPPORT (for celebrations/thank-yous):
- "Congrats! Well earned."
- "Love seeing this."
- "Go Sarah!"

## OUTPUT FORMAT:

Return ONLY valid JSON:
{
  "analysis": {
    "post_type": "observation|vulnerable-story|educational|promotional|thank-you|question|celebration",
    "post_energy": "casual|professional|vulnerable|punchy|playful|serious",
    "post_length": "short|medium|long"
  },
  "comment": "The actual comment text",
  "approach": "micro|reaction|opinion|question|support|disagree",
  "tone_matched": "casual|professional|playful|empathetic",
  "char_count": 45,
  "reasoning": "Brief note on why this approach was chosen"
}`;

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

function containsBannedPhrase(comment: string): { banned: boolean; phrase?: string } {
  const lowerComment = comment.toLowerCase();

  for (const phrase of BANNED_PHRASES) {
    // Handle regex patterns (those with .*)
    if (phrase.includes('.*')) {
      const regex = new RegExp(phrase, 'i');
      if (regex.test(lowerComment)) {
        return { banned: true, phrase };
      }
    } else if (lowerComment.includes(phrase.toLowerCase())) {
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

function hasCompoundQuestion(comment: string): boolean {
  const questionMarks = (comment.match(/\?/g) || []).length;
  if (questionMarks > 1) return true;

  // Check for compound question indicators
  const compoundIndicators = [
    /\? .* and .* \?/i,
    /how .* and .* \?/i,
    /what .* and .* \?/i,
    /have you found that .* combined with .* \?/i,
  ];

  return compoundIndicators.some(pattern => pattern.test(comment));
}

function getQuestionWordCount(comment: string): number {
  const questionMatch = comment.match(/[^.!]*\?/);
  if (!questionMatch) return 0;
  return questionMatch[0].trim().split(/\s+/).length;
}

function validateComment(result: GeneratedComment): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check banned phrases
  const bannedCheck = containsBannedPhrase(result.comment);
  if (bannedCheck.banned) {
    errors.push(`Contains banned phrase: "${bannedCheck.phrase}"`);
  }

  // Check fabricated experiences
  if (hasFabricatedExperience(result.comment)) {
    errors.push("Contains fabricated experience claim");
  }

  // Check compound questions
  if (hasCompoundQuestion(result.comment)) {
    errors.push("Contains compound question");
  }

  // Check question length
  if (result.comment.includes('?')) {
    const questionWords = getQuestionWordCount(result.comment);
    if (questionWords > 12) { // Slightly lenient to account for context
      errors.push(`Question too long: ${questionWords} words (max 10)`);
    }
  }

  // Validate approach matches length
  if (result.approach === 'micro' && result.char_count > 60) {
    errors.push(`Micro approach but comment is ${result.char_count} chars (should be under 50)`);
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

async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
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
      temperature: 0.9, // Higher for more natural variation
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

    // Add probability reminder
    userPrompt += `\n\nREMEMBER THE LENGTH DISTRIBUTION:
- 50% chance: MICRO (under 50 chars) - phrases like "Exactly.", "This is it.", "Ha, same."
- 30% chance: SHORT (50-100 chars) - one sentence
- 15% chance: MEDIUM (100-200 chars) - 1-2 sentences
- 5% chance: LONG (200+ chars) - only if post genuinely warrants it

Most posts work best with micro or short comments. Be brief unless there's a strong reason not to be.`;

    // Try up to 3 times to get a valid comment
    let attempts = 0;
    const maxAttempts = 3;
    let lastResult: GeneratedComment | null = null;
    let lastErrors: string[] = [];

    while (attempts < maxAttempts) {
      attempts++;
      console.log(`Generation attempt ${attempts}/${maxAttempts}`);

      const response = await callAI(SYSTEM_PROMPT, userPrompt);

      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('Failed to extract JSON from response:', response);
        continue;
      }

      try {
        const parsed = JSON.parse(jsonMatch[0]);

        // Construct result object
        const result: GeneratedComment = {
          comment: parsed.comment || '',
          approach: parsed.approach || 'reaction',
          tone_matched: parsed.tone_matched || 'casual',
          char_count: (parsed.comment || '').length,
          reasoning: parsed.reasoning || '',
        };

        lastResult = result;

        // Validate the comment
        const validation = validateComment(result);

        if (validation.valid) {
          console.log(`Valid comment generated on attempt ${attempts}: "${result.comment.substring(0, 50)}..."`);

          return new Response(
            JSON.stringify({
              ...result,
              generated_at: new Date().toISOString(),
              attempts,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          console.log(`Validation failed on attempt ${attempts}:`, validation.errors);
          lastErrors = validation.errors;

          // Add validation feedback to next attempt
          userPrompt += `\n\nPREVIOUS ATTEMPT FAILED VALIDATION: ${validation.errors.join(', ')}. Please fix these issues.`;
        }
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        continue;
      }
    }

    // If we exhausted attempts, return the last result with a warning
    if (lastResult) {
      console.warn(`Returning comment after ${maxAttempts} attempts with validation issues:`, lastErrors);

      return new Response(
        JSON.stringify({
          ...lastResult,
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
