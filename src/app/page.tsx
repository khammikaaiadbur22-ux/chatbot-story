"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import StoryChatPage from "./chat/page";

export default function RootPage() {
  return <StoryChatPage />;
}
