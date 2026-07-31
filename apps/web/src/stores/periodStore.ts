import { create } from "zustand";
import type { PeriodPayload } from "@/types/api";

type FileType = "monthly" | "quarterly";

type PeriodState = {
  fileType: FileType;
  month: string;
  quarter: string;
  year: number;
  setFileType: (fileType: FileType) => void;
  setMonth: (month: string) => void;
  setQuarter: (quarter: string) => void;
  setYear: (year: number) => void;
  setPeriodValue: (value: string) => void;
};

function yearsFrom(now = new Date().getFullYear()) {
  return Array.from({ length: Math.max(1, now - 2023) }, (_, i) => now - i);
}

export const usePeriodStore = create<PeriodState>((set, get) => ({
  fileType: "monthly",
  month: "3",
  quarter: "Q1",
  year: new Date().getFullYear(),
  setFileType: (fileType) => set({ fileType }),
  setMonth: (month) => set({ month }),
  setQuarter: (quarter) => set({ quarter }),
  setYear: (year) => set({ year }),
  setPeriodValue: (value) => {
    if (get().fileType === "monthly") set({ month: value });
    else set({ quarter: value });
  },
}));

/** Shell-compatible period API (replaces usePeriod + PeriodProvider). */
export function useShellPeriod() {
  const fileType = usePeriodStore((s) => s.fileType);
  const month = usePeriodStore((s) => s.month);
  const quarter = usePeriodStore((s) => s.quarter);
  const year = usePeriodStore((s) => s.year);
  const setFileType = usePeriodStore((s) => s.setFileType);
  const setMonth = usePeriodStore((s) => s.setMonth);
  const setQuarter = usePeriodStore((s) => s.setQuarter);
  const setYear = usePeriodStore((s) => s.setYear);
  const setPeriodValue = usePeriodStore((s) => s.setPeriodValue);

  const payload: PeriodPayload = {
    fileType,
    year,
    month: fileType === "monthly" ? month : undefined,
    quarter: fileType === "quarterly" ? quarter : undefined,
  };

  return {
    fileType,
    setFileType,
    month,
    setMonth,
    quarter,
    setQuarter,
    year,
    setYear,
    years: yearsFrom(),
    payload,
    periodValue: fileType === "monthly" ? month : quarter,
    setPeriodValue,
  };
}
