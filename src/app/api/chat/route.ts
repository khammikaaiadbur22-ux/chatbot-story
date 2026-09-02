import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

export const maxDuration = 120;

function getApiKeys(): string[] {
  const keys: string[] = [];
  if (process.env.GEMINI_API_KEY_1) keys.push(process.env.GEMINI_API_KEY_1);
  if (process.env.GEMINI_API_KEY_2) keys.push(process.env.GEMINI_API_KEY_2);
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY)
    keys.push(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  if (process.env.GEMINI_API_KEY) keys.push(process.env.GEMINI_API_KEY);
  if (process.env.GEMINI_API_KEY_3) keys.push(process.env.GEMINI_API_KEY_3);
  if (process.env.GEMINI_API_KEY_4) keys.push(process.env.GEMINI_API_KEY_4);
  if (process.env.GEMINI_API_KEY_5) keys.push(process.env.GEMINI_API_KEY_5);
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
คุณคือ “Aesop Story Friend” มีชื่อว่า “ลุงนิทานยิ้มใส” นักเล่านิทานอีสปสำหรับเด็ก ผู้เชี่ยวชาญในการใช้คำถามอย่างอ่อนโยนเพื่อทำความรู้จักนิสัยและพฤติกรรมของเด็ก แล้วนำมาสร้างเป็นนิทานอีสปสั้น ๆ ที่เหมาะกับเด็กแต่ละคน

============================================================
Strict Rules:
============================================================
- ก่อนเล่านิทาน ต้องถามเกี่ยวกับนิสัย พฤติกรรม หรือเหตุการณ์ที่เกิดขึ้นกับเด็กทีละ 1–2 คำถาม และรอคำตอบก่อนเสมอ
- ห้ามแต่งนิทานทันทีโดยยังไม่ทราบข้อมูลของเด็ก
- ใช้ภาษาที่อบอุ่น เข้าใจง่าย และเหมาะกับวัยเด็ก
- ตัวละครในนิทานควรเป็นสัตว์หรือสิ่งมีชีวิตในสไตล์นิทานอีสป
- นิทานต้องมีความยาวกระชับ มีเหตุการณ์ที่สะท้อนพฤติกรรมของเด็กอย่างสร้างสรรค์ ไม่ตำหนิหรือตัดสิน
- ทุกเรื่องต้องจบด้วย “ข้อคิด” หรือ “คุณธรรมประจำเรื่อง” ที่ชัดเจนและนำไปปฏิบัติได้
- Tone & Style: สดใส อบอุ่น สนุก และส่งเสริมการเรียนรู้เชิงบวก เหมาะสำหรับเด็กเล็ก
- คุณห้ามตอบยาวจนเกินไปในตอนที่ถามคำถามเด็ก
- ห้ามพูด: "ขอบคุณสำหรับข้อมูล", "กำลังเข้าสู่ขั้นตอนถัดไป", "ข้อมูลถูกบันทึกแล้ว"

============================================================
Game Flow (สำคัญมาก):
============================================================
Phase 1: Discover (ทำความรู้จัก)
ทักทายอย่างเป็นมิตร แล้วถามถึงนิสัยหรือพฤติกรรมของเด็ก เช่น “หนูชอบทำอะไรเป็นพิเศษ?” หรือ “มีเรื่องอะไรที่หนูอยากปรับปรุงตัวเองบ้างไหม?” (กำหนด conversationState เป็น NAME หรือ HOBBY)

Phase 2: Understand (ทำความเข้าใจ)
ถามต่อเพื่อให้เห็นรายละเอียดของสถานการณ์หรือความรู้สึกของเด็ก (กำหนด conversationState เป็น INTEREST, PERSONALITY, หรือ IMAGINATION)

Phase 3: Story Direction (สรุปโครงเรื่องก่อนแต่งจริง)
เมื่อมีข้อมูลเพียงพอ ให้สรุปตัวละคร โลก และปัญหาที่จะเกิดขึ้น แล้วถามเด็กว่า "เอาแนวนี้ดีไหม" หรือให้เด็กมีส่วนร่วมก่อน (กำหนด conversationState เป็น STORY_CONFIRMATION)

Phase 4: Story Creation & Moral (สร้างนิทานและสรุปคุณธรรม)
เมื่อเด็กยืนยันแนวเรื่องแล้ว ให้แต่งนิทานอีสปสั้น ๆ ที่สะท้อนเรื่องราวของเด็ก โดยมีตัวละครสัตว์และเหตุการณ์ที่สอดคล้องกับนิสัย ปิดท้ายด้วยข้อคิดสั้น ๆ (กำหนด conversationState เป็น FULL_STORY)

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
สร้าง "FULL STORY" เป็นรูปแบบ **นิทานอีสป** (ร้อยแก้วต่อเนื่อง 250-400 คำภาษาไทย)
โดยให้มีโครงสร้างการเล่าเรื่องที่จดจำสิ่งที่เด็กตอบนำมาใช้เป็นบทเรียนหรือแก่นเรื่อง (Moral) อย่างชาญฉลาด ห้ามสร้างแค่ Story Outline หรือ Bullet Points

โครงสร้างนิทาน:
ACT 1 — BEGINNING: แนะนำโลก ตัวละคร สถานการณ์
ACT 2 — PROBLEM: เกิดปัญหา/ภารกิจที่ทำให้ตัวละครต้องลงมือ
ACT 3 — JOURNEY: ตัวละครเผชิญอุปสรรคอย่างน้อย 2 ครั้ง
ACT 4 — CLIMAX: เหตุการณ์สำคัญที่สุด ใช้คุณลักษณะจากผู้เรียนแก้ปัญหา
ACT 5 — RESOLUTION: ปัญหาคลี่คลาย
ACT 6 — MORAL: ข้อคิดเตือนใจสไตล์นิทานอีสป (เช่น นิทานเรื่องนี้สอนให้รู้ว่า...) ที่เชื่อมโยงกับสิ่งที่เด็กตอบ

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
ข้อคิดต้องเกิดจากการกระทำในเรื่อง สไตล์นิทานอีสป (เช่น นิทานเรื่องนี้สอนให้รู้ว่า...)
ห้ามใช้ "ความพยายามนำไปสู่ความสำเร็จ" ทุกเรื่อง ต้องสอดคล้องกับพฤติกรรมของตัวละคร

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
- เมื่อ conversationState = FULL_STORY ต้องมี fullStory ที่เป็นนิทานความยาว 250-400 คำ ใส่มาใน JSON เสมอ! ห้ามปล่อยว่าง
- ห้ามพิมพ์เนื้อเรื่องนิทานไว้ข้างนอก JSON เด็ดขาด ให้ใส่ไว้ใน property "fullStory" ของ JSON เท่านั้น
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
  "gemini-1.5-flash",
  "gemini-1.5-pro",
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

// ============================================================
// PROFANITY DETECTION — คำหยาบตามมาตรฐานราชบัณฑิตยสถาน
// ============================================================
const THAI_PROFANITY_LIST = [
  // กลุ่มคำหยาบหลักตามราชบัณฑิตยสถาน
  "ไอ้สัตว์", "อีสัตว์", "มึง", "กู", "ไอ้หน้าหี", "อีหน้าหี",
  "สัตว์", "ควาย", "หน้าควาย", "โง่เหมือนควาย",
  "เย็ด", "สวาท", "อีดอก", "ไอ้ดอก",
  "หี", "หน้าหี", "จู๋", "จิ๋ม",
  "ไอ้เหี้ย", "อีเหี้ย", "เหี้ย",
  "ไอ้ชาติหมา", "อีชาติหมา",
  "ไอ้บ้า", "อีบ้า",
  "ไอ้โง่", "อีโง่",
  "ไอ้ทึ่ม", "อีทึ่ม",
  "ไอ้ไร้สมอง", "อีไร้สมอง",
  "ฟักยู", "fuck", "shit", "damn", "bitch", "asshole", "motherfucker",
  "ฟัค", "ชิต", "บิทช์",
  "ไอ้สัด", "อีสัด",
  "แดกด่าน", "แดกหัว",
  "ตายไปซะ", "ตายไป",
  "ระยำ", "อีระยำ", "ไอ้ระยำ",
  "ชิงหมาแดก", "หมาแดก",
  "ไอ้ทาส", "อีทาส",
  "ไปตาย", "ไปดิ้นตาย",
];

/**
 * ตรวจสอบว่าข้อความมีคำหยาบหรือไม่
 * คืนค่า true ถ้าพบคำหยาบ
 */
function containsProfanity(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return THAI_PROFANITY_LIST.some(word =>
    lower.includes(word.toLowerCase())
  );
}

// ============================================================
// EVASIVE ANSWER DETECTION — ตรวจจับคำตอบแบบ "ให้ AI คิดแทน"
// ============================================================
const EVASIVE_PATTERNS = [
  // บอกให้ AI ตัดสินใจแทน
  "บอกมา", "คิดมาให้", "แต่งมาให้", "ตัดสินใจ",
  "คิดให้", "บอกหน่อย", "ช่วยคิด", "ช่วยบอก",
  "อะไรก็ได้", "แล้วแต่", "ไม่รู้", "ไม่ทราบ", "ไม่แน่ใจ", "คิดไม่ออก", "นึกไม่ออก",
  "ให้ลุงเลือก", "เลือกเลย", "คุณเลือกเลย", "สุ่มมา", "สุ่มเลย",
  "ไม่สน", "ข้าม", "ไม่อยากตอบ", "ตอบไม่ได้", "ไม่รู้จะตอบ",
];

/**
 * ตรวจสอบว่าคำตอบของเด็กเป็นการหลบเลี่ยง / ให้ AI คิดแทนหรือเปลา่
 */
function isEvasiveAnswer(text: string): boolean {
  const lower = text.toLowerCase().trim();
  // ข้อความสั้นเกิน 2 คำมักเป็นการหลบเลี่ยง
  const words = lower.split(/\s+/);
  if (words.length <= 2 && (lower === "ไม่รู้" || lower === "ไม่" || lower === "ไม่ทราบ")) {
    return true;
  }
  return EVASIVE_PATTERNS.some(pattern => lower.includes(pattern.toLowerCase()));
}

/**
 * สร้างคำตอบกระตุ้นความคิดสร้างสรรค์เมื่อเด็กตอบแบบหลบเลี่ยง
 */
function buildCreativePrompt(currentState: string, name: string, profile: UserProfileMemory): string {
  const hobby = profile.hobbies?.[0] || "สิ่งที่ชอบ";
  const theme = profile.favorite_theme || profile.story_genre || "ผจญภัย";

  switch (currentState) {
    case "HOBBY":
      return `${name} ลุงอยากรู้จักหนูจริงๆ เลยนะ 😊 ลองนึกถึงช่วงเวลาที่หนูรู้สึกสนุกที่สุดในชีวิตสิ...\n\nอาจเป็นกีฬา 🏅 งานศิลปะ 🎨 การเล่นเกม 🎮 หรือการช่วยเหลือผู้อื่น ❤️\nมีอะไรสักอย่างที่หนูอยากทำซ้ำๆ ทุกวันไหม?`;

    case "INTEREST":
      return `ลุงเข้าใจนะ บางทีตอบยากอยู่เหมือนกัน 😄\n\nแต่ลุงอยากรู้ว่า ในเรื่อง${hobby}ที่หนูชอบนั้น...\nมีช่วงไหนที่หนูรู้สึก "อยากรู้มากขึ้น" หรือ "อยากทำให้ดีขึ้น" บ้างไหม? ลองเล่าให้ลุงฟังหน่อยนะ`;

    case "PERSONALITY":
      return `ไม่เป็นไรเลย! ลุงจะช่วยให้นึกออก 🧠\n\nลองเลือก 1 อย่างที่ตรงกับหนูที่สุด:\n🔥 "หนูเป็นคนที่ชอบลงมือทำ ไม่ชอบรอ"\n🧩 "หนูชอบคิดวิเคราะห์ก่อนทำอะไร"\n❤️ "หนูชอบช่วยเหลือเพื่อนๆ"\n🌟 "หนูชอบสำรวจสิ่งใหม่ๆ ไม่กลัวลอง"\n\nหรือจะบอกแบบในแบบของหนูเองก็ได้!`;

    case "IMAGINATION":
    case "STORY_DIRECTION":
      return `ลุงยังรอคำตอบของ${name}อยู่นะ 😊 เพราะนิทานของเราต้องมาจากความคิดของหนูเท่านั้นถึงจะพิเศษ!\n\nลองจินตนาการว่า... ถ้า${name}เป็นตัวละครในนิทาน หนูอยากให้ตัวละครนั้นอยู่ในโลกแบบไหน?\n\n🚀 โลกอนาคตมีเทคโนโลยี\n🧙 โลกเวทมนตร์\n🌊 โลกใต้ทะเล\n🕵️ โลกลึกลับเต็มไปด้วยปริศนา\n🏕️ โลกธรรมชาติ\n\nเลือกอย่างที่ชอบที่สุด หรือจะคิดโลกใหม่เองก็ได้!`;

    default:
      return `ลุงเข้าใจว่าบางทีนึกไม่ออก แต่ลุงอยากให้${name}ลองคิดดูอีกทีนะ 😊\n\nเพราะนิทานเรื่องนี้เป็นของ${name}จริงๆ ลุงแค่ช่วยเล่า ส่วนเนื้อเรื่องต้องมาจากหัวใจของหนูเท่านั้น ❤️\n\nลองนึกถึงสิ่งที่${name}ชอบที่สุด แล้วค่อยๆ เล่าให้ลุงฟังนะ`;
  }
}

// ============================================================
// KEYWORD EXTRACTION — ตัดคำสร้อยและดึงคีย์เวิร์ดสำคัญจากคำตอบ
// ============================================================
function extractKeyword(text: string): string {
  let cleaned = text.trim();

  // 1. ตัดคำสร้อยและคำลงท้าย
  cleaned = cleaned.replace(/\s*(นะครับ|นะค่ะ|ครับผม|ค่ะหนู|ครับ|ค่ะ|นะ|จ้า|เลย|ด้วย|ก็ได้|แน่นอน|แน่ๆ|เลยค่ะ|เลยครับ|แน่นอนค่ะ|แน่นอนครับ|ค่ะ้|ครับ้)\s*$/g, "").trim();

  // 2. ตัดคำนำหน้าที่ไม่ใช่ keyword
  // รันแบบ loop จนกว่าจะไม่เจอคำที่ต้องตัดอีก เพื่อให้ครอบคลุม "ฉัน ก็คงจะ อยากได้"
  let previous = "";
  while (cleaned !== previous) {
    previous = cleaned;
    cleaned = cleaned.replace(/^(ฉัน|ผม|หนู|เรา|เขา|มัน|ก็)\s*/g, "").trim();
    cleaned = cleaned.replace(/^(คงจะ|ก็คงจะ|ก็คงเป็น|คงเป็น|ก็คง|คง|น่าจะ|อาจจะ|คิดว่า|เห็นว่า|รู้สึกว่า|อยากจะ|อยากได้|อยากให้|อยาก|ต้องการ|ขอเป็น|ขอ|เลือก|เอา|ชอบ|สนใจ|ชื่นชอบ|โปรด|คือ|เป็น)\s*/g, "").trim();
  }

  // 3. แมปคำพ้องความหมายที่ผู้เรียนมักพิมพ์มาเป็นคีย์เวิร์ดมาตรฐาน
  const synonymMap: Record<string, string> = {
    "โลกเวทย์มนตร์": "เวทมนตร์",
    "โลกเวทมนตร์": "เวทมนตร์",
    "โลกแห่งเวทมนตร์": "เวทมนตร์",
    "เวทมนต์": "เวทมนตร์",
    "โลกอนาคต": "อนาคต",
    "โลกใต้ทะเล": "ใต้ทะเล",
    "โลกปริศนา": "ปริศนา",
    "ช่วยเหลือสังคม": "ช่วยเหลือผู้อื่น",
    "ช่วยเหลือผู้คน": "ช่วยเหลือผู้อื่น",
    "ช่วยเหลือคน": "ช่วยเหลือผู้อื่น",
    "อาหาร": "ทำอาหาร",
    "กินอาหาร": "ชอบอาหาร",
    "ดูการ์ตูน": "การ์ตูน",
    "เล่นเกม": "เกม",
    "ฟังเพลง": "เพลง",
  };

  for (const [key, value] of Object.entries(synonymMap)) {
    if (cleaned.includes(key)) {
      cleaned = cleaned.replace(key, value);
    }
  }

  // 4. ถ้าประโยคมีคำว่า "โลก..." ให้ดึงเฉพาะสิ่งที่ตามหลัง "โลก"
  const worldMatch = cleaned.match(/โลก([^\s,]+)/);
  if (worldMatch) {
    return worldMatch[1].replace(/\s*(ค่ะ|ครับ|นะ|จ้า|แน่นอน)$/g, "").trim();
  }

  return cleaned;
}

// ดึง hobby keyword จากประโยค เช่น "ชอบกินอาหาร" → "กินอาหาร" / "ชอบวาดรูป" → "วาดรูป"
function extractHobbyKeyword(text: string): string {
  const cleaned = extractKeyword(text);
  // ถ้าประโยคยาวเกิน 20 ตัวอักษร ให้ดึงเฉพาะส่วนที่สำคัญ
  if (cleaned.length > 20) {
    // พยายามหา noun phrase หลัก
    const importantMatch = cleaned.match(/(เกม|ฟุตบอล|บาส|กีฬา|วาด|ดนตรี|เพลง|อ่านหนังสือ|ทำอาหาร|ทำขนม|ท่องเที่ยว|ถ่ายรูป|ว่ายน้ำ|เต้น|ร้องเพลง|โค้ด|โปรแกรม|ช่วยเหลือ|ศิลปะ|หนัง|อนิเมะ|การ์ตูน)/);
    if (importantMatch) return importantMatch[1];
  }
  return cleaned;
}

function executeAdaptiveStateMachine(
  message: string,
  profile: UserProfileMemory,
  historyMessages: Array<{ role: string; content: string }>
): { reply: string; storyUpdate: any } {
  const msg = message.trim();
  const msgLower = msg.toLowerCase();
  const name = profile.preferred_name || profile.name || "";

  // keyword ที่สะอาดแล้ว พร้อมนำไปใช้ใน profile
  const cleanedKeyword = extractKeyword(msg);
  const cleanedHobby = extractHobbyKeyword(msg);


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
    // ตรวจสอบว่าเด็กหลบเลี่ยงคำถามหรือไม่
    if (isEvasiveAnswer(msg)) {
      return {
        reply: buildCreativePrompt("HOBBY", name, profile),
        storyUpdate: buildUpdate("HOBBY", 1, profile),
      };
    }

    const hobby = cleanedHobby; // ใช้ keyword ที่สะอาดแล้ว
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
    } else if (msgLower.includes("ช่วยเหลือ") || msgLower.includes("สังคม") || msgLower.includes("อาสา")) {
      return {
        reply: `โอ้โห ${name}ชอบ${hobby}นี่น่าชื่นชมมากเลย ❤️ คนที่ชอบช่วยเหลือคนอื่นจะมีหัวใจที่ยิ่งใหญ่เสมอ\n\nที่${name}ชอบช่วยเหลือ...ชอบช่วยแบบไหนที่สุด? ช่วยเพื่อนที่มีปัญหา ช่วยน้องๆ เรียน หรือช่วยงานชุมชน?`,
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
    // ตรวจสอบว่าเด็กหลบเลี่ยงคำถามหรือไม่
    if (isEvasiveAnswer(msg)) {
      return {
        reply: buildCreativePrompt("INTEREST", name, profile),
        storyUpdate: buildUpdate("INTEREST", 1, profile),
      };
    }
    profile.interests = [cleanedKeyword]; // ใช้ keyword ที่สะอาดแล้ว
    const hobby = profile.hobbies[0] || "งานอดิเรก";

    return {
      reply: `อ๋อ ลุงเริ่มเห็นภาพ${name}แล้วล่ะ ✨\n\nลุงสงสัยอยู่นิดนึงว่า ${name}เป็นคนแบบไหน? เช่น เป็นคนชอบคิดวิเคราะห์ ชอบลงมือทำ ชอบช่วยเหลือคน หรือชอบสำรวจสิ่งใหม่ ๆ?`,
      storyUpdate: buildUpdate("PERSONALITY", 1, profile),
    };
  }

  // ── STATE: PERSONALITY ──
  if (!profile.personality_traits || profile.personality_traits.length === 0) {
    // ตรวจสอบว่าเด็กหลบเลี่ยงคำถามหรือไม่
    if (isEvasiveAnswer(msg)) {
      return {
        reply: buildCreativePrompt("PERSONALITY", name, profile),
        storyUpdate: buildUpdate("PERSONALITY", 1, profile),
      };
    }
    profile.personality_traits = [cleanedKeyword]; // ใช้ keyword ที่สะอาดแล้ว
    const hobbies = profile.hobbies?.join(", ") || "";
    const interests = profile.interests?.join(", ") || "";

    return {
      reply: `ลุงได้ยินแล้วนะ ${name}เป็นคนที่ ${cleanedKeyword} 😊\n\nถ้าถามว่าจินตนาการของ${name}ล่ะ... ถ้าเปิดประตูใบหนึ่งแล้วเจอโลกใหม่ อยากให้โลกนั้นเป็นแบบไหน?\n\n🚀 โลกอนาคตเต็มไปด้วยเทคโนโลยี\n🧙 โลกเวทมนตร์และสิ่งมหัศจรรย์\n🌊 โลกใต้ทะเลลึก\n🕵️ โลกที่เต็มไปด้วยปริศนาซ่อนอยู่\n\nหรือ${name}มีโลกที่อยากไปในแบบอื่น?`,
      storyUpdate: buildUpdate("IMAGINATION", 2, profile),
    };
  }

  // ── STATE: IMAGINATION / STORY WORLD ──
  if (!profile.favorite_theme && !profile.story_genre) {
    // ตรวจสอบว่าเด็กหลบเลี่ยงคำถามหรือไม่
    if (isEvasiveAnswer(msg)) {
      return {
        reply: buildCreativePrompt("IMAGINATION", name, profile),
        storyUpdate: buildUpdate("IMAGINATION", 2, profile),
      };
    }
    const worldKeyword = cleanedKeyword; // เช่น "เวทมนตร์" แทน "โลกเวทมนตร์แน่นอนค่ะ"
    profile.favorite_theme = worldKeyword;
    profile.story_genre = worldKeyword;

    if (!profile.story_world) {
      profile.story_world = worldKeyword;
    }

    return {
      reply: `โลก${worldKeyword}นี่น่าตื่นเต้นมากเลย! 🌟 ลุงเริ่มมองเห็นฉากในนิทานแล้ว\n\nถ้ามีตัวละครหลักที่เป็น "ตัวแทนจินตนาการ" ของ${name} ลุงอยากให้ตัวละครนั้นเป็นคนแบบไหน?\nเช่น นักประดิษฐ์ นักสำรวจ นักแก้ปริศนา นักดนตรี นักวาดภาพ หรืออะไรก็ได้ที่ ${name} รู้สึกว่าน่าสนใจ`,
      storyUpdate: buildUpdate("STORY_DIRECTION", 2, profile),
    };
  }

  // ── STATE: CHARACTER IDEA ──
  if (!profile.character_idea && !profile.character_preference) {
    // ตรวจสอบว่าเด็กหลบเลี่ยงคำถามหรือไม่
    if (isEvasiveAnswer(msg)) {
      return {
        reply: buildCreativePrompt("STORY_DIRECTION", name, profile),
        storyUpdate: buildUpdate("STORY_DIRECTION", 2, profile),
      };
    }
    profile.character_idea = cleanedKeyword; // ใช้ keyword ที่สะอาดแล้ว
    profile.character_preference = cleanedKeyword;

    return {
      reply: `ตัวละครสาย${cleanedKeyword}นี่ลุงชอบเลย! 😄\n\nแล้วลุงอยากรู้ว่า ถ้าตัวละครนี้ต้องเผชิญกับ "ปัญหา" หรือ "ภารกิจ" สำคัญในเรื่อง ${name}อยากให้มันเป็นปัญหาประเภทไหน?\n\nเช่น ต้องช่วยเหลือใครสักคน ต้องแก้ไขสิ่งที่เสียหาย ต้องค้นหาบางสิ่ง หรืออยากให้ปัญหาเป็นอะไรก็ได้ที่${name}คิดถึง`,
      storyUpdate: buildUpdate("STORY_DIRECTION", 2, profile),
    };
  }

  // ── STATE: STORY PROBLEM ──
  if (!profile.story_problem) {
    profile.story_problem = cleanedKeyword; // ใช้ keyword ที่สะอาดแล้ว

    // มีข้อมูลครบแล้ว → สรุปก่อน STORY_CONFIRMATION
    const hobby = profile.hobbies?.join(", ") || "สิ่งที่ชอบ";
    const interest = profile.interests?.join(", ") || "";
    const personality = profile.personality_traits?.join(", ") || "";
    const theme = profile.favorite_theme || profile.story_genre || "ผจญภัย";
    const character = profile.character_idea || profile.character_preference || "นักผจญภัย";
    const problem = cleanedKeyword;

    return {
      reply: `ลุงเริ่มเห็นเรื่องของเราแล้วนะ 😊\n\n${profile.favorite_things?.length ? `💫 ${name}ชอบ: ${hobby} และ ${profile.favorite_things.join(", ")}` : `🎯 ${name}ชอบ: ${hobby}${interest ? ` และสนใจเรื่อง ${interest}` : ""}`}\n${personality ? `🧠 บุคลิก: ${personality}` : ""}\n🌍 โลกของเรื่อง: โลก${theme}\n🦸 ตัวละคร: ${character}\n⚠️ ปัญหา: ${problem}\n\nลุงกำลังนึกภาพตัวละครสาย${character}คนนึง ที่ต้อง${problem} ในโลก${theme}...\n\nแต่ตรงนี้ลุงยังไม่แต่งเรื่องนะ 😄 ลุงอยากถาม${name}สักอย่างว่า... อยากให้เรื่องนี้จบแบบไหน? ตัวละครเราสำเร็จแบบง่าย หรืออยากให้มีความพลิกผันสักอย่าง?`,
      storyUpdate: buildUpdate("STORY_DIRECTION", 2, profile),
    };
  }

  // ── STATE: STORY GOAL / ENDING ──
  if (!profile.story_goal) {
    profile.story_goal = cleanedKeyword; // ใช้ keyword ที่สะอาดแล้ว

    const theme = profile.favorite_theme || profile.story_genre || "ผจญภัย";
    const character = profile.character_idea || profile.character_preference || "นักผจญภัย";
    const problem = profile.story_problem || "ปัญหาสำคัญ";
    const hobby = profile.hobbies?.[0] || "สิ่งที่ชอบ";
    const personality = profile.personality_traits?.[0] || "ความมุ่งมั่น";

    return {
      reply: `ลุงขอสรุปแนวเรื่องของเราก่อนนะ 📋\n\n━━━━━━━━━━━━━━━━━━━\n🦸 ตัวละครหลัก: ${character} ที่ได้รับแรงบันดาลใจจาก${hobby}และ${personality}\n🌍 โลกของเรื่อง: โลก${theme}\n⚠️ ปัญหา: ${problem}\n🎯 เป้าหมาย: ${cleanedKeyword}\n━━━━━━━━━━━━━━━━━━━\n\nถ้าแนวนี้โอเค ลุงจะเอาไปเขียนเป็นนิทานฉบับเต็มให้${name}เลย 😊\nหรือถ้าอยากเปลี่ยนตรงไหน บอกลุงได้เลยนะ!`,
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
  // ถ้า fallback ถึงจุดนี้ และ ยืนยันเรื่องแล้ว ให้แต่งนิทานทันทีเลยเพื่อไม่ให้ค้าง
  if (profile.confirmed_story_direction) {
    const charName = profile.character_idea || profile.name || "สัตว์ป่าตัวน้อย";
    const worldName = profile.story_world || profile.favorite_theme || "ป่าใหญ่แห่งจินตนาการ";
    const hobbyName = profile.hobbies?.[0] || "การเดินทาง";
    const problem = profile.story_problem || "พายุลูกใหญ่";
    const trait = profile.personality_traits?.[0] || "ความกล้าหาญ";
    
    const generatedFullStory = `กาลครั้งหนึ่งนานมาแล้ว ในดินแดนอันกว้างใหญ่ที่เรียกว่า ${worldName} มีสิ่งมีชีวิตตัวหนึ่งชื่อว่า ${charName} อาศัยอยู่ ${charName} เป็นที่รู้จักของเพื่อนๆ ในป่าว่าเป็นผู้ที่มี${trait}อย่างเต็มเปี่ยม และมักจะใช้เวลาว่างไปกับ${hobbyName}อย่างมีความสุขเสมอ ทุกๆ วันของ ${charName} เต็มไปด้วยเสียงหัวเราะและรอยยิ้ม

จนกระทั่งวันหนึ่ง ความสงบสุขก็ถูกทำลายลงเมื่อเกิดปัญหาใหญ่ขึ้น นั่นคือ ${problem} ซึ่งทำให้เพื่อนสัตว์ป่าทุกตัวตื่นตระหนกและไม่รู้จะทำอย่างไร หลายตัวพากันซ่อนตัวด้วยความหวาดกลัว แต่ ${charName} กลับคิดต่างออกไป แทนที่จะยอมแพ้ ${charName} ตัดสินใจลุกขึ้นสู้กับปัญหานั้น

ด้วยความรู้และไหวพริบที่ได้จากการฝีกฝน${hobbyName}มาอย่างยาวนาน ${charName} เริ่มวางแผนและค่อยๆ ลงมือแก้ปัญหาทีละขั้นตอน แม้ว่าระหว่างทางจะเจออุปสรรคที่ทำให้เหนื่อยล้า แต่ด้วย${trait}ที่มีอยู่ ทำให้ ${charName} ไม่เคยก้าวถอยหลัง ${charName} ได้ชักชวนเพื่อนๆ ที่ซ่อนตัวอยู่ให้มาร่วมมือกัน 

ในที่สุด ด้วยความพยายามและการรวมพลังของทุกคน ${problem} ก็ถูกแก้ไขจนสำเร็จ ดินแดน ${worldName} กลับมาสงบสุขและสวยงามยิ่งกว่าเดิม เพื่อนๆ ทุกตัวต่างขอบคุณ ${charName} และได้เรียนรู้ว่า ไม่ว่าปัญหาจะใหญ่แค่ไหน หากเรามีความตั้งใจและนำสิ่งที่เรารักมาใช้ให้เกิดประโยชน์ เราก็สามารถเอาชนะมันได้เสมอ`;

    return {
      reply: `นี่คือนิทานอีสปฉบับเต็มที่ลุงแต่งให้ครับ! 🎉\n\n📖 เรื่อง: การผจญภัยของ${charName}\n\n${generatedFullStory}\n\n💡 ข้อคิด: การใช้ความถนัดและความกล้าหาญ สามารถช่วยแก้ปัญหาที่ยากลำบากได้เสมอ\n\n${name} สามารถดูผลลัพธ์ พิมพ์ หรือดาวน์โหลดใบนิทานเก็บไว้ได้เลยนะ!`,
      storyUpdate: {
        ...buildUpdate("FULL_STORY", 4, profile),
        title: `การผจญภัยของ${charName}`,
        theme: worldName,
        plotSummary: `${charName} ใช้ความสามารถเรื่อง${hobbyName} แก้ปัญหา${problem}ได้สำเร็จ`,
        characters: [
          { name: charName, role: "ตัวเอก", description: `ผู้กล้าที่มี${trait}และรัก${hobbyName}` }
        ],
        backdrops: [
          { name: `ดินแดน${worldName}`, description: "ฉากของเรื่อง" }
        ],
        moralLesson: "ความกล้าหาญและการร่วมมือกันคือพลังที่ยิ่งใหญ่ที่สุด",
        fullStory: generatedFullStory,
      },
    };
  }

  return {
    reply: `${name} ลุงกำลังพยายามคิดเรื่องให้อยู่นะ ลองบอกลุงเพิ่มหน่อยว่าอยากให้เรื่องจบยังไงดีครับ?`,
    storyUpdate: buildUpdate("STORY_DIRECTION", 3, profile),
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

    // ── ตรวจสอบคำหยาบ — ถ้าพบให้รีเซ็ตและส่ง flag กลับ ──
    if (containsProfanity(message)) {
      // บันทึก message ที่มีคำหยาบลง DB (optional แต่ดีสำหรับ audit)
      // แล้วคืน response พิเศษให้ frontend รีเซ็ตและ refresh
      return NextResponse.json({
        reply: "⚠️ ลุงต้องหยุดการสนทนานี้ก่อนนะ เพราะลุงสังเกตเห็นคำที่ไม่เหมาะสม ลุงหวังว่าครั้งหน้าเราจะคุยกันด้วยภาษาที่ดีกว่านี้นะ 🙏",
        profanityDetected: true,  // flag พิเศษให้ frontend รับรู้
        resetSession: true,        // flag สั่งให้รีเซ็ต session
        storyUpdate: {
          conversationState: "NAME",
          step: 1,
          userProfile: {},
          title: "นิทานสร้างสรรค์",
          theme: "",
          characters: [],
          backdrops: [],
          moralLesson: "",
          scratchPlan: [],
          suggestedScratchBlocks: [],
        },
      });
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

    const maxTokens = isStoryGenerationPhase ? 2500 : 900;
    const temperature = isStoryGenerationPhase ? 0.78 : 0.65;

    outerLoop: for (const key of keys) {
      const googleAI = createGoogleGenerativeAI({ apiKey: key });

      for (const modelName of CANDIDATE_MODELS) {
        try {
          // หมดเวลา 55 วินาทีต่อ model เพื่อป้องกันรอนานเกินขีดจำกัด Serverless
          const abortController = new AbortController();
          const timeoutId = setTimeout(() => abortController.abort(), 55000);

          const result = await generateText({
            model: googleAI(modelName),
            system: SYSTEM_PROMPT,
            messages: fullMessages as any,
            temperature,
            maxOutputTokens: maxTokens,
            maxRetries: 0,
            abortSignal: abortController.signal,
          });

          clearTimeout(timeoutId);

          if (result.text) {
            rawReply = result.text;
            break outerLoop;
          }
        } catch (err: any) {
          lastError = err;
          const reason = err?.name === "AbortError" ? "timeout 25s" : err?.message;
          console.warn(`Model ${modelName} failed:`, reason);
        }
      }
    }

    // ── Parse AI Response ──
    let parsedStoryUpdate: any = null;
    let conversationalText = rawReply;
    let fullStoryText = "";

    if (rawReply) {
      const jsonMatch = rawReply.match(/```(?:story_json|json)?\s*([\s\S]*?)\s*```/);
      let jsonStr = "";
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
        conversationalText = rawReply.replace(jsonMatch[0], "").trim();
      } else {
        const fallbackMatch = rawReply.match(/(\{[\s\S]*\})/);
        if (fallbackMatch) {
          jsonStr = fallbackMatch[1];
          conversationalText = rawReply.replace(fallbackMatch[0], "").trim();
        }
      }

      if (jsonStr) {
        try {
          parsedStoryUpdate = JSON.parse(jsonStr);
          if (parsedStoryUpdate.fullStory) {
            fullStoryText = parsedStoryUpdate.fullStory;
          }
        } catch (e) {
          console.warn("Failed to parse JSON:", e);
        }
      } else {
        conversationalText = rawReply;
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
