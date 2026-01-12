import { db } from "@/db";
import { newsItems } from "@/db/schema";
import { desc, eq, gte, lte, and, SQL } from "drizzle-orm";
import { Header } from "@/components/Header";
import { NewsCard } from "@/components/NewsCard";
import { Filters } from "@/components/Filters";
import { Suspense } from "react";
import { SubscribeForm } from "@/components/SubscribeForm";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ category?: string; sentiment?: string }>;
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const { category, sentiment } = params;

  // Build filter conditions
  const conditions: SQL[] = [];

  if (category && category !== "All") {
    conditions.push(eq(newsItems.category, category));
  }

  if (sentiment === "positive") {
    conditions.push(gte(newsItems.sentimentScore, 7));
  } else if (sentiment === "neutral") {
    conditions.push(gte(newsItems.sentimentScore, 4));
    conditions.push(lte(newsItems.sentimentScore, 6));
  } else if (sentiment === "negative") {
    conditions.push(lte(newsItems.sentimentScore, 3));
  }

  const news = await db
    .select()
    .from(newsItems)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(newsItems.createdAt));

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Stats Bar */}
        <div className="flex items-center gap-6 mb-6 text-sm font-mono-display text-zinc-500">
          <span>
            <span className="text-green-500">{news.length}</span> stories
            {(category || sentiment) && " (filtered)"}
          </span>
          <span>
            Last updated: {new Date().toLocaleTimeString()}
          </span>
        </div>

        {/* Filters */}
        <Suspense fallback={null}>
          <Filters />
        </Suspense>

        {/* News Grid */}
        {news.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">
            <p>No stories match your filters.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {news.map((item) => (
              <NewsCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8 mt-12">
        <div className="max-w-4xl mx-auto px-4 flex flex-col items-center gap-4">
          <p className="text-sm text-zinc-400">Get the top tech news delivered daily</p>
          <SubscribeForm />
          <p className="text-xs text-zinc-600 font-mono-display mt-2">
            TechPulse — AI-powered tech news aggregator
          </p>
        </div>
      </footer>
    </div>
  );
}
