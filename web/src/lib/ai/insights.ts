import { createChatCompletion } from './client';
import { Article } from '../db';

// Structured insights interface
export interface StructuredInsights {
  executiveOverview: {
    mainInsight: string;
    keyThemes: { name: string; articleCount: number }[];
    emergingTrends: string[];
  };
  marketMoves: {
    summary: string;
    bullets: string[];
  };
  techShifts: {
    summary: string;
    bullets: string[];
  };
  industryImpact: {
    summary: string;
    industries: { name: string; bullets: string[] }[];
  };
  policySignals: {
    summary: string;
    bullets: string[];
  };
}

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
  "mainInsight": "A single compelling sentence capturing the week's most significant development or pattern",
  "keyThemes": [
    {"name": "Theme Name", "articleCount": 3},
    {"name": "Theme Name", "articleCount": 2}
  ],
  "emergingTrends": [
    "Short trend description 1",
    "Short trend description 2",
    "Short trend description 3"
  ]
}

Requirements:
- mainInsight: 1-2 sentences max, synthesize the most important takeaway
- keyThemes: 3-5 themes, each with a count of related articles
- emergingTrends: 3-5 short bullet points about emerging patterns
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
    "Concise point about a partnership or deal",
    "Concise point about an acquisition or investment",
    "Concise point about a leadership change"
  ]
}

Requirements:
- summary: 1-2 sentences for the collapsed card state
- bullets: 3-8 concise, independently readable points
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
    "Concise point about an architectural change",
    "Concise point about agent systems",
    "Concise point about infrastructure evolution"
  ]
}

Requirements:
- summary: 1-2 sentences for the collapsed card state
- bullets: 3-8 concise, technically focused points
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
      "bullets": ["Specific use case or deployment", "Another application"]
    },
    {
      "name": "Finance",
      "bullets": ["Specific use case"]
    }
  ]
}

Requirements:
- summary: 1-2 sentences for the collapsed card state
- Only include industries with actual content from the articles
- Each industry should have 1-3 concise bullets
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
    "Concise point about a regulatory development",
    "Concise point about economic impact",
    "Concise point about policy signal"
  ]
}

Requirements:
- summary: 1-2 sentences for the collapsed card state
- bullets: 3-8 concise points about macro-level forces
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

/**
 * Check if insights string is structured JSON or legacy plain text
 */
export function isStructuredInsights(insights: string | null): boolean {
  if (!insights) return false;
  try {
    const parsed = JSON.parse(insights);
    return parsed && typeof parsed === 'object' && 'executiveOverview' in parsed;
  } catch {
    return false;
  }
}

/**
 * Parse insights - returns structured data or null for legacy format
 */
export function parseStructuredInsights(insights: string | null): StructuredInsights | null {
  if (!insights) return null;
  try {
    const parsed = JSON.parse(insights);
    if (parsed && typeof parsed === 'object' && 'executiveOverview' in parsed) {
      return parsed as StructuredInsights;
    }
    return null;
  } catch {
    return null;
  }
}
