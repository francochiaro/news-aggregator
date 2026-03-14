import { Article } from '../db';

export interface DedupResult {
  uniqueArticles: Article[];
  duplicateGroups: Article[][];
  totalArticles: number;
  removedCount: number;
}

/**
 * Quick de-duplication using exact URL matching (no API calls)
 */
export function quickDeduplicateByUrl(articles: Article[]): Article[] {
  const seen = new Set<string>();
  const unique: Article[] = [];

  for (const article of articles) {
    // Normalize URL for comparison
    const normalizedUrl = article.source_url
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/+$/, '')
      .replace(/\?.*$/, '');

    if (!seen.has(normalizedUrl)) {
      seen.add(normalizedUrl);
      unique.push(article);
    }
  }

  return unique;
}
