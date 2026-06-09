"use client";

import { useRef, useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { updateUserPhotoURL, signOut } from "@/lib/firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateUserStepsGoal, getWeightHistory } from "@/lib/firebase/firestore";
import { compressImageToBlob } from "@/lib/utils/imageCompress";
import { calculateBMI, getBMICategory, calculateBMR, calculateTDEE } from "@/lib/utils/calculator";
import { WeightChart } from "@/components/dashboard/WeightChart";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { Camera, Footprints, Users, Trophy, TrendingDown } from "lucide-react";
import Link from "next/link";
import type { WeightLog } from "@/types";


export default function ProfilePage() {
  const { user, firebaseUser } = useAuth();
  const { t, lang } = useLanguage();
  const activityLabels: Record<string, string> = {
    sedentary: t("activity_sedentary") as string,
    light: t("activity_light") as string,
    moderate: t("activity_moderate") as string,
    active: t("activity_active") as string,
    very_active: t("activity_very_active") as string,
  };
  const genderLabels: Record<string, string> = {
    male: t("gender_male") as string,
    female: t("gender_female") as string,
  };
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [stepsGoal, setStepsGoal] = useState<string>("");
  const [savingSteps, setSavingSteps] = useState(false);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);

  useEffect(() => {
    if (!user?.wingId || !firebaseUser) return;
    getWeightHistory(user.wingId, firebaseUser.uid).then(setWeightLogs);
  }, [user?.wingId, firebaseUser]);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !firebaseUser || !user) return;
    setUploading(true);
    try {
      const compressed = await compressImageToBlob(file, { maxDim: 512 });
      const storage = getStorage();
      const storageRef = ref(storage, `avatars/${firebaseUser.uid}/avatar.jpg`);
      await uploadBytes(storageRef, compressed, { contentType: "image/jpeg" });
      const url = await getDownloadURL(storageRef);
      await updateUserPhotoURL(firebaseUser.uid, user.wingId, url);
      toast.success(t("profile_photo_saved") as string);
    } catch {
      toast.error(t("profile_photo_error") as string);
    } finally {
      setUploading(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  // Init steps goal from profile when user loads
  const profileStepsGoal = user?.profile?.stepsGoal;
  if (stepsGoal === "" && profileStepsGoal) {
    setStepsGoal(String(profileStepsGoal));
  }

  async function handleSaveStepsGoal() {
    if (!firebaseUser) return;
    const val = parseInt(stepsGoal);
    if (isNaN(val) || val < 100) { toast.error(t("profile_steps_invalid") as string); return; }
    setSavingSteps(true);
    try {
      await updateUserStepsGoal(firebaseUser.uid, val);
      toast.success(t("profile_steps_saved") as string);
    } catch {
      toast.error(t("profile_save_error") as string);
    } finally {
      setSavingSteps(false);
    }
  }

  const profile = user?.profile;
  const bmi = profile?.heightCm && profile?.weightKg
    ? calculateBMI(profile.weightKg, profile.heightCm)
    : null;
  const bmiCategory = bmi ? getBMICategory(bmi) : null;
  const bmr = profile ? Math.round(calculateBMR(profile)) : null;
  const tdee = profile ? Math.round(calculateTDEE(profile)) : null;

  return (
    <div className="p-4 space-y-4">
      <div className="pt-4">
        <h1 className="text-xl font-bold text-wing-ink">{t("profile_title")}</h1>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="relative">
          <Avatar
            name={user?.displayName ?? ""}
            photoURL={user?.photoURL}
            size={96}
            className="border-4 border-white shadow-lg"
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-0 left-0 bg-wing-primary text-white rounded-full p-1.5 shadow-md"
          >
            <Camera size={14} />
          </button>
        </div>
        <p className="text-lg font-bold text-wing-ink">{user?.displayName}</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoChange}
        />
        {uploading && <p className="text-sm text-wing-muted animate-pulse">{t("profile_uploading")}</p>}
      </div>

      {/* Wing */}
      <Link href="/wing">
        <Button variant="secondary" className="w-full flex items-center justify-center gap-2">
          <Users size={16} /> {t("profile_wing_btn")}
        </Button>
      </Link>

      {/* Stats */}
      {profile && (
        <Card>
          <h3 className="font-semibold text-slate-800 mb-3">{t("profile_my_data")}</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: t("profile_age") as string, value: profile.age ? `${profile.age}` : "—" },
              { label: t("profile_height") as string, value: profile.heightCm ? `${profile.heightCm} cm` : "—" },
              { label: t("profile_weight") as string, value: profile.weightKg ? `${profile.weightKg} ${t("kg_label")}` : "—" },
              { label: t("profile_target_weight") as string, value: profile.targetWeightKg ? `${profile.targetWeightKg} ${t("kg_label")}` : "—" },
              { label: t("profile_gender") as string, value: genderLabels[profile.gender] ?? "—" },
              { label: t("profile_activity") as string, value: activityLabels[profile.activityLevel] ?? "—" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-50 rounded-2xl px-3 py-2.5">
                <p className="text-sm text-slate-400">{label}</p>
                <p className="font-semibold text-slate-700 text-base mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Calculated values */}
      {bmi && tdee && (
        <Card>
          <h3 className="font-semibold text-slate-800 mb-3">{t("profile_calculated")}</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-2xl px-3 py-2.5 text-center">
              <p className="text-sm text-slate-400">BMI</p>
              <p className="font-bold text-slate-700">{bmi.toFixed(1)}</p>
              <p className="text-sm text-slate-400 mt-0.5">{bmiCategory?.label}</p>
            </div>
            <div className="bg-slate-50 rounded-2xl px-3 py-2.5 text-center">
              <p className="text-sm text-slate-400">BMR</p>
              <p className="font-bold text-slate-700">{bmr}</p>
              <p className="text-sm text-slate-400 mt-0.5">{t("profile_bmi_base")}</p>
            </div>
            <div className="bg-slate-50 rounded-2xl px-3 py-2.5 text-center">
              <p className="text-sm text-slate-400">TDEE</p>
              <p className="font-bold text-slate-700">{tdee}</p>
              <p className="text-sm text-slate-400 mt-0.5">{t("profile_tdee_day")}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Weight progress chart */}
      <Card>
        <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-1.5">
          <TrendingDown size={16} className="text-wing-muted" />
          {lang === "he" ? "גרף ירידה במשקל" : "Weight Progress"}
        </h3>
        <WeightChart logs={weightLogs} targetWeight={user?.profile?.targetWeightKg} />
      </Card>

      {/* Steps goal */}
      <Card>
        <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-1.5">
          <Footprints size={16} className="text-wing-muted" /> {t("profile_steps_goal")}
        </h3>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={stepsGoal}
            onChange={(e) => setStepsGoal(e.target.value)}
            placeholder="10000"
            inputMode="numeric"
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-wing-primary"
            dir="ltr"
          />
          <span className="text-sm text-slate-400 shrink-0">{t("profile_steps_unit")}</span>
        </div>
        <Button onClick={handleSaveStepsGoal} loading={savingSteps} className="w-full mt-3">
          {t("profile_save_goal")}
        </Button>
      </Card>

      {/* Trophy Cabinet */}
      <Card>
        <h2 className="font-bold text-wing-ink mb-4 flex items-center gap-2">
          <Trophy size={16} className="text-wing-heat" />
          {t("trophy_title")}
        </h2>
        {!user?.trophies || user.trophies.length === 0 ? (
          <p className="text-sm text-wing-muted text-center py-3">{t("trophy_empty")}</p>
        ) : (() => {
          const gold   = user.trophies!.filter(t => t.medal === "gold");
          const silver = user.trophies!.filter(t => t.medal === "silver");
          const bronze = user.trophies!.filter(t => t.medal === "bronze");
          const cols = [
            { medals: gold,   label: t("trophy_gold")   as string, bg: "bg-yellow-50 border-yellow-200", text: "text-yellow-700" },
            { medals: silver, label: t("trophy_silver") as string, bg: "bg-slate-50 border-slate-200",   text: "text-slate-500"  },
            { medals: bronze, label: t("trophy_bronze") as string, bg: "bg-orange-50 border-orange-200", text: "text-orange-600" },
          ];
          return (
            <div className="grid grid-cols-3 gap-3">
              {cols.map(({ medals, label, bg, text }) => (
                <div key={label} className={`rounded-2xl border p-3 text-center ${bg}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-wide ${text} mb-2`}>{label}</p>
                  <p className={`font-black text-2xl ${text}`}>{medals.length}</p>
                  <p className="text-[10px] text-wing-muted mt-0.5">
                    {lang === "he" ? "זכיות" : "wins"}
                  </p>
                </div>
              ))}
            </div>
          );
        })()}
      </Card>

      {/* Logout */}
      <Button variant="secondary" onClick={handleSignOut} className="w-full">
        {t("profile_signout")}
      </Button>
    </div>
  );
}
