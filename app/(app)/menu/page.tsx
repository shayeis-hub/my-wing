"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { Card } from "@/components/ui/Card";
import type { PublishedClientMenu } from "@/lib/coach/menu";

export default function MyMenuPage() {
  const { firebaseUser } = useAuth();
  const { lang, dir } = useLanguage();
  const he = lang === "he";
  const [state, setState] = useState<"loading" | "none" | "error" | PublishedClientMenu>("loading");

  useEffect(() => {
    if (!firebaseUser) return;
    getDoc(doc(db, "clientMenus", firebaseUser.uid))
      .then((s) => setState(s.exists() ? (s.data() as PublishedClientMenu) : "none"))
      .catch(() => setState("error"));
  }, [firebaseUser]);

  if (state === "loading") {
    return <div className="p-4"><div className="h-40 mt-8 bg-wing-elevated border border-wing-border rounded-[20px] animate-pulse" /></div>;
  }
  if (state === "none" || state === "error") {
    return (
      <div className="p-4 pt-12 text-center space-y-2" dir={dir}>
        <h1 className="text-xl font-black text-wing-ink">{he ? "התפריט שלי" : "My menu"}</h1>
        <p className="text-sm text-wing-muted">
          {state === "error"
            ? (he ? "לא הצלחנו לטעון את התפריט" : "Couldn't load the menu")
            : (he ? "הדיאטנית עוד לא פרסמה לך תפריט" : "Your dietitian hasn't published a menu for you yet")}
        </p>
      </div>
    );
  }

  const { menu } = state;
  const t = menu.targets;
  const chips = [
    t.calories ? `${t.calories} ${he ? 'קק"ל' : "kcal"}` : "",
    t.proteinG ? `${he ? "חלבון" : "Protein"} ${t.proteinG}${he ? "ג'" : "g"}` : "",
    t.carbsG ? `${he ? "פחמימות" : "Carbs"} ${t.carbsG}${he ? "ג'" : "g"}` : "",
    t.fatG ? `${he ? "שומן" : "Fat"} ${t.fatG}${he ? "ג'" : "g"}` : "",
  ].filter(Boolean);

  return (
    <div className="p-4 space-y-4 pb-28" dir={dir}>
      <div className="pt-4">
        <h1 className="text-2xl font-black text-wing-ink tracking-tight">{menu.title || (he ? "התפריט שלי" : "My menu")}</h1>
        {state.coachName && (
          <p className="text-xs text-wing-muted mt-1">{he ? `מאת ${state.coachName}` : `From ${state.coachName}`}</p>
        )}
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => <span key={c} className="text-xs font-bold px-3 py-1.5 rounded-full bg-wing-elevated border border-wing-border text-wing-ink">{c}</span>)}
        </div>
      )}

      {menu.meals.map((m, i) => (
        <Card key={i}>
          <div className="flex items-baseline justify-between gap-2 mb-2">
            <h3 className="font-bold text-wing-ink">{[m.day, m.name].filter(Boolean).join(" · ")}</h3>
            {m.time && <span className="text-xs text-wing-muted tabular" dir="ltr">{m.time}</span>}
          </div>
          <ul className="space-y-1.5">
            {m.options.map((o, j) => (
              <li key={j} className="text-sm text-wing-ink leading-relaxed flex gap-2">
                <span className="text-wing-heat font-black shrink-0">{m.options.length > 1 ? j + 1 + "." : "•"}</span>
                <span>{o}</span>
              </li>
            ))}
          </ul>
          {m.options.length > 1 && (
            <p className="text-[11px] text-wing-subtle mt-2">{he ? "בוחרים אחת מהאפשרויות" : "Pick one of the options"}</p>
          )}
        </Card>
      ))}

      {menu.avoid.length > 0 && (
        <Card>
          <h3 className="font-bold text-wing-ink mb-2">{he ? "להימנע / להגביל" : "Avoid / limit"}</h3>
          <ul className="space-y-1">{menu.avoid.map((a, i) => <li key={i} className="text-sm text-wing-ink">• {a}</li>)}</ul>
        </Card>
      )}
      {menu.notes.length > 0 && (
        <Card>
          <h3 className="font-bold text-wing-ink mb-2">{he ? "הערות" : "Notes"}</h3>
          <ul className="space-y-1">{menu.notes.map((a, i) => <li key={i} className="text-sm text-wing-ink">• {a}</li>)}</ul>
        </Card>
      )}
    </div>
  );
}
