import { login, startSession } from "@/lib/auth";
import { handle } from "@/lib/http";

export const POST = handle(async (req: Request) => {
  const b = await req.json();
  const u = await login(String(b.email ?? ""), String(b.password ?? ""));
  await startSession(u);
  return { user: u };
});
