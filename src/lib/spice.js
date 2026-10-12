// Mesin simulator rangkaian "SPICE-lite" milik ElektroAI.
// Open source, berjalan penuh di browser (tanpa server, tanpa layanan luar).
//
// Mendukung: Resistor (R), Kapasitor (C), Induktor (L), Tegangan (V), Arus (I),
// Analisis Titik Kerja DC (.op) dan Transien (.tran) dengan metode MNA
// (Modified Nodal Analysis) + Backward Euler.

const GROUND_ALIASES = new Set(["0", "gnd", "ground", "com", "vss"]);

export function isGround(node) {
  return GROUND_ALIASES.has(String(node).toLowerCase());
}

// ---------------------------------------------------------------
// Parsing angka gaya SPICE: 1k, 4u7?, 2.2m, 10meg, 5V, 100n
// ---------------------------------------------------------------
const SUFFIX = {
  t: 1e12, g: 1e9, meg: 1e6, m: 1e-3, k: 1e3, kilo: 1e3,
  x: 1, u: 1e-6, µ: 1e-6, n: 1e-9, p: 1e-12, f: 1e-15,
};

export function parseSpiceNumber(raw) {
  if (typeof raw === "number") return raw;
  let s = String(raw).trim().replace(/_/g, "");
  if (s === "") throw new Error("Nilai komponen kosong.");
  // buang satuan umum di belakang (V, A, Ohm, F, H, Hz)
  s = s.replace(/(v|a|ohm|ohms|r|f|h|hz|s)$/i, (m, _g, offset, str) => {
    // hanya buang jika sebelumnya ada angka
    return offset > 0 ? "" : m;
  });
  s = s.trim();
  // ekspresi sederhana: perkalian/pembagian dengan satuan (mis. 1k*2, 10/3)
  if (/^[-+]?[0-9.]+(?:[eE][-+]?\d+)?\s*[*/]\s*[-+]?[0-9.]+(?:[eE][-+]?\d+)?[a-zA-Z]*$/.test(s)) {
    const m = s.match(/^([-+]?[0-9.]+(?:[eE][-+]?\d+)?)\s*([*/])\s*([-+]?[0-9.]+(?:[eE][-+]?\d+)?)([a-zA-Z]*)$/);
    if (m) {
      const a = parseSpiceNumber(m[1] + m[4]);
      const b = parseSpiceNumber(m[3] + m[4]);
      return m[2] === "*" ? a * b : a / b;
    }
  }
  const m = s.match(/^([-+]?(?:[0-9]+\.?[0-9]*|\.[0-9]+)(?:[eE][-+]?[0-9]+)?)\s*([a-zA-Zµ]+)?/);
  if (!m) throw new Error(`Nilai "${raw}" tidak bisa dibaca. Contoh yang benar: 1k, 470, 10u, 2.2n.`);
  const num = parseFloat(m[1]);
  let suf = (m[2] || "").toLowerCase();
  if (!suf) return num;
  if (suf === "meg" || suf === "mega") return num * 1e6;
  if (suf === "mil") return num * 25.4e-6;
  const f = SUFFIX[suf];
  if (f === undefined) throw new Error(`Akhiran satuan "${m[2]}" tidak dikenal. Gunakan: k, meg, m, u, n, p.`);
  return num * f;
}

// ---------------------------------------------------------------
// Parsing gelombang sumber (DC, PULSE, SIN)
// ---------------------------------------------------------------
function parseWaveform(rest) {
  const joined = rest.join(" ");
  const upper = joined.toUpperCase();
  const dcMatch = upper.match(/\bDC\b\s+([^\s]+)/i);
  const acMatch = upper.match(/\bAC\b\s+([^\s]+)/);

  let wave = null;
  const pulse = joined.match(/PULSE\s*\(([^)]*)\)/i);
  const sin = joined.match(/SIN\s*\(([^)]*)\)/i);
  const pwl = joined.match(/PWL\s*\(([^)]*)\)/i);

  if (pulse) {
    const v = pulse[1].trim().split(/[\s,]+/).map(parseSpiceNumber);
    wave = { type: "pulse", v1: v[0] ?? 0, v2: v[1] ?? 0, td: v[2] ?? 0, tr: v[3] ?? 1e-9, tf: v[4] ?? 1e-9, pw: v[5] ?? 1e-3, per: v[6] ?? 0 };
  } else if (sin) {
    const v = sin[1].trim().split(/[\s,]+/).map(parseSpiceNumber);
    wave = { type: "sin", vo: v[0] ?? 0, va: v[1] ?? 1, freq: v[2] ?? 50, td: v[3] ?? 0 };
  } else if (pwl) {
    const nums = pwl[1].trim().split(/[\s,]+/).map(parseSpiceNumber);
    const pts = [];
    for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
    wave = { type: "pwl", points: pts };
  }

  let dcVal;
  if (dcMatch) dcVal = parseSpiceNumber(dcMatch[1]);
  else if (!wave) {
    const first = rest.find((tok) => !/^(ac|dc)$/i.test(tok));
    if (first !== undefined) dcVal = parseSpiceNumber(first);
    else dcVal = 0;
  }
  return { wave, dc: dcVal ?? 0, ac: acMatch ? parseSpiceNumber(acMatch[1]) : 0 };
}

export function evalSource(src, t) {
  const w = src.wave;
  if (!w) return src.dc;
  if (w.type === "pulse") {
    if (t < w.td) return w.v1;
    let tt = t - w.td;
    if (w.per > 0) tt = tt % w.per;
    if (tt < w.tr) return w.v1 + ((w.v2 - w.v1) * tt) / w.tr;
    if (tt < w.tr + w.pw) return w.v2;
    if (tt < w.tr + w.pw + w.tf) return w.v2 + ((w.v1 - w.v2) * (tt - w.tr - w.pw)) / w.tf;
    return w.v1;
  }
  if (w.type === "sin") {
    if (t < w.td) return w.vo;
    return w.vo + w.va * Math.sin(2 * Math.PI * w.freq * (t - w.td));
  }
  if (w.type === "pwl") {
    const pts = w.points;
    if (pts.length === 0) return 0;
    if (t <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      if (t <= pts[i][0]) {
        const [t0, v0] = pts[i - 1];
        const [t1, v1] = pts[i];
        const f = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
        return v0 + (v1 - v0) * f;
      }
    }
    return pts[pts.length - 1][1];
  }
  return src.dc;
}

// ---------------------------------------------------------------
// Parser netlist
// ---------------------------------------------------------------
export function parseNetlist(text) {
  const rawLines = String(text).split(/\r?\n/);
  const lines = [];
  let pending = null;

  for (const raw of rawLines) {
    let line = raw.replace(/\t/g, " ").trim();
    if (line === "" || line.startsWith("*") || line.startsWith(";") || line.startsWith("#")) continue;
    if (line.startsWith("+")) {
      if (pending) pending += " " + line.slice(1).trim();
      continue;
    }
    if (pending) lines.push(pending);
    pending = line;
  }
  if (pending) lines.push(pending);

  // Baris pertama dianggap judul hanya jika benar-benar tidak mirip elemen.
  function looksLikeElement(line) {
    if (line.startsWith(".")) return false;
    const t = line.split(/\s+/);
    if (!/^[rRcClLvViI]\S*$/.test(t[0])) return false;
    if (t.length < 3) return false;
    const L = t[0][0].toUpperCase();
    if (L === "R" || L === "C" || L === "L") {
      if (t.length < 4) return false;
      try { parseSpiceNumber(t[3]); } catch { return false; }
    }
    return true;
  }

  let title = "";
  if (lines.length > 0 && !looksLikeElement(lines[0]) && !lines[0].startsWith(".")) {
    title = lines.shift();
  }

  const elements = [];
  const analyses = [];
  let index = 0;

  for (const line of lines) {
    index++;

    if (line.startsWith(".")) {
      const parts = line.split(/[\s=]+/);
      const dir = parts[0].toLowerCase();
      if (dir === ".op") analyses.push({ type: "op" });
      else if (dir === ".tran") {
        const nums = parts.slice(1).filter((p) => !/[a-z]/i.test(p.replace(/[0-9.]/g, "")) || true).map((p) => {
          try { return parseSpiceNumber(p); } catch { return NaN; }
        }).filter((n) => !Number.isNaN(n));
        const tstop = nums.length >= 2 ? nums[1] : nums[0];
        analyses.push({ type: "tran", tstep: nums[0] ?? 0, tstop: tstop ?? 1e-3, tstart: nums[2] ?? 0 });
      } else if (dir === ".end") break;
      else if (dir === ".title") title = line.slice(6).trim();
      continue;
    }

    const letter = line[0].toUpperCase();
    const tokens = line.split(/[\s]+/).filter(Boolean);
    const name = tokens[0];

    if (letter === "R" || letter === "C" || letter === "L") {
      const a = tokens[1], b = tokens[2];
      if (a === undefined || b === undefined) throw new Error(`Baris "${line}" kurang node. Format: ${name} nodeA nodeB nilai`);
      const val = parseSpiceNumber(tokens[3] ?? "");
      if (!(val > 0)) throw new Error(`Nilai ${name} harus lebih besar dari 0.`);
      const kind = letter === "R" ? "R" : letter === "C" ? "C" : "L";
      elements.push({ kind, name, a, b, value: val });
    } else if (letter === "V" || letter === "I") {
      const a = tokens[1], b = tokens[2];
      if (a === undefined || b === undefined) throw new Error(`Baris "${line}" kurang node. Format: ${name} node+ node- nilai`);
      const { wave, dc } = parseWaveform(tokens.slice(3));
      const kind = letter === "V" ? "V" : "I";
      elements.push({ kind, name, a, b, wave, dc });
    } else {
      throw new Error(`Elemen "${line}" tidak didukung. Gunakan R, C, L, V, I.`);
    }
  }

  if (elements.length === 0) throw new Error("Tidak ada elemen rangkaian. Contoh: V1 in 0 DC 5");
  if (analyses.length === 0) analyses.push({ type: "op" });
  return { title, elements, analyses };
}

// ---------------------------------------------------------------
// Penyelesaian sistem linear (Gaussian elimination + partial pivot)
// ---------------------------------------------------------------
function solveLinear(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    if (Math.abs(M[piv][col]) < 1e-12) throw new Error("Rangkaian tidak valid (matriks singular). Pastikan ada jalur ke ground (node 0) dan tidak ada sumber tegangan paralel.");
    [M[col], M[piv]] = [M[piv], M[col]];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r][col] / M[col][col];
      if (factor === 0) continue;
      for (let c = col; c <= n; c++) M[r][c] -= factor * M[col][c];
    }
  }
  return M.map((row, i) => row[n] / M[i][i]);
}

// ---------------------------------------------------------------
// MNA builder
// ---------------------------------------------------------------
function buildNodes(elements) {
  const map = new Map();
  let idx = 0;
  const ensure = (node) => {
    if (isGround(node)) return -1;
    if (!map.has(node)) map.set(node, idx++);
    return map.get(node);
  };
  for (const el of elements) {
    ensure(el.a);
    ensure(el.b);
  }
  return map;
}

// mode: "op" | "tran"
function analyzeOnce(elements, nodeIndex, opts) {
  const { mode, t, h, vPrev, iPrev } = opts;
  const numNodes = nodeIndex.size;
  // sumber tegangan = V, dan L saat .op (dipakai sebagai kawat 0V untuk baca arus)
  const vSources = elements.filter((e) => e.kind === "V" || (e.kind === "L" && mode === "op"));
  const n = numNodes + vSources.length;

  const A = Array.from({ length: n }, () => new Array(n).fill(0));
  const z = new Array(n).fill(0);

  const nodeIdx = (node) => {
    if (isGround(node)) return -1;
    const i = nodeIndex.get(node);
    if (i === undefined) throw new Error(`Node "${node}" tidak dikenal.`);
    return i;
  };

  const stampConductance = (a, b, g) => {
    const ia = nodeIdx(a), ib = nodeIdx(b);
    if (ia >= 0) A[ia][ia] += g;
    if (ib >= 0) A[ib][ib] += g;
    if (ia >= 0 && ib >= 0) { A[ia][ib] -= g; A[ib][ia] -= g; }
  };
  const stampCurrentIntoNode = (node, current) => {
    const i = nodeIdx(node);
    if (i >= 0) z[i] += current;
  };

  for (const el of elements) {
    if (el.kind === "R") {
      stampConductance(el.a, el.b, 1 / el.value);
    } else if (el.kind === "C") {
      if (mode === "op") continue; // kapasitor = buka saat DC
      const g = el.value / h;
      stampConductance(el.a, el.b, g);
      const vA = vPrev[nodeIdx(el.a)] ?? 0;
      const vB = vPrev[nodeIdx(el.b)] ?? 0;
      const vprev = vA - vB;
      stampCurrentIntoNode(el.a, g * vprev);
      stampCurrentIntoNode(el.b, -g * vprev);
    } else if (el.kind === "L") {
      if (mode === "op") continue; // ditangani sebagai sumber tegangan 0V
      const g = h / el.value;
      stampConductance(el.a, el.b, g);
      const iprev = iPrev.get(el.name) ?? 0;
      stampCurrentIntoNode(el.a, -iprev);
      stampCurrentIntoNode(el.b, iprev);
    } else if (el.kind === "I") {
      const val = evalSource(el, t);
      // arus mengalir dari el.a ke el.b melalui sumber
      stampCurrentIntoNode(el.a, -val);
      stampCurrentIntoNode(el.b, val);
    }
  }

  vSources.forEach((el, k) => {
    const col = numNodes + k;
    const ia = nodeIdx(el.a), ib = nodeIdx(el.b);
    const val = el.kind === "V" ? evalSource(el, t) : 0; // L saat op = kawat 0V
    if (ia >= 0) { A[ia][col] += 1; A[col][ia] += 1; }
    if (ib >= 0) { A[ib][col] -= 1; A[col][ib] -= 1; }
    z[col] = val;
  });

  const x = solveLinear(A, z);

  const voltages = new Array(numNodes).fill(0);
  for (let i = 0; i < numNodes; i++) voltages[i] = x[i];

  const vCurrents = new Map();
  vSources.forEach((el, k) => vCurrents.set(el.name, x[numNodes + k]));

  return { voltages, vCurrents };
}

// ---------------------------------------------------------------
// API utama
// ---------------------------------------------------------------
export function solveDC(netlist) {
  const { elements } = netlist;
  const nodeIndex = buildNodes(elements);
  const { voltages, vCurrents } = analyzeOnce(elements, nodeIndex, { mode: "op", t: 0, h: 1e-6, vPrev: null, iPrev: null });

  const nodeVoltages = {};
  for (const [name, i] of nodeIndex) nodeVoltages[name] = voltages[i];
  nodeVoltages["0"] = 0;

  const sourceCurrents = {};
  for (const el of elements) {
    if (el.kind === "V") sourceCurrents[el.name] = vCurrents.get(el.name) ?? 0;
    if (el.kind === "L") sourceCurrents[el.name] = vCurrents.get(el.name) ?? 0; // arus induktor saat DC
  }
  const power = {};
  for (const el of elements) {
    if (el.kind === "V") {
      const val = evalSource(el, 0);
      power[el.name] = val * (vCurrents.get(el.name) ?? 0);
    }
  }
  return { nodeVoltages, sourceCurrents, power };
}

export function runTransient(netlist, options = {}) {
  const { elements } = netlist;
  const tran = netlist.analyses.find((a) => a.type === "tran") ?? { tstep: 0, tstop: 1e-3, tstart: 0 };
  const tstop = options.tstop ?? tran.tstop ?? 1e-3;
  const steps = options.steps ?? 500;
  const h = tstop / steps;
  const nodeIndex = buildNodes(elements);

  // kondisi awal dari analisis titik kerja DC
  const init = analyzeOnce(elements, nodeIndex, { mode: "op", t: 0, h, vPrev: null, iPrev: null });
  let vPrev = init.voltages.slice();
  const iPrev = new Map();
  for (const el of elements) if (el.kind === "L") iPrev.set(el.name, init.vCurrents.get(el.name) ?? 0);

  const nodeNames = [...nodeIndex.keys()];
  const traces = { time: [], node: {}, nodeVoltages: nodeNames };
  for (const nm of nodeNames) traces.node[nm] = [];

  traces.time.push(0);
  for (const nm of nodeNames) traces.node[nm].push(vPrev[nodeIndex.get(nm)]);

  let t = 0;
  for (let s = 1; s <= steps; s++) {
    t = s * h;
    const { voltages, vCurrents } = analyzeOnce(elements, nodeIndex, { mode: "tran", t, h, vPrev, iPrev });
    traces.time.push(t);
    for (const nm of nodeNames) traces.node[nm].push(voltages[nodeIndex.get(nm)]);
    for (const el of elements) if (el.kind === "L") iPrev.set(el.name, vCurrents.get(el.name) ?? 0);
    vPrev = voltages.slice();
  }

  return traces;
}

// ---------------------------------------------------------------
// Utilitas: format angka untuk tampilan
// ---------------------------------------------------------------
export function formatEngineering(value) {
  if (value === undefined || value === null || Number.isNaN(value)) return "-";
  if (!Number.isFinite(value)) return value > 0 ? "∞" : "-∞";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs === 0) return "0";
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(3)} M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(3)} k`;
  if (abs >= 1) return `${sign}${abs.toFixed(4)}`;
  if (abs >= 1e-3) return `${sign}${(abs * 1e3).toFixed(3)} m`;
  if (abs >= 1e-6) return `${sign}${(abs * 1e6).toFixed(3)} µ`;
  if (abs >= 1e-9) return `${sign}${(abs * 1e9).toFixed(3)} n`;
  return `${sign}${(abs * 1e12).toFixed(3)} p`;
}
