import {
  Activity,
  BadgeDollarSign,
  Building2,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  MessagesSquare,
  ShieldCheck,
  UserCircle,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Items for a later phase render as non-interactive "planned" rows. */
  plannedPhase?: number;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * Client navigation (spec §5, task-oriented groups). Only Phase 1 surfaces
 * are interactive; later modules are visibly planned, never fake links.
 */
export const CLIENT_NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Activity", href: "/activity", icon: Activity, plannedPhase: 2 },
    ],
  },
  {
    label: "My Business",
    items: [
      {
        label: "Companies",
        href: "/companies",
        icon: Building2,
        plannedPhase: 2,
      },
    ],
  },
  {
    label: "Services",
    items: [
      {
        label: "Catalogue",
        href: "/services",
        icon: BadgeDollarSign,
        plannedPhase: 3,
      },
    ],
  },
  {
    label: "Documents",
    items: [
      {
        label: "Document vault",
        href: "/documents",
        icon: FileText,
        plannedPhase: 4,
      },
    ],
  },
  {
    label: "Billing",
    items: [
      {
        label: "Invoices",
        href: "/invoices",
        icon: BadgeDollarSign,
        plannedPhase: 5,
      },
    ],
  },
  {
    label: "Communication",
    items: [
      {
        label: "Support",
        href: "/tickets",
        icon: MessagesSquare,
        plannedPhase: 6,
      },
      {
        label: "Help Center",
        href: "/help",
        icon: LifeBuoy,
        plannedPhase: 7,
      },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "Profile", href: "/settings/profile", icon: UserCircle },
    ],
  },
];

/** Staff navigation — appended for administrator/manager/moderator roles. */
export const STAFF_NAV: NavGroup = {
  label: "Operations",
  items: [
    { label: "Admin overview", href: "/admin", icon: ShieldCheck },
    { label: "Registrations", href: "/admin/registrations", icon: UserCog },
    { label: "Users", href: "/admin/users", icon: Users },
  ],
};
