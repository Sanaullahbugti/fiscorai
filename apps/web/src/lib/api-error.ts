export function getApiErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return typeof msg === "string" && msg.trim() ? msg : fallback;
}

export function getApiErrorCode(err: unknown): string | undefined {
  const data = (err as { response?: { data?: { data?: { code?: string } } } })?.response?.data
    ?.data;
  return typeof data?.code === "string" ? data.code : undefined;
}
