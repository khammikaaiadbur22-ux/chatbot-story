/** Shared types used by both the client UI and the API routes. */

export interface Profile {
  name?: string | null;
  likes?: string[];
  hobbies?: string[];
  personality?: string[];
  routine?: string[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStory?: boolean;
  createdAt?: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
  hasStory: boolean;
  currentStep?: number;
}

export type ChatStage = "discover" | "ready" | "story";

export interface ChatResponse {
  reply: string;
  stage: ChatStage;
  isStory: boolean;
  title: string;
  profile: Profile;
  messageId: string;
}

/** Marker stored in `Message.step` to flag assistant messages that contain a finished fable. */
export const STORY_MESSAGE_STEP = 9;

/** `Conversation.currentStep` values matching the Teacher Studio progression. */
export const CONVERSATION_STEP = {
  DISCOVER: 1,
  PROFILE: 2,
  PLANNING: 3,
  STORY_DONE: 4,
} as const;
