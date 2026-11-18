"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  collectionGroup,
  doc,
  limit as fsLimit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { WallMessage } from "@/lib/firebase/firestore";

const ms = (m: WallMessage) => m.createdAt?.toMillis?.() ?? Date.now();

/** Live two-way thread between me and one other person: wall messages both ways, merged and sorted. */
export function useThreadMessages(readWingIds: string[], myId: string, otherId: string, maxItems = 40, maxAgeDays = 60) {
  const [msgs, setMsgs] = useState<WallMessage[] | null>(null);
  const key = readWingIds.join(",");

  useEffect(() => {
    const ids = [...new Set(readWingIds)];
    const buckets = new Map<string, WallMessage[]>();
    const cutoff = Date.now() - maxAgeDays * 86_400_000;
    const recompute = () => {
      const seen = new Set<string>();
      const merged = [...buckets.values()]
        .flat()
        .filter((m) => (m.authorId === otherId && m.targetUserId === myId) || (m.authorId === myId && m.targetUserId === otherId))
        .filter((m) => ms(m) > cutoff && !seen.has(m.id) && seen.add(m.id))
        .sort((a, b) => ms(a) - ms(b));
      setMsgs(merged.slice(-maxItems));
    };
    if (ids.length === 0) { setMsgs([]); return; }
    const unsubs = ids.flatMap((w) =>
      [myId, otherId].map((target) =>
        onSnapshot(
          query(collection(db, "wings", w, "wallMessages"), where("targetUserId", "==", target), orderBy("createdAt", "desc"), fsLimit(60)),
          (snap) => {
            buckets.set(`${w}:${target}`, snap.docs.map((d) => ({ ...(d.data({ serverTimestamps: "estimate" }) as Omit<WallMessage, "id">), id: d.id })));
            recompute();
          },
          () => { buckets.set(`${w}:${target}`, []); recompute(); }
        )
      )
    );
    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, myId, otherId, maxItems, maxAgeDays]);

  return msgs;
}

/** Marks the conversation with `otherId` as read up to now. */
export function markChatRead(myId: string, otherId: string): Promise<void> {
  return setDoc(doc(db, "users", myId, "chatReads", otherId), { lastReadAt: serverTimestamp() }, { merge: true }).catch(() => {});
}

/**
 * Unread wall messages addressed to me, per sender. `onlyFrom` limits it to
 * given senders (e.g. a client only counts their coach). Live.
 */
export function useUnreadMessages(myId: string | undefined, onlyFrom?: string[]) {
  const [reads, setReads] = useState<Record<string, number>>({});
  const [incoming, setIncoming] = useState<{ authorId: string; at: number }[]>([]);
  const onlyKey = onlyFrom?.join(",") ?? "*";

  useEffect(() => {
    if (!myId) return;
    const unsubReads = onSnapshot(
      collection(db, "users", myId, "chatReads"),
      (snap) => {
        const r: Record<string, number> = {};
        snap.docs.forEach((d) => { r[d.id] = d.data({ serverTimestamps: "estimate" }).lastReadAt?.toMillis?.() ?? 0; });
        setReads(r);
      },
      () => {}
    );
    const unsubMsgs = onSnapshot(
      query(collectionGroup(db, "wallMessages"), where("targetUserId", "==", myId), orderBy("createdAt", "desc"), fsLimit(150)),
      (snap) => setIncoming(snap.docs.map((d) => ({ authorId: d.data().authorId as string, at: d.data({ serverTimestamps: "estimate" }).createdAt?.toMillis?.() ?? Date.now() }))),
      () => {}
    );
    return () => { unsubReads(); unsubMsgs(); };
  }, [myId]);

  return useMemo(() => {
    const allowed = onlyFrom ? new Set(onlyFrom) : null;
    const byAuthor: Record<string, number> = {};
    for (const m of incoming) {
      if (allowed && !allowed.has(m.authorId)) continue;
      if (m.at > (reads[m.authorId] ?? 0)) byAuthor[m.authorId] = (byAuthor[m.authorId] ?? 0) + 1;
    }
    return { byAuthor, total: Object.values(byAuthor).reduce((a, b) => a + b, 0) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming, reads, onlyKey]);
}
