"use client";

import { useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { updateUserPhotoURL, signOut } from "@/lib/firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { calculateBMI, getBMICategory, calculateBMR, calculateTDEE } from "@/lib/utils/calculator";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";

const activityLabels: Record<string, string> = {
  sedentary: "יושבני",
  light: "קל",
  moderate: "בינוני",
  active: "פעיל",
  very_active: "מאוד פעיל",
};

const genderLabels: Record<string, string> = {
  male: "זכר",
  female: "נקבה",
};

export default function ProfilePage() {
  const { user, firebaseUser } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function compressImage(file: File): Promise<Blob> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 512;
        let { width, height } = img;
        if (width > height) {
          if (width > maxDim) { height = Math.round(height * maxDim / width); width = maxDim; }
        } else {
          if (height > maxDim) { width = Math.round(width * maxDim / height); height = maxDim; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.85);
      };
      img.src = URL.createObjectURL(file);
    });
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !firebaseUser || !user) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const storage = getStorage();
      const storageRef = ref(storage, `avatars/${firebaseUser.uid}/avatar.jpg`);
      await uploadBytes(storageRef, compressed, { contentType: "image/jpeg" });
      const url = await getDownloadURL(storageRef);
      await updateUserPhotoURL(firebaseUser.uid, user.wingId, url);
      toast.success("תמונת הפרופיל עודכנה ✅");
    } catch {
      toast.error("שגיאה בהעלאת התמונה");
    } finally {
      setUploading(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
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
        <h1 className="text-xl font-bold text-slate-800">הפרופיל שלי</h1>
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
        <p className="text-lg font-bold text-slate-800">{user?.displayName}</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoChange}
        />
        {uploading && <p className="text-sm text-slate-400 animate-pulse">מעלה תמונה...</p>}
      </div>

      {/* Stats */}
      {profile && (
        <Card>
          <h3 className="font-semibold text-slate-800 mb-3">הנתונים שלי</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "גיל", value: profile.age ? `${profile.age}` : "—" },
              { label: "גובה", value: profile.heightCm ? `${profile.heightCm} ס״מ` : "—" },
              { label: "משקל נוכחי", value: profile.weightKg ? `${profile.weightKg} ק״ג` : "—" },
              { label: "משקל יעד", value: profile.targetWeightKg ? `${profile.targetWeightKg} ק״ג` : "—" },
              { label: "מגדר", value: genderLabels[profile.gender] ?? "—" },
              { label: "רמת פעילות", value: activityLabels[profile.activityLevel] ?? "—" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-50 rounded-2xl px-3 py-2.5">
                <p className="text-xs text-slate-400">{label}</p>
                <p className="font-semibold text-slate-700 text-sm mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Calculated values */}
      {bmi && tdee && (
        <Card>
          <h3 className="font-semibold text-slate-800 mb-3">ערכים מחושבים</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-2xl px-3 py-2.5 text-center">
              <p className="text-xs text-slate-400">BMI</p>
              <p className="font-bold text-slate-700">{bmi.toFixed(1)}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{bmiCategory?.label}</p>
            </div>
            <div className="bg-slate-50 rounded-2xl px-3 py-2.5 text-center">
              <p className="text-xs text-slate-400">BMR</p>
              <p className="font-bold text-slate-700">{bmr}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">קק״ל בסיס</p>
            </div>
            <div className="bg-slate-50 rounded-2xl px-3 py-2.5 text-center">
              <p className="text-xs text-slate-400">TDEE</p>
              <p className="font-bold text-slate-700">{tdee}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">קק״ל/יום</p>
            </div>
          </div>
        </Card>
      )}

      {/* Logout */}
      <Button variant="secondary" onClick={handleSignOut} className="w-full">
        התנתק
      </Button>
    </div>
  );
}
