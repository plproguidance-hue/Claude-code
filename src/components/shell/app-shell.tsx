"use client";

import { useState } from "react";

import type { ProfileRow } from "@/lib/database.types";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export interface ShellOrg {
  id: string;
  name: string;
  slug: string;
}

export function AppShell({
  profile,
  organizations,
  children,
}: {
  profile: ProfileRow;
  organizations: ShellOrg[];
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-dvh">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Skip to content
      </a>

      <Sidebar
        profile={profile}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          profile={profile}
          organizations={organizations}
          onMobileMenu={() => setMobileOpen(true)}
        />
        <main
          id="main-content"
          className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
