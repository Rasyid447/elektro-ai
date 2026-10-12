export type ModeId = "desain" | "komponen" | "review" | "firmware" | "simulasi";

export type Provider = "openai" | "gemini";

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

export interface Settings {
  provider: Provider;
  openaiKey: string;
  openaiModel: string;
  geminiKey: string;
  geminiModel: string;
}

export const DEFAULT_SETTINGS: Settings = {
  provider: "openai",
  openaiKey: "",
  openaiModel: "gpt-4o-mini",
  geminiKey: "",
  geminiModel: "gemini-2.0-flash",
};
