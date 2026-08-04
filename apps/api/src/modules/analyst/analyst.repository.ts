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

export type MessageInput = {
  role: "user" | "assistant";
  content: string;
  metadataJson?: string | null;
};

/**
 * Conversation storage. Every method takes userId and filters on it, so a guessed
 * conversation id from another account resolves to nothing rather than leaking.
 */
export class ConversationRepository {
  list(userId: string, limit = 50) {
    return prisma.analystConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: limit,
      select: { id: true, title: true, mode: true, createdAt: true, updatedAt: true },
    });
  }

  get(userId: string, id: string) {
    return prisma.analystConversation.findFirst({
      where: { id, userId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
  }

  create(userId: string, title: string, mode: string) {
    return prisma.analystConversation.create({
      data: { userId, title, mode },
      select: { id: true, title: true, mode: true, createdAt: true, updatedAt: true },
    });
  }

  async rename(userId: string, id: string, title: string) {
    const { count } = await prisma.analystConversation.updateMany({
      where: { id, userId },
      data: { title },
    });
    return count > 0;
  }

  async remove(userId: string, id: string) {
    const { count } = await prisma.analystConversation.deleteMany({ where: { id, userId } });
    return count > 0;
  }

  /** Appends turns and bumps updatedAt so the history list re-sorts. */
  async addMessages(userId: string, id: string, messages: MessageInput[]) {
    const owned = await prisma.analystConversation.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!owned) return null;

    await prisma.analystMessage.createMany({
      data: messages.map((m) => ({
        conversationId: id,
        role: m.role,
        content: m.content,
        metadataJson: m.metadataJson ?? null,
      })),
    });
    return prisma.analystConversation.update({
      where: { id },
      data: { updatedAt: new Date() },
      select: { id: true, title: true, mode: true, updatedAt: true },
    });
  }
}

export const conversationRepository = new ConversationRepository();
