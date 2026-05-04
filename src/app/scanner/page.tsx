// iter-109 — Bureau scanner PWA entry. Server actions inside ScannerClient
// (logScannedInbound, findCustomersForScan) enforce verifyAdmin so we don't
// need to gate the page itself.

import { ScannerClient } from "./ScannerClient";

export const dynamic = "force-dynamic";

export default function ScannerPage() {
  return <ScannerClient />;
}
