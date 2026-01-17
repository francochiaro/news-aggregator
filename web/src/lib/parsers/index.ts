/**
 * Newsletter Parser Framework
 *
 * This module provides a modular parser registry for handling multiple newsletter formats.
 * Each newsletter source (TL;DR, Not Boring, 6pages, The Batch, etc.) has its own parser
 * that implements the NewsletterParser interface.
 *
 * To add a new newsletter:
 * 1. Create a new parser file (e.g., newparser.ts) implementing NewsletterParser
 * 2. Register it in this file using parserRegistry.register()
 */

import { parserRegistry } from './registry';
import { tldrParser } from './tldr';
import { notBoringParser } from './notboring';
import { sixPagesParser } from './sixpages';
import { theBatchParser } from './thebatch';

// Register TL;DR parser
parserRegistry.register({
  parser: tldrParser,
  emailPatterns: [
    'dan@tldrnewsletter.com',
    'tldr@tldrnewsletter.com',
    'hello@tldr.tech',
    'dan@tldr.tech',
  ],
  domainPatterns: [
    'tldrnewsletter.com',
    'tldr.tech',
  ],
});

// Register Not Boring (Substack) parser
parserRegistry.register({
  parser: notBoringParser,
  emailPatterns: [
    'notboring@substack.com',
  ],
  // Note: Don't use substack.com as domain pattern - too broad
});

// Register 6pages parser
parserRegistry.register({
  parser: sixPagesParser,
  emailPatterns: [
    'hello@6pages.com',
  ],
  domainPatterns: [
    '6pages.com',
  ],
});

// Register The Batch (DeepLearning.AI) parser
parserRegistry.register({
  parser: theBatchParser,
  emailPatterns: [
    'thebatch@deeplearning.ai',
  ],
  domainPatterns: [
    'deeplearning.ai',
  ],
});

// Export the registry and types
export { parserRegistry } from './registry';
export * from './types';

// Export individual parsers
export { tldrParser } from './tldr';
export { notBoringParser } from './notboring';
export { sixPagesParser } from './sixpages';
export { theBatchParser } from './thebatch';

// Export URL canonicalization utilities
export {
  canonicalizeUrl,
  resolveTrackingUrl,
  normalizeUrl,
  deduplicateCandidatesByUrl,
  addCanonicalUrls,
} from './canonicalize';
