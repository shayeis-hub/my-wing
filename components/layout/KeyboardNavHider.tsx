"use client";

import { useEffect } from "react";

const NON_TEXT_INPUTS = new Set(["checkbox", "radio", "button", "submit", "reset", "range", "file", "color", "image"]);

function isTextField(el: Element | null): boolean {
  if (!el) return false;
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLInputElement) return !NON_TEXT_INPUTS.has(el.type);
  return (el as HTMLElement).isContentEditable === true;
}

// On phones the on-screen keyboard shrinks the viewport and the fixed bottom
// navigation ends up on top of the text field. While a text field is focused
// we mark the body (data-typing) and CSS slides the nav out of the way.
export function KeyboardNavHider() {
  useEffect(() => {
    const update = () => {
      if (isTextField(document.activeElement)) document.body.setAttribute("data-typing", "true");
      else document.body.removeAttribute("data-typing");
    };
    const onFocusIn = () => update();
    const onFocusOut = () => setTimeout(update, 60);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      document.body.removeAttribute("data-typing");
    };
  }, []);
  return null;
}
