"use client";



import { Timeline } from "@/components/ui/timeline";



import { HOW_IT_WORKS } from "./copy";

import { MarketingReveal } from "./MarketingReveal";



export function HowItWorksSection() {

  const data = HOW_IT_WORKS.steps.map((step) => ({

    title: step.step,

    content: (

      <div>

        <h4 className="mb-2 text-lg font-semibold text-white">{step.title}</h4>

        <p className="text-sm leading-relaxed text-neutral-400">{step.body}</p>

      </div>

    ),

  }));



  return (

    <section aria-labelledby="how-heading" className="marketing-section bg-black">

      <div className="marketing-container">

        <MarketingReveal className="mx-auto mb-12 max-w-2xl text-center">

          <p className="marketing-eyebrow mb-3 text-white/50">{HOW_IT_WORKS.eyebrow}</p>

          <h2 id="how-heading" className="marketing-display text-3xl sm:text-4xl">

            {HOW_IT_WORKS.title}

          </h2>

        </MarketingReveal>

        <Timeline data={data} />

      </div>

    </section>

  );

}

