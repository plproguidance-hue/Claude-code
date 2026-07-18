import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle } from "@/components/ui/card";
import { AnnouncementComposer } from "./composer";

export const metadata: Metadata = { title: "Notifications (admin)" };

export default async function AdminNotificationsPage() {
  const supabase = await createClient();
  const [{ data: canSend }, { data: organizations }] = await Promise.all([
    supabase.rpc("has_permission", { perm: "notifications.send" }),
    supabase.from("organizations").select("id, name").order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">
          Notification composer
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Send an in-app announcement to every active member of an
          organization. Event notifications (projects, documents, billing,
          tickets) are generated automatically.
        </p>
      </div>

      {canSend ? (
        <AnnouncementComposer organizations={organizations ?? []} />
      ) : (
        <Card className="border-warning/50 bg-warning/5">
          <CardTitle>Permission required</CardTitle>
          <p className="mt-2 text-sm text-ink">
            Sending announcements requires the{" "}
            <code className="text-xs">notifications.send</code> permission
            (administrators by default).
          </p>
        </Card>
      )}
    </div>
  );
}
