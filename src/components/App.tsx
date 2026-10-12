"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Sidebar from "./Sidebar";
import ChatView from "./ChatView";
import Simulator from "./Simulator";
import Onboarding from "./Onboarding";
import { buildSystemPrompt } from "@/lib/prompts";
import { streamChat } from "@/lib/providers";
import { DEFAULT_SETTINGS } from "@/lib/types";
import type { ChatMessage, Conversation, ModeId, Settings } from "@/lib/types";

const CONV_KEY = "elektro-ai:conversations";
const SETTINGS_KEY = "elektro-ai:settings";
const ONBOARDED_KEY = "elektro-ai:onboarded";

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function titleFrom(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 42 ? `${clean.slice(0, 42)}…` : clean || "Percakapan baru";
}

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [defaultMode, setDefaultMode] = useState<ModeId>("desain");
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [simOpen, setSimOpen] = useState(false);
  const [simNetlist, setSimNetlist] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [mounted, setMounted] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  // muat data tersimpan di browser
  useEffect(() => {
    try {
      const rawConv = localStorage.getItem(CONV_KEY);
      if (rawConv) {
        const parsed = JSON.parse(rawConv) as Conversation[];
        setConversations(parsed);
        if (parsed.length > 0) setActiveId(parsed[0].id);
      }
      const rawSettings = localStorage.getItem(SETTINGS_KEY);
      if (rawSettings) {
        const p = JSON.parse(rawSettings) as Record<string, unknown>;
        const migrated: Settings = { ...DEFAULT_SETTINGS };
        // dukung format lama { apiKey, model }
        if (typeof p.apiKey === "string") migrated.openaiKey = p.apiKey;
        if (typeof p.model === "string") migrated.openaiModel = p.model;
        // format baru
        if (typeof p.provider === "string") migrated.provider = p.provider as Settings["provider"];
        if (typeof p.openaiKey === "string") migrated.openaiKey = p.openaiKey;
        if (typeof p.openaiModel === "string") migrated.openaiModel = p.openaiModel;
        if (typeof p.geminiKey === "string") migrated.geminiKey = p.geminiKey;
        if (typeof p.geminiModel === "string") migrated.geminiModel = p.geminiModel;
        setSettings(migrated);
      }
      if (!localStorage.getItem(ONBOARDED_KEY)) setShowOnboarding(true);
    } catch {
      /* data rusak - mulai bersih */
    }
    setMounted(true);
  }, []);

  // simpan perubahan percakapan
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(CONV_KEY, JSON.stringify(conversations));
    } catch {
      /* kuota penuh - abaikan */
    }
  }, [conversations, mounted]);

  const activeConversation =
    conversations.find((c) => c.id === activeId) ?? null;
  const activeMode: ModeId = activeConversation?.mode ?? defaultMode;

  const createConversation = useCallback((mode: ModeId) => {
    const conv: Conversation = {
      id: makeId(),
      title: "Percakapan baru",
      mode,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv.id);
    setDefaultMode(mode);
    setError(null);
    return conv.id;
  }, []);

  const handlePickMode = (mode: ModeId) => {
    createConversation(mode);
  };

  const handleNewChat = (mode?: ModeId) => {
    createConversation(mode ?? activeMode);
  };

  const handleSelectConversation = (id: string) => {
    setActiveId(id);
    setError(null);
    setSidebarOpen(false);
  };

  const handleDeleteConversation = (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (id === activeId) setActiveId(null);
  };

  const handleSelectMode = (mode: ModeId) => {
    if (activeConversation) {
      setConversations((prev) =>
        prev.map((c) => (c.id === activeConversation.id ? { ...c, mode } : c)),
      );
    }
    setDefaultMode(mode);
  };

  const handleSaveSettings = (next: Settings) => {
    setSettings(next);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch {
      /* abaikan */
    }
  };

  const handleSimulate = (netlist: string) => {
    setSimNetlist(netlist);
    setSimOpen(true);
  };

  const stopStreaming = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  };

  // inti pengiriman: stream jawaban ke sebuah percakapan (newMessages diakhiri pesan user)
  const streamReply = async (
    convId: string,
    mode: ModeId,
    newMessages: ChatMessage[],
    titleText: string | null,
  ) => {
    const placeholder: ChatMessage = { role: "assistant", content: "" };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? {
              ...c,
              title: titleText && c.messages.length === 0 ? titleFrom(titleText) : c.title,
              messages: [...newMessages, placeholder],
              updatedAt: Date.now(),
            }
          : c,
      ),
    );
    setActiveId(convId);

    const controller = new AbortController();
    abortRef.current = controller;
    setStreaming(true);
    setError(null);

    const updateAssistant = (content: string) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== convId) return c;
          const msgs = [...c.messages];
          const last = msgs[msgs.length - 1];
          if (last?.role === "assistant") msgs[msgs.length - 1] = { ...last, content };
          return { ...c, messages: msgs, updatedAt: Date.now() };
        }),
      );
    };

    try {
      const activeKey = settings.provider === "gemini" ? settings.geminiKey : settings.openaiKey;
      const activeModel =
        settings.provider === "gemini" ? settings.geminiModel : settings.openaiModel;

      if (!activeKey.trim()) {
        throw new Error(
          settings.provider === "gemini"
            ? "API key Gemini belum diisi. Buka ⚙️ Pengaturan AI, pilih Gemini, tempel key (AIza...), lalu Simpan."
            : "API key OpenAI belum diisi. Buka ⚙️ Pengaturan AI, pilih OpenAI, tempel key (sk-...), lalu Simpan.",
        );
      }

      const acc = await streamChat({
        provider: settings.provider,
        apiKey: activeKey,
        model: activeModel,
        system: buildSystemPrompt(mode),
        messages: newMessages,
        temperature: 0.4,
        signal: controller.signal,
        onText: updateAssistant,
      });

      if (!acc.trim()) {
        updateAssistant("_Model tidak mengembalikan jawaban. Coba ulangi permintaan._");
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== convId) return c;
            const msgs = [...c.messages];
            const last = msgs[msgs.length - 1];
            if (last?.role === "assistant" && !last.content) {
              msgs[msgs.length - 1] = { ...last, content: "_Dihentikan._" };
            }
            return { ...c, messages: msgs };
          }),
        );
      } else {
        const msg = err instanceof Error ? err.message : "Terjadi kesalahan tak terduga.";
        setError(msg);
        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== convId) return c;
            const msgs = [...c.messages];
            const last = msgs[msgs.length - 1];
            if (last?.role === "assistant" && !last.content) msgs.pop();
            return { ...c, messages: msgs };
          }),
        );
      }
    } finally {
      abortRef.current = null;
      setStreaming(false);
    }
  };

  const sendMessage = async (text: string) => {
    if (streaming) return;
    const userMsg: ChatMessage = { role: "user", content: text };

    let convId = activeId;
    let history: ChatMessage[] = activeConversation?.messages ?? [];

    if (!convId) {
      convId = createConversation(activeMode);
      history = [];
    }

    const mode = conversations.find((c) => c.id === convId)?.mode ?? activeMode;
    await streamReply(convId, mode, [...history, userMsg], text);
  };

  const handleRegenerate = async () => {
    if (streaming || !activeConversation) return;
    const trimmed = [...activeConversation.messages];
    while (trimmed.length && trimmed[trimmed.length - 1].role === "assistant") trimmed.pop();
    if (!trimmed.length || trimmed[trimmed.length - 1].role !== "user") return;
    await streamReply(activeConversation.id, activeConversation.mode, trimmed, null);
  };

  const handleOnboardingDone = () => {
    setShowOnboarding(false);
    try {
      localStorage.setItem(ONBOARDED_KEY, "1");
    } catch {
      /* abaikan */
    }
  };

  const handleOpenGuide = () => setShowOnboarding(true);

  const handleOpenSettingsFromGuide = () => {
    setShowOnboarding(false);
    setSettingsOpen(true);
    setSidebarOpen(true);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* sidebar - tampil penuh di layar besar, sebagai laci di layar kecil */}
      <div
        className={`fixed inset-0 z-30 bg-black/60 transition-opacity md:hidden ${
          sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setSidebarOpen(false)}
      />
      <div
        className={`fixed inset-y-0 left-0 z-40 transition-transform md:static md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar
          conversations={conversations}
          activeId={activeId}
          activeMode={activeMode}
          settings={settings}
          settingsOpen={settingsOpen}
          onSelectConversation={handleSelectConversation}
          onDeleteConversation={handleDeleteConversation}
          onNewChat={handleNewChat}
          onSelectMode={handleSelectMode}
          onSaveSettings={handleSaveSettings}
          onOpenGuide={handleOpenGuide}
          onToggleSettings={() => setSettingsOpen((s) => !s)}
        />
      </div>

      {/* tombol menu untuk layar kecil */}
      <button
        onClick={() => setSidebarOpen((s) => !s)}
        className="fixed left-4 top-4 z-20 rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 text-sm text-slate-300 md:hidden"
        title="Menu"
      >
        ☰
      </button>

      {/* tombol buka simulator (mengambang) */}
      {!simOpen && (
        <button
          onClick={() => setSimOpen(true)}
          className="fixed bottom-28 right-4 z-20 flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-4 py-2.5 text-xs font-semibold text-emerald-300 shadow-lg backdrop-blur transition hover:bg-emerald-500/25"
          title="Buka simulator rangkaian"
        >
          🧪 Simulator
        </button>
      )}

      <div className="flex min-w-0 flex-1">
        <ChatView
          conversation={activeConversation}
          mode={activeMode}
          streaming={streaming}
          error={error}
          onSend={sendMessage}
          onStop={stopStreaming}
          onPickMode={handlePickMode}
          onSimulate={handleSimulate}
          onRegenerate={handleRegenerate}
        />
        {simOpen && (
          <Simulator
            netlist={simNetlist}
            onChange={setSimNetlist}
            onClose={() => setSimOpen(false)}
          />
        )}
      </div>

      <Onboarding
        open={showOnboarding}
        onClose={handleOnboardingDone}
        onOpenSettings={handleOpenSettingsFromGuide}
      />
    </div>
  );
}
