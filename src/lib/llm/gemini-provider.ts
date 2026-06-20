import { GoogleGenerativeAI } from "@google/generative-ai";
import type { LLMProvider, LLMStreamEvent, LLMMessage, ModelInfo } from "./types";

export class GeminiProvider implements LLMProvider {
  readonly providerId = "gemini";
  private client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async *streamChat(params: {
    model: string;
    messages: LLMMessage[];
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
  }): AsyncIterable<LLMStreamEvent> {
    const model = this.client.getGenerativeModel({
      model: params.model,
      systemInstruction: params.systemPrompt || undefined,
      generationConfig: {
        maxOutputTokens: params.maxTokens ?? 4096,
        temperature: params.temperature,
      },
    });

    const history = params.messages
      .filter((m) => m.role !== "system")
      .slice(0, -1)
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const lastMessage =
      params.messages.filter((m) => m.role !== "system").at(-1)?.content ?? "";

    const chat = model.startChat({ history });
    const result = await chat.sendMessageStream(lastMessage);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        yield { type: "text_delta", text };
      }
    }

    yield { type: "done" };
  }

  static listModels(): ModelInfo[] {
    return [
      {
        id: "gemini-2.5-pro",
        name: "Gemini 2.5 Pro",
        providerId: "gemini",
        contextWindow: 1048576,
      },
      {
        id: "gemini-2.5-flash",
        name: "Gemini 2.5 Flash",
        providerId: "gemini",
        contextWindow: 1048576,
      },
      {
        id: "gemini-2.5-flash-lite",
        name: "Gemini 2.5 Flash-Lite",
        providerId: "gemini",
        contextWindow: 1048576,
      },
    ];
  }
}
