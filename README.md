# Newsletter Aggregator

A local-first web app that aggregates TL;DR newsletter content into structured, summarized views with GPT-powered insights. Uses SQLite for local storage and OpenAI API for AI features.

## Features

- **Gmail Integration**: Connects to your Gmail to fetch TL;DR newsletters automatically
- **Smart Parsing**: Extracts individual articles from TL;DR emails with titles, reading times, and descriptions
- **Web Scraping**: Fetches full article content from source URLs
- **AI Summarization**: Generates consolidated summaries using GPT
- **Theme Detection**: Identifies common themes and trends across articles
- **Semantic Deduplication**: Removes similar/duplicate articles using embeddings
- **Chat Interface**: Ask questions about your articles with anti-hallucination safeguards
- **Feedback System**: Mark articles as relevant/irrelevant to improve future aggregations

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BROWSER (localhost:3000)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────┐ │
│   │   Summary    │    │   Articles   │    │     Chat     │    │ Settings │ │
│   │    Page      │    │    Page      │    │    Page      │    │   Page   │ │
│   └──────┬───────┘    └──────┬───────┘    └──────┬───────┘    └────┬─────┘ │
│          │                   │                   │                  │       │
└──────────┼───────────────────┼───────────────────┼──────────────────┼───────┘
           │                   │                   │                  │
           ▼                   ▼                   ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           NEXT.JS API ROUTES                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐ │
│   │  /api/aggregation│  │   /api/chat     │  │      /api/auth              │ │
│   │  - /weekly       │  │                 │  │      - /login               │ │
│   │  - /custom       │  │   Q&A with      │  │      - /callback            │ │
│   │  - /latest       │  │   articles      │  │      - /status              │ │
│   └────────┬─────────┘  └────────┬────────┘  └─────────────┬───────────────┘ │
│            │                     │                         │                 │
└────────────┼─────────────────────┼─────────────────────────┼─────────────────┘
             │                     │                         │
             ▼                     ▼                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CORE SERVICES                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                      AGGREGATION PIPELINE                              │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │ │
│  │  │  Fetch   │→ │  Parse   │→ │  Scrape  │→ │  Dedup   │→ │Summarize │ │ │
│  │  │  Emails  │  │ Articles │  │ Content  │  │ Articles │  │ & Themes │ │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │   Gmail Service │  │   Web Scraper   │  │        AI Services          │  │
│  │                 │  │                 │  │  - Summarization            │  │
│  │  - OAuth 2.0    │  │  - URL resolver │  │  - Deduplication            │  │
│  │  - Fetch emails │  │  - Content      │  │  - Theme detection          │  │
│  │  - TL;DR parser │  │    extraction   │  │  - Chat Q&A                 │  │
│  └────────┬────────┘  └────────┬────────┘  └─────────────┬───────────────┘  │
│           │                    │                         │                   │
└───────────┼────────────────────┼─────────────────────────┼───────────────────┘
            │                    │                         │
            ▼                    ▼                         ▼
┌─────────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐
│                     │  │                 │  │                             │
│    Gmail API        │  │  Article URLs   │  │       OpenAI API            │
│    (Google)         │  │  (Web)          │  │                             │
│                     │  │                 │  │  - GPT (completions)        │
└─────────────────────┘  └─────────────────┘  │  - Embeddings               │
                                              │                             │
                                              └─────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           LOCAL STORAGE                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌───────────────────────────────────┐    ┌─────────────────────────────┐  │
│   │         SQLite Database           │    │    Encrypted Token Store    │  │
│   │                                   │    │                             │  │
│   │  - articles                       │    │    OAuth tokens encrypted   │  │
│   │  - topics                         │    │    with AES-256             │  │
│   │  - aggregations                   │    │                             │  │
│   │  - user_feedback                  │    └─────────────────────────────┘  │
│   │  - topic_preferences              │                                     │
│   │                                   │                                     │
│   └───────────────────────────────────┘                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Tech Stack

- **Frontend**: Next.js 16, React, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: SQLite (better-sqlite3)
- **AI**: OpenAI GPT API
- **Auth**: Google OAuth 2.0 for Gmail access

## Setup

### Prerequisites

- Node.js 18+
- OpenAI API key
- Google Cloud project with Gmail API enabled

### 1. Clone and Install

```bash
git clone https://github.com/francochiaro94-art/news-aggregator.git
cd news-aggregator/web
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the `web` directory:

```
OPENAI_API_KEY=your_openai_api_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback
```

### 3. Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the **Gmail API**
4. Go to **APIs & Services > Credentials**
5. Create **OAuth 2.0 Client ID** (Web application)
6. Add `http://localhost:3000` to **Authorized JavaScript origins**
7. Add `http://localhost:3000/api/auth/callback` to **Authorized redirect URIs**
8. Go to **OAuth consent screen** and add your email as a test user

### 4. Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Connect Gmail**: Go to Settings and connect your Gmail account
2. **Generate Aggregation**: Click "Generate Weekly Aggregation" on the home page
3. **View Articles**: Browse individual articles on the Articles page
4. **Chat**: Ask questions about your articles on the Chat page
5. **Give Feedback**: Use thumbs up/down on articles to improve recommendations

## Project Structure

```
web/
├── src/
│   ├── app/                    # Next.js pages and API routes
│   │   ├── api/
│   │   │   ├── aggregation/    # Aggregation endpoints
│   │   │   ├── auth/           # Google OAuth endpoints
│   │   │   ├── chat/           # Chat Q&A endpoint
│   │   │   └── feedback/       # Article feedback endpoint
│   │   ├── articles/           # Articles list page
│   │   ├── chat/               # Chat interface page
│   │   └── settings/           # Settings page
│   ├── components/             # React components
│   └── lib/
│       ├── ai/                 # OpenAI integration
│       │   ├── client.ts       # API client with rate limiting
│       │   ├── dedup.ts        # Semantic deduplication
│       │   ├── summarize.ts    # Article summarization
│       │   └── themes.ts       # Theme detection
│       ├── aggregation/        # Aggregation pipeline
│       ├── db/                 # SQLite database
│       ├── gmail/              # Gmail API integration
│       │   ├── auth.ts         # OAuth with encrypted tokens
│       │   ├── parser.ts       # TL;DR email parser
│       │   └── service.ts      # Email fetching
│       └── scraper/            # Web scraper for articles
└── data/                       # SQLite database files (gitignored)
```

## License

MIT
