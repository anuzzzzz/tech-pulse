"use server";

import { ingestLatestNews } from "@/lib/ingest";
import { db } from "@/db";
import { subscribers } from "@/db/schema";
import { embed } from "ai";
import { openai } from "@ai-sdk/openai";
import { sql } from "drizzle-orm";

export async function refreshNews() {
  const result = await ingestLatestNews();
  return result;
}

export async function subscribeEmail(email: string) {
  if (!email || !email.includes("@")) {
    return { success: false, error: "Invalid email" };
  }

  try {
    await db.insert(subscribers).values({ email }).onConflictDoNothing();
    return { success: true };
  } catch (error) {
    console.error("Subscribe error:", error);
    return { success: false, error: "Failed to subscribe" };
  }
}

export async function semanticSearch(query: string) {
  if (!query.trim()) return [];

  try {
    // Generate embedding for the search query
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: query,
    });

    // Search using cosine similarity
    const results = await db.execute(sql`
      SELECT
        id,
        title,
        url,
        summary,
        sentiment_score as "sentimentScore",
        category,
        published_at as "publishedAt",
        created_at as "createdAt",
        1 - (embedding <=> ${JSON.stringify(embedding)}::vector) as similarity
      FROM news_items
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${JSON.stringify(embedding)}::vector
      LIMIT 5
    `);

    return results;
  } catch (error) {
    console.error("Semantic search error:", error);
    return [];
  }
}
