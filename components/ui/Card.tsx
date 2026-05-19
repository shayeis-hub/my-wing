import { cn } from "@/lib/utils/cn";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: "default" | "hero";
}

export function Card({ children, className, onClick, variant = "default" }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-[14px] border border-wing-border p-4",
        variant === "default" && "bg-wing-surface",
        variant === "hero" && "bg-sunrise",
        onClick && "cursor-pointer hover:opacity-95 transition-opacity",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={cn("font-bold text-wing-ink text-base", className)}>
      {children}
    </h3>
  );
}
