import { createFileRoute } from "@tanstack/react-router";
import { EcoApp } from "@/components/eco/EcoApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Eco Digital Green School - SDN 1 Palapa" },
      { name: "description", content: "Pemantauan inventaris tanaman, sampah, konservasi air, dan aksi hijau SDN 1 Palapa, Bandar Lampung." },
      { property: "og:title", content: "Eco Digital Green School - SDN 1 Palapa" },
      { property: "og:description", content: "Sekolah adiwiyata digital: tanaman ber-QR, bank sampah, biopori, dan kegiatan relawan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EcoApp,
});
