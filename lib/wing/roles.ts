import type { Wing } from "@/types";

type WingRoleShape = Pick<Wing, "ownerId"> & { adminIds?: string[] };

/** True if the user is the wing owner. */
export function isWingOwner(
  wing: WingRoleShape | null | undefined,
  uid: string | null | undefined
): boolean {
  return !!wing && !!uid && wing.ownerId === uid;
}

/** True if the user is the owner OR a co-admin. */
export function isWingAdmin(
  wing: WingRoleShape | null | undefined,
  uid: string | null | undefined
): boolean {
  if (!wing || !uid) return false;
  return wing.ownerId === uid || (wing.adminIds ?? []).includes(uid);
}
