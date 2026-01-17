import * as fs from 'fs';
import * as path from 'path';
import { GmailMessage } from '../lib/gmail/service';
import { parserRegistry, deduplicateCandidatesByUrl, ArticleCandidate } from '../lib/parsers';

// Helper to load fixture files
function loadFixture(filename: string): string {
  const fixturePath = path.join(__dirname, 'fixtures', filename);
  return fs.readFileSync(fixturePath, 'utf-8');
}

// Helper to create a mock GmailMessage
function createMockMessage(
  id: string,
  from: string,
  subject: string,
  htmlBody: string,
  date: string = new Date().toISOString()
): GmailMessage {
  return {
    id,
    threadId: `thread-${id}`,
    subject,
    from,
    date,
    htmlBody,
    textBody: '',
  };
}

describe('End-to-End Ingestion (US-029)', () => {
  // Simulate a mixed inbox with all newsletter types
  const mixedInbox: GmailMessage[] = [
    createMockMessage(
      'msg-tldr-1',
      'dan@tldrnewsletter.com',
      'TLDR Tech 2024-01-15',
      loadFixture('tldr-sample.html'),
      '2024-01-15T08:00:00Z'
    ),
    createMockMessage(
      'msg-notboring-1',
      'notboring@substack.com',
      'Not Boring: AI Agents',
      loadFixture('notboring-sample.html'),
      '2024-01-15T09:00:00Z'
    ),
    createMockMessage(
      'msg-6pages-1',
      'hello@6pages.com',
      '6pages Weekly Digest',
      loadFixture('sixpages-sample.html'),
      '2024-01-15T10:00:00Z'
    ),
    createMockMessage(
      'msg-thebatch-1',
      'thebatch@deeplearning.ai',
      'The Batch: AI News',
      loadFixture('thebatch-sample.html'),
      '2024-01-15T11:00:00Z'
    ),
  ];

  it('should process mixed inbox without failures', () => {
    const allCandidates: ArticleCandidate[] = [];
    const errors: string[] = [];

    for (const message of mixedInbox) {
      try {
        const matchResult = parserRegistry.findParser(message.from);

        if (!matchResult.matched || !matchResult.parser) {
          errors.push(`No parser for: ${message.from}`);
          continue;
        }

        const parsed = matchResult.parser.parse(message);

        for (const candidate of parsed.candidates) {
          allCandidates.push({
            ...candidate,
            newsletter_date: parsed.published_at,
          });
        }
      } catch (error) {
        errors.push(`Error processing ${message.id}: ${error}`);
      }
    }

    // No errors should occur
    expect(errors).toHaveLength(0);

    // Should have candidates from all sources
    expect(allCandidates.length).toBeGreaterThan(0);
  });

  it('should extract candidates from all supported newsletter types', () => {
    const candidatesBySource = new Map<string, ArticleCandidate[]>();

    for (const message of mixedInbox) {
      const matchResult = parserRegistry.findParser(message.from);
      if (!matchResult.matched || !matchResult.parser) continue;

      const parsed = matchResult.parser.parse(message);
      const source = parsed.newsletter_source;

      if (!candidatesBySource.has(source)) {
        candidatesBySource.set(source, []);
      }
      candidatesBySource.get(source)!.push(...parsed.candidates);
    }

    // Should have candidates from each source
    expect(candidatesBySource.has('tldr')).toBe(true);
    expect(candidatesBySource.has('notboring')).toBe(true);
    expect(candidatesBySource.has('6pages')).toBe(true);
    expect(candidatesBySource.has('thebatch')).toBe(true);

    // Each source should have at least one candidate
    expect(candidatesBySource.get('tldr')!.length).toBeGreaterThan(0);
    expect(candidatesBySource.get('notboring')!.length).toBeGreaterThan(0);
    expect(candidatesBySource.get('6pages')!.length).toBeGreaterThan(0);
    expect(candidatesBySource.get('thebatch')!.length).toBeGreaterThan(0);
  });

  it('should include inline items for The Batch', () => {
    const theBatchMessage = mixedInbox.find(m => m.from.includes('thebatch'));
    expect(theBatchMessage).toBeDefined();

    const matchResult = parserRegistry.findParser(theBatchMessage!.from);
    const parsed = matchResult.parser!.parse(theBatchMessage!);

    // The Batch should have inline extraction method
    const inlineCandidates = parsed.candidates.filter(
      c => c.extraction_method === 'email_inline'
    );

    expect(inlineCandidates.length).toBeGreaterThan(0);

    // Inline candidates should have content
    for (const candidate of inlineCandidates) {
      expect(candidate.content).toBeTruthy();
      expect(candidate.content!.length).toBeGreaterThan(0);
    }
  });

  it('should include scraped items (URL-based) for link-based newsletters', () => {
    const allCandidates: ArticleCandidate[] = [];

    for (const message of mixedInbox) {
      const matchResult = parserRegistry.findParser(message.from);
      if (!matchResult.matched || !matchResult.parser) continue;

      const parsed = matchResult.parser.parse(message);
      allCandidates.push(...parsed.candidates);
    }

    // Should have URL-based candidates
    const urlBasedCandidates = allCandidates.filter(
      c => c.url && c.extraction_method === 'email_links'
    );

    expect(urlBasedCandidates.length).toBeGreaterThan(0);
  });

  it('should deduplicate candidates across sources', () => {
    // Create candidates with some duplicates (same canonical URL)
    const candidatesWithDupes: ArticleCandidate[] = [
      {
        title: 'Article One',
        url: 'https://example.com/article?utm_source=tldr',
        summary: 'Summary from TL;DR',
        source_name: 'TL;DR',
        extraction_method: 'email_links',
      },
      {
        title: 'Same Article Different Source',
        url: 'https://example.com/article?utm_source=notboring',
        summary: 'Summary from Not Boring',
        source_name: 'Not Boring',
        extraction_method: 'email_links',
      },
      {
        title: 'Unique Article',
        url: 'https://different.com/unique',
        summary: 'Unique content',
        source_name: '6pages',
        extraction_method: 'email_links',
      },
      {
        title: 'Inline Article',
        url: null,
        summary: 'Inline summary',
        content: 'Full inline content',
        source_name: 'The Batch',
        extraction_method: 'email_inline',
      },
    ];

    const deduped = deduplicateCandidatesByUrl(candidatesWithDupes);

    // Should have 3 unique items (2 URL-based after dedup + 1 inline)
    expect(deduped.length).toBe(3);

    // Inline candidates should be preserved
    const inlineItems = deduped.filter(c => c.extraction_method === 'email_inline');
    expect(inlineItems.length).toBe(1);
  });

  it('should handle mixed extraction methods in output', () => {
    const allCandidates: ArticleCandidate[] = [];

    for (const message of mixedInbox) {
      const matchResult = parserRegistry.findParser(message.from);
      if (!matchResult.matched || !matchResult.parser) continue;

      const parsed = matchResult.parser.parse(message);
      allCandidates.push(...parsed.candidates);
    }

    // Should have both extraction methods
    const methods = new Set(allCandidates.map(c => c.extraction_method));
    expect(methods.has('email_links')).toBe(true);
    expect(methods.has('email_inline')).toBe(true);
  });

  it('should not throw unhandled exceptions for any email', () => {
    // Add some edge cases
    const edgeCases: GmailMessage[] = [
      ...mixedInbox,
      // Empty body
      createMockMessage('empty', 'dan@tldrnewsletter.com', 'Empty', ''),
      // Unknown sender
      createMockMessage('unknown', 'random@example.com', 'Unknown', '<p>Content</p>'),
      // Malformed HTML
      createMockMessage('malformed', 'notboring@substack.com', 'Malformed', '<div><p>Unclosed'),
    ];

    expect(() => {
      for (const message of edgeCases) {
        const matchResult = parserRegistry.findParser(message.from);
        if (matchResult.matched && matchResult.parser) {
          matchResult.parser.parse(message);
        }
      }
    }).not.toThrow();
  });
});
