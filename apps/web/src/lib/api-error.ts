type ApiErrorBody = {
  message?: string;
  data?: {
    issues?: Array<{ message?: string; code?: string; severity?: string }>;
    reconciliationStatus?: string;
    code?: string;
  };
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
  if (typeof data?.code === "string") return data.code;
  return data?.issues?.[0]?.code;
}
