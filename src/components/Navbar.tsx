"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, MessageCircle } from "lucide-react";

interface NavbarProps {
  studentNickname?: string;
  studentId?: string;
}

export function Navbar({ studentNickname, studentId }: NavbarProps) {
  const displayName = studentNickname || "นักศึกษา ปวช. 1";

  return (
    <header className="sticky top-0 z-40 bg-[#FFFDF9]/90 backdrop-blur-md border-b border-[#EADBC8] shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
        {/* Logo & Brand */}
        <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl overflow-hidden border-2 border-[#FF8C1A] shadow-sm group-hover:scale-105 transition-transform shrink-0">
            <img
              src="/images/uncle-storyteller.jpg"
              alt="ลุงเล่านิทาน"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base sm:text-lg text-[#2C221E] group-hover:text-[#FF8C1A] transition-colors leading-none">
                ลุงเล่านิทาน
              </span>
              <span className="px-2 py-0.5 bg-[#FF8C1A]/15 text-[#FF8C1A] font-bold text-[9px] sm:text-[10px] rounded-full uppercase tracking-wider">
                Scratch Story Coach
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-[#8C7662] leading-none mt-1 hidden xs:block">
              สร้างสรรค์นิทานอีสป & โครงงาน Scratch (ปวช. 1)
            </p>
          </div>
        </Link>

        {/* Right Student Info Badge */}
        <div className="flex items-center gap-2">
          {studentNickname ? (
            <div className="flex items-center gap-2 px-3 py-1 sm:py-1.5 bg-[#FFF5E6] border border-[#F5DEBF] rounded-2xl shadow-2xs">
              <div className="w-6 h-6 rounded-full bg-[#FF8C1A] text-white flex items-center justify-center text-xs font-bold shrink-0">
                {studentNickname[0]?.toUpperCase() || "S"}
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-[#2C221E] leading-tight">
                  หลาน{studentNickname}
                </div>
                {studentId && (
                  <div className="text-[10px] text-[#A67300] font-semibold font-mono">
                    รหัส {studentId}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-[#F7EFE3] border border-[#EADBC8] rounded-xl text-xs font-bold text-[#8C7662]">
              <span className="w-2 h-2 rounded-full bg-[#0FBD8C] animate-pulse" />
              <span>ห้องเรียน ปวช. 1</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
