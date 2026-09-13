"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Library, ListMusic, Plus, Settings } from "lucide-react";

const items = [
  {
    href: "/",
    label: "ספרייה",
    icon: Library,
    match: (p: string) => p === "/" || p.startsWith("/episodes"),
  },
  {
    href: "/playlists",
    label: "מסלולים",
    icon: ListMusic,
    match: (p: string) => p.startsWith("/playlists"),
  },
  {
    href: "/new",
    label: "פרק חדש",
    icon: Plus,
    match: (p: string) => p.startsWith("/new"),
    primary: true,
  },
  {
    href: "/settings",
    label: "הגדרות",
    icon: Settings,
    match: (p: string) => p.startsWith("/settings"),
  },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="ניווט ראשי"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg-elevated/85 backdrop-blur-xl"
    >
      <ul className="mx-auto flex h-(--nav-h) max-w-6xl items-stretch justify-around px-2">
        {items.map(({ href, label, icon: Icon, match, primary }) => {
          const active = match(pathname);
          return (
            <li key={href} className="flex flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                aria-label={label}
                className={`group flex min-h-11 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                  active ? "text-accent" : "text-muted hover:text-text"
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${
                    primary
                      ? "bg-accent text-accent-ink shadow-float group-active:scale-95"
                      : active
                        ? "bg-accent-soft"
                        : ""
                  }`}
                >
                  <Icon
                    size={primary ? 20 : 22}
                    strokeWidth={primary ? 2.5 : 1.8}
                    aria-hidden
                  />
                </span>
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
