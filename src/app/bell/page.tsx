// iter-217 — Public pickup-bell QR landing (Tier 16 #126).
//
// Customer scans the front-desk bell QR and lands here. Single
// big input for suite #, big "Ring bell" CTA. Designed for one-
// handed phone use in the lobby.

import BellClient from "./BellClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ring the bell",
  description: "Tell the front desk you're here for a pickup.",
};

export default function BellPage() {
  return <BellClient />;
}
