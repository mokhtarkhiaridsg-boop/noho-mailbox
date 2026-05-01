"use server";

/**
 * NOHO Mailbox — Messenger-style direct chat between admin and member.
 * Reuses MessageThread + Message schema (1:1 thread per (admin, member) pair),
 * presented as live bubbles instead of subject/body emails. Polled by the
 * client every few seconds for new messages.
 */
import { prisma } from "@/lib/prisma";
import { verifyAdmin, verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";

function parseJsonArray(s: string | null | undefined): string[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function normalize(ids: string[]): string[] {
  return Array.from(new Set(ids)).sort();
}

// ─── Find or create a direct 1:1 thread between two users ───────────────────
async function ensureDirectThread(a: string, b: string) {
  const want = normalize([a, b]);

  // Pull a small window of recent threads where one of the two users is a
  // participant; cheaper than scanning the full table.
  const candidates = await prisma.messageThread.findMany({
    where: { folder: { not: "Trash" } },
    orderBy: { lastMessageAt: "desc" },
    take: 200,
  });
  for (const t of candidates) {
    const ids = normalize(parseJsonArray(t.participantIds));
    if (
      ids.length === 2 &&
      ids[0] === want[0] &&
      ids[1] === want[1]
    ) {
      return t.id;
    }
  }

  const created = await prisma.messageThread.create({
    data: {
      subject: "Direct chat",
      participantIds: JSON.stringify(want),
      folder: "Inbox",
      unreadForUserIds: JSON.stringify([]),
      lastMessageAt: new Date(),
    },
  });
  return created.id;
}

// ─── Admin: open / create a chat with a specific customer ──────────────────
export async function getOrCreateDirectChatAsAdmin(customerId: string) {
  const admin = await verifyAdmin();
  if (!customerId) return { error: "customerId required" };
  const threadId = await ensureDirectThread(admin.id!, customerId);
  return { success: true, threadId };
}

// ─── Member: open / create their chat with an admin ────────────────────────
// Routes to the most recently-active admin so the conversation is consistent.
export async function getOrCreateMyChat() {
  const session = await verifySession();
  const userId = session.id!;

  // Pick the most recently active admin (with a fallback to first admin).
  const admin =
    (await prisma.user.findFirst({
      where: { role: "ADMIN" },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    })) ??
    (await prisma.user.findFirst({
      where: { role: "ADMIN" },
      select: { id: true },
    }));
  if (!admin) return { error: "No admin available right now" };

  const threadId = await ensureDirectThread(userId, admin.id);
  return { success: true, threadId, adminId: admin.id };
}

// ─── List chats for the current user (admin gets all, member gets theirs) ──
export async function listChats() {
  const session = await verifySession();
  const userId = session.id!;

  const threads = await prisma.messageThread.findMany({
    where: { folder: { not: "Trash" } },
    orderBy: { lastMessageAt: "desc" },
    take: 200,
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const mine = threads.filter((t) =>
    parseJsonArray(t.participantIds).includes(userId),
  );

  // Resolve "other" participant for display — works for 1:1 only.
  const otherIds = new Set<string>();
  mine.forEach((t) => {
    parseJsonArray(t.participantIds)
      .filter((id) => id !== userId)
      .forEach((id) => otherIds.add(id));
  });
  const otherUsers = await prisma.user.findMany({
    where: { id: { in: Array.from(otherIds) } },
    select: { id: true, name: true, suiteNumber: true, role: true, email: true },
  });
  const userMap = new Map(otherUsers.map((u) => [u.id, u]));

  return mine.map((t) => {
    const others = parseJsonArray(t.participantIds).filter((id) => id !== userId);
    const primary = others.map((id) => userMap.get(id)).filter(Boolean)[0];
    const last = t.messages[0];
    return {
      threadId: t.id,
      otherUserId: primary?.id ?? null,
      otherName: primary?.name ?? "Conversation",
      otherSuiteNumber: primary?.suiteNumber ?? null,
      otherRole: primary?.role ?? null,
      otherEmail: primary?.email ?? null,
      lastMessageAt: t.lastMessageAt.toISOString(),
      lastMessagePreview: last?.body.slice(0, 100) ?? "",
      lastSenderId: last?.senderId ?? null,
      unread: parseJsonArray(t.unreadForUserIds).includes(userId),
    };
  });
}

// ─── Fetch messages for a thread; marks read for the caller ────────────────
export async function getChatMessages(threadId: string) {
  const session = await verifySession();
  const userId = session.id!;

  const thread = await prisma.messageThread.findUnique({
    where: { id: threadId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        include: { attachments: true },
      },
    },
  });
  if (!thread) return { error: "Thread not found" as const };
  const participants = parseJsonArray(thread.participantIds);
  if (!participants.includes(userId)) return { error: "Not authorized" as const };

  // Mark read by removing me from unreadForUserIds.
  const unread = parseJsonArray(thread.unreadForUserIds).filter((id) => id !== userId);
  if (unread.length !== parseJsonArray(thread.unreadForUserIds).length) {
    await prisma.messageThread.update({
      where: { id: threadId },
      data: { unreadForUserIds: JSON.stringify(unread) },
    });
  }

  return {
    success: true as const,
    messages: thread.messages.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
      attachments: m.attachments.map((a) => ({
        id: a.id,
        filename: a.filename,
        url: a.blobUrl,
        kind: a.kind,
        mimeType: a.mimeType,
        sizeBytes: a.sizeBytes,
      })),
    })),
  };
}

// ─── Send a message in an existing thread ──────────────────────────────────
export async function sendChatMessage(input: {
  threadId: string;
  body: string;
  attachments?: { filename: string; mimeType: string; sizeBytes: number; blobUrl: string; kind: string }[];
}) {
  const session = await verifySession();
  const senderId = session.id!;

  const text = (input.body ?? "").trim();
  if (!text && (!input.attachments || input.attachments.length === 0)) {
    return { error: "Empty message" };
  }

  const thread = await prisma.messageThread.findUnique({
    where: { id: input.threadId },
  });
  if (!thread) return { error: "Thread not found" };
  const participants = parseJsonArray(thread.participantIds);
  if (!participants.includes(senderId)) return { error: "Not authorized" };

  await prisma.messageThread.update({
    where: { id: input.threadId },
    data: {
      lastMessageAt: new Date(),
      // Mark unread for everyone except the sender.
      unreadForUserIds: JSON.stringify(participants.filter((id) => id !== senderId)),
    },
  });

  const message = await prisma.message.create({
    data: {
      threadId: input.threadId,
      senderId,
      body: text,
      readByIds: JSON.stringify([senderId]),
    },
  });

  if (input.attachments?.length) {
    await prisma.messageAttachment.createMany({
      data: input.attachments.map((a) => ({
        messageId: message.id,
        filename: a.filename,
        mimeType: a.mimeType,
        sizeBytes: a.sizeBytes,
        blobUrl: a.blobUrl,
        kind: a.kind,
      })),
    });
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true, messageId: message.id };
}

export async function markChatRead(threadId: string) {
  const session = await verifySession();
  const userId = session.id!;
  const t = await prisma.messageThread.findUnique({ where: { id: threadId } });
  if (!t) return { error: "Thread not found" };
  const unread = parseJsonArray(t.unreadForUserIds).filter((id) => id !== userId);
  await prisma.messageThread.update({
    where: { id: threadId },
    data: { unreadForUserIds: JSON.stringify(unread) },
  });
  return { success: true };
}
