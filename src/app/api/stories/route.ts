import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cleanName, greetingFor, readStoredMeta } from "@/lib/story";
import { STORY_MESSAGE_STEP, type ChatMessage, type ConversationSummary } from "@/lib/types";

async function findOrCreateUser(userId: string) {
  return prisma.user.upsert({
    where: { username: userId },
    update: {},
    create: { username: userId, nickname: "", role: "STUDENT" },
  });
}

async function createConversation(userId: string, nickname: string) {
  return prisma.conversation.create({
    data: {
      userId,
      title: nickname ? `นิทานของ${nickname}` : "นิทานเรื่องใหม่",
      theme: "นิทานอีสป",
      messages: { create: { role: "assistant", content: greetingFor(nickname), step: 1 } },
    },
  });
}

function toSummary(c: { id: string; title: string; updatedAt: Date; currentStep: number }): ConversationSummary {
  return { id: c.id, title: c.title, updatedAt: c.updatedAt.toISOString(), hasStory: c.currentStep >= 2 };
}

/**
 * GET ?userId=…          → profile + conversation list (creates the first conversation if needed)
 * GET ?conversationId=…  → messages of one conversation
 * GET ?role=TEACHER      → all stories for the teacher dashboard
 */
export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const conversationId = params.get("conversationId");
    const userId = params.get("userId");

    if (conversationId) {
      const conv = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });
      if (!conv) return NextResponse.json({ error: "ไม่พบนิทานนี้" }, { status: 404 });

      const messages: ChatMessage[] = conv.messages.map((m) => ({
        id: m.id,
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
        isStory: m.step === STORY_MESSAGE_STEP,
        createdAt: m.createdAt.toISOString(),
      }));
      return NextResponse.json({ conversation: { ...toSummary(conv), messages } });
    }

    if (params.get("role") === "TEACHER") {
      const all = await prisma.conversation.findMany({
        include: { user: true, _count: { select: { messages: true } } },
        orderBy: { updatedAt: "desc" },
      });
      const stories = all.map((s) => {
        const meta = readStoredMeta(s.plotSummary);
        return {
          ...toSummary(s),
          moralLesson: s.moralLesson || "",
          fullStory: meta.fullStory,
          profile: meta.profile,
          messageCount: s._count.messages,
          student: {
            nickname: cleanName(s.user.nickname) || cleanName(meta.profile.name) || "ไม่ระบุชื่อ",
            studentId: s.user.studentId || "",
          },
        };
      });
      return NextResponse.json({ stories });
    }

    if (userId) {
      const user = await findOrCreateUser(userId);
      let conversations = await prisma.conversation.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true, updatedAt: true, currentStep: true },
      });
      if (conversations.length === 0) {
        conversations = [await createConversation(user.id, cleanName(user.nickname))];
      }
      return NextResponse.json({
        user: { nickname: cleanName(user.nickname), studentId: user.studentId || "" },
        conversations: conversations.map(toSummary),
      });
    }

    return NextResponse.json({ error: "ต้องระบุ userId หรือ conversationId" }, { status: 400 });
  } catch (error) {
    console.error("[api/stories GET]", error);
    return NextResponse.json({ error: "โหลดข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}

/** POST { userId } → start a new conversation. */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "ต้องระบุ userId" }, { status: 400 });

    const user = await findOrCreateUser(userId);
    const conv = await createConversation(user.id, cleanName(user.nickname));
    return NextResponse.json({ conversation: toSummary(conv) });
  } catch (error) {
    console.error("[api/stories POST]", error);
    return NextResponse.json({ error: "สร้างนิทานใหม่ไม่สำเร็จ" }, { status: 500 });
  }
}

/** PATCH { userId, nickname, studentId } → update the learner profile. */
export async function PATCH(req: NextRequest) {
  try {
    const { userId, nickname, studentId } = await req.json();
    if (!userId) return NextResponse.json({ error: "ต้องระบุ userId" }, { status: 400 });

    await findOrCreateUser(userId);
    const user = await prisma.user.update({
      where: { username: userId },
      data: {
        nickname: String(nickname ?? "").trim().slice(0, 40),
        studentId: String(studentId ?? "").trim().slice(0, 20) || null,
      },
    });
    return NextResponse.json({ user: { nickname: cleanName(user.nickname), studentId: user.studentId || "" } });
  } catch (error) {
    console.error("[api/stories PATCH]", error);
    return NextResponse.json({ error: "บันทึกโปรไฟล์ไม่สำเร็จ" }, { status: 500 });
  }
}

/** DELETE ?conversationId=…&userId=… → remove one of the learner's conversations. */
export async function DELETE(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const conversationId = params.get("conversationId");
    const userId = params.get("userId");
    if (!conversationId || !userId) {
      return NextResponse.json({ error: "ต้องระบุ conversationId และ userId" }, { status: 400 });
    }
    const { count } = await prisma.conversation.deleteMany({
      where: { id: conversationId, user: { username: userId } },
    });
    return NextResponse.json({ deleted: count });
  } catch (error) {
    console.error("[api/stories DELETE]", error);
    return NextResponse.json({ error: "ลบไม่สำเร็จ" }, { status: 500 });
  }
}
