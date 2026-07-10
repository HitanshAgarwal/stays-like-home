"use client";

// Navbar: the persistent top header. Shows the logo, a search placeholder (hidden on the
// explore page, which has its own search), a "Become a host" link, the theme toggle, and a
// user menu with auth-aware links (trips/host dashboard/log out, or log in/sign up).
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";

// Renders the header bar and the outside-click/Escape-dismissable user menu.
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

// Button that toggles between light and dark theme via the theme context.
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

// Inline moon icon (shown in light mode to switch to dark).
function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

// Inline sun icon (shown in dark mode to switch to light).
function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" strokeLinecap="round" />
    </svg>
  );
}

// Non-functional search-bar placeholder that links to the explore page to start a search.
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

// Styled link used as an item inside the user dropdown menu.
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

// Derive up-to-two-letter initials from a name for the user avatar.
function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/* --- inline icons (no external deps) --- */

// Inline brand logo mark — the house-with-curved-roof used as the favicon, so the
// header and browser tab share one identity: coral tile with a white arched-roof house.
function LogoMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="var(--color-accent)" />
      <path
        d="M6 17c0-5 4.5-9 10-9s10 4 10 9"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M9 16.5V24a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7.5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 25v-4.5a2 2 0 0 1 4 0V25"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Inline magnifying-glass icon for the search placeholder.
function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}

// Inline hamburger icon for the user menu trigger.
function MenuIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
    </svg>
  );
}

// Inline user silhouette shown in the avatar when signed out.
function UserIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 12a4 4 0 100-8 4 4 0 000 8zm0 2c-3.3 0-8 1.7-8 5v1h16v-1c0-3.3-4.7-5-8-5z" />
    </svg>
  );
}
