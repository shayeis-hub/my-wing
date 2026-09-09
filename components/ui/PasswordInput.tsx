"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Applied to the underlying <input>, same className you'd normally pass. */
  className?: string;
  required?: boolean;
  autoFocus?: boolean;
  id?: string;
}

/**
 * A password <input> with a show/hide (eye) toggle button — wraps the field
 * in a relative container and layers the button on top, so it drops into
 * any existing password-field markup with the same className/styling it
 * already had. Always dir="ltr" internally, matching this app's existing
 * convention of keeping password fields LTR regardless of UI language.
 */
export function PasswordInput({ value, onChange, placeholder, className, required, autoFocus, id }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoFocus={autoFocus}
        dir="ltr"
        className={`${className ?? ""} pr-11`.trim()}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        className="absolute inset-y-0 right-3 flex items-center text-wing-muted hover:text-wing-ink transition-colors"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
