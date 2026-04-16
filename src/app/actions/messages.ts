"use server";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
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

export async function listThreads(folder = "Inbox") {
  const user = await verifySession();
  const userId = user.id!;

  const threads = await prisma.messageThread.findMany({
    where: { folder },
    orderBy: { lastMessageAt: "desc" },
    take: 50,
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { attachments: true },
      },
    },
  });

  return threads
    .filter((t) => parseJsonArray(t.participantIds).includes(userId))
    .map((t) => ({
      id: t.id,
      subject: t.subject,
      lastMessageAt: t.lastMessageAt,
      unread: parseJsonArray(t.unreadForUserIds).includes(userId),
      preview: t.messages[0]?.body.slice(0, 120) ?? "",
      attachmentCount: t.messages[0]?.attachments.length ?? 0,
    }));
}

export async function getThread(threadId: string) {
  const user = await verifySession();
  const userId = user.id!;

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
  if (!parseJsonArray(thread.participantIds).includes(userId)) {
    return { error: "Not authorized" as const };
  }

  // Mark read
  const unread = parseJsonArray(thread.unreadForUserIds).filter((id) => id !== userId);
  await prisma.messageThread.update({
    where: { id: threadId },
    data: { unreadForUserIds: JSON.stringify(unread) },
  });

  return { thread };
}

export async function sendMessage(input: {
  threadId?: string;
  subject?: string;
  recipientUserId?: string; // omit for "send to staff"
  body: string;
  attachments?: { filename: string; mimeType: string; sizeBytes: number; blobUrl: string; kind: string }[];
}) {
  const sessionUser = await verifySession();
  const senderId = sessionUser.id!;

  if (!input.body.trim()) return { error: "Message body required" };

  // Resolve participants. If recipientUserId is omitted, route to all admins.
  let participants: string[];
  if (input.threadId) {
    const t = await prisma.messageThread.findUnique({ where: { id: input.threadId } });
    if (!t) return { error: "Thread not found" };
    participants = parseJsonArray(t.participantIds);
  } else if (input.recipientUserId) {
    participants = [senderId, input.recipientUserId];
  } else {
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });
    participants = [senderId, ...admins.map((a) => a.id)];
  }

  let threadId = input.threadId;
  if (!threadId) {
    const thread = await prisma.messageThread.create({
      data: {
        subject: input.subject ?? "(no subject)",
        participantIds: JSON.stringify(participants),
        folder: "Inbox",
        unreadForUserIds: JSON.stringify(participants.filter((id) => id !== senderId)),
        lastMessageAt: new Date(),
      },
    });
    threadId = thread.id;
  } else {
    await prisma.messageThread.update({
      where: { id: threadId },
      data: {
        lastMessageAt: new Date(),
        unreadForUserIds: JSON.stringify(
          participants.filter((id) => id !== senderId)
        ),
      },
    });
  }

  const message = await prisma.message.create({
    data: {
      threadId,
      senderId,
      body: input.body.trim(),
      readByIds: JSON.stringify([senderId]),
    },
  });

  if (input.attachments && input.attachments.length > 0) {
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

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { success: true, threadId };
}

export async function archiveThread(threadId: string) {
  await verifySession();
  await prisma.messageThread.update({
    where: { id: threadId },
    data: { folder: "Archive" },
  });
  revalidatePath("/dashboard");
  return { success: true };
}

export async function trashThread(threadId: string) {
  await verifySession();
  await prisma.messageThread.update({
    where: { id: threadId },
    data: { folder: "Trash" },
  });
  revalidatePath("/dashboard");
  return { success: true };
}
