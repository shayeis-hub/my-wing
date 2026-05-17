"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWing } from "@/hooks/useWing";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SOSButton } from "@/components/wing/SOSButton";
import { renameWing, regenerateInviteToken } from "@/lib/firebase/firestore";
import toast from "react-hot-toast";

export default function WingPage() {
  const { user, firebaseUser } = useAuth();
  const { wing, loading } = useWing(user?.wingId);

  const [wingName, setWingName] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  // Rename state
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingWing, setRenamingWing] = useState(false);

  // Build invite link using window.location.origin so it works everywhere
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // Auto-fix missing inviteToken when wing loads
  useEffect(() => {
    if (wing && !wing.inviteToken && firebaseUser) {
      regenerateInviteToken(wing.id).catch(() => {});
    }
  }, [wing, firebaseUser]);

  const inviteLink = wing?.inviteToken ? `${origin}/join/${wing.inviteToken}` : "";

  async function handleCreate() {
    if (!wingName.trim() || !firebaseUser || !user) return;
    setCreating(true);
    try {
      const res = await fetch("/api/wing/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId: firebaseUser.uid,
          ownerName: user.displayName,
          name: wingName.trim(),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(`המבנה "${wingName}" נוצר! 🪽`);
      window.location.reload();
    } catch {
      toast.error("שגיאה ביצירת המבנה");
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin() {
    if (!inviteToken.trim() || !firebaseUser || !user) return;
    setJoining(true);
    try {
      const res = await fetch("/api/wing/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: inviteToken.trim(),
          userId: firebaseUser.uid,
          displayName: user.displayName,
          photoURL: user.photoURL,
        }),
      });
      if (!res.ok) throw new Error("token-invalid");
      toast.success("הצטרפת למבנה! 🎉");
      window.location.reload();
    } catch {
      toast.error("קישור לא תקין. בדוק ונסה שוב.");
    } finally {
      setJoining(false);
    }
  }

  async function handleRename() {
    if (!newName.trim() || !wing) return;
    setRenamingWing(true);
    try {
      await renameWing(wing.id, newName.trim());
      toast.success("שם המבנה עודכן!");
      setEditingName(false);
    } catch {
      toast.error("שגיאה בעדכון השם");
    } finally {
      setRenamingWing(false);
    }
  }

  async function copyInvite() {
    if (!inviteLink) {
      toast.error("הקישור עדיין נוצר, נסה שוב בעוד שנייה");
      return;
    }
    await navigator.clipboard.writeText(inviteLink);
    toast.success("הקישור הועתק! שלח לחברים 📤");
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4 pt-8">
        {[1, 2].map((i) => (
          <div key={i} className="h-32 bg-slate-100 rounded-3xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="pt-4">
        <h1 className="text-xl font-bold text-slate-800">המבנה שלי</h1>
      </div>

      {wing ? (
        <>
          {/* Wing info */}
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="text-3xl">🪽</div>
              <div className="flex-1 min-w-0">
                {editingName ? (
                  <div className="flex gap-2 items-center">
                    <input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="flex-1 text-lg font-bold text-slate-800 border-b-2 border-wing-primary bg-transparent outline-none"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename();
                        if (e.key === "Escape") setEditingName(false);
                      }}
                    />
                    <button
                      onClick={handleRename}
                      disabled={renamingWing}
                      className="text-xs text-wing-primary font-semibold px-2 py-1"
                    >
                      {renamingWing ? "..." : "שמור"}
                    </button>
                    <button
                      onClick={() => setEditingName(false)}
                      className="text-xs text-slate-400 px-1 py-1"
                    >
                      ביטול
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-slate-800 text-lg truncate">{wing.name}</h2>
                    {firebaseUser?.uid === wing.ownerId && (
                      <button
                        onClick={() => { setNewName(wing.name); setEditingName(true); }}
                        className="text-slate-400 hover:text-slate-600 transition-colors text-sm"
                        title="שנה שם"
                      >
                        ✏️
                      </button>
                    )}
                  </div>
                )}
                <p className="text-sm text-slate-500">
                  {wing.memberIds.length} חברים
                </p>
              </div>
            </div>

            {/* Members */}
            <div className="space-y-2 mb-4">
              {(wing.members ?? []).map((m) => (
                <div key={m.uid} className="flex items-center gap-3 px-1">
                  <div className="w-9 h-9 rounded-full bg-wing-soft flex items-center justify-center text-wing-primary font-bold text-sm">
                    {m.displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-slate-700 font-medium">
                    {m.displayName}
                  </span>
                  {m.uid === wing.ownerId && (
                    <span className="text-xs text-wing-muted bg-slate-100 px-2 py-0.5 rounded-full">
                      מנהל
                    </span>
                  )}
                  {m.uid === firebaseUser?.uid && (
                    <span className="text-xs text-wing-primary bg-wing-soft px-2 py-0.5 rounded-full">
                      אני
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Invite */}
            <div className="bg-slate-50 rounded-2xl p-3 space-y-2">
              <p className="text-xs text-slate-500">קישור הזמנה לחברים</p>
              {inviteLink ? (
                <p className="text-xs text-slate-700 break-all font-mono">{inviteLink}</p>
              ) : (
                <p className="text-xs text-slate-400">יוצר קישור...</p>
              )}
              <Button variant="secondary" size="sm" onClick={copyInvite} className="w-full">
                📋 העתק קישור
              </Button>
            </div>
          </Card>

          {/* SOS */}
          {firebaseUser && user && (
            <SOSButton
              wingId={wing.id}
              userId={firebaseUser.uid}
              userName={user.displayName}
            />
          )}

          {/* Active challenge */}
          {wing.activeChallenge && (
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">🏆</span>
                <h3 className="font-semibold text-slate-800">אתגר שבועי</h3>
              </div>
              <p className="font-medium text-slate-700">{wing.activeChallenge.title}</p>
              <p className="text-sm text-slate-500 mt-1">{wing.activeChallenge.description}</p>
            </Card>
          )}
        </>
      ) : (
        <div className="space-y-4">
          {/* Create */}
          <Card className="space-y-4">
            <div>
              <h2 className="font-bold text-slate-800">צור מבנה חדש</h2>
              <p className="text-sm text-slate-500 mt-1">
                אתה תהיה המנהל ותשלח קישור לחברים
              </p>
            </div>
            <Input
              label="שם המבנה"
              value={wingName}
              onChange={(e) => setWingName(e.target.value)}
              placeholder="חברי הספורטאק..."
            />
            <Button onClick={handleCreate} loading={creating} className="w-full">
              צור מבנה 🪽
            </Button>
          </Card>

          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-slate-200" />
            <span className="text-sm text-slate-400">או</span>
            <div className="flex-1 border-t border-slate-200" />
          </div>

          {/* Join */}
          <Card className="space-y-4">
            <div>
              <h2 className="font-bold text-slate-800">הצטרף למבנה קיים</h2>
              <p className="text-sm text-slate-500 mt-1">
                הכנס את קוד ההזמנה שקיבלת
              </p>
            </div>
            <Input
              label="קוד הזמנה"
              value={inviteToken}
              onChange={(e) => setInviteToken(e.target.value)}
              placeholder="XXXXXXXXXX"
              dir="ltr"
            />
            <Button
              variant="secondary"
              onClick={handleJoin}
              loading={joining}
              className="w-full"
            >
              הצטרף
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
