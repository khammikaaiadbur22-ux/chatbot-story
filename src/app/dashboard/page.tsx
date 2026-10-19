"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Users,
  Search,
  Filter,
  Sparkles,
  Printer,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  Code2,
  HeartHandshake,
  GraduationCap,
  X,
  Hash,
  Lock,
  KeyRound,
  ShieldAlert,
  ArrowRight,
  LogOut,
  ChevronLeft,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import {
  StoryBlueprintPanel,
  StoryData,
} from "@/components/StoryBlueprintPanel";
import { ScratchBlock } from "@/components/ScratchBlock";

interface StoryItem {
  id: string;
  title: string;
  theme?: string;
  currentStep: number;
  moralLesson?: string;
  plotSummary?: string;
  characters: any[];
  backdrops: any[];
  scratchPlan: any[];
  updatedAt: string;
  user: {
    id: string;
    username: string;
    studentId?: string;
    nickname?: string;
  };
}

export default function TeacherDashboard() {
  const router = useRouter();

  // Authentication State for Teacher Security Gate
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(false);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const [stories, setStories] = useState<StoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [dbPaused, setDbPaused] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStep, setFilterStep] = useState<string>("ALL");
  const [selectedStory, setSelectedStory] = useState<StoryItem | null>(null);

  // Check existing session authorization
  useEffect(() => {
    const token = sessionStorage.getItem("teacher_auth_pass");
    if (token === "Kmm1402_1509") {
      setIsAuthorized(true);
      fetchStories();
    }
    setAuthChecking(false);
  }, []);

  const handleTeacherLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    const user = loginUsername.trim();
    const pass = loginPassword.trim();

    // Verify exact credentials
    if (
      (user === "Kmm1402" || user.toLowerCase() === "kmm1402") &&
      pass === "1509"
    ) {
      sessionStorage.setItem("teacher_auth_pass", "Kmm1402_1509");
      setIsAuthorized(true);
      fetchStories();
    } else {
      setAuthError("ชื่อผู้ใช้หรือรหัสผ่านคุณครูไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง");
    }
  };

  const handleTeacherLogout = () => {
    sessionStorage.removeItem("teacher_auth_pass");
    setIsAuthorized(false);
    setLoginUsername("");
    setLoginPassword("");
  };

  const fetchStories = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stories?role=TEACHER&t=${Date.now()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      setDbPaused(!!data.dbPaused);
      if (data.stories) {
        setStories(data.stories);
      }
    } catch (err) {
      console.error("Failed to load stories for teacher:", err);
      setDbPaused(true);
    } finally {
      setLoading(false);
    }
  };

  const filteredStories = stories.filter((s) => {
    const studentNick = s.user?.nickname || (s as any).student?.nickname || s.user?.username || "";
    const studentId = s.user?.studentId || (s as any).student?.studentId || s.user?.username || "";

    const matchesSearch =
      studentNick.toLowerCase().includes(searchTerm.toLowerCase()) ||
      studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.moralLesson &&
        s.moralLesson.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStep =
      filterStep === "ALL" || s.currentStep?.toString() === filterStep;

    return matchesSearch && matchesStep;
  });

  const exportCSV = () => {
    const headers = [
      "รหัสประจำตัวนักศึกษา",
      "ชื่อเล่น",
      "ระดับชั้น",
      "ชื่อนิทาน",
      "ธีม",
      "ขั้นตอน",
      "คติสอนใจ",
      "จำนวนตัวละคร",
      "จำนวนบล็อก Scratch",
      "วันที่อัปเดตล่าสุด",
    ];

    const rows = filteredStories.map((s) => [
      `"${s.user?.studentId || (s as any).student?.studentId || s.user?.username || ""}"`,
      `"${s.user?.nickname || (s as any).student?.nickname || s.user?.username || "นักเรียน"}"`,
      `"ปวช. 1"`,
      `"${s.title || "นิทานของฉัน"}"`,
      `"${s.theme || ""}"`,
      `"ขั้นที่ ${s.currentStep || 1}"`,
      `"${(s.moralLesson || "").replace(/"/g, '""')}"`,
      s.characters?.length || 0,
      s.scratchPlan?.length || 0,
      new Date(s.updatedAt || Date.now()).toLocaleString("th-TH"),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `รายงานโครงงานนิทาน_ปวช1_Scratch_${Date.now()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF6EE] text-[#8C7662]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#4C97FF] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold">กำลังตรวจสอบสิทธิ์...</p>
        </div>
      </div>
    );
  }

  // Teacher Password Gate (if not authorized)
  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FAF6EE]">
        <Navbar />

        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-md bg-[#FFFDF9] border-2 border-[#EADBC8] rounded-3xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="p-6 bg-gradient-to-br from-[#EBF5FF] to-[#FFFDF9] border-b border-[#EADBC8] text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[#4C97FF] text-white flex items-center justify-center shadow-md mb-3">
                <Lock className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-extrabold text-[#2C221E]">
                เข้าสู่แดชบอร์ดคุณครู
              </h2>
              <p className="text-xs text-[#8C7662] mt-1">
                กรุณาระบุชื่อผู้ใช้และรหัสผ่านเพื่อเข้าตรวจผลงานห้อง ปวช. 1
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleTeacherLogin} className="p-6 space-y-4">
              {authError && (
                <div className="p-3 bg-[#FFF0F3] border border-[#FFCCD5] text-[#992E45] rounded-xl text-xs font-semibold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#4A3319] mb-1.5">
                  ชื่อผู้ใช้คุณครู
                </label>
                <div className="relative">
                  <Users className="w-4 h-4 text-[#A68F7A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="ระบุชื่อผู้ใช้"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border-1.5 border-[#EADBC8] focus:border-[#4C97FF] rounded-xl text-sm text-[#2C221E] outline-none shadow-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A3319] mb-1.5">
                  รหัสผ่าน
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#A68F7A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="ระบุรหัสผ่าน"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border-1.5 border-[#EADBC8] focus:border-[#4C97FF] rounded-xl text-sm text-[#2C221E] outline-none shadow-xs font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 bg-gradient-to-r from-[#4C97FF] to-[#3373CC] hover:from-[#3373CC] hover:to-[#245CA3] text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>ยืนยันเข้าสู่แดชบอร์ด</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-2 text-center">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#8C7662] hover:text-[#FF8C1A] transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>กลับสู่ห้องนิทานนักเรียน</span>
                </Link>
              </div>
            </form>
          </div>
        </main>
      </div>
    );
  }

  // Authorized Dashboard View
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF6EE]">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Header & Stats */}
        <div className="bg-[#FFFDF9] border border-[#EADBC8] rounded-3xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#EADBC8] pb-6">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#4C97FF] to-[#3373CC] text-white flex items-center justify-center shadow-md">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-[#2C221E]">
                    แดชบอร์ดคุณครู (Teacher Studio)
                  </h1>
                  <span className="px-3 py-0.5 bg-[#FF8C1A]/15 text-[#FF8C1A] font-bold text-xs rounded-full">
                    ห้องเรียน ปวช. 1
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#8C7662] mt-0.5">
                  ติดตามโครงงานนิทานอีสปและแผนบล็อก Scratch ของนักศึกษา ปวช. 1
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={fetchStories}
                className="px-3.5 py-2 bg-white hover:bg-[#FFF5E6] text-[#4A3319] border border-[#EADBC8] rounded-xl text-xs font-bold shadow-2xs transition-all"
              >
                รีเฟรชข้อมูล
              </button>
              <button
                type="button"
                onClick={exportCSV}
                className="px-4 py-2 bg-[#FF8C1A] hover:bg-[#E6780C] text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ส่งออกรายงาน CSV</span>
              </button>

              <button
                type="button"
                onClick={handleTeacherLogout}
                className="px-3.5 py-2 bg-[#FFF0F3] hover:bg-[#FFE0E6] text-[#992E45] border border-[#FFCCD5] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                title="ล็อกแดชบอร์ด"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>ล็อกแดชบอร์ด</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
            <div className="p-4 bg-[#FFF5E6] border border-[#F5DEBF] rounded-2xl">
              <div className="text-xs font-semibold text-[#FF8C1A]">
                ผลงานทั้งหมด
              </div>
              <div className="text-2xl font-extrabold text-[#2C221E] mt-1">
                {stories.length} คน
              </div>
            </div>

            <div className="p-4 bg-[#EBF5FF] border border-[#CDE5FE] rounded-2xl">
              <div className="text-xs font-semibold text-[#4C97FF]">
                ขั้นที่ 1-2 (ไอเดีย/ตัวละคร)
              </div>
              <div className="text-2xl font-extrabold text-[#2C221E] mt-1">
                {stories.filter((s) => s.currentStep <= 2).length} คน
              </div>
            </div>

            <div className="p-4 bg-[#F5EEFF] border border-[#E4D1FF] rounded-2xl">
              <div className="text-xs font-semibold text-[#9966FF]">
                ขั้นที่ 3 (วางคติสอนใจ)
              </div>
              <div className="text-2xl font-extrabold text-[#2C221E] mt-1">
                {stories.filter((s) => s.currentStep === 3).length} คน
              </div>
            </div>

            <div className="p-4 bg-[#E6F9F3] border border-[#BCEEDB] rounded-2xl">
              <div className="text-xs font-semibold text-[#0FBD8C]">
                ขั้นที่ 4 (พร้อมเขียน Scratch)
              </div>
              <div className="text-2xl font-extrabold text-[#2C221E] mt-1">
                {stories.filter((s) => s.currentStep === 4).length} คน
              </div>
            </div>
          </div>
        </div>

        {/* Supabase Paused Alert Banner */}
        {dbPaused && (
          <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-950 shadow-sm animate-rise">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-sm text-[#c2470a]">
                  ฐานข้อมูล Supabase (ltbekaxccazsashfypib) กำลังอยู่ในสถานะหยุดทำงานชั่วคราว (Paused)
                </div>
                <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                  เนื่องจากแพ็กเกจฟรีของ Supabase จะพักการทำงานอัตโนมัติหากไม่มีการใช้งานเกิน 7 วัน ทำให้ข้อมูลแชทใหม่ของนักเรียนยังไม่ถูกซิงก์เข้าสู่แดชบอร์ดกลางนี้
                </p>
              </div>
            </div>
            <a
              href="https://supabase.com/dashboard/project/ltbekaxccazsashfypib"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 bg-[#f2711c] hover:bg-[#c2470a] text-white text-xs font-bold rounded-xl shrink-0 transition-colors shadow-sm flex items-center gap-1.5"
            >
              <span>กดเปิด Supabase เพื่อ Restore</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#FFFDF9] border border-[#EADBC8] p-4 rounded-2xl shadow-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-[#A68F7A] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่อเล่น, รหัสนักศึกษา, นิทาน..."
              className="w-full pl-9 pr-4 py-2 bg-[#FAF6EE] border border-[#EADBC8] focus:border-[#4C97FF] rounded-xl text-xs sm:text-sm text-[#2C221E] outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-[#8C7662] shrink-0">
              สถานะขั้นตอน:
            </span>
            <select
              value={filterStep}
              onChange={(e) => setFilterStep(e.target.value)}
              className="px-3 py-2 bg-[#FAF6EE] border border-[#EADBC8] rounded-xl text-xs font-semibold text-[#2C221E] outline-none"
            >
              <option value="ALL">ทั้งหมดทุกขั้นตอน</option>
              <option value="1">ขั้นที่ 1: ปิ๊งไอเดียนิทาน</option>
              <option value="2">ขั้นที่ 2: ตัวละคร & ฉาก</option>
              <option value="3">ขั้นที่ 3: คติสอนใจแบบอีสป</option>
              <option value="4">ขั้นที่ 4: พิมพ์เขียว Scratch</option>
            </select>
          </div>
        </div>

        {/* Stories List */}
        {loading ? (
          <div className="p-12 text-center text-[#8C7662] space-y-3">
            <div className="w-10 h-10 border-3 border-[#4C97FF] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-semibold">กำลังโหลดข้อมูลนิทาน...</p>
          </div>
        ) : filteredStories.length === 0 ? (
          <div className="p-12 bg-white border border-[#EADBC8] rounded-3xl text-center text-[#A68F7A] space-y-2">
            <BookOpen className="w-10 h-10 mx-auto text-[#D9C3A5]" />
            <p className="font-bold text-sm text-[#4A3319]">
              ยังไม่พบนิทานของนักศึกษาตามเงื่อนไขที่ค้นหา
            </p>
            <p className="text-xs text-[#8C7662]">
              ให้นักศึกษาเริ่มแต่งนิทานกับลุงเล่านิทานในห้องนิทานได้เลยครับ
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStories.map((story) => {
              const studentNick =
                story.user?.nickname ||
                (story as any).student?.nickname ||
                story.user?.username ||
                "นักเรียน";
              const studentId =
                story.user?.studentId ||
                (story as any).student?.studentId ||
                story.user?.username ||
                "";

              return (
                <div
                  key={story.id}
                  className="bg-[#FFFDF9] border border-[#EADBC8] hover:border-[#4C97FF] rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-3">
                    {/* Card Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-[#EBF5FF] text-[#4C97FF] border border-[#CDE5FE] flex items-center justify-center font-bold text-xs">
                          {studentNick[0]?.toUpperCase() || "S"}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-[#2C221E]">
                            {studentNick}
                          </div>
                          {studentId && (
                            <div className="text-[10px] text-[#A68F7A] font-mono">
                              รหัส: {studentId}
                            </div>
                          )}
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          story.currentStep === 4
                            ? "bg-[#0FBD8C]/15 text-[#0DA57A] border border-[#0FBD8C]/30"
                            : story.currentStep === 3
                            ? "bg-[#9966FF]/15 text-[#774DCB] border border-[#9966FF]/30"
                            : "bg-[#FFAB19]/15 text-[#D47E00] border border-[#FFAB19]/30"
                        }`}
                      >
                        ขั้นที่ {story.currentStep || 1}
                      </span>
                    </div>

                    {/* Title & Theme */}
                    <div>
                      <h3 className="font-bold text-base text-[#4A3319] line-clamp-1 group-hover:text-[#4C97FF] transition-colors">
                        {story.title || "นิทานของฉัน"}
                      </h3>
                      <p className="text-[11px] text-[#8C7662]">
                        ธีม: {story.theme || "นิทานอีสป"}
                      </p>
                    </div>

                    {/* Moral Lesson snippet */}
                    {story.moralLesson ? (
                      <div className="p-2.5 bg-[#FFF9EE] border border-[#F5DEBF] rounded-xl text-xs text-[#992E45]">
                        <span className="font-bold text-[10px] text-[#FF6680] block mb-0.5">
                          💡 คติสอนใจ:
                        </span>
                        <p className="line-clamp-2 italic">
                          &ldquo;{story.moralLesson}&rdquo;
                        </p>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-gray-50 border border-gray-100 rounded-xl text-[11px] text-gray-400 text-center">
                        กำลังพัฒนาคติสอนใจ...
                      </div>
                    )}

                    {/* Badges: Characters & Scratch Plan */}
                    <div className="flex items-center gap-3 text-xs text-[#8C7662] pt-1">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-[#4C97FF]" />
                        <strong>{story.characters?.length || 0}</strong> ตัวละคร
                      </span>
                      <span className="flex items-center gap-1">
                        <Code2 className="w-3.5 h-3.5 text-[#0FBD8C]" />
                        <strong>{story.scratchPlan?.length || 0}</strong> แผนบล็อก
                      </span>
                    </div>
                  </div>

                  {/* Card Action */}
                  <button
                    type="button"
                    onClick={() => setSelectedStory(story)}
                    className="w-full py-2 px-3 bg-[#EBF5FF] hover:bg-[#4C97FF] text-[#3373CC] hover:text-white border border-[#CDE5FE] hover:border-[#4C97FF] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>ดูพิมพ์เขียว & พิมพ์การ์ด</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Selected Story Modal */}
        {selectedStory && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border-4 border-[#4C97FF] overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="p-4 bg-gradient-to-r from-[#4C97FF] to-[#3373CC] text-white flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg">
                    ผลงานนิทานของ:{" "}
                    {selectedStory.user?.nickname ||
                      (selectedStory as any).student?.nickname ||
                      selectedStory.user?.username ||
                      "นักเรียน"}{" "}
                    (รหัส:{" "}
                    {selectedStory.user?.studentId ||
                      (selectedStory as any).student?.studentId ||
                      selectedStory.user?.username ||
                      "-"}
                    ) - ปวช. 1
                  </h3>
                  <p className="text-xs text-white/80">
                    อัปเดตล่าสุด:{" "}
                    {new Date(selectedStory.updatedAt || Date.now()).toLocaleString("th-TH")}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedStory(null)}
                  className="p-1 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[70vh]">
                <StoryBlueprintPanel
                  storyData={{
                    title: selectedStory.title || "นิทานของฉัน",
                    theme: selectedStory.theme || "นิทานอีสป",
                    currentStep: selectedStory.currentStep || 1,
                    characters: selectedStory.characters || [],
                    backdrops: selectedStory.backdrops || [],
                    plotSummary: selectedStory.plotSummary || "",
                    fullStory: (selectedStory as any).fullStory || selectedStory.plotSummary || "",
                    moralLesson: selectedStory.moralLesson || "",
                    userProfile: (selectedStory as any).profile,
                  }}
                  studentName={
                    selectedStory.user?.nickname ||
                    (selectedStory as any).student?.nickname ||
                    selectedStory.user?.username ||
                    "นักเรียน"
                  }
                  studentId={
                    selectedStory.user?.studentId ||
                    (selectedStory as any).student?.studentId ||
                    selectedStory.user?.username ||
                    ""
                  }
                />
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedStory(null)}
                  className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold rounded-xl"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
