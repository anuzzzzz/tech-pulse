# TechPulse 🚀

AI-powered tech news aggregator that summarizes the hottest stories from Hacker News.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Database:** Supabase (PostgreSQL)
- **ORM:** Drizzle
- **AI:** OpenAI GPT-4o-mini via Vercel AI SDK

## Architecture

**Proactive fetching pattern:**
1. News is fetched from Hacker News API
2. Each story is summarized by GPT-4o-mini
3. Sentiment score (1-10) and category are extracted
4. Data is stored in Supabase for instant retrieval
5. UI reads from database — no user-facing latency

## Setup

### 1. Clone & Install
```bash
git clone
cd techpulse
npm install
```

### 2. Environment Variables

Create `.env.local`:
```env
DATABASE_URL="your-supabase-connection-string"
OPENAI_API_KEY="sk-your-openai-key"
```

### 3. Database Setup
```bash
npx drizzle-kit push
```

### 4. Run Locally
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## AI Tools Used

- **Claude (Anthropic):** Architecture design, code generation, debugging
- **GPT-4o-mini (OpenAI):** Real-time news summarization and sentiment analysis

## What I'd Build Next

- Cron job for automatic hourly updates (Vercel Cron)
- "Chat with this article" feature using Vercel AI SDK
- Filtering by category and sentiment
- Email digest subscription
- Semantic search using pgvector

## Tradeoffs

- **GPT-4o-mini vs GPT-4o:** Chose mini for speed and cost; summaries are still high quality
- **Server Actions vs API routes:** Simpler architecture, fewer files to manage
- **Supabase vs raw Postgres:** Faster setup, built-in connection pooling

## License

MIT
