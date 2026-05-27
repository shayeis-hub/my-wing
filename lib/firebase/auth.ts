import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./config";
import type { User, UserProfile } from "@/types";

export async function signUp(
  email: string,
  password: string,
  displayName: string
) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName });
  await createUserDoc(credential.user, displayName);
  return credential.user;
}

export async function signIn(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(auth, provider);
  const existing = await getDoc(doc(db, "users", credential.user.uid));
  if (!existing.exists()) {
    await createUserDoc(credential.user, credential.user.displayName ?? "");
  }
  return credential.user;
}

export async function signOut() {
  await firebaseSignOut(auth);
}

export async function sendPasswordReset(email: string) {
  await firebaseSendPasswordResetEmail(auth, email);
}

async function createUserDoc(user: FirebaseUser, displayName: string) {
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    email: user.email,
    displayName,
    photoURL: user.photoURL ?? null,
    wingId: null,
    profile: {
      age: 0,
      heightCm: 0,
      weightKg: 0,
      targetWeightKg: 0,
      gender: "male",
      activityLevel: "moderate",
      dailyCalorieTarget: 2000,
    },
    createdAt: serverTimestamp(),
  });
}

export async function getUserDoc(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as User) : null;
}

export async function updateUserProfile(uid: string, profile: Partial<UserProfile>) {
  await setDoc(
    doc(db, "users", uid),
    { profile },
    { merge: true }
  );
}

export async function updateUserPhotoURL(
  uid: string,
  wingId: string | null | undefined,
  photoURL: string
): Promise<void> {
  await setDoc(doc(db, "users", uid), { photoURL }, { merge: true });
  await updateProfile(auth.currentUser!, { photoURL });
  if (wingId) {
    const wingSnap = await getDoc(doc(db, "wings", wingId));
    if (wingSnap.exists()) {
      const members = (wingSnap.data().members ?? []) as { uid: string; [k: string]: unknown }[];
      const updated = members.map((m) => m.uid === uid ? { ...m, photoURL } : m);
      await updateDoc(doc(db, "wings", wingId), { members: updated });
    }
  }
}

export { onAuthStateChanged, auth };
