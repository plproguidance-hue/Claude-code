import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BellOff } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import type { NotificationRow } from "@/lib/database.types";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { markAllNotificationsRead, markNotificationRead } from "./actions";

export const metadata: Metadata = { title: "Notifications" };

function NotificationItem({ notification }: { notification: NotificationRow }) {
  const time = new Date(notification.created_at).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return (
    <li
      className={`flex flex-wrap items-start justify-between gap-3 px-5 py-4 ${
        notification.read_at ? "" : "bg-primary/5"
      }`}
    >
      <div className="min-w-0">
        <p className="font-medium text-ink">
          {notification.title}
          {!notification.read_at && (
            <Badge tone="brand" className="ml-2">
              New
            </Badge>
          )}
        </p>
        {notification.body && (
          <p className="mt-0.5 text-sm text-ink-muted">{notification.body}</p>
        )}
        <p className="mt-1 text-xs text-ink-muted tnum">
          {time} ·{" "}
          <span className="capitalize">
            {notification.type.replaceAll("_", " ")}
          </span>
        </p>
      </div>
      <div className="flex items-center gap-3">
        {notification.link && (
          <Link
            href={notification.link}
            className="text-sm font-medium text-primary hover:text-primary-hover"
          >
            Open
          </Link>
        )}
        {!notification.read_at && (
          <form action={markNotificationRead}>
            <input
              type="hidden"
              name="notificationId"
              value={notification.id}
            />
            <button
              type="submit"
              className="text-sm text-ink-muted hover:text-ink"
            >
              Mark read
            </button>
          </form>
        )}
      </div>
    </li>
  );
}

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const today = (notifications ?? []).filter(
    (n) => new Date(n.created_at) >= startOfDay,
  );
  const earlier = (notifications ?? []).filter(
    (n) => new Date(n.created_at) < startOfDay,
  );
  const unread = (notifications ?? []).filter((n) => !n.read_at).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Notifications</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {unread > 0 ? `${unread} unread` : "You're all caught up."}
          </p>
        </div>
        {unread > 0 && (
          <form action={markAllNotificationsRead}>
            <button
              type="submit"
              className="rounded-lg border border-line px-3 py-2 text-sm font-medium text-ink hover:border-charcoal"
            >
              Mark all read
            </button>
          </form>
        )}
      </div>

      {(notifications ?? []).length === 0 ? (
        <Card className="py-10 text-center">
          <BellOff aria-hidden className="mx-auto h-10 w-10 text-ink-muted" />
          <CardTitle className="mt-4">No notifications</CardTitle>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
            Project updates, document reviews, invoices, and replies appear
            here as they happen.
          </p>
        </Card>
      ) : (
        <>
          {today.length > 0 && (
            <section aria-labelledby="today-heading">
              <h2
                id="today-heading"
                className="mb-2 text-base font-semibold text-ink"
              >
                Today
              </h2>
              <Card className="p-0">
                <ul className="divide-y divide-line">
                  {today.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                    />
                  ))}
                </ul>
              </Card>
            </section>
          )}
          {earlier.length > 0 && (
            <section aria-labelledby="earlier-heading">
              <h2
                id="earlier-heading"
                className="mb-2 text-base font-semibold text-ink"
              >
                Earlier
              </h2>
              <Card className="p-0">
                <ul className="divide-y divide-line">
                  {earlier.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                    />
                  ))}
                </ul>
              </Card>
            </section>
          )}
        </>
      )}
    </div>
  );
}
