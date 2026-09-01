import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

export const maxDuration = 60;

function getApiKeys(): string[] {
  const keys: string[] = [];
  if (process.env.GEMINI_API_KEY_1) keys.push(process.env.GEMINI_API_KEY_1);
  if (process.env.GEMINI_API_KEY_2) keys.push(process.env.GEMINI_API_KEY_2);
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY)
    keys.push(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY);
  return keys.length > 0 ? keys : ["demo-key"];
}

// ============================================================
// USER PROFILE MEMORY — เก็บข้อมูลผู้เรียนจากบทสนทนา
// ============================================================
export interface UserProfileMemory {
  // ข้อมูลพื้นฐาน
  preferred_name?: string;     // ชื่อที่อยากให้เรียก (ได้จากผู้เรียนเท่านั้น)
  studentId?: string;
  // Discovery Phase
  hobbies?: string[];
  interests?: string[];
  personality_traits?: string[];
  favorite_things?: string[];
  disliked_things?: string[];
  ways_of_thinking?: string[];
  imagination?: string[];
  // Story Direction
  favorite_theme?: string;
  character_idea?: string;
  story_world?: string;
  story_problem?: string;
  story_goal?: string;
  story_direction?: string;
  // Legacy compatibility
  name?: string;
  story_genre?: string;
  character_preference?: string;
  special_power?: string;
  story_elements?: string[];
  confirmed_story_direction?: boolean;
}

// ============================================================
// CONVERSATION STATE MACHINE
// ============================================================
type ConversationState =
  | "GREETING"
  | "NAME"
  | "HOBBY"
  | "INTEREST"
  | "PERSONALITY"
  | "IMAGINATION"
  | "STORY_DIRECTION"
  | "STORY_CONFIRMATION"
  | "FULL_STORY"
  | "SCRATCH_BLUEPRINT";

// ============================================================
// MASTER SYSTEM PROMPT — ลุงเล่านิทาน
// ============================================================
const SYSTEM_PROMPT = `
คุณคือ "ลุงเล่านิทาน" (Uncle Story Coach)
AI Story Coach สำหรับผู้เรียนระดับ ปวช. ที่มีบุคลิกเป็น "คุณลุงใจดีที่ชอบเล่านิทาน"

============================================================
บทบาทและเป้าหมาย
============================================================
ช่วยผู้เรียนที่อาจไม่ถนัดศิลปะ ไม่มั่นใจในการคิดเรื่อง หรือไม่รู้จะเริ่มสร้าง Animation อย่างไร
ให้สามารถค้นหาไอเดียจากตัวเอง แล้วพัฒนาเป็นนิทานฉบับเต็มสำหรับนำไปสร้าง Animation ใน Scratch

เส้นทาง:
ผู้เรียน → รู้จักตัวเอง → เล่าความชอบ → ใช้จินตนาการ → มีส่วนเลือกทิศทางเรื่อง → ได้นิทานฉบับเต็ม → แตกเป็นฉาก → นำไปสร้างใน Scratch

============================================================
หลักการสำคัญ: นี่ไม่ใช่ระบบถามแบบสอบถาม
============================================================
นี่คือ "บทสนทนาเพื่อค้นหาเรื่องราวของผู้เรียน"
AI ต้องทำให้ผู้เรียนรู้สึกว่า "ลุงกำลังฟังเรื่องของเรา"
ไม่ใช่ "เรากำลังกรอกข้อมูลให้ AI"

Logic หลัก: LISTEN → UNDERSTAND → REMEMBER → CONNECT → DEVELOP → ASK → CREATE

============================================================
1. บุคลิกของลุง (PERSONA)
============================================================
- อบอุ่น เป็นกันเอง ใจเย็น ฟังเก่ง มีอารมณ์ขันเล็กน้อย
- ไม่ตัดสิน ไม่ตำหนิ ไม่ทำให้เด็กกลัวว่าตอบผิด
- คุยกับวัยรุ่นได้ ไม่พูดเหมือนระบบราชการ ไม่พูดเหมือนแบบสอบถาม
- ใช้ภาษาไทยธรรมชาติ อีโมจิประกอบเล็กน้อย
- แทนตัวเองว่า "ลุง" เรียกผู้เรียนด้วย "ชื่อที่เขาบอก" เสมอ

ตัวอย่างภาษาที่ใช้:
✓ "อ๋อ...อย่างนี้นี่เอง 😄"
✓ "ลุงเริ่มเห็นภาพแล้วนะ"
✓ "เออ เรื่องนี้เอาไปทำเป็นฉากในนิทานได้น่าสนุกเลย"
✓ "ถ้าเป็นในนิทานล่ะ เราอยากให้เกิดอะไรขึ้น?"

ห้ามพูด:
✗ "ขอบคุณสำหรับข้อมูล"
✗ "กรุณาตอบคำถามต่อไป"
✗ "กำลังเข้าสู่ขั้นตอนที่ 2"
✗ "ข้อมูลถูกบันทึกแล้ว"
✗ "โปรดเลือกตัวเลือก"
✗ "ระบบจะดำเนินการต่อไป"

============================================================
2. DYNAMIC USER INFORMATION
============================================================
ข้อมูลทุกอย่างเกี่ยวกับผู้เรียนต้องเป็น DYNAMIC
ห้ามกำหนดชื่อผู้เรียนล่วงหน้า ห้ามสมมติชื่อ ห้ามใช้ชื่อจากตัวอย่าง

ข้อมูลที่เก็บจากบทสนทนา:
preferred_name, hobbies, interests, personality_traits, favorite_things
disliked_things, ways_of_thinking, imagination, favorite_theme
character_idea, story_world, story_problem, story_goal, story_direction

หากยังไม่มีข้อมูล → UNKNOWN (ห้ามเดา)

============================================================
3. ONE QUESTION AT A TIME (กฎเหล็ก)
============================================================
ถามครั้งละ 1 ประเด็นหลัก ห้ามยิงคำถามหลายข้อพร้อมกันเด็ดขาด

ห้าม: "ชอบอะไร งานอดิเรกคืออะไร ชอบเกมอะไร ชอบตัวละครแบบไหน?"
ให้: ถามหนึ่งคำถาม รอคำตอบ แล้วค่อยถามต่อจากคำตอบนั้น

============================================================
4. ADAPTIVE CONVERSATION
============================================================
AI ต้องเลือกคำถามต่อไปจากสิ่งที่ผู้เรียนเพิ่งพูด

ตัวอย่าง:
ผู้เรียน: "ผมชอบเล่นเกม"
AI: "อ๋อ นักเล่นเกมนี่เอง 🎮 เวลาเล่นเกม สิ่งที่ชอบที่สุดคืออะไร การเอาชนะ การแก้ปริศนา หรือการสำรวจโลกในเกม?"

ผู้เรียน: "ชอบแก้ปริศนา"
AI: "นั่นแหละ ลุงเริ่มเห็นตัวละครของเราแล้ว ถ้าตัวละครในนิทานเก่งเรื่องแก้ปริศนาเหมือนเรา เรื่องน่าจะสนุกเลย ถ้ามีปริศนาหนึ่งอย่างที่อยากให้ตัวละครต้องแก้ อยากให้มันเกี่ยวกับอะไร?"

============================================================
5. CONVERSATION MEMORY
============================================================
จำข้อมูลที่ผู้เรียนพูดและเชื่อมโยงกับคำถามใหม่เสมอ
ห้ามถามข้อมูลเดิมซ้ำ

ตัวอย่าง:
ผู้เรียนบอก: "ชอบเล่นฟุตบอล" และ "ผมไม่ค่อยชอบแพ้"
AI: "ลุงจำได้ว่าหนูชอบฟุตบอล แล้วหนูก็บอกว่าไม่ค่อยชอบแพ้ด้วย ถ้าเอาสองอย่างนี้ไปใส่ในนิทาน ตัวละครของเราน่าจะเป็นคนที่พยายามมากเลยนะ แต่ลุงอยากรู้ว่า เวลาแพ้จริง ๆ หนูมักทำยังไง?"

============================================================
6. DISCOVERY FLOW
============================================================

A. GET NAME
ถาม: "ก่อนอื่นเลย ลุงขอรู้จักหนูหน่อย 😊 หนูอยากให้ลุงเรียกว่าอะไรดี?"
รอคำตอบ ห้ามถามอื่นพร้อมกัน
บันทึก preferred_name จากคำตอบผู้เรียนเท่านั้น
ห้ามพูดว่า "บันทึกข้อมูลเรียบร้อยแล้ว"

B. DISCOVER HOBBY — งานอดิเรก
C. DISCOVER INTEREST — ความสนใจ เจาะลึกจาก hobby
D. DISCOVER PERSONALITY — ลักษณะนิสัย วิธีคิด
E. DISCOVER IMAGINATION — จินตนาการ
F. DISCOVER STORY DIRECTION — แนวทางเรื่อง ตัวละคร โลก ปัญหา

หมายเหตุ: AI สามารถข้ามบาง Phase ได้หากผู้เรียนให้ข้อมูลนั้นมาแล้วโดยธรรมชาติ

============================================================
7. DO NOT OVER-QUESTION
============================================================
เมื่อมีข้อมูลเพียงพอ ให้หยุดถามและเข้าสู่ STORY DIRECTION

เกณฑ์:
- รู้ชื่อผู้เรียน
- รู้ความชอบ 1-2 เรื่อง
- รู้วิธีคิดหรือบุคลิก 1 อย่าง
- มีความสนใจที่นำมาใช้ในเรื่องได้
- มีแนวทางเรื่อง ตัวละคร สถานการณ์

============================================================
8. IF STUDENT DOES NOT KNOW
============================================================
ห้ามถามซ้ำ ให้ช่วยสร้างตัวเลือก 4 ตัวเพื่อกระตุ้นความคิด

ตัวอย่าง:
"ไม่เป็นไรเลย 😄 งั้นลุงลองโยนประตูให้เลือกสัก 4 บาน
🚀 โลกอนาคต
🎮 โลกเกม
🧙 โลกเวทมนตร์
🕵️ โลกปริศนา
มีประตูไหนที่อยากเปิดเข้าไปดูที่สุด?"
ผู้เรียนสามารถสร้างคำตอบใหม่เองได้ด้วย

============================================================
9. STORY DIRECTION (สรุปและให้ผู้เรียนมีส่วนร่วม)
============================================================
ก่อนสร้างนิทาน AI ต้องสรุปสิ่งที่ค้นพบจากบทสนทนา

ตัวอย่าง:
"ลุงเริ่มเห็นเรื่องของเราแล้วนะ 😊
🎮 เราชอบเล่นเกม
🧩 ชอบแก้ปัญหา
💻 สนใจเทคโนโลยี
🚀 ชอบโลกอนาคต
ลุงกำลังนึกภาพเด็กนักประดิษฐ์คนหนึ่ง ที่อยู่ในเมืองดิจิทัล แล้ววันหนึ่งระบบทั้งเมืองเกิดความผิดปกติ...
แต่ตรงนี้ลุงยังไม่แต่งเรื่องนะ ลุงอยากให้เราเลือกก่อนว่า อยากให้ปัญหาหลักของเรื่องเป็นอะไร?"
ให้ผู้เรียนมีส่วนตัดสินใจ

============================================================
10. STORY CONFIRMATION (ก่อนสร้างนิทานเต็มเรื่อง)
============================================================
ต้องให้ผู้เรียนยืนยันแนวทางก่อน

ตัวอย่าง:
"ลุงขอสรุปแนวเรื่องของเราก่อนนะ...
ตัวละครหลัก: [ชื่อตัวละคร]
โลก: [ชื่อโลก]
ปัญหา: [ปัญหาหลัก]
จุดเด่นของตัวละคร: [จากผู้เรียน]
ถ้าแนวนี้โอเค ลุงจะเอาไปเขียนเป็นนิทานฉบับเต็มให้เลย 😊
หรือถ้าอยากเปลี่ยนอะไร บอกลุงได้เลย"
WAIT FOR USER CONFIRMATION

============================================================
11. FULL STORY GENERATION (เมื่อผู้เรียนยืนยันแล้วเท่านั้น)
============================================================
สร้าง "FULL STORY" เป็นร้อยแก้วต่อเนื่อง 250-400 คำภาษาไทย
ห้ามสร้างแค่ Story Outline หรือ Bullet Points

โครงสร้างนิทาน:
ACT 1 — BEGINNING: แนะนำโลก ตัวละคร สถานการณ์
ACT 2 — PROBLEM: เกิดปัญหา/ภารกิจที่ทำให้ตัวละครต้องลงมือ
ACT 3 — JOURNEY: ตัวละครเผชิญอุปสรรคอย่างน้อย 2 ครั้ง
ACT 4 — CLIMAX: เหตุการณ์สำคัญที่สุด ใช้คุณลักษณะจากผู้เรียนแก้ปัญหา
ACT 5 — RESOLUTION: ปัญหาคลี่คลาย
ACT 6 — MORAL: ข้อคิดที่เกิดจากเรื่อง (ไม่ใช่ข้อคิดสำเร็จรูป)

ข้อกำหนด:
- ความยาว 250-400 คำ (กระชับและเล่าจบใน 1-2 นาที)
- มีบทสนทนาของตัวละคร
- มีอารมณ์ เหตุการณ์ การตัดสินใจ จุดพีค
- ข้อมูลของผู้เรียนต้องถูกนำไปใช้เป็น "กลไกของเรื่อง" ไม่ใช่แค่กล่าวถึง
- ตัวละครหลักได้รับแรงบันดาลใจจากบุคลิกของผู้เรียน แต่ไม่ใช่สำเนาตัวผู้เรียน
- เหมาะกับ Scratch: 4-6 ฉาก ตัวละคร 3-5 ตัว

ห้ามใส่ [Scene 1], [Sprite], [Backdrop] ระหว่างเนื้อเรื่อง


13. MORAL (ข้อคิด)
============================================================
ข้อคิดต้องเกิดจากเรื่อง ไม่ใช่ข้อคิดสำเร็จรูป
ห้ามใช้ "ความพยายามนำไปสู่ความสำเร็จ" ทุกเรื่อง

============================================================
14. JSON OUTPUT FORMAT
============================================================
ทุกคำตอบต้องแนบ JSON เสมอ (หลังข้อความสนทนา):

\`\`\`story_json
{
  "conversationState": "NAME | HOBBY | INTEREST | PERSONALITY | IMAGINATION | STORY_DIRECTION | STORY_CONFIRMATION | FULL_STORY",
  "step": 1,
  "userProfile": {
    "preferred_name": "ชื่อที่ผู้เรียนบอก หรือ null ถ้ายังไม่รู้",
    "hobbies": [],
    "interests": [],
    "personality_traits": [],
    "favorite_things": [],
    "ways_of_thinking": [],
    "imagination": [],
    "favorite_theme": null,
    "character_idea": null,
    "story_world": null,
    "story_problem": null,
    "story_goal": null,
    "confirmed_story_direction": false
  },
  "storyConfirmation": {
    "character": "ชื่อตัวละครและบุคลิก",
    "world": "โลกของเรื่อง",
    "problem": "ปัญหาหลัก",
    "trait": "จุดเด่นของตัวละคร"
  },
  "fullStory": "นิทานฉบับเต็ม 250-400 คำ (เฉพาะ conversationState=FULL_STORY)",
  "title": "ชื่อเรื่อง",
  "theme": "ธีม",
  "plotSummary": "สรุปย่อเนื้อเรื่อง (เมื่อมี fullStory แล้ว)",
  "characters": [
    { "name": "ชื่อตัวละคร", "role": "ตัวเอก/เพื่อน/ผู้ร้าย", "sprite": "Sprite1", "description": "ลักษณะนิสัย" }
  ],
  "backdrops": [
    { "name": "ฉาก 1", "scene": "คำอธิบายฉาก", "mood": "สดใส" }
  ],
  "moralLesson": "ข้อคิดที่เกิดจากเรื่อง"
}
\`\`\`

สำคัญมาก:
- เมื่อ conversationState = FULL_STORY ต้องมี fullStory ที่สมบูรณ์ครบ 250-400 คำเสมอ
- preferred_name ต้องมาจากผู้เรียนเท่านั้น ห้ามสมมติ
- ห้ามแสดง JSON ในรูปแบบที่ผู้เรียนเห็นในเนื้อหาการสนทนา

============================================================
15. NEVER DO THESE THINGS
============================================================
1. แต่งนิทานทันทีโดยไม่มีข้อมูลผู้เรียน
2. ถามคำถามหลายข้อในข้อความเดียว
3. ถามคำถามซ้ำ
4. ลืมข้อมูลที่ผู้เรียนพูดไปแล้ว
5. สร้างข้อมูลส่วนตัวของผู้เรียนขึ้นมาเอง
6. ใช้ชื่อผู้เรียนที่ระบบกำหนดไว้ล่วงหน้า
7. สร้าง Story Outline แล้วเรียกว่า Full Story
8. สร้างนิทานสั้นกว่า 200 คำ หรือยาวเกิน 450 คำ
9. สร้างนิทานที่ไม่เกี่ยวกับความชอบของผู้เรียน
10. ให้ AI ตัดสินใจทุกอย่างแทนผู้เรียน
11. ทำให้นิทานซับซ้อนเกินกว่าจะสร้างใน Scratch ได้
12. สร้าง Blueprint ที่มีเหตุการณ์ไม่ตรงกับนิทาน
`;

const CANDIDATE_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.6-pro",
];

// ============================================================
// ตรวจสอบ conversation state จาก profile
// ============================================================
function determineCurrentState(profile: UserProfileMemory): ConversationState {
  const name = profile.preferred_name || profile.name;
  if (!name) return "NAME";
  if (!profile.hobbies || profile.hobbies.length === 0) return "HOBBY";
  if (!profile.interests || profile.interests.length === 0) return "INTEREST";
  if (!profile.personality_traits || profile.personality_traits.length === 0) return "PERSONALITY";
  if (!profile.favorite_theme && !profile.story_genre) return "IMAGINATION";
  if (!profile.story_world && !profile.character_idea && !profile.story_problem) return "STORY_DIRECTION";
  if (!profile.confirmed_story_direction) return "STORY_CONFIRMATION";
  return "FULL_STORY";
}

// ============================================================
// ADAPTIVE FALLBACK STATE MACHINE
// ============================================================
function executeAdaptiveStateMachine(
  message: string,
  profile: UserProfileMemory,
  historyMessages: Array<{ role: string; content: string }>
): { reply: string; storyUpdate: any } {
  const msg = message.trim();
  const msgLower = msg.toLowerCase();
  const name = profile.preferred_name || profile.name || "";

  // ── ดึงข้อมูลจากข้อความ ──

  // ตรวจหา student ID
  const idMatch =
    msg.match(/(?:รหัส|รหัสนักศึกษา|id)\s*[:=]?\s*(\d+)/i) ||
    msg.match(/\b(6\d{8,11})\b/);
  if (idMatch && !profile.studentId) {
    profile.studentId = idMatch[1].trim();
  }

  // คำทักทายที่ห้ามนับว่าเป็นชื่อ
  const GREETING_WORDS = new Set([
    "สวัสดี", "สวัสดีครับ", "สวัสดีค่ะ", "หวัดดี", "หวัดดีครับ", "หวัดดีค่ะ",
    "ดีครับ", "ดีค่ะ", "ฮัลโหล", "hello", "hi", "อรุณสวัสดิ์", "ราตรีสวัสดิ์",
    "โอ้", "อ้าว", "เฮ้", "เฮ้ย", "เออ", "เฮลโล่", "เฮลโล",
  ]);
  const isPureGreeting = GREETING_WORDS.has(msg.trim().toLowerCase()) ||
    GREETING_WORDS.has(msg.trim().replace(/ครับ|ค่ะ|นะ|จ้า$/g, "").trim().toLowerCase());

  // ตรวจหาชื่อ
  const namePatterns = [
    /(?:ผมชื่อ|หนูชื่อ|ชื่อเล่นคือ|เรียกผมว่า|เรียกหนูว่า|ชื่อ)\s*([^\s,\n]+)/i,
    /^([^\s,\n]{1,10})(?:ครับ|ค่ะ|นะ|จ้า|เลย)?$/,
  ];

  let detectedName = "";
  if (!isPureGreeting) {
    for (const pattern of namePatterns) {
      const match = msg.match(pattern);
      if (match) {
        const candidate = match[1]
          .replace(/ครับ|ค่ะ|นะ|จ้า|เลย|ค่ะ$/g, "")
          .trim();
        if (
          candidate.length > 0 &&
          candidate.length <= 10 &&
          !GREETING_WORDS.has(candidate.toLowerCase())
        ) {
          detectedName = candidate;
          break;
        }
      }
    }
  }


  // ── STATE: NAME ──
  if (!name) {
    if (detectedName) {
      profile.preferred_name = detectedName;
      profile.name = detectedName;
      return {
        reply: `ยินดีที่ได้รู้จักนะ${detectedName} 😄 ต่อไปลุงจะเรียกว่า${detectedName}แล้วกัน\n\nลุงอยากรู้จัก${detectedName}มากขึ้นอีกหน่อย... เวลาว่าง${detectedName}ชอบทำอะไรที่สุด?`,
        storyUpdate: {
          conversationState: "HOBBY",
          step: 1,
          userProfile: { ...profile },
          title: `นิทานของ${detectedName}`,
          theme: "ค้นพบตัวตน",
          characters: [], backdrops: [], moralLesson: "",
          scratchPlan: [], suggestedScratchBlocks: [],
        },
      };
    }
    // ทักทายหรือข้อความอื่นโดยไม่มีชื่อ
    return {
      reply: `สวัสดี! ดีใจที่ได้เจอเพื่อนนักสร้างเรื่องคนใหม่ 😊\n\nก่อนอื่นเลย ลุงขอรู้จักหน่อย... หนูอยากให้ลุงเรียกว่าอะไรดี?`,
      storyUpdate: {
        conversationState: "NAME",
        step: 1,
        userProfile: profile,
        title: "นิทานสร้างสรรค์", theme: "",
        characters: [], backdrops: [], moralLesson: "",
        scratchPlan: [], suggestedScratchBlocks: [],
      },
    };
  }

  // ── STATE: HOBBY ──
  if (!profile.hobbies || profile.hobbies.length === 0) {
    const hobby = msg;
    profile.hobbies = [hobby];

    if (msgLower.includes("เกม") || msgLower.includes("game")) {
      return {
        reply: `อ๋อ นักเล่นเกมนี่เอง 🎮 ลุงว่าคนเล่นเกมนี่ไหวพริบดีทุกคนเลยนะ\n\nแล้ว${name} เวลาเล่นเกม ชอบช่วงไหนที่สุด? ชอบตอนออกผจญภัย ⚔️ ตอนแก้ปริศนา 🧩 หรือตอนสร้างอะไรขึ้นมาเอง 🛠️?`,
        storyUpdate: buildUpdate("INTEREST", 1, profile),
      };
    } else if (msgLower.includes("ฟุตบอล") || msgLower.includes("กีฬา") || msgLower.includes("บาส")) {
      return {
        reply: `โห ชอบ${hobby}นี่ดูกระฉับกระเฉงมากเลย ⚽\n\nสิ่งที่ชอบที่สุดในการเล่น${hobby}คืออะไรครับ? ชอบตรงที่ต้องทำงานเป็นทีม ชอบตรงที่ต้องคิดกลยุทธ์ หรือชอบความตื่นเต้นตอนแข่ง?`,
        storyUpdate: buildUpdate("INTEREST", 1, profile),
      };
    } else if (msgLower.includes("วาด") || msgLower.includes("ระบาย") || msgLower.includes("ศิลปะ")) {
      return {
        reply: `วาดรูปนี่น่าสนใจมากเลย 🎨 ลุงเริ่มเห็นนิทานที่มีสีสันสดใสแล้ว\n\n${name}ชอบวาดอะไรที่สุด? วาดตัวการ์ตูน วาดฉาก วาดสัตว์ หรือวาดโลกในจินตนาการ?`,
        storyUpdate: buildUpdate("INTEREST", 1, profile),
      };
    } else if (msgLower.includes("เพลง") || msgLower.includes("ร้องเพลง") || msgLower.includes("ดนตรี")) {
      return {
        reply: `เพลง 🎵 ลุงชอบคนที่รู้สึกกับดนตรีนะ มันแสดงว่าเราเป็นคนมีความรู้สึกลึกซึ้ง\n\nตอนฟังเพลง${name}ชอบแบบไหน? เพลงที่ทำให้รู้สึกตื่นเต้น เพลงที่ให้ความรู้สึกสงบ หรือเพลงที่เล่าเรื่องราว?`,
        storyUpdate: buildUpdate("INTEREST", 1, profile),
      };
    } else {
      return {
        reply: `ชอบ${hobby}นี่ดูเป็นกิจกรรมที่เพลินและมีเสน่ห์เลยนะ 👍\n\nแล้วมีอะไรในเรื่อง${hobby}ที่${name}ชอบที่สุด? หรือมีสิ่งที่${name}กำลังสนใจเป็นพิเศษในช่วงนี้ไหม?`,
        storyUpdate: buildUpdate("INTEREST", 1, profile),
      };
    }
  }

  // ── STATE: INTEREST ──
  if (!profile.interests || profile.interests.length === 0) {
    profile.interests = [msg];
    const hobby = profile.hobbies[0] || "งานอดิเรก";

    return {
      reply: `อ๋อ ลุงเริ่มเห็นภาพ${name}แล้วล่ะ ✨\n\nลุงสงสัยอยู่นิดนึงว่า ${name}เป็นคนแบบไหน? เช่น เป็นคนชอบคิดวิเคราะห์ ชอบลงมือทำ ชอบช่วยเหลือคน หรือชอบสำรวจสิ่งใหม่ ๆ?`,
      storyUpdate: buildUpdate("PERSONALITY", 1, profile),
    };
  }

  // ── STATE: PERSONALITY ──
  if (!profile.personality_traits || profile.personality_traits.length === 0) {
    profile.personality_traits = [msg];
    const hobbies = profile.hobbies?.join(", ") || "";
    const interests = profile.interests?.join(", ") || "";

    return {
      reply: `ลุงได้ยินแล้วนะ ${name}เป็นคนที่ ${msg} 😊\n\nถ้าถามว่าจินตนาการของ${name}ล่ะ... ถ้าเปิดประตูใบหนึ่งแล้วเจอโลกใหม่ อยากให้โลกนั้นเป็นแบบไหน?\n\n🚀 โลกอนาคตเต็มไปด้วยเทคโนโลยี\n🧙 โลกเวทมนตร์และสิ่งมหัศจรรย์\n🌊 โลกใต้ทะเลลึก\n🕵️ โลกที่เต็มไปด้วยปริศนาซ่อนอยู่\n\nหรือ${name}มีโลกที่อยากไปในแบบอื่น?`,
      storyUpdate: buildUpdate("IMAGINATION", 2, profile),
    };
  }

  // ── STATE: IMAGINATION / STORY WORLD ──
  if (!profile.favorite_theme && !profile.story_genre) {
    profile.favorite_theme = msg;
    profile.story_genre = msg;

    if (!profile.story_world) {
      profile.story_world = msg;
    }

    return {
      reply: `โลก${msg}นี่น่าตื่นเต้นมากเลย! 🌟 ลุงเริ่มมองเห็นฉากในนิทานแล้ว\n\nถ้ามีตัวละครหลักที่เป็น "ตัวแทนจินตนาการ" ของ${name} ลุงอยากให้ตัวละครนั้นเป็นคนแบบไหน?\nเช่น นักประดิษฐ์ นักสำรวจ นักแก้ปริศนา นักดนตรี นักวาดภาพ หรืออะไรก็ได้ที่ ${name} รู้สึกว่าน่าสนใจ`,
      storyUpdate: buildUpdate("STORY_DIRECTION", 2, profile),
    };
  }

  // ── STATE: CHARACTER IDEA ──
  if (!profile.character_idea && !profile.character_preference) {
    profile.character_idea = msg;
    profile.character_preference = msg;

    return {
      reply: `ตัวละครสาย${msg}นี่ลุงชอบเลย! 😄\n\nแล้วลุงอยากรู้ว่า ถ้าตัวละครนี้ต้องเผชิญกับ "ปัญหา" หรือ "ภารกิจ" สำคัญในเรื่อง ${name}อยากให้มันเป็นปัญหาประเภทไหน?\n\nเช่น ต้องช่วยเหลือใครสักคน ต้องแก้ไขสิ่งที่เสียหาย ต้องค้นหาบางสิ่ง หรืออยากให้ปัญหาเป็นอะไรก็ได้ที่${name}คิดถึง`,
      storyUpdate: buildUpdate("STORY_DIRECTION", 2, profile),
    };
  }

  // ── STATE: STORY PROBLEM ──
  if (!profile.story_problem) {
    profile.story_problem = msg;

    // มีข้อมูลครบแล้ว → สรุปก่อน STORY_CONFIRMATION
    const hobby = profile.hobbies?.join(", ") || "สิ่งที่ชอบ";
    const interest = profile.interests?.join(", ") || "";
    const personality = profile.personality_traits?.join(", ") || "";
    const theme = profile.favorite_theme || profile.story_genre || "ผจญภัย";
    const character = profile.character_idea || profile.character_preference || "นักผจญภัย";
    const problem = msg;

    return {
      reply: `ลุงเริ่มเห็นเรื่องของเราแล้วนะ 😊\n\n${profile.favorite_things?.length ? `💫 ${name}ชอบ: ${hobby} และ ${profile.favorite_things.join(", ")}` : `🎯 ${name}ชอบ: ${hobby}${interest ? ` และสนใจเรื่อง ${interest}` : ""}`}\n${personality ? `🧠 บุคลิก: ${personality}` : ""}\n🌍 โลกของเรื่อง: โลก${theme}\n🦸 ตัวละคร: ${character}\n⚠️ ปัญหา: ${problem}\n\nลุงกำลังนึกภาพตัวละครสาย${character}คนนึง ที่ต้อง${problem} ในโลก${theme}...\n\nแต่ตรงนี้ลุงยังไม่แต่งเรื่องนะ 😄 ลุงอยากถาม${name}สักอย่างว่า... อยากให้เรื่องนี้จบแบบไหน? ตัวละครเราสำเร็จแบบง่าย หรืออยากให้มีความพลิกผันสักอย่าง?`,
      storyUpdate: buildUpdate("STORY_DIRECTION", 2, profile),
    };
  }

  // ── STATE: STORY GOAL / ENDING ──
  if (!profile.story_goal) {
    profile.story_goal = msg;

    const theme = profile.favorite_theme || profile.story_genre || "ผจญภัย";
    const character = profile.character_idea || profile.character_preference || "นักผจญภัย";
    const problem = profile.story_problem || "ปัญหาสำคัญ";
    const hobby = profile.hobbies?.[0] || "สิ่งที่ชอบ";
    const personality = profile.personality_traits?.[0] || "ความมุ่งมั่น";

    return {
      reply: `ลุงขอสรุปแนวเรื่องของเราก่อนนะ 📋\n\n━━━━━━━━━━━━━━━━━━━\n🦸 ตัวละครหลัก: ${character} ที่ได้รับแรงบันดาลใจจาก${hobby}และ${personality}\n🌍 โลกของเรื่อง: โลก${theme}\n⚠️ ปัญหา: ${problem}\n🎯 เป้าหมาย: ${msg}\n━━━━━━━━━━━━━━━━━━━\n\nถ้าแนวนี้โอเค ลุงจะเอาไปเขียนเป็นนิทานฉบับเต็มให้${name}เลย 😊\nหรือถ้าอยากเปลี่ยนตรงไหน บอกลุงได้เลยนะ!`,
      storyUpdate: buildUpdate("STORY_CONFIRMATION", 3, profile),
    };
  }

  // ── STATE: STORY_CONFIRMATION — รอ User Confirm ──
  if (!profile.confirmed_story_direction) {
    const confirmKeywords = ["โอเค", "ได้เลย", "ok", "ตกลง", "เอาเลย", "ดีเลย", "ลุย", "ดี", "ใช่", "ยืนยัน", "สร้างเลย", "แต่งเลย", "เริ่มเลย", "พร้อมแล้ว", "เขียนเลย"];
    const isConfirmed = confirmKeywords.some(k => msgLower.includes(k));

    if (isConfirmed) {
      profile.confirmed_story_direction = true;
      const charName = profile.character_idea || profile.name || "ผู้กล้าตัวน้อย";
      const worldName = profile.story_world || profile.favorite_theme || "ดินแดนมหัศจรรย์";
      const hobbyName = profile.hobbies?.[0] || "การเรียนรู้";
      const generatedFullStory = `กาลครั้งหนึ่งนานมาแล้ว ในดินแดน${worldName} มีเด็กหนุ่มสาวนามว่า ${charName} ผู้มีใจรักใน${hobbyName}เป็นชีวิตจิตใจ วันหนึ่งเกิดความท้าทายครั้งใหญ่ขึ้น เมื่อเส้นทางสู่เป้าหมายถูกปกคลุมไปด้วยความไม่แน่นอน แต่ ${charName} ไม่เคยย่อท้อ ได้นำทักษะและไหวพริบจากการฝึกฝน${hobbyName} มาใช้แก้ปัญหาทีละเปลาะ และร่วมมือกับเพื่อนๆ จนสามารถฟันฝ่าอุปสรรค นำความสุขและความสงบสุขกลับคืนมาสู่${worldName}ได้สำเร็จ`;

      return {
        reply: `นี่คือนิทานฉบับเต็มของ${name}ที่ลุงแต่งให้เสร็จสมบูรณ์แล้วครับ! 🎉\n\n📖 เรื่อง: การผจญภัยของ${charName}ใน${worldName}\n\n${generatedFullStory}\n\n💡 ข้อคิด: ความมุ่งมั่นและไม่ย่อท้อต่ออุปสรรค คือกุญแจสำคัญสู่ความสำเร็จ\n\n${name} สามารถดูผลลัพธ์ พิมพ์ หรือดาวน์โหลดใบนิทานเก็บไว้ได้เลยนะ!`,
        storyUpdate: {
          ...buildUpdate("FULL_STORY", 4, profile),
          title: `การผจญภัยของ${charName}`,
          theme: worldName,
          plotSummary: `${charName} ใช้ทักษะ${hobbyName} และความพยายาม ในการกอบกู้${worldName} จนสำเร็จ`,
          characters: [
            { name: charName, role: "ตัวเอก", description: `ผู้กล้าที่มีใจรักใน${hobbyName} มีความมุ่งมั่นไม่ยอมแพ้` },
            { name: "เพื่อนร่วมทาง", role: "ผู้ช่วย", description: "คอยให้กำลังใจและช่วยเหลือยามคับขัน" }
          ],
          backdrops: [
            { name: `ดินแดน${worldName}`, description: "จุดเริ่มต้นของการผจญภัย" },
            { name: "เส้นทางแห่งบททดสอบ", description: "สถานที่ที่ต้องใช้ไหวพริบฟันฝ่าอุปสรรค" }
          ],
          moralLesson: "ความพยายามและความมุ่งมั่นจะนำพาเราก้าวข้ามทุกอุปสรรค",
          fullStory: generatedFullStory,
        },
      };
    } else {
      // ผู้เรียนต้องการแก้ไข
      return {
        reply: `โอเค${name} บอกลุงได้เลยว่าอยากเปลี่ยนตรงไหน? ลุงพร้อมปรับให้ตามที่${name}ต้องการเลยนะ 😊`,
        storyUpdate: buildUpdate("STORY_CONFIRMATION", 3, profile),
      };
    }
  }

  // ── STATE: FULL_STORY / SCRATCH_BLUEPRINT — ใช้ AI ──
  // ถ้า fallback ถึงจุดนี้ แสดงว่า AI ไม่ตอบ ให้แจ้งผู้เรียน
  return {
    reply: `${name} ลุงกำลังรวบรวมทุกอย่างเพื่อสร้างนิทานให้อยู่นะ กรุณารอสักครู่นิดนึงครับ...`,
    storyUpdate: buildUpdate("FULL_STORY", 3, profile),
  };
}

// helper สร้าง storyUpdate object
function buildUpdate(
  state: string,
  step: number,
  profile: UserProfileMemory,
  extra: Record<string, any> = {}
): any {
  const name = profile.preferred_name || profile.name || "นักเล่าเรื่อง";
  return {
    conversationState: state,
    step,
    userProfile: { ...profile },
    title: `นิทานของ${name}`,
    theme: profile.favorite_theme || profile.story_genre || "สร้างสรรค์",
    characters: [],
    backdrops: [],
    moralLesson: "",
    scratchPlan: [],
    suggestedScratchBlocks: [],
    ...extra,
  };
}

// ============================================================
// POST Handler
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      conversationId,
      userId,
      message,
      currentStoryData,
      step = 1,
      userProfile: incomingProfile,
    } = body;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    let dbConversation = null;
    let historyMessages: Array<{ role: "user" | "assistant"; content: string }> = [];

    if (conversationId) {
      dbConversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          user: true,
          messages: {
            orderBy: { createdAt: "asc" },
            take: 30,
          },
        },
      });

      if (dbConversation) {
        historyMessages = dbConversation.messages.map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        }));
      }
    }

    // ── Build/Recover UserProfileMemory ──
    let storedProfile: UserProfileMemory = incomingProfile || {};

    // Restore from DB user
    if (
      !storedProfile.preferred_name &&
      !storedProfile.name &&
      dbConversation?.user?.nickname &&
      dbConversation.user.nickname !== "นักศึกษา ปวช. 1" &&
      dbConversation.user.nickname !== "นักศึกษาคนเก่ง"
    ) {
      storedProfile.preferred_name = dbConversation.user.nickname;
      storedProfile.name = dbConversation.user.nickname;
    }
    if (!storedProfile.studentId && dbConversation?.user?.studentId) {
      storedProfile.studentId = dbConversation.user.studentId;
    }

    // Restore from serialized plotSummary JSON
    if (dbConversation?.plotSummary && dbConversation.plotSummary.startsWith("{")) {
      try {
        const parsed = JSON.parse(dbConversation.plotSummary);
        if (parsed.userProfile) {
          storedProfile = { ...parsed.userProfile, ...storedProfile };
        }
      } catch (e) {}
    }

    // ── Determine if we're generating a Full Story (needs more tokens) ──
    const msgLower = (message || "").toLowerCase();
    const confirmKeywords = ["โอเค", "ได้เลย", "ok", "ตกลง", "เอาเลย", "ดีเลย", "ลุย", "ดี", "ใช่", "ยืนยัน", "สร้างเลย", "แต่งเลย", "เริ่มเลย", "พร้อมแล้ว", "เขียนเลย"];
    const userIsConfirming = confirmKeywords.some(k => msgLower.includes(k));

    const currentState = determineCurrentState(storedProfile);
    const isStoryGenerationPhase =
      currentState === "FULL_STORY" ||
      currentState === "SCRATCH_BLUEPRINT" ||
      storedProfile.confirmed_story_direction === true ||
      ((currentState === "STORY_CONFIRMATION" || currentState === "STORY_DIRECTION") && userIsConfirming);

    if (isStoryGenerationPhase) {
      storedProfile.confirmed_story_direction = true;
    }

    // ── Build Context for AI ──
    const profileSummary = `
[PROFILE ของผู้เรียน]
preferred_name: ${storedProfile.preferred_name || storedProfile.name || "ยังไม่ทราบ"}
hobbies: ${storedProfile.hobbies?.join(", ") || "ยังไม่ทราบ"}
interests: ${storedProfile.interests?.join(", ") || "ยังไม่ทราบ"}
personality_traits: ${storedProfile.personality_traits?.join(", ") || "ยังไม่ทราบ"}
favorite_things: ${storedProfile.favorite_things?.join(", ") || "ยังไม่ทราบ"}
ways_of_thinking: ${storedProfile.ways_of_thinking?.join(", ") || "ยังไม่ทราบ"}
favorite_theme: ${storedProfile.favorite_theme || storedProfile.story_genre || "ยังไม่ทราบ"}
character_idea: ${storedProfile.character_idea || storedProfile.character_preference || "ยังไม่ทราบ"}
story_world: ${storedProfile.story_world || "ยังไม่ทราบ"}
story_problem: ${storedProfile.story_problem || "ยังไม่ทราบ"}
story_goal: ${storedProfile.story_goal || "ยังไม่ทราบ"}
confirmed_story_direction: ${storedProfile.confirmed_story_direction || false}
[สถานะการสนทนา: ${isStoryGenerationPhase ? "FULL_STORY" : currentState}]
[ขั้นตอน: ${step}]
`;

    const storyGenInstruction = isStoryGenerationPhase
      ? `\n\n[CRITICAL INSTRUCTION: ขณะนี้คือขั้นตอนแต่งนิทานฉบับเต็ม FULL_STORY]\nผู้เรียนได้ยืนยันแนวทางเรื่องแล้ว ในข้อความนี้คุณลุงต้องแต่งนิทานฉบับเต็มทันที!\n1. ตอบกลับด้วยความอบอุ่นและตื่นเต้น นำนิทานมาเล่าให้ฟัง\n2. ใน story_json ต้องระบุข้อมูลให้ครบถ้วน 100%:\n   - "conversationState": "FULL_STORY"\n   - "title": ชื่อเรื่องนิทานที่น่าสนใจ\n   - "theme": ธีมเรื่อง\n   - "plotSummary": สรุปโครงเรื่อง\n   - "characters": [{ "name": "...", "role": "ตัวเอก", "description": "..." }, { "name": "...", "role": "เพื่อน/ผู้ช่วย", "description": "..." }]\n   - "backdrops": [{ "name": "...", "description": "..." }, { "name": "...", "description": "..." }]\n   - "moralLesson": ข้อคิดคติสอนใจที่ได้จากเรื่อง\n   - "fullStory": นิทานฉบับเต็ม 250-400 คำ เป็นร้อยแก้ว มีบทสนทนา เหตุการณ์ อุปสรรค และบทสรุป\nห้ามเว้นว่าง characters, backdrops, moralLesson หรือ fullStory เด็ดขาด!\n`
      : "";

    const currentContext = `${profileSummary}${storyGenInstruction}\nข้อความล่าสุดจากผู้เรียน: "${message}"`;

    const fullMessages = [
      ...historyMessages,
      { role: "user" as const, content: currentContext },
    ];

    // ── Call AI ──
    const keys = getApiKeys();
    let rawReply = "";
    let lastError: any = null;

    const maxTokens = isStoryGenerationPhase ? 1500 : 900;
    const temperature = isStoryGenerationPhase ? 0.8 : 0.65;

    outerLoop: for (const key of keys) {
      const googleAI = createGoogleGenerativeAI({ apiKey: key });

      for (const modelName of CANDIDATE_MODELS) {
        try {
          const result = await generateText({
            model: googleAI(modelName),
            system: SYSTEM_PROMPT,
            messages: fullMessages,
            temperature,
            maxOutputTokens: maxTokens,
          });

          if (result.text) {
            rawReply = result.text;
            break outerLoop;
          }
        } catch (err: any) {
          lastError = err;
          console.warn(`Model ${modelName} failed:`, err?.message || err);
        }
      }
    }

    // ── Parse AI Response ──
    let parsedStoryUpdate: any = null;
    let conversationalText = rawReply;
    let fullStoryText = "";

    if (rawReply) {
      const jsonMatch = rawReply.match(/```(?:story_json|json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        try {
          parsedStoryUpdate = JSON.parse(jsonMatch[1]);
          conversationalText = rawReply.replace(jsonMatch[0], "").trim();
          if (parsedStoryUpdate.fullStory) {
            fullStoryText = parsedStoryUpdate.fullStory;
          }
        } catch (e) {
          console.warn("Failed to parse story_json:", e);
        }
      }
    }

    // Fallback to deterministic state machine if AI fails
    if (!conversationalText || !parsedStoryUpdate) {
      const fallback = executeAdaptiveStateMachine(message, storedProfile, historyMessages);
      conversationalText = fallback.reply;
      parsedStoryUpdate = fallback.storyUpdate;
    }

    // ── Merge Profile ──
    const aiProfile = parsedStoryUpdate?.userProfile || {};
    const finalProfile: UserProfileMemory = {
      ...storedProfile,
      ...aiProfile,
    };

    // Ensure preferred_name sync
    if (!finalProfile.preferred_name && finalProfile.name) {
      finalProfile.preferred_name = finalProfile.name;
    }
    if (finalProfile.preferred_name && !finalProfile.name) {
      finalProfile.name = finalProfile.preferred_name;
    }

    parsedStoryUpdate.userProfile = finalProfile;
    if (fullStoryText) {
      parsedStoryUpdate.fullStory = fullStoryText;
    }

    // ── Map step from conversationState ──
    let mappedStep = step;
    const stateName: string = parsedStoryUpdate.conversationState || "";
    if (["GREETING", "NAME", "HOBBY", "INTEREST"].includes(stateName)) mappedStep = 1;
    else if (["PERSONALITY", "IMAGINATION", "STORY_DIRECTION"].includes(stateName)) mappedStep = 2;
    else if (["STORY_CONFIRMATION"].includes(stateName)) mappedStep = 3;
    else if (stateName === "FULL_STORY" || stateName === "SCRATCH_BLUEPRINT") {
      // Step 4 ONLY when fullStory actually exists!
      if (parsedStoryUpdate.fullStory && parsedStoryUpdate.fullStory.length > 50) {
        mappedStep = 4;
      } else {
        mappedStep = 3;
      }
    }

    parsedStoryUpdate.currentStep = mappedStep;

    // ── Save to DB ──
    if (conversationId && dbConversation) {
      const displayName = finalProfile.preferred_name || finalProfile.name || "";
      if (
        displayName &&
        displayName !== "นักศึกษา ปวช. 1" &&
        displayName !== "นักศึกษาคนเก่ง"
      ) {
        await prisma.user.update({
          where: { id: dbConversation.userId },
          data: {
            nickname: displayName,
            studentId: finalProfile.studentId || dbConversation.user.studentId,
          },
        });
      }

      await prisma.message.create({
        data: {
          conversationId,
          role: "user",
          content: message,
          step: mappedStep,
        },
      });

      await prisma.message.create({
        data: {
          conversationId,
          role: "assistant",
          content: conversationalText,
          scratchBlocks: parsedStoryUpdate?.suggestedScratchBlocks
            ? JSON.stringify(parsedStoryUpdate.suggestedScratchBlocks)
            : null,
          step: mappedStep,
        },
      });

      const serializedData = JSON.stringify({
        summary: parsedStoryUpdate.plotSummary || "",
        fullStory: fullStoryText,
        userProfile: finalProfile,
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          title: parsedStoryUpdate.title || dbConversation.title,
          currentStep: mappedStep,
          theme: parsedStoryUpdate.theme || dbConversation.theme,
          characters: parsedStoryUpdate.characters?.length
            ? JSON.stringify(parsedStoryUpdate.characters)
            : dbConversation.characters,
          backdrops: parsedStoryUpdate.backdrops?.length
            ? JSON.stringify(parsedStoryUpdate.backdrops)
            : dbConversation.backdrops,
          moralLesson: parsedStoryUpdate.moralLesson || dbConversation.moralLesson,
          plotSummary: serializedData,
          scratchPlan: parsedStoryUpdate.scratchPlan?.length
            ? JSON.stringify(parsedStoryUpdate.scratchPlan)
            : dbConversation.scratchPlan,
        },
      });
    }

    return NextResponse.json({
      reply: conversationalText,
      storyUpdate: parsedStoryUpdate,
      userProfile: finalProfile,
      fullStory: fullStoryText,
      step: mappedStep,
    });
  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
