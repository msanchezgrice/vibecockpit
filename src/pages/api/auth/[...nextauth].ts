import NextAuth, { NextAuthOptions } from 'next-auth';
import GitHubProvider from 'next-auth/providers/github';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import prisma from '@/lib/prisma'; // Import singleton instance
// import { PrismaClient } from '@/generated/prisma'; // Remove direct import

// const prisma = new PrismaClient(); // Remove direct instantiation

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma), // Use the imported singleton instance
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    }),
    {
      id: "vercel",
      name: "Vercel",
      type: "oauth",
      authorization: {
        url: "https://vercel.com/oauth/authorize",
        params: { scope: "projects:read" }, // Simplified scope
      },
      token: "https://api.vercel.com/v2/oauth/access_token",
      userinfo: "https://api.vercel.com/v2/user",
      clientId: process.env.VERCEL_CLIENT_ID as string,
      clientSecret: process.env.VERCEL_CLIENT_SECRET as string,
      profile(profile) {
        // Map Vercel profile data to NextAuth User model
        // Adjust based on actual Vercel /v2/user response structure
        return {
          id: profile.id || profile.uid, // Use id or uid from Vercel user object
          name: profile.name,
          email: profile.email,
          image: profile.avatar,
        };
      },
    },
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    // Use JSON Web Tokens for session instead of database sessions.
    // This option can be used with or without a database for users/accounts.
    // Note: `strategy` should be set to 'jwt' if no database is used.
    strategy: 'database',
    // Seconds - How long until an idle session expires and is no longer valid.
    maxAge: 30 * 24 * 60 * 60, // 30 days
    // Seconds - Throttle how frequently to write to database to extend a session.
    // Use it to limit write operations. Set to 0 to always update the database.
    updateAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: '/api/auth/signin',
    signOut: '/api/auth/signout',
    error: '/api/auth/error',
    newUser: '/dashboard', // Redirect new users to the dashboard
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === 'github') {
        // Store the access token on sign-in
        // Note: The adapter *should* handle mapping `access_token` automatically,
        // but we might need to update the account manually if it doesn't.
        // We will check this during testing.
        console.log('GitHub Sign In - Account:', account); // For debugging
        console.log('GitHub Sign In - Profile:', profile);
      }
      return true; // Return true to allow sign in
    },
    async redirect({ url: _url, baseUrl }) {
      // Always redirect to dashboard after sign in
      return `${baseUrl}/dashboard`;
    },
    async session({ session, user }) {
      // Send properties to the client, like an access_token from a provider.
      if (session.user) {
        session.user.id = user.id; // Now type-safe
      }
      return session;
    },
  },
  // Enable debug messages in the console if you are having problems
  // debug: process.env.NODE_ENV === 'development',
};

export default NextAuth(authOptions); 