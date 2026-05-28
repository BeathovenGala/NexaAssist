import { SECURITY_BAND } from "./copy";
import { LandingReveal } from "./LandingReveal";

export function SecurityBand() {
  return (
    <section
      id="security"
      aria-labelledby="security-heading"
      className="landing-section border-t"
      style={{ borderColor: "var(--landing-border)" }}
    >
      <div className="landing-container">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
          <LandingReveal>
            <p className="landing-eyebrow mb-3">{SECURITY_BAND.eyebrow}</p>
            <h2 id="security-heading" className="landing-display text-3xl sm:text-4xl">
              {SECURITY_BAND.title}
            </h2>
            <p className="landing-subhead mt-4">{SECURITY_BAND.body}</p>
          </LandingReveal>

          <LandingReveal>
            <ul className="landing-card divide-y overflow-hidden" style={{ borderColor: "var(--landing-border)" }}>
              {SECURITY_BAND.bullets.map((bullet) => (
                <li
                  key={bullet}
                  className="flex gap-3 px-6 py-4 text-sm text-[var(--landing-text)]"
                  style={{ borderColor: "var(--landing-border)" }}
                >
                  <svg className="mt-0.5 h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="none" aria-hidden>
                    <circle cx="10" cy="10" r="10" fill="rgba(122, 173, 255, 0.12)" />
                    <path
                      d="M6 10l2.5 2.5L14 7"
                      stroke="var(--landing-accent)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {bullet}
                </li>
              ))}
            </ul>
          </LandingReveal>
        </div>
      </div>
    </section>
  );
}
