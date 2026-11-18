"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getStorage, ref as storageRef, uploadBytes } from "firebase/storage";
import { nanoid } from "nanoid";
import toast from "react-hot-toast";
import { ArrowRight, AlertTriangle, FileUp, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  MENU_ACCEPTED_TYPES,
  MENU_FILE_MAX_BYTES,
  linesToList,
  listToLines,
  type ClientMenuDraft,
  type MenuData,
  type PublishedClientMenu,
} from "@/lib/coach/menu";

interface MealForm { name: string; time: string; day: string; optionsText: string }
interface Form {
  title: string;
  calories: string; proteinG: string; carbsG: string; fatG: string;
  meals: MealForm[];
  avoidText: string;
  notesText: string;
}

const emptyForm: Form = { title: "", calories: "", proteinG: "", carbsG: "", fatG: "", meals: [], avoidText: "", notesText: "" };

function toForm(m: MenuData): Form {
  return {
    title: m.title ?? "",
    calories: m.targets.calories ? String(m.targets.calories) : "",
    proteinG: m.targets.proteinG ? String(m.targets.proteinG) : "",
    carbsG: m.targets.carbsG ? String(m.targets.carbsG) : "",
    fatG: m.targets.fatG ? String(m.targets.fatG) : "",
    meals: m.meals.map((x) => ({ name: x.name, time: x.time ?? "", day: x.day ?? "", optionsText: listToLines(x.options) })),
    avoidText: listToLines(m.avoid),
    notesText: listToLines(m.notes),
  };
}

function fromForm(f: Form, unclear: string[]): MenuData {
  const n = (v: string) => (v.trim() ? Number(v) : undefined);
  return {
    title: f.title.trim() || undefined,
    targets: { calories: n(f.calories), proteinG: n(f.proteinG), carbsG: n(f.carbsG), fatG: n(f.fatG) },
    meals: f.meals.map((m) => ({
      name: m.name.trim(),
      time: m.time.trim() || undefined,
      day: m.day.trim() || undefined,
      options: linesToList(m.optionsText),
    })),
    avoid: linesToList(f.avoidText),
    notes: linesToList(f.notesText),
    unclear,
  };
}

// Photos from a phone are huge; Claude and our 10MB cap are happy with ~2200px.
async function shrinkImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((res) => canvas.toBlob((b) => res(b ?? file), "image/jpeg", 0.85));
}

const inputCls = "w-full bg-wing-surface border border-wing-border rounded-xl px-3 py-2 text-sm text-wing-ink";

export default function CoachClientMenuPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const { firebaseUser } = useAuth();
  const { lang, dir } = useLanguage();
  const he = lang === "he";
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState("");
  const [draft, setDraft] = useState<ClientMenuDraft | null>(null);
  const [published, setPublished] = useState<PublishedClientMenu | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [unclear, setUnclear] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const [phase, setPhase] = useState<"idle" | "uploading" | "analyzing" | "saving" | "publishing">("idle");

  const api = useCallback(
    async (path: string, method: string, body?: unknown) => {
      const token = (await firebaseUser?.getIdToken()) ?? "";
      return fetch(path, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: body ? JSON.stringify(body) : undefined,
      });
    },
    [firebaseUser]
  );

  const load = useCallback(async () => {
    if (!firebaseUser) return;
    setLoading(true);
    try {
      const res = await api(`/api/coach/menu?clientId=${encodeURIComponent(clientId)}`, "GET");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setClientName(data.clientName ?? "");
      setDraft(data.draft);
      setPublished(data.published);
      const src: MenuData | undefined = data.draft?.menu ?? undefined;
      setForm(src ? toForm(src) : emptyForm);
      setUnclear(src?.unclear ?? []);
      setDirty(false);
    } catch {
      toast.error(he ? "שגיאה בטעינת התפריט" : "Couldn't load the menu");
    } finally {
      setLoading(false);
    }
  }, [api, clientId, firebaseUser, he]);

  useEffect(() => { load(); }, [load]);

  function patch(p: Partial<Form>) { setForm((f) => ({ ...f, ...p })); setDirty(true); }
  function patchMeal(i: number, p: Partial<MealForm>) {
    setForm((f) => ({ ...f, meals: f.meals.map((m, j) => (j === i ? { ...m, ...p } : m)) }));
    setDirty(true);
  }

  async function handleFile(file: File) {
    if (!firebaseUser) return;
    if (!MENU_ACCEPTED_TYPES.includes(file.type)) {
      toast.error(he ? "אפשר להעלות PDF או תמונה (JPG, PNG). קובץ Word - שמרו כ-PDF" : "Upload a PDF or an image (JPG, PNG). For Word files, save as PDF first");
      return;
    }
    if (file.size > MENU_FILE_MAX_BYTES * 3) {
      toast.error(he ? "הקובץ גדול מדי" : "File is too large");
      return;
    }
    try {
      setPhase("uploading");
      const blob = await shrinkImage(file);
      if (blob.size > MENU_FILE_MAX_BYTES) throw new Error("big");
      const type = blob.type || file.type;
      const ext = type === "application/pdf" ? "pdf" : "jpg";
      const path = `menus/${firebaseUser.uid}/${clientId}/${nanoid()}.${ext}`;
      await uploadBytes(storageRef(getStorage(), path), blob, { contentType: type });

      setPhase("analyzing");
      const res = await api("/api/coach/menu/extract", "POST", { clientId, storagePath: path, fileName: file.name });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({})))?.error;
        throw new Error(err ?? "failed");
      }
      toast.success(he ? "התפריט נקרא - עברו עליו לפני הפרסום" : "Menu read - review it before publishing");
      await load();
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      toast.error(
        code === "DAILY_LIMIT" ? (he ? "הגעת למכסת הקריאות היומית" : "Daily limit reached")
        : code === "EXTRACTION_FAILED" ? (he ? "לא הצלחנו לקרוא את הקובץ. נסו קובץ ברור יותר" : "Couldn't read the file. Try a clearer one")
        : he ? "ההעלאה נכשלה" : "Upload failed"
      );
    } finally {
      setPhase("idle");
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function saveDraft(): Promise<boolean> {
    setPhase("saving");
    try {
      const res = await api("/api/coach/menu", "PUT", { clientId, menu: fromForm(form, unclear) });
      if (!res.ok) throw new Error();
      setDirty(false);
      return true;
    } catch {
      toast.error(he ? "שמירה נכשלה" : "Save failed");
      return false;
    } finally {
      setPhase("idle");
    }
  }

  async function publish() {
    if (form.meals.filter((m) => m.name.trim() || m.optionsText.trim()).length === 0) {
      toast.error(he ? "הוסיפו לפחות ארוחה אחת" : "Add at least one meal");
      return;
    }
    if (!(await saveDraft())) return;
    setPhase("publishing");
    try {
      const res = await api("/api/coach/menu", "POST", { clientId });
      if (!res.ok) throw new Error();
      toast.success(he ? "התפריט פורסם ללקוח" : "Menu published to the client");
      await load();
    } catch {
      toast.error(he ? "הפרסום נכשל" : "Publish failed");
    } finally {
      setPhase("idle");
    }
  }

  async function discard(scope: "draft" | "all") {
    const msg =
      scope === "all"
        ? he ? "למחוק את התפריט לגמרי? הלקוח לא יראה אותו יותר." : "Delete the menu entirely? The client will no longer see it."
        : he ? "למחוק את הטיוטה?" : "Discard the draft?";
    if (!window.confirm(msg)) return;
    const res = await api("/api/coach/menu", "DELETE", { clientId, scope });
    if (!res.ok) { toast.error(he ? "המחיקה נכשלה" : "Delete failed"); return; }
    await load();
  }

  function startFromPublished() {
    if (!published) return;
    setForm(toForm(published.menu));
    setUnclear([]);
    setDirty(true);
    setDraft({ clientId, coachId: published.coachId, menu: published.menu });
  }

  const busy = phase !== "idle";
  const hasForm = !!draft;
  const publishedAt = published?.publishedAt ? new Date(published.publishedAt).toLocaleDateString(he ? "he-IL" : "en-GB") : null;
  const unpublishedChanges =
    !!draft && !!published && (dirty || (draft.updatedAt ?? "") > (published.publishedAt ?? ""));

  return (
    <div className="p-4 space-y-4 pb-24" dir={dir}>
      <div className="pt-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-full bg-wing-elevated border border-wing-border shrink-0">
          <ArrowRight size={18} className={`text-wing-ink ${he ? "" : "rotate-180"}`} />
        </button>
        <div className="min-w-0">
          <h1 className="font-bold text-wing-ink text-lg truncate">{he ? "תפריט" : "Menu"}{clientName ? ` · ${clientName}` : ""}</h1>
          <p className="text-xs text-wing-muted">
            {published
              ? (he ? `פורסם ב-${publishedAt}` : `Published ${publishedAt}`) + (unpublishedChanges ? (he ? " · יש שינויים שלא פורסמו" : " · unpublished changes") : "")
              : draft ? (he ? "טיוטה - הלקוח עדיין לא רואה" : "Draft - not visible to the client") : (he ? "אין עדיין תפריט" : "No menu yet")}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="h-40 bg-wing-elevated border border-wing-border rounded-[20px] animate-pulse" />
      ) : (
        <>
          <Card>
            <h3 className="font-semibold text-wing-ink mb-1 flex items-center gap-1.5"><FileUp size={16} className="text-wing-muted" />{he ? "העלאת קובץ תפריט" : "Upload a menu file"}</h3>
            <p className="text-xs text-wing-muted mb-3 leading-relaxed">
              {he
                ? "PDF או תמונה של התפריט. ה-AI קורא אותו למבנה שאפשר לערוך, ואתם מאשרים לפני שהלקוח רואה. העלאה חדשה מחליפה את הטיוטה, והתפריט שפורסם נשאר עד שתפרסמו."
                : "A PDF or photo of the menu. AI reads it into an editable structure and you approve it before the client sees anything. A new upload replaces the draft; the published menu stays until you publish."}
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <Button className="w-full" onClick={() => fileRef.current?.click()} disabled={busy} loading={phase === "uploading" || phase === "analyzing"}>
              {phase === "uploading" ? (he ? "מעלה..." : "Uploading...") : phase === "analyzing" ? (he ? "קורא את התפריט (עד דקה)..." : "Reading the menu (up to a minute)...") : he ? "בחירת קובץ" : "Choose a file"}
            </Button>
            {!hasForm && published && (
              <button onClick={startFromPublished} className="w-full mt-2 text-sm font-semibold text-wing-heat py-2">
                {he ? "או עריכת התפריט שפורסם" : "Or edit the published menu"}
              </button>
            )}
          </Card>

          {hasForm && (
            <>
              {unclear.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 space-y-1.5">
                  <p className="text-sm font-bold text-amber-800 flex items-center gap-1.5"><AlertTriangle size={15} />{he ? "כדאי לבדוק - לא הייתי בטוח בקריאה:" : "Please check - not sure these were read right:"}</p>
                  <ul className="text-sm text-amber-900 list-disc ps-5 space-y-0.5">{unclear.map((u, i) => <li key={i}>{u}</li>)}</ul>
                  <button onClick={() => { setUnclear([]); setDirty(true); }} className="text-xs font-bold text-amber-800 underline">{he ? "בדקתי, הסתר" : "Checked, hide"}</button>
                </div>
              )}

              <Card>
                <input className={inputCls} placeholder={he ? "כותרת (לא חובה)" : "Title (optional)"} value={form.title} onChange={(e) => patch({ title: e.target.value })} />
                <p className="text-xs font-bold text-wing-muted mt-4 mb-2">{he ? "יעדים יומיים (לא חובה)" : "Daily targets (optional)"}</p>
                <div className="grid grid-cols-2 gap-2">
                  {([["calories", he ? "קלוריות" : "Calories"], ["proteinG", he ? "חלבון (ג')" : "Protein (g)"], ["carbsG", he ? "פחמימות (ג')" : "Carbs (g)"], ["fatG", he ? "שומן (ג')" : "Fat (g)"]] as const).map(([k, label]) => (
                    <input key={k} type="number" inputMode="numeric" className={inputCls} placeholder={label} value={form[k]} onChange={(e) => patch({ [k]: e.target.value })} />
                  ))}
                </div>
              </Card>

              <p className="text-xs font-bold text-wing-muted px-1">{he ? "ארוחות - כל שורה בתיבת האפשרויות היא חלופה שהלקוח יכול לבחור" : "Meals - each line in the options box is an alternative the client can pick"}</p>
              {form.meals.map((m, i) => (
                <Card key={i}>
                  <div className="flex gap-2 mb-2">
                    <input className={inputCls} placeholder={he ? "שם הארוחה" : "Meal name"} value={m.name} onChange={(e) => patchMeal(i, { name: e.target.value })} />
                    <button onClick={() => { setForm((f) => ({ ...f, meals: f.meals.filter((_, j) => j !== i) })); setDirty(true); }} aria-label={he ? "מחיקת ארוחה" : "Delete meal"} className="p-2 text-wing-subtle hover:text-red-500"><Trash2 size={16} /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <input className={inputCls} placeholder={he ? "שעה (לא חובה)" : "Time (optional)"} value={m.time} onChange={(e) => patchMeal(i, { time: e.target.value })} />
                    <input className={inputCls} placeholder={he ? "יום (אם משתנה)" : "Day (if it varies)"} value={m.day} onChange={(e) => patchMeal(i, { day: e.target.value })} />
                  </div>
                  <textarea className={`${inputCls} min-h-[84px]`} placeholder={he ? "אפשרויות, אחת בכל שורה" : "Options, one per line"} value={m.optionsText} onChange={(e) => patchMeal(i, { optionsText: e.target.value })} />
                </Card>
              ))}
              <button onClick={() => { setForm((f) => ({ ...f, meals: [...f.meals, { name: "", time: "", day: "", optionsText: "" }] })); setDirty(true); }} className="w-full flex items-center justify-center gap-1.5 py-3 rounded-2xl border border-dashed border-wing-border text-sm font-bold text-wing-muted">
                <Plus size={16} />{he ? "הוספת ארוחה" : "Add a meal"}
              </button>

              <Card>
                <p className="text-xs font-bold text-wing-muted mb-2">{he ? "להימנע / להגביל (אחד בכל שורה)" : "Avoid / limit (one per line)"}</p>
                <textarea className={`${inputCls} min-h-[70px]`} value={form.avoidText} onChange={(e) => patch({ avoidText: e.target.value })} />
                <p className="text-xs font-bold text-wing-muted mt-4 mb-2">{he ? "הערות כלליות (אחת בכל שורה)" : "General notes (one per line)"}</p>
                <textarea className={`${inputCls} min-h-[70px]`} value={form.notesText} onChange={(e) => patch({ notesText: e.target.value })} />
              </Card>

              <div className="space-y-2">
                <Button className="w-full" onClick={publish} disabled={busy} loading={phase === "publishing"}>{he ? "פרסום ללקוח" : "Publish to the client"}</Button>
                <button onClick={saveDraft} disabled={busy || !dirty} className="w-full py-3 rounded-2xl border border-wing-border text-sm font-bold text-wing-ink disabled:opacity-40">{he ? "שמירת טיוטה" : "Save draft"}</button>
                <div className="flex justify-between pt-1">
                  <button onClick={() => discard("draft")} className="text-xs text-wing-subtle hover:text-red-500">{he ? "מחיקת הטיוטה" : "Discard draft"}</button>
                  {published && <button onClick={() => discard("all")} className="text-xs text-wing-subtle hover:text-red-500">{he ? "הסרת התפריט מהלקוח" : "Remove menu from client"}</button>}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
