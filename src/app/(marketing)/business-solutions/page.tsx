"use client";

import Link from "next/link";
import { MailboxIcon } from "@/components/BrandIcons";
import { AiHeart, AiSparkle } from "@/components/AnimatedIcons";
import { useState } from "react";

/* ─────────────────────────────────────────────────────────────
   BRANDED SVG ICONS — every icon is unique, uses brand palette
   Light #EBF2FA · Blue #337485 · Ink #1A1714
   ───────────────────────────────────────────────────────────── */

/* 1 – LLC Document with badge */
const IconLLC = ({ className = "w-11 h-11" }: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={className} fill="none">
    <rect x="6" y="8" width="36" height="32" rx="5" fill="#EBF2FA" stroke="#1A1714" strokeWidth="2" />
    <path d="M13 20 H35 M13 27 H28" stroke="#337485" strokeWidth="2" strokeLinecap="round" />
    <circle cx="36" cy="14" r="7" fill="#337485" stroke="#1A1714" strokeWidth="1.5" />
    <path d="M33 14 L35.5 16.5 L39 11.5" stroke="#EBF2FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* 2 – EIN number card */
const IconEIN = ({ className = "w-11 h-11" }: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={className} fill="none">
    <rect x="8" y="6" width="32" height="36" rx="4" fill="#EBF2FA" stroke="#1A1714" strokeWidth="2" />
    <rect x="12" y="12" width="24" height="6" rx="2" fill="#337485" opacity="0.25" />
    <text x="24" y="33" textAnchor="middle" fill="#337485" fontSize="13" fontWeight="bold">EIN</text>
    <path d="M12 22 H36" stroke="#1A1714" strokeWidth="1" opacity="0.15" />
  </svg>
);

/* 3 – Filing cabinet with tabs */
const IconFiling = ({ className = "w-11 h-11" }: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={className} fill="none">
    <rect x="6" y="10" width="36" height="30" rx="4" fill="#EBF2FA" stroke="#1A1714" strokeWidth="2" />
    <rect x="10" y="4" width="12" height="10" rx="3" fill="#337485" stroke="#1A1714" strokeWidth="1.5" />
    <rect x="26" y="4" width="12" height="10" rx="3" fill="#337485" stroke="#1A1714" strokeWidth="1.5" />
    <path d="M12 20 H36 M12 26 H30 M12 32 H34" stroke="#1A1714" strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
  </svg>
);

/* 4 – Brand book with spine */
const IconBrandBook = ({ className = "w-11 h-11" }: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={className} fill="none">
    <path d="M10 6 C10 4 12 2 14 2 L38 2 C40 2 42 4 42 6 L42 42 C42 44 40 46 38 46 L14 46 C12 46 10 44 10 42 Z" fill="#EBF2FA" stroke="#1A1714" strokeWidth="2" />
    <path d="M10 6 L10 42" stroke="#337485" strokeWidth="4" />
    <circle cx="26" cy="18" r="6" fill="#337485" opacity="0.6" />
    <rect x="18" y="28" width="18" height="3" rx="1.5" fill="#337485" opacity="0.35" />
    <rect x="20" y="34" width="14" height="3" rx="1.5" fill="#337485" opacity="0.2" />
  </svg>
);

/* 5 – Image + layout (brand assets) */
const IconBrandAssets = ({ className = "w-11 h-11" }: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={className} fill="none">
    <rect x="2" y="8" width="28" height="22" rx="4" fill="#EBF2FA" stroke="#1A1714" strokeWidth="2" />
    <circle cx="13" cy="16" r="4" fill="#337485" opacity="0.5" />
    <path d="M4 26 L12 20 L19 25 L26 18 L29 22" stroke="#337485" strokeWidth="2" strokeLinejoin="round" fill="none" />
    <rect x="20" y="20" width="26" height="22" rx="4" fill="#EBF2FA" stroke="#1A1714" strokeWidth="2" />
    <path d="M26 28 H40 M26 33 H36 M26 38 H34" stroke="#337485" strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />
  </svg>
);

/* 6 – Browser window (website) */
const IconWebsite = ({ className = "w-11 h-11" }: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={className} fill="none">
    <rect x="4" y="8" width="40" height="28" rx="4" fill="#EBF2FA" stroke="#1A1714" strokeWidth="2" />
    <path d="M4 15 H44" stroke="#1A1714" strokeWidth="1.5" />
    <circle cx="10" cy="11.5" r="2" fill="#337485" />
    <circle cx="16" cy="11.5" r="2" fill="#337485" opacity="0.5" />
    <circle cx="22" cy="11.5" r="2" fill="#337485" opacity="0.25" />
    <rect x="8" y="18" width="14" height="8" rx="2" fill="#337485" opacity="0.2" />
    <path d="M26 19 H40 M26 23 H36 M26 27 H32" stroke="#337485" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
    <path d="M20 36 L24 40 L28 36" stroke="#1A1714" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* 7 – Magnifying glass + arrow (SEO) */
const IconSEO = ({ className = "w-11 h-11" }: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={className} fill="none">
    <circle cx="20" cy="20" r="13" fill="#EBF2FA" stroke="#1A1714" strokeWidth="2" />
    <path d="M30 30 L42 42" stroke="#1A1714" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M14 20 L20 14 L26 20" stroke="#337485" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M20 14 L20 27" stroke="#337485" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

/* 8 – Network nodes (social media) */
const IconSocial = ({ className = "w-11 h-11" }: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={className} fill="none">
    <rect x="6" y="6" width="36" height="36" rx="10" fill="#EBF2FA" stroke="#1A1714" strokeWidth="2" />
    <circle cx="16" cy="18" r="4" fill="#337485" />
    <circle cx="32" cy="18" r="4" fill="#337485" opacity="0.55" />
    <circle cx="24" cy="34" r="4" fill="#337485" opacity="0.35" />
    <path d="M19.5 20 L29 20 M30 21.5 L26 31 M20 21.5 L22 31" stroke="#1A1714" strokeWidth="1.5" />
  </svg>
);

/* 9 – Map pin with chart (Google Business) */
const IconGoogle = ({ className = "w-11 h-11" }: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={className} fill="none">
    <circle cx="24" cy="24" r="18" fill="#EBF2FA" stroke="#1A1714" strokeWidth="2" />
    <path d="M24 12 A12 12 0 1 0 36 24 L24 24" fill="#337485" stroke="#1A1714" strokeWidth="1.5" />
    <circle cx="24" cy="24" r="5" fill="#EBF2FA" stroke="#1A1714" strokeWidth="1.5" />
    <path d="M17 9 L17 5 M31 9 L31 5 M11 17 L7 17 M11 31 L7 31" stroke="#337485" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
  </svg>
);

/* 10 – Envelope with 12-month badge */
const IconMail12 = ({ className = "w-11 h-11" }: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={className} fill="none">
    <rect x="4" y="12" width="40" height="26" rx="5" fill="#EBF2FA" stroke="#1A1714" strokeWidth="2" />
    <path d="M6 14 L24 26 L42 14" stroke="#1A1714" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="38" cy="12" r="7" fill="#337485" stroke="#1A1714" strokeWidth="1.5" />
    <text x="38" y="15.5" textAnchor="middle" fill="#EBF2FA" fontSize="9" fontWeight="bold">12</text>
  </svg>
);

/* ── Brand Management icons (6 unique) ─────────────────────── */

const IconTarget = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={className} fill="none">
    <circle cx="24" cy="24" r="20" fill="#EBF2FA" stroke="#1A1714" strokeWidth="2" />
    <circle cx="24" cy="24" r="13" stroke="#337485" strokeWidth="2" opacity="0.4" />
    <circle cx="24" cy="24" r="6" fill="#337485" />
    <path d="M36 12 L28 20 M36 12 L36 18 M36 12 L30 12" stroke="#1A1714" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconPalette = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={className} fill="none">
    <path d="M24 4 C12 4 4 14 4 24 C4 34 12 44 24 44 C26 44 28 42 28 40 C28 39 27.5 38 27 37.5 C26.5 37 26 36 26 35 C26 33 28 31 30 31 L34 31 C39.5 31 44 26.5 44 21 C44 11.6 35 4 24 4Z" fill="#EBF2FA" stroke="#1A1714" strokeWidth="2" />
    <circle cx="14" cy="20" r="3" fill="#337485" />
    <circle cx="22" cy="12" r="3" fill="#337485" opacity="0.7" />
    <circle cx="32" cy="14" r="3" fill="#337485" opacity="0.45" />
    <circle cx="14" cy="30" r="3" fill="#1A1714" opacity="0.3" />
  </svg>
);

const IconMegaphone = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={className} fill="none">
    <path d="M36 8 L36 40 L14 30 L14 18 Z" fill="#EBF2FA" stroke="#1A1714" strokeWidth="2" strokeLinejoin="round" />
    <rect x="8" y="18" width="6" height="12" rx="3" fill="#337485" stroke="#1A1714" strokeWidth="2" />
    <path d="M14 30 L16 40 L20 40 L18 30" fill="#337485" stroke="#1A1714" strokeWidth="1.5" strokeLinejoin="round" />
    <circle cx="40" cy="10" r="3" fill="#337485" opacity="0.4" />
    <circle cx="42" cy="20" r="2" fill="#337485" opacity="0.25" />
  </svg>
);

const IconPrinter = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={className} fill="none">
    <rect x="6" y="18" width="36" height="18" rx="3" fill="#EBF2FA" stroke="#1A1714" strokeWidth="2" />
    <path d="M12 18 L12 6 L36 6 L36 18" stroke="#1A1714" strokeWidth="2" />
    <rect x="12" y="26" width="24" height="16" rx="2" fill="white" stroke="#1A1714" strokeWidth="1.5" />
    <path d="M16 31 H32 M16 35 H28 M16 39 H24" stroke="#337485" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    <circle cx="36" cy="22" r="2.5" fill="#337485" />
  </svg>
);

const IconChart = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={className} fill="none">
    <rect x="6" y="6" width="36" height="36" rx="4" fill="#EBF2FA" stroke="#1A1714" strokeWidth="2" />
    <rect x="12" y="26" width="5" height="10" rx="1" fill="#337485" opacity="0.35" />
    <rect x="21" y="18" width="5" height="18" rx="1" fill="#337485" opacity="0.6" />
    <rect x="30" y="12" width="5" height="24" rx="1" fill="#337485" />
    <path d="M12 16 L20 20 L28 12 L36 8" stroke="#1A1714" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
  </svg>
);

const IconRefresh = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={className} fill="none">
    <circle cx="24" cy="24" r="18" fill="#EBF2FA" stroke="#1A1714" strokeWidth="2" />
    <path d="M16 18 A10 10 0 0 1 34 20" stroke="#337485" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M32 30 A10 10 0 0 1 14 28" stroke="#337485" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M34 16 L34 22 L28 22" stroke="#337485" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14 26 L14 32 L20 32" stroke="#337485" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ── Standalone section icons (6 unique, larger) ───────────── */

const IconFormation = ({ className = "w-14 h-14" }: { className?: string }) => (
  <svg viewBox="0 0 56 56" className={className} fill="none">
    <rect x="8" y="12" width="40" height="32" rx="5" fill="#EBF2FA" stroke="#1A1714" strokeWidth="2.5" />
    <path d="M16 24 H40 M16 30 H32 M16 36 H28" stroke="#337485" strokeWidth="2" strokeLinecap="round" />
    <path d="M40 8 L44 12 L40 16" stroke="#337485" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconBrandCircle = ({ className = "w-14 h-14" }: { className?: string }) => (
  <svg viewBox="0 0 56 56" className={className} fill="none">
    <circle cx="28" cy="28" r="22" fill="#EBF2FA" stroke="#1A1714" strokeWidth="2.5" />
    <path d="M20 22 L28 16 L36 22 L36 34 L28 40 L20 34 Z" fill="#337485" opacity="0.2" stroke="#337485" strokeWidth="1.5" strokeLinejoin="round" />
    <circle cx="28" cy="28" r="5" fill="#337485" />
  </svg>
);

const IconCode = ({ className = "w-14 h-14" }: { className?: string }) => (
  <svg viewBox="0 0 56 56" className={className} fill="none">
    <rect x="6" y="10" width="44" height="32" rx="5" fill="#EBF2FA" stroke="#1A1714" strokeWidth="2.5" />
    <path d="M6 18 H50" stroke="#1A1714" strokeWidth="2" />
    <circle cx="13" cy="14" r="2.5" fill="#337485" />
    <circle cx="20" cy="14" r="2.5" fill="#337485" opacity="0.5" />
    <path d="M18 28 L14 32 L18 36" stroke="#337485" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M34 28 L38 32 L34 36" stroke="#337485" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M28 26 L24 38" stroke="#337485" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const IconShare = ({ className = "w-14 h-14" }: { className?: string }) => (
  <svg viewBox="0 0 56 56" className={className} fill="none">
    <rect x="6" y="6" width="44" height="44" rx="12" fill="#EBF2FA" stroke="#1A1714" strokeWidth="2.5" />
    <circle cx="28" cy="18" r="5" fill="#337485" />
    <circle cx="16" cy="36" r="5" fill="#337485" opacity="0.55" />
    <circle cx="40" cy="36" r="5" fill="#337485" opacity="0.35" />
    <path d="M26 22 L19 32 M30 22 L37 32" stroke="#1A1714" strokeWidth="1.5" />
  </svg>
);

const IconPrintLarge = ({ className = "w-14 h-14" }: { className?: string }) => (
  <svg viewBox="0 0 56 56" className={className} fill="none">
    <rect x="6" y="20" width="44" height="22" rx="4" fill="#EBF2FA" stroke="#1A1714" strokeWidth="2.5" />
    <path d="M14 20 L14 10 L42 10 L42 20" stroke="#1A1714" strokeWidth="2.5" />
    <rect x="14" y="28" width="28" height="18" rx="3" fill="white" stroke="#1A1714" strokeWidth="1.5" />
    <circle cx="42" cy="24" r="3" fill="#337485" />
    <path d="M18 33 H38 M18 37 H34 M18 41 H30" stroke="#337485" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
  </svg>
);

/* ── How-It-Works icons ────────────────────────────────────── */

const IconQuestion = () => (
  <svg viewBox="0 0 48 48" className="w-12 h-12 mx-auto mb-4" fill="none">
    <circle cx="24" cy="24" r="20" fill="#EBF2FA" stroke="#1A1714" strokeWidth="2" />
    <path d="M17 24 Q17 16 24 16 Q31 16 31 21 Q31 26 24 26 L24 30" stroke="#337485" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    <circle cx="24" cy="36" r="2" fill="#337485" />
  </svg>
);

const IconChecklist = () => (
  <svg viewBox="0 0 48 48" className="w-12 h-12 mx-auto mb-4" fill="none">
    <rect x="8" y="8" width="32" height="32" rx="8" fill="#EBF2FA" stroke="#1A1714" strokeWidth="2" />
    <path d="M16 20 L21 25 L32 14" stroke="#337485" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16 30 L21 35 L32 24" stroke="#337485" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.35" />
  </svg>
);

const IconRocket = () => (
  <svg viewBox="0 0 48 48" className="w-12 h-12 mx-auto mb-4" fill="none">
    <path d="M24 6 C24 6 16 14 16 28 L20 32 L24 30 L28 32 L32 28 C32 14 24 6 24 6Z" fill="#EBF2FA" stroke="#1A1714" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="24" cy="20" r="4" fill="#337485" />
    <path d="M16 28 L10 30 L14 34 L16 28Z" fill="#337485" opacity="0.3" stroke="#1A1714" strokeWidth="1.5" />
    <path d="M32 28 L38 30 L34 34 L32 28Z" fill="#337485" opacity="0.3" stroke="#1A1714" strokeWidth="1.5" />
    <path d="M20 36 L24 42 L28 36" stroke="#337485" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ── data ──────────────────────────────────────────────────── */

const packageServices = [
  { icon: <IconLLC />, label: "LLC, DBA, S-Corp, or C-Corp formation — your entity, filed right", cat: "Formation" },
  { icon: <IconEIN />, label: "Federal EIN and state tax ID registration handled for you", cat: "Formation" },
  { icon: <IconFiling />, label: "All incorporation, compliance, and regulatory filings completed", cat: "Formation" },
  { icon: <IconBrandBook />, label: "Custom brand book — logo, color palette, and typography system", cat: "Branding" },
  { icon: <IconBrandAssets />, label: "Branded assets ready for web, social, print, and packaging", cat: "Branding" },
  { icon: <IconWebsite />, label: "Live, mobile-first website with your domain and hosting included", cat: "Digital" },
  { icon: <IconSEO />, label: "SEO foundation — local search, Google indexing, and meta setup", cat: "Digital" },
  { icon: <IconSocial />, label: "Social profiles created, branded, and optimized for engagement", cat: "Digital" },
  { icon: <IconGoogle />, label: "Verified Google Business Profile to dominate local search", cat: "Digital" },
  { icon: <IconMail12 />, label: "12 months of professional mail receipt, scanning, and forwarding", cat: "Mail" },
];

const brandMgmt = [
  { icon: <IconPalette />, title: "Full Website Management", desc: "We run your website end-to-end — content updates, design refreshes, performance, and uptime — so you never touch the backend." },
  { icon: <IconPrinter />, title: "Brand Print Management", desc: "Business cards, flyers, signage, packaging, menus, labels — designed, printed, and refreshed on your schedule." },
  { icon: <IconRefresh />, title: "Seasonal & Holiday Adaptation", desc: "Your brand stays current. Spring, summer, back-to-school, Halloween, Black Friday, holidays — we adapt visuals and offers automatically." },
  { icon: <IconMegaphone />, title: "Marketing Strategy Execution", desc: "We don't just write the plan — we run it. Campaigns, social posts, email blasts, promos, and launches handled for you." },
  { icon: <IconChart />, title: "Performance Reporting", desc: "Monthly reports on traffic, engagement, and conversions — so you always know what's working and what's next." },
  { icon: <IconTarget />, title: "Brand Consistency Audit", desc: "Every touchpoint reviewed against your brand system to keep your look, voice, and message tight everywhere." },
];

const serviceMenu = {
  "Business & Legal": [
    "LLC / Corp Formation", "DBA Registration", "EIN & Tax ID Filing", "Business Plan Writing",
    "Financial Consulting", "Legal Document Prep", "Contract Drafting", "Business Licensing",
    "Trademark Filing", "Virtual Assistant",
  ],
  "Branding & Design": [
    "Logo Design", "Brand Guidelines", "Brand Strategy", "Business Card Design",
    "Letterhead & Stationery", "Packaging Design", "Label Design", "Flyer & Brochure Design",
    "Banner & Signage Design", "Presentation Design",
  ],
  "Web & Digital": [
    "Website Design", "Website Development", "Landing Page Design", "E-Commerce Setup",
    "Domain & Hosting Setup", "Website Maintenance", "Mobile App UI Design", "WordPress Setup",
    "Website Speed Optimization", "Web Accessibility Audit",
  ],
  "Marketing & SEO": [
    "SEO Setup & Optimization", "Google Business Profile", "Social Media Setup", "Social Media Management",
    "Email Marketing Setup", "Content Strategy", "Google Ads Setup", "Local SEO & Citations",
    "Influencer Outreach", "Marketing Strategy",
  ],
  "Content & Media": [
    "Copywriting", "Blog Writing", "Product Descriptions", "Video Editing",
    "Explainer Videos", "Photography Editing", "Podcast Setup", "Voiceover Services",
    "Social Media Content", "Press Release Writing",
  ],
};

const filterTabs = ["All", "Formation", "Branding", "Digital", "Mail"];
const serviceCategories = Object.keys(serviceMenu);

export default function BusinessSolutionsPage() {
  const [filter, setFilter] = useState("All");
  const [activeServiceCat, setActiveServiceCat] = useState(serviceCategories[0]);
  const filtered = filter === "All" ? packageServices : packageServices.filter((s) => s.cat === filter);

  return (
    <div className="perspective-container">
      {/* ─── HERO ─── */}
      <section className="relative py-32 md:py-40 px-4 overflow-hidden bg-bg-dark">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[120px] pointer-events-none bg-accent" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[350px] h-[350px] rounded-full opacity-10 blur-[100px] pointer-events-none bg-accent" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          {/* Family-owned heritage pill — Tunisian red, restrained */}
          <div className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 mb-4 animate-fade-up text-[11px] font-bold uppercase tracking-[0.14em]"
               style={{ background: "rgba(231,0,19,0.12)", color: "#FFB4BB", border: "1px solid rgba(231,0,19,0.28)" }}>
            <AiHeart className="w-3.5 h-3.5" />
            Family-owned in NoHo
          </div>

          <div className="inline-flex items-center gap-2 glass-dark rounded-full px-5 py-2 mb-8 animate-fade-up delay-100">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse-glow" />
            <span className="text-text-dark-muted text-xs font-bold uppercase tracking-widest">
              Formation &middot; Branding &middot; Launch
            </span>
          </div>

          <h1
            className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight text-transparent bg-clip-text animate-gradient animate-scale-in leading-[1.05]"
            style={{ backgroundImage: "linear-gradient(135deg, #EBF2FA 0%, #fff 30%, #337485 55%, #fff 80%, #EBF2FA 100%)", backgroundSize: "200% 200%" }}
          >
            Your Business,
            <br />
            Built by Us
          </h1>

          <p className="text-text-dark-muted max-w-xl mx-auto text-lg mt-8 mb-5 animate-fade-up delay-200 leading-relaxed">
            From LLC formation to a live website and 12 months of mail — one flat fee, one team,
            zero loose ends. Or book any service as a standalone consultation.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mt-10 animate-fade-up delay-400">
            <Link
              href="#package"
              className="group inline-flex items-center gap-2 font-bold px-8 py-4 rounded-xl text-white transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-accent to-accent-hover shadow-xl"
            >
              See the Full Package
              <svg viewBox="0 0 16 16" className="w-4 h-4 transition-transform group-hover:translate-y-0.5" fill="none"><path d="M8 3 L8 13 M4 9 L8 13 L12 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
            <Link href="#brand-management" className="glass-dark text-text-dark font-bold px-8 py-4 rounded-xl transition-all duration-300 hover:-translate-y-1 hover:bg-bg-light/10">
              Brand Management
            </Link>
          </div>
        </div>
      </section>

      {/* ─── PACKAGE ─── */}
      <section id="package" className="py-24 px-4 bg-bg-light relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(#1A1714 1px, transparent 1px)", backgroundSize: "20px 20px" }} />

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-text-light mb-4 animate-slide-up-3d">
              The All-Inclusive Package
            </h2>
            <p className="text-text-light-muted max-w-lg mx-auto animate-fade-up delay-200">
              Ten services. One invoice. Everything you need from day one to launch day.
            </p>
          </div>

          {/* Price Card */}
          <div className="flex justify-center mb-16">
            <div className="card-3d neon-edge rounded-[2rem] px-14 md:px-16 py-10 md:py-12 text-center animate-scale-in delay-300 relative"
              style={{ background: "linear-gradient(160deg, var(--color-accent) 0%, var(--color-accent-hover) 100%)", boxShadow: "0 30px 80px rgba(51,116,133,0.3), 0 0 0 1px rgba(255,255,255,0.1) inset" }}
            >
              <div className="absolute inset-0 rounded-[2rem] overflow-hidden"><div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-white/10 to-transparent rotate-12" /></div>
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 bg-surface-light/10 rounded-full px-4 py-1.5 mb-5">
                  <AiSparkle className="w-4 h-4" />
                  <span className="text-xs font-bold text-white/80 uppercase tracking-wider">Best Value</span>
                </div>
                <p className="text-xs uppercase tracking-[0.2em] font-bold text-white/50 mb-2">All 10 Services Included</p>
                <p className="text-7xl md:text-8xl font-extrabold text-white tracking-tight">$2,000</p>
                <p className="text-white/50 text-sm mt-3">One-time flat fee &middot; No subscriptions</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap justify-center gap-2 mb-10 animate-fade-up delay-400">
            {filterTabs.map((t) => (
              <button key={t} onClick={() => setFilter(t)}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${filter === t ? "bg-bg-dark text-text-dark shadow-lg scale-105" : "bg-surface-light/80 text-text-light-muted hover:bg-surface-light hover:text-text-light hover:scale-105"}`}
              >{t}</button>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filtered.map((s, i) => (
              <div key={s.label} className={`flex items-start gap-5 bg-surface-light border border-border-light rounded-2xl p-6 hover-lift shadow-[var(--shadow-md)] animate-fade-up delay-${((i % 4) + 1) * 100}`}>
                <span className="shrink-0 p-2 bg-bg-light rounded-xl shadow-[var(--shadow-sm)]">{s.icon}</span>
                <div className="flex-1">
                  <span className="text-accent text-[10px] font-bold uppercase tracking-widest">{s.cat}</span>
                  <p className="text-text-light/80 text-sm leading-relaxed mt-1">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12 animate-fade-up delay-500">
            <Link href="/contact" className="group inline-flex items-center gap-3 bg-bg-dark text-text-dark font-bold px-10 py-4 rounded-xl transition-all duration-300 hover:-translate-y-1 shadow-xl">
              Get the Full Package
              <svg viewBox="0 0 20 20" className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none"><path d="M4 10 H16 M12 6 L16 10 L12 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── BRAND MANAGEMENT ─── */}
      <section id="brand-management" className="py-28 px-4 relative overflow-hidden bg-bg-dark">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[120px] pointer-events-none bg-accent" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[350px] h-[350px] rounded-full opacity-10 blur-[100px] pointer-events-none bg-accent" />

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 glass-dark rounded-full px-5 py-2 mb-6 animate-fade-up">
              <span className="text-accent text-xs font-bold uppercase tracking-widest">Standalone or Bundled</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text animate-gradient animate-slide-up-3d" style={{ backgroundImage: "linear-gradient(135deg, #EBF2FA, #fff, #337485, #EBF2FA)", backgroundSize: "200% 200%" }}>
              Brand Management
            </h2>
            <p className="text-text-dark-muted/60 max-w-xl mx-auto mt-6 animate-fade-up delay-200">
              A strong brand isn&apos;t a logo — it&apos;s a system. We build, protect, run, and evolve yours
              every month so you can focus on the work.
            </p>
          </div>

          {/* Price Card */}
          <div className="flex justify-center mb-16">
            <div className="card-3d neon-edge rounded-[2rem] px-14 md:px-16 py-10 md:py-12 text-center animate-scale-in delay-300 relative"
              style={{ background: "linear-gradient(160deg, var(--color-bg-dark) 0%, var(--color-bg-dark) 100%)", boxShadow: "0 30px 80px rgba(51,116,133,0.25), 0 0 0 1px rgba(247,230,194,0.15) inset" }}
            >
              <div className="absolute inset-0 rounded-[2rem] overflow-hidden"><div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-accent/15 to-transparent rotate-12" /></div>
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 bg-accent/20 rounded-full px-4 py-1.5 mb-5">
                  <span className="text-xs font-bold text-text-dark uppercase tracking-wider">Monthly Retainer</span>
                </div>
                <p className="text-xs uppercase tracking-[0.2em] font-bold text-text-dark-muted/60 mb-2">Full Brand Management</p>
                <p className="text-7xl md:text-8xl font-extrabold text-text-dark tracking-tight">$1,200</p>
                <p className="text-text-dark-muted/60 text-sm mt-3">per month &middot; cancel anytime</p>
                <p className="text-text-dark-muted text-xs mt-4 max-w-sm mx-auto leading-relaxed">
                  Website management, brand prints, seasonal &amp; holiday adaptations, and full marketing strategy execution — all handled.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {brandMgmt.map((svc, i) => (
              <div key={svc.title} className={`bg-surface-dark border border-border-dark rounded-2xl p-8 flex flex-col hover-lift shadow-xl animate-fade-up delay-${((i % 3) + 1) * 100}`}>
                <div className="mb-4">{svc.icon}</div>
                <h3 className="font-extrabold tracking-tight text-text-dark text-lg mb-2">{svc.title}</h3>
                <p className="text-text-dark-muted/60 text-sm leading-relaxed flex-1">{svc.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-14 animate-fade-up delay-500">
            <p className="text-text-dark-muted/60 text-sm mb-6">No subscription needed &middot; One-time consultation or ongoing management</p>
            <Link href="/contact" className="group inline-flex items-center gap-3 font-bold px-10 py-4 rounded-xl text-white transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-accent to-accent-hover shadow-xl">
              Book a Brand Consultation
              <svg viewBox="0 0 20 20" className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none"><path d="M4 10 H16 M12 6 L16 10 L12 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── BOOK ANY SERVICE ─── */}
      <section className="py-24 px-4 bg-bg-light">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-accent/10 rounded-full px-5 py-2 mb-6 animate-fade-up">
              <span className="text-accent text-xs font-bold uppercase tracking-widest">No Package Required</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-text-light mb-4 animate-slide-up-3d delay-100">
              Book Any Service Solo
            </h2>
            <p className="text-text-light-muted max-w-xl mx-auto animate-fade-up delay-200">
              Only need one thing? Every service is available as a standalone consultation.
              No bundles, no upsells — just the help you actually need.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {([
              { icon: <IconFormation />, title: "Business Formation", desc: "LLC, DBA, S-Corp, EIN, compliance — filed and delivered." },
              { icon: <IconBrandCircle />, title: "Brand Identity", desc: "Logo, brand book, assets, and guidelines — ready to use everywhere." },
              { icon: <IconCode />, title: "Website Build", desc: "Designed, developed, and deployed — mobile-first with SEO baked in." },
              { icon: <IconShare />, title: "Social & Google", desc: "Profiles created, branded, verified — ready for your first post." },
              { icon: <IconPrintLarge />, title: "Print & Packaging", desc: "Cards, flyers, signage, packaging — designed for production." },
              { icon: <MailboxIcon className="w-14 h-14" />, title: "Mail & Forwarding", desc: "Real street address. Scanning, organizing, forwarding — handled." },
            ]).map((svc, i) => (
              <div key={svc.title} className={`bg-surface-light border border-border-light rounded-2xl p-8 flex flex-col hover-lift shadow-[var(--shadow-md)] animate-fade-up delay-${((i % 3) + 1) * 100}`}>
                <div className="mb-5 p-3 bg-bg-light/50 rounded-2xl inline-block self-start">{svc.icon}</div>
                <h3 className="font-extrabold tracking-tight text-text-light text-lg mb-2">{svc.title}</h3>
                <p className="text-text-light-muted text-sm leading-relaxed flex-1">{svc.desc}</p>
                <Link href="/contact" className="mt-6 group inline-flex items-center gap-2 text-accent text-sm font-bold hover:gap-3 transition-all">
                  Book a Consultation
                  <svg viewBox="0 0 16 16" className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none"><path d="M3 8 H13 M10 5 L13 8 L10 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FULL SERVICE MENU ─── */}
      <section className="py-24 px-4 relative overflow-hidden bg-bg-dark">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[120px] pointer-events-none bg-accent" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[350px] h-[350px] rounded-full opacity-10 blur-[100px] pointer-events-none bg-accent" />

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 glass-dark rounded-full px-5 py-2 mb-6 animate-fade-up">
              <span className="text-accent text-xs font-bold uppercase tracking-widest">50+ Services</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text animate-gradient animate-slide-up-3d" style={{ backgroundImage: "linear-gradient(135deg, #EBF2FA, #fff, #EBF2FA)", backgroundSize: "200% 200%" }}>
              Full Service Menu
            </h2>
            <p className="text-text-dark-muted/60 max-w-lg mx-auto mt-4 animate-fade-up delay-200">
              Everything we offer, in one place. Pick what you need — we&apos;ll handle the rest.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {serviceCategories.map((cat) => (
              <button key={cat} onClick={() => setActiveServiceCat(cat)}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${activeServiceCat === cat ? "bg-accent text-white shadow-lg shadow-accent/30 scale-105" : "glass-dark text-text-dark-muted hover:text-text-dark hover:scale-105"}`}
              >{cat}</button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {serviceMenu[activeServiceCat as keyof typeof serviceMenu].map((svc, i) => (
              <Link key={svc} href="/contact"
                className={`glass-dark card-3d group flex items-center gap-4 rounded-xl px-5 py-4 transition-all duration-300 hover:bg-accent/20 animate-fade-up delay-${Math.min((i % 6 + 1) * 100, 600)}`}
              >
                <span className="w-2 h-2 rounded-full bg-accent shrink-0 group-hover:scale-150 transition-transform" />
                <span className="text-text-dark-muted text-sm font-medium group-hover:text-text-dark transition-colors">{svc}</span>
                <svg viewBox="0 0 16 16" className="w-4 h-4 ml-auto text-text-dark/20 group-hover:text-accent transition-colors shrink-0" fill="none"><path d="M3 8 H13 M10 5 L13 8 L10 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </Link>
            ))}
          </div>

          <p className="text-center text-text-dark-muted/60 text-sm mt-10">
            Don&apos;t see what you need? <Link href="/contact" className="text-accent hover:underline">Contact us</Link> — we likely offer it.
          </p>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="py-24 px-4 bg-bg-light relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "radial-gradient(#1A1714 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="max-w-4xl mx-auto relative z-10">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-text-light mb-14 text-center animate-slide-up-3d">Three Steps to Launch</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", icon: <IconQuestion />, title: "Free Consultation", desc: "Tell us where you are and where you want to be. We scope the work and send a clear quote — no obligation.", delay: "delay-100" },
              { step: "02", icon: <IconChecklist />, title: "We Execute", desc: "Our team handles formation, branding, development, and every filing in between. You stay in the loop, not in the weeds.", delay: "delay-300" },
              { step: "03", icon: <IconRocket />, title: "You Launch", desc: "Receive your brand assets, live website, activated mail, and everything you need to open for business.", delay: "delay-500" },
            ].map((s) => (
              <div key={s.step} className={`text-center p-10 bg-surface-light border border-border-light rounded-2xl hover-lift shadow-[var(--shadow-md)] animate-fade-up ${s.delay}`}>
                {s.icon}
                <p className="text-6xl font-extrabold tracking-tight text-accent/15 mb-2">{s.step}</p>
                <p className="font-extrabold tracking-tight text-text-light text-sm mb-3">{s.title}</p>
                <p className="text-text-light-muted text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-28 px-4 relative overflow-hidden bg-bg-dark">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[120px] pointer-events-none bg-accent" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[350px] h-[350px] rounded-full opacity-10 blur-[100px] pointer-events-none bg-accent" />

        <div className="max-w-3xl mx-auto relative z-10 text-center">
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text animate-gradient" style={{ backgroundImage: "linear-gradient(135deg, #EBF2FA, #fff, #337485, #EBF2FA)", backgroundSize: "200% 200%" }}>
            Let&apos;s Build Something
          </h2>
          <p className="text-text-dark-muted/60 mt-6 mb-3 max-w-md mx-auto">
            Full package, brand management, or a single service — the first conversation is always free.
          </p>
          <p className="text-text-dark-muted/60 text-sm mb-12">No commitment &middot; Custom quote within 24 hours</p>

          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/contact" className="group inline-flex items-center gap-3 font-bold px-12 py-5 rounded-xl text-white transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-accent to-accent-hover shadow-xl">
              Book a Free Consultation
              <svg viewBox="0 0 20 20" className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none"><path d="M4 10 H16 M12 6 L16 10 L12 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
            <Link href="/pricing" className="glass-dark text-text-dark font-bold px-10 py-5 rounded-xl transition-all duration-300 hover:-translate-y-1 hover:bg-bg-light/10">
              View Mailbox Plans
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
