"use client";



import { Pricing } from "@/components/ui/pricing";



import { PRICING_SECTION, PRICING_TIERS } from "./copy";



export function MarketingPricingSection() {

  const plans = PRICING_TIERS.map((tier) => {

    const monthlyNum = tier.price.startsWith("$")

      ? String(Math.round(parseFloat(tier.price.replace("$", ""))))

      : tier.price;

    const yearlyNum =

      tier.price.startsWith("$")

        ? String(Math.round(parseFloat(tier.price.replace("$", "")) * 0.8))

        : tier.price;



    return {

      name: tier.name.toUpperCase(),

      price: monthlyNum,

      yearlyPrice: yearlyNum,

      period: tier.period || "per month",

      features: [...tier.features],

      description: tier.description,

      buttonText: tier.ctaLabel,

      href: tier.ctaModal === "register" ? "/?auth=register" : "/?auth=login",

      isPopular: tier.highlighted,

    };

  });



  return (

    <section id="pricing" aria-labelledby="pricing-heading" className="marketing-section bg-[var(--bg-main)]">

      <Pricing

        plans={plans}

        title={PRICING_SECTION.title}

        description={PRICING_SECTION.subtitle}

      />

    </section>

  );

}

