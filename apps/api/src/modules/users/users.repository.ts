import { prisma } from "../../shared/prisma.js";

export class UserRepository {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  }

  create(data: {
    email: string;
    username: string;
    password: string;
    contact?: string;
    plan?: string;
  }) {
    return prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        username: data.username,
        password: data.password,
        contact: data.contact || "",
        plan: data.plan || "Free",
      },
    });
  }

  /** Signup path: single insert for user + Free subscription + verification token. */
  createWithSubscriptionAndVerification(data: {
    email: string;
    username: string;
    password: string;
    contact?: string;
    plan?: string;
    verificationToken: string;
    verificationExpiresAt: Date;
  }) {
    return prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        username: data.username,
        password: data.password,
        contact: data.contact || "",
        plan: data.plan || "Free",
        subscription: {
          create: {
            plan: "Free",
            price: 0,
            active: false,
            canceled: false,
          },
        },
        verificationTokens: {
          create: {
            token: data.verificationToken,
            expiresAt: data.verificationExpiresAt,
          },
        },
      },
    });
  }

  update(
    id: string,
    data: {
      username?: string;
      alias?: string;
      amazonId?: string;
      plan?: string;
      password?: string;
      lemonCustomerId?: string;
      emailVerifiedAt?: Date | null;
    },
  ) {
    return prisma.user.update({ where: { id }, data });
  }
}

export const userRepository = new UserRepository();
