"use client";

import { useEffect, useState } from "react";
import type { User as FirebaseUser } from "firebase/auth";
import type { User } from "@/types";

interface AuthState {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    firebaseUser: null,
    user: null,
    loading: true,
  });

  useEffect(() => {
    let unsub: (() => void) | undefined;

    Promise.all([
      import("firebase/auth"),
      import("@/lib/firebase/auth"),
    ]).then(([{ onAuthStateChanged }, { auth, getUserDoc }]) => {
      unsub = onAuthStateChanged(auth, async (firebaseUser) => {
        if (!firebaseUser) {
          setState({ firebaseUser: null, user: null, loading: false });
          return;
        }
        const user = await getUserDoc(firebaseUser.uid);
        setState({ firebaseUser, user, loading: false });
      });
    });

    return () => unsub?.();
  }, []);

  return state;
}
