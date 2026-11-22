import crypto from "node:crypto";
import { HttpError, setPassword } from "@/lib/auth";
import { one, q } from "@/lib/db";
import { handle } from "@/lib/http";

export const POST = handle(async (req: Request) => {
  const b = await req.json();
  const hash = crypto.createHash("sha256").update(String(b.token ?? "")).digest("hex");
  const r = await one<{ user_id: string }>("select user_id from password_resets where token_hash = $1 and used_at is null and expires_at > now()", [hash]);
  if (!r) throw new HttpError(400, "This reset link has expired or was already used. Ask for a new one.");
  await setPassword(r.user_id, String(b.password ?? ""));
  await q("update password_resets set used_at = now() where token_hash = $1", [hash]);
  return { ok: true };
});
