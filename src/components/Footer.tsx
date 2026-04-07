import Link from "next/link";
import Logo from "@/components/Logo";

export default function Footer() {
  return (
    <footer className="bg-[#2D1D0F] text-[#F7E6C2] mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-3 gap-10">
        <div>
          <Logo className="h-16 w-auto mb-3" />
          <p className="text-sm text-[#F7E6C2]/55 leading-relaxed">
            Your neighborhood mailbox — smarter.
          </p>
        </div>

        <div>
          <p className="font-bold text-xs uppercase tracking-widest text-[#3374B5] mb-4">
            Services
          </p>
          <ul className="space-y-2.5 text-sm text-[#F7E6C2]/70">
            <li><Link href="/services" className="hover:text-[#3374B5] transition-colors">Mail Scanning</Link></li>
            <li><Link href="/services" className="hover:text-[#3374B5] transition-colors">Mail Forwarding</Link></li>
            <li><Link href="/services" className="hover:text-[#3374B5] transition-colors">Package Pickup</Link></li>
            <li><Link href="/notary" className="hover:text-[#3374B5] transition-colors">Notary Services</Link></li>
            <li><Link href="/business-solutions" className="hover:text-[#3374B5] transition-colors">Business Solutions</Link></li>
            <li><Link href="/delivery" className="hover:text-[#3374B5] transition-colors">Same-Day Delivery</Link></li>
            <li><Link href="/shop" className="hover:text-[#3374B5] transition-colors">Shipping Supplies</Link></li>
          </ul>
        </div>

        <div>
          <p className="font-bold text-xs uppercase tracking-widest text-[#3374B5] mb-4">
            Company
          </p>
          <ul className="space-y-2.5 text-sm text-[#F7E6C2]/70">
            <li><Link href="/pricing" className="hover:text-[#3374B5] transition-colors">Pricing</Link></li>
            <li><Link href="/contact" className="hover:text-[#3374B5] transition-colors">Contact Us</Link></li>
            <li><Link href="/faq" className="hover:text-[#3374B5] transition-colors">FAQ</Link></li>
            <li><Link href="/blog" className="hover:text-[#3374B5] transition-colors">Blog</Link></li>
            <li><Link href="/compare" className="hover:text-[#3374B5] transition-colors">Compare</Link></li>
            <li><Link href="/security" className="hover:text-[#3374B5] transition-colors">Security</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[#F7E6C2]/8 text-center py-5 text-xs text-[#F7E6C2]/30">
        © {new Date().getFullYear()} NOHO Mailbox. All rights reserved.
      </div>
    </footer>
  );
}
