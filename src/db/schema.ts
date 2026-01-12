import { pgTable, serial, text, integer, timestamp, boolean, vector } from "drizzle-orm/pg-core";

export const newsItems = pgTable("news_items", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  url: text("url").notNull().unique(),
  summary: text("summary"),
  sentimentScore: integer("sentiment_score"),
  category: text("category"),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  embedding: vector("embedding", { dimensions: 1536 }),
});

export const subscribers = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type NewsItem = typeof newsItems.$inferSelect;
export type NewNewsItem = typeof newsItems.$inferInsert;
export type Subscriber = typeof subscribers.$inferSelect;
