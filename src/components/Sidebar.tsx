"use client";

import { useEffect, useState } from "react";
import { MODES } from "@/lib/prompts";
import { testConnection } from "@/lib/providers";
import type { Conversation, ModeId, Provider, Settings } from "@/lib/types";

const OPENAI_MODELS = ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1"];
const GEMINI_MODELS = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.5-flash"];

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  activeMode: ModeId;
  settings: Settings;
  settingsOpen: boolean;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onNewChat: (mode?: ModeId) => void;
  onSelectMode: (mode: ModeId) => void;
  onSaveSettings: (settings: Settings) => void;
  onOpenGuide: () => void;
  onToggleSettings: () => void;
}

export default function Sidebar({
  conversations,
  activeId,
  activeMode,
  settings,
  settingsOpen,
  onSelectConversation,
  onDeleteConversation,
  onNewChat,
  onSelectMode,
  onSaveSettings,
  onOpenGuide,
  onToggleSettings,
}: Props) {
  const [showKey, setShowKey] = useState(false);
  const [draft, setDraft] = useState<Settings>(settings);
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [saved, setSaved] = useState(false);

  const showSettings = settingsOpen;

  useEffect(() => setDraft(settings), [settings]);

  const isGemini = draft.provider === "gemini";

  const saveSettings = () => {
    const clean: Settings = {
      provider: draft.provider,
      openaiKey: draft.openaiKey.trim(),
      openaiModel: draft.openaiModel.trim() || "gpt-4o-mini",
      geminiKey: draft.geminiKey.trim(),
      geminiModel: draft.geminiModel.trim() || "gemini-2.0-flash",
    };
    onSaveSettings(clean);
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  };

  const runTest = async () => {
    setTesting(true);
    setTestStatus(null);
    const key = isGemini ? draft.geminiKey : draft.openaiKey;
    const result = await testConnection(draft.provider, key);
    setTestStatus(result);
    setTesting(false);
  };

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-r border-slate-800 bg-[#0c111d]">
      {/* logo */}
      <div className="border-b border-slate-800 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-emerald-500 text-lg">
            ⚡
          </span>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">ElektroAI</h1>
            <p className="text-[11px] text-slate-500">Asisten rancang alat elektronika</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-4 pt-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Mode keahlian
        </span>
      </div>

      {/* pemilih mode */}
      <nav className="space-y-1 px-3 py-2">
        {MODES.map((mode) => {
          const active = mode.id === activeMode;
          return (
            <button
              key={mode.id}
              onClick={() => {
                onSelectMode(mode.id);
                if (!activeId) onNewChat(mode.id);
              }}
              title={mode.hint}
              className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                active ? "bg-sky-500/15 ring-1 ring-sky-500/40" : "hover:bg-slate-800/60"
              }`}
            >
              <span className="text-lg leading-none">{mode.icon}</span>
              <span className="min-w-0">
                <span className={`block text-sm font-medium ${active ? "text-sky-300" : "text-slate-300"}`}>
                  {mode.label}
                </span>
                <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">{mode.hint}</span>
              </span>
            </button>
          );
        })}
      </nav>

      {/* tombol chat baru */}
      <div className="px-3 py-2">
        <button
          onClick={() => onNewChat()}
          className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.99]"
        >
          + Chat baru
        </button>
      </div>

      {/* riwayat percakapan */}
      <div className="mt-2 flex min-h-0 flex-1 flex-col">
        <span className="px-6 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Riwayat ({conversations.length})
        </span>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          {conversations.length === 0 ? (
            <p className="px-3 py-4 text-xs leading-relaxed text-slate-600">
              Belum ada percakapan. Riwayat disimpan otomatis di browser Anda.
            </p>
          ) : (
            <ul className="space-y-1">
              {conversations.map((conv) => (
                <li
                  key={conv.id}
                  className={`group flex items-center gap-1 rounded-lg transition ${
                    conv.id === activeId ? "bg-slate-800/80" : "hover:bg-slate-800/40"
                  }`}
                >
                  <button
                    onClick={() => onSelectConversation(conv.id)}
                    className="min-w-0 flex-1 truncate px-3 py-2 text-left text-sm text-slate-300"
                    title={conv.title}
                  >
                    {conv.title}
                  </button>
                  <button
                    onClick={() => onDeleteConversation(conv.id)}
                    title="Hapus percakapan"
                    className="mr-1 hidden rounded-md px-1.5 py-1 text-slate-500 transition hover:bg-rose-500/20 hover:text-rose-400 group-hover:block"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* pengaturan API */}
      <div className="border-t border-slate-800">
        <button
          onClick={onToggleSettings}
          className="flex w-full items-center justify-between px-5 py-3 text-sm text-slate-400 transition hover:bg-slate-800/40 hover:text-slate-200"
        >
          <span>⚙️ Pengaturan AI</span>
          <span className={`transition ${showSettings ? "rotate-180" : ""}`}>▾</span>
        </button>

        {showSettings && (
          <div className="max-h-[52vh] space-y-3 overflow-y-auto border-t border-slate-800 bg-[#0a0e17] px-5 py-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Penyedia AI</label>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { id: "openai", label: "OpenAI (GPT)" },
                    { id: "gemini", label: "Gemini (Gratis)" },
                  ] as { id: Provider; label: string }[]
                ).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setDraft({ ...draft, provider: p.id });
                      setTestStatus(null);
                    }}
                    className={`rounded-lg border px-2 py-2 text-xs font-medium transition ${
                      draft.provider === p.id
                        ? "border-sky-500/60 bg-sky-500/15 text-sky-300"
                        : "border-slate-700 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {isGemini && (
                <p className="mt-1.5 text-[11px] leading-relaxed text-emerald-400/80">
                  ✨ Punya free tier besar — cocok untuk mahasiswa. Buat key di
                  aistudio.google.com → Get API key.
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">
                API key {isGemini ? "Gemini" : "OpenAI"}
              </label>
              <div className="flex gap-1">
                <input
                  type={showKey ? "text" : "password"}
                  value={isGemini ? draft.geminiKey : draft.openaiKey}
                  onChange={(e) =>
                    setDraft(isGemini ? { ...draft, geminiKey: e.target.value } : { ...draft, openaiKey: e.target.value })
                  }
                  placeholder={isGemini ? "AIza..." : "sk-..."}
                  className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 font-mono text-xs text-slate-200 outline-none focus:border-sky-500"
                />
                <button
                  onClick={() => setShowKey((s) => !s)}
                  title={showKey ? "Sembunyikan" : "Tampilkan"}
                  className="rounded-lg border border-slate-700 px-2 text-xs text-slate-400 hover:bg-slate-800"
                >
                  {showKey ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Model</label>
              <input
                list={isGemini ? "gemini-models" : "openai-models"}
                value={isGemini ? draft.geminiModel : draft.openaiModel}
                onChange={(e) =>
                  setDraft(isGemini ? { ...draft, geminiModel: e.target.value } : { ...draft, openaiModel: e.target.value })
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 font-mono text-xs text-slate-200 outline-none focus:border-sky-500"
              />
              <datalist id="openai-models">
                {OPENAI_MODELS.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
              <datalist id="gemini-models">
                {GEMINI_MODELS.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>

            <div className="flex gap-1.5">
              <button
                onClick={runTest}
                disabled={testing}
                className="flex-1 rounded-lg border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800 disabled:opacity-50"
              >
                {testing ? "Menguji…" : "🔌 Tes koneksi"}
              </button>
              <button
                onClick={saveSettings}
                className="flex-1 rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-sky-500"
              >
                {saved ? "✓ Tersimpan" : "Simpan"}
              </button>
            </div>

            {testStatus && (
              <p
                className={`rounded-lg border px-3 py-2 text-[11px] leading-relaxed ${
                  testStatus.ok
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border-rose-500/40 bg-rose-500/10 text-rose-300"
                }`}
              >
                {testStatus.message}
              </p>
            )}

            <p className="text-[11px] leading-relaxed text-slate-600">
              Key hanya disimpan di browser Anda (localStorage) dan dikirim langsung ke penyedia AI.
            </p>

            <button
              onClick={onOpenGuide}
              className="w-full rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
            >
              ❓ Buka panduan singkat
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
