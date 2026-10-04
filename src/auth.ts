import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const creds = z.object({ email: z.string().email(), password: z.string().min(8) });

class NotVerified extends CredentialsSignin {
  code = "not_verified";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET ? [Google] : []),
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const p = creds.safeParse(raw);
        if (!p.success) return null;
        const user = await prisma.user.findUnique({ where: { email: p.data.email.toLowerCase() } });
        if (!user?.passwordHash) return null;
        if (!(await bcrypt.compare(p.data.password, user.passwordHash))) return null;
        if (!user.emailVerified) throw new NotVerified(); // only after the password is correct
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (account?.provider === "google") {
        if (!profile?.email || !profile.email_verified) return token;
        const email = profile.email.toLowerCase();
        const existing = await prisma.user.findUnique({ where: { email } });
        let id: string;
        if (!existing) {
          id = (await prisma.user.create({ data: { email, name: profile.name ?? null, emailVerified: new Date() } })).id;
        } else if (!existing.emailVerified) {
          // Google proved who owns this email, so drop any password set by someone unverified.
          await prisma.user.update({ where: { email }, data: { emailVerified: new Date(), passwordHash: null } });
          id = existing.id;
        } else {
          id = existing.id;
        }
        token.sub = id;
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
