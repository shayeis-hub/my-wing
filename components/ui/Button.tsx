import { cn } from "@/lib/utils/cn";
import { type ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all rounded-2xl focus:outline-none focus:ring-2 focus:ring-offset-2",
          {
            "bg-wing-primary text-white hover:bg-sky-600 focus:ring-wing-primary shadow-sm":
              variant === "primary",
            "bg-wing-soft text-wing-primary hover:bg-sky-100 focus:ring-wing-primary":
              variant === "secondary",
            "bg-transparent text-wing-muted hover:bg-gray-100 focus:ring-gray-300":
              variant === "ghost",
            "bg-red-50 text-red-500 hover:bg-red-100 focus:ring-red-400":
              variant === "danger",
            "px-3 py-1.5 text-sm": size === "sm",
            "px-5 py-2.5 text-base": size === "md",
            "px-7 py-3.5 text-lg": size === "lg",
            "opacity-60 cursor-not-allowed": disabled || loading,
          },
          className
        )}
        {...props}
      >
        {loading && (
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12" cy="12" r="10"
              stroke="currentColor" strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
