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
  projectId?: string | null;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  notes?: string | null;
  updatedAt: string;
  _count?: { conversations: number };
}

export interface ProjectFile {
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: string;
}
