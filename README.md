# TechPulse

A tech news aggregator that pulls top stories from Hacker News and uses AI to generate quick summaries.

**Live demo:** https://techpulse-kohl.vercel.app

---

## Running Locally

```bash
git clone https://github.com/anuzzzzz/tech-pulse.git
cd tech-pulse
npm install
npm run dev
```

Open http://localhost:3000

## Setup

Create a `.env.local` file:

```
DATABASE_URL=your_supabase_connection_string
OPENAI_API_KEY=your_openai_key
CRON_SECRET=any_random_string
```

You'll need:
- A Supabase project (free tier works)
- An OpenAI API key with GPT-4o-mini access

Then push the database schema:

```bash
npx drizzle-kit push
```

And enable the vector extension in Supabase SQL editor:

```sql
create extension if not exists vector;
```

---

## Approach

I wanted to build something that feels fast. Instead of calling OpenAI every time someone loads the page (slow, expensive), I fetch and summarize articles in the background. Users always see pre-processed content instantly.

The flow:
1. Cron job hits Hacker News API daily (Vercel's free tier only allows daily crons)
2. For each new story, GPT-4o-mini generates a 2-sentence summary, sentiment score (1-10), and category
3. Everything gets stored in Postgres
4. Frontend just reads from the database - no waiting

I also added semantic search using pgvector. Each article gets an embedding, so you can search by meaning ("articles about AI safety") rather than exact keywords.

## Tradeoffs

**GPT-4o-mini over GPT-4o** - The summaries are good enough for this use case, and it's way cheaper/faster. For something like legal document analysis I'd use the bigger model.

**Supabase over self-hosted Postgres** - Faster to set up, has pgvector built in, and the connection pooling just works. Downside is vendor lock-in but that's fine for a project this size.

**Server Actions over API routes** - Next.js 15 thing. Less boilerplate, type-safe by default. I only used a traditional API route for the cron endpoint since Vercel cron needs a URL to hit.

**Storing embeddings per-article** - Takes more storage but makes search instant. Alternative would be generating embeddings at query time but that adds latency.

---

## AI Tools Used

**Claude (Anthropic)** - I used Claude throughout development for architecture decisions, debugging database connection issues, and generating boilerplate code. Specifically helped me figure out the Supabase pooler connection string format and Tailwind v4 syntax changes.

**GPT-4o-mini (OpenAI)** - Powers the actual product. Each article gets sent to GPT-4o-mini with a prompt asking for a summary, sentiment score, and category. Also used for the "chat with article" feature.

**text-embedding-3-small (OpenAI)** - Generates the vector embeddings for semantic search.

---

## What I'd Build Next

If I had more time:

- **Better error handling** - Right now if OpenAI rate limits us, the cron job just fails silently. Should add retries and alerting.

- **Source diversity** - Only pulling from HN right now. Would add TechCrunch, Ars Technica, maybe Reddit. Each source would need its own parser.

- **User accounts** - Let people save articles, customize their feed, set up alerts for specific topics.

- **Email digest** - The subscribe form collects emails but doesn't send anything yet. Would set up a daily/weekly digest with Resend or similar.

- **Better mobile experience** - It works on mobile but the chat modal is clunky. Would make it a slide-up sheet instead.

---

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Drizzle ORM
- Supabase (Postgres + pgvector)
- Vercel AI SDK
- OpenAI API
