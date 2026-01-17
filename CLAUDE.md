# Claude Code Context

## Project Overview
Newsletter Aggregator - A local-first web app that fetches newsletters from Gmail (TL;DR, Not Boring, 6pages, The Batch), extracts individual articles using a modular parser registry, and provides AI-powered summaries and chat.

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS
- **Database**: SQLite (better-sqlite3) - stored in `web/data/`
- **AI**: OpenAI API (GPT for chat/summaries, embeddings for dedup)
- **Auth**: Google OAuth 2.0 for Gmail access

## Key Files

### Frontend (React/Next.js)
- `web/src/app/page.tsx` - Home/Summary page
- `web/src/app/articles/page.tsx` - Articles list
- `web/src/app/chat/page.tsx` - Chat interface
- `web/src/app/settings/page.tsx` - Settings/Gmail connection
- `web/src/components/` - Reusable components (Navigation, ArticleCard, DateRangePicker)

### Backend (API Routes)
- `web/src/app/api/aggregation/` - Aggregation endpoints (weekly, custom, latest)
- `web/src/app/api/chat/route.ts` - Chat Q&A endpoint
- `web/src/app/api/auth/` - Google OAuth flow
- `web/src/app/api/feedback/route.ts` - Article feedback

### Core Services
- `web/src/lib/gmail/parser.ts` - Email ingestion orchestrator with observability logging
- `web/src/lib/gmail/service.ts` - Gmail API integration (multi-sender support)
- `web/src/lib/gmail/auth.ts` - OAuth with AES-256 encrypted token storage
- `web/src/lib/ai/summarize.ts` - GPT summarization
- `web/src/lib/ai/themes.ts` - Theme detection
- `web/src/lib/ai/dedup.ts` - Semantic deduplication using embeddings
- `web/src/lib/scraper/index.ts` - Web scraper for article content
- `web/src/lib/aggregation/pipeline.ts` - Main aggregation pipeline
- `web/src/lib/db/schema.ts` - SQLite schema and migrations
- `web/src/lib/db/operations.ts` - Database CRUD operations

### Parser Registry (Newsletter-specific parsers)
- `web/src/lib/parsers/index.ts` - Parser registry with sender routing
- `web/src/lib/parsers/types.ts` - NewsletterParser interface, ArticleCandidate type
- `web/src/lib/parsers/registry.ts` - ParserRegistry class (email/domain matching)
- `web/src/lib/parsers/canonicalize.ts` - URL normalization, tracking param removal
- `web/src/lib/parsers/tldr.ts` - TL;DR parser (tracking.tldrnewsletter.com URLs)
- `web/src/lib/parsers/notboring.ts` - Not Boring/Substack parser
- `web/src/lib/parsers/sixpages.ts` - 6pages parser with section headers
- `web/src/lib/parsers/thebatch.ts` - The Batch parser (inline content, no URLs)

### Tests
- `web/src/__tests__/parsers.test.ts` - Parser unit tests (19 tests)
- `web/src/__tests__/e2e-ingestion.test.ts` - E2E mixed inbox tests (7 tests)
- `web/src/__tests__/fixtures/` - Sample HTML for each newsletter type

## Architecture Decisions
- **Local-first**: All data stored locally (SQLite + encrypted tokens). No cloud backend.
- **Modular Parser Registry**: Each newsletter has its own parser module. Adding a new newsletter requires one registry entry and one parser implementation.
- **Two extraction methods**: `email_links` (URL-based, requires scraping) and `email_inline` (content embedded in email, e.g., The Batch)
- **URL Canonicalization**: Tracking params (utm_*, mc_*, etc.) are stripped before deduplication
- **Anti-hallucination**: Chat prompts strictly instruct GPT to only use provided article content

## Code Style
- TypeScript strict mode
- Functional components with hooks
- Tailwind for styling (no CSS modules)
- API routes return JSON with error handling

## Running the App
```bash
cd web
npm run dev
```
Open http://localhost:3000

## Database Reset
To clear all data and start fresh:
```bash
rm -rf web/data
```

## Environment Variables
Required in `web/.env.local`:
- `OPENAI_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback`

## Running Tests
```bash
cd web
npm test
```

## Known Quirks
- Gmail OAuth tokens stored encrypted in `web/.gmail-tokens.enc`
- Database auto-creates on first run with migrations for schema changes
- Scraping is rate-limited (500ms between requests) to be respectful to source sites
- The Batch articles have `url: null` and use `extraction_method: 'email_inline'`

## Supported Newsletters
| Newsletter | Sender | Parser |
|------------|--------|--------|
| TL;DR | dan@tldrnewsletter.com | tldr.ts |
| Not Boring | notboring@substack.com | notboring.ts |
| 6pages | hello@6pages.com | sixpages.ts |
| The Batch | thebatch@deeplearning.ai | thebatch.ts |

## PRD
See `prd.json` for all user stories and their completion status.
See `multi_newsletter_prd.json` for the multi-newsletter ingestion stories (US-021 to US-029).
