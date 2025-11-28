import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);
    
    // Retry on 503 Service Unavailable
    if (response.status === 503 && attempt < maxRetries) {
      const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
      console.log(`AI gateway unavailable (503), retry ${attempt}/${maxRetries - 1} in ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
      continue;
    }
    
    return response;
  }
  
  throw new Error('Max retries exceeded');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Analyzing post content...');

    const systemPrompt = `You are an expert content analyzer for LinkedIn posts about Amazon selling and Account Health.

Analyze the provided LinkedIn post and return structured metadata in JSON format.

Categories to choose from:
- Amazon Suspensions & Appeals
- Business Philosophy & Mindset
- Competitor Attacks & Black Hat
- Amazon Policies & Rules
- Seller Strategies & Tips
- Personal Stories & Anecdotes
- Customer Service & Returns
- Product Selection & Sourcing
- Amazon Business Model & Data
- Platform Features & Changes

Your response MUST be valid JSON with this exact structure:
{
  "title": "Concise descriptive title (5-10 words)",
  "primary_category": "One of the categories listed above",
  "subcategory": "Specific topic within the category",
  "tags": ["3-5 relevant searchable tags"],
  "target_audience": "Who this post is for (e.g., New Sellers, Suspended Sellers, etc.)",
  "summary": "One sentence summary of the main message"
}`;

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
          { role: 'user', content: `Analyze this LinkedIn post:\n\n${content}` }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (response.status === 503) {
        return new Response(
          JSON.stringify({ error: 'AI service temporarily unavailable. Please try again in a moment.' }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    console.log('AI Response:', aiResponse);

    // Parse JSON from AI response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from AI response');
    }

    const metadata = JSON.parse(jsonMatch[0]);

    // Format the content for LinkedIn
    const formattedContent = formatForLinkedIn(content);

    return new Response(
      JSON.stringify({
        ...metadata,
        formatted_content: formattedContent,
        character_count: content.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in analyze-post function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function formatForLinkedIn(content: string): string {
  // Split into lines
  const lines = content.split('\n').map(line => line.trim()).filter(line => line);
  
  let formatted = '';
  let consecutiveLines = 0;
  
  for (const line of lines) {
    // If it's a bullet point
    if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
      if (consecutiveLines >= 3) {
        formatted += '\n';
        consecutiveLines = 0;
      }
      formatted += line + '\n';
      consecutiveLines = 0;
    } 
    // If it's a numbered list
    else if (/^\d+\./.test(line)) {
      if (consecutiveLines >= 3) {
        formatted += '\n';
        consecutiveLines = 0;
      }
      formatted += line + '\n';
      consecutiveLines = 0;
    }
    // Regular paragraph
    else {
      consecutiveLines++;
      formatted += line + '\n';
      
      // Add spacing after 3 consecutive lines
      if (consecutiveLines >= 3) {
        formatted += '\n';
        consecutiveLines = 0;
      }
    }
  }
  
  return formatted.trim();
}
