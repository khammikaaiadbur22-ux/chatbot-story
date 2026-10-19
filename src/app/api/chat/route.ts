import { NextRequest, NextResponse } from "next/server";
import type { ModelMessage } from "ai";
import { prisma } from "@/lib/prisma";
import { generateReply, getSystemPrompt, parseReply } from "@/lib/ai";
import { cleanName, containsProfanity, mergeProfile, readStoredMeta } from "@/lib/story";
import { CONVERSATION_STEP, STORY_MESSAGE_STEP, type ChatResponse } from "@/lib/types";

export const maxDuration = 60;

const HISTORY_LIMIT = 40;
const DEFAULT_TITLES = new Set(["นิทานเรื่องใหม่", "นิทานของฉัน", "นิทานเรื่องใหม่ของฉัน", "นิทานอีสปเรื่องใหม่ของฉัน"]);

export async function POST(req: NextRequest) {
  try {
    const { conversationId, message } = await req.json();
    const text = typeof message === "string" ? message.trim().slice(0, 2000) : "";

    if (!conversationId || !text) {
      return NextResponse.json({ error: "ต้องมี conversationId และข้อความ" }, { status: 400 });
    }

    if (containsProfanity(text)) {
      return NextResponse.json({
        reply: "อุ๊ย คำนี้ไม่ค่อยน่ารักเลยนะ 🙏 ลองพูดใหม่ด้วยคำสุภาพ แล้วเรามาแต่งนิทานกันต่อนะจ๊ะ",
        stage: "discover",
        isStory: false,
        title: "",
        profile: {},
        messageId: `warn-${Date.now()}`,
      } satisfies ChatResponse);
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        user: true,
        messages: { orderBy: { createdAt: "desc" }, take: HISTORY_LIMIT },
      },
    });
    if (!conversation) {
      return NextResponse.json({ error: "ไม่พบห้องสนทนานี้" }, { status: 404 });
    }

    const stored = readStoredMeta(conversation.plotSummary);
    const nickname = cleanName(conversation.user.nickname);
    const knownProfile = mergeProfile(stored.profile, { name: stored.profile.name || nickname });

    const system = `${getSystemPrompt()}

## ข้อมูลที่ลุงรู้แล้วเกี่ยวกับผู้ใช้คนนี้
${JSON.stringify(knownProfile)}
${knownProfile.name ? `(รู้ชื่อแล้ว ห้ามถามชื่ออีก)` : "(ยังไม่รู้ชื่อ)"}`;

    const history: ModelMessage[] = conversation.messages
      .reverse()
      .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
    // Gemini expects the conversation to start with a user turn.
    while (history.length && history[0].role === "assistant") history.shift();

    const raw = await generateReply(system, [...history, { role: "user", content: text }]);
    const parsed = parseReply(raw);
    if (!parsed.reply) throw new Error("AI ส่งข้อความว่างกลับมา");

    const profile = mergeProfile(knownProfile, parsed.profile);
    const isStory = parsed.stage === "story" && !!parsed.story;
    const name = cleanName(profile.name);

    let title = conversation.title;
    if (isStory && parsed.story) title = parsed.story.title;
    else if (name && DEFAULT_TITLES.has(title)) title = `นิทานของ${name}`;

    const [, assistantMessage] = await prisma.$transaction([
      prisma.message.create({ data: { conversationId, role: "user", content: text, step: 1 } }),
      prisma.message.create({
        data: {
          conversationId,
          role: "assistant",
          content: parsed.reply,
          step: isStory ? STORY_MESSAGE_STEP : 1,
        },
      }),
      prisma.conversation.update({
        where: { id: conversationId },
        data: {
          title,
          currentStep: isStory ? CONVERSATION_STEP.STORY_DONE : conversation.currentStep,
          moralLesson: isStory ? parsed.story?.moral : conversation.moralLesson,
          status: isStory ? "COMPLETED" : conversation.status,
          plotSummary: JSON.stringify({ profile, fullStory: isStory ? parsed.reply : stored.fullStory }),
        },
      }),
      ...(name && name !== nickname
        ? [prisma.user.update({ where: { id: conversation.userId }, data: { nickname: name } })]
        : []),
    ]);

    return NextResponse.json({
      reply: parsed.reply,
      stage: parsed.stage,
      isStory,
      title,
      profile,
      messageId: assistantMessage.id,
    } satisfies ChatResponse);
  } catch (error) {
    console.error("[api/chat]", error);
    return NextResponse.json(
      { error: "ลุงเชื่อมต่อไม่ได้ชั่วคราว ลองส่งใหม่อีกครั้งนะ" },
      { status: 503 }
    );
  }
}
