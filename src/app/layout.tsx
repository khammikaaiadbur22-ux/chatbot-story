import type { Metadata } from "next";
import { Prompt, Fredoka } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const promptFont = Prompt({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  variable: "--font-prompt",
  display: "swap",
});

const fredokaFont = Fredoka({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-fredoka",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ลุงเล่านิทาน - AI E-SOP Fable & Scratch Story Coach",
  description: "ผู้ช่วยใจดีชวนน้องๆ สร้างสรรค์นิทานอีสปและแปลงไอเดียเป็นโครงงาน Scratch",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className={`${promptFont.variable} ${fredokaFont.variable}`}>
      <body className="min-h-screen text-[#2C221E] antialiased selection:bg-[#FF8C1A]/20 selection:text-[#FF8C1A]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
