"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { deleteUser } from "firebase/auth";
import toast from "react-hot-toast";

export default function DeleteAccountPage() {
  const { firebaseUser, user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!firebaseUser) return;
    setDeleting(true);
    try {
      // Remove from the wing first (handles owner succession) so we don't leave
      // a ghost member behind. Best-effort — don't block deletion if it fails.
      if (user?.wingId) {
        try {
          const token = await firebaseUser.getIdToken();
          await fetch("/api/wing/leave", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ wingId: user.wingId }),
          });
        } catch {
          /* ignore — proceed with account deletion */
        }
      }
      const [{ doc: fsDoc, deleteDoc: fsDeleteDoc }, { db }] = await Promise.all([
        import("firebase/firestore"),
        import("@/lib/firebase/config"),
      ]);
      await fsDeleteDoc(fsDoc(db, "users", firebaseUser.uid));
      await deleteUser(firebaseUser);
      toast.success(t("delete_success") as string);
      router.replace("/login");
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("requires-recent-login")) {
        toast.error(t("delete_relogin") as string);
        router.replace("/login");
      } else {
        toast.error(t("delete_error") as string);
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="pt-4">
        <h1 className="text-xl font-bold text-slate-800">{t("delete_title") as string}</h1>
        <p className="text-sm text-slate-500 mt-1">{t("delete_subtitle") as string}</p>
      </div>

      <div className="bg-red-50 rounded-3xl p-5 space-y-3">
        <div className="text-3xl text-center">⚠️</div>
        <h2 className="font-bold text-red-700 text-center">{t("delete_warning_title") as string}</h2>
        <ul className="text-sm text-red-600 space-y-1 list-disc list-inside">
          <li>{t("delete_warning_1") as string}</li>
          <li>{t("delete_warning_2") as string}</li>
          <li>{t("delete_warning_3") as string}</li>
          <li>{t("delete_warning_4") as string}</li>
        </ul>
      </div>

      {!confirmed ? (
        <div className="bg-white rounded-3xl p-5 space-y-4">
          <p className="text-sm text-slate-600 text-center">
            {(t("delete_confirm_q") as (name: string) => string)(user?.displayName ?? "")}
          </p>
          <button
            onClick={() => setConfirmed(true)}
            className="w-full py-3 bg-red-50 text-red-600 rounded-2xl text-sm font-medium hover:bg-red-100 transition-colors"
          >
            {t("delete_confirm_btn") as string}
          </button>
          <button
            onClick={() => router.back()}
            className="w-full py-3 bg-slate-100 text-slate-600 rounded-2xl text-sm font-medium hover:bg-slate-200 transition-colors"
          >
            {t("cancel") as string}
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-5 space-y-4">
          <p className="text-sm text-slate-700 text-center font-medium">
            {t("delete_final_label") as string}
          </p>
          <Button
            onClick={handleDelete}
            loading={deleting}
            className="w-full !bg-red-500 hover:!bg-red-600"
            size="lg"
          >
            {t("delete_final_btn") as string}
          </Button>
          <button
            onClick={() => setConfirmed(false)}
            className="w-full py-2 text-sm text-slate-400 hover:text-slate-600"
          >
            {t("delete_go_back") as string}
          </button>
        </div>
      )}
    </div>
  );
}
