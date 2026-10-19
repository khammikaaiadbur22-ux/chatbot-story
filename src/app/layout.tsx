import type { Metadata, Viewport } from "next";
import { Prompt } from "next/font/google";
import "./globals.css";

const prompt = Prompt({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  variable: "--font-prompt",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ลุงนิทานยิ้มใส — แชทแต่งนิทานอีสปจากตัวตนของหนู",
  description:
    "คุยกับลุงนิทานยิ้มใส เล่าความชอบ นิสัย กิจวัตร และงานอดิเรกของหนู แล้วรับนิทานอีสปสั้น ๆ พร้อมข้อคิดที่แต่งขึ้นเพื่อหนูโดยเฉพาะ",
};

export const viewport: Viewport = {
  themeColor: "#1c1714",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={prompt.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
