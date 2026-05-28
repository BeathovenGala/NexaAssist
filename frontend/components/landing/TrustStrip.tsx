import { TRUST_STRIP } from "./copy";
import { LandingReveal } from "./LandingReveal";

export function TrustStrip() {
  return (
    <section
      id="trust"
      aria-label="Who NexaAssist is for"
      className="relative z-2 border-y py-10"
      style={{ borderColor: "var(--landing-border)" }}
    >
      <div className="landing-container">
        <LandingReveal className="flex flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-sm font-medium text-[var(--landing-muted)]">{TRUST_STRIP.label}</p>
          <ul className="flex flex-wrap justify-center gap-2 sm:justify-end">
            {TRUST_STRIP.roles.map((role) => (
              <li key={role}>
                <span className="landing-glass inline-block rounded-full px-3.5 py-1.5 text-xs font-medium text-[var(--landing-text)]">
                  {role}
                </span>
              </li>
            ))}
          </ul>
        </LandingReveal>
      </div>
    </section>
  );
}
