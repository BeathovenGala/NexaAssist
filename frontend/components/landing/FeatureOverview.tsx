import { FEATURE_CARDS } from "./copy";

const ICONS: Record<string, string> = {
  appointments: "🗓",
  inventory: "📦",
  chatbot: "🤖",
  campaigns: "📣",
};

// Per-card prismatic tint palette — matches the liquid-glass prism hues
const PRISM_TINTS = [
  {
    border: "rgba(120,80,255,0.65)",
    iconBg:
      "linear-gradient(135deg, rgba(100,60,220,0.55) 0%, rgba(60,30,180,0.4) 100%)",
    iconShadow: "rgba(130,80,255,0.45)",
    refract: "rgba(150,80,255,0.1)",
    shine: "rgba(180,100,255,0.55)",
  },
  {
    border: "rgba(0,210,255,0.6)",
    iconBg:
      "linear-gradient(135deg, rgba(0,180,220,0.55) 0%, rgba(0,120,200,0.4) 100%)",
    iconShadow: "rgba(0,200,255,0.45)",
    refract: "rgba(0,220,255,0.08)",
    shine: "rgba(50,210,255,0.55)",
  },
  {
    border: "rgba(255,100,160,0.62)",
    iconBg:
      "linear-gradient(135deg, rgba(220,70,120,0.55) 0%, rgba(180,40,90,0.4) 100%)",
    iconShadow: "rgba(255,90,150,0.45)",
    refract: "rgba(255,100,150,0.09)",
    shine: "rgba(255,120,170,0.55)",
  },
  {
    border: "rgba(72,255,180,0.58)",
    iconBg:
      "linear-gradient(135deg, rgba(40,210,140,0.55) 0%, rgba(0,160,100,0.4) 100%)",
    iconShadow: "rgba(60,255,180,0.42)",
    refract: "rgba(70,255,180,0.08)",
    shine: "rgba(80,255,190,0.52)",
  },
] as const;

export function FeatureOverview() {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="relative overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, #010308 0%, rgba(4,8,28,0.98) 50%, rgba(6,10,30,0.98) 100%)",
      }}
    >
      {/* Top edge — iridescent glow line matching the prism theme */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(120,80,255,0.6), rgba(0,210,255,0.6), rgba(72,255,180,0.5), transparent)",
        }}
        aria-hidden
      />

      {/* Subtle ambient glow pool above cards */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-96"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(100,60,200,0.12), transparent 70%)",
        }}
      />

      <div className="mx-auto max-w-[1280px] px-6 py-24 sm:px-12 sm:py-32">

        {/* Section header */}
        <header className="mx-auto max-w-2xl text-center">
          <p
            className="font-mono text-[11px] font-medium uppercase tracking-[0.2em]"
            style={{ color: "rgba(160,100,255,0.78)" }}
          >
            {'// product_modules'}
          </p>
          <h2
            id="features-heading"
            className="na-display mt-4 text-3xl tracking-tight text-white sm:text-4xl"
            style={{
              textShadow:
                "0 0 50px rgba(120,80,255,0.3), 0 0 20px rgba(80,180,255,0.2)",
            }}
          >
            Four modules. One operational graph.
          </h2>
          <p
            className="mt-4 text-base leading-relaxed sm:text-lg"
            style={{ color: "rgba(175,200,240,0.65)" }}
          >
            Enable scheduling, stock, assistant, and outreach per tenant —
            shared identity, isolated data, consistent governance.
          </p>
        </header>

        {/* Cards grid */}
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURE_CARDS.map((card, i) => {
            const tint = PRISM_TINTS[i % PRISM_TINTS.length];
            return (
              <div
                key={card.id}
                className="group relative"
                data-reveal="feature-card"
                data-feature-id={card.id}
              >
                {/* Animated prism border — always spins, opacity boosts on hover */}
                <div
                  className="na-prism-border pointer-events-none absolute -inset-[1px] rounded-[21px] opacity-35 transition-opacity duration-500 group-hover:opacity-80"
                  aria-hidden
                />

                {/* Glass card body */}
                <article
                  id={`feature-${card.id}`}
                  className="relative flex h-full flex-col gap-5 overflow-hidden rounded-[20px] p-7 transition-all duration-300 group-hover:-translate-y-1.5"
                  style={{
                    background: "rgba(6, 10, 34, 0.80)",
                    backdropFilter: "blur(22px) saturate(160%)",
                    boxShadow:
                      "0 4px 32px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.06)",
                  }}
                >
                  {/* Prismatic top-edge shine */}
                  <div
                    className="pointer-events-none absolute inset-x-0 top-0 h-[1px]"
                    aria-hidden
                    style={{
                      background: `linear-gradient(90deg, transparent 10%, ${tint.shine}, transparent 90%)`,
                    }}
                  />

                  {/* Inner refraction overlay — reveals on hover */}
                  <div
                    className="pointer-events-none absolute inset-0 rounded-[20px] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    aria-hidden
                    style={{
                      background: `radial-gradient(ellipse 85% 55% at 50% 0%, ${tint.refract}, transparent 70%)`,
                    }}
                  />

                  {/* Tag */}
                  <p
                    className="font-mono text-[10px] font-medium uppercase tracking-widest"
                    style={{ color: "rgba(80,180,255,0.65)" }}
                  >
                    {card.tag}
                  </p>

                  {/* Icon */}
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-xl"
                    style={{
                      background: tint.iconBg,
                      border: "1px solid rgba(255,255,255,0.12)",
                      boxShadow: `0 0 24px ${tint.iconShadow}`,
                    }}
                  >
                    {ICONS[card.id] ?? "◆"}
                  </div>

                  {/* Text */}
                  <div className="flex flex-col gap-2.5">
                    <h3 className="text-base font-semibold text-white">
                      {card.title}
                    </h3>
                    <p
                      className="text-sm font-medium"
                      style={{ color: "rgba(130,185,255,0.88)" }}
                    >
                      {card.summary}
                    </p>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "rgba(175,195,235,0.6)" }}
                    >
                      {card.body}
                    </p>
                  </div>
                </article>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
