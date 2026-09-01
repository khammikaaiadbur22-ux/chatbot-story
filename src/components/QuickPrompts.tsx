"use client";

import React from "react";
import { Sparkles, Lightbulb, Compass, HelpCircle } from "lucide-react";

interface QuickPromptsProps {
  step: number;
  hasIntroduced?: boolean;
  onSelectPrompt: (prompt: string) => void;
  disabled?: boolean;
}

export function QuickPrompts({
  step,
  hasIntroduced = false,
  onSelectPrompt,
  disabled = false,
}: QuickPromptsProps) {
  // Prompts grouped by step
  const stepPrompts: Record<number, { category: string; prompts: string[] }> = {
    1: {
      category: hasIntroduced
        ? "💡 ไอเดียตั้งต้นนิทานอีสป"
        : "👋 กดเพื่อแนะนำตัวกับลุงเล่านิทาน",
      prompts: hasIntroduced
        ? [
            "อยากแต่งเรื่อง 'กระต่ายไฮสปีดกับเต่าหุ่นยนต์' แข่งขันกันในเมืองอนาคตครับ!",
            "อยากแต่งเรื่อง 'มดจิ๋วกับตั๊กแตนนักร้อง' สอนเรื่องการเตรียมพร้อมและขยันขันแข็ง",
            "อยากแต่งเรื่อง 'สิงโตผู้หยิ่งผยองกับหนูน้อยนักประดิษฐ์' ช่วยเหลือกัน",
            "ลุงช่วยแนะนำธีมนิทานสัตว์แฟนตาซีสนุกๆ ที่มีข้อคิดดีๆ หน่อยครับ",
          ]
        : [
            "สวัสดีครับลุง ผมชื่อบอส รหัส 67209010001 ครับ",
            "หนูชื่อพลอย รหัส 67209010002 ค่ะ พร้อมแต่งนิทานแล้วค่ะ",
            "ผมชื่อภูมิ รหัส 67209010003 ครับผม",
            "สวัสดีครับคุณลุงเล่านิทาน!",
          ],
    },
    2: {
      category: "🎭 ออกแบบตัวละคร & ฉากใน Scratch",
      prompts: [
        "ตัวละครหลักเป็นกระรอกน้อยขี้สงสัย และมีนกฮูกเป็นที่ปรึกษาครับ",
        "ฉากหลังอยากให้มี 2 ฉาก: ในป่าใหญ่ตอนเช้า และในถ้ำลึกลับตอนค่ำ",
        "ในโปรแกรม Scratch ควรเลือก Sprite ตัวไหนมาใช้ทำตัวเอกดีครับ?",
        "ช่วยออกแบบท่าทางและการเปลี่ยนชุด (Costume) ให้ตัวละครหน่อยครับ",
      ],
    },
    3: {
      category: "📜 ผูกปมปัญหา & คติสอนใจแบบอีสป",
      prompts: [
        "ปมเรื่องคือ ตัวละครหลักประมาทและคิดว่าตัวเองเก่งที่สุด จนเกิดเรื่องผิดพลาด",
        "ข้อคิดคือ 'ความพยายามอยู่ที่ไหน ความสำเร็จอยู่ที่นั่น' และ 'อย่าประมาท'",
        "อยากให้ตอนจบมีจุดหักมุมที่ทำให้ทุกคนร่วมมือกัน ลุงช่วยแนะนำบทสนทนาหน่อยครับ",
        "ช่วยสรุปคติสอนใจแบบนิทานอีสปที่เข้าใจง่ายและกินใจให้หน่อยครับ",
      ],
    },
    4: {
      category: "🧩 วางแผนบล็อกคำสั่ง Scratch",
      prompts: [
        "ช่วยแนะนำบล็อกคำสั่งให้ตัวละครเดินและพูดบทสนทนาสลับกันหน่อยครับ",
        "เมื่อกดปุ่ม Spacebar อยากให้ตัวละครกระโดดและเล่นเสียงเอฟเฟกต์ ต้องใช้บล็อกอะไรบ้างครับ?",
        "อยากให้เมื่อจบฉากที่ 1 แล้วเปลี่ยนฉากหลังเป็นฉากที่ 2 พร้อมส่งข้อความ (Broadcast)",
        "ช่วยสรุปขั้นตอนการเขียนโค้ด Scratch ทั้งหมดใส่ลงในพิมพ์เขียวนิทานให้หน่อยครับ!",
      ],
    },
  };

  const current = stepPrompts[step] || stepPrompts[1];

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1 text-[11px] font-bold text-[#8C7662]">
        <Lightbulb className="w-3 h-3 text-[#FFAB19]" />
        <span>{current.category} (กดเพื่อเลือกคำตอบ/คำถาม):</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {current.prompts.map((p, idx) => (
          <button
            key={idx}
            type="button"
            disabled={disabled}
            onClick={() => onSelectPrompt(p)}
            className="text-left px-2.5 py-1.5 bg-[#FFFDF9] hover:bg-[#FFF5E6] hover:border-[#FF8C1A] text-[#4A3319] border border-[#EADBC8] rounded-xl text-[11px] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xs disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1.5"
          >
            <span className="text-[#FF8C1A]">✨</span>
            <span className="line-clamp-1">{p}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
