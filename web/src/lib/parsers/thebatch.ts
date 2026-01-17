import { GmailMessage } from '../gmail/service';
import { NewsletterParser, ParsedNewsletter, ArticleCandidate } from './types';

/**
 * Parser for The Batch (DeepLearning.AI) newsletters.
 * Extracts inline article content directly from the email body.
 * These newsletters contain full article summaries within the email itself.
 */
export class TheBatchParser implements NewsletterParser {
  readonly source = 'thebatch';
  readonly displayName = 'The Batch';

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

    const candidates = this.extractInlineArticles(htmlContent);

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

  private extractInlineArticles(html: string): ArticleCandidate[] {
    const candidates: ArticleCandidate[] = [];

    // Clean HTML but preserve structure
    let cleanHtml = html
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '');

    // The Batch typically has articles in distinct sections
    // Look for patterns: headers followed by content
    const sections = this.extractArticleSections(cleanHtml);

    for (const section of sections) {
      if (section.title && section.content && section.content.length > 50) {
        // Try to find any relevant link in this section
        const url = this.extractSectionUrl(section.html);

        candidates.push({
          title: section.title,
          url: url, // May be null for inline-only content
          summary: this.truncateContent(section.content, 300),
          content: section.content,
          source_name: this.displayName,
          extraction_method: 'email_inline',
        });
      }
    }

    console.log(`[TheBatchParser] Extracted ${candidates.length} inline articles`);

    return candidates;
  }

  private extractArticleSections(html: string): Array<{
    title: string;
    content: string;
    html: string;
  }> {
    const sections: Array<{ title: string; content: string; html: string }> = [];

    // Try multiple strategies to find article sections

    // Strategy 1: Look for table cells with headers (common in email newsletters)
    const tablePattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const tableCells: string[] = [];
    let match;

    while ((match = tablePattern.exec(html)) !== null) {
      tableCells.push(match[1]);
    }

    // Strategy 2: Look for divs with substantial content
    const divPattern = /<div[^>]*>([\s\S]*?)<\/div>/gi;
    const divContents: string[] = [];

    while ((match = divPattern.exec(html)) !== null) {
      const content = match[1];
      if (content.length > 200 && !/<div/.test(content)) {
        divContents.push(content);
      }
    }

    // Combine and process all content blocks
    const allBlocks = [...tableCells, ...divContents];

    for (const block of allBlocks) {
      const section = this.parseContentBlock(block);
      if (section && section.content.length > 100) {
        // Check if this title/content is already captured
        const isDuplicate = sections.some(
          s => s.title === section.title || s.content === section.content
        );
        if (!isDuplicate) {
          sections.push(section);
        }
      }
    }

    // If no sections found, try to parse the entire body as one article
    if (sections.length === 0) {
      const fallbackSection = this.parseFallbackContent(html);
      if (fallbackSection) {
        sections.push(fallbackSection);
      }
    }

    return sections;
  }

  private parseContentBlock(html: string): { title: string; content: string; html: string } | null {
    // Look for a header followed by content
    const headerPattern = /<(h[1-4]|strong|b)[^>]*>([\s\S]*?)<\/\1>/i;
    const headerMatch = html.match(headerPattern);

    if (!headerMatch) {
      return null;
    }

    const title = this.stripHtml(headerMatch[2]).trim();

    // Skip if title looks like boilerplate
    if (this.isBoilerplate(title)) {
      return null;
    }

    // Get content after the header
    const headerEndIndex = html.indexOf(headerMatch[0]) + headerMatch[0].length;
    const contentHtml = html.substring(headerEndIndex);
    const content = this.htmlToMarkdown(contentHtml);

    // Skip if content is too short or looks like boilerplate
    if (content.length < 100 || this.isBoilerplate(content)) {
      return null;
    }

    return {
      title,
      content,
      html: contentHtml,
    };
  }

  private parseFallbackContent(html: string): { title: string; content: string; html: string } | null {
    // Try to extract the main content area
    const bodyText = this.htmlToMarkdown(html);

    // Skip if mostly boilerplate
    if (bodyText.length < 200) {
      return null;
    }

    // Try to find a title from the first header
    const firstHeader = html.match(/<(h[1-4])[^>]*>([\s\S]*?)<\/\1>/i);
    const title = firstHeader ? this.stripHtml(firstHeader[2]).trim() : 'The Batch Newsletter';

    return {
      title,
      content: bodyText,
      html,
    };
  }

  private extractSectionUrl(html: string): string | null {
    // Find the first non-boilerplate link in the section
    const linkPattern = /<a[^>]*href=["']([^"']+)["'][^>]*>/gi;
    let match;

    while ((match = linkPattern.exec(html)) !== null) {
      const url = match[1];

      // Skip boilerplate links
      if (this.isBoilerplateUrl(url)) {
        continue;
      }

      // Return first valid article link
      if (url.startsWith('http')) {
        return url;
      }
    }

    return null;
  }

  private isBoilerplate(text: string): boolean {
    const boilerplatePatterns = [
      /unsubscribe/i,
      /manage.*preferences/i,
      /view.*in.*browser/i,
      /privacy.*policy/i,
      /terms.*of.*service/i,
      /all.*rights.*reserved/i,
      /copyright/i,
      /follow.*us/i,
      /connect.*with.*us/i,
      /subscribe/i,
      /sign.*up/i,
      /deeplearning\.ai.*logo/i,
      /forward.*to.*friend/i,
      /share.*this/i,
      /sponsored/i,
      /advertisement/i,
    ];

    return boilerplatePatterns.some(pattern => pattern.test(text));
  }

  private isBoilerplateUrl(url: string): boolean {
    const boilerplatePatterns = [
      /unsubscribe/i,
      /manage.*subscription/i,
      /preferences/i,
      /twitter\.com/i,
      /x\.com/i,
      /facebook\.com/i,
      /linkedin\.com/i,
      /instagram\.com/i,
      /youtube\.com/i,
      /mailto:/i,
      /tel:/i,
      /#$/,
    ];

    return boilerplatePatterns.some(pattern => pattern.test(url));
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

  private htmlToMarkdown(html: string): string {
    let text = html;

    // Convert lists to markdown bullets
    text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '• $1\n');
    text = text.replace(/<ul[^>]*>|<\/ul>/gi, '\n');
    text = text.replace(/<ol[^>]*>|<\/ol>/gi, '\n');

    // Convert paragraphs to newlines
    text = text.replace(/<p[^>]*>/gi, '\n');
    text = text.replace(/<\/p>/gi, '\n');
    text = text.replace(/<br\s*\/?>/gi, '\n');

    // Strip remaining HTML
    text = this.stripHtml(text);

    // Clean up whitespace
    text = text
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^\s+|\s+$/g, '')
      .trim();

    return text;
  }

  private truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) {
      return content;
    }

    const truncated = content.substring(0, maxLength);
    const lastSentence = truncated.lastIndexOf('.');

    if (lastSentence > maxLength * 0.6) {
      return truncated.substring(0, lastSentence + 1);
    }

    return truncated.trim() + '...';
  }
}

// Create and export singleton instance
export const theBatchParser = new TheBatchParser();
