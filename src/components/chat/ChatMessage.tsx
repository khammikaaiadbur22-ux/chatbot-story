"use client";

import React, { useState } from "react";
import { Sparkles, Copy, Check, Volume2, VolumeX, BookOpen, Quote } from "lucide-react";
import type { ChatMessage as ChatMessageType } from "@/lib/types";

interface ChatMessageProps {
  message: ChatMessageType;
  userNickname?: string;
}

export function ChatMessage({ message, userNickname }: ChatMessageProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    // Clean text from markdown formatting before speaking
    const cleanText = message.content
      .replace(/[#*`_>]/g, "")
      .replace(/\n+/g, " ");

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "th-TH";
    utterance.rate = 0.95;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  // Helper to format assistant markdown text nicely
  const formatContent = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      const trimmed = line.trim();

      // Heading 2 (e.g. ## Title)
      if (trimmed.startsWith("## ")) {
        return (
          <h2
            key={idx}
            className="text-xl sm:text-2xl font-bold text-[#c2470a] mt-4 mb-2 flex items-center gap-2"
          >
            <Sparkles className="w-5 h-5 text-[#f2711c] shrink-0" />
            <span>{trimmed.replace("## ", "")}</span>
          </h2>
        );
      }

      // Heading 3
      if (trimmed.startsWith("### ")) {
        return (
          <h3 key={idx} className="text-lg font-bold text-[#1c1714] mt-3 mb-1">
            {trimmed.replace("### ", "")}
          </h3>
        );
      }

      // Blockquote / Moral of the story
      if (trimmed.startsWith(">")) {
        const quoteText = trimmed.replace(/^>\s*/, "");
        return (
          <div
            key={idx}
            className="my-3 p-4 bg-[#ffe8d6] border-l-4 border-[#f2711c] rounded-2xl clay-sm text-[#1c1714] font-medium flex items-start gap-2.5 shadow-sm"
          >
            <Quote className="w-5 h-5 text-[#f2711c] shrink-0 mt-0.5" />
            <div className="flex-1 text-sm sm:text-base leading-relaxed">
              {quoteText}
            </div>
          </div>
        );
      }

      // Empty line
      if (!trimmed) {
        return <div key={idx} className="h-2" />;
      }

      // Regular paragraph
      return (
        <p key={idx} className="leading-relaxed text-[#1c1714] text-sm sm:text-[15px]">
          {trimmed}
        </p>
      );
    });
  };

  if (isUser) {
    return (
      <div className="flex justify-end items-end gap-2.5 my-3 animate-rise">
        <div className="max-w-[85%] sm:max-w-[70%] bg-[#1c1714] text-white px-5 py-3.5 rounded-3xl rounded-br-xs shadow-md border border-neutral-800 transition-all hover:scale-[1.01]">
          <p className="text-sm sm:text-[15px] leading-relaxed whitespace-pre-wrap font-medium">
            {message.content}
          </p>
        </div>
        <div className="w-8 h-8 rounded-full bg-[#f2711c] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
          {userNickname ? userNickname.slice(0, 1).toUpperCase() : "หนู"}
        </div>
      </div>
    );
  }

  // Assistant Message (Claymorphism style)
  return (
    <div className="flex justify-start items-start gap-3 my-3 sm:my-4 animate-rise">
      {/* Uncle Storyteller Avatar */}
      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl overflow-hidden border-2 border-[#f2711c] shrink-0 shadow-sm bg-white mt-1">
        <img
          src="/images/uncle-storyteller.jpg"
          alt="ลุงนิทานยิ้มใส"
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLElement).style.display = "none";
          }}
        />
      </div>

      <div className="flex-1 max-w-[92%] sm:max-w-[80%]">
        <div
          className={`clay p-4 sm:p-6 rounded-3xl rounded-tl-xs border border-orange-100/60 transition-all relative ${
            message.isStory
              ? "bg-gradient-to-br from-white via-[#fffaf5] to-[#fff3e8] border-[#f2711c]/30 shadow-lg"
              : "bg-white"
          }`}
        >
          {/* Header if it's a generated fable */}
          {message.isStory && (
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#ffe8d6]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f2711c] animate-pulse" />
                <span className="text-xs font-bold text-[#c2470a] tracking-wider uppercase flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-[#f2711c]" />
                  นิทานอีสปพิเศษสำหรับหนู (1-2 นาที)
                </span>
              </div>
            </div>
          )}

          {/* Body Content */}
          <div className="space-y-1.5 prose-chat">
            {formatContent(message.content)}
          </div>

          {/* Quick Actions at bottom */}
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-orange-100/60 text-xs text-[#6b5e55]">
            <span className="text-[11px] font-medium text-[#c2470a]/70">
              ลุงนิทานยิ้มใส
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleSpeak}
                className={`p-1.5 rounded-xl border border-orange-200/50 hover:bg-[#ffe8d6] transition-colors clay-press flex items-center gap-1 ${
                  speaking ? "bg-[#ffe8d6] text-[#c2470a]" : "text-[#6b5e55]"
                }`}
                title={speaking ? "หยุดอ่าน" : "ฟังเสียงลุงอ่านนิทาน"}
              >
                {speaking ? (
                  <VolumeX className="w-3.5 h-3.5 text-[#c2470a]" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
                <span className="text-[10px] hidden sm:inline">
                  {speaking ? "หยุดเสียง" : "ฟังเสียง"}
                </span>
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className="p-1.5 rounded-xl border border-orange-200/50 hover:bg-[#ffe8d6] text-[#6b5e55] transition-colors clay-press flex items-center gap-1"
                title="คัดลอกข้อความ"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-green-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span className="text-[10px] hidden sm:inline">
                  {copied ? "คัดลอกแล้ว" : "คัดลอก"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
