import Link from "next/link";



import { BRAND, FOOTER, NAV_FOOTER_LINKS } from "./copy";



export function SiteFooter() {

  return (

    <footer className="border-t border-white/10 bg-black py-14">

      <div className="marketing-container">

        <div className="flex flex-col gap-10 md:flex-row md:justify-between">

          <div>

            <p className="marketing-display text-xl">{BRAND.name}</p>

            <p className="mt-2 text-sm text-neutral-400">{BRAND.tagline}</p>

            <p className="mt-6 text-xs tracking-wide text-neutral-500 uppercase">

              {FOOTER.copyright}

            </p>

          </div>



          <nav aria-label="Footer" className="flex flex-wrap gap-x-8 gap-y-3">

            {FOOTER.links.map((link) => (

              <Link

                key={link.label}

                href={link.href}

                className="marketing-nav-link text-neutral-400 hover:text-white"

              >

                {link.label}

              </Link>

            ))}

            {NAV_FOOTER_LINKS.map((link) => (

              <Link

                key={link.label}

                href={link.href}

                className="marketing-nav-link text-neutral-400 hover:text-white"

              >

                {link.label}

              </Link>

            ))}

          </nav>

        </div>



        <p className="mt-10 text-center text-xs text-neutral-500">

          Opt in to receive product updates. Unsubscribe anytime.

        </p>

      </div>

    </footer>

  );

}

