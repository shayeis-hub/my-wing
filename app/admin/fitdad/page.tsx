"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Lock, LogOut, UserPlus, Upload, Users, Building2 } from "lucide-react";
import { parseCsv } from "@/lib/utils/csv";

const BG = "#fbf4e6";
const BORDER = "#ede7d8";
const TEXT = "#1a1814";
const MUTED = "#8a7e6a";
const GRADIENT = "linear-gradient(90deg,#f5dd4b,#ff6b47)";

type Plan = "3m" | "6m" | "12m";
const PLAN_LABELS: Record<Plan, string> = { "3m": "3 חודשים", "6m": "חצי שנה", "12m": "שנה" };

type Tab = "create" | "import" | "users" | "wings";

interface FitDadWingRow {
  id: string;
  name: string;
  visibility: "private" | "public";
  memberCount: number;
  capacity: number;
}

interface FitDadUserRow {
  uid: string;
  displayName: string;
  email: string;
  wingId: string | null;
  plan: Plan | null;
  expiresAt: string | null;
  createdBy: string | null;
  mustChangePassword: boolean;
}

interface ImportRow {
  name: string;
  email: string;
  phone: string;
  plan: string;
  wingId?: string;
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ── Small shared UI bits ──────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 6 }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", border: `1.5px solid ${BORDER}`, borderRadius: 10,
  fontSize: 14, outline: "none", boxSizing: "border-box", background: "white", color: TEXT,
};

function PrimaryButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "11px 22px", borderRadius: 10, border: "none", background: GRADIENT,
        fontWeight: 800, fontSize: 14, cursor: disabled ? "default" : "pointer", color: TEXT,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

export default function FitDadAdminPage() {
  const [secret, setSecret] = useState("");
  const [savedSecret, setSavedSecret] = useState<string | null>(null);
  const [loginError, setLoginError] = useState("");
  const [tab, setTab] = useState<Tab>("create");
  const [createdBy, setCreatedBy] = useState("");
  const [wings, setWings] = useState<FitDadWingRow[] | null>(null);

  useEffect(() => {
    const s = sessionStorage.getItem("admin_secret");
    if (s) setSavedSecret(s);
    const n = sessionStorage.getItem("fitdad_created_by");
    if (n) setCreatedBy(n);
  }, []);

  useEffect(() => {
    if (createdBy) sessionStorage.setItem("fitdad_created_by", createdBy);
  }, [createdBy]);

  const fetchWings = useCallback(async (key: string) => {
    const res = await fetch("/api/admin/fitdad/wings", { headers: { "x-admin-secret": key } });
    if (res.ok) setWings((await res.json()).wings);
  }, []);

  async function tryLogin() {
    setLoginError("");
    const res = await fetch("/api/admin/fitdad/wings", { headers: { "x-admin-secret": secret } });
    if (res.status === 401) { setLoginError("סיסמה שגויה"); return; }
    if (!res.ok) { setLoginError("שגיאה בהתחברות"); return; }
    setWings((await res.json()).wings);
    setSavedSecret(secret);
    sessionStorage.setItem("admin_secret", secret);
  }

  function handleLogout() {
    sessionStorage.removeItem("admin_secret");
    setSavedSecret(null);
    setSecret("");
  }

  useEffect(() => {
    if (savedSecret && wings === null) fetchWings(savedSecret);
  }, [savedSecret, wings, fetchWings]);

  // ── Login screen ────────────────────────────────────────────────────────────
  if (!savedSecret) {
    return (
      <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ background: "white", borderRadius: 24, padding: 40, width: 340, boxShadow: "0 4px 24px rgba(0,0,0,0.06)", border: `1px solid ${BORDER}`, textAlign: "center" }}>
          <div style={{ width: 56, height: 56, background: GRADIENT, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <Lock size={24} color={TEXT} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: TEXT, marginBottom: 4 }}>אבא חטוב · ניהול</h1>
          <p style={{ fontSize: 13, color: MUTED, marginBottom: 28 }}>Wingpact · Internal</p>
          {loginError && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{loginError}</p>}
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && secret && tryLogin()}
            placeholder="Admin secret"
            style={{ ...inputStyle, marginBottom: 12, background: BG }}
            autoFocus
          />
          <PrimaryButton onClick={tryLogin} disabled={!secret}>כניסה</PrimaryButton>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: "system-ui, -apple-system, sans-serif", color: TEXT }} dir="rtl">
      {/* Header */}
      <div style={{ background: "white", borderBottom: `1px solid ${BORDER}`, padding: "0 24px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 900, fontSize: 18 }}>אבא חטוב · ניהול</span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              value={createdBy}
              onChange={(e) => setCreatedBy(e.target.value)}
              placeholder="השם שלך (לתיעוד)"
              style={{ ...inputStyle, width: 180, padding: "7px 12px", fontSize: 13 }}
            />
            <button
              onClick={handleLogout}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, border: `1.5px solid ${BORDER}`, background: "white", cursor: "pointer", fontSize: 13, fontWeight: 600, color: MUTED }}
            >
              <LogOut size={14} /> יציאה
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "20px 24px 0", display: "flex", gap: 8 }}>
        {([
          ["create", "הוסף לקוח", UserPlus],
          ["import", "ייבוא קובץ", Upload],
          ["users", "לקוחות", Users],
          ["wings", "מבנים ציבוריים", Building2],
        ] as [Tab, string, React.ElementType][]).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: "10px 10px 0 0",
              border: "none", borderBottom: tab === id ? "3px solid #ff6b47" : "3px solid transparent",
              background: tab === id ? "white" : "transparent", cursor: "pointer",
              fontWeight: tab === id ? 800 : 600, fontSize: 14, color: tab === id ? TEXT : MUTED,
            }}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px", background: "white", borderRadius: "0 0 20px 20px", minHeight: 400 }}>
        {tab === "create" && <CreateTab secret={savedSecret} createdBy={createdBy} wings={wings ?? []} onCreated={() => fetchWings(savedSecret)} />}
        {tab === "import" && <ImportTab secret={savedSecret} createdBy={createdBy} wings={wings ?? []} onImported={() => fetchWings(savedSecret)} />}
        {tab === "users" && <UsersTab secret={savedSecret} />}
        {tab === "wings" && <WingsTab secret={savedSecret} createdBy={createdBy} wings={wings} onChanged={() => fetchWings(savedSecret)} />}
      </div>
    </div>
  );
}

// ── Create tab ────────────────────────────────────────────────────────────────
function CreateTab({ secret, createdBy, wings, onCreated }: { secret: string; createdBy: string; wings: FitDadWingRow[]; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [plan, setPlan] = useState<Plan>("3m");
  const [wingId, setWingId] = useState(""); // "" = new private wing
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ whatsappUrl: string } | null>(null);

  async function submit() {
    setError("");
    setResult(null);
    if (!createdBy.trim()) { setError("מלא/י קודם את \"השם שלך\" למעלה — נשמר כתיעוד מי הזין את הלקוח."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/fitdad/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ name, email, phone, plan, wingId: wingId || undefined, createdBy }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error === "EMAIL_EXISTS" ? "כבר קיים חשבון עם המייל הזה" : data.error ?? "שגיאה");
        return;
      }
      setResult({ whatsappUrl: data.whatsappUrl });
      setName(""); setEmail(""); setPhone(""); setWingId("");
      onCreated();
    } catch {
      setError("שגיאת רשת");
    } finally {
      setLoading(false);
    }
  }

  const availableWings = wings.filter((w) => w.memberCount < w.capacity);

  return (
    <div style={{ maxWidth: 440 }}>
      <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 18 }}>הוספת לקוח ידנית</h2>
      <Field label="שם מלא"><input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="אימייל"><input type="email" style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      <Field label="טלפון (זו תהיה הסיסמה ההתחלתית)"><input style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05XXXXXXXX" /></Field>
      <Field label="מסלול">
        <select style={inputStyle} value={plan} onChange={(e) => setPlan(e.target.value as Plan)}>
          {(Object.keys(PLAN_LABELS) as Plan[]).map((p) => <option key={p} value={p}>{PLAN_LABELS[p]}</option>)}
        </select>
      </Field>
      <Field label="מבנה כנף">
        <select style={inputStyle} value={wingId} onChange={(e) => setWingId(e.target.value)}>
          <option value="">הלקוח יבחר בעצמו באונבורדינג</option>
          {availableWings.map((w) => (
            <option key={w.id} value={w.id}>{w.name} ({w.visibility === "public" ? "ציבורי" : "פרטי"}, {w.memberCount}/{w.capacity})</option>
          ))}
        </select>
      </Field>
      {error && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{error}</p>}
      <PrimaryButton onClick={submit} disabled={loading || !name || !email || !phone}>
        {loading ? "יוצר..." : "צור חשבון"}
      </PrimaryButton>

      {result && (
        <div style={{ marginTop: 20, padding: 16, background: BG, borderRadius: 12, border: `1px solid ${BORDER}` }}>
          <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>נוצר בהצלחה!</p>
          <a href={result.whatsappUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "#22c55e", fontWeight: 700, textDecoration: "underline" }}>
            שלח/י ללקוח את פרטי ההתחברות בוואטסאפ
          </a>
        </div>
      )}
    </div>
  );
}

// ── Import tab ────────────────────────────────────────────────────────────────
function ImportTab({ secret, createdBy, wings, onImported }: { secret: string; createdBy: string; wings: FitDadWingRow[]; onImported: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [preview, setPreview] = useState<{ row: ImportRow; error: string | null }[] | null>(null);
  const [results, setResults] = useState<{ row: ImportRow; uid?: string; error?: string }[] | null>(null);
  const [loading, setLoading] = useState(false);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(null);
    setResults(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const table = parseCsv(text);
      // First row is a header — skip it.
      const parsed: ImportRow[] = table.slice(1).map((cells) => ({
        name: cells[0]?.trim() ?? "",
        email: cells[1]?.trim() ?? "",
        phone: cells[2]?.trim() ?? "",
        plan: cells[3]?.trim() ?? "",
        wingId: cells[4]?.trim() || undefined,
      }));
      setRows(parsed);
    };
    reader.readAsText(file, "utf-8");
  }

  async function runPreview() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/fitdad/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ rows, preview: true }),
      });
      const data = await res.json();
      setPreview(data.results);
    } finally {
      setLoading(false);
    }
  }

  async function runCommit() {
    if (!createdBy.trim()) { alert('מלא/י קודם את "השם שלך" למעלה'); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/fitdad/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ rows, createdBy }),
      });
      const data = await res.json();
      setResults(data.results);
      onImported();
    } finally {
      setLoading(false);
    }
  }

  const allValid = preview?.every((r) => !r.error);

  return (
    <div>
      <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 8 }}>ייבוא קובץ (CSV)</h2>
      <p style={{ fontSize: 13, color: MUTED, marginBottom: 16 }}>
        עמודות בסדר הזה (שורה ראשונה = כותרות, מדולגת): שם מלא, אימייל, טלפון, מסלול (3m/6m/12m), מבנה כנף (ריק = הלקוח יבחר בעצמו באונבורדינג — ציבורי/פרטי; אחרת ה-ID מלשונית &quot;מבנים ציבוריים&quot; כדי לשבץ מראש).
        אפשר לפתוח/לשמור כ-CSV מכל תוכנת אקסל.
      </p>
      <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} style={{ marginBottom: 16 }} />

      {rows.length > 0 && !results && (
        <>
          <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{rows.length} שורות נטענו</p>
          <PrimaryButton onClick={runPreview} disabled={loading}>{loading ? "בודק..." : "בדיקה מקדימה"}</PrimaryButton>
        </>
      )}

      {preview && (
        <div style={{ marginTop: 20 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: BG }}>
                <th style={{ padding: "8px 12px", textAlign: "right" }}>שם</th>
                <th style={{ padding: "8px 12px", textAlign: "right" }}>אימייל</th>
                <th style={{ padding: "8px 12px", textAlign: "right" }}>מסלול</th>
                <th style={{ padding: "8px 12px", textAlign: "right" }}>סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((r, i) => (
                <tr key={i} style={{ borderTop: `1px solid ${BORDER}` }}>
                  <td style={{ padding: "8px 12px" }}>{r.row.name}</td>
                  <td style={{ padding: "8px 12px", color: MUTED }}>{r.row.email}</td>
                  <td style={{ padding: "8px 12px" }}>{r.row.plan}</td>
                  <td style={{ padding: "8px 12px", color: r.error ? "#ef4444" : "#22c55e", fontWeight: 700 }}>
                    {r.error ?? "תקין"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 16 }}>
            <PrimaryButton onClick={runCommit} disabled={loading || !allValid}>
              {loading ? "יוצר חשבונות..." : `צור ${preview.length} חשבונות`}
            </PrimaryButton>
            {!allValid && <p style={{ fontSize: 12, color: "#ef4444", marginTop: 8 }}>יש שורות עם שגיאה — תקן/י את הקובץ ונסה/י שוב לפני היצירה.</p>}
          </div>
        </div>
      )}

      {results && (
        <div style={{ marginTop: 20 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: BG }}>
                <th style={{ padding: "8px 12px", textAlign: "right" }}>שם</th>
                <th style={{ padding: "8px 12px", textAlign: "right" }}>תוצאה</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} style={{ borderTop: `1px solid ${BORDER}` }}>
                  <td style={{ padding: "8px 12px" }}>{r.row.name}</td>
                  <td style={{ padding: "8px 12px", color: r.error ? "#ef4444" : "#22c55e", fontWeight: 700 }}>
                    {r.error ?? "נוצר בהצלחה"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Users tab ─────────────────────────────────────────────────────────────────
function UsersTab({ secret }: { secret: string }) {
  const [users, setUsers] = useState<FitDadUserRow[] | null>(null);

  useEffect(() => {
    fetch("/api/admin/fitdad/users", { headers: { "x-admin-secret": secret } })
      .then((r) => r.json())
      .then((d) => setUsers(d.users))
      .catch(() => setUsers([]));
  }, [secret]);

  if (users === null) return <p style={{ color: MUTED, fontSize: 13 }}>טוען...</p>;

  return (
    <div>
      <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 16 }}>לקוחות אבא חטוב ({users.length})</h2>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: BG }}>
            <th style={{ padding: "8px 12px", textAlign: "right" }}>שם</th>
            <th style={{ padding: "8px 12px", textAlign: "right" }}>אימייל</th>
            <th style={{ padding: "8px 12px", textAlign: "center" }}>מסלול</th>
            <th style={{ padding: "8px 12px", textAlign: "center" }}>תפוגה</th>
            <th style={{ padding: "8px 12px", textAlign: "center" }}>סיסמה שונתה</th>
            <th style={{ padding: "8px 12px", textAlign: "right" }}>הוזן ע"י</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const days = daysUntil(u.expiresAt);
            const soon = days !== null && days <= 14;
            return (
              <tr key={u.uid} style={{ borderTop: `1px solid ${BORDER}` }}>
                <td style={{ padding: "8px 12px", fontWeight: 600 }}>{u.displayName}</td>
                <td style={{ padding: "8px 12px", color: MUTED }}>{u.email}</td>
                <td style={{ padding: "8px 12px", textAlign: "center" }}>{u.plan ? PLAN_LABELS[u.plan] : "—"}</td>
                <td style={{ padding: "8px 12px", textAlign: "center", color: soon ? "#ef4444" : TEXT, fontWeight: soon ? 800 : 400 }}>
                  {fmtDate(u.expiresAt)} {soon && days !== null && `(${days} ימים)`}
                </td>
                <td style={{ padding: "8px 12px", textAlign: "center" }}>{u.mustChangePassword ? "עדיין לא" : "כן"}</td>
                <td style={{ padding: "8px 12px", color: MUTED }}>{u.createdBy ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Wings (public pool) tab ───────────────────────────────────────────────────
function WingsTab({ secret, createdBy, wings, onChanged }: { secret: string; createdBy: string; wings: FitDadWingRow[] | null; onChanged: () => void }) {
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("20");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function createWing() {
    setError("");
    if (!createdBy.trim()) { setError('מלא/י קודם את "השם שלך" למעלה'); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/fitdad/wings", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ wings: [{ name, capacity: Number(capacity) || 20 }], createdBy }),
      });
      if (!res.ok) { setError("שגיאה ביצירה"); return; }
      setName("");
      onChanged();
    } finally {
      setLoading(false);
    }
  }

  const publicWings = (wings ?? []).filter((w) => w.visibility === "public");
  const privateWings = (wings ?? []).filter((w) => w.visibility === "private");

  return (
    <div>
      <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 12 }}>יצירת מבנה ציבורי חדש</h2>
      <div style={{ display: "flex", gap: 10, marginBottom: 8, maxWidth: 440 }}>
        <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="שם המבנה" />
        <input style={{ ...inputStyle, width: 90 }} type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
        <PrimaryButton onClick={createWing} disabled={loading || !name}>{loading ? "יוצר..." : "צור"}</PrimaryButton>
      </div>
      {error && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{error}</p>}

      <h3 style={{ fontSize: 15, fontWeight: 800, margin: "24px 0 10px" }}>פול ציבורי ({publicWings.length})</h3>
      <WingTable rows={publicWings} />

      <h3 style={{ fontSize: 15, fontWeight: 800, margin: "24px 0 10px" }}>מבנים פרטיים ({privateWings.length})</h3>
      <WingTable rows={privateWings} />
    </div>
  );
}

function WingTable({ rows }: { rows: FitDadWingRow[] }) {
  if (rows.length === 0) return <p style={{ fontSize: 13, color: MUTED }}>אין עדיין</p>;
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr style={{ background: BG }}>
          <th style={{ padding: "8px 12px", textAlign: "right" }}>שם</th>
          <th style={{ padding: "8px 12px", textAlign: "center" }}>חברים</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((w) => (
          <tr key={w.id} style={{ borderTop: `1px solid ${BORDER}` }}>
            <td style={{ padding: "8px 12px" }}>{w.name}</td>
            <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700 }}>{w.memberCount}/{w.capacity}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
