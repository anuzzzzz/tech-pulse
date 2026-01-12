import { db } from "@/db";
import { newsItems } from "@/db/schema";
import { desc } from "drizzle-orm";
import { Header } from "@/components/Header";
import { NewsCard } from "@/components/NewsCard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const news = await db
    .select()
    .from(newsItems)
    .orderBy(desc(newsItems.createdAt));

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Stats Bar */}
        <div className="flex items-center gap-6 mb-8 text-sm font-mono-display text-zinc-500">
          <span>
            <span className="text-green-500">{news.length}</span> stories tracked
          </span>
          <span>
            Last updated: {new Date().toLocaleTimeString()}
          </span>
        </div>

        {/* News Grid */}
        {news.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">
            <p>No news yet. Click "Refresh Feed" to fetch the latest.</p>
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
      <footer className="border-t border-zinc-800 py-6 mt-12">
        <p className="text-center text-xs text-zinc-600 font-mono-display">
          TechPulse — AI-powered tech news aggregator
        </p>
      </footer>
    </div>
  );
}
