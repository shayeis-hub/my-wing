type Gender = "male" | "female" | undefined | null;

/** Return the male or female form based on user gender. Defaults to male. */
export function g(gender: Gender, male: string, female: string): string {
  return gender === "female" ? female : male;
}

/**
 * Like g(), but with a neutral form for people whose gender we don't actually
 * know (unknown = null/undefined), e.g. "פעיל" / "פעילה" / "פעיל/ה".
 */
export function g3(gender: Gender, male: string, female: string, neutral: string): string {
  return gender === "female" ? female : gender === "male" ? male : neutral;
}

interface GenderSource {
  accountType?: string;
  profile?: { gender?: string; age?: number; genderSet?: boolean } | null;
}

/**
 * A user's gender only when they have really told us. Accounts are created with
 * gender "male" as a placeholder, so a dietitian counts only after picking one
 * (profile.genderSet) and anyone else only once onboarding is done (age > 0).
 */
export function knownGender(u: GenderSource | null | undefined): "male" | "female" | null {
  const p = u?.profile;
  if (!p || (p.gender !== "male" && p.gender !== "female")) return null;
  if (u?.accountType === "business") return p.genderSet ? p.gender : null;
  return p.genderSet || (p.age ?? 0) > 0 ? p.gender : null;
}

/** "הדיאטנית" / "הדיאטן" / "הדיאטנ/ית" by the dietitian's gender. */
export function dietitianWord(gender: Gender, withArticle = true): string {
  const w = g3(gender, "דיאטן", "דיאטנית", "דיאטנ/ית");
  return withArticle ? `ה${w}` : w;
}
