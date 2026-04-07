"use client";

import Link from "next/link";
import { useState } from "react";
import Logo from "@/components/Logo";

const links = [
  { href: "/services", label: "Services" },
  { href: "/delivery", label: "Delivery" },
  { href: "/shop", label: "Shop" },
  { href: "/pricing", label: "Pricing" },
  { href: "/business-solutions", label: "Business Solutions" },
  { href: "/notary", label: "Notary" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="bg-[#F7E6C2] sticky top-0 z-50 shadow-sm border-b border-[#2D1D0F]/10">
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <Logo className="h-12 w-auto" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-4 text-sm font-semibold text-[#2D1D0F]">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="hover:text-[#3374B5] transition-colors duration-200"
            >
              {l.label}
            </Link>
          ))}
          <div className="flex items-center gap-2 ml-2">
            <Link
              href="/login"
              className="text-[#2D1D0F]/70 hover:text-[#3374B5] px-4 py-2 rounded-full transition-colors duration-200"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="bg-[#3374B5] text-white px-5 py-2.5 rounded-full hover:bg-[#2960A0] transition-colors duration-200 shadow-sm"
            >
              Get a Mailbox
            </Link>
          </div>
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-2"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          <span className={`block w-6 h-0.5 bg-[#2D1D0F] transition-all duration-300 ${open ? "rotate-45 translate-y-2" : ""}`} />
          <span className={`block w-6 h-0.5 bg-[#2D1D0F] transition-all duration-300 ${open ? "opacity-0" : ""}`} />
          <span className={`block w-6 h-0.5 bg-[#2D1D0F] transition-all duration-300 ${open ? "-rotate-45 -translate-y-2" : ""}`} />
        </button>
      </div>

      {/* Mobile menu */}
      <div className={`md:hidden overflow-hidden transition-all duration-300 ${open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
        <nav className="bg-[#F7E6C2] border-t border-[#2D1D0F]/10 px-4 pb-4 pt-2 flex flex-col gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-[#2D1D0F] font-semibold text-sm hover:text-[#3374B5] transition-colors py-2.5 border-b border-[#2D1D0F]/5"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <div className="flex gap-2 mt-3">
            <Link
              href="/login"
              className="flex-1 text-center text-[#2D1D0F] font-bold py-3 rounded-full border border-[#2D1D0F]/15 hover:bg-white/50 transition-colors"
              onClick={() => setOpen(false)}
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="flex-1 bg-[#3374B5] text-white text-center font-bold py-3 rounded-full hover:bg-[#2960A0] transition-colors"
              onClick={() => setOpen(false)}
            >
              Sign Up
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
