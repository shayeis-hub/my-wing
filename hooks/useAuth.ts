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
    let unsubUser: (() => void) | undefined;

    const unsubAuth = (async () => {
      const [{ onAuthStateChanged }, { auth }] = await Promise.all([
        import("firebase/auth"),
        import("@/lib/firebase/auth"),
      ]);

      return onAuthStateChanged(auth, async (firebaseUser) => {
        // Cancel previous Firestore listener
        unsubUser?.();

        if (!firebaseUser) {
          setState({ firebaseUser: null, user: null, loading: false });
          return;
        }

        // Subscribe to live Firestore user doc so profile updates reflect immediately
        const [{ onSnapshot, doc }, { db }] = await Promise.all([
          import("firebase/firestore"),
          import("@/lib/firebase/config"),
        ]);

        unsubUser = onSnapshot(
          doc(db, "users", firebaseUser.uid),
          (snap) => {
            const user = snap.exists() ? (snap.data() as User) : null;
            setState({ firebaseUser, user, loading: false });
          }
        );

        // Silently refresh FCM token whenever user logs in and permission is already granted
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          import("@/lib/firebase/messaging")
            .then(({ requestNotificationPermission }) => requestNotificationPermission(firebaseUser.uid))
            .catch(() => {});
        }
      });
    })();

    return () => {
      unsubAuth.then((unsub) => unsub?.());
      unsubUser?.();
    };
  }, []);

  return state;
}
