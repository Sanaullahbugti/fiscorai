import { prisma } from "../../shared/prisma.js";

/** UTC calendar day key, so the allowance resets at a predictable time for everyone. */
export function utcDay(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export class AnalystRepository {
  async countForDay(userId: string, day = utcDay()): Promise<number> {
    const row = await prisma.analystUsage.findUnique({
      where: { userId_day: { userId, day } },
    });
    return row?.count ?? 0;
  }

  /**
   * Atomically books one question against today's allowance and returns the new
   * total. The unique (userId, day) index makes the upsert safe under concurrent
   * requests, so a burst of parallel sends can't slip past the cap.
   */
  async increment(userId: string, day = utcDay()): Promise<number> {
    const row = await prisma.analystUsage.upsert({
      where: { userId_day: { userId, day } },
      create: { userId, day, count: 1 },
      update: { count: { increment: 1 } },
    });
    return row.count;
  }
}

export const analystRepository = new AnalystRepository();
