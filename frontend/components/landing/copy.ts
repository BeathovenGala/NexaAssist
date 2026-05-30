export const BRAND = {

  name: "NexaAssist",

  tagline: "Centralized AI-powered business operations",

} as const;



/** Interactive robot — 3dmk/Components/hero.txt */
export const SPLINE_ROBOT_SCENE =
  "https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode";

/** Whobee robot — 3dmk/Components/hero_robot.txt (now used for chatbot) */
export const SPLINE_CHATBOT_SCENE =
  "https://prod.spline.design/PyzDhpQ9E5f1E3MT/scene.splinecode";

/** Override via NEXT_PUBLIC_SPLINE_HERO_SCENE */
export const SPLINE_HERO_SCENE =
  process.env.NEXT_PUBLIC_SPLINE_HERO_SCENE ?? SPLINE_ROBOT_SCENE;

/** Override via NEXT_PUBLIC_SPLINE_ORBIT_SCENE */
export const SPLINE_ORBIT_SCENE =
  process.env.NEXT_PUBLIC_SPLINE_ORBIT_SCENE ?? SPLINE_ROBOT_SCENE;



export const NAV_LINKS = [

  { label: "Product", href: "#orbit", hasMenu: true },

  { label: "Features", href: "#product", hasMenu: true },

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



export const HERO = {

  eyebrow: "Operations platform",

  headline: "Run your business from one intelligent workspace.",

  headlineLine2: "Scheduling. Inventory. AI. One dashboard.",

  subcopy:

    "Built for clinics, retail, and service teams—tenant-scoped AI, campaigns, and stock in a single secure workspace.",

  statusLine: "Available for new workspaces",

  ctas: {

    primary: { label: "Get started", href: ROUTES.register },

    secondary: { label: "Sign in", href: ROUTES.login },

    tertiary: { label: "Join as a client", href: ROUTES.join },

    dashboard: { label: "Open dashboard", href: ROUTES.dashboard },

  },

} as const;



export const TRUST_STRIP = {

  label: "Built for appointment-heavy and stock-sensitive teams",

  roles: ["Clinics", "Retail", "Service businesses", "Multi-location ops"] as const,

} as const;



export const PILLARS = [

  {

    id: "scheduling",

    title: "Scheduling",

    summary: "Calendars, availability, and booking that stay in sync across your team.",

    description:

      "Service types, provider slots, and status history—without reconciling separate tools.",

    icon: "calendar" as const,

  },

  {

    id: "inventory",

    title: "Inventory",

    summary: "Stock levels, movements, and alerts before shelves go quiet.",

    description: "Thresholds, restock requests, and audit trails tied to each location.",

    icon: "box" as const,

  },

  {

    id: "assistant",

    title: "AI assistant",

    summary: "Tenant-scoped chat with safe tools—not a generic widget on your site.",

    description: "Answers and actions grounded in your data, permissions, and workflows.",

    icon: "sparkles" as const,

  },

  {

    id: "campaigns",

    title: "Campaigns",

    summary: "Create, approve, and run marketing with generated assets.",

    description: "Outreach that respects real availability and operational context.",

    icon: "megaphone" as const,

  },

  {

    id: "whatsapp",

    title: "WhatsApp",

    summary: "Templates, batches, and delivery logs in one place.",

    description: "Coordinate messaging alongside appointments and inventory signals.",

    icon: "message" as const,

  },

  {

    id: "analytics",

    title: "Analytics",

    summary: "Appointments, inventory, campaigns, chat, and SEO in one view.",

    description: "Leadership metrics connected to daily operations—not vanity alone.",

    icon: "chart" as const,

  },

] as const;



export const HOW_IT_WORKS = {

  eyebrow: "How it works",

  title: "From signup to daily operations in three steps",

  steps: [

    {

      step: "01",

      title: "Create your workspace",

      body: "Register your organization and enable the modules you need today.",

    },

    {

      step: "02",

      title: "Invite your team",

      body: "Onboard staff with invite links. Customers join through requests you approve.",

    },

    {

      step: "03",

      title: "Operate from one dashboard",

      body: "Each role sees only what they need. Background jobs handle notifications and campaigns.",

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

  title: "Your operations stack, finally in one place.",

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

  eyebrow: "Modules",

  title: "Everything your team runs—at full scale",

  subtitle:

    "Six pillars that share one data model and permissions. Enable what you need today; add the rest when you're ready.",

} as const;



export const FEATURES_SECTION = {

  eyebrow: "Features",

  title: "Everything connects in one orbit",

  subtitle: "Each module is designed for operators—not just dashboards for executives.",

} as const;

