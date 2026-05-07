"use client";

export function confirmAction(message: string) {
  return typeof window !== "undefined" && window.confirm(message);
}
