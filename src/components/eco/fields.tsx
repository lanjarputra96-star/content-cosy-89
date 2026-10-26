import { useRef, useState, type ReactNode } from "react";
import { ImagePlus, Link2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { fileToDataUrl, type Tone } from "@/lib/eco-store";
import { toast } from "sonner";

export const toneText: Record<Tone, string> = {
  green: "text-tone-green bg-tone-green-soft border-tone-green/20",
  amber: "text-tone-amber bg-tone-amber-soft border-tone-amber/20",
  sky: "text-tone-sky bg-tone-sky-soft border-tone-sky/20",
  rose: "text-tone-rose bg-tone-rose-soft border-tone-rose/20",
};

export const toneOptions: { value: Tone; label: string }[] = [
  { value: "green", label: "Hijau" },
  { value: "amber", label: "Kuning" },
  { value: "sky", label: "Biru" },
  { value: "rose", label: "Merah" },
];

export function Modal({ open, onClose, title, description, children, wide }: {
  open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; wide?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={`max-h-[90vh] overflow-y-auto ${wide ? "sm:max-w-2xl" : "sm:max-w-lg"}`}>
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold">{label}</Label>
      {children}
    </div>
  );
}

export const selectCls =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function ImageField({ label, value, onChange, maxW = 1400 }: {
  label: string; value: string; onChange: (v: string) => void; maxW?: number;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const isData = value.startsWith("data:");
  return (
    <Field label={label}>
      <div className="overflow-hidden rounded-lg border border-border bg-muted">
        {value ? (
          <img src={value} alt="Pratinjau" className="h-40 w-full object-cover" />
        ) : (
          <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">Belum ada foto</div>
        )}
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => ref.current?.click()} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <ImagePlus />} Unggah foto
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>Hapus foto</Button>
        )}
      </div>
      <div className="relative">
        <Link2 className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="atau tempel tautan gambar https://..."
          value={isData ? "" : value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setBusy(true);
          try {
            onChange(await fileToDataUrl(f, maxW));
          } catch {
            toast.error("Gagal membaca gambar");
          } finally {
            setBusy(false);
          }
        }}
      />
    </Field>
  );
}
