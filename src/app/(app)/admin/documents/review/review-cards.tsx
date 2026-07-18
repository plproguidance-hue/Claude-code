"use client";

import { useActionState } from "react";

import type { DocumentRow, DocumentVersionRow } from "@/lib/database.types";
import {
  decideDocument,
  decideQuarantine,
  type DocumentReviewActionState,
} from "./actions";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { formatDateUS } from "@/lib/format";

const initialState: DocumentReviewActionState = {};

const SCAN_LABEL: Record<string, { label: string; tone: "success" | "danger" | "warning" | "neutral" }> = {
  clean: { label: "Scan: clean", tone: "success" },
  infected: { label: "Scan: INFECTED", tone: "danger" },
  unavailable: { label: "Scan: unavailable", tone: "warning" },
  pending: { label: "Scan: pending", tone: "neutral" },
};

export function ReviewDocumentCard({
  document,
  organizationName,
  versions,
  mode,
  canAct,
}: {
  document: DocumentRow;
  organizationName: string;
  versions: DocumentVersionRow[];
  mode: "quarantine" | "review";
  canAct: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    mode === "quarantine" ? decideQuarantine : decideDocument,
    initialState,
  );
  const latest = versions[0];
  const scan = latest ? SCAN_LABEL[latest.scan_status] : undefined;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle>{document.title}</CardTitle>
          <p className="mt-1 text-sm text-ink-muted">
            {organizationName} ·{" "}
            <span className="capitalize">
              {document.category.replaceAll("_", " ")}
            </span>
            {" · uploaded "}
            <span className="tnum">{formatDateUS(document.created_at)}</span>
          </p>
          {latest && (
            <p className="mt-1 text-xs text-ink-muted tnum">
              {latest.file_name} · v{latest.version} ·{" "}
              {(latest.size_bytes / 1024).toFixed(0)} KB · sha256{" "}
              {latest.checksum_sha256.slice(0, 12)}…
            </p>
          )}
        </div>
        {scan && <Badge tone={scan.tone}>{scan.label}</Badge>}
      </div>

      {state.error && (
        <Alert tone="error" className="mt-3">
          {state.error}
        </Alert>
      )}
      {state.message && (
        <Alert tone="success" className="mt-3">
          {state.message}
        </Alert>
      )}

      {canAct && !state.message && (
        <form action={formAction} className="mt-4 space-y-3">
          <input type="hidden" name="documentId" value={document.id} />
          <div>
            <Label htmlFor={`note-${document.id}`}>
              Note {mode === "review" ? "(required when rejecting)" : "(optional)"}
            </Label>
            <Input id={`note-${document.id}`} name="note" maxLength={1000} />
          </div>
          <div className="flex gap-2">
            {mode === "quarantine" ? (
              <>
                <Button
                  type="submit"
                  name="decision"
                  value="release"
                  disabled={pending}
                >
                  Release to review
                </Button>
                <Button
                  type="submit"
                  name="decision"
                  value="reject"
                  variant="danger"
                  disabled={pending}
                >
                  Reject file
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="submit"
                  name="decision"
                  value="approved"
                  disabled={pending}
                >
                  Approve
                </Button>
                <Button
                  type="submit"
                  name="decision"
                  value="rejected"
                  variant="danger"
                  disabled={pending}
                >
                  Reject
                </Button>
              </>
            )}
          </div>
        </form>
      )}
    </Card>
  );
}
