import { verifyAdmin } from "@/lib/dal";
import DisplayClient from "./DisplayClient";

// Customer-facing kiosk view (iter-30) — opened in a separate window via POP OUT
// from the main POS panel. Listens on BroadcastChannel("noho-pos") for live
// cart/total/method updates from the cabinet and renders a customer-friendly
// large-format view designed for a second monitor or kiosk display.
export default async function POSDisplayPage() {
  await verifyAdmin();
  return <DisplayClient />;
}
