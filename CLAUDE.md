# Claude Code Context

## Project Overview
Newsletter Aggregator - A local-first web app that fetches TL;DR newsletters from Gmail, extracts individual articles, and provides AI-powered summaries and chat.

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
- `web/src/lib/gmail/parser.ts` - TL;DR email parser (extracts articles from tracking URLs)
- `web/src/lib/gmail/service.ts` - Gmail API integration
- `web/src/lib/gmail/auth.ts` - OAuth with AES-256 encrypted token storage
- `web/src/lib/ai/summarize.ts` - GPT summarization
- `web/src/lib/ai/themes.ts` - Theme detection
- `web/src/lib/ai/dedup.ts` - Semantic deduplication using embeddings
- `web/src/lib/scraper/index.ts` - Web scraper for article content
- `web/src/lib/aggregation/pipeline.ts` - Main aggregation pipeline
- `web/src/lib/db/schema.ts` - SQLite schema and migrations
- `web/src/lib/db/operations.ts` - Database CRUD operations

## Architecture Decisions
- **Local-first**: All data stored locally (SQLite + encrypted tokens). No cloud backend.
- **TL;DR specific**: Parser is specifically built for TL;DR newsletter format (tracking.tldrnewsletter.com URLs)
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

## Known Quirks
- Gmail OAuth tokens stored encrypted in `web/.gmail-tokens.enc`
- Database auto-creates on first run with migrations for schema changes
- Scraping is rate-limited (500ms between requests) to be respectful to source sites

## PRD
See `prd.json` for all user stories and their completion status.
