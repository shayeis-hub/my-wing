"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { deleteUser } from "firebase/auth";
import { doc, deleteDoc } from "firebase/firestore";
import toast from "react-hot-toast";

export default function DeleteAccountPage() {
  const { firebaseUser, user } = useAuth();
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!firebaseUser) return;
    setDeleting(true);
    try {
      const [{ doc: fsDoc, deleteDoc: fsDeleteDoc }, { db }] = await Promise.all([
        import("firebase/firestore"),
        import("@/lib/firebase/config"),
      ]);
      await fsDeleteDoc(fsDoc(db, "users", firebaseUser.uid));
      await deleteUser(firebaseUser);
      toast.success("החשבון נמחק בהצלחה");
      router.replace("/login");
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("requires-recent-login")) {
        toast.error("לאבטחתך, התחבר מחדש ואז נסה שוב");
        router.replace("/login");
      } else {
        toast.error("שגיאה במחיקת החשבון. נסה שוב.");
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="pt-4">
        <h1 className="text-xl font-bold text-slate-800">מחיקת חשבון</h1>
        <p className="text-sm text-slate-500 mt-1">פעולה בלתי הפיכה</p>
      </div>

      <div className="bg-red-50 rounded-3xl p-5 space-y-3">
        <div className="text-3xl text-center">⚠️</div>
        <h2 className="font-bold text-red-700 text-center">מחיקת החשבון היא סופית</h2>
        <ul className="text-sm text-red-600 space-y-1 list-disc list-inside">
          <li>כל נתוני הפרופיל שלך יימחקו</li>
          <li>כל הארוחות, הצ'ק-אינים והצעדים יימחקו</li>
          <li>לא ניתן לשחזר את הנתונים לאחר המחיקה</li>
          <li>תצא מהמבנה שאתה שייך אליו</li>
        </ul>
      </div>

      {!confirmed ? (
        <div className="bg-white rounded-3xl p-5 space-y-4">
          <p className="text-sm text-slate-600 text-center">
            האם אתה בטוח שברצונך למחוק את החשבון של{" "}
            <span className="font-bold">{user?.displayName}</span>?
          </p>
          <button
            onClick={() => setConfirmed(true)}
            className="w-full py-3 bg-red-50 text-red-600 rounded-2xl text-sm font-medium hover:bg-red-100 transition-colors"
          >
            כן, אני מבין ורוצה למחוק
          </button>
          <button
            onClick={() => router.back()}
            className="w-full py-3 bg-slate-100 text-slate-600 rounded-2xl text-sm font-medium hover:bg-slate-200 transition-colors"
          >
            ביטול
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-5 space-y-4">
          <p className="text-sm text-slate-700 text-center font-medium">
            לחץ על הכפתור הבא למחיקה סופית
          </p>
          <Button
            onClick={handleDelete}
            loading={deleting}
            className="w-full !bg-red-500 hover:!bg-red-600"
            size="lg"
          >
            מחק את החשבון לצמיתות
          </Button>
          <button
            onClick={() => setConfirmed(false)}
            className="w-full py-2 text-sm text-slate-400 hover:text-slate-600"
          >
            חזרה
          </button>
        </div>
      )}
    </div>
  );
}
