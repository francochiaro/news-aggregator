import { createChatCompletion } from './client';
import { Article } from '../db';
import { StructuredInsights } from './insights-types';

export type { StructuredInsights } from './insights-types';
export { isStructuredInsights, parseStructuredInsights } from './insights-types';

/**
 * Generate structured insights using tailored prompts for each section
 */
export async function generateStructuredInsights(articles: Article[]): Promise<StructuredInsights> {
  if (articles.length === 0) {
    return getEmptyInsights();
  }

  // Prepare article context (used by all prompts)
  const articleContext = articles
    .map((a, i) => `[${i + 1}] "${a.title}"\n${a.summary}`)
    .join('\n\n---\n\n');

  // Run all prompts in parallel for efficiency
  const [executiveOverview, marketMoves, techShifts, industryImpact, policySignals] = await Promise.all([
    generateExecutiveOverview(articleContext, articles.length),
    generateMarketMoves(articleContext),
    generateTechShifts(articleContext),
    generateIndustryImpact(articleContext),
    generatePolicySignals(articleContext),
  ]);

  return {
    executiveOverview,
    marketMoves,
    techShifts,
    industryImpact,
    policySignals,
  };
}

/**
 * Executive Overview - Synthesis, key themes with counts, emerging trends
 */
async function generateExecutiveOverview(
  articleContext: string,
  articleCount: number
): Promise<StructuredInsights['executiveOverview']> {
  const prompt = `Analyze these ${articleCount} tech/business news articles and provide an executive overview.

ARTICLES:
${articleContext}

Respond with ONLY valid JSON in this exact format (no markdown, no code blocks):
{
  "mainInsight": "A specific, substantive sentence naming key players and what happened",
  "keyThemes": [
    {"name": "Specific Theme Name", "articleCount": 3},
    {"name": "Another Specific Theme", "articleCount": 2}
  ],
  "emergingTrends": [
    "Specific trend with concrete example",
    "Another trend naming technologies or companies"
  ]
}

CRITICAL REQUIREMENTS:
- mainInsight: 1-2 sentences that name specific companies, technologies, or events - NOT vague summaries
  * BAD: "AI continues to transform industries"
  * GOOD: "OpenAI and Google both released agent frameworks this week, signaling agents as the next platform war"
- keyThemes: 3-5 themes with specific names (not generic like "AI Advancements")
  * BAD: "Technology Innovation"
  * GOOD: "Agent Frameworks & Tooling" or "Enterprise AI Deployment"
- emergingTrends: 3-5 bullets that describe specific patterns with examples
  * BAD: "Companies are investing more in AI"
  * GOOD: "Smaller models (7B-13B params) replacing larger ones for production use - Mistral, Llama gaining enterprise traction"
- Only use information from the provided articles`;

  const response = await createChatCompletion([
    { role: 'system', content: 'You are a senior tech analyst providing executive briefings. Be concise and insightful. Return only valid JSON.' },
    { role: 'user', content: prompt },
  ], {
    maxTokens: 800,
    temperature: 0.5,
  });

  try {
    const cleaned = cleanJsonResponse(response);
    return JSON.parse(cleaned);
  } catch {
    console.error('Failed to parse executive overview:', response);
    return {
      mainInsight: 'Multiple significant developments across the tech landscape this week.',
      keyThemes: [],
      emergingTrends: [],
    };
  }
}

/**
 * Market & Competitive Moves - Partnerships, M&A, leadership changes
 */
async function generateMarketMoves(articleContext: string): Promise<StructuredInsights['marketMoves']> {
  const prompt = `Analyze these articles for market and competitive moves.

ARTICLES:
${articleContext}

Focus ONLY on:
- Major partnerships and collaborations
- Acquisitions, mergers, or large investments
- Leadership or organizational changes with strategic impact
- Competitive positioning moves

Respond with ONLY valid JSON (no markdown, no code blocks):
{
  "summary": "1-2 sentence overview of the most significant market move",
  "bullets": [
    "Specific point with company names, deal values, or concrete details",
    "Another specific point with actual names and numbers"
  ]
}

CRITICAL REQUIREMENTS:
- summary: 1-2 sentences for the collapsed card state
- bullets: 3-8 points, each MUST include specific details:
  * Name the companies, people, or products involved
  * Include numbers (dollar amounts, percentages, headcounts) when available
  * State what actually happened, not vague descriptions
- AVOID generic phrases like "major partnership", "significant investment", "strategic move"
- INSTEAD write: "Microsoft acquired Activision for $69B" or "OpenAI partnered with Reddit for training data access"
- If no relevant content found, return empty bullets array
- Only use information from the provided articles`;

  const response = await createChatCompletion([
    { role: 'system', content: 'You are a business analyst tracking market moves and competitive dynamics. Be factual and concise. Return only valid JSON.' },
    { role: 'user', content: prompt },
  ], {
    maxTokens: 600,
    temperature: 0.4,
  });

  try {
    const cleaned = cleanJsonResponse(response);
    return JSON.parse(cleaned);
  } catch {
    console.error('Failed to parse market moves:', response);
    return { summary: 'Market activity details available in the articles.', bullets: [] };
  }
}

/**
 * Technology & Architecture Shifts - Agent systems, architecture, infrastructure
 */
async function generateTechShifts(articleContext: string): Promise<StructuredInsights['techShifts']> {
  const prompt = `Analyze these articles for technology and architecture shifts.

ARTICLES:
${articleContext}

Focus ONLY on:
- Agent-based or agent-native systems and architectures
- Model or system architecture changes
- Infrastructure and compute-related evolution
- New technical approaches or paradigms
- Developer tools and platform changes

Respond with ONLY valid JSON (no markdown, no code blocks):
{
  "summary": "1-2 sentence overview of the dominant technical shift",
  "bullets": [
    "Specific technical point naming the technology, framework, or approach",
    "Another specific point with concrete technical details"
  ]
}

CRITICAL REQUIREMENTS:
- summary: 1-2 sentences for the collapsed card state
- bullets: 3-8 points, each MUST include specific details:
  * Name the actual technologies, frameworks, models, or tools
  * Describe what specifically changed or was introduced
  * Include technical specifics (model sizes, latency improvements, architecture names)
- AVOID generic phrases like "improved performance", "better scalability", "innovative approach"
- INSTEAD write: "Claude now supports 200K context window" or "Llama 3 uses grouped-query attention reducing inference costs 40%"
- Keep content distinct from market or business insights
- Only use information from the provided articles`;

  const response = await createChatCompletion([
    { role: 'system', content: 'You are a senior systems architect tracking technical evolution. Be precise and technically accurate. Return only valid JSON.' },
    { role: 'user', content: prompt },
  ], {
    maxTokens: 600,
    temperature: 0.4,
  });

  try {
    const cleaned = cleanJsonResponse(response);
    return JSON.parse(cleaned);
  } catch {
    console.error('Failed to parse tech shifts:', response);
    return { summary: 'Technical developments detailed in the articles.', bullets: [] };
  }
}

/**
 * Industry Impact & Use Cases - Sector-specific applications
 */
async function generateIndustryImpact(articleContext: string): Promise<StructuredInsights['industryImpact']> {
  const prompt = `Analyze these articles for industry-specific AI/tech applications.

ARTICLES:
${articleContext}

Focus ONLY on:
- Concrete use cases and deployments by industry
- Industry-specific adoption patterns
- Sector transformations driven by technology

Group findings by industry: Healthcare, Finance, Media/Entertainment, Enterprise/B2B, Consumer, Other

Respond with ONLY valid JSON (no markdown, no code blocks):
{
  "summary": "1-2 sentence high-level synthesis of where AI adoption is happening",
  "industries": [
    {
      "name": "Healthcare",
      "bullets": ["Specific deployment with company name and what they built"]
    },
    {
      "name": "Finance",
      "bullets": ["Specific use case with institution name and concrete application"]
    }
  ]
}

CRITICAL REQUIREMENTS:
- summary: 1-2 sentences for the collapsed card state
- Only include industries with actual content from the articles
- Each bullet MUST include specific details:
  * Name the company or organization deploying the technology
  * Describe the specific application or product
  * Include measurable outcomes if mentioned (cost savings, efficiency gains, user numbers)
- AVOID generic phrases like "AI is transforming healthcare" or "financial services are adopting AI"
- INSTEAD write: "Mayo Clinic deployed GPT-4 for radiology report drafting, reducing turnaround 60%" or "JPMorgan's IndexGPT automates thematic investment research"
- Only use information from the provided articles`;

  const response = await createChatCompletion([
    { role: 'system', content: 'You are an industry analyst tracking AI adoption across sectors. Be specific about real applications. Return only valid JSON.' },
    { role: 'user', content: prompt },
  ], {
    maxTokens: 800,
    temperature: 0.4,
  });

  try {
    const cleaned = cleanJsonResponse(response);
    return JSON.parse(cleaned);
  } catch {
    console.error('Failed to parse industry impact:', response);
    return { summary: 'Industry applications detailed in the articles.', industries: [] };
  }
}

/**
 * Economic & Policy Signals - Regulation, geopolitics, labor impacts
 */
async function generatePolicySignals(articleContext: string): Promise<StructuredInsights['policySignals']> {
  const prompt = `Analyze these articles for economic and policy signals.

ARTICLES:
${articleContext}

Focus ONLY on:
- Regulation and policy developments
- Geopolitical or supply-chain constraints
- Labor, productivity, or economic impact narratives
- Government initiatives or restrictions
- International trade or competition dynamics

Respond with ONLY valid JSON (no markdown, no code blocks):
{
  "summary": "1-2 sentence macro-level takeaway about policy or economic forces",
  "bullets": [
    "Specific policy point naming the country, agency, or legislation",
    "Another specific point with concrete regulatory or economic details"
  ]
}

CRITICAL REQUIREMENTS:
- summary: 1-2 sentences for the collapsed card state
- bullets: 3-8 points, each MUST include specific details:
  * Name the country, regulatory body, legislation, or policy
  * Describe what specifically was proposed, enacted, or changed
  * Include dates, fines, or specific requirements when available
- AVOID generic phrases like "increased regulation", "growing concerns", "policy implications"
- INSTEAD write: "EU AI Act mandates transparency requirements for foundation models by 2025" or "FTC investigating OpenAI over consumer protection concerns"
- Do not duplicate content from other insight categories
- Only use information from the provided articles`;

  const response = await createChatCompletion([
    { role: 'system', content: 'You are a policy analyst tracking regulatory and economic forces in tech. Be factual about policy implications. Return only valid JSON.' },
    { role: 'user', content: prompt },
  ], {
    maxTokens: 600,
    temperature: 0.4,
  });

  try {
    const cleaned = cleanJsonResponse(response);
    return JSON.parse(cleaned);
  } catch {
    console.error('Failed to parse policy signals:', response);
    return { summary: 'Policy and economic signals detailed in the articles.', bullets: [] };
  }
}

/**
 * Clean JSON response from potential markdown or code block wrapping
 */
function cleanJsonResponse(response: string): string {
  let cleaned = response.trim();

  // Remove markdown code blocks
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }

  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }

  return cleaned.trim();
}

/**
 * Return empty insights structure
 */
function getEmptyInsights(): StructuredInsights {
  return {
    executiveOverview: {
      mainInsight: 'No articles to analyze.',
      keyThemes: [],
      emergingTrends: [],
    },
    marketMoves: { summary: '', bullets: [] },
    techShifts: { summary: '', bullets: [] },
    industryImpact: { summary: '', industries: [] },
    policySignals: { summary: '', bullets: [] },
  };
}

