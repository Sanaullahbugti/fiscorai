import { useToastStore } from "@/stores/toastStore";

/** Thin adapter — toast lives in Zustand so any feature can flash without local state. */
export function useToast() {
  const message = useToastStore((s) => s.message);
  const flash = useToastStore((s) => s.flash);
  const clear = useToastStore((s) => s.clear);
  return { toast: message, flash, clear };
}
