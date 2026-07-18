"use client";

import { useActionState } from "react";

import {
  toggleArticlePublished,
  togglePerkPublished,
  type ContentActionState,
} from "./actions";
import { Button } from "@/components/ui/button";

const initialState: ContentActionState = {};

export function ContentToggles({
  kind,
  id,
  published,
}: {
  kind: "article" | "perk";
  id: string;
  published: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    kind === "article" ? toggleArticlePublished : togglePerkPublished,
    initialState,
  );

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input
        type="hidden"
        name={kind === "article" ? "articleId" : "perkId"}
        value={id}
      />
      <input type="hidden" name="publish" value={published ? "false" : "true"} />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {published ? "Unpublish" : "Publish"}
      </Button>
      {state.error && (
        <p role="alert" className="text-xs text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}
