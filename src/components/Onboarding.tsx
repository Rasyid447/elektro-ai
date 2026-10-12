"use client";

export default function Onboarding({
  open,
  onClose,
  onOpenSettings,
}: {
  open: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}) {
  if (!open) return null;

  const steps = [
    {
      icon: "💬",
      title: "Tanya & rancang alat",
      desc: "Ceritakan alat yang ingin dibuat. AI ahli elektronika akan memandu dari konsep, blok diagram, komponen, sampai kode mikrokontroler.",
    },
    {
      icon: "🧪",
      title: "Simulasikan rangkaian",
      desc: "Tiap jawaban bisa langsung disimulasikan: tegangan DC dan grafik transient (RC/RLC) berjalan di browser Anda, tanpa instalasi.",
    },
    {
      icon: "🎯",
      title: "Pilih mode sesuai kebutuhan",
      desc: "5 mode siap pakai: desain alat, komponen & BOM, review rangkaian, kode mikrokontroler, dan desain + simulasi.",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-700 bg-[#0f1424] p-6 shadow-2xl">
        <div className="flex items-center gap-2">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-500 text-xl">
            ⚡
          </span>
          <div>
            <h2 className="text-xl font-bold text-white">Selamat datang di ElektroAI</h2>
            <p className="text-xs text-slate-500">Teman seperjuangan mahasiswa teknik elektronika</p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {steps.map((s) => (
            <div key={s.title} className="flex gap-3 rounded-xl border border-slate-800 bg-[#0a0e17] p-3">
              <span className="text-2xl">{s.icon}</span>
              <div>
                <h3 className="text-sm font-semibold text-slate-200">{s.title}</h3>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
          <h3 className="text-sm font-semibold text-amber-300">⚙️ Satu langkah penting</h3>
          <p className="mt-1 text-xs leading-relaxed text-amber-200/80">
            Supaya AI bisa menjawab, masukkan API key sekali saja di menu{" "}
            <b>Pengaturan AI</b>. Pilih <b>Gemini (gratis)</b> bila tidak mau bayar, atau{" "}
            <b>OpenAI</b> untuk kualitas jawaban teknis terbaik. Key disimpan hanya di browser
            Anda.
          </p>
          <button
            onClick={onOpenSettings}
            className="mt-2 w-full rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-amber-950 transition hover:bg-amber-400"
          >
            Buka Pengaturan AI sekarang
          </button>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-slate-800"
          >
            Lewati
          </button>
          <button
            onClick={onClose}
            className="flex-[2] rounded-lg bg-gradient-to-r from-sky-500 to-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Mengerti, mulai! 🚀
          </button>
        </div>
      </div>
    </div>
  );
}
