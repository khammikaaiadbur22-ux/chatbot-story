"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  Sparkles,
  BookOpen,
  RotateCcw,
  PanelRightClose,
  PanelRightOpen,
  ChevronDown,
  ArrowDown,
  MessageSquare,
  Sparkle,
  X,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { StoryStepper, STORY_STEPS } from "@/components/StoryStepper";
import {
  StoryBlueprintPanel,
  StoryData,
} from "@/components/StoryBlueprintPanel";

interface MessageItem {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  step?: number | null;
  createdAt?: string;
}

export default function StoryChatPage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string>("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [isWritingStory, setIsWritingStory] = useState(false); // true เมื่อ AI กำลัง generate นิทาน
  const [storyProgress, setStoryProgress] = useState(0);
  const [storyTimeLeft, setStoryTimeLeft] = useState(20);
  const [initialLoading, setInitialLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);

  // Responsive View Controls
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [mobileTab, setMobileTab] = useState<"chat" | "blueprint">("chat");
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Student metadata
  const [studentNickname, setStudentNickname] = useState<string>("");
  const [studentId, setStudentId] = useState<string>("");
  const [userAvatar, setUserAvatar] = useState<string>("/images/boy-avatar.jpg");

  const [storyData, setStoryData] = useState<StoryData>({
    title: "นิทานสร้างสรรค์ของฉัน",
    theme: "",
    currentStep: 1,
    characters: [],
    backdrops: [],
    plotSummary: "",
    fullStory: "",
    moralLesson: "",
  });

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  // Initialize or restore user ID from localStorage
  useEffect(() => {
    let storedUserId = localStorage.getItem("story_coach_user_id");
    let storedAvatar = localStorage.getItem("story_coach_user_avatar");
    
    if (!storedUserId) {
      storedUserId = `student_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 7)}`;
      localStorage.setItem("story_coach_user_id", storedUserId);
      
      // Randomly assign boy or girl avatar
      storedAvatar = Math.random() > 0.5 ? "/images/boy-avatar.jpg" : "/images/girl-avatar.jpg";
      localStorage.setItem("story_coach_user_avatar", storedAvatar);
    } else if (!storedAvatar) {
      storedAvatar = Math.random() > 0.5 ? "/images/boy-avatar.jpg" : "/images/girl-avatar.jpg";
      localStorage.setItem("story_coach_user_avatar", storedAvatar);
    }
    
    setUserId(storedUserId);
    setUserAvatar(storedAvatar);
    fetchStory(storedUserId);
  }, []);

  // Handle scroll detection for scroll-to-bottom button
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } =
      messagesContainerRef.current;
    const isUp = scrollHeight - scrollTop - clientHeight > 120;
    setShowScrollBottom(isUp);
  };

  // Scroll to bottom smoothly
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Story generation progress timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isWritingStory) {
      setStoryProgress(0);
      setStoryTimeLeft(20);
      
      interval = setInterval(() => {
        setStoryProgress((prev) => {
          if (prev >= 95) return 95;
          return prev + 5;
        });
        setStoryTimeLeft((prev) => {
          if (prev <= 1) return 1;
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isWritingStory]);

  const fetchStory = async (uid: string) => {
    setInitialLoading(true);
    try {
      const res = await fetch(`/api/stories?userId=${uid}`);
      const data = await res.json();
      if (data.conversation) {
        setConversationId(data.conversation.id);
        setMessages(data.conversation.messages || []);
        setCurrentStep(data.conversation.currentStep || 1);

        if (data.conversation.user) {
          if (
            data.conversation.user.nickname &&
            data.conversation.user.nickname !== "นักศึกษา ปวช. 1" &&
            data.conversation.user.nickname !== "นักศึกษาคนเก่ง"
          ) {
            setStudentNickname(data.conversation.user.nickname);
          }
          if (data.conversation.user.studentId) {
            setStudentId(data.conversation.user.studentId);
          }
        }

        setStoryData({
          title: data.conversation.title || "นิทานสร้างสรรค์ของฉัน",
          theme: data.conversation.theme || "",
          currentStep: data.conversation.currentStep || 1,
          characters: data.conversation.characters || [],
          backdrops: data.conversation.backdrops || [],
          plotSummary: data.conversation.plotSummary || "",
          fullStory: data.conversation.fullStory || "",
          moralLesson: data.conversation.moralLesson || "",
          userProfile: data.conversation.userProfile || null,
        });
      }
    } catch (err) {
      console.error("Failed to load story:", err);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || loading) return;

    setInputText("");
    const userMsg: MessageItem = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: text,
      step: currentStep,
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    // ตรวจว่าอยู่ใน story generation phase ไหม
    const profile = storyData.userProfile;
    let isStoryPhase = false;
    
    const confirmKeywords = ["โอเค", "ได้เลย", "ok", "ตกลง", "เอาเลย", "ดีเลย", "ลุย", "ดี", "ใช่", "ยืนยัน", "สร้างเลย"];
    const isConfirmed = confirmKeywords.some(k => text.toLowerCase().includes(k));

    if (
      profile?.confirmed_story_direction === true ||
      (storyData as any).conversationState === "FULL_STORY"
    ) {
      isStoryPhase = true;
    } else if ((storyData as any).conversationState === "STORY_CONFIRMATION" && isConfirmed) {
      isStoryPhase = true;
    }

    if (isStoryPhase) {
      setIsWritingStory(true);
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          userId,
          studentNickname,
          studentId,
          userProfile: storyData.userProfile,
          message: text,
          currentStoryData: {
            ...storyData,
            studentNickname,
            studentId,
          },
          step: currentStep,
        }),
      });

      if (!res.ok) {
        throw new Error(`API request failed with status ${res.status}`);
      }

      const data = await res.json();

      if (data.reply) {
        const assistantMsg: MessageItem = {
          id: `bot-${Date.now()}`,
          role: "assistant",
          content: data.reply,
          step: data.step || currentStep,
        };

        setMessages((prev) => [...prev, assistantMsg]);

        if (data.userProfile) {
          const profileName = data.userProfile.preferred_name || data.userProfile.name;
          if (profileName && profileName !== "นักศึกษาคนเก่ง" && profileName !== "นักศึกษา ปวช. 1") {
            setStudentNickname(profileName);
          }
          if (data.userProfile.studentId) {
            setStudentId(data.userProfile.studentId);
          }
        }

        if (data.storyUpdate) {
          if (
            data.storyUpdate.studentNickname &&
            data.storyUpdate.studentNickname !== "นักศึกษาคนเก่ง" &&
            data.storyUpdate.studentNickname !== "นักศึกษา ปวช. 1"
          ) {
            setStudentNickname(data.storyUpdate.studentNickname);
          }
          if (data.storyUpdate.studentId) {
            setStudentId(data.storyUpdate.studentId);
          }

          setStoryData((prev) => ({
            ...prev,
            title: data.storyUpdate.title || prev.title,
            theme: data.storyUpdate.theme || prev.theme,
            currentStep: data.step || data.storyUpdate.currentStep || prev.currentStep,
            plotSummary: data.storyUpdate.plotSummary || prev.plotSummary,
            fullStory: data.fullStory || data.storyUpdate.fullStory || prev.fullStory,
            conversationState: data.storyUpdate.conversationState || (prev as any).conversationState,
            userProfile: data.userProfile || data.storyUpdate.userProfile || prev.userProfile,
            characters:
              data.storyUpdate.characters &&
              data.storyUpdate.characters.length > 0
                ? data.storyUpdate.characters
                : prev.characters,
            backdrops:
              data.storyUpdate.backdrops && data.storyUpdate.backdrops.length > 0
                ? data.storyUpdate.backdrops
                : prev.backdrops,
            moralLesson: data.storyUpdate.moralLesson || prev.moralLesson,
          } as any));

          if (data.step || data.storyUpdate.currentStep) {
            setCurrentStep(data.step || data.storyUpdate.currentStep);
          }
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
      const errorMsg: MessageItem = {
        id: `bot-err-${Date.now()}`,
        role: "assistant",
        content: "ขออภัยครับ ลุงมีปัญหาเชื่อมต่อทางเทคนิคนิดหน่อย รบกวนกดส่งข้อความใหม่อีกครั้งนะ 😅",
        step: currentStep,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setIsWritingStory(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleStartNewStory = async () => {
    if (
      !confirm(
        "ต้องการเริ่มสนทนาใหม่ใช่ไหมครับ? (ระบบจะลบความจำเดิมและเริ่มใหม่ทั้งหมด)"
      )
    )
      return;

    setLoading(true);
    try {
      // 1. สร้าง ID ใหม่เพื่อล้างความจำทั้งหมด
      const newUserId = `student_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 7)}`;
      localStorage.setItem("story_coach_user_id", newUserId);
      
      const newAvatar = Math.random() > 0.5 ? "/images/boy-avatar.jpg" : "/images/girl-avatar.jpg";
      localStorage.setItem("story_coach_user_avatar", newAvatar);

      setUserId(newUserId);
      setUserAvatar(newAvatar);
      
      // 2. เคลียร์ชื่อและข้อมูลในหน้าต่าง
      setStudentNickname("");
      setStudentId("");

      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: newUserId,
          title: "นิทานอีสปเรื่องใหม่ของฉัน",
          theme: "นิทานอีสป",
        }),
      });
      const data = await res.json();
      if (data.conversation) {
        setConversationId(data.conversation.id);
        setMessages(data.conversation.messages || []);
        setCurrentStep(1);
        setStoryData({
          title: data.conversation.title,
          theme: data.conversation.theme,
          currentStep: 1,
          characters: [],
          backdrops: [],
          plotSummary: "",
          moralLesson: "",
        });
      }
    } catch (err) {
      console.error("Failed to create new story:", err);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-[#FAF6EE] text-[#8C7662]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-[#FF8C1A] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold">กำลังเปิดห้องนิทานของลุง...</p>
        </div>
      </div>
    );
  }

  const displayName = studentNickname || "นักศึกษา ปวช. 1";
  const blueprintItemsCount = storyData.characters.length + storyData.backdrops.length;

  return (
    <div className="h-[100dvh] flex flex-col bg-[#FAF6EE] overflow-hidden">
      {/* Top Navigation */}
      <Navbar studentNickname={studentNickname} studentId={studentId} />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex flex-col max-w-7xl w-full mx-auto p-2 sm:p-3 md:p-4 gap-2 overflow-hidden">
        {/* Top Control Bar: Stepper & Action Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
          <div className="flex-1">
            <StoryStepper
              currentStep={currentStep}
              onStepClick={(s) => setCurrentStep(s)}
            />
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            {/* Mobile View Mode Switcher (Visible only on < lg screens) */}
            <div className="flex lg:hidden bg-[#F4EADB] p-1 rounded-2xl border border-[#EADBC8] shadow-2xs">
              <button
                type="button"
                onClick={() => setMobileTab("chat")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  mobileTab === "chat"
                    ? "bg-white text-[#FF8C1A] shadow-xs scale-[1.02]"
                    : "text-[#8C7662]"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>แชท</span>
              </button>

              <button
                type="button"
                onClick={() => setMobileTab("blueprint")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 relative ${
                  mobileTab === "blueprint"
                    ? "bg-white text-[#4C97FF] shadow-xs scale-[1.02]"
                    : "text-[#8C7662]"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>พิมพ์เขียว</span>
                {blueprintItemsCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-[#FF8C1A] text-white text-[9px] flex items-center justify-center font-bold">
                    {blueprintItemsCount}
                  </span>
                )}
              </button>
            </div>

            {/* Desktop Panel Toggle & Reset Story */}
            <button
              type="button"
              onClick={handleStartNewStory}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#FFFDF9] hover:bg-[#FFF5E6] text-[#FF8C1A] border border-[#EADBC8] hover:border-[#FF8C1A] rounded-2xl text-xs font-bold shadow-2xs transition-all hover:scale-105 active:scale-95 shrink-0"
              title="เริ่มนิทานเรื่องใหม่"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">เริ่มเรื่องใหม่</span>
            </button>

            <button
              type="button"
              onClick={() => setShowRightPanel(!showRightPanel)}
              className="hidden lg:flex p-2.5 bg-[#FFFDF9] text-[#4A3319] border border-[#EADBC8] rounded-2xl shadow-2xs hover:bg-[#FFF5E6] transition-all shrink-0"
              title={showRightPanel ? "ซ่อนสมุดพิมพ์เขียว" : "แสดงสมุดพิมพ์เขียว"}
            >
              {showRightPanel ? (
                <PanelRightClose className="w-4 h-4 text-[#FF8C1A]" />
              ) : (
                <PanelRightOpen className="w-4 h-4 text-[#FF8C1A]" />
              )}
            </button>
          </div>
        </div>

        {/* Dynamic Responsive Content Area */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0 overflow-hidden">
          {/* Chat Container */}
          <div
            className={`flex flex-col bg-[#FFFDF9] border border-[#EADBC8] rounded-3xl shadow-sm overflow-hidden h-full ${
              mobileTab === "chat" ? "flex" : "hidden lg:flex"
            } ${showRightPanel ? "lg:col-span-7 xl:col-span-7" : "lg:col-span-12"} ${
              currentStep === 4 ? "!hidden" : ""
            }`}
          >
            {/* Chat Room Header */}
            <div className="px-4 py-3 border-b border-[#EADBC8] bg-gradient-to-r from-[#FFF5E6] via-[#FFFDF9] to-[#FFFDF9] flex items-center justify-between shrink-0 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl overflow-hidden border-2 border-[#FF8C1A] shadow-xs bg-white shrink-0">
                  <img
                    src="/images/uncle-storyteller.jpg"
                    alt="ลุงเล่านิทาน"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-sm sm:text-base text-[#2C221E] leading-tight">
                      ลุงเล่านิทาน
                    </h3>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#0FBD8C]/15 text-[#0DA57A] text-[10px] font-bold rounded-full">
                      <span className="w-1.5 h-1.5 bg-[#0FBD8C] rounded-full animate-pulse" />
                      พร้อมโค้ช
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8C7662] truncate max-w-[200px] sm:max-w-[320px]">
                    {studentNickname ? (
                      <>
                        กำลังคุยกับ <strong>หลาน{studentNickname}</strong>{" "}
                        {studentId && <span>({studentId})</span>}
                      </>
                    ) : (
                      "ชวนคุยและแนะนำตัวกับลุงเล่านิทาน"
                    )}
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-[#FFF5E6] border border-[#F5DEBF] rounded-xl text-xs font-bold text-[#FF8C1A]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>ขั้นที่ {currentStep}/4</span>
              </div>
            </div>

            {/* Message Stream Area */}
            <div
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 relative"
            >
              {messages.map((msg, index) => {
                const isAssistant = msg.role === "assistant";

                return (
                  <div
                    key={msg.id || index}
                    className={`flex gap-2.5 sm:gap-3.5 ${
                      isAssistant ? "justify-start" : "justify-end"
                    } animate-in fade-in duration-200`}
                  >
                    {isAssistant && (
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl overflow-hidden border border-[#FF8C1A] shrink-0 self-start shadow-xs mt-0.5">
                        <img
                          src="/images/uncle-storyteller.jpg"
                          alt="ลุงเล่านิทาน"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div
                      className={`max-w-[88%] sm:max-w-[80%] rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 space-y-2.5 shadow-2xs ${
                        isAssistant
                          ? "bg-[#FFF9EE] border border-[#F5DEBF] text-[#2C221E] rounded-tl-sm"
                          : "bg-gradient-to-r from-[#FF8C1A] to-[#FF9E2C] text-white rounded-tr-sm shadow-md"
                      }`}
                    >
                      <div className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                        {msg.content}
                      </div>
                    </div>

                    {!isAssistant && (
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl overflow-hidden border-2 border-[#4C97FF] shrink-0 self-start shadow-xs mt-0.5 bg-white">
                        <img
                          src={userAvatar}
                          alt="นักศึกษา"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Thinking Indicator */}
              {loading && !isWritingStory && (
                <div className="flex gap-2.5 sm:gap-3.5 items-start animate-pulse">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl overflow-hidden border border-[#FF8C1A] shrink-0 shadow-xs">
                    <img
                      src="/images/uncle-storyteller.jpg"
                      alt="ลุงเล่านิทาน"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="bg-[#FFF9EE] border border-[#F5DEBF] rounded-2xl p-3 sm:p-3.5 rounded-tl-sm shadow-2xs flex items-center gap-2.5 text-xs text-[#8C7662]">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-[#FF8C1A] rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-2 h-2 bg-[#FFAB19] rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-2 h-2 bg-[#FF8C1A] rounded-full animate-bounce" />
                    </div>
                    <span>ลุงกำลังคิดอยู่สักครู่...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />

              {/* Floating Scroll To Bottom Button */}
              {showScrollBottom && (
                <button
                  type="button"
                  onClick={scrollToBottom}
                  className="sticky bottom-2 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm border border-[#EADBC8] text-[#FF8C1A] p-2 rounded-full shadow-md hover:bg-[#FFF5E6] transition-all hover:scale-110 flex items-center gap-1 text-xs font-bold z-10"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                  <span>เลื่อนลงล่างสุด</span>
                </button>
              )}
            </div>

            {/* Input Bar Area */}
            <div className="p-2.5 sm:p-3.5 bg-white border-t border-[#EADBC8] shrink-0">
              <form
                onSubmit={handleSendMessage}
                className="flex items-end gap-2 bg-[#FAF6EE] p-1.5 sm:p-2 rounded-2xl sm:rounded-3xl border-1.5 border-[#EADBC8] focus-within:border-[#FF8C1A] focus-within:ring-2 focus-within:ring-[#FF8C1A]/20 transition-all"
              >
                <textarea
                  ref={inputRef as any}
                  rows={1}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    studentNickname
                      ? `พิมพ์เล่าให้ลุงฟัง หรือปรึกษาลุงได้เลยครับหลาน${studentNickname}...`
                      : "พิมพ์ชื่อเล่น และรหัสประจำตัวนักศึกษาบอกลุงที่นี่ได้เลยครับ..."
                  }
                  disabled={loading}
                  className="flex-1 px-3 py-1.5 bg-transparent resize-none text-xs sm:text-sm text-[#2C221E] outline-none max-h-24 min-h-[36px] placeholder:text-[#A68F7A]"
                />

                <button
                  type="submit"
                  disabled={!inputText.trim() || loading}
                  className="p-2 sm:px-4 sm:py-2.5 bg-gradient-to-r from-[#FF8C1A] to-[#FFAB19] hover:from-[#E6780C] hover:to-[#E69100] text-white font-bold rounded-xl sm:rounded-2xl shadow-md transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1.5 shrink-0"
                  title="ส่งข้อความ"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden md:inline text-xs">ส่ง</span>
                </button>
              </form>
              <div className="text-[10px] text-[#A68F7A] text-center mt-1 hidden sm:block">
                กด Enter เพื่อส่งข้อความ (กด Shift+Enter เพื่อขึ้นบรรทัดใหม่)
              </div>
            </div>
          </div>

          {/* Right Blueprint Panel (Desktop: side column, Mobile: full tab or overlay) */}
          <div
            className={`h-full overflow-hidden ${
              mobileTab === "blueprint" ? "flex" : "hidden lg:flex"
            } ${
              showRightPanel
                ? "lg:col-span-5 xl:col-span-5"
                : "hidden"
            } ${
              currentStep === 4 ? "!flex lg:!col-span-12 xl:!col-span-12" : ""
            }`}
          >
            <StoryBlueprintPanel
              storyData={storyData}
              studentName={studentNickname || "นักศึกษา ปวช. 1"}
              studentId={studentId}
              onClose={() => setMobileTab("chat")}
              onBackToChat={
                currentStep === 4 ? () => setCurrentStep(3) : undefined
              }
            />
          </div>
        </div>
      </div>

      {/* ================================================
          STORY WRITING OVERLAY
          แสดงเมื่อ AI กำลัง generate นิทานฉบับเต็ม
          ================================================ */}
      {isWritingStory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#FFFDF9] border border-[#F5DEBF] rounded-3xl shadow-2xl mx-4 max-w-sm w-full p-8 flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300">

            {/* Uncle Storyteller Avatar + Writing Animation */}
            <div className="relative">
              {/* Spinning ring */}
              <div className="absolute inset-0 rounded-full border-4 border-dashed border-[#FF8C1A]/40 animate-spin [animation-duration:4s]" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#FF8C1A] animate-spin [animation-duration:1.5s]" />

              {/* Avatar */}
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#FF8C1A] shadow-lg">
                <img
                  src="/images/uncle-storyteller.jpg"
                  alt="ลุงเล่านิทาน"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Pencil icon badge */}
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#FF8C1A] flex items-center justify-center shadow-md text-white text-base animate-bounce">
                ✍️
              </div>
            </div>

            {/* Title */}
            <div className="text-center space-y-1.5">
              <h3 className="font-extrabold text-lg text-[#2C221E]">
                ลุงกำลังแต่งนิทาน...
              </h3>
              <p className="text-sm text-[#8C7662] leading-relaxed">
                ลุงกำลังเขียนนิทานฉบับเต็มจากเรื่องราวของหนูอยู่นะ
                <br />
                ขอเวลาสักครู่นึงนะ 😊
              </p>
            </div>

            {/* Animated dots progress */}
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className="w-2.5 h-2.5 rounded-full bg-[#FF8C1A] animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>

            {/* Writing progress bar */}
            <div className="w-full space-y-2">
              <div className="flex justify-between text-[11px] font-bold text-[#8C7662]">
                <span>ความคืบหน้า {storyProgress}%</span>
                <span>รอประมาณ {storyTimeLeft} วินาที...</span>
              </div>
              <div className="w-full bg-[#F5DEBF] rounded-full h-3 overflow-hidden shadow-inner relative">
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#FF8C1A] to-[#FFAB19] rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${storyProgress}%` }}
                />
              </div>
            </div>

            {/* Warning message */}
            <div className="w-full bg-[#FFF5E6] border border-[#F5DEBF] rounded-2xl px-4 py-3 flex items-start gap-2.5">
              <span className="text-[#FF8C1A] text-base shrink-0 mt-0.5">⚠️</span>
              <p className="text-[11px] text-[#665343] leading-relaxed">
                <strong>อย่ากด Refresh หรือปิดหน้าต่างนี้นะ</strong>
                <br />
                ระบบกำลังทำงานอยู่ รอแป๊บนึงก็จะได้นิทานแล้ว!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
