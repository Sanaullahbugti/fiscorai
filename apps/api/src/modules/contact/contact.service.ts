import { mailService } from "../mail/mail.service.js";
import type { CreateContactInput } from "./contact.dto.js";
import { contactRepository } from "./contact.repository.js";

export class ContactService {
  async create(input: CreateContactInput) {
    await contactRepository.create(input);
    try {
      await mailService.sendContactNotification(input);
      await mailService.sendContactReceipt(input.email, input.name);
    } catch (err) {
      console.error("[contact] failed to send notification email", err);
    }
    return "Message received";
  }
}

export const contactService = new ContactService();
