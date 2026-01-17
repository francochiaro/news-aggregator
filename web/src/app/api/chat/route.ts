import { NextRequest, NextResponse } from 'next/server';
import { createChatCompletion } from '@/lib/ai/client';
import { getLatestAggregation, getArticlesForAggregation } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, aggregationId } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'message is required' },
        { status: 400 }
      );
    }

    // Get articles for context
    let articles: ReturnType<typeof getArticlesForAggregation> = [];
    if (aggregationId) {
      articles = getArticlesForAggregation(parseInt(aggregationId));
    } else {
      const latestAggregation = getLatestAggregation();
      if (latestAggregation) {
        articles = getArticlesForAggregation(latestAggregation.id);
      }
    }

    if (articles.length === 0) {
      return NextResponse.json({
        response: "I don't have any articles to reference yet. Please generate an aggregation first to fetch articles from your newsletters.",
        hasContext: false,
      });
    }

    // Build context from articles
    const articleContext = articles
      .map((a, i) => `[${i + 1}] "${a.title}"\n${a.summary}`)
      .join('\n\n---\n\n');

    const systemPrompt = `You are a helpful assistant answering questions about a collection of tech and business news articles.

CRITICAL RULES:
1. ONLY use information from the provided articles below
2. Never make up or infer information not explicitly stated
3. When referencing information, mention which article it comes from (e.g., "According to article [3]...")
4. Be concise and direct in your answers

ARTICLES FOR REFERENCE:
${articleContext}`;

    const response = await createChatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ], {
      maxTokens: 1000,
      temperature: 0.3, // Lower temperature for more factual responses
    });

    return NextResponse.json({
      response,
      hasContext: true,
      articleCount: articles.length,
    });
  } catch (error) {
    console.error('Error in chat:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process message' },
      { status: 500 }
    );
  }
}
