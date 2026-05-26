"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWing } from "@/hooks/useWing";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { SOSButton } from "@/components/wing/SOSButton";
import { ProgressBar } from "@/components/ui/ProgressBar";
import toast from "react-hot-toast";
import { Copy, Pencil, Trophy, UserPlus, Flame } from "lucide-react";
import { getWingCheckins } from "@/lib/firebase/firestore";
import type { DailyCheckin } from "@/types";
import { format, subDays } from "date-fns";

export default function WingPage() {
  const { user, firebaseUser } = useAuth();
  const { wing, loading } = useWing(user?.wingId);
  const { t } = useLanguage();

  const [wingName, setWingName] = useState("");
  const [joinToken, setJoinToken] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingWing, setRenamingWing] = useState(false);
  const [origin, setOrigin] = useState("");
  const [recentCheckins, setRecentCheckins] = useState<DailyCheckin[]>([]);
  const [memberStreaks, setMemberStreaks] = useState<Record<string, number>>({});

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!user?.wingId) return;
    const today = format(new Date(), "yyyy-MM-dd");
    Promise.all([
      getWingCheckins(user.wingId, today),
      getWingCheckins(user.wingId, format(subDays(new Date(), 1), "yyyy-MM-dd")),
      getWingCheckins(user.wingId, format(subDays(new Date(), 2), "yyyy-MM-dd")),
    ]).then(([d0, d1, d2]) => {
      setRecentCheckins([...d0, ...d1, ...d2]);
      const streaks: Record<string, number> = {};
      const byUser = new Map<string, Set<string>>();
      for (const c of [...d0, ...d1, ...d2]) {
        if (!byUser.has(c.userId)) byUser.set(c.userId, new Set());
        byUser.get(c.userId)!.add(c.date);
      }
      for (const [uid, days] of byUser.entries()) {
        let streak = 0;
        for (let i = 0; i < 3; i++) {
          const d = format(subDays(new Date(), i), "yyyy-MM-dd");
          if (days.has(d)) streak++;
          else break;
        }
        streaks[uid] = streak;
      }
      setMemberStreaks(streaks);
    });
  }, [user?.wingId]);

  const members = Array.isArray(wing?.members) ? wing.members : [];
  const memberCount = Array.isArray(wing?.memberIds) ? wing.memberIds.length : members.length;
  const inviteLink = wing?.inviteToken ? `${origin}/join/${wing.inviteToken}` : "";

  async function handleCreate() {
    if (!wingName.trim() || !firebaseUser || !user) return;
    setCreating(true);
    try {
      const res = await fetch("/api/wing/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerId: firebaseUser.uid, ownerName: user.displayName, name: wingName.trim() }),
      });
      if (!res.ok) throw new Error();
      toast.success((t("wing_created") as (name: string) => string)(wingName));
      window.location.reload();
    } catch {
      toast.error(t("wing_create_error") as string);
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin() {
    if (!joinToken.trim() || !firebaseUser || !user) return;
    setJoining(true);
    try {
      const res = await fetch("/api/wing/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: joinToken.trim(), userId: firebaseUser.uid, displayName: user.displayName, photoURL: user.photoURL }),
      });
      if (!res.ok) throw new Error("token-invalid");
      toast.success(t("wing_joined") as string);
      window.location.reload();
    } catch {
      toast.error(t("wing_join_error") as string);
    } finally {
      setJoining(false);
    }
  }

  async function handleRename() {
    if (!newName.trim() || !wing) return;
    setRenamingWing(true);
    try {
      const res = await fetch("/api/wing/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wingId: wing.id, name: newName.trim() }),
      });
      if (!res.ok) throw new Error();
      toast.success(t("wing_rename_saved") as string);
      setEditingName(false);
    } catch {
      toast.error(t("wing_rename_error") as string);
    } finally {
      setRenamingWing(false);
    }
  }

  async function copyInvite() {
    if (!inviteLink) { toast.error(t("wing_invite_error") as string); return; }
    await navigator.clipboard.writeText(inviteLink);
    toast.success(t("wing_invite_copied") as string);
  }

  const today = format(new Date(), "yyyy-MM-dd");
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");

  function whenLabel(date: string) {
    if (date === today) return t("wing_today") as string;
    if (date === yesterday) return t("wing_yesterday") as string;
    return t("wing_two_days_ago") as string;
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4 pt-8">
        {[1, 2].map((i) => <div key={i} className="h-32 bg-wing-surface rounded-3xl animate-pulse border border-wing-border" />)}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="pt-4">
        <h1 className="text-2xl font-black text-wing-ink tracking-tight">{t("wing_title")}</h1>
      </div>

      {wing ? (
        <>
          {/* Wing header card */}
          <div className="bg-wing-surface border border-wing-border rounded-[20px] p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                {editingName ? (
                  <div className="space-y-2">
                    <input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="text-lg font-black text-wing-ink bg-transparent border-b-2 border-wing-ink outline-none w-full"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename();
                        if (e.key === "Escape") setEditingName(false);
                      }}
                    />
                    <div className="flex gap-2">
                      <button onClick={handleRename} disabled={renamingWing}
                        className="text-xs bg-wing-ink text-wing-elevated px-3 py-1 rounded-full font-bold">
                        {renamingWing ? t("wing_rename_saving") : t("save")}
                      </button>
                      <button onClick={() => setEditingName(false)}
                        className="text-xs text-wing-muted px-3 py-1 rounded-full bg-wing-elevated border border-wing-border">
                        {t("cancel")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-wing-ink">
                      {wing.name || <span className="text-wing-muted italic">{t("wing_no_name")}</span>}
                    </h2>
                    <button onClick={() => { setNewName(wing.name); setEditingName(true); }}
                      className="p-1.5 hover:bg-wing-elevated rounded-lg transition-colors">
                      <Pencil size={14} className="text-wing-muted" />
                    </button>
                  </div>
                )}
                <p className="text-sm text-wing-muted mt-0.5">
                  {(t("wing_members_count") as (n: number) => string)(memberCount)}
                </p>
              </div>
              <div className="text-3xl">🪽</div>
            </div>

            {/* Members list */}
            <div className="space-y-2">
              {members.map((m) => {
                const isMe = m.uid === firebaseUser?.uid;
                const isOwner = m.uid === wing.ownerId;
                return (
                  <div key={m.uid} className="flex items-center gap-3 py-1">
                    <Avatar
                      name={m.displayName ?? "?"}
                      photoURL={m.photoURL}
                      size={36}
                      isCurrentUser={isMe}
                      showYouBadge={isMe}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${isMe ? "text-wing-ink" : "text-slate-700"}`}>
                        {m.displayName ?? ""}
                      </p>
                    </div>
                    {isOwner && (
                      <span className="font-mono text-[11px] tracking-[0.14em] uppercase text-wing-muted bg-wing-elevated border border-wing-border px-2 py-0.5 rounded-full">
                        {t("wing_admin")}
                      </span>
                    )}
                    {(memberStreaks[m.uid] ?? 0) > 0 && (
                      <div className="mr-auto flex flex-col items-center">
                        <span className="font-mono font-bold text-[11px]" style={{ color: "#d4541a" }}>
                          {memberStreaks[m.uid]}
                        </span>
                        <span className="font-mono text-[11px] text-wing-muted uppercase tracking-wider">{t("wing_days_streak")}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Invite row */}
            <button
              onClick={copyInvite}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-[14px] border-2 border-dashed border-wing-border text-sm font-semibold text-wing-muted hover:border-wing-ink hover:text-wing-ink transition-colors"
            >
              <UserPlus size={16} />
              {t("wing_invite_btn")}
              <Copy size={14} className="opacity-60" />
            </button>
          </div>

          {/* Active challenge */}
          {wing.activeChallenge && (
            <div
              className="rounded-[20px] p-5 space-y-3"
              style={{ background: "linear-gradient(135deg, #fff3b8, #ffc89a)" }}
            >
              <div className="flex items-center gap-2">
                <Trophy size={18} className="text-[#c79a00]" />
                <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-[#c79a00]">
                  {t("wing_weekly_challenge")}
                </span>
              </div>
              <p className="text-[18px] font-extrabold text-wing-ink leading-snug">{wing.activeChallenge.title}</p>
              {wing.activeChallenge.description && (
                <p className="text-sm text-wing-ink/70">{wing.activeChallenge.description}</p>
              )}
              {wing.activeChallenge.progress && wing.activeChallenge.targetValue && (
                <ProgressBar
                  value={Object.values(wing.activeChallenge.progress).reduce((a, b) => a + b, 0)}
                  max={wing.activeChallenge.targetValue * memberCount}
                  height="sm"
                  color="bg-[#1a1814]"
                />
              )}
            </div>
          )}

          {/* SOS */}
          {firebaseUser && user && (
            <SOSButton wingId={wing.id} userId={firebaseUser.uid} userName={user.displayName} />
          )}

          {/* Activity Feed */}
          {recentCheckins.filter((c) => c.daySummary || c.workout?.done).length > 0 && (
            <div className="bg-wing-surface border border-wing-border rounded-[20px] p-5 space-y-3">
              <span className="font-bold text-sm text-wing-ink">{t("wing_activity")}</span>
              <div className="space-y-3">
                {recentCheckins
                  .filter((c) => c.daySummary || c.workout?.done)
                  .slice(0, 4)
                  .map((c, i) => {
                    const action = c.daySummary
                      ? t("wing_closed_day") as string
                      : c.workout?.done
                      ? (t("wing_workout_action") as (type: string) => string)(c.workout.type ?? "")
                      : t("wing_checkin_action") as string;
                    return (
                      <div key={`${c.id}-${i}`} className="flex items-start gap-3">
                        <Avatar name={c.userName} size={32} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-wing-ink">
                            <span className="font-semibold">{c.userName.split(" ")[0]}</span>
                            {" "}{action}
                          </p>
                          <p className="font-mono text-[11px] text-wing-muted tracking-wider mt-0.5">
                            {whenLabel(c.date)}
                          </p>
                          {c.daySummary?.tip && (
                            <div
                              className="mt-1.5 px-3 py-2 rounded-[10px] text-xs text-wing-ink/80"
                              style={{ background: "linear-gradient(135deg, #fff3b8, #ffe0c8)" }}
                            >
                              {c.daySummary.tip}
                            </div>
                          )}
                        </div>
                        {c.workout?.caloriesBurned && (
                          <span className="flex items-center gap-0.5 font-mono text-xs font-bold flex-shrink-0" style={{ color: "#d4541a" }}>
                            <Flame size={11} /> {c.workout.caloriesBurned}
                          </span>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4">
          <div className="bg-wing-surface border border-wing-border rounded-[20px] p-5 space-y-4">
            <div>
              <h2 className="font-bold text-wing-ink">{t("wing_create_title")}</h2>
              <p className="text-sm text-wing-muted mt-1">{t("wing_create_sub")}</p>
            </div>
            <Input
              label={t("wing_name_label") as string}
              value={wingName}
              onChange={(e) => setWingName(e.target.value)}
              placeholder={t("wing_name_ph") as string}
            />
            <Button onClick={handleCreate} loading={creating} className="w-full">
              {t("wing_create_btn")}
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-wing-border" />
            <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-wing-muted">{t("wing_or")}</span>
            <div className="flex-1 h-px bg-wing-border" />
          </div>

          <div className="bg-wing-surface border border-wing-border rounded-[20px] p-5 space-y-4">
            <div>
              <h2 className="font-bold text-wing-ink">{t("wing_join_title")}</h2>
              <p className="text-sm text-wing-muted mt-1">{t("wing_join_sub")}</p>
            </div>
            <Input
              label={t("wing_token_label") as string}
              value={joinToken}
              onChange={(e) => setJoinToken(e.target.value)}
              placeholder="XXXXXXXXXX"
              dir="ltr"
            />
            <Button variant="secondary" onClick={handleJoin} loading={joining} className="w-full">
              {t("wing_join_btn")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
