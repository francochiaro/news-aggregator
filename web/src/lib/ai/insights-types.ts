// Structured insights interface and pure parsing utilities.
// Safe to import from client components (no Node.js dependencies).

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
