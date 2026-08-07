import { prisma } from "../../shared/prisma.js";

export class PasswordResetTokenRepository {
  create(data: { userId: string; token: string; expiresAt: Date }) {
    return prisma.passwordResetToken.create({ data });
  }

  findByToken(token: string) {
    return prisma.passwordResetToken.findUnique({ where: { token } });
  }

  deleteById(id: string) {
    return prisma.passwordResetToken.delete({ where: { id } });
  }

  deleteAllForUser(userId: string) {
    return prisma.passwordResetToken.deleteMany({ where: { userId } });
  }
}

export const passwordResetTokenRepository = new PasswordResetTokenRepository();
