# Vibe Cockpit

A dashboard to monitor your Vibe Projects.

## Features

- GitHub OAuth Sign-in
- Project listing and status management
- Simple note-taking per project
- Basic cost and analytics tracking (via Vercel/Supabase)
- GitHub commit log integration

## Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/msanchezgrice/vibecockpit.git
    cd vibecockpit
    ```

2.  **Install dependencies:**
    ```bash
    pnpm install
    ```

3.  **Set up Environment Variables:**
    Create a `.env` file in the project root and add the following variables:

    ```dotenv
    # Database (Use Supabase URI or local Postgres/SQLite)
    # Example for Supabase Session Pooler:
    DATABASE_URL="postgresql://postgres.YOUR_SUPABASE_USER:[YOUR-PASSWORD]@YOUR_SUPABASE_HOST:6543/postgres"

    # NextAuth
    NEXTAUTH_SECRET="generate_using_openssl_rand_base64_32"
    NEXTAUTH_URL="http://localhost:3000" # Or your deployment URL

    # GitHub OAuth App (Settings > Developer settings > OAuth Apps)
    GITHUB_CLIENT_ID="YOUR_GITHUB_CLIENT_ID"
    GITHUB_CLIENT_SECRET="YOUR_GITHUB_CLIENT_SECRET"

    # GitHub PAT (Settings > Developer settings > Personal access tokens)
    GITHUB_PAT="YOUR_GITHUB_PAT_WITH_REPO_READ_ACCESS"

    # Vercel API Token (Vercel > Settings > Tokens)
    VERCEL_TOKEN="YOUR_VERCEL_API_TOKEN"

    # Supabase API Info (Supabase > Project Settings > API)
    SUPABASE_URL="YOUR_SUPABASE_PROJECT_URL"
    SUPABASE_SERVICE_ROLE_KEY="YOUR_SUPABASE_SERVICE_ROLE_KEY"

    # Optional: Cron Secret for protecting cron endpoints in production
    # CRON_SECRET="YOUR_SECURE_RANDOM_STRING"
    ```

4.  **Database Migration:**
    Apply the Prisma schema to your database:
    ```bash
    pnpm exec prisma migrate deploy
    ```
    *(If using SQLite locally for the first time, you might need `prisma migrate dev` first)*

5.  **Database Seeding (Optional):**
    Add initial dummy project data:
    ```bash
    pnpm exec prisma db seed
    ```

6.  **Update Project Integration IDs:**
    Use Prisma Studio (`pnpm exec prisma studio`) to edit the `Project` records and add the correct `vercelProjectId` and `githubRepo` (`owner/repo`) for projects you want to track via cron jobs.

## Running the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Running Cron Jobs Manually (for testing)

```bash
curl -X POST http://localhost:3000/api/cron/cost-collector
curl -X POST http://localhost:3000/api/cron/analytics-collector
curl -X POST http://localhost:3000/api/cron/changelog-collector
```

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
