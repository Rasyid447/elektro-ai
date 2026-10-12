"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { parseNetlist, solveDC, runTransient, formatEngineering } from "@/lib/spice";

const COLORS = ["#38bdf8", "#34d399", "#f472b6", "#facc15", "#a78bfa", "#fb923c", "#f87171", "#22d3ee"];

export const EXAMPLES: { label: string; netlist: string }[] = [
  {
    label: "Pembagi tegangan",
    netlist: `Pembagi tegangan 12V -> 5V
V1 vin 0 DC 12
R1 vin vout 7k
R2 vout 0 3k
.op
.end`,
  },
  {
    label: "Tangga RC (filter)",
    netlist: "Filter RC aktif (step 0->5V)\nV1 vin 0 PULSE(0 5 0 1n 1n 50m 100m)\nR1 vin vout 1k\nC1 vout 0 1u\n.tran 0 5m\n.end",
  },
  {
    label: "Resonansi RLC",
    netlist: "Resonansi RLC\nV1 vin 0 PULSE(0 5 0 1n 1n 20m 40m)\nR1 vin n1 50\nL1 n1 n2 10m\nC1 n2 0 100n\n.tran 0 20m\n.end",
  },
  {
    label: "Rangkaian arus (Ohm)",
    netlist: "Arus 1mA melalui 2k2\nI1 0 n1 DC 1m\nR1 n1 0 2k2\n.op\n.end",
  },
  {
    label: "Induktor & resistor",
    netlist: "Induktor sebagai kawat di DC\nV1 vin 0 DC 5\nL1 vin n1 1m\nR1 n1 0 10\n.op\n.end",
  },
];

function SymbolDiagram({ elements }: { elements: any[] }) {
  const cell = 170;
  const perRow = Math.min(4, Math.max(1, elements.length));
  const rows = Math.ceil(elements.length / perRow);
  const w = perRow * cell;
  const h = Math.max(1, rows) * 120;

  const drawLead = (x1: number, x2: number, y: number, isGnd: boolean) => (
    <>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke="#64748b" strokeWidth={2} />
      {isGnd ? (
        <g transform={`translate(${x2},${y})`}>
          <line x1={0} y1={0} x2={0} y2={8} stroke="#64748b" strokeWidth={2} />
          <line x1={-9} y1={8} x2={9} y2={8} stroke="#64748b" strokeWidth={2} />
          <line x1={-6} y1={12} x2={6} y2={12} stroke="#64748b" strokeWidth={2} />
          <line x1={-3} y1={16} x2={3} y2={16} stroke="#64748b" strokeWidth={2} />
        </g>
      ) : null}
    </>
  );

  const symbol = (kind: string) => {
    const stroke = "#38bdf8";
    if (kind === "R")
      return <rect x={-26} y={-10} width={52} height={20} fill="none" stroke={stroke} strokeWidth={2} />;
    if (kind === "C")
      return (
        <>
          <line x1={-7} y1={-16} x2={-7} y2={16} stroke={stroke} strokeWidth={2.5} />
          <line x1={7} y1={-16} x2={7} y2={16} stroke={stroke} strokeWidth={2.5} />
        </>
      );
    if (kind === "L")
      return (
        <path
          d="M -30 0 q 7.5 -16 15 0 q 7.5 -16 15 0 q 7.5 -16 15 0"
          fill="none"
          stroke={stroke}
          strokeWidth={2.5}
        />
      );
    if (kind === "V")
      return (
        <>
          <circle r={17} fill="#0f172a" stroke={stroke} strokeWidth={2} />
          <text x={-7} y={5} fill="#34d399" fontSize={14} fontWeight={700}>+</text>
          <text x={4} y={5} fill="#f87171" fontSize={14} fontWeight={700}>−</text>
        </>
      );
    if (kind === "I")
      return (
        <>
          <circle r={17} fill="#0f172a" stroke={stroke} strokeWidth={2} />
          <line x1={-8} y1={0} x2={8} y2={0} stroke="#facc15" strokeWidth={2} />
          <path d="M 8 0 l -6 -4 l 0 8 z" fill="#facc15" />
        </>
      );
    return null;
  };

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} className="select-none">
      {elements.map((el, i) => {
        const row = Math.floor(i / perRow);
        const col = i % perRow;
        const cx = col * cell + cell / 2;
        const cy = row * 120 + 55;
        const gndA = el.a === "0" || /^(gnd|ground)$/i.test(el.a);
        const gndB = el.b === "0" || /^(gnd|ground)$/i.test(el.b);
        const label = (t: string) => (t === "0" ? "0" : t);
        return (
          <g key={i} transform={`translate(${cx},${cy})`}>
            {drawLead(-60, -30, 0, gndA)}
            {drawLead(30, 60, 0, gndB)}
            {symbol(el.kind)}
            <text x={-45} y={-18} fill="#94a3b8" fontSize={11} textAnchor="middle">{label(el.a)}</text>
            <text x={45} y={-18} fill="#94a3b8" fontSize={11} textAnchor="middle">{label(el.b)}</text>
            <text x={0} y={38} fill="#e2e8f0" fontSize={12} textAnchor="middle" fontWeight={600}>{el.name}</text>
            <text x={0} y={52} fill="#64748b" fontSize={11} textAnchor="middle">{el.display}</text>
          </g>
        );
      })}
    </svg>
  );
}

function Plot({ traces, selected }: { traces: any; selected: string[] }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !traces) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth || 600;
    const cssH = 260;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const pad = { l: 52, r: 12, t: 12, b: 28 };
    const plotW = cssW - pad.l - pad.r;
    const plotH = cssH - pad.t - pad.b;

    const series = selected.filter((n) => traces.node[n]);
    let vmin = Infinity, vmax = -Infinity;
    for (const n of series)
      for (const v of traces.node[n]) {
        if (v < vmin) vmin = v;
        if (v > vmax) vmax = v;
      }
    if (!isFinite(vmin)) { vmin = 0; vmax = 1; }
    if (vmax - vmin < 1e-12) { vmax = vmin + 1; vmin -= 1; }
    const margin = (vmax - vmin) * 0.08;
    vmin -= margin; vmax += margin;

    const tmax = traces.time[traces.time.length - 1] || 1;
    const X = (t: number) => pad.l + (t / tmax) * plotW;
    const Y = (v: number) => pad.t + (1 - (v - vmin) / (vmax - vmin)) * plotH;

    // grid + sumbu
    ctx.strokeStyle = "#1e293b";
    ctx.fillStyle = "#64748b";
    ctx.font = "10px system-ui";
    ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) {
      const v = vmin + ((vmax - vmin) * g) / 4;
      const y = Y(v);
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + plotW, y); ctx.stroke();
      ctx.textAlign = "right";
      ctx.fillText(formatEngineering(v), pad.l - 6, y + 3);
      const t = (tmax * g) / 4;
      ctx.textAlign = "center";
      ctx.fillText(formatEngineering(t), X(t), cssH - 8);
    }
    ctx.textAlign = "left";

    // garis 0
    if (vmin < 0 && vmax > 0) {
      ctx.strokeStyle = "#334155";
      ctx.beginPath(); ctx.moveTo(pad.l, Y(0)); ctx.lineTo(pad.l + plotW, Y(0)); ctx.stroke();
    }

    series.forEach((n, i) => {
      const color = COLORS[i % COLORS.length];
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      const data = traces.node[n];
      for (let k = 0; k < data.length; k++) {
        const x = X(traces.time[k]);
        const y = Y(data[k]);
        if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    });
  }, [traces, selected]);

  return <canvas ref={ref} style={{ width: "100%", height: 260 }} />;
}

export default function Simulator({
  netlist,
  onChange,
  onClose,
}: {
  netlist: string;
  onChange: (v: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(netlist);
  const [result, setResult] = useState<{ kind: string; data: any } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [tstop, setTstop] = useState("5m");

  useEffect(() => {
    if (netlist && netlist !== text) {
      setText(netlist);
      autoRun(netlist);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [netlist]);

  function autoRun(src: string) {
    try {
      const nl = parseNetlist(src);
      const tran = nl.analyses.find((a: any) => a.type === "tran");
      if (tran) runTran(src);
      else runDC(src);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setResult(null);
    }
  }

  function decorated(nl: any) {
    for (const el of nl.elements) {
      if (el.kind === "R") el.display = `${formatEngineering(el.value)}Ω`;
      else if (el.kind === "C") el.display = `${formatEngineering(el.value)}F`;
      else if (el.kind === "L") el.display = `${formatEngineering(el.value)}H`;
      else if (el.kind === "V") el.display = el.wave ? el.wave.type.toUpperCase() : `${formatEngineering(el.dc)}V`;
      else if (el.kind === "I") el.display = el.wave ? el.wave.type.toUpperCase() : `${formatEngineering(el.dc)}A`;
    }
    return nl;
  }

  function runDC(src = text) {
    try {
      const nl = decorated(parseNetlist(src));
      const dc = solveDC(nl);
      setResult({ kind: "op", data: dc });
      setSelected((prev) => (prev.length ? prev : Object.keys(dc.nodeVoltages).filter((n) => n !== "0").slice(0, 3)));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setResult(null);
    }
  }

  function runTran(src = text) {
    try {
      const nl = decorated(parseNetlist(src));
      const ts = parseNetlist(src).analyses.find((a: any) => a.type === "tran");
      let stop = ts?.tstop;
      if (tstop) {
        const m = String(tstop).trim().match(/^([\d.]+)\s*([a-zA-Z]*)$/);
        if (m) {
          const suf = { "": 1, k: 1e3, m: 1e-6, u: 1e-6, n: 1e-9, p: 1e-12 } as Record<string, number>;
          stop = parseFloat(m[1]) * (suf[m[2].toLowerCase()] ?? 1);
        }
      }
      const traces = runTransient(nl, { tstop: stop ?? 1e-3, steps: 500 });
      setResult({ kind: "tran", data: traces });
      setSelected((prev) => (prev.length ? prev : traces.nodeVoltages.slice(0, 3)));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setResult(null);
    }
  }

  const nodeVoltages = useMemo(() => {
    if (result?.kind !== "op") return [];
    return Object.entries(result.data.nodeVoltages as Record<string, number>).map(([k, v]) => ({ node: k, v }));
  }, [result]);

  return (
    <section className="flex h-full w-full flex-col border-l border-slate-800 bg-[#0b1020] md:w-[46%] md:min-w-[420px]">
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5">
        <div>
          <h2 className="text-sm font-bold text-white">🧪 Simulator Rangkaian</h2>
          <p className="text-[11px] text-slate-500">SPICE di browser · DC &amp; Transien · open source</p>
        </div>
        <button onClick={onClose} className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:bg-slate-800" title="Tutup simulator">✕</button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {/* contoh */}
        <div className="mb-2 flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              onClick={() => { setText(ex.netlist); onChange(ex.netlist); autoRun(ex.netlist); }}
              className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-300 transition hover:border-sky-500/60 hover:text-sky-300"
            >
              {ex.label}
            </button>
          ))}
        </div>

        {/* editor netlist */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          rows={9}
          className="w-full rounded-xl border border-slate-700 bg-[#0a0e17] p-3 font-mono text-[12px] leading-relaxed text-slate-200 outline-none focus:border-sky-500"
        />

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button onClick={() => runDC()} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500">▶ Titik Kerja DC</button>
          <button onClick={() => runTran()} className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500">📈 Transien</button>
          <label className="ml-auto flex items-center gap-1 text-[11px] text-slate-400">
            durasi
            <input
              value={tstop}
              onChange={(e) => setTstop(e.target.value)}
              className="w-16 rounded border border-slate-700 bg-slate-900 px-1.5 py-1 font-mono text-[11px] text-slate-200 outline-none focus:border-sky-500"
            />
            detik
          </label>
        </div>

        {error && (
          <div className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            ⚠️ {error}
          </div>
        )}

        {/* diagram rangkaian */}
        <div className="mt-4 rounded-xl border border-slate-800 bg-[#0f1424] p-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Diagram koneksi</p>
          <div className="overflow-x-auto">
            {(() => {
              try {
                const nl = decorated(parseNetlist(text));
                return <SymbolDiagram elements={nl.elements} />;
              } catch {
                return <p className="py-4 text-center text-xs text-slate-600">Perbaiki netlist untuk melihat diagram.</p>;
              }
            })()}
          </div>
        </div>

        {/* hasil DC */}
        {result?.kind === "op" && (
          <div className="mt-4">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Hasil titik kerja DC</p>
            <table className="w-full rounded-xl border border-slate-800 text-xs">
              <thead>
                <tr className="bg-slate-800/50 text-slate-300">
                  <th className="px-3 py-1.5 text-left">Node</th>
                  <th className="px-3 py-1.5 text-right">Tegangan</th>
                </tr>
              </thead>
              <tbody>
                {nodeVoltages.map((r) => (
                  <tr key={r.node} className="border-t border-slate-800/60">
                    <td className="px-3 py-1.5 font-mono text-slate-300">{r.node}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-sky-300">{formatEngineering(r.v)} V</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {Object.keys(result.data.sourceCurrents).length > 0 && (
              <table className="mt-2 w-full rounded-xl border border-slate-800 text-xs">
                <thead>
                  <tr className="bg-slate-800/50 text-slate-300">
                    <th className="px-3 py-1.5 text-left">Sumber/Induktor</th>
                    <th className="px-3 py-1.5 text-right">Arus</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(result.data.sourceCurrents as Record<string, number>).map(([k, v]) => (
                    <tr key={k} className="border-t border-slate-800/60">
                      <td className="px-3 py-1.5 font-mono text-slate-300">{k}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-emerald-300">{formatEngineering(v)} A</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* hasil transien */}
        {result?.kind === "tran" && (
          <div className="mt-4">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Grafik tegangan vs waktu</p>
            <div className="rounded-xl border border-slate-800 bg-[#0f1424] p-2">
              <Plot traces={result.data} selected={selected} />
              <div className="mt-2 flex flex-wrap gap-2 px-1">
                {result.data.nodeVoltages.map((n: string, i: number) => {
                  const on = selected.includes(n);
                  return (
                    <button
                      key={n}
                      onClick={() => setSelected((s) => (on ? s.filter((x) => x !== n) : [...s, n]))}
                      className="flex items-center gap-1.5 rounded-full border border-slate-700 px-2 py-0.5 text-[11px] font-mono"
                      style={{ color: on ? COLORS[i % COLORS.length] : "#64748b" }}
                    >
                      <span className="inline-block h-2 w-2 rounded-full" style={{ background: on ? COLORS[i % COLORS.length] : "#334155" }} />
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {!result && !error && (
          <p className="mt-6 text-center text-xs text-slate-600">
            Tulis netlist SPICE (R, C, L, V, I; ground = 0) lalu jalankan analisis.
          </p>
        )}
      </div>
    </section>
  );
}
