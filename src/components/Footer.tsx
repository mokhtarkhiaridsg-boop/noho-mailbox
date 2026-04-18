import Link from "next/link";
import Logo from "@/components/Logo";

const carrierLogos = ["USPS", "UPS", "FedEx", "DHL"];

export default function Footer() {
  return (
    <footer className="bg-bg-dark text-text-dark mt-auto">
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

      <div className="max-w-6xl mx-auto px-5 py-14 grid grid-cols-2 md:grid-cols-4 gap-10">
        <div className="col-span-2 md:col-span-1">
          <Logo className="h-12 w-auto mb-4" />
          <p className="text-sm text-text-dark-muted leading-relaxed max-w-xs">
            Private mailbox rental with mail scanning, forwarding, and business services in North Hollywood, CA.
          </p>
          <div className="mt-5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse-soft" />
            <span className="text-xs text-text-dark-muted">Open Mon–Fri 9:30–5:30, Sat 10–1:30</span>
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
            <li><Link href="/faq" className="hover:text-text-dark transition-colors">FAQ</Link></li>
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
              <a href="tel:+18187651539" className="hover:text-text-dark transition-colors">(818) 765-1539</a>
            </p>
            <p>
              <a href="mailto:hello@nohomailbox.org" className="hover:text-text-dark transition-colors">hello@nohomailbox.org</a>
            </p>
          </address>
        </div>
      </div>

      {/* Policy strip */}
      <div className="border-t border-white/[0.06] py-4 px-5 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {[
            { label: "Privacy Policy", href: "/privacy" },
            { label: "Terms of Service", href: "/terms" },
            { label: "Fee Schedule", href: "/pricing#fees" },
            { label: "CMRA Compliance", href: "/terms#cmra" },
            { label: "Security", href: "/security" },
          ].map((l) => (
            <Link key={l.href} href={l.href} className="text-[11px] text-text-dark-muted/45 hover:text-text-dark-muted transition-colors">
              {l.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="border-t border-white/[0.04] py-4 px-5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-text-dark-muted/40">
            &copy; {new Date().getFullYear()} NOHO Mailbox · CMRA Licensed · 5062 Lankershim Blvd, North Hollywood CA 91601
          </p>
          <p className="text-[10px] text-text-dark-muted/30">All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
