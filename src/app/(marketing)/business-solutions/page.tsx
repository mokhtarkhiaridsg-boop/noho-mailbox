"use client";

import Link from "next/link";
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

/* ── Fiverr-style category tiles (top of page browse) ────────── */
const CAT_TILES = [
  { key: "Business & Legal",   sub: "LLC · EIN · Compliance",  Icon: IconFormation,   from: 49 },
  { key: "Branding & Design",  sub: "Logo · Book · Assets",    Icon: IconBrandCircle, from: 79 },
  { key: "Web & Digital",      sub: "Sites · Apps · SEO",      Icon: IconCode,        from: 99 },
  { key: "Marketing & SEO",    sub: "Local · Social · Ads",    Icon: IconShare,       from: 59 },
  { key: "Content & Media",    sub: "Copy · Video · Photo",    Icon: IconPrintLarge,  from: 39 },
  { key: "Mail & Address",     sub: "Mailbox · Scanning",      Icon: IconMail12,      from: 50 },
];

/* ── Featured "gigs" (Fiverr seller card data) ───────────────── */
const FEATURED_GIGS: Array<{
  title: string;
  cat: string;
  delivery: string;
  rating: number;
  reviews: number;
  from: number;
  Icon: (p: { className?: string }) => React.ReactElement;
  bullets: string[];
}> = [
  { title: "LLC formation — filed end-to-end",                 cat: "Business & Legal", delivery: "5–7 days", rating: 5.0, reviews: 87, from: 99,  Icon: IconLLC,        bullets: ["State filing", "EIN included", "Operating agreement"] },
  { title: "Custom brand book — logo, color, type",             cat: "Branding & Design",delivery: "10 days",  rating: 4.9, reviews: 64, from: 350, Icon: IconBrandBook,  bullets: ["Logo + variants", "Type system", "Color palette"] },
  { title: "Mobile-first website with hosting",                 cat: "Web & Digital",    delivery: "2 weeks",  rating: 5.0, reviews: 52, from: 600, Icon: IconWebsite,    bullets: ["Domain + hosting", "5 sections", "SEO basics"] },
  { title: "Local SEO + Google Business Profile",               cat: "Marketing & SEO",  delivery: "3–5 days", rating: 4.9, reviews: 41, from: 220, Icon: IconSEO,        bullets: ["GMB verified", "Meta + schema", "First-page targets"] },
  { title: "Real street address + 12 months of mail",           cat: "Mail & Address",   delivery: "Same day", rating: 5.0, reviews: 312,from: 50,  Icon: IconMail12,     bullets: ["Real NoHo address", "Scanning + forward", "Pickup 6 days/wk"] },
  { title: "Social presence: profiles, branding, first posts",  cat: "Marketing & SEO",  delivery: "5 days",   rating: 4.8, reviews: 38, from: 180, Icon: IconSocial,     bullets: ["All major platforms", "Branded covers", "Starter content"] },
];

/* ── Tiny atoms ─────────────────────────────────────────────── */
function StarRow({ rating, reviews }: { rating: number; reviews: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold" style={{ color: "#2D100F" }}>
      <svg viewBox="0 0 20 20" className="w-3.5 h-3.5" fill="#F5A623" aria-hidden="true">
        <path d="M10 1.5l2.7 5.5 6.1.9-4.4 4.3 1 6.1L10 15.4l-5.4 2.9 1-6.1L1.2 7.9l6.1-.9z" />
      </svg>
      <span className="tabular-nums">{rating.toFixed(1)}</span>
      <span className="font-normal" style={{ color: "#7A6B57" }}>({reviews})</span>
    </span>
  );
}

function NohoAvatar({ size = 36 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-extrabold"
      style={{
        width: size, height: size, background: "#2D100F", color: "#F7E6C2",
        fontFamily: "var(--font-baloo), 'Baloo 2', sans-serif",
        fontSize: Math.round(size * 0.42), letterSpacing: "-0.02em",
        boxShadow: "0 0 0 2px #FFFFFF, 0 0 0 3px #F0DBA9",
      }}
      aria-hidden="true"
    >
      N
    </span>
  );
}

function SearchIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="9" r="6" />
      <path d="m18 18-4.5-4.5" />
    </svg>
  );
}

export default function BusinessSolutionsPage() {
  const [filter, setFilter] = useState("All");
  const [activeServiceCat, setActiveServiceCat] = useState(serviceCategories[0]);
  const [query, setQuery] = useState("");
  const filtered = filter === "All" ? packageServices : packageServices.filter((s) => s.cat === filter);

  // Live search across the full service menu — flattens the categories
  // into a single searchable list so the cream-banner search bar above
  // the fold actually finds something. Empty query = no results panel.
  const searchResults = query.trim().length > 0
    ? Object.entries(serviceMenu).flatMap(([cat, items]) =>
        items
          .filter((it) => it.toLowerCase().includes(query.trim().toLowerCase()))
          .map((it) => ({ cat, label: it }))
      ).slice(0, 8)
    : [];

  return (
    <div className="perspective-container" style={{ background: "#FFFDF8" }}>
      {/* ─── HERO — Fiverr-style search shelf, cream + brown ─── */}
      <section
        className="relative px-5 sm:px-6 pt-12 pb-14 sm:pt-20 sm:pb-20 overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse at top, #F7E6C2 0%, #F0DBA9 45%, #E8DDD0 100%)",
        }}
      >
        {/* subtle dot pattern */}
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{ backgroundImage: "radial-gradient(#2D100F 1px, transparent 1px)", backgroundSize: "22px 22px" }}
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          {/* Family-owned chip */}
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 mb-5 text-[10.5px] font-bold uppercase tracking-[0.14em]"
            style={{ background: "rgba(231,0,19,0.10)", color: "#B11D26", border: "1px solid rgba(231,0,19,0.28)" }}
          >
            <AiHeart className="w-3 h-3" />
            Family-owned in NoHo · since 2017
          </div>

          <h1
            className="font-extrabold tracking-tight"
            style={{
              fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
              color: "#2D100F",
              fontSize: "clamp(2rem, 6vw, 3.75rem)",
              lineHeight: 1.05,
            }}
          >
            Find the right service for your{" "}
            <span
              style={{
                fontFamily: "var(--font-pacifico), 'Pacifico', cursive",
                color: "#337485",
                fontWeight: 400,
              }}
            >
              business
            </span>
          </h1>

          <p
            className="mt-3 sm:mt-4 max-w-xl mx-auto text-[14.5px] sm:text-base"
            style={{ color: "#5C4540" }}
          >
            Real local team, not a marketplace. LLC formation, branding, websites,
            mail & more — handled by us, billed once.
          </p>

          {/* Search bar */}
          <div className="mt-6 sm:mt-8 mx-auto max-w-2xl">
            <div
              className="relative flex items-center rounded-full overflow-hidden bg-white"
              style={{ border: "1px solid #E8DDD0", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 14px 36px rgba(45,16,15,0.10)" }}
            >
              <span className="absolute left-4 sm:left-5 pointer-events-none" style={{ color: "#7A6B57" }}>
                <SearchIcon />
              </span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Try “LLC”, “logo”, “website”, “mailbox”…"
                className="flex-1 pl-11 sm:pl-12 pr-2 sm:pr-3 py-3 sm:py-4 text-[15px] sm:text-base bg-transparent focus:outline-none"
                style={{ color: "#2D100F", fontFamily: "var(--font-inter), system-ui, sans-serif" }}
                aria-label="Search services"
              />
              <Link
                href="/contact"
                className="hidden sm:inline-flex shrink-0 items-center gap-2 px-5 py-3 mr-1.5 rounded-full font-bold text-[13px] uppercase tracking-wider text-white transition-colors"
                style={{ background: "#2D100F" }}
              >
                Search
              </Link>
            </div>

            {/* Live result drop */}
            {searchResults.length > 0 && (
              <ul
                className="mt-2 text-left rounded-2xl bg-white overflow-hidden"
                style={{ border: "1px solid #E8DDD0", boxShadow: "0 1px 3px rgba(0,0,0,0.05), 0 16px 40px rgba(45,16,15,0.10)" }}
              >
                {searchResults.map((r) => (
                  <li key={`${r.cat}-${r.label}`}>
                    <Link
                      href="/contact"
                      className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-[#FFF9F3]"
                    >
                      <span className="flex items-center gap-3 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#337485" }} />
                        <span className="font-semibold truncate" style={{ color: "#2D100F" }}>{r.label}</span>
                      </span>
                      <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] shrink-0" style={{ color: "#7A6B57" }}>
                        {r.cat}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {/* Popular pills */}
            <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 mt-4 sm:mt-5">
              <span className="text-[11px] font-bold uppercase tracking-wider self-center" style={{ color: "#7A6B57" }}>
                Popular:
              </span>
              {["LLC formation", "Logo design", "Website build", "Google Business", "Mailbox + scanning"].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setQuery(p.split(" ")[0])}
                  className="text-[12px] font-semibold px-3 py-1.5 rounded-full transition-colors hover:bg-[#FFFDF8]"
                  style={{ background: "rgba(255,255,255,0.6)", color: "#2D100F", border: "1px solid #E8DDD0" }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Trust strip */}
          <div className="mt-8 sm:mt-10 inline-flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px]" style={{ color: "#5C4540" }}>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#22C55E" }} />
              500+ services delivered
            </span>
            <span className="inline-flex items-center gap-1.5">
              <StarRow rating={4.9} reviews={312} />
              local reviews
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#337485" }} />
              One team, one invoice
            </span>
          </div>
        </div>
      </section>

      {/* ─── CATEGORY TILES — Fiverr-style big browse cards ─── */}
      <section className="px-5 sm:px-6 py-12 sm:py-16" style={{ background: "#FFFDF8" }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-baseline gap-3 flex-wrap mb-6 sm:mb-8">
            <h2
              className="font-bold tracking-tight"
              style={{
                fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
                color: "#2D100F",
                fontSize: "clamp(1.5rem, 4vw, 2rem)",
              }}
            >
              Browse by category
            </h2>
            <span
              className="text-[16px]"
              style={{ fontFamily: "var(--font-pacifico), 'Pacifico', cursive", color: "#337485" }}
            >
              pick the help you need
            </span>
            <span className="text-[12px] ml-auto self-end" style={{ color: "#7A6B57" }}>
              {Object.values(serviceMenu).flat().length}+ services · NoHo-based delivery
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {CAT_TILES.map((t) => (
              <Link
                key={t.key}
                href="#menu"
                onClick={() => {
                  const k = t.key === "Mail & Address" ? "Business & Legal" : t.key;
                  if (serviceCategories.includes(k)) setActiveServiceCat(k);
                }}
                className="group flex flex-col items-center text-center rounded-2xl p-4 sm:p-5 transition-all duration-200 hover:-translate-y-1"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E8DDD0",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 22px rgba(45,16,15,0.06)",
                }}
              >
                <span
                  className="mb-3 inline-flex items-center justify-center rounded-2xl transition-transform group-hover:scale-110"
                  style={{ width: 64, height: 64, background: "#F7E6C2" }}
                >
                  <t.Icon className="w-9 h-9" />
                </span>
                <p
                  className="text-[13px] sm:text-sm font-extrabold"
                  style={{ color: "#2D100F", fontFamily: "var(--font-baloo), 'Baloo 2', sans-serif" }}
                >
                  {t.key}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: "#7A6B57" }}>{t.sub}</p>
                <p className="text-[11px] mt-2 font-bold" style={{ color: "#337485" }}>
                  from ${t.from}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TOP GIGS — Fiverr-style seller cards ─── */}
      <section className="px-5 sm:px-6 py-12 sm:py-16" style={{ background: "#FFF9F3" }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-baseline gap-3 flex-wrap mb-6 sm:mb-8">
            <h2
              className="font-bold tracking-tight"
              style={{
                fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
                color: "#2D100F",
                fontSize: "clamp(1.5rem, 4vw, 2rem)",
              }}
            >
              Most-booked gigs
            </h2>
            <span
              className="text-[16px]"
              style={{ fontFamily: "var(--font-pacifico), 'Pacifico', cursive", color: "#337485" }}
            >
              what locals order
            </span>
            <Link href="#menu" className="ml-auto text-[13px] font-bold inline-flex items-center gap-1" style={{ color: "#337485" }}>
              See all
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none"><path d="M3 8 H13 M10 5 L13 8 L10 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {FEATURED_GIGS.map((g) => (
              <Link
                key={g.title}
                href="/contact"
                className="group flex flex-col rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-1"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E8DDD0",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 22px rgba(45,16,15,0.06)",
                }}
              >
                {/* Gig "cover" — illustrated tile */}
                <div
                  className="relative aspect-[16/9] flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #F7E6C2 0%, #FFFDF8 100%)" }}
                >
                  <g.Icon className="w-20 h-20 sm:w-24 sm:h-24 transition-transform group-hover:scale-110" />
                  <span
                    className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9.5px] font-extrabold uppercase tracking-[0.14em]"
                    style={{ background: "#2D100F", color: "#F7E6C2" }}
                  >
                    NoHo
                  </span>
                  <span
                    className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9.5px] font-bold uppercase tracking-[0.14em]"
                    style={{ background: "rgba(255,255,255,0.92)", color: "#337485", border: "1px solid #E8DDD0" }}
                  >
                    {g.cat.split(" & ")[0]}
                  </span>
                </div>

                {/* Body */}
                <div className="flex-1 flex flex-col p-4 sm:p-5">
                  {/* Seller chip */}
                  <div className="flex items-center gap-2 mb-2.5">
                    <NohoAvatar size={32} />
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-extrabold truncate" style={{ color: "#2D100F" }}>
                        NOHO Mailbox
                      </p>
                      <p className="text-[10.5px] font-bold uppercase tracking-[0.14em]" style={{ color: "#337485" }}>
                        Local · Verified
                      </p>
                    </div>
                  </div>

                  <p
                    className="text-[14.5px] sm:text-[15px] font-bold leading-snug line-clamp-2 mb-3"
                    style={{ color: "#2D100F", fontFamily: "var(--font-inter), system-ui, sans-serif" }}
                  >
                    {g.title}
                  </p>

                  <ul className="space-y-1 mb-3">
                    {g.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-1.5 text-[12px]" style={{ color: "#5C4540" }}>
                        <svg viewBox="0 0 16 16" className="w-3 h-3 shrink-0 mt-1" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 8 L7 12 L13 4" />
                        </svg>
                        {b}
                      </li>
                    ))}
                  </ul>

                  <div className="flex items-center justify-between mt-auto pt-3" style={{ borderTop: "1px solid #F0DBA9" }}>
                    <StarRow rating={g.rating} reviews={g.reviews} />
                    <span className="text-[10.5px] font-bold uppercase tracking-[0.14em]" style={{ color: "#7A6B57" }}>
                      {g.delivery}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between mt-3">
                    <span className="text-[10.5px] font-bold uppercase tracking-[0.14em]" style={{ color: "#7A6B57" }}>
                      Starting at
                    </span>
                    <span
                      className="font-extrabold tabular-nums"
                      style={{
                        color: "#2D100F",
                        fontFamily: "var(--font-baloo), 'Baloo 2', sans-serif",
                        fontSize: "clamp(1.25rem, 4vw, 1.5rem)",
                      }}
                    >
                      ${g.from}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ALL-INCLUSIVE PACKAGE — featured gig bundle ─── */}
      <section id="package" className="px-5 sm:px-6 py-14 sm:py-20" style={{ background: "#FFFDF8" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 sm:mb-10">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.18em]"
              style={{ background: "#2D100F", color: "#F7E6C2" }}
            >
              <AiSparkle className="w-3 h-3" />
              Featured bundle
            </span>
            <h2
              className="mt-3 font-extrabold tracking-tight"
              style={{
                fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
                color: "#2D100F",
                fontSize: "clamp(1.75rem, 5vw, 2.5rem)",
              }}
            >
              The all-in-one launch bundle
            </h2>
            <p className="mt-2 max-w-xl mx-auto text-[14.5px] sm:text-base" style={{ color: "#5C4540" }}>
              Ten services. One invoice. Everything you need from day one to launch day.
            </p>
          </div>

          <div
            className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5 sm:gap-6 rounded-3xl overflow-hidden"
            style={{
              background: "#FFFFFF",
              border: "1px solid #E8DDD0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 18px 46px rgba(45,16,15,0.10)",
            }}
          >
            {/* Left — what's inside, gig-detail-style */}
            <div className="p-5 sm:p-7">
              <div className="flex items-center gap-3 mb-4">
                <NohoAvatar size={44} />
                <div>
                  <p className="text-[13px] font-extrabold" style={{ color: "#2D100F" }}>
                    NOHO Mailbox · Local team
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <StarRow rating={5.0} reviews={87} />
                    <span className="text-[10.5px] font-bold uppercase tracking-[0.14em]" style={{ color: "#337485" }}>
                      Top rated
                    </span>
                  </div>
                </div>
              </div>

              {/* Filters (kept from old page so all-cats can be browsed) */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {filterTabs.map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setFilter(t)}
                    className="text-[11.5px] font-bold px-3 py-1.5 rounded-full transition-colors"
                    style={{
                      background: filter === t ? "#2D100F" : "#FFF9F3",
                      color: filter === t ? "#F7E6C2" : "#2D100F",
                      border: `1px solid ${filter === t ? "#2D100F" : "#E8DDD0"}`,
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filtered.map((s) => (
                  <li
                    key={s.label}
                    className="flex items-start gap-3 rounded-xl p-3"
                    style={{ background: "#FFF9F3", border: "1px solid #F0DBA9" }}
                  >
                    <span
                      className="shrink-0 inline-flex items-center justify-center rounded-lg"
                      style={{ width: 40, height: 40, background: "#FFFFFF", border: "1px solid #E8DDD0" }}
                    >
                      {s.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10.5px] font-bold uppercase tracking-[0.14em]" style={{ color: "#337485" }}>
                        {s.cat}
                      </p>
                      <p className="text-[12.5px] leading-snug mt-0.5" style={{ color: "#2D100F" }}>
                        {s.label}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right — price column */}
            <aside
              className="p-5 sm:p-7 flex flex-col justify-between"
              style={{
                background: "linear-gradient(160deg, #F7E6C2 0%, #F0DBA9 100%)",
                borderLeft: "1px solid #E8DDD0",
              }}
            >
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-[0.18em]" style={{ color: "#5C4540" }}>
                  Bundle · 10 services
                </p>
                <p
                  className="font-extrabold tracking-tight tabular-nums leading-none mt-2"
                  style={{
                    color: "#2D100F",
                    fontFamily: "var(--font-baloo), 'Baloo 2', sans-serif",
                    fontSize: "clamp(2.75rem, 9vw, 4.25rem)",
                  }}
                >
                  $2,000
                </p>
                <p className="text-[12.5px] mt-2" style={{ color: "#5C4540" }}>
                  One-time flat fee · No subscriptions
                </p>

                <ul className="mt-5 space-y-2 text-[13px]" style={{ color: "#2D100F" }}>
                  {[
                    "2-week delivery, end-to-end",
                    "Unlimited revisions during build",
                    "100% local team — no offshoring",
                    "12 months of mailbox included",
                  ].map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 mt-1 shrink-0" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 8 L7 12 L13 4" />
                      </svg>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                href="/contact"
                className="mt-6 inline-flex items-center justify-center gap-2 font-bold px-5 py-3 rounded-xl text-white transition-colors"
                style={{ background: "#2D100F" }}
              >
                Order this bundle
                <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none"><path d="M4 10 H16 M12 6 L16 10 L12 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </Link>
            </aside>
          </div>
        </div>
      </section>

      {/* ─── BRAND MANAGEMENT — monthly subscription gig ─── */}
      <section id="brand-management" className="px-5 sm:px-6 py-12 sm:py-16" style={{ background: "#FFF9F3" }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-baseline gap-3 flex-wrap mb-6 sm:mb-8">
            <h2
              className="font-bold tracking-tight"
              style={{
                fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
                color: "#2D100F",
                fontSize: "clamp(1.5rem, 4vw, 2rem)",
              }}
            >
              Brand on retainer
            </h2>
            <span
              className="text-[16px]"
              style={{ fontFamily: "var(--font-pacifico), 'Pacifico', cursive", color: "#337485" }}
            >
              we run it, you focus
            </span>
            <span className="text-[12px] ml-auto self-end" style={{ color: "#7A6B57" }}>
              Monthly · cancel anytime
            </span>
          </div>

          <div
            className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 sm:gap-6 rounded-3xl overflow-hidden"
            style={{
              background: "#FFFFFF",
              border: "1px solid #E8DDD0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 18px 46px rgba(45,16,15,0.10)",
            }}
          >
            <div className="p-5 sm:p-7">
              <div className="flex items-center gap-3 mb-4">
                <NohoAvatar size={40} />
                <div>
                  <p className="text-[13px] font-extrabold" style={{ color: "#2D100F" }}>
                    NOHO Mailbox · Studio
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <StarRow rating={4.9} reviews={26} />
                    <span className="text-[10.5px] font-bold uppercase tracking-[0.14em]" style={{ color: "#337485" }}>
                      Retainer
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-[14.5px] font-bold leading-snug mb-2" style={{ color: "#2D100F" }}>
                Full brand management — website, prints, seasonal adaptations, marketing execution
              </p>
              <p className="text-[12.5px] mb-4" style={{ color: "#5C4540" }}>
                A strong brand isn&apos;t a logo — it&apos;s a system. We build, protect, run, and evolve yours every
                month so you can focus on the work.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {brandMgmt.map((svc) => (
                  <div
                    key={svc.title}
                    className="flex items-start gap-3 rounded-xl p-3"
                    style={{ background: "#FFF9F3", border: "1px solid #F0DBA9" }}
                  >
                    <span className="shrink-0">{svc.icon}</span>
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-extrabold leading-tight" style={{ color: "#2D100F" }}>
                        {svc.title}
                      </p>
                      <p className="text-[11.5px] leading-snug mt-0.5" style={{ color: "#5C4540" }}>
                        {svc.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <aside
              className="p-5 sm:p-7 flex flex-col justify-between"
              style={{
                background: "linear-gradient(160deg, #2D100F 0%, #1F0807 100%)",
                color: "#F7E6C2",
              }}
            >
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-[0.18em]" style={{ color: "#F0DBA9" }}>
                  Monthly retainer
                </p>
                <p
                  className="font-extrabold tracking-tight tabular-nums leading-none mt-2"
                  style={{
                    fontFamily: "var(--font-baloo), 'Baloo 2', sans-serif",
                    fontSize: "clamp(2.5rem, 8vw, 3.75rem)",
                    color: "#F7E6C2",
                  }}
                >
                  $1,200
                </p>
                <p className="text-[12.5px] mt-2" style={{ color: "#F0DBA9" }}>
                  per month · cancel anytime
                </p>
                <ul className="mt-5 space-y-2 text-[12.5px]" style={{ color: "#F7E6C2" }}>
                  {["Dedicated brand operator", "Quarterly performance review", "Priority lane support"].map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 mt-1 shrink-0" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 8 L7 12 L13 4" />
                      </svg>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href="/contact"
                className="mt-6 inline-flex items-center justify-center gap-2 font-bold px-5 py-3 rounded-xl transition-colors"
                style={{ background: "#F7E6C2", color: "#2D100F" }}
              >
                Start retainer
                <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none"><path d="M4 10 H16 M12 6 L16 10 L12 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </Link>
            </aside>
          </div>
        </div>
      </section>

      {/* ─── FULL SERVICE MENU — Fiverr-style category browse ─── */}
      <section id="menu" className="px-5 sm:px-6 py-12 sm:py-16" style={{ background: "#FFFDF8" }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-baseline gap-3 flex-wrap mb-6">
            <h2
              className="font-bold tracking-tight"
              style={{
                fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
                color: "#2D100F",
                fontSize: "clamp(1.5rem, 4vw, 2rem)",
              }}
            >
              All services
            </h2>
            <span
              className="text-[16px]"
              style={{ fontFamily: "var(--font-pacifico), 'Pacifico', cursive", color: "#337485" }}
            >
              fifty+ ways we can help
            </span>
            <span className="text-[12px] ml-auto self-end" style={{ color: "#7A6B57" }}>
              {Object.values(serviceMenu).flat().length} services · tap to book
            </span>
          </div>

          {/* Category tabs */}
          <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-6 sm:mb-8 overflow-x-auto pb-1 -mx-1 px-1">
            {serviceCategories.map((cat) => {
              const active = activeServiceCat === cat;
              return (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setActiveServiceCat(cat)}
                  className="shrink-0 text-[11.5px] sm:text-[12px] font-bold uppercase tracking-wider px-3.5 sm:px-4 py-2 rounded-full transition-colors"
                  style={{
                    background: active ? "#2D100F" : "#FFFFFF",
                    color: active ? "#F7E6C2" : "#2D100F",
                    border: `1px solid ${active ? "#2D100F" : "#E8DDD0"}`,
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
            {serviceMenu[activeServiceCat as keyof typeof serviceMenu].map((svc) => (
              <Link
                key={svc}
                href="/contact"
                className="group flex items-center justify-between gap-3 rounded-xl px-4 py-3.5 transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E8DDD0",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                }}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "#337485" }} />
                  <span className="text-[13.5px] sm:text-sm font-semibold truncate" style={{ color: "#2D100F" }}>
                    {svc}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider shrink-0" style={{ color: "#337485" }}>
                  Quote
                  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none">
                    <path d="M3 8 H13 M10 5 L13 8 L10 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </Link>
            ))}
          </div>

          <p className="text-center text-[12.5px] mt-8" style={{ color: "#5C4540" }}>
            Don&apos;t see what you need?{" "}
            <Link href="/contact" className="font-bold underline" style={{ color: "#337485" }}>
              Contact us
            </Link>{" "}
            — we likely offer it.
          </p>
        </div>
      </section>

      {/* ─── HOW IT WORKS — Fiverr 3-step ─── */}
      <section className="px-5 sm:px-6 py-12 sm:py-16" style={{ background: "#FFF9F3" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8 sm:mb-10">
            <h2
              className="font-extrabold tracking-tight"
              style={{
                fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
                color: "#2D100F",
                fontSize: "clamp(1.5rem, 4vw, 2rem)",
              }}
            >
              How it works
            </h2>
            <p className="mt-1 text-[14px]" style={{ color: "#5C4540" }}>
              Three steps from "I have an idea" to launch day.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
            {[
              { step: "01", icon: <IconQuestion />,  title: "Free consultation", desc: "Tell us where you are and where you want to be. We scope it and send a clear quote — no obligation." },
              { step: "02", icon: <IconChecklist />, title: "We execute",         desc: "Formation, branding, development, every filing — handled by our local team. You stay in the loop, not in the weeds." },
              { step: "03", icon: <IconRocket />,    title: "You launch",         desc: "Receive your brand assets, live website, activated mail, and everything you need to open for business." },
            ].map((s) => (
              <div
                key={s.step}
                className="text-center p-6 sm:p-7 rounded-2xl"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E8DDD0",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 22px rgba(45,16,15,0.06)",
                }}
              >
                {s.icon}
                <p
                  className="font-extrabold tabular-nums"
                  style={{
                    fontFamily: "var(--font-baloo), 'Baloo 2', sans-serif",
                    color: "#F0DBA9",
                    fontSize: "clamp(2.25rem, 6vw, 3rem)",
                    lineHeight: 1,
                  }}
                >
                  {s.step}
                </p>
                <p className="font-extrabold text-[15px] mt-2" style={{ color: "#2D100F" }}>
                  {s.title}
                </p>
                <p className="text-[12.5px] leading-relaxed mt-1.5" style={{ color: "#5C4540" }}>
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA — final ─── */}
      <section
        className="px-5 sm:px-6 py-14 sm:py-20"
        style={{ background: "linear-gradient(160deg, #2D100F 0%, #1F0807 100%)", color: "#F7E6C2" }}
      >
        <div className="max-w-3xl mx-auto text-center">
          <h2
            className="font-extrabold tracking-tight"
            style={{
              fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
              color: "#F7E6C2",
              fontSize: "clamp(1.875rem, 6vw, 3rem)",
              lineHeight: 1.05,
            }}
          >
            Let&apos;s build something{" "}
            <span style={{ fontFamily: "var(--font-pacifico), 'Pacifico', cursive", color: "#F0DBA9", fontWeight: 400 }}>
              together
            </span>
          </h2>
          <p className="mt-3 text-[14.5px] sm:text-base" style={{ color: "#F0DBA9" }}>
            Full bundle, brand retainer, or a single service — the first conversation is always free.
          </p>
          <p className="mt-2 text-[12px]" style={{ color: "rgba(247,230,194,0.7)" }}>
            No commitment · Custom quote within 24 hours
          </p>

          <div className="flex flex-wrap justify-center gap-3 mt-7">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 font-bold px-6 py-3.5 rounded-xl transition-colors"
              style={{ background: "#F7E6C2", color: "#2D100F" }}
            >
              Book a free consultation
              <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none"><path d="M4 10 H16 M12 6 L16 10 L12 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 font-bold px-6 py-3.5 rounded-xl transition-colors"
              style={{ background: "rgba(247,230,194,0.10)", color: "#F7E6C2", border: "1px solid rgba(247,230,194,0.30)" }}
            >
              View mailbox plans
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
