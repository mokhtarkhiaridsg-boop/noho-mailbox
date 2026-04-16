"use client";

import { useEffect } from "react";

export function HomepageClient() {
  useEffect(() => {
    // Trigger fade-up animations when elements scroll into view
    const els = document.querySelectorAll<HTMLElement>(
      ".animate-fade-up, .animate-scale-in, .animate-slide-left, .animate-slide-right"
    );

    if (!els.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    els.forEach((el) => {
      // Elements in the hero (first section) play immediately
      if (el.closest("section")?.classList.contains("min-h-[90vh]")) return;
      el.style.opacity = "0";
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
