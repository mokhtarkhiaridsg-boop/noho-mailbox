"use client";

import { BRAND, type MailItem } from "./types";
import { IconPackage, IconForward } from "@/components/MemberIcons";
import { requestPickup, requestForward } from "@/app/actions/mail";

type Props = {
  packages: MailItem[];
  isPending: boolean;
  runAction: (label: string, fn: () => Promise<unknown>) => void;
};

export default function PackagesPanel({ packages, isPending, runAction }: Props) {
  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{
        background: "white",
        border: `1px solid ${BRAND.border}`,
        boxShadow: "0 1px 0 rgba(51,116,181,0.04), 0 12px 32px rgba(14,34,64,0.06)",
      }}
    >
      <div
        className="px-6 py-4 flex items-center gap-2.5"
        style={{ borderBottom: `1px solid ${BRAND.border}` }}
      >
        <IconPackage className="w-4 h-4" style={{ color: BRAND.blue }} />
        <h2 className="font-black text-xs uppercase tracking-[0.16em]" style={{ color: BRAND.ink }}>
          Packages Awaiting You
        </h2>
      </div>
      {packages.length === 0 ? (
        <div className="p-12 text-center">
          <IconPackage
            className="w-12 h-12 mx-auto mb-3"
            style={{ color: BRAND.inkFaint }}
            strokeWidth={1.2}
          />
          <p className="text-sm font-bold" style={{ color: BRAND.inkSoft }}>
            No packages waiting
          </p>
        </div>
      ) : (
        packages.map((pkg) => (
          <div
            key={pkg.id}
            className="group p-4 sm:p-6 transition-colors hover:bg-[#3374B5]/4"
            style={{ borderBottom: `1px solid ${BRAND.border}` }}
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105"
                style={{
                  background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})`,
                  boxShadow: "0 6px 18px rgba(51,116,181,0.32)",
                }}
              >
                <IconPackage className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm sm:text-base font-black truncate" style={{ color: BRAND.ink }}>
                  {pkg.from}
                </p>
                <p className="text-xs mt-0.5" style={{ color: BRAND.inkSoft }}>
                  Arrived {pkg.date}
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-3 ml-[60px] sm:ml-[72px]">
              <button
                disabled={isPending}
                onClick={() => runAction("Pickup requested", () => requestPickup(pkg.id))}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-black text-white transition-all hover:-translate-y-0.5 disabled:opacity-50"
                style={{
                  background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})`,
                  boxShadow: "0 4px 14px rgba(51,116,181,0.32)",
                }}
              >
                Request Pickup
              </button>
              <button
                disabled={isPending}
                onClick={() => runAction("Forward requested", () => requestForward(pkg.id))}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-black transition-all hover:-translate-y-0.5 disabled:opacity-50"
                style={{
                  background: BRAND.blueSoft,
                  color: BRAND.blueDeep,
                  border: `1px solid ${BRAND.border}`,
                }}
              >
                Forward
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
