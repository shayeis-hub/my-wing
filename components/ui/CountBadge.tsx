import { cn } from "@/lib/utils/cn";

/** Small red unread counter (WhatsApp-style); renders nothing for 0. */
export function CountBadge({ count, className }: { count: number; className?: string }) {
  if (!count) return null;
  return (
    <span className={cn("min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-[18px] text-center tabular", className)}>
      {count > 99 ? "99+" : count}
    </span>
  );
}
