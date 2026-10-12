"use client";

import { useEffect, useRef, useState } from "react";
import MarkdownContent from "./MarkdownContent";
import { MODES, getMode } from "@/lib/prompts";
import type { Conversation, ModeId } from "@/lib/types";

interface Props {
  conversation: Conversation | null;
  mode: ModeId;
  streaming: boolean;
  error: string | null;
  onSend: (text: string) => void;
  onStop: () => void;
  onPickMode: (mode: ModeId) => void;
  onSimulate: (netlist: string) => void;
}

function extractSpice(content: string): string[] {
  const out: string[] = [];
  const re = /```[ \t]*spice[ \t]*\r?\n([\s\S]*?)```/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const block = m[1].trim();
    if (block) out.push(block);
  }
  return out;
}

function SpiceButtons({ content, onSimulate }: { content: string; onSimulate: (n: string) => void }) {
  const blocks = extractSpice(content);
  if (blocks.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {blocks.map((b, i) => (
        <button
          key={i}
          onClick={() => onSimulate(b)}
          className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/20"
        >
          🧪 Simulasikan rangkaian ini
        </button>
      ))}
    </div>
  );
}

export default function ChatView({
  conversation,
  mode,
  streaming,
  error,
  onSend,
  onStop,
  onPickMode,
  onSimulate,
}: Props) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messages = conversation?.messages ?? [];
  const modeInfo = getMode(mode);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, streaming]);

  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  useEffect(resizeTextarea, [input]);

  const submit = () => {
    const text = input.trim();
    if (!text || streaming) return;
    onSend(text);
    setInput("");
  };

  return (
    <section className="relative flex h-full min-w-0 flex-1 flex-col bg-[#0a0e17]">
      {/* header chat */}
      {conversation && (
        <header className="flex items-center justify-between border-b border-slate-800 bg-[#0c111d]/80 px-6 py-3 backdrop-blur">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-slate-200">
              {conversation.title}
            </h2>
            <p className="text-[11px] text-slate-500">
              Mode: {modeInfo.icon} {modeInfo.label}
            </p>
          </div>
          {streaming && (
            <button
              onClick={onStop}
              className="rounded-lg border border-rose-500/40 px-3 py-1.5 text-xs font-medium text-rose-400 transition hover:bg-rose-500/10"
            >
              ■ Hentikan
            </button>
          )}
        </header>
      )}

      {/* daftar pesan / layar sambutan */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8">
        {messages.length === 0 && !error ? (
          <div className="mx-auto flex h-full max-w-3xl flex-col justify-center">
            <p className="text-sm font-medium text-sky-400">Selamat datang di ElektroAI 👋</p>
            <h1 className="mt-2 text-3xl font-bold leading-tight text-white">
              Rancang alat elektronika Anda,
              <br />
              didampingi AI ahli elektronika.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-400">
              Pilih mode keahlian di bawah ini. Ceritakan alat yang ingin Anda buat, dan
              ElektroAI akan memandu dari konsep, blok diagram, pemilihan komponen,
              review rangkaian, sampai kode mikrokontrolernya.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => onPickMode(m.id)}
                  className="group rounded-2xl border border-slate-800 bg-[#0f1424] p-4 text-left transition hover:-translate-y-0.5 hover:border-sky-500/50 hover:bg-[#111830]"
                >
                  <span className="text-2xl">{m.icon}</span>
                  <h3 className="mt-2 text-sm font-semibold text-slate-200 group-hover:text-sky-300">
                    {m.label}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">{m.hint}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-5">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
              >
                {msg.role === "assistant" && (
                  <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-emerald-500 text-sm">
                    ⚡
                  </span>
                )}
                <div
                  className={
                    msg.role === "user"
                      ? "max-w-[85%] rounded-2xl rounded-tr-sm bg-sky-600/90 px-4 py-2.5 text-sm text-white"
                      : "min-w-0 flex-1 rounded-2xl rounded-tl-sm border border-slate-800 bg-[#0f1424] px-4 py-3"
                  }
                >
                  {msg.role === "assistant" ? (
                    msg.content ? (
                      <>
                        <MarkdownContent content={msg.content} />
                        <SpiceButtons content={msg.content} onSimulate={onSimulate} />
                      </>
                    ) : (
                      <div className="flex items-center gap-1.5 py-1 text-slate-400">
                        <span className="typing-dot text-xs">●</span>
                        <span className="typing-dot text-xs" style={{ animationDelay: "0.2s" }}>
                          ●
                        </span>
                        <span className="typing-dot text-xs" style={{ animationDelay: "0.4s" }}>
                          ●
                        </span>
                        <span className="ml-2 text-xs text-slate-500">merangkai jawaban…</span>
                      </div>
                    )
                  ) : (
                    <span className="whitespace-pre-wrap text-sm leading-relaxed">
                      {msg.content}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {error && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                ⚠️ {error}
              </div>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* area input */}
      <div className="border-t border-slate-800 bg-[#0c111d] px-4 py-4 md:px-8">
        <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-slate-700 bg-[#0f1424] px-3 py-2 focus-within:border-sky-500/70">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={
              messages.length === 0
                ? `Contoh: ${modeInfo.starter.slice(0, 80)}…`
                : "Tulis pertanyaan / detail alat Anda… (Enter kirim, Shift+Enter baris baru)"
            }
            className="max-h-[200px] min-h-[24px] flex-1 resize-none bg-transparent py-1.5 text-sm text-slate-200 outline-none placeholder:text-slate-600"
          />
          <button
            onClick={streaming ? onStop : submit}
            disabled={!streaming && !input.trim()}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white transition ${
              streaming
                ? "bg-rose-500 hover:bg-rose-400"
                : input.trim()
                  ? "bg-gradient-to-r from-sky-500 to-emerald-500 hover:brightness-110"
                  : "cursor-not-allowed bg-slate-800 text-slate-600"
            }`}
            title={streaming ? "Hentikan" : "Kirim"}
          >
            {streaming ? "■" : "➤"}
          </button>
        </div>
        <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-slate-600">
          Selalu periksa ulang nilai komponen dengan datasheet resmi sebelum dirakit.
          Untuk proyek bertegangan tinggi, konsultasikan dengan dosen/inspektor berlisensi.
        </p>
      </div>
    </section>
  );
}
