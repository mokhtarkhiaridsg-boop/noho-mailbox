import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/totp";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const providers: any[] = [
  Credentials({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
      totpToken: { label: "2FA code", type: "text" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null;

      // Normalize the submitted email — signup stores `.trim().toLowerCase()`
      // via the Zod schema, so an uppercase/whitespace-padded login email
      // would never match. This was silently rejecting valid customers with
      // "Invalid email or password" whenever their browser autofilled
      // the email in title case (common on iOS Mail-suggested credentials).
      const normalizedEmail = (credentials.email as string).trim().toLowerCase();
      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      // OAuth-only users have an unguessable hash that no submitted password will match
      if (!user) return null;

      const valid = await bcrypt.compare(
        credentials.password as string,
        user.passwordHash
      );

      if (!valid) return null;

      if (user.totpEnabled && user.totpSecret) {
        const token = (credentials.totpToken as string | undefined)?.trim();
        if (!token) {
          throw new Error("2FA_REQUIRED");
        }
        if (!verifyToken(user.totpSecret, token)) {
          throw new Error("2FA_INVALID");
        }
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      };
    },
  }),
];

// Google OAuth — only enabled if env vars are set
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    })
  );
}

// Apple OAuth — only enabled if env vars are set
if (process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET) {
  providers.push(
    Apple({
      clientId: process.env.AUTH_APPLE_ID,
      clientSecret: process.env.AUTH_APPLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    })
  );
}

export const isGoogleEnabled = !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
export const isAppleEnabled = !!(process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async signIn({ user, account }) {
      // For OAuth providers, upsert the user record into our database
      if (account && account.provider !== "credentials" && user.email) {
        // Normalize the provider-supplied email so we match the lowercase
        // address signup stores, regardless of how Google/Apple cased it.
        // Without this, a customer who signed up with credentials as
        // `jane@example.com` and later clicks "Sign in with Google" — where
        // Google may hand us `Jane@Example.com` — would hit a P2002 unique
        // collision on email and be locked out of OAuth login forever.
        const normalizedEmail = user.email.trim().toLowerCase();
        const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (!existing) {
          // Create a new free-member account with an unguessable password hash
          // (OAuth-only users can never sign in via password)
          const randomSecret = crypto.randomBytes(32).toString("hex");
          const placeholderHash = await bcrypt.hash(randomSecret, 12);
          const created = await prisma.user.create({
            data: {
              name: user.name ?? normalizedEmail.split("@")[0],
              email: normalizedEmail,
              image: user.image ?? null,
              oauthProvider: account.provider,
              passwordHash: placeholderHash,
              plan: null,
              suiteNumber: null,
            },
          });
          user.id = created.id;
          (user as { role?: string }).role = created.role;
        } else {
          user.id = existing.id;
          (user as { role?: string }).role = existing.role;
        }
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
});
