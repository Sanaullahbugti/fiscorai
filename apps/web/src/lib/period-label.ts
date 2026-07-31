export function formatPeriodLabel(input: {
  fileType: "monthly" | "quarterly";
  year: number;
  month?: string;
  quarter?: string;
  short?: boolean;
}): string {
  if (input.fileType === "monthly") {
    const month = new Date(2000, Number(input.month || 1) - 1, 1).toLocaleString("en", {
      month: input.short ? "short" : "long",
    });
    return `${month} ${input.year}`;
  }
  return `${input.quarter || "Q1"} ${input.year}`;
}
