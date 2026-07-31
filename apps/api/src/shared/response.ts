export type GeneralResponse<T = unknown> = {
  message: string;
  statusCode: number;
  data?: T;
};

export function ok<T>(data?: T, message = "success"): GeneralResponse<T> {
  return { message, statusCode: 200, data };
}

export function fail(message: string, statusCode = 400, data?: unknown): GeneralResponse {
  return { message, statusCode, data };
}
