"use client";
import { usePathname } from "next/navigation";
import { api } from "./client";
import { Logo } from "./Logo";

export type NavLink = { href: string; label: string; exact?: boolean; badge?: string; highlight?: boolean; hint?: string };

export function TopBar({ links, more, who, home = "/" }: { links: NavLink[]; more?: NavLink[]; who: string; home?: string }) {
  const path = usePathname();
  const on = (l: NavLink) => (l.exact ? path === l.href : path.startsWith(l.href));
  return (
    <header className="topbar">
      <a className="brand" href={home} aria-label="Heart Race home">
        <Logo />
        <span className="tagline">A Vibe Electronics simulation</span>
      </a>
      <nav aria-label="Main">
        {links.map((l) => (
          <a key={l.href} href={l.href} className={`${on(l) ? "active" : ""} ${l.highlight ? "highlight" : ""}`} aria-current={on(l) ? "page" : undefined}>
            {l.label}
            {l.badge && <span className="navbadge">{l.badge}</span>}
          </a>
        ))}
        {more && more.length > 0 && (
          <details className={`more ${more.some(on) ? "active" : ""}`}>
            <summary>More</summary>
            <div className="menu">
              {more.map((l) => (
                <a key={l.href} href={l.href} className={on(l) ? "active" : ""}>
                  <span>{l.label}</span>
                  {l.hint && <small>{l.hint}</small>}
                </a>
              ))}
            </div>
          </details>
        )}
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
    </header>
  );
}
