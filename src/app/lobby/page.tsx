// iter-195 — Bureau lobby digital signage (Tier 13 #104).
//
// Public, unauthed kiosk page meant for a wall-mounted iPad in the
// front lobby. Wraps the client `<LobbyBoard>` in a force-dynamic
// host so the initial paint reflects current data; the client itself
// repolls every 30s.

import LobbyBoard from "./LobbyBoard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Lobby · NOHO Mailbox",
  description: "Live waiting-list, tours, and open-status display for the NOHO Mailbox lobby.",
};

export default function LobbyPage() {
  return <LobbyBoard />;
}
