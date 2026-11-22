import crypto from "node:crypto";
import { HttpError } from "@/lib/auth";
import { one, q } from "@/lib/db";
import { emailEnabled, sendEmail } from "@/lib/email";
import { handle } from "@/lib/http";

/** Is self-service reset available? (Only when email sending is set up.) */
export const GET = handle(async () => ({ enabled: emailEnabled() }));

/** Email a one-hour reset link. Always answers the same way, so it doesn't reveal who has an account. */
export const POST = handle(async (req: Request) => {
  if (!emailEnabled()) throw new HttpError(400, "Password reset by email isn't set up. Ask your instructor to reset your password.");
  const b = await req.json();
  const email = String(b.email ?? "").trim().toLowerCase();
  const u = await one<{ id: string; name: string }>("select id, name from users where email = $1", [email]);
  if (u) {
    const token = crypto.randomBytes(24).toString("base64url");
    const hash = crypto.createHash("sha256").update(token).digest("hex");
    await q("insert into password_resets (token_hash, user_id, expires_at) values ($1, $2, now() + interval '1 hour')", [hash, u.id]);
    const base = process.env.APP_URL ?? new URL(req.url).origin;
    await sendEmail(
      email,
      "Reset your Heart Race password",
      `Hi ${u.name},\n\nSomeone asked to reset your Heart Race password. To choose a new one, open this link within 1 hour:\n\n${base}/reset?token=${token}\n\nIf you didn't ask for this, you can ignore this email.`,
    );
  }
  return { ok: true };
});
