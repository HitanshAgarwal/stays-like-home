"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";

export function Navbar() {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  // The explore page renders its own functional search, so hide the nav
  // placeholder there to avoid two search bars stacked on top of each other.
  const showSearch = pathname !== "/";
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // close the user menu on outside click / Escape
  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur shadow-[var(--shadow-nav)]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
        {/* logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2 text-accent" aria-label="Stays Like Home home">
          <LogoMark />
          <span className="hidden text-lg font-bold tracking-tight text-accent sm:block">
            stays<span className="text-ink">likehome</span>
          </span>
        </Link>

        {/* search placeholder — segmented on desktop, single pill on mobile.
            Hidden on the explore page, which renders its own functional search. */}
        {showSearch ? <SearchBar /> : <div className="flex-1" />}

        {/* right side */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Link
            href="/host/listings/new"
            className="hidden rounded-full px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-muted md:block"
          >
            Become a host
          </Link>

          <ThemeToggle />

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-full border border-line-strong py-1.5 pl-3 pr-1.5 transition-shadow hover:shadow-[var(--shadow-card)]"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Main menu"
            >
              <MenuIcon />
              <span className="grid h-7 w-7 place-items-center rounded-full bg-contrast text-xs font-semibold text-on-contrast">
                {user ? initials(user.name) : <UserIcon />}
              </span>
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-surface py-2 shadow-[var(--shadow-card)]"
              >
                {loading ? (
                  <div className="px-4 py-2 text-sm text-ink-faint">Loading…</div>
                ) : user ? (
                  <>
                    <div className="px-4 py-2">
                      <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
                      <p className="truncate text-xs text-ink-faint">{user.email}</p>
                    </div>
                    <MenuLink href="/trips" onClick={() => setMenuOpen(false)}>
                      My trips
                    </MenuLink>
                    <MenuLink href="/host" onClick={() => setMenuOpen(false)}>
                      Host dashboard
                    </MenuLink>
                    <div className="my-1 border-t border-line" />
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        logout();
                        setMenuOpen(false);
                      }}
                      className="block w-full px-4 py-2 text-left text-sm text-ink transition-colors hover:bg-muted"
                    >
                      Log out
                    </button>
                  </>
                ) : (
                  <>
                    <MenuLink href="/login" onClick={() => setMenuOpen(false)} bold>
                      Log in
                    </MenuLink>
                    <MenuLink href="/register" onClick={() => setMenuOpen(false)}>
                      Sign up
                    </MenuLink>
                    <div className="my-1 border-t border-line" />
                    <MenuLink href="/host/listings/new" onClick={() => setMenuOpen(false)}>
                      Become a host
                    </MenuLink>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      className="grid h-9 w-9 place-items-center rounded-full text-ink transition-colors hover:bg-muted"
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" strokeLinecap="round" />
    </svg>
  );
}

function SearchBar() {
  return (
    <Link
      href="/"
      className="group flex min-w-0 flex-1 items-center justify-between gap-2 rounded-full border border-line-strong bg-surface py-2 pl-5 pr-2 shadow-sm transition-shadow hover:shadow-[var(--shadow-card)] sm:max-w-md"
      aria-label="Start a search"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="truncate text-sm font-semibold text-ink">Anywhere</span>
        <span className="hidden h-5 w-px bg-line sm:block" />
        <span className="hidden truncate text-sm font-semibold text-ink sm:block">Any week</span>
        <span className="hidden h-5 w-px bg-line md:block" />
        <span className="hidden truncate text-sm text-ink-faint md:block">Add guests</span>
      </span>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-white">
        <SearchIcon />
      </span>
    </Link>
  );
}

function MenuLink({
  href,
  children,
  onClick,
  bold,
}: {
  href: string;
  children: React.ReactNode;
  onClick?: () => void;
  bold?: boolean;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onClick}
      className={`block px-4 py-2 text-sm text-ink transition-colors hover:bg-muted ${
        bold ? "font-semibold" : ""
      }`}
    >
      {children}
    </Link>
  );
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/* --- inline icons (no external deps) --- */

function LogoMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.25c-.62 0-1.16.36-1.6 1.02-.4.6-.85 1.5-1.4 2.6L4.3 15.1c-.5 1-.8 1.8-.86 2.5-.1 1.2.5 2.3 1.55 2.9.86.5 1.9.5 2.86.02.9-.44 1.83-1.3 2.9-2.55l.24-.28.24.28c1.07 1.25 2 2.1 2.9 2.55.96.48 2 .48 2.86-.02 1.05-.6 1.65-1.7 1.55-2.9-.06-.7-.36-1.5-.86-2.5L15.4 5.87c-.55-1.1-1-2-1.4-2.6-.44-.66-.98-1.02-1.6-1.02zm0 1.6c.1.03.28.2.55.6.35.53.77 1.37 1.32 2.47l4.68 9.24c.45.9.68 1.5.72 1.94.05.63-.25 1.16-.78 1.46-.44.26-.98.25-1.5-.01-.66-.33-1.48-1.08-2.48-2.25l-1.46-1.7a1 1 0 00-1.52 0l-1.46 1.7c-1 1.17-1.82 1.92-2.48 2.25-.52.26-1.06.27-1.5.01-.53-.3-.83-.83-.78-1.46.04-.44.27-1.04.72-1.94l4.68-9.24c.55-1.1.97-1.94 1.32-2.47.27-.4.45-.57.55-.6z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 12a4 4 0 100-8 4 4 0 000 8zm0 2c-3.3 0-8 1.7-8 5v1h16v-1c0-3.3-4.7-5-8-5z" />
    </svg>
  );
}
