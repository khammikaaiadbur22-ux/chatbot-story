import fs from "node:fs";
import path from "node:path";
import type { Profile } from "./types";

export interface StoredStoryItem {
  id: string;
  title: string;
  theme?: string;
  currentStep: number;
  moralLesson?: string;
  plotSummary?: string;
  fullStory?: string;
  characters: any[];
  backdrops: any[];
  scratchPlan: any[];
  profile?: Profile;
  updatedAt: string;
  user: {
    id: string;
    username: string;
    studentId?: string;
    nickname?: string;
  };
  student?: {
    nickname: string;
    studentId: string;
  };
}

// In-memory cache for fast access across serverless invocations within the same container
const memoryStore = new Map<string, StoredStoryItem>();

// Determine writeable file path
function getStoragePath(): string {
  // On Vercel / Linux, /tmp is always writeable
  if (process.env.VERCEL || process.platform === "linux") {
    return path.join("/tmp", "chatbot_stories_v1.json");
  }
  return path.join(process.cwd(), "prisma", "stories_cache.json");
}

function loadFromFile() {
  try {
    const file = getStoragePath();
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, "utf8"));
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item?.id) memoryStore.set(item.id, item);
        }
      }
    }
  } catch (err) {
    // Ignore read errors
  }
}

function saveToFile() {
  try {
    const file = getStoragePath();
    const data = Array.from(memoryStore.values());
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    // Ignore write errors in restricted environments
  }
}

// Load once on module load
loadFromFile();

export function saveStoryRecord(record: {
  id: string;
  userId?: string;
  studentId?: string;
  nickname?: string;
  title?: string;
  moralLesson?: string;
  fullStory?: string;
  profile?: Profile;
  currentStep?: number;
}) {
  loadFromFile();

  const existing = memoryStore.get(record.id);
  const nickname = record.nickname || record.profile?.name || existing?.user?.nickname || "นักเรียน";
  const studentId = record.studentId || existing?.user?.studentId || "";

  const updated: StoredStoryItem = {
    id: record.id,
    title: record.title || existing?.title || (nickname ? `นิทานของ${nickname}` : "นิทานของฉัน"),
    theme: existing?.theme || "นิทานอีสป",
    currentStep: record.currentStep ?? existing?.currentStep ?? (record.fullStory ? 4 : 2),
    moralLesson: record.moralLesson || existing?.moralLesson || "",
    fullStory: record.fullStory || existing?.fullStory || "",
    plotSummary: record.fullStory || existing?.plotSummary || "",
    characters: existing?.characters || [],
    backdrops: existing?.backdrops || [],
    scratchPlan: existing?.scratchPlan || [],
    profile: record.profile || existing?.profile,
    updatedAt: new Date().toISOString(),
    user: {
      id: record.userId || existing?.user?.id || `user_${Date.now()}`,
      username: studentId || nickname || "student",
      studentId,
      nickname,
    },
    student: {
      nickname,
      studentId,
    },
  };

  memoryStore.set(record.id, updated);
  saveToFile();
  return updated;
}

export function getAllStoryRecords(): StoredStoryItem[] {
  loadFromFile();
  return Array.from(memoryStore.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function getStoryRecordById(id: string): StoredStoryItem | undefined {
  loadFromFile();
  return memoryStore.get(id);
}
