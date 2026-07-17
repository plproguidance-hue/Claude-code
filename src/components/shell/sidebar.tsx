"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

import { brand } from "@/config/brand";
import { CLIENT_NAV, STAFF_NAV, type NavGroup } from "@/config/navigation";
import { isStaffRole } from "@/lib/auth/permissions";
import type { ProfileRow } from "@/lib/database.types";
import { cn } from "@/lib/utils";

function NavGroupSection({
  group,
  pathname,
  onNavigate,
}: {
  group: NavGroup;
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <div>
      <p className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-white/40">
        {group.label}
      </p>
      <ul className="space-y-0.5">
        {group.items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
          const Icon = item.icon;

          if (item.plannedPhase) {
            return (
              <li key={item.href}>
                <span
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/35"
                  aria-disabled="true"
                >
                  <Icon aria-hidden className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                  <span className="ml-auto rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/50">
                    Planned
                  </span>
                </span>
              </li>
            );
          }

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                  "motion-safe:transition-colors motion-safe:duration-150",
                  active
                    ? "bg-primary text-white"
                    : "text-white/75 hover:bg-white/10 hover:text-white",
                )}
              >
                <Icon aria-hidden className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function Sidebar({
  profile,
  mobileOpen,
  onMobileClose,
}: {
  profile: ProfileRow;
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const pathname = usePathname();
  const groups = isStaffRole(profile.role)
    ? [...CLIENT_NAV, STAFF_NAV]
    : CLIENT_NAV;

  const nav = (
    <nav aria-label="Primary" className="flex-1 overflow-y-auto px-3 pb-6">
      {groups.map((group) => (
        <NavGroupSection
          key={group.label}
          group={group}
          pathname={pathname}
          onNavigate={onMobileClose}
        />
      ))}
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar (272px, spec §4) */}
      <aside className="sticky top-0 hidden h-dvh w-[272px] shrink-0 flex-col bg-graphite lg:flex">
        <div className="flex h-16 items-center px-5">
          <Link href="/dashboard" aria-label={`${brand.brandName} dashboard`}>
            <Image
              src={brand.logo.dark}
              alt={brand.logo.alt}
              width={176}
              height={38}
              priority
            />
          </Link>
        </div>
        {nav}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal>
          <button
            type="button"
            aria-label="Close menu"
            onClick={onMobileClose}
            className="absolute inset-0 bg-graphite/60"
          />
          <aside className="absolute inset-y-0 left-0 flex w-[85%] max-w-[320px] flex-col bg-graphite shadow-2xl">
            <div className="flex h-16 items-center justify-between px-5">
              <Image
                src={brand.logo.dark}
                alt={brand.logo.alt}
                width={160}
                height={35}
              />
              <button
                type="button"
                onClick={onMobileClose}
                aria-label="Close menu"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
              >
                <X aria-hidden className="h-5 w-5" />
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}
    </>
  );
}
