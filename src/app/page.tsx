import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { one } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const u = await currentUser();
  if (!u) redirect("/login");
  if (u.role === "instructor") redirect("/admin");
  const m = await one("select 1 from members where user_id = $1", [u.id]);
  redirect(m ? "/play" : "/join");
}
