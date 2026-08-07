import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { env } from "../../config/env.js";

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
    const subject = "Confirm your FiscorAI account";
    const text = [
      `Hi ${username},`,
      "",
      "Thanks for signing up for FiscorAI. Confirm your email with this link:",
      verifyUrl,
      "",
      "This link expires in 24 hours. If you did not create an account, you can ignore this email.",
      "",
      "— FiscorAI",
      "support@fiscorai.com",
    ].join("\n");

    const html = `
      <div style="font-family:Georgia,serif;max-width:520px;line-height:1.5;color:#1a1a1a">
        <p>Hi ${escapeHtml(username)},</p>
        <p>Thanks for signing up for <strong>FiscorAI</strong>. Confirm your email to activate your account:</p>
        <p style="margin:24px 0">
          <a href="${verifyUrl}" style="background:#1a3a2a;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:600">
            Confirm email
          </a>
        </p>
        <p style="font-size:13px;color:#555">Or paste this link into your browser:<br/>
          <a href="${verifyUrl}">${verifyUrl}</a>
        </p>
        <p style="font-size:13px;color:#555">This link expires in 24 hours. If you did not create an account, ignore this email.</p>
        <p style="font-size:13px;color:#555">— FiscorAI · support@fiscorai.com</p>
      </div>
    `;

    await this.send({ to, subject, text, html });
  }

  async sendPasswordResetEmail(to: string, username: string, resetUrl: string) {
    const subject = "Reset your FiscorAI password";
    const text = [
      `Hi ${username},`,
      "",
      "We received a request to reset your FiscorAI password. Use this link:",
      resetUrl,
      "",
      "This link expires in 1 hour. If you did not request a reset, you can ignore this email.",
      "",
      "— FiscorAI",
      "support@fiscorai.com",
    ].join("\n");

    const html = `
      <div style="font-family:Georgia,serif;max-width:520px;line-height:1.5;color:#1a1a1a">
        <p>Hi ${escapeHtml(username)},</p>
        <p>We received a request to reset your <strong>FiscorAI</strong> password:</p>
        <p style="margin:24px 0">
          <a href="${resetUrl}" style="background:#1a3a2a;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:600">
            Reset password
          </a>
        </p>
        <p style="font-size:13px;color:#555">Or paste this link into your browser:<br/>
          <a href="${resetUrl}">${resetUrl}</a>
        </p>
        <p style="font-size:13px;color:#555">This link expires in 1 hour. If you did not request a reset, ignore this email.</p>
        <p style="font-size:13px;color:#555">— FiscorAI · support@fiscorai.com</p>
      </div>
    `;

    await this.send({ to, subject, text, html });
  }

  async sendContactNotification(input: {
    name: string;
    email: string;
    message: string;
  }) {
    if (!env.EMAIL_NOTIFY_TO) return;

    const subject = `Contact form: ${input.name}`;
    const text = [
      `From: ${input.name} <${input.email}>`,
      "",
      input.message,
    ].join("\n");

    const html = `
      <div style="font-family:Georgia,serif;max-width:520px;line-height:1.5;color:#1a1a1a">
        <p><strong>From:</strong> ${escapeHtml(input.name)} &lt;${escapeHtml(input.email)}&gt;</p>
        <p style="white-space:pre-wrap">${escapeHtml(input.message)}</p>
      </div>
    `;

    await this.send({ to: env.EMAIL_NOTIFY_TO, subject, text, html });
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const mailService = new MailService();
