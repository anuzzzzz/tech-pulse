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
  searchParams: Promise<{ category?: string; sentiment?: string; page?: string }>;
}

const ITEMS_PER_PAGE = 10;

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const { category, sentiment, page } = params;
  const currentPage = Math.max(1, parseInt(page || "1", 10));

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

  // Get total count for pagination
  const allNews = await db
    .select()
    .from(newsItems)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(newsItems.createdAt));

  const totalItems = allNews.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;
  const news = allNews.slice(offset, offset + ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Stats Bar */}
        <div className="flex items-center gap-6 mb-6 text-sm font-mono-display text-zinc-500">
          <span>
            <span className="text-green-500">{totalItems}</span> stories
            {(category || sentiment) && " (filtered)"}
          </span>
          <span>
            Page {currentPage} of {totalPages}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <a
              href={`?${new URLSearchParams({
                ...(category && { category }),
                ...(sentiment && { sentiment }),
                page: String(Math.max(1, currentPage - 1)),
              }).toString()}`}
              className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                currentPage === 1
                  ? "border-zinc-800 text-zinc-600 pointer-events-none"
                  : "border-zinc-700 text-zinc-300 hover:border-green-500/50 hover:bg-green-500/10"
              }`}
            >
              Previous
            </a>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <a
                  key={pageNum}
                  href={`?${new URLSearchParams({
                    ...(category && { category }),
                    ...(sentiment && { sentiment }),
                    page: String(pageNum),
                  }).toString()}`}
                  className={`w-10 h-10 flex items-center justify-center text-sm rounded-lg border transition-colors ${
                    pageNum === currentPage
                      ? "border-green-500 bg-green-500/20 text-green-500"
                      : "border-zinc-700 text-zinc-400 hover:border-green-500/50 hover:bg-green-500/10"
                  }`}
                >
                  {pageNum}
                </a>
              ))}
            </div>

            <a
              href={`?${new URLSearchParams({
                ...(category && { category }),
                ...(sentiment && { sentiment }),
                page: String(Math.min(totalPages, currentPage + 1)),
              }).toString()}`}
              className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                currentPage === totalPages
                  ? "border-zinc-800 text-zinc-600 pointer-events-none"
                  : "border-zinc-700 text-zinc-300 hover:border-green-500/50 hover:bg-green-500/10"
              }`}
            >
              Next
            </a>
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
