import { NARRATIVE_BLOCKS } from "./copy";

export function NarrativeBlocks() {
  return (
    <section
      id="platform-depth"
      aria-labelledby="platform-depth-heading"
      className="relative"
      style={{ background: "rgba(4,7,22,0.98)" }}
    >
      {/* Divider */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(80,100,200,0.25), transparent)" }}
        aria-hidden
      />

      <div className="mx-auto max-w-[1280px] px-6 py-24 sm:px-12 sm:py-32">
        <header className="mx-auto max-w-2xl text-center">
          <p
            className="font-mono text-[11px] font-medium uppercase tracking-[0.2em]"
            style={{ color: "rgba(100,180,255,0.7)" }}
          >
            {'// case_studies'}
          </p>
          <h2
            id="platform-depth-heading"
            className="na-display mt-4 text-3xl tracking-tight text-white sm:text-4xl"
          >
            Depth for operators who run the floor.
          </h2>
          <p
            className="mt-4 text-base leading-relaxed sm:text-lg"
            style={{ color: "rgba(175,200,240,0.60)" }}
          >
            Real scenarios, real constraints. NexaAssist is built around the edge cases
            that break generic tools.
          </p>
        </header>

        <div className="mt-16 grid gap-10 lg:grid-cols-2 lg:gap-14">
          {NARRATIVE_BLOCKS.map((block, i) => (
            <article
              key={block.id}
              id={`block-${block.id}`}
              className={`group relative rounded-2xl p-8 transition-all duration-300 hover:-translate-y-0.5 sm:p-10 ${i % 2 === 1 ? "lg:mt-10" : ""}`}
              style={{
                background: "rgba(10,15,42,0.6)",
                border: "1px solid rgba(70,105,200,0.13)",
                backdropFilter: "blur(8px)",
                boxShadow: "0 4px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(100,140,255,0.06)",
              }}
            >
              <div
                className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  background:
                    "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(50,90,220,0.09), transparent 65%)",
                }}
                aria-hidden
              />

              <p
                className="font-mono text-[10px] font-medium uppercase tracking-widest"
                style={{ color: "rgba(80,180,255,0.55)" }}
              >
                {block.eyebrow}
              </p>

              <h3
                className="na-display mt-4 text-2xl leading-snug tracking-tight text-white sm:text-[1.65rem]"
              >
                {block.title}
              </h3>

              <p
                className="mt-4 text-base leading-relaxed"
                style={{ color: "rgba(175,195,235,0.62)" }}
              >
                {block.body}
              </p>

              <ul className="mt-6 space-y-2.5">
                {block.bullets.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm">
                    <span
                      className="mt-0.5 h-4 w-4 shrink-0 rounded-full flex items-center justify-center text-[9px]"
                      style={{
                        background: "rgba(60,100,220,0.3)",
                        border: "1px solid rgba(80,140,255,0.3)",
                        color: "rgba(120,180,255,0.9)",
                      }}
                    >
                      ✓
                    </span>
                    <span style={{ color: "rgba(175,200,240,0.65)" }}>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
