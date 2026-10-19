import { readFileSync } from "node:fs";
import path from "node:path";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, type ModelMessage } from "ai";
import type { ChatStage, Profile } from "./types";

/** Tried in order. Fast "flash" models with minimal thinking keep replies snappy. */
const MODELS = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-3.5-flash-lite"];
const REQUEST_TIMEOUT_MS = 25_000;

let cachedPrompt: string | null = null;

/** The storyteller's behaviour lives in `prompts/storyteller.md` so it can be edited without code changes. */
export function getSystemPrompt(): string {
  if (!cachedPrompt || process.env.NODE_ENV !== "production") {
    cachedPrompt = readFileSync(path.join(process.cwd(), "prompts", "storyteller.md"), "utf8");
  }
  return cachedPrompt;
}

function getApiKeys(): string[] {
  const names = [
    "GEMINI_API_KEY_1", "GEMINI_API_KEY_2", "GEMINI_API_KEY_3", "GEMINI_API_KEY_4",
    "GEMINI_API_KEY_5", "GEMINI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY",
  ];
  const keys = names.map((n) => process.env[n]?.trim()).filter((k): k is string => !!k);
  const unique = Array.from(new Set(keys));
  // Start from a random key so load is spread across keys.
  const offset = Math.floor(Math.random() * Math.max(unique.length, 1));
  return [...unique.slice(offset), ...unique.slice(0, offset)];
}

export async function generateReply(system: string, messages: ModelMessage[]): Promise<string> {
  const keys = getApiKeys();
  if (keys.length === 0) throw new Error("ไม่พบ GEMINI_API_KEY ใน environment");

  let lastError: unknown;
  for (const modelName of MODELS) {
    for (const apiKey of keys) {
      try {
        const google = createGoogleGenerativeAI({ apiKey });
        const { text } = await generateText({
          model: google(modelName),
          system,
          messages,
          temperature: 0.85,
          maxOutputTokens: 2000,
          maxRetries: 0,
          abortSignal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          providerOptions: { google: { thinkingConfig: { thinkingLevel: "minimal" } } },
        });
        if (text.trim()) return text;
      } catch (error) {
        lastError = error;
        console.warn(`[ai] ${modelName} failed:`, (error as Error)?.message);
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("AI ไม่ตอบกลับ");
}

export interface ParsedReply {
  reply: string;
  stage: ChatStage;
  profile: Profile | null;
  story: {
    title: string;
    moral: string;
    characters?: Array<{ name: string; role: string; description?: string }>;
  } | null;
}

/** Split the model output into the visible reply and the hidden `<meta>{...}</meta>` block. */
export function parseReply(raw: string): ParsedReply {
  const match = raw.match(/<meta>([\s\S]*?)<\/meta>/i);
  let reply = (match ? raw.replace(match[0], "") : raw).replace(/```\s*$/g, "").trim();
  // Guard against a dangling, unterminated meta tag.
  reply = reply.replace(/<meta>[\s\S]*$/i, "").trim();

  const result: ParsedReply = { reply, stage: "discover", profile: null, story: null };
  if (!match) {
    // If model didn't return meta block, check if reply contains a fable title and moral
    const moralMatch = reply.match(/>\s*\*\*ข้อคิด:?\*\*\s*([^\n]+)/i);
    const titleMatch = reply.match(/##\s*([^\n]+)/);
    if (moralMatch && titleMatch) {
      result.stage = "story";
      result.story = {
        title: titleMatch[1].trim(),
        moral: moralMatch[1].trim(),
      };
    }
    return result;
  }

  try {
    const json = JSON.parse(match[1].trim().replace(/^```(?:json)?|```$/g, ""));
    if (json.stage === "ready" || json.stage === "story") result.stage = json.stage;
    if (json.profile && typeof json.profile === "object") result.profile = json.profile;
    if (result.stage === "story" && json.story?.title) {
      let moral = String(json.story.moral || "").trim();
      if (!moral) {
        const moralMatch = reply.match(/>\s*\*\*ข้อคิด:?\*\*\s*([^\n]+)/i);
        if (moralMatch) moral = moralMatch[1].trim();
      }
      result.story = {
        title: String(json.story.title),
        moral,
        characters: Array.isArray(json.story.characters) ? json.story.characters : undefined,
      };
    }
  } catch (error) {
    console.warn("[ai] could not parse meta block", error);
  }
  return result;
}
