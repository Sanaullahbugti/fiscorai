/**
 * Send FiscorAI private-beta invites.
 *
 * Usage (from apps/api):
 *   pnpm exec tsx scripts/send-beta-invites.ts "Ada Seller <ada@example.com>" "Bob <bob@example.com>"
 *
 * Or a file with one "Name <email>" or "email" per line:
 *   pnpm exec tsx scripts/send-beta-invites.ts --file ./beta-testers.txt
 *
 * Requires SMTP_* (or logs in dev when unset).
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { mailService } from "../src/modules/mail/mail.service.js";

type Invitee = { name: string; email: string };

function parseInvitee(raw: string): Invitee | null {
  const line = raw.trim();
  if (!line || line.startsWith("#")) return null;

  const angled = line.match(/^(.+?)\s*<([^>]+)>$/);
  if (angled) {
    return { name: angled[1].trim(), email: angled[2].trim().toLowerCase() };
  }
  if (line.includes("@")) {
    const email = line.toLowerCase();
    const local = email.split("@")[0] || "there";
    return { name: local, email };
  }
  return null;
}

function loadInvitees(argv: string[]): Invitee[] {
  const fileIdx = argv.indexOf("--file");
  if (fileIdx >= 0) {
    const path = argv[fileIdx + 1];
    if (!path) throw new Error("--file requires a path");
    return readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map(parseInvitee)
      .filter((x): x is Invitee => Boolean(x));
  }
  return argv.map(parseInvitee).filter((x): x is Invitee => Boolean(x));
}

async function main() {
  const invitees = loadInvitees(process.argv.slice(2));
  if (!invitees.length) {
    console.error(
      'Usage: tsx scripts/send-beta-invites.ts "Name <email@x.com>" ...\n' +
        "   or: tsx scripts/send-beta-invites.ts --file beta-testers.txt",
    );
    process.exit(1);
  }

  for (const person of invitees) {
    await mailService.sendBetaInvite(person.email, person.name);
    console.log(`sent → ${person.name} <${person.email}>`);
  }
  console.log(`Done. ${invitees.length} invite(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
