// iter-207 — Public lobby selfie wall (Tier 15 #116).
//
// Auto-rotating carousel of opted-in member photos. Designed for a
// wall-mounted iPad in the lobby OR shareable on social. Public, no
// auth — only Approved entries surface (member can revoke anytime).

import LobbyWallClient from "./LobbyWallClient";
import { getActiveLobbyWallEntries } from "@/app/actions/lobbyWall";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Member wall",
  description: "Meet the NOHO Mailbox community — the snowbirds, founders, students, and locals who call our suites home.",
};

export default async function WallPage() {
  const entries = await getActiveLobbyWallEntries();
  return <LobbyWallClient entries={entries} />;
}
