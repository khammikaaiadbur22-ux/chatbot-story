"use client";

import React, { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Sparkles,
  BookOpen,
  User,
  GraduationCap,
  ArrowRight,
  IdCard,
  Hash,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get("role") === "TEACHER" ? "TEACHER" : "STUDENT";

  const [role, setRole] = useState<"STUDENT" | "TEACHER">(initialRole);
  const [nickname, setNickname] = useState("");
  const [studentId, setStudentId] = useState("");
  const [teacherUsername, setTeacherUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (role === "STUDENT") {
      if (!nickname.trim()) {
        setError("กรุณากรอกชื่อเล่นครับ");
        return;
      }
      if (!studentId.trim()) {
        setError("กรุณากรอกรหัสประจำตัวนักศึกษาครับ");
        return;
      }
    } else {
      if (!teacherUsername.trim()) {
        setError("กรุณากรอกชื่อคุณครูก่อนเข้าสู่ระบบครับ");
        return;
      }
    }

    setLoading(true);

    try {
      const res = await signIn("credentials", {
        nickname: role === "STUDENT" ? nickname.trim() : teacherUsername.trim(),
        studentId: role === "STUDENT" ? studentId.trim() : "",
        username: role === "STUDENT" ? studentId.trim() : teacherUsername.trim(),
        role: role,
        redirect: false,
      });

      if (res?.ok) {
        if (role === "TEACHER") {
          router.push("/dashboard");
        } else {
          router.push("/chat");
        }
      } else {
        setError("ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง");
      }
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickStudent = (name: string, id: string) => {
    setNickname(name);
    setStudentId(id);
    setRole("STUDENT");
    setError("");
  };

  return (
    <div className="w-full max-w-md bg-[#FFFDF9] border-2 border-[#EADBC8] rounded-3xl shadow-xl overflow-hidden">
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-br from-[#FFF5E6] to-[#FFFDF9] border-b border-[#EADBC8] text-center relative">
        <div className="w-20 h-20 mx-auto rounded-2xl overflow-hidden border-3 border-[#FF8C1A] shadow-md mb-3 bg-white">
          <img
            src="/images/uncle-storyteller.jpg"
            alt="ลุงเล่านิทาน"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="inline-block px-3 py-0.5 bg-[#FF8C1A]/15 text-[#FF8C1A] font-bold text-[11px] rounded-full uppercase tracking-wider mb-1">
          ระดับชั้น ปวช. 1
        </div>
        <h2 className="text-xl font-extrabold text-[#2C221E]">
          ยินดีต้อนรับสู่ห้องนิทาน Scratch
        </h2>
        <p className="text-xs text-[#8C7662] mt-1">
          ลุงเล่านิทานพร้อมช่วยน้องๆ ปวช. 1 สร้างสรรค์โครงงานแล้วครับ
        </p>

        {/* Role Tabs */}
        <div className="mt-5 grid grid-cols-2 gap-2 bg-[#F4EADB] p-1.5 rounded-2xl border border-[#EADBC8]">
          <button
            type="button"
            onClick={() => setRole("STUDENT")}
            className={`py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              role === "STUDENT"
                ? "bg-white text-[#FF8C1A] shadow-sm scale-[1.02]"
                : "text-[#8C7662] hover:text-[#2C221E]"
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>นักศึกษา ปวช. 1</span>
          </button>

          <button
            type="button"
            onClick={() => setRole("TEACHER")}
            className={`py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              role === "TEACHER"
                ? "bg-white text-[#4C97FF] shadow-sm scale-[1.02]"
                : "text-[#8C7662] hover:text-[#2C221E]"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>คุณครูผู้สอน</span>
          </button>
        </div>
      </div>

      {/* Form Body */}
      <form onSubmit={handleLogin} className="p-6 space-y-4">
        {error && (
          <div className="p-3 bg-[#FFF0F3] border border-[#FFCCD5] text-[#992E45] rounded-xl text-xs font-semibold text-center">
            {error}
          </div>
        )}

        {role === "STUDENT" ? (
          <>
            <div>
              <label className="block text-xs font-bold text-[#4A3319] mb-1.5">
                ชื่อเล่น
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#A68F7A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="เช่น บอส, พลอย, ภูมิ"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border-1.5 border-[#EADBC8] focus:border-[#FF8C1A] rounded-xl text-sm text-[#2C221E] outline-none shadow-xs transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4A3319] mb-1.5">
                รหัสประจำตัวนักศึกษา
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 text-[#A68F7A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="เช่น 67209010001"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border-1.5 border-[#EADBC8] focus:border-[#FF8C1A] rounded-xl text-sm text-[#2C221E] outline-none shadow-xs transition-colors font-mono"
                />
              </div>
            </div>
          </>
        ) : (
          <div>
            <label className="block text-xs font-bold text-[#4A3319] mb-1.5">
              ชื่อคุณครู หรือ รหัสผู้สอน
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#A68F7A] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={teacherUsername}
                onChange={(e) => setTeacherUsername(e.target.value)}
                placeholder="เช่น ครูสมชาย"
                className="w-full pl-10 pr-4 py-2.5 bg-white border-1.5 border-[#EADBC8] focus:border-[#4C97FF] rounded-xl text-sm text-[#2C221E] outline-none shadow-xs transition-colors"
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-gradient-to-r from-[#FF8C1A] to-[#FFAB19] hover:from-[#E6780C] hover:to-[#E69100] text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>
                {role === "STUDENT"
                  ? "เข้าสู่ห้องนิทาน"
                  : "เข้าสู่แดชบอร์ดคุณครู"}
              </span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        {/* Quick Demo Logins for ปวช. 1 */}
        {role === "STUDENT" && (
          <div className="pt-3 border-t border-[#EADBC8]/60">
            <span className="text-[11px] text-[#8C7662] block mb-2 font-semibold">
              กดเลือกตัวอย่างนักศึกษา ปวช. 1 เพื่อเข้าทดสอบได้ทันที:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickStudent("บอส", "67209010001")}
                className="px-2.5 py-1 bg-[#FFF5E6] hover:bg-[#FFE8CC] text-[#B35900] border border-[#F5DEBF] rounded-lg text-xs font-semibold transition-all font-mono"
              >
                👦 บอส (67209010001)
              </button>
              <button
                type="button"
                onClick={() => handleQuickStudent("พลอย", "67209010002")}
                className="px-2.5 py-1 bg-[#FFF5E6] hover:bg-[#FFE8CC] text-[#B35900] border border-[#F5DEBF] rounded-lg text-xs font-semibold transition-all font-mono"
              >
                👧 พลอย (67209010002)
              </button>
              <button
                type="button"
                onClick={() => handleQuickStudent("ภูมิ", "67209010003")}
                className="px-2.5 py-1 bg-[#FFF5E6] hover:bg-[#FFE8CC] text-[#B35900] border border-[#F5DEBF] rounded-lg text-xs font-semibold transition-all font-mono"
              >
                🧑 ภูมิ (67209010003)
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <Suspense fallback={<div className="p-8 text-center text-sm text-[#8C7662]">กำลังโหลด...</div>}>
          <LoginFormContent />
        </Suspense>
      </main>
    </div>
  );
}
