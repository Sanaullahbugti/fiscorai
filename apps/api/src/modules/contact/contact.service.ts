import { mailService } from "../mail/mail.service.js";
import type { CreateContactInput } from "./contact.dto.js";
import { contactRepository } from "./contact.repository.js";

export class ContactService {
  async create(input: CreateContactInput) {
    await contactRepository.create(input);
    mailService.enqueueContactEmails(input);
    return "Message received";
  }
}

export const contactService = new ContactService();
