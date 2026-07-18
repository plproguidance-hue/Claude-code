import {
  Activity,
  BadgeDollarSign,
  Building2,
  CalendarClock,
  ClipboardList,
  FileText,
  FolderKanban,
  Gift,
  History,
  Layers,
  Megaphone,
  LayoutDashboard,
  LifeBuoy,
  Lock,
  MessagesSquare,
  ShieldCheck,
  UserCircle,
  UserCog,
  Users,
  Wallet as WalletIcon,
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
      { label: "Companies", href: "/companies", icon: Building2 },
      {
        label: "Compliance",
        href: "/compliance",
        icon: CalendarClock,
      },
    ],
  },
  {
    label: "Services",
    items: [
      { label: "Catalogue", href: "/services", icon: BadgeDollarSign },
      { label: "Plans", href: "/plans", icon: Layers },
      { label: "Projects", href: "/projects", icon: FolderKanban },
      { label: "Orders", href: "/orders", icon: History },
      { label: "Data requests", href: "/requests", icon: ClipboardList },
    ],
  },
  {
    label: "Documents",
    items: [
      { label: "Document vault", href: "/documents", icon: FileText },
    ],
  },
  {
    label: "Billing",
    items: [
      { label: "Quotations", href: "/quotations", icon: FileText },
      { label: "Invoices", href: "/invoices", icon: BadgeDollarSign },
      { label: "Payments", href: "/payments", icon: History },
      { label: "Wallet", href: "/wallet", icon: WalletIcon },
    ],
  },
  {
    label: "Communication",
    items: [
      { label: "Support", href: "/tickets", icon: MessagesSquare },
      { label: "Help Center", href: "/help", icon: LifeBuoy },
      { label: "Perks", href: "/perks", icon: Gift },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "Profile", href: "/settings/profile", icon: UserCircle },
      { label: "Security", href: "/settings/security", icon: Lock },
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
    { label: "Clients", href: "/admin/clients", icon: BadgeDollarSign },
    { label: "Companies", href: "/admin/companies", icon: Building2 },
    { label: "Projects", href: "/admin/projects", icon: FolderKanban },
    { label: "Request reviews", href: "/admin/requests", icon: ClipboardList },
    { label: "Document review", href: "/admin/documents/review", icon: FileText },
    { label: "Quotations", href: "/admin/quotations", icon: FileText },
    { label: "Invoices", href: "/admin/invoices", icon: BadgeDollarSign },
    { label: "Payment review", href: "/admin/payments/review", icon: WalletIcon },
    { label: "Tickets", href: "/admin/tickets", icon: MessagesSquare },
    { label: "Catalogue", href: "/admin/catalogue", icon: Layers },
    { label: "Content", href: "/admin/content", icon: LifeBuoy },
    { label: "Announcements", href: "/admin/notifications", icon: Megaphone },
  ],
};
