import Link from "next/link";
import Logo from "@/components/Logo";
import { LiveFooterStatus } from "@/components/LiveFooterStatus";
import { AiHeart } from "@/components/AnimatedIcons";
import NewsletterForm from "@/components/NewsletterForm";

const carrierLogos = ["USPS", "UPS", "FedEx", "DHL"];

export default function Footer() {
  return (
    <footer className="bg-bg-dark text-text-dark mt-auto">
      {/* Tracking lookup strip — anyone can paste a tracking number from any
          carrier and land on either a NOHO-branded receipt (if we shipped it)
          or the carrier's own tracking page (auto-detected). Hits /track. */}
      <div className="border-b border-white/[0.06] py-6">
        <form
          method="get"
          action="/track"
          className="max-w-3xl mx-auto px-5 flex items-center gap-2 flex-wrap sm:flex-nowrap"
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-dark-muted shrink-0">
            Track a shipment
          </span>
          <input
            type="text"
            name="n"
            placeholder="Paste any USPS / UPS / FedEx / DHL tracking number…"
            autoComplete="off"
            className="flex-1 min-w-[180px] rounded-xl px-3 py-2 text-sm bg-white/5 border border-white/10 text-text-dark placeholder:text-text-dark-muted/50 focus:outline-none focus:border-accent/60 font-mono"
            aria-label="Tracking number"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl text-xs font-black text-white transition-all hover:scale-[1.03] shrink-0"
            style={{ background: "#337485", boxShadow: "0 4px 14px rgba(51,116,133,0.40)" }}
          >
            Track →
          </button>
        </form>
      </div>

      {/* Carrier trust strip */}
      <div className="border-b border-white/[0.06] py-6">
        <div className="max-w-6xl mx-auto px-5 flex flex-wrap items-center justify-center gap-8">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-dark-muted">
            We accept packages from
          </span>
          {carrierLogos.map((c) => (
            <span key={c} className="text-sm font-bold text-text-dark-muted/60">{c}</span>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-5 py-14 grid grid-cols-2 md:grid-cols-5 gap-10">
        <div className="col-span-2 md:col-span-1">
          <Logo className="h-9 w-auto mb-4" />
          <p className="text-sm text-text-dark-muted leading-relaxed max-w-xs">
            Private mailbox rental with mail scanning, forwarding, and business services in North Hollywood, CA.
          </p>
          <div className="mt-5">
            <LiveFooterStatus />
          </div>
        </div>

        <div>
          <p className="font-semibold text-[11px] uppercase tracking-wider text-accent mb-4">
            Services
          </p>
          <ul className="space-y-2.5 text-sm text-text-dark-muted">
            <li><Link href="/services" className="hover:text-text-dark transition-colors">Mail & Packages</Link></li>
            <li><Link href="/delivery" className="hover:text-text-dark transition-colors">Same-Day Delivery</Link></li>
            <li><Link href="/shipping" className="hover:text-text-dark transition-colors">Shipping Rates</Link></li>
            <li><Link href="/notary" className="hover:text-text-dark transition-colors">Notary</Link></li>
            <li><Link href="/business-solutions" className="hover:text-text-dark transition-colors">Business Solutions</Link></li>
            <li><Link href="/shop" className="hover:text-text-dark transition-colors">Supplies</Link></li>
          </ul>
        </div>

        <div>
          <p className="font-semibold text-[11px] uppercase tracking-wider text-accent mb-4">
            Company
          </p>
          <ul className="space-y-2.5 text-sm text-text-dark-muted">
            <li><Link href="/pricing" className="hover:text-text-dark transition-colors">Pricing & Plans</Link></li>
            <li><Link href="/pricing#fees" className="hover:text-text-dark transition-colors">Fee Schedule</Link></li>
            <li><Link href="/compare" className="hover:text-text-dark transition-colors">Compare Plans</Link></li>
            <li><Link href="/partners" className="hover:text-text-dark transition-colors">Partner Program</Link></li>
            <li><Link href="/refer" className="hover:text-text-dark transition-colors">Refer a Friend</Link></li>
            <li><Link href="/faq" className="hover:text-text-dark transition-colors">FAQ</Link></li>
            <li><Link href="/resources" className="hover:text-text-dark transition-colors">Free Resources</Link></li>
            <li><Link href="/blog" className="hover:text-text-dark transition-colors">Blog</Link></li>
            <li><Link href="/contact" className="hover:text-text-dark transition-colors">Contact</Link></li>
          </ul>
        </div>

        <div>
          <p className="font-semibold text-[11px] uppercase tracking-wider text-accent mb-4">
            Visit Us
          </p>
          <address className="not-italic text-sm text-text-dark-muted space-y-1.5">
            <p>5062 Lankershim Blvd</p>
            <p>North Hollywood, CA 91601</p>
            <p className="mt-3">
              <a href="tel:+18185067744" className="hover:text-text-dark transition-colors">(818) 506-7744</a>
            </p>
            <p>
              <a href="mailto:nohomailbox@gmail.com" className="hover:text-text-dark transition-colors">nohomailbox@gmail.com</a>
            </p>
          </address>
        </div>

        <div className="col-span-2 md:col-span-1">
          <NewsletterForm source="footer" />
        </div>
      </div>

      {/* Policy strip */}
      <div className="border-t border-white/[0.06] py-5 px-5 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-x-1 gap-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-dark-muted/40 mr-3">Policies</span>
          <span className="text-text-dark-muted/20 mr-3">|</span>
          {[
            { label: "Privacy Policy", href: "/privacy" },
            { label: "Terms of Service", href: "/terms" },
            { label: "Package Holding", href: "/terms#holding" },
            { label: "Oversized Packages", href: "/terms#oversized" },
            { label: "Fee Schedule", href: "/pricing#fees" },
            { label: "CMRA Compliance", href: "/terms#cmra" },
            { label: "Security", href: "/security" },
          ].map((l, i, arr) => (
            <span key={l.href} className="flex items-center gap-x-1">
              <Link href={l.href} className="text-[11px] text-text-dark-muted/45 hover:text-text-dark-muted transition-colors">
                {l.label}
              </Link>
              {i < arr.length - 1 && <span className="text-text-dark-muted/20 ml-1">·</span>}
            </span>
          ))}
        </div>
      </div>

      <div className="border-t border-white/[0.04] py-4 px-5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-text-dark-muted/40">
            &copy; {new Date().getFullYear()} NOHO Mailbox &middot; CMRA Licensed &middot; 5062 Lankershim Blvd, North Hollywood CA 91601
          </p>
          <p className="text-[10px] text-text-dark-muted/40 inline-flex items-center gap-1.5" title="Family-owned and operated">
            Made with
            <AiHeart className="w-3.5 h-3.5" />
            in NoHo
          </p>
        </div>
      </div>
    </footer>
  );
}
