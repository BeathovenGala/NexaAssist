const NAV_ITEMS = ["Home", "Appointments", "Inventory", "Assistant", "Campaigns"] as const;

const STAT_CARDS = [
  { label: "Today", value: "12", sub: "appointments" },
  { label: "Low stock", value: "3", sub: "items" },
  { label: "Campaigns", value: "2", sub: "active" },
] as const;

const APPOINTMENTS = [
  { time: "9:00", name: "Consultation", status: "Confirmed" },
  { time: "11:30", name: "Follow-up", status: "Pending" },
  { time: "14:00", name: "New client", status: "Confirmed" },
] as const;

type HeroMockupProps = {
  variant?: "dark" | "light";
};

export function HeroMockup({ variant = "dark" }: HeroMockupProps) {
  const isDark = variant === "dark";
  const sidebarBg = isDark ? "#0e1016" : "#fafafa";
  const panelBg = isDark ? "rgba(14, 16, 22, 0.95)" : "#ffffff";
  const rowBg = isDark ? "rgba(255, 255, 255, 0.04)" : "#f5f5f4";
  const statBg = isDark ? "rgba(255, 255, 255, 0.03)" : "#fafafa";

  return (
    <div
      className="landing-card overflow-hidden rounded-2xl"
      style={{
        borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : undefined,
        background: panelBg,
        boxShadow: isDark
          ? "0 40px 80px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255,255,255,0.06) inset"
          : undefined,
      }}
      aria-hidden
    >
      <div className="flex min-h-[300px] sm:min-h-[380px]">
        <aside
          className="hidden w-[148px] shrink-0 border-r sm:block"
          style={{ borderColor: "var(--landing-border)", background: sidebarBg }}
        >
          <div
            className="flex items-center gap-2 border-b px-3 py-3"
            style={{ borderColor: "var(--landing-border)" }}
          >
            <span
              className="flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold text-white"
              style={{ background: "var(--landing-accent)" }}
            >
              N
            </span>
            <span className="text-xs font-semibold text-[var(--landing-text)]">NexaAssist</span>
          </div>
          <div className="border-b px-3 py-2.5" style={{ borderColor: "var(--landing-border)" }}>
            <p className="text-[10px] font-medium text-[var(--landing-muted)]">Acme Clinic</p>
          </div>
          <nav className="flex flex-col gap-0.5 p-2">
            {NAV_ITEMS.map((item, i) => (
              <div
                key={item}
                className="rounded-md px-2.5 py-2 text-[11px] font-medium"
                style={{
                  background: i === 1 ? "rgba(122, 173, 255, 0.12)" : "transparent",
                  color: i === 1 ? "var(--landing-accent)" : "var(--landing-muted)",
                }}
              >
                {item}
              </div>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
          <div className="mb-1 sm:hidden">
            <p className="text-lg font-semibold text-[var(--landing-text)]">Good morning, Sarah</p>
            <p className="text-xs text-[var(--landing-muted)]">Wed, May 27 · Operations overview</p>
          </div>
          <div className="mb-4 hidden sm:block">
            <p className="text-xl font-semibold text-[var(--landing-text)]">Good morning, Sarah</p>
            <p className="mt-0.5 text-sm text-[var(--landing-muted)]">Wed, May 27 · Operations overview</p>
          </div>

          <div className="mb-4 grid grid-cols-3 gap-2">
            {STAT_CARDS.map((card) => (
              <div
                key={card.label}
                className="rounded-lg border px-2.5 py-2.5"
                style={{ borderColor: "var(--landing-border)", background: statBg }}
              >
                <p className="text-[10px] font-medium text-[var(--landing-muted)]">{card.label}</p>
                <p className="text-lg font-semibold leading-tight text-[var(--landing-text)]">{card.value}</p>
                <p className="text-[10px] text-[var(--landing-muted)]">{card.sub}</p>
              </div>
            ))}
          </div>

          <div
            className="flex-1 rounded-lg border p-3"
            style={{ borderColor: "var(--landing-border)" }}
          >
            <p className="text-xs font-semibold text-[var(--landing-text)]">Upcoming appointments</p>
            <ul className="mt-2 space-y-2">
              {APPOINTMENTS.map((row) => (
                <li
                  key={row.time}
                  className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-[11px]"
                  style={{ background: rowBg }}
                >
                  <span className="font-mono font-medium text-[var(--landing-muted)]">{row.time}</span>
                  <span className="min-w-0 flex-1 truncate font-medium text-[var(--landing-text)]">
                    {row.name}
                  </span>
                  <span
                    className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium"
                    style={{
                      background:
                        row.status === "Confirmed"
                          ? "rgba(34, 197, 94, 0.15)"
                          : "rgba(234, 179, 8, 0.12)",
                      color: row.status === "Confirmed" ? "#4ade80" : "#fbbf24",
                    }}
                  >
                    {row.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
