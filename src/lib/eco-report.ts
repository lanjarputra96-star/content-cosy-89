import type { EcoData, Plant, SectionItem } from "./eco-store";

export interface ReportSelection {
  summary: boolean;
  plants: boolean;
  waste: boolean;
  water: boolean;
  activities: boolean;
}

export interface ReportRange {
  from: string; // "" = tanpa batas awal
  to: string; // "" = tanpa batas akhir
}

export const defaultSelection: ReportSelection = {
  summary: true,
  plants: true,
  waste: true,
  water: true,
  activities: true,
};

/** Record masuk rentang jika tanpa tanggal, atau tanggalnya di dalam rentang. */
export function inRange(date: string | undefined, range: ReportRange) {
  if (!date) return true;
  if (range.from && date < range.from) return false;
  if (range.to && date > range.to) return false;
  return true;
}

export function rangeLabel(range: ReportRange) {
  if (!range.from && !range.to) return "Semua tanggal";
  return `${range.from ? fmtID(range.from) : "awal"} s.d. ${range.to ? fmtID(range.to) : "sekarang"}`;
}

export function fmtID(d?: string) {
  if (!d) return "-";
  const dt = new Date(`${d}T00:00:00`);
  if (isNaN(dt.getTime())) return d;
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(dt);
}

function plantsInRange(data: EcoData, range: ReportRange) {
  return data.plants.filter((p) => inRange(p.updatedAt, range));
}
function itemsInRange(items: SectionItem[], range: ReportRange) {
  return items.filter((i) => inRange(i.date, range));
}

export function reportCounts(data: EcoData, range: ReportRange) {
  return {
    plants: plantsInRange(data, range).length,
    waste: itemsInRange(data.waste.items, range).length,
    water: itemsInRange(data.water.items, range).length,
    activities: itemsInRange(data.activities.items, range).length,
  };
}

/** Angka di awal teks, dukung format Indonesia: "68.5 Kg" / "1.000 Liter" / "1.000,5 L". */
function num(s: string) {
  const m = s.match(/[\d.,]+/);
  if (!m) return 0;
  let t = m[0];
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(t);
  return isNaN(n) ? 0 : n;
}

const esc = (s: string | number | undefined) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function sectionTitle(data: EcoData, key: "plants" | "waste" | "water" | "activities") {
  if (key === "plants") return data.plantSection.title || "Inventaris Tanaman";
  return data[key].title || key;
}

function plantsTable(plants: Plant[]) {
  const rows = plants
    .map(
      (p) => `<tr>
        <td class="c img">${p.photo ? `<img class="cell" src="${esc(p.photo)}" alt="" />` : "-"}</td>
        <td class="mono">${esc(p.code)}</td>
        <td><b>${esc(p.name)}</b>${p.scientific ? `<br /><i>${esc(p.scientific)}</i>` : ""}</td>
        <td>${esc(p.category)}</td>
        <td>${esc(p.location)}</td>
        <td class="c">${p.recordType === "group" ? "Kelompok" : "Individual"}<br /><b>${p.quantity}</b></td>
        <td>${esc(p.desc)}</td>
        <td>${esc(p.benefits || "-")}</td>
        <td class="c">${p.isPublished ? "Tampil" : "Disembunyikan"}</td>
        <td class="c">${fmtID(p.updatedAt)}</td>
      </tr>`,
    )
    .join("");
  return `<table>
    <thead><tr>
      <th style="width:60px">Foto</th><th>Kode QR</th><th>Nama Tanaman</th><th>Kategori</th><th>Lokasi</th>
      <th>Jenis</th><th>Deskripsi</th><th>Manfaat</th><th>Status</th><th>Diperbarui</th>
    </tr></thead>
    <tbody>${rows || `<tr><td colspan="10" class="c">Tidak ada data dalam rentang tanggal ini.</td></tr>`}</tbody>
  </table>`;
}

function itemsTable(items: SectionItem[], opts: { valueCol: string; sumLabel?: string }) {
  const total = opts.sumLabel ? items.reduce((a, i) => a + num(i.infoValue), 0) : null;
  const rows = items
    .map(
      (i) => `<tr>
        <td class="c img">${i.image ? `<img class="cell" src="${esc(i.image)}" alt="" />` : "-"}</td>
        <td class="c">${fmtID(i.date)}</td>
        <td class="c"><b>${esc(i.badge || "-")}</b></td>
        <td><b>${esc(i.title)}</b><br />${esc(i.desc)}</td>
        <td class="c"><b>${esc(i.infoValue)}</b><br />${esc(i.infoLabel)}</td>
      </tr>`,
    )
    .join("");
  const totalRow =
    total !== null
      ? `<tr class="total"><td colspan="4">${esc(opts.sumLabel)}</td><td class="c"><b>${total.toLocaleString("id-ID", { maximumFractionDigits: 2 })}</b></td></tr>`
      : "";
  return `<table>
    <thead><tr><th style="width:60px">Foto</th><th style="width:78px">Tanggal</th><th>Kategori</th><th>Kegiatan / Keterangan</th><th style="width:120px">${esc(opts.valueCol)}</th></tr></thead>
    <tbody>${rows || `<tr><td colspan="5" class="c">Tidak ada data dalam rentang tanggal ini.</td></tr>`}${totalRow}</tbody>
  </table>`;
}

export function buildReportHtml(data: EcoData, sel: ReportSelection, range: ReportRange, printedBy: string) {
  const plants = plantsInRange(data, range);
  const waste = itemsInRange(data.waste.items, range);
  const water = itemsInRange(data.water.items, range);
  const activities = itemsInRange(data.activities.items, range);
  const published = plants.filter((p) => p.isPublished);
  const totalQty = plants.reduce((a, p) => a + p.quantity, 0);

  const chosen: string[] = [];
  if (sel.summary) chosen.push("Ringkasan");
  if (sel.plants) chosen.push(sectionTitle(data, "plants"));
  if (sel.waste) chosen.push(sectionTitle(data, "waste"));
  if (sel.water) chosen.push(sectionTitle(data, "water"));
  if (sel.activities) chosen.push(sectionTitle(data, "activities"));
  const title = chosen.length === 1 && chosen[0] !== "Ringkasan" ? chosen[0] : "Laporan Data Eco Green School";

  const statRows = data.stats
    .map(
      (s) =>
        `<tr><td>${esc(s.label)}</td><td class="c"><b>${s.auto ? published.length : esc(s.value)}</b></td></tr>`,
    )
    .join("");

  const summary = sel.summary
    ? `<div class="sec"><h2>Ringkasan Eco School</h2>
      <table><thead><tr><th>Indikator</th><th style="width:160px">Nilai</th></tr></thead><tbody>
        ${statRows}
        <tr><td>Total data tanaman (periode)</td><td class="c"><b>${plants.length}</b></td></tr>
        <tr><td>Tanaman tampil publik</td><td class="c"><b>${published.length}</b></td></tr>
        <tr><td>Total populasi tanaman (individu + kelompok)</td><td class="c"><b>${totalQty.toLocaleString("id-ID")}</b></td></tr>
        <tr><td>Data pengelolaan sampah (periode)</td><td class="c"><b>${waste.length}</b></td></tr>
        <tr><td>Data konservasi air (periode)</td><td class="c"><b>${water.length}</b></td></tr>
        <tr><td>Data kegiatan &amp; relawan (periode)</td><td class="c"><b>${activities.length}</b></td></tr>
      </tbody></table></div>`
    : "";

  const parts = [
    summary,
    sel.plants ? `<div class="sec"><h2>${esc(sectionTitle(data, "plants"))}</h2>${plantsTable(plants)}</div>` : "",
    sel.waste ? `<div class="sec"><h2>${esc(sectionTitle(data, "waste"))}</h2>${itemsTable(waste, { valueCol: "Volume", sumLabel: "Total volume tercatat" })}</div>` : "",
    sel.water ? `<div class="sec"><h2>${esc(sectionTitle(data, "water"))}</h2>${itemsTable(water, { valueCol: "Status / Nilai" })}</div>` : "",
    sel.activities ? `<div class="sec"><h2>${esc(sectionTitle(data, "activities"))}</h2>${itemsTable(activities, { valueCol: "Jadwal / Status" })}</div>` : "",
  ]
    .filter(Boolean)
    .join("");

  const now = new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" });

  return `<!doctype html>
<html lang="id"><head><meta charset="utf-8" />
<title>${esc(title)} — ${esc(data.site.name)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; margin: 24px; font-size: 12px; }
  .head { text-align: center; border-bottom: 3px double #166534; padding-bottom: 12px; margin-bottom: 14px; }
  .head h1 { margin: 0; font-size: 17px; color: #14532d; text-transform: uppercase; letter-spacing: 0.5px; }
  .head .school { font-size: 12px; font-weight: bold; margin-top: 2px; }
  .meta { display: flex; justify-content: space-between; font-size: 11px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 7px 10px; margin-bottom: 4px; }
  .sec h2 { font-size: 13px; margin: 18px 0 6px; background: #dcfce7; border-left: 4px solid #166534; padding: 6px 9px; color: #14532d; text-transform: uppercase; letter-spacing: 0.4px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #9ca3af; padding: 5px 7px; vertical-align: top; font-size: 10.5px; }
  th { background: #f0fdf4; text-align: left; text-transform: uppercase; font-size: 9.5px; letter-spacing: 0.3px; }
  td.c, th.c { text-align: center; }
  td.mono { font-family: "Courier New", monospace; font-weight: bold; white-space: nowrap; }
  img.cell { width: 54px; height: 42px; object-fit: cover; border-radius: 3px; }
  tr.total td { background: #dcfce7; font-weight: bold; }
  .sign { display: flex; justify-content: space-between; margin-top: 44px; font-size: 11.5px; text-align: center; page-break-inside: avoid; }
  .sign .col { min-width: 200px; }
  .sign .role { font-weight: bold; }
  .sign .line { margin-top: 64px; border-top: 1px solid #374151; padding-top: 4px; }
  .foot { margin-top: 18px; border-top: 1px solid #d1d5db; padding-top: 6px; text-align: center; font-size: 9.5px; color: #6b7280; }
  .toolbar { position: sticky; top: 0; display: flex; gap: 8px; justify-content: flex-end; padding: 8px 0; background: #fff; }
  .toolbar button { font: 12px Arial; padding: 6px 14px; border-radius: 6px; border: 1px solid #166534; cursor: pointer; }
  .toolbar .print { background: #166534; color: #fff; }
  @media print { body { margin: 10mm 8mm; } .toolbar { display: none; } .sec { page-break-inside: avoid; } }
</style></head>
<body>
  <div class="toolbar no-print">
    <button class="print" onclick="window.print()">Cetak / Simpan PDF</button>
    <button onclick="window.close()">Tutup</button>
  </div>
  <div class="head">
    <h1>${esc(title)}</h1>
    <div class="school">${esc(data.site.name)} — ${esc(data.site.school)}</div>
  </div>
  <div class="meta">
    <span><b>Periode:</b> ${esc(rangeLabel(range))}</span>
    <span><b>Dicetak:</b> ${esc(now)} &nbsp;|&nbsp; <b>Oleh:</b> ${esc(printedBy)}</span>
  </div>
  ${parts}
  <div class="sign">
    <div class="col">
      <div>Petugas / Guru Pendamping Eco School</div>
      <div class="line">________________________</div>
    </div>
    <div class="col">
      <div>Mengetahui, Kepala Sekolah</div>
      <div class="line">________________________</div>
    </div>
  </div>
  <div class="foot">${esc(data.site.footer)}</div>
  <script>window.onload = function () { setTimeout(function () { window.print(); }, 400); };</script>
</body></html>`;
}
