import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const suite = url.searchParams.get("suite") ?? "";
  const email = url.searchParams.get("email") ?? "";
  if (!suite && !email) {
    return NextResponse.json({ error: "Provide ?suite= or ?email=" }, { status: 400 });
  }
  const u = await prisma.user.findFirst({
    where: {
      ...(suite ? { suiteNumber: suite } : {}),
      ...(email ? { email: email.toLowerCase() } : {}),
    },
    select: { id: true, name: true, suiteNumber: true, email: true },
  });
  if (!u) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(u);
}
