"use client";

import React, { useState } from "react";
import { Lightbulb, Users, BookOpen, Code2, CheckCircle2, ChevronDown, ChevronUp, Sparkles, UserCheck } from "lucide-react";

export interface StoryStepperProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export const STORY_STEPS = [
  {
    step: 1,
    title: "รู้จักตัวตน & ความชอบ",
    subtitle: "ชื่อ, งานอดิเรก & ความสนใจ",
    icon: UserCheck,
    color: "bg-[#FFBF00]",
    borderColor: "border-[#E6AC00]",
    textColor: "text-[#D49000]",
  },
  {
    step: 2,
    title: "วางแนวเรื่อง & ตัวละคร",
    subtitle: "ธีม, ตัวละคร & พลังพิเศษ",
    icon: Sparkles,
    color: "bg-[#4C97FF]",
    borderColor: "border-[#3373CC]",
    textColor: "text-[#3373CC]",
  },
  {
    step: 3,
    title: "สรุป & สร้างนิทาน",
    subtitle: "โครงเรื่อง 8 องค์ประกอบ",
    icon: BookOpen,
    color: "bg-[#9966FF]",
    borderColor: "border-[#774DCB]",
    textColor: "text-[#774DCB]",
  },
  {
    step: 4,
    title: "สมุดพิมพ์เขียวนิทาน",
    subtitle: "ผลลัพธ์และดาวน์โหลด",
    icon: Code2,
    color: "bg-[#0FBD8C]",
    borderColor: "border-[#0DA57A]",
    textColor: "text-[#0DA57A]",
  },
];

export function StoryStepper({ currentStep, onStepClick }: StoryStepperProps) {
  const [collapsedMobile, setCollapsedMobile] = useState(false);
  const clampedStep = Math.min(Math.max(currentStep, 1), 4);
  const currentStepData = STORY_STEPS[clampedStep - 1] || STORY_STEPS[0];
  const CurrentIcon = currentStepData.icon;

  return (
    <div className="w-full bg-[#FFFDF9] border border-[#EADBC8] rounded-2xl shadow-xs overflow-hidden">
      {/* Mobile Compact Bar (< 640px) */}
      <div className="sm:hidden p-2.5 flex items-center justify-between bg-gradient-to-r from-[#FFF5E6] to-[#FFFDF9]">
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-lg ${currentStepData.color} text-white flex items-center justify-center font-bold shadow-2xs`}
          >
            <CurrentIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#2C221E]">
                ขั้นที่ {clampedStep}: {currentStepData.title}
              </span>
              <span className="text-[10px] text-[#FF8C1A] font-semibold">
                ({clampedStep}/4)
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-36 h-1.5 bg-[#EADBC8] rounded-full mt-1 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#FF8C1A] to-[#0FBD8C] transition-all duration-300 rounded-full"
                style={{ width: `${(clampedStep / 4) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setCollapsedMobile(!collapsedMobile)}
          className="p-1.5 text-[#8C7662] hover:text-[#FF8C1A] hover:bg-white rounded-lg transition-colors text-[11px] font-semibold flex items-center gap-1"
        >
          <span>{collapsedMobile ? "ดูขั้นตอน" : "ย่อ"}</span>
          {collapsedMobile ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Full Stepper on Tablet/Desktop, or when expanded on mobile */}
      <div
        className={`p-3 md:p-4 ${
          collapsedMobile ? "hidden sm:block" : "block"
        } border-t sm:border-t-0 border-[#EADBC8]`}
      >
        <div className="flex items-center justify-between relative">
          {/* Background Line */}
          <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-[#EADBC8] -z-0" />

          {STORY_STEPS.map((s) => {
            const isCompleted = clampedStep > s.step;
            const isCurrent = clampedStep === s.step;
            const Icon = s.icon;

            return (
              <button
                key={s.step}
                type="button"
                onClick={() => onStepClick && onStepClick(s.step)}
                className={`relative z-10 flex flex-col items-center group transition-transform ${
                  onStepClick ? "cursor-pointer hover:scale-105" : "cursor-default"
                }`}
              >
                <div
                  className={`w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center font-bold text-white shadow-md border-2 transition-all ${
                    isCompleted
                      ? "bg-[#0FBD8C] border-[#0DA57A]"
                      : isCurrent
                      ? `${s.color} ${s.borderColor} ring-3 sm:ring-4 ring-[#FF8C1A]/20 scale-105 sm:scale-110`
                      : "bg-[#E6D9C8] border-[#D1BEA5] text-[#8C7662]"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </div>

                <div className="mt-1 text-center max-w-[70px] sm:max-w-[110px] md:max-w-none">
                  <span
                    className={`text-[10px] sm:text-xs font-semibold block leading-tight ${
                      isCurrent
                        ? "text-[#2C221E] font-bold"
                        : isCompleted
                        ? "text-[#0FBD8C]"
                        : "text-[#8C7662]"
                    }`}
                  >
                    ขั้นที่ {s.step}: {s.title}
                  </span>
                  <span className="hidden md:block text-[10px] text-[#A68F7A]">
                    {s.subtitle}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
