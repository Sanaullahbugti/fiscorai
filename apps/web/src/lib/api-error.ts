export function getApiErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return typeof msg === "string" && msg.trim() ? msg : fallback;
}
