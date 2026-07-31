import { create } from "zustand";

type ToastState = {
  message: string;
  flash: (msg: string, durationMs?: number) => void;
  clear: () => void;
};

let timer: ReturnType<typeof setTimeout> | null = null;

export const useToastStore = create<ToastState>((set) => ({
  message: "",
  flash: (msg, durationMs = 2500) => {
    if (timer) clearTimeout(timer);
    set({ message: msg });
    timer = setTimeout(() => {
      set({ message: "" });
      timer = null;
    }, durationMs);
  },
  clear: () => {
    if (timer) clearTimeout(timer);
    timer = null;
    set({ message: "" });
  },
}));
