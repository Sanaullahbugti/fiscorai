import {
  brand,
  ctaButton,
  escapeHtml,
  greeting,
  mutedLink,
  wrapEmail,
} from "./layout.js";

export type NamedRecipient = { username: string; email?: string };

export function verificationEmailHtml(username: string, verifyUrl: string): string {
  return wrapEmail({
    preheader: "Confirm your email to activate your FiscorAI account.",
    eyebrow: "Account confirmation",
    title: "Confirm your email",
    bodyHtml: `
      ${greeting(username)}
      <p style="margin:0 0 14px;">
        Welcome to <strong>FiscorAI</strong> — Amazon EU VAT, sorted in one upload.
        Confirm your email to activate your account and start uploading VAT transaction reports.
      </p>
      ${ctaButton("Confirm email", verifyUrl)}
      ${mutedLink(verifyUrl)}
    `,
    noteHtml: `This link expires in <strong>24 hours</strong>. If you didn’t create a FiscorAI account, you can safely ignore this email.`,
  });
}

export function verificationEmailText(username: string, verifyUrl: string): string {
  return [
    `Hi ${username || "there"},`,
    "",
    "Welcome to FiscorAI. Confirm your email to activate your account:",
    verifyUrl,
    "",
    "This link expires in 24 hours. If you didn’t create an account, ignore this email.",
    "",
    "— FiscorAI · support@fiscorai.com",
    "https://fiscorai.com",
  ].join("\n");
}

export function passwordResetEmailHtml(username: string, resetUrl: string): string {
  return wrapEmail({
    preheader: "Reset your FiscorAI password with this secure link.",
    eyebrow: "Security",
    title: "Reset your password",
    bodyHtml: `
      ${greeting(username)}
      <p style="margin:0 0 14px;">
        We received a request to reset the password for your FiscorAI account.
        Choose a new password with the button below.
      </p>
      ${ctaButton("Reset password", resetUrl)}
      ${mutedLink(resetUrl)}
    `,
    noteHtml: `This link expires in <strong>1 hour</strong>. If you didn’t request a reset, ignore this email — your password stays unchanged.`,
  });
}

export function passwordResetEmailText(username: string, resetUrl: string): string {
  return [
    `Hi ${username || "there"},`,
    "",
    "We received a request to reset your FiscorAI password:",
    resetUrl,
    "",
    "This link expires in 1 hour. If you didn’t request a reset, ignore this email.",
    "",
    "— FiscorAI · support@fiscorai.com",
  ].join("\n");
}

export function passwordChangedEmailHtml(username: string): string {
  return wrapEmail({
    preheader: "Your FiscorAI password was changed.",
    eyebrow: "Security",
    title: "Password updated",
    bodyHtml: `
      ${greeting(username)}
      <p style="margin:0 0 14px;">
        Your FiscorAI password was changed successfully. You can sign in with your new password anytime.
      </p>
      ${ctaButton("Sign in to FiscorAI", "https://fiscorai.com/signin")}
      <p style="margin:18px 0 0;color:${brand.muted};font-size:13.5px;">
        If you didn’t make this change, contact us immediately at
        <a href="mailto:support@fiscorai.com" style="color:${brand.green};font-weight:600;">support@fiscorai.com</a>.
      </p>
    `,
  });
}

export function passwordChangedEmailText(username: string): string {
  return [
    `Hi ${username || "there"},`,
    "",
    "Your FiscorAI password was changed successfully.",
    "Sign in: https://fiscorai.com/signin",
    "",
    "If you didn’t make this change, email support@fiscorai.com right away.",
    "",
    "— FiscorAI",
  ].join("\n");
}

export function welcomeEmailHtml(username: string): string {
  return wrapEmail({
    preheader: "Your FiscorAI account is ready — upload your first VAT report.",
    eyebrow: "You’re in",
    title: "Account confirmed",
    bodyHtml: `
      ${greeting(username)}
      <p style="margin:0 0 14px;">
        Your email is confirmed. You’re ready to upload Amazon VAT Transactions Reports
        and get country-ready PDF summaries and detailed Excel files for your accountant.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px;background:${brand.cream};border:1px solid ${brand.border};border-radius:12px;">
        <tr>
          <td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:${brand.ink};">
            <strong style="color:${brand.green};">What you can do next</strong><br/>
            · Upload a monthly or quarterly CSV (up to 100&nbsp;MB)<br/>
            · Split by country &amp; scheme — OSS, regular, VOEC<br/>
            · Ask the AI Analyst about your VAT data
          </td>
        </tr>
      </table>
      ${ctaButton("Open FiscorAI", "https://fiscorai.com/signin")}
    `,
  });
}

export function welcomeEmailText(username: string): string {
  return [
    `Hi ${username || "there"},`,
    "",
    "Your FiscorAI email is confirmed. You’re ready to upload Amazon VAT reports.",
    "Sign in: https://fiscorai.com/signin",
    "",
    "— FiscorAI · support@fiscorai.com",
  ].join("\n");
}

export function contactNotifyEmailHtml(input: {
  name: string;
  email: string;
  message: string;
}): string {
  return wrapEmail({
    preheader: `New contact message from ${input.name}`,
    eyebrow: "Support inbox",
    title: "New contact message",
    bodyHtml: `
      <p style="margin:0 0 14px;">Someone submitted the FiscorAI contact form.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;border:1px solid ${brand.border};border-radius:12px;overflow:hidden;">
        <tr>
          <td style="padding:12px 16px;background:${brand.cream};font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${brand.muted};">
            From
          </td>
        </tr>
        <tr>
          <td style="padding:14px 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:${brand.ink};">
            <strong>${escapeHtml(input.name)}</strong><br/>
            <a href="mailto:${escapeHtml(input.email)}" style="color:${brand.green};">${escapeHtml(input.email)}</a>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 16px;background:${brand.cream};font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${brand.muted};border-top:1px solid ${brand.border};">
            Message
          </td>
        </tr>
        <tr>
          <td style="padding:14px 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${brand.ink};white-space:pre-wrap;">${escapeHtml(input.message)}</td>
        </tr>
      </table>
      ${ctaButton("Reply by email", `mailto:${input.email}?subject=${encodeURIComponent(`Re: FiscorAI support`)}`)}
    `,
  });
}

export function contactNotifyEmailText(input: {
  name: string;
  email: string;
  message: string;
}): string {
  return [`From: ${input.name} <${input.email}>`, "", input.message].join("\n");
}

export function contactReceiptEmailHtml(name: string): string {
  return wrapEmail({
    preheader: "We received your message — FiscorAI support will reply soon.",
    eyebrow: "Support",
    title: "We got your message",
    bodyHtml: `
      ${greeting(name)}
      <p style="margin:0 0 14px;">
        Thanks for contacting FiscorAI. Our team received your message and will get back to you
        at the email you provided, usually within one business day.
      </p>
      <p style="margin:0 0 14px;color:${brand.muted};font-size:13.5px;">
        For account access issues, you can also use
        <a href="https://fiscorai.com/forgot-password" style="color:${brand.green};font-weight:600;">Forgot password</a>
        or write us at
        <a href="mailto:support@fiscorai.com" style="color:${brand.green};font-weight:600;">support@fiscorai.com</a>.
      </p>
      ${ctaButton("Visit FiscorAI", "https://fiscorai.com")}
    `,
  });
}

export function contactReceiptEmailText(name: string): string {
  return [
    `Hi ${name || "there"},`,
    "",
    "Thanks for contacting FiscorAI. We received your message and will reply soon.",
    "",
    "— FiscorAI · support@fiscorai.com",
  ].join("\n");
}

export type BetaInviteEmailInput = {
  /** Greeting display: first name, "there", or "UPBIKERS team". */
  greetingName: string;
  /** Opening paragraph (plain text). */
  opening: string;
  signupUrl?: string;
  ctaLabel?: string;
  /** Optional extra paragraph before the sign-off (plain text). */
  closingExtra?: string;
  /** Closing ask / CTA sentence before the button (plain text). */
  ctaSentence?: string;
};

const BETA_SIGNUP_DEFAULT = "https://fiscorai.com/signup";

function betaInviteBulletsHtml(): string {
  return `<ul style="margin:0 0 14px;padding:0 0 0 18px;">
        <li style="margin:0 0 6px;">seller VAT identified from the source</li>
        <li style="margin:0 0 6px;">marketplace-responsible activity</li>
        <li style="margin:0 0 6px;">VAT activity by country and scheme</li>
        <li style="margin:0 0 6px;">refunds and inventory movements</li>
        <li style="margin:0 0 6px;">currencies kept completely separate</li>
        <li style="margin:0;">anything that may need review</li>
      </ul>`;
}

export function betaInviteEmailHtml(input: BetaInviteEmailInput): string {
  const signupUrl = input.signupUrl || BETA_SIGNUP_DEFAULT;
  const ctaLabel = input.ctaLabel || "Try FiscorAI free";
  const greetingName = input.greetingName.trim() || "there";
  const ctaSentence =
    input.ctaSentence?.trim() ||
    "I'd be happy to process your first report completely free.";
  const closingExtra = input.closingExtra?.trim();

  return wrapEmail({
    preheader:
      "Try FiscorAI with one Amazon VAT Transactions Report — free beta, no subscription required.",
    eyebrow: "Private beta invite",
    title: "Try FiscorAI with one Amazon VAT report",
    bodyHtml: `
      ${greeting(greetingName)}
      <p style="margin:0 0 14px;">${escapeHtml(input.opening.trim())}</p>
      <p style="margin:0 0 10px;">
        You upload the monthly Amazon VAT CSV and FiscorAI turns it into a reconciled report showing:
      </p>
      ${betaInviteBulletsHtml()}
      <p style="margin:0 0 14px;">
        You also get an accountant-ready PDF and a detailed Excel audit workbook, with the numbers
        traceable back to the source transactions.
      </p>
      <p style="margin:0 0 8px;">${escapeHtml(ctaSentence)}</p>
      <p style="margin:0 0 14px;">There is no subscription or payment required for the beta.</p>
      <p style="margin:0 0 8px;">In return, I'd mainly like to know:</p>
      <p style="margin:0 0 14px;">
        Would this make your monthly VAT reporting easier, and would the report be useful to you or your accountant?
      </p>
      ${
        closingExtra
          ? `<p style="margin:0 0 14px;">${escapeHtml(closingExtra)}</p>`
          : ""
      }
      ${ctaButton(ctaLabel, signupUrl)}
      ${mutedLink(signupUrl)}
      <p style="margin:18px 0 0;font-size:14px;line-height:1.55;color:${brand.ink};">
        Thanks,<br/>
        Team FiscorAI
      </p>
    `,
    noteHtml: `If this isn’t relevant, you can ignore this email — no follow-ups. Questions? Just reply.`,
    footerNote:
      "You’re receiving this because you were invited to try the FiscorAI beta. We never ask for your password by email.",
  });
}

export function betaInviteEmailText(input: BetaInviteEmailInput): string {
  const signupUrl = input.signupUrl || BETA_SIGNUP_DEFAULT;
  const ctaLabel = input.ctaLabel || "Try FiscorAI free";
  const greetingName = input.greetingName.trim() || "there";
  const ctaSentence =
    input.ctaSentence?.trim() ||
    "I'd be happy to process your first report completely free.";
  const lines = [
    `Hi ${greetingName},`,
    "",
    input.opening.trim(),
    "",
    "You upload the monthly Amazon VAT CSV and FiscorAI turns it into a reconciled report showing:",
    "",
    "• seller VAT identified from the source",
    "• marketplace-responsible activity",
    "• VAT activity by country and scheme",
    "• refunds and inventory movements",
    "• currencies kept completely separate",
    "• anything that may need review",
    "",
    "You also get an accountant-ready PDF and a detailed Excel audit workbook, with the numbers traceable back to the source transactions.",
    "",
    ctaSentence,
    "There is no subscription or payment required for the beta.",
    "",
    "In return, I'd mainly like to know:",
    "Would this make your monthly VAT reporting easier, and would the report be useful to you or your accountant?",
  ];
  if (input.closingExtra?.trim()) {
    lines.push("", input.closingExtra.trim());
  }
  lines.push(
    "",
    `${ctaLabel}: ${signupUrl}`,
    "",
    "Thanks,",
    "Team FiscorAI",
    "",
    "— support@fiscorai.com · https://fiscorai.com",
  );
  return lines.join("\n");
}


export type PaymentEmailInput = {
  username: string;
  plan: string;
  amountLabel: string;
  invoiceUrl?: string | null;
  billingUrl?: string;
};

export function paymentSuccessEmailHtml(input: PaymentEmailInput): string {
  const billingUrl = input.billingUrl || "https://fiscorai.com/billing";
  const invoiceBlock = input.invoiceUrl
    ? `<p style="margin:0 0 14px;"><a href="${escapeHtml(input.invoiceUrl)}" style="color:${brand.green};font-weight:600;">View invoice</a></p>`
    : "";
  return wrapEmail({
    preheader: `Payment confirmed — you're on FiscorAI ${input.plan}.`,
    eyebrow: "Billing",
    title: "Payment successful",
    bodyHtml: `
      ${greeting(input.username)}
      <p style="margin:0 0 14px;">
        Thanks for your payment. Your <strong>${escapeHtml(input.plan)}</strong> plan is active.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px;background:${brand.cream};border:1px solid ${brand.border};border-radius:12px;">
        <tr>
          <td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:${brand.ink};">
            <strong style="color:${brand.green};">Receipt</strong><br/>
            Plan: ${escapeHtml(input.plan)}<br/>
            Amount: ${escapeHtml(input.amountLabel)}
          </td>
        </tr>
      </table>
      ${invoiceBlock}
      ${ctaButton("Open billing", billingUrl)}
    `,
  });
}

export function paymentSuccessEmailText(input: PaymentEmailInput): string {
  const billingUrl = input.billingUrl || "https://fiscorai.com/billing";
  const lines = [
    `Hi ${input.username || "there"},`,
    "",
    `Thanks for your payment. Your ${input.plan} plan is active.`,
    `Amount: ${input.amountLabel}`,
  ];
  if (input.invoiceUrl) lines.push(`Invoice: ${input.invoiceUrl}`);
  lines.push("", `Billing: ${billingUrl}`, "", "— FiscorAI · support@fiscorai.com");
  return lines.join("\n");
}

export function paymentFailedEmailHtml(input: PaymentEmailInput): string {
  const billingUrl = input.billingUrl || "https://fiscorai.com/billing";
  return wrapEmail({
    preheader: "We couldn't process your FiscorAI payment.",
    eyebrow: "Billing",
    title: "Payment failed",
    bodyHtml: `
      ${greeting(input.username)}
      <p style="margin:0 0 14px;">
        We couldn't process the payment for your <strong>${escapeHtml(input.plan)}</strong> plan
        (${escapeHtml(input.amountLabel)}). Update your payment method to keep access.
      </p>
      ${ctaButton("Manage billing", billingUrl)}
      <p style="margin:18px 0 0;color:${brand.muted};font-size:13.5px;">
        Need help? Email
        <a href="mailto:support@fiscorai.com" style="color:${brand.green};font-weight:600;">support@fiscorai.com</a>.
      </p>
    `,
  });
}

export function paymentFailedEmailText(input: PaymentEmailInput): string {
  const billingUrl = input.billingUrl || "https://fiscorai.com/billing";
  return [
    `Hi ${input.username || "there"},`,
    "",
    `We couldn't process the payment for your ${input.plan} plan (${input.amountLabel}).`,
    `Manage billing: ${billingUrl}`,
    "",
    "— FiscorAI · support@fiscorai.com",
  ].join("\n");
}

export function subscriptionCancelledEmailHtml(input: {
  username: string;
  plan: string;
  endsAtLabel?: string | null;
  billingUrl?: string;
}): string {
  const billingUrl = input.billingUrl || "https://fiscorai.com/billing";
  const ends = input.endsAtLabel
    ? `<p style="margin:0 0 14px;">You'll keep <strong>${escapeHtml(input.plan)}</strong> access until <strong>${escapeHtml(input.endsAtLabel)}</strong>, then move to Free.</p>`
    : `<p style="margin:0 0 14px;">Your <strong>${escapeHtml(input.plan)}</strong> subscription is cancelled.</p>`;
  return wrapEmail({
    preheader: `Your FiscorAI ${input.plan} subscription was cancelled.`,
    eyebrow: "Billing",
    title: "Subscription cancelled",
    bodyHtml: `
      ${greeting(input.username)}
      ${ends}
      ${ctaButton("View plans", billingUrl)}
    `,
  });
}

export function subscriptionCancelledEmailText(input: {
  username: string;
  plan: string;
  endsAtLabel?: string | null;
  billingUrl?: string;
}): string {
  const billingUrl = input.billingUrl || "https://fiscorai.com/billing";
  const ends = input.endsAtLabel
    ? `You'll keep ${input.plan} until ${input.endsAtLabel}, then move to Free.`
    : `Your ${input.plan} subscription is cancelled.`;
  return [
    `Hi ${input.username || "there"},`,
    "",
    ends,
    `Plans: ${billingUrl}`,
    "",
    "— FiscorAI · support@fiscorai.com",
  ].join("\n");
}

export function paymentNotifyOwnerEmailHtml(input: {
  email: string;
  username: string;
  plan: string;
  amountLabel: string;
}): string {
  return wrapEmail({
    preheader: `New paid subscriber: ${input.plan}`,
    eyebrow: "Revenue",
    title: "New successful payment",
    bodyHtml: `
      <p style="margin:0 0 14px;">A customer completed a FiscorAI payment.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;border:1px solid ${brand.border};border-radius:12px;overflow:hidden;">
        <tr>
          <td style="padding:14px 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:${brand.ink};">
            <strong>${escapeHtml(input.username)}</strong><br/>
            <a href="mailto:${escapeHtml(input.email)}" style="color:${brand.green};">${escapeHtml(input.email)}</a><br/>
            Plan: ${escapeHtml(input.plan)} · ${escapeHtml(input.amountLabel)}
          </td>
        </tr>
      </table>
    `,
  });
}

export function paymentNotifyOwnerEmailText(input: {
  email: string;
  username: string;
  plan: string;
  amountLabel: string;
}): string {
  return [
    "New successful FiscorAI payment",
    "",
    `Customer: ${input.username} <${input.email}>`,
    `Plan: ${input.plan}`,
    `Amount: ${input.amountLabel}`,
  ].join("\n");
}
