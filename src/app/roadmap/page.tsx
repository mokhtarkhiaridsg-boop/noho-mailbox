// iter-226 — Public roadmap voting page (Tier 16 #135).

import RoadmapClient from "./RoadmapClient";
import { listRoadmapItems } from "@/app/actions/publicRoadmap";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Public roadmap · NOHO Mailbox",
  description: "Vote on what NOHO Mailbox builds next. Members can upvote upcoming features to influence the priority order.",
};

export default async function RoadmapPage() {
  const items = await listRoadmapItems({});
  return <RoadmapClient initialItems={items} />;
}
