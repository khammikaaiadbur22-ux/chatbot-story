"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Sparkles,
  Menu,
  RotateCcw,
  BookOpen,
  ArrowDown,
  User,
  Heart,
  Gamepad2,
  Palette,
  Bike,
  Sparkle,
} from "lucide-react";
import { Sidebar } from "./Sidebar";
import { ChatMessage } from "./ChatMessage";
import type {
  ChatMessage as ChatMessageType,
  ConversationSummary,
  Profile,
  ChatResponse,
} from "@/lib/types";

export function ChatApp() {
  const [userId, setUserId] = useState<string>("");
  const [userNickname, setUserNickname] = useState<string>("");
  const [studentId, setStudentId] = useState<string>("");
  const [profile, setProfile] = useState<Profile>({});

  // Default active conversation so user is never blocked from chatting
  const [conversations, setConversations] = useState<ConversationSummary[]>([
    {
      id: "conv_default",
      title: "นิทานของฉัน",
      updatedAt: new Date().toISOString(),
      hasStory: false,
    },
  ]);
  const [activeConversationId, setActiveConversationId] = useState<string>("conv_default");
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // First time popup for nickname
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [tempNickname, setTempNickname] = useState("");
  const [tempStudentId, setTempStudentId] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize User ID
  useEffect(() => {
    let storedId = localStorage.getItem("story_user_id");
    if (!storedId) {
      storedId = `student_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      localStorage.setItem("story_user_id", storedId);
    }
    setUserId(storedId);

    const storedNick = localStorage.getItem("story_user_nick") || "";
    const storedStudentId = localStorage.getItem("story_user_studentid") || "";
    if (storedNick) {
      setUserNickname(storedNick);
      setProfile((prev) => ({ ...prev, name: storedNick }));
    }
    if (storedStudentId) setStudentId(storedStudentId);

    loadUserAndConversations(storedId);
  }, []);

  const loadUserAndConversations = async (uid: string) => {
    try {
      const res = await fetch(`/api/stories?userId=${encodeURIComponent(uid)}`);
      if (!res.ok) return;
      const data = await res.json();

      if (data.user) {
        if (data.user.nickname) {
          setUserNickname(data.user.nickname);
          setProfile((prev) => ({ ...prev, name: data.user.nickname }));
          localStorage.setItem("story_user_nick", data.user.nickname);
        }
        if (data.user.studentId) {
          setStudentId(data.user.studentId);
          localStorage.setItem("story_user_studentid", data.user.studentId);
        }
      }

      if (data.conversations && data.conversations.length > 0) {
        setConversations(data.conversations);
        const firstConvId = data.conversations[0].id;
        setActiveConversationId(firstConvId);
        loadMessages(firstConvId);
      }
    } catch (err) {
      console.warn("Notice: Continuing with local conversation state:", err);
    }
  };

  const loadMessages = async (convId: string) => {
    try {
      const res = await fetch(`/api/stories?conversationId=${encodeURIComponent(convId)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.conversation?.messages && data.conversation.messages.length > 0) {
        setMessages(data.conversation.messages);
      }
    } catch (err) {
      console.warn("Could not fetch remote messages, keeping current session:", err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    setShowScrollBottom(scrollHeight - scrollTop - clientHeight > 150);
  };

  const handleSelectConversation = (convId: string) => {
    setActiveConversationId(convId);
    loadMessages(convId);
  };

  const handleNewConversation = async () => {
    const newConvId = `conv_${Date.now()}`;
    const newConv: ConversationSummary = {
      id: newConvId,
      title: userNickname ? `นิทานของ${userNickname}` : "นิทานเรื่องใหม่",
      updatedAt: new Date().toISOString(),
      hasStory: false,
    };

    setConversations((prev) => [newConv, ...prev]);
    setActiveConversationId(newConvId);
    setMessages([]);

    if (userId) {
      try {
        await fetch("/api/stories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
      } catch (err) {
        // Silently handled by local state
      }
    }
  };

  const handleDeleteConversation = async (convId: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== convId));

    if (activeConversationId === convId) {
      const remaining = conversations.filter((c) => c.id !== convId);
      if (remaining.length > 0) {
        setActiveConversationId(remaining[0].id);
        loadMessages(remaining[0].id);
      } else {
        handleNewConversation();
      }
    }

    if (userId) {
      try {
        await fetch(
          `/api/stories?conversationId=${encodeURIComponent(convId)}&userId=${encodeURIComponent(userId)}`,
          { method: "DELETE" }
        );
      } catch (err) {
        // Silently handled
      }
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempNickname.trim()) return;

    const cleanNick = tempNickname.trim();
    const cleanId = tempStudentId.trim();

    setUserNickname(cleanNick);
    setStudentId(cleanId);
    setProfile((prev) => ({ ...prev, name: cleanNick }));
    localStorage.setItem("story_user_nick", cleanNick);
    localStorage.setItem("story_user_studentid", cleanId);
    setShowWelcomeModal(false);

    try {
      await fetch("/api/stories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          nickname: cleanNick,
          studentId: cleanId,
        }),
      });

      // Send initial greeting if messages is empty
      if (messages.length === 0) {
        sendMessage(`สวัสดีครับลุง หนูชื่อเล่นว่า ${cleanNick}`);
      }
    } catch (err) {
      // Local state is already set
    }
  };

  const sendMessage = async (textToSend: string) => {
    const text = textToSend.trim();
    if (!text || loading) return;

    let convId = activeConversationId;
    if (!convId) {
      convId = `conv_${Date.now()}`;
      setActiveConversationId(convId);
      setConversations((prev) => [
        { id: convId, title: "นิทานของฉัน", updatedAt: new Date().toISOString(), hasStory: false },
        ...prev,
      ]);
    }

    setInputText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // Append User Message locally immediately
    const userMsg: ChatMessageType = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: convId,
          message: text,
          history: updatedMessages,
          profile,
          userNickname,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Chat request failed");
      }

      const data: ChatResponse = await res.json();

      // Append Assistant Message
      const assistantMsg: ChatMessageType = {
        id: data.messageId || `asst-${Date.now()}`,
        role: "assistant",
        content: data.reply,
        isStory: data.isStory,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Update Profile Tags
      if (data.profile) {
        setProfile((prev) => ({ ...prev, ...data.profile }));
        if (data.profile.name) {
          setUserNickname(data.profile.name);
          localStorage.setItem("story_user_nick", data.profile.name);
        }
      }

      // Update Conversation title
      if (data.title) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId
              ? { ...c, title: data.title, hasStory: data.isStory || c.hasStory }
              : c
          )
        );
      }
    } catch (err: any) {
      console.error("Send message error:", err);
      const errMsg: ChatMessageType = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: err?.message?.includes("ลุง")
          ? err.message
          : "ขออภัยจ้ะ ลุงมีปัญหาเชื่อมต่อทางเทคนิคนิดหน่อย รบกวนหนูกดส่งใหม่อีกครั้งนะ 😊",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputText);
    }
  };

  // Quick suggestion prompts for conversation starters
  const quickPrompts = [
    { label: "หนูชอบเล่นเกมค่ะ 🎮", prompt: "หนูชอบเล่นเกมค่ะ" },
    { label: "ชอบวาดรูปเล่น 🎨", prompt: "เวลาว่างหนูชอบวาดรูปและระบายสีค่ะ" },
    { label: "ชอบเล่นกีฬากับเพื่อน ⚽", prompt: "หนูชอบเล่นกีฬาเตะบอลกับเพื่อน ๆ ครับ" },
    { label: "ชอบอ่านการ์ตูน 📚", prompt: "หนูชอบอ่านหนังสือการ์ตูนและนิทานครับ" },
  ];

  return (
    <div className="h-[100dvh] flex bg-[#fff7ef] overflow-hidden">
      {/* Welcome Modal for Nickname (Claymorphism style) */}
      {showWelcomeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="clay bg-white max-w-md w-full p-6 sm:p-8 rounded-3xl space-y-5 animate-rise border border-orange-100/70 shadow-2xl">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 mx-auto rounded-3xl overflow-hidden border-2 border-[#f2711c] shadow-md">
                <img
                  src="/images/uncle-storyteller.jpg"
                  alt="ลุงนิทานยิ้มใส"
                  className="w-full h-full object-cover"
                />
              </div>
              <h2 className="text-xl font-bold text-[#1c1714]">
                ยินดีต้อนรับสู่ห้องนิทาน!
              </h2>
              <p className="text-xs sm:text-sm text-[#6b5e55]">
                ลุงอยากรู้จักหนู เพื่อนำสิ่งที่หนูชอบไปแต่งเป็นนิทานอีสปพิเศษสำหรับหนูคนเดียว
              </p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1c1714] mb-1.5">
                  ชื่อเล่นของหนู <span className="text-[#f2711c]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={tempNickname}
                  onChange={(e) => setTempNickname(e.target.value)}
                  placeholder="เช่น น้องก้อย, ข้าวปั้น, วิน"
                  className="w-full px-4 py-3 rounded-2xl bg-[#fff7ef] border border-orange-200/60 focus:border-[#f2711c] outline-none text-sm text-[#1c1714] shadow-inner font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1c1714] mb-1.5">
                  รหัสนักเรียน / นักศึกษา (ถ้ามี)
                </label>
                <input
                  type="text"
                  value={tempStudentId}
                  onChange={(e) => setTempStudentId(e.target.value)}
                  placeholder="เช่น 67209010001"
                  className="w-full px-4 py-3 rounded-2xl bg-[#fff7ef] border border-orange-200/60 focus:border-[#f2711c] outline-none text-sm text-[#1c1714] shadow-inner font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-2xl clay-brand font-bold text-sm shadow-md clay-press flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>ไปคุยกับลุงนิทานเลย!</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Sidebar: ChatGPT / Gemini Style */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        userNickname={userNickname}
        studentId={studentId}
        profile={profile}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Chat Area: Maximized Screen Space */}
      <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {/* Top Navbar */}
        <header className="h-14 sm:h-16 px-4 border-b border-orange-200/40 bg-white/70 backdrop-blur-md flex items-center justify-between shrink-0 z-10 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            {/* Sidebar toggle button */}
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-xl text-[#1c1714] hover:bg-[#ffe8d6] transition-colors clay-press"
              title="เปิด/ปิดแถบเมนู"
            >
              <Menu className="w-5 h-5 text-[#f2711c]" />
            </button>

            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl overflow-hidden border border-[#f2711c] shrink-0">
                <img
                  src="/images/uncle-storyteller.jpg"
                  alt="ลุงนิทานยิ้มใส"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="truncate">
                <h1 className="font-bold text-sm sm:text-base text-[#1c1714] truncate flex items-center gap-1.5">
                  <span>ลุงนิทานยิ้มใส</span>
                  <span className="w-2 h-2 rounded-full bg-[#f2711c] animate-pulse" />
                </h1>
                <p className="text-[11px] text-[#6b5e55] truncate hidden sm:block">
                  {userNickname ? `กำลังคุยกับน้อง ${userNickname}` : "ชวนคุยสร้างนิทานอีสป"}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleNewConversation}
              className="px-3 py-1.5 rounded-xl border border-orange-200/60 bg-white text-[#f2711c] hover:bg-[#ffe8d6] text-xs font-bold clay-sm clay-press flex items-center gap-1.5 transition-all"
              title="เริ่มนิทานเรื่องใหม่"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">เรื่องใหม่</span>
            </button>
          </div>
        </header>

        {/* Message Stream Area: Responsive Center Space */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-3 sm:px-6 md:px-12 py-4 sm:py-6 space-y-2 relative max-w-4xl w-full mx-auto"
        >
          {/* Welcome Screen if empty */}
          {messages.length === 0 && (
            <div className="py-8 sm:py-12 text-center space-y-6 animate-rise">
              <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-3xl overflow-hidden border-3 border-[#f2711c] shadow-xl clay">
                <img
                  src="/images/uncle-storyteller.jpg"
                  alt="ลุงนิทานยิ้มใส"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="max-w-md mx-auto space-y-2">
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#1c1714]">
                  สวัสดีจ้ะ {userNickname ? `น้อง${userNickname}` : ""} 😊
                </h2>
                <p className="text-sm text-[#6b5e55] leading-relaxed">
                  ลุงจะชวนคุยเรื่องความชอบ นิสัย กิจวัตรประจำวัน และงานอดิเรกของหนู แล้วเอามาสร้างเป็น <strong>นิทานอีสปสั้น 1-2 นาที พร้อมข้อคิดดี ๆ</strong> ประจำตัวหนูเลยนะ!
                </p>
              </div>

              {/* Starter Buttons */}
              <div className="pt-2">
                <div className="text-xs font-bold text-[#c2470a] mb-3">
                  💡 แตะเพื่อเริ่มคุยกับลุงได้เลย:
                </div>
                <div className="flex flex-wrap justify-center gap-2 sm:gap-2.5 max-w-lg mx-auto">
                  {quickPrompts.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => sendMessage(p.prompt)}
                      className="px-4 py-2.5 rounded-2xl bg-white border border-orange-200/70 text-xs sm:text-sm font-semibold text-[#1c1714] clay-sm clay-press shadow-xs hover:border-[#f2711c] hover:bg-[#ffe8d6] transition-all"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Messages List */}
          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              userNickname={userNickname}
            />
          ))}

          {/* AI Typing Indicator (Clay 3D style) */}
          {loading && (
            <div className="flex items-center gap-3 my-3 animate-rise">
              <div className="w-9 h-9 rounded-2xl overflow-hidden border-2 border-[#f2711c] shrink-0 bg-white shadow-sm">
                <img
                  src="/images/uncle-storyteller.jpg"
                  alt="ลุงนิทานยิ้มใส"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="clay bg-white px-5 py-3.5 rounded-3xl rounded-tl-xs flex items-center gap-2 border border-orange-100/60 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#f2711c] animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-[#f2711c] animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-[#f2711c] animate-bounce" style={{ animationDelay: "300ms" }} />
                <span className="text-xs font-semibold text-[#6b5e55] ml-1">
                  ลุงกำลังคิดคำตอบให้นะ...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} className="h-4" />
        </div>

        {/* Scroll to Bottom Button */}
        {showScrollBottom && (
          <button
            type="button"
            onClick={scrollToBottom}
            className="absolute bottom-24 right-6 p-2.5 rounded-full bg-white text-[#f2711c] border border-orange-200 shadow-lg clay-press z-20"
            title="เลื่อนลงล่างสุด"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        )}

        {/* Bottom Input Bar: Claymorphism Pill Container */}
        <div className="p-3 sm:p-4 bg-gradient-to-t from-[#fff7ef] via-[#fff7ef] to-transparent shrink-0">
          <div className="max-w-4xl mx-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(inputText);
              }}
              className="clay bg-white p-1.5 sm:p-2 rounded-3xl sm:rounded-full border border-orange-200/70 shadow-lg flex items-end sm:items-center gap-2"
            >
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                }}
                onKeyDown={handleKeyDown}
                placeholder="พิมพ์คุยกับลุงได้เลย... (กด Enter เพื่อส่ง)"
                disabled={loading}
                className="flex-1 bg-transparent px-4 py-2 text-sm sm:text-base text-[#1c1714] placeholder-[#6b5e55]/60 outline-none resize-none max-h-32 min-h-[40px] leading-relaxed font-medium"
              />

              <button
                type="submit"
                disabled={!inputText.trim() || loading}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-full clay-brand flex items-center justify-center shrink-0 clay-press shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title="ส่งข้อความ"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </form>

            <p className="text-[10px] sm:text-[11px] text-center text-[#6b5e55]/70 mt-2">
              ลุงเล่านิทานอีสปปรับแต่งตามพฤติกรรมและความชอบ เพื่อการเรียนรู้เชิงบวก
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
