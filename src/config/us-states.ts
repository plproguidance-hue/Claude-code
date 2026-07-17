/**
 * Canonical US states and territories source (spec §3: "Support US states and
 * territories through a canonical data source; never hardcode only a small
 * shortlist"). Every formation-state selector must consume this module.
 */

export interface UsJurisdiction {
  readonly code: string;
  readonly name: string;
  readonly kind: "state" | "district" | "territory";
}

export const US_JURISDICTIONS: readonly UsJurisdiction[] = [
  { code: "AL", name: "Alabama", kind: "state" },
  { code: "AK", name: "Alaska", kind: "state" },
  { code: "AZ", name: "Arizona", kind: "state" },
  { code: "AR", name: "Arkansas", kind: "state" },
  { code: "CA", name: "California", kind: "state" },
  { code: "CO", name: "Colorado", kind: "state" },
  { code: "CT", name: "Connecticut", kind: "state" },
  { code: "DE", name: "Delaware", kind: "state" },
  { code: "FL", name: "Florida", kind: "state" },
  { code: "GA", name: "Georgia", kind: "state" },
  { code: "HI", name: "Hawaii", kind: "state" },
  { code: "ID", name: "Idaho", kind: "state" },
  { code: "IL", name: "Illinois", kind: "state" },
  { code: "IN", name: "Indiana", kind: "state" },
  { code: "IA", name: "Iowa", kind: "state" },
  { code: "KS", name: "Kansas", kind: "state" },
  { code: "KY", name: "Kentucky", kind: "state" },
  { code: "LA", name: "Louisiana", kind: "state" },
  { code: "ME", name: "Maine", kind: "state" },
  { code: "MD", name: "Maryland", kind: "state" },
  { code: "MA", name: "Massachusetts", kind: "state" },
  { code: "MI", name: "Michigan", kind: "state" },
  { code: "MN", name: "Minnesota", kind: "state" },
  { code: "MS", name: "Mississippi", kind: "state" },
  { code: "MO", name: "Missouri", kind: "state" },
  { code: "MT", name: "Montana", kind: "state" },
  { code: "NE", name: "Nebraska", kind: "state" },
  { code: "NV", name: "Nevada", kind: "state" },
  { code: "NH", name: "New Hampshire", kind: "state" },
  { code: "NJ", name: "New Jersey", kind: "state" },
  { code: "NM", name: "New Mexico", kind: "state" },
  { code: "NY", name: "New York", kind: "state" },
  { code: "NC", name: "North Carolina", kind: "state" },
  { code: "ND", name: "North Dakota", kind: "state" },
  { code: "OH", name: "Ohio", kind: "state" },
  { code: "OK", name: "Oklahoma", kind: "state" },
  { code: "OR", name: "Oregon", kind: "state" },
  { code: "PA", name: "Pennsylvania", kind: "state" },
  { code: "RI", name: "Rhode Island", kind: "state" },
  { code: "SC", name: "South Carolina", kind: "state" },
  { code: "SD", name: "South Dakota", kind: "state" },
  { code: "TN", name: "Tennessee", kind: "state" },
  { code: "TX", name: "Texas", kind: "state" },
  { code: "UT", name: "Utah", kind: "state" },
  { code: "VT", name: "Vermont", kind: "state" },
  { code: "VA", name: "Virginia", kind: "state" },
  { code: "WA", name: "Washington", kind: "state" },
  { code: "WV", name: "West Virginia", kind: "state" },
  { code: "WI", name: "Wisconsin", kind: "state" },
  { code: "WY", name: "Wyoming", kind: "state" },
  { code: "DC", name: "District of Columbia", kind: "district" },
  { code: "AS", name: "American Samoa", kind: "territory" },
  { code: "GU", name: "Guam", kind: "territory" },
  { code: "MP", name: "Northern Mariana Islands", kind: "territory" },
  { code: "PR", name: "Puerto Rico", kind: "territory" },
  { code: "VI", name: "U.S. Virgin Islands", kind: "territory" },
] as const;

export const US_JURISDICTION_CODES = US_JURISDICTIONS.map(
  (jurisdiction) => jurisdiction.code,
);

export function isUsJurisdiction(code: string): boolean {
  return US_JURISDICTION_CODES.includes(code.toUpperCase());
}

export function jurisdictionName(code: string): string {
  return (
    US_JURISDICTIONS.find(
      (jurisdiction) => jurisdiction.code === code.toUpperCase(),
    )?.name ?? code
  );
}
