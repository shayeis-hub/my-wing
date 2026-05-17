"use client";

import { useEffect, useState } from "react";
import { subscribeToMeals } from "@/lib/firebase/firestore";
import type { Meal } from "@/types";

export function useMeals(wingId: string | null | undefined) {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!wingId) {
      setMeals([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeToMeals(wingId, (m) => {
      setMeals(m);
      setLoading(false);
    });
    return unsub;
  }, [wingId]);

  return { meals, loading };
}
