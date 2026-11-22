import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { TopBar } from "@/components/TopBar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const u = await currentUser();
  if (!u) redirect("/login");
  if (u.role !== "instructor") redirect("/play");
  return (
    <>
      <TopBar who={`${u.name} · Instructor`} links={[{ href: "/admin", label: "Classes", exact: true }]} />
      <div className="page">{children}</div>
    </>
  );
}
