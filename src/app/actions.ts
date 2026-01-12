"use server";

import { ingestLatestNews } from "@/lib/ingest";

export async function refreshNews() {
  const result = await ingestLatestNews();
  return result;
}
