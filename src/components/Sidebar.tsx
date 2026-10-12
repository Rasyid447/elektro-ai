"use client";

import { useState } from "react";
import { MODES } from "@/lib/prompts";
import type { Conversation, ModeId } from "@/lib/types";

export interface Settings {
  apiKey: string;
  model: string;
}

const MODEL_OPTIONS = ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1"];

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  activeMode: ModeId;
  settings: Settings;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onNewChat: (mode?: ModeId) => void;
  onSelectMode: (mode: ModeId) => void;
  onSaveSettings: (settings: Settings) => void;
}

export default function Sidebar({
  conversations,
  activeId,
  activeMode,
  settings,
  onSelectConversation,
  onDeleteConversation,
  onNewChat,
  onSelectMode,
  onSaveSettings,
}: Props) {
  const [showSettings, setShowSettings] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [draftKey, setDraftKey] = useState(settings.apiKey);
  const [draftModel, setDraftModel] = useState(settings.model);

  const saveSettings = () => {
    onSaveSettings({ apiKey: draftKey.trim(), model: draftModel.trim() || "gpt-4o-mini" });
    setShowSettings(false);
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
                active
                  ? "bg-sky-500/15 ring-1 ring-sky-500/40"
                  : "hover:bg-slate-800/60"
              }`}
            >
              <span className="text-lg leading-none">{mode.icon}</span>
              <span className="min-w-0">
                <span className={`block text-sm font-medium ${active ? "text-sky-300" : "text-slate-300"}`}>
                  {mode.label}
                </span>
                <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">
                  {mode.hint}
                </span>
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
          onClick={() => setShowSettings((s) => !s)}
          className="flex w-full items-center justify-between px-5 py-3 text-sm text-slate-400 transition hover:bg-slate-800/40 hover:text-slate-200"
        >
          <span>⚙️ Pengaturan API</span>
          <span className={`transition ${showSettings ? "rotate-180" : ""}`}>▾</span>
        </button>

        {showSettings && (
          <div className="space-y-3 border-t border-slate-800 bg-[#0a0e17] px-5 py-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">
                API key OpenAI
              </label>
              <div className="flex gap-1">
                <input
                  type={showKey ? "text" : "password"}
                  value={draftKey}
                  onChange={(e) => setDraftKey(e.target.value)}
                  placeholder="sk-..."
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
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-600">
                Key hanya disimpan di browser Anda dan dikirim langsung ke server lokal.
                Dapatkan key di platform.openai.com/api-keys
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Model GPT</label>
              <input
                list="model-options"
                value={draftModel}
                onChange={(e) => setDraftModel(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 font-mono text-xs text-slate-200 outline-none focus:border-sky-500"
              />
              <datalist id="model-options">
                {MODEL_OPTIONS.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>

            <button
              onClick={saveSettings}
              className="w-full rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
            >
              Simpan pengaturan
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
