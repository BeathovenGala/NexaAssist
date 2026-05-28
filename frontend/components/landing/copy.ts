export const BRAND = {
  name: "NexaAssist",
  tagline: "Centralized AI-powered business operations",
} as const;

export const NAV_LINKS = [
  { label: "Product", href: "#product", hasMenu: true },
  { label: "Resources", href: "#features", hasMenu: true },
  { label: "Pricing", href: "#pricing", hasMenu: false },
  { label: "Security", href: "#security", hasMenu: false },
] as const;

export const NAV_FOOTER_LINKS = [
  { label: "Contact", href: "mailto:hello@nexaassist.com" },
] as const;

export const PRICING_SECTION = {
  eyebrow: "Pricing",
  title: "Plans that scale with your operations",
  subtitle:
    "Start with the modules you need. Upgrade as locations, staff, and outreach grow—without switching platforms.",
} as const;

export const PRICING_TIERS = [
  {
    id: "starter",
    name: "Starter",
    description: "For a single location getting off spreadsheets.",
    price: "Free",
    period: "",
    features: [
      "Scheduling & calendar",
      "Up to 5 team members",
      "Basic inventory tracking",
      "Email notifications",
    ],
    ctaLabel: "Get started",
    ctaModal: "register" as const,
    highlighted: false,
  },
  {
    id: "growth",
    name: "Growth",
    description: "For teams running campaigns and multi-role workflows.",
    price: "$49",
    period: "/ seat / mo",
    features: [
      "Everything in Starter",
      "AI assistant with tools",
      "Campaigns & WhatsApp batches",
      "Analytics & SEO audits",
      "Priority support",
    ],
    ctaLabel: "Start free trial",
    ctaModal: "register" as const,
    highlighted: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "For multi-location groups with custom governance.",
    price: "Custom",
    period: "",
    features: [
      "Unlimited locations",
      "SSO & advanced RBAC",
      "Dedicated worker capacity",
      "Custom integrations",
      "SLA & onboarding",
    ],
    ctaLabel: "Contact sales",
    ctaModal: "login" as const,
    highlighted: false,
  },
] as const;

export const ROUTES = {
  register: "/?auth=register",
  login: "/?auth=login",
  registerCustomer: "/?auth=register&mode=customer",
  loginLegacy: "/auth/login",
  registerLegacy: "/auth/register",
  dashboard: "/dashboard",
  join: "/join",
} as const;

export const HERO_VIDEO_BADGE = {
  label: "Watch the platform tour",
  href: "#features",
} as const;

export const HERO = {
  eyebrow: "NexaAssist",
  headline: "One place for scheduling, inventory, campaigns, messaging, and AI.",
  subcopy:
    "Run appointments, stock, outreach, and an AI assistant from one secure workspace—built for multi-location clinics, retail, and service teams.",
  ctas: {
    primary: { label: "Get started", href: ROUTES.register },
    secondary: { label: "Sign in", href: ROUTES.login },
    tertiary: { label: "Join as a client", href: ROUTES.join },
    dashboard: { label: "Open dashboard", href: ROUTES.dashboard },
  },
} as const;

export const TRUST_STRIP = {
  label: "Built for appointment-heavy and stock-sensitive teams",
  roles: [
    "Clinics",
    "Retail",
    "Service businesses",
    "Multi-location ops",
  ] as const,
} as const;

export const PILLARS = [
  {
    id: "scheduling",
    title: "Scheduling",
    summary: "Calendars, availability, booking, and status in one flow",
    icon: "calendar" as const,
  },
  {
    id: "inventory",
    title: "Inventory",
    summary: "Stock levels, movements, alerts, and restock requests",
    icon: "box" as const,
  },
  {
    id: "assistant",
    title: "AI assistant",
    summary: "Tenant-scoped chat with safe tools—not a generic widget",
    icon: "sparkles" as const,
  },
  {
    id: "campaigns",
    title: "Campaigns",
    summary: "Create, approve, and run marketing with generated assets",
    icon: "megaphone" as const,
  },
  {
    id: "whatsapp",
    title: "WhatsApp",
    summary: "Templates, batches, and delivery logs in one place",
    icon: "message" as const,
  },
  {
    id: "analytics",
    title: "Analytics",
    summary: "Appointments, inventory, campaigns, chat, and SEO in one view",
    icon: "chart" as const,
  },
] as const;

export const FEATURE_SHOWCASE = [
  {
    id: "scheduling",
    title: "Scheduling that stays in sync",
    body: "Service types, provider calendars, and a booking wizard share the same backend state. Coordinators and floor staff see confirmations, changes, and handoffs without reconciling separate tools.",
    bullets: [
      "Provider availability and slot rules in one calendar",
      "Booking wizard for staff and approved clients",
      "Status history from request through completion",
    ],
    mockup: "calendar" as const,
  },
  {
    id: "inventory",
    title: "Inventory before shelves go quiet",
    body: "Movements, thresholds, and restock requests roll into alerts your team can action in context. Every adjustment leaves an audit trail tied to the right location and role.",
    bullets: [
      "Low-stock alerts with tenant-scoped thresholds",
      "Restock requests with approval flows",
      "Movements with reason codes and responsible users",
    ],
    mockup: "inventory" as const,
  },
  {
    id: "outreach",
    title: "Outreach tied to operations",
    body: "Campaigns and WhatsApp batches respect real availability and stock posture. Delivery signals connect to outcomes your leadership tracks—not vanity metrics alone.",
    bullets: [
      "Campaign creation, approval, and scheduled sends",
      "WhatsApp templates, batches, and delivery logs",
      "Queues informed by appointments and inventory",
    ],
    mockup: "campaigns" as const,
  },
] as const;

export const HOW_IT_WORKS = {
  eyebrow: "How it works",
  title: "From signup to daily operations in three steps",
  steps: [
    {
      step: "01",
      title: "Create your workspace",
      body: "Register your organization and enable the modules you need today—scheduling, inventory, assistant, campaigns, and more.",
    },
    {
      step: "02",
      title: "Invite your team",
      body: "Onboard staff with invite links or QR codes. Customers join through requests you approve, so access stays controlled.",
    },
    {
      step: "03",
      title: "Operate from one dashboard",
      body: "Each role sees only what they need. Notifications, campaign sends, and SEO scans run in the background while your team works.",
    },
  ],
} as const;

export const SECURITY_BAND = {
  eyebrow: "Security & governance",
  title: "Enterprise posture without enterprise bloat",
  body: "Tenant isolation, role-based access, and audit-friendly histories are built in—not bolted on after launch.",
  bullets: [
    "Tenant-isolated data per organization",
    "Role-based permissions on every module",
    "Invite-only onboarding and audit-friendly histories",
    "Background worker for notifications, campaigns, and SEO scans",
  ],
} as const;

export const FINAL_CTA = {
  title: "Stop stitching together four different tools.",
  body: "Start with the modules you run today. Add campaigns, WhatsApp, and SEO when you're ready.",
  primary: { label: "Get started", href: ROUTES.register },
  secondary: { label: "Sign in", href: ROUTES.login },
  trustBullets: [
    "Tenant-isolated by default",
    "Invite-only onboarding",
    "Audit trails included",
    "RBAC on every action",
  ],
} as const;

export const FOOTER = {
  copyright: `© ${new Date().getFullYear()} NexaAssist. All rights reserved.`,
  links: [
    { label: "Privacy", href: "#" },
    { label: "Terms", href: "#" },
    { label: "Contact", href: "mailto:hello@nexaassist.com" },
  ],
} as const;

export const PRODUCT_SECTION = {
  eyebrow: "Product",
  title: "Everything your team needs in one workspace",
  subtitle:
    "Replace scattered spreadsheets and single-purpose apps with modules that share the same data model and permissions.",
} as const;

export const FEATURES_SECTION = {
  eyebrow: "Features",
  title: "Depth where it matters",
  subtitle: "Each module is designed for operators—not just dashboards for executives.",
} as const;

/** Legacy hero monitor animation (unused on current landing). */
export const screenStates = [
  "NexaAssist OS",
  "Tenant secured",
  "Status: operational",
  "Assistant ready",
  "Appointments",
  "Inventory",
  "Chatbot",
  "Campaigns",
] as const;

export const INTRO = {
  label: "NexaAssist initializing",
  sessionKey: "nexaassist_intro_seen",
} as const;
