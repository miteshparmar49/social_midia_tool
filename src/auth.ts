import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const creds = z.object({ email: z.string().email(), password: z.string().min(8) });

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Google, // reads AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET from .env
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const p = creds.safeParse(raw);
        if (!p.success) return null;
        const user = await prisma.user.findUnique({ where: { email: p.data.email.toLowerCase() } });
        if (!user?.passwordHash) return null;
        const ok = await bcrypt.compare(p.data.password, user.passwordHash);
        return ok ? { id: user.id, email: user.email, name: user.name } : null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (account?.provider === "google") {
        // Google login: find or create our own user by verified email
        if (!profile?.email || !profile.email_verified) return token;
        const dbUser = await prisma.user.upsert({
          where: { email: profile.email.toLowerCase() },
          update: {},
          create: { email: profile.email.toLowerCase(), name: profile.name ?? null },
        });
        token.sub = dbUser.id;
      } else if (user?.id) {
        token.sub = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (token.sub) Object.assign(session.user, { id: token.sub });
      return session;
    },
  },
});
