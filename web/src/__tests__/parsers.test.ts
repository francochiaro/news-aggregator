import * as fs from 'fs';
import * as path from 'path';
import { GmailMessage } from '../lib/gmail/service';
import { parserRegistry } from '../lib/parsers';
import { tldrParser } from '../lib/parsers/tldr';
import { notBoringParser } from '../lib/parsers/notboring';
import { sixPagesParser } from '../lib/parsers/sixpages';
import { theBatchParser } from '../lib/parsers/thebatch';

// Helper to load fixture files
function loadFixture(filename: string): string {
  const fixturePath = path.join(__dirname, 'fixtures', filename);
  return fs.readFileSync(fixturePath, 'utf-8');
}

// Helper to create a mock GmailMessage
function createMockMessage(from: string, subject: string, htmlBody: string): GmailMessage {
  return {
    id: 'test-message-id',
    threadId: 'test-thread-id',
    subject,
    from,
    date: new Date().toISOString(),
    htmlBody,
    textBody: '',
  };
}

describe('Parser Registry', () => {
  describe('Sender Recognition', () => {
    it('should route TL;DR emails to TL;DR parser', () => {
      const result = parserRegistry.findParser('dan@tldrnewsletter.com');
      expect(result.matched).toBe(true);
      expect(result.source).toBe('tldr');
      expect(result.parser).toBe(tldrParser);
    });

    it('should route Not Boring emails to Not Boring parser', () => {
      const result = parserRegistry.findParser('notboring@substack.com');
      expect(result.matched).toBe(true);
      expect(result.source).toBe('notboring');
      expect(result.parser).toBe(notBoringParser);
    });

    it('should route 6pages emails to 6pages parser', () => {
      const result = parserRegistry.findParser('hello@6pages.com');
      expect(result.matched).toBe(true);
      expect(result.source).toBe('6pages');
      expect(result.parser).toBe(sixPagesParser);
    });

    it('should route The Batch emails to The Batch parser', () => {
      const result = parserRegistry.findParser('thebatch@deeplearning.ai');
      expect(result.matched).toBe(true);
      expect(result.source).toBe('thebatch');
      expect(result.parser).toBe(theBatchParser);
    });

    it('should handle display name format in From header', () => {
      const result = parserRegistry.findParser('TL;DR Newsletter <dan@tldrnewsletter.com>');
      expect(result.matched).toBe(true);
      expect(result.source).toBe('tldr');
    });

    it('should return no match for unknown senders', () => {
      const result = parserRegistry.findParser('unknown@example.com');
      expect(result.matched).toBe(false);
      expect(result.parser).toBeUndefined();
    });
  });
});

describe('TL;DR Parser', () => {
  it('should extract articles from TL;DR newsletter', () => {
    const html = loadFixture('tldr-sample.html');
    const message = createMockMessage('dan@tldrnewsletter.com', 'TLDR Tech 2024-01-15', html);

    const result = tldrParser.parse(message);

    expect(result.newsletter_source).toBe('tldr');
    expect(result.candidates.length).toBeGreaterThanOrEqual(2);

    // Check first article
    const firstArticle = result.candidates[0];
    expect(firstArticle.title).toContain('AI Startup');
    expect(firstArticle.url).toContain('tracking.tldrnewsletter.com');
    expect(firstArticle.extraction_method).toBe('email_links');
    expect(firstArticle.reading_time).toBe('5 min read');
  });

  it('should exclude footer links', () => {
    const html = loadFixture('tldr-sample.html');
    const message = createMockMessage('dan@tldrnewsletter.com', 'TLDR Tech', html);

    const result = tldrParser.parse(message);

    // No candidate should have unsubscribe or manage in the title
    for (const candidate of result.candidates) {
      expect(candidate.title.toLowerCase()).not.toContain('unsubscribe');
      expect(candidate.title.toLowerCase()).not.toContain('manage');
    }
  });
});

describe('Not Boring Parser', () => {
  it('should extract article links from Not Boring newsletter', () => {
    const html = loadFixture('notboring-sample.html');
    const message = createMockMessage('notboring@substack.com', 'Not Boring: AI Agents', html);

    const result = notBoringParser.parse(message);

    expect(result.newsletter_source).toBe('notboring');
    expect(result.candidates.length).toBeGreaterThanOrEqual(1);

    // Should have article links
    const hasArticleLinks = result.candidates.some(c =>
      c.url?.includes('wired.com') || c.url?.includes('techcrunch.com')
    );
    expect(hasArticleLinks).toBe(true);
  });

  it('should exclude social and unsubscribe links', () => {
    const html = loadFixture('notboring-sample.html');
    const message = createMockMessage('notboring@substack.com', 'Not Boring', html);

    const result = notBoringParser.parse(message);

    for (const candidate of result.candidates) {
      expect(candidate.url).not.toContain('twitter.com');
      expect(candidate.url).not.toContain('unsubscribe');
      expect(candidate.url).not.toContain('/account');
    }
  });
});

describe('6pages Parser', () => {
  it('should extract article links from 6pages newsletter', () => {
    const html = loadFixture('sixpages-sample.html');
    const message = createMockMessage('hello@6pages.com', '6pages Weekly', html);

    const result = sixPagesParser.parse(message);

    expect(result.newsletter_source).toBe('6pages');
    expect(result.candidates.length).toBeGreaterThanOrEqual(1);
  });

  it('should exclude footer links', () => {
    const html = loadFixture('sixpages-sample.html');
    const message = createMockMessage('hello@6pages.com', '6pages Weekly', html);

    const result = sixPagesParser.parse(message);

    for (const candidate of result.candidates) {
      expect(candidate.url).not.toContain('unsubscribe');
      expect(candidate.url).not.toContain('preferences');
      expect(candidate.url).not.toContain('twitter.com');
      expect(candidate.url).not.toContain('linkedin.com');
    }
  });
});

describe('The Batch Parser', () => {
  it('should extract inline articles from The Batch newsletter', () => {
    const html = loadFixture('thebatch-sample.html');
    const message = createMockMessage('thebatch@deeplearning.ai', 'The Batch: AI News', html);

    const result = theBatchParser.parse(message);

    expect(result.newsletter_source).toBe('thebatch');
    expect(result.candidates.length).toBeGreaterThanOrEqual(1);

    // The Batch uses inline extraction
    const hasInlineContent = result.candidates.some(c =>
      c.extraction_method === 'email_inline' && c.content && c.content.length > 0
    );
    expect(hasInlineContent).toBe(true);
  });

  it('should allow null URLs for inline content', () => {
    const html = loadFixture('thebatch-sample.html');
    const message = createMockMessage('thebatch@deeplearning.ai', 'The Batch', html);

    const result = theBatchParser.parse(message);

    // At least some candidates should be valid even without URLs
    const inlineCandidates = result.candidates.filter(c =>
      c.extraction_method === 'email_inline'
    );

    // Inline candidates may have null URLs, which is acceptable
    for (const candidate of inlineCandidates) {
      expect(candidate.title).toBeTruthy();
      expect(candidate.title.length).toBeGreaterThan(0);
    }
  });

  it('should exclude footer content', () => {
    const html = loadFixture('thebatch-sample.html');
    const message = createMockMessage('thebatch@deeplearning.ai', 'The Batch', html);

    const result = theBatchParser.parse(message);

    for (const candidate of result.candidates) {
      expect(candidate.title.toLowerCase()).not.toContain('unsubscribe');
      expect(candidate.title.toLowerCase()).not.toContain('copyright');
      expect(candidate.content?.toLowerCase() || '').not.toContain('all rights reserved');
    }
  });
});

describe('URL Canonicalization', () => {
  // Import the canonicalization functions
  const { canonicalizeUrl, normalizeUrl } = require('../lib/parsers/canonicalize');

  it('should remove tracking parameters', () => {
    const url = 'https://example.com/article?utm_source=newsletter&utm_medium=email&id=123';
    const canonical = canonicalizeUrl(url);

    expect(canonical).not.toContain('utm_source');
    expect(canonical).not.toContain('utm_medium');
    expect(canonical).toContain('id=123');
  });

  it('should normalize protocol to https', () => {
    const url = 'http://example.com/article';
    const canonical = canonicalizeUrl(url);

    expect(canonical).toMatch(/^https:/);
  });

  it('should lowercase hostname', () => {
    const url = 'https://EXAMPLE.COM/Article';
    const canonical = canonicalizeUrl(url);

    expect(canonical).toContain('example.com');
  });

  it('should handle TL;DR tracking URLs', () => {
    const trackingUrl = 'https://tracking.tldrnewsletter.com/link?url=https%3A%2F%2Fexample.com%2Farticle';
    const resolved = normalizeUrl(trackingUrl);

    // Should resolve to the actual URL
    expect(resolved).toContain('example.com/article');
  });
});
