type MockupVariant = "calendar" | "inventory" | "campaigns";

type FeatureMockupProps = {
  variant: MockupVariant;
};

export function FeatureMockup({ variant }: FeatureMockupProps) {
  if (variant === "calendar") {
    return (
      <div className="landing-card p-4" aria-hidden>
        <div className="mb-3 grid grid-cols-7 gap-1 text-center text-[9px] font-medium" style={{ color: "var(--landing-muted)" }}>
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <span key={`${d}-${i}`}>{d}</span>
          ))}
        </div>
        <div className="mb-3 grid grid-cols-7 gap-1">
          {Array.from({ length: 14 }, (_, i) => (
            <div
              key={i}
              className="aspect-square rounded text-[10px] flex items-center justify-center"
              style={{
                background: i === 8 || i === 10 ? "rgba(122, 173, 255, 0.18)" : "rgba(255, 255, 255, 0.04)",
                color: i === 8 || i === 10 ? "var(--landing-accent)" : "var(--landing-muted)",
                fontWeight: i === 8 || i === 10 ? 600 : 400,
              }}
            >
              {i + 12}
            </div>
          ))}
        </div>
        <div className="rounded-lg border p-3" style={{ borderColor: "var(--landing-border)" }}>
          <p className="text-xs font-semibold text-[var(--landing-text)]">11:30 — Follow-up</p>
          <p className="mt-1 text-[11px]" style={{ color: "var(--landing-muted)" }}>
            Dr. Chen · 30 min · Confirmed
          </p>
        </div>
      </div>
    );
  }

  if (variant === "inventory") {
    const rows = [
      { sku: "SKU-104", name: "Serum A", qty: "12", status: "OK" },
      { sku: "SKU-208", name: "Bandages", qty: "4", status: "Low" },
      { sku: "SKU-311", name: "Gloves (M)", qty: "28", status: "OK" },
    ];
    return (
      <div className="landing-card overflow-hidden" aria-hidden>
        <div
          className="border-b px-3 py-2 text-[10px] font-semibold uppercase tracking-wide"
          style={{ borderColor: "var(--landing-border)", color: "var(--landing-muted)" }}
        >
          Stock overview
        </div>
        <table className="w-full text-left text-[11px]">
          <thead>
            <tr style={{ color: "var(--landing-muted)" }}>
              <th className="px-3 py-2 font-medium">SKU</th>
              <th className="px-3 py-2 font-medium">Item</th>
              <th className="px-3 py-2 font-medium">Qty</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.sku} className="border-t" style={{ borderColor: "var(--landing-border)" }}>
                <td className="px-3 py-2 font-mono">{row.sku}</td>
                <td className="px-3 py-2 text-[var(--landing-text)]">{row.name}</td>
                <td className="px-3 py-2 text-[var(--landing-text)]">{row.qty}</td>
                <td className="px-3 py-2">
                  <span
                    className="rounded-full px-2 py-0.5 text-[9px] font-medium"
                    style={{
                      background: row.status === "Low" ? "rgba(239, 68, 68, 0.15)" : "rgba(34, 197, 94, 0.15)",
                      color: row.status === "Low" ? "#f87171" : "#4ade80",
                    }}
                  >
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div
          className="mx-3 mb-3 mt-2 rounded-lg px-3 py-2 text-[11px]"
          style={{ background: "rgba(239, 68, 68, 0.12)", color: "#fca5a5" }}
        >
          Low stock alert: Bandages below threshold
        </div>
      </div>
    );
  }

  const campaigns = [
    { name: "Spring promo", status: "Scheduled", channel: "WhatsApp" },
    { name: "Re-engagement", status: "Sending", channel: "Campaign" },
    { name: "Slot reminder", status: "Draft", channel: "WhatsApp" },
  ];

  return (
    <div className="landing-card p-4" aria-hidden>
      <p className="mb-3 text-xs font-semibold text-[var(--landing-text)]">Active outreach</p>
      <ul className="space-y-2">
        {campaigns.map((c) => (
          <li
            key={c.name}
            className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5"
            style={{ borderColor: "var(--landing-border)" }}
          >
            <div>
              <p className="text-[12px] font-medium text-[var(--landing-text)]">{c.name}</p>
              <p className="text-[10px]" style={{ color: "var(--landing-muted)" }}>
                {c.channel}
              </p>
            </div>
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-medium"
              style={{
                background:
                  c.status === "Sending"
                    ? "rgba(122, 173, 255, 0.15)"
                    : c.status === "Scheduled"
                      ? "rgba(34, 197, 94, 0.15)"
                      : "rgba(255, 255, 255, 0.06)",
                color:
                  c.status === "Sending"
                    ? "var(--landing-accent)"
                    : c.status === "Scheduled"
                      ? "#4ade80"
                      : "var(--landing-muted)",
              }}
            >
              {c.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
