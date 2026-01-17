import { GmailMessage } from '../gmail/service';
import { NewsletterParser, ParsedNewsletter, ArticleCandidate } from './types';

/**
 * URLs to exclude from 6pages newsletters
 */
const EXCLUDED_URL_PATTERNS = [
  /unsubscribe/i,
  /\/preferences/i,
  /manage.*subscription/i,
  /manage.*preferences/i,
  /email.*preferences/i,
  /view.*in.*browser/i,
  /view.*online/i,
  /twitter\.com/i,
  /x\.com/i,
  /linkedin\.com/i,
  /facebook\.com/i,
  /instagram\.com/i,
  /youtube\.com/i,
  /mailto:/i,
  /share.*email/i,
  /6pages\.com\/account/i,
  /6pages\.com\/signup/i,
  /6pages\.com\/login/i,
  /cdn-cgi/i,
  /list-manage\.com/i,
  /click\.convertkit/i,
];

/**
 * Parser for 6pages newsletters.
 * Extracts article links and section headers.
 */
export class SixPagesParser implements NewsletterParser {
  readonly source = '6pages';
  readonly displayName = '6pages';

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

    // Try to find section headers (h1, h2, h3, strong headings)
    const sections = this.extractSections(cleanHtml);

    // Find all links in the email
    const linkPattern = /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match;

    while ((match = linkPattern.exec(cleanHtml)) !== null) {
      const url = match[1];
      const linkText = this.stripHtml(match[2]).trim();
      const position = match.index;

      // Skip excluded URLs
      if (this.isExcludedUrl(url)) {
        continue;
      }

      // Skip empty or very short link text
      if (linkText.length < 3) {
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

      // Determine title
      let title = linkText;
      let titleInferred = false;

      // If link text is too short or generic, try to find a better title
      if (linkText.length < 10 || /^(read|more|here|link|click)$/i.test(linkText)) {
        const nearestHeading = this.findNearestHeading(cleanHtml, position, sections);
        if (nearestHeading) {
          title = nearestHeading;
          titleInferred = true;
        } else {
          // Use email subject as last resort
          title = emailSubject;
          titleInferred = true;
        }
      }

      // Create candidate
      candidates.push({
        title: this.cleanTitle(title),
        url: url,
        summary: '',
        source_name: this.displayName,
        extraction_method: 'email_links',
        title_inferred: titleInferred,
      });
    }

    console.log(`[SixPagesParser] Found ${candidates.length} article links`);

    return candidates;
  }

  private extractSections(html: string): Array<{ text: string; position: number }> {
    const sections: Array<{ text: string; position: number }> = [];

    // Match h1, h2, h3 and strong tags that look like headers
    const headerPattern = /<(h[1-3]|strong)[^>]*>([\s\S]*?)<\/\1>/gi;
    let match;

    while ((match = headerPattern.exec(html)) !== null) {
      const text = this.stripHtml(match[2]).trim();
      if (text.length > 5 && text.length < 200) {
        sections.push({
          text,
          position: match.index,
        });
      }
    }

    return sections;
  }

  private findNearestHeading(
    html: string,
    position: number,
    sections: Array<{ text: string; position: number }>
  ): string | null {
    // Find the closest preceding heading
    let nearest: { text: string; position: number } | null = null;

    for (const section of sections) {
      if (section.position < position) {
        if (!nearest || section.position > nearest.position) {
          nearest = section;
        }
      }
    }

    return nearest?.text || null;
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
    return title
      .replace(/^\s*[-–—•]\s*/, '')
      .replace(/\s*[-–—•]\s*$/, '')
      .replace(/^read more:?\s*/i, '')
      .replace(/^click here:?\s*/i, '')
      .trim();
  }
}

// Create and export singleton instance
export const sixPagesParser = new SixPagesParser();
