# TechPulse

AI-powered tech news aggregator that summarizes the hottest stories from Hacker News.

## Features

- **AI Summarization** - GPT-4o-mini generates concise 2-sentence summaries
- **Sentiment Analysis** - Each article scored 1-10 with visual indicators
- **Smart Categorization** - Auto-categorized (AI, Security, Web, etc.)
- **Chat with Articles** - Ask questions about any article
- **Semantic Search** - Find articles by meaning, not just keywords
- **Filters** - Filter by category and sentiment
- **Pagination** - 10 articles per page with navigation
- **Email Digest** - Subscribe for daily updates
- **Auto Updates** - Hourly cron job fetches new stories

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | Supabase (PostgreSQL + pgvector) |
| ORM | Drizzle |
| AI | OpenAI GPT-4o-mini via Vercel AI SDK |
| Deployment | Vercel |

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Vercel Cron   │────▶│   Hacker News   │────▶│     OpenAI      │
│   (Hourly)      │     │      API        │     │   GPT-4o-mini   │
└────────┬────────┘     └─────────────────┘     └────────┬────────┘
         │                                               │
         │              ┌─────────────────┐              │
         └─────────────▶│    Supabase     │◀─────────────┘
                        │   (PostgreSQL)  │
                        │   + pgvector    │
                        └────────┬────────┘
                                 │
                        ┌────────▼────────┐
                        │   Next.js UI    │
                        │  (Server Comp)  │
                        └─────────────────┘
```

## Setup

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/techpulse.git
cd techpulse
npm install
```

### 2. Environment Variables

Create `.env.local`:

```env
DATABASE_URL="your-supabase-pooler-connection-string"
OPENAI_API_KEY="sk-your-openai-key"
CRON_SECRET="your-random-secret"
```

### 3. Database Setup

```bash
npx drizzle-kit push
```

### 4. Enable pgvector (in Supabase SQL Editor)

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 5. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 6. Test All Features

```bash
npx tsx src/lib/test-all-features.ts
```

## AI Tools Used

- **Claude (Anthropic)** - Architecture design, code generation, debugging
- **GPT-4o-mini (OpenAI)** - News summarization, sentiment analysis, chat

## Tradeoffs

| Decision | Reasoning |
|----------|-----------|
| GPT-4o-mini vs GPT-4o | Speed + cost; summaries are still high quality |
| Server Actions vs API routes | Simpler architecture, fewer files |
| Supabase vs raw Postgres | Faster setup, built-in pooling + pgvector |
| Proactive vs Reactive fetching | Better UX - no loading spinners |

## License

MIT
