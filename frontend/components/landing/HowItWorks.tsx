import { HOW_IT_WORKS } from "./copy";
import { LandingReveal } from "./LandingReveal";

export function HowItWorks() {
  return (
    <section id="how" aria-labelledby="how-heading" className="landing-section">
      <div className="landing-container">
        <LandingReveal className="mx-auto max-w-2xl text-center">
          <p className="landing-eyebrow mb-3">{HOW_IT_WORKS.eyebrow}</p>
          <h2 id="how-heading" className="landing-display text-3xl sm:text-4xl">
            {HOW_IT_WORKS.title}
          </h2>
        </LandingReveal>

        <ol className="mt-14 grid gap-8 md:grid-cols-3">
          {HOW_IT_WORKS.steps.map((step) => (
            <li key={step.step}>
              <LandingReveal>
                <article className="landing-card h-full p-6">
                  <span className="font-mono text-sm font-semibold text-[var(--landing-accent)]">
                    {step.step}
                  </span>
                  <h3 className="mt-3 text-lg font-semibold text-[var(--landing-text)]">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--landing-muted)]">{step.body}</p>
                </article>
              </LandingReveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
