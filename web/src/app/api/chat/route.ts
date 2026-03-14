import { NextRequest, NextResponse } from 'next/server';
import { createChatCompletion, estimateTokens } from '@/lib/ai/client';
import { getLatestAggregation, getArticlesForAggregation } from '@/lib/db';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Maximum tokens for conversation history (leaving room for system prompt + articles + response)
const MAX_CONVERSATION_TOKENS = 6000;

/**
 * Truncate conversation history to fit within token limit.
 * Keeps the most recent messages, removing older ones from the beginning.
 */
function truncateConversationHistory(
  messages: ChatMessage[],
  maxTokens: number
): { messages: ChatMessage[]; truncated: boolean } {
  // Calculate total tokens
  let totalTokens = messages.reduce(
    (sum, msg) => sum + estimateTokens(msg.content),
    0
  );

  if (totalTokens <= maxTokens) {
    return { messages, truncated: false };
  }

  // Truncate from the beginning, keeping recent messages
  const truncatedMessages = [...messages];
  while (totalTokens > maxTokens && truncatedMessages.length > 1) {
    const removed = truncatedMessages.shift();
    if (removed) {
      totalTokens -= estimateTokens(removed.content);
    }
  }

  console.warn(
    `Conversation history truncated: ${messages.length} -> ${truncatedMessages.length} messages`
  );

  return { messages: truncatedMessages, truncated: true };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, messages, aggregationId } = body;

    // Support both single message (backward compat) and messages array
    let conversationHistory: ChatMessage[] = [];

    if (messages && Array.isArray(messages) && messages.length > 0) {
      // Use the full conversation history
      conversationHistory = messages;
    } else if (message) {
      // Backward compatibility: single message
      conversationHistory = [{ role: 'user', content: message }];
    } else {
      return NextResponse.json(
        { error: 'message or messages array is required' },
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

    // Truncate conversation history if too long
    const { messages: truncatedHistory, truncated } = truncateConversationHistory(
      conversationHistory,
      MAX_CONVERSATION_TOKENS
    );

    // Build messages array: system prompt + conversation history
    const chatMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt },
      ...truncatedHistory,
    ];

    const response = await createChatCompletion(chatMessages, {
      maxTokens: 1000,
      temperature: 0.3, // Lower temperature for more factual responses
    });

    return NextResponse.json({
      response,
      hasContext: true,
      articleCount: articles.length,
      conversationTruncated: truncated,
    });
  } catch (error) {
    console.error('Error in chat:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process message' },
      { status: 500 }
    );
  }
}
