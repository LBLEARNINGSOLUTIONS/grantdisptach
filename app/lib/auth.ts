import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/prisma";

// Use SameSite=None + Secure in production (HTTPS) for Teams/SharePoint iframe compatibility.
// In local dev (HTTP), keep defaults since Secure cookies require HTTPS.
const useSecureCookies = (process.env.NEXTAUTH_URL ?? "").startsWith("https://");
const cookiePrefix = useSecureCookies ? "__Secure-next-auth" : "next-auth";
const cookieOptions = useSecureCookies
  ? { httpOnly: true, sameSite: "none" as const, secure: true, path: "/" }
  : { httpOnly: true, sameSite: "lax" as const, secure: false, path: "/" };

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  cookies: {
    sessionToken: {
      name: `${cookiePrefix}.session-token`,
      options: cookieOptions,
    },
    csrfToken: {
      name: `${cookiePrefix}.csrf-token`,
      options: { ...cookieOptions, httpOnly: false },
    },
    callbackUrl: {
      name: `${cookiePrefix}.callback-url`,
      options: { ...cookieOptions, httpOnly: false },
    },
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { credentials: true },
        });
        if (!user?.credentials) return null;
        const isValid = await bcrypt.compare(
          credentials.password,
          user.credentials.passwordHash
        );
        if (!isValid) return null;
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user && "role" in user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.sub ?? "";
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
