"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import Logo from "@/components/Logo";
import { logout } from "@/app/actions/auth";

const links = [
  { href: "/services", label: "Services" },
  { href: "/delivery", label: "Delivery" },
  { href: "/shipping", label: "Get a Quote" },
  { href: "/pricing", label: "Pricing" },
  { href: "/business-solutions", label: "Business" },
  { href: "/notary", label: "Notary" },
  { href: "/contact", label: "Contact" },
];

type SessionUser = { name: string; email: string; role: string } | null;

export default function Navbar({ sessionUser }: { sessionUser: SessionUser }) {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, []);

  const initials = sessionUser?.name
    ? sessionUser.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "";
  const dashHref = sessionUser?.role === "ADMIN" ? "/admin" : "/dashboard";

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-bg-dark/80 glass-card border-b border-white/[0.06] shadow-lg"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center shrink-0">
          <Logo className="h-10 w-auto" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1 text-[13px] font-medium text-text-dark-muted">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-3 py-2 rounded-lg hover:text-text-dark hover:bg-white/[0.06] transition-all duration-200"
            >
              {l.label}
            </Link>
          ))}
          {sessionUser ? (
            <div className="relative ml-3" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-full hover:bg-white/[0.08] transition-colors"
                aria-label="Account menu"
              >
                <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center text-[10px] font-bold">
                  {initials}
                </div>
                <svg className={`w-3.5 h-3.5 text-text-dark-muted transition-transform ${menuOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl overflow-hidden z-50 bg-surface-dark border border-border-dark shadow-[var(--shadow-xl)]">
                  <div className="px-4 py-3 border-b border-border-dark">
                    <p className="text-sm font-semibold text-text-dark truncate">{sessionUser.name}</p>
                    <p className="text-xs text-text-dark-muted truncate">{sessionUser.email}</p>
                    {sessionUser.role === "ADMIN" && (
                      <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-accent text-white">Admin</span>
                    )}
                  </div>
                  <Link href={dashHref} onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 text-sm text-text-dark hover:bg-white/[0.06]">
                    {sessionUser.role === "ADMIN" ? "Admin Console" : "My Dashboard"}
                  </Link>
                  {sessionUser.role === "ADMIN" && (
                    <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="block px-4 py-2.5 text-sm text-text-dark hover:bg-white/[0.06]">
                      Member View
                    </Link>
                  )}
                  <form action={logout} className="border-t border-border-dark">
                    <button type="submit" className="w-full text-left px-4 py-2.5 text-sm text-danger hover:bg-danger/10">
                      Sign Out
                    </button>
                  </form>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 ml-3">
              <Link href="/login" className="text-text-dark-muted hover:text-text-dark px-3 py-2 rounded-lg transition-colors">
                Sign In
              </Link>
              <Link
                href="/signup"
                className="bg-accent text-white px-4 py-2 rounded-lg font-semibold text-[13px] hover:bg-accent-hover transition-colors shadow-[0_2px_8px_rgba(51,116,181,0.3)]"
              >
                Get Started
              </Link>
            </div>
          )}
        </nav>

        {/* Mobile hamburger */}
        <button className="lg:hidden flex flex-col gap-1.5 p-2" onClick={() => setOpen(!open)} aria-label="Toggle menu">
          <span className={`block w-5 h-[1.5px] bg-text-dark transition-all duration-300 ${open ? "rotate-45 translate-y-[7px]" : ""}`} />
          <span className={`block w-5 h-[1.5px] bg-text-dark transition-all duration-300 ${open ? "opacity-0" : ""}`} />
          <span className={`block w-5 h-[1.5px] bg-text-dark transition-all duration-300 ${open ? "-rotate-45 -translate-y-[7px]" : ""}`} />
        </button>
      </div>

      {/* Mobile menu */}
      <div className={`lg:hidden overflow-hidden transition-all duration-300 ${open ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"}`}>
        <nav className="bg-bg-dark/95 glass-card border-t border-white/[0.06] px-5 pb-5 pt-3 flex flex-col gap-0.5">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-text-dark font-medium text-sm hover:text-accent transition-colors py-3 border-b border-white/[0.05]"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          {sessionUser ? (
            <div className="mt-4 space-y-2">
              <div className="px-3 py-2.5 rounded-xl bg-surface-dark border border-border-dark">
                <p className="text-sm font-semibold text-text-dark truncate">{sessionUser.name}</p>
                <p className="text-[11px] text-text-dark-muted truncate">{sessionUser.email}</p>
              </div>
              <Link href={dashHref} onClick={() => setOpen(false)} className="block text-center bg-accent text-white font-semibold py-3 rounded-xl">
                {sessionUser.role === "ADMIN" ? "Admin Console" : "My Dashboard"}
              </Link>
              <form action={logout}>
                <button type="submit" className="w-full text-center text-danger font-semibold py-3 rounded-xl border border-danger/20">
                  Sign Out
                </button>
              </form>
            </div>
          ) : (
            <div className="flex gap-2 mt-4">
              <Link href="/login" className="flex-1 text-center text-text-dark font-semibold py-3 rounded-xl border border-white/[0.1]" onClick={() => setOpen(false)}>
                Sign In
              </Link>
              <Link href="/signup" className="flex-1 bg-accent text-white text-center font-semibold py-3 rounded-xl" onClick={() => setOpen(false)}>
                Get Started
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
