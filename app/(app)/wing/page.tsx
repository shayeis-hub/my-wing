"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWing } from "@/hooks/useWing";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SOSButton } from "@/components/wing/SOSButton";
import toast from "react-hot-toast";

export default function WingPage() {
  const { user, firebaseUser } = useAuth();
  const { wing, loading } = useWing(user?.wingId);

  const [wingName, setWingName] = useState("");
  const [joinToken, setJoinToken] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingWing, setRenamingWing] = useState(false);

  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

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
    if (!joinToken.trim() || !firebaseUser || !user) return;
    setJoining(true);
    try {
      const res = await fetch("/api/wing/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: joinToken.trim(),
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
      const res = await fetch("/api/wing/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wingId: wing.id, name: newName.trim() }),
      });
      if (!res.ok) throw new Error();
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
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <div className="text-3xl">🪽</div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-slate-800 text-lg truncate">{wing.name || <span className="text-slate-400 italic">ללא שם</span>}</h2>
                <p className="text-sm text-slate-500">{memberCount} חברים</p>
              </div>
            </div>

            {/* Members list */}
            <div className="space-y-2 mb-4">
              {members.map((m) => (
                <div key={m.uid} className="flex items-center gap-3 px-1">
                  <div className="w-9 h-9 rounded-full bg-wing-soft flex items-center justify-center text-wing-primary font-bold text-sm">
                    {(m.displayName ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-slate-700 font-medium">{m.displayName ?? ""}</span>
                  {m.uid === wing.ownerId && (
                    <span className="text-xs text-wing-muted bg-slate-100 px-2 py-0.5 rounded-full">מנהל</span>
                  )}
                  {m.uid === firebaseUser?.uid && (
                    <span className="text-xs text-wing-primary bg-wing-soft px-2 py-0.5 rounded-full">אני</span>
                  )}
                </div>
              ))}
            </div>

            {/* Rename — any member */}
            {firebaseUser && (Array.isArray(wing.memberIds) ? wing.memberIds.includes(firebaseUser.uid) : true) && (
              <div className="mb-4">
                {editingName ? (
                  <div className="space-y-2">
                    <input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-2xl border-2 border-wing-primary bg-white text-slate-800 font-medium outline-none text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename();
                        if (e.key === "Escape") setEditingName(false);
                      }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleRename}
                        disabled={renamingWing}
                        className="flex-1 py-2 bg-wing-primary text-white rounded-2xl text-sm font-medium"
                      >
                        {renamingWing ? "שומר..." : "שמור שם"}
                      </button>
                      <button
                        onClick={() => setEditingName(false)}
                        className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-2xl text-sm font-medium"
                      >
                        ביטול
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setNewName(wing.name); setEditingName(true); }}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 rounded-2xl text-sm text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    <span>שנה שם מבנה</span>
                    <span className="text-slate-400">✏️</span>
                  </button>
                )}
              </div>
            )}

            {/* Invite link */}
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

          {firebaseUser && user && (
            <SOSButton
              wingId={wing.id}
              userId={firebaseUser.uid}
              userName={user.displayName}
            />
          )}

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
          <Card className="space-y-4">
            <div>
              <h2 className="font-bold text-slate-800">צור מבנה חדש</h2>
              <p className="text-sm text-slate-500 mt-1">אתה תהיה המנהל ותשלח קישור לחברים</p>
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

          <Card className="space-y-4">
            <div>
              <h2 className="font-bold text-slate-800">הצטרף למבנה קיים</h2>
              <p className="text-sm text-slate-500 mt-1">הכנס את קוד ההזמנה שקיבלת</p>
            </div>
            <Input
              label="קוד הזמנה"
              value={joinToken}
              onChange={(e) => setJoinToken(e.target.value)}
              placeholder="XXXXXXXXXX"
              dir="ltr"
            />
            <Button variant="secondary" onClick={handleJoin} loading={joining} className="w-full">
              הצטרף
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
