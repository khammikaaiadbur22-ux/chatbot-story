import type { Profile } from "./types";

/** Placeholder nicknames left over from older versions of the app. */
const PLACEHOLDER_NAMES = new Set(["", "นักศึกษา ปวช. 1", "นักศึกษาคนเก่ง"]);

export function cleanName(name?: string | null): string {
  const trimmed = (name || "").trim();
  return PLACEHOLDER_NAMES.has(trimmed) ? "" : trimmed;
}

export interface StoredMeta {
  profile: Profile;
  fullStory: string;
}

/**
 * `Conversation.plotSummary` holds a JSON blob with the learner profile and the latest fable.
 * Older records used `userProfile` with different keys, so map those too.
 */
export function readStoredMeta(raw?: string | null): StoredMeta {
  const empty: StoredMeta = { profile: {}, fullStory: "" };
  if (!raw || !raw.trim().startsWith("{")) return empty;
  try {
    const parsed = JSON.parse(raw);
    if (parsed.profile) return { profile: parsed.profile, fullStory: parsed.fullStory || "" };
    const legacy = parsed.userProfile || {};
    return {
      profile: {
        name: legacy.preferred_name || legacy.name || null,
        likes: [...(legacy.favorite_things || []), ...(legacy.interests || [])],
        hobbies: legacy.hobbies || [],
        personality: legacy.personality_traits || [],
        routine: [],
      },
      fullStory: parsed.fullStory || "",
    };
  } catch {
    return empty;
  }
}

const LIST_KEYS = ["likes", "hobbies", "personality", "routine"] as const;

/** Merge profile info, de-duplicating list entries. */
export function mergeProfile(base: Profile, update?: Profile | null): Profile {
  if (!update) return base;
  const merged: Profile = { ...base, name: cleanName(update.name) || base.name || null };
  for (const key of LIST_KEYS) {
    const values = [...(base[key] || []), ...(update[key] || [])]
      .map((v) => String(v).trim())
      .filter(Boolean);
    merged[key] = Array.from(new Set(values)).slice(0, 12);
  }
  return merged;
}

const PROFANITY = [
  "มึง", "กู", "เหี้ย", "สัส", "ควย", "เย็ด", "ระยำ", "ชาติหมา", "อีดอก", "ไอ้สัตว์",
  "fuck", "shit", "bitch", "asshole",
];

export function containsProfanity(text: string): boolean {
  const lower = text.toLowerCase();
  return PROFANITY.some((word) => lower.includes(word));
}

export function greetingFor(nickname: string): string {
  return nickname
    ? `สวัสดีจ้ะ${nickname} 😊 วันนี้ลุงอยากแต่งนิทานเรื่องพิเศษที่มี${nickname}เป็นแรงบันดาลใจ\n\nเริ่มจากเรื่องง่าย ๆ ก่อนนะ เวลาว่าง ${nickname}ชอบทำอะไรที่สุดจ๊ะ`
    : `สวัสดีจ้ะ 😊 ลุงชื่อ **ลุงนิทานยิ้มใส** ลุงจะแต่งนิทานอีสปเรื่องพิเศษที่มีหนูเป็นแรงบันดาลใจ\n\nก่อนอื่นเลย หนูอยากให้ลุงเรียกว่าอะไรดีจ๊ะ`;
}
