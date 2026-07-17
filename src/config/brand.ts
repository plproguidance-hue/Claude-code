/**
 * Authoritative ProGuidance brand & company configuration.
 *
 * Single typed source per MASTER BUILD PROMPT §2. Database-backed admin
 * overrides land with the `system_settings` admin UI in a later phase; until
 * then this module is the only place these values may live — never scatter
 * them through components or copy.
 */

export interface BrandAddress {
  readonly line1: string;
  readonly city: string;
  readonly state: string;
  readonly postalCode: string;
  readonly country: string;
}

export interface BrandLogo {
  /** Path served from /public for light backgrounds. */
  readonly light: string;
  /** Path served from /public for dark (charcoal/graphite) backgrounds. */
  readonly dark: string;
  /** Compact square mark for collapsed sidebar / favicon derivation. */
  readonly compact: string;
  readonly alt: string;
  /**
   * 'placeholder' until the owner supplies the official wordmark
   * (see src/assets/README.md). The official file must never be stretched,
   * recolored, redrawn, cropped, or replaced with generic text.
   */
  readonly status: "placeholder" | "official";
}

export interface BrandPalette {
  readonly primary: string;
  readonly primaryHover: string;
  readonly charcoal: string;
  readonly graphite: string;
  readonly pageBackground: string;
  readonly surface: string;
  readonly textPrimary: string;
  readonly textSecondary: string;
  readonly border: string;
  readonly success: string;
  readonly warning: string;
  readonly error: string;
  readonly info: string;
}

export interface BrandConfig {
  readonly legalName: string;
  readonly brandName: string;
  readonly tagline: string;
  readonly websiteUrl: string;
  /**
   * Intentionally spelled with a double "a" (`proguidaance`) per owner
   * instruction — do not "fix" without an explicit owner change request.
   */
  readonly publicEmail: string;
  readonly phone: string;
  readonly whatsapp: string;
  readonly address: BrandAddress;
  /** USA-only business market. */
  readonly market: "US";
  /** USD is the only ledger/invoice currency. */
  readonly currency: "USD";
  readonly invoicePrefix: string;
  readonly logo: BrandLogo;
  readonly palette: BrandPalette;
}

export const brand: BrandConfig = {
  legalName: "ProGuidance Tech Solution",
  brandName: "ProGuidance",
  tagline: "Launch. Scale. Succeed.",
  websiteUrl: "https://proguidancetechsolution.com/",
  publicEmail: "proguidaance@gmail.com",
  phone: "+880 1617 158 463",
  whatsapp: "+880 1617 158 463",
  address: {
    line1: "30 N Gould St Ste 48621",
    city: "Sheridan",
    state: "WY",
    postalCode: "82801",
    country: "USA",
  },
  market: "US",
  currency: "USD",
  invoicePrefix: "PG-INV-",
  logo: {
    light: "/brand/logo-placeholder.svg",
    dark: "/brand/logo-placeholder-dark.svg",
    compact: "/brand/mark-placeholder.svg",
    alt: "ProGuidance Tech Solution",
    status: "placeholder",
  },
  palette: {
    primary: "#FF4B00",
    primaryHover: "#E64200",
    charcoal: "#3F4A4D",
    graphite: "#273236",
    pageBackground: "#F6F7F9",
    surface: "#FFFFFF",
    textPrimary: "#172126",
    textSecondary: "#64748B",
    border: "#E2E8F0",
    success: "#16A34A",
    warning: "#F59E0B",
    error: "#DC2626",
    info: "#2563EB",
  },
} as const;
