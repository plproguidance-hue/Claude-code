import { redirect } from "next/navigation";
import { ShieldOff } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { isStaffRole } from "@/lib/auth/permissions";
import { Card, CardTitle } from "@/components/ui/card";

/**
 * Staff gate for /admin. This is presentation-level control only — every
 * admin query and mutation is independently enforced by RLS policies and
 * SECURITY DEFINER permission checks in the database.
 */
export default async function AdminLayout({
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

  if (!profile || profile.status !== "active" || !isStaffRole(profile.role)) {
    return (
      <Card className="mx-auto mt-10 max-w-md text-center">
        <ShieldOff aria-hidden className="mx-auto h-10 w-10 text-ink-muted" />
        <CardTitle className="mt-4">No access to operations</CardTitle>
        <p className="mt-2 text-sm text-ink-muted">
          The operations console is limited to ProGuidance staff. If you think
          you should have access, contact an administrator.
        </p>
      </Card>
    );
  }

  return <>{children}</>;
}
