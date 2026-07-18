"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Building2,
  ChevronDown,
  LogOut,
  Menu,
  UserCircle,
} from "lucide-react";
import Link from "next/link";

import type { ProfileRow } from "@/lib/database.types";
import type { ShellOrg } from "./app-shell";
import { RoleBadge } from "@/components/ui/badge";

export function Topbar({
  profile,
  organizations,
  unreadNotifications = 0,
  onMobileMenu,
}: {
  profile: ProfileRow;
  organizations: ShellOrg[];
  unreadNotifications?: number;
  onMobileMenu: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const displayName = profile.full_name ?? profile.email;
  const primaryOrg = organizations[0];

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur sm:px-6">
      <button
        type="button"
        onClick={onMobileMenu}
        aria-label="Open menu"
        className="flex h-11 w-11 items-center justify-center rounded-lg text-ink-muted hover:bg-page hover:text-ink lg:hidden"
      >
        <Menu aria-hidden className="h-5 w-5" />
      </button>

      {primaryOrg && (
        <div className="hidden items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-sm text-ink sm:flex">
          <Building2 aria-hidden className="h-4 w-4 text-ink-muted" />
          <span className="max-w-48 truncate">{primaryOrg.name}</span>
          {organizations.length > 1 && (
            <span className="text-xs text-ink-muted">
              +{organizations.length - 1} more
            </span>
          )}
        </div>
      )}

      <Link
        href="/notifications"
        aria-label={
          unreadNotifications > 0
            ? `Notifications, ${unreadNotifications} unread`
            : "Notifications"
        }
        className="relative ml-auto flex h-11 w-11 items-center justify-center rounded-lg text-ink-muted hover:bg-page hover:text-ink"
      >
        <Bell aria-hidden className="h-5 w-5" />
        {unreadNotifications > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white tnum">
            {unreadNotifications > 99 ? "99+" : unreadNotifications}
          </span>
        )}
      </Link>

      <div ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className="flex h-11 items-center gap-2 rounded-lg px-2 hover:bg-page"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-charcoal text-sm font-semibold text-white">
            {displayName.charAt(0).toUpperCase()}
          </span>
          <span className="hidden max-w-40 truncate text-sm font-medium text-ink sm:block">
            {displayName}
          </span>
          <ChevronDown aria-hidden className="h-4 w-4 text-ink-muted" />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-4 top-14 w-64 rounded-xl border border-line bg-surface p-2 shadow-lg"
          >
            <div className="border-b border-line px-3 pb-3 pt-2">
              <p className="truncate text-sm font-medium text-ink">
                {displayName}
              </p>
              <p className="truncate text-xs text-ink-muted">{profile.email}</p>
              <div className="mt-2">
                <RoleBadge role={profile.role} />
              </div>
            </div>
            <Link
              href="/settings/profile"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink hover:bg-page"
            >
              <UserCircle aria-hidden className="h-4 w-4 text-ink-muted" />
              Profile settings
            </Link>
            <form action="/auth/sign-out" method="post">
              <button
                type="submit"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-danger hover:bg-danger/5"
              >
                <LogOut aria-hidden className="h-4 w-4" />
                Sign out
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
