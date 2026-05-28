import { PILLARS, PRODUCT_SECTION } from "./copy";
import { PillarIcon } from "./icons";
import { LandingReveal } from "./LandingReveal";

export function LandingPillars() {
  return (
    <section id="product" aria-labelledby="product-heading" className="landing-section">
      <div className="landing-container">
        <LandingReveal className="mx-auto max-w-2xl text-center">
          <p className="landing-eyebrow mb-3">{PRODUCT_SECTION.eyebrow}</p>
          <h2 id="product-heading" className="landing-display text-3xl sm:text-4xl">
            {PRODUCT_SECTION.title}
          </h2>
          <p className="landing-subhead mt-4">{PRODUCT_SECTION.subtitle}</p>
        </LandingReveal>

        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((pillar) => (
            <li key={pillar.id}>
              <LandingReveal>
                <article className="landing-card landing-card-interactive h-full p-6">
                  <div
                    className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg"
                    style={{ background: "rgba(122, 173, 255, 0.12)", color: "var(--landing-accent)" }}
                  >
                    <PillarIcon name={pillar.icon} size={20} />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--landing-text)]">{pillar.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--landing-muted)]">{pillar.summary}</p>
                </article>
              </LandingReveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
