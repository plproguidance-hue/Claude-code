import type { Metadata } from "next";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { AccountStatusBadge } from "@/components/ui/badge";
import { formatDateUS } from "@/lib/format";

export const metadata: Metadata = { title: "Clients" };

export default async function AdminClientsPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "client")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Clients</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Client accounts within your permission scope — administrators see
          all clients, managers and moderators see members of assigned
          organizations.
        </p>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[520px] text-left text-sm">
          <caption className="sr-only">Client directory</caption>
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
              <th scope="col" className="px-4 py-3 font-medium">Name</th>
              <th scope="col" className="px-4 py-3 font-medium">Email</th>
              <th scope="col" className="px-4 py-3 font-medium">Status</th>
              <th scope="col" className="px-4 py-3 font-medium">Joined</th>
              <th scope="col" className="px-4 py-3 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {(clients ?? []).map((client) => (
              <tr key={client.id} className="border-b border-line last:border-b-0">
                <td className="px-4 py-3 font-medium text-ink">
                  {client.full_name ?? "—"}
                </td>
                <td className="px-4 py-3 text-ink-muted">{client.email}</td>
                <td className="px-4 py-3">
                  <AccountStatusBadge status={client.status} />
                </td>
                <td className="px-4 py-3 text-ink-muted tnum">
                  {formatDateUS(client.created_at)}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/clients/${client.id}`}
                    className="text-sm font-medium text-primary hover:text-primary-hover"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {(!clients || clients.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-ink-muted">
                  No clients visible in your permission scope.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
