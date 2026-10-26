import { useEffect, useMemo, useState, type ReactNode } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import {
  ArrowDown, ArrowUp, CalendarDays, Camera, ChartPie, Clock, Download, Droplet, Eye, EyeOff, FileSpreadsheet,
  Leaf, LogIn, LogOut, MapPin, Pencil, Plus, QrCode, Recycle, RotateCcw, Scale, Settings, ShieldCheck,
  Sprout, Sun, Trash2, Trees, Upload, UserCheck, Users, Waves, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  defaultData, nextPlantCode, plantsToCsv, uid, useEcoStore,
  type EcoData, type Plant, type Section, type SectionItem, type Site, type Stat,
} from "@/lib/eco-store";
import { Field, ImageField, Modal, selectCls, toneOptions, toneText } from "./fields";

type SectionKey = "waste" | "water" | "activities";
type TabKey = "dashboard" | "plants" | SectionKey;

const statIcons = { tree: Trees, scale: Scale, water: Waves, users: Users, leaf: Leaf, sun: Sun };
const FALLBACK = "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=800&q=80";

function download(name: string, content: string, type: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
}

function EditChip({ onClick, label = "Edit", icon }: { onClick: () => void; label?: string; icon?: ReactNode }) {
  return (
    <Button size="sm" variant="admin" onClick={onClick} className="h-7 px-2.5 text-xs">
      {icon ?? <Pencil />} {label}
    </Button>
  );
}

export function EcoApp() {
  const { data, update, setData, reset } = useEcoStore();
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState<TabKey>("dashboard");

  // modal state
  const [loginOpen, setLoginOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [coverOpen, setCoverOpen] = useState(false);
  const [statEdit, setStatEdit] = useState<Stat | null>(null);
  const [plantEdit, setPlantEdit] = useState<Plant | "new" | null>(null);
  const [plantDetail, setPlantDetail] = useState<Plant | null>(null);
  const [sectionHead, setSectionHead] = useState<SectionKey | "plants" | null>(null);
  const [itemEdit, setItemEdit] = useState<{ key: SectionKey; item: SectionItem | null } | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem("eco-admin") === "1") setIsAdmin(true);
  }, []);

  const publishedCount = data.plants.filter((p) => p.isPublished).length;

  const logout = () => {
    if (!confirm("Keluar dari akun admin?")) return;
    setIsAdmin(false);
    sessionStorage.removeItem("eco-admin");
    toast("Anda keluar dari mode admin");
  };

  const tabs: { key: TabKey; label: string; icon: typeof ChartPie }[] = [
    { key: "dashboard", label: "Dashboard", icon: ChartPie },
    { key: "plants", label: "Inventaris Tanaman", icon: Trees },
    { key: "waste", label: "Pengelolaan Sampah", icon: Recycle },
    { key: "water", label: "Konservasi Air", icon: Droplet },
    { key: "activities", label: "Kegiatan & Relawan", icon: CalendarDays },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-header text-primary-foreground shadow-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-leaf p-2 text-leaf-foreground shadow-inner"><Sprout className="h-5 w-5" /></div>
            <div>
              <h1 className="font-display text-lg font-semibold leading-tight">{data.site.name}</h1>
              <p className="text-xs opacity-80">{data.site.school}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1.5 text-xs font-medium sm:inline-flex">
              {isAdmin ? <UserCheck className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
              {isAdmin ? "Admin SDN 1 Palapa" : "Mode Publik"}
            </span>
            {isAdmin && (
              <Button size="sm" variant="glass" onClick={() => setSettingsOpen(true)}>
                <Settings /> <span className="hidden sm:inline">Pengaturan</span>
              </Button>
            )}
            {isAdmin ? (
              <Button size="sm" variant="hero" onClick={logout}><LogOut /> Logout</Button>
            ) : (
              <Button size="sm" variant="hero" onClick={() => setLoginOpen(true)}><LogIn /> Login Admin</Button>
            )}
          </div>
        </div>
        {isAdmin && (
          <div className="bg-sun py-1 text-center text-[11px] font-semibold text-sun-foreground">
            Mode Admin aktif — klik tombol kuning "Edit" untuk mengubah teks, foto sampul, dan semua isi halaman.
          </div>
        )}
      </header>

      {/* Nav */}
      <nav className="sticky top-[61px] z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl gap-6 overflow-x-auto px-4">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 py-3 text-sm transition-colors ${
                tab === t.key ? "border-leaf font-semibold text-primary" : "border-transparent text-muted-foreground hover:text-primary"
              }`}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="mx-auto w-full max-w-7xl flex-grow space-y-6 px-4 py-6">
        {tab === "dashboard" && (
          <section className="space-y-6">
            <div className="relative flex h-64 items-end overflow-hidden rounded-2xl shadow-soft sm:h-96">
              <img src={data.site.coverImage || FALLBACK} alt="Foto sampul" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-hero-overlay" />
              {isAdmin && (
                <div className="absolute right-4 top-4 z-10">
                  <EditChip onClick={() => setCoverOpen(true)} label="Edit Sampul" icon={<Camera />} />
                </div>
              )}
              <div className="relative z-10 p-6 text-primary-foreground sm:p-10">
                {data.site.coverBadge && (
                  <span className="mb-3 inline-block rounded-full bg-leaf px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-leaf-foreground shadow">
                    {data.site.coverBadge}
                  </span>
                )}
                <h2 className="mb-2 font-display text-3xl font-semibold sm:text-5xl">{data.site.coverTitle}</h2>
                <p className="max-w-2xl text-xs leading-relaxed opacity-90 sm:text-sm">{data.site.coverDesc}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {data.stats.map((s) => {
                const Icon = statIcons[s.icon] ?? Leaf;
                return (
                  <div key={s.id} className="group relative flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
                    <div className={`rounded-xl border p-3 ${toneText[s.tone]}`}><Icon className="h-5 w-5" /></div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                      <h3 className="text-xl font-bold">{s.auto ? publishedCount : s.value}</h3>
                    </div>
                    {isAdmin && (
                      <button onClick={() => setStatEdit(s)} className="absolute right-2 top-2 rounded-md bg-sun p-1.5 text-sun-foreground" title="Edit">
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {tabs.slice(1).map((t) => (
                <button key={t.key} onClick={() => setTab(t.key)} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-leaf">
                  <t.icon className="h-5 w-5 text-leaf" />
                  <span className="text-sm font-semibold">{t.label}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {tab === "plants" && (
          <PlantsTab
            data={data}
            isAdmin={isAdmin}
            onAdd={() => setPlantEdit("new")}
            onEdit={setPlantEdit}
            onDetail={setPlantDetail}
            onEditHead={() => setSectionHead("plants")}
            onToggle={(id) => update((d) => ({ ...d, plants: d.plants.map((p) => (p.id === id ? { ...p, isPublished: !p.isPublished } : p)) }))}
            onDelete={(id) => {
              if (!confirm("Hapus permanen data tanaman ini?")) return;
              update((d) => ({ ...d, plants: d.plants.filter((p) => p.id !== id) }));
              toast.success("Data tanaman dihapus");
            }}
          />
        )}

        {(tab === "waste" || tab === "water" || tab === "activities") && (
          <SectionTab
            kind={tab}
            section={data[tab]}
            isAdmin={isAdmin}
            onEditHead={() => setSectionHead(tab)}
            onAdd={() => setItemEdit({ key: tab, item: null })}
            onEdit={(item) => setItemEdit({ key: tab, item })}
            onDelete={(id) => {
              if (!confirm("Hapus kartu ini?")) return;
              update((d) => ({ ...d, [tab]: { ...d[tab], items: d[tab].items.filter((i) => i.id !== id) } }));
            }}
            onMove={(id, dir) =>
              update((d) => {
                const items = [...d[tab].items];
                const i = items.findIndex((x) => x.id === id);
                const j = i + dir;
                if (j < 0 || j >= items.length) return d;
                const tmp = items[i]!;
                items[i] = items[j]!;
                items[j] = tmp;
                return { ...d, [tab]: { ...d[tab], items } };
              })
            }
          />
        )}
      </main>

      <footer className="mt-auto border-t border-border bg-card py-4 text-center text-xs text-muted-foreground">
        {data.site.footer}
      </footer>

      {/* Modals */}
      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        creds={data.credentials}
        onSuccess={() => {
          setIsAdmin(true);
          sessionStorage.setItem("eco-admin", "1");
          setLoginOpen(false);
          toast.success("Berhasil login sebagai Administrator!");
        }}
      />
      {settingsOpen && (
        <SettingsModal data={data} onClose={() => setSettingsOpen(false)} update={update} setData={setData} reset={reset} />
      )}
      {coverOpen && (
        <CoverModal site={data.site} onClose={() => setCoverOpen(false)} onSave={(site) => { update((d) => ({ ...d, site })); setCoverOpen(false); toast.success("Sampul diperbarui"); }} />
      )}
      {statEdit && (
        <StatModal stat={statEdit} onClose={() => setStatEdit(null)} onSave={(s) => { update((d) => ({ ...d, stats: d.stats.map((x) => (x.id === s.id ? s : x)) })); setStatEdit(null); toast.success("Statistik diperbarui"); }} />
      )}
      {sectionHead && (
        <HeadModal
          initial={sectionHead === "plants" ? data.plantSection : data[sectionHead]}
          onClose={() => setSectionHead(null)}
          onSave={(h) => {
            update((d) => (sectionHead === "plants" ? { ...d, plantSection: h } : { ...d, [sectionHead]: { ...d[sectionHead], ...h } }));
            setSectionHead(null);
            toast.success("Judul bagian diperbarui");
          }}
        />
      )}
      {itemEdit && (
        <ItemModal
          kind={itemEdit.key}
          item={itemEdit.item}
          onClose={() => setItemEdit(null)}
          onSave={(item) => {
            const key = itemEdit.key;
            update((d) => {
              const exists = d[key].items.some((i) => i.id === item.id);
              const items = exists ? d[key].items.map((i) => (i.id === item.id ? item : i)) : [...d[key].items, item];
              return { ...d, [key]: { ...d[key], items } };
            });
            setItemEdit(null);
            toast.success("Kartu disimpan");
          }}
        />
      )}
      {plantEdit && (
        <PlantModal
          plant={plantEdit === "new" ? null : plantEdit}
          data={data}
          onClose={() => setPlantEdit(null)}
          onSave={(p) => {
            if (plantEdit === "new") {
              const code = nextPlantCode(data.nextPlantNo);
              update((d) => ({ ...d, nextPlantNo: d.nextPlantNo + 1, plants: [...d.plants, { ...p, code }] }));
              toast.success(`Tanaman baru ditambahkan dengan kode ${code}`);
            } else {
              update((d) => ({ ...d, plants: d.plants.map((x) => (x.id === p.id ? p : x)) }));
              toast.success("Data tanaman diperbarui");
            }
            setPlantEdit(null);
          }}
        />
      )}
      {plantDetail && <PlantDetail plant={plantDetail} baseUrl={data.site.qrBaseUrl} onClose={() => setPlantDetail(null)} />}
    </div>
  );
}

/* ---------------- Plants ---------------- */

function PlantsTab({ data, isAdmin, onAdd, onEdit, onDetail, onToggle, onDelete, onEditHead }: {
  data: EcoData; isAdmin: boolean; onAdd: () => void; onEdit: (p: Plant) => void; onDetail: (p: Plant) => void;
  onToggle: (id: string) => void; onDelete: (id: string) => void; onEditHead: () => void;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [loc, setLoc] = useState("");
  const list = useMemo(
    () =>
      data.plants.filter((p) => {
        if (!isAdmin && !p.isPublished) return false;
        const s = q.toLowerCase();
        return (
          (p.name.toLowerCase().includes(s) || p.code.toLowerCase().includes(s) || p.scientific.toLowerCase().includes(s)) &&
          (!cat || p.category === cat) && (!loc || p.location === loc)
        );
      }),
    [data.plants, isAdmin, q, cat, loc],
  );
  const exportList = isAdmin ? data.plants : data.plants.filter((p) => p.isPublished);

  return (
    <section className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl font-semibold">{data.plantSection.title}</h2>
            {isAdmin && <EditChip onClick={onEditHead} />}
          </div>
          <p className="text-xs text-muted-foreground">{data.plantSection.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => download("inventaris_tanaman_sdn1palapa.csv", "\uFEFF" + plantsToCsv(exportList), "text/csv;charset=utf-8")}>
            <FileSpreadsheet /> Ekspor CSV
          </Button>
          {isAdmin && <Button size="sm" onClick={onAdd}><Plus /> Tambah Tanaman</Button>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama tanaman atau kode..." className="bg-card" />
        <select value={cat} onChange={(e) => setCat(e.target.value)} className={`${selectCls} bg-card`}>
          <option value="">Semua Kategori</option>
          {data.categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={loc} onChange={(e) => setLoc(e.target.value)} className={`${selectCls} bg-card`}>
          <option value="">Semua Lokasi</option>
          {data.locations.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      {list.length === 0 ? (
        <div className="py-10 text-center text-xs text-muted-foreground">Tidak ada data tanaman ditemukan.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => (
            <div key={p.id} className={`flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm ${p.isPublished ? "border-border" : "border-dashed border-sun opacity-70"}`}>
              <div className="relative h-44 bg-muted">
                <img src={p.photo || FALLBACK} alt={p.name} className="h-full w-full object-cover" />
                <span className="absolute left-2 top-2 rounded bg-foreground/70 px-2 py-0.5 font-mono text-[10px] font-bold text-background">{p.code}</span>
                {!p.isPublished && <span className="absolute right-2 top-2 rounded bg-sun px-2 py-0.5 text-[10px] font-bold text-sun-foreground">Disembunyikan</span>}
              </div>
              <div className="flex flex-grow flex-col p-4">
                <span className={`mb-1 w-max rounded border px-2 py-0.5 text-[10px] font-semibold ${toneText.green}`}>{p.category}</span>
                <h3 className="text-sm font-bold">{p.name}</h3>
                <p className="mb-2 text-[11px] italic text-muted-foreground">{p.scientific || "-"}</p>
                <p className="mb-4 line-clamp-2 flex-grow text-xs text-muted-foreground">{p.desc}</p>
                <div className="flex items-center justify-between gap-2 border-t border-border pt-3 text-xs">
                  <span className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-3.5 w-3.5 text-leaf" />{p.location} · {p.quantity}</span>
                  <div className="flex gap-1">
                    <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => onDetail(p)} title="Lihat Detail & QR"><QrCode /></Button>
                    {isAdmin && (
                      <>
                        <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => onToggle(p.id)} title={p.isPublished ? "Sembunyikan" : "Tampilkan"}>
                          {p.isPublished ? <EyeOff /> : <Eye />}
                        </Button>
                        <Button size="icon" variant="admin" className="h-8 w-8" onClick={() => onEdit(p)} title="Edit"><Pencil /></Button>
                        <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => onDelete(p.id)} title="Hapus"><Trash2 /></Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function PlantModal({ plant, data, onClose, onSave }: { plant: Plant | null; data: EcoData; onClose: () => void; onSave: (p: Plant) => void }) {
  const [f, setF] = useState<Plant>(
    plant ?? {
      id: uid(), code: "", name: "", scientific: "", category: data.categories[0] ?? "", location: data.locations[0] ?? "",
      recordType: "individual", quantity: 1, photo: "", desc: "", benefits: "", isPublished: true, updatedAt: "",
    },
  );
  const set = <K extends keyof Plant>(k: K, v: Plant[K]) => setF((x) => ({ ...x, [k]: v }));
  return (
    <Modal open onClose={onClose} title={plant ? "Edit Data Tanaman" : "Tambah Data Tanaman Baru"} description={plant ? plant.code : "Kode QR dibuat otomatis"}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ ...f, updatedAt: new Date().toISOString().slice(0, 10) });
        }}
      >
        <Field label="Nama Tanaman *"><Input required value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Contoh: Lidah Buaya" /></Field>
        <Field label="Nama Ilmiah"><Input value={f.scientific} onChange={(e) => set("scientific", e.target.value)} placeholder="Contoh: Aloe vera" /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Kategori *">
            <select className={selectCls} value={f.category} onChange={(e) => set("category", e.target.value)}>
              {[...new Set([...data.categories, f.category])].filter(Boolean).map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Lokasi *">
            <select className={selectCls} value={f.location} onChange={(e) => set("location", e.target.value)}>
              {[...new Set([...data.locations, f.location])].filter(Boolean).map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Jenis Pencatatan">
            <select className={selectCls} value={f.recordType} onChange={(e) => set("recordType", e.target.value as Plant["recordType"])}>
              <option value="individual">Individual</option>
              <option value="group">Kelompok</option>
            </select>
          </Field>
          <Field label="Jumlah"><Input type="number" min={1} value={f.quantity} onChange={(e) => set("quantity", Math.max(1, parseInt(e.target.value) || 1))} /></Field>
        </div>
        <ImageField label="Foto Tanaman" value={f.photo} onChange={(v) => set("photo", v)} maxW={900} />
        <Field label="Deskripsi & Ciri-Ciri *"><Textarea required rows={3} value={f.desc} onChange={(e) => set("desc", e.target.value)} /></Field>
        <Field label="Manfaat Tanaman"><Input value={f.benefits} onChange={(e) => set("benefits", e.target.value)} /></Field>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={f.isPublished} onChange={(e) => set("isPublished", e.target.checked)} /> Tampilkan untuk publik
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Batal</Button>
          <Button type="submit">Simpan Data</Button>
        </div>
      </form>
    </Modal>
  );
}

function PlantDetail({ plant, baseUrl, onClose }: { plant: Plant; baseUrl: string; onClose: () => void }) {
  const [qr, setQr] = useState("");
  const url = `${baseUrl}${plant.code}`;
  useEffect(() => {
    QRCode.toDataURL(url, { width: 512, margin: 2, errorCorrectionLevel: "H", color: { dark: "#14532d", light: "#ffffff" } }).then(setQr);
  }, [url]);
  return (
    <Modal open onClose={onClose} title={plant.name} description={plant.scientific || undefined}>
      <div className="space-y-4 text-sm">
        {plant.photo && <img src={plant.photo} alt={plant.name} className="h-44 w-full rounded-lg object-cover" />}
        <div className="flex flex-col items-center gap-2 rounded-xl bg-muted py-4">
          <span className={`rounded-full border px-2.5 py-1 font-mono text-[11px] font-bold ${toneText.green}`}>{plant.code}</span>
          {qr && <img src={qr} alt={`QR ${plant.code}`} className="h-40 w-40" />}
          <p className="text-[11px] text-muted-foreground">Pindai QR Code untuk membuka halaman informasi tanaman</p>
          {qr && (
            <a href={qr} download={`QR-${plant.code}.png`}><Button size="sm" variant="secondary"><Download /> Unduh QR</Button></a>
          )}
        </div>
        <dl className="space-y-1.5 text-xs">
          <div><strong>Kategori:</strong> {plant.category}</div>
          <div><strong>Lokasi:</strong> {plant.location}</div>
          <div><strong>Jumlah:</strong> {plant.quantity} ({plant.recordType === "group" ? "Kelompok" : "Individual"})</div>
          <div><strong>Deskripsi:</strong> {plant.desc}</div>
          <div><strong>Manfaat:</strong> {plant.benefits || "-"}</div>
          <div className="text-muted-foreground">Diperbarui: {plant.updatedAt}</div>
        </dl>
      </div>
    </Modal>
  );
}

/* ---------------- Generic sections ---------------- */

function SectionTab({ kind, section, isAdmin, onEditHead, onAdd, onEdit, onDelete, onMove }: {
  kind: SectionKey; section: Section; isAdmin: boolean; onEditHead: () => void; onAdd: () => void;
  onEdit: (i: SectionItem) => void; onDelete: (id: string) => void; onMove: (id: string, dir: number) => void;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl font-semibold">{section.title}</h2>
            {isAdmin && <EditChip onClick={onEditHead} />}
          </div>
          <p className="text-xs text-muted-foreground">{section.subtitle}</p>
        </div>
        {isAdmin && <Button size="sm" onClick={onAdd}><Plus /> Tambah Kartu</Button>}
      </div>
      {section.items.length === 0 && <p className="py-8 text-center text-xs text-muted-foreground">Belum ada data.</p>}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {section.items.map((it, idx) => (
          <div key={it.id} className="relative flex flex-col overflow-hidden rounded-xl border border-border bg-muted/50">
            <div className="h-40 overflow-hidden"><img src={it.image || FALLBACK} alt={it.title} className="h-full w-full object-cover" /></div>
            {isAdmin && (
              <div className="absolute right-2 top-2 flex gap-1">
                <Button size="icon" variant="secondary" className="h-7 w-7" disabled={idx === 0} onClick={() => onMove(it.id, -1)} title="Geser kiri"><ArrowUp /></Button>
                <Button size="icon" variant="secondary" className="h-7 w-7" disabled={idx === section.items.length - 1} onClick={() => onMove(it.id, 1)} title="Geser kanan"><ArrowDown /></Button>
                <Button size="icon" variant="admin" className="h-7 w-7" onClick={() => onEdit(it)} title="Edit"><Pencil /></Button>
                <Button size="icon" variant="destructive" className="h-7 w-7" onClick={() => onDelete(it.id)} title="Hapus"><Trash2 /></Button>
              </div>
            )}
            <div className="flex flex-grow flex-col p-4">
              {it.badge && kind !== "water" && (
                <span className={`mb-2 w-max rounded border px-2.5 py-0.5 text-[10px] font-semibold ${toneText[it.tone]}`}>{it.badge}</span>
              )}
              <h3 className="mb-1 text-sm font-bold">{it.title}</h3>
              <p className="mb-4 flex-grow text-xs text-muted-foreground">{it.desc}</p>
              {kind === "waste" && (
                <div className={`flex items-center justify-between rounded-lg border p-3 ${toneText[it.tone]}`}>
                  <span className="text-xs font-semibold">{it.infoLabel}</span>
                  <span className="text-lg font-bold">{it.infoValue}</span>
                </div>
              )}
              {kind === "water" && (
                <div className={`rounded-lg border p-2.5 text-center text-xs font-semibold ${toneText[it.tone]}`}>
                  {it.infoLabel}: {it.infoValue}
                </div>
              )}
              {kind === "activities" && (
                <div className="mt-auto flex items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-leaf" /> {it.infoLabel}</span>
                  <span className="rounded bg-leaf px-2 py-0.5 text-[10px] font-medium text-leaf-foreground">{it.infoValue}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const itemLabels: Record<SectionKey, { label: string; value: string }> = {
  waste: { label: "Label info (mis. Terkumpul)", value: "Nilai (mis. 68.5 Kg)" },
  water: { label: "Label info (mis. Status)", value: "Nilai (mis. 24 Titik Aktif)" },
  activities: { label: "Jadwal (mis. Setiap Jumat 07.30)", value: "Status (mis. Aktif)" },
};

function ItemModal({ kind, item, onClose, onSave }: { kind: SectionKey; item: SectionItem | null; onClose: () => void; onSave: (i: SectionItem) => void }) {
  const [f, setF] = useState<SectionItem>(
    item ?? { id: uid(), image: "", badge: "", title: "", desc: "", infoLabel: "", infoValue: "", tone: kind === "water" ? "sky" : "green" },
  );
  const set = <K extends keyof SectionItem>(k: K, v: SectionItem[K]) => setF((x) => ({ ...x, [k]: v }));
  return (
    <Modal open onClose={onClose} title={item ? "Edit Kartu" : "Tambah Kartu Baru"}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onSave(f); }}>
        <ImageField label="Foto" value={f.image} onChange={(v) => set("image", v)} maxW={900} />
        <Field label="Judul *"><Input required value={f.title} onChange={(e) => set("title", e.target.value)} /></Field>
        <Field label="Deskripsi"><Textarea rows={3} value={f.desc} onChange={(e) => set("desc", e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Label kecil / Kategori"><Input value={f.badge} onChange={(e) => set("badge", e.target.value)} /></Field>
          <Field label="Warna">
            <select className={selectCls} value={f.tone} onChange={(e) => set("tone", e.target.value as SectionItem["tone"])}>
              {toneOptions.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label={itemLabels[kind].label}><Input value={f.infoLabel} onChange={(e) => set("infoLabel", e.target.value)} /></Field>
          <Field label={itemLabels[kind].value}><Input value={f.infoValue} onChange={(e) => set("infoValue", e.target.value)} /></Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Batal</Button>
          <Button type="submit">Simpan</Button>
        </div>
      </form>
    </Modal>
  );
}

function HeadModal({ initial, onClose, onSave }: { initial: { title: string; subtitle: string }; onClose: () => void; onSave: (h: { title: string; subtitle: string }) => void }) {
  const [t, setT] = useState(initial.title);
  const [s, setS] = useState(initial.subtitle);
  return (
    <Modal open onClose={onClose} title="Edit Judul Bagian">
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onSave({ title: t, subtitle: s }); }}>
        <Field label="Judul"><Input required value={t} onChange={(e) => setT(e.target.value)} /></Field>
        <Field label="Keterangan"><Textarea rows={2} value={s} onChange={(e) => setS(e.target.value)} /></Field>
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Batal</Button><Button type="submit">Simpan</Button></div>
      </form>
    </Modal>
  );
}

/* ---------------- Dashboard editors ---------------- */

function CoverModal({ site, onClose, onSave }: { site: Site; onClose: () => void; onSave: (s: Site) => void }) {
  const [f, setF] = useState(site);
  const set = <K extends keyof Site>(k: K, v: Site[K]) => setF((x) => ({ ...x, [k]: v }));
  return (
    <Modal open onClose={onClose} title="Edit Foto Sampul & Teks" wide>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onSave(f); }}>
        <ImageField label="Foto Sampul" value={f.coverImage} onChange={(v) => set("coverImage", v)} maxW={1800} />
        <Field label="Label atas"><Input value={f.coverBadge} onChange={(e) => set("coverBadge", e.target.value)} /></Field>
        <Field label="Judul sampul"><Input required value={f.coverTitle} onChange={(e) => set("coverTitle", e.target.value)} /></Field>
        <Field label="Keterangan sampul"><Textarea rows={3} value={f.coverDesc} onChange={(e) => set("coverDesc", e.target.value)} /></Field>
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Batal</Button><Button type="submit">Simpan</Button></div>
      </form>
    </Modal>
  );
}

function StatModal({ stat, onClose, onSave }: { stat: Stat; onClose: () => void; onSave: (s: Stat) => void }) {
  const [f, setF] = useState(stat);
  return (
    <Modal open onClose={onClose} title="Edit Statistik">
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onSave(f); }}>
        <Field label="Label"><Input required value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} /></Field>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={!!f.auto} onChange={(e) => setF({ ...f, auto: e.target.checked })} /> Hitung otomatis dari jumlah tanaman yang tampil
        </label>
        {!f.auto && <Field label="Nilai"><Input value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} /></Field>}
        <div className="grid grid-cols-2 gap-2">
          <Field label="Ikon">
            <select className={selectCls} value={f.icon} onChange={(e) => setF({ ...f, icon: e.target.value as Stat["icon"] })}>
              <option value="tree">Pohon</option><option value="scale">Timbangan</option><option value="water">Air</option>
              <option value="users">Orang</option><option value="leaf">Daun</option><option value="sun">Matahari</option>
            </select>
          </Field>
          <Field label="Warna">
            <select className={selectCls} value={f.tone} onChange={(e) => setF({ ...f, tone: e.target.value as Stat["tone"] })}>
              {toneOptions.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
        </div>
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Batal</Button><Button type="submit">Simpan</Button></div>
      </form>
    </Modal>
  );
}

/* ---------------- Auth & settings ---------------- */

function LoginModal({ open, onClose, creds, onSuccess }: { open: boolean; onClose: () => void; creds: EcoData["credentials"]; onSuccess: () => void }) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const isDefault = creds.username === defaultData.credentials.username && creds.password === defaultData.credentials.password;
  return (
    <Modal open={open} onClose={onClose} title="Login Administrator" description="Masuk untuk mengelola data Eco School SDN 1 Palapa">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (u === creds.username && p === creds.password) { setP(""); onSuccess(); }
          else toast.error("Username atau password salah!");
        }}
      >
        <Field label="Username"><Input required value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" /></Field>
        <Field label="Password"><Input required type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" /></Field>
        <Button type="submit" className="w-full">Masuk sebagai Admin</Button>
        {isDefault && (
          <p className="text-center text-[11px] text-muted-foreground">Default demo: username <strong>admin</strong> | password <strong>palapa2026</strong></p>
        )}
      </form>
    </Modal>
  );
}

function ListEditor({ title, items, onChange }: { title: string; items: string[]; onChange: (v: string[]) => void }) {
  const [v, setV] = useState("");
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">{title}</h4>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it, i) => (
          <span key={it} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-1 text-xs">
            <input
              className="w-auto bg-transparent outline-none"
              size={Math.max(4, it.length)}
              defaultValue={it}
              onBlur={(e) => {
                const nv = e.target.value.trim();
                if (nv && nv !== it) onChange(items.map((x, j) => (j === i ? nv : x)));
              }}
            />
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} title="Hapus"><X className="h-3 w-3" /></button>
          </span>
        ))}
      </div>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const t = v.trim(); if (t && !items.includes(t)) onChange([...items, t]); setV(""); }}>
        <Input value={v} onChange={(e) => setV(e.target.value)} placeholder={`Tambah ${title.toLowerCase()}...`} />
        <Button type="submit" size="sm" variant="secondary"><Plus /> Tambah</Button>
      </form>
    </div>
  );
}

function SettingsModal({ data, onClose, update, setData, reset }: {
  data: EcoData; onClose: () => void; update: (fn: (d: EcoData) => EcoData) => void; setData: (d: EcoData) => void; reset: () => void;
}) {
  const [site, setSite] = useState(data.site);
  const [user, setUser] = useState(data.credentials.username);
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const setS = <K extends keyof Site>(k: K, v: Site[K]) => setSite((x) => ({ ...x, [k]: v }));

  return (
    <Modal open onClose={onClose} title="Pengaturan Admin" description="Kelola identitas sekolah, akun, daftar pilihan, dan cadangan data" wide>
      <Tabs defaultValue="site">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="site">Identitas</TabsTrigger>
          <TabsTrigger value="account">Akun</TabsTrigger>
          <TabsTrigger value="lists">Pilihan</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>

        <TabsContent value="site">
          <form className="space-y-3 pt-2" onSubmit={(e) => { e.preventDefault(); update((d) => ({ ...d, site })); toast.success("Identitas disimpan"); }}>
            <Field label="Nama aplikasi"><Input required value={site.name} onChange={(e) => setS("name", e.target.value)} /></Field>
            <Field label="Nama & alamat sekolah"><Input value={site.school} onChange={(e) => setS("school", e.target.value)} /></Field>
            <Field label="Teks kaki halaman"><Input value={site.footer} onChange={(e) => setS("footer", e.target.value)} /></Field>
            <Field label="Alamat dasar QR Code tanaman"><Input value={site.qrBaseUrl} onChange={(e) => setS("qrBaseUrl", e.target.value)} /></Field>
            <Button type="submit">Simpan Identitas</Button>
          </form>
        </TabsContent>

        <TabsContent value="account">
          <form
            className="space-y-3 pt-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (pass.length < 6) { toast.error("Password minimal 6 karakter!"); return; }
              if (pass !== pass2) { toast.error("Konfirmasi password tidak sama"); return; }
              update((d) => ({ ...d, credentials: { username: user.trim(), password: pass } }));
              setPass(""); setPass2("");
              toast.success("Kredensial Admin berhasil diperbarui!");
            }}
          >
            <Field label="Username Baru"><Input required value={user} onChange={(e) => setUser(e.target.value)} /></Field>
            <Field label="Password Baru"><Input required type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Minimal 6 karakter" /></Field>
            <Field label="Ulangi Password"><Input required type="password" value={pass2} onChange={(e) => setPass2(e.target.value)} /></Field>
            <Button type="submit">Simpan Akun</Button>
          </form>
        </TabsContent>

        <TabsContent value="lists" className="space-y-5 pt-2">
          <ListEditor title="Kategori" items={data.categories} onChange={(categories) => update((d) => ({ ...d, categories }))} />
          <ListEditor title="Lokasi" items={data.locations} onChange={(locations) => update((d) => ({ ...d, locations }))} />
          <p className="text-[11px] text-muted-foreground">Klik nama untuk mengubahnya. Perubahan tersimpan otomatis.</p>
        </TabsContent>

        <TabsContent value="data" className="space-y-3 pt-2 text-sm">
          <p className="text-xs text-muted-foreground">Semua perubahan tersimpan di browser perangkat ini. Unduh cadangan untuk memindahkan data ke perangkat lain.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => download(`cadangan-eco-school-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data), "application/json")}>
              <Download /> Unduh Cadangan
            </Button>
            <label>
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  try {
                    const parsed = JSON.parse(await f.text());
                    if (!parsed.site || !Array.isArray(parsed.plants)) throw new Error();
                    setData({ ...defaultData, ...parsed });
                    toast.success("Cadangan berhasil dipulihkan");
                    onClose();
                  } catch {
                    toast.error("File cadangan tidak valid");
                  }
                }}
              />
              <span className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md bg-secondary px-4 text-sm font-medium text-secondary-foreground shadow-sm hover:bg-secondary/80">
                <Upload className="h-4 w-4" /> Pulihkan Cadangan
              </span>
            </label>
            <Button
              variant="destructive"
              onClick={() => {
                if (!confirm("Kembalikan semua data ke awal? Semua perubahan akan hilang.")) return;
                reset();
                toast.success("Data dikembalikan ke awal");
                onClose();
              }}
            >
              <RotateCcw /> Atur Ulang Semua
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </Modal>
  );
}
