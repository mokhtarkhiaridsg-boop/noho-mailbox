"use client";

import { useState } from "react";
import Link from "next/link";
import { ShoppingBagIcon, BoxIcon, EnvelopeIcon } from "@/components/BrandIcons";

const products = [
  { id: 1, name: "NOHO Branded Envelope", desc: "Pack of 25 — cream with blue logo", price: "$8.50", category: "envelopes", popular: true },
  { id: 2, name: "Business Envelope", desc: "Pack of 50 — #10 standard white", price: "$6.00", category: "envelopes", popular: false },
  { id: 3, name: "Padded Mailer", desc: "Pack of 10 — 9.5\" x 14.5\"", price: "$12.00", category: "envelopes", popular: false },
  { id: 4, name: "Poly Mailer", desc: "Pack of 25 — 10\" x 13\" white", price: "$9.00", category: "envelopes", popular: false },
  { id: 5, name: "Small Shipping Box", desc: "8\" × 6\" × 4\" — single wall", price: "$2.50", category: "boxes", popular: true },
  { id: 6, name: "Medium Shipping Box", desc: "12\" × 10\" × 6\" — single wall", price: "$4.00", category: "boxes", popular: false },
  { id: 7, name: "Large Shipping Box", desc: "18\" × 14\" × 12\" — double wall", price: "$7.50", category: "boxes", popular: false },
  { id: 8, name: "Moving Box Kit", desc: "5 assorted boxes + tape", price: "$22.00", category: "boxes", popular: true },
  { id: 9, name: "Bubble Wrap Roll", desc: "12\" × 30 ft — small bubble", price: "$8.00", category: "packing", popular: true },
  { id: 10, name: "Packing Tape", desc: "2\" × 55 yd — clear, heavy duty", price: "$4.50", category: "packing", popular: false },
  { id: 11, name: "Shipping Labels", desc: "Pack of 100 — 4\" × 6\" adhesive", price: "$12.00", category: "packing", popular: false },
  { id: 12, name: "Packing Peanuts", desc: "3 cu ft bag — biodegradable", price: "$10.00", category: "packing", popular: false },
  { id: 13, name: "Tissue Paper", desc: "Pack of 50 sheets — cream", price: "$5.00", category: "packing", popular: false },
  { id: 14, name: "Fragile Stickers", desc: "Pack of 50 — red & white", price: "$3.50", category: "packing", popular: false },
  { id: 15, name: "NOHO Custom Tape", desc: "2\" × 55 yd — branded blue", price: "$9.00", category: "branded", popular: true },
  { id: 16, name: "NOHO Letterhead Pack", desc: "Pack of 50 — premium cream stock", price: "$15.00", category: "branded", popular: false },
  { id: 17, name: "NOHO Thank You Notes", desc: "Pack of 25 — with envelopes", price: "$12.50", category: "branded", popular: false },
  { id: 18, name: "NOHO Gift Box", desc: "Medium — cream with blue ribbon", price: "$8.00", category: "branded", popular: false },
];

const categories = [
  { id: "all", label: "All" },
  { id: "envelopes", label: "Custom Envelopes" },
  { id: "boxes", label: "Shipping Boxes" },
  { id: "packing", label: "Packing Materials" },
  { id: "branded", label: "Branded Items" },
];

function ProductIcon({ category }: { category: string }) {
  switch (category) {
    case "envelopes": return <EnvelopeIcon className="w-10 h-10" />;
    case "boxes": return <BoxIcon className="w-10 h-10" />;
    case "branded": return <ShoppingBagIcon className="w-10 h-10" />;
    default: return (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none">
        <rect x="4" y="4" width="40" height="40" rx="8" fill="#F7E6C2" stroke="#2D1D0F" strokeWidth="2.5" />
        <circle cx="24" cy="20" r="6" fill="#3374B5" />
        <path d="M12 36 Q12 28 24 28 Q36 28 36 36" fill="#3374B5" opacity="0.4" />
      </svg>
    );
  }
}

export default function ShopPage() {
  const [category, setCategory] = useState("all");

  const filtered = category === "all" ? products : products.filter((p) => p.category === category);

  return (
    <div className="perspective-container">
      {/* Hero */}
      <section className="relative py-24 px-4 overflow-hidden" style={{ background: "linear-gradient(135deg, #2D1D0F 0%, #1a120a 50%, #2D1D0F 100%)" }}>
        <div className="absolute inset-0 overflow-hidden opacity-10">
          <div className="absolute top-10 left-12 animate-float"><ShoppingBagIcon className="w-20 h-20 opacity-40" /></div>
          <div className="absolute bottom-8 right-16 animate-float delay-400"><BoxIcon className="w-16 h-16 opacity-30" /></div>
        </div>
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-block mb-6 animate-float">
            <ShoppingBagIcon className="w-20 h-20 mx-auto" />
          </div>
          <h1 className="text-5xl md:text-6xl font-black uppercase text-[#F7E6C2] mb-6 animate-scale-in">
            Shipping Supplies
          </h1>
          <p className="text-[#F7E6C2]/60 max-w-xl mx-auto text-lg animate-fade-up delay-200">
            Custom envelopes, boxes, packing materials, and branded items — everything you need in one spot.
          </p>
        </div>
      </section>

      {/* Category filter + Products */}
      <section className="py-20 px-4 bg-[#F7E6C2]">
        <div className="max-w-5xl mx-auto">
          {/* Category pills */}
          <div className="flex flex-wrap gap-2 mb-10 justify-center animate-fade-up">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${category === cat.id ? "bg-[#2D1D0F] text-[#F7E6C2]" : "bg-white text-[#2D1D0F]/60 hover:bg-white/80"}`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Product grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-2xl overflow-hidden hover-tilt animate-fade-up"
                style={{ boxShadow: "0 8px 32px rgba(45,29,15,0.08)" }}
              >
                {/* Icon zone */}
                <div className="bg-[#FFFDF8] px-6 pt-6 pb-4 flex items-center justify-between">
                  <ProductIcon category={product.category} />
                  {product.popular && (
                    <span className="bg-[#3374B5] text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">Popular</span>
                  )}
                </div>
                <div className="px-6 pb-6">
                  <h3 className="font-black text-sm uppercase text-[#2D1D0F] mb-1">{product.name}</h3>
                  <p className="text-xs text-[#2D1D0F]/50 mb-3">{product.desc}</p>
                  <div className="flex items-center justify-between">
                    <span className="font-black text-lg text-[#3374B5]">{product.price}</span>
                    <Link
                      href="/contact"
                      className="text-xs font-bold text-[#2D1D0F]/50 border border-[#2D1D0F]/15 px-3 py-1.5 rounded-full hover:bg-[#F7E6C2] hover:text-[#2D1D0F] transition-all"
                    >
                      Inquire
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Order Info */}
      <section className="py-20 px-4 bg-[#FFFDF8]">
        <div
          className="max-w-3xl mx-auto rounded-3xl p-12 text-center animate-fade-up"
          style={{ background: "linear-gradient(135deg, #2D1D0F 0%, #1a120a 100%)", boxShadow: "0 20px 60px rgba(45,29,15,0.3)" }}
        >
          <h2 className="text-3xl font-black uppercase text-[#F7E6C2] mb-3">Ready to Order?</h2>
          <p className="text-[#F7E6C2]/60 mb-8">Visit us in-store to purchase supplies, or send us a message with your order.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="bg-[#3374B5] text-white font-bold px-8 py-4 rounded-full hover:bg-[#2960A0] transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              Send a Message
            </Link>
            <Link
              href="/signup"
              className="bg-[#F7E6C2] text-[#2D1D0F] font-bold px-8 py-4 rounded-full hover:bg-white transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              Get a Mailbox
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
