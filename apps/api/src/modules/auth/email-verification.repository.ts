import { prisma } from "../../shared/prisma.js";

export class EmailVerificationTokenRepository {
  create(data: { userId: string; token: string; expiresAt: Date }) {
    return prisma.emailVerificationToken.create({ data });
  }

  findByToken(token: string) {
    return prisma.emailVerificationToken.findUnique({ where: { token } });
  }

  deleteById(id: string) {
    return prisma.emailVerificationToken.delete({ where: { id } });
  }

  deleteAllForUser(userId: string) {
    return prisma.emailVerificationToken.deleteMany({ where: { userId } });
  }
}

export const emailVerificationTokenRepository = new EmailVerificationTokenRepository();
