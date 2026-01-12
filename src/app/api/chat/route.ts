import { streamText, convertToModelMessages } from "ai";
import { openai } from "@ai-sdk/openai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { messages, articleContext } = await request.json();

  const systemPrompt = articleContext
    ? `You are a helpful assistant discussing this tech news article:

Title: ${articleContext.title}
Summary: ${articleContext.summary}
URL: ${articleContext.url}

Answer questions about this article. Be concise and insightful. If you don't know something specific about the article beyond what's provided, say so honestly.`
    : "You are a helpful assistant discussing tech news.";

  // Convert UI messages to model messages
  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: systemPrompt,
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse();
}
