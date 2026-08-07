/** FiscorAI transactional email chrome — inline CSS for client compatibility. */

export const brand = {
  forest: "#1e3a2f",
  forestDeep: "#162c24",
  green: "#2f5d3d",
  gold: "#e0b45a",
  cream: "#f3efe6",
  card: "#fffcf6",
  ink: "#1c241e",
  muted: "#5c675f",
  onBrand: "#f6f2e9",
  border: "#d9d2c3",
  white: "#ffffff",
  critical: "#b42318",
} as const;

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type LayoutInput = {
  preheader: string;
  title: string;
  eyebrow?: string;
  bodyHtml: string;
  /** Optional footnote under the card (expiry, ignore notice). */
  noteHtml?: string;
};

/**
 * Shared FiscorAI shell: forest header, cream canvas, gold accent rule,
 * serif headline, system-safe body stack. Table layout for Outlook/Gmail.
 */
export function wrapEmail(input: LayoutInput): string {
  const eyebrow = input.eyebrow
    ? `<p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${brand.gold};">${input.eyebrow}</p>`
    : "";

  const note = input.noteHtml
    ? `<tr>
        <td style="padding:0 32px 28px;font-family:Arial,Helvetica,sans-serif;font-size:12.5px;line-height:1.55;color:${brand.muted};">
          ${input.noteHtml}
        </td>
      </tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${escapeHtml(input.title)}</title>
  <!--[if mso]><style>body,table,td{font-family:Arial,Helvetica,sans-serif!important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background:${brand.cream};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    ${escapeHtml(input.preheader)}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${brand.cream};">
    <tr>
      <td align="center" style="padding:28px 16px 40px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;background:${brand.card};border:1px solid ${brand.border};border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:${brand.forest};padding:28px 32px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.2;font-weight:700;letter-spacing:-0.02em;color:${brand.onBrand};">
                    Fiscor<span style="color:${brand.gold};">AI</span>
                  </td>
                  <td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:rgba(246,242,233,0.72);">
                    VAT for Amazon EU
                  </td>
                </tr>
              </table>
              <div style="height:3px;width:56px;margin-top:18px;background:${brand.gold};border-radius:2px;"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 8px;">
              ${eyebrow}
              <h1 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.2;font-weight:600;color:${brand.ink};">
                ${escapeHtml(input.title)}
              </h1>
              <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${brand.ink};">
                ${input.bodyHtml}
              </div>
            </td>
          </tr>
          ${note}
          <tr>
            <td style="padding:0 32px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${brand.border};">
                <tr>
                  <td style="padding-top:20px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.55;color:${brand.muted};">
                    FiscorAI · Amazon EU VAT, sorted in one upload<br/>
                    <a href="https://fiscorai.com" style="color:${brand.green};text-decoration:none;font-weight:600;">fiscorai.com</a>
                    &nbsp;·&nbsp;
                    <a href="mailto:support@fiscorai.com" style="color:${brand.green};text-decoration:none;font-weight:600;">support@fiscorai.com</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        <p style="margin:18px 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.5;color:${brand.muted};max-width:560px;">
          You’re receiving this because of an account action on FiscorAI. We never ask for your password by email.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function ctaButton(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;">
  <tr>
    <td align="center" bgcolor="${brand.forest}" style="border-radius:12px;background:${brand.forest};">
      <a href="${href}" style="display:inline-block;padding:14px 26px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:${brand.onBrand};text-decoration:none;border-radius:12px;">
        ${escapeHtml(label)}
      </a>
    </td>
  </tr>
</table>`;
}

export function mutedLink(href: string): string {
  return `<p style="margin:16px 0 0;font-size:12.5px;line-height:1.55;color:${brand.muted};word-break:break-all;">
  Or paste this link into your browser:<br/>
  <a href="${href}" style="color:${brand.green};">${escapeHtml(href)}</a>
</p>`;
}

export function greeting(name: string): string {
  const safe = escapeHtml(name.trim() || "there");
  return `<p style="margin:0 0 14px;">Hi ${safe},</p>`;
}
