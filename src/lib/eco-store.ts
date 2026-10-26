import { useCallback, useEffect, useState } from "react";

export type Tone = "green" | "amber" | "sky" | "rose";

export interface SectionItem {
  id: string;
  image: string;
  badge: string;
  title: string;
  desc: string;
  infoLabel: string;
  infoValue: string;
  tone: Tone;
}

export interface Section {
  title: string;
  subtitle: string;
  items: SectionItem[];
}

export interface Stat {
  id: string;
  label: string;
  value: string;
  icon: "tree" | "scale" | "water" | "users" | "leaf" | "sun";
  tone: Tone;
  auto?: boolean;
}

export interface Plant {
  id: string;
  code: string;
  name: string;
  scientific: string;
  category: string;
  location: string;
  recordType: "individual" | "group";
  quantity: number;
  photo: string;
  desc: string;
  benefits: string;
  isPublished: boolean;
  updatedAt: string;
}

export interface Site {
  name: string;
  school: string;
  coverImage: string;
  coverBadge: string;
  coverTitle: string;
  coverDesc: string;
  footer: string;
  qrBaseUrl: string;
}

export interface EcoData {
  site: Site;
  stats: Stat[];
  plants: Plant[];
  plantSection: { title: string; subtitle: string };
  categories: string[];
  locations: string[];
  waste: Section;
  water: Section;
  activities: Section;
  credentials: { username: string; password: string };
  nextPlantNo: number;
}

const u = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`;
export const uid = () => Math.random().toString(36).slice(2, 10);

export const defaultData: EcoData = {
  site: {
    name: "Eco Digital Green School",
    school: "SDN 1 Palapa, Bandar Lampung",
    coverImage: u("photo-1542601906990-b4d3fb778b09").replace("w=800", "w=1600"),
    coverBadge: "SDN 1 Palapa",
    coverTitle: "Eco Digital Green School",
    coverDesc:
      "Sistem informasi terpadu pemantauan inventaris tanaman, pengelolaan sampah, konservasi air, dan aksi hijau siswa untuk mewujudkan sekolah adiwiyata yang mandiri dan berkelanjutan.",
    footer: "© 2026 Eco Digital Green School — SDN 1 Palapa, Bandar Lampung. All rights reserved.",
    qrBaseUrl: "https://sdn1palapa.sch.id/eco/tanaman/",
  },
  stats: [
    { id: "s1", label: "Total Tanaman", value: "0", icon: "tree", tone: "green", auto: true },
    { id: "s2", label: "Sampah Terkelola", value: "145 Kg", icon: "scale", tone: "amber" },
    { id: "s3", label: "Titik Biopori", value: "24 Titik", icon: "water", tone: "sky" },
    { id: "s4", label: "Aksi Hijau Bulan Ini", value: "8 Kegiatan", icon: "users", tone: "green" },
  ],
  plantSection: {
    title: "Inventaris Tanaman Eco School",
    subtitle: "Pendataan tanaman ber-QR Code permanen SAPAL-PLT-XXXX",
  },
  categories: ["Tanaman Hias", "Tanaman Bunga", "Tanaman Buah", "Tanaman Obat (TOGA)", "Tanaman Peneduh", "Tanaman Pangan"],
  locations: ["Taman Depan Kelas 3C", "Halaman Utama Sekolah", "Apotek Hidup UKS", "Kebun Sekolah Belakang"],
  plants: [
    {
      id: "p1", code: "SAPAL-PLT-0001", name: "Lidah Buaya", scientific: "Aloe vera",
      category: "Tanaman Obat (TOGA)", location: "Apotek Hidup UKS", recordType: "group", quantity: 5,
      photo: u("photo-1596727147705-61a532a659bd"),
      desc: "Tanaman berdaging tebal yang memiliki banyak khasiat untuk perawatan kulit dan rambut.",
      benefits: "Meredakan luka bakar ringan dan menyuburkan rambut.", isPublished: true, updatedAt: "2026-10-26",
    },
    {
      id: "p2", code: "SAPAL-PLT-0002", name: "Pohon Mangga Harum Manis", scientific: "Mangifera indica",
      category: "Tanaman Buah", location: "Halaman Utama Sekolah", recordType: "individual", quantity: 1,
      photo: u("photo-1553279768-865429fa0078"),
      desc: "Pohon buah peneduh yang menghasilkan buah manis segar saat musim panen.",
      benefits: "Menyediakan buah kaya vitamin C dan peneduh halaman.", isPublished: true, updatedAt: "2026-10-25",
    },
  ],
  nextPlantNo: 3,
  waste: {
    title: "Log Pengelolaan Sampah Harian",
    subtitle: "Pencatatan volume dan kategori pemilahan sampah di lingkungan sekolah",
    items: [
      { id: "w1", image: u("photo-1585320806297-9794b3e4eeae"), badge: "Organik", title: "Pengomposan Daun & Sisa Makanan", desc: "Diolah menjadi pupuk kompos padat dan cair untuk menyuburkan taman dan kebun sekolah SDN 1 Palapa.", infoLabel: "Terkumpul", infoValue: "68.5 Kg", tone: "green" },
      { id: "w2", image: u("photo-1532996122724-e3c354a0b15b"), badge: "Anorganik / Daur Ulang", title: "Bank Sampah & Kerajinan", desc: "Botol plastik dan kertas dipilah dan disetorkan ke bank sampah atau diolah menjadi kerajinan kreatif.", infoLabel: "Terkumpul", infoValue: "45.0 Kg", tone: "amber" },
      { id: "w3", image: u("photo-1611284446314-60a58ac0deb9"), badge: "Residu", title: "Penanganan Residu & Pembuangan", desc: "Sampah yang tidak dapat didaur ulang dikelola melalui Tempat Pembuangan Akhir secara terstruktur.", infoLabel: "Terkumpul", infoValue: "31.5 Kg", tone: "rose" },
    ],
  },
  water: {
    title: "Konservasi Air & Biopori",
    subtitle: "Pemantauan titik resapan air hujan dan pemeliharaan saluran drainase sekolah",
    items: [
      { id: "a1", image: u("photo-1544816155-12df9643f363"), badge: "Resapan", title: "Lubang Resapan Biopori", desc: "Pembuatan dan perawatan 24 titik lubang biopori di sekitar taman sekolah untuk mencegah genangan dan menyuburkan tanah.", infoLabel: "Status", infoValue: "24 Titik Aktif & Dirawat", tone: "sky" },
      { id: "a2", image: u("photo-1518837695005-2083093ee35b"), badge: "Hujan", title: "Pemanenan Air Hujan", desc: "Sistem penampungan air hujan dari atap gedung sekolah yang digunakan kembali untuk menyiram tanaman.", infoLabel: "Kapasitas Tangki", infoValue: "1.000 Liter", tone: "sky" },
      { id: "a3", image: u("photo-1509391365360-2e959784a276"), badge: "Drainase", title: "Kebersihan Saluran Air", desc: "Pembersihan saluran air dan got sekolah secara berkala oleh siswa dan petugas kebersihan sekolah.", infoLabel: "Jadwal", infoValue: "Pembersihan Mingguan", tone: "sky" },
    ],
  },
  activities: {
    title: "Agenda Aksi Hijau & Relawan",
    subtitle: "Jadwal kegiatan jumat bersih, perawatan taman, dan patroli lingkungan siswa SDN 1 Palapa",
    items: [
      { id: "k1", image: u("photo-1581092160607-ee22621dd758"), badge: "Mingguan", title: "Jumat Bersih & Pemilahan Sampah", desc: "Kegiatan gotong royong seluruh siswa kelas 3C membersihkan lingkungan kelas dan memilah sampah.", infoLabel: "Setiap Jumat 07.30", infoValue: "Aktif", tone: "green" },
      { id: "k2", image: u("photo-1592417817098-8f3d691a4bf5"), badge: "Rutin", title: "Patroli Tanaman & Perawatan TOGA", desc: "Siswa piket merawat, menyiram, dan mencatat pertumbuhan tanaman obat keluarga di apotek hidup UKS.", infoLabel: "Selasa & Kamis", infoValue: "Aktif", tone: "green" },
      { id: "k3", image: u("photo-1517486808906-6ca8b3f04846"), badge: "Bulanan", title: "Klub Eco-Hero & Daur Ulang", desc: "Pelatihan kreatif mengubah sampah botol plastik menjadi pot tanaman gantung dan hiasan kelas.", infoLabel: "Setiap Akhir Bulan", infoValue: "Aktif", tone: "green" },
    ],
  },
  credentials: { username: "admin", password: "palapa2026" },
};

const KEY = "eco-green-school-v1";

export function useEcoStore() {
  const [data, setData] = useState<EcoData>(defaultData);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setData({ ...defaultData, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      alert("Penyimpanan browser penuh. Gunakan foto berukuran lebih kecil.");
    }
  }, [data, ready]);

  const update = useCallback((fn: (d: EcoData) => EcoData) => setData((d) => fn(d)), []);
  const reset = useCallback(() => setData(defaultData), []);
  return { data, update, setData, reset, ready };
}

export function nextPlantCode(n: number) {
  return `SAPAL-PLT-${String(n).padStart(4, "0")}`;
}

/** Compress an uploaded image to a JPEG data URL so it fits in browser storage. */
export function fileToDataUrl(file: File, maxW = 1400, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function plantsToCsv(plants: Plant[]) {
  const esc = (s: string | number) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const head = "Kode,Nama,Nama Ilmiah,Kategori,Lokasi,Jenis,Jumlah,Deskripsi,Manfaat,Status,Diperbarui\n";
  return head + plants.map((p) =>
    [p.code, p.name, p.scientific, p.category, p.location, p.recordType === "group" ? "Kelompok" : "Individual", p.quantity, p.desc, p.benefits, p.isPublished ? "Tampil" : "Disembunyikan", p.updatedAt].map(esc).join(","),
  ).join("\n");
}
