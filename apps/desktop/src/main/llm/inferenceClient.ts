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
  onStatus?: (status: string) => void;
  firstTokenTimeoutMs?: number;
}): Promise<string> {
  const controller = new AbortController();
  const firstTokenTimeout = windowlessSetTimeout(() => {
    controller.abort();
  }, args.firstTokenTimeoutMs ?? 120000);

  let response: Response;
  try {
    response = await fetch(`${args.endpoint}/v1/chat/completions`, {
      method: "POST",
      signal: controller.signal,
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
  } catch (error) {
    clearTimeout(firstTokenTimeout);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        "The local model did not respond within 120 seconds. Try a shorter prompt, reduce Max tokens, use a smaller GGUF model, or restart the local backend."
      );
    }
    throw error;
  }

  if (!response.ok || !response.body) {
    clearTimeout(firstTokenTimeout);
    const text = await response.text().catch(() => "");
    throw new Error(text || `Local inference request failed with HTTP ${response.status}.`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";
  let sawFirstToken = false;
  args.onStatus?.("Local model is generating. First response can take a minute on CPU.");

  try {
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
              if (!sawFirstToken) {
                sawFirstToken = true;
                clearTimeout(firstTokenTimeout);
                args.onStatus?.("");
              }
              fullText += delta;
              args.onToken(delta);
            }
          } catch {
            // Ignore partial server-sent-event frames; the remaining buffer is handled by the loop.
          }
        }
      }
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        "The local model did not produce a token within 120 seconds. Try a shorter prompt, reduce Max tokens, use the 1.5B/3B Q4_K_M model, or set fewer knowledge sources."
      );
    }
    throw error;
  } finally {
    clearTimeout(firstTokenTimeout);
  }

  return fullText.trim();
}

function windowlessSetTimeout(callback: () => void, ms: number): NodeJS.Timeout {
  return setTimeout(callback, ms);
}
