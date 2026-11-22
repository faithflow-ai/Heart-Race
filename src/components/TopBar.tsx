"use client";
import { usePathname } from "next/navigation";
import { api } from "./client";

export function TopBar({ links, who }: { links: { href: string; label: string; exact?: boolean }[]; who: string }) {
  const path = usePathname();
  return (
    <div className="topbar">
      <a className="brand" href="/">
        Heart <span>Race</span>
      </a>
      <nav>
        {links.map((l) => (
          <a key={l.href} href={l.href} className={(l.exact ? path === l.href : path.startsWith(l.href)) ? "active" : ""}>
            {l.label}
          </a>
        ))}
      </nav>
      <div className="who">
        <span>{who}</span>
        <button
          onClick={async () => {
            await api("/api/auth/logout", { body: {} });
            window.location.href = "/login";
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
