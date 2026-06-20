export interface ChatMessage {
  id: string;
  parentMessageId: string | null;
  role: "user" | "assistant" | "system";
  content: string;
  model?: string | null;
  createdAt: string;
}

export interface Branch {
  id: string;
  name: string;
  leafMessageId: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  model: string;
  updatedAt: string;
}
