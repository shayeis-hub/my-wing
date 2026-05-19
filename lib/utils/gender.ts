type Gender = "male" | "female" | undefined | null;

/** Return the male or female form based on user gender. Defaults to male. */
export function g(gender: Gender, male: string, female: string): string {
  return gender === "female" ? female : male;
}
