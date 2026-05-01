"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import Logo from "@/components/Logo";
import { logout } from "@/app/actions/auth";

const links = [
  // Virtual mailbox sits at the front — it's the primary digital product,
  // mirroring iPostal's "Virtual Mailbox" header link. Customers who never
  // intend to come into the store should see this first.
  { href: "/virtual-mailbox", label: "Virtual Mailbox", highlight: true },
  { href: "/services", label: "Services" },
  { href: "/delivery", label: "Delivery" },
  { href: "/shipping", label: "Get a Quote" },
  { href: "/pricing", label: "Pricing" },
  { href: "/business-solutions", label: "Business" },
  { href: "/notary", label: "Notary" },
  // Partners moved to footer per user request — keeps the top nav focused
  // on customer-facing services. The /partners route still exists; users
  // discover it from the footer or via direct link.
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
      className="sticky top-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? "rgba(247,230,194,0.92)" : "#F7E6C2",
        backdropFilter: scrolled ? "blur(14px) saturate(1.4)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(14px) saturate(1.4)" : "none",
        borderBottom: scrolled
          ? "1.5px solid rgba(45,16,15,0.18)"
          : "1.5px solid rgba(45,16,15,0.12)",
        boxShadow: scrolled ? "0 4px 18px rgba(45,16,15,0.08)" : "none",
      }}
    >
      <div className="max-w-6xl mx-auto px-5 py-2.5 flex items-center justify-between">
        {/* Logo — interactive: wax-seal shimmer + flag wave on hover */}
        <Link
          href="/"
          aria-label="NOHO Mailbox home"
          className="group relative flex items-center shrink-0"
        >
          <span
            aria-hidden="true"
            className="absolute -inset-2 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            style={{ background: "rgba(51,116,133,0.08)" }}
          />
          <Logo className="logo-interactive relative h-7 sm:h-8 w-auto transition-transform duration-300 group-hover:-rotate-[3deg] group-hover:scale-[1.06] group-active:scale-[0.97]" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1 text-[13px] font-semibold" style={{ color: "rgba(45,16,15,0.65)" }}>
          {links.map((l) =>
            l.highlight ? (
              <Link
                key={l.href}
                href={l.href}
                className="ml-1 mr-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-black uppercase tracking-[0.06em] transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  background: "rgba(51,116,133,0.10)",
                  color: "#23596A",
                  border: "1px solid rgba(51,116,133,0.30)",
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="6" width="18" height="13" rx="2" />
                  <path d="M3 8 L12 14 L21 8" />
                </svg>
                {l.label}
              </Link>
            ) : (
              <Link
                key={l.href}
                href={l.href}
                className="px-3 py-2 rounded-lg transition-all duration-200 hover:bg-[#337485]/10"
                style={{ color: "rgba(45,16,15,0.7)" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#2D100F"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(45,16,15,0.7)"; }}
              >
                {l.label}
              </Link>
            )
          )}
          {sessionUser ? (
            <div className="relative ml-3" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="group flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full transition-all duration-200 hover:bg-[#337485]/8"
                aria-label="Account menu"
              >
                {/* Branded avatar — mini mailbox card with initials. Flap lifts on hover. */}
                <div
                  className="relative w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-black overflow-hidden transition-transform duration-300 group-hover:-rotate-[3deg]"
                  style={{
                    background: "#F7E6C2",
                    border: "2px solid #2D100F",
                    color: "#2D100F",
                    fontFamily: "var(--font-baloo), sans-serif",
                  }}
                >
                  <span className="relative z-10 leading-none">{initials}</span>
                  {/* Mini blue flag in upper-right corner — peeks up on hover */}
                  <span
                    aria-hidden="true"
                    className="absolute right-[-2px] top-[-2px] w-2.5 h-3 transition-transform duration-300 origin-bottom-left group-hover:translate-y-[-2px]"
                    style={{ background: "#337485", border: "1.5px solid #2D100F", borderRadius: "1px" }}
                  />
                </div>
                <svg
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}
                  style={{ color: "rgba(45,16,15,0.5)" }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-2xl overflow-hidden z-50"
                  style={{
                    background: "white",
                    border: "1px solid #E8DDD0",
                    boxShadow: "var(--shadow-cream-md)",
                  }}
                >
                  <div className="px-4 py-3" style={{ background: "#F7E6C2", borderBottom: "1px solid #E8DDD0" }}>
                    <p className="text-sm font-black truncate" style={{ color: "#2D100F" }}>{sessionUser.name}</p>
                    <p className="text-xs truncate" style={{ color: "#5C4540" }}>{sessionUser.email}</p>
                    {sessionUser.role === "ADMIN" && (
                      <span
                        className="inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-[0.10em]"
                        style={{ background: "#337485", color: "white" }}
                      >
                        Admin
                      </span>
                    )}
                  </div>
                  <Link
                    href={dashHref}
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2.5 text-sm font-bold hover:bg-[#F8F2EA]"
                    style={{ color: "#2D100F" }}
                  >
                    {sessionUser.role === "ADMIN" ? "Admin Console" : "My Dashboard"}
                  </Link>
                  {sessionUser.role === "ADMIN" && (
                    <Link
                      href="/dashboard"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2.5 text-sm font-bold hover:bg-[#F8F2EA]"
                      style={{ color: "#2D100F" }}
                    >
                      Member View
                    </Link>
                  )}
                  <form action={logout} style={{ borderTop: "1px solid #E8DDD0" }}>
                    <button
                      type="submit"
                      className="w-full text-left px-4 py-2.5 text-sm font-bold hover:bg-[#FEE2E2]/40"
                      style={{ color: "var(--color-danger)" }}
                    >
                      Sign Out
                    </button>
                  </form>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 ml-3">
              {/* Track-a-shipment shortcut. Compact icon-only button so the
                  signup CTA stays the visual hero. Tooltip surfaces the
                  destination on hover. */}
              <Link
                href="/track"
                className="hidden md:inline-flex items-center justify-center w-9 h-9 rounded-xl transition-all"
                style={{
                  border: "1px solid rgba(45,16,15,0.18)",
                  color: "#2D100F",
                  background: "rgba(247,230,194,0.40)",
                }}
                title="Track a shipment"
                aria-label="Track a shipment"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="6" />
                  <path d="m17 17 4 4" />
                </svg>
              </Link>
              <Link
                href="/login"
                className="px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors"
                style={{ color: "rgba(45,16,15,0.7)" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#2D100F"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(45,16,15,0.7)"; }}
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 rounded-xl text-[13px] font-black transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  background: "#2D100F",
                  color: "#F7E6C2",
                  boxShadow: "0 4px 14px rgba(45,16,15,0.25)",
                }}
              >
                Request a Mailbox
              </Link>
            </div>
          )}
        </nav>

        {/* Mobile hamburger */}
        <button className="lg:hidden flex flex-col gap-1.5 p-2" onClick={() => setOpen(!open)} aria-label="Toggle menu">
          <span className={`block w-5 h-[1.5px] transition-all duration-300 ${open ? "rotate-45 translate-y-[7px]" : ""}`} style={{ background: "#2D100F" }} />
          <span className={`block w-5 h-[1.5px] transition-all duration-300 ${open ? "opacity-0" : ""}`} style={{ background: "#2D100F" }} />
          <span className={`block w-5 h-[1.5px] transition-all duration-300 ${open ? "-rotate-45 -translate-y-[7px]" : ""}`} style={{ background: "#2D100F" }} />
        </button>
      </div>

      {/* Mobile menu */}
      <div className={`lg:hidden overflow-hidden transition-all duration-300 ${open ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"}`}>
        <nav
          className="px-5 pb-5 pt-3 flex flex-col gap-0.5"
          style={{
            background: "#F7E6C2",
            borderTop: "1px solid #E8DDD0",
          }}
        >
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`font-bold text-sm transition-colors py-3 ${
                l.highlight ? "font-black inline-flex items-center gap-2" : ""
              }`}
              style={{
                color: l.highlight ? "#23596A" : "#2D100F",
                borderBottom: "1px solid #E8DDD0",
              }}
              onClick={() => setOpen(false)}
            >
              {l.highlight && (
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="6" width="18" height="13" rx="2" />
                  <path d="M3 8 L12 14 L21 8" />
                </svg>
              )}
              {l.label}
            </Link>
          ))}
          {sessionUser ? (
            <div className="mt-4 space-y-2">
              <div
                className="px-3 py-2.5 rounded-2xl"
                style={{ background: "white", border: "1px solid #E8DDD0" }}
              >
                <p className="text-sm font-black truncate" style={{ color: "#2D100F" }}>{sessionUser.name}</p>
                <p className="text-[11px] truncate" style={{ color: "#5C4540" }}>{sessionUser.email}</p>
              </div>
              <Link
                href={dashHref}
                onClick={() => setOpen(false)}
                className="block text-center font-black py-3 rounded-2xl text-[13px] uppercase tracking-[0.06em]"
                style={{
                  background: "linear-gradient(135deg, #2D100F 0%, #1F0807 100%)",
                  color: "#F7E6C2",
                  boxShadow: "0 6px 20px rgba(45,16,15,0.28)",
                }}
              >
                {sessionUser.role === "ADMIN" ? "Admin Console" : "My Dashboard"}
              </Link>
              <form action={logout}>
                <button
                  type="submit"
                  className="w-full text-center font-bold py-3 rounded-2xl"
                  style={{
                    background: "white",
                    color: "var(--color-danger)",
                    border: "1px solid rgba(239,68,68,0.30)",
                  }}
                >
                  Sign Out
                </button>
              </form>
            </div>
          ) : (
            <div className="flex gap-2 mt-4">
              <Link
                href="/login"
                className="flex-1 text-center font-bold py-3 rounded-2xl"
                style={{
                  background: "white",
                  color: "#2D100F",
                  border: "1px solid #E8DDD0",
                }}
                onClick={() => setOpen(false)}
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="flex-1 text-center font-black py-3 rounded-2xl text-[13px] uppercase tracking-[0.06em]"
                style={{
                  background: "linear-gradient(135deg, #2D100F 0%, #1F0807 100%)",
                  color: "#F7E6C2",
                  boxShadow: "0 6px 20px rgba(45,16,15,0.28)",
                }}
                onClick={() => setOpen(false)}
              >
                Request a Mailbox
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
