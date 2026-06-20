export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMStreamEvent {
  type: "text_delta" | "done" | "error";
  text?: string;
  error?: string;
}

export interface LLMProvider {
  readonly providerId: string;

  streamChat(params: {
    model: string;
    messages: LLMMessage[];
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
  }): AsyncIterable<LLMStreamEvent>;
}

export interface ModelInfo {
  id: string;
  name: string;
  providerId: string;
  contextWindow: number;
}
