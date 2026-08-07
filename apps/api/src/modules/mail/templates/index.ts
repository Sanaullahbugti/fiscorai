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
