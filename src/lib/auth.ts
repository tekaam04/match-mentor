import { betterAuth, type BetterAuthOptions } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins";
import { isAdminEmail } from "@/lib/admin-emails";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { ROLES } from "@/lib/roles";

export const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

const socialProviders: BetterAuthOptions["socialProviders"] = googleEnabled
  ? {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        prompt: "select_account",
      },
    }
  : undefined;

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  // Send sign-in failures (expired links, abandoned Google attempts) back to our own page.
  onAPIError: { errorURL: "/sign-in" },
  socialProviders,
  account: {
    // Google verifies email ownership, so a Google sign-in can join an account first made via magic link.
    accountLinking: { enabled: true, trustedProviders: ["google"] },
  },
  user: {
    additionalFields: {
      role: {
        type: [...ROLES],
        required: false,
        defaultValue: "student",
        // Never settable by the client; only server code (hooks, organizers) assigns roles.
        input: false,
      },
      onboardedAt: {
        type: "date",
        required: false,
        input: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => ({
          data: { ...user, role: isAdminEmail(user.email) ? "admin" : (user.role ?? "student") },
        }),
      },
    },
  },
  plugins: [
    magicLink({
      expiresIn: 60 * 15,
      sendMagicLink: async ({ email, url }) => {
        await sendEmail({
          to: email,
          subject: "Your Match Mentor sign-in link",
          text: `Sign in to Match Mentor:\n${url}\n\nThis link expires in 15 minutes. If you didn't request it, ignore this email.`,
          html: `<p>Sign in to Match Mentor:</p><p><a href="${url}">Sign in</a></p><p>This link expires in 15 minutes. If you didn't request it, ignore this email.</p>`,
        });
      },
    }),
    // Must be last: lets server actions set auth cookies.
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
