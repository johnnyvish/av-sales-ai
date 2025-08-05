import GoogleProvider from "next-auth/providers/google";
import {
  getUserByGoogleId,
  createUser,
  updateUserTokens,
  getUserByEmail,
} from "@/lib/db";
import { NextAuthOptions, DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      automationEnabled?: boolean;
    } & DefaultSession["user"];
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          // Check if user exists
          const existingUser = await getUserByGoogleId(
            account.providerAccountId
          );

          if (!existingUser) {
            // Create new user
            await createUser(
              user.email!,
              account.providerAccountId,
              account.access_token!,
              account.refresh_token!
            );
          } else {
            // Update existing user tokens
            await updateUserTokens(
              account.providerAccountId,
              account.access_token!,
              account.refresh_token!
            );
          }

          return true;
        } catch (error) {
          console.error("Database error during sign in:", error);
          return false;
        }
      }
      return true;
    },
    async session({ session }) {
      // Add user database info to session
      try {
        const user = await getUserByEmail(session.user?.email || "");

        if (user && session.user) {
          session.user.id = user.id;
          session.user.automationEnabled = user.automation_enabled;
        }
      } catch (error) {
        console.error("Session callback error:", error);
      }

      return session;
    },
  },
};
