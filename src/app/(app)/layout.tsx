import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { AppShell, type ShellOrg } from "@/components/shell/app-shell";

/**
 * Protected shell: requires a session AND an active (approved) account.
 * These gates are convenience routing — Row Level Security enforces the same
 * lifecycle rules on every query regardless.
 */
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect("/pending-approval");
  if (profile.status !== "active") redirect("/pending-approval");

  const { data: organizations } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .order("name");

  return (
    <AppShell
      profile={profile}
      organizations={(organizations ?? []) as ShellOrg[]}
    >
      {children}
    </AppShell>
  );
}
