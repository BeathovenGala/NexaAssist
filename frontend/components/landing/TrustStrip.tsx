import { TRUST_STRIP } from "./copy";

import { MarketingReveal } from "./MarketingReveal";



export function TrustStrip() {

  return (

    <section className="border-y border-white/10 bg-black py-10">

      <div className="marketing-container">

        <MarketingReveal className="flex flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left">

          <p className="text-sm font-medium text-neutral-400">{TRUST_STRIP.label}</p>

          <ul className="flex flex-wrap justify-center gap-3">

            {TRUST_STRIP.roles.map((role) => (

              <li

                key={role}

                className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium tracking-wide text-white/80 uppercase"

              >

                {role}

              </li>

            ))}

          </ul>

        </MarketingReveal>

      </div>

    </section>

  );

}

