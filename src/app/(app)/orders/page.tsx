import type { Metadata } from "next";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { ProjectStatusBadge } from "@/components/ui/badge";
import { formatDateUS } from "@/lib/format";

export const metadata: Metadata = { title: "Order history" };

export default async function OrdersPage() {
  const supabase = await createClient();

  const [{ data: projects }, { data: services }] = await Promise.all([
    supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.from("services").select("id, name"),
  ]);

  const serviceName = new Map(
    (services ?? []).map((service) => [service.id, service.name]),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Order history</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Every order across your organizations, including completed and
          cancelled work.
        </p>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[560px] text-left text-sm">
          <caption className="sr-only">Order history</caption>
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
              <th scope="col" className="px-4 py-3 font-medium">Order</th>
              <th scope="col" className="px-4 py-3 font-medium">Service</th>
              <th scope="col" className="px-4 py-3 font-medium">Status</th>
              <th scope="col" className="px-4 py-3 font-medium">Placed</th>
            </tr>
          </thead>
          <tbody>
            {(projects ?? []).map((project) => (
              <tr
                key={project.id}
                className="border-b border-line last:border-b-0"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/projects/${project.id}`}
                    className="font-medium text-primary hover:text-primary-hover tnum"
                  >
                    {project.order_number}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink">
                  {serviceName.get(project.service_id) ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <ProjectStatusBadge status={project.status} />
                </td>
                <td className="px-4 py-3 text-ink-muted tnum">
                  {formatDateUS(project.created_at)}
                </td>
              </tr>
            ))}
            {(!projects || projects.length === 0) && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-ink-muted">
                  No orders yet — start from the service catalogue.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
