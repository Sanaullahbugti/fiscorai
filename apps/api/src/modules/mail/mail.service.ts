import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { env } from "../../config/env.js";
import {
  betaInviteEmailHtml,
  betaInviteEmailText,
  contactNotifyEmailHtml,
  contactNotifyEmailText,
  contactReceiptEmailHtml,
  contactReceiptEmailText,
  passwordChangedEmailHtml,
  passwordChangedEmailText,
  passwordResetEmailHtml,
  passwordResetEmailText,
  paymentFailedEmailHtml,
  paymentFailedEmailText,
  paymentNotifyOwnerEmailHtml,
  paymentNotifyOwnerEmailText,
  paymentSuccessEmailHtml,
  paymentSuccessEmailText,
  subscriptionCancelledEmailHtml,
  subscriptionCancelledEmailText,
  verificationEmailHtml,
  verificationEmailText,
  welcomeEmailHtml,
  welcomeEmailText,
  type PaymentEmailInput,
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
 *
 * Auth/contact HTTP handlers must not await SMTP — GoDaddy can take
 * several seconds (or hang). Use `enqueue` so the API returns immediately.
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
        // Fail fast instead of holding signup/verify requests open.
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
        pool: true,
        maxConnections: 2,
        maxMessages: 50,
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

  /**
   * Queue mail without blocking the caller. Errors are logged only —
   * tokens/DB writes already succeeded before this is called.
   */
  enqueue(label: string, task: () => Promise<void>): void {
    void task().catch((err) => {
      console.error(`[mail] ${label} failed`, err instanceof Error ? err.message : err);
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

  enqueueVerificationEmail(to: string, username: string, verifyUrl: string) {
    this.enqueue(`verification→${to}`, () => this.sendVerificationEmail(to, username, verifyUrl));
  }

  async sendPasswordResetEmail(to: string, username: string, resetUrl: string) {
    await this.send({
      to,
      subject: "Reset your FiscorAI password",
      text: passwordResetEmailText(username, resetUrl),
      html: passwordResetEmailHtml(username, resetUrl),
    });
  }

  enqueuePasswordResetEmail(to: string, username: string, resetUrl: string) {
    this.enqueue(`password-reset→${to}`, () => this.sendPasswordResetEmail(to, username, resetUrl));
  }

  async sendPasswordChangedEmail(to: string, username: string) {
    await this.send({
      to,
      subject: "Your FiscorAI password was updated",
      text: passwordChangedEmailText(username),
      html: passwordChangedEmailHtml(username),
    });
  }

  enqueuePasswordChangedEmail(to: string, username: string) {
    this.enqueue(`password-changed→${to}`, () => this.sendPasswordChangedEmail(to, username));
  }

  async sendWelcomeEmail(to: string, username: string) {
    await this.send({
      to,
      subject: "Welcome to FiscorAI — you’re confirmed",
      text: welcomeEmailText(username),
      html: welcomeEmailHtml(username),
    });
  }

  enqueueWelcomeEmail(to: string, username: string) {
    this.enqueue(`welcome→${to}`, () => this.sendWelcomeEmail(to, username));
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

  enqueueContactEmails(input: { name: string; email: string; message: string }) {
    this.enqueue(`contact-notify`, async () => {
      await this.sendContactNotification(input);
      await this.sendContactReceipt(input.email, input.name);
    });
  }

  async sendBetaInvite(to: string, name: string, signupUrl?: string) {
    await this.send({
      to,
      subject: "You’re invited to the FiscorAI private beta",
      text: betaInviteEmailText({ name, signupUrl }),
      html: betaInviteEmailHtml({ name, signupUrl }),
    });
  }

  private billingUrl() {
    return `${env.WEB_APP_URL.replace(/\/$/, "")}/billing`;
  }

  async sendPaymentSuccessEmail(to: string, input: Omit<PaymentEmailInput, "billingUrl">) {
    const payload: PaymentEmailInput = { ...input, billingUrl: this.billingUrl() };
    await this.send({
      to,
      subject: `Payment confirmed — FiscorAI ${input.plan}`,
      text: paymentSuccessEmailText(payload),
      html: paymentSuccessEmailHtml(payload),
    });
  }

  async sendPaymentFailedEmail(to: string, input: Omit<PaymentEmailInput, "billingUrl">) {
    const payload: PaymentEmailInput = { ...input, billingUrl: this.billingUrl() };
    await this.send({
      to,
      subject: "Payment failed — FiscorAI",
      text: paymentFailedEmailText(payload),
      html: paymentFailedEmailHtml(payload),
    });
  }

  async sendSubscriptionCancelledEmail(
    to: string,
    input: { username: string; plan: string; endsAtLabel?: string | null },
  ) {
    await this.send({
      to,
      subject: `Subscription cancelled — FiscorAI ${input.plan}`,
      text: subscriptionCancelledEmailText({ ...input, billingUrl: this.billingUrl() }),
      html: subscriptionCancelledEmailHtml({ ...input, billingUrl: this.billingUrl() }),
    });
  }

  async sendPaymentOwnerNotify(input: {
    email: string;
    username: string;
    plan: string;
    amountLabel: string;
  }) {
    if (!env.EMAIL_NOTIFY_TO) return;
    await this.send({
      to: env.EMAIL_NOTIFY_TO,
      subject: `New payment: ${input.plan} · ${input.amountLabel}`,
      text: paymentNotifyOwnerEmailText(input),
      html: paymentNotifyOwnerEmailHtml(input),
    });
  }

  enqueuePaymentSuccess(
    to: string,
    input: Omit<PaymentEmailInput, "billingUrl"> & { email: string },
  ) {
    this.enqueue(`payment-success→${to}`, async () => {
      await this.sendPaymentSuccessEmail(to, input);
      await this.sendPaymentOwnerNotify({
        email: input.email,
        username: input.username,
        plan: input.plan,
        amountLabel: input.amountLabel,
      });
    });
  }

  enqueuePaymentFailed(to: string, input: Omit<PaymentEmailInput, "billingUrl">) {
    this.enqueue(`payment-failed→${to}`, () => this.sendPaymentFailedEmail(to, input));
  }

  enqueueSubscriptionCancelled(
    to: string,
    input: { username: string; plan: string; endsAtLabel?: string | null },
  ) {
    this.enqueue(`subscription-cancelled→${to}`, () =>
      this.sendSubscriptionCancelledEmail(to, input),
    );
  }
}

export const mailService = new MailService();
