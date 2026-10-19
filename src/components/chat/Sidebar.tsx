"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Plus,
  MessageSquare,
  Trash2,
  User,
  Sparkles,
  BookOpen,
  GraduationCap,
  X,
  ChevronLeft,
  ChevronRight,
  Heart,
  Smile,
  Clock,
  Gamepad2,
} from "lucide-react";
import type { ConversationSummary, Profile } from "@/lib/types";

interface SidebarProps {
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  userNickname: string;
  studentId: string;
  profile: Profile;
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  userNickname,
  studentId,
  profile,
  isOpen,
  onToggle,
}: SidebarProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirmDeleteId === id) {
      onDeleteConversation(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  };

  const hasProfileData =
    (profile.likes && profile.likes.length > 0) ||
    (profile.hobbies && profile.hobbies.length > 0) ||
    (profile.personality && profile.personality.length > 0) ||
    (profile.routine && profile.routine.length > 0);

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onToggle}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden animate-fade-in"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-72 sm:w-80 bg-[#1c1714] text-white flex flex-col transition-transform duration-300 ease-in-out border-r border-neutral-800 shadow-2xl md:shadow-none ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Top Header & New Chat button */}
        <div className="p-4 space-y-3 border-b border-neutral-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl overflow-hidden border border-[#f2711c]">
                <img
                  src="/images/uncle-storyteller.jpg"
                  alt="ลุงนิทานยิ้มใส"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="font-bold text-sm tracking-wide text-white">
                ลุงนิทานยิ้มใส
              </span>
            </div>

            {/* Mobile Close Button */}
            <button
              type="button"
              onClick={onToggle}
              className="p-1.5 text-neutral-400 hover:text-white md:hidden rounded-lg hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* New Chat Pill Button (Claymorphism style) */}
          <button
            type="button"
            onClick={() => {
              onNewConversation();
              if (window.innerWidth < 768) onToggle();
            }}
            className="w-full py-3 px-4 rounded-2xl clay-brand font-bold text-sm flex items-center justify-center gap-2 clay-press shadow-md"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>เริ่มนิทานเรื่องใหม่</span>
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scroll-dark">
          <div className="px-2 py-1 text-[11px] font-semibold tracking-wider text-neutral-400 uppercase">
            นิทานที่เคยคุย
          </div>

          {conversations.length === 0 ? (
            <div className="text-center py-8 text-neutral-500 text-xs px-4">
              ยังไม่มีประวัติการคุย เริ่มคุยกับลุงเพื่อสร้างนิทานเรื่องแรกได้เลย!
            </div>
          ) : (
            conversations.map((c) => {
              const isActive = c.id === activeConversationId;
              return (
                <div
                  key={c.id}
                  onClick={() => {
                    onSelectConversation(c.id);
                    if (window.innerWidth < 768) onToggle();
                  }}
                  className={`group relative flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer text-xs font-medium transition-all ${
                    isActive
                      ? "bg-[#2a2420] text-white shadow-inner border border-neutral-700"
                      : "text-neutral-300 hover:bg-neutral-800/80 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                    {c.hasStory ? (
                      <BookOpen className="w-3.5 h-3.5 text-[#f2711c] shrink-0" />
                    ) : (
                      <MessageSquare className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    )}
                    <span className="truncate">{c.title || "นิทานของฉัน"}</span>
                  </div>

                  {/* Delete Action */}
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, c.id)}
                    className={`p-1 rounded-md transition-opacity ${
                      confirmDeleteId === c.id
                        ? "bg-red-500/20 text-red-400 opacity-100"
                        : "text-neutral-500 hover:text-red-400 opacity-0 group-hover:opacity-100"
                    }`}
                    title={
                      confirmDeleteId === c.id
                        ? "กดยืนยันเพื่อลบ"
                        : "ลบห้องสนทนานี้"
                    }
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* AI Knowledge Memory Card (What AI learned from the child) */}
        {hasProfileData && (
          <div className="p-3 mx-3 mb-2 rounded-2xl bg-[#2a2420] border border-neutral-800 text-xs space-y-2">
            <div className="flex items-center justify-between text-[#f2711c] font-bold text-[11px]">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                ความรู้ที่ลุงจำได้เกี่ยวกับหนู
              </span>
            </div>

            <div className="space-y-1.5 text-[11px] text-neutral-300 max-h-36 overflow-y-auto pr-1">
              {profile.hobbies && profile.hobbies.length > 0 && (
                <div className="flex items-start gap-1.5">
                  <Gamepad2 className="w-3 h-3 text-[#f2711c] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-neutral-400">งานอดิเรก: </span>
                    <span className="font-medium text-white">
                      {profile.hobbies.join(", ")}
                    </span>
                  </div>
                </div>
              )}

              {profile.likes && profile.likes.length > 0 && (
                <div className="flex items-start gap-1.5">
                  <Heart className="w-3 h-3 text-pink-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-neutral-400">สิ่งที่ชอบ: </span>
                    <span className="font-medium text-white">
                      {profile.likes.join(", ")}
                    </span>
                  </div>
                </div>
              )}

              {profile.personality && profile.personality.length > 0 && (
                <div className="flex items-start gap-1.5">
                  <Smile className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-neutral-400">นิสัย: </span>
                    <span className="font-medium text-white">
                      {profile.personality.join(", ")}
                    </span>
                  </div>
                </div>
              )}

              {profile.routine && profile.routine.length > 0 && (
                <div className="flex items-start gap-1.5">
                  <Clock className="w-3 h-3 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-neutral-400">กิจวัตร: </span>
                    <span className="font-medium text-white">
                      {profile.routine.join(", ")}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer Student Info & Teacher Link */}
        <div className="p-3 border-t border-neutral-800 bg-[#14100e] flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-[#f2711c] text-white flex items-center justify-center text-xs font-bold shrink-0">
              {userNickname ? userNickname.slice(0, 1).toUpperCase() : "หนู"}
            </div>
            <div className="truncate">
              <div className="font-bold text-white text-xs truncate">
                {userNickname || "เด็กดี"}
              </div>
              {studentId && (
                <div className="text-[10px] text-neutral-400 font-mono">
                  {studentId}
                </div>
              )}
            </div>
          </div>

          <Link
            href="/dashboard"
            className="p-1.5 hover:text-[#f2711c] hover:bg-neutral-800 rounded-lg transition-colors flex items-center gap-1 text-[11px]"
            title="สำหรับคุณครู"
          >
            <GraduationCap className="w-4 h-4" />
            <span className="hidden sm:inline">ครู</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
