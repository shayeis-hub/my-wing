"use client";

import { useEffect, useState } from "react";
import { subscribeToWing } from "@/lib/firebase/firestore";
import type { Wing } from "@/types";

export function useWing(wingId: string | null | undefined) {
  const [wing, setWing] = useState<Wing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!wingId) {
      setWing(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeToWing(wingId, (w) => {
      setWing(w);
      setLoading(false);
    });
    return unsub;
  }, [wingId]);

  return { wing, loading };
}
