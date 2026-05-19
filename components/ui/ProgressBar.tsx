import { cn } from "@/lib/utils/cn";

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  color?: string;
  gradient?: boolean;
  height?: "xs" | "sm" | "md";
  className?: string;
}

const heights = { xs: "h-1", sm: "h-1.5", md: "h-2" };

export function ProgressBar({ value, max, label, color = "bg-wing-primary", gradient = false, height = "md", className }: ProgressBarProps) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className={cn("space-y-1", className)}>
      {label && (
        <div className="flex justify-between text-xs text-slate-500">
          <span>{label}</span>
          <span>{pct}%</span>
        </div>
      )}
      <div className={cn(heights[height], "bg-[#ede5d0] rounded-full overflow-hidden")}>
        <div
          className={cn("h-full rounded-full transition-all duration-500", !gradient && color)}
          style={{
            width: `${pct}%`,
            ...(gradient ? { background: "linear-gradient(90deg, #f5dd4b, #ff6b47)" } : {}),
          }}
        />
      </div>
    </div>
  );
}
