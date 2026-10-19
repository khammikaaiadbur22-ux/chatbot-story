import { NextRequest, NextResponse } from "next/server";
import type { ModelMessage } from "ai";
import { prisma } from "@/lib/prisma";
import { generateReply, getSystemPrompt, parseReply } from "@/lib/ai";
import { cleanName, containsProfanity, mergeProfile, readStoredMeta } from "@/lib/story";
import { CONVERSATION_STEP, STORY_MESSAGE_STEP, type ChatMessage, type ChatResponse, type Profile } from "@/lib/types";
import { saveStoryRecord } from "@/lib/store";

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
    const {
      conversationId,
      message,
      history: clientHistory,
      profile: clientProfile,
      userNickname,
      userId,
      studentId,
    } = body;
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
    const studentIdentifier =
      studentId || (clientProfile as any)?.studentId || dbConversation?.user?.studentId || "";

    // 1. Always save to resilient storage so Teacher Dashboard sees it immediately
    const convKey = conversationId || `conv_${Date.now()}`;
    saveStoryRecord({
      id: convKey,
      nickname: name || nickname,
      studentId: studentIdentifier,
      title,
      moralLesson: isStory ? parsed.story?.moral : undefined,
      fullStory: isStory ? parsed.reply : (fullStory || undefined),
      profile,
      currentStep: isStory ? 4 : (profile.hobbies?.length || profile.likes?.length ? 2 : 1),
    });

    // 2. Persist to PostgreSQL DB if reachable
    try {
      if (conversationId) {
        let currentUserId = dbConversation?.userId;
        if (!currentUserId) {
          const effectiveUsername = userId || (name ? `student_${name}` : `student_${Date.now()}`);
          const user = await prisma.user.upsert({
            where: { username: effectiveUsername },
            update: {
              nickname: name || nickname || undefined,
              studentId: studentIdentifier || undefined,
            },
            create: {
              username: effectiveUsername,
              nickname: name || nickname || "",
              studentId: studentIdentifier || null,
              role: "STUDENT",
            },
          });
          currentUserId = user.id;
        } else if (name || studentIdentifier) {
          await prisma.user.update({
            where: { id: currentUserId },
            data: {
              nickname: name || nickname || undefined,
              studentId: studentIdentifier || undefined,
            },
          }).catch(() => {});
        }

        if (!dbConversation) {
          dbConversation = await prisma.conversation.upsert({
            where: { id: conversationId },
            update: {},
            create: {
              id: conversationId,
              userId: currentUserId,
              title,
              theme: "นิทานอีสป",
              currentStep: 1,
            },
          });
        }

        const charactersToSave = parsed.story?.characters
          ? JSON.stringify(parsed.story.characters)
          : dbConversation.characters || undefined;

        await prisma.$transaction([
          prisma.message.create({
            data: {
              conversationId,
              role: "user",
              content: text,
              step: 1,
            },
          }),
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
              currentStep: isStory ? 4 : (profile.hobbies?.length || profile.likes?.length ? 2 : (dbConversation.currentStep || 1)),
              moralLesson: isStory ? parsed.story?.moral : dbConversation.moralLesson,
              status: isStory ? "COMPLETED" : dbConversation.status,
              characters: charactersToSave,
              plotSummary: JSON.stringify({
                profile,
                fullStory: isStory ? parsed.reply : (fullStory || ""),
              }),
            },
          }),
        ]);
      }
    } catch (saveErr) {
      console.warn("[api/chat] DB save skipped (using local storage fallback):", (saveErr as Error)?.message);
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
