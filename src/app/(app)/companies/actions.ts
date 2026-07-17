"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { US_JURISDICTION_CODES } from "@/config/us-states";
import type { EntityType } from "@/lib/database.types";

export type CompanyActionState = { error?: string; message?: string };

const ENTITY_TYPES: readonly EntityType[] = [
  "llc",
  "c_corp",
  "s_corp",
  "nonprofit",
  "partnership",
  "sole_prop",
];

const einSchema = z
  .string()
  .trim()
  .regex(/^\d{2}-\d{7}$/, "EIN must use the 12-3456789 format.");

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/** Loads a draft the caller can actually edit (RLS re-checks everything). */
async function requireDraft(
  supabase: Awaited<ReturnType<typeof createClient>>,
  draftId: string,
) {
  const { data: draft } = await supabase
    .from("companies")
    .select("*")
    .eq("id", draftId)
    .eq("status", "draft")
    .maybeSingle();
  if (!draft) redirect("/companies");
  return draft;
}

export async function startCompany(
  _prev: CompanyActionState,
  formData: FormData,
): Promise<CompanyActionState> {
  const parsed = z
    .object({
      mode: z.enum(["formation", "transfer"]),
      organizationId: z.string().uuid(),
    })
    .safeParse({
      mode: formData.get("mode"),
      organizationId: formData.get("organizationId"),
    });
  if (!parsed.success) return { error: "Choose an organization to continue." };

  const { supabase, user } = await requireUser();
  const { data: created, error } = await supabase
    .from("companies")
    .insert({
      organization_id: parsed.data.organizationId,
      legal_name:
        parsed.data.mode === "formation"
          ? "New company (name pending)"
          : "Existing company (name pending)",
      onboarding_mode: parsed.data.mode,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !created) {
    return {
      error:
        "Could not start the company draft. Check that your account belongs to this organization.",
    };
  }
  redirect(`/companies/new?draft=${created.id}&step=1`);
}

export async function saveBasics(
  _prev: CompanyActionState,
  formData: FormData,
): Promise<CompanyActionState> {
  const parsed = z
    .object({
      draftId: z.string().uuid(),
      entityType: z.enum(ENTITY_TYPES as [EntityType, ...EntityType[]]),
      formationState: z
        .string()
        .trim()
        .toUpperCase()
        .refine((value) => US_JURISDICTION_CODES.includes(value), {
          message: "Choose a US state or territory.",
        }),
      formationDate: z
        .string()
        .optional()
        .transform((value) => (value ? value : null)),
    })
    .safeParse({
      draftId: formData.get("draftId"),
      entityType: formData.get("entityType"),
      formationState: formData.get("formationState"),
      formationDate: formData.get("formationDate") ?? undefined,
    });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the details." };
  }

  const { supabase } = await requireUser();
  const draft = await requireDraft(supabase, parsed.data.draftId);

  const { error } = await supabase
    .from("companies")
    .update({
      entity_type: parsed.data.entityType,
      formation_state: parsed.data.formationState,
      formation_date: parsed.data.formationDate,
      wizard_step: Math.max(draft.wizard_step, 2),
    })
    .eq("id", draft.id);
  if (error) return { error: "Could not save this step. Try again." };

  redirect(`/companies/new?draft=${draft.id}&step=2`);
}

export async function saveNamePurpose(
  _prev: CompanyActionState,
  formData: FormData,
): Promise<CompanyActionState> {
  const parsed = z
    .object({
      draftId: z.string().uuid(),
      legalName: z
        .string()
        .trim()
        .min(2, "Enter the company legal name.")
        .max(200),
      dba: z
        .string()
        .trim()
        .max(200)
        .optional()
        .transform((value) => (value ? value : null)),
      businessPurpose: z
        .string()
        .trim()
        .min(10, "Describe the business activity (at least 10 characters).")
        .max(2000),
    })
    .safeParse({
      draftId: formData.get("draftId"),
      legalName: formData.get("legalName"),
      dba: formData.get("dba") ?? undefined,
      businessPurpose: formData.get("businessPurpose"),
    });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the details." };
  }

  const { supabase } = await requireUser();
  const draft = await requireDraft(supabase, parsed.data.draftId);

  const { error } = await supabase
    .from("companies")
    .update({
      legal_name: parsed.data.legalName,
      dba: parsed.data.dba,
      business_purpose: parsed.data.businessPurpose,
      wizard_step: Math.max(draft.wizard_step, 3),
    })
    .eq("id", draft.id);
  if (error) return { error: "Could not save this step. Try again." };

  redirect(`/companies/new?draft=${draft.id}&step=3`);
}

export async function addOwner(
  _prev: CompanyActionState,
  formData: FormData,
): Promise<CompanyActionState> {
  const parsed = z
    .object({
      draftId: z.string().uuid(),
      fullName: z.string().trim().min(2, "Enter the owner's name.").max(120),
      roleTitle: z
        .string()
        .trim()
        .max(120)
        .optional()
        .transform((value) => (value ? value : null)),
      ownershipPercent: z
        .string()
        .optional()
        .transform((value) => (value ? Number(value) : null))
        .refine(
          (value) => value === null || (value >= 0 && value <= 100),
          "Ownership must be between 0 and 100.",
        ),
      country: z
        .string()
        .trim()
        .max(60)
        .optional()
        .transform((value) => (value ? value : null)),
    })
    .safeParse({
      draftId: formData.get("draftId"),
      fullName: formData.get("fullName"),
      roleTitle: formData.get("roleTitle") ?? undefined,
      ownershipPercent: formData.get("ownershipPercent") ?? undefined,
      country: formData.get("country") ?? undefined,
    });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the details." };
  }

  const { supabase } = await requireUser();
  const draft = await requireDraft(supabase, parsed.data.draftId);

  const { error } = await supabase.from("company_owners_members").insert({
    company_id: draft.id,
    full_name: parsed.data.fullName,
    role_title: parsed.data.roleTitle,
    ownership_percent: parsed.data.ownershipPercent,
    country: parsed.data.country,
  });
  if (error) return { error: "Could not add the owner. Try again." };

  revalidatePath("/companies/new");
  return { message: "Owner added." };
}

export async function removeOwner(formData: FormData): Promise<void> {
  const draftId = z.string().uuid().safeParse(formData.get("draftId"));
  const ownerId = z.string().uuid().safeParse(formData.get("ownerId"));
  if (!draftId.success || !ownerId.success) return;

  const { supabase } = await requireUser();
  await supabase
    .from("company_owners_members")
    .delete()
    .eq("id", ownerId.data)
    .eq("company_id", draftId.data);
  revalidatePath("/companies/new");
}

export async function continueToAddresses(formData: FormData): Promise<void> {
  const draftId = z.string().uuid().safeParse(formData.get("draftId"));
  if (!draftId.success) redirect("/companies");
  const { supabase } = await requireUser();
  const draft = await requireDraft(supabase, draftId.data);
  await supabase
    .from("companies")
    .update({ wizard_step: Math.max(draft.wizard_step, 4) })
    .eq("id", draft.id);
  redirect(`/companies/new?draft=${draft.id}&step=4`);
}

export async function saveAddresses(
  _prev: CompanyActionState,
  formData: FormData,
): Promise<CompanyActionState> {
  const usAddress = z.object({
    line1: z.string().trim().min(3, "Enter the street address."),
    line2: z
      .string()
      .trim()
      .optional()
      .transform((value) => (value ? value : null)),
    city: z.string().trim().min(2, "Enter the city."),
    state: z
      .string()
      .trim()
      .toUpperCase()
      .refine((value) => US_JURISDICTION_CODES.includes(value), {
        message: "US state or territory required.",
      }),
    postalCode: z.string().trim().min(3, "Enter the ZIP code."),
  });

  const parsed = z
    .object({
      draftId: z.string().uuid(),
      business: usAddress,
      registeredAgentName: z
        .string()
        .trim()
        .min(2, "Enter the registered agent name.")
        .max(200),
      registered: usAddress,
    })
    .safeParse({
      draftId: formData.get("draftId"),
      business: {
        line1: formData.get("businessLine1"),
        line2: formData.get("businessLine2") ?? undefined,
        city: formData.get("businessCity"),
        state: formData.get("businessState"),
        postalCode: formData.get("businessPostalCode"),
      },
      registeredAgentName: formData.get("registeredAgentName"),
      registered: {
        line1: formData.get("registeredLine1"),
        line2: formData.get("registeredLine2") ?? undefined,
        city: formData.get("registeredCity"),
        state: formData.get("registeredState"),
        postalCode: formData.get("registeredPostalCode"),
      },
    });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the addresses." };
  }

  const { supabase } = await requireUser();
  const draft = await requireDraft(supabase, parsed.data.draftId);

  for (const [kind, address] of [
    ["business", parsed.data.business],
    ["registered", parsed.data.registered],
  ] as const) {
    await supabase
      .from("company_addresses")
      .delete()
      .eq("company_id", draft.id)
      .eq("kind", kind);
    const { error } = await supabase.from("company_addresses").insert({
      company_id: draft.id,
      kind,
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      state: address.state,
      postal_code: address.postalCode,
    });
    if (error) return { error: "Could not save the addresses. Try again." };
  }

  const { error } = await supabase
    .from("companies")
    .update({
      registered_agent_name: parsed.data.registeredAgentName,
      wizard_step: Math.max(draft.wizard_step, 5),
    })
    .eq("id", draft.id);
  if (error) return { error: "Could not save this step. Try again." };

  redirect(`/companies/new?draft=${draft.id}&step=5`);
}

export async function saveTax(
  _prev: CompanyActionState,
  formData: FormData,
): Promise<CompanyActionState> {
  const parsed = z
    .object({
      draftId: z.string().uuid(),
      ein: z
        .string()
        .trim()
        .optional()
        .transform((value) => (value ? value : null))
        .refine(
          (value) => value === null || einSchema.safeParse(value).success,
          "EIN must use the 12-3456789 format.",
        ),
    })
    .safeParse({
      draftId: formData.get("draftId"),
      ein: formData.get("ein") ?? undefined,
    });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the details." };
  }

  const { supabase } = await requireUser();
  const draft = await requireDraft(supabase, parsed.data.draftId);

  const { error } = await supabase
    .from("companies")
    .update({
      ein: parsed.data.ein,
      wizard_step: Math.max(draft.wizard_step, 6),
    })
    .eq("id", draft.id);
  if (error) return { error: "Could not save this step. Try again." };

  redirect(`/companies/new?draft=${draft.id}&step=6`);
}

export async function submitCompany(
  _prev: CompanyActionState,
  formData: FormData,
): Promise<CompanyActionState> {
  const parsedId = z.string().uuid().safeParse(formData.get("draftId"));
  if (!parsedId.success) return { error: "Invalid submission." };
  if (formData.get("consent") !== "on") {
    return { error: "Confirm the review consent to submit." };
  }

  const { supabase } = await requireUser();
  const draft = await requireDraft(supabase, parsedId.data);

  if (
    !draft.entity_type ||
    !draft.formation_state ||
    !draft.business_purpose ||
    draft.legal_name.includes("(name pending)")
  ) {
    return {
      error:
        "The draft is incomplete — finish the earlier steps before submitting.",
    };
  }

  // draft → pending_review is the one transition clients may make;
  // the database trigger enforces exactly that.
  const { error } = await supabase
    .from("companies")
    .update({ status: "pending_review" })
    .eq("id", draft.id);
  if (error) return { error: "Submission failed. Try again." };

  revalidatePath("/companies");
  redirect(`/companies/${draft.id}?submitted=1`);
}

export async function deleteDraft(formData: FormData): Promise<void> {
  const parsedId = z.string().uuid().safeParse(formData.get("draftId"));
  if (!parsedId.success) return;
  const { supabase } = await requireUser();
  await supabase
    .from("companies")
    .delete()
    .eq("id", parsedId.data)
    .eq("status", "draft");
  revalidatePath("/companies");
  redirect("/companies");
}

const UPDATABLE_FIELDS = [
  "legal_name",
  "dba",
  "business_purpose",
  "ein",
  "formation_state",
  "formation_date",
  "registered_agent_name",
] as const;

export async function requestCompanyUpdate(
  _prev: CompanyActionState,
  formData: FormData,
): Promise<CompanyActionState> {
  const parsedId = z.string().uuid().safeParse(formData.get("companyId"));
  if (!parsedId.success) return { error: "Invalid request." };

  const changes: Record<string, string> = {};
  for (const field of UPDATABLE_FIELDS) {
    const value = formData.get(field);
    if (typeof value === "string" && value.trim().length > 0) {
      changes[field] = value.trim();
    }
  }
  if (Object.keys(changes).length === 0) {
    return { error: "Enter at least one field to change." };
  }
  if (changes.ein && !einSchema.safeParse(changes.ein).success) {
    return { error: "EIN must use the 12-3456789 format." };
  }

  const evidence = formData.get("evidenceNote");

  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("company_update_requests").insert({
    company_id: parsedId.data,
    requested_by: user.id,
    changes,
    evidence_note:
      typeof evidence === "string" && evidence.trim()
        ? evidence.trim()
        : null,
  });
  if (error) {
    return {
      error:
        "Could not file the update request. Draft companies are edited directly in the wizard.",
    };
  }

  revalidatePath(`/companies/${parsedId.data}`);
  return {
    message:
      "Update request filed. Our team reviews it and applies approved changes.",
  };
}

export type RevealEinState = { error?: string; ein?: string };

/**
 * Sensitive-value reveal requires re-authentication with the current
 * password (spec §6.2). The value is returned once and never cached.
 */
export async function revealEin(
  _prev: RevealEinState,
  formData: FormData,
): Promise<RevealEinState> {
  const parsed = z
    .object({
      companyId: z.string().uuid(),
      password: z.string().min(1, "Enter your password."),
    })
    .safeParse({
      companyId: formData.get("companyId"),
      password: formData.get("password"),
    });
  if (!parsed.success) return { error: "Enter your password to reveal." };

  const { supabase, user } = await requireUser();
  if (!user.email) return { error: "Reauthentication unavailable." };

  const { error: authError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.password,
  });
  if (authError) return { error: "Password check failed. Try again." };

  const { data: company } = await supabase
    .from("companies")
    .select("ein")
    .eq("id", parsed.data.companyId)
    .maybeSingle();
  if (!company?.ein) return { error: "No EIN is on file for this company." };

  return { ein: company.ein };
}
