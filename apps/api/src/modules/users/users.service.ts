import { AppError } from "../../shared/errors.js";
import { storageRepository } from "../data/storage.repository.js";
import { userRepository } from "./users.repository.js";

export class UsersService {
  async profile(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError("User not found", 404);
    return this.publicUser(user);
  }

  async register(body: {
    email: string;
    username: string;
    password: string;
    contact?: string;
    plan?: string;
  }) {
    const { authService } = await import("../auth/auth.service.js");
    return authService.register(body);
  }

  async update(userId: string, data: { username?: string; alias?: string }) {
    const user = await userRepository.update(userId, data);
    return this.publicUser(user);
  }

  async updateAmazon(userId: string, amazonId: string) {
    const user = await userRepository.update(userId, { amazonId });
    await storageRepository.writeAmazonToken(user.email, amazonId);
    return this.publicUser(user);
  }

  private publicUser(user: {
    id: string;
    email: string;
    username: string;
    contact: string | null;
    alias: string | null;
    amazonId: string | null;
    plan: string;
    userStripeId: string | null;
  }) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      contact: user.contact,
      alias: user.alias,
      amazonId: user.amazonId,
      plan: user.plan,
      userStripeId: user.userStripeId,
      businessUser: false,
    };
  }
}

export const usersService = new UsersService();
