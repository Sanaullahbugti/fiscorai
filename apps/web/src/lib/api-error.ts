import { formatSourcePeriodValue, sourcePeriodsToTarget, type CsvPeriodTarget } from "./detect-csv-period";

const PERIOD_MISMATCH_CODES = new Set(["PERIOD_MISMATCH", "PERIOD_OUTSIDE_QUARTER"]);

type ApiIssue = {
  message?: string;
  code?: string;
  severity?: string;
  sourceValue?: string;
  derivedValue?: string;
};

type ApiErrorBody = {
  message?: string;
  data?: {
    issues?: ApiIssue[];
    reconciliationStatus?: string;
    code?: string;
  };
};

export type PeriodMismatchInfo = {
  code: string;
  detectedLabel: string;
  selectedLabel: string;
  detectedTarget: CsvPeriodTarget | null;
};

function readBody(err: unknown): ApiErrorBody | undefined {
  return (err as { response?: { data?: ApiErrorBody } })?.response?.data;
}

export function getApiErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  const body = readBody(err);
  const msg = body?.message;
  if (typeof msg === "string" && msg.trim()) return msg;

  const issueMsg = body?.data?.issues?.find((i) => i.severity === "BLOCKER")?.message
    || body?.data?.issues?.[0]?.message;
  if (typeof issueMsg === "string" && issueMsg.trim()) return issueMsg;

  return fallback;
}

export function getApiErrorCode(err: unknown): string | undefined {
  const data = readBody(err)?.data;
  const periodIssue = data?.issues?.find((i) => i.code && PERIOD_MISMATCH_CODES.has(i.code));
  if (periodIssue?.code) return periodIssue.code;
  if (typeof data?.code === "string") return data.code;
  return data?.issues?.[0]?.code;
}

export function parsePeriodMismatch(err: unknown): PeriodMismatchInfo | null {
  const issues = readBody(err)?.data?.issues;
  const issue = issues?.find((i) => i.code && PERIOD_MISMATCH_CODES.has(i.code));
  if (!issue) return null;
  const detected = issue.sourceValue?.trim() || "";
  const selected = issue.derivedValue?.trim() || "";
  return {
    code: issue.code || "PERIOD_MISMATCH",
    detectedLabel: detected ? formatSourcePeriodValue(detected) : detected,
    selectedLabel: selected ? formatSourcePeriodValue(selected) : selected,
    detectedTarget: detected ? sourcePeriodsToTarget(detected) : null,
  };
}
