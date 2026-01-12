import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { db } from "@/db";
import { newsItems } from "@/db/schema";
import { eq } from "drizzle-orm";

const HN_TOP_STORIES_URL = "https://hacker-news.firebaseio.com/v0/topstories.json";
const HN_ITEM_URL = "https://hacker-news.firebaseio.com/v0/item";

interface HNStory {
  id: number;
  title: string;
  url?: string;
  by: string;
  score: number;
  time: number;
}

async function fetchTopStoryIds(limit: number = 5): Promise<number[]> {
  const response = await fetch(HN_TOP_STORIES_URL);
  const ids: number[] = await response.json();
  return ids.slice(0, limit);
}

async function fetchStory(id: number): Promise<HNStory | null> {
  const response = await fetch(`${HN_ITEM_URL}/${id}.json`);
  const story = await response.json();
  return story;
}

async function summarizeStory(title: string, url: string) {
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: z.object({
      summary: z.string().describe("A 2-sentence summary of the tech news for a busy CTO"),
      sentimentScore: z.number().min(1).max(10).describe("Sentiment score: 1=very negative, 5=neutral, 10=very positive"),
      category: z.enum(["AI", "Web", "Mobile", "Security", "Hardware", "Business", "Programming", "Other"]),
    }),
    prompt: `Analyze this tech news article:
Title: ${title}
URL: ${url}

Provide a concise 2-sentence summary, a sentiment score (1-10), and categorize it.`,
  });

  return object;
}

export async function ingestLatestNews() {
  console.log("🔍 Fetching top stories from Hacker News...");

  const storyIds = await fetchTopStoryIds(5);
  let newCount = 0;
  let skippedCount = 0;

  for (const id of storyIds) {
    const story = await fetchStory(id);

    if (!story || !story.url) {
      console.log(`⏭️  Skipping story ${id} (no URL)`);
      skippedCount++;
      continue;
    }

    // Check if already exists
    const existing = await db.query.newsItems.findFirst({
      where: eq(newsItems.url, story.url),
    });

    if (existing) {
      console.log(`⏭️  Already exists: ${story.title.slice(0, 50)}...`);
      skippedCount++;
      continue;
    }

    console.log(`🤖 Summarizing: ${story.title.slice(0, 50)}...`);

    try {
      const analysis = await summarizeStory(story.title, story.url);

      await db.insert(newsItems).values({
        title: story.title,
        url: story.url,
        summary: analysis.summary,
        sentimentScore: analysis.sentimentScore,
        category: analysis.category,
        publishedAt: new Date(story.time * 1000),
      });

      console.log(`✅ Added: ${story.title.slice(0, 50)}...`);
      newCount++;
    } catch (error) {
      console.error(`❌ Failed to process: ${story.title}`, error);
    }
  }

  console.log(`\n📊 Done! Added ${newCount} new items, skipped ${skippedCount}`);
  return { newCount, skippedCount };
}
