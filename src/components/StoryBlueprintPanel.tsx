"use client";

import React, { useState } from "react";
import {
  BookOpen,
  Sparkles,
  Users,
  Image as ImageIcon,
  HeartHandshake,
  Code2,
  Printer,
  ChevronRight,
  ChevronDown,
  X,
  FileText,
  Flag,
  User,
  Gamepad2,
  Compass,
  Wand2,
  CheckCircle2,
} from "lucide-react";

export interface CharacterItem {
  name: string;
  role: string; // e.g. ตัวเอก, ตัวช่วย, คู่แข่ง
  sprite?: string; // Scratch sprite suggestion
  description?: string;
}

export interface BackdropItem {
  name: string;
  scene: string;
  mood?: string;
}


export interface StoryData {
  title: string;
  theme?: string;
  currentStep: number;
  characters: CharacterItem[];
  backdrops: BackdropItem[];
  plotSummary?: string;
  fullStory?: string;          // นิทานฉบับเต็ม 450-650 คำ
  moralLesson?: string;
  userProfile?: {
    preferred_name?: string;
    name?: string;
    studentId?: string;
    hobbies?: string[];
    interests?: string[];
    favorite_things?: string[];
    personality_traits?: string[];
    ways_of_thinking?: string[];
    imagination?: string[];
    story_genre?: string;
    favorite_theme?: string;
    character_idea?: string;
    character_preference?: string;
    special_power?: string;
    story_world?: string;
    story_problem?: string;
    story_goal?: string;
    story_elements?: string[];
    confirmed_story_direction?: boolean;
  };
}

interface StoryBlueprintPanelProps {
  storyData: StoryData;
  studentName?: string;
  studentId?: string;
  onClose?: () => void;
  onPrint?: () => void;
  onBackToChat?: () => void;
}

export function StoryBlueprintPanel({
  storyData,
  studentName = "นักเล่าเรื่องตัวน้อย",
  studentId,
  onClose,
  onBackToChat,
}: StoryBlueprintPanelProps) {
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "fullstory" | "story">("story");
  const [hasAutoOpened, setHasAutoOpened] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const profile = storyData.userProfile;
  const resolvedName =
    studentName !== "นักศึกษา ปวช. 1" && studentName !== "นักศึกษาคนเก่ง" && studentName !== ""
      ? studentName
      : profile?.preferred_name || profile?.name || "นักเล่าเรื่อง";

  // Parse plot summary text if it is in JSON wrapper
  let displayPlot = storyData.plotSummary || "";
  let fullStoryFromDB = storyData.fullStory || "";
  if (displayPlot.startsWith("{")) {
    try {
      const parsed = JSON.parse(displayPlot);
      displayPlot = parsed.summary || "";
      if (!fullStoryFromDB && parsed.fullStory) {
        fullStoryFromDB = parsed.fullStory;
      }
    } catch (e) {}
  }

  // Show Full Story tab if there's a full story
  const hasFullStory = fullStoryFromDB.length > 100;

  // Auto-show the print modal when the story generation is finished
  React.useEffect(() => {
    if (hasFullStory && !hasAutoOpened) {
      setShowPrintModal(true);
      setActiveTab("fullstory");
      setHasAutoOpened(true);
    }
    // Reset auto-open flag if story gets cleared (e.g., start new story)
    if (!hasFullStory && hasAutoOpened) {
      setHasAutoOpened(false);
    }
  }, [hasFullStory, hasAutoOpened]);


  return (
    <>
      <div className="bg-[#FFFDF9] border border-[#EADBC8] rounded-2xl shadow-sm flex flex-col h-full overflow-hidden">
        {/* Panel Header */}
        <div className="p-3.5 sm:p-4 border-b border-[#EADBC8] bg-gradient-to-r from-[#FFF5E6] to-[#FFFDF9] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FF8C1A] text-white flex items-center justify-center shadow-sm">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#2C221E] leading-tight">
                สมุดพิมพ์เขียวนิทาน
              </h3>
              <p className="text-[10px] sm:text-[11px] text-[#8C7662]">
                ตัวตนผู้เรียน • โครงเรื่อง • โค้ด Scratch
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowPrintModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF8C1A] hover:bg-[#E6780C] text-white text-xs font-semibold rounded-xl shadow-sm transition-all hover:scale-105 active:scale-95"
              title="พิมพ์หรือบันทึกใบนิทาน"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">พิมพ์การ์ดนิทาน</span>
            </button>

            {onBackToChat && (
              <button
                type="button"
                onClick={onBackToChat}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#F4EADB] text-[#4A3319] border border-[#EADBC8] text-xs font-semibold rounded-xl shadow-sm transition-all hover:scale-105 active:scale-95"
                title="กลับไปแชทแก้ไขเนื้อเรื่อง"
              >
                <span className="hidden sm:inline">แก้ไขนิทาน</span>
                <span className="sm:hidden">กลับ</span>
              </button>
            )}

            {onClose && !onBackToChat && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-[#8C7662] hover:text-[#2C221E] hover:bg-[#F4EADB] rounded-xl transition-colors lg:hidden"
                title="ปิดสมุดพิมพ์เขียว"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Story Title & Theme Banner */}
        <div className="px-4 py-2.5 bg-[#FCF9F2] border-b border-[#EADBC8]/80">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-bold text-xs sm:text-sm text-[#4A3319] truncate">
              {storyData.title || "นิทานที่กำลังสร้างสรรค์..."}
            </h4>
            {storyData.theme && (
              <span className="px-2 py-0.5 bg-[#FFBF00]/20 text-[#A67300] border border-[#FFBF00]/40 rounded-full text-[10px] font-semibold shrink-0">
                {storyData.theme}
              </span>
            )}
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-[#EADBC8] bg-[#F7EFE3]/50 p-1 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`flex-1 py-1.5 text-[10px] font-semibold rounded-lg transition-all flex items-center justify-center gap-1 ${
              activeTab === "profile"
                ? "bg-white text-[#FF8C1A] shadow-xs"
                : "text-[#8C7662] hover:text-[#2C221E]"
            }`}
          >
            <User className="w-3 h-3" />
            <span>ตัวตน</span>
          </button>
          {hasFullStory && (
            <button
              type="button"
              onClick={() => setActiveTab("fullstory")}
              className={`flex-1 py-1.5 text-[10px] font-semibold rounded-lg transition-all flex items-center justify-center gap-1 ${
                activeTab === "fullstory"
                  ? "bg-white text-[#FF6B35] shadow-xs"
                  : "text-[#8C7662] hover:text-[#2C221E]"
              }`}
            >
              <BookOpen className="w-3 h-3" />
              <span>นิทาน</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab("story")}
            className={`flex-1 py-1.5 text-[10px] font-semibold rounded-lg transition-all flex items-center justify-center gap-1 ${
              activeTab === "story"
                ? "bg-white text-[#9966FF] shadow-xs"
                : "text-[#8C7662] hover:text-[#2C221E]"
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>โครงเรื่อง</span>
          </button>
        </div>

        {/* Panel Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {activeTab === "profile" && (
            <div className="space-y-3">
              <div className="p-3 bg-gradient-to-br from-[#FFF5E6] to-[#FFFDF9] border border-[#F5DEBF] rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-[#FF8C1A] font-bold text-xs">
                  <Sparkles className="w-4 h-4" />
                  <span>สิ่งที่ลุงค้นพบเกี่ยวกับ {resolvedName}:</span>
                </div>

                <div className="space-y-1.5 text-[11px] text-[#4A3319]">
                  <div className="flex items-start gap-2">
                    <Gamepad2 className="w-3.5 h-3.5 text-[#4C97FF] shrink-0 mt-0.5" />
                    <div>
                      <strong>งานอดิเรก & สิ่งที่ชอบ:</strong>{" "}
                      {profile?.hobbies?.length
                        ? profile.hobbies.join(", ")
                        : "กำลังพูดคุย..."}
                    </div>
                  </div>

                  {(profile?.interests?.length || profile?.favorite_things?.length) && (
                    <div className="flex items-start gap-2">
                      <Compass className="w-3.5 h-3.5 text-[#0FBD8C] shrink-0 mt-0.5" />
                      <div>
                        <strong>ความสนใจ:</strong>{" "}
                        {(profile?.interests || profile?.favorite_things || []).join(", ")}
                      </div>
                    </div>
                  )}

                  {profile?.personality_traits?.length && (
                    <div className="flex items-start gap-2">
                      <User className="w-3.5 h-3.5 text-[#FF8C1A] shrink-0 mt-0.5" />
                      <div>
                        <strong>บุคลิก:</strong>{" "}
                        {profile.personality_traits.join(", ")}
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-2">
                    <Compass className="w-3.5 h-3.5 text-[#9966FF] shrink-0 mt-0.5" />
                    <div>
                      <strong>แนวเรื่อง / โลก:</strong>{" "}
                      {profile?.favorite_theme || profile?.story_genre || profile?.story_world || "กำลังสำรวจ..."}
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <User className="w-3.5 h-3.5 text-[#9966FF] shrink-0 mt-0.5" />
                    <div>
                      <strong>ตัวละครตัวแทน:</strong>{" "}
                      {profile?.character_idea || profile?.character_preference || "กำลังออกแบบ..."}
                    </div>
                  </div>

                  {profile?.story_problem && (
                    <div className="flex items-start gap-2">
                      <Wand2 className="w-3.5 h-3.5 text-[#FF6680] shrink-0 mt-0.5" />
                      <div>
                        <strong>ปัญหา / ภารกิจ:</strong>{" "}{profile.story_problem}
                      </div>
                    </div>
                  )}

                  {(profile?.special_power || profile?.story_goal) && (
                    <div className="flex items-start gap-2">
                      <Wand2 className="w-3.5 h-3.5 text-[#FF6680] shrink-0 mt-0.5" />
                      <div>
                        <strong>{profile?.special_power ? "พลังพิเศษ:" : "เป้าหมาย:"}</strong>{" "}
                        {profile?.special_power || profile?.story_goal}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {profile?.confirmed_story_direction && (
                <div className="p-2.5 bg-[#E6F9F3] border border-[#BCEEDB] rounded-xl text-[#0DA57A] flex items-center gap-2 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{resolvedName} ยืนยันแนวทางเรื่องเรียบร้อยแล้ว</span>
                </div>
              )}
            </div>
          )}

          {/* Full Story Tab */}
          {activeTab === "fullstory" && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-[#4A3319] font-bold">
                <BookOpen className="w-3.5 h-3.5 text-[#FF6B35]" />
                <span>📖 นิทานฉบับเต็ม</span>
              </div>
              {hasFullStory ? (
                <div className="p-4 bg-[#FFFDF5] border border-[#F5DEBF] rounded-xl text-[#2C221E] leading-relaxed text-xs whitespace-pre-wrap font-serif">
                  {fullStoryFromDB}
                </div>
              ) : (
                <div className="p-4 border border-dashed border-[#D9C3A5] rounded-xl text-center text-[#A68F7A] bg-[#FFFDF9]">
                  นิทานฉบับเต็มจะปรากฏที่นี่หลังจากที่ลุงและ{resolvedName}สรุปเรื่องร่วมกันแล้ว
                </div>
              )}
            </div>
          )}

          {activeTab === "story" && (
            <>
              {/* Plot Summary / 8-part Story Structure */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[#4A3319] font-bold">
                  <FileText className="w-3.5 h-3.5 text-[#FFAB19]" />
                  <span>โครงเรื่องนิทาน</span>
                </div>
                {displayPlot ? (
                  <div className="p-3 bg-[#FFF9EE] border border-[#F5DEBF] rounded-xl text-[#4A3319] leading-relaxed whitespace-pre-wrap">
                    {displayPlot}
                  </div>
                ) : (
                  <div className="p-3 border border-dashed border-[#D9C3A5] rounded-xl text-center text-[#A68F7A] bg-[#FFFDF9]">
                    ลุงเล่านิทานกำลังชวนคิดและสรุปโครงเรื่อง...
                  </div>
                )}
              </div>

              {/* Characters Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[#4A3319] font-bold">
                  <Users className="w-3.5 h-3.5 text-[#4C97FF]" />
                  <span>ตัวละครในเรื่อง (Sprites)</span>
                  <span className="text-[10px] text-[#A68F7A] font-normal">
                    ({storyData.characters.length})
                  </span>
                </div>

                {storyData.characters.length === 0 ? (
                  <div className="p-3 border border-dashed border-[#D9C3A5] rounded-xl text-center text-[#A68F7A] bg-[#FFFDF9]">
                    ยังไม่มีการระบุตัวละคร
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {storyData.characters.map((char, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-white border border-[#EADBC8] rounded-xl shadow-2xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#2C221E]">
                            {char.name}
                          </span>
                          <span className="px-2 py-0.5 bg-[#4C97FF]/15 text-[#3373CC] rounded-md text-[10px] font-semibold">
                            {char.role || "ตัวละคร"}
                          </span>
                        </div>
                        {char.description && (
                          <p className="text-[#665343] leading-relaxed">
                            {char.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Backdrops Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[#4A3319] font-bold">
                  <ImageIcon className="w-3.5 h-3.5 text-[#9966FF]" />
                  <span>ฉากหลังนิทาน (Backdrops)</span>
                </div>

                {storyData.backdrops.length === 0 ? (
                  <div className="p-3 border border-dashed border-[#D9C3A5] rounded-xl text-center text-[#A68F7A] bg-[#FFFDF9]">
                    ยังไม่มีการระบุฉากหลัง
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {storyData.backdrops.map((bd, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-white border border-[#EADBC8] rounded-xl flex items-center justify-between"
                      >
                        <span className="font-semibold text-[#2C221E]">
                          {bd.name}
                        </span>
                        <span className="text-[#8C7662] text-[11px]">
                          {bd.scene}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Moral Lesson */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[#4A3319] font-bold">
                  <HeartHandshake className="w-3.5 h-3.5 text-[#FF6680]" />
                  <span>ข้อคิดคติสอนใจ (Moral Lesson)</span>
                </div>

                <div
                  className={`p-3 rounded-xl border ${
                    storyData.moralLesson
                      ? "bg-gradient-to-br from-[#FFF0F3] to-[#FFF9EE] border-[#FFCCD5] text-[#992E45]"
                      : "border-dashed border-[#D9C3A5] bg-[#FFFDF9] text-[#A68F7A] text-center"
                  }`}
                >
                  {storyData.moralLesson ? (
                    <p className="font-semibold text-xs leading-relaxed">
                      💡 &ldquo;{storyData.moralLesson}&rdquo;
                    </p>
                  ) : (
                    "รอค้นพบข้อคิดดีๆ ร่วมกับลุงเล่านิทาน..."
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Printable Story Card Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FFFDF9] border-2 border-[#EADBC8] rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 bg-gradient-to-r from-[#FF8C1A] to-[#FFAB19] text-white flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5" />
                <h3 className="font-bold text-sm sm:text-base">พิมพ์การ์ดพิมพ์เขียวนิทาน</h3>
              </div>
              <button
                onClick={() => setShowPrintModal(false)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div id="printable-story-card" className="p-6 overflow-y-auto space-y-4 text-xs print:p-0">
              <div className="text-center border-b-2 border-[#FF8C1A] pb-3 space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-[#FF8C1A] font-bold">
                  Storytelling Card • ปวช. 1
                </span>
                <h2 className="text-xl font-extrabold text-[#2C221E]">
                  {storyData.title || "นิทานของฉัน"}
                </h2>
                <p className="text-xs text-[#8C7662]">
                  ผู้สร้างสรรค์: <strong>{resolvedName}</strong> {studentId && `(รหัส: ${studentId})`}
                </p>
              </div>

              {displayPlot && (
                <div className="p-3 bg-[#FFF9EE] border border-[#F5DEBF] rounded-xl">
                  <h4 className="font-bold text-[#4A3319] mb-1">📖 โครงเรื่อง:</h4>
                  <p className="text-[#665343] leading-relaxed whitespace-pre-wrap">{displayPlot}</p>
                </div>
              )}

              {storyData.characters.length > 0 && (
                <div>
                  <h4 className="font-bold text-[#4A3319] mb-1.5">👤 ตัวละครหลัก:</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {storyData.characters.map((c, i) => (
                      <div key={i} className="p-2 border border-[#EADBC8] rounded-lg bg-white">
                        <strong className="text-[#FF8C1A]">{c.name}</strong> ({c.role})
                        {c.description && <p className="text-[10px] text-[#665343]">{c.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {storyData.moralLesson && (
                <div className="p-3 bg-[#FFF0F3] border border-[#FFCCD5] text-[#992E45] rounded-xl">
                  <strong>💡 คติสอนใจ:</strong> &ldquo;{storyData.moralLesson}&rdquo;
                </div>
              )}
            </div>

            <div className="p-4 bg-white border-t border-[#EADBC8] flex items-center justify-between print:hidden">
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs"
              >
                ปิด
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-5 py-2 bg-[#FF8C1A] hover:bg-[#E6780C] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>พิมพ์ / บันทึกเป็น PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
