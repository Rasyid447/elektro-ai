# ⚡ ElektroAI — Asisten Rancang Alat Elektronika

Web AI yang membantu mahasiswa dan engineer **teknik elektronika** merancang alat dari nol:
konsep → blok diagram → komponen/BOM → review rangkaian → kode mikrokontroler.

Ditenagai OpenAI (GPT) dengan *system prompt* khusus elektronika (perhitungan nyata,
perhatian pada level logika 3.3V/5V, dekoupling, keselamatan listrik, ketersediaan komponen di Indonesia).

---

## 🚀 Cara menjalankan

### 1. Siapkan API key OpenAI
1. Buka <https://platform.openai.com/api-keys> dan login.
2. Klik **Create new secret key**, salin key-nya (format `sk-...`).
   - Butuh saldo di platform OpenAI (pemakaian model `gpt-4o-mini` sangat murah untuk percakapan normal).

> Alternatif gratis untuk coba-coba: ganti isi file `src/app/api/chat/route.ts` agar mendukung
> provider lain (mis. Google Gemini), atau gunakan endpoint kompatibel OpenAI lain yang Anda miliki.

### 2. Jalankan aplikasi

```powershell
cd C:\Users\anjar\Documents\elektro-ai
npm run dev
```

Buka browser: **<http://localhost:3000**

### 3. Masukkan API key
Klik **⚙️ Pengaturan API** di sidebar → tempel API key → **Simpan pengaturan**.
Key disimpan di browser Anda (localStorage) dan dikirim langsung ke server lokal — tidak dikirim ke pihak lain.

> Opsional: salin `.env.local.example` menjadi `.env.local` lalu isi `OPENAI_API_KEY`
> jika ingin key disimpan di server, bukan di browser.

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

- Jawaban *streaming* (muncul bertahap seperti ChatGPT) dan bisa dihentikan kapan saja
- Render Markdown: tabel, daftar, highlight kode, tombol **Salin** di setiap blok kode
- Riwayat percakapan tersimpan otomatis di browser (localStorage)
- Bisa memilih/mengganti model GPT (`gpt-4o-mini`, `gpt-4o`, `gpt-4.1`, atau ketik manual)
- Tampilan responsif: sidebar jadi laci menu di layar HP

## 📁 Struktur proyek

```
elektro-ai/
├── src/
│   ├── app/
│   │   ├── api/chat/route.ts   ← backend: streaming ke OpenAI
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── App.tsx             ← state utama + penyimpanan riwayat + panel simulator
│   │   ├── Sidebar.tsx         ← mode, riwayat, pengaturan API
│   │   ├── ChatView.tsx        ← tampilan chat, input, tombol "Simulasikan"
│   │   ├── Simulator.tsx       ← editor netlist, diagram, tabel hasil, grafik
│   │   └── MarkdownContent.tsx ← render markdown + highlight kode
│   └── lib/
│       ├── prompts.ts          ← system prompt ahli elektronika + 5 mode
│       ├── spice.js            ← mesin simulator SPICE (parser + solver MNA)
│       └── types.ts
├── .env.local.example
└── package.json
```

## 🔧 Perintah berguna

```powershell
npm run dev     # server pengembangan (http://localhost:3000)
npm run build   # versi produksi
npm start       # jalankan versi produksi
```

## 🌐 Cara upload ke internet (deploy)

Web ini memakai backend kecil (`/api/chat`) untuk menelepon OpenAI, jadi butuh hosting yang
mendukung Next.js. Cara termudah & gratis (tanpa perlu git):

**Vercel (disarankan):**
1. Buka Terminal di folder project, jalankan: `npx vercel`
2. Ikuti petunjuk → login lewat browser (buat akun gratis) → jawab *Yes* untuk pertanyaan awal.
3. Setelah selesai, jalankan `npx vercel --prod` → Anda dapat alamat publik, mis. `https://elektro-ai-xxx.vercel.app`.
4. Buka alamat itu di browser mana pun, lalu masukkan API key OpenAI di menu **⚙️ Pengaturan API**.

**Alternatif:** Netlify (`npx netlify-cli deploy --build --prod`) atau, bila ingin gratis tanpa
server, ubah ke mode statis lalu host di GitHub Pages/Cloudflare Pages.

> Setelah online, API key tetap hanya disimpan di browser pengguna masing-masing — jangan dibagikan.

## ⚠️ Catatan keselamatan

Hasil desain dari AI tetap **wajib diverifikasi** (simulasi LTspice/Tinkercad/Wokwi,
cek datasheet resmi, uji bertahap dengan tegangan rendah). Untuk proyek bertegangan tinggi
atau menyentuh jaringan listrik 220V, selalu dampingi dosen/inspektor yang berkompeten.
