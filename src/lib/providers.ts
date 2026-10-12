import type { ChatMessage, Provider } from "./types";

// Lapisan penyedia AI: satu antarmuka untuk OpenAI & Google Gemini.
// Berjalan langsung dari browser (CORS keduanya terbuka) sehingga web tetap statis.

export interface StreamArgs {
  provider: Provider;
  apiKey: string;
  model: string;
  system: string;
  messages: ChatMessage[];
  temperature?: number;
  signal?: AbortSignal;
  onText: (fullSoFar: string) => void;
}

async function responseError(res: Response, label: string): Promise<Error> {
  let detail = "";
  try {
    const data = await res.json();
    detail = data?.error?.message || data?.error?.status || "";
  } catch {
    /* abaikan */
  }
  const hints: Record<number, string> = {
    400: "Permintaan ditolak — periksa nama model atau format pesan.",
    401: "API key tidak valid atau sudah dicabut.",
    403: "API key tidak punya akses ke layanan ini.",
    404: "Model tidak ditemukan — periksa ejaan nama model.",
    429: "Kuota habis atau terlalu banyak permintaan. Coba lagi nanti.",
  };
  const hint = hints[res.status] ? ` ${hints[res.status]}` : "";
  return new Error(`${label}: ${detail || `HTTP ${res.status}`}.${hint}`);
}

async function readSSE(
  res: Response,
  extract: (json: any) => string | null,
  onText: (full: string) => void,
): Promise<string> {
  if (!res.body) throw new Error("Tidak ada data streaming dari server.");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n");
    buffer = parts.pop() ?? "";
    for (const raw of parts) {
      const line = raw.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") continue;
      try {
        const json = JSON.parse(payload);
        const piece = extract(json);
        if (piece) {
          full += piece;
          onText(full);
        }
      } catch {
        /* potongan JSON belum lengkap */
      }
    }
  }
  return full;
}

export async function streamChat(args: StreamArgs): Promise<string> {
  const { provider, apiKey, model, system, messages, temperature = 0.4, signal, onText } = args;
  const key = apiKey.trim();
  if (!key) throw new Error("API key belum diisi. Buka menu ⚙️ Pengaturan lalu simpan key Anda.");
  if (!model.trim()) throw new Error("Nama model kosong. Isi nama model di menu Pengaturan.");

  if (provider === "gemini") {
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model.trim())}` +
      `:streamGenerateContent?alt=sse`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        generationConfig: { temperature },
      }),
    });
    if (!res.ok) throw await responseError(res, "Gemini");
    return await readSSE(
      res,
      (j) => {
        const parts = j?.candidates?.[0]?.content?.parts;
        if (!Array.isArray(parts)) return null;
        const text = parts.map((p: any) => p?.text || "").join("");
        return text || null;
      },
      onText,
    );
  }

  // OpenAI
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    signal,
    body: JSON.stringify({
      model: model.trim(),
      stream: true,
      temperature,
      messages: [
        { role: "system", content: system },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    }),
  });
  if (!res.ok) throw await responseError(res, "OpenAI");
  return await readSSE(res, (j) => j?.choices?.[0]?.delta?.content ?? null, onText);
}

export async function testConnection(
  provider: Provider,
  apiKey: string,
): Promise<{ ok: boolean; message: string }> {
  const key = apiKey.trim();
  if (!key) return { ok: false, message: "API key masih kosong." };
  try {
    if (provider === "openai") {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.ok) return { ok: true, message: "Koneksi OK — API key OpenAI valid ✓" };
      const e = await responseError(res, "OpenAI");
      return { ok: false, message: e.message };
    }
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
    );
    if (res.ok) return { ok: true, message: "Koneksi OK — API key Gemini valid ✓" };
    const e = await responseError(res, "Gemini");
    return { ok: false, message: e.message };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Gagal terhubung. Periksa koneksi internet Anda.",
    };
  }
}
