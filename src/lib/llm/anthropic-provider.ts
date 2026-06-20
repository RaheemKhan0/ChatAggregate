import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider, LLMStreamEvent, LLMMessage, ModelInfo } from "./types";

export class AnthropicProvider implements LLMProvider {
  readonly providerId = "anthropic";
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async *streamChat(params: {
    model: string;
    messages: LLMMessage[];
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
  }): AsyncIterable<LLMStreamEvent> {
    const systemMessages = params.messages.filter((m) => m.role === "system");
    const nonSystemMessages = params.messages.filter((m) => m.role !== "system");

    const systemText =
      params.systemPrompt ||
      systemMessages.map((m) => m.content).join("\n") ||
      undefined;

    const stream = this.client.messages.stream({
      model: params.model,
      max_tokens: params.maxTokens ?? 4096,
      temperature: params.temperature,
      system: systemText,
      messages: nonSystemMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield { type: "text_delta", text: event.delta.text };
      }
    }

    yield { type: "done" };
  }

  static listModels(): ModelInfo[] {
    return [
      {
        id: "claude-sonnet-4-20250514",
        name: "Claude Sonnet 4",
        providerId: "anthropic",
        contextWindow: 200000,
      },
      {
        id: "claude-haiku-4-20250414",
        name: "Claude Haiku 4",
        providerId: "anthropic",
        contextWindow: 200000,
      },
      {
        id: "claude-opus-4-20250918",
        name: "Claude Opus 4",
        providerId: "anthropic",
        contextWindow: 200000,
      },
    ];
  }
}
