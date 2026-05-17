import Image from "next/image";
import { Card } from "@/components/ui/Card";
import type { Meal } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";

interface MealCardProps {
  meal: Meal;
}

const mealTypeLabels: Record<Meal["mealType"], string> = {
  breakfast: "ארוחת בוקר",
  lunch: "ארוחת צהריים",
  dinner: "ארוחת ערב",
  snack: "חטיף",
};

export function MealCard({ meal }: MealCardProps) {
  const timeAgo = meal.createdAt?.toDate
    ? formatDistanceToNow(meal.createdAt.toDate(), { addSuffix: true, locale: he })
    : "";

  return (
    <Card>
      <div className="flex gap-3">
        {meal.imageURL && (
          <div className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0">
            <Image src={meal.imageURL} alt={meal.analysis.description} fill className="object-cover" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-sm text-slate-800 truncate">
                {meal.userName}
              </p>
              <p className="text-xs text-wing-muted">
                {mealTypeLabels[meal.mealType]} · {timeAgo}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <span className="font-bold text-wing-primary text-sm">
                {meal.analysis.calories}
              </span>
              <span className="text-xs text-slate-400"> קק"ל</span>
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-1 line-clamp-2">
            {meal.analysis.description}
          </p>
          <div className="flex gap-3 mt-2">
            {[
              { label: "חלבון", value: meal.analysis.protein },
              { label: "פחמ׳", value: meal.analysis.carbs },
              { label: "שומן", value: meal.analysis.fat },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-xs font-semibold text-slate-700">{value}g</p>
                <p className="text-[10px] text-slate-400">{label}</p>
              </div>
            ))}
            <div className="mr-auto">
              <div className="flex items-center gap-1">
                {"⭐".repeat(Math.round(meal.analysis.healthScore / 2))}
              </div>
              <p className="text-[10px] text-slate-400">ציון בריאות</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
