import type { NextConfig } from "next";

// Untuk GitHub Pages, situs disajikan di sub-path https://<user>.github.io/<repo>/,
// jadi basePath & assetPrefix diisi dari env NEXT_PUBLIC_BASE_PATH (diisi otomatis oleh
// GitHub Actions menjadi "/<nama-repo>"). Untuk lokal dibiarkan kosong.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  // Ekspor statis agar bisa di-host gratis di GitHub Pages / Cloudflare Pages.
  output: "export",
  basePath,
  assetPrefix: basePath || undefined,
};

export default nextConfig;
