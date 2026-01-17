import { GmailMessage } from '../gmail/service';
import { NewsletterParser, ParsedNewsletter, ArticleCandidate } from './types';

/**
 * URLs to exclude from Not Boring newsletters (navigation, social, etc.)
 */
const EXCLUDED_URL_PATTERNS = [
  /unsubscribe/i,
  /manage.*subscription/i,
  /manage.*preferences/i,
  /email.*preferences/i,
  /view.*in.*browser/i,
  /view.*online/i,
  /substack\.com\/account/i,
  /substack\.com\/signup/i,
  /substack\.com\/subscribe/i,
  /substack\.com\/app-install/i,
  /twitter\.com/i,
  /x\.com/i,
  /linkedin\.com/i,
  /facebook\.com/i,
  /instagram\.com/i,
  /youtube\.com/i,
  /mailto:/i,
  /share.*email/i,
  /share.*twitter/i,
  /share.*facebook/i,
  /share.*linkedin/i,
  /refer.*friend/i,
  /referral/i,
  /cdn-cgi/i,
  /email\.mg\./i,
  /list-manage\.com/i,
  /click\.convertkit/i,
];

/**
 * Parser for Not Boring (Substack) newsletters.
 * Extracts article links from the email body.
 */
export class NotBoringParser implements NewsletterParser {
  readonly source = 'notboring';
  readonly displayName = 'Not Boring';

  parse(message: GmailMessage): ParsedNewsletter {
    const htmlContent = message.htmlBody || message.textBody;
    const publishedAt = this.parseEmailDate(message.date);

    if (!htmlContent) {
      return {
        newsletter_source: this.source,
        email_subject: message.subject,
        published_at: publishedAt,
        candidates: [],
      };
    }

    const candidates = this.extractArticles(htmlContent, message.subject);

    return {
      newsletter_source: this.source,
      email_subject: message.subject,
      published_at: publishedAt,
      candidates,
    };
  }

  private parseEmailDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  }

  private extractArticles(html: string, emailSubject: string): ArticleCandidate[] {
    const candidates: ArticleCandidate[] = [];
    const seenUrls = new Set<string>();

    // Clean HTML
    const cleanHtml = html
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '');

    // Find all links in the email
    const linkPattern = /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match;

    while ((match = linkPattern.exec(cleanHtml)) !== null) {
      const url = match[1];
      const linkText = this.stripHtml(match[2]).trim();

      // Skip excluded URLs
      if (this.isExcludedUrl(url)) {
        continue;
      }

      // Skip empty or very short link text
      if (linkText.length < 5) {
        continue;
      }

      // Skip if we've seen this URL
      const normalizedUrl = url.toLowerCase();
      if (seenUrls.has(normalizedUrl)) {
        continue;
      }
      seenUrls.add(normalizedUrl);

      // Skip URLs that look like images or assets
      if (/\.(png|jpg|jpeg|gif|svg|webp|ico|css|js)(\?|$)/i.test(url)) {
        continue;
      }

      // Create candidate
      candidates.push({
        title: this.cleanTitle(linkText),
        url: url,
        summary: '', // Will be populated by scraper
        source_name: this.displayName,
        extraction_method: 'email_links',
      });
    }

    console.log(`[NotBoringParser] Found ${candidates.length} article links`);

    // If no external links found, create a candidate for the Substack post itself
    if (candidates.length === 0) {
      // Try to find the main Substack post URL
      const substackPostMatch = cleanHtml.match(/https:\/\/[^"'\s]+\.substack\.com\/p\/[^"'\s]+/i);
      if (substackPostMatch) {
        candidates.push({
          title: emailSubject || 'Not Boring Newsletter',
          url: substackPostMatch[0],
          summary: '',
          source_name: this.displayName,
          extraction_method: 'email_links',
        });
      }
    }

    return candidates;
  }

  private isExcludedUrl(url: string): boolean {
    return EXCLUDED_URL_PATTERNS.some(pattern => pattern.test(url));
  }

  private stripHtml(html: string): string {
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

  private cleanTitle(title: string): string {
    // Remove common prefixes/suffixes
    return title
      .replace(/^\s*[-–—•]\s*/, '')
      .replace(/\s*[-–—•]\s*$/, '')
      .replace(/^read more:?\s*/i, '')
      .replace(/^click here:?\s*/i, '')
      .replace(/\s*\(.*sponsor.*\)\s*/gi, '')
      .trim();
  }
}

// Create and export singleton instance
export const notBoringParser = new NotBoringParser();
