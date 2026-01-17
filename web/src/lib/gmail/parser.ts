import { GmailMessage } from './service';
import { insertArticle, articleExistsByUrl } from '../db';
import { parserRegistry, ArticleCandidate, normalizeUrl, deduplicateCandidatesByUrl, ParserLogContext } from '../parsers';

/**
 * Legacy interface for backward compatibility.
 * New code should use ArticleCandidate from parsers module.
 */
export interface ParsedArticle {
  title: string;
  summary: string;
  sourceUrl: string;
  newsletterDate: string;
  readingTime?: string;
  section?: string;
  /** For inline content (e.g., The Batch) */
  content?: string;
  /** Source newsletter name */
  sourceName?: string;
}

/**
 * Structured log entry for observability.
 */
interface IngestionLogEntry {
  message_id: string;
  from: string;
  subject: string;
  newsletter_source: string | null;
  parser_name: string | null;
  candidates_extracted_count: number;
  candidates_emitted_count: number;
  errors: string[];
  timestamp: string;
}

/**
 * Log a structured entry for email processing.
 */
function logIngestionEntry(entry: IngestionLogEntry): void {
  const level = entry.errors.length > 0 ? 'ERROR' :
                entry.candidates_extracted_count === 0 && entry.newsletter_source ? 'WARN' : 'INFO';

  console.log(`[Ingestion] [${level}] ${JSON.stringify(entry)}`);
}

/**
 * Parse newsletter content using the appropriate parser from the registry.
 * Falls back gracefully if no parser is found for the sender.
 */
export function parseNewsletterContent(message: GmailMessage): ParsedArticle[] {
  // Find the appropriate parser
  const matchResult = parserRegistry.findParser(message.from);

  if (!matchResult.matched || !matchResult.parser) {
    console.log(`[Parser] No parser found for sender: ${message.from}`);
    return [];
  }

  console.log(`[Parser] Using ${matchResult.parser.displayName} parser (match: ${matchResult.matchType})`);

  // Parse the message
  const parsed = matchResult.parser.parse(message);

  console.log(`[Parser] ${matchResult.parser.source}: extracted ${parsed.candidates.length} candidates`);

  // Convert ArticleCandidate to ParsedArticle for backward compatibility
  return parsed.candidates.map(candidate => convertToLegacyFormat(candidate, parsed.published_at));
}

/**
 * Convert ArticleCandidate to legacy ParsedArticle format.
 */
function convertToLegacyFormat(candidate: ArticleCandidate, publishedAt: string): ParsedArticle {
  return {
    title: candidate.title,
    summary: candidate.summary,
    sourceUrl: candidate.url || '',
    newsletterDate: publishedAt,
    readingTime: candidate.reading_time,
    section: candidate.section,
    content: candidate.content,
    sourceName: candidate.source_name,
  };
}

/**
 * Process multiple newsletter messages and save unique articles to database.
 * Applies URL canonicalization and deduplication before saving.
 * Includes structured logging for observability (US-027).
 */
export async function processNewsletters(messages: GmailMessage[]): Promise<{
  processed: number;
  saved: number;
  skipped: number;
  deduped: number;
  errors: number;
}> {
  // Collect all candidates from all messages
  const allCandidates: ArticleCandidate[] = [];
  let errorCount = 0;

  for (const message of messages) {
    const logEntry: IngestionLogEntry = {
      message_id: message.id,
      from: message.from,
      subject: message.subject,
      newsletter_source: null,
      parser_name: null,
      candidates_extracted_count: 0,
      candidates_emitted_count: 0,
      errors: [],
      timestamp: new Date().toISOString(),
    };

    try {
      const matchResult = parserRegistry.findParser(message.from);

      if (!matchResult.matched || !matchResult.parser) {
        logEntry.errors.push(`No parser found for sender`);
        logIngestionEntry(logEntry);
        continue;
      }

      logEntry.newsletter_source = matchResult.source || null;
      logEntry.parser_name = matchResult.parser.displayName;

      // Parse the message (isolated error handling)
      let parsed;
      try {
        parsed = matchResult.parser.parse(message);
      } catch (parseError) {
        const errorMsg = parseError instanceof Error ? parseError.message : 'Unknown parse error';
        logEntry.errors.push(`Parse error: ${errorMsg}`);
        logIngestionEntry(logEntry);
        errorCount++;
        continue; // Continue to next message
      }

      logEntry.candidates_extracted_count = parsed.candidates.length;

      // Add published_at to candidates for later use
      for (const candidate of parsed.candidates) {
        allCandidates.push({
          ...candidate,
          newsletter_date: parsed.published_at,
        });
      }

      logEntry.candidates_emitted_count = parsed.candidates.length;
      logIngestionEntry(logEntry);

    } catch (error) {
      // Catch-all for unexpected errors - don't stop processing
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logEntry.errors.push(`Unexpected error: ${errorMsg}`);
      logIngestionEntry(logEntry);
      errorCount++;
      continue;
    }
  }

  const totalExtracted = allCandidates.length;

  // Deduplicate by canonical URL before saving
  const uniqueCandidates = deduplicateCandidatesByUrl(allCandidates);
  const dedupedCount = totalExtracted - uniqueCandidates.length;

  console.log(`[Ingestion] Deduplicated ${dedupedCount} candidates (${totalExtracted} → ${uniqueCandidates.length})`);

  let saved = 0;
  let skipped = 0;

  for (const candidate of uniqueCandidates) {
    try {
      // Use canonical URL for duplicate checking
      const canonicalUrl = candidate.url ? normalizeUrl(candidate.url) : '';
      const originalUrl = candidate.url || '';

      // Check both original and canonical URL
      if (originalUrl && articleExistsByUrl(originalUrl)) {
        skipped++;
        continue;
      }
      if (canonicalUrl && canonicalUrl !== originalUrl && articleExistsByUrl(canonicalUrl)) {
        skipped++;
        continue;
      }

      // Get the newsletter date
      const newsletterDate = candidate.newsletter_date || new Date().toISOString().split('T')[0];

      insertArticle({
        title: candidate.title,
        summary: candidate.summary,
        source_url: originalUrl || canonicalUrl,
        reading_time: candidate.reading_time || null,
        newsletter_date: newsletterDate,
        // Note: content field exists in schema for inline articles
      });
      saved++;
    } catch (saveError) {
      console.error(`[Ingestion] Failed to save article "${candidate.title}":`, saveError);
      errorCount++;
    }
  }

  console.log(`[Ingestion] Summary: ${saved} saved, ${skipped} skipped, ${dedupedCount} deduped, ${errorCount} errors`);

  return {
    processed: totalExtracted,
    saved,
    skipped,
    deduped: dedupedCount,
    errors: errorCount,
  };
}
