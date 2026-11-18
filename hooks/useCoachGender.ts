"use client";

import { useWing } from "@/hooks/useWing";
import { dietitianWord } from "@/lib/utils/gender";
import type { User } from "@/types";

/**
 * How to word "your dietitian" for a client: the dietitian's own entry in the
 * private wing carries their gender (set when they answer "how to address you").
 */
export function useCoachGender(user: User | null | undefined) {
  const coachId = user?.coachAccess?.active ? user.coachAccess.coachId : undefined;
  const { wing } = useWing(coachId ? user?.coachAccess?.wingId : undefined);
  // unreachable wing (rules/transient) simply leaves the gender unknown → neutral wording
  const gender = wing?.members.find((m) => m.uid === coachId)?.gender ?? null;
  return { gender, word: dietitianWord(gender), wordNoArticle: dietitianWord(gender, false) };
}
