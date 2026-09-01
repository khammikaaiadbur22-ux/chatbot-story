import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const role = searchParams.get("role");
    const conversationId = searchParams.get("conversationId");

    // Fetch specific conversation
    if (conversationId) {
      const conv = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          user: true,
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!conv) {
        return NextResponse.json({ error: "Story not found" }, { status: 404 });
      }

      let parsedUserProfile = null;
      let parsedFullStory = "";
      try {
        if (conv.plotSummary && conv.plotSummary.startsWith("{")) {
          const parsed = JSON.parse(conv.plotSummary);
          if (parsed.userProfile) parsedUserProfile = parsed.userProfile;
          if (parsed.fullStory) parsedFullStory = parsed.fullStory;
        }
      } catch (e) {}

      return NextResponse.json({
        conversation: {
          ...conv,
          characters: conv.characters ? JSON.parse(conv.characters) : [],
          backdrops: conv.backdrops ? JSON.parse(conv.backdrops) : [],
          userProfile: parsedUserProfile,
          fullStory: parsedFullStory,
        },
      });
    }

    // Teacher View: Get all stories
    if (role === "TEACHER") {
      const allStories = await prisma.conversation.findMany({
        include: {
          user: true,
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      const formatted = allStories.map((s) => {
        let userProfile = null;
        try {
          if (s.plotSummary && s.plotSummary.startsWith("{")) {
            const parsed = JSON.parse(s.plotSummary);
            if (parsed.userProfile) userProfile = parsed.userProfile;
          }
        } catch (e) {}

        return {
          ...s,
          characters: s.characters ? JSON.parse(s.characters) : [],
          backdrops: s.backdrops ? JSON.parse(s.backdrops) : [],
          userProfile,
        };
      });

      return NextResponse.json({ stories: formatted });
    }

    // Student View: Get or find existing story for user
    if (userId) {
      // Find or create user
      let user = await prisma.user.findUnique({
        where: { username: userId },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            username: userId,
            nickname: "",
            role: "STUDENT",
          },
        });
      }

      let conv = await prisma.conversation.findFirst({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
        include: {
          user: true,
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!conv) {
        // Create initial story session
        conv = await prisma.conversation.create({
          data: {
            userId: user.id,
            title: "นิทานของฉัน",
            currentStep: 1,
            theme: "นิทานสร้างสรรค์",
          },
          include: {
            user: true,
            messages: true,
          },
        });

        // Initial greeting: Natural, warm, asking for name first
        const studentNick =
          user.nickname &&
          user.nickname !== "นักศึกษา ปวช. 1" &&
          user.nickname !== "นักศึกษาคนเก่ง"
            ? user.nickname
            : "";

        const initialContent = studentNick
          ? `สวัสดีครับ${studentNick} 😊 ยินดีต้อนรับนะ! ลุงอยากรู้จัก${studentNick}มากขึ้นอีกนิด... เวลาว่าง${studentNick}ชอบทำอะไรที่สุด?`
          : `สวัสดี! ดีใจที่ได้เจอเพื่อนนักสร้างเรื่องคนใหม่ 😊\n\nก่อนอื่นเลย ลุงขอรู้จักหน่อย... หนูอยากให้ลุงเรียกว่าอะไรดี?`;

        const welcomeMessage = await prisma.message.create({
          data: {
            conversationId: conv.id,
            role: "assistant",
            content: initialContent,
            step: 1,
          },
        });

        conv.messages = [welcomeMessage];
      }

      let parsedUserProfile = null;
      let parsedFullStory2 = "";
      try {
        if (conv.plotSummary && conv.plotSummary.startsWith("{")) {
          const parsed = JSON.parse(conv.plotSummary);
          if (parsed.userProfile) parsedUserProfile = parsed.userProfile;
          if (parsed.fullStory) parsedFullStory2 = parsed.fullStory;
        }
      } catch (e) {}

      return NextResponse.json({
        conversation: {
          ...conv,
          characters: conv.characters ? JSON.parse(conv.characters) : [],
          backdrops: conv.backdrops ? JSON.parse(conv.backdrops) : [],
          userProfile: parsedUserProfile,
          fullStory: parsedFullStory2,
        },
      });
    }

    return NextResponse.json(
      { error: "UserId or Teacher role required" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Stories GET error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch stories" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, title = "นิทานเรื่องใหม่ของฉัน", theme = "นิทานสร้างสรรค์" } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    let user = await prisma.user.findUnique({
      where: { username: userId },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          username: userId,
          nickname: "",
          role: "STUDENT",
        },
      });
    }

    const newConv = await prisma.conversation.create({
      data: {
        userId: user.id,
        title,
        theme,
        currentStep: 1,
      },
      include: {
        user: true,
      },
    });

    const studentNick =
      user.nickname &&
      user.nickname !== "นักศึกษา ปวช. 1" &&
      user.nickname !== "นักศึกษาคนเก่ง"
        ? user.nickname
        : "";

    const initialContent = studentNick
      ? `ยินดีต้อนรับกลับมาแต่งนิทานเรื่องใหม่ครับ${studentNick} 😊\nเวลาว่างตอนนี้ ${studentNick}กำลังสนใจหรือชอบทำอะไรที่สุด เล่าให้ลุงฟังหน่อยนะ!`
      : `สวัสดี! ดีใจที่ได้เจอเพื่อนนักสร้างเรื่องคนใหม่ 😊\n\nก่อนอื่นเลย ลุงขอรู้จักหน่อย... หนูอยากให้ลุงเรียกว่าอะไรดี?`;

    const welcomeMessage = await prisma.message.create({
      data: {
        conversationId: newConv.id,
        role: "assistant",
        content: initialContent,
        step: 1,
      },
    });

    return NextResponse.json({
      conversation: {
        ...newConv,
        messages: [welcomeMessage],
        characters: [],
        backdrops: [],
        scratchPlan: [],
        userProfile: null,
      },
    });
  } catch (error: any) {
    console.error("Stories POST error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create new story" },
      { status: 500 }
    );
  }
}
