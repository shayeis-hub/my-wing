/**
 * Metric ↔ imperial conversions for book mode. Storage stays metric
 * everywhere (kg/cm) so the calorie calculator and every other page that
 * reads user.profile need no changes — these only convert at display/input
 * boundaries, for users with an active book-mode account.
 */

const LB_PER_KG = 2.2046226218;
const CM_PER_IN = 2.54;

export function kgToLb(kg: number): number {
  return kg * LB_PER_KG;
}

export function lbToKg(lb: number): number {
  return lb / LB_PER_KG;
}

export function ftInToCm(feet: number, inches: number): number {
  return (feet * 12 + inches) * CM_PER_IN;
}

export function cmToFtIn(cm: number): { feet: number; inches: number } {
  const totalIn = cm / CM_PER_IN;
  const feet = Math.floor(totalIn / 12);
  const inches = Math.round(totalIn % 12);
  return inches === 12 ? { feet: feet + 1, inches: 0 } : { feet, inches };
}

/** Weight for display: "168 lb" or "76.5 kg". */
export function formatWeight(kg: number, imperial: boolean): string {
  return imperial ? `${Math.round(kgToLb(kg))} lb` : `${kg} kg`;
}

/** Height for display: 5'9" or "175 cm". */
export function formatHeight(cm: number, imperial: boolean): string {
  if (!imperial) return `${cm} cm`;
  const { feet, inches } = cmToFtIn(cm);
  return `${feet}'${inches}"`;
}
