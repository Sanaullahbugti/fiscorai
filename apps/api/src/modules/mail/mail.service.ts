import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { env } from "../../config/env.js";
import {
  contactNotifyEmailHtml,
  contactNotifyEmailText,
  contactReceiptEmailHtml,
  contactReceiptEmailText,
  passwordChangedEmailHtml,
  passwordChangedEmailText,
  passwordResetEmailHtml,
  passwordResetEmailText,
  verificationEmailHtml,
  verificationEmailText,
  welcomeEmailHtml,
  welcomeEmailText,
} from "./templates/index.js";

export type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

/**
 * SMTP mailer (GoDaddy Titan / Professional Email by default).
 * When SMTP_HOST / SMTP_USER / SMTP_PASS are unset, messages are logged
 * instead of sent so local/dev can still exercise auth flows.
 */
export class MailService {
  private transporter: Transporter | null = null;

  private get enabled() {
    return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
  }

  private getTransport(): Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
    }
    return this.transporter;
  }

  async send(input: SendMailInput): Promise<void> {
    if (!this.enabled) {
      console.log(
        `[mail:dev] to=${input.to} subject=${JSON.stringify(input.subject)}\n${input.text}`,
      );
      return;
    }

    await this.getTransport().sendMail({
      from: env.EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
  }

  async sendVerificationEmail(to: string, username: string, verifyUrl: string) {
    await this.send({
      to,
      subject: "Confirm your FiscorAI account",
      text: verificationEmailText(username, verifyUrl),
      html: verificationEmailHtml(username, verifyUrl),
    });
  }

  async sendPasswordResetEmail(to: string, username: string, resetUrl: string) {
    await this.send({
      to,
      subject: "Reset your FiscorAI password",
      text: passwordResetEmailText(username, resetUrl),
      html: passwordResetEmailHtml(username, resetUrl),
    });
  }

  async sendPasswordChangedEmail(to: string, username: string) {
    await this.send({
      to,
      subject: "Your FiscorAI password was updated",
      text: passwordChangedEmailText(username),
      html: passwordChangedEmailHtml(username),
    });
  }

  async sendWelcomeEmail(to: string, username: string) {
    await this.send({
      to,
      subject: "Welcome to FiscorAI — you’re confirmed",
      text: welcomeEmailText(username),
      html: welcomeEmailHtml(username),
    });
  }

  async sendContactNotification(input: {
    name: string;
    email: string;
    message: string;
  }) {
    if (!env.EMAIL_NOTIFY_TO) return;

    await this.send({
      to: env.EMAIL_NOTIFY_TO,
      subject: `Contact form: ${input.name}`,
      text: contactNotifyEmailText(input),
      html: contactNotifyEmailHtml(input),
    });
  }

  async sendContactReceipt(to: string, name: string) {
    await this.send({
      to,
      subject: "We received your message — FiscorAI",
      text: contactReceiptEmailText(name),
      html: contactReceiptEmailHtml(name),
    });
  }
}

export const mailService = new MailService();
