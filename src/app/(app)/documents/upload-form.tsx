"use client";

import { useActionState } from "react";

import { uploadDocument, type DocumentActionState } from "./actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

const initialState: DocumentActionState = {};

const selectClasses =
  "h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";

export function UploadForm({
  organizations,
  projects,
}: {
  organizations: { id: string; name: string }[];
  projects: { id: string; label: string; organizationId: string }[];
}) {
  const [state, formAction, pending] = useActionState(
    uploadDocument,
    initialState,
  );

  return (
    <Card>
      <CardTitle>Upload a document</CardTitle>
      <p className="mt-1 text-sm text-ink-muted">
        PDF, PNG, JPEG, WebP, DOCX, or XLSX up to 25 MB. Files are stored
        privately, virus-scanned, and reviewed by our team before approval —
        unscanned files never leave quarantine.
      </p>

      <form action={formAction} className="mt-4 space-y-4" noValidate>
        {state.error && <Alert tone="error">{state.error}</Alert>}
        {state.message && <Alert tone="success">{state.message}</Alert>}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="doc-title">Title</Label>
            <Input
              id="doc-title"
              name="title"
              required
              maxLength={200}
              placeholder="e.g. Certificate of Formation"
            />
          </div>
          <div>
            <Label htmlFor="doc-category">Category</Label>
            <select
              id="doc-category"
              name="category"
              defaultValue="other"
              className={selectClasses}
            >
              <option value="formation">Formation</option>
              <option value="identity">Identity</option>
              <option value="tax">Tax</option>
              <option value="banking">Banking</option>
              <option value="marketplace">Marketplace</option>
              <option value="approval_letter">Approval letter</option>
              <option value="certificate">Certificate</option>
              <option value="other">Other</option>
            </select>
          </div>
          {organizations.length === 1 ? (
            <input
              type="hidden"
              name="organizationId"
              value={organizations[0]?.id}
            />
          ) : (
            <div>
              <Label htmlFor="doc-org">Organization</Label>
              <select
                id="doc-org"
                name="organizationId"
                required
                className={selectClasses}
              >
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <Label htmlFor="doc-project">Related project (optional)</Label>
            <select
              id="doc-project"
              name="projectId"
              defaultValue=""
              className={selectClasses}
            >
              <option value="">Not linked to a project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <Label htmlFor="doc-file">File</Label>
          <input
            id="doc-file"
            name="file"
            type="file"
            required
            accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx"
            className="block w-full rounded-lg border border-line bg-surface text-sm text-ink file:mr-3 file:h-11 file:cursor-pointer file:border-0 file:bg-charcoal file:px-4 file:text-sm file:font-medium file:text-white"
          />
        </div>

        <Button type="submit" disabled={pending}>
          {pending ? "Uploading…" : "Upload document"}
        </Button>
      </form>
    </Card>
  );
}
