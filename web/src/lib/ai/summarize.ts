import { createChatCompletion, chunkText, estimateTokens } from './client';
import { Article } from '../db';

const MAX_INPUT_TOKENS = 8000; // Leave room for prompt and response

export interface SummarizationResult {
  summary: string;
  keyPoints: string[];
  articleCount: number;
}

/**
 * Generate a consolidated summary from multiple articles
 */
export async function summarizeArticles(articles: Article[]): Promise<SummarizationResult> {
  if (articles.length === 0) {
    return {
      summary: 'No articles to summarize.',
      keyPoints: [],
      articleCount: 0,
    };
  }

  // Prepare article content for summarization
  const articleTexts = articles.map((a, i) =>
    `[Article ${i + 1}] ${a.title}\n${a.summary}`
  );

  const combinedText = articleTexts.join('\n\n---\n\n');

  // Check if we need to chunk the content
  const tokens = estimateTokens(combinedText);

  let finalSummary: string;
  let keyPoints: string[];

  if (tokens > MAX_INPUT_TOKENS) {
    // Process in chunks and combine
    const chunks = chunkText(combinedText, MAX_INPUT_TOKENS);
    const chunkSummaries: string[] = [];

    for (const chunk of chunks) {
      const chunkSummary = await summarizeChunk(chunk);
      chunkSummaries.push(chunkSummary);
    }

    // Combine chunk summaries into final summary
    const result = await combineSummaries(chunkSummaries, articles.length);
    finalSummary = result.summary;
    keyPoints = result.keyPoints;
  } else {
    // Process all at once
    const result = await generateSummary(combinedText, articles.length);
    finalSummary = result.summary;
    keyPoints = result.keyPoints;
  }

  return {
    summary: finalSummary,
    keyPoints,
    articleCount: articles.length,
  };
}

async function summarizeChunk(text: string): Promise<string> {
  const prompt = `You are summarizing a batch of tech/business news articles.
Create a concise summary of the key information from these articles.
Focus on the most important facts and developments.
Use only the information provided - do not add external knowledge.
Write in plain prose - do NOT use markdown formatting (no **, no ##).

Articles:
${text}

Provide a clear, informative summary in plain text:`;

  const response = await createChatCompletion([
    { role: 'system', content: 'You are a helpful assistant that summarizes news articles accurately and concisely.' },
    { role: 'user', content: prompt },
  ], {
    maxTokens: 800,
    temperature: 0.5,
  });

  return response;
}

async function generateSummary(text: string, articleCount: number): Promise<{ summary: string; keyPoints: string[] }> {
  const prompt = `You are summarizing ${articleCount} tech/business news articles from TL;DR newsletters.
Create a comprehensive summary that captures the most important information.

IMPORTANT RULES:
- Only use information from the provided articles
- Do not add external knowledge or speculation
- Write in plain prose - do NOT use markdown formatting (no **, no ##, no bullet points in the summary)
- The summary should be readable narrative text, not formatted

Articles:
${text}

Provide your response in this format:

SUMMARY:
[A 2-3 paragraph summary in plain prose - no markdown, no bold, no headers]

KEY POINTS:
- [Key point 1]
- [Key point 2]
- [Key point 3]
- [Add more if needed, up to 7 points]`;

  const response = await createChatCompletion([
    { role: 'system', content: 'You are a helpful assistant that summarizes news articles accurately and concisely. You only report on information explicitly stated in the provided content.' },
    { role: 'user', content: prompt },
  ], {
    maxTokens: 1500,
    temperature: 0.5,
  });

  return parseSummaryResponse(response);
}

async function combineSummaries(summaries: string[], totalArticles: number): Promise<{ summary: string; keyPoints: string[] }> {
  const combinedSummaries = summaries.join('\n\n---\n\n');

  const prompt = `You have multiple partial summaries from ${totalArticles} tech/business news articles.
Combine these into one coherent, comprehensive summary.

IMPORTANT: Write in plain prose - do NOT use markdown formatting (no **, no ##, no bullet points in the summary).

Partial summaries:
${combinedSummaries}

Provide your response in this format:

SUMMARY:
[A 2-3 paragraph unified summary in plain prose - no markdown, no bold, no headers]

KEY POINTS:
- [Key point 1]
- [Key point 2]
- [Key point 3]
- [Add more if needed, up to 7 points]`;

  const response = await createChatCompletion([
    { role: 'system', content: 'You are a helpful assistant that combines and synthesizes information accurately. You only report on information from the provided summaries.' },
    { role: 'user', content: prompt },
  ], {
    maxTokens: 1500,
    temperature: 0.5,
  });

  return parseSummaryResponse(response);
}

function parseSummaryResponse(response: string): { summary: string; keyPoints: string[] } {
  const summaryMatch = response.match(/SUMMARY:\s*([\s\S]*?)(?=KEY POINTS:|$)/i);
  const keyPointsMatch = response.match(/KEY POINTS:\s*([\s\S]*?)$/i);

  let summary = summaryMatch?.[1]?.trim() || response;

  // Clean up any stray markdown formatting that might have snuck through
  summary = cleanMarkdownFromSummary(summary);

  const keyPointsText = keyPointsMatch?.[1]?.trim() || '';
  const keyPoints = keyPointsText
    .split(/\n/)
    .map(line => line.replace(/^[-•*]\s*/, '').trim())
    .filter(line => line.length > 0);

  return { summary, keyPoints };
}

/**
 * Remove markdown formatting from summary text
 */
function cleanMarkdownFromSummary(text: string): string {
  return text
    // Remove bold markers (** or __)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    // Remove italic markers (* or _) - be careful not to remove list items
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '$1')
    // Remove headers
    .replace(/^#{1,6}\s+/gm, '')
    // Clean up any double spaces
    .replace(/  +/g, ' ')
    .trim();
}
