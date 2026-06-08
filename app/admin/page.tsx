"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Building2, TrendingUp, Crown, Activity, BarChart3, RefreshCw, LogOut, CheckSquare, UtensilsCrossed, Lock } from "lucide-react";

type Stats = {
  users: {
    total: number;
    newThisWeek: number;
    newThisMonth: number;
    premium: number;
    free: number;
    recent: {
      uid: string;
      displayName: string;
      email: string;
      plan: string;
      hasWing: boolean;
      createdAt: string | null;
    }[];
  };
  wings: {
    total: number;
    newThisWeek: number;
    sizeDistribution: { solo: number; small: number; medium: number; large: number };
    recent: {
      id: string;
      name: string;
      memberCount: number;
      ownerName: string;
      createdAt: string | null;
    }[];
  };
  activity: {
    checkinsToday: number;
    mealsToday: number;
    checkinsWeek: number;
    mealsWeek: number;
  };
  generatedAt: string;
};

function fmt(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function PlanBadge({ plan }: { plan: string }) {
  if (plan === "premium")      return <span style={{ background: "linear-gradient(90deg,#f5dd4b,#ff6b47)", color: "#1a1814", fontWeight: 700 }} className="px-2 py-0.5 rounded-full text-xs">Premium</span>;
  if (plan === "grandfathered") return <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700 font-bold">Legacy</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">Free</span>;
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: React.ElementType; label: string; value: number | string; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#ede7d8] p-5 flex items-start gap-4 shadow-sm">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + "22" }}>
        <Icon size={22} style={{ color }} />
      </div>
      <div>
        <p className="text-xs font-semibold text-[#8a7e6a] uppercase tracking-widest mb-0.5">{label}</p>
        <p className="text-3xl font-black text-[#1a1814] leading-none">{value}</p>
        {sub && <p className="text-xs text-[#8a7e6a] mt-1">{sub}</p>}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [savedSecret, setSavedSecret] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  useEffect(() => {
    const s = sessionStorage.getItem("admin_secret");
    if (s) { setSavedSecret(s); }
  }, []);

  const fetchStats = useCallback(async (key: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/stats", { headers: { "x-admin-secret": key } });
      if (res.status === 401) { setError("סיסמה שגויה"); setLoading(false); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Stats = await res.json();
      setStats(data);
      setSavedSecret(key);
      sessionStorage.setItem("admin_secret", key);
      setLastRefreshed(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (savedSecret && !stats) fetchStats(savedSecret);
  }, [savedSecret, stats, fetchStats]);

  function handleLogout() {
    sessionStorage.removeItem("admin_secret");
    setSavedSecret(null);
    setStats(null);
    setSecret("");
  }

  // ── Login screen ────────────────────────────────────────────────────────────
  if (!savedSecret) {
    return (
      <div style={{ minHeight: "100vh", background: "#fbf4e6", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ background: "white", borderRadius: 24, padding: 40, width: 340, boxShadow: "0 4px 24px rgba(0,0,0,0.06)", border: "1px solid #ede7d8", textAlign: "center" }}>
          <div style={{ width: 56, height: 56, background: "linear-gradient(135deg,#f5dd4b,#ff6b47)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <Lock size={24} color="#1a1814" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: "#1a1814", marginBottom: 4 }}>Admin Dashboard</h1>
          <p style={{ fontSize: 13, color: "#8a7e6a", marginBottom: 28 }}>Wingpact · Internal</p>
          {error && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && secret && fetchStats(secret)}
            placeholder="Admin secret"
            style={{ width: "100%", padding: "12px 16px", border: "1.5px solid #ede7d8", borderRadius: 12, fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 12, background: "#fbf4e6" }}
            autoFocus
          />
          <button
            onClick={() => fetchStats(secret)}
            disabled={!secret || loading}
            style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: "none", background: "linear-gradient(90deg,#f5dd4b,#ff6b47)", fontWeight: 800, fontSize: 15, cursor: "pointer", color: "#1a1814", opacity: (!secret || loading) ? 0.5 : 1 }}
          >
            {loading ? "טוען..." : "כניסה"}
          </button>
        </div>
      </div>
    );
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading && !stats) {
    return (
      <div style={{ minHeight: "100vh", background: "#fbf4e6", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ textAlign: "center", color: "#8a7e6a" }}>
          <div style={{ width: 40, height: 40, border: "3px solid #f5dd4b", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <p style={{ fontSize: 14 }}>טוען נתונים...</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const { users, wings, activity } = stats;
  const premiumPct = users.total > 0 ? Math.round((users.premium / users.total) * 100) : 0;
  const freePct    = 100 - premiumPct;

  return (
    <div style={{ minHeight: "100vh", background: "#fbf4e6", fontFamily: "system-ui, -apple-system, sans-serif", color: "#1a1814" }}>
      {/* Header */}
      <div style={{ background: "white", borderBottom: "1px solid #ede7d8", padding: "0 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <svg width="32" height="20" viewBox="0 0 60 36" fill="none">
              <defs><linearGradient id="wl-admin" x1="0" y1="0" x2="60" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#f5dd4b"/><stop offset="1" stopColor="#ff6b47"/></linearGradient></defs>
              <path d="M4 30 L30 8 L56 30" stroke="url(#wl-admin)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="30" cy="8" r="3" fill="#d4541a"/>
              <circle cx="17" cy="19" r="1.8" fill="#1a1814"/>
              <circle cx="43" cy="19" r="1.8" fill="#1a1814"/>
            </svg>
            <span style={{ fontWeight: 900, fontSize: 18, color: "#1a1814" }}>Wingpact Admin</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {lastRefreshed && <span style={{ fontSize: 12, color: "#8a7e6a" }}>עודכן {lastRefreshed.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}</span>}
            <button
              onClick={() => fetchStats(savedSecret!)}
              disabled={loading}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, border: "1.5px solid #ede7d8", background: "white", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#1a1814" }}
            >
              <RefreshCw size={14} style={{ animation: loading ? "spin 0.8s linear infinite" : "none" }} />
              רענן
            </button>
            <button
              onClick={handleLogout}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, border: "1.5px solid #ede7d8", background: "white", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#8a7e6a" }}
            >
              <LogOut size={14} />
              יציאה
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px" }}>

        {/* ── Main KPIs ─────────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 28 }}>
          <StatCard icon={Users}        label="סה״כ משתמשים"    value={users.total}         sub={`+${users.newThisMonth} החודש`}              color="#6366f1" />
          <StatCard icon={TrendingUp}   label="משתמשים חדשים"   value={users.newThisWeek}   sub="7 ימים אחרונים"                              color="#22c55e" />
          <StatCard icon={Crown}        label="פרימיום"          value={users.premium}       sub={`${premiumPct}% מהמשתמשים`}                  color="#f59e0b" />
          <StatCard icon={Building2}    label="מבני כנף"         value={wings.total}         sub={`+${wings.newThisWeek} השבוע`}               color="#ff6b47" />
          <StatCard icon={CheckSquare}  label="צ׳ק-אינים היום"  value={activity.checkinsToday}  sub={`${activity.checkinsWeek} השבוע`}        color="#06b6d4" />
          <StatCard icon={UtensilsCrossed} label="ארוחות היום"  value={activity.mealsToday}  sub={`${activity.mealsWeek} השבוע`}             color="#ec4899" />
        </div>

        {/* ── Second row ────────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 28 }}>
          {/* Conversion bar */}
          <div className="bg-white rounded-2xl border border-[#ede7d8] p-5 shadow-sm">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <BarChart3 size={18} color="#ff6b47" />
              <span style={{ fontWeight: 700, fontSize: 15 }}>התפלגות תוכניות</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { label: "Free",    value: users.free,    color: "#d1d5db", pct: freePct     },
                { label: "Premium", value: users.premium, color: "#f5dd4b", pct: premiumPct  },
              ].map(({ label, value, color, pct }) => (
                <div key={label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1814" }}>{label}</span>
                    <span style={{ fontSize: 13, color: "#8a7e6a" }}>{value} ({pct}%)</span>
                  </div>
                  <div style={{ height: 8, background: "#f5f0e8", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width 0.6s ease" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Wing sizes */}
          <div className="bg-white rounded-2xl border border-[#ede7d8] p-5 shadow-sm">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Activity size={18} color="#ff6b47" />
              <span style={{ fontWeight: 700, fontSize: 15 }}>גדלי מבני כנף</span>
            </div>
            {[
              { label: "Solo (1)",   count: wings.sizeDistribution.solo,   color: "#d1d5db" },
              { label: "קטן (2–3)", count: wings.sizeDistribution.small,  color: "#86efac" },
              { label: "בינוני (4–6)", count: wings.sizeDistribution.medium, color: "#fcd34d" },
              { label: "גדול (7+)", count: wings.sizeDistribution.large,  color: "#ff6b47" },
            ].map(({ label, count, color }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
                  <span style={{ fontSize: 13, color: "#1a1814" }}>{label}</span>
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1814" }}>{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tables ────────────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 16 }}>

          {/* Recent Users */}
          <div style={{ background: "white", borderRadius: 20, border: "1px solid #ede7d8", overflow: "hidden", boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #f5f0e8", display: "flex", alignItems: "center", gap: 8 }}>
              <Users size={16} color="#ff6b47" />
              <span style={{ fontWeight: 700, fontSize: 15 }}>10 משתמשים אחרונים</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#fbf4e6" }}>
                    <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, color: "#8a7e6a", whiteSpace: "nowrap" }}>שם</th>
                    <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, color: "#8a7e6a", whiteSpace: "nowrap" }}>אימייל</th>
                    <th style={{ padding: "10px 16px", textAlign: "center", fontWeight: 600, color: "#8a7e6a" }}>תוכנית</th>
                    <th style={{ padding: "10px 16px", textAlign: "center", fontWeight: 600, color: "#8a7e6a" }}>כנף</th>
                    <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, color: "#8a7e6a", whiteSpace: "nowrap" }}>נרשם</th>
                  </tr>
                </thead>
                <tbody>
                  {users.recent.map((u, i) => (
                    <tr key={u.uid} style={{ borderTop: "1px solid #f5f0e8", background: i % 2 === 0 ? "white" : "#fdfaf5" }}>
                      <td style={{ padding: "10px 16px", fontWeight: 600, color: "#1a1814", whiteSpace: "nowrap" }}>{u.displayName}</td>
                      <td style={{ padding: "10px 16px", color: "#8a7e6a", fontSize: 12 }}>{u.email}</td>
                      <td style={{ padding: "10px 16px", textAlign: "center" }}><PlanBadge plan={u.plan} /></td>
                      <td style={{ padding: "10px 16px", textAlign: "center", fontSize: 12 }}>
                        {u.hasWing ? <span style={{ color: "#22c55e", fontWeight: 700 }}>✓</span> : <span style={{ color: "#d1d5db" }}>—</span>}
                      </td>
                      <td style={{ padding: "10px 16px", color: "#8a7e6a", fontSize: 12, whiteSpace: "nowrap" }}>{fmt(u.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Wings */}
          <div style={{ background: "white", borderRadius: 20, border: "1px solid #ede7d8", overflow: "hidden", boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #f5f0e8", display: "flex", alignItems: "center", gap: 8 }}>
              <Building2 size={16} color="#ff6b47" />
              <span style={{ fontWeight: 700, fontSize: 15 }}>5 מבני כנף אחרונים</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#fbf4e6" }}>
                  <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, color: "#8a7e6a" }}>שם</th>
                  <th style={{ padding: "10px 16px", textAlign: "center", fontWeight: 600, color: "#8a7e6a" }}>חברים</th>
                  <th style={{ padding: "10px 16px", textAlign: "right", fontWeight: 600, color: "#8a7e6a" }}>נוצר</th>
                </tr>
              </thead>
              <tbody>
                {wings.recent.map((w, i) => (
                  <tr key={w.id} style={{ borderTop: "1px solid #f5f0e8", background: i % 2 === 0 ? "white" : "#fdfaf5" }}>
                    <td style={{ padding: "10px 16px" }}>
                      <div style={{ fontWeight: 600, color: "#1a1814" }}>{w.name}</div>
                      <div style={{ fontSize: 11, color: "#8a7e6a" }}>{w.ownerName}</div>
                    </td>
                    <td style={{ padding: "10px 16px", textAlign: "center" }}>
                      <span style={{ background: "#f5dd4b22", color: "#b45309", fontWeight: 700, padding: "2px 10px", borderRadius: 99, fontSize: 13 }}>{w.memberCount}</span>
                    </td>
                    <td style={{ padding: "10px 16px", color: "#8a7e6a", fontSize: 12, whiteSpace: "nowrap" }}>{fmt(w.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Footer note */}
            <div style={{ padding: "12px 16px", borderTop: "1px solid #f5f0e8", textAlign: "center" }}>
              <span style={{ fontSize: 11, color: "#8a7e6a" }}>
                נתונים נכון ל-{new Date(stats.generatedAt).toLocaleString("he-IL")}
              </span>
            </div>
          </div>

        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
