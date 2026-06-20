import OpenAI from "openai";
import type { LLMProvider, LLMStreamEvent, LLMMessage, ModelInfo } from "./types";

export class OpenAIProvider implements LLMProvider {
  readonly providerId = "openai";
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async *streamChat(params: {
    model: string;
    messages: LLMMessage[];
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
  }): AsyncIterable<LLMStreamEvent> {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    if (params.systemPrompt) {
      messages.push({ role: "system", content: params.systemPrompt });
    }

    for (const msg of params.messages) {
      messages.push({
        role: msg.role as "system" | "user" | "assistant",
        content: msg.content,
      });
    }

    const stream = await this.client.chat.completions.create({
      model: params.model,
      messages,
      max_tokens: params.maxTokens ?? 4096,
      temperature: params.temperature,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        yield { type: "text_delta", text: delta };
      }
    }

    yield { type: "done" };
  }

  static listModels(): ModelInfo[] {
    return [
      {
        id: "gpt-5.5",
        name: "GPT-5.5",
        providerId: "openai",
        contextWindow: 256000,
      },
      {
        id: "o3",
        name: "o3",
        providerId: "openai",
        contextWindow: 200000,
      },
      {
        id: "o3-mini",
        name: "o3 Mini",
        providerId: "openai",
        contextWindow: 200000,
      },
      {
        id: "o4-mini",
        name: "o4 Mini",
        providerId: "openai",
        contextWindow: 200000,
      },
      {
        id: "gpt-4o",
        name: "GPT-4o",
        providerId: "openai",
        contextWindow: 128000,
      },
      {
        id: "gpt-4o-mini",
        name: "GPT-4o Mini",
        providerId: "openai",
        contextWindow: 128000,
      },
    ];
  }
}
