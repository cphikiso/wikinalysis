import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

export async function POST(req: Request) {
  const { messages, system } = await req.json();

  const result = streamText({
    model: openai("o4-mini"),
    system:
      typeof system === "string" && system.length > 0
        ? system
        : "You are a helpful assistant.",
    messages,
  });

  return result.toDataStreamResponse();
}
