"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, ArrowRight, User } from "lucide-react";

interface WelcomeModalProps {
  onComplete: (nickname: string, studentId: string) => void;
}

export function WelcomeModal({ onComplete }: WelcomeModalProps) {
  const [nickname, setNickname] = useState("");
  const [studentId, setStudentId] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nickname.trim() && studentId.trim()) {
      onComplete(nickname.trim(), studentId.trim());
    }
  };

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="bg-gradient-to-r from-[#FF8C1A] to-[#FFAB19] p-6 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 opacity-20 transform translate-x-4 -translate-y-4">
            <Sparkles size={100} />
          </div>
          <h2 className="text-2xl font-bold mb-2 relative z-10">ยินดีต้อนรับสู่ห้องเล่านิทาน!</h2>
          <p className="text-sm text-white/90 relative z-10">
            ก่อนที่เราจะเริ่มผจญภัย ลุงขอทำความรู้จักหน่อยนะ
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="nickname" className="text-sm font-bold text-[#4A3319] flex items-center gap-1.5">
              <User size={16} className="text-[#FF8C1A]" />
              ชื่อเล่นของหนู
            </label>
            <input
              id="nickname"
              type="text"
              required
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="เช่น น้องฟ้าใส..."
              className="w-full px-4 py-3 rounded-2xl border-2 border-[#EADBC8] bg-[#FAF6EE] focus:border-[#FF8C1A] focus:ring-0 outline-none transition-all text-[#2C221E] placeholder:text-[#A68F7A]"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="studentId" className="text-sm font-bold text-[#4A3319] flex items-center gap-1.5">
              <User size={16} className="text-[#FF8C1A]" />
              เลขประจำตัว / รหัสนักเรียน
            </label>
            <input
              id="studentId"
              type="text"
              required
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="กรอกรหัสนักเรียน..."
              className="w-full px-4 py-3 rounded-2xl border-2 border-[#EADBC8] bg-[#FAF6EE] focus:border-[#FF8C1A] focus:ring-0 outline-none transition-all text-[#2C221E] placeholder:text-[#A68F7A]"
            />
          </div>

          <button
            type="submit"
            disabled={!nickname.trim() || !studentId.trim()}
            className="w-full py-3.5 bg-[#FF8C1A] hover:bg-[#E6780C] text-white font-bold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:pointer-events-none"
          >
            <span>เริ่มคุยกับลุงนิทาน</span>
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>
      </div>
    </div>
  );
}
