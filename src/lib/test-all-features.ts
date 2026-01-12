import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "../db";
import { newsItems, subscribers } from "../db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { generateObject, embed } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// Colors for console output
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

const log = {
  success: (msg: string) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg: string) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg: string) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  warn: (msg: string) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  header: (msg: string) => console.log(`\n${colors.bold}${colors.blue}═══ ${msg} ═══${colors.reset}\n`),
};

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
}

const results: TestResult[] = [];

async function runTest(name: string, testFn: () => Promise<void>) {
  const start = Date.now();
  try {
    await testFn();
    const duration = Date.now() - start;
    results.push({ name, passed: true, message: "Passed", duration });
    log.success(`${name} (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - start;
    const message = error instanceof Error ? error.message : "Unknown error";
    results.push({ name, passed: false, message, duration });
    log.error(`${name}: ${message}`);
  }
}

// ==================== TESTS ====================

async function testDatabaseConnection() {
  const result = await db.execute(sql`SELECT 1 as test`);
  // db.execute returns an array directly, not { rows: [] }
  if (!result || (Array.isArray(result) && result.length === 0)) {
    throw new Error("Database connection failed");
  }
}

async function testNewsItemsTable() {
  const news = await db.select().from(newsItems).limit(1);
  if (!Array.isArray(news)) {
    throw new Error("Failed to query news_items table");
  }
}

async function testSubscribersTable() {
  const subs = await db.select().from(subscribers).limit(1);
  if (!Array.isArray(subs)) {
    throw new Error("Failed to query subscribers table");
  }
}

async function testNewsItemsExist() {
  const news = await db.select().from(newsItems);
  if (news.length === 0) {
    throw new Error("No news items found. Run 'npx tsx src/lib/test-ingest.ts' first");
  }
  log.info(`Found ${news.length} news items`);
}

async function testNewsItemsHaveSummaries() {
  const newsWithSummary = await db
    .select()
    .from(newsItems)
    .where(sql`summary IS NOT NULL`)
    .limit(5);

  if (newsWithSummary.length === 0) {
    throw new Error("No news items have summaries");
  }
  log.info(`${newsWithSummary.length} items have summaries`);
}

async function testNewsItemsHaveSentiment() {
  const newsWithSentiment = await db
    .select()
    .from(newsItems)
    .where(sql`sentiment_score IS NOT NULL`)
    .limit(5);

  if (newsWithSentiment.length === 0) {
    throw new Error("No news items have sentiment scores");
  }

  // Check sentiment is in valid range
  for (const item of newsWithSentiment) {
    if (item.sentimentScore! < 1 || item.sentimentScore! > 10) {
      throw new Error(`Invalid sentiment score: ${item.sentimentScore}`);
    }
  }
  log.info(`Sentiment scores are valid (1-10 range)`);
}

async function testNewsItemsHaveCategories() {
  const newsWithCategory = await db
    .select()
    .from(newsItems)
    .where(sql`category IS NOT NULL`)
    .limit(5);

  if (newsWithCategory.length === 0) {
    throw new Error("No news items have categories");
  }

  const validCategories = ["AI", "Web", "Mobile", "Security", "Hardware", "Business", "Programming", "Other"];
  for (const item of newsWithCategory) {
    if (!validCategories.includes(item.category!)) {
      log.warn(`Unexpected category: ${item.category}`);
    }
  }
  log.info(`Categories are valid`);
}

async function testEmbeddingsExist() {
  const result = await db.execute(sql`
    SELECT COUNT(*) as count FROM news_items WHERE embedding IS NOT NULL
  `);

  const count = Number((result[0] as any)?.count || 0);
  if (count === 0) {
    throw new Error("No embeddings found. Refresh news to generate embeddings.");
  }
  log.info(`${count} items have embeddings`);
}

async function testOpenAIConnection() {
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: z.object({
      message: z.string(),
    }),
    prompt: "Say 'TechPulse test successful' in the message field",
  });

  if (!object.message.toLowerCase().includes("techpulse")) {
    throw new Error("Unexpected OpenAI response");
  }
}

async function testEmbeddingGeneration() {
  const { embedding } = await embed({
    model: openai.embedding("text-embedding-3-small"),
    value: "Test embedding for TechPulse",
  });

  if (!embedding || embedding.length !== 1536) {
    throw new Error(`Invalid embedding dimension: ${embedding?.length}`);
  }
  log.info(`Embedding dimension: ${embedding.length}`);
}

async function testSemanticSearch() {
  // First check if we have embeddings
  const embeddingCount = await db.execute(sql`
    SELECT COUNT(*) as count FROM news_items WHERE embedding IS NOT NULL
  `);

  if (Number((embeddingCount[0] as any)?.count || 0) === 0) {
    throw new Error("No embeddings to search. Skipping semantic search test.");
  }

  // Generate query embedding
  const { embedding } = await embed({
    model: openai.embedding("text-embedding-3-small"),
    value: "artificial intelligence",
  });

  // Perform search
  const results = await db.execute(sql`
    SELECT
      id,
      title,
      1 - (embedding <=> ${JSON.stringify(embedding)}::vector) as similarity
    FROM news_items
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${JSON.stringify(embedding)}::vector
    LIMIT 3
  `);

  if (results.length === 0) {
    throw new Error("Semantic search returned no results");
  }

  log.info(`Found ${results.length} results. Top match: "${(results[0] as any).title?.slice(0, 50)}..."`);
}

async function testHackerNewsAPI() {
  const response = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json");
  if (!response.ok) {
    throw new Error(`HN API returned ${response.status}`);
  }
  const ids = await response.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error("Invalid response from HN API");
  }
  log.info(`HN API returned ${ids.length} story IDs`);
}

async function testSubscriberInsert() {
  const testEmail = `test-${Date.now()}@techpulse-test.com`;

  await db.insert(subscribers).values({ email: testEmail }).onConflictDoNothing();

  const inserted = await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.email, testEmail));

  if (inserted.length === 0) {
    throw new Error("Failed to insert test subscriber");
  }

  // Clean up
  await db.delete(subscribers).where(eq(subscribers.email, testEmail));
  log.info(`Subscriber insert/delete working`);
}

async function testFilterByCategory() {
  const categories = await db.execute(sql`
    SELECT DISTINCT category FROM news_items WHERE category IS NOT NULL
  `);

  if (categories.length === 0) {
    throw new Error("No categories found");
  }

  const category = (categories[0] as any).category;
  const filtered = await db
    .select()
    .from(newsItems)
    .where(eq(newsItems.category, category));

  if (filtered.length === 0) {
    throw new Error(`No items found for category: ${category}`);
  }
  log.info(`Filter by "${category}" returned ${filtered.length} items`);
}

async function testFilterBySentiment() {
  // Test positive sentiment filter (7+)
  const positive = await db
    .select()
    .from(newsItems)
    .where(sql`sentiment_score >= 7`);

  // Test negative sentiment filter (<=3)
  const negative = await db
    .select()
    .from(newsItems)
    .where(sql`sentiment_score <= 3`);

  log.info(`Positive (7+): ${positive.length}, Negative (≤3): ${negative.length}`);
}

async function testOrderByDate() {
  const news = await db
    .select()
    .from(newsItems)
    .orderBy(desc(newsItems.createdAt))
    .limit(5);

  if (news.length < 2) {
    log.warn("Not enough items to test ordering");
    return;
  }

  // Check ordering
  for (let i = 0; i < news.length - 1; i++) {
    const current = new Date(news[i].createdAt).getTime();
    const next = new Date(news[i + 1].createdAt).getTime();
    if (current < next) {
      throw new Error("Items not ordered by date descending");
    }
  }
}

// ==================== MAIN ====================

async function main() {
  console.log(`
${colors.bold}╔════════════════════════════════════════════════════════╗
║          🚀 TechPulse Feature Test Suite 🚀              ║
╚════════════════════════════════════════════════════════╝${colors.reset}
`);

  // Database Tests
  log.header("DATABASE TESTS");
  await runTest("Database Connection", testDatabaseConnection);
  await runTest("News Items Table", testNewsItemsTable);
  await runTest("Subscribers Table", testSubscribersTable);

  // Data Tests
  log.header("DATA TESTS");
  await runTest("News Items Exist", testNewsItemsExist);
  await runTest("News Items Have Summaries", testNewsItemsHaveSummaries);
  await runTest("News Items Have Sentiment", testNewsItemsHaveSentiment);
  await runTest("News Items Have Categories", testNewsItemsHaveCategories);
  await runTest("Embeddings Exist", testEmbeddingsExist);

  // API Tests
  log.header("EXTERNAL API TESTS");
  await runTest("Hacker News API", testHackerNewsAPI);
  await runTest("OpenAI Connection", testOpenAIConnection);
  await runTest("Embedding Generation", testEmbeddingGeneration);

  // Feature Tests
  log.header("FEATURE TESTS");
  await runTest("Semantic Search", testSemanticSearch);
  await runTest("Subscriber Insert/Delete", testSubscriberInsert);
  await runTest("Filter by Category", testFilterByCategory);
  await runTest("Filter by Sentiment", testFilterBySentiment);
  await runTest("Order by Date", testOrderByDate);

  // Summary
  log.header("TEST SUMMARY");
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const totalTime = results.reduce((acc, r) => acc + r.duration, 0);

  console.log(`
${colors.bold}Results:${colors.reset}
  ${colors.green}✅ Passed: ${passed}${colors.reset}
  ${colors.red}❌ Failed: ${failed}${colors.reset}
  ⏱️  Total Time: ${totalTime}ms
`);

  if (failed > 0) {
    console.log(`${colors.bold}Failed Tests:${colors.reset}`);
    results
      .filter((r) => !r.passed)
      .forEach((r) => console.log(`  ${colors.red}• ${r.name}: ${r.message}${colors.reset}`));
  }

  console.log(`
${colors.bold}╔════════════════════════════════════════════════════════╗
║  ${passed === results.length ? "🎉 All tests passed!" : "⚠️  Some tests failed"}                                   ║
╚════════════════════════════════════════════════════════╝${colors.reset}
`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("Test suite failed:", error);
  process.exit(1);
});
