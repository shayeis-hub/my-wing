import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  onAuthStateChanged,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { Capacitor } from "@capacitor/core";
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
  let firebaseUser: FirebaseUser;

  if (Capacitor.isNativePlatform()) {
    // Native: popups/redirects are blocked inside the WebView (Google rejects
    // OAuth in embedded user-agents). Use the native Google account picker via
    // the Capacitor plugin, then sign into the JS SDK with the returned token.
    const { FirebaseAuthentication } = await import("@capacitor-firebase/authentication");
    const result = await FirebaseAuthentication.signInWithGoogle();
    const idToken = result.credential?.idToken;
    const accessToken = result.credential?.accessToken;
    if (!idToken) throw new Error("No Google idToken returned");
    const cred = GoogleAuthProvider.credential(idToken, accessToken);
    const credential = await signInWithCredential(auth, cred);
    firebaseUser = credential.user;
  } else {
    // Web: standard popup flow.
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(auth, provider);
    firebaseUser = credential.user;
  }

  const existing = await getDoc(doc(db, "users", firebaseUser.uid));
  if (!existing.exists()) {
    await createUserDoc(firebaseUser, firebaseUser.displayName ?? "");
  }
  return firebaseUser;
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
