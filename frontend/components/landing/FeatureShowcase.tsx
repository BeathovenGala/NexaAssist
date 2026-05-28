import { FEATURE_SHOWCASE, FEATURES_SECTION } from "./copy";
import { FeatureMockup } from "./FeatureMockup";
import { LandingReveal } from "./LandingReveal";

export function FeatureShowcase() {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="landing-section border-t"
      style={{ borderColor: "var(--landing-border)" }}
    >
      <div className="landing-container">
        <LandingReveal className="mx-auto max-w-2xl text-center">
          <p className="landing-eyebrow mb-3">{FEATURES_SECTION.eyebrow}</p>
          <h2 id="features-heading" className="landing-display text-3xl sm:text-4xl">
            {FEATURES_SECTION.title}
          </h2>
          <p className="landing-subhead mt-4">{FEATURES_SECTION.subtitle}</p>
        </LandingReveal>

        <div className="mt-16 space-y-24">
          {FEATURE_SHOWCASE.map((item, index) => {
            const reversed = index % 2 === 1;
            return (
              <LandingReveal key={item.id}>
                <div
                  className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${
                    reversed ? "lg:[direction:rtl]" : ""
                  }`}
                >
                  <div className={reversed ? "lg:[direction:ltr]" : ""}>
                    <h3 className="landing-display text-2xl sm:text-3xl">{item.title}</h3>
                    <p className="landing-subhead mt-4">{item.body}</p>
                    <ul className="mt-6 space-y-3">
                      {item.bullets.map((bullet) => (
                        <li key={bullet} className="flex gap-3 text-sm text-[var(--landing-muted)]">
                          <span
                            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--landing-accent)]"
                            aria-hidden
                          />
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={reversed ? "lg:[direction:ltr]" : ""} data-feature-mockup>
                    <FeatureMockup variant={item.mockup} />
                  </div>
                </div>
              </LandingReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
