export type ModeId = "desain" | "komponen" | "review" | "firmware" | "simulasi";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface Conversation {
  id: string;
  title: string;
  mode: ModeId;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface ChatRequest {
  messages: ChatMessage[];
  mode: ModeId;
  model: string;
  apiKey?: string;
}
