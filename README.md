# ⚡ ElektroAI — Asisten Rancang Alat Elektronika

Web AI yang membantu mahasiswa dan engineer **teknik elektronika** merancang alat dari nol:
konsep → blok diagram → komponen/BOM → review rangkaian → kode mikrokontroler.

Ditenagai OpenAI (GPT) dengan *system prompt* khusus elektronika (perhitungan nyata,
perhatian pada level logika 3.3V/5V, dekoupling, keselamatan listrik, ketersediaan komponen di Indonesia).

---

## 🚀 Cara menjalankan

### 1. Siapkan API key (pilih salah satu)

**Opsi A — Google Gemini (GRATIS, disarankan untuk mahasiswa):**
1. Buka <https://aistudio.google.com> dan login dengan akun Google.
2. Klik **Get API key** → **Create API key** → salin (format `AIza...`).
3. Di web: menu **⚙️ Pengaturan AI** → pilih **Gemini (Gratis)** → tempel key → **Tes koneksi** → **Simpan**.

**Opsi B — OpenAI (kualitas jawaban teknis paling kuat, berbayar):**
1. Buka <https://platform.openai.com/api-keys> → **Create new secret key** → salin (`sk-...`).
2. Butuh saldo; model `gpt-4o-mini` sangat murah untuk percakapan normal.
3. Di web: **⚙️ Pengaturan AI** → pilih **OpenAI** → tempel key → **Tes koneksi** → **Simpan**.

> Kedua penyedia dipanggil langsung dari browser Anda (tanpa server), jadi web ini bisa
> di-hosting statis gratis. Key hanya disimpan di localStorage browser Anda sendiri.

### 2. Jalankan aplikasi

```powershell
cd C:\Users\anjar\Documents\elektro-ai
npm run dev
```

Buka browser: **<http://localhost:3000**

### 3. Masukkan API key di web
Klik **⚙️ Pengaturan AI** di sidebar → pilih penyedia (Gemini gratis / OpenAI) → tempel key → **Tes koneksi** → **Simpan**.
Key hanya disimpan di browser Anda (localStorage) dan dikirim langsung ke penyedia AI.

> Karena tidak ada backend, web ini murni statis — cocok untuk GitHub Pages / Cloudflare Pages.

---

## 🧭 Mode keahlian

| Mode | Fungsi |
| --- | --- |
| 🧭 **Bimbingan Desain Alat** | Memandu dari ide mentah: klarifikasi kebutuhan, blok diagram, pilihan mikrokontroler, rincian rangkaian, rencana pembuatan & uji |
| 🧩 **Komponen & BOM** | Tabel BOM lengkap (nilai, spesifikasi, fungsi, harga Rp), alternatif komponen, tips pengadaan & mengenali komponen palsu |
| 🔍 **Review Rangkaian** | Audit skema: temuan KRITIS / PENTING / SARAN, solusi berhitung, langkah uji ulang |
| 💻 **Kode Mikrokontroler** | Kode Arduino/ESP32/STM32 lengkap + library + tabel koneksi pin + langkah upload & uji |
| 🧪 **Desain & Simulasi** | Rancang rangkaian lalu langsung simulasikan (tegangan DC & grafik transient) langsung di web |

## 🧪 Simulator Rangkaian (open source, jalan di browser)

Anda bisa **merancang sekaligus mensimulasikan** rangkaian tanpa keluar dari web.

- Mesin simulasi **SPICE buatan sendiri** (Modified Nodal Analysis + Backward Euler), berjalan **100% di browser** — tanpa server, tanpa layanan luar.
- Analisis **Titik Kerja DC** (`.op`) dan **Transien** (`.tran`) untuk **R, C, L, sumber tegangan (DC/PULSE/SIN), dan sumber arus**.
- Tampilan: diagram koneksi ber-simbol, tabel tegangan node & arus sumber, dan **grafik tegangan vs waktu** (bisa pilih node).
- Tombol **"🧪 Simulasikan rangkaian ini"** muncul otomatis di chat tiap kali AI menghasilkan netlist.
- Contoh siap pakai: pembagi tegangan, filter RC, resonansi RLC, rangkaian arus, induktor.

Contoh netlist yang dimengerti simulator:

```spice
Filter RC low-pass
V1 vin 0 PULSE(0 5 0 1n 1n 50m 100m)
R1 vin vout 1k
C1 vout 0 1u
.tran 0 5m
.end
```

> Supaya handal, simulator menerima elemen linear (R/C/L/V/I). Transistor & op-amp dijelaskan AI
> secara teori, atau rujuk ke simulator eksternal seperti LTspice.

## ✨ Fitur lain

- **Dua penyedia AI**: OpenAI (GPT) & Google Gemini (gratis) — ganti lewat menu Pengaturan, lengkap dengan tombol **Tes koneksi**
- **Panduan singkat (onboarding)** untuk pemula saat pertama membuka web
- Jawaban *streaming* (muncul bertahap seperti ChatGPT) dan bisa dihentikan kapan saja
- Tombol **⟳ Ulangi** untuk memunculkan ulang jawaban, dan **📋 Salin** di tiap balasan
- Contoh pertanyaan sekali klik di layar sambutan
- Render Markdown: tabel, daftar, highlight kode, tombol **Salin** di setiap blok kode
- Riwayat percakapan tersimpan otomatis di browser (localStorage)
- **PWA**: bisa di-install sebagai aplikasi di HP/desktop (Add to Home Screen)
- Tampilan responsif: sidebar jadi laci menu di layar HP

## 📁 Struktur proyek

```
elektro-ai/
├── public/
│   ├── manifest.json           ← PWA (bisa di-install di HP)
│   └── icon.svg
├── src/
│   ├── app/
│   │   ├── layout.tsx          ← metadata + PWA
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── App.tsx             ← state utama + riwayat + simulator
│   │   ├── Sidebar.tsx         ← mode, riwayat, pengaturan AI (OpenAI/Gemini)
│   │   ├── ChatView.tsx        ← chat, tombol Simulasikan / Ulangi / Salin
│   │   ├── Simulator.tsx       ← editor netlist, diagram, tabel, grafik
│   │   ├── Onboarding.tsx      ← panduan singkat untuk pemula
│   │   └── MarkdownContent.tsx ← render markdown + highlight kode
│   └── lib/
│       ├── prompts.ts          ← system prompt ahli elektronika + 5 mode
│       ├── providers.ts        ← lapisan AI: OpenAI & Gemini (streaming)
│       ├── spice.js            ← mesin simulator SPICE (parser + solver MNA)
│       └── types.ts
└── package.json
```

## 🔧 Perintah berguna

```powershell
npm run dev     # server pengembangan lokal (http://localhost:3000)
npm run build   # ekspor situs statis ke folder out/
```

## 🌐 Cara upload ke internet (deploy)

Karena web ini **murni statis** (AI dipanggil langsung dari browser), isi folder hasil build
(`out/`) bisa di-hosting gratis di banyak layanan:

**Netlify (paling mudah — tinggal seret & lepas):**
1. `npm run build`
2. Buka <https://app.netlify.com/drop> → seret folder `out/` ke halaman itu → langsung dapat link publik.

**GitHub Pages:**
1. `npm run build` (untuk project page, tambahkan env `NEXT_PUBLIC_BASE_PATH=/<nama-repo>`).
2. Unggah isi `out/` ke cabang `gh-pages`, lalu **Settings → Pages → Deploy from a branch** → `gh-pages` / root.

**Cloudflare Pages / Vercel:** buat project → build command `npm run build` → output directory `out`.

> Setelah online, API key tetap hanya disimpan di browser pengguna masing-masing — jangan dibagikan.

## ⚠️ Catatan keselamatan

Hasil desain dari AI tetap **wajib diverifikasi** (simulasi LTspice/Tinkercad/Wokwi,
cek datasheet resmi, uji bertahap dengan tegangan rendah). Untuk proyek bertegangan tinggi
atau menyentuh jaringan listrik 220V, selalu dampingi dosen/inspektor yang berkompeten.
