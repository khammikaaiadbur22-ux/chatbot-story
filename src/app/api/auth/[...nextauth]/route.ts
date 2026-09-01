import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username / Student ID", type: "text" },
        nickname: { label: "Nickname", type: "text" },
        studentId: { label: "Student ID", type: "text" },
        role: { label: "Role", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials) return null;

        const role = credentials.role === "TEACHER" ? "TEACHER" : "STUDENT";

        if (role === "STUDENT") {
          const studentId = credentials.studentId?.trim();
          const nickname = credentials.nickname?.trim();

          if (!studentId || !nickname) {
            throw new Error("กรุณากรอกทั้งชื่อเล่นและรหัสประจำตัวนักศึกษา");
          }

          // Use studentId as unique username
          let user = await prisma.user.findUnique({
            where: { username: studentId },
          });

          if (!user) {
            user = await prisma.user.create({
              data: {
                username: studentId,
                studentId: studentId,
                nickname: nickname,
                role: "STUDENT",
              },
            });
          } else {
            // Update nickname if changed
            user = await prisma.user.update({
              where: { id: user.id },
              data: {
                nickname: nickname,
                studentId: studentId,
                role: "STUDENT",
              },
            });
          }

          return {
            id: user.id,
            name: `${user.nickname} (${user.studentId})`,
            nickname: user.nickname,
            studentId: user.studentId,
            role: user.role,
          };
        } else {
          // Teacher login
          const username = (credentials.username || credentials.nickname || "ครูผู้สอน").trim();
          let user = await prisma.user.findUnique({
            where: { username: username },
          });

          if (!user) {
            user = await prisma.user.create({
              data: {
                username: username,
                nickname: username,
                role: "TEACHER",
              },
            });
          }

          return {
            id: user.id,
            name: user.nickname || user.username,
            nickname: user.nickname || user.username,
            role: "TEACHER",
          };
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.nickname = (user as any).nickname;
        token.studentId = (user as any).studentId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as string;
        (session.user as any).nickname = token.nickname as string;
        (session.user as any).studentId = token.studentId as string;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET || "story_coach_secret_key_2026",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
