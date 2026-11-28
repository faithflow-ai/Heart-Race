"use client";
import { useEffect } from "react";

/** Tells the server when a large block of text is pasted into a text box (for the instructor's activity flags). */
export function PasteWatch({ off }: { off?: boolean }) {
  useEffect(() => {
    if (off) return;
    const onPaste = (e: ClipboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el || !(el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && el.type === "text"))) return;
      const chars = e.clipboardData?.getData("text")?.length ?? 0;
      if (chars < 300) return;
      const field = fieldName(el);
      fetch("/api/team/signal", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "paste", chars, field }) }).catch(() => {});
    };
    document.addEventListener("paste", onPaste, true);
    return () => document.removeEventListener("paste", onPaste, true);
  }, [off]);
  return null;
}

function fieldName(el: HTMLElement) {
  const aria = el.getAttribute("aria-label");
  if (aria) return aria;
  if (el.id) {
    const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    if (l?.textContent) return l.textContent;
  }
  const wrap = el.closest("label");
  if (wrap?.textContent) return wrap.textContent;
  // The app usually puts a <label> just before the box.
  let prev = el.previousElementSibling;
  while (prev && prev.tagName !== "LABEL") prev = prev.previousElementSibling;
  if (prev?.textContent) return prev.textContent;
  return (el as HTMLInputElement).placeholder || window.location.pathname.replace("/play/", "") || "a text box";
}
