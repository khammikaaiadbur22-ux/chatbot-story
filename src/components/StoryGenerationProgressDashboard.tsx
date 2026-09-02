"use client";

import React, { useState, useEffect } from "react";
import {
  UserCheck,
  Lightbulb,
  Users,
  Compass,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  RotateCcw,
  Printer,
  ChevronDown,
  ChevronUp,
  Check,
  Wand2,
} from "lucide-react";

export type GenerationStatus = "idle" | "processing" | "completed" | "error";

export interface ProgressStage {
  id: string;
  stageNumber: number;
  title: string;
  shortDesc: string;
  subItems: string[];
  icon: React.ElementType;
}

export const STORY_GENERATION_STAGES: ProgressStage[] = [
  {
    id: "learner-profile",
    stageNumber: 1,
    title: "วิเคราะห์ข้อมูลผู้เรียน",
    shortDesc: "ลุงกำลังอ่านข้อมูลความชอบ งานอดิเรก และเอกลักษณ์ของคุณ",
    subItems: ["ชื่อผู้เรียน", "ระดับชั้น / วัยของผู้เรียน", "ความสนใจ & สิ่งที่ชอบ", "งานอดิเรก & ทักษะ"],
    icon: UserCheck,
  },
  {
    id: "story-concept",
    stageNumber: 2,
    title: "วางแนวคิดหลักของนิทาน",
    shortDesc: "ลุงกำลังออกแบบธีมเรื่อง บรรยากาศ และข้อคิดคติสอนใจ",
    subItems: ["ธีมเรื่องหลัก", "แนวคิดสำคัญ (Core Concept)", "บรรยากาศของเรื่อง (Mood & Tone)", "ข้อคิดที่ต้องการสื่อ (Moral)"],
    icon: Lightbulb,
  },
  {
    id: "characters",
    stageNumber: 3,
    title: "ออกแบบตัวละคร",
    shortDesc: "ลุงกำลังสร้างตัวละครให้เหมาะกับเรื่องราวของคุณ",
    subItems: ["ตัวละครหลัก (Protagonist)", "ตัวละครรอง / เพื่อนร่วมทาง", "บุคลิก & อุปนิสัย", "ความสามารถพิเศษ & ไหวพริบ", "ความสัมพันธ์ระหว่างตัวละคร"],
    icon: Users,
  },
  {
    id: "world-setting",
    stageNumber: 4,
    title: "สร้างฉากและโลกของเรื่อง",
    shortDesc: "ลุงกำลังสร้างสถานที่ ช่วงเวลา และฉากหลังประกอบเรื่องราว",
    subItems: ["สถานที่เกิดเหตุการณ์", "ช่วงเวลา & ยุคสมัย", "บรรยากาศ & สิ่งแวดล้อม", "ฉากหลังประกอบนิทาน (Visual Backdrops)"],
    icon: Compass,
  },
  {
    id: "plot-structure",
    stageNumber: 5,
    title: "วางโครงเรื่อง",
    shortDesc: "ลุงกำลังวางลำดับเหตุการณ์ 8 ขั้นตอนเพื่อให้เรื่องสนุกและตื่นเต้น",
    subItems: [
      "1. เปิดเรื่อง",
      "2. เหตุการณ์เริ่มต้น",
      "3. ปัญหาหรือภารกิจ",
      "4. อุปสรรค",
      "5. จุดเปลี่ยน (Climax)",
      "6. การแก้ปัญหา",
      "7. บทสรุป",
      "8. ข้อคิดสอนใจ",
    ],
    icon: Sparkles,
  },
  {
    id: "prose-composition",
    stageNumber: 6,
    title: "เรียบเรียงนิทาน",
    shortDesc: "ลุงกำลังเขียนเนื้อเรื่องฉบับเต็ม พร้อมบทสนทนาและอารมณ์เรื่อง",
    subItems: ["เขียนเนื้อเรื่องฉบับเต็ม", "ตรวจสอบความลื่นไหล & ต่อเนื่อง", "ตรวจสอบความเหมาะสมกับวัยผู้เรียน"],
    icon: BookOpen,
  },
  {
    id: "quality-check",
    stageNumber: 7,
    title: "ตรวจสอบนิทานฉบับสมบูรณ์",
    shortDesc: "ลุงกำลังตรวจทานความถูกต้อง และจัดเตรียมข้อมูลสำหรับพิมพ์หรือดาวน์โหลด",
    subItems: [
      "ตรวจคำผิด & ไวยากรณ์",
      "ตรวจความสอดคล้องของตัวละคร",
      "ตรวจความถูกต้องของโครงเรื่อง",
      "เตรียมข้อมูลสำหรับแสดงผล ดาวน์โหลด หรือพิมพ์",
    ],
    icon: CheckCircle2,
  },
];

interface StoryGenerationProgressDashboardProps {
  status: GenerationStatus;
  currentActiveStep?: number; // 0 to 6
  progressPercent?: number; // 0 to 100
  errorMessage?: string;
  studentName?: string;
  storyTitle?: string;
  onRetry?: () => void;
  onViewStory?: () => void;
  onPrint?: () => void;
}

export function StoryGenerationProgressDashboard({
  status = "processing",
  currentActiveStep: propActiveStep,
  progressPercent: propPercent,
  errorMessage,
  studentName = "นักเรียน",
  storyTitle,
  onRetry,
  onViewStory,
  onPrint,
}: StoryGenerationProgressDashboardProps) {
  const [internalStep, setInternalStep] = useState(0);
  const [internalPercent, setInternalPercent] = useState(12);
  const [expandedStages, setExpandedStages] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (status === "completed") {
      setInternalStep(STORY_GENERATION_STAGES.length - 1);
      setInternalPercent(100);
      return;
    }

    if (status !== "processing") return;

    // Progression: 12% -> 25% -> 40% -> 55% -> 70% -> 85% -> 89%
    const stepTargetPercents = [12, 25, 40, 55, 70, 85, 89];
    // ยืดเวลาให้ครอบคลุม API ที่อาจใช้ถึง 35 วินาที
    const stageDurationMs = [4000, 5000, 5000, 6000, 6000, 7000, 5000];

    const interval = setInterval(() => {
      setInternalPercent((prev) => {
        if (prev >= 89) return 89; // รอ real completion เท่านั้น
        return prev + 1;
      });
    }, 500);

    const stepTimers: NodeJS.Timeout[] = [];
    let accumulatedTime = 0;

    stageDurationMs.forEach((duration, idx) => {
      accumulatedTime += duration;
      const t = setTimeout(() => {
        setInternalStep((prev) => Math.max(prev, idx));
        setInternalPercent((prev) => Math.max(prev, stepTargetPercents[idx]));
      }, accumulatedTime);
      stepTimers.push(t);
    });

    return () => {
      clearInterval(interval);
      stepTimers.forEach(clearTimeout);
    };
  }, [status]);

  const activeStep =
    status === "completed"
      ? STORY_GENERATION_STAGES.length - 1
      : propActiveStep !== undefined
      ? propActiveStep
      : internalStep;

  const percent =
    status === "completed"
      ? 100
      : propPercent !== undefined
      ? Math.min(propPercent, 100)
      : Math.min(internalPercent, 89);

  const currentStageObj = STORY_GENERATION_STAGES[activeStep] || STORY_GENERATION_STAGES[0];

  const toggleExpand = (idx: number) => {
    setExpandedStages((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div
      id="story-generation-progress-card"
      className="bg-[#FFFDF9] border border-[#EADBC8] rounded-3xl shadow-md overflow-hidden flex flex-col h-full w-full animate-in fade-in duration-300"
    >
      {/* Header Bar */}
      <div className="p-4 sm:p-5 border-b border-[#EADBC8] bg-gradient-to-r from-[#FFF5E6] via-[#FFFDF9] to-[#FFFDF9] shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#FF8C1A] to-[#FFAB19] text-white flex items-center justify-center shadow-md shrink-0">
                {status === "completed" ? (
                  <CheckCircle2 className="w-7 h-7 animate-bounce" />
                ) : status === "error" ? (
                  <AlertTriangle className="w-7 h-7 text-white" />
                ) : (
                  <Wand2 className="w-7 h-7 animate-pulse" />
                )}
              </div>
              {status === "processing" && (
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF8C1A] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-[#FF8C1A] border-2 border-white"></span>
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-lg sm:text-xl text-[#2C221E] leading-tight">
                  {status === "completed"
                    ? "สร้างนิทานเสร็จแล้ว! 🎉"
                    : status === "error"
                    ? "เกิดข้อผิดพลาดในการสร้างนิทาน"
                    : status === "idle"
                    ? "พร้อมเริ่มสร้างนิทาน 7 ขั้นตอน"
                    : "กำลังสร้างนิทานให้คุณ"}
                </h3>
                <span
                  className={`px-3 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
                    status === "completed"
                      ? "bg-[#0FBD8C]/15 text-[#0DA57A]"
                      : status === "error"
                      ? "bg-red-100 text-red-700"
                      : status === "idle"
                      ? "bg-[#FF8C1A]/15 text-[#E6780C]"
                      : "bg-[#FF8C1A]/15 text-[#E6780C] animate-pulse"
                  }`}
                >
                  {status === "completed"
                    ? "สำเร็จ 100%"
                    : status === "error"
                    ? "เกิดข้อผิดพลาด"
                    : status === "idle"
                    ? "พร้อมเริ่มสร้าง"
                    : `ขั้นตอนที่ ${activeStep + 1} จาก 7`}
                </span>
              </div>
              <p
                className="text-xs sm:text-sm font-medium text-[#8C7662] mt-1"
                aria-live="polite"
              >
                {status === "completed"
                  ? `นิทานเรื่อง "${storyTitle || "นิทานสร้างสรรค์"}" สมบูรณ์พร้อมให้คุณอ่านและพิมพ์แล้ว`
                  : status === "error"
                  ? errorMessage || "ไม่สามารถประมวลผลต่อได้ กรุณากดลองใหม่อีกครั้ง"
                  : status === "idle"
                  ? "กดปุ่ม 'เริ่มต้นสร้างนิทาน' เพื่อให้ลุงเล่านิทานเริ่มเรียบเรียงนิทานฉบับสมบูรณ์"
                  : `${currentStageObj.title}: ${currentStageObj.shortDesc}`}
              </p>
            </div>
          </div>

          {/* Action Buttons for Idle, Completed or Error State */}
          {status === "idle" && onRetry && (
            <div className="flex items-center gap-2 shrink-0 animate-in fade-in zoom-in-95 duration-300">
              <button
                type="button"
                onClick={onRetry}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-[#FF8C1A] to-[#FFAB19] hover:from-[#E6780C] hover:to-[#E69100] text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all hover:scale-105 active:scale-95"
              >
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>เริ่มต้นสร้างนิทาน ✨</span>
              </button>
            </div>
          )}

          {status === "completed" && (
            <div className="flex items-center gap-2 shrink-0 animate-in fade-in zoom-in-95 duration-300">
              {onViewStory && (
                <button
                  type="button"
                  onClick={onViewStory}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#FF8C1A] to-[#FFAB19] hover:from-[#E6780C] hover:to-[#E69100] text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all hover:scale-105 active:scale-95"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>อ่านนิทานฉบับเต็ม</span>
                </button>
              )}
              {onPrint && (
                <button
                  type="button"
                  onClick={onPrint}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#FAF6EE] text-[#4A3319] border border-[#EADBC8] text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all hover:scale-105 active:scale-95"
                >
                  <Printer className="w-4 h-4 text-[#FF8C1A]" />
                  <span className="hidden sm:inline">พิมพ์ / ดาวน์โหลด</span>
                </button>
              )}
            </div>
          )}

          {status === "error" && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all hover:scale-105"
            >
              <RotateCcw className="w-4 h-4" />
              <span>ลองใหม่อีกครั้ง</span>
            </button>
          )}
        </div>

        {/* Global Progress Bar */}
        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between items-center text-xs font-bold text-[#8C7662]">
            <span className="flex items-center gap-1.5">
              {status === "processing" && (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FF8C1A]" />
              )}
              <span>
                {status === "completed"
                  ? "กระบวนการสร้างเสร็จสิ้นครบถ้วน"
                  : `กำลังดำเนินการ ${percent}%`}
              </span>
            </span>
            <span className="font-extrabold text-[#FF8C1A]">{percent}%</span>
          </div>

          <div className="w-full bg-[#EADBC8]/60 rounded-full h-3.5 overflow-hidden shadow-inner p-0.5 relative">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out relative ${
                status === "completed"
                  ? "bg-gradient-to-r from-[#0FBD8C] to-[#27D9A5]"
                  : status === "error"
                  ? "bg-red-500"
                  : "bg-gradient-to-r from-[#FF8C1A] via-[#FFAB19] to-[#9966FF]"
              }`}
              style={{ width: `${percent}%` }}
            >
              {status === "processing" && (
                <div className="absolute inset-0 bg-white/30 animate-[shimmer_2s_infinite] -skew-x-12" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Body: Active Task Highlight + 7-Stage Timeline */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
        {/* Active Task Card (Current In-Progress Detail) */}
        {status === "processing" && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#FFF9EE] via-[#FFFDF9] to-[#FFF5E6] border-2 border-[#FF8C1A]/40 shadow-xs relative overflow-hidden animate-in fade-in duration-300">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#FF8C1A] text-white flex items-center justify-center shadow-xs shrink-0 mt-0.5">
                <currentStageObj.icon className="w-5 h-5 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold tracking-wider text-[#FF8C1A] uppercase">
                    งานปัจจุบัน
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FF8C1A]/15 text-[#E6780C] text-[10px] font-extrabold rounded-full">
                    <span className="w-1.5 h-1.5 bg-[#FF8C1A] rounded-full animate-ping" />
                    กำลังทำงาน
                  </span>
                </div>
                <h4 className="font-extrabold text-base text-[#2C221E] mt-0.5">
                  {currentStageObj.title}
                </h4>
                <p className="text-xs text-[#8C7662] mt-1 leading-relaxed">
                  {currentStageObj.shortDesc}
                </p>

                {/* Sub-items Checklist */}
                <div className="mt-3 pt-3 border-t border-[#EADBC8]/70 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {currentStageObj.subItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-xs text-[#4A3319] bg-white/80 px-2.5 py-1.5 rounded-lg border border-[#EADBC8]/60"
                    >
                      <div className="w-4 h-4 rounded-full bg-[#FF8C1A]/20 text-[#E6780C] flex items-center justify-center text-[10px] font-bold shrink-0">
                        {idx + 1}
                      </div>
                      <span className="truncate">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Alert Box */}
        {status === "error" && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs sm:text-sm">
              <h5 className="font-bold">เกิดข้อผิดพลาด</h5>
              <p className="text-red-700 mt-0.5 leading-relaxed">
                {errorMessage ||
                  "ไม่สามารถประมวลผลขั้นตอนการสร้างนิทานได้ ระบบได้บันทึกข้อมูลที่ระบุไว้ก่อนหน้าเรียบร้อยแล้ว กรุณากดลองใหม่อีกครั้ง"}
              </p>
            </div>
          </div>
        )}

        {/* Stepper / Timeline Section (7 Steps) */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h4 className="font-extrabold text-xs sm:text-sm text-[#4A3319] uppercase tracking-wide flex items-center gap-2">
              <span>สถานะการสร้างนิทาน</span>
            </h4>
            <span className="text-[11px] font-semibold text-[#8C7662]">
              {status === "completed"
                ? "เสร็จสิ้น 7 / 7"
                : `เสร็จสิ้น ${activeStep} / 7`}
            </span>
          </div>

          <div className="space-y-2.5">
            {STORY_GENERATION_STAGES.map((stage, idx) => {
              const isCompleted =
                status === "completed" || idx < activeStep;
              const isActive = status === "processing" && idx === activeStep;
              const isPending =
                status !== "completed" && idx > activeStep;
              const isExpanded = expandedStages[idx] ?? (isActive || isCompleted);

              return (
                <div
                  key={stage.id}
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                    isActive
                      ? "bg-gradient-to-r from-[#FFFDF9] to-[#FFF9EE] border-[#FF8C1A] shadow-sm scale-[1.005]"
                      : isCompleted
                      ? "bg-[#FFFDF9] border-[#BCEEDB]/80 hover:border-[#0FBD8C]/50"
                      : "bg-[#FAF6EE]/50 border-[#EADBC8]/60 opacity-60"
                  }`}
                >
                  {/* Step Header Bar */}
                  <div
                    onClick={() => toggleExpand(idx)}
                    className="p-3 sm:p-3.5 flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Step Indicator Icon */}
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold transition-colors ${
                          isCompleted
                            ? "bg-[#0FBD8C] text-white shadow-xs"
                            : isActive
                            ? "bg-[#FF8C1A] text-white shadow-xs animate-pulse"
                            : "bg-[#EADBC8] text-[#8C7662]"
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="w-4 h-4" />
                        ) : isActive ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <span>{stage.stageNumber}</span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h5
                            className={`font-bold text-xs sm:text-sm truncate ${
                              isCompleted
                                ? "text-[#2C221E]"
                                : isActive
                                ? "text-[#FF8C1A] font-extrabold"
                                : "text-[#8C7662]"
                            }`}
                          >
                            {stage.stageNumber}. {stage.title}
                          </h5>

                          {/* Status Badge */}
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                              isCompleted
                                ? "bg-[#0FBD8C]/15 text-[#0DA57A]"
                                : isActive
                                ? "bg-[#FF8C1A]/15 text-[#E6780C] animate-pulse"
                                : "bg-[#EADBC8]/50 text-[#8C7662]"
                            }`}
                          >
                            {isCompleted
                              ? "เสร็จแล้ว"
                              : isActive
                              ? "กำลังทำงาน"
                              : "รอดำเนินการ"}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#8C7662] truncate mt-0.5">
                          {stage.shortDesc}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="text-[#8C7662] p-1 rounded-lg hover:bg-black/5"
                      aria-label="Toggle details"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Expanded Sub-items Checklist */}
                  {isExpanded && (
                    <div className="px-3.5 pb-3.5 pt-1 border-t border-[#EADBC8]/40 bg-[#FFFDF9]/40">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {stage.subItems.map((sub, sIdx) => (
                          <div
                            key={sIdx}
                            className={`flex items-center gap-2 text-[11px] px-2.5 py-1 rounded-lg ${
                              isCompleted
                                ? "text-[#0DA57A] bg-[#E6F9F3]/60"
                                : isActive
                                ? "text-[#4A3319] bg-[#FFF5E6]"
                                : "text-[#A68F7A]"
                            }`}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#0FBD8C] shrink-0" />
                            ) : isActive ? (
                              <span className="w-2 h-2 rounded-full bg-[#FF8C1A] animate-ping shrink-0" />
                            ) : (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#D9C3A5] shrink-0" />
                            )}
                            <span className="truncate">{sub}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
