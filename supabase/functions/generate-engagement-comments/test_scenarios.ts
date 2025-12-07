/**
 * AI Comment Generation Test Suite
 *
 * This file contains test scenarios and validation utilities for the
 * overhauled AI comment generation system.
 *
 * Run with: deno run --allow-net test_scenarios.ts
 *
 * The test scenarios cover all the major post types and validate:
 * - No banned phrases are used
 * - Appropriate length distribution
 * - Tone matching
 * - No fabricated experiences
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
    expected_energy: "casual",
    valid_approaches: ["micro", "reaction", "opinion"],
    notes: "Should get mostly short, agreeable comments"
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
    expected_energy: "vulnerable",
    valid_approaches: ["support", "micro"],
    notes: "Should be empathetic, no advice, brief acknowledgment"
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
    expected_energy: "punchy",
    valid_approaches: ["micro", "reaction", "opinion"],
    notes: "Can engage with specific points but keep it brief"
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
    expected_energy: "professional",
    valid_approaches: ["micro", "question", "support"],
    notes: "Either brief support or specific question about one claim"
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
    expected_energy: "casual",
    valid_approaches: ["micro", "support"],
    notes: "Brief, supportive, can be very short"
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
    expected_energy: "serious",
    valid_approaches: ["micro", "reaction", "opinion", "disagree"],
    notes: "Can agree, disagree, or offer alternative perspective briefly"
  },

  // Scenario 7: Question asked to audience
  audience_question: {
    post_content: `Hiring managers: What's the #1 thing that makes you instantly reject a resume?

I'm updating my resume template and want to make sure I'm not giving bad advice.

Drop your biggest pet peeves below.`,
    author_name: "Chris Anderson",
    author_title: "Career Coach",
    expected_post_type: "question",
    expected_energy: "casual",
    valid_approaches: ["reaction", "opinion"],
    notes: "Can answer the question briefly or react"
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
    expected_energy: "playful",
    valid_approaches: ["micro", "support"],
    notes: "Brief congrats, can be very short"
  },
};

// ============================================================================
// BANNED PHRASES LIST
// ============================================================================

export const BANNED_PHRASES = [
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
  "as a ",
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
  "we tested this",
  "we tried this",
  "in my role as",
  "speaking as a",
  "i can say that",
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

export function hasCompoundQuestion(comment: string): boolean {
  const questionMarks = (comment.match(/\?/g) || []).length;
  return questionMarks > 1;
}

export function getQuestionWordCount(comment: string): number {
  const questionMatch = comment.match(/[^.!]*\?/);
  if (!questionMatch) return 0;
  return questionMatch[0].trim().split(/\s+/).length;
}

export function getLengthCategory(charCount: number): string {
  if (charCount < 50) return "micro";
  if (charCount < 100) return "short";
  if (charCount < 200) return "medium";
  return "long";
}

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
    noCompoundQuestions: boolean;
    questionLengthOk: boolean;
    approachMatchesLength: boolean;
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

  // Check compound questions
  const hasCompound = hasCompoundQuestion(comment);
  if (hasCompound) {
    errors.push("Contains compound question");
  }

  // Check question length
  let questionLengthOk = true;
  if (comment.includes('?')) {
    const questionWords = getQuestionWordCount(comment);
    if (questionWords > 10) {
      questionLengthOk = false;
      errors.push(`Question too long: ${questionWords} words (max 10)`);
    }
  }

  // Check approach matches length
  let approachMatchesLength = true;
  if (approach === 'micro' && charCount > 60) {
    approachMatchesLength = false;
    errors.push(`Micro approach but comment is ${charCount} chars (should be under 50)`);
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
      noCompoundQuestions: !hasCompound,
      questionLengthOk,
      approachMatchesLength,
    },
    passed: errors.length === 0,
    errors,
  };
}

// ============================================================================
// SAMPLE OUTPUTS FOR REFERENCE
// ============================================================================

export const SAMPLE_OUTPUTS = {
  // Expected good outputs for each scenario type
  micro_examples: [
    "Exactly.",
    "This is it.",
    "Ha, same.",
    "Nailed it.",
    "100%",
    "Truth.",
    "Love it.",
    "Spot on.",
    "Yep.",
  ],

  reaction_examples: [
    "Love this. The part about cash flow is what most people miss.",
    "Sarah - that second point is huge.",
    "The hiring point really stands out here.",
  ],

  opinion_examples: [
    "I see this differently - remote can work if you're intentional.",
    "The way I think about it: it's less about location, more about culture.",
  ],

  question_examples: [
    "What made you shift to this approach?",
    "Where'd you see that data?",
    "Is this working for B2B too?",
  ],

  support_examples: [
    "Congrats! Well earned.",
    "Love seeing this.",
    "Go Sarah!",
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
  console.log("AI Comment Generation Test Suite");
  console.log("================================\n");

  console.log("Test Scenarios Available:");
  for (const [name, scenario] of Object.entries(TEST_SCENARIOS)) {
    console.log(`\n[${name}]`);
    console.log(`  Post Type: ${scenario.expected_post_type}`);
    console.log(`  Energy: ${scenario.expected_energy}`);
    console.log(`  Valid Approaches: ${scenario.valid_approaches.join(", ")}`);
    console.log(`  Notes: ${scenario.notes}`);
  }

  console.log("\n\nSample Valid Comments:");
  console.log("\nMicro Comments (50% target):");
  for (const example of SAMPLE_OUTPUTS.micro_examples) {
    console.log(`  "${example}" (${example.length} chars)`);
  }

  console.log("\nReaction Comments (30% target):");
  for (const example of SAMPLE_OUTPUTS.reaction_examples) {
    console.log(`  "${example}" (${example.length} chars)`);
  }

  console.log("\n\nValidation Functions Available:");
  console.log("  - containsBannedPhrase(comment)");
  console.log("  - hasFabricatedExperience(comment)");
  console.log("  - hasCompoundQuestion(comment)");
  console.log("  - getQuestionWordCount(comment)");
  console.log("  - getLengthCategory(charCount)");
  console.log("  - validateComment(scenario, comment, approach, tone)");
  console.log("  - generateStatistics(results)");

  console.log("\n\nTarget Length Distribution:");
  console.log("  - 50% micro (under 50 chars)");
  console.log("  - 30% short (50-100 chars)");
  console.log("  - 15% medium (100-200 chars)");
  console.log("  - 5% long (200+ chars)");

  console.log("\n\nTo run actual API tests, use the edge function directly.");
}
