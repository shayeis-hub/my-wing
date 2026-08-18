"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { Card } from "@/components/ui/Card";
import { getWeightHistory } from "@/lib/firebase/firestore";
import { WeightChart } from "@/components/dashboard/WeightChart";
import { WeightLogTable } from "@/components/dashboard/WeightLogTable";
import { TrendingDown } from "lucide-react";
import type { WeightLog } from "@/types";

export default function WeightPage() {
  const { user, firebaseUser } = useAuth();
  const { lang } = useLanguage();
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);

  useEffect(() => {
    if (!user?.wingId || !firebaseUser) return;
    getWeightHistory(user.wingId, firebaseUser.uid).then(setWeightLogs);
  }, [user?.wingId, firebaseUser]);

  return (
    <div className="p-4 space-y-4">
      <div className="pt-4">
        <h1 className="text-xl font-bold text-wing-ink flex items-center gap-2">
          <TrendingDown size={20} className="text-wing-muted" />
          {lang === "he" ? "גרף ירידה במשקל" : "Weight Progress"}
        </h1>
        <p className="text-sm text-wing-muted">
          {lang === "he" ? "המשקל שלך לאורך זמן" : "Your weight over time"}
        </p>
      </div>

      <Card>
        <WeightChart logs={weightLogs} targetWeight={user?.profile?.targetWeightKg} />
      </Card>

      {weightLogs.length > 0 && (
        <Card>
          <h3 className="font-semibold text-slate-800 mb-3">
            {lang === "he" ? "היסטוריית שקילות" : "Weigh-in History"}
          </h3>
          <WeightLogTable logs={weightLogs} heightCm={user?.profile?.heightCm} lang={lang} />
        </Card>
      )}
    </div>
  );
}
