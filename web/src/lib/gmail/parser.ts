import { GmailMessage } from './service';
import { insertArticle, articleExistsByUrl } from '../db';

export interface ParsedArticle {
  title: string;
  summary: string;
  sourceUrl: string;
  newsletterDate: string;
  readingTime?: string;
  section?: string;
}

/**
 * TL;DR Newsletter Section Types
 */
const TLDR_SECTIONS = [
  'Headlines & Launches',
  'Deep Dives & Analysis',
  'Engineering & Resources',
  'Quick Links',
  'Big Tech & Startups',
  'Science & Futuristic Technology',
  'Programming, Design & Data Science',
  'Miscellaneous',
  'Opinions & Tutorials',
  'Launches & Tools',
  'Articles & Tutorials',
  'News & Trends',
];

/**
 * Parse TL;DR newsletter HTML to extract individual articles.
 */
export function parseNewsletterContent(message: GmailMessage): ParsedArticle[] {
  const htmlContent = message.htmlBody || message.textBody;

  if (!htmlContent) {
    return [];
  }

  const newsletterDate = parseEmailDate(message.date);
  return parseTLDRNewsletter(htmlContent, newsletterDate);
}

function parseEmailDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Parse TL;DR newsletter format specifically
 */
function parseTLDRNewsletter(html: string, newsletterDate: string): ParsedArticle[] {
  const articles: ParsedArticle[] = [];

  // Clean HTML but preserve structure
  let cleanHtml = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');

  // Pattern to find tracking links - capture everything between <a> and </a>
  // This handles nested tags like <span><strong>Title</strong></span>
  const tldrLinkPattern = /<a[^>]*href=["'](https?:\/\/tracking\.tldrnewsletter\.com[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  const linkMatches: Array<{
    url: string;
    rawContent: string;
    position: number;
    endPosition: number;
  }> = [];

  let match;
  while ((match = tldrLinkPattern.exec(cleanHtml)) !== null) {
    const url = match[1];
    const rawContent = match[2];

    // Extract text from nested tags
    const textContent = stripHtml(rawContent).trim();

    // Skip navigation/utility links
    if (isValidArticleTitle(textContent)) {
      linkMatches.push({
        url,
        rawContent: textContent,
        position: match.index,
        endPosition: match.index + match[0].length,
      });
    }
  }

  console.log(`Found ${linkMatches.length} potential article links`);

  // For each valid link, extract title, reading time, and description
  for (let i = 0; i < linkMatches.length; i++) {
    const current = linkMatches[i];
    const nextPosition = linkMatches[i + 1]?.position || cleanHtml.length;

    // Parse title and reading time from link text
    // Format: "Article Title (X minute read)"
    const titleMatch = current.rawContent.match(/^(.+?)\s*\((\d+)\s*min(?:ute)?\s*read\)\s*$/i);

    let title: string;
    let readingTime: string | undefined;

    if (titleMatch) {
      title = titleMatch[1].trim();
      readingTime = `${titleMatch[2]} min read`;
    } else {
      title = current.rawContent;
      readingTime = undefined;
    }

    // Get HTML between this link and next link for description
    const afterLinkHtml = cleanHtml.substring(current.endPosition, nextPosition);

    // Extract description - look for text after <br> tags
    const description = extractDescription(afterLinkHtml);

    // Find section
    const section = findSection(cleanHtml, current.position);

    // Only add if we have a meaningful title
    if (title.length > 10 && description.length > 20) {
      articles.push({
        title,
        summary: description,
        sourceUrl: current.url,
        newsletterDate,
        readingTime,
        section,
      });
    }
  }

  console.log(`Parsed ${articles.length} articles`);

  // Deduplicate by URL
  const seen = new Set<string>();
  return articles.filter(article => {
    const normalizedUrl = normalizeTrackingUrl(article.sourceUrl);
    if (seen.has(normalizedUrl)) {
      return false;
    }
    seen.add(normalizedUrl);
    return true;
  });
}

/**
 * Strip HTML tags and decode entities
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalize tracking URLs to prevent duplicates
 */
function normalizeTrackingUrl(url: string): string {
  const encodedMatch = url.match(/https?%3A%2F%2F[^/]+/i);
  if (encodedMatch) {
    return decodeURIComponent(encodedMatch[0]).toLowerCase();
  }
  return url.toLowerCase();
}

/**
 * Find the section header for an article position
 */
function findSection(html: string, position: number): string | undefined {
  const beforeHtml = html.substring(0, position);

  // Look for section headers - they appear in <h1> or <strong> tags
  for (const section of TLDR_SECTIONS) {
    const pattern = new RegExp(escapeRegex(section), 'gi');
    if (pattern.test(beforeHtml)) {
      // Find the last occurrence
      const lastIndex = beforeHtml.toLowerCase().lastIndexOf(section.toLowerCase());
      if (lastIndex !== -1) {
        return section;
      }
    }
  }

  return undefined;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extract description text from HTML after a link
 */
function extractDescription(html: string): string {
  // The description is typically in a <span> after some <br> tags
  // Pattern: <br><br><span...>Description text</span>

  // First, try to find span with the description
  const spanMatch = html.match(/<span[^>]*style="[^"]*font-family[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
  if (spanMatch) {
    const text = stripHtml(spanMatch[1]);
    if (text.length > 20) {
      return truncateText(text, 500);
    }
  }

  // Fallback: just strip all HTML and take the first chunk of text
  let text = stripHtml(html);

  // Remove common patterns
  text = text
    .replace(/\[sponsor\]/gi, '')
    .replace(/sponsor/gi, '')
    .replace(/^\s*[,.\-–—]+\s*/, '')
    .trim();

  return truncateText(text, 500);
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;

  const truncated = text.substring(0, maxLength);
  const lastPeriod = truncated.lastIndexOf('.');
  if (lastPeriod > maxLength * 0.6) {
    return truncated.substring(0, lastPeriod + 1);
  }
  return truncated.trim() + '...';
}

function isValidArticleTitle(title: string): boolean {
  if (title.length < 10 || title.length > 300) {
    return false;
  }

  const invalidPatterns = [
    /^sign up$/i,
    /^advertise$/i,
    /^view online$/i,
    /^read more$/i,
    /^click here$/i,
    /^subscribe$/i,
    /^unsubscribe$/i,
    /^view in browser$/i,
    /^sponsor$/i,
    /^advertisement$/i,
    /^ad$/i,
    /^\d+$/,
    /^tldr$/i,
    /^share$/i,
    /^forward$/i,
    /^manage preferences$/i,
    /^privacy policy$/i,
    /^terms/i,
    /^together with/i,
    /\(sponsor\)/i,           // Filter out "(Sponsor)" in title
    /^apply to/i,             // "Apply to claim..."
    /^claim your/i,           // "Claim your free..."
    /early-stage startup/i,   // Sponsor content
    /free year/i,             // Sponsor content
    /free for/i,              // Sponsor content
  ];

  return !invalidPatterns.some(pattern => pattern.test(title.trim()));
}

/**
 * Process multiple newsletter messages and save unique articles to database
 */
export async function processNewsletters(messages: GmailMessage[]): Promise<{
  processed: number;
  saved: number;
  skipped: number;
}> {
  let processed = 0;
  let saved = 0;
  let skipped = 0;

  for (const message of messages) {
    const articles = parseNewsletterContent(message);
    processed += articles.length;

    for (const article of articles) {
      if (articleExistsByUrl(article.sourceUrl)) {
        skipped++;
        continue;
      }

      insertArticle({
        title: article.title,
        summary: article.summary,
        source_url: article.sourceUrl,
        reading_time: article.readingTime || null,
        newsletter_date: article.newsletterDate,
      });
      saved++;
    }
  }

  return { processed, saved, skipped };
}
