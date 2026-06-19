import type { ModelConfig } from "../../shared/types";

export interface LocalChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function streamLocalChatCompletion(args: {
  endpoint: string;
  config: ModelConfig;
  messages: LocalChatMessage[];
  onToken: (token: string) => void;
}): Promise<string> {
  const response = await fetch(`${args.endpoint}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "local-gguf",
      messages: args.messages,
      temperature: args.config.temperature,
      max_tokens: args.config.maxTokens,
      stream: true
    })
  });

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Local inference request failed with HTTP ${response.status}.`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";

    for (const event of events) {
      const lines = event
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.startsWith("data:"));

      for (const line of lines) {
        const payload = line.replace(/^data:\s*/, "");
        if (!payload || payload === "[DONE]") continue;

        try {
          const parsed = JSON.parse(payload);
          const delta =
            parsed.choices?.[0]?.delta?.content ??
            parsed.choices?.[0]?.text ??
            parsed.content ??
            "";
          if (delta) {
            fullText += delta;
            args.onToken(delta);
          }
        } catch {
          // Ignore partial server-sent-event frames; the remaining buffer is handled by the loop.
        }
      }
    }
  }

  return fullText.trim();
}
