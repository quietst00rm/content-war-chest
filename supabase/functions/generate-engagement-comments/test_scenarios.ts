/**
 * AI Comment Generation Test Suite - Updated for New Requirements
 *
 * This file contains test scenarios and validation utilities for the
 * completely overhauled AI comment generation system.
 *
 * NEW REQUIREMENTS:
 * - NO question marks allowed
 * - NO exclamation points allowed
 * - New approach types: reaction, agreement_with_addition, personal_take, supportive
 * - No fabricated experiences
 * - No banned phrases
 *
 * Run with: deno run --allow-net test_scenarios.ts
 */

// ============================================================================
// TEST SCENARIOS
// ============================================================================

export const TEST_SCENARIOS = {
  // Scenario 1: Casual observation about industry trend
  casual_observation: {
    post_content: `AI is changing everything in marketing. Three years ago, nobody was talking about using AI for content creation. Now it's everywhere. The brands that figure this out early are going to win big.`,
    author_name: "Sarah Chen",
    author_title: "Marketing Director at TechCorp",
    expected_post_type: "observation",
    expected_tone: "casual",
    valid_approaches: ["reaction", "agreement_with_addition", "personal_take"],
    notes: "Should get mostly short, agreeable comments. NO questions."
  },

  // Scenario 2: Vulnerable personal failure story
  vulnerable_story: {
    post_content: `I got fired yesterday.

After 8 years at a company I loved, they let me go in a 15-minute Zoom call. No warning. No explanation beyond "restructuring."

I'm not going to pretend I'm okay. I'm devastated. I poured everything into that job. Late nights. Weekends. Missed family events.

And now I'm sitting here wondering what's next.

If you've been through this, I'd love to hear how you got through it.`,
    author_name: "Michael Torres",
    author_title: "Former VP of Sales",
    expected_post_type: "vulnerable-story",
    expected_tone: "vulnerable",
    valid_approaches: ["supportive", "reaction"],
    notes: "Should be empathetic, no advice, brief acknowledgment. NO questions."
  },

  // Scenario 3: Listicle with 5 tips
  educational_listicle: {
    post_content: `5 things I wish I knew before starting my first business:

1. Cash flow is more important than revenue
2. Your first hire matters more than your 10th
3. Nobody cares about your product until it solves their problem
4. Marketing isn't optional, even if you hate it
5. 90% of advice from people who've "made it" doesn't apply to you

Save this post. Seriously.`,
    author_name: "Alex Rivera",
    author_title: "3x Founder | Angel Investor",
    expected_post_type: "educational",
    expected_tone: "punchy",
    valid_approaches: ["reaction", "agreement_with_addition", "personal_take"],
    notes: "Can engage with specific points but keep it brief. NO questions."
  },

  // Scenario 4: Promotional post for a course
  promotional: {
    post_content: `I'm launching my new course: "LinkedIn Growth Masterclass"

After growing my following from 0 to 500K in 18 months, I'm sharing everything I learned.

Inside you'll get:
- My exact posting strategy
- 50+ hook templates that work
- Weekly live Q&A calls
- Private community access

Early bird pricing ends Friday.

Link in comments.`,
    author_name: "Jordan Blake",
    author_title: "LinkedIn Coach | 500K+ Followers",
    expected_post_type: "promotional",
    expected_tone: "professional",
    valid_approaches: ["reaction", "supportive"],
    notes: "Either brief support or engage with ONE specific claim. NO questions."
  },

  // Scenario 5: Thank-you/shoutout post
  thank_you: {
    post_content: `Huge shoutout to @Lisa Wong for introducing me to my biggest client ever.

3 years ago, she took a chance on recommending me when I was just starting out. That intro turned into a $2M relationship that changed my business forever.

Never underestimate the power of a warm introduction.

Thank you, Lisa. I owe you one (or a hundred).`,
    author_name: "David Park",
    author_title: "CEO at Growth Agency",
    expected_post_type: "thank-you",
    expected_tone: "casual",
    valid_approaches: ["reaction", "supportive"],
    notes: "Brief, supportive, can be very short. NO questions."
  },

  // Scenario 6: Controversial opinion post
  controversial_opinion: {
    post_content: `Unpopular opinion: Remote work is killing career growth.

I know everyone loves working from home. But here's what I'm seeing:

- Junior employees aren't learning from osmosis
- Relationships that lead to promotions aren't forming
- The "hard workers" are invisible

I'm not saying we need to go back to 5 days in office. But full remote? It's not the answer people think it is.`,
    author_name: "Rachel Kim",
    author_title: "VP of People @ Fortune 500",
    expected_post_type: "observation",
    expected_tone: "serious",
    valid_approaches: ["reaction", "agreement_with_addition", "personal_take"],
    notes: "Can agree, disagree, or offer alternative perspective briefly. NO questions."
  },

  // Scenario 7: Question asked to audience (we should still respond without asking questions back)
  audience_question: {
    post_content: `Hiring managers: What's the #1 thing that makes you instantly reject a resume?

I'm updating my resume template and want to make sure I'm not giving bad advice.

Drop your biggest pet peeves below.`,
    author_name: "Chris Anderson",
    author_title: "Career Coach",
    expected_post_type: "question",
    expected_tone: "casual",
    valid_approaches: ["reaction", "personal_take"],
    notes: "Can answer their question with a statement or react. NO questions in response."
  },

  // Scenario 8: Celebration of milestone
  celebration: {
    post_content: `I just hit 100,000 followers on LinkedIn!

When I started posting 2 years ago, I had 200 connections and zero strategy.

To everyone who's followed along, liked, commented, and shared - thank you.

Here's to the next 100K. Let's go!`,
    author_name: "Emma Thompson",
    author_title: "Content Creator | Speaker",
    expected_post_type: "celebration",
    expected_tone: "playful",
    valid_approaches: ["reaction", "supportive"],
    notes: "Brief congrats, can be very short. NO questions."
  },
};

// ============================================================================
// BANNED PHRASES LIST
// ============================================================================

export const BANNED_PHRASES = [
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
// VALIDATION FUNCTIONS
// ============================================================================

export function containsBannedPhrase(comment: string): { banned: boolean; phrase?: string } {
  const lowerComment = comment.toLowerCase();

  for (const phrase of BANNED_PHRASES) {
    if (lowerComment.includes(phrase.toLowerCase())) {
      return { banned: true, phrase };
    }
  }

  return { banned: false };
}

export function hasFabricatedExperience(comment: string): boolean {
  const patterns = [
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

  return patterns.some(pattern => pattern.test(comment));
}

// NEW: Check for question marks (now banned)
export function hasQuestionMark(comment: string): boolean {
  return comment.includes('?');
}

// NEW: Check for exclamation points (now banned)
export function hasExclamationPoint(comment: string): boolean {
  return comment.includes('!');
}

export function getLengthCategory(charCount: number): string {
  if (charCount < 80) return "short";
  if (charCount < 150) return "medium";
  return "detailed";
}

// NEW: Valid approach types
export const VALID_APPROACHES = ['reaction', 'agreement_with_addition', 'personal_take', 'supportive'] as const;

// ============================================================================
// TEST RUNNER
// ============================================================================

interface TestResult {
  scenario: string;
  comment: string;
  approach: string;
  tone: string;
  charCount: number;
  lengthCategory: string;
  validations: {
    noBannedPhrases: boolean;
    noFabricatedExperience: boolean;
    noQuestionMarks: boolean;
    noExclamationPoints: boolean;
    validApproachType: boolean;
  };
  passed: boolean;
  errors: string[];
}

export function validateComment(
  scenarioName: string,
  comment: string,
  approach: string,
  tone: string
): TestResult {
  const errors: string[] = [];
  const charCount = comment.length;
  const lengthCategory = getLengthCategory(charCount);

  // Check banned phrases
  const bannedCheck = containsBannedPhrase(comment);
  if (bannedCheck.banned) {
    errors.push(`Contains banned phrase: "${bannedCheck.phrase}"`);
  }

  // Check fabricated experience
  const hasFabricated = hasFabricatedExperience(comment);
  if (hasFabricated) {
    errors.push("Contains fabricated experience claim");
  }

  // NEW: Check for question marks (now banned)
  const hasQuestion = hasQuestionMark(comment);
  if (hasQuestion) {
    errors.push("Contains question mark - questions are banned");
  }

  // NEW: Check for exclamation points (now banned)
  const hasExclamation = hasExclamationPoint(comment);
  if (hasExclamation) {
    errors.push("Contains exclamation point - exclamation points are banned");
  }

  // Check valid approach type
  const validApproach = VALID_APPROACHES.includes(approach as any);
  if (!validApproach) {
    errors.push(`Invalid approach type: "${approach}". Must be one of: ${VALID_APPROACHES.join(', ')}`);
  }

  return {
    scenario: scenarioName,
    comment,
    approach,
    tone,
    charCount,
    lengthCategory,
    validations: {
      noBannedPhrases: !bannedCheck.banned,
      noFabricatedExperience: !hasFabricated,
      noQuestionMarks: !hasQuestion,
      noExclamationPoints: !hasExclamation,
      validApproachType: validApproach,
    },
    passed: errors.length === 0,
    errors,
  };
}

// ============================================================================
// SAMPLE OUTPUTS FOR REFERENCE (Updated - no ! or ?)
// ============================================================================

export const SAMPLE_OUTPUTS = {
  // Expected good outputs for each approach type
  reaction_examples: [
    "Solid take.",
    "This is good.",
    "Ha, same.",
    "Yeah, this tracks.",
    "The bit about cash flow is underrated.",
    "Sarah - yep.",
  ],

  agreement_with_addition_examples: [
    "Yep. The part about X is what most people miss.",
    "Agreed. The hiring piece especially.",
    "Sarah - that second point is something I keep coming back to.",
  ],

  personal_take_examples: [
    "I see this a bit differently. Remote can work if you're intentional.",
    "Not sure I agree with all of it, but the core idea holds.",
    "The way I think about this: it's less about location, more about culture.",
  ],

  supportive_examples: [
    "Congrats. Well earned.",
    "This is great to see.",
    "Good stuff.",
    "Sarah - nice work.",
    "Love seeing this.",
  ],
};

// ============================================================================
// STATISTICS GENERATOR
// ============================================================================

export function generateStatistics(results: TestResult[]): {
  averageCharCount: number;
  approachDistribution: Record<string, number>;
  lengthDistribution: Record<string, number>;
  passRate: number;
  commonErrors: Record<string, number>;
} {
  const totalChars = results.reduce((sum, r) => sum + r.charCount, 0);
  const averageCharCount = Math.round(totalChars / results.length);

  const approachDistribution: Record<string, number> = {};
  const lengthDistribution: Record<string, number> = {};
  const commonErrors: Record<string, number> = {};

  let passCount = 0;

  for (const result of results) {
    // Count approaches
    approachDistribution[result.approach] = (approachDistribution[result.approach] || 0) + 1;

    // Count length categories
    lengthDistribution[result.lengthCategory] = (lengthDistribution[result.lengthCategory] || 0) + 1;

    // Count passes
    if (result.passed) passCount++;

    // Count errors
    for (const error of result.errors) {
      commonErrors[error] = (commonErrors[error] || 0) + 1;
    }
  }

  return {
    averageCharCount,
    approachDistribution,
    lengthDistribution,
    passRate: Math.round((passCount / results.length) * 100),
    commonErrors,
  };
}

// ============================================================================
// MAIN TEST EXECUTION (for manual testing)
// ============================================================================

if (import.meta.main) {
  console.log("AI Comment Generation Test Suite - Updated");
  console.log("==========================================\n");

  console.log("NEW REQUIREMENTS:");
  console.log("  - NO question marks (?) allowed");
  console.log("  - NO exclamation points (!) allowed");
  console.log("  - Approach types: reaction, agreement_with_addition, personal_take, supportive");
  console.log("  - No fabricated experiences");
  console.log("  - No banned phrases\n");

  console.log("Test Scenarios Available:");
  for (const [name, scenario] of Object.entries(TEST_SCENARIOS)) {
    console.log(`\n[${name}]`);
    console.log(`  Post Type: ${scenario.expected_post_type}`);
    console.log(`  Tone: ${scenario.expected_tone}`);
    console.log(`  Valid Approaches: ${scenario.valid_approaches.join(", ")}`);
    console.log(`  Notes: ${scenario.notes}`);
  }

  console.log("\n\nSample Valid Comments (NO ! or ?):");

  console.log("\nReaction Comments:");
  for (const example of SAMPLE_OUTPUTS.reaction_examples) {
    console.log(`  "${example}" (${example.length} chars)`);
  }

  console.log("\nAgreement With Addition Comments:");
  for (const example of SAMPLE_OUTPUTS.agreement_with_addition_examples) {
    console.log(`  "${example}" (${example.length} chars)`);
  }

  console.log("\nPersonal Take Comments:");
  for (const example of SAMPLE_OUTPUTS.personal_take_examples) {
    console.log(`  "${example}" (${example.length} chars)`);
  }

  console.log("\nSupportive Comments:");
  for (const example of SAMPLE_OUTPUTS.supportive_examples) {
    console.log(`  "${example}" (${example.length} chars)`);
  }

  console.log("\n\nValidation Functions Available:");
  console.log("  - containsBannedPhrase(comment)");
  console.log("  - hasFabricatedExperience(comment)");
  console.log("  - hasQuestionMark(comment)     // NEW - must return false");
  console.log("  - hasExclamationPoint(comment) // NEW - must return false");
  console.log("  - getLengthCategory(charCount)");
  console.log("  - validateComment(scenario, comment, approach, tone)");
  console.log("  - generateStatistics(results)");

  console.log("\n\nTarget Length Distribution:");
  console.log("  - 80% short (1-3 sentences, under 80 chars ideal)");
  console.log("  - 15% medium (3-5 sentences)");
  console.log("  - 5% detailed (5+ sentences, only if truly warranted)");

  console.log("\n\nTo run actual API tests, use the edge function directly.");
}
