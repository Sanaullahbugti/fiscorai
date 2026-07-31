import { prisma } from "../../shared/prisma.js";
import type { CreateContactInput } from "./contact.dto.js";

export class ContactRepository {
  create(data: CreateContactInput) {
    return prisma.contact.create({ data });
  }
}

export const contactRepository = new ContactRepository();
