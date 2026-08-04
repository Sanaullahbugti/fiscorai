export const MONTHS = [
  "Aug 25",
  "Sep 25",
  "Oct 25",
  "Nov 25",
  "Dec 25",
  "Jan 26",
  "Feb 26",
  "Mar 26",
  "Apr 26",
  "May 26",
  "Jun 26",
  "Jul 26",
] as const;

export const SALES = [
  128400, 141900, 168300, 214700, 268900, 192400, 171200, 183600, 196800, 205300, 231700, 248900,
] as const;

export type CountryDef = {
  code: string;
  name: string;
  share: number;
  applied: number;
  correct: number;
  color: string;
};

export const COUNTRIES: CountryDef[] = [
  { code: "DE", name: "Germany", share: 0.31, applied: 19, correct: 19, color: "#2E5D3B" },
  { code: "FR", name: "France", share: 0.19, applied: 20, correct: 20, color: "#3C7A4C" },
  { code: "IT", name: "Italy", share: 0.14, applied: 19, correct: 22, color: "#C8862B" },
  { code: "ES", name: "Spain", share: 0.13, applied: 21, correct: 21, color: "#4E8F60" },
  { code: "NL", name: "Netherl.", share: 0.1, applied: 21, correct: 21, color: "#6AA377" },
  { code: "PL", name: "Poland", share: 0.08, applied: 8, correct: 23, color: "#C1432E" },
  { code: "SE", name: "Sweden", share: 0.05, applied: 25, correct: 25, color: "#3B6E8F" },
];

export const ERROR_RATE_PCT = 1.9;
export const SHOW_CALCULATOR = true;
