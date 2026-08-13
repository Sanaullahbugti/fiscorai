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
  type BetaInviteEmailInput,
  type PaymentEmailInput,
} from "./templates/index.js";

export type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

/**
 * Mailer: prefers Resend HTTP API when `RESEND_API_KEY` is set (works from
 * Render). Otherwise uses SMTP (GoDaddy). When neither is configured,
 * messages are logged so local/dev can still exercise auth flows.
 *
 * Auth/contact HTTP handlers must not await send — use `enqueue`.
 */
export class MailService {
  private transporter: Transporter | null = null;

  private get resendEnabled() {
    return Boolean(env.RESEND_API_KEY);
  }

  private get smtpEnabled() {
    return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
  }

  private get enabled() {
    return this.resendEnabled || this.smtpEnabled;
  }

  private getTransport(): Transporter {
    if (!this.transporter) {
      if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
        throw new Error("SMTP is not configured");
      }
      // nodemailer TransportOptions typing is awkward across versions — cast the SMTP config.
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
        connectionTimeout: 4_000,
        greetingTimeout: 4_000,
        socketTimeout: 8_000,
        pool: false,
      } as Parameters<typeof nodemailer.createTransport>[0]);
    }
    return this.transporter;
  }

  private async sendViaResend(input: SendMailInput): Promise<string | undefined> {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        html: input.html,
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Resend ${res.status}: ${body.slice(0, 200)}`);
    }
    const json = (await res.json().catch(() => null)) as { id?: string } | null;
    return json?.id;
  }

  async send(input: SendMailInput): Promise<string | undefined> {
    if (!this.enabled) {
      console.log(
        `[mail:dev] to=${input.to} subject=${JSON.stringify(input.subject)}\n${input.text}`,
      );
      return undefined;
    }

    if (this.resendEnabled) {
      return this.sendViaResend(input);
    }

    const info = await this.getTransport().sendMail({
      from: env.EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    return typeof info.messageId === "string" ? info.messageId : undefined;
  }

  /**
   * Queue mail without blocking the caller. Errors are logged only —
   * tokens/DB writes already succeeded before this is called.
   * Deferred with setImmediate so the HTTP response can flush first.
   */
  enqueue(label: string, task: () => Promise<void>): void {
    setImmediate(() => {
      void task().catch((err) => {
        console.error(`[mail] ${label} failed`, err instanceof Error ? err.message : err);
      });
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

  /**
   * Beta invite (legacy CLI shape). Prefer `sendBetaInvitePersonalized` for campaigns.
   */
  async sendBetaInvite(
    to: string,
    name: string,
    signupUrl?: string,
  ): Promise<string | undefined> {
    return this.sendBetaInvitePersonalized(to, {
      subject: "Could I process one Amazon VAT report for you free?",
      greetingName: name.trim().split(/\s+/)[0] || "there",
      opening:
        "I'm testing FiscorAI with a small group of ecommerce sellers and I'd like to invite you to try it with one real Amazon VAT Transactions Report.",
      signupUrl,
      ctaLabel: "Try FiscorAI free",
    });
  }

  async sendBetaInvitePersonalized(
    to: string,
    input: BetaInviteEmailInput & { subject: string },
  ): Promise<string | undefined> {
    return this.send({
      to,
      subject: input.subject,
      text: betaInviteEmailText(input),
      html: betaInviteEmailHtml(input),
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
