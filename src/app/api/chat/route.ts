import { NextRequest, NextResponse } from "next/server";
import type { ModelMessage } from "ai";
import { prisma } from "@/lib/prisma";
import { generateReply, getSystemPrompt, parseReply } from "@/lib/ai";
import { cleanName, containsProfanity, mergeProfile, readStoredMeta } from "@/lib/story";
import { CONVERSATION_STEP, STORY_MESSAGE_STEP, type ChatMessage, type ChatResponse, type Profile } from "@/lib/types";

export const maxDuration = 60;

const HISTORY_LIMIT = 40;
const DEFAULT_TITLES = new Set([
  "นิทานเรื่องใหม่",
  "นิทานของฉัน",
  "นิทานเรื่องใหม่ของฉัน",
  "นิทานอีสปเรื่องใหม่ของฉัน",
]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conversationId, message, history: clientHistory, profile: clientProfile, userNickname } = body;
    const text = typeof message === "string" ? message.trim().slice(0, 2000) : "";

    if (!text) {
      return NextResponse.json({ error: "ต้องมีข้อความ" }, { status: 400 });
    }

    if (containsProfanity(text)) {
      return NextResponse.json({
        reply: "อุ๊ย คำนี้ไม่ค่อยน่ารักเลยนะ 🙏 ลองพูดใหม่ด้วยคำสุภาพ แล้วเรามาแต่งนิทานกันต่อนะจ๊ะ",
        stage: "discover",
        isStory: false,
        title: "",
        profile: clientProfile || {},
        messageId: `warn-${Date.now()}`,
      } satisfies ChatResponse);
    }

    // Try to load conversation and history from DB, but gracefully fall back to client state
    let dbConversation: any = null;
    let storedProfile: Profile = clientProfile || {};
    let fullStory = "";
    let effectiveTitle = "นิทานของฉัน";

    if (conversationId) {
      try {
        dbConversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
          include: {
            user: true,
            messages: { orderBy: { createdAt: "desc" }, take: HISTORY_LIMIT },
          },
        });
        if (dbConversation) {
          const stored = readStoredMeta(dbConversation.plotSummary);
          storedProfile = mergeProfile(stored.profile, clientProfile);
          fullStory = stored.fullStory;
          effectiveTitle = dbConversation.title;
        }
      } catch (dbErr) {
        console.warn("[api/chat] DB load skipped (using client memory):", (dbErr as Error)?.message);
      }
    }

    const nickname = cleanName(dbConversation?.user?.nickname || userNickname || storedProfile.name);
    const knownProfile = mergeProfile(storedProfile, { name: storedProfile.name || nickname });

    const system = `${getSystemPrompt()}

## ข้อมูลที่ลุงรู้แล้วเกี่ยวกับผู้ใช้คนนี้
${JSON.stringify(knownProfile)}
${knownProfile.name ? `(รู้ชื่อแล้ว ห้ามถามชื่ออีก)` : "(ยังไม่รู้ชื่อ)"}`;

    // Build history from DB or client
    let history: ModelMessage[] = [];
    if (dbConversation && dbConversation.messages?.length > 0) {
      history = dbConversation.messages
        .slice()
        .reverse()
        .map((m: any) => ({
          role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
          content: m.content,
        }));
    } else if (Array.isArray(clientHistory) && clientHistory.length > 0) {
      history = clientHistory.map((m: ChatMessage) => ({
        role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: m.content,
      }));
    }

    // Gemini expects the conversation to start with a user turn
    while (history.length && history[0].role === "assistant") {
      history.shift();
    }

    const raw = await generateReply(system, [...history, { role: "user", content: text }]);
    const parsed = parseReply(raw);
    if (!parsed.reply) throw new Error("AI ส่งข้อความว่างกลับมา");

    const profile = mergeProfile(knownProfile, parsed.profile);
    const isStory = parsed.stage === "story" && !!parsed.story;
    const name = cleanName(profile.name);

    let title = effectiveTitle;
    if (isStory && parsed.story) {
      title = parsed.story.title;
    } else if (name && DEFAULT_TITLES.has(title)) {
      title = `นิทานของ${name}`;
    }

    const generatedMessageId = `asst-${Date.now()}`;

    // Try to persist to DB if available
    if (conversationId && dbConversation) {
      try {
        await prisma.$transaction([
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
              currentStep: isStory ? CONVERSATION_STEP.STORY_DONE : dbConversation.currentStep,
              moralLesson: isStory ? parsed.story?.moral : dbConversation.moralLesson,
              status: isStory ? "COMPLETED" : dbConversation.status,
              plotSummary: JSON.stringify({
                profile,
                fullStory: isStory ? parsed.reply : fullStory,
              }),
            },
          }),
          ...(name && name !== nickname
            ? [prisma.user.update({ where: { id: dbConversation.userId }, data: { nickname: name } })]
            : []),
        ]);
      } catch (saveErr) {
        console.warn("[api/chat] DB save skipped (client will hold state):", (saveErr as Error)?.message);
      }
    }

    return NextResponse.json({
      reply: parsed.reply,
      stage: parsed.stage,
      isStory,
      title,
      profile,
      messageId: generatedMessageId,
    } satisfies ChatResponse);
  } catch (error) {
    console.error("[api/chat] Error:", error);
    return NextResponse.json(
      { error: "ลุงเชื่อมต่อไม่ได้ชั่วคราว ลองส่งใหม่อีกครั้งนะ" },
      { status: 503 }
    );
  }
}
