export const BRAND = {
  name: "NexaAssist",
  tagline: "Centralized AI-powered business operations",
} as const;

export const NAV_LINKS = [
  { label: "Home", href: "#top" },
  { label: "Product", href: "#features" },
  { label: "Narrative", href: "#narrative" },
  { label: "Contact", href: "mailto:hello@nexaassist.com" },
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
  badge: "NexaAssist OS",
  headline: "Unified intelligence for modular business operations.",
  headlineLines: [
    "Unified intelligence",
    "for modular business operations.",
  ] as const,
  headlineAccent: "intelligence",
  subcopy:
    "Orchestrate appointments, inventory, campaigns, and AI-assisted workflows from one secure multi-tenant workspace.",
  ctas: {
    primary: { label: "Get started", href: ROUTES.register },
    secondary: { label: "Sign in", href: ROUTES.login },
    tertiary: { label: "Client join", href: ROUTES.join },
    dashboard: { label: "Open dashboard", href: ROUTES.dashboard },
  },
  scrollHint: "Scroll to explore the platform",
} as const;

/** Rotating monitor status lines (Track B flicker cycle). */
export const screenStates = [
  "NexaAssist OS",
  "Tenant secured",
  "Status: operational",
  "Assistant ready",
  "Appointments",
  "Inventory",
  "Chatbot",
  "Campaigns",
  "Live queue",
  "Low stock alert",
  "New appointment slot available",
] as const;

export const INTRO = {
  label: "NexaAssist initializing",
  sessionKey: "nexaassist_intro_seen",
} as const;

export const FEATURE_CARDS = [
  {
    id: "appointments",
    title: "Appointments",
    summary: "Unified scheduling and booking",
    body: "Calendars, slots, service types, and status history in one tenant-scoped flow. Teams see the same truth from booking through completion.",
    tag: "// scheduling",
  },
  {
    id: "inventory",
    title: "Inventory",
    summary: "Stock you can trust",
    body: "Movements, thresholds, restock requests, and alerts surfaced before shortages disrupt operations. Every adjustment leaves an audit trail.",
    tag: "// stock_control",
  },
  {
    id: "chatbot",
    title: "Chatbot",
    summary: "Assistant with guardrails",
    body: "Tenant-scoped tools, safe actions, and operational answers — not a generic chat widget. Escalation paths stay inside your RBAC model.",
    tag: "// assistant",
  },
  {
    id: "campaigns",
    title: "Campaigns",
    summary: "Outreach with accountability",
    body: "Queues, channels, and delivery signals tied to real business outcomes. Campaign health maps to inventory and appointment load, not vanity metrics.",
    tag: "// outreach",
  },
] as const;

export const NARRATIVE_CHAPTERS = [
  {
    id: "multi-tenant",
    anchor: "chapter-multi-tenant",
    label: "// multi_tenant_workspace",
    title: "Every tenant operates in isolation — without operating in silos.",
    body: "NexaAssist partitions data, configuration, and modules per organization while preserving a single operational vocabulary. Admins onboard locations, brands, or business units without duplicating infrastructure.",
    askPlaceholder: "Ask about tenant boundaries and data isolation…",
  },
  {
    id: "rbac",
    anchor: "chapter-rbac",
    label: "// role_based_access",
    title: "Roles that match how your team actually works.",
    body: "Granular permissions gate appointments, inventory adjustments, campaign sends, and assistant actions. Owners configure policies once; frontline staff see only what their role requires.",
    askPlaceholder: "Ask about roles, invites, and approval flows…",
  },
  {
    id: "appointments",
    anchor: "chapter-appointments",
    label: "// appointment_workflow",
    title: "From availability to confirmation — one continuous thread.",
    body: "Service types, provider calendars, slot rules, and booking surfaces share the same backend state. Status history and handoffs stay visible to coordinators and floor staff alike.",
    askPlaceholder: "Ask about slots, service types, and booking…",
  },
  {
    id: "inventory",
    anchor: "chapter-inventory",
    label: "// inventory_monitoring",
    title: "Thresholds that speak before shelves go quiet.",
    body: "Movements, categories, and restock requests roll into alerts your team can action in context. Low-stock signals respect tenant scope and tie back to the items that matter for each location.",
    askPlaceholder: "Ask about inventory thresholds and restock…",
  },
  {
    id: "assistant",
    anchor: "chapter-assistant",
    label: "// ai_assistant_flow",
    title: "An assistant that executes — within guardrails you define.",
    body: "Operational questions route through tenant-scoped tools with safe defaults. The assistant summarizes queue health, suggests next actions, and defers to humans when confidence or policy requires it.",
    askPlaceholder: "Ask about assistant tools and safe actions…",
  },
  {
    id: "notifications",
    anchor: "chapter-notifications",
    label: "// notification_escalation",
    title: "Signals that escalate with intent, not noise.",
    body: "Appointment changes, stock events, and campaign milestones surface through channels your operators already monitor. Severity and routing follow rules you configure — not a flood of undifferentiated pings.",
    askPlaceholder: "Ask about alerts, channels, and escalation…",
  },
  {
    id: "campaigns",
    anchor: "chapter-campaigns",
    label: "// campaign_generation",
    title: "Campaigns born from live operational context.",
    body: "Outreach queues respect inventory and scheduling reality. Delivery analytics connect to outcomes your leadership tracks — fill rates, conversions, and follow-through — not opens alone.",
    askPlaceholder: "Ask about campaign queues and delivery…",
  },
] as const;

export const NARRATIVE_BLOCKS = [
  {
    id: "operations-command",
    eyebrow: "Operations command",
    title: "One workspace for modules that used to live in separate tools.",
    body: "NexaAssist unifies scheduling, stock, assistant workflows, and outreach under shared tenancy and identity. Operators switch contexts without re-authenticating or reconciling conflicting numbers across spreadsheets.",
    bullets: [
      "Module toggles per tenant — enable only what you run today",
      "Consistent status language across appointments and inventory",
      "Dashboard entry points that respect role and location",
    ],
  },
  {
    id: "clinical-retail",
    eyebrow: "Clinic & retail ready",
    title: "Built for appointment-heavy and stock-sensitive businesses.",
    body: "Whether you run a multi-chair clinic or a distributed retail network, the same core primitives apply: bookable time, countable stock, accountable outreach. Configuration adapts; the data model does not fracture.",
    bullets: [
      "Service types and provider availability in one calendar fabric",
      "Stock movements with reason codes and responsible users",
      "Campaign segments informed by real availability and stock posture",
    ],
  },
  {
    id: "security-compliance",
    eyebrow: "Security & governance",
    title: "Enterprise posture without enterprise bloat.",
    body: "Tenant isolation, invite flows, join requests, and audit-friendly histories are first-class — not bolted on after launch. Admins see who changed what, when, and under which role.",
    bullets: [
      "Pending-tenant and join-request flows for controlled onboarding",
      "Invite tokens with expiration and scope",
      "History timelines on appointments and inventory events",
    ],
  },
  {
    id: "scale-without-chaos",
    eyebrow: "Scale with clarity",
    title: "Add locations and modules without rewriting playbooks.",
    body: "As you grow, NexaAssist keeps operational vocabulary stable. New sites inherit policies; new modules slot into the same navigation and permission model your team already learned.",
    bullets: [
      "Per-tenant module catalog with clear enablement",
      "Join flows for clients and staff with approval gates",
      "Settings surfaces that stay approachable as capability grows",
    ],
  },
] as const;

/** @deprecated Track C — use NARRATIVE_CHAPTERS */
export const PINNED_CHAPTERS = NARRATIVE_CHAPTERS;

export const SCROLL_NARRATIVE = {
  sectionId: "narrative",
  wireframePlaceholderLabel: "Wireframe depth layer — Track C",
  chapters: NARRATIVE_CHAPTERS,
} as const;

export const FINAL_CTA = {
  eyebrow: "Ready to operate",
  title: "Start operating from one workspace.",
  body: "Create your tenant, invite your team, and enable the modules you need — appointments, inventory, assistant, and campaigns — without stitching together four separate products.",
  primary: { label: "Get started", href: ROUTES.register },
  secondary: { label: "Sign in", href: ROUTES.login },
} as const;

export const FOOTER = {
  copyright: `© ${new Date().getFullYear()} NexaAssist. All rights reserved.`,
  links: [
    { label: "Privacy", href: "#" },
    { label: "Terms", href: "#" },
    { label: "Contact", href: "mailto:hello@nexaassist.com" },
  ],
} as const;
